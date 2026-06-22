"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { onSnapshot, doc } from "firebase/firestore";
import { getDeviceFingerprint, fetchPublicIp } from "@/lib/firebaseSync";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/verify", "/profile-setup", "/blocked"];

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

interface AuthLayoutGuardProps {
  children: React.ReactNode;
}

export function AuthLayoutGuard({ children }: AuthLayoutGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, initAuthListener, user, isProfileComplete } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Realtime ban / block states
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isIpBlocked, setIsIpBlocked] = useState(false);
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);

  // Initialize Firebase auth listener and compute fingerprint/IP
  useEffect(() => {
    const unsubscribe = initAuthListener();
    setMounted(true);
    
    // Set fingerprint
    const fp = getDeviceFingerprint();
    setFingerprint(fp);

    // Fetch IP address
    let active = true;
    const resolveIp = async () => {
      const ip = await fetchPublicIp();
      if (active) {
        setIpAddress(ip);
      }
    };
    resolveIp();

    return () => {
      unsubscribe?.();
      active = false;
    };
  }, [initAuthListener]);

  // Firestore Realtime snapshot subscriptions for security enforcement
  useEffect(() => {
    if (!db) return;
    const unsubscribes: (() => void)[] = [];

    // 1. Listen to active user profile document for direct bans
    if (user?.uid) {
      const userRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsBanned(!!docSnap.data().isBanned);
        } else {
          setIsBanned(false);
        }
      }, (err) => {
        console.warn("AuthLayoutGuard: User doc listener failed:", err);
      });
      unsubscribes.push(unsubUser);
    } else {
      setIsBanned(false);
    }

    // 2. Listen to active IP address document
    if (ipAddress) {
      const ipRef = doc(db, "blocked_ips", ipAddress);
      const unsubIp = onSnapshot(ipRef, (docSnap) => {
        setIsIpBlocked(docSnap.exists());
      }, (err) => {
        console.warn("AuthLayoutGuard: IP block listener failed:", err);
      });
      unsubscribes.push(unsubIp);
    } else {
      setIsIpBlocked(false);
    }

    // 3. Listen to active Device Fingerprint document
    if (fingerprint) {
      const deviceRef = doc(db, "blocked_devices", fingerprint);
      const unsubDevice = onSnapshot(deviceRef, (docSnap) => {
        setIsDeviceBlocked(docSnap.exists());
      }, (err) => {
        console.warn("AuthLayoutGuard: Device block listener failed:", err);
      });
      unsubscribes.push(unsubDevice);
    } else {
      setIsDeviceBlocked(false);
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user?.uid, ipAddress, fingerprint]);

  const isBlocked = isBanned || isIpBlocked || isDeviceBlocked;

  // Route protection and security redirects
  useEffect(() => {
    if (isLoading || !mounted) return;

    if (isBlocked) {
      if (pathname !== "/blocked") {
        router.replace("/blocked");
      }
      return;
    }

    // If unblocked but on /blocked route, route back
    if (pathname === "/blocked") {
      if (isAuthenticated) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
      return;
    }

    const onAuthRoute = isAuthRoute(pathname);

    // If authenticated but profile is not completed yet, force to /profile-setup
    // (except when they are already on /profile-setup, /blocked, or /verify)
    if (isAuthenticated && !isProfileComplete) {
      if (pathname !== "/profile-setup" && pathname !== "/blocked" && pathname !== "/verify") {
        router.replace("/profile-setup");
        return;
      }
    }

    // Already authenticated and profile completed → redirect away from auth routes
    if (isAuthenticated && isProfileComplete && onAuthRoute) {
      router.replace("/");
      return;
    }

    // Not authenticated → redirect to login (unless already on an auth route)
    if (!isAuthenticated && !onAuthRoute) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router, mounted, isBlocked]);

  // Show loading skeleton while auth state initializes
  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#050816]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
            <Keyboard className="w-7 h-7 text-white" />
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-[#6366F1]"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Auth routes: render without sidebar/topnav
  if (isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  // Admin routes: render without student sidebar/topnav layout wrapper
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  // App routes: render with full layout
  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 relative flex flex-col">
          {children}
        </main>
      </div>
    </>
  );
}
