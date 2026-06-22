"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login");
    } else {
      // Check for Admin status using user token claims asynchronously
      const checkAdminAndRoute = async () => {
        try {
          const { auth } = await import("@/lib/firebase");
          const currentUser = auth?.currentUser;
          if (currentUser) {
            const tokenResult = await currentUser.getIdTokenResult(true);
            if (tokenResult.claims.admin === true) {
              router.replace("/admin/dashboard");
              return;
            }
          }
          router.replace("/dashboard");
        } catch (err) {
          console.error("Failed to check admin claim on root route:", err);
          router.replace("/dashboard");
        }
      };

      checkAdminAndRoute();
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading indicator
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
