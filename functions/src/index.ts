import * as admin from "firebase-admin";

admin.initializeApp();

export * from "./diagnose";
export * from "./advisory";
export * from "./deliver";
