// AgriN deliver Edge Function — port of functions/src/deliver.ts.
// docs/migration-design.md §7: verify JWT -> own-diagnosis check -> rate limit ->
// Gemini Kannada translation -> update translated_advisory + honest sms_status.
// Phone now comes from profiles, NOT the diagnosis (design §1 bug fix).

import "@supabase/functions-js/edge-runtime.d.ts";
import {
  authFromRequest,
  callGemini,
  corsResponse,
  fail,
  httpError,
  loadOwnDiagnosis,
  ok,
  rateLimit,
  readJson,
  serviceClient,
} from "../_shared/agrin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { uid, token } = await authFromRequest(req);
    const body = await readJson(req);
    const diagnosisId = body.diagnosisId;
    if (!diagnosisId || typeof diagnosisId !== "string") {
      throw httpError("invalid-argument", "Missing diagnosisId.");
    }

    // Ownership + required data first, so rate-limit slots aren't burned.
    const diagnosis = await loadOwnDiagnosis(uid, diagnosisId);
    const advisoryText = diagnosis.advisory_text;
    if (!advisoryText) {
      throw httpError(
        "failed-precondition",
        "Advisory text missing from diagnosis record.",
      );
    }

    await rateLimit(token, "deliver", 10);

    // Phone from the profile (fixes the Firebase bug where it was read from the
    // diagnosis doc that diagnose never wrote it to).
    const { data: profile, error: profileError } = await serviceClient()
      .from("profiles")
      .select("phone")
      .eq("id", uid)
      .maybeSingle();
    if (profileError) {
      throw httpError("internal", "Failed to load profile.");
    }
    const phoneNumber = profile?.phone ?? null;

    // Kannada translation via Gemini (mocking Cloud Translation API as before).
    const prompt = `Translate the following agricultural treatment plan into fluent Kannada.
Only output the Kannada translation, no other text or explanation.
Text to translate:
"${advisoryText}"`;

    let translatedAdvisory = "";
    try {
      translatedAdvisory = await callGemini(prompt);
    } catch (err) {
      throw httpError("internal", "Failed to translate advisory.");
    }

    if (!translatedAdvisory || translatedAdvisory.length < 5) {
      throw httpError("internal", "The translation generated was empty or invalid.");
    }

    // TTS stays client-side (Web Speech API) — same as Firebase deliver.

    // Simulated SMS, honestly labeled (design §13: `simulated: true`, no faked
    // "sent" flag / no pretending a real provider was used).
    const smsStatus = {
      simulated: true,
      sent: false,
      to: phoneNumber || "Unknown",
      timestamp: new Date().toISOString(),
      simulatedPlatform: "none (mock)",
    };

    await serviceClient()
      .from("diagnoses")
      .update({
        translated_advisory: translatedAdvisory,
        sms_status: smsStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", diagnosisId);

    return ok({
      translatedAdvisory,
      smsStatus,
    });
  } catch (err) {
    return fail(err);
  }
});