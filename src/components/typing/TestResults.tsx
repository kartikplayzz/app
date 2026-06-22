"use client";

import { motion } from "framer-motion";
import { RotateCcw, Settings, ArrowRight, CheckCircle, Keyboard as KeyboardIcon, XCircle, Activity, Clock, Trophy, Zap, Edit3, Type, Delete } from "lucide-react";
import { useEffect, useState } from "react";
import { ProfessionalStats } from "./TypingEngine";

interface TestResultsProps {
  results: ProfessionalStats;
  onRestart: () => void;
  onChangeSettings: () => void;
  onNextLesson?: () => void;
  onNextStage?: () => void;
}

// Custom hook to animate numbers counting up like a speedometer
function useCountUp(endValue: number, duration: number = 1500) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.floor(easeProgress * endValue));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [endValue, duration]);

  return value;
}

export function TestResults({ 
  results,
  onRestart, 
  onChangeSettings,
  onNextLesson,
  onNextStage
}: TestResultsProps) {
  const { 
    netWPM, 
    grossWPM, 
    wps, 
    cpm, 
    accuracy, 
    incorrectWords, 
    correctWords,
    incorrectChars,
    correctChars,
    backspaces,
    consistency, 
    grade,
    durationMs,
    trustScore,
    validationStatus,
    securityReport,
  } = results;
  const [mounted, setMounted] = useState(false);

  const animatedWpm = useCountUp(netWPM, 1500);
  const animatedAccuracy = useCountUp(accuracy, 1500);
  const animatedConsistency = useCountUp(consistency, 1500);
  const animatedCpm = useCountUp(cpm, 1500);

  useEffect(() => {
    const timeout = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const durationSec = Math.floor(durationMs / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationRemSec = durationSec % 60;
  const durationFormatted = `${durationMin.toString().padStart(2, '0')}:${durationRemSec.toString().padStart(2, '0')}`;

  // Semi-circle SVG Calculations
  const radius = 80;
  const circumference = Math.PI * radius; // Half circle
  const wpmPercent = Math.min((netWPM / 150) * 100, 100);
  const strokeOffset = circumference - (wpmPercent / 100) * circumference;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 } // 80ms gap between each card
    }
  };

  const itemFade = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.3, // 300ms per card
        ease: [0.4, 0, 0.2, 1] as const // cubic-bezier(0.4, 0, 0.2, 1)
      } 
    }
  };

  // Grade Colors
  let gradeColor = "text-white";
  let gradeGlow = "shadow-[0_0_15px_rgba(255,255,255,0.5)]";
  if (grade === "S+") { gradeColor = "text-[#facc15]"; gradeGlow = "shadow-[0_0_25px_rgba(250,204,21,0.8)]"; }
  else if (grade === "S") { gradeColor = "text-[#a855f7]"; gradeGlow = "shadow-[0_0_20px_rgba(168,85,247,0.8)]"; }
  else if (grade === "A") { gradeColor = "text-[#22c55e]"; gradeGlow = "shadow-[0_0_15px_rgba(34,197,94,0.6)]"; }
  else if (grade === "B") { gradeColor = "text-[#3b82f6]"; gradeGlow = "shadow-[0_0_15px_rgba(59,130,246,0.6)]"; }
  else if (grade === "C") { gradeColor = "text-[#f97316]"; gradeGlow = "shadow-[0_0_10px_rgba(249,115,22,0.4)]"; }
  else { gradeColor = "text-[#ef4444]"; gradeGlow = "shadow-[0_0_10px_rgba(239,68,68,0.4)]"; }

  const securityLabel =
    validationStatus === "verified"
      ? "Verified Leaderboard Run"
      : validationStatus === "monitored"
        ? "Monitored Run - Not Ranked"
        : validationStatus === "challenge"
          ? "Challenge Required - Not Saved"
          : validationStatus === "blocked"
            ? "Blocked Run"
            : "Unverified Run";

  const securityBadgeClass =
    validationStatus === "verified"
      ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]"
      : validationStatus === "monitored"
        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
        : validationStatus === "challenge"
          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          : "bg-red-500/10 text-red-400 border-red-500/20";

  const securityDotClass =
    validationStatus === "verified"
      ? "bg-green-500 shadow-[0_0_8px_#22c55e]"
      : validationStatus === "monitored"
        ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]"
        : validationStatus === "challenge"
          ? "bg-yellow-500 shadow-[0_0_8px_#f59e0b]"
          : "bg-red-500 shadow-[0_0_8px_#ef4444]";

  const getGradeTitle = (g: string) => {
    switch (g) {
      case "S+": return "Professional Evaluator";
      case "S": return "Elite Typist";
      case "A": return "Advanced Typist";
      case "B": return "Competent Typist";
      case "C": return "Intermediate Typist";
      default: return "Beginner Typist";
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto flex flex-col gap-6 md:gap-8"
    >
      <div className="flex flex-col md:flex-row items-stretch justify-between p-6 md:p-10 rounded-[2rem] bg-[#0f111a] border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
        
        {/* LEFT GAUGE & GRADE SECTION */}
        <div className="flex flex-col items-center justify-center w-full md:w-[35%] relative z-10 py-4">
          <div className="relative w-[240px] h-[140px] flex justify-center overflow-hidden">
            <svg viewBox="0 0 200 110" className="w-full h-full absolute top-0 left-0">
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" /> {/* Amber */}
                  <stop offset="50%" stopColor="#ec4899" /> {/* Pink */}
                  <stop offset="100%" stopColor="#6366f1" /> {/* Indigo */}
                </linearGradient>
              </defs>
              <path 
                d="M 20 100 A 80 80 0 0 1 180 100" 
                fill="none" 
                stroke="rgba(255,255,255,0.03)" 
                strokeWidth="12" 
                strokeLinecap="round" 
              />
              <path 
                d="M 20 100 A 80 80 0 0 1 180 100" 
                fill="none" 
                stroke="url(#gaugeGradient)" 
                strokeWidth="12" 
                strokeLinecap="round"
                className="drop-shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                strokeDasharray={circumference}
                strokeDashoffset={mounted ? strokeOffset : circumference}
                style={{
                  transition: "stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </svg>
            <div className="absolute bottom-2 flex flex-col items-center">
              <span className="text-[4.5rem] font-black tracking-tighter text-white leading-none drop-shadow-md">{animatedWpm}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-muted-foreground tracking-widest uppercase">WPM</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-background/50 border border-white/10 ${gradeGlow}`}>
              <span className={`text-4xl font-black ${gradeColor}`}>{grade}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Final Grade</span>
              <span className="text-sm text-white/70">{getGradeTitle(grade)}</span>
            </div>
          </div>

          {trustScore !== undefined && (
            <div className={`mt-6 flex flex-col gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${securityBadgeClass}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${securityDotClass}`} />
                {securityLabel} ({trustScore}%)
              </div>
              {securityReport?.leaderboardEligible === false && (
                <span className="text-[9px] normal-case tracking-normal opacity-80">
                  {securityReport.action === "monitor"
                    ? "Stored for practice analytics only."
                    : "Security challenge required before this score can be accepted."}
                </span>
              )}
            </div>
          )}
        </div>

        {/* DIVIDER */}
        <div className="hidden md:block w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent mx-4" />

        {/* RIGHT STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full md:w-[65%] mt-10 md:mt-0 relative z-10 content-center">
          
          {/* Accuracy */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-[#22c55e]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy</span>
            </div>
            <span className="text-2xl font-black text-white">{animatedAccuracy}%</span>
          </motion.div>

          {/* Consistency */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#a855f7]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Consistency</span>
            </div>
            <span className="text-2xl font-black text-white">{animatedConsistency}%</span>
          </motion.div>

          {/* WPS */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#facc15]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">WPS</span>
            </div>
            <span className="text-2xl font-black text-white">{wps}</span>
          </motion.div>

          {/* CPM */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <KeyboardIcon className="w-4 h-4 text-[#3b82f6]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CPM</span>
            </div>
            <span className="text-2xl font-black text-white">{animatedCpm}</span>
          </motion.div>

          {/* Words Stats */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-[#ec4899]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Words</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#22c55e]">{correctWords}</span>
              <span className="text-sm font-bold text-muted-foreground">/</span>
              <span className="text-xl font-black text-[#ef4444]">{incorrectWords}</span>
            </div>
          </motion.div>

          {/* Char Stats */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Edit3 className="w-4 h-4 text-[#06b6d4]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Chars</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#22c55e]">{correctChars}</span>
              <span className="text-sm font-bold text-muted-foreground">/</span>
              <span className="text-xl font-black text-[#ef4444]">{incorrectChars}</span>
            </div>
          </motion.div>

          {/* Backspaces */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Delete className="w-4 h-4 text-[#f97316]" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Backspaces</span>
            </div>
            <span className="text-2xl font-black text-white">{backspaces}</span>
          </motion.div>

          {/* Time */}
          <motion.div variants={itemFade} className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Time</span>
            </div>
            <span className="text-2xl font-black text-white">{durationFormatted}</span>
          </motion.div>

        </div>
      </div>

      {/* Action Buttons */}
      <motion.div variants={itemFade} className="flex items-center justify-center gap-4 mt-2">
        <button 
          onClick={onChangeSettings}
          className="flex items-center gap-2 px-6 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-full font-bold transition-all text-sm"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        
        <button 
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-full font-bold transition-all text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Restart
        </button>

        {onNextStage && (
          <button 
            onClick={onNextStage}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-black uppercase tracking-wider transition-all text-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)]"
          >
            Next Stage
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {onNextLesson && (
          <button 
            onClick={onNextLesson}
            className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-black uppercase tracking-wider transition-all text-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary),0.6)]"
          >
            Next Lesson
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
