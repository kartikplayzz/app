"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, CheckCircle, RefreshCw, XCircle, ArrowLeft, ShieldAlert, Inbox, AlertTriangle } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { registerWithUsernameAndPhoto } from "@/lib/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { toast } from "sonner";

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

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.7, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 18 } }
};

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addLoginRecord, setProfileComplete } = useAuthStore();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  // OTP inputs state (6 boxes)
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer & cooldown states
  const [timeLeft, setTimeLeft] = useState(300);
  const [cooldown, setCooldown] = useState(0);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutMsg, setLockoutMsg] = useState("");

  // Parse parameters
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const nameParam = searchParams.get("name");
    if (emailParam) setEmail(emailParam);
    if (nameParam) setName(nameParam);

    if (typeof window !== "undefined") {
      const regData = sessionStorage.getItem("temp_register_data");
      if (!regData && !emailParam) {
        toast.error("No registration data found.");
        router.replace("/register");
      } else if (regData && !emailParam) {
        const parsed = JSON.parse(regData);
        setEmail(parsed.email);
        setName(parsed.fullName);
      }
    }
  }, [searchParams, router]);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timeLeft <= 0 || verified || isLocked) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, verified, isLocked]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const maskedEmail = email ? email.replace(/(.{2}).+(@.+)/, "$1***$2") : "your email";

  // Handle key inputs
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1);
    setOtpValues(newOtpValues);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpValues[index] && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = "";
        setOtpValues(newOtpValues);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = "";
        setOtpValues(newOtpValues);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (pastedData.length !== 6 || isNaN(Number(pastedData))) {
      setError("Pasted code must be exactly 6 digits.");
      return;
    }
    setOtpValues(pastedData.split(""));
    inputRefs.current[5]?.focus();
  };

  // Resend OTP
  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isLocked) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, name,
          deviceId: typeof window !== "undefined" ? localStorage.getItem("master-typing-user-id") || "browser" : "browser",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "browser"
        })
      });

      setLoading(false);

      if (!response.ok) {
        const errData = await response.json();
        if (response.status === 423 || response.status === 429) {
          setIsLocked(true);
          setLockoutMsg(errData.error || "Account locked temporarily.");
        } else {
          setError(errData.error || "Failed to resend code.");
        }
        return;
      }

      toast.success("New code sent!", { description: "Check your inbox or spam folder." });
      setCooldown(30);
      setTimeLeft(300);
      setOtpValues(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Network error.");
      setLoading(false);
    }
  }, [email, name, cooldown, isLocked]);

  // Submit OTP and register
  const handleVerifyAndSubmit = useCallback(async (currentOtp: string) => {
    setVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, otp: currentOtp,
          deviceId: typeof window !== "undefined" ? localStorage.getItem("master-typing-user-id") || "browser" : "browser",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "browser"
        })
      });

      if (!response.ok) {
        setVerifying(false);
        const errData = await response.json();
        if (response.status === 423) {
          setIsLocked(true);
          setLockoutMsg(errData.error || "Too many failed attempts.");
        } else {
          setError(errData.error || "Verification failed.");
        }
        setOtpValues(Array(6).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      const tempRegData = sessionStorage.getItem("temp_register_data");
      if (!tempRegData) {
        toast.error("Registration session expired. Please register again.");
        setVerifying(false);
        router.replace("/register");
        return;
      }

      const { fullName: regFullName, username: regUsername, password: regPassword } = JSON.parse(tempRegData);

      const regResult = await registerWithUsernameAndPhoto(email, regPassword, regFullName, regUsername, null);

      setVerifying(false);

      if (regResult.error) {
        setError(regResult.error);
        setOtpValues(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        sessionStorage.removeItem("temp_register_data");
        setVerified(true);
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${regUsername.toLowerCase()}`;

        useUserStore.setState({ username: regUsername, avatar: avatarUrl });
        addLoginRecord("email-register-otp");
        setProfileComplete(true);

        toast.success("Verification successful!", { description: `Welcome, ${regUsername}!` });
        setTimeout(() => router.replace("/"), 1800);
      }
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setVerifying(false);
    }
  }, [email, router, addLoginRecord, setProfileComplete]);

  // Auto-submit OTP when all 6 digits typed
  useEffect(() => {
    const fullOtp = otpValues.join("");
    if (fullOtp.length === 6 && !verifying && !verified && !isLocked) {
      handleVerifyAndSubmit(fullOtp);
    }
  }, [otpValues, verifying, verified, isLocked, handleVerifyAndSubmit]);

  return (
    <>
      <AuthBackground />
      <ConfettiCanvas active={verified} />

      <AuthCard>
        <div className="flex flex-col gap-5 items-center text-center relative w-full">
          
          {/* Back button */}
          {!verified && !verifying && (
            <motion.button 
              onClick={() => router.replace("/register")} 
              whileHover={{ scale: 1.1, x: -3 }}
              whileTap={{ scale: 0.95 }}
              className="absolute left-0 top-0 flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs font-bold"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </motion.button>
          )}

          {/* Icon */}
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }} className="relative mt-2">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6366F1]/10 to-[#8B5CF6]/10 border border-[#6366F1]/20 flex items-center justify-center">
              {verified ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 450, damping: 15 }}>
                  <CheckCircle className="w-11 h-11 text-emerald-400" />
                </motion.div>
              ) : isLocked ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <XCircle className="w-11 h-11 text-rose-400" />
                </motion.div>
              ) : verifying ? (
                <Loader2 className="w-11 h-11 text-indigo-400 animate-spin" />
              ) : (
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
                  <Mail className="w-10 h-10 text-[#6366F1]" />
                </motion.div>
              )}
            </div>

            {!verified && !isLocked && !verifying &&
              [0, 1, 2, 3].map((i) => (
                <motion.div key={i} className="absolute w-1.5 h-1.5 rounded-full bg-indigo-500/30"
                  animate={{ y: [-15, -45], x: [(i - 1.5) * 12, (i - 1.5) * 20], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                  style={{ top: "45%", left: "45%" }}
                />
              ))}
          </motion.div>

          <AnimatePresence mode="wait">
            {verified ? (
              <motion.div key="verified" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 items-center">
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Security Code Verified</h1>
                  <p className="text-xs text-white/50 mt-1">Creating your dashboard profile...</p>
                </div>
                <div className="w-full max-w-[160px] h-1 bg-white/[0.04] rounded-full overflow-hidden mt-2 border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.6 }} className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400" />
                </div>
              </motion.div>
            ) : isLocked ? (
              <motion.div key="locked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 items-center">
                <div>
                  <h1 className="text-lg font-black text-rose-400 tracking-tight flex items-center justify-center gap-1.5">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" /> Security Lockout
                  </h1>
                  <p className="text-xs text-rose-400/80 leading-relaxed mt-2 p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-2xl max-w-sm">
                    {lockoutMsg || "This account has been locked due to suspicious activity."}
                  </p>
                </div>
                <button onClick={() => router.replace("/register")} className="mt-2 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1 px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05]">
                  Return to Signup
                </button>
              </motion.div>
            ) : (
              <motion.div key="verify-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 w-full items-center">
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight">Email Verification</h1>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">
                    We sent a 6-digit code to<br />
                    <span className="text-indigo-400 font-bold tracking-wide">{maskedEmail}</span>
                  </p>
                </div>

                {/* ── Check inbox / spam notice ── */}
                <div className="w-full bg-amber-500/[0.06] border border-amber-500/15 rounded-2xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed text-left">
                    <span className="font-bold text-amber-300">Can't find the email?</span> Check your <span className="font-bold text-white/70">Spam</span> or <span className="font-bold text-white/70">Junk</span> folder. The email is from <span className="font-semibold text-white/60">mastertypingpro@gmail.com</span>
                  </p>
                </div>

                {/* Inline error alerts */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold text-center w-full shadow-md flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OTP Digits */}
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="flex gap-2.5 justify-center py-1"
                >
                  {otpValues.map((value, idx) => (
                    <motion.input
                      key={idx} type="text" inputMode="numeric" value={value}
                      variants={itemVariants}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      disabled={verifying || loading}
                      whileFocus={{ scale: 1.08, y: -2 }}
                      className="w-11 h-14 bg-white/[0.03] border border-white/10 rounded-2xl text-center text-xl font-black text-white focus:border-indigo-500 focus:shadow-[0_0_16px_rgba(99,102,241,0.15)] focus:bg-white/[0.05] outline-none transition-all duration-300"
                    />
                  ))}
                </motion.div>

                {/* Loading */}
                {verifying && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-400 font-bold py-1">
                    <Loader2 className="w-4 h-4 animate-spin" /> Validating security code...
                  </div>
                )}

                {/* Expiry Timer */}
                {!verifying && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-white/35 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
                    <span>Code expires in:</span>
                    <span className={`font-mono text-sm font-black ${timeLeft < 60 ? "text-rose-400 animate-pulse" : "text-indigo-400"}`}>
                      {timeLeft > 0 ? formatTime(timeLeft) : "Expired"}
                    </span>
                  </div>
                )}

                {/* Resend button */}
                <div className="pt-1 w-full">
                  <motion.button 
                    onClick={handleResend} 
                    disabled={cooldown > 0 || loading || verifying}
                    whileHover={cooldown > 0 ? {} : { scale: 1.02, y: -1 }}
                    whileTap={cooldown > 0 ? {} : { scale: 0.98 }}
                    className={`w-full py-3.5 rounded-2xl text-xs font-bold tracking-wider uppercase transition-all duration-300 border ${
                      cooldown > 0
                        ? "bg-white/[0.02] text-white/25 border-white/5 cursor-not-allowed"
                        : "bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/[0.08] hover:text-white"
                    }`}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : cooldown > 0 ? (
                      `Request new code in ${cooldown}s`
                    ) : (
                      "Resend Verification Code"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AuthCard>
    </>
  );
}
