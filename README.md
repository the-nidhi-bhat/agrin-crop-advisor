# AgriN — AI-Powered Crop Health Companion

AgriN helps farmers understand what is happening to their crops. Take a photo of an affected leaf, and AgriN reads it server-side — identifying the likely condition, giving clear next steps in plain language, and delivering guidance in Kannada too.

The experience is built around one calm, practical loop:

**Scan → Understand → Act → Monitor**

- **Scan** — choose a crop (Tomato, Chili, or Paddy) and photograph an affected leaf.
- **Understand** — get a plain-language read on the likely condition, with a confidence level when the AI model provides one.
- **Act** — receive step-by-step, action-oriented advisory in English and Kannada you can act on with local resources.
- **Monitor** — Crop Health will group your scans by crop over time, building a picture of how each crop is tracking.

> **AI output is advisory only — it is not a professional agricultural diagnosis.** Always confirm treatments with a local agricultural extension officer.

---

## What it does

### Key features

- **Crop selection** — choose Tomato, Chili, or Paddy with a keyboard-accessible, screen-reader-friendly picker.
- **Leaf photo upload** — attach an image of the affected leaf and see a live preview with validation.
- **Image validation & preview** — image files only, up to 5 MB (same limit enforced server-side); review or change the photo before scanning.
- **Guided scan experience** — a calm three-step flow with clear, honest analysis stages while the scan runs.
- **AI-assisted analysis** — the leaf photo is analyzed server-side by Gemini vision for a plain-language condition read.
- **Confidence-aware results** — the confidence value comes from the AI model; we never synthesize one.
- **Action-oriented advisory** — immediate, practical guidance you can act on today.
- **Kannada guidance** — the advisory is delivered in ಕನ್ನಡ (Kannada) too, with optional text-to-speech playback on device.
- **Optional details** — add location or a phone number (optional) so guidance can be tailored and the SMS advisory has somewhere to go.
- **Crop health/history foundation** — scans are recorded and grouped by crop for future monitoring.
- **Error, retry & slow-state handling** — clear, friendly errors, a retry path, and honest "taking longer than expected" feedback when a scan runs slowly.
- **Responsive & accessible** — responsive layouts down to small phones, keyboard navigation, reduced-motion support, and accessible names/regions throughout.

### Supported crops

- Tomato
- Chili
- Paddy

## How a scan works

1. **Choose the crop and photograph the leaf.** The image is validated in the browser (type + size) and previewed before you commit.
2. **Upload to private storage.** The photo is stored in a private `uploads` bucket at `{userId}/{uuid}.{ext}`, owned by the user.
3. **Analyze (Edge Function `diagnose`)** — the image is re-validated server-side, then sent to Gemini vision for a condition read (confidence comes only from the model).
4. **Advise (Edge Function `advisory`)** — a practical, action-oriented treatment plan is generated.
5. **Deliver (Edge Function `deliver`)** — the advisory is translated to Kannada and an SMS version is prepared.

Each step surfaces as an honest progress stage in the app — and the SMS is clearly marked as simulated (no provider connected) rather than faked.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| AI | Google Gemini (Gemini 3.6 Flash), called **server-side only** |
| Server logic | Supabase Edge Functions (Deno) |
| Database | PostgreSQL with Row-Level Security |

## Architecture & security

- **React/Vite frontend** with `@supabase/supabase-js` — auth, storage, and Edge Function invocation.
- **Supabase Auth** — anonymous sign-in first, with an auto-provisioned account fallback for local stacks; no sign-up screen. A legitimate, JWT-authenticated session is required to scan.
- **Private Storage** — leaf images live in a private `uploads` bucket at owner-scoped paths.
- **Row-Level Security** — the database enforces own-row reads; writes happen in Edge Functions via the service role only.
- **Edge Functions** verify the JWT and re-check ownership of every resource (IDOR protection) for each call.
- **Rate limiting** — transactional, server-side limits per user (see the table below).
- **No secrets in the frontend** — the Gemini API key and service-role credentials live only in server-side code and gitignored environment files; the browser ships only the public anon key.
- **Honest AI boundaries** — confidence is accepted from the model, never invented; weather stays `null` rather than fabricated; SMS delivery is labeled `simulated`.

## Edge Functions

All Edge Functions live under `supabase/functions/`, sharing helpers in `supabase/functions/_shared/agrin.ts` (auth, rate limiting, Gemini calls, response contracts).

| Function | Purpose | Rate limit |
|---|---|---|
| `diagnose` | Image → Gemini vision → condition, symptoms, advisory, confidence → stores a `diagnoses` row | 5/hr |
| `advisory` | Loads the user's diagnosis → Gemini text advisory (weather stays `null`) | 10/hr |
| `deliver` | Gemini Kannada translation → stores it + honest simulated SMS status | 10/hr |

---

## Project structure

```
src/                           # React frontend
  lib/supabase.ts              # supabase-js client (VITE_* env)
  lib/crops.ts                 # supported crops + care tips
  hooks/useAuth.tsx            # auto-auth provider
  pages/                       # HomePage, ScanPage, HealthPage, SettingsPage
  components/scan/             # crop selector, upload zone, scan result
  components/ui/               # shared UI primitives
supabase/
  config.toml                  # local stack configuration
  migrations/                  # SQL schema + RLS + rate-limit RPC
  functions/                   # Edge Functions (diagnose/advisory/deliver)
    _shared/agrin.ts           # shared auth/rate-limit/Gemini/response helpers
docs/
  migration-design.md          # Firebase → Supabase migration notes
```

---

## Getting started (local development)

### Requirements

- **Node.js** 18+ (built against Node 24)
- **Docker Desktop** (required by the Supabase local stack)
- **Supabase CLI** (`npm i -g supabase`) — or use the pinned version via `npx supabase`
- A **Google Gemini API key** to run real AI calls

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

The Edge Functions read the key from `supabase/functions/.env` (gitignored); `supabase start` loads it automatically:

```
GEMINI_API_KEY="your-real-gemini-api-key"
```

### 4. Configure the frontend

Copy `.env.example` to `.env.local` (gitignored) and fill in the values. For the local stack:

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
npx supabase functions serve   # run the Edge Functions development server
npm run build                  # type-check (tsc -b) + production build
npm run lint                   # oxlint
```

---

## Migration notes

The Firebase → Supabase migration is documented in [`docs/migration-design.md`](docs/migration-design.md). Highlights: Firestore → Postgres + RLS, Firebase Storage → private Supabase bucket, Cloud Functions → Edge Functions, `runTransaction` → a SECURITY DEFINER `rate_limit_check` RPC, and `FieldValue.serverTimestamp()` → `now()`. The legacy Firebase phone-number bug (SMS always sent to "Unknown") is fixed: `deliver` now reads the phone from the user's `profiles` row.

---

## Disclaimer

AgriN provides AI-assisted crop guidance for general care. Results are advisory and not a professional or definitive agricultural diagnosis. Local conditions, soil, and weather differ — always confirm any treatment with a local agricultural extension officer before applying it.