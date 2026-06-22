"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  Keyboard,
  Calendar,
  Filter
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

// Colors for the pie charts
const COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    userGrowthPercent: 18.5,
    avgWpmPercent: 4.2,
    completionPercent: 22.8,
    certPercent: 12.1,
  });

  // Fetch or mock analytics data
  const [monthlyGrowthData, setMonthlyGrowthData] = useState<any[]>([]);
  const [dailyUsersData, setDailyUsersData] = useState<any[]>([]);
  const [wpmTrendData, setWpmTrendData] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setLoading(true);
      try {
        // Mock data matching specs, with customizable values
        setMonthlyGrowthData([
          { name: "Jan", Users: 240, Growth: 10 },
          { name: "Feb", Users: 380, Growth: 58 },
          { name: "Mar", Users: 520, Growth: 36 },
          { name: "Apr", Users: 780, Growth: 50 },
          { name: "May", Users: 1050, Growth: 34 },
          { name: "Jun", Users: 1240, Growth: 18 },
        ]);

        setDailyUsersData([
          { name: "Mon", sessions: 120, runs: 280 },
          { name: "Tue", sessions: 145, runs: 320 },
          { name: "Wed", sessions: 160, runs: 390 },
          { name: "Thu", sessions: 135, runs: 300 },
          { name: "Fri", sessions: 175, runs: 420 },
          { name: "Sat", sessions: 210, runs: 560 },
          { name: "Sun", sessions: 195, runs: 490 },
        ]);

        setWpmTrendData([
          { week: "Wk 1", WPM: 48, accuracy: 92 },
          { week: "Wk 2", WPM: 52, accuracy: 93 },
          { week: "Wk 3", WPM: 56, accuracy: 94 },
          { week: "Wk 4", WPM: 59, accuracy: 95 },
          { week: "Wk 5", WPM: 62, accuracy: 96 },
          { week: "Wk 6", WPM: 64, accuracy: 96 },
        ]);

        setCategoryDistribution([
          { name: "English", value: 45 },
          { name: "Hindi", value: 15 },
          { name: "Programming", value: 25 },
          { name: "Numbers", value: 10 },
          { name: "Custom", value: 5 },
        ]);

        if (db) {
          // If Firebase is available, we could read real counts
          const usersSnapshot = await getDocs(collection(db, "users"));
          const totalCount = usersSnapshot.size;
          if (totalCount > 0) {
            // Adjust growth slightly for visual realism
            setMonthlyGrowthData((prev) =>
              prev.map((d, idx) => (idx === prev.length - 1 ? { ...d, Users: totalCount } : d))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load analytics data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            System Analytics
          </h1>
          <p className="text-sm text-slate-400">
            Audit platform growth, user engagement ratios, typing proficiency levels, and exam records.
          </p>
        </div>
      </div>

      {/* Analytics Briefing Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "User Acquisition",
            metric: "+248 registered",
            trend: `${stats.userGrowthPercent}% MoM`,
            up: true,
            icon: Users,
            color: "text-indigo-400 border-indigo-500/20",
          },
          {
            title: "WPM Proficiency",
            metric: "64.2 WPM Avg",
            trend: `${stats.avgWpmPercent}% increase`,
            up: true,
            icon: TrendingUp,
            color: "text-emerald-400 border-emerald-500/20",
          },
          {
            title: "Completed Runs",
            metric: "8,740 speed tests",
            trend: `${stats.completionPercent}% growth`,
            up: true,
            icon: Keyboard,
            color: "text-purple-400 border-purple-500/20",
          },
          {
            title: "Certificates Generated",
            metric: "245 documents",
            trend: `${stats.certPercent}% increase`,
            up: true,
            icon: Award,
            color: "text-pink-400 border-pink-500/20",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-5 rounded-2xl flex justify-between items-center`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                {card.title}
              </span>
              <span className="text-lg font-black text-slate-100 block">{card.metric}</span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <TrendingUp className="w-3 h-3" /> {card.trend}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-950/40 border border-slate-850 flex items-center justify-center text-slate-400">
              <card.icon className="w-5 h-5 text-indigo-400" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Grid of Main Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: User Growth Timeline (Monthly) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-6 rounded-2xl"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-200">Registered Users Growth</h3>
            <p className="text-xs text-slate-500">Timeline of user database size by month</p>
          </div>

          <div className="h-64">
            {loading ? (
              <div className="w-full h-full bg-slate-850/20 animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGrowthData}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b/30" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Users"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#growthGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 2: Daily User Sessions vs Speed Runs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-6 rounded-2xl"
        >
          <div className="mb-4 text-slate-200">
            <h3 className="text-sm font-bold">Daily Session Load (Weekly)</h3>
            <p className="text-xs text-slate-500">Number of active logging sessions vs tests completed</p>
          </div>

          <div className="h-64">
            {loading ? (
              <div className="w-full h-full bg-slate-850/20 animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyUsersData}>
                  <CartesianGrid stroke="#1e293b/30" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="sessions" name="Sessions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="runs" name="Test Trials" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 3: Speed Proficiency Trends (WPM vs Accuracy) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-6 rounded-2xl"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-200">Global Typing Skills Transition</h3>
            <p className="text-xs text-slate-500">Average WPM vs Accuracy over 6 weeks</p>
          </div>

          <div className="h-64">
            {loading ? (
              <div className="w-full h-full bg-slate-850/20 animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={wpmTrendData}>
                  <CartesianGrid stroke="#1e293b/30" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Line
                    type="monotone"
                    dataKey="WPM"
                    name="Avg WPM"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy %"
                    stroke="#EC4899"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Chart 4: Test Categories Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-6 rounded-2xl"
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-200">Category Session Share</h3>
            <p className="text-xs text-slate-500">Percentage distribution of typing tests completed</p>
          </div>

          <div className="h-64 flex flex-col md:flex-row justify-around items-center">
            {loading ? (
              <div className="w-40 h-40 bg-slate-850/20 animate-pulse rounded-full" />
            ) : (
              <>
                <div className="w-44 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  {categoryDistribution.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2 text-slate-300">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span>{item.name}:</span>
                      <span className="text-slate-400 font-mono font-medium">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
