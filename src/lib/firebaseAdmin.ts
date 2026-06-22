import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  try {
    const fs = require("fs");
    const path = require("path");
    const saPath = path.resolve("service-account.json");

    if (fs.existsSync(saPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
