"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, Keyboard, ArrowRight } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";
import { 
  signInWithEmail, 
  signInWithGoogle, 
  signInWithGithub, 
  signInWithApple, 
  signInWithDiscord 
} from "@/lib/authService";
import { useAuthStore } from "@/store/useAuthStore";

// ── Confetti Engine ─────────────────────────────────────────────────
interface ConfettiParticle {
  x: number; y: number; size: number; color: string;
  speedX: number; speedY: number; rotation: number; rotationSpeed: number;
}

function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: ConfettiParticle[] = [];
    const colors = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6"];

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * -canvas.height - 20,
        size: Math.random() * 8 + 6, color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2, speedY: Math.random() * 5 + 4,
        rotation: Math.random() * 360, rotationSpeed: Math.random() * 4 - 2
      });
    }

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = false;
      particles.forEach((p) => {
        p.y += p.speedY; p.x += p.speedX; p.rotation += p.rotationSpeed;
        if (p.y < canvas.height) activeParticles = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
      });
      if (activeParticles) animationId = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(animationId);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-full h-full" />;
}

export default function LoginPage() {
  const router = useRouter();
  const { addLoginRecord } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isElectronRedirecting, setIsElectronRedirecting] = useState(false);
  const [redirectStatus, setRedirectStatus] = useState("Authenticating...");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const provider = params.get("provider");

    if (mode === "electron") {
      setIsElectronRedirecting(true);

      // Auto-trigger social provider if requested
      if (provider === "google") {
        setRedirectStatus("Opening Google sign-in...");
        signInWithGoogle().then((res) => {
          if (res.error) {
            setError(res.error);
            setIsElectronRedirecting(false);
          }
        });
      } else if (provider === "github") {
        setRedirectStatus("Opening GitHub sign-in...");
        signInWithGithub().then((res) => {
          if (res.error) {
            setError(res.error);
            setIsElectronRedirecting(false);
          }
        });
      } else if (provider === "discord") {
        setRedirectStatus("Opening Discord sign-in...");
        signInWithDiscord().then((res) => {
          if (res.error) {
            setError(res.error);
            setIsElectronRedirecting(false);
          }
        });
      } else if (provider === "apple") {
        setRedirectStatus("Opening Apple sign-in...");
        signInWithApple().then((res) => {
          if (res.error) {
            setError(res.error);
            setIsElectronRedirecting(false);
          }
        });
      }
    }
  }, []);

  // Listen for user sign-in state to redirect back to Electron app
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") !== "electron") return;

    const { auth } = require("@/lib/firebase");
    const { onAuthStateChanged } = require("firebase/auth");

    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      if (user) {
        setRedirectStatus("Securing desktop token...");
        try {
          const idToken = await user.getIdToken();
          
          // Request custom token from our API endpoint
          const response = await fetch("/api/auth/custom-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken }),
          });

          const data = await response.json();
          if (data.customToken) {
            setRedirectStatus("Redirecting you back to Master Typing Pro...");
            window.location.href = `master-typing-pro://auth?token=${data.customToken}`;
            
            // Auto close/redirect fallback after a few seconds
            setTimeout(() => {
              setRedirectStatus("You can now close this tab and return to the app.");
            }, 3000);
          } else {
            setError(data.error || "Failed to exchange authentication token.");
            setIsElectronRedirecting(false);
          }
        } catch (err: any) {
          console.error("Token exchange failed:", err);
          setError("Failed to bridge authentication to the desktop app.");
          setIsElectronRedirecting(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email.trim(), password);

    if (result.error) {
      setLoading(false);
      setError(result.error);
    } else if (result.user) {
      addLoginRecord("email");
      
      try {
        const tokenResult = await result.user.getIdTokenResult(true);
        const redirectPath = tokenResult.claims.admin ? "/admin" : "/";
        
        // Show success checkmark and stop loading
        setLoginSuccess(true);
        setLoading(false);
        
        setTimeout(() => {
          router.replace(redirectPath);
        }, 1800);
      } catch (err) {
        console.error("Failed to verify admin claim on login:", err);
        setLoginSuccess(true);
        setLoading(false);
        setTimeout(() => {
          router.replace("/");
        }, 1800);
      }
    }
  };

  const stagger = {
    hidden: { opacity: 0, y: 12 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.15 + i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] as [number, number, number, number] },
    }),
  };

  return (
    <>
      <AuthBackground />
      <ConfettiCanvas active={loginSuccess} />

      {/* Bursting keys on submission */}
      {loading && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {["W", "A", "S", "D", "Enter", "Space", "Shift", "Q", "E", "Esc", "F", "J", "K", "Ctrl"].map((keyChar, i) => {
            const angle = (i / 14) * 2 * Math.PI + Math.random() * 0.5;
            const distance = 300 + Math.random() * 300;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, x: "calc(50vw - 22px)", y: "calc(50vh - 22px)", rotate: 0 }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  scale: [0.5, 1.2, 1, 0.4],
                  x: `calc(50vw - 22px + ${tx}px)`, 
                  y: `calc(50vh - 22px + ${ty}px)`,
                  rotate: 360 + Math.random() * 360 
                }}
                transition={{ duration: 1.6, ease: "easeOut", repeat: Infinity, repeatDelay: 0.05 }}
                className="absolute w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 backdrop-blur-[2px] flex items-center justify-center font-black text-indigo-400 text-xs shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                {keyChar}
              </motion.div>
            );
          })}
        </div>
      )}

      <AuthCard>
        <AnimatePresence mode="wait">
          {isElectronRedirecting ? (
            <motion.div
              key="electron-redirect-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-sm animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                  <Loader2 className="w-10 h-10 animate-spin" />
                </div>
              </div>

              <h2 className="text-xl font-black text-white tracking-tight">
                Desktop Authentication
              </h2>
              <p className="text-sm text-white/60 mt-2 px-4 leading-normal">
                {redirectStatus}
              </p>
              
              {error && (
                <button 
                  onClick={() => setIsElectronRedirecting(false)} 
                  className="mt-6 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition-all cursor-pointer"
                >
                  Cancel & Try Locally
                </button>
              )}
            </motion.div>
          ) : loginSuccess ? (
            <motion.div 
              key="success-screen"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="relative mb-6">
                {/* Glowing ring background */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 blur-sm"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 450, damping: 15, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                >
                  <motion.svg
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
                    className="w-10 h-10 stroke-emerald-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </motion.svg>
                </motion.div>
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                Access Granted
              </h2>
              <p className="text-sm text-white/50 mt-2">
                Welcome back, {email.split("@")[0]}
              </p>
              
              <div className="w-32 h-1 bg-white/[0.04] rounded-full overflow-hidden mt-6 border border-white/5">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: "100%" }} 
                  transition={{ duration: 1.4, ease: "easeInOut" }} 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                />
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Logo */}
              <motion.div
                custom={0}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex items-center justify-center gap-3 mb-2"
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  whileHover={{ scale: 1.15, rotate: 10, filter: "brightness(1.15)" }}
                  whileTap={{ scale: 0.95 }}
                  className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] cursor-pointer"
                >
                  <Keyboard className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex flex-col leading-none">
                  <span className="font-black text-base tracking-tight text-white">
                    TYPE<span className="text-[#6366F1]">MASTER</span>
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/40">
                    Pro Edition
                  </span>
                </div>
              </motion.div>

              {/* Heading */}
              <motion.div
                custom={1}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="text-center"
              >
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-sm text-white/40 mt-1">
                  Sign in to continue your journey
                </p>
              </motion.div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Email input */}
              <motion.div
                custom={2}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-1.5"
              >
                <label
                  htmlFor="email"
                  className="text-[11px] font-bold uppercase tracking-wider text-white/50"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${
                    emailFocused ? "text-[#6366F1]" : "text-white/25"
                  }`} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`w-full bg-white/[0.04] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 border ${
                      emailFocused
                        ? "border-[#6366F1]/50 shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-white/[0.06]"
                        : "border-white/[0.06] hover:border-white/10"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Password input */}
              <motion.div
                custom={3}
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  label="Password"
                  autoComplete="current-password"
                />
              </motion.div>

              {/* Remember me + Forgot */}
              <motion.div
                custom={4}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="flex items-center justify-between"
              >
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded-md border transition-all duration-200 flex items-center justify-center cursor-pointer ${
                      rememberMe
                        ? "bg-[#6366F1] border-[#6366F1] shadow-[0_0_8px_rgba(99,102,241,0.3)]"
                        : "border-white/15 bg-white/[0.02] group-hover:border-white/25"
                    }`}
                  >
                    {rememberMe && (
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
                  <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors select-none">
                    Remember me
                  </span>
                </label>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#6366F1] hover:text-[#8B5CF6] font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </motion.div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                custom={5}
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group transition-all"
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                    boxShadow: "0 8px 32px rgba(99, 102, 241, 0.3)",
                  }}
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </motion.button>
              </motion.div>

              {/* Social login */}
              <motion.div
                custom={6}
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                <SocialLoginButtons
                  onError={(msg) => setError(msg)}
                  onSuccess={() => router.replace("/")}
                />
              </motion.div>

              {/* Register link */}
              <motion.div
                custom={7}
                variants={stagger}
                initial="hidden"
                animate="show"
                className="text-center"
              >
                <span className="text-xs text-white/30">
                  Don&apos;t have an account?{" "}
                  <motion.span 
                    className="inline-block"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href="/register"
                      className="text-[#6366F1] hover:text-[#8B5CF6] font-bold transition-colors"
                    >
                      Create Account
                    </Link>
                  </motion.span>
                </span>
              </motion.div>
            </form>
          )}
        </AnimatePresence>
      </AuthCard>
    </>
  );
}
