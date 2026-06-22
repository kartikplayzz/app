"use client";
 
import { useUserStore } from "@/store/useUserStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, 
  User as UserIcon, 
  Camera, 
  AlertTriangle, 
  ShieldCheck, 
  Award, 
  Trophy, 
  Flame, 
  Target, 
  Mail, 
  CloudLightning, 
  LogOut, 
  UserCheck, 
  Sparkles, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/authService";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
  "from-amber-500 to-yellow-500",
];

export default function ProfilePage() {
  const router = useRouter();
  const { username, setUsername, avatar, setAvatar, isAdmin, joinedAt } = useUserStore();
  const { level, xp, testsCompleted, highestWpm, recentTests } = useStatsStore();
  const { isAuthenticated, user } = useAuthStore();
  
  const [tempName, setTempName] = useState((isAuthenticated && user?.displayName) ? user.displayName : username);
  const [tempUsername, setTempUsername] = useState(username);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<string | null>(avatar && avatar !== "User" ? avatar : null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounced username availability checker
  useEffect(() => {
    const cleanUsername = tempUsername.trim().toLowerCase();
    if (cleanUsername === username.trim().toLowerCase() && username !== "Guest User") {
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
      const isAvailable = await checkUsernameAvailability(tempUsername);
      setUsernameAvailable(isAvailable);
      setIsCheckingUsername(false);
    }, 350);

    return () => clearTimeout(checkTimer);
  }, [tempUsername, username]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    
    const cleanUsername = tempUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setError("Username cannot be empty.");
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
      setError("Checking username availability...");
      return;
    }

    setSaving(true);
    try {
      // Save display name to Firebase Auth profile if logged in
      if (isAuthenticated && tempName.trim()) {
        const { updateUserProfile } = await import("@/lib/authService");
        await updateUserProfile(tempName.trim());
      }

      // Save username & avatar to stores and Firestore
      setUsername(tempUsername.trim());
      if (avatarFile) {
        setAvatar(avatarFile);
      }
      
      setSuccess("Profile settings saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Derive display subtext and values
  const latestAccuracy = recentTests.length > 0 ? `${recentTests[0].accuracy}%` : "0%";
  const xpPercent = Math.min(Math.round((xp % 1000) / 10), 100);

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-20 pt-2 flex-grow">
      
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
            User Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your identities, visual styles, and synchronization states.
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/5 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 rounded-xl text-xs font-bold text-red-400 transition-all active:scale-95 self-start cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Account
          </button>
        )}
      </div>

      {/* Grid Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Visual Profile & Status Cards */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full">
          
          {/* Visual Avatar Card */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center text-center shadow-lg">
            {/* Ambient Background Light */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-[#6366F1]/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#8B5CF6]/10 rounded-full blur-[80px] pointer-events-none" />

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Glowing Avatar Frame */}
            <div 
              className="relative group cursor-pointer mb-5"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload profile photo"
            >
              {/* Spinning active ring */}
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#6366F1] via-[#8B5CF6] to-[#22C55E] opacity-75 group-hover:opacity-100 blur-[2px] animate-spin-slow" style={{ animationDuration: '12s' }} />
              
              <div className="relative w-32 h-32 rounded-full bg-[#0b1120] border-2 border-[#0B1120] flex items-center justify-center overflow-hidden z-10">
                {avatarFile ? (
                  <img src={avatarFile} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${AVATAR_COLORS[selectedColor]} flex items-center justify-center`}>
                    <span className="text-3xl font-black text-white/90">
                      {tempName ? tempName.charAt(0).toUpperCase() : "?"}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Icon Overlay on Hover */}
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Avatar Color presets */}
            {!avatarFile && (
              <div className="flex gap-2 mb-4">
                {AVATAR_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(i)}
                    className={`w-6 h-6 rounded-full bg-gradient-to-br ${c} border border-black/40 transition-all ${
                      selectedColor === i
                        ? "ring-2 ring-[#6366F1] ring-offset-2 ring-offset-[#0B1120] scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    title="Select color preset"
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 z-10">
              <div className="flex items-center justify-center gap-1.5">
                <h2 className="text-xl font-black text-white truncate max-w-[200px]">{tempName || "Guest User"}</h2>
                {isAdmin && (
                  <div className="p-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg" title="Site Administrator Role">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              <span className="text-xs text-[#6366F1] font-bold tracking-wider">@{tempUsername || "speedtyper"}</span>
            </div>

            {/* XP Level Bar */}
            <div className="w-full flex flex-col gap-2 mt-6 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white">Level {level}</span>
                <span className="text-muted-foreground">{xp % 1000} / 1000 XP</span>
              </div>
              <div className="h-2 w-full bg-background/50 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${xpPercent}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]"
                />
              </div>
            </div>
          </div>

          {/* Sync Engine / Database Indicator Card */}
          <div className="glass-panel p-5 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col gap-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Database Sync Engine</span>
              {isAuthenticated ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-wider rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                  Cloud Sync Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-wider rounded-full">
                  Local Offline Engine
                </span>
              )}
            </div>

            <div className="flex items-start gap-3 mt-1.5">
              <div className={`p-2.5 rounded-2xl border ${isAuthenticated ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"}`}>
                <CloudLightning className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <h4 className="text-xs font-black text-white">
                  {isAuthenticated ? "Firebase Authentication Connected" : "Local Storage Engine Active"}
                </h4>
                <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                  {isAuthenticated 
                    ? `Your profile is linked to ${user?.email || "online account"}. All statistics and configurations automatically synchronize to Cloud Firestore.` 
                    : "No online account connected. All achievements and typing metrics are securely stored offline inside this browser (IndexedDB)."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Identity Forms & Stats Summary */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Stats Performance Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
            <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" /> WPM Best
              </span>
              <span className="text-2xl font-black text-white leading-none">{highestWpm}</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-green-400" /> Latest Acc
              </span>
              <span className="text-2xl font-black text-white leading-none">{latestAccuracy}</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-500" /> Completed
              </span>
              <span className="text-2xl font-black text-white leading-none">{testsCompleted}</span>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-white/5 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-purple-400" /> Current Rank
              </span>
              <span className="text-xs font-black text-purple-400 mt-1 uppercase bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 self-start">
                Level {level}
              </span>
            </div>
          </div>

          {/* Form Settings Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-6 relative shadow-lg">
            
            {/* Inline Notifications */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold text-center"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold text-center"
                >
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" /> Full Name / Display Name
                </label>
                <input 
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300"
                  placeholder="e.g. John Doe"
                />
              </div>

              {/* Username with checker */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="text-primary text-[13px] font-black">@</span> Unique Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black">@</span>
                  <input 
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-9 pr-5 py-3.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300"
                    placeholder="speedtyper"
                  />
                </div>
                {tempUsername.trim().length >= 3 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1">
                    {isCheckingUsername ? (
                      <span className="text-white/40 animate-pulse">Checking availability...</span>
                    ) : usernameAvailable === true ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Username available
                      </span>
                    ) : usernameAvailable === false ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        Username taken
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Bio text area */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Profile Bio
              </label>
              <textarea 
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 160))}
                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-white/20 outline-none focus:border-[#6366F1]/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.1)] transition-all duration-300 resize-none leading-relaxed"
                placeholder="Write something about your typing achievements..."
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSave}
              disabled={saving}
              className="mt-2 w-full sm:w-auto self-end flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#6366F1]/20 hover:shadow-xl hover:shadow-[#6366F1]/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save profile changes
                </>
              )}
            </motion.button>
          </div>

        </div>

      </div>
    </div>
  );
}
