// AgriN advisory Edge Function — port of functions/src/advisory.ts.
// docs/migration-design.md §7: verify JWT -> load own diagnosis (ownership) ->
// rate limit -> Gemini advisory -> update advisory_text.
// Mocked weather is deliberately NOT used (design §7, §13 "stop pretending"):
// weather_context stays null, response weather is null.

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

    // Ownership + context first, so rate-limit slots aren't burned on foreign ids.
    const diagnosis = await loadOwnDiagnosis(uid, diagnosisId);
    const { cropType, crop, disease, diseaseIdentified, location } = diagnosis;
    const planted = crop || cropType || "crops";
    const issue = disease || diseaseIdentified || "Unknown disease";

    await rateLimit(token, "advisory", 10);

    const prompt = `You are an expert, practical agronomist.
The farmer is growing ${planted} in ${location || "an unknown location"}.
We have identified the following issue: ${issue}.

Provide a short, plain-language treatment advisory that a rural farmer can act on immediately using locally available resources. Focus on immediate next steps.
Keep the tone supportive and authoritative. Do not use markdown. Limit to 3-4 sentences.`;

    const advisoryText = await callGemini(prompt);
    if (!advisoryText || advisoryText.length < 10) {
      throw httpError("internal", "The AI generated an empty or invalid advisory.");
    }

    await serviceClient()
      .from("diagnoses")
      .update({
        advisory_text: advisoryText,
        weather_context: null, // no fabricated weather
        updated_at: new Date().toISOString(),
      })
      .eq("id", diagnosisId);

    return ok({
      status: "success",
      advisory: advisoryText,
      weather: null,
    });
  } catch (err) {
    return fail(err);
  }
});