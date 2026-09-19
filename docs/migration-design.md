# AgriN — Supabase Migration Design

Status: **Phase 4 implemented and verified (2026-09-19). Backend ported; frontend untouched.**

> **Implementation deltas from this approved design:**
>
> - **§5/§8 — Rate-limit RPC final decision:** `rate_limit_check(p_endpoint text, p_max_check int) RETURNS table(ok boolean, remaining int)` uses `auth.uid()` (NOT a `p_user_id` param). It is invoked through the **user-scoped client** (anon key + user JWT in global headers) so `auth.uid()` resolves inside the SECURITY DEFINER body. `REVOKE EXECUTE FROM public; GRANT EXECUTE TO authenticated`. Transactional `SELECT ... FOR UPDATE` + 1-hour array filter + upsert on `(user_id, endpoint)`.
> - **§7 — Auth:** classic supabase-js v2 `createClient` + `auth.getUser(token)` in-function AND `verify_jwt = true` per function in `config.toml` (platform gate). The edge runtime injects `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_JWKS` (verified in `supabase/.temp/start-secrets/.../docker.env`), so no manual env wiring is needed.
> - **§6/§7 — Storage retrieval:** the function re-downloads via the **user-scoped** storage client (not service role) so RLS enforces the owner folder; an explicit `imagePath.startsWith(uid + "/")` prefix guard runs first. Magic bytes via `file-type@16.5.4` `fromBuffer` (import as default — the package is CJS and Deno named-import interop fails), size ≤ 5,242,880.
> - **§7 — Advisory weather:** no `{source:'estimated'}` object is stored; `weather_context` stays `NULL` and the response returns `weather: null`. (Simplest honest option.)
> - **Secret plumbing local:** `supabase/functions/.env` (gitignored) is auto-loaded by `supabase start`; `GEMINI_API_KEY` copied from `functions/.env.local`.
> - **Sold files:** created empty `supabase/seed.sql` (config references `./seed.sql`), added `.env` to `supabase/.gitignore`.
> - **Verified against the local stack (2026-09-19):** unauthenticated → 401; foreign image path → 403; missing crop → 400; missing storage object → 404; magic-byte/size re-check reachable; 6th diagnose call → 429 `resource-exhausted`; happy path diagnose → 200 with Gemini result; advisory → 200 honest `weather: null`; deliver → 200 with Kannada translation + `sms_status {simulated:true, sent:false, to: <profile phone>}`; IDOR guard (foreign diagnosis id) → 404 for advisory & deliver; DB rows (diagnoses, profiles.phone, rate_limits) confirmed via psql; `npm run build` still passes.

Migration of the existing Firebase plant-disease-diagnosis app to Supabase, preserving current functionality. Disease diagnosis remains the primary product. This is **not** a crop-recommendation/soil-ML project.

---

## 1. Current Firebase architecture (verified)

```
React/Vite client ──anon sign-in──▶ Firebase Auth
   └─ uploadBytes ──▶ Firebase Storage  uploads/{uid}/{uuid}.{ext}
   └─ httpsCallable ──▶ Cloud Functions (3)  ──▶ Firestore users/{uid}/...
        diagnose → Gemini vision → writes diagnosis doc
        advisory → Gemini text  → writes advisory + weatherContext (MOCKED)
        deliver  → Gemini Kannada → writes translatedAdvisory + smsStatus (MOCKED)
```

Firestore docs written (admin SDK, bypasses deny-all rules):

- `users/{uid}` — `{ phoneNumber, updatedAt }`
- `users/{uid}/diagnoses/{autoId}` — `{ timestamp, status: pending|success|failed, cropType, imageUrl, location }` then `{ diseaseIdentified, advisoryText, symptoms, confidence, audioUrl, weatherContext, translatedAdvisory, smsStatus, updatedAt }`
- `users/{uid}/rateLimit/{endpoint}` — `{ timestamps[] }` (5/hr diagnose, 10/hr advisory, 10/hr deliver), transactional filter+append

Client never reads Firestore — all data flows through function responses. Storage rules are owner-scoped, `image/*`, <5 MB. Gemini key lives only in `functions/.env.local`.

**Existing bug found (do not copy):** `diagnose` saves the phone number to the *user* doc, but `deliver` reads `diagnosisData.phoneNumber` from the *diagnosis* doc → SMS "to" always falls back to `"Unknown"`.

## 2. Target Supabase architecture

