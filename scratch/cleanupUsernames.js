const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
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

const db = getFirestore();

async function cleanupUsernames() {
  try {
    console.log("Scanning /usernames collection for orphaned reservations...");
    const usernamesSnapshot = await db.collection("usernames").get();
    
    let cleanedCount = 0;
    
    for (const docSnap of usernamesSnapshot.docs) {
      const username = docSnap.id;
      const data = docSnap.data();
      const uid = data.uid;
      
      if (!uid) {
        console.log(`Deleting invalid reservation doc '${username}' (no UID)`);
        await docSnap.ref.delete();
        cleanedCount++;
        continue;
      }
      
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) {
        console.log(`Deleting orphaned reservation '${username}' pointing to non-existent UID: ${uid}`);
        await docSnap.ref.delete();
        cleanedCount++;
      }
    }
    
    console.log(`\nScan complete. Cleaned up ${cleanedCount} orphaned username reservations.`);
  } catch (error) {
    console.error("Error cleaning up usernames:", error);
  }
}

cleanupUsernames();
