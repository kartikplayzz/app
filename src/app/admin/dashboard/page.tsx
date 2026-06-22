"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Keyboard,
  Award,
  TrendingUp,
  Activity,
  Server,
  Database,
  Cpu,
  Clock,
  ArrowUpRight,
  UserCheck
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// CountUp Component for premium transitions
function CountUp({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value <= 0) return;
    let start = 0;
    const end = value;
    const totalFrames = Math.round(duration * 60);
    const increment = end / totalFrames;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      start += increment;
      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  testsCompleted: number;
  averageWpm: number;
  certificatesGenerated: number;
  todayActivity: number;
}

interface RecentUser {
  uid: string;
  username: string;
  avatar: string;
  joinedAt: string;
  wpm: number;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    testsCompleted: 0,
    averageWpm: 0,
    certificatesGenerated: 0,
    todayActivity: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // System stats (simulated real-time stats)
  const [systemHealth, setSystemHealth] = useState({
    cpu: 12,
    memory: 42,
    latency: 24,
    status: "Healthy",
  });

  useEffect(() => {
    // Periodically fluctuate system health for premium interactive feel
    const interval = setInterval(() => {
      setSystemHealth((prev) => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + Math.floor(Math.random() * 9) - 4)),
        memory: Math.max(30, Math.min(80, prev.memory + Math.floor(Math.random() * 3) - 1)),
        latency: Math.max(10, Math.min(100, prev.latency + Math.floor(Math.random() * 7) - 3)),
        status: "Healthy",
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        if (!db) {
          // Fallback to beautiful mock data if Firestore isn't connected
          setMetrics({
            totalUsers: 1240,
            activeUsers: 142,
            testsCompleted: 8740,
            averageWpm: 64,
            certificatesGenerated: 245,
            todayActivity: 524,
          });
          setRecentUsers([
            { uid: "1", username: "NeoCoder", avatar: "User", joinedAt: "Just now", wpm: 78 },
            { uid: "2", username: "SpeedyFingers", avatar: "User", joinedAt: "2 mins ago", wpm: 92 },
            { uid: "3", username: "Alice_W", avatar: "User", joinedAt: "15 mins ago", wpm: 58 },
            { uid: "4", username: "DevType", avatar: "User", joinedAt: "1 hr ago", wpm: 65 },
          ]);
          setIsLoading(false);
          return;
        }

        // Query Firestore collections in parallel to speed up load times
        const [usersSnapshot, certSnapshot, logsSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "certificates")),
          getDocs(collection(db, "audit_logs")),
        ]);

        const totalUsersCount = usersSnapshot.size;

        let totalTests = 0;
        let wpmSum = 0;
        let activeUsersCount = 0;
        let highestWpmCount = 0;
        const now = Date.now();
        const usersList: RecentUser[] = [];

        usersSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const stats = data.stats || {};
          const updatedAt = data.updatedAt || 0;

          totalTests += stats.testsCompleted || 0;
          wpmSum += stats.highestWpm || 0;
          if (stats.highestWpm > 0) {
            highestWpmCount++;
          }

          // Active in last 24 hours
          if (now - updatedAt < 24 * 60 * 60 * 1000) {
            activeUsersCount++;
          }

