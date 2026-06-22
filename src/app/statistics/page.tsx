"use client";

import { useStatsStore, TestResult } from "@/store/useStatsStore";
import { 
  BarChart3, 
  Target, 
  Zap, 
  Trophy, 
  Award, 
  Flame, 
  Sparkles, 
  Activity, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Hourglass,
  ArrowLeft,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export default function StatisticsPage() {
  const { highestWpm, testsCompleted, xp, level, recentTests } = useStatsStore();

  // Navigation states: 'year' | 'month' | 'week' | 'day'
  const [activeTimeFrame, setActiveTimeFrame] = useState<'year' | 'month' | 'week' | 'day'>('month');
  
  // Date tracking
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Tooltip tracking for custom popup on hover
  const [hoveredCell, setHoveredCell] = useState<{ date: Date; count: number; avgWpm: number; avgAccuracy: number; xpGained: number; x: number; y: number } | null>(null);

  // requestAnimationFrame stats counter hook (over 400ms, ease-out cubic)
  function useStatsCounter(targetValue: number, duration: number = 400) {
    const [value, setValue] = useState(targetValue);
    const prevValueRef = useRef(targetValue);
    const targetValueRef = useRef(targetValue);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
      if (targetValue !== targetValueRef.current) {
        prevValueRef.current = value;
        targetValueRef.current = targetValue;
        startTimeRef.current = performance.now();
        
        let animId: number;
        const step = (now: number) => {
          if (!startTimeRef.current) return;
          const elapsed = now - startTimeRef.current;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
          const newVal = prevValueRef.current + (targetValue - prevValueRef.current) * ease;
          
          setValue(Math.round(newVal));
          
          if (progress < 1) {
            animId = requestAnimationFrame(step);
          }
        };
        animId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animId);
      }
    }, [targetValue, duration, value]);

    return value;
  }

  // Helper: map count to color gradient intensity
  const getHeatmapColor = (count: number) => {
    if (count === 0) return "bg-[#1a1a2e] border-white/5 text-white/40";
    if (count < 3) return "bg-[#16213e] border-[#16213e]/60 text-[#00d4ff]/70 shadow-[0_0_12px_rgba(22,33,62,0.5)]";
    if (count < 6) return "bg-[#0f3460] border-[#0f3460]/80 text-[#00c896] shadow-[0_0_12px_rgba(15,52,96,0.5)]";
    if (count < 10) return "bg-[#533483] border-[#533483] text-purple-300 shadow-[0_0_20px_rgba(83,52,131,0.6)]";
    return "bg-[#e94560] border-[#e94560] text-red-100 shadow-[0_0_24px_rgba(233,69,96,0.8)] animate-pulse";
  };

  // Helper: map monthly count to color gradient intensity for Yearly view
  const getYearlyMonthColor = (count: number) => {
    if (count === 0) return "bg-[#1a1a2e]/60 border-white/5 text-white/40";
    if (count < 10) return "bg-[#16213e]/80 border-[#16213e]/60 text-[#00d4ff]/70 shadow-[0_0_12px_rgba(22,33,62,0.4)] hover:bg-[#16213e] hover:border-white/10";
    if (count < 30) return "bg-[#0f3460]/80 border-[#0f3460]/80 text-[#00c896] shadow-[0_0_16px_rgba(15,52,96,0.5)] hover:bg-[#0f3460] hover:border-white/10";
    if (count < 60) return "bg-[#533483]/80 border-[#533483] text-purple-300 shadow-[0_0_20px_rgba(83,52,131,0.6)] hover:bg-[#533483] hover:border-white/10";
    return "bg-[#e94560]/80 border-[#e94560] text-red-100 shadow-[0_0_24px_rgba(233,69,96,0.7)] hover:bg-[#e94560] hover:border-white/10";
  };

  const getHeatmapBorderAccent = (count: number) => {
    if (count === 0) return "border-l-[#1a1a2e]";
    if (count < 3) return "border-l-[#16213e]";
    if (count < 6) return "border-l-[#0f3460]";
    if (count < 10) return "border-l-[#533483]";
    return "border-l-[#e94560]";
  };

  // 1. Calculations: Practice streak (Daily consecutive active days)
  const streak = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const activeDays = new Set<number>();
    recentTests.forEach((test) => {
      const date = new Date(test.timestamp);
      date.setHours(0, 0, 0, 0);
      activeDays.add(date.getTime());
    });

    let currentStreak = 0;
    let checkDate = new Date(today);

    const hasActiveToday = activeDays.has(todayTime);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const hasActiveYesterday = activeDays.has(yesterday.getTime());

    if (hasActiveToday || hasActiveYesterday) {
      if (!hasActiveToday && hasActiveYesterday) {
        checkDate = yesterday;
      }
      
      while (true) {
        if (activeDays.has(checkDate.getTime())) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    return currentStreak;
  }, [recentTests]);

  // Practice Time (Estimated: 30s per test, converted to minutes/hours)
  const practiceTimeMinutes = useMemo(() => {
    return Math.round(testsCompleted * 0.5);
  }, [testsCompleted]);

  // 2. Calculations: selected period stats (Yearly, Monthly, Weekly, Daily summaries)
  const periodStats = useMemo(() => {
    let filteredTests: TestResult[] = [];
    let label = "";
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    if (activeTimeFrame === 'year') {
      filteredTests = recentTests.filter(t => new Date(t.timestamp).getFullYear() === year);
      label = `Year ${year}`;
    } else if (activeTimeFrame === 'month') {
      filteredTests = recentTests.filter(t => {
        const d = new Date(t.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
      });
      label = currentCalendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } else if (activeTimeFrame === 'week') {
      // Find start of week (Sunday)
      const startOfWeek = new Date(currentCalendarDate);
      startOfWeek.setDate(currentCalendarDate.getDate() - currentCalendarDate.getDay());
      startOfWeek.setHours(0,0,0,0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      
      filteredTests = recentTests.filter(t => {
        const time = t.timestamp;
        return time >= startOfWeek.getTime() && time <= endOfWeek.getTime();
      });
      
      label = `Week of ${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      // Day view
      const targetDate = selectedDate || new Date();
      targetDate.setHours(0,0,0,0);
      
      filteredTests = recentTests.filter(t => {
        const d = new Date(t.timestamp);
        d.setHours(0,0,0,0);
        return d.getTime() === targetDate.getTime();
      });
      label = targetDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    const count = filteredTests.length;
    const avgWpm = count > 0 ? Math.round(filteredTests.reduce((acc, t) => acc + t.wpm, 0) / count) : 0;
    const avgAccuracy = count > 0 ? Math.round(filteredTests.reduce((acc, t) => acc + t.accuracy, 0) / count) : 0;
    const xpGained = filteredTests.reduce((acc, t) => acc + Math.floor(10 + (t.wpm * 0.5) + (t.accuracy === 100 ? 20 : 0)), 0);
    const timeSpentMin = Math.round(count * 0.5);

    return {
      label,
      count,
      avgWpm,
      avgAccuracy,
      xpGained,
      timeSpentMin,
    };
  }, [activeTimeFrame, currentCalendarDate, selectedDate, recentTests]);

  // Animated numbers for stats panel
  const animCount = useStatsCounter(periodStats.count);
  const animXp = useStatsCounter(periodStats.xpGained);
  const animWpm = useStatsCounter(periodStats.avgWpm);
  const animAcc = useStatsCounter(periodStats.avgAccuracy);
  const animTime = useStatsCounter(periodStats.timeSpentMin);

  // 3. Month Calendar Data Builder
  const monthlyCalendarDays = useMemo(() => {
    const data = [];
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // First day of selected month
    const firstDayOfMonth = new Date(year, month, 1);
    const startPaddingCount = firstDayOfMonth.getDay(); // 0 = Sun, 6 = Sat
    
    // Number of days in selected month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Test count mapper
    const testsByDay = new Map<number, TestResult[]>();
    recentTests.forEach(test => {
      const date = new Date(test.timestamp);
      date.setHours(0, 0, 0, 0);
      const time = date.getTime();
      let dayTestsList = testsByDay.get(time);
      if (!dayTestsList) {
        dayTestsList = [];
        testsByDay.set(time, dayTestsList);
      }
      dayTestsList.push(test);
    });

    // Padding before first day of month
    for (let i = 0; i < startPaddingCount; i++) {
      data.push({ isPadding: true, date: null, count: 0, avgWpm: 0, avgAccuracy: 0, xpGained: 0 });
    }

    // Actual days of month
    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);
      const time = dayDate.getTime();
      const dayTests = testsByDay.get(time) || [];
      
      const count = dayTests.length;
      const avgWpm = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.wpm, 0) / count) : 0;
      const avgAccuracy = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.accuracy, 0) / count) : 0;
      const xpGained = dayTests.reduce((acc, t) => acc + Math.floor(10 + (t.wpm * 0.5) + (t.accuracy === 100 ? 20 : 0)), 0);

      data.push({
        isPadding: false,
        date: dayDate,
        count,
        avgWpm,
        avgAccuracy,
        xpGained
      });
    }

    // Padding after last day of month to fill grid row
    const totalCellsFilled = data.length;
    const remainingPaddingCells = Math.ceil(totalCellsFilled / 7) * 7 - totalCellsFilled;
    for (let i = 0; i < remainingPaddingCells; i++) {
      data.push({ isPadding: true, date: null, count: 0, avgWpm: 0, avgAccuracy: 0, xpGained: 0 });
    }

    return data;
  }, [currentCalendarDate, recentTests]);

  // 4. Yearly View Data Builder (12 month summaries of the current year)
  const yearlyMonthsData = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const months = [];

    const testsByMonth = new Map<number, TestResult[]>();
    recentTests.forEach(test => {
      const date = new Date(test.timestamp);
      if (date.getFullYear() === year) {
        const monthIndex = date.getMonth();
        let monthTests = testsByMonth.get(monthIndex);
        if (!monthTests) {
          monthTests = [];
          testsByMonth.set(monthIndex, monthTests);
        }
        monthTests.push(test);
      }
    });

    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(year, m, 1);
      const monthTests = testsByMonth.get(m) || [];
      const count = monthTests.length;
      
      const avgWpm = count > 0 ? Math.round(monthTests.reduce((acc, t) => acc + t.wpm, 0) / count) : 0;
      const avgAccuracy = count > 0 ? Math.round(monthTests.reduce((acc, t) => acc + t.accuracy, 0) / count) : 0;
      const xpGained = monthTests.reduce((acc, t) => acc + Math.floor(10 + (t.wpm * 0.5) + (t.accuracy === 100 ? 20 : 0)), 0);

      months.push({
        monthIndex: m,
        monthName: monthDate.toLocaleDateString(undefined, { month: 'short' }),
        fullName: monthDate.toLocaleDateString(undefined, { month: 'long' }),
        count,
        avgWpm,
        avgAccuracy,
        xpGained,
        date: monthDate
      });
    }

    return months;
  }, [currentCalendarDate, recentTests]);

  // 5. Weekly View Builder (7 days of selected week)
  const weeklyDaysData = useMemo(() => {
    const data = [];
    const baseDate = new Date(currentCalendarDate);
    // Align to Sunday
    baseDate.setDate(currentCalendarDate.getDate() - currentCalendarDate.getDay());
    
    const testsByDay = new Map<number, TestResult[]>();
    recentTests.forEach(test => {
      const date = new Date(test.timestamp);
      date.setHours(0, 0, 0, 0);
      testsByDay.set(date.getTime(), [...(testsByDay.get(date.getTime()) || []), test]);
    });

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + i);
      dayDate.setHours(0,0,0,0);
      const time = dayDate.getTime();
      
      const dayTests = testsByDay.get(time) || [];
      const count = dayTests.length;
      const avgWpm = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.wpm, 0) / count) : 0;
      const avgAccuracy = count > 0 ? Math.round(dayTests.reduce((acc, t) => acc + t.accuracy, 0) / count) : 0;
      const xpGained = dayTests.reduce((acc, t) => acc + Math.floor(10 + (t.wpm * 0.5) + (t.accuracy === 100 ? 20 : 0)), 0);

      data.push({
        date: dayDate,
        dayName: dayDate.toLocaleDateString(undefined, { weekday: 'short' }),
        dayLongName: dayDate.toLocaleDateString(undefined, { weekday: 'long' }),
        count,
        avgWpm,
        avgAccuracy,
        xpGained
      });
    }

    return data;
  }, [currentCalendarDate, recentTests]);

  // 6. Day View Tests Log Builder
  const selectedDayTests = useMemo(() => {
    const target = selectedDate || new Date();
    target.setHours(0,0,0,0);
    const nextDay = new Date(target);
    nextDay.setDate(target.getDate() + 1);

    return recentTests
      .filter(t => t.timestamp >= target.getTime() && t.timestamp < nextDay.getTime())
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedDate, recentTests]);

  // Year navigators
  const incrementYear = () => {
    const d = new Date(currentCalendarDate);
    d.setFullYear(d.getFullYear() + 1);
    setCurrentCalendarDate(d);
  };
  const decrementYear = () => {
    const d = new Date(currentCalendarDate);
    d.setFullYear(d.getFullYear() - 1);
    setCurrentCalendarDate(d);
  };

  // Month navigators
  const incrementMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentCalendarDate(d);
  };
  const decrementMonth = () => {
    const d = new Date(currentCalendarDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentCalendarDate(d);
  };

  // Week navigators
  const incrementWeek = () => {
    const d = new Date(currentCalendarDate);
    d.setDate(d.getDate() + 7);
    setCurrentCalendarDate(d);
  };
  const decrementWeek = () => {
    const d = new Date(currentCalendarDate);
    d.setDate(d.getDate() - 7);
    setCurrentCalendarDate(d);
  };

  // Handles clicking a month in Yearly view -> switches to Month view
  const handleSelectMonth = (monthDate: Date) => {
    setCurrentCalendarDate(monthDate);
    setActiveTimeFrame('month');
  };

  // Handles clicking a day in Monthly/Weekly view -> switches to Day view
  const handleSelectDay = (dayDate: Date) => {
    setSelectedDate(dayDate);
    setCurrentCalendarDate(dayDate);
    setActiveTimeFrame('day');
  };

  // Hover position logic for calendar tooltips
  const handleMouseMove = (e: React.MouseEvent, day: any) => {
    if (day.isPadding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredCell({
      date: day.date,
      count: day.count,
      avgWpm: day.avgWpm,
      avgAccuracy: day.avgAccuracy,
      xpGained: day.xpGained,
      x: rect.left + rect.width / 2,
      y: rect.top - 12
    });
  };

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-20 pt-2 relative flex-1 font-sans selection:bg-primary/30 selection:text-white">
      {/* Stripe-like glowing blue & purple ambient lighting blobs */}
      <div className="absolute top-[-5%] left-[20%] w-[600px] h-[400px] bg-primary/10 rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] right-[10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[180px] pointer-events-none -z-10" />

      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary shrink-0" />
            Performance Analytics
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            Futuristic insights into your keystroke speed velocity, accuracy trends, and daily contribution calendars.
          </p>
        </div>

        {/* Apple-styled Segmented Controller */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-2xl w-fit self-start md:self-center select-none shadow-inner">
          {(['day', 'week', 'month', 'year'] as const).map((mode) => {
            const isActive = activeTimeFrame === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  setActiveTimeFrame(mode);
                  if (mode === 'day' && !selectedDate) {
                    setSelectedDate(new Date());
                  }
                }}
                className={`relative px-4 py-1.5 rounded-xl text-xs font-black capitalize transition-all duration-300 z-10 ${
                  isActive ? "text-primary-foreground font-extrabold" : "text-muted-foreground hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="statsPeriodActiveBg"
                    className="absolute inset-0 bg-primary rounded-xl -z-10 shadow-[0_4px_12px_rgba(var(--primary),0.35)]"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        
        {/* Left Side: Interactive Calendar / Heatmap Area */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <SpotlightCard 
            glowColor="rgba(0, 212, 255, 0.05)"
            className="glass-panel p-6 rounded-[24px] border border-white/10 flex flex-col gap-6 relative overflow-hidden bg-[#0a0b12]/75 backdrop-blur-xl shadow-2xl h-full"
          >
            {/* Calendar Sub-header with Date Navigation */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">{periodStats.label}</h2>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
                    {activeTimeFrame === 'year' && "12 Month Activity Breakdown"}
                    {activeTimeFrame === 'month' && "Active Month Heatmap Grid"}
                    {activeTimeFrame === 'week' && "Weekly Activity Breakdown"}
                    {activeTimeFrame === 'day' && "Detailed Daily Practice Logs"}
                  </p>
                </div>
              </div>

              {/* Navigation Arrows */}
              {activeTimeFrame !== 'day' && (
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-1 shadow-inner">
                  <button 
                    onClick={() => {
                      if (activeTimeFrame === 'year') decrementYear();
                      if (activeTimeFrame === 'month') decrementMonth();
                      if (activeTimeFrame === 'week') decrementWeek();
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (activeTimeFrame === 'year') setCurrentCalendarDate(new Date());
                      if (activeTimeFrame === 'month') setCurrentCalendarDate(new Date());
                      if (activeTimeFrame === 'week') setCurrentCalendarDate(new Date());
                    }}
                    className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  >
                    Today
                  </button>

                  <button 
                    onClick={() => {
                      if (activeTimeFrame === 'year') incrementYear();
                      if (activeTimeFrame === 'month') incrementMonth();
                      if (activeTimeFrame === 'week') incrementWeek();
                    }}
                    className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive Grid views Container */}
            <div className="flex-1 flex flex-col justify-center min-h-[380px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTimeFrame + currentCalendarDate.getTime()}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="w-full"
                >
                  
                  {/* -- YEAR VIEW -- */}
                  {activeTimeFrame === 'year' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {yearlyMonthsData.map((month) => (
                        <motion.button
                          key={month.monthIndex}
                          whileHover={{ scale: 1.03, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectMonth(month.date)}
                          className={`glass-panel p-4.5 rounded-[22px] border text-left transition-all duration-300 group flex flex-col justify-between aspect-[1.3/1] relative overflow-hidden ${getYearlyMonthColor(month.count)}`}
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-extrabold text-white text-base group-hover:text-primary transition-colors">{month.fullName}</h3>
                              <span className="text-[10px] text-muted-foreground font-semibold">{currentCalendarDate.getFullYear()}</span>
                            </div>
                            {month.count > 0 ? (
                              <div className="px-2.5 py-1 text-[9px] font-black bg-white/10 text-white rounded-full leading-none border border-white/5 shadow-md flex items-center gap-0.5">
                                {month.count} test{month.count > 1 ? 's' : ''}
                                {month.count >= 30 && <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500 animate-pulse" />}
                              </div>
                            ) : (
                              <span className="text-[9px] text-muted-foreground/30 font-medium">—</span>
                            )}
                          </div>

                          <div className="flex items-end justify-between mt-6">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Speed</span>
                              <span className="text-base font-black text-white mt-0.5">
                                {month.count > 0 ? `${month.avgWpm} WPM` : "—"}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Accuracy</span>
                              <span className="text-base font-black text-white mt-0.5">
                                {month.count > 0 ? `${month.avgAccuracy}%` : "—"}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* -- MONTH VIEW -- */}
                  {activeTimeFrame === 'month' && (
                    <div className="flex flex-col gap-4">
                      {/* Weekday Titles */}
                      <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest select-none">
                        <span>Sun</span>
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                      </div>

                      {/* Day Grid */}
                      <div className="grid grid-cols-7 gap-2.5">
                        {monthlyCalendarDays.map((day, idx) => {
                          if (day.isPadding) {
                            return (
                              <div 
                                key={`padding-${idx}`} 
                                className="aspect-square rounded-[22px] border border-dashed border-white/[0.02] bg-transparent opacity-20 pointer-events-none" 
                              />
                            );
                          }

                          const dayNum = day.date!.getDate();
                          const isToday = new Date().toDateString() === day.date!.toDateString();
                          const isSelected = selectedDate && selectedDate.toDateString() === day.date!.toDateString();
                          const hasActivity = day.count > 0;
                          
                          // Circular progress variables
                          const radius = 9;
                          const dashArray = 2 * Math.PI * radius;
                          const dashOffset = dashArray * (1 - (day.avgAccuracy || 0) / 100);

                          return (
                            <motion.button
                              key={`day-${dayNum}`}
                              whileHover={{ scale: 1.08, zIndex: 20 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleSelectDay(day.date!)}
                              onMouseMove={(e) => handleMouseMove(e, day)}
                              onMouseLeave={() => setHoveredCell(null)}
                              className={`aspect-square rounded-[22px] border flex flex-col items-center justify-between p-3.5 relative transition-all duration-300 ${
                                isSelected 
                                  ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(var(--primary),0.35)]" 
                                  : isToday
                                    ? "ring-2 ring-primary ring-offset-4 ring-offset-[#07080d] bg-white/[0.01]"
                                    : getHeatmapColor(day.count)
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className={`text-xs font-black ${isSelected ? "text-primary font-black" : "text-white"}`}>
                                  {dayNum}
                                </span>
                                
                                {/* Animated Circular Progress Ring for accuracy */}
                                {hasActivity && (
                                  <svg className="w-5 h-5 transform -rotate-90 filter drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]">
                                    <circle 
                                      cx="10" 
                                      cy="10" 
                                      r={radius} 
                                      stroke="rgba(255,255,255,0.06)" 
                                      strokeWidth="2" 
                                      fill="none" 
                                    />
                                    <motion.circle 
                                      cx="10" 
                                      cy="10" 
                                      r={radius} 
                                      stroke="#00c896" 
                                      strokeWidth="2" 
                                      fill="none"
                                      strokeDasharray={dashArray}
                                      initial={{ strokeDashoffset: dashArray }}
                                      animate={{ strokeDashoffset: dashOffset }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                  </svg>
                                )}
                              </div>

                              {/* Interactive Activity Badge / Tag */}
                              {hasActivity ? (
                                <div className="px-2 py-0.5 text-[8px] font-extrabold bg-white/10 text-white rounded-full scale-90 whitespace-nowrap leading-none border border-white/5 shadow-md flex items-center gap-0.5">
                                  {day.count} test{day.count > 1 ? 's' : ''}
                                  {day.count >= 6 && <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500 animate-pulse" />}
                                </div>
                              ) : (
                                <span className="text-[9px] text-muted-foreground/30 font-medium">—</span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* -- WEEK VIEW -- */}
                  {activeTimeFrame === 'week' && (
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {weeklyDaysData.map((day, idx) => {
                          const isToday = new Date().toDateString() === day.date.toDateString();
                          const hasActivity = day.count > 0;
                          
                          // circular progress
                          const radius = 18;
                          const dashArray = 2 * Math.PI * radius;
                          const dashOffset = dashArray * (1 - day.avgAccuracy / 100);

                          return (
                            <motion.button
                              key={idx}
                              whileHover={{ scale: 1.03, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSelectDay(day.date)}
                              className={`p-5 rounded-[22px] border text-left flex flex-col justify-between aspect-[1/1.2] relative overflow-hidden transition-all duration-300 ${
                                isToday 
                                  ? "ring-2 ring-primary ring-offset-4 ring-offset-[#07080d] bg-white/[0.01]" 
                                  : getHeatmapColor(day.count)
                              }`}
                            >
                              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-extrabold text-sm text-white">{day.dayName}</h3>
                                  <span className="text-[10px] text-muted-foreground font-semibold">
                                    {day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                {day.count >= 6 && <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-bounce" />}
                              </div>

                              {hasActivity ? (
                                <div className="flex items-center gap-3 mt-4">
                                  <svg className="w-11 h-11 transform -rotate-90 shrink-0">
                                    <circle 
                                      cx="22" 
                                      cy="22" 
                                      r={radius} 
                                      stroke="rgba(255,255,255,0.06)" 
                                      strokeWidth="3.5" 
                                      fill="none" 
                                    />
                                    <motion.circle 
                                      cx="22" 
                                      cy="22" 
                                      r={radius} 
                                      stroke="#00c896" 
                                      strokeWidth="3.5" 
                                      fill="none"
                                      strokeDasharray={dashArray}
                                      initial={{ strokeDashoffset: dashArray }}
                                      animate={{ strokeDashoffset: dashOffset }}
                                      transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                  </svg>
                                  <div className="flex flex-col">
                                    <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Avg Speed</span>
                                    <span className="text-base font-black text-white leading-none mt-0.5">{day.avgWpm} WPM</span>
                                    <span className="text-[9px] text-[#00c896] font-bold mt-0.5">{day.avgAccuracy}% acc</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground/30 font-bold uppercase tracking-wider mt-4">No Session logs</div>
                              )}

                              <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                <span>{day.count} runs</span>
                                {hasActivity && <span className="text-primary group-hover:text-white transition-colors">Inspect →</span>}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* -- DAY VIEW -- */}
                  {activeTimeFrame === 'day' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => {
                            setActiveTimeFrame('month');
                            setSelectedDate(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-xs font-black text-white transition-all shadow-sm"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Monthly Calendar
                        </button>
                        
                        <div className="flex items-center gap-2 text-xs font-extrabold text-[#00d4ff] bg-[#00d4ff]/10 px-3 py-1.5 rounded-xl border border-[#00d4ff]/20">
                          <Clock className="w-4 h-4" />
                          <span>{selectedDayTests.length} Total Runs Completed</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                        {/* Day Logs Table */}
                        <div className="xl:col-span-2 flex flex-col gap-3.5 bg-white/[0.01] border border-white/5 p-5 rounded-[22px] max-h-[380px] overflow-y-auto scrollbar-thin">
                          <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-1">Keystroke Trial Log History</h3>
                          
                          {selectedDayTests.map((test, index) => {
                            const date = new Date(test.timestamp);
                            const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            return (
                              <div 
                                key={test.id} 
                                className="flex items-center justify-between p-3.5 bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03] rounded-xl transition-all shadow-sm group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center font-bold text-xs text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                    #{selectedDayTests.length - index}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-extrabold text-white capitalize">{test.type || 'Test Session'}</span>
                                    <span className="text-[10px] text-muted-foreground font-semibold">{timeStr}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Speed</span>
                                    <span className="text-base font-black text-orange-500">{test.wpm} <span className="text-[10px] font-sans font-bold text-muted-foreground">WPM</span></span>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-black">Accuracy</span>
                                    <span className="text-base font-black text-[#00c896]">{test.accuracy}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {selectedDayTests.length === 0 && (
                            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                              <HelpCircle className="w-10 h-10 text-muted-foreground/30" />
                              <span className="text-sm font-extrabold">No activity logged for this day</span>
                              <span className="text-xs text-muted-foreground/50">Run a test on the typing screen to record metrics</span>
                            </div>
                          )}
                        </div>

                        {/* Day Visualization / Chart Card */}
                        <div className="xl:col-span-1 bg-white/[0.015] border border-white/5 p-5 rounded-[22px] flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2">Performance Chart</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Chronological progression chart showing WPM velocity and stability indicators for the last 20 tests.
                            </p>
                          </div>
                          
                          <div className="h-[210px] w-full flex items-center justify-center">
                            <PerformanceChart />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>

            {/* Premium Bottom Legend Strip */}
            {activeTimeFrame === 'month' && (
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Hover calendar squares to inspect precise log metrics</span>
                </div>
                
                {/* Neumorphic/Glass Legend strip */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold select-none bg-white/[0.01] border border-white/5 px-4 py-2 rounded-2xl shadow-inner">
                  <span>Less</span>
                  <span className="text-[10px] tracking-tighter text-[#1a1a2e] font-mono">░</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#1a1a2e] border border-white/5" title="0 tests" />
                  <span className="text-[10px] tracking-tighter text-[#16213e] font-mono">▒</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#16213e] border border-[#16213e]/65" title="Low activity (<3 tests)" />
                  <span className="text-[10px] tracking-tighter text-[#0f3460] font-mono">▓</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#0f3460] border border-[#0f3460]/85" title="Medium activity (<6 tests)" />
                  <span className="text-[10px] tracking-tighter text-[#533483] font-mono">█</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#533483] border border-[#533483]" title="High activity (<10 tests)" />
                  <span className="text-[10px] tracking-tighter text-[#e94560] font-mono">█</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-[#e94560] border border-[#e94560] shadow-[0_0_8px_rgba(233,69,96,0.6)]" title="Peak activity (10+ tests)" />
                  <span>More</span>
                </div>
              </div>
            )}
          </SpotlightCard>
        </div>

        {/* Right Side: Analytics Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <SpotlightCard 
            glowColor="rgba(139, 92, 246, 0.05)"
            className="glass-panel p-6 rounded-[24px] border border-white/10 flex flex-col gap-6 relative overflow-hidden bg-[#0a0b12]/75 backdrop-blur-xl shadow-2xl h-full justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-white tracking-tight">Analytics Console</h2>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Selected Frame Metrics</p>
                </div>
              </div>

              {/* 4 Stat Boxes with left borders & animations */}
              <div className="flex flex-col gap-3">
                <div className={`bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between border-l-4 transition-all duration-500 ${getHeatmapBorderAccent(periodStats.count)}`}>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-muted-foreground/60" />
                    Tests Run
                  </span>
                  <span className="text-2xl font-black text-white mt-1.5">{animCount}</span>
                </div>
                
                <div className={`bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between border-l-4 transition-all duration-500 ${getHeatmapBorderAccent(Math.round(periodStats.xpGained / 50))}`}>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-muted-foreground/60" />
                    XP Earned
                  </span>
                  <span className="text-2xl font-black text-white mt-1.5">+{animXp}</span>
                </div>

                <div className={`bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between border-l-4 transition-all duration-500 ${getHeatmapBorderAccent(Math.round(periodStats.avgWpm / 10))}`}>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-muted-foreground/60" />
                    Avg Speed
                  </span>
                  <span className="text-2xl font-black text-white mt-1.5 font-mono">
                    {animWpm}
                    <span className="text-xs font-bold font-sans text-muted-foreground ml-1.5">WPM</span>
                  </span>
                </div>

                <div className={`bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between border-l-4 transition-all duration-500 ${getHeatmapBorderAccent(Math.round(periodStats.avgAccuracy / 10))}`}>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                    Avg Accuracy
                  </span>
                  <span className="text-2xl font-black text-white mt-1.5 font-mono">
                    {animAcc}
                    <span className="text-xs font-bold font-sans text-muted-foreground ml-0.5">%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Extra console stats: Streaks and practice times */}
            <div className="flex flex-col gap-3 mt-6 border-t border-white/5 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Flame className="w-4.5 h-4.5 text-orange-500 fill-orange-500" />
                  Practice Streak
                </span>
                <span className="font-extrabold text-white">{streak} day{streak !== 1 ? 's' : ''}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Hourglass className="w-4.5 h-4.5 text-primary" />
                  Practice Time
                </span>
                <span className="font-extrabold text-white">
                  {animTime >= 60 ? `${Math.floor(animTime / 60)}h ${animTime % 60}m` : `${animTime}m`}
                </span>
              </div>
            </div>

          </SpotlightCard>
        </div>

      </div>

      {/* Floating Custom Calendar Tooltip on Hover */}
      <AnimatePresence>
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: hoveredCell.x,
              top: hoveredCell.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 100,
              pointerEvents: 'none'
            }}
            className="bg-[#0b0c16]/95 border border-white/10 backdrop-blur-md px-3.5 py-3 rounded-xl shadow-2xl flex flex-col gap-1.5 text-left text-xs min-w-[150px]"
          >
            <div className="border-b border-white/5 pb-1 flex flex-col">
              <span className="font-black text-white text-[11px]">
                {hoveredCell.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            {hoveredCell.count > 0 ? (
              <div className="flex flex-col gap-1 text-[11px] font-bold">
                <div className="flex justify-between items-center text-primary-foreground">
                  <span className="text-muted-foreground font-medium">Completed:</span>
                  <span>{hoveredCell.count} test{hoveredCell.count > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between items-center text-orange-500">
                  <span className="text-muted-foreground font-medium">Avg Speed:</span>
                  <span>{hoveredCell.avgWpm} WPM</span>
                </div>
                <div className="flex justify-between items-center text-[#00c896]">
                  <span className="text-muted-foreground font-medium">Avg Accuracy:</span>
                  <span>{hoveredCell.avgAccuracy}%</span>
                </div>
                <div className="flex justify-between items-center text-purple-400">
                  <span className="text-muted-foreground font-medium">XP Gained:</span>
                  <span>+{hoveredCell.xpGained} XP</span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground font-semibold">No typing runs completed</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
