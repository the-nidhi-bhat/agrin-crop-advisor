// Shared helpers for AgriN Edge Functions (diagnose / advisory / deliver).
// Ported from docs/migration-design.md §7-§8 and the Firebase Cloud Functions.

import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fileType from "file-type";

// Free-tier quota is capped per model and cycles through the day. Probe each
// before relying on it: gemini-3.5-flash returned 429 (2026-09-25); the legacy
// 2.x/1.5-flash names are 404/deprecated. gemini-3.6-flash is live and returns
// the same vision+JSON contract (verified host probe 2026-09-25).
export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5242880
const GEMINI_TIMEOUT_MS = 45_000; // bound each attempt so a hung call returns an honest 503 instead of a platform 504; 45s fits measured 5-8s typical + rare slow spikes
// A hang is retried once, but only once: 2 x 45s + 0.7s backoff ~= 91s, inside the
// 150s Free-plan edge wall clock / idle timeout.
const GEMINI_TIMEOUT_ATTEMPTS = 2;

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const HTTP_STATUS: Record<string, number> = {
  unauthenticated: 401,
  "invalid-argument": 400,
  "permission-denied": 403,
  "not-found": 404,
  "failed-precondition": 409,
  "resource-exhausted": 429,
  internal: 500,
  unavailable: 503,
};

export function httpError(code: string, message: string) {
  return new ApiError(code, HTTP_STATUS[code] ?? 500, message);
}

export interface AuthCtx {
  uid: string;
  token: string;
}

// Verify the Supabase JWT from the Authorization header and return the uid.
// The uid always comes from the verified token, never from the request body.
export async function authFromRequest(req: Request): Promise<AuthCtx> {
  const authz = req.headers.get("Authorization") ?? "";
  const token = authz.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    throw httpError("unauthenticated", "The function must be called while authenticated.");
  }

  const sb = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) {
    throw httpError("unauthenticated", "Invalid or expired token.");
  }
  return { uid: data.user.id, token };
}

export function SUPABASE_URL() {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw httpError("internal", "Server configuration error.");
  return url;
}

export function SUPABASE_ANON_KEY() {
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!key) throw httpError("internal", "Server configuration error.");
  return key;
}

export function SUPABASE_SERVICE_ROLE_KEY() {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw httpError("internal", "Server configuration error.");
  return key;
}

