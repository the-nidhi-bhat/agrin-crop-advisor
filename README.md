# AgriN Crop Advisor

A local-first, serverless agriculture diagnostic pipeline built with Firebase Emulators, React, and Gemini 3.6 Flash.

## How to run locally

This project relies entirely on the Firebase Emulator suite. No live cloud resources are needed other than a valid Gemini API key.

### 1. Install dependencies

In the root directory:
```bash
npm install
```

In the `functions/` directory:
```bash
cd functions
npm install
```

### 2. Add your Gemini API key

Create a `.env.local` file inside the `functions/` directory (this file is gitignored):

```
GEMINI_API_KEY="your-real-gemini-api-key"
```

### 3. Build the Cloud Functions

Still in the `functions/` directory, compile the TypeScript source:

```bash
npm run build
cd ..
```

### 4. Start the Application

From the root directory, start the full Firebase Emulator suite (this runs Hosting, Functions, Firestore, Storage, and Auth locally):

```bash
firebase emulators:start
```

The application will be available at `http://127.0.0.1:5000` or via Vite depending on your setup.
The Firebase Emulator UI will be available at `http://127.0.0.1:4000`.

## Architecture

- **Frontend:** React + Vite
- **Backend:** Firebase Cloud Functions (Node.js)
- **Database/Storage:** Firestore, Firebase Storage
- **AI:** Google Generative AI (Gemini 3.6 Flash)

All features (Diagnosis, Advisory, Translation/TTS, Mock SMS) are secured behind rate limiters and strict Firestore IDOR-prevention rules.
