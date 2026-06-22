"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Keyboard, ArrowLeft, CheckCircle, Send } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { sendPasswordReset } from "@/lib/authService";

type Step = "email" | "sent" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [focused, setFocused] = useState(false);

  const handleSend = async () => {
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }

    setLoading(true);
    const result = await sendPasswordReset(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep("sent");
      startCooldown();
    }
  };

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    await sendPasswordReset(email);
    setLoading(false);
    startCooldown();
  };

  return (
    <>
      <AuthBackground />
      <AuthCard>
        <AnimatePresence mode="wait">
          {/* Step 1: Enter Email */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {/* Logo */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  <Keyboard className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="text-center">
                <h1 className="text-2xl font-black text-white tracking-tight">Forgot Password?</h1>
                <p className="text-sm text-white/40 mt-1">
                  No worries. Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                  <input
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    placeholder="you@example.com" autoComplete="email"
                    className={`w-full bg-white/[0.04] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 border ${
                      focused ? "border-[#6366F1]/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]" : "border-white/[0.06] hover:border-white/10"
                    }`}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  />
                </div>
              </div>

              <motion.button
                onClick={handleSend} disabled={loading}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white relative overflow-hidden disabled:opacity-60 group transition-all"
                style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)" }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Send className="w-4 h-4" /> Send Reset Link</>)}
                </span>
              </motion.button>

              <Link href="/login" className="flex items-center justify-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors font-semibold">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </motion.div>
          )}

          {/* Step 2: Email Sent */}
          {step === "sent" && (
            <motion.div
              key="sent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6 items-center text-center"
            >
              {/* Animated envelope */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6366F1]/20 to-[#8B5CF6]/20 border border-[#6366F1]/30 flex items-center justify-center relative"
              >
                <Mail className="w-9 h-9 text-[#6366F1]" />
                <motion.div
                  animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center"
                >
                  <CheckCircle className="w-3 h-3 text-white" />
                </motion.div>
              </motion.div>

              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Check Your Email</h1>
                <p className="text-sm text-white/40 mt-2">
                  We sent a password reset link to<br />
                  <span className="text-white/60 font-semibold">{email}</span>
                </p>
              </div>

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all ${
                  cooldown > 0
                    ? "bg-white/[0.03] text-white/20 border border-white/[0.04] cursor-not-allowed"
                    : "bg-white/[0.05] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Email"}
              </button>

              <Link href="/login" className="flex items-center justify-center gap-2 text-xs text-white/30 hover:text-white/50 transition-colors font-semibold mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </>
  );
}
