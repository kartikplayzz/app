const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");

// Look for service account in project root
const serviceAccountPath = path.join(__dirname, "../service-account.json");

try {
  const serviceAccount = require(serviceAccountPath);
  initializeApp({
    credential: cert(serviceAccount)
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (err) {
  console.error(err);
  console.error("\n[Error] Could not find or read 'service-account.json' in the project root.");
  console.error("Please download your Service Account key from the Firebase Console:");
  console.error("1. Go to Project Settings -> Service Accounts");
  console.error("2. Click 'Generate New Private Key'");
  console.error("3. Save it as 'service-account.json' in the root directory: D:\\New folder\\master-typing-pro\\\n");
  process.exit(1);
}

// Specify the email address to grant admin claims
const email = process.argv[2] || "admintypingmaster@gmail.com";

console.log(`Attempting to grant admin claims to: ${email}...`);

const auth = getAuth();
auth.getUserByEmail(email)
  .then((userRecord) => {
    return auth.setCustomUserClaims(userRecord.uid, { admin: true })
      .then(() => {
        console.log("\n==================================================");
        console.log(`Success! Granted { admin: true } custom claim to:`);
        console.log(`UID:   ${userRecord.uid}`);
        console.log(`Email: ${userRecord.email}`);
        console.log("==================================================");
        console.log("\nNote: The user must sign out and sign back in for the claims to take effect.");
        process.exit(0);
      });
  })
  .catch((error) => {
    console.error("\n[Error] Failed to set claims:", error.message);
    process.exit(1);
  });
