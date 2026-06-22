"use client";

import { motion } from "framer-motion";
import { signInWithGoogle, signInWithGithub, signInWithApple, signInWithDiscord } from "@/lib/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useState } from "react";
import { Lock } from "lucide-react";

interface SocialLoginButtonsProps {
  onError?: (message: string) => void;
  onSuccess?: () => void;
}

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN !== "false";
const GITHUB_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GITHUB_LOGIN === "true";
const DISCORD_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DISCORD_LOGIN === "true";
const APPLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_APPLE_LOGIN === "true";

export function SocialLoginButtons({ onError, onSuccess }: SocialLoginButtonsProps) {
  const { addLoginRecord } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocial = async (
    provider: "google" | "github" | "discord" | "apple",
    fn: () => Promise<{ user: any; error: string | null }>
  ) => {
    if (typeof window !== "undefined" && navigator.userAgent.includes("Electron")) {
      const authUrl = `https://master-typing-pro.firebaseapp.com/login?mode=electron&provider=${provider}`;
      if ((window as any).electron && (window as any).electron.openExternal) {
        (window as any).electron.openExternal(authUrl);
      } else {
        window.open(authUrl);
      }
      return;
    }

    setLoadingProvider(provider);
    try {
      const result = await fn();
      if (result.error) {
        onError?.(result.error);
      } else {
        addLoginRecord(provider);
        onSuccess?.();
      }
    } catch (err: any) {
      console.error(`Social login error for ${provider}:`, err);
      onError?.(err?.message || "An unexpected error occurred.");
    } finally {
      setLoadingProvider(null);
    }
  };


  const providers = [
    {
      name: "Google",
      id: "google" as const,
      color: "#4285F4",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
      ),
      action: () => handleSocial("google", signInWithGoogle),
      enabled: GOOGLE_ENABLED,
    },
    {
      name: "GitHub",
      id: "github" as const,
      color: "#ffffff",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      ),
      action: () => handleSocial("github", signInWithGithub),
      enabled: GITHUB_ENABLED,
    },
    {
      name: "Discord",
      id: "discord" as const,
      color: "#5865F2",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#5865F2">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
      action: () => handleSocial("discord", signInWithDiscord),
      enabled: DISCORD_ENABLED,
    },
    {
      name: "Apple",
      id: "apple" as const,
      color: "#ffffff",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      ),
      action: () => handleSocial("apple", signInWithApple),
      enabled: APPLE_ENABLED,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
          Continue With
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {providers.map((p) => {
          const isLocked = !p.enabled;
          return (
            <motion.button
              key={p.id}
              type="button"
              whileHover={isLocked ? {} : { scale: 1.06, y: -2 }}
              whileTap={isLocked ? {} : { scale: 0.95 }}
              onClick={isLocked ? undefined : p.action}
              disabled={!!loadingProvider || isLocked}
              className={`flex items-center justify-center p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300 relative overflow-hidden group ${
                isLocked ? "opacity-35 cursor-not-allowed filter grayscale" : "cursor-pointer"
              }`}
              title={isLocked ? `${p.name} sign-in is currently unavailable` : p.name}
            >
              {/* Hover glow */}
              {!isLocked && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at center, ${p.color}15 0%, transparent 70%)`,
                  }}
                />
              )}

              {isLocked && (
                <div className="absolute top-1.5 right-1.5 z-20">
                  <Lock className="w-2.5 h-2.5 text-white/40" />
                </div>
              )}

              {loadingProvider === p.id ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              ) : (
                <div className="relative z-10">{p.icon}</div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
