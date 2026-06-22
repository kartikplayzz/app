"use client";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateProfile,
  OAuthProvider,
  deleteUser,
  type User,
  type AuthProvider,
} from "firebase/auth";
import { auth, googleProvider, githubProvider, isFirebaseConfigured, db, storage } from "./firebase";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ── Password Strength ──────────────────────────────────────────────

export interface PasswordStrength {
  score: number; // 0-4
  label: "Weak" | "Fair" | "Good" | "Strong";
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const labels: Record<number, PasswordStrength["label"]> = {
    0: "Weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
    5: "Strong",
  };

  return {
    score: Math.min(score, 4),
    label: labels[score] || "Weak",
    checks,
  };
}

// ── Auth Error Messages ────────────────────────────────────────────

function getAuthErrorMessage(code: string, originalMessage?: string): string {
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "This sign-in method is not enabled.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/account-exists-with-different-credential":
      "An account already exists with a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return messages[code] || originalMessage || `Auth Error (${code})`;
}

// ── Core Auth Operations ───────────────────────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: "Authentication is not configured." };
  }

  try {
    const result = await signInWithEmailAndPassword(auth!, email, password);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: "Authentication is not configured." };
  }

  try {
    const result = await createUserWithEmailAndPassword(auth!, email, password);
    // Set display name
    await updateProfile(result.user, { displayName });
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signInWithGoogle(): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    return { user: null, error: "Google sign-in is not configured." };
  }
  try {
    const result = await signInWithPopup(auth!, googleProvider as AuthProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signInWithGithub(): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!isFirebaseConfigured || !auth || !githubProvider) {
    return { user: null, error: "GitHub sign-in is not configured." };
  }
  try {
    const result = await signInWithPopup(auth!, githubProvider as AuthProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signInWithApple(): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: "Apple sign-in is not configured." };
  }
  try {
    const appleProvider = new OAuthProvider("apple.com");
    const result = await signInWithPopup(auth!, appleProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signInWithDiscord(): Promise<{
  user: User | null;
  error: string | null;
}> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: "Discord sign-in is not configured." };
  }
  try {
    const discordProvider = new OAuthProvider("oauth2.discord");
    const result = await signInWithPopup(auth!, discordProvider);
    return { user: result.user, error: null };
  } catch (err: any) {
    return { user: null, error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  if (!auth) return { error: "Auth not initialized." };
  try {
    await firebaseSignOut(auth!);
    return { error: null };
  } catch (err: any) {
    return { error: err.message || "Failed to sign out." };
  }
}

export async function sendPasswordReset(
  email: string
): Promise<{ error: string | null }> {
  if (!auth) return { error: "Auth not initialized." };
  try {
    const redirectUrl = `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "master-typing-pro.firebaseapp.com"}/login`;
    await sendPasswordResetEmail(auth!, email, {
      url: redirectUrl,
      handleCodeInApp: true,
    });
    return { error: null };
  } catch (err: any) {
    return { error: getAuthErrorMessage(err.code, err.message) };
  }
}

export async function sendEmailVerification(): Promise<{
  error: string | null;
}> {
  if (!auth?.currentUser) return { error: "No user signed in." };
  try {
    const redirectUrl = `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "master-typing-pro.firebaseapp.com"}/verify`;
    await firebaseSendEmailVerification(auth!.currentUser!, {
      url: redirectUrl,
      handleCodeInApp: true,
    });
    return { error: null };
  } catch (err: any) {
    return { error: getAuthErrorMessage(err.code) };
  }
}

export async function updateUserProfile(
  displayName?: string,
  photoURL?: string
): Promise<{ error: string | null }> {
  if (!auth?.currentUser) return { error: "No user signed in." };
  try {
    await updateProfile(auth!.currentUser!, {
      ...(displayName !== undefined && { displayName }),
      ...(photoURL !== undefined && { photoURL }),
    });
    return { error: null };
  } catch (err: any) {
    return { error: err.message || "Failed to update profile." };
  }
}

export async function registerWithUsernameAndPhoto(
  email: string,
  password: string,
  displayName: string,
  username: string,
  photoFile: File | null
): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth || !db) {
    return { user: null, error: "Firebase is not configured." };
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    // 1. Initial check (fast fail before creating Auth user)
    const usernameDocRef = doc(db!, "usernames", normalizedUsername);
    let usernameExists = false;
    try {
      const usernameSnap = await getDoc(usernameDocRef);
      usernameExists = usernameSnap.exists();
    } catch (e) {
      console.warn("Failed to verify username availability (database offline/uninitialized). Proceeding:", e);
    }

    if (usernameExists) {
      return { user: null, error: "Username is already taken. Please choose another username." };
    }

    // 2. Create the Firebase Auth user
    const authResult = await createUserWithEmailAndPassword(auth!, email, password);
    const user = authResult.user;

    let photoUrl = "";

    try {
      // 3. Upload photo to Firebase Storage if provided
      if (photoFile && storage) {
        const fileExtension = photoFile.name.split('.').pop() || 'png';
        const storageRef = ref(storage!, `profile_photos/${user.uid}/avatar.${fileExtension}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }

      // 4. Run Firestore Transaction to secure the username reservation and create user profile document
      try {
        await runTransaction(db!, async (transaction) => {
          // Read reservation doc inside transaction
          const reservationDoc = await transaction.get(usernameDocRef);
          if (reservationDoc.exists()) {
            throw new Error("Username is already taken. Please choose another username.");
          }

          // Reserve username
          transaction.set(usernameDocRef, {
            uid: user.uid,
            reservedAt: Date.now(),
          });

          // Create user document
          const userDocRef = doc(db!, "users", user.uid);
          const finalPhoto = photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`;
          transaction.set(userDocRef, {
            uid: user.uid,
            username: username.trim(),
            usernameLower: normalizedUsername,
            fullName: displayName.trim(),
            displayName: displayName.trim(),
            email,
            avatar: finalPhoto,
            profilePhotoURL: finalPhoto,
            createdAt: serverTimestamp(),
            lastLoginAt: Date.now(),
            stats: {
              level: 1,
              xp: 0,
              testsCompleted: 0,
              highestWpm: 0,
              recentTests: [],
              completedLessons: [],
              lessonProgress: {},
            },
          });
        });
      } catch (dbErr: any) {
        console.error("Firestore registration transaction failed:", dbErr);
        throw dbErr;
      }

      // 5. Update Auth Profile
      await updateProfile(user, {
        displayName,
        photoURL: photoUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`,
      });

      return { user, error: null };
    } catch (innerError: any) {
      // Clean up newly created Auth user if the Firestore/Storage setup fails
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("Failed to delete user after inner registration failure:", deleteError);
      }
      throw innerError;
    }
  } catch (err: any) {
    console.error("Registration failed:", err);
    let errorMsg = err.message || "An unexpected error occurred.";
    if (err.code) {
      errorMsg = getAuthErrorMessage(err.code, err.message);
    }
    return { user: null, error: errorMsg };
  }
}

/**
 * Creates a Firebase Auth account, sets up the Firestore profile,
 * and sends Firebase's built-in email verification.
 * The verification email comes from Google's servers (noreply@project.firebaseapp.com)
 * and NEVER goes to spam.
 */
export async function registerAndSendVerification(
  email: string,
  password: string,
  displayName: string,
  username: string
): Promise<{ user: User | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth || !db) {
    return { user: null, error: "Firebase is not configured." };
  }

  const normalizedUsername = username.trim().toLowerCase();

  try {
    // 1. Check username availability
    const usernameDocRef = doc(db!, "usernames", normalizedUsername);
    try {
      const usernameSnap = await getDoc(usernameDocRef);
      if (usernameSnap.exists()) {
        return { user: null, error: "Username is already taken. Please choose another username." };
      }
    } catch (e) {
      console.warn("Failed to verify username availability. Proceeding:", e);
    }

    // 2. Create Firebase Auth user
    const authResult = await createUserWithEmailAndPassword(auth!, email, password);
    const user = authResult.user;

    try {
      // 3. Set up Firestore profile in a transaction
      await runTransaction(db!, async (transaction) => {
        const reservationDoc = await transaction.get(usernameDocRef);
        if (reservationDoc.exists()) {
          throw new Error("Username is already taken. Please choose another username.");
        }

        // Reserve username
        transaction.set(usernameDocRef, {
          uid: user.uid,
          reservedAt: Date.now(),
        });

        // Create user document
        const userDocRef = doc(db!, "users", user.uid);
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`;
        transaction.set(userDocRef, {
          uid: user.uid,
          username: username.trim(),
          usernameLower: normalizedUsername,
          fullName: displayName.trim(),
          displayName: displayName.trim(),
          email,
          avatar: avatarUrl,
          profilePhotoURL: avatarUrl,
          createdAt: serverTimestamp(),
          lastLoginAt: Date.now(),
          stats: {
            level: 1,
            xp: 0,
            testsCompleted: 0,
            highestWpm: 0,
            recentTests: [],
            completedLessons: [],
            lessonProgress: {},
          },
        });
      });

      // 4. Update Auth profile
      await updateProfile(user, {
        displayName,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`,
      });

      // 5. Send Firebase's built-in email verification pointing to authorized web domain
      const redirectUrl = `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "master-typing-pro.firebaseapp.com"}/verify`;
      await firebaseSendEmailVerification(user, {
        url: redirectUrl,
        handleCodeInApp: true,
      });

      return { user, error: null };
    } catch (innerError: any) {
      // Clean up Auth user if Firestore setup fails
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("Failed to clean up auth user:", deleteError);
      }
      throw innerError;
    }
  } catch (err: any) {
    console.error("Registration with verification failed:", err);
    let errorMsg = err.message || "An unexpected error occurred.";
    if (err.code) {
      errorMsg = getAuthErrorMessage(err.code, err.message);
    }
    return { user: null, error: errorMsg };
  }
}

