"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  UserX,
  UserCheck,
  Trash2,
  Eye,
  History,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Trophy,
  Activity,
  Award,
  Network,
  Smartphone,
  AlertOctagon,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  RotateCcw
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/adminService";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  username: string;
  avatar: string;
  joinedAt?: number;
  isBanned?: boolean;
  isAdmin?: boolean;
  ipAddress?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  stats?: {
    level?: number;
    xp?: number;
    testsCompleted?: number;
    highestWpm?: number;
    recentTests?: Array<{
      wpm: number;
      accuracy: number;
      timestamp: number;
      mode: string;
    }>;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [blockedIps, setBlockedIps] = useState<string[]>([]);
  const [blockedDevices, setBlockedDevices] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned" | "ip-blocked" | "device-blocked">("all");
  const [sortField, setSortField] = useState<keyof UserProfile | "wpm" | "tests">("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected User for details modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [modalTab, setModalTab] = useState<"profile" | "history" | "moderation">("profile");

  // State to track if IP/Fingerprint was copied
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Stats editing state
  const [isEditingStats, setIsEditingStats] = useState(false);
  const [editLevel, setEditLevel] = useState(1);
  const [editXp, setEditXp] = useState(0);
  const [editHighestWpm, setEditHighestWpm] = useState(0);
  const [editTestsCompleted, setEditTestsCompleted] = useState(0);
  const [lastSelectedUid, setLastSelectedUid] = useState<string | null>(null);

  // Fetch users & block lists in realtime
  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Setup mock fallback timeout if Firestore connection hangs (offline)
    const mockTimeout = setTimeout(() => {
      if (users.length === 0) {
        useMockData();
        setIsLoading(false);
      }
    }, 3500);

    // 1. Subscribe to users collection
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      clearTimeout(mockTimeout);
      const usersList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          uid: docSnap.id,
          username: data.username || "Anonymous",
          avatar: data.avatar || "User",
          joinedAt: data.joinedAt || data.updatedAt || Date.now(),
          isBanned: data.isBanned || false,
          isAdmin: data.isAdmin || false,
          ipAddress: data.ipAddress || "127.0.0.1",
          deviceFingerprint: data.deviceFingerprint || "DEV-UNKNOWN",
          userAgent: data.userAgent || "Unknown",
          stats: data.stats || {},
        });
      });
      setUsers(usersList);
      setIsLoading(false);
    }, (err) => {
      console.warn("Firestore user stream failed, utilizing local fallback:", err);
      clearTimeout(mockTimeout);
      useMockData();
      setIsLoading(false);
    });

    // 2. Subscribe to blocked IPs collection
    const unsubBlockedIps = onSnapshot(collection(db, "blocked_ips"), (snapshot) => {
      const ips = snapshot.docs.map(doc => doc.id);
      setBlockedIps(ips);
    }, (err) => {
      console.error("Firestore blocked_ips stream failed:", err);
    });

    // 3. Subscribe to blocked devices collection
    const unsubBlockedDevices = onSnapshot(collection(db, "blocked_devices"), (snapshot) => {
      const devices = snapshot.docs.map(doc => doc.id);
      setBlockedDevices(devices);
    }, (err) => {
      console.error("Firestore blocked_devices stream failed:", err);
    });

    return () => {
      unsubUsers();
      unsubBlockedIps();
      unsubBlockedDevices();
      clearTimeout(mockTimeout);
    };
  }, []);

  // Sync selectedUser if the main list updates in real-time
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find((u) => u.uid === selectedUser.uid);
      if (updated) {
        setSelectedUser(updated);
      }
    }
  }, [users, selectedUser]);

  // Initialize edit fields when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      if (selectedUser.uid !== lastSelectedUid) {
        setEditLevel(selectedUser.stats?.level || 1);
        setEditXp(selectedUser.stats?.xp || 0);
        setEditHighestWpm(selectedUser.stats?.highestWpm || 0);
        setEditTestsCompleted(selectedUser.stats?.testsCompleted || 0);
        setLastSelectedUid(selectedUser.uid);
        setIsEditingStats(false);
      }
    } else {
      setLastSelectedUid(null);
      setIsEditingStats(false);
    }
  }, [selectedUser, lastSelectedUid]);

  const useMockData = () => {
    const mockUsers: UserProfile[] = Array.from({ length: 15 }, (_, i) => ({
      uid: `user-${i + 1}`,
      username: `Typist_${i + 10}`,
      avatar: "User",
      joinedAt: Date.now() - i * 3600000 * 24,
      isBanned: i % 7 === 0,
      isAdmin: i === 2,
      ipAddress: `192.168.1.${10 + i}`,
      deviceFingerprint: `DEV-FF${i}B${20-i}A`,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      stats: {
        level: 3 + (i % 5),
        xp: 450 * (i + 1),
        testsCompleted: 12 + i * 3,
        highestWpm: 45 + (i * 2) % 60,
        recentTests: [
          { wpm: 55, accuracy: 96, timestamp: Date.now() - 3600000, mode: "English" },
          { wpm: 62, accuracy: 98, timestamp: Date.now() - 7200000, mode: "Programming" },
        ],
      },
    }));
    setUsers(mockUsers);
    setBlockedIps([`192.168.1.10`]);
    setBlockedDevices([`DEV-FF7B13A`]);
    toast.info("Offline Fallback Mode", { description: "Displaying simulated user profiles." });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success("Copied to clipboard", { description: text });
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleBanToggle = async (userId: string, currentBanStatus: boolean) => {
    try {
      const targetUser = users.find((u) => u.uid === userId);
      if (targetUser?.isAdmin) {
        toast.error("Action Prohibited", { description: "Cannot ban an administrator." });
        return;
      }

      if (db) {
        await updateDoc(doc(db, "users", userId), {
          isBanned: !currentBanStatus,
        });
      } else {
        // Mock mode state updates
        setUsers((prev) =>
          prev.map((u) => (u.uid === userId ? { ...u, isBanned: !currentBanStatus } : u))
        );
      }

      const actionLabel = currentBanStatus ? "Unban User" : "Ban User";
      await logAdminAction(actionLabel, `Target UID: ${userId}`);
      toast.success(currentBanStatus ? "User Unbanned" : "User Banned", {
        description: `Successfully updated credentials for user.`,
      });
    } catch (err) {
      console.error("Failed to toggle ban state:", err);
      toast.error("Update Failed");
    }
  };

  const handleIpBlockToggle = async (ip: string | undefined) => {
    if (!ip || ip === "127.0.0.1" || ip === "DEV-UNKNOWN") {
      toast.error("Invalid Target", { description: "Cannot ban placeholder/local network nodes." });
      return;
    }

    try {
      const isBlocked = blockedIps.includes(ip);
      
      // Prevent blocking admin IP
      const isAdminIp = users.some((u) => (u.isAdmin || u.username.toLowerCase().includes("admin")) && u.ipAddress === ip);
      if (isAdminIp && !isBlocked) {
        toast.error("Action Prohibited", { description: "Cannot block an administrator's IP address." });
        return;
      }

      if (db) {
        const blockRef = doc(db, "blocked_ips", ip);
        if (isBlocked) {
          await deleteDoc(blockRef);
          await logAdminAction("Unblock IP", `IP Address: ${ip}`);
          toast.success("IP Ban Lifted", { description: `Cleared network node: ${ip}` });
        } else {
          await setDoc(blockRef, { blockedAt: Date.now(), reason: "Manual Enforcement" });
          await logAdminAction("Block IP", `IP Address: ${ip}`);
          toast.success("IP Address Blocked", { description: `Banned network node: ${ip}` });
        }
      } else {
        // Mock state updates
        setBlockedIps(prev =>
          isBlocked ? prev.filter((item) => item !== ip) : [...prev, ip]
        );
        toast.success(isBlocked ? "IP Ban Lifted (Simulated)" : "IP Blocked (Simulated)");
      }
    } catch (err) {
      console.error("Failed to update IP block:", err);
      toast.error("Operation Failed");
    }
  };

  const handleDeviceBlockToggle = async (fingerprint: string | undefined) => {
    if (!fingerprint || fingerprint === "DEV-UNKNOWN" || fingerprint === "server-fingerprint") {
      toast.error("Invalid Target", { description: "Cannot flag placeholder/server hardware signatures." });
      return;
    }

    try {
      const isBlocked = blockedDevices.includes(fingerprint);
      
      // Prevent blocking admin device
      const isAdminDevice = users.some((u) => (u.isAdmin || u.username.toLowerCase().includes("admin")) && u.deviceFingerprint === fingerprint);
      if (isAdminDevice && !isBlocked) {
        toast.error("Action Prohibited", { description: "Cannot block an administrator's device signature." });
        return;
      }

      if (db) {
        const blockRef = doc(db, "blocked_devices", fingerprint);
        if (isBlocked) {
          await deleteDoc(blockRef);
          await logAdminAction("Unblock Device", `Fingerprint: ${fingerprint}`);
          toast.success("Device Ban Lifted", { description: `Cleared hardware signature: ${fingerprint}` });
        } else {
          await setDoc(blockRef, { blockedAt: Date.now(), reason: "Manual Hardware Enforcement" });
          await logAdminAction("Block Device", `Fingerprint: ${fingerprint}`);
          toast.success("Device Blocked", { description: `Banned hardware signature: ${fingerprint}` });
        }
      } else {
        // Mock state updates
        setBlockedDevices(prev =>
          isBlocked ? prev.filter((item) => item !== fingerprint) : [...prev, fingerprint]
        );
        toast.success(isBlocked ? "Device Ban Lifted (Simulated)" : "Device Blocked (Simulated)");
      }
    } catch (err) {
      console.error("Failed to update device block:", err);
      toast.error("Operation Failed");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmDelete = window.confirm(
      "Are you absolutely sure you want to delete this user? This will erase their profile. This action is irreversible."
    );
    if (!confirmDelete) return;

    try {
      const targetUser = users.find((u) => u.uid === userId);
      if (targetUser?.isAdmin) {
        toast.error("Action Prohibited", { description: "Cannot delete an administrator." });
        return;
      }

      if (db) {
        const { auth } = await import("@/lib/firebase");
        if (!auth || !auth.currentUser) {
          throw new Error("No active auth session.");
        }

        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch("/api/admin/delete-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
          },
          body: JSON.stringify({ userId })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to delete user profile.");
        }
      } else {
        setUsers((prev) => prev.filter((u) => u.uid !== userId));
      }

      await logAdminAction("Delete User Profile", `Target UID: ${userId}`);
      setSelectedUser(null);
      toast.success("User Deleted", { description: "Profile has been removed from platform database." });
    } catch (err: any) {
      console.error("Failed to delete user profile:", err);
      toast.error("Deletion Failed", { description: err.message || "An error occurred." });
    }
  };

  const handleResetStats = async (userId: string) => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all stats, XP, level, and typing history for this user to 0? This cannot be undone."
    );
    if (!confirmReset) return;

    try {
      if (db) {
        await updateDoc(doc(db, "users", userId), {
          "stats.level": 1,
          "stats.xp": 0,
          "stats.testsCompleted": 0,
          "stats.highestWpm": 0,
          "stats.recentTests": [],
          "stats.completedLessons": [],
          "stats.lessonProgress": {},
          updatedAt: Date.now(),
        });
      } else {
        // Mock mode state updates
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === userId
              ? {
                  ...u,
                  stats: {
                    level: 1,
                    xp: 0,
                    testsCompleted: 0,
                    highestWpm: 0,
                    recentTests: [],
                    completedLessons: [],
                    lessonProgress: {},
                  },
                }
              : u
          )
        );
      }

      await logAdminAction("Reset User Stats", `Target UID: ${userId}`);
      
      // Update inputs with reset values
      setEditLevel(1);
      setEditXp(0);
      setEditHighestWpm(0);
      setEditTestsCompleted(0);

      toast.success("User Stats Reset", {
        description: "All typing metrics, levels, and progress have been reset to 0.",
      });
    } catch (err: any) {
      console.error("Failed to reset user stats:", err);
      toast.error("Operation Failed", { description: err.message || "An error occurred." });
    }
  };

  const handleUpdateStats = async (userId: string) => {
    try {
      if (db) {
        await updateDoc(doc(db, "users", userId), {
          "stats.level": Number(editLevel),
          "stats.xp": Number(editXp),
          "stats.highestWpm": Number(editHighestWpm),
          "stats.testsCompleted": Number(editTestsCompleted),
          updatedAt: Date.now(),
        });
      } else {
        // Mock mode state updates
        setUsers((prev) =>
          prev.map((u) =>
            u.uid === userId
              ? {
                  ...u,
                  stats: {
                    ...u.stats,
                    level: Number(editLevel),
                    xp: Number(editXp),
                    highestWpm: Number(editHighestWpm),
                    testsCompleted: Number(editTestsCompleted),
                  },
                }
              : u
          )
        );
      }

      await logAdminAction(
        "Update User Stats",
        `Target UID: ${userId} - Lvl: ${editLevel}, XP: ${editXp}, WPM: ${editHighestWpm}, Tests: ${editTestsCompleted}`
      );
      setIsEditingStats(false);
      toast.success("User Stats Updated", {
        description: "The user's statistics have been successfully updated.",
      });
    } catch (err: any) {
      console.error("Failed to update user stats:", err);
      toast.error("Update Failed", { description: err.message || "An error occurred." });
    }
  };

  // Sort & Filter logic
  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.uid.toLowerCase().includes(search.toLowerCase());

      const userIp = user.ipAddress || "";
      const userDevice = user.deviceFingerprint || "";
      const isIpBlocked = blockedIps.includes(userIp);
      const isDeviceBlocked = blockedDevices.includes(userDevice);

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = !user.isBanned && !isIpBlocked && !isDeviceBlocked;
      } else if (statusFilter === "banned") {
        matchesStatus = !!user.isBanned;
      } else if (statusFilter === "ip-blocked") {
        matchesStatus = isIpBlocked;
      } else if (statusFilter === "device-blocked") {
        matchesStatus = isDeviceBlocked;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let valA: any = a[sortField as keyof UserProfile] ?? "";
      let valB: any = b[sortField as keyof UserProfile] ?? "";

      if (sortField === "wpm") {
        valA = a.stats?.highestWpm || 0;
        valB = b.stats?.highestWpm || 0;
      } else if (sortField === "tests") {
        valA = a.stats?.testsCompleted || 0;
        valB = b.stats?.testsCompleted || 0;
      }

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

  // Pagination bounds
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const displayedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof UserProfile | "wpm" | "tests") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          User Directory
        </h1>
        <p className="text-sm text-slate-400">
          Manage platform registrations, adjust access vectors, block devices or IPs, and inspect performance profiles.
        </p>
      </div>

      {/* Control Bar (Filters / Search) */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center bg-slate-900/10 backdrop-blur-xl border border-slate-800/40 p-4 rounded-2xl">
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by username or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          {([
            { id: "all", label: "All Users" },
            { id: "active", label: "Active" },
            { id: "banned", label: "Banned Profile" },
            { id: "ip-blocked", label: "Blocked IP" },
            { id: "device-blocked", label: "Blocked Device" }
          ] as const).map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setStatusFilter(filter.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize border transition-all whitespace-nowrap ${
                statusFilter === filter.id
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/5"
                  : "bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-400 text-xs font-bold tracking-wider select-none bg-slate-950/10">
                <th className="py-4 px-5 cursor-pointer hover:text-slate-200" onClick={() => handleSort("username")}>
                  User
                </th>
                <th className="py-4 px-5">Role</th>
                <th className="py-4 px-5 cursor-pointer hover:text-slate-200" onClick={() => handleSort("wpm")}>
                  Top Speed
                </th>
                <th className="py-4 px-5 cursor-pointer hover:text-slate-200" onClick={() => handleSort("tests")}>
                  Tests Run
                </th>
                <th className="py-4 px-5">Enforcement Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300 text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800" />
                      <div className="space-y-1">
                        <div className="w-20 h-3 bg-slate-800 rounded" />
                        <div className="w-28 h-2.5 bg-slate-850 rounded" />
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="w-12 h-4 bg-slate-800 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="w-10 h-4 bg-slate-850 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="w-8 h-4 bg-slate-850 rounded" />
                    </td>
                    <td className="py-4 px-5">
                      <div className="w-14 h-4.5 bg-slate-800 rounded-full" />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="inline-flex gap-2 w-24 h-8 bg-slate-850 rounded" />
                    </td>
                  </tr>
                ))
              ) : displayedUsers.map((user) => {
                const userIp = user.ipAddress || "";
                const userDevice = user.deviceFingerprint || "";
                const isIpBlocked = blockedIps.includes(userIp);
                const isDeviceBlocked = blockedDevices.includes(userDevice);
                const isBanned = user.isBanned;

                return (
                  <tr key={user.uid} className="hover:bg-slate-850/20 transition-all duration-150">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white uppercase shadow-sm">
                          {user.username ? user.username[0] : "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-200 truncate">{user.username}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{user.uid}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      {user.isAdmin ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 font-mono bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full w-fit">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">Student</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="font-bold text-slate-200 font-mono bg-slate-850 border border-slate-800 px-2 py-0.5 rounded">
                        {user.stats?.highestWpm || 0} WPM
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono">
                      {user.stats?.testsCompleted || 0}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1">
                        {!isBanned && !isIpBlocked && !isDeviceBlocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                            Active
                          </span>
                        )}
                        {isBanned && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-bold shadow-[0_0_10px_rgba(244,63,94,0.05)] animate-pulse">
                            Banned Profile
                          </span>
                        )}
                        {isIpBlocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                            IP Blocked
                          </span>
                        )}
                        {isDeviceBlocked && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-bold shadow-[0_0_10px_rgba(168,85,247,0.05)]">
                            Device Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Audit Details */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalTab("profile");
                          }}
                          className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Speed History */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalTab("history");
                          }}
                          className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="View Typing History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {/* Moderation Controls Trigger */}
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setModalTab("moderation");
                          }}
                          className={`p-1.5 rounded-lg border transition-all ${
                            isBanned || isIpBlocked || isDeviceBlocked
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/20"
                              : "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-indigo-400"
                          }`}
                          title="Moderation Control Panel"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && displayedUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-semibold">
                    No users match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-slate-850/60 text-slate-400 text-xs bg-slate-950/10">
            <span>
              Showing Page {currentPage} of {totalPages} ({filteredUsers.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950/20 hover:bg-slate-900 text-slate-400 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal (Tri Tab) */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white uppercase text-md shadow-lg shadow-indigo-500/10">
                    {selectedUser.username[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      {selectedUser.username}
                      {selectedUser.isAdmin && <Shield className="w-3.5 h-3.5 text-indigo-400" />}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono leading-none mt-1">UID: {selectedUser.uid}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/20 text-xs">
                {(["profile", "history", "moderation"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setModalTab(tab)}
                    className={`flex-1 py-3 text-center font-semibold border-b-2 transition-all capitalize ${
                      modalTab === tab
                        ? "border-indigo-500 text-slate-100 bg-slate-900/50"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab === "profile" ? "Profile Details" : tab === "history" ? "Typing History" : "Moderation Panel"}
                  </button>
                ))}
              </div>

              {/* Body Content */}
              <div className="p-6 max-h-[380px] overflow-y-auto text-xs text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
                {modalTab === "profile" && (
                  <div className="space-y-4">
                    {/* Stats overview */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-3 text-center">
                        <Trophy className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Rank / Level</div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {selectedUser.stats?.level || 1}
                        </div>
                      </div>
                      <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-3 text-center">
                        <Award className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Top Speed</div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {selectedUser.stats?.highestWpm || 0} WPM
                        </div>
                      </div>
                      <div className="bg-slate-950/30 border border-slate-800/60 rounded-xl p-3 text-center">
                        <Activity className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                        <div className="text-[10px] text-slate-500 font-bold uppercase">Runs Taken</div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {selectedUser.stats?.testsCompleted || 0}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                        <span className="text-slate-500">Joined Date</span>
                        <span className="font-medium">
                          {selectedUser.joinedAt
                            ? new Date(selectedUser.joinedAt).toLocaleDateString()
                            : "Recently"}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                        <span className="text-slate-500">Current XP Point</span>
                        <span className="font-semibold font-mono text-indigo-400">
                          {selectedUser.stats?.xp || 0} XP
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                        <span className="text-slate-500">Device Fingerprint</span>
                        <span className="font-mono text-slate-350">{selectedUser.deviceFingerprint || "DEV-UNKNOWN"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                        <span className="text-slate-500">IP Node</span>
                        <span className="font-mono text-slate-350">{selectedUser.ipAddress || "127.0.0.1"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                        <span className="text-slate-500">Account Standing</span>
                        <span
                          className={`font-semibold ${
                            selectedUser.isBanned ? "text-rose-450" : "text-emerald-400"
                          }`}
                        >
                          {selectedUser.isBanned ? "Restricted / Banned" : "Good Standing"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {modalTab === "history" && (
                  <div className="space-y-3">
                    {selectedUser.stats?.recentTests && selectedUser.stats.recentTests.length > 0 ? (
                      selectedUser.stats.recentTests.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/20 border border-slate-800/60 font-mono"
                        >
                          <div>
                            <div className="text-slate-200 text-xs font-bold leading-tight">
                              {t.mode} test run
                            </div>
                            <div className="text-[10px] text-slate-500 leading-none mt-1">
                              {new Date(t.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-indigo-400 leading-none">
                              {t.wpm} <span className="text-[9px] font-bold text-slate-500">WPM</span>
                            </span>
                            <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                              {t.accuracy}% Acc
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-slate-500">
                        This user has not taken any typing speed tests yet.
                      </p>
                    )}
                  </div>
                )}

                {modalTab === "moderation" && (
                  <div className="space-y-5">
                    {/* Moderation Warning */}
                    <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                      <AlertOctagon className="w-5 h-5 flex-shrink-0 text-amber-400" />
                      <div>
                        <span className="font-bold">Caution:</span> Modifying these security states will apply bans instantly across all user sessions in real-time. Banned networks and devices cannot register new accounts.
                      </div>
                    </div>

                    {/* Enforcement Vectors */}
                    <div className="space-y-4">
                      {/* Vector 1: Profile Ban */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-rose-400" />
                            <span className="font-bold text-slate-200">Suspend Profile</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
                            Locks the user's specific account profile. They will be logged out and cannot sign in.
                          </p>
                        </div>
                        <button
                          onClick={() => handleBanToggle(selectedUser.uid, !!selectedUser.isBanned)}
                          className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            selectedUser.isBanned
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                          }`}
                        >
                          {selectedUser.isBanned ? "Lift Profile Ban" : "Ban Profile"}
                        </button>
                      </div>

                      {/* Vector 2: IP Ban */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Network className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-slate-200">Block Network IP</span>
                          </div>
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="font-mono text-slate-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{selectedUser.ipAddress || "127.0.0.1"}</span>
                            <button
                              onClick={() => handleCopy(selectedUser.ipAddress || "127.0.0.1")}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                              title="Copy IP"
                            >
                              {copiedText === selectedUser.ipAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
                            Restricts access to the entire network node. Blocks registration and login for all users on this IP.
                          </p>
                        </div>
                        <button
                          onClick={() => handleIpBlockToggle(selectedUser.ipAddress)}
                          className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            blockedIps.includes(selectedUser.ipAddress || "")
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-450 hover:bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                          }`}
                        >
                          {blockedIps.includes(selectedUser.ipAddress || "") ? "Unblock IP" : "Block IP"}
                        </button>
                      </div>

                      {/* Vector 3: Device Ban */}
                      <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-purple-400" />
                            <span className="font-bold text-slate-200">Block Hardware Device</span>
                          </div>
                          <div className="flex items-center gap-1.5 py-0.5">
                            <span className="font-mono text-slate-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{selectedUser.deviceFingerprint || "DEV-UNKNOWN"}</span>
                            <button
                              onClick={() => handleCopy(selectedUser.deviceFingerprint || "DEV-UNKNOWN")}
                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-slate-300 transition-colors"
                              title="Copy Fingerprint"
                            >
                              {copiedText === selectedUser.deviceFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed max-w-[280px]">
                            Flags this browser hardware footprint. Restricts platform usage from this machine, even on different accounts.
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeviceBlockToggle(selectedUser.deviceFingerprint)}
                          className={`w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                            blockedDevices.includes(selectedUser.deviceFingerprint || "")
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450 hover:bg-emerald-500/20"
                              : "bg-purple-500/10 border-purple-500/20 text-purple-450 hover:bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.05)]"
                          }`}
                        >
                          {blockedDevices.includes(selectedUser.deviceFingerprint || "") ? "Unblock Device" : "Block Device"}
                        </button>
                      </div>
                    </div>

                    {/* Stats Control Section */}
                    <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-850 hover:border-slate-800 transition-colors flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold text-slate-200">Stats & XP Control</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsEditingStats(!isEditingStats)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-slate-200 transition-all border border-slate-800"
                        >
                          {isEditingStats ? "Cancel Edit" : "Edit Stats"}
                        </button>
                      </div>

                      {isEditingStats ? (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Level</label>
                            <input
                              type="number"
                              value={editLevel}
                              onChange={(e) => setEditLevel(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">XP Point</label>
                            <input
                              type="number"
                              value={editXp}
                              onChange={(e) => setEditXp(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Top WPM</label>
                            <input
                              type="number"
                              value={editHighestWpm}
                              onChange={(e) => setEditHighestWpm(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase">Tests Completed</label>
                            <input
                              type="number"
                              value={editTestsCompleted}
                              onChange={(e) => setEditTestsCompleted(Math.max(0, Number(e.target.value)))}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateStats(selectedUser.uid)}
                            className="col-span-2 mt-2 w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all"
                          >
                            Save Stats Changes
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            Allows modifications of typing performance records, levels, and total XP points directly from admin console.
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleResetStats(selectedUser.uid)}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-450 transition-all flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Reset User Stats to 0
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Danger zone */}
                    <div className="pt-2 border-t border-slate-850">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                        <div>
                          <div className="font-bold text-red-400 text-xs">Purge User Profile</div>
                          <p className="text-[10px] text-slate-500 mt-0.5">Permanently delete all typing records, metrics, and auth profile links.</p>
                        </div>
                        <button
                          onClick={() => handleDeleteUser(selectedUser.uid)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
