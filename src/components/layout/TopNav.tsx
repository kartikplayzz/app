"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Search, Zap, LogOut, Settings, User, LogIn, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { signOut } from "@/lib/authService";

export function TopNav() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { username, avatar } = useUserStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive display info
  const displayName = (isAuthenticated && user?.displayName) ? user.displayName : username;
  const displayAvatar = (isAuthenticated && user?.photoURL) ? user.photoURL : avatar;

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push("/login");
  };

  return (
    <header className="h-12 border-b border-white/5 flex items-center justify-between pl-4 pr-48 shrink-0 relative z-40 electron-drag bg-background/50 backdrop-blur-md">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full electron-no-drag">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search lessons, users, or settings..." 
            className="w-full bg-foreground/5 border border-foreground/10 rounded-full py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 electron-no-drag absolute right-[180px]">
        {!isAuthenticated && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium"
          >
            <Zap className="w-4 h-4" />
            <span>Go Premium</span>
          </motion.button>
        )}

        <button className="relative p-2 rounded-full hover:bg-foreground/5 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
        </button>

        <div className="h-4 w-[1px] bg-foreground/10 mx-1"></div>

        {/* Auth / User Section */}
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-foreground/5 transition-all duration-200 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border border-foreground/10 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                {displayAvatar && displayAvatar !== "User" ? (
                  <img src={displayAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-foreground text-xs">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-xl bg-background/80 backdrop-blur-xl border border-foreground/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-foreground/5 bg-foreground/2">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mb-1">Signed in as</p>
                    <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                    {user?.email && <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>}
                  </div>

                  <div className="p-1">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-primary/70" />
                      <span>Edit Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-primary/70" />
                      <span>Account Settings</span>
                    </Link>
                  </div>

                  <div className="p-1 border-t border-foreground/5">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all text-left cursor-pointer font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-400/70" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-all text-xs font-bold cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}

