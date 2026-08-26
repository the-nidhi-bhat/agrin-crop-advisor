"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.advisory = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
const generative_ai_1 = require("@google/generative-ai");
exports.advisory = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
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
        var _a;
        const doc = await t.get(rateLimitRef);
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        let timestamps = doc.exists ? ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.timestamps) || [] : [];
        timestamps = timestamps.filter((ts) => ts >= oneHourAgo);
        if (timestamps.length >= 10) {
            throw new functions.https.HttpsError("resource-exhausted", "Rate limit exceeded for advisory endpoint.");
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
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        // 6. Return to client
        return {
            status: "success",
            advisory: advisoryText,
            weather: mockedWeather
        };
    }
    catch (error) {
        console.error("Advisory error:", error);
        throw new functions.https.HttpsError(error.code || "internal", error.message || "An error occurred generating the advisory.");
    }
});
//# sourceMappingURL=advisory.js.map