"use client";

import { useStatsStore } from "@/store/useStatsStore";
import { Target, Zap, BookOpen, Trophy, CheckCircle, History } from "lucide-react";
import { motion } from "framer-motion";

export function TestHistory({ hideHeader = false, type = "test" }: { hideHeader?: boolean; type?: "test" | "lesson" }) {
  const { recentTests } = useStatsStore();

  const filteredTests = recentTests.filter((test) => {
    if (type === "test") {
      return test.type !== "lesson";
    } else {
      return test.type === "lesson";
    }
  });

  // Calculate summary metrics for the current filtered list
  const totalCompleted = filteredTests.length;
  const averageWpm = totalCompleted > 0
    ? Math.round(filteredTests.reduce((acc, curr) => acc + curr.wpm, 0) / totalCompleted)
    : 0;
  const highestWpm = totalCompleted > 0
    ? Math.max(...filteredTests.map((t) => t.wpm))
    : 0;
  const averageAccuracy = totalCompleted > 0
    ? Math.round(filteredTests.reduce((acc, curr) => acc + curr.accuracy, 0) / totalCompleted)
    : 0;

  const getGrade = (acc: number) => {
    if (acc >= 98) return "S+";
    if (acc >= 95) return "S";
    if (acc >= 90) return "A";
    if (acc >= 85) return "B";
    if (acc >= 80) return "C";
    return "D";
  };

  const getGradeStyle = (grade: string) => {
    switch (grade) {
      case "S+": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]";
      case "S": return "bg-purple-500/10 text-purple-500 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
      case "A": return "bg-green-500/10 text-green-500 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]";
      case "B": return "bg-blue-500/10 text-blue-500 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]";
      case "C": return "bg-orange-500/10 text-orange-500 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]";
      default: return "bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
    }
  };

  if (filteredTests.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-7xl mx-auto flex flex-col items-center justify-center text-center gap-4 ${hideHeader ? 'p-12' : 'mt-16 glass-panel p-12 rounded-3xl'}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-foreground/[0.02] border border-white/5 flex items-center justify-center">
          {type === "test" ? (
            <Zap className="w-8 h-8 text-foreground/20" />
          ) : (
            <BookOpen className="w-8 h-8 text-foreground/20" />
          )}
        </div>
        <h3 className="text-2xl font-bold text-foreground/60">
          {type === "test" ? "No Test History Yet" : "No Lessons Completed Yet"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {type === "test" 
            ? "Complete a speed typing test in the Tests portal to track your metrics and see your speed graphs grow." 
            : "Complete interactive typing lesson stages in the library to build your muscular memory history."}
        </p>
      </motion.div>
    );
  }

  // Motion variants for staggered tables
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 15 } }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto flex flex-col gap-8 ${hideHeader ? '' : 'mt-16'}`}>
      {!hideHeader && (
        <div className="flex items-center gap-3 px-2">
          <History className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">
            {type === "test" ? "Typing Test History" : "Lessons History"}
          </h2>
        </div>
      )}

      {/* Mini Stats Summary Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:bg-white/[0.02] transition-colors duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Completed</span>
            <span className="text-2xl font-black text-white mt-0.5">{totalCompleted}</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:bg-white/[0.02] transition-colors duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-yellow-500/10 transition-colors" />
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Best Speed</span>
            <span className="text-2xl font-black text-white mt-0.5">{highestWpm} <span className="text-xs font-normal text-muted-foreground">WPM</span></span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:bg-white/[0.02] transition-colors duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Avg Speed</span>
            <span className="text-2xl font-black text-white mt-0.5">{averageWpm} <span className="text-xs font-normal text-muted-foreground">WPM</span></span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden group hover:bg-white/[0.02] transition-colors duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-green-500/10 transition-colors" />
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Avg Accuracy</span>
            <span className="text-2xl font-black text-white mt-0.5">{averageAccuracy}%</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Styled Interactive Table */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={`overflow-hidden border border-white/5 ${hideHeader ? 'rounded-2xl' : 'glass-panel rounded-3xl'}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Activity Name</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Grade</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Speed</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Accuracy</th>
                <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTests.map((test) => {
                const date = new Date(test.timestamp);
                const gradeVal = getGrade(test.accuracy);
                
                return (
                  <motion.tr 
                    key={test.id} 
                    variants={itemVariants}
                    whileHover={{ scale: 1.005, backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                    className="transition-colors group duration-150 cursor-pointer"
                  >
                    <td className="px-6 py-4.5 text-foreground/80 font-medium">
                      {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      <span className="text-muted-foreground text-xs ml-3 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-normal">
                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-foreground/80 font-semibold text-xs max-w-[200px] truncate" title={test.title || (test.type === "lesson" ? "Typing Lesson" : "Standard Test")}>
                      {test.title || (test.type === "lesson" ? "Typing Lesson" : "Standard Test")}
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center justify-center font-black text-xs px-2.5 py-1 rounded-lg border leading-none tracking-wider ${getGradeStyle(gradeVal)}`}>
                        {gradeVal}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-extrabold text-foreground text-lg">{test.wpm} <span className="text-xs text-muted-foreground font-normal">WPM</span></span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-extrabold text-foreground text-lg">{test.accuracy}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center justify-center font-black text-[10px] px-2.5 py-1 rounded-lg border leading-none tracking-wider uppercase ${
                        test.validationStatus === "verified" || (test.verified && !test.validationStatus)
                          ? "bg-green-500/10 text-green-400 border-green-500/25"
                          : test.validationStatus === "monitored"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/25"
                      }`}>
                        {test.validationStatus || (test.verified === false ? "monitored" : "legacy")}
                        {test.trustScore !== undefined ? ` ${test.trustScore}%` : ""}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
