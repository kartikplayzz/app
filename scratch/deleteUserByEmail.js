const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
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

const auth = getAuth();
const db = getFirestore();

async function deleteUserByEmail(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    const userId = userRecord.uid;
    console.log(`\nFound user with email: ${email}`);
    console.log(`UID: ${userId}`);
    console.log(`Display Name: ${userRecord.displayName}`);

    // 1. Delete username reservation document
    const userDocRef = db.collection("users").doc(userId);
    const userSnap = await userDocRef.get();
    
    let usernameDeleted = false;
    if (userSnap.exists) {
      const userData = userSnap.data();
      const usernameLower = userData?.usernameLower || userData?.username?.trim().toLowerCase();
      if (usernameLower) {
        await db.collection("usernames").doc(usernameLower).delete();
        console.log(`[Firestore] Deleted username reservation: ${usernameLower}`);
        usernameDeleted = true;
      }
    }

    if (!usernameDeleted) {
      // Fallback: search usernames collection by UID
      const usernameQuery = await db.collection("usernames").where("uid", "==", userId).get();
      if (!usernameQuery.empty) {
        for (const docSnap of usernameQuery.docs) {
          await docSnap.ref.delete();
          console.log(`[Firestore] Deleted orphaned username reservation: ${docSnap.id}`);
        }
      }
    }

    // 2. Delete user profile document
    await userDocRef.delete();
    console.log(`[Firestore] Deleted user profile document: ${userId}`);

    // 3. Delete certificates
    const certsSnapshot = await db.collection("certificates").where("candidateUid", "==", userId).get();
    if (!certsSnapshot.empty) {
      const batch = db.batch();
      certsSnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log(`[Firestore] Deleted ${certsSnapshot.size} certificates.`);
    } else {
      console.log("[Firestore] No certificates found for this user.");
    }

    // 4. Delete Firebase Auth account
    await auth.deleteUser(userId);
    console.log(`[Auth] Deleted Firebase Auth account for UID: ${userId}`);
    console.log(`\nSuccessfully deleted user: ${email}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.log(`\n[Error] No user found in Firebase Auth with email: ${email}`);
    } else {
      console.error("\nError deleting user:", error);
    }
  }
}

const targetEmail = process.argv[2];
if (!targetEmail) {
  console.error("Please provide an email address as an argument.");
  process.exit(1);
}

deleteUserByEmail(targetEmail.trim());
