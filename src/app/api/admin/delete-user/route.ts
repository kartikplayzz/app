import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (decodedToken.admin !== true) {
      return NextResponse.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing user ID." }, { status: 400 });
    }

    // Protect against deleting other administrators
    const targetUserRecord = await adminAuth.getUser(userId);
    if (targetUserRecord.customClaims?.admin === true) {
      return NextResponse.json({ error: "Action prohibited: Cannot delete an administrator." }, { status: 403 });
    }

    console.log(`[API Admin Delete] Deleting user UID: ${userId}`);

    // 1. Retrieve user username lower representation to delete reservation document
    const userDocRef = adminDb.collection("users").doc(userId);
    const userSnap = await userDocRef.get();
    
    let usernameDeleted = false;
    if (userSnap.exists) {
      const userData = userSnap.data();
      const usernameLower = userData?.usernameLower || userData?.username?.trim().toLowerCase();
      if (usernameLower) {
        try {
          await adminDb.collection("usernames").doc(usernameLower).delete();
          console.log(`[API Admin Delete] Deleted username reservation: ${usernameLower}`);
          usernameDeleted = true;
        } catch (unameErr) {
          console.error(`[API Admin Delete] Failed to delete username reservation:`, unameErr);
        }
      }
    }

    if (!usernameDeleted) {
      try {
        const usernameQuery = await adminDb.collection("usernames").where("uid", "==", userId).get();
        if (!usernameQuery.empty) {
          for (const docSnap of usernameQuery.docs) {
            await docSnap.ref.delete();
            console.log(`[API Admin Delete] Deleted orphaned username reservation: ${docSnap.id}`);
          }
        }
      } catch (unameErr) {
        console.error(`[API Admin Delete] Failed to query/delete orphaned username reservation:`, unameErr);
      }
    }

    // 2. Delete user document in Firestore
    await userDocRef.delete();
    console.log(`[API Admin Delete] Deleted user profile document: ${userId}`);

    // 3. Delete certificates associated with this user
    try {
      const certsQuery = adminDb.collection("certificates").where("candidateUid", "==", userId);
      const certsSnapshot = await certsQuery.get();
      if (!certsSnapshot.empty) {
        const batch = adminDb.batch();
        certsSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        console.log(`[API Admin Delete] Deleted ${certsSnapshot.size} certificates.`);
      }
    } catch (certErr) {
      console.error(`[API Admin Delete] Failed to delete certificates:`, certErr);
    }

    // 4. Delete Firebase Auth account
    await adminAuth.deleteUser(userId);
    console.log(`[API Admin Delete] Deleted Firebase Auth user account.`);

    return NextResponse.json({ success: true, message: "User deleted successfully." });

  } catch (error: any) {
    console.error("Failed to delete user profile:", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
