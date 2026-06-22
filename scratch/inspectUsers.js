const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "../service-account.json");

try {
  const serviceAccount = require(serviceAccountPath);
  initializeApp({
    credential: cert(serviceAccount)
  });
} catch (err) {
  console.error("Failed to initialize Firebase Admin:", err.message);
  process.exit(1);
}

const auth = getAuth();

async function inspectUsers() {
  try {
    const listUsersResult = await auth.listUsers(100);
    console.log("\n--- Firebase Auth Users ---");
    listUsersResult.users.forEach((userRecord) => {
      console.log(`UID: ${userRecord.uid}`);
      console.log(`Email: ${userRecord.email}`);
      console.log(`Display Name: ${userRecord.displayName}`);
      console.log(`Custom Claims:`, userRecord.customClaims);
      console.log("----------------------------");
    });
  } catch (error) {
    console.error("Error listing users:", error);
  }
}

inspectUsers();
