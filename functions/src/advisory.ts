import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const advisory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uid = context.auth.uid;
  const { diagnosisId } = data;

  if (!diagnosisId || typeof diagnosisId !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Missing diagnosisId.");
  }

  const db = admin.firestore();
  
  // 1. Rate Limiting via Transaction (Strict, non-racy)
  const rateLimitRef = db.doc(`users/${uid}/rateLimit/advisory`);
  await db.runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    let timestamps = doc.exists ? doc.data()?.timestamps || [] : [];
    timestamps = timestamps.filter((ts: number) => ts >= oneHourAgo);

    if (timestamps.length >= 10) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "Rate limit exceeded for advisory endpoint."
      );
    }
    timestamps.push(now);
    t.set(rateLimitRef, { timestamps }, { merge: true });
  });

  // 2. Fetch diagnosis record to ensure ownership and get context
  const diagnosisRef = db.doc(`users/${uid}/diagnoses/${diagnosisId}`);
  const diagnosisSnap = await diagnosisRef.get();
  
  if (!diagnosisSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Diagnosis not found.");
  }
  
  const diagnosisData = diagnosisSnap.data();
  const { cropType, diseaseIdentified, location } = diagnosisData || {};

  // 3. Mock Weather & Soil Data 
  // TODO: Swap for real OpenWeather/IMD API fetch using `location`
  const mockedWeather = {
    temperature: "32°C",
    humidity: "78%",
    forecast: "Expected heavy rainfall in the next 48 hours",
    soilMoisture: "High"
  };

  try {
    // 4. Gemini Invocation
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError("internal", "Server configuration error.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `You are an expert, practical agronomist. 
The farmer is growing ${cropType || "crops"} in ${location || "an unknown location"}.
We have identified the following issue: ${diseaseIdentified || "Unknown disease"}.
Current local weather conditions: Temp ${mockedWeather.temperature}, Humidity ${mockedWeather.humidity}, Forecast: ${mockedWeather.forecast}. Soil moisture is ${mockedWeather.soilMoisture}.

Based on this specific weather and disease, provide a short, plain-language treatment advisory that a rural farmer can act on immediately using locally available resources. Focus on immediate next steps.
Keep the tone supportive and authoritative. Do not use markdown. Limit to 3-4 sentences.`;

    const result = await model.generateContent(prompt);
    const advisoryText = result.response.text().trim();

    if (!advisoryText || advisoryText.length < 10) {
      throw new functions.https.HttpsError("internal", "The AI generated an empty or invalid advisory.");
    }

    // 5. Update Firestore
    await diagnosisRef.update({
      advisoryText: advisoryText,
      weatherContext: mockedWeather,
      updatedAt: FieldValue.serverTimestamp()
    });

    // 6. Return to client
    return {
      status: "success",
      advisory: advisoryText,
      weather: mockedWeather
    };

  } catch (error: any) {
    console.error("Advisory error:", error);
    throw new functions.https.HttpsError(error.code || "internal", error.message || "An error occurred generating the advisory.");
  }
});
