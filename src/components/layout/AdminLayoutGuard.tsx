"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Keyboard } from "lucide-react";
import { toast } from "sonner";

interface AdminLayoutGuardProps {
  children: React.ReactNode;
}

export function AdminLayoutGuard({ children }: AdminLayoutGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    // If auth store is loading, wait
    if (authLoading) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    const checkAdminClaim = async () => {
      try {
        if (!auth) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsAdmin(false);
          setIsChecking(false);
          return;
        }

        // Get ID token result and force refresh to fetch latest custom claims
        const tokenResult = await currentUser.getIdTokenResult(true);
        const adminClaim = tokenResult.claims.admin === true;

        setIsAdmin(adminClaim);
        setIsChecking(false);

        if (!adminClaim) {
          toast.error("Access Denied", {
            description: "You do not have administrative privileges.",
            duration: 5000,
          });
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Failed to verify admin claim:", error);
        setIsAdmin(false);
        setIsChecking(false);
        toast.error("Authorization Error", {
          description: "An error occurred while verifying your permissions.",
        });
        router.replace("/dashboard");
      }
    };

    checkAdminClaim();
  }, [isAuthenticated, authLoading, router]);

  // Loading skeleton state
  if (authLoading || isChecking || isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#050816] text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative flex items-center justify-center">
            {/* Spinning gradient outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 rounded-full border-2 border-t-[#6366F1] border-r-[#8B5CF6] border-b-transparent border-l-transparent"
            />
            {/* Inner static badge */}
            <div className="absolute w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.4)]">
              <Keyboard className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold tracking-wider bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
              Securing Admin Session
            </h2>
            <p className="text-xs text-slate-500 font-medium">Verifying authorization claims...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not admin: render nothing while redirecting
  if (!isAdmin) {
    return null;
  }

  // Admin verified: render children
  return <>{children}</>;
}
