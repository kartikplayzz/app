"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, LogOut, Keyboard, AlertOctagon, Network, Smartphone, User } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getDeviceFingerprint, fetchPublicIp } from "@/lib/firebaseSync";

export default function BlockedPage() {
  const router = useRouter();
  const [ipAddress, setIpAddress] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isIpBlocked, setIsIpBlocked] = useState(false);
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Compute fingerprint & IP address on mount
  useEffect(() => {
    const fp = getDeviceFingerprint();
    setFingerprint(fp);

    let active = true;
    const resolveIp = async () => {
      try {
        const ip = await fetchPublicIp();
        if (active) {
          setIpAddress(ip);
        }
      } catch (err) {
        console.error("BlockedPage: IP fetch failed:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    resolveIp();

    return () => {
      active = false;
    };
  }, []);

  // Listen to Firestore real-time changes
  useEffect(() => {
    if (!db) return;
    const unsubscribes: (() => void)[] = [];

    const uid = auth?.currentUser?.uid;
    if (uid) {
      const userRef = doc(db, "users", uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsBanned(!!docSnap.data().isBanned);
        } else {
          setIsBanned(false);
        }
      });
      unsubscribes.push(unsubUser);
    } else {
      setIsBanned(false);
    }

    if (ipAddress) {
      const ipRef = doc(db, "blocked_ips", ipAddress);
      const unsubIp = onSnapshot(ipRef, (docSnap) => {
        setIsIpBlocked(docSnap.exists());
      });
      unsubscribes.push(unsubIp);
    } else {
      setIsIpBlocked(false);
    }

    if (fingerprint) {
      const deviceRef = doc(db, "blocked_devices", fingerprint);
      const unsubDevice = onSnapshot(deviceRef, (docSnap) => {
        setIsDeviceBlocked(docSnap.exists());
      });
      unsubscribes.push(unsubDevice);
    } else {
      setIsDeviceBlocked(false);
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [ipAddress, fingerprint]);

  // If unblocked, automatically redirect back to the home page!
  const isBlocked = isBanned || isIpBlocked || isDeviceBlocked;
  useEffect(() => {
    if (!isLoading && !isBlocked) {
      const unsubscribe = auth?.onAuthStateChanged((user) => {
        if (user) {
          router.replace("/");
        } else {
          router.replace("/login");
        }
      });
      return () => unsubscribe?.();
    }
  }, [isBlocked, isLoading, router]);

  const handleLogout = async () => {
    try {
      if (auth) {
        await auth.signOut();
      }
      router.push("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      router.push("/login");
    }
  };

  // Helper to mask Network IP address for privacy
  const getMaskedIp = (ip: string | null) => {
    if (!ip) return "Detecting...";
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.•••.•••`;
    }
    if (ip.length > 8) {
      return `${ip.substring(0, 4)}••••${ip.substring(ip.length - 4)}`;
    }
    return "••••••••••••";
  };

  // Helper to mask Device ID for privacy
  const getMaskedFingerprint = (fp: string | null) => {
    if (!fp) return "Hashing...";
    if (fp.startsWith("DEV-")) {
      return `DEV-••••${fp.substring(fp.length - 4)}`;
    }
    if (fp.length > 8) {
      return `${fp.substring(0, 4)}••••${fp.substring(fp.length - 4)}`;
    }
    return "••••••••••••";
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-[#050816] text-white p-4 relative overflow-hidden font-sans">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] rounded-full bg-rose-500/10 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/30 backdrop-blur-2xl border border-rose-500/20 hover:border-rose-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)] relative z-10"
      >
        {/* Glow behind badge */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-rose-500/15 blur-2xl pointer-events-none" />

        {/* Lockout icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-6">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-xl font-black tracking-tight text-white mb-2">
          Access Terminated
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wider uppercase mb-6">
          <AlertOctagon className="w-3.5 h-3.5" /> SECURITY RESTRICTION
        </div>

        {/* Content message */}
        <p className="text-xs text-slate-400 leading-relaxed mb-8 max-w-sm mx-auto">
          Your access to the TypeMaster Pro platform has been restricted. This lockout can be triggered by direct profile suspension, device hardware flagging, or IP network bans applied by platform administrators.
        </p>

        {/* Diagnostic Metadata Box */}
        <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl text-left space-y-3.5 mb-8 font-mono text-[10px]">
          <div className="flex justify-between border-b border-slate-900 pb-2 text-slate-500">
            <span>Enforcement:</span>
            <span className="text-rose-400 font-bold">Realtime Suspension</span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> Account Status:</span>
            <span className={`px-2 py-0.5 rounded ${isBanned ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
              {isBanned ? "BANNED" : "CLEARED"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1"><Network className="w-3 h-3 text-slate-400" /> Network IP:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">{getMaskedIp(ipAddress)}</span>
              <span className={`px-2 py-0.5 rounded ${isIpBlocked ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                {isIpBlocked ? "BLOCKED" : "CLEARED"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-500">
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3 text-slate-400" /> Device ID:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-350 font-bold">{getMaskedFingerprint(fingerprint)}</span>
              <span className={`px-2 py-0.5 rounded ${isDeviceBlocked ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                {isDeviceBlocked ? "BLOCKED" : "CLEARED"}
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700/60 text-slate-350 hover:text-white text-xs font-bold transition-all duration-200 active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Session</span>
        </button>
      </motion.div>

      {/* Footer watermark */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-slate-600 text-[10px] tracking-widest font-bold uppercase select-none">
        <Keyboard className="w-4 h-4" /> TYPING MASTER SECURITY NODE
      </div>
    </div>
  );
}
