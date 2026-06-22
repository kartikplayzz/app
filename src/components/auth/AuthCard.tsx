"use client";

import { motion } from "framer-motion";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div className="flex items-start sm:items-center justify-center h-screen w-full px-4 py-6 sm:py-10 relative z-10 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
        className={`w-full max-w-[460px] my-auto relative ${className}`}
      >
        {/* Animated conic border gradient */}
        <div className="absolute -inset-[1px] rounded-[32px] overflow-hidden -z-10">
          <div
            className="absolute inset-0 animate-spin-slow"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0%, #6366F1 10%, transparent 20%, #06B6D4 35%, transparent 45%, #8B5CF6 55%, transparent 65%, #22C55E 80%, transparent 90%)",
              animationDuration: "8s",
            }}
          />
          <div
            className="absolute inset-[1px] rounded-[31px]"
            style={{ background: "linear-gradient(145deg, #0B1120 0%, #111827 100%)" }}
          />
        </div>

        {/* Glass card */}
        <div
          className="relative rounded-[32px] p-6 sm:p-8 py-8 sm:py-9 overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 32px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Top shine line */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {children}
        </div>

        {/* Inline animation */}
        <style jsx>{`
          .animate-spin-slow {
            animation: spin 8s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </motion.div>
    </div>
  );
}
