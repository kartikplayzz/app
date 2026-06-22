"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, MapPin, Palette, ArrowRight, ArrowLeft, SkipForward, Sparkles, Check } from "lucide-react";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthCard } from "@/components/auth/AuthCard";
import { updateUserProfile } from "@/lib/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-yellow-500",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Japan", "India", "Brazil", "South Korea", "Netherlands",
  "Sweden", "Norway", "Finland", "Denmark", "Singapore", "Other",
];

const THEME_SWATCHES = [
  { id: "default", label: "Premium Dark", colors: ["#0B1120", "#6366F1"] },
  { id: "purple", label: "Purple", colors: ["#1a0533", "#a855f7"] },
  { id: "pink", label: "Pink", colors: ["#1a0525", "#ec4899"] },
  { id: "sky-blue", label: "Ocean", colors: ["#0a1929", "#38bdf8"] },
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, setProfileComplete } = useAuthStore();
  const { username: storeUsername, setUsername, setAvatar } = useUserStore();

  const [step, setStep] = useState(0);
  const [avatarFile, setAvatarFile] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setSetupUsername] = useState(storeUsername && storeUsername !== "Guest User" ? storeUsername : "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [themeChoice, setThemeChoice] = useState("default");
  const [loading, setLoading] = useState(false);

  // Debounced username availability checker
  useEffect(() => {
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername === storeUsername.trim().toLowerCase() && storeUsername !== "Guest User") {
      setUsernameAvailable(true);
      setIsCheckingUsername(false);
      return;
    }

    const reserved = ["admin", "system", "administrator", "root", "support", "owner"];

    // Client-side rule validation
    if (cleanUsername.length < 4 || cleanUsername.length > 20 || /\s/.test(cleanUsername) || !/^[a-z0-9_]+$/.test(cleanUsername) || reserved.includes(cleanUsername)) {
      setUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const checkTimer = setTimeout(async () => {
      const { checkUsernameAvailability } = await import("@/lib/firebaseSync");
      const isAvailable = await checkUsernameAvailability(username);
      setUsernameAvailable(isAvailable);
      setIsCheckingUsername(false);
    }, 350);

    return () => clearTimeout(checkTimer);
  }, [username, storeUsername]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 4;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarFile(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async () => {
    setError(null);
    
    if (step === 1) {
      const cleanUsername = username.trim().toLowerCase();
      if (!cleanUsername) {
        setError("Please enter a username.");
        return;
      }
      
      const reserved = ["admin", "system", "administrator", "root", "support", "owner"];
      if (cleanUsername.length < 4) {
        setError("Username must be at least 4 characters.");
        return;
      }
      if (cleanUsername.length > 20) {
        setError("Username cannot exceed 20 characters.");
        return;
      }
      if (/\s/.test(cleanUsername)) {
        setError("Username cannot contain spaces.");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        setError("Username can only contain letters, numbers, and underscores.");
        return;
      }
      if (reserved.includes(cleanUsername)) {
        setError("This username is reserved.");
        return;
      }

      if (usernameAvailable === false) {
        setError("Username is already taken.");
        return;
      }
      if (isCheckingUsername) {
        setError("Please wait for the username availability check.");
        return;
      }
    }

    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      // Final step: save everything
      setLoading(true);

      if (displayName.trim()) {
        await updateUserProfile(displayName.trim());
      }
      
      if (username.trim()) {
        setUsername(username.trim());
      }
      
      if (avatarFile) {
        setAvatar(avatarFile);
      }

      setProfileComplete(true);
      setLoading(false);
      router.replace("/");
    }
  };

  const handleSkip = () => {
    setProfileComplete(true);
    router.replace("/");
  };

  const handleBack = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  return (
    <>
      <AuthBackground />
      <AuthCard>
        <div className="flex flex-col gap-6">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{
                    background: i <= step
                      ? "linear-gradient(90deg, #6366F1, #8B5CF6)"
                      : "transparent",
                  }}
                />
              </div>
            ))}
            <span className="text-[10px] text-white/30 font-bold ml-1">
              {step + 1}/{totalSteps}
            </span>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* Step 0: Avatar */}
            {step === 0 && (
              <motion.div
                key="avatar"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6 items-center"
              >
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">Choose Your Avatar</h2>
                  <p className="text-xs text-white/40 mt-1">Upload a photo or pick a color</p>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

                <div
                  className="relative group cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/10 group-hover:border-[#6366F1]/50 transition-all bg-gradient-to-br ${AVATAR_COLORS[selectedColor]}`}>
                    {avatarFile ? (
                      <img src={avatarFile} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-black text-white/80">
                        {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                </div>

                <div className="flex gap-2">
                  {AVATAR_COLORS.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedColor(i); setAvatarFile(null); }}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${c} transition-all ${
                        selectedColor === i && !avatarFile
                          ? "ring-2 ring-[#6366F1] ring-offset-2 ring-offset-[#0B1120] scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Name & Bio */}
            {step === 1 && (
              <motion.div
                key="name"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-5"
              >
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">Your Identity</h2>
                  <p className="text-xs text-white/40 mt-1">How should we address you?</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name" className="w-full bg-white/[0.04] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.06] focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">Username</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm font-bold">@</span>
                    <input
                      type="text" value={username} onChange={(e) => setSetupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="speedtyper" className="w-full bg-white/[0.04] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.06] focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300"
                    />
                  </div>
                  {username.trim().length >= 3 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold">
                      {isCheckingUsername ? (
                        <span className="text-white/40 animate-pulse">Checking availability...</span>
                      ) : usernameAvailable === true ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Username is available
                        </span>
                      ) : usernameAvailable === false ? (
                        <span className="text-red-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          Username is already taken
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">
                    Bio <span className="text-white/20 font-normal">({bio.length}/160)</span>
                  </label>
                  <textarea
                    value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full bg-white/[0.04] rounded-2xl px-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.06] focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300 resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Country & Theme */}
            {step === 2 && (
              <motion.div
                key="preferences"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-5"
              >
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">Preferences</h2>
                  <p className="text-xs text-white/40 mt-1">Customize your experience</p>
                </div>

                {/* Country */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50">Country</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                    <input
                      type="text" value={countrySearch || country}
                      onChange={(e) => { setCountrySearch(e.target.value); setCountry(""); }}
                      placeholder="Search country..."
                      className="w-full bg-white/[0.04] rounded-2xl pl-11 pr-5 py-3.5 text-sm text-white placeholder:text-white/20 outline-none border border-white/[0.06] focus:border-[#6366F1]/50 transition-all duration-300"
                    />
                  </div>
                  {countrySearch && !country && (
                    <div className="max-h-32 overflow-y-auto rounded-xl bg-[#0B1120] border border-white/[0.06] mt-1">
                      {filteredCountries.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setCountry(c); setCountrySearch(""); }}
                          className="w-full text-left px-4 py-2 text-xs text-white/60 hover:bg-white/[0.05] hover:text-white transition-colors"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Theme */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> Theme Preference
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {THEME_SWATCHES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setThemeChoice(t.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          themeChoice === t.id
                            ? "border-[#6366F1]/50 bg-[#6366F1]/10 shadow-[0_0_16px_rgba(99,102,241,0.15)]"
                            : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1">
                            {t.colors.map((color, ci) => (
                              <div key={ci} className="w-4 h-4 rounded-full border border-black/30" style={{ background: color }} />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold text-white/60">{t.label}</span>
                        </div>
                        {themeChoice === t.id && (
                          <Check className="w-3 h-3 text-[#6366F1] mt-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Complete */}
            {step === 3 && (
              <motion.div
                key="complete"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6 items-center text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#22C55E]/20 to-[#06B6D4]/20 border border-[#22C55E]/30 flex items-center justify-center relative"
                >
                  <Sparkles className="w-12 h-12 text-[#22C55E]" />

                  {/* Confetti-like particles */}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 rounded-full"
                      style={{
                        background: ["#6366F1", "#22C55E", "#06B6D4", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#14B8A6"][i],
                      }}
                      initial={{ scale: 0, x: 0, y: 0 }}
                      animate={{
                        scale: [0, 1, 0],
                        x: [0, Math.cos((i * Math.PI) / 4) * 60],
                        y: [0, Math.sin((i * Math.PI) / 4) * 60],
                      }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                    />
                  ))}
                </motion.div>

                <div>
                  <h2 className="text-2xl font-black text-white">You&apos;re All Set!</h2>
                  <p className="text-sm text-white/40 mt-2 leading-relaxed">
                    Your profile is ready. Time to master the keyboard.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 font-semibold transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              ) : (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/50 font-semibold transition-colors"
                >
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              )}
            </div>

            <motion.button
              onClick={handleNext}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60 transition-all"
              style={{
                background: step === totalSteps - 1
                  ? "linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)"
                  : "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
                boxShadow: step === totalSteps - 1
                  ? "0 4px 16px rgba(34, 197, 94, 0.3)"
                  : "0 4px 16px rgba(99, 102, 241, 0.3)",
              }}
            >
              {step === totalSteps - 1 ? "Enter Dashboard" : "Continue"}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </AuthCard>
    </>
  );
}
