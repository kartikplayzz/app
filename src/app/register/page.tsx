"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Loader2, Keyboard, ArrowRight, Check, X, ShieldAlert } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { checkUsernameAvailability } from "@/lib/firebaseSync";
import { useUsernameCheck } from "@/hooks/useUsernameCheck";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";

// ── Motion Animations ──────────────────────────────────────────────────
const stagger = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 + i * 0.03, duration: 0.35, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

const shakeVariants = {
  shake: {
    x: [0, -6, 6, -6, 6, -3, 3, 0],
    transition: { duration: 0.35 }
  },
  default: { x: 0 }
};

export default function RegisterPage() {
  const router = useRouter();

  // Form states
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Status and Submission states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time username validation hook
  const { status: usernameStatus, message: usernameMessage, shakeTrigger } = useUsernameCheck(username);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Client-side validations
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!username.trim()) { setError("Please choose a username."); return; }
    if (usernameStatus === "invalid" || usernameStatus === "taken") {
      setError("Please choose an available, valid username.");
      return;
    }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password) { setError("Please create a password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!acceptTerms) { setError("Please accept the Terms & Conditions."); return; }

    setLoading(true);

    try {
      // 2. Final atomic username check before OTP send
      const available = await checkUsernameAvailability(username.trim().toLowerCase());
      if (!available) {
        setError("Username is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      // 3. Call Send OTP API Route
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: fullName.trim(),
          deviceId: typeof window !== "undefined" ? localStorage.getItem("master-typing-user-id") || "browser" : "browser",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "browser"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        setError(errData.error || "Failed to send verification code.");
        setLoading(false);
        return;
      }

      const otpResult = await response.json();
      if (!otpResult || !otpResult.success) {
        setError(otpResult?.error || "Failed to send verification code.");
        setLoading(false);
        return;
      }

      // 4. Save form data temporarily in sessionStorage for verify stage completion
      sessionStorage.setItem(
        "temp_register_data",
        JSON.stringify({ fullName: fullName.trim(), username: username.trim(), email: email.trim(), password })
      );

      toast.success("Verification code sent!", { description: "Check your inbox or spam folder." });
      
      router.push(`/verify?email=${encodeURIComponent(email.trim())}&name=${encodeURIComponent(fullName.trim())}`);
    } catch (err: any) {
      console.error("Failed to initiate OTP send:", err);
      setError(err.message || "Network error. Please try again.");
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-white/[0.03] rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 border ${
      focusedField === field
        ? "border-[#6366F1]/50 bg-white/[0.05] shadow-[0_0_20px_rgba(99,102,241,0.12)]"
        : "border-white/[0.05] hover:border-white/10"
    }`;

  return (
    <>
      <AuthBackground />

      <AuthCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative">
          
          {/* Logo */}
          <motion.div
            custom={0} variants={stagger} initial="hidden" animate="show"
            className="flex items-center justify-center gap-3 mb-1"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              whileHover={{ scale: 1.15, rotate: 10, filter: "brightness(1.15)" }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] cursor-pointer"
            >
              <Keyboard className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-sm tracking-tight text-white">
                TYPE<span className="text-[#6366F1]">MASTER</span>
              </span>
              <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-white/40">Pro Edition</span>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div custom={0} variants={stagger} initial="hidden" animate="show" className="text-center">
            <h1 className="text-xl font-black text-white tracking-tight">Create Account</h1>
            <p className="text-xs text-white/40 mt-0.5">Start your typing mastery journey</p>
          </motion.div>

          {/* Form Error Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[11px] font-medium text-center shadow-md flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Inputs Section */}
          <div className="space-y-3">
            {/* Full Name */}
            <motion.div custom={1} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1">
              <label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-wider text-white/40">Full Name</label>
              <div className="relative">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                  focusedField === "fullName" ? "text-[#6366F1]" : "text-white/20"
                }`} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField("fullName")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  placeholder="Enter full name"
                  autoComplete="name"
                  className={inputClass("fullName")}
                />
              </div>
            </motion.div>

            {/* Username with Real-time Check */}
            <motion.div custom={2} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1">
              <label htmlFor="username" className="text-[10px] font-bold uppercase tracking-wider text-white/40">Username</label>
              <div className="relative">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none transition-colors duration-300 ${
                  focusedField === "username" ? "text-[#6366F1]" : "text-white/20"
                }`}>@</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  placeholder="speedtyper"
                  autoComplete="username"
                  maxLength={20}
                  className={inputClass("username")}
                />
                
                {/* Visual Status Indicator Icon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />}
                  {usernameStatus === "available" && <Check className="w-4 h-4 text-emerald-400" />}
                  {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="w-4 h-4 text-rose-400" />}
                </div>
              </div>

              {/* Animated status message feedback */}
              <AnimatePresence mode="wait">
                {usernameMessage && (
                  <motion.div
                    key={usernameMessage}
                    animate={usernameStatus === "invalid" || usernameStatus === "taken" ? "shake" : "default"}
                    variants={shakeVariants}
                    custom={shakeTrigger}
                    className="text-[10px] mt-1 font-bold flex items-center gap-1.5 px-1"
                    style={{ color: usernameStatus === "available" ? "#34D399" : usernameStatus === "checking" ? "#94A3B8" : "#FB7185" }}
                  >
                    <span>{usernameMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Email Address */}
            <motion.div custom={3} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1">
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-white/40">Email Address</label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                  focusedField === "email" ? "text-[#6366F1]" : "text-white/20"
                }`} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={inputClass("email")}
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div custom={4} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1">
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                label="Password"
                autoComplete="new-password"
                disabled={loading}
              />
            </motion.div>

            {/* Password Strength Indicator */}
            <motion.div custom={5} variants={stagger} initial="hidden" animate="show">
              <PasswordStrengthMeter password={password} />
            </motion.div>
          </div>

          {/* Terms checkbox */}
          <motion.div custom={6} variants={stagger} initial="hidden" animate="show" className="flex items-start gap-2.5 pt-1">
            <div
              onClick={() => {
                if (!loading) {
                  setAcceptTerms(!acceptTerms);
                }
              }}
              className={`w-4 h-4 mt-0.5 rounded-md border transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${
                acceptTerms
                  ? "bg-[#6366F1] border-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                  : "border-white/15 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              {acceptTerms && (
                <motion.svg 
                  initial={{ scale: 0, rotate: -10 }} 
                  animate={{ scale: 1, rotate: 0 }} 
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="w-3 h-3 text-white" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth={3}
                >
                  <path d="M5 12l5 5L20 7" />
                </motion.svg>
              )}
            </div>
            <span className="text-[11px] text-white/40 leading-relaxed select-none">
              I agree to the{" "}
              <span className="text-[#6366F1] cursor-pointer hover:underline">Terms & Conditions</span>{" "}
              and{" "}
              <span className="text-[#6366F1] cursor-pointer hover:underline">Privacy Policy</span>
            </span>
          </motion.div>

          {/* Submit Button */}
          <motion.div custom={7} variants={stagger} initial="hidden" animate="show" className="pt-2">
            <motion.button
              type="submit"
              disabled={loading || usernameStatus === "taken" || usernameStatus === "invalid"}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-2xl font-bold text-xs text-white relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group transition-all"
              style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)", boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="relative z-10 flex items-center justify-center gap-2 tracking-wider uppercase">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </motion.button>
          </motion.div>

          {/* Login Link */}
          <motion.div custom={8} variants={stagger} initial="hidden" animate="show" className="text-center">
            <span className="text-xs text-white/30">
              Already have an account?{" "}
              <motion.span 
                className="inline-block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/login" className="text-[#6366F1] hover:text-[#8B5CF6] font-bold transition-colors">Sign In</Link>
              </motion.span>
            </span>
          </motion.div>
        </form>
      </AuthCard>
    </>
  );
}
