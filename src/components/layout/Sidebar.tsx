"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/useUserStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { signOut } from "@/lib/authService";
import { 
  Keyboard, 
  BookOpen, 
  Library, 
  Target, 
  Trophy, 
  BarChart3, 
  Bot, 
  Flame, 
  Globe2, 
  Medal, 
  Gamepad2, 
  Music, 
  Palette, 
  Settings, 
  Info,
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  ShieldAlert,
  LogOut,
  LogIn,
  DownloadCloud,
  Monitor,
  Zap,
  Volume2,
  WifiOff,
  X,
  Cpu
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Keyboard },
  { name: "Learn", href: "/learn", icon: BookOpen },
  { name: "Lesson Library", href: "/library", icon: Library },
  { name: "Typing Tests", href: "/tests", icon: Target },
  { name: "History", href: "/history", icon: History },
  { name: "Achievements", href: "/achievements", icon: Trophy },
  { name: "Statistics", href: "/statistics", icon: BarChart3 },
  { name: "AI Coach", href: "/ai-coach", icon: Bot },
  { name: "Challenges", href: "/challenges", icon: Flame },
  { name: "Multiplayer", href: "/multiplayer", icon: Globe2 },
  { name: "Leaderboards", href: "/leaderboards", icon: Medal },
  { name: "Games", href: "/games", icon: Gamepad2 },
  { name: "Sound Studio", href: "/sound-studio", icon: Music },
  { name: "Themes", href: "/themes", icon: Palette },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "About", href: "/about", icon: Info },
];

