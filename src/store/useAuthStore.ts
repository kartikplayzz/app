"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId: string;
}

interface LoginRecord {
  timestamp: number;
  device: string;
  method: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isProfileComplete: boolean;
  loginHistory: LoginRecord[];
  _hasInitialized: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setProfileComplete: (complete: boolean) => void;
  addLoginRecord: (method: string) => void;
  clearAuth: () => void;
  initAuthListener: () => (() => void) | undefined;
}

function firebaseUserToAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    providerId: user.providerData?.[0]?.providerId || "password",
  };
}

function getDeviceString(): string {
  if (typeof window === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Electron")) return "Desktop App";
  if (/Mobile|Android|iPhone/i.test(ua)) return "Mobile Browser";
  return "Web Browser";
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isProfileComplete: false,
      loginHistory: [],
      _hasInitialized: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setProfileComplete: (complete) => set({ isProfileComplete: complete }),

      addLoginRecord: (method) =>
        set((state) => ({
          loginHistory: [
            {
              timestamp: Date.now(),
              device: getDeviceString(),
              method,
            },
            ...state.loginHistory,
          ].slice(0, 20),
        })),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          isProfileComplete: false,
        }),

      initAuthListener: () => {
        if (!isFirebaseConfigured || !auth) {
          set({ isLoading: false, _hasInitialized: true });
          return undefined;
        }

        if (get()._hasInitialized) {
          return undefined;
        }

        set({ _hasInitialized: true });

        // Listen for the custom protocol auth deep link if running in Electron
        let unsubscribeDeepLink: (() => void) | undefined = undefined;
        if (typeof window !== "undefined" && (window as any).electron && (window as any).electron.onAuthDeepLink) {
          const { signInWithCustomToken } = require("firebase/auth");
          unsubscribeDeepLink = (window as any).electron.onAuthDeepLink(async (token: string) => {
            set({ isLoading: true });
            try {
              const result = await signInWithCustomToken(auth, token);
              console.log("Successfully signed in via Electron deep link:", result.user.email);
            } catch (err: any) {
              console.error("Failed to sign in via Electron deep link:", err);
              set({ isLoading: false });
            }
          });
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const authUser = firebaseUserToAuthUser(firebaseUser);
            set({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
            });

            let isAdmin = false;
            try {
              const tokenResult = await firebaseUser.getIdTokenResult();
              isAdmin = !!tokenResult.claims.admin;
              const { useUserStore } = await import("@/store/useUserStore");
              useUserStore.setState({ isAdmin });
            } catch (err) {
              console.error("Failed to parse custom claims on auth change:", err);
            }

            // Async database state synchronization
            try {
              const { loadUserDataFromFirebase } = await import("@/lib/firebaseSync");
              const cloudData = await loadUserDataFromFirebase();
              if (cloudData && cloudData.username && cloudData.username !== "Guest User") {
                set({ isProfileComplete: true });

                const { useUserStore } = await import("@/store/useUserStore");
                const { useStatsStore } = await import("@/store/useStatsStore");

                // Update local profile
                useUserStore.setState({
                  username: cloudData.username || useUserStore.getState().username || firebaseUser.displayName || "User",
                  avatar: cloudData.avatar || useUserStore.getState().avatar || "User",
                  isAdmin: isAdmin || !!cloudData.isAdmin, // Fallback to cloud configuration, but claims are authoritative
                });

                // Update local statistics
                if (cloudData.stats) {
                  useStatsStore.setState({
                    level: cloudData.stats.level ?? 1,
                    xp: cloudData.stats.xp ?? 0,
                    testsCompleted: cloudData.stats.testsCompleted ?? 0,
                    highestWpm: cloudData.stats.highestWpm ?? 0,
                    recentTests: cloudData.stats.recentTests ?? [],
                    completedLessons: cloudData.stats.completedLessons ?? [],
                    lessonProgress: cloudData.stats.lessonProgress ?? {},
                  });
                }
              } else {
                set({ isProfileComplete: false });
              }
            } catch (err) {
              console.error("Error loading user data from Firestore on auth change:", err);
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            
            // Clear local user store and stats store on sign out to prevent leakage
            try {
              const { useUserStore } = await import("@/store/useUserStore");
              const { useStatsStore } = await import("@/store/useStatsStore");
              useUserStore.getState().resetUser();
              useStatsStore.getState().resetStats();
            } catch (err) {
              console.error("Failed to reset local stores on sign out:", err);
            }
          }
        });

        return () => {
          unsubscribe();
          if (unsubscribeDeepLink) unsubscribeDeepLink();
        };
      },
    }),
    {
      name: "master-typing-auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isProfileComplete: state.isProfileComplete,
        loginHistory: state.loginHistory,
      }),
    }
  )
);
