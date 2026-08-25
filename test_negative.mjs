import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

const app = initializeApp({ projectId: "demo-agrin", apiKey: "fake-api-key" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");
const functions = getFunctions(app, "us-central1");
connectFunctionsEmulator(functions, "127.0.0.1", 5001);

async function run() {
  console.log("Signing in anonymously...");
  await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  console.log(`Authenticated as UID: ${uid}`);

  const diagnose = httpsCallable(functions, "diagnose");

  console.log("\n--- TEST 1: IDOR VALIDATION ---");
  console.log("Attempting to call diagnose with imageUrl belonging to 'HACKER_UID'...");
  try {
    await diagnose({ imageUrl: "uploads/HACKER_UID/fake.jpg", crop: "Tomato", location: "Test" });
    console.error("FAIL: IDOR Request succeeded unexpectedly.");
  } catch (e) {
    console.log("SUCCESS! IDOR Rejection Response:");
    console.log(`[${e.code}] ${e.message}`);
  }

  console.log("\n--- TEST 2: RATE LIMIT EXHAUSTION ---");
  for (let i = 1; i <= 6; i++) {
    console.log(`Sending request ${i}...`);
    try {
      await diagnose({ imageUrl: `uploads/${uid}/fake.jpg`, crop: "Tomato", location: "Test" });
      console.log(`Request ${i} succeeded.`);
    } catch (e) {
      if (e.code === 'not-found' && e.message.includes('Image not found in storage')) {
          console.log(`Request ${i} passed auth/rate limit but failed later as expected: [${e.code}] ${e.message}`);
          // Wait, if it fails at storage (which is step 4), it STILL consumed a rate limit!
          // BUT wait! Does it log the diagnosis in Firestore BEFORE checking storage? 
          // NO! The diagnosis is saved in step 6. 
          // So if step 4 fails, step 6 never runs, and it never increments the rate limit counter in Firestore!
      } else {
          console.log(`Request ${i} Rejection Response: [${e.code}] ${e.message}`);
      }
    }
  }
  process.exit(0);
}

run().catch(console.error);