```
React/Vite client ──signInAnonymously()──▶ Supabase Auth (anon JWT)
   └─ storage.from('uploads').upload(...) ──▶ private bucket
   └─ functions.invoke('diagnose'|'advisory'|'deliver') ──▶ Edge Functions (Deno)
        └─ verify JWT → validate ownership → read/verify image → Gemini (secret) → write via service role
Frontend env: SUPABASE_URL + SUPABASE_ANON_KEY (public by design). No service-role, no GEMINI key in frontend.
```

## 3. Firebase → Supabase mapping

| Firebase | Supabase |
|---|---|
| Anonymous Auth | `signInAnonymously()` + `onAuthStateChange` (supported; preserves no-signup UX) |
| Firebase Storage | Storage bucket `uploads`, private |
| Firestore | PostgreSQL `public` schema (3 tables) |
| Cloud Functions (diagnose/advisory/deliver) | Edge Functions, same 3 names/separations |
| Firebase Admin SDK bypass | Edge Functions with service-role client, **after** JWT + ownership checks |
| Firestore rules (deny-all) | RLS: own-row reads only; writes client-denied |
| storage.rules | Storage bucket policies |
| `httpsCallable` | `supabase.functions.invoke()` |
| `FieldValue.serverTimestamp()` | `now()` / `NOW()` |
| Firestore `runTransaction` | SECURITY DEFINER RPC (`rate_limit_check`) running its own transaction |

## 4. Proposed PostgreSQL schema (design only — not created)

```sql
create type diagnosis_status as enum ('pending', 'success', 'failed');

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  phone      text,                          -- validated client+server; nullable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table diagnoses (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references profiles(id) on delete cascade,
  crop                 text not null,
  image_path           text not null,       -- storage path: {uid}/{uuid}.{ext}
  location             text,
  status               diagnosis_status not null default 'pending',
  disease              text,                -- null until success
  symptoms             text,
  confidence           text,                -- model-derived; value-validated in Phase 7/11
  advisory_text        text,
  weather_context      jsonb,               -- nullable; only set with truthful source flag
  translated_advisory  text,
  sms_status           jsonb,               -- honestly-labeled (simulated:true)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index diagnoses_user_created_idx on diagnoses (user_id, created_at desc);

create table rate_limits (
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,                -- 'diagnose' | 'advisory' | 'deliver'
  hits       timestamptz[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);
```

Field decisions: `phone` on `profiles` only (fixes the bug; `deliver` reads it server-side). `sms_status`/`weather_context` stay `jsonb` — they're opaque API-shaped payloads, not query targets. `confidence` stays text (Phase 11 will constrain values). `image_path` is the storage-relative path, kept identical to today's `uploads/{uid}/...` semantics so client and function never diverge.

## 5. RLS model

Boundary: **DB writes happen only in Edge Functions (service role)**. Client (anon key + user JWT) gets read-scoped, own-row access only — mirrors today's "client never touches Firestore."

| Table | Policy |
|---|---|
| `profiles` | SELECT own only: `auth.uid() = id`. UPDATE own only, limited to `phone`. **No INSERT** — profile creation is handled exclusively by the `auth.users` trigger. **No DELETE** |
| `diagnoses` | SELECT: `auth.uid() = user_id` (future listing/history); **no client INSERT/UPDATE/DELETE** |
| `rate_limits` | no client policies at all |
| auto-profile | trigger `on auth.users` insert creates the `profiles` row |

Every Edge Function re-validates ownership server-side (never trusts client-provided IDs): uid comes from the verified JWT; `image_path` must start with `${uid}/` (port of the existing IDOR guard).

## 6. Storage design

- Bucket `uploads`, **private**
- Path `{uid}/{uuid}.{ext}` (preserved), file name generated client-side (`crypto.randomUUID()`), extension sanitized
- Policies (bucket_id = 'uploads'):
  - INSERT: `(storage.foldername(name))[1] = auth.uid()::text` AND `content-type` matches `image/.*` AND size `< 5242880`
  - SELECT: `(storage.foldername(name))[1] = auth.uid()::text`
  - UPDATE/DELETE: none (files immutable)
- Function re-downloads via service role, re-checks magic bytes (`file-type`) and size — belt and braces, as today

## 7. Edge Function responsibilities (3, unchanged separation)

- **`diagnose`**: verify JWT → uid → rate-limit RPC → validate `image_path` ownership → download → magic-byte/size check → Gemini vision (secret) → parse/validate JSON → insert `diagnoses` (pending→success/failed) → return result.
- **`advisory`**: verify JWT → load own diagnosis by id (ownership check) → rate-limit RPC → Gemini advisory → update `advisory_text`; **weather: stop pretending — store nothing real, set `weather_context` null or `{source:'estimated'}`** (decided, not mocked).
- **`deliver`**: verify JWT → own-diagnosis check → rate-limit RPC → Gemini Kannada translation → update `translated_advisory` + `sms_status` with truthful `simulated:true` → return.

