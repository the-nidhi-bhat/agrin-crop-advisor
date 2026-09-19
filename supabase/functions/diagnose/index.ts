// AgriN diagnose Edge Function — port of functions/src/diagnose.ts.
// docs/migration-design.md §7: verify JWT -> rate limit -> image ownership ->
// download + magic-byte/size check -> Gemini vision (secret) -> pending->success/failed.

import "@supabase/functions-js/edge-runtime.d.ts";
import {
  authFromRequest,
  bytesToBase64,
  callGemini,
  corsResponse,
  downloadAndVerify,
  fail,
  httpError,
  ok,
  parseDiagnosisJson,
  rateLimit,
  readJson,
  serviceClient,
} from "../_shared/agrin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { uid, token } = await authFromRequest(req);
    const body = await readJson(req);

    // Frontend sends imageUrl; schema names it image_path. Accept both.
    const imagePath = typeof body.imagePath === "string" ? body.imagePath : body.imageUrl;
    if (!imagePath || typeof imagePath !== "string") {
      throw httpError("invalid-argument", "Missing or invalid imageUrl.");
    }
    // Ownership guard before any expensive work (ported IDOR check).
    if (!imagePath.startsWith(`${uid}/`)) {
      throw httpError(
        "permission-denied",
        "The imageUrl does not belong to the authenticated user.",
      );
    }

    const crop = typeof body.crop === "string"
      ? body.crop
      : typeof body.cropType === "string"
      ? body.cropType
      : "";
    if (!crop) throw httpError("invalid-argument", "Missing or invalid crop.");

    // Sanitize location input to prevent prompt injection (unchanged from Firebase).
    const safeLocation = typeof body.location === "string"
      ? body.location.replace(/[^a-zA-Z0-9, \-]/g, "").substring(0, 50)
      : "Unknown";

    const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : null;

    // Rate limiting (5/hr) — transactional, server-side (design §8).
    await rateLimit(token, "diagnose", 5);

    const db = serviceClient();

    // LOG ATTEMPT EARLY — pending row so failures stay observable.
    const { data: inserted, error: insertError } = await db
      .from("diagnoses")
      .insert({
        user_id: uid,
        crop,
        image_path: imagePath,
        location: safeLocation,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError || !inserted) {
      throw httpError("internal", "Failed to record the diagnosis attempt.");
    }
    const diagnosisId = inserted.id;

    // Persist phone on the profile (fixes the Firebase deliver bug: it read
    // a phone number that was never written to the diagnosis doc).
    await db
      .from("profiles")
      .update({ phone: phoneNumber, updated_at: new Date().toISOString() })
      .eq("id", uid);

    try {
      // Storage retrieval + re-verification (magic bytes + size) — belt and braces.
      const { bytes, mime } = await downloadAndVerify(token, uid, imagePath);

      // Gemini vision (key stays server-side, never in the browser).
      const prompt = `You are an expert agronomist.
Analyze this image of a ${crop} leaf from a farmer located in ${safeLocation || "an unknown location"}.
Respond strictly in JSON format with no markdown wrappers or extra text.
The JSON must have this exact structure:
{
  "disease": "Name of the disease (or 'Healthy' or 'Unrecognized')",
  "symptoms": "1-2 short sentences describing the visible symptoms.",
  "advisory": "3 clear, actionable treatment steps.",
  "confidence": "High, Medium, or Low"
}`;

      const raw = await callGemini(prompt, { mime, base64: bytesToBase64(bytes) });
      const result = parseDiagnosisJson(raw);

      await db
        .from("diagnoses")
        .update({
          status: "success",
          disease: result.disease,
          symptoms: result.symptoms,
          advisory_text: result.advisory,
          confidence: result.confidence,
          updated_at: new Date().toISOString(),
        })
        .eq("id", diagnosisId);

      return ok({
        id: diagnosisId,
        disease: result.disease,
        symptoms: result.symptoms,
        advisory: result.advisory,
        confidence: result.confidence,
      });
    } catch (err) {
      // Mark attempt as failed, then forward the error to the client.
      try {
        await db
          .from("diagnoses")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", diagnosisId);
      } catch {
        // ignore — the original error is the one worth reporting
      }
      throw err;
    }
  } catch (err) {
    return fail(err);
  }
});