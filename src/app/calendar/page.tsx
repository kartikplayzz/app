"use client";
import { useState, useMemo } from "react";
import { useStatsStore, TestResult } from "@/store/useStatsStore";
import { CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Activity, Award, Target, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface DayData {
  date: Date;
  tests: TestResult[];
  count: number;
  avgWpm: number;
  avgAccuracy: number;
  xpGained: number;
}

export default function CalendarPage() {
  const { recentTests } = useStatsStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstDayIndex = firstDayOfMonth.getDay(); // 0 = Sunday
    const totalDays = lastDayOfMonth.getDate();

    // Map of tests by date timestamp (day boundary)
    const testsByDay = new Map<string, TestResult[]>();
    recentTests.forEach(test => {
      const d = new Date(test.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      let list = testsByDay.get(key);
      if (!list) {
        list = [];
        testsByDay.set(key, list);
      }
      list.push(test);
    });

    const days: DayData[] = [];

    // Pad previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        tests: [],
        count: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        xpGained: 0
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const key = `${year}-${month}-${i}`;
      const dayTests = testsByDay.get(key) || [];
      const count = dayTests.length;
      
      const avgWpm = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.wpm, 0) / count) : 0;
      const avgAccuracy = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.accuracy, 0) / count) : 0;
      const xpGained = dayTests.reduce((acc, t) => acc + Math.floor(10 + (t.wpm * 0.5) + (t.accuracy === 100 ? 20 : 0)), 0);

      days.push({
        date: d,
        tests: dayTests,
        count,
        avgWpm,
        avgAccuracy,
        xpGained
      });
    }

    // Pad next month days to complete grid (multiples of 7)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        tests: [],
        count: 0,
        avgWpm: 0,
        avgAccuracy: 0,
        xpGained: 0
      });
    }

    return days;
  }, [currentDate, recentTests]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDayData(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDayData(null);
  };

  const monthLabel = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 px-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 flex items-center gap-3">
          <CalendarDays className="w-9 h-9 text-primary animate-pulse" />
          Typing Calendar
        </h1>
        <p className="text-muted-foreground text-lg">
          Track your chronological practice history logs, daily tests run, and XP milestones.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Left: Calendar Month Grid */}
        <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden h-full">
          {/* Header Month selector */}
          <div className="bg-white/[0.015] border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
            <h2 className="text-base font-extrabold text-white">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="flex-1 p-6 flex flex-col gap-2 min-h-[350px]">
            {/* Day Names Row */}
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 pb-2 shrink-0">
              {dayNames.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-2 flex-grow">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
                const isToday = new Date().toDateString() === day.date.toDateString();
                const isSelected = selectedDayData && selectedDayData.date.toDateString() === day.date.toDateString();
                const hasActivity = day.count > 0;

                return (
                  <button
                    key={idx}
                    disabled={!isCurrentMonth}
                    onClick={() => setSelectedDayData(day)}
                    className={`rounded-xl border p-2 flex flex-col justify-between items-start transition-all relative overflow-hidden aspect-[4/3] sm:aspect-square ${
                      !isCurrentMonth
                        ? "opacity-0 pointer-events-none"
                        : isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                        : hasActivity
                        ? "border-primary/20 bg-primary/5 hover:border-primary/40 hover:bg-primary/[0.08]"
                        : "border-white/5 bg-white/[0.01] hover:border-white/15"
                    } ${
                      isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0f111a]" : ""
                    }`}
                  >
                    {/* Day number */}
                    <span className={`text-xs font-black ${
                      isSelected ? "text-primary" : "text-white"
                    }`}>
                      {day.date.getDate()}
                    </span>

                    {/* Indicator dots for activity density */}
                    {hasActivity && (
                      <div className="flex gap-1.5 items-center mt-auto w-full">
                        <div className={`w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)] ${
                          day.count >= 5 ? "scale-125" : ""
                        }`} />
                        <span className="text-[9px] font-black text-muted-foreground hidden sm:inline">{day.count} tests</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Daily Stats Detail Panel */}
        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {selectedDayData ? (
              <motion.div
                key="stats-detail"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <SpotlightCard
                  glowColor="rgba(255, 255, 255, 0.04)"
                  className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col h-full justify-between min-h-[350px] relative overflow-hidden"
                >
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/20 shrink-0">
                        <Activity className="w-4.5 h-4.5 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Practice Log Detail</span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white tracking-tight leading-tight mt-1">
                      {selectedDayData.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </h3>

                    {selectedDayData.count > 0 ? (
                      <div className="grid grid-cols-2 gap-3.5 mt-4">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
                          <span className="text-xl font-black text-white mt-1">{selectedDayData.count} tests</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">XP Earned</span>
                          <span className="text-xl font-black text-primary mt-1">+{selectedDayData.xpGained} XP</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Avg Speed</span>
                          <span className="text-xl font-black text-white mt-1">
                            {selectedDayData.avgWpm} <span className="text-[10px] text-muted-foreground font-bold">WPM</span>
                          </span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Avg Accuracy</span>
                          <span className="text-xl font-black text-white mt-1">{selectedDayData.avgAccuracy}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                        <CalendarIcon className="w-10 h-10 text-muted-foreground/20 animate-pulse" />
                        <h4 className="text-sm font-bold text-white">No activity logged</h4>
                        <p className="text-xs text-muted-foreground leading-normal max-w-[200px]">You didn't complete any typing sessions on this date.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 shrink-0">
                    <button
                      onClick={() => setSelectedDayData(null)}
                      className="text-[10px] text-primary hover:text-white font-black tracking-wider uppercase text-left transition-colors cursor-pointer"
                    >
                      ← Reset selection
                    </button>
                  </div>
                </SpotlightCard>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <SpotlightCard
                  glowColor="rgba(255, 255, 255, 0.04)"
                  className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center gap-4 min-h-[350px] h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground/60 shrink-0">
                    <CalendarIcon className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-sm font-extrabold text-white tracking-tight">Select a date</h4>
                    <p className="text-xs text-muted-foreground max-w-[200px] leading-normal">
                      Click any calendar date square to load historical training log details for that day.
                    </p>
                  </div>
                </SpotlightCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
