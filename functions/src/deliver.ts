import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const deliver = functions.https.onCall(async (data, context) => {
  // 1. Security & Auth
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to request delivery."
    );
  }

  const uid = context.auth.uid;
  const { diagnosisId } = data;

  if (!diagnosisId) {
    throw new functions.https.HttpsError("invalid-argument", "Missing diagnosisId");
  }

  const db = admin.firestore();
  
  // Rate Limiting (Transaction)
  const rateLimitRef = db.doc(`users/${uid}/rateLimit/deliver`);
  await db.runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let timestamps: number[] = [];
    if (doc.exists) {
      timestamps = doc.data()?.timestamps || [];
      timestamps = timestamps.filter((ts) => ts > oneHourAgo);
    }

    if (timestamps.length >= 10) {
      throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded for delivery endpoint.");
    }

    timestamps.push(now);
    t.set(rateLimitRef, { timestamps }, { merge: true });
  });

  // 2. Fetch diagnosis record to ensure ownership
  const diagnosisRef = db.doc(`users/${uid}/diagnoses/${diagnosisId}`);
  const diagnosisSnap = await diagnosisRef.get();

  if (!diagnosisSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Diagnosis not found.");
  }

  const diagnosisData = diagnosisSnap.data()!;
  const advisoryText = diagnosisData.advisoryText;
  const phoneNumber = diagnosisData.phoneNumber; // We saved this in diagnose

  if (!advisoryText) {
    throw new functions.https.HttpsError("failed-precondition", "Advisory text missing from diagnosis record.");
  }

  // 3. Translation via Gemini (Mocking Cloud Translation API to avoid billing for hackathon)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError("internal", "Server configuration error: Gemini API key missing.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

  const prompt = `Translate the following agricultural treatment plan into fluent Kannada. 
Only output the Kannada translation, no other text or explanation. 
Text to translate:
"${advisoryText}"`;

  let translatedAdvisory = "";
  try {
    const result = await model.generateContent(prompt);
    translatedAdvisory = result.response.text().trim();
  } catch (err) {
    console.error("Translation failed:", err);
    throw new functions.https.HttpsError("internal", "Failed to translate advisory.");
  }

  if (!translatedAdvisory || translatedAdvisory.length < 5) {
    throw new functions.https.HttpsError("internal", "The translation generated was empty or invalid.");
  }

  // 4. TTS (Text-to-Speech)
  // We will use the Web Speech API (speechSynthesis) on the frontend 
  // instead of generating an audio file server-side.

  // 6. Mock SMS Delivery
  const smsStatus = {
    sent: true,
    to: phoneNumber || "Unknown",
    timestamp: Date.now(),
    simulatedPlatform: "Twilio Mock"
  };
  
  console.log(`[MOCK SMS] Sending Kannada advisory to ${smsStatus.to}: ${translatedAdvisory.substring(0, 50)}...`);

  // 7. Update Firestore
  await diagnosisRef.update({
    translatedAdvisory,
    smsStatus
  });

  return {
    translatedAdvisory,
    smsStatus
  };
});