// User-scoped client (RLS applies). Used for the rate-limit RPC (auth.uid()
// must resolve from the caller's JWT) and for Storage reads (owner-scoped).
export function userClient(token: string) {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

// Privileged client used ONLY for DB writes inside Edge Functions, after
// JWT + ownership checks. Never exposed to the browser.
export function serviceClient() {
  return createClient(SUPABASE_URL(), SUPABASE_SERVICE_ROLE_KEY(), {
    auth: { persistSession: false },
  });
}

// Deduct one slot from the user's per-endpoint 60-minute bucket.
// Runs the SECURITY DEFINER RPC as the user so auth.uid() scopes the row.
export async function rateLimit(token: string, endpoint: string, max: number) {
  const { data, error } = await userClient(token).rpc("rate_limit_check", {
    p_endpoint: endpoint,
    p_max_check: max,
  });
  if (error) {
    throw httpError("internal", `Rate limiting unavailable: ${error.message}`);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.ok) {
    throw httpError(
      "resource-exhausted",
      `Rate limit exceeded for ${endpoint} endpoint (max ${max}/hour).`,
    );
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Load a diagnosis owned by the given uid, or throw not-found. The uid comes
// from the verified JWT, so the user_id filter is the IDOR guard.
export async function loadOwnDiagnosis(uid: string, diagnosisId: string) {
  if (!UUID_RE.test(diagnosisId)) {
    throw httpError("invalid-argument", "Missing or invalid diagnosisId.");
  }
  const { data, error } = await serviceClient()
    .from("diagnoses")
    .select("*")
    .eq("id", diagnosisId)
    .eq("user_id", uid)
    .limit(1);
  if (error) {
    throw httpError("internal", `Failed to load diagnosis: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw httpError("not-found", "Diagnosis not found.");
  }
  return data[0];
}

// Re-download the image and verify magic bytes + size.
// imagePath is storage-relative (`{uid}/{uuid}.{ext}` inside the 'uploads'
// bucket, design §5-§6) — the same string the browser uploads and passes in.
export async function downloadAndVerify(token: string, uid: string, imagePath: string) {
  // Ownership guard: path must live under the verified uid's folder.
  if (!imagePath.startsWith(`${uid}/`)) {
    throw httpError(
      "permission-denied",
      "The imageUrl does not belong to the authenticated user.",
    );
  }

  const { data, error } = await userClient(token)
    .storage
    .from("uploads")
    .download(imagePath);

  // RLS enforces folder ownership; a foreign path surfaces here too.
  if (error || !data) {
    throw httpError("not-found", "Image not found in storage.");
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw httpError("invalid-argument", "Image exceeds the 5 MB limit.");
  }

  const typeInfo = await fileType.fromBuffer(bytes);
  if (!typeInfo || !typeInfo.mime.startsWith("image/")) {
    throw httpError(
      "invalid-argument",
      "The uploaded file has an invalid signature or is not an image.",
    );
  }

  return { bytes, mime: typeInfo.mime };
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000; // avoid call-stack overflow on large images
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Gemini helper with retry on transient 503/429 (design §12: "high demand").
// Prompts are built by each function; this only transports and validates.
export async function callGemini(
  prompt: string,
  image?: { mime: string; base64: string },
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw httpError("internal", "Server configuration error.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    { model: GEMINI_MODEL },
    { timeout: GEMINI_TIMEOUT_MS },
  );

  const parts = image
    ? [prompt, { inlineData: { data: image.base64, mimeType: image.mime } }]
    : [prompt];

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const started = Date.now();
    try {
      const result = await model.generateContent(parts);
      const text = result.response.text().trim();
      if (!text) {
        throw httpError("internal", "The AI generated an empty response.");
      }
      console.log(JSON.stringify({ ev: "gemini_ok", attempt, ms: Date.now() - started }));
      return text;
    } catch (err) {
      // Classify from the SDK's own fields only. The error message embeds the
      // Gemini API error payload, so it is never logged.
      const timedOut = isTimeout(err);
      const status = geminiStatus(err);
      console.warn(
        JSON.stringify({
          ev: "gemini_fail",
          kind: timedOut ? "timeout" : status ? `http_${status}` : "other",
          attempt,
          ms: Date.now() - started,
        }),
      );
      lastError = err;
      // Timeouts ARE intermittent in production (a fresh request usually
      // succeeds), so allow one more attempt -- capped separately so 3 x 45s
      // cannot overrun the wall clock.
      const cap = timedOut ? GEMINI_TIMEOUT_ATTEMPTS : maxAttempts;
      if (attempt < cap && (timedOut || isTransient(err))) {
        await new Promise((r) => setTimeout(r, attempt * 700));
        continue;
      }
      break;
    }
  }

  if (isTimeout(lastError)) {
    throw httpError("unavailable", "The AI service timed out. Please try again in a moment.");
  }
  if (isTransient(lastError)) {
    throw httpError("unavailable", "AI service is busy. Please try again in a moment.");
  }
  throw httpError("internal", "An error occurred while contacting the AI model.");
}

function isTimeout(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : String(err);
  return (
    name === "AbortError" ||
    name === "GoogleGenerativeAIAbortError" ||
    /timeout|timed ?out|abort|cancell?ed/i.test(msg)
  );
}

// @google/generative-ai@0.24.1 GoogleGenerativeAIFetchError carries the HTTP
// status as a field. Read it instead of regexing the message, which embeds the
// API error payload. Our own ApiError also has a .status, so exclude it — an
// application error is not a Gemini HTTP response.
function geminiStatus(err: unknown): number | null {
  if (err instanceof ApiError) return null;
  const s = (err as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : null;
}

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|429|500|overloaded|high demand|resource_exhausted|unavailable/i.test(msg);
}

// Parse the Gemini JSON result and validate every field. Confidence is only
// accepted from the model — never synthesized by us.
export function parseDiagnosisJson(raw: string): {
  disease: string;
  symptoms: string;
  advisory: string;
  confidence: string | null;
} {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();
  let obj: any;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    throw httpError("internal", "The AI returned invalid JSON.");
  }

  const disease = typeof obj.disease === "string" ? obj.disease.trim() : "";
  const symptoms = typeof obj.symptoms === "string" ? obj.symptoms.trim() : "";
  const advisory = typeof obj.advisory === "string" ? obj.advisory.trim() : "";
  if (!disease || !symptoms || !advisory) {
    throw httpError("internal", "The AI response was missing required fields.");
  }

  const confidence = ["High", "Medium", "Low"].find(
    (level) => String(obj.confidence ?? "").toLowerCase() === level.toLowerCase(),
  );
  return { disease, symptoms, advisory, confidence: confidence ?? null };
}

// CORS + response helpers. Matches the httpsCallable error shape `{ code, message }`
// so a future functions.invoke client maps errors identically.
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function ok(body: unknown): Response {
  return Response.json(body, { headers: CORS_HEADERS });
}

export function fail(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status, headers: CORS_HEADERS },
    );
  }
  const message = err instanceof Error ? err.message : "An unknown error occurred.";
  return Response.json(
    { error: { code: "internal", message } },
    { status: 500, headers: CORS_HEADERS },
  );
}

export async function readJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    throw httpError("invalid-argument", "Request body must be valid JSON.");
  }
}