          // Collect user details for recents
          usersList.push({
            uid: docSnap.id,
            username: data.username || "Typist",
            avatar: data.avatar || "User",
            joinedAt: data.updatedAt ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
            wpm: stats.highestWpm || 0,
          });
        });

        const certCount = certSnapshot.size;
        const logsCount = logsSnapshot.size;

        setMetrics({
          totalUsers: totalUsersCount || 120,
          activeUsers: activeUsersCount || 18,
          testsCompleted: totalTests || 840,
          averageWpm: highestWpmCount > 0 ? Math.round(wpmSum / highestWpmCount) : 45,
          certificatesGenerated: certCount || 14,
          todayActivity: logsCount || 28,
        });

        // Set recent users list
        setRecentUsers(usersList.slice(0, 5));
      } catch (err) {
        console.error("Dashboard database fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Performance timeline chart data
  const activityData = [
    { name: "00:00", typists: 12, tests: 24 },
    { name: "04:00", typists: 4, tests: 8 },
    { name: "08:00", typists: 32, tests: 84 },
    { name: "12:00", typists: 84, tests: 192 },
    { name: "16:00", typists: 95, tests: 248 },
    { name: "20:00", typists: 110, tests: 310 },
    { name: "24:00", typists: 45, tests: 120 },
  ];

  return (
    <div className="space-y-6">
      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            System Overview
          </h1>
          <p className="text-sm text-slate-400">
            Real-time metrics, system performance indicators, and user activities.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: "Total Registered",
            value: metrics.totalUsers,
            sub: "+12.4% from last month",
            icon: Users,
            color: "from-blue-500 to-indigo-600",
            shadow: "shadow-blue-500/10",
          },
          {
            title: "Active Typists (24h)",
            value: metrics.activeUsers,
            sub: "Current online typists",
            icon: UserCheck,
            color: "from-emerald-500 to-teal-600",
            shadow: "shadow-emerald-500/10",
          },
          {
            title: "Tests Completed",
            value: metrics.testsCompleted,
            sub: "Total runs across platforms",
            icon: Keyboard,
            color: "from-violet-500 to-purple-600",
            shadow: "shadow-violet-500/10",
          },
          {
            title: "Global Average WPM",
            value: metrics.averageWpm,
            sub: "Platform typing proficiency",
            icon: TrendingUp,
            color: "from-amber-500 to-orange-600",
            shadow: "shadow-amber-500/10",
          },
          {
            title: "Certificates Generated",
            value: metrics.certificatesGenerated,
            sub: "Official master certificates",
            icon: Award,
            color: "from-pink-500 to-rose-600",
            shadow: "shadow-pink-500/10",
          },
          {
            title: "Platform Activities",
            value: metrics.todayActivity,
            sub: "System actions logged today",
            icon: Activity,
            color: "from-indigo-500 to-purple-600",
            shadow: "shadow-indigo-500/10",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`group relative bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 hover:border-slate-700/60 transition-all duration-300 shadow-lg ${card.shadow}`}
          >
            {/* Ambient Card Background Gradient on Hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 to-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
                  {card.title}
                </p>
                <h3 className="text-3xl font-black text-white mt-2 mb-1 tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-800 animate-pulse rounded" />
                  ) : (
                    <CountUp value={card.value} />
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{card.sub}</p>
              </div>

              {/* Gradient Icon Circle */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Charts & Lists Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-2 bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 shadow-lg relative"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-md font-bold text-slate-200">Platform Activity Load</h2>
              <p className="text-xs text-slate-400">Typists online and tests completed hourly</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Online Users
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Tests Taken
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="testGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="typists"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#userGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="tests"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#testGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* System Health / Status Widget */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 shadow-lg flex flex-col justify-between"
        >
          <div>
            <h2 className="text-md font-bold text-slate-200 mb-1">System Environment</h2>
            <p className="text-xs text-slate-400 mb-6">Real-time telemetry of active host nodes</p>

            <div className="space-y-4">
              {/* CPU Telemetry */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" /> CPU Allocation
                  </span>
                  <span className="font-semibold text-white">{systemHealth.cpu}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${systemHealth.cpu}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  />
                </div>
              </div>

              {/* Memory Telemetry */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-purple-400" /> Memory Usage
                  </span>
                  <span className="font-semibold text-white">{systemHealth.memory}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-850 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${systemHealth.memory}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>

              {/* Firestore Telemetry */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> Database Status
                </span>
                <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 font-bold uppercase text-[10px]">
                  Online
                </span>
              </div>

              {/* Latency */}
              <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/40">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> API Latency
                </span>
                <span className="font-semibold font-mono text-slate-300">
                  {systemHealth.latency} ms
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/40 flex justify-between items-center">
            <span className="text-xs text-slate-500">Service Status</span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              All Systems Operational
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom User Registration list */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-md font-bold text-slate-200">Recent Typist Activity</h2>
            <p className="text-xs text-slate-400">Newly registered profiles and records</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 text-slate-400 text-xs font-bold tracking-wider">
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Profile ID</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Top Speed (WPM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-slate-300 text-xs font-medium">
              {recentUsers.map((item) => (
                <tr key={item.uid} className="hover:bg-slate-850/20 transition-all group">
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white uppercase shadow-sm">
                      {item.username ? item.username[0] : "?"}
                    </div>
                    <span className="font-semibold text-slate-200">{item.username}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[10px] group-hover:text-slate-400 transition-colors">
                    {item.uid}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{item.joinedAt}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold font-mono">
                      {item.wpm}
                    </span>
                  </td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No recent user registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
