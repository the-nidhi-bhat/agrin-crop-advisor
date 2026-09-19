# AgriN — Crop Advisor

A local-first, serverless plant disease diagnosis app for farmers. A farmer uploads a photo of a crop leaf, and an AI pipeline identifies the disease, explains the symptoms, gives a plain-language treatment advisory, translates it to Kannada, and prepares an SMS delivery.

**AI backend:** [`Gemini 3.6 Flash`](https://ai.google.dev/) (via the Google Generative AI SDK).
**Platform:** [Supabase](https://supabase.com) local stack (PostgreSQL + Edge Functions + Auth + Storage). The original Firebase implementation is being migrated to Supabase.

---

## What the app does

1. **Diagnose** — uploads a leaf photo and runs Gemini vision to detect the disease/health of the crop.
2. **Advisory** — generates a practical, immediate treatment plan a rural farmer can act on.
3. **Deliver** — translates the advisory to Kannada and prepares an SMS.

Supporting behavior:

- **Anonymous-first auth** — no sign-up screen. Supabase anonymous sign-in is tried first; on local stacks where it is disabled, a throwaway email/password account is auto-provisioned and persisted in `localStorage`.
- **Private storage** — leaf images live in a private `uploads` bucket at `{uid}/{uuid}.{ext}`, owner-scoped by row-level security.
- **Rate limiting** — server-side, transactional: `diagnose` 5/hour, `advisory` and `deliver` 10/hour (per user, rolling 1-hour window).
- **Honest mocks** — the SMS is clearly labeled `simulated: true` (no fake "sent" status), and weather context is intentionally `null` rather than fabricated.
- **IDOR protection** — every function re-validates that resources belong to the JWT-authenticated user.

## Current status

- ✅ Backend migrated to Supabase and verified end-to-end against the local stack (real leaf image).
- ✅ Frontend infrastructure migrated (auth, storage, function invocation) — no login screen, no Firebase in the hot paths.
- ⚠️ **Known issue:** the frontend uploads to `uploads/{uid}/…` but the Supabase storage policy expects `{uid}/…` (no `uploads/` prefix). The browser happy path is blocked on this; the fix is not yet applied.
- 🗑️ Firebase files (`functions/`, `firebase.json`, `firestore.*`, `storage.rules`, `src/lib/firebase.ts`) are still present and will be removed once the migration is complete.

---

## Requirements

- **Node.js** 18+ (built against Node 24)
- **Docker Desktop** (required by the Supabase local stack)
- **Supabase CLI** (`npm i -g supabase`) — or use the pinned version via `npx supabase`
- A **Google Gemini API key** to run real AI calls

## Getting started (local development)

All commands run from the repository root.

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local Supabase stack

```bash
npx supabase start
```

This boots the full local stack via Docker: Postgres, Auth, Storage, Edge Functions runtime, and Studio. It applies the migrations in `supabase/migrations/`.

### 3. Add the Gemini API key

The Edge Functions read the key from `supabase/functions/.env` (gitignored). `supabase start` loads it automatically:

```
GEMINI_API_KEY="your-real-gemini-api-key"
```

### 4. Configure the frontend

Copy `.env.example` to `.env.local` (gitignored) and fill in the values. For the local stack they are:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your anon key — from `npx supabase status -o env`>
```

The anon key is public by design (safe to ship to the browser). Never put service-role or Gemini keys in frontend env files.

### 5. Run the app

```bash
npm run dev
```

Open `http://localhost:5173`.

### Other useful commands

```bash
npx supabase status            # URLs + keys for the running local stack
npx supabase start             # start (or restart) the local stack
npx supabase functions serve   # run Edge Functions development server
npm run build                  # type-check (tsc -b) + production build
npm run lint                   # oxlint
```

---

## Architecture

```
React/Vite frontend
   ├─ supabase.auth            → anonymous / auto-provisioned session (JWT)
   ├─ supabase.storage         → uploads/{uid}/{uuid}.{ext}  (private bucket, RLS)
   └─ supabase.functions       → invoke 'diagnose' | 'advisory' | 'deliver'
        └─ Edge Functions (Deno)
             ├─ verify JWT + ownership (IDOR guards)
             ├─ rate-limit RPC (SECURITY DEFINER, auth.uid())
             ├─ storage re-download + magic-byte/size re-check
             └─ Gemini (key stays server-side) → write via service role
```

- **Frontend:** React + Vite + Tailwind, `@supabase/supabase-js`
- **Database:** PostgreSQL — `public.profiles`, `public.diagnoses`, `public.rate_limits` (RLS: own-row read only; writes happen in Edge Functions via service role)
- **Storage:** private `uploads` bucket, owner-folder policies, image-only + < 5 MB
- **AI:** Google Generative AI (Gemini 3.6 Flash), called only from Edge Functions
- **TTS:** client-side Web Speech API (no server audio)

## Edge Functions

All under `supabase/functions/`, sharing helpers in `supabase/functions/_shared/agrin.ts`.

| Function | Purpose | Rate limit |
|---|---|---|
| `diagnose` | Image → Gemini vision → disease, symptoms, advisory, confidence → stores `diagnoses` row | 5/hr |
| `advisory` | Loads own diagnosis → Gemini text advisory → stores `advisory_text` (weather stays `null`) | 10/hr |
| `deliver` | Gemini Kannada translation → stores `translated_advisory` + honest `sms_status` (simulated) | 10/hr |

## Project structure

```
docs/                          # migration design notes
src/                           # React frontend
  lib/supabase.ts              # supabase-js client (VITE_* env)
  hooks/useAuth.tsx            # auto auth provider
  pages/Home.tsx               # the diagnostic flow UI
supabase/
  config.toml                  # local stack configuration
  migrations/                  # SQL schema + RLS + rate-limit RPC
  seed.sql                     # (empty) local seed
  functions/                   # Edge Functions (diagnose/advisory/deliver)
    _shared/agrin.ts           # shared auth/rate-limit/Gemini/response helpers
```

## Migration notes

The Firebase → Supabase migration is documented in [`docs/migration-design.md`](docs/migration-design.md). Highlights: Firestore → Postgres + RLS, Firebase Storage → private Supabase bucket, Cloud Functions → Edge Functions, `runTransaction` → a SECURITY DEFINER `rate_limit_check` RPC, and `FieldValue.serverTimestamp()` → `now()`. The Firebase phone-number bug (SMS always sent to "Unknown") is fixed: `deliver` now reads the phone from the user's `profiles` row.