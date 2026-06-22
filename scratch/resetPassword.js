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
const targetUid = "B88Bfp40RIcv15ePFOl4agbQsAw1"; // testuser@gmail.com UID

async function resetPassword() {
  try {
    await auth.updateUser(targetUid, {
      password: "Password123!"
    });
    console.log("Successfully updated password to Password123!");
    process.exit(0);
  } catch (error) {
    console.error("Error updating password:", error);
    process.exit(1);
  }
}

resetPassword();
