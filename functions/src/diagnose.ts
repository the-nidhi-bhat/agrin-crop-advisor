import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fromBuffer } from "file-type";

export const diagnose = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;
  const { imageUrl, crop, location, phoneNumber } = data;

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing or invalid imageUrl.");
  }

  if (!imageUrl.startsWith(`uploads/${uid}/`)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "The imageUrl does not belong to the authenticated user."
    );
  }

  // Sanitize location input to prevent prompt injection
  const safeLocation = typeof location === "string" 
    ? location.replace(/[^a-zA-Z0-9, \-]/g, "").substring(0, 50) 
    : "Unknown";

  const db = admin.firestore();
  
  // 3. Rate Limiting via Transaction (Strict, non-racy)
  const rateLimitRef = db.doc(`users/${uid}/rateLimit/diagnose`);
  
  await db.runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    let timestamps = doc.exists ? doc.data()?.timestamps || [] : [];
    // Filter out timestamps older than 1 hour
    timestamps = timestamps.filter((ts: number) => ts >= oneHourAgo);

    if (timestamps.length >= 5) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Rate limit exceeded. Maximum 5 diagnoses per hour allowed."
      );
    }

    // Add current attempt
    timestamps.push(now);
    t.set(rateLimitRef, { timestamps }, { merge: true });
  });

  // LOG ATTEMPT EARLY
  const timestamp = FieldValue.serverTimestamp();
  const diagnosisDocRef = db.collection(`users/${uid}/diagnoses`).doc();
  await diagnosisDocRef.set({
    timestamp,
    status: "pending",
    cropType: crop,
    imageUrl: imageUrl,
    location: safeLocation
  });

  // Save phone number for SMS mocking
  await db.doc(`users/${uid}`).set({
    phoneNumber: phoneNumber || null,
    updatedAt: timestamp
  }, { merge: true });

  try {
    // 4. Storage Retrieval
    const bucket = admin.storage().bucket();
    const file = bucket.file(imageUrl);
    const [exists] = await file.exists();
    
    if (!exists) {
      throw new functions.https.HttpsError("not-found", "Image not found in storage.");
    }

    const [buffer] = await file.download();

    // 4.5. Magic Byte verification
    const typeInfo = await fromBuffer(buffer);
    if (!typeInfo || !typeInfo.mime.startsWith('image/')) {
      throw new functions.https.HttpsError(
        "invalid-argument", 
        "The uploaded file has an invalid signature or is not an image."
      );
    }

    // 5. Gemini Invocation
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY secret.");
      throw new functions.https.HttpsError("internal", "Server configuration error.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `You are an expert agronomist. 
Analyze this image of a ${crop} leaf from a farmer located in ${location || "an unknown location"}.
Respond strictly in JSON format with no markdown wrappers or extra text.
The JSON must have this exact structure:
{
  "disease": "Name of the disease (or 'Healthy' or 'Unrecognized')",
  "symptoms": "1-2 short sentences describing the visible symptoms.",
  "advisory": "3 clear, actionable treatment steps.",
  "confidence": "High, Medium, or Low"
}`;

    const imagePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    
    const cleanedText = responseText.replace(/```json/gi, "").replace(/```/gi, "").trim();
    const diagnosisResult = JSON.parse(cleanedText);

    // 6. Update Firestore with Success
    await diagnosisDocRef.update({
      status: "success",
      diseaseIdentified: diagnosisResult.disease,
      advisoryText: diagnosisResult.advisory,
      symptoms: diagnosisResult.symptoms,
      confidence: diagnosisResult.confidence,
      audioUrl: null // Generated in later tasks
    });

    // 7. Return payload to client
    return {
      id: diagnosisDocRef.id,
      disease: diagnosisResult.disease,
      symptoms: diagnosisResult.symptoms,
      advisory: diagnosisResult.advisory,
      confidence: diagnosisResult.confidence,
    };

  } catch (error: any) {
    console.error("Diagnosis error:", error);
    // Update attempt as failed
    await diagnosisDocRef.update({ status: "failed", error: error.message });
    throw new functions.https.HttpsError(error.code || "internal", error.message || "An error occurred during diagnosis.");
  }
});
