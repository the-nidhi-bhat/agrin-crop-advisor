// AgriN translate Edge Function — on-demand advisory translation into any of
// the nine supported languages. English returns the stored advisory unchanged
// (no Gemini call). Translations are cached client-side on the result screen;
// nothing is persisted here. The target language is checked against an
// allowlist, never trusted from free-form input.

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
} from "../_shared/agrin.ts";

const NATIVE_NAMES: Record<string, string> = {
  en: "English",
  kn: "Kannada",
  hi: "Hindi",
  mr: "Marathi",
  te: "Telugu",
  ta: "Tamil",
  ml: "Malayalam",
  bn: "Bengali",
  gu: "Gujarati",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsResponse();

  try {
    const { uid, token } = await authFromRequest(req);
    const body = await readJson(req);
    const diagnosisId = body.diagnosisId;
    const language = body.language;

    if (!diagnosisId || typeof diagnosisId !== "string") {
      throw httpError("invalid-argument", "Missing diagnosisId.");
    }
    if (typeof language !== "string" || !NATIVE_NAMES[language]) {
      throw httpError("invalid-argument", "Unsupported language.");
    }

    const diagnosis = await loadOwnDiagnosis(uid, diagnosisId);
    const advisoryText = diagnosis.advisory_text;
    if (!advisoryText) {
      throw httpError(
        "failed-precondition",
        "Advisory text missing from diagnosis record.",
      );
    }

    // English needs no translation and no Gemini call.
    if (language === "en") {
      return ok({ language, translatedText: advisoryText });
    }

    await rateLimit(token, "translate", 10);

    const target = NATIVE_NAMES[language];
    const prompt = `Translate the following agricultural treatment plan into fluent ${target}.
Only output the translation in ${target}, with no other text or explanation. Keep crop names,
dosages, warnings, and safety instructions accurate, and preserve any uncertainty in the plan.
Do not translate the disclaimer that this is AI-generated advisory.
Text to translate:
"${advisoryText}"`;

    const translatedText = await callGemini(prompt);
    if (!translatedText || translatedText.length < 5) {
      throw httpError("internal", "The translation generated was empty or invalid.");
    }

    return ok({ language, translatedText });
  } catch (err) {
    return fail(err);
  }
});