const activeRoutes = ["/", "/learn", "/tests", "/history", "/achievements", "/statistics", "/themes", "/settings", "/profile", "/library", "/ai-coach", "/challenges", "/multiplayer", "/leaderboards", "/games", "/sound-studio", "/admin"];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [comingSoonPage, setComingSoonPage] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { username, avatar, isAdmin } = useUserStore();
  const { level, xp, initializeCloudSync } = useStatsStore();
  const { isAuthenticated, user } = useAuthStore();

  const menuItems = isAdmin
    ? [{ name: "Admin Portal", href: "/admin", icon: ShieldAlert }, ...navigation]
    : navigation;

  // Derive display info: prefer auth user data, fallback to local store
  const displayName = (isAuthenticated && user?.displayName) ? user.displayName : username;
  const displayAvatar = (isAuthenticated && user?.photoURL) ? user.photoURL : avatar;
  const displaySubtext = isAuthenticated && user?.email ? user.email : `Level ${level} - ${xp} XP`;

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  useEffect(() => {
    initializeCloudSync();
  }, [initializeCloudSync]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    const isAvailable = activeRoutes.includes(item.href);
    if (!isAvailable) {
      e.preventDefault();
      setComingSoonPage(item.name);
      
      // Clear popup after 3 seconds
      setTimeout(() => {
        setComingSoonPage(null);
      }, 3000);
    }
  };

  return (
    <>
      <motion.aside
        initial={{ width: 240 }}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="glass-panel h-full border-r flex flex-col relative z-50 rounded-none border-t-0 border-l-0 border-b-0 overflow-visible"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col leading-none">
                <div className="font-black text-[1.1rem] tracking-tighter">
                  <span className="text-foreground">TYPE</span>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-primary bg-[length:200%_auto] animate-pulse">MASTER</span>
                </div>
              </div>
              <motion.div 
                animate={{ y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="bg-primary/20 border border-primary/30 text-primary text-[0.55rem] font-black px-1 py-0.5 rounded shadow-[0_0_10px_rgba(var(--primary),0.3)] tracking-widest mt-0.5"
              >
                PRO
              </motion.div>
            </motion.div>
          )}
          {collapsed && (
            <div className="w-full flex justify-center text-primary">
              <Keyboard className="w-6 h-6" />
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-4 top-8 bg-background border border-border rounded-full p-1.5 hover:bg-muted transition-colors shadow-md z-50"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-hide">
          <nav className="space-y-0.5 px-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const isAvailable = activeRoutes.includes(item.href);
              
              return (
                <motion.div
                  key={item.name}
                  whileHover={isAvailable ? { scale: 1.02, x: 4 } : {}}
                  whileTap={isAvailable ? { scale: 0.95 } : { x: [-4, 4, -4, 4, 0] }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item)}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-200 group relative text-[13px]
                      ${isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : isAvailable 
                          ? "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                          : "text-muted-foreground/40 hover:bg-foreground/5 cursor-not-allowed"
                      }
                      ${collapsed ? "justify-center" : "justify-start"}
                    `}
                    title={collapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <item.icon className={`w-4 h-4 relative z-10 ${isActive ? "text-primary" : (isAvailable ? "group-hover:text-primary transition-colors" : "opacity-50")}`} />
                    
                    {!collapsed && (
                      <span className="relative z-10 whitespace-nowrap">{item.name}</span>
                    )}

                    {!isAvailable && !collapsed && (
                      <Lock className="w-3 h-3 absolute right-3 opacity-30" />
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </nav>
        </div>

        {/* Custom PWA Install Prompter */}
        {isInstallable && !collapsed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="mx-3 my-2 p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col gap-2.5 relative z-40 overflow-hidden group transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -z-10 group-hover:bg-primary/20 transition-all duration-300" />
            
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black tracking-widest text-primary uppercase leading-none">Desktop App</span>
                <span className="text-[9px] text-green-400 font-bold uppercase mt-0.5 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Native Ready
                </span>
              </div>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              Unlock distraction-free focus mode and sub-8ms typing audio responses.
            </p>
            
            <button 
              onClick={() => setShowInstallModal(true)}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider hover:bg-primary/95 transition-all text-center cursor-pointer shadow-[0_4px_12px_rgba(var(--primary),0.2)] hover:shadow-lg active:scale-98"
            >
              Learn More & Install
            </button>
          </motion.div>
        )}

        {isInstallable && collapsed && (
          <div className="flex justify-center my-3 relative group">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInstallModal(true)}
              className="w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 flex items-center justify-center transition-all cursor-pointer relative shadow-lg"
            >
              <DownloadCloud className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </motion.button>
            
            {/* Tooltip */}
            <div className="absolute left-14 top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-[#0c0d14] border border-white/10 text-[11px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-xl">
              Install Desktop App
            </div>
          </div>
        )}

        {/* User Profile / Auth Section */}
        <div className="px-3 py-3 border-t border-foreground/5 mt-auto">
          {isAuthenticated ? (
            <div className="flex flex-col gap-1.5">
              <Link href="/profile" className="flex items-center gap-2.5 w-full p-1.5 hover:bg-foreground/5 rounded-lg transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {displayAvatar && displayAvatar !== "User" ? (
                    <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-foreground text-sm">{displayName.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                
                <AnimatePresence>
                  {!collapsed && (
                    <motion.div 
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex flex-col items-start overflow-hidden whitespace-nowrap flex-1 min-w-0"
                    >
                      <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">{displayName}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">{displaySubtext}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>

              {/* Sign Out button */}
              {!collapsed && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              )}
              {collapsed && (
                <button
                  onClick={handleSignOut}
                  className="flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2.5 w-full p-2 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer border border-primary/20 bg-primary/5"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center shrink-0">
                <LogIn className="w-4 h-4 text-primary" />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex flex-col items-start overflow-hidden whitespace-nowrap"
                  >
                    <span className="text-xs font-bold text-primary">Sign In</span>
                    <span className="text-[10px] text-muted-foreground">Login or create account</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          )}
        </div>
      </motion.aside>

      {/* Global Coming Soon Popup for Sidebar Clicks */}
      <AnimatePresence>
        {comingSoonPage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-foreground/5 backdrop-blur-xl border border-foreground/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] p-4 pr-8 rounded-full flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/20 flex items-center justify-center shadow-inner">
                <Lock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Coming Soon</span>
                <span className="text-2xl font-black text-foreground leading-none">{comingSoonPage}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Installation Wizard Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-full max-w-2xl bg-[#07080d] border border-white/10 rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-[0_0_80px_rgba(99,102,241,0.15)] flex flex-col gap-8 z-10"
            >
              {/* Background ambient lighting */}
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
              
              {/* Close Button */}
              <button 
                onClick={() => setShowInstallModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/25 animate-pulse">
                  <Monitor className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                    Unlock Native Performance
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                    Install TypeMaster Pro on your desktop for a premium, distraction-free, and high-fidelity typing workspace.
                  </p>
                </div>
              </div>
              
              {/* Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    icon: Zap,
                    title: "Hardware Accelerated",
                    desc: "Silky smooth 144Hz+ rendering with zero browser input overhead."
                  },
                  {
                    icon: Volume2,
                    title: "Ultra-Low Sound Latency",
                    desc: "Optimized sound buffer profiles mimicking mechanical switches in real-time."
                  },
                  {
                    icon: Cpu,
                    title: "Standalone Window",
                    desc: "Clean desktop window without address bars, tabs, or system notifications."
                  },
                  {
                    icon: WifiOff,
                    title: "Offline Sync Support",
                    desc: "Review history, learn lessons, and access challenges entirely offline."
                  }
                ].map((benefit, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/10">
                      <benefit.icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-sm font-bold text-white">{benefit.title}</h4>
                      <p className="text-xs text-muted-foreground leading-normal">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Latency Comparison Visualizer */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex flex-col gap-4">
                <span className="text-xs font-bold text-primary uppercase tracking-widest leading-none">Audio Input Latency Comparison</span>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-muted-foreground">Standard Web Browser</span>
                      <span className="text-red-400 font-mono">~45ms (High delay)</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-white">Native Standalone App</span>
                      <span className="text-[#00c896] font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        ~8ms (Ultra-Low)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "15%" }}
                        transition={{ delay: 0.5, duration: 1 }}
                        className="h-full bg-gradient-to-r from-primary to-[#00c896] shadow-[0_0_10px_#00c896]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Install CTA Button */}
              <div className="flex flex-col gap-3">
                {deferredPrompt ? (
                  <button 
                    onClick={async () => {
                      setShowInstallModal(false);
                      await handleInstallClick();
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary via-blue-500 to-primary bg-[length:200%_auto] hover:bg-[100%_center] text-primary-foreground font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/35 hover:scale-102 active:scale-98 cursor-pointer transition-all duration-300"
                  >
                    Install Standalone App
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-center flex flex-col gap-2">
                    <span className="text-xs font-bold text-yellow-400">PWA Prompt Unavailable</span>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      To install this app on your system, click the <strong className="text-white">Install</strong> or <strong className="text-white">Add to Home Screen</strong> icon in your browser's address bar or menu.
                    </p>
                  </div>
                )}
                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Keep Using Browser
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
