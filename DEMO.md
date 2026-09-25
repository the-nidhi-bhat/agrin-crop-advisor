# AgriN — Demo Guide for Judges

A 60–90 second walkthrough of the verified AgriN happy path, designed to be followed
alongside the recorded demo video (add the final YouTube link to the README).

> The recorded demo uses the **verified Tomato golden path**: Auth → Crop selection →
> real tomato-leaf photo → Gemini diagnosis → Advisory → Kannada guidance → Audio →
> Crop Health history → persistence. Everything shown is real — the app runs with
> Supabase Auth/Storage/PostgreSQL/Edge Functions and the Google Gemini API.

## Demo flow (one take, ~90s)

1. **Open AgriN.** Land on the Home screen — "Understand what is happening to your crop."
2. **Sign in.** A fresh visitor is signed in automatically; or use Sign in / Create an
   account (the screens are real Supabase Auth, not mocked).
3. **Go to Scan.** Tap the prominent *Scan your crop* call to action.
4. **Select the crop.** Choose **Tomato** from the ten supported crops.
5. **Upload a real leaf image.** A tomato leaf photo with visual symptoms (e.g.,
   septoria leaf spot or early blight).
6. **Start the scan.** Press **Scan crop**.
7. **Watch the AI process it.** The four honest stages play in order:
   *Preparing your scan → Examining the crop → Preparing your guidance → Finalizing
   your guidance.* This is the live **diagnose → advisory → deliver** pipeline.
8. **Show the diagnosis.** The result appears: the identified disease, a confidence
   label, and "what the photo shows."
9. **Show the advisory.** Clear *What to do now* guidance generated for that diagnosis.
10. **Kannada + audio.** Open the **Language guidance** control, switch to **ಕನ್ನಡ**,
    and press **Play audio** to hear the guidance read aloud.
11. **Open Crop Health.** The scan is saved to this account's private history.
12. **Show the saved history.** The diagnosis card, confidence, advisory, and note that
    SMS delivery is currently simulated.
13. *(if time permits)* **Refresh the page** — the session and history persist.

## If Gemini quota is unavailable on demo day

The diagnosis/advisory steps return a friendly, honest message and the app never shows
a fake result. If this happens, you can still demo: auth, crop selection, upload,
processing stages, error recovery, language settings, and Crop Health — then re-run the
scan once the AI quota resets.

## What not to show

- No fabricated diseases, confidence values, weather, or SMS receipts.
- No API keys, terminals, or internal Supabase pages on screen.
- No claims beyond what this repo does (no full multilingual translation, no
  exhaustive disease database).

## Suggested script

> "AgriN turns a leaf photo into actionable crop guidance. [scan] After picking the
> crop, we upload a real leaf. The photo goes to our Supabase backend, an Edge Function
> sends it to Google's Gemini model with the crop as context, and Gemini returns a
> structured diagnosis and advisory. [result] Here it is — disease, confidence, and what
> to do. [Kannada + audio] We read it out in Kannada with the device voice. [health]
> Every scan is saved privately to this account's history."