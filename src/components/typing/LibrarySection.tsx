"use client";

import { useState } from "react";
import { History, BookOpen, BarChart3, Target, Zap, Award, Sparkles, Activity, Compass, ArrowUpRight } from "lucide-react";
import { TestHistory } from "@/components/typing/TestHistory";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { useStatsStore } from "@/store/useStatsStore";
import { motion, AnimatePresence } from "framer-motion";

export function LibrarySection() {
  const [activeTab, setActiveTab] = useState<"tests" | "lessons" | "stats">("tests");
  const { highestWpm, testsCompleted, xp, level, recentTests } = useStatsStore();

  // Filter test results to get metrics for the archetype calculation
  const testSessionsOnly = recentTests.filter(test => test.type !== "lesson");
  const totalCompleted = testSessionsOnly.length;
  const averageWpm = totalCompleted > 0
    ? Math.round(testSessionsOnly.reduce((acc, curr) => acc + curr.wpm, 0) / totalCompleted)
    : 0;
  const averageAccuracy = totalCompleted > 0
    ? Math.round(testSessionsOnly.reduce((acc, curr) => acc + curr.accuracy, 0) / totalCompleted)
    : 0;

  // Archetype logic
  const getTypingArchetype = (wpm: number, acc: number) => {
    if (wpm === 0) return { 
      title: "Novice Typist", 
      desc: "Complete your first speed test to unlock your custom typing archetype analysis.",
      badge: "Beginner",
      color: "from-slate-500/10 to-slate-500/20 text-slate-400 border-slate-500/30",
      glow: "rgba(148, 163, 184, 0.15)"
    };
    if (wpm >= 70 && acc >= 96) return { 
      title: "Elite Maestro", 
      desc: "Flawless finger dexterity at hyper-velocity. You type with surgical precision and speed.",
      badge: "Mythic",
      color: "from-yellow-500/20 to-amber-500/20 text-yellow-400 border-yellow-500/30",
      glow: "rgba(250, 204, 21, 0.15)"
    };
    if (wpm >= 55 && acc >= 95) return { 
      title: "Precision Laser", 
      desc: "Superb accuracy combined with solid writing speed. Balanced, reliable, and highly efficient.",
      badge: "Epic",
      color: "from-purple-500/20 to-fuchsia-500/20 text-purple-400 border-purple-500/30",
      glow: "rgba(168, 85, 247, 0.15)"
    };
    if (wpm >= 60 && acc < 92) return { 
      title: "Speed Demon", 
      desc: "Incredible raw speed, but accuracy fluctuates. Slow down slightly to perfect your muscle control.",
      badge: "Rare",
      color: "from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30",
      glow: "rgba(249, 115, 22, 0.15)"
    };
    if (wpm < 45 && acc >= 96) return { 
      title: "Careful Tactician", 
      desc: "Impeccable accuracy and focus. You value correctness above all. Speed will naturally follow.",
      badge: "Rare",
      color: "from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30",
      glow: "rgba(59, 130, 246, 0.15)"
    };
    return { 
      title: "Steady Scholar", 
      desc: "Developing strong baseline skills. Consistent practice will boost both WPM speed and precision.",
      badge: "Common",
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      glow: "rgba(16, 185, 129, 0.15)"
    };
  };

  const archetype = getTypingArchetype(averageWpm, averageAccuracy);

  const nextLevelXp = 1000;
  const xpInCurrentLevel = xp % nextLevelXp;
  const progressPercent = Math.min(100, (xpInCurrentLevel / nextLevelXp) * 100);
  const xpNeeded = nextLevelXp - xpInCurrentLevel;

  // Tab configurations
  const tabs = [
    { id: "tests", title: "Typing Test History", icon: Zap, glowColor: "rgba(249, 115, 22, 0.12)" },
    { id: "lessons", title: "Lessons History", icon: BookOpen, glowColor: "rgba(16, 185, 129, 0.12)" },
    { id: "stats", title: "Statistics & Insights", icon: BarChart3, glowColor: "rgba(168, 85, 247, 0.12)" }
  ] as const;

  const currentTabGlow = tabs.find(t => t.id === activeTab)?.glowColor || "rgba(249, 115, 22, 0.12)";

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 relative">
      {/* Background ambient glow matching current active tab */}
      <div 
        className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[140px] pointer-events-none -z-10 transition-all duration-700 ease-in-out" 
        style={{ backgroundColor: currentTabGlow }}
      />
      
      {/* Subheader & Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 px-2 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Library Analytics</h2>
            <p className="text-sm text-muted-foreground">Select a category to view logs, progression graphs, and archetypes.</p>
          </div>
        </div>
        
        {/* Animated pill tab selector */}
        <div className="flex p-1 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-white/5 relative w-full lg:w-auto overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 rounded-xl font-bold text-sm transition-colors duration-300 flex items-center gap-2 whitespace-nowrap z-10 w-full lg:w-auto justify-center cursor-pointer ${
                  isActive ? "text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? "scale-110 text-primary" : "text-muted-foreground/60"}`} />
                <span>{tab.title}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-white/[0.08] border border-white/10 rounded-xl -z-10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panels */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {activeTab === "tests" && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group animate-in fade-in-50 duration-300">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <TestHistory type="test" hideHeader />
              </div>
            </motion.div>
          )}

          {activeTab === "lessons" && (
            <motion.div
              key="lessons"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group animate-in fade-in-50 duration-300">
                <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
                <TestHistory type="lesson" hideHeader />
              </div>
            </motion.div>
          )}

          {activeTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-6"
            >
              {/* Row 1: XP Progress & Archetype */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Level Progress */}
                <div className="glass-panel p-8 rounded-3xl border border-white/5 flex flex-col justify-between relative overflow-hidden lg:col-span-2 group hover:border-white/10 transition-colors duration-300">
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/15 transition-colors" />
                  
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary animate-pulse" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rank Level Progress</span>
                      </div>
                      <h3 className="text-3xl font-black text-white mt-1">Level {level}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Keep typing to earn XP and rank up your muscle memory profile.</p>
                    </div>
                    
                    <div className="bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-2xl flex flex-col items-center">
                      <span className="text-[10px] text-primary/70 uppercase tracking-widest font-black">Total XP</span>
                      <span className="text-xl font-extrabold text-white">{xp}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-8">
                    <div className="flex justify-between items-end text-xs font-bold">
                      <span className="text-muted-foreground">Level {level}</span>
                      <span className="text-primary">{xpInCurrentLevel} / {nextLevelXp} XP <span className="text-muted-foreground font-normal">({xpNeeded} XP to Lvl {level + 1})</span></span>
                      <span className="text-muted-foreground">Level {level + 1}</span>
                    </div>
                    
                    <div className="w-full bg-white/5 rounded-2xl h-4.5 p-1 border border-white/5 overflow-hidden flex items-center">
                      <motion.div 
                        className="bg-gradient-to-r from-primary to-purple-500 h-full rounded-xl"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Persona/Archetype Card */}
                <div className={`glass-panel p-8 rounded-3xl border flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all duration-300 bg-gradient-to-br ${archetype.color}`}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-xl pointer-events-none opacity-50" style={{ backgroundColor: archetype.glow }} />
                  
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Compass className="w-5 h-5 text-current/80" />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-80">Typing Profile</span>
                      </div>
                      <h3 className="text-2xl font-black mt-2 tracking-tight">{archetype.title}</h3>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md border border-white/10 leading-none">
                      {archetype.badge}
                    </span>
                  </div>

                  <div className="mt-6">
                    <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                      {archetype.desc}
                    </p>
                    <div className="flex items-center gap-3 mt-4 text-xs font-bold text-foreground/60 border-t border-white/5 pt-4">
                      <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Avg: {averageWpm} WPM</span>
                      <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Acc: {averageAccuracy}%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 2: Charts & Quick Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Performance Chart Component */}
                <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col gap-2 lg:col-span-2 relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2.5">
                      <Activity className="w-5 h-5 text-orange-500" />
                      <div>
                        <h3 className="text-lg font-extrabold text-white tracking-tight">WPM Velocity Progression</h3>
                        <p className="text-xs text-muted-foreground">Chronological analysis of speed over the last 20 tests.</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      Live Test Feed <ArrowUpRight className="w-3 h-3 text-orange-500 animate-pulse" />
                    </span>
                  </div>
                  
                  <div className="h-[320px] flex items-center justify-center">
                    <PerformanceChart />
                  </div>
                </div>

                {/* 4 Cards Vertical List */}
                <div className="flex flex-col gap-4">
                  
                  {/* Card 1 */}
                  <div className="glass-panel p-5.5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">All-Time High</span>
                      <span className="text-2xl font-black text-white mt-0.5">{highestWpm} <span className="text-xs font-normal text-muted-foreground">WPM</span></span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="glass-panel p-5.5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Average WPM</span>
                      <span className="text-2xl font-black text-white mt-0.5">{averageWpm} <span className="text-xs font-normal text-muted-foreground">WPM</span></span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="glass-panel p-5.5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform duration-300">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Accuracy Average</span>
                      <span className="text-2xl font-black text-white mt-0.5">{averageAccuracy}%</span>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="glass-panel p-5.5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:border-white/10 transition-colors duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Test Sessions Run</span>
                      <span className="text-2xl font-black text-white mt-0.5">{testsCompleted}</span>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
