"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Keyboard,
  BarChart3,
  Award,
  Megaphone,
  Settings,
  History,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Bell,
  Search
} from "lucide-react";
import { AdminLayoutGuard } from "@/components/layout/AdminLayoutGuard";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { Toaster } from "sonner";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Typing Tests", href: "/admin/tests", icon: Keyboard },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { name: "Certificates", href: "/admin/certificates", icon: Award },
  { name: "Announcements", href: "/admin/announcements", icon: Megaphone },
  { name: "OTP & Security", href: "/admin/otp-logs", icon: Shield },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: History }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user } = useAuthStore();
  const { username } = useUserStore();

  const handleLogout = async () => {
    try {
      const { auth } = await import("@/lib/firebase");
      if (auth) {
        await auth.signOut();
        router.push("/login");
      }
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <AdminLayoutGuard>
      <div className="flex h-screen w-screen bg-[#050816] text-slate-100 overflow-hidden font-sans relative">
        {/* Subtle background ambient glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />

        {/* Admin Sidebar */}
        <motion.aside
          animate={{ width: isCollapsed ? 76 : 260 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          className="relative z-30 flex flex-col h-full bg-slate-950/40 backdrop-blur-xl border-r border-slate-800/40 flex-shrink-0"
        >
          {/* Sidebar Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/40">
            <AnimatePresence mode="wait">
              {!isCollapsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold tracking-wider bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-sm">
                    TYPING PRO
                  </span>
                  <span className="text-[10px] bg-slate-800 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-400 font-mono font-bold">
                    ADM
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
                >
                  <Shield className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Collapse Button */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sidebar Nav Items */}
          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link key={item.name} href={item.href} className="block relative group">
                  <motion.div
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "text-white font-medium"
                        : "text-slate-400 hover:text-slate-100"
                    }`}
                    whileHover={{ x: isActive ? 0 : 4 }}
                  >
                    {/* Active Background Glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeAdminNavBg"
                        className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-xl"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    <div className="relative z-10 flex items-center justify-center flex-shrink-0">
                      <Icon
                        className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300"
                        }`}
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="relative z-10 text-sm whitespace-nowrap overflow-hidden"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <motion.div
                        layoutId="activeAdminNavIndicator"
                        className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800/40">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                {/* Collapsed Expand Toggle */}
                <button
                  onClick={() => setIsCollapsed(false)}
                  className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800/60 text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-red-950/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 hover:text-red-300 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Profile Card */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/30 border border-slate-800/40">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow">
                    {username ? username[0].toUpperCase() : "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate leading-none mb-1">
                      {username || "Administrator"}
                    </p>
                    <p className="text-[10px] text-indigo-400 font-mono truncate leading-none">
                      {user?.email || "admin@typingpro.com"}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/10 hover:bg-red-950/30 border border-red-900/20 hover:border-red-900/40 text-red-400 hover:text-red-300 text-xs font-semibold transition-all duration-200 active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout Session</span>
                </button>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
          {/* Admin Top Navigation */}
          <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-slate-950/20 backdrop-blur-xl border-b border-slate-800/40 relative z-20">
            {/* Breadcrumb / Section Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Console</span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-semibold text-slate-200 capitalize">
                {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
              </span>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button className="relative p-2 rounded-lg hover:bg-slate-900/60 border border-transparent hover:border-slate-800/40 transition-all text-slate-400 hover:text-slate-200">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              </button>

              <div className="h-6 w-px bg-slate-800/80" />

              {/* Quick Status Pill */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-semibold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                SECURE GATEWAY
              </div>
            </div>
          </header>

          {/* Admin Page Content */}
          <main className="flex-1 overflow-y-auto p-6 relative">
            {children}
          </main>
        </div>

        {/* Global Toast Provider specific to admin session */}
        <Toaster richColors position="top-right" theme="dark" />
      </div>
    </AdminLayoutGuard>
  );
}
