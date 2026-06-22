import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, runTransaction } from "firebase/firestore";
import { db, auth, isFirebaseConfigured } from "./firebase";
import type { TestResult } from "@/store/useStatsStore";

// Get or create unique persistent User UUID
// Uses Firebase Auth UID when authenticated, falls back to anonymous UUID
export function getOrCreateUserSyncId(): string {
  if (typeof window === "undefined") return "server-id";
  
  // Prefer Firebase Auth UID if user is authenticated
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  // Fallback to anonymous local UUID
  let uid = localStorage.getItem("master-typing-user-id");
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem("master-typing-user-id", uid);
  }
  return uid;
}

// Helper to generate a unique, deterministic client device fingerprint
export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server-fingerprint";
  
  const parts = [
    navigator.userAgent || "",
    screen.width?.toString() || "",
    screen.height?.toString() || "",
    screen.colorDepth?.toString() || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || ""
  ];
  
  const str = parts.join("|");
  
  // Simple DJB2 string hashing algorithm
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return "DEV-" + Math.abs(hash).toString(16).toUpperCase();
}

// Fetch public IP address with multi-API fallbacks
export async function fetchPublicIp(): Promise<string> {
  const apis = [
    "https://api.ipify.org?format=json",
    "https://ipapi.co/json/",
    "https://ipinfo.io/json"
  ];

  for (const url of apis) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000); // 2-second timeout per API
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        const data = await res.json();
        const ip = data.ip || data.ip_address || data.query;
        if (ip && ip.trim().length > 0) {
          return ip.trim();
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch IP from ${url}:`, err);
    }
  }

  return "127.0.0.1"; // final fallback
}

// Sync user identity profile to Firestore
export async function syncUserProfileToFirebase(username: string, avatar: string) {
  const firestore = db;
  if (!isFirebaseConfigured || !firestore) return;
  // Guests store profiles purely locally (Zustand IndexedDB). Syncing is only allowed if authenticated.
  if (!auth?.currentUser) return;

  try {
    const uid = getOrCreateUserSyncId();
    const docRef = doc(firestore, "users", uid);

    const ipAddress = await fetchPublicIp();
    const deviceFingerprint = getDeviceFingerprint();
    const normalizedUsername = username.trim().toLowerCase();

    // If authenticated, we run a transaction to reserve the username and write the profile atomically
    if (auth?.currentUser?.uid) {
      const usernameDocRef = doc(firestore, "usernames", normalizedUsername);
      await runTransaction(firestore, async (transaction) => {
        const userSnap = await transaction.get(docRef);
        const usernameSnap = await transaction.get(usernameDocRef);

        let currentUsernameLower = "";
        if (userSnap.exists()) {
          currentUsernameLower = userSnap.data().usernameLower || "";
        }

        // If the username is changing
        if (currentUsernameLower !== normalizedUsername) {
          // If the new username is already reserved by someone else
          if (usernameSnap.exists() && usernameSnap.data().uid !== uid) {
            throw new Error("Username is already taken by another user.");
          }

          // Delete the old reservation if it existed
          if (currentUsernameLower) {
            const oldUsernameDocRef = doc(firestore, "usernames", currentUsernameLower);
            transaction.delete(oldUsernameDocRef);
          }

          // Create the new reservation
          transaction.set(usernameDocRef, {
            uid: uid,
            reservedAt: Date.now(),
          });
        }

        // Update the user document
        transaction.set(
          docRef,
          {
            username: username.trim(),
            usernameLower: normalizedUsername,
            avatar,
            ipAddress,
            deviceFingerprint,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Server",
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      });
    }
  } catch (e) {
    console.error("Failed to sync user profile to Firebase:", e);
    throw e;
  }
}

// Sync user typing history and stats state to Firestore
export async function syncStatsToFirebase(stats: {
  level: number;
  xp: number;
  testsCompleted: number;
  highestWpm: number;
  recentTests: TestResult[];
  completedLessons: string[];
  lessonProgress: Record<string, number>;
}) {
  if (!isFirebaseConfigured || !db) return;
  // We only sync stats to Firestore if the user is authenticated.
  // Guests store stats purely locally.
  if (!auth?.currentUser) return;

  try {
    const uid = getOrCreateUserSyncId();
    const docRef = doc(db, "users", uid);
    await setDoc(
      docRef,
      {
        stats: {
          level: stats.level,
          xp: stats.xp,
          testsCompleted: stats.testsCompleted,
          highestWpm: stats.highestWpm,
          recentTests: stats.recentTests,
          completedLessons: stats.completedLessons,
          lessonProgress: stats.lessonProgress,
        },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Failed to sync stats to Firebase:", e);
  }
}

// Restore profile and stats data from Firestore
export async function loadUserDataFromFirebase() {
  if (!isFirebaseConfigured || !db || !auth?.currentUser) return null;
  try {
    const uid = getOrCreateUserSyncId();
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.error("Failed to load user data from Firebase:", e);
  }
  return null;
}

// Check if username is available (i.e. not taken by another user)
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  const firestore = db;
  if (!isFirebaseConfigured || !firestore) return true;
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 4) return false;
  
  try {
    // 1. Point check on the usernames collection (O(1))
    // This collection allows public unauthenticated reads, making it suitable for guest registration checks.
    const usernameDocRef = doc(firestore, "usernames", cleanUsername);
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      return false; // Taken
    }

    // Only query /users if the user is authenticated (to prevent console permission errors
    // and correctly handle registration checks when no user is logged in yet)
    if (auth?.currentUser) {
      // 2. Double-check on users collection where usernameLower matches
      const qLower = query(
        collection(firestore, "users"),
        where("usernameLower", "==", cleanUsername),
        limit(1)
      );
      const queryLowerSnapshot = await getDocs(qLower);
      if (!queryLowerSnapshot.empty) {
        return false; // Taken
      }

      // 3. Fallback check on users collection where username matches (handles legacy/social profiles without usernameLower)
      const qUsername = query(
        collection(firestore, "users"),
        where("username", "==", username.trim()),
        limit(1)
      );
      const queryUsernameSnapshot = await getDocs(qUsername);
      if (!queryUsernameSnapshot.empty) {
        return false; // Taken
      }
    }

    return true; // Available
  } catch (e: any) {
    console.error("Error checking username availability:", e);
    // If it's a permission-denied error (e.g. from users collection due to lack of auth),
    // and the public usernames point check did not exist, the name is available to reserve.
    if (e?.code === "permission-denied" || e?.message?.includes("permission")) {
      return true;
    }
    return false; // Return false on other query failures to be safe
  }
}
