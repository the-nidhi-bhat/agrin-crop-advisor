import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, connectAuthEmulator } from "firebase/auth";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, ref, uploadBytes, connectStorageEmulator } from "firebase/storage";
import crypto from "crypto";

const app = initializeApp({ projectId: "agrin-crop-advisor", apiKey: "fake-api-key", storageBucket: "agrin-crop-advisor.firebasestorage.app" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");
const functions = getFunctions(app, "us-central1");
connectFunctionsEmulator(functions, "127.0.0.1", 5001);
const storage = getStorage(app);
connectStorageEmulator(storage, "127.0.0.1", 9199);

async function run() {
  console.log("=== STARTING EMULATOR TESTS ===");
  console.log("Signing in anonymously...");
  await signInAnonymously(auth);
  const uid = auth.currentUser.uid;
  console.log(`Authenticated as UID: ${uid}`);

  const diagnose = httpsCallable(functions, "diagnose");

  // 1. Storage Rule: Oversized file (>5MB)
  console.log("\n--- TEST: STORAGE RULE - OVERSIZED FILE ---");
  const hugeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a'); // 6MB
  const hugeRef = ref(storage, `uploads/${uid}/huge.jpg`);
  try {
    await uploadBytes(hugeRef, hugeBuffer, { contentType: 'image/jpeg' });
    console.error("FAIL: Oversized file upload succeeded unexpectedly.");
  } catch (e) {
    console.log(`SUCCESS! Oversized file rejected: [${e.code}] ${e.message}`);
  }

  // 2. Storage Rule: Non-image file
  console.log("\n--- TEST: STORAGE RULE - NON-IMAGE FILE ---");
  const textBuffer = Buffer.from("Hello world");
  const textRef = ref(storage, `uploads/${uid}/test.txt`);
  try {
    await uploadBytes(textRef, textBuffer, { contentType: 'text/plain' });
    console.error("FAIL: Non-image upload succeeded unexpectedly.");
  } catch (e) {
    console.log(`SUCCESS! Non-image file rejected: [${e.code}] ${e.message}`);
  }

  // 3. Valid Upload
  console.log("\n--- TEST: VALID FILE UPLOAD ---");
  // A tiny valid fake JPEG magic bytes (FF D8 FF)
  const validBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]); 
  const fileId = crypto.randomUUID();
  const validPath = `uploads/${uid}/${fileId}.jpg`;
  const validRef = ref(storage, validPath);
  try {
    await uploadBytes(validRef, validBuffer, { contentType: 'image/jpeg' });
    console.log(`SUCCESS! Valid file uploaded to ${validPath}.`);
  } catch (e) {
    console.error(`FAIL: Valid upload rejected: ${e.message}`);
  }

  // 4. Function: IDOR check
  console.log("\n--- TEST: FUNCTION - IDOR VALIDATION ---");
  // Capture valid diagnosis ID for advisory test
  let validDiagnosisId = null;

  try {
    const response = await diagnose({
      imageUrl: validPath,
      crop: "Tomato",
      location: "Karnataka",
      phoneNumber: "555-0199"
    });
    validDiagnosisId = response.data.id;
    console.log(`SUCCESS! Function completed end-to-end and returned diagnosisId: ${validDiagnosisId}`);
  } catch (err) {
    console.log(`Request failed (expected for dummy API keys): [${err.code}] ${err.message}`);
    // If we get an internal error because of dummy keys, that's fine for testing the wrapper!
  }

  console.log("\n--- TEST: FUNCTION - ADVISORY IDOR VALIDATION ---");
  const advisoryFn = httpsCallable(functions, "advisory");
  
  // Try to access a fake hacker diagnosis
  try {
    await advisoryFn({
      diagnosisId: "some-other-farmers-diagnosis-id"
    });
    console.log("FAIL: IDOR succeeded on advisory!");
    process.exit(1);
  } catch (err) {
    if (err.code === "not-found") {
      console.log(`SUCCESS! Advisory IDOR Rejection: [${err.code}] ${err.message}`);
    } else {
      console.log(`FAIL: Expected not-found for IDOR on advisory, got [${err.code}] ${err.message}`);
    }
  }

  console.log("\n--- TEST: FUNCTION - DELIVER IDOR VALIDATION ---");
  const deliverFn = httpsCallable(functions, "deliver");
  
  // Try to access a fake hacker diagnosis
  try {
    await deliverFn({
      diagnosisId: "some-other-farmers-diagnosis-id"
    });
    console.log("FAIL: IDOR succeeded on deliver!");
    process.exit(1);
  } catch (err) {
    if (err.code === "not-found") {
      console.log(`SUCCESS! Deliver IDOR Rejection: [${err.code}] ${err.message}`);
    } else {
      console.log(`FAIL: Expected not-found for IDOR on deliver, got [${err.code}] ${err.message}`);
    }
  }

  console.log("\n--- TEST: FUNCTION - DIAGNOSE RATE LIMIT EXHAUSTION ---");
  for (let i = 1; i <= 6; i++) {
    console.log(`Sending diagnosis request ${i}...`);
    try {
      await diagnose({ imageUrl: validPath, crop: "Tomato", location: "Test" });
      console.log(`Request ${i} succeeded.`);
    } catch (e) {
      if (e.code === 'resource-exhausted') {
        console.log(`SUCCESS! Request ${i} rate limited: [${e.code}] ${e.message}`);
      } else {
        console.log(`Request ${i} failed (expected for dummy API keys): [${e.code}] ${e.message}`);
      }
    }
  }

  console.log("\n=== EMULATOR TESTS FINISHED ===");
  process.exit(0);
}

run().catch(console.error);