Shared Deno helpers: `verifyUser()`, `rateLimit(endpoint, max)`, `downloadAndVerify()`, `callGemini()` (with transient-503 retry/backoff validated in Phase 1).

## 8. Rate limiting

Direct port of the existing semantics → **SECURITY DEFINER RPC** `rate_limit_check(p_endpoint, p_max)` that runs a transaction: `SELECT hits FROM rate_limits WHERE user_id = auth.uid() AND endpoint = p_endpoint FOR UPDATE` → discard hits older than 1 hour → abort if `count >= p_max` → append `now()`, update. Reuses the existing 5/10/10 thresholds. No queues, no extra infra — simple and true to the current behavior.

## 9. Auth migration

`supabase.auth.signInAnonymously()` on boot; `onAuthStateChange` mirrors `onAuthStateChanged`. Anonymous users are real `auth.users` + auto-created `profiles` row via trigger → every Edge Function gets a stable `auth.uid()`. No login/signup screens; UX unchanged.

## 10. Data migration considerations

Currently **emulator-only — no production data exists** (only throwaway emulator test docs/objects). So there is nothing to migrate; the fresh Supabase schema starts clean. If real Firestore data appears later, only `users`/`diagnoses` map (phone + one diagnosis doc per record); explicit no-op on Firebase auth users (anonymous sessions don't transfer).

## 11. Security considerations

- GEMINI_API_KEY: Edge Function secret only — never in frontend or repo
- Service-role key: Edge Function env only; RLS still correct so a leaked anon key is harmless; never ship service-role in `VITE_*`
- `VITE_SUPABASE_ANON_KEY` is public by design (safe to expose)
- Ownership validated in the function (IDOR guard ported), not just in RLS
- `.env.local` layout keeps secrets gitignored; review git history at cleanup
- Storage: private bucket + per-owner path policy; policies include type+size constraints

## 12. Risks / blockers

- **Gemini 503 (high demand)** observed in Phase 1 → function needs retry-with-backoff; UI must show retryable error (already does via error box)
- Edge runtime is Deno: `@google/generative-ai` via `npm:` specifier; inlineData base64 works, but must verify at Phase 8
- PostgREST has no ad-hoc multi-statement transactions → rate limit must be the RPC (designed above)
- `functions.invoke` needs a Supabase URL + anon key in the browser — different env plumbing than Firebase emulator wiring; local `supabase start` vs prod config kept separate (section 14)
- Behavior change: `deliver`'s latent phone bug fixed (phone read from profile, not diagnosis)

## 13. What NOT to copy

- The `phoneNumber`-in-user-doc vs delivery-read mismatch bug
- Mocked weather presented as real (stored in `weatherContext` on every advisory) → nullable/estimated only
- Mock SMS disguised as sent (`simulatedPlatform`) → explicit `simulated: true` + UI relabel (Phase 12)
- `db`/`getFirestore` dead client exports and deny-all Firestore rules
- Firebase-emulator-only `connect*Emulator` bloat and "Running in emulator mode" copy

## 14. Emulator-local vs production config

- **Local design:** `supabase start` (Docker; Studio, auth, storage, Postgres, edge runtime-inspect), `.env.local` with local `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, Edge Function secrets local via `supabase secrets set --env-file ./supabase/.env.local`
- **Prod design:** hosted Supabase project + `supabase functions deploy` with `secrets set` for `GEMINI_API_KEY`/`SERVICE_ROLE_KEY`; frontend vars swapped via deploy env. Local and prod env var names identical; values never overlap, never in repo.

## Implementation order (Phase 3 →)

1. `supabase start` + scaffold; add `.env.local` vars (local); install `@supabase/supabase-js`
2. Migration SQL: tables + enum + trigger + RLS; verify policies with a second test user
3. Storage bucket `uploads` (private) + policies
4. Edge Functions (shared helpers → diagnose → advisory → deliver), set secrets, local invoke tests
5. Frontend: `src/lib/supabase.ts`, rewrite `useAuth.tsx`, swap Storage + invoke in `Home.tsx` (UI otherwise untouched)
6. Honesty fixes: weather, SMS labels; confidence/output validation
7. Validation + retry on Gemini 503
8. Playwright smoke test of the 12-step flow (extended from Phase 1 harness)
9. Firebase cleanup (after verification): delete `src/lib/firebase.ts`, `functions/`, firebase configs/rules, remove deps
10. README + final build/test/status pass