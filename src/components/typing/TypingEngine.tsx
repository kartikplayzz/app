"use client";
 
import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyboardUI } from "./KeyboardUI";
import { TypingSettingsBar } from "./TypingSettingsBar";
import { useStatsStore } from "@/store/useStatsStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useContentStore } from "@/store/useContentStore";
import { useUserStore } from "@/store/useUserStore";
import { useSecurityStore } from "@/store/useSecurityStore";
import { ShieldAlert } from "lucide-react";
import { evaluateSessionSecurity, generateDeviceFingerprint } from "@/utils/securityEngine";

export interface ProfessionalStats {
  grossWPM: number;
  netWPM: number;
  wps: number;
  cpm: number;
  accuracy: number;
  correctWords: number;
  incorrectWords: number;
  correctChars: number;
  incorrectChars: number;
  totalCharsTyped: number;
  backspaces: number;
  consistency: number;
  grade: string;
  durationMs: number;
  trustScore?: number;
  validationStatus?: "verified" | "monitored" | "challenge" | "blocked" | "unverified";
  securityReport?: {
    category: string;
    action: string;
    reasons: string[];
    leaderboardEligible: boolean;
    fraudProbability: number;
  };
}

interface TypingEngineProps {
  initialText: string;
  timeLimit?: number; // in seconds
  mode?: "time" | "progress";
  isPaused?: boolean;
  onFinish?: (results: ProfessionalStats) => void;
  sessionType?: "test" | "lesson";
  title?: string;
}

// requestAnimationFrame stats counter hook (over 400ms, ease-out cubic)
function useRafCounter(targetValue: number, duration: number = 400) {
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

// Slot-machine roll digit component
function Digit({ val, delayMs }: { val: string; delayMs: number }) {
  const [displayVal, setDisplayVal] = useState(val);
  const [prevVal, setPrevVal] = useState(val);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    if (val !== displayVal) {
      setPrevVal(displayVal);
      setDisplayVal(val);
      setTranslateY(0);
      
      const raf = requestAnimationFrame(() => {
        setTranslateY(-50);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [val, displayVal]);

  const isSame = prevVal === displayVal;

  return (
    <span className="relative inline-block w-[0.6em] h-[1em] overflow-hidden text-center align-bottom leading-none">
      <span 
        className="absolute left-0 right-0 flex flex-col"
        style={{
          transform: `translate3d(0, ${isSame ? 0 : translateY}%, 0)`,
          transition: isSame ? "none" : `transform 250ms cubic-bezier(0.25, 1, 0.5, 1) ${delayMs}ms`,
        }}
      >
        <span className="h-[1em] flex items-center justify-center">{prevVal}</span>
        <span className="h-[1em] flex items-center justify-center">{displayVal}</span>
      </span>
    </span>
  );
}

// 3-digit visual rolls wrapper
function DigitRoll({ value }: { value: number }) {
  const padded = String(value).padStart(3, "0");
  return (
    <div className="flex select-none font-bold" aria-live="polite" aria-atomic="true">
      <Digit val={padded[0]} delayMs={60} />
      <Digit val={padded[1]} delayMs={30} />
      <Digit val={padded[2]} delayMs={0} />
    </div>
  );
}

function segmentText(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    } catch (e) {
      console.warn("Intl.Segmenter failed, falling back to split", e);
    }
  }
  return text.split("");
}

export function TypingEngine({ initialText, timeLimit = 30, mode = "time", isPaused = false, onFinish, sessionType = "test", title }: TypingEngineProps) {
  const { layoutConfig } = useContentStore();
  const { keyboardTheme, soundEnabled, soundProfile } = useSettingsStore();
  const { highestWpm, addXp } = useStatsStore();

  const [typedText, setTypedText] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle");
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  // Scoring / Counters
  const [errorCount, setErrorCount] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [errorIndices, setErrorIndices] = useState<Set<number>>(new Set());
  const [typedHistory, setTypedHistory] = useState<Record<number, string>>({});

  // Security Telemetry Refs & States
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [isSecurityBlocked, setIsSecurityBlocked] = useState(false);
  const activeKeysRef = useRef<Record<string, number>>({});
  const tabSwitchesRef = useRef(0);
  const mousePointsRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const keyTimingsRef = useRef<{
    holdDurations: number[];
    flightTimes: number[];
    lastKeydownTime: number | null;
    lastKeyupTime: number | null;
  }>({
    holdDurations: [],
    flightTimes: [],
    lastKeydownTime: null,
    lastKeyupTime: null,
  });

  const blockedIps = useSecurityStore((state) => state.blockedIps);
  const blockedDevices = useSecurityStore((state) => state.blockedDevices);
  const addThreatLog = useSecurityStore((state) => state.addThreatLog);
  const addVerifiedRun = useSecurityStore((state) => state.addVerifiedRun);

  useEffect(() => {
    setDeviceFingerprint(generateDeviceFingerprint());
  }, []);

  // Window Focus & Tab Switch telemetry
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && status === "running") {
        tabSwitchesRef.current += 1;
      }
    };
    const handleBlur = () => {
      if (status === "running") {
        tabSwitchesRef.current += 1;
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [status]);

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (status !== "running") return;
    const now = performance.now();
    const downTime = activeKeysRef.current[e.key];
    if (downTime) {
      const hold = now - downTime;
      keyTimingsRef.current.holdDurations.push(hold);
      delete activeKeysRef.current[e.key];
    }
    keyTimingsRef.current.lastKeyupTime = now;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (status === "running") {
      mousePointsRef.current.push({
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
      });
      if (mousePointsRef.current.length > 200) {
        mousePointsRef.current.shift();
      }
    }
  };
  
  // Custom Visual State Additions
  const [streak, setStreak] = useState(0);
  const [streakBroken, setStreakBroken] = useState(false);
  const [streakToast, setStreakToast] = useState<string | null>(null);
  const [xpPopups, setXpPopups] = useState<{ id: string; x: number; y: number; amount: number }[]>([]);
  const [perfectWordIdx, setPerfectWordIdx] = useState<number | null>(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState<Record<number, boolean>>({});
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  
  // Shake / Feedback
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [shakeClass, setShakeClass] = useState("");
  const [edgeFlashActive, setEdgeFlashActive] = useState(false);
  
  // Cursor Blinking state
  const [isBlinkingPaused, setIsBlinkingPaused] = useState(false);
  const [isCursorIdle, setIsCursorIdle] = useState(false);
  
  // PB check
  const [pbExceeded, setPbExceeded] = useState(false);
  const [pbKey, setPbKey] = useState(0);

  const addTestResult = useStatsStore((state) => state.addTestResult);
  const keyAudioPool = useRef<HTMLAudioElement[]>([]);
  const backspaceAudioPool = useRef<HTMLAudioElement[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const blinkPauseTimeout = useRef<NodeJS.Timeout | null>(null);
  const cursorIdleTimeout = useRef<NodeJS.Timeout | null>(null);
  const streakToastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize Audio Pools and clean up timeouts on unmount
  useEffect(() => {
    if (typeof window !== "undefined") {
      keyAudioPool.current = Array.from({ length: 5 }, () => new Audio("/sounds/click.mp3"));
      backspaceAudioPool.current = Array.from({ length: 3 }, () => new Audio("/sounds/backspace.mp3"));
    }
    return () => {
      keyAudioPool.current.forEach(a => { a.pause(); a.src = ""; });
      backspaceAudioPool.current.forEach(a => { a.pause(); a.src = ""; });
      if (blinkPauseTimeout.current) clearTimeout(blinkPauseTimeout.current);
      if (cursorIdleTimeout.current) clearTimeout(cursorIdleTimeout.current);
      if (streakToastTimeout.current) clearTimeout(streakToastTimeout.current);
    };
  }, []);

  // Keyboard Click Audio Synth (Including synced error oscillators)
  const playSound = (type: "key" | "backspace") => {
    if (!soundEnabled) return;

    if (soundProfile === "click") {
      const pool = type === "key" ? keyAudioPool.current : backspaceAudioPool.current;
      if (pool.length === 0) return;
      const audio = pool[0].cloneNode() as HTMLAudioElement;
      audio.volume = type === "key" ? 0.15 : 0.6; 
      audio.play().catch(() => {});
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();
        
        if (soundProfile === "blue") {
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
          gain1.gain.setValueAtTime(type === "backspace" ? 0.12 : 0.08, audioCtx.currentTime);
          gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
          osc1.connect(gain1);
          gain1.connect(audioCtx.destination);
          osc1.start();
          osc1.stop(audioCtx.currentTime + 0.05);

          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(800, audioCtx.currentTime + 0.015);
          osc2.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.06);
          gain2.gain.setValueAtTime(type === "backspace" ? 0.08 : 0.05, audioCtx.currentTime + 0.015);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(audioCtx.currentTime + 0.015);
          osc2.stop(audioCtx.currentTime + 0.06);
        } else if (soundProfile === "red") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(type === "backspace" ? 120 : 150, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.04);
          gain.gain.setValueAtTime(type === "backspace" ? 0.3 : 0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.04);
        } else if (soundProfile === "typewriter") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(type === "backspace" ? 280 : 350, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.08);
          gain.gain.setValueAtTime(type === "backspace" ? 0.18 : 0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.08);
        } else if (soundProfile === "retro") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(type === "backspace" ? 330 : 440, audioCtx.currentTime);
          gain.gain.setValueAtTime(type === "backspace" ? 0.08 : 0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.06);
        } else if (soundProfile === "bubble") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(type === "backspace" ? 600 : 800, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(type === "backspace" ? 1400 : 1800, audioCtx.currentTime + 0.07);
          gain.gain.setValueAtTime(type === "backspace" ? 0.15 : 0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.07);
        }
      } catch (err) {
        console.error("Web Audio synthesis failed", err);
      }
    }
  };

  const playErrorTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !soundEnabled) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, audioCtx.currentTime); // 220Hz
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); // 80ms decay
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch {}
  };

  const words = useMemo(() => {
    const splitWords = initialText.split(" ");
    let charIndex = 0;
    return splitWords.map((word, wordIdx) => {
      const clusters = segmentText(word);
      const chars = clusters.map((cluster) => {
        const startIndex = charIndex;
        charIndex += cluster.length;
        return { 
          char: cluster, 
          startIndex, 
          endIndex: charIndex 
        };
      });
      if (wordIdx < splitWords.length - 1) {
        chars.push({ char: " ", startIndex: charIndex, endIndex: charIndex + 1 });
        charIndex++;
      }
      return chars;
    });
  }, [initialText]);

  const textChars = useMemo(() => initialText.split(""), [initialText]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active / Ghost Cursor position update (Batched DOM Reads & Writes)
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const nextIndex = typedText.length;
    
    // Find the active character element by scanning backwards for the nearest cluster start
    let currentCharEl = null;
    for (let i = nextIndex; i >= 0; i--) {
      currentCharEl = document.getElementById(`char-span-${i}`);
      if (currentCharEl) break;
    }
    
    let left = 0;
    let top = 0;
    let height = 28;

    if (currentCharEl) {
      left = currentCharEl.offsetLeft;
      top = currentCharEl.offsetTop;
      height = currentCharEl.offsetHeight;
    } else {
      // Find the last element rendered in the container
      let lastCharEl = null;
      for (let i = textChars.length - 1; i >= 0; i--) {
        lastCharEl = document.getElementById(`char-span-${i}`);
        if (lastCharEl) break;
      }
      if (lastCharEl) {
        left = lastCharEl.offsetLeft + lastCharEl.offsetWidth;
        top = lastCharEl.offsetTop;
        height = lastCharEl.offsetHeight;
      }
    }

    // Direct DOM writing avoids layout thrashing
    containerRef.current.style.setProperty("--cursor-x", `${left}px`);
    containerRef.current.style.setProperty("--cursor-y", `${top}px`);
    containerRef.current.style.setProperty("--cursor-h", `${height}px`);

    // Ghost cursor tracking 3 characters behind
    const ghostIndex = Math.max(0, nextIndex - 3);
    let ghostCharEl = null;
    for (let i = ghostIndex; i >= 0; i--) {
      ghostCharEl = document.getElementById(`char-span-${i}`);
      if (ghostCharEl) break;
    }
    if (ghostCharEl) {
      containerRef.current.style.setProperty("--ghost-x", `${ghostCharEl.offsetLeft}px`);
      containerRef.current.style.setProperty("--ghost-y", `${ghostCharEl.offsetTop}px`);
    } else {
      containerRef.current.style.setProperty("--ghost-x", `${left}px`);
      containerRef.current.style.setProperty("--ghost-y", `${top}px`);
    }
  }, [typedText, textChars.length]);

  // Cursor Blinking and Inactivity Controllers
  const resetCursorInactivity = () => {
    setIsCursorIdle(false);
    setIsBlinkingPaused(true);
    
    if (blinkPauseTimeout.current) clearTimeout(blinkPauseTimeout.current);
    blinkPauseTimeout.current = setTimeout(() => {
      setIsBlinkingPaused(false);
    }, 600);

    if (cursorIdleTimeout.current) clearTimeout(cursorIdleTimeout.current);
    cursorIdleTimeout.current = setTimeout(() => {
      setIsCursorIdle(true);
    }, 1500);
  };

  // Keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.repeat) return; // Prevent keyholding breaking batches
    if (status === "finished" || isPaused || isSecurityBlocked) return;

    resetCursorInactivity();

    const now = performance.now();
    if (keyTimingsRef.current.lastKeyupTime) {
      keyTimingsRef.current.flightTimes.push(now - keyTimingsRef.current.lastKeyupTime);
    }
    activeKeysRef.current[e.key] = now;
    keyTimingsRef.current.lastKeydownTime = now;

    if (status === "idle" && e.key.length === 1) {
      setStatus("running");
      setStartTime(Date.now());
    }

    if (e.key === "Backspace") {
      e.preventDefault();
      playSound("backspace");
      setBackspaceCount(prev => prev + 1);

      const deletedIdx = typedText.length - 1;
      if (deletedIdx >= 0) {
        setRecentlyDeleted(prev => ({ ...prev, [deletedIdx]: true }));
        setTimeout(() => {
          setRecentlyDeleted(prev => {
            const next = { ...prev };
            delete next[deletedIdx];
            return next;
          });
        }, 200);

        setStreak(prev => Math.max(0, prev - 1));
        setTypedText((prev) => prev.slice(0, -1));
      }
    } else if (e.key === " " || e.key.length === 1) {
      e.preventDefault();
      playSound("key");
      setTotalKeystrokes(prev => prev + 1);

      if (typedText.length < textChars.length) {
        const expected = textChars[typedText.length];
        const isCorrect = e.key === expected;

        setTypedHistory(prev => ({ ...prev, [typedText.length]: e.key }));

        if (isCorrect) {
          const nextStreak = streak + 1;
          setStreak(nextStreak);
          setConsecutiveErrors(0);

          // Perfect Word Check & XP Popup
          const isSpace = e.key === " ";
          if (isSpace) {
            const currentWordsTyped = typedText.split(" ");
            const currentWordIndex = currentWordsTyped.length - 1;
            const wordChars = words[currentWordIndex];
            
            if (wordChars) {
              const hasError = wordChars.some(c => {
                for (let i = c.startIndex; i < c.endIndex; i++) {
                  if (errorIndices.has(i)) return true;
                }
                return false;
              });
              if (!hasError) {
                setPerfectWordIdx(currentWordIndex);
                addXp(10); // Award XP
                const lastCharStartIndex = wordChars[wordChars.length - 1].startIndex;
                const charEl = document.getElementById(`char-span-${lastCharStartIndex}`);
                if (charEl) {
                  setXpPopups(prev => [...prev, {
                    id: Math.random().toString(36).substring(2, 9),
                    x: charEl.offsetLeft,
                    y: charEl.offsetTop,
                    amount: 10
                  }]);
                }
              }
            }
          }

          // Streak Milestones
          if (nextStreak > 0 && nextStreak % 25 === 0) {
            setStreakToast(`${nextStreak} Correct Streak!`);
            if (streakToastTimeout.current) clearTimeout(streakToastTimeout.current);
            streakToastTimeout.current = setTimeout(() => {
              setStreakToast(null);
            }, 1800);
          }
        } else {
          // Mistake!
          setErrorCount(prev => prev + 1);
          setErrorIndices(prev => new Set(prev).add(typedText.length));

          if (streak > 0) {
            setStreakBroken(true);
            setTimeout(() => setStreakBroken(false), 400);
          }
          setStreak(0);

          const newConsecutive = consecutiveErrors + 1;
          setConsecutiveErrors(newConsecutive);

          // Audio-visual error shake synchronization inside RAF callback
          requestAnimationFrame(() => {
            setShakeClass(newConsecutive >= 3 ? "animate-shake-gentle" : "animate-shake");
            setEdgeFlashActive(true);
            playErrorTone();
          });
        }

        setTypedText(prev => prev + e.key);
      }
    }
  };

  const finishTest = useCallback(() => {
    if (status !== "running" || !startTime) return;
    
    const timeElapsedMs = Date.now() - startTime;

    let correctChars = 0;
    for (let i = 0; i < typedText.length; i++) {
      if (typedText[i] === initialText[i]) correctChars++;
    }
    const incorrectChars = Math.max(0, totalKeystrokes - correctChars);

    const targetWords = initialText.split(' ');
    const userWords = typedText.split(' ');
    let correctWords = 0;
    let incorrectWords = 0;
    
    for (let i = 0; i < userWords.length; i++) {
      if (userWords[i] === targetWords[i]) {
        correctWords++;
      } else {
        incorrectWords++;
      }
    }

    const timeInSeconds = Math.max(timeElapsedMs / 1000, 1);
    const minutes = timeInSeconds / 60;

    const grossWPM = minutes > 0 ? (totalKeystrokes / 5) / minutes : 0;
    const accuracy = totalKeystrokes > 0 ? (correctChars / totalKeystrokes) * 100 : 100;
    const netWPM = grossWPM * (accuracy / 100);
    const wps = netWPM / 60;
    const cpm = minutes > 0 ? correctChars / minutes : 0;

    let grade = "D";
    if (accuracy >= 98) grade = "S+";
    else if (accuracy >= 95) grade = "S";
    else if (accuracy >= 90) grade = "A";
    else if (accuracy >= 85) grade = "B";
    else if (accuracy >= 80) grade = "C";

    const consistencyVal = Math.max(0, Math.min(100, accuracy - incorrectWords * 0.5));

    const mockIp = localStorage.getItem("master-typing-ip") || "192.168.1.45";
    const activeUsername = useUserStore.getState().username || "guest";
    const isIpBlocked = blockedIps.includes(mockIp);
    const isDeviceBlocked = blockedDevices.includes(deviceFingerprint);

    const report = evaluateSessionSecurity(
      {
        holdDurations: keyTimingsRef.current.holdDurations,
        flightTimes: keyTimingsRef.current.flightTimes,
        tabSwitches: tabSwitchesRef.current,
        mousePoints: mousePointsRef.current,
        totalKeys: totalKeystrokes,
        backspaces: backspaceCount,
        errors: errorCount,
        elapsedMs: timeElapsedMs,
        wpm: netWPM,
        accuracy,
        previousBestWpm: highestWpm,
      },
      activeUsername,
      mockIp
    );

    const enforcedScore = isIpBlocked || isDeviceBlocked ? 0 : report.score;
    const securityCategory = isIpBlocked || isDeviceBlocked ? "Critical" : report.category;
    const securityAction = isIpBlocked || isDeviceBlocked ? "block" : report.action;
    const securityReasons = [...report.reasons];
    if (isIpBlocked) securityReasons.unshift(`Attempted test submission from blocked IP: ${mockIp}`);
    if (isDeviceBlocked) securityReasons.unshift(`Attempted test submission from blocked Device ID: ${deviceFingerprint}`);

    const validationStatus: ProfessionalStats["validationStatus"] =
      enforcedScore >= 76 && !report.isBot
        ? "verified"
        : enforcedScore >= 61
          ? "monitored"
          : enforcedScore > 20
            ? "challenge"
            : "blocked";

    const leaderboardEligible = validationStatus === "verified" && report.leaderboardEligible;

    if (securityAction === "block" || validationStatus === "blocked") {
      setStatus("finished");
      setIsSecurityBlocked(true);
      addThreatLog(
        isIpBlocked ? "Blocked IP Access" : isDeviceBlocked ? "Blocked Device Access" : "Auto-Typer/Cheat Detected",
        securityReasons.join(", "),
        enforcedScore,
        activeUsername,
        mockIp,
        deviceFingerprint
      );
      return;
    }

    setStatus("finished");

    const stats: ProfessionalStats = {
      grossWPM: Number(grossWPM.toFixed(2)),
      netWPM: Number(netWPM.toFixed(2)),
      wps: Number(wps.toFixed(2)),
      cpm: Number(cpm.toFixed(0)),
      accuracy: Number(accuracy.toFixed(2)),
      correctWords,
      incorrectWords,
      correctChars,
      incorrectChars,
      totalCharsTyped: totalKeystrokes,
      backspaces: backspaceCount,
      consistency: Number(consistencyVal.toFixed(1)),
      grade,
      durationMs: timeElapsedMs,
      trustScore: enforcedScore,
      validationStatus,
      securityReport: {
        category: securityCategory,
        action: securityAction,
        reasons: securityReasons,
        leaderboardEligible,
        fraudProbability: Math.max(0, 100 - enforcedScore),
      },
    };

    if (enforcedScore <= 60) {
      addThreatLog(
        "Verification Challenge Required",
        securityReasons.join(", "),
        enforcedScore,
        activeUsername,
        mockIp,
        deviceFingerprint
      );
    } else if (enforcedScore <= 75) {
      addThreatLog(
        "Monitored Test Activity",
        securityReasons.join(", "),
        enforcedScore,
        activeUsername,
        mockIp,
        deviceFingerprint
      );
    }
    
    if (leaderboardEligible) {
      addVerifiedRun(crypto.randomUUID(), Math.round(netWPM), Math.round(accuracy), enforcedScore);
    }

    if (enforcedScore >= 61) {
      addTestResult(Math.round(netWPM), Math.round(accuracy), sessionType, {
        trustScore: enforcedScore,
        verified: validationStatus === "verified",
        leaderboardEligible,
        validationStatus,
        riskCategory: securityCategory,
        securitySummary: securityReasons.slice(0, 4),
      }, title);
    }

    if (onFinish) {
      onFinish(stats);
    }
  }, [status, startTime, typedText, initialText, totalKeystrokes, backspaceCount, errorCount, highestWpm, addTestResult, onFinish, sessionType, deviceFingerprint, blockedIps, blockedDevices, addThreatLog, addVerifiedRun, title]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "running" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && status === "running") {
      const timerId = setTimeout(() => finishTest(), 0);
      return () => {
        clearInterval(interval);
        clearTimeout(timerId);
      };
    }
    return () => clearInterval(interval);
  }, [status, timeLeft, timeLimit, finishTest]);

  // Finish test when fully complete
  useEffect(() => {
    if (status === "running" && typedText.length > 0 && typedText.length === textChars.length) {
      const timerId = setTimeout(() => finishTest(), 0);
      return () => clearTimeout(timerId);
    }
  }, [typedText, textChars, status, finishTest]);

  // Auto-scroll logic targeting translation cursor
  useEffect(() => {
    const cursor = document.getElementById("active-cursor-scroller");
    if (cursor) {
      cursor.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [typedText]);

  // Click to focus
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus();
    document.addEventListener("click", handleClick);
    inputRef.current?.focus();
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Return focus on resume from pause
  useEffect(() => {
    if (!isPaused && status === "running") {
      inputRef.current?.focus();
    }
  }, [isPaused, status]);

  // Track live WPM every 2 seconds for SVG line chart
  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      setWpmHistory(prev => [...prev, liveWpm]);
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  const resetTest = () => {
    setTypedText("");
    setStatus("idle");
    setStartTime(null);
    setTimeLeft(timeLimit);
    setErrorCount(0);
    setTotalKeystrokes(0);
    setBackspaceCount(0);
    setErrorIndices(new Set());
    setStreak(0);
    setWpmHistory([]);
    setXpPopups([]);
    setPbExceeded(false);
    setStreakToast(null);
    if (streakToastTimeout.current) {
      clearTimeout(streakToastTimeout.current);
    }
    setIsSecurityBlocked(false);
    activeKeysRef.current = {};
    tabSwitchesRef.current = 0;
    mousePointsRef.current = [];
    keyTimingsRef.current = {
      holdDurations: [],
      flightTimes: [],
      lastKeydownTime: null,
      lastKeyupTime: null,
    };
    inputRef.current?.focus();
  };

  // Live Calculations
  let correctChars = 0;
  for (let i = 0; i < typedText.length; i++) {
    if (typedText[i] === initialText[i]) correctChars++;
  }
  
  const wordsTyped = correctChars / 5;
  const elapsedSeconds = Math.max(timeLimit - timeLeft, 1);
  const minutesElapsed = elapsedSeconds / 60;
  
  const liveWpm = status === "running" && typedText.length > 0 ? Math.round(wordsTyped / minutesElapsed) : 0;
  const strictCorrectLive = Math.max(0, correctChars - errorCount);
  const liveAccuracy = totalKeystrokes > 0 ? Math.round((strictCorrectLive / totalKeystrokes) * 100) : 100;

  // Personal Best exceeds check
  useEffect(() => {
    if (status === "running" && highestWpm > 0 && liveWpm > highestWpm) {
      if (!pbExceeded) {
        setPbExceeded(true);
        setPbKey(prev => prev + 1);
      }
    }
  }, [liveWpm, highestWpm, status, pbExceeded]);

  // RAF Interpolations
  const animatedWpm = useRafCounter(liveWpm);
  const animatedAccuracy = useRafCounter(liveAccuracy);

  const getWpmColorClass = (wpm: number) => {
    if (wpm < 30) return "text-white/40";
    if (wpm < 60) return "text-[#00d4ff]";
    if (wpm < 90) return "text-[#00c896]";
    return "text-[#f5c542] drop-shadow-[0_0_8px_rgba(245,197,66,0.6)]";
  };

  // Cursor color configurations
  const getCursorColorClass = () => {
    const isError = typedText.length > 0 && typedText[typedText.length - 1] !== textChars[typedText.length - 1];
    if (isError) return "bg-red-500 shadow-[0_0_10px_#ff4d4d]";
    if (streak >= 5) return "bg-green-500 shadow-[0_0_10px_#00c896]";
    return "bg-cyan-500 shadow-[0_0_10px_#00d4ff]";
  };

  // Stagger calculations
  const staggerDelayMs = Math.min(10, 600 / Math.max(textChars.length, 1));

  // Auto-lookahead brightness range check
  const isLookahead = (charIndex: number) => {
    if (charIndex >= typedText.length) {
      let wordStart = 0;
      let currentWordIdx = 0;
      for (let i = 0; i < words.length; i++) {
        const wLen = words[i].reduce((sum, c) => sum + c.char.length, 0);
        if (typedText.length >= wordStart && typedText.length < wordStart + wLen) {
          currentWordIdx = i;
          break;
        }
        wordStart += wLen;
      }
      
      let activeRangeStart = 0;
      for (let i = 0; i < currentWordIdx; i++) {
        activeRangeStart += words[i].reduce((sum, c) => sum + c.char.length, 0);
      }
      let activeRangeEnd = activeRangeStart;
      if (words[currentWordIdx]) {
        activeRangeEnd += words[currentWordIdx].reduce((sum, c) => sum + c.char.length, 0);
      }
      if (words[currentWordIdx + 1]) {
        activeRangeEnd += words[currentWordIdx + 1].reduce((sum, c) => sum + c.char.length, 0);
      }

      return charIndex >= activeRangeStart && charIndex < activeRangeEnd;
    }
    return false;
  };

  // SVG Line Chart coordinates calculation
  const maxHistoryWpm = Math.max(...wpmHistory, 60);
  const graphPoints = wpmHistory.map((wpm, idx) => {
    const x = wpmHistory.length > 1 ? (idx / (wpmHistory.length - 1)) * 300 : 0;
    const y = 40 - (wpm / maxHistoryWpm) * 35;
    return `${x},${y}`;
  });
  const graphPath = graphPoints.length > 0 ? `M ${graphPoints.join(" L ")}` : "";

  // Progress calculations
  const percent = textChars.length > 0 ? typedText.length / textChars.length : 0;
  const barHue = 200 - (percent * 140);

  const removeXpPopup = (id: string) => {
    setXpPopups(prev => prev.filter(p => p.id !== id));
  };

  const multiplier = 1 + Math.floor(streak / 10);

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-2 pt-0 md:pt-2">
      {/* Red border edge overlay flash for error visual support */}
      {edgeFlashActive && (
        <div 
          className="fixed inset-0 border-[6px] border-red-500/30 pointer-events-none z-[9999] animate-edge-flash" 
          onAnimationEnd={() => setEdgeFlashActive(false)} 
        />
      )}

      {/* Streak Milestone Toast message */}
      <AnimatePresence>
        {streakToast && (
          <motion.div 
            initial={{ y: -100, x: "-50%", opacity: 0 }}
            animate={{ y: 0, x: "-50%", opacity: 1 }}
            exit={{ y: -100, x: "-50%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-20 left-1/2 z-50 bg-[#0f111a]/95 backdrop-blur-md border border-[#00c896] text-[#00c896] px-6 py-2 rounded-full font-bold shadow-2xl"
            role="status"
          >
            <div className="text-center text-sm">
              <div className="font-extrabold uppercase text-[10px] tracking-wider text-[#00c896]/65">Streak Milestone</div>
              <div>{streakToast}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        ref={inputRef}
        type="text" 
        className="opacity-0 absolute -z-10" 
        autoFocus
        onBlur={(e) => setTimeout(() => e.target.focus(), 10)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />

      <div className="w-full flex flex-col gap-2 md:gap-4 relative">
        {layoutConfig.layoutOrder.map((block) => {
          if (block === "settings" && layoutConfig.showSettingsBar) {
            return (
              <div key="settings" className="w-full flex justify-end z-20 mb-2">
                <div className="scale-90 origin-right">
                  <TypingSettingsBar onRestart={resetTest} />
                </div>
              </div>
            );
          }

          if (block === "text") {
            return (
              <div key="text" className="relative w-full">
                {/* Live Graph Line floating above text area */}
                {status === "running" && wpmHistory.length > 0 && (
                  <div className="w-full flex justify-center mb-1">
                    <svg viewBox="0 0 300 40" className="w-[300px] h-[30px] opacity-40 overflow-visible">
                      <path
                        d={graphPath}
                        fill="none"
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray="1000"
                        strokeDashoffset="0"
                        style={{
                          transition: "stroke-dashoffset 800ms ease",
                        }}
                      />
                    </svg>
                  </div>
                )}

                {/* Animated typing area container */}
                <div 
                  ref={containerRef}
                  onAnimationEnd={() => setShakeClass("")}
                  onMouseMove={handleMouseMove}
                  className={`relative z-10 flex flex-wrap justify-start md:justify-center gap-y-2 md:gap-y-3 text-2xl md:text-4xl leading-[1.4] md:leading-[1.5] tracking-widest font-mono font-medium max-w-[95%] mx-auto pb-2 border-b border-white/20 overflow-y-auto scrollbar-hide py-2 typing-container ${shakeClass}`} 
                  style={{ maxHeight: '200px', scrollBehavior: 'smooth' }}
                >
                  {/* GPU translate-based main active cursor */}
                  <div 
                    aria-hidden="true"
                    className={`cursor-main ${isBlinkingPaused ? 'cursor-paused' : 'cursor-blinking'} ${isCursorIdle ? 'cursor-idle-pulse' : ''} ${getCursorColorClass()}`}
                  />
                  {/* Trail ghost cursor */}
                  <div 
                    aria-hidden="true"
                    className="cursor-ghost bg-cyan-400"
                  />
                  
                  {/* Invisible anchor target for scrolling focus */}
                  <div 
                    id="active-cursor-scroller"
                    className="absolute w-1 h-1 pointer-events-none"
                    style={{
                      left: "var(--cursor-x)",
                      top: "var(--cursor-y)",
                    }}
                  />

                  {/* Rendering XP Pops */}
                  {xpPopups.map((popup) => (
                    <span
                      key={popup.id}
                      className="absolute pointer-events-none text-[13px] font-bold text-[#f5c542] animate-xp-popup z-30"
                      style={{
                        left: popup.x,
                        top: popup.y - 18,
                      }}
                      onAnimationEnd={() => removeXpPopup(popup.id)}
                    >
                      +10 XP
                    </span>
                  ))}

                  {words.map((wordChars, wIdx) => {
                    const isPerfect = perfectWordIdx === wIdx;
                    return (
                      <div 
                        key={wIdx} 
                        className={`flex relative rounded px-1 transition-all duration-300 ${isPerfect ? 'animate-perfect-pulse' : ''}`}
                        onAnimationEnd={() => { if (isPerfect) setPerfectWordIdx(null); }}
                      >
                        {wordChars.map(({ char, startIndex, endIndex }) => {
                          const isCurrent = typedText.length >= startIndex && typedText.length < endIndex;
                          const isTyped = typedText.length > startIndex;
                          const isFullyTyped = typedText.length >= endIndex;

                          // Evaluate correctness of typed characters in the cluster range
                          let isCorrect = false;
                          if (isTyped) {
                            const typedLen = Math.min(typedText.length - startIndex, endIndex - startIndex);
                            const typedSlice = typedText.slice(startIndex, startIndex + typedLen);
                            const targetSlice = initialText.slice(startIndex, startIndex + typedLen);
                            isCorrect = typedSlice === targetSlice;
                          }

                          // Check if any code point in the cluster was corrected
                          let wasCorrected = false;
                          let isRecentlyDeleted = false;
                          for (let i = startIndex; i < endIndex; i++) {
                            if (errorIndices.has(i)) wasCorrected = true;
                            if (recentlyDeleted[i]) isRecentlyDeleted = true;
                          }

                          let colorClass = "text-white/20";
                          let bgClass = "";

                          if (isTyped) {
                            if (isCorrect) {
                              if (wasCorrected) {
                                colorClass = "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]";
                              } else {
                                colorClass = "text-[#00c896] drop-shadow-[0_0_8px_rgba(0,200,150,0.5)]";
                              }
                            } else {
                              colorClass = "text-[#ff4d4d] drop-shadow-[0_0_8px_rgba(255,77,77,0.5)]";
                              if (char === " ") bgClass = "bg-[#ff4d4d]/30 rounded";
                            }
                          } else {
                            if (isLookahead(startIndex)) {
                              colorClass = "text-white/60";
                            }
                          }

                          return (
                            <div key={startIndex} className="relative">
                              <span 
                                id={`char-span-${startIndex}`}
                                style={{
                                  '--char-index': startIndex,
                                  animationDelay: status === "idle" ? `${startIndex * staggerDelayMs}ms` : "0ms",
                                  transition: "color 80ms ease"
                                } as React.CSSProperties}
                                className={`
                                  ${colorClass} 
                                  ${bgClass} 
                                  ${status === "idle" ? "char-load-enter" : ""}
                                  ${isRecentlyDeleted ? "animate-amber-flash" : ""}
                                  ${isCorrect && char === " " ? "space-accepted" : ""}
                                  relative z-10 px-[1px] whitespace-pre inline-block font-mono
                                `}
                              >
                                {char}
                              </span>

                              {/* Autocorrect wrong character crossfade overlay */}
                              {isCorrect && wasCorrected && (
                                <span className="absolute inset-0 text-[#ff4d4d] autocorrect-wrong pointer-events-none font-mono">
                                  {Array.from({ length: endIndex - startIndex }).map((_, i) => typedHistory[startIndex + i] || "").join("")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          if (block === "keyboard" && layoutConfig.showKeyboard) {
            return (
              <div key="keyboard" className={`flex justify-center w-full relative ${
                layoutConfig.keyboardSize === 'small' ? 'scale-75 origin-top' : 
                layoutConfig.keyboardSize === 'large' ? 'scale-110 origin-top' : ''
              }`}>
                <KeyboardUI 
                  targetKey={status === "finished" ? null : (textChars[typedText.length] || null)} 
                />
              </div>
            );
          }
          return null;
        })}
        
        {/* Progress Bar (scaleX based GPU compositor, zero layout cost) */}
        {mode === "progress" && (
          <div className="absolute -bottom-3 left-[5%] right-[5%] h-2 bg-foreground/10 rounded-full overflow-hidden shadow-[0_4px_10px_rgba(0,0,0,0.5)] border border-white/5 z-20">
            {/* Ghost remaining track (20% opacity) */}
            <div className="absolute inset-0 bg-white/20 w-full h-full pointer-events-none" />

            {/* GPU Composited Active Bar */}
            <div 
              className={`h-full rounded-full bg-cyan-400 high-perf-progress ${percent === 1 ? 'animate-bar-pulse' : ''}`}
              style={{
                transform: `scaleX(${percent})`,
                transformOrigin: "left",
                transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                filter: `hue-rotate(${barHue - 200}deg)`,
                willChange: "transform"
              }}
            />

            {/* Spring Ticks at 25%, 50%, 75% */}
            {[0.25, 0.50, 0.75].map((tickVal) => {
              const reached = percent >= tickVal;
              return (
                <div 
                  key={tickVal}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-primary transition-transform duration-300 pointer-events-none"
                  style={{
                    left: `${tickVal * 100}%`,
                    transform: `translate3d(-50%, -50%, 0) scale(${reached ? 1 : 0})`,
                    transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Stats overlay */}
      {layoutConfig.showStats && status !== "finished" && (
        <div 
          className="fixed bottom-8 right-8 z-50 flex flex-col gap-4 bg-[#0f111a]/80 backdrop-blur border border-white/5 p-4 rounded-2xl shadow-2xl"
          aria-live="polite"
          aria-atomic="true"
        >
          {mode === "time" && (
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium mb-1">Time</span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium text-white leading-none">{timeLeft}</span>
                <span className="text-xs text-white/50 font-medium leading-none">s</span>
              </div>
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">Speed</span>
              {/* PB new notification */}
              {pbExceeded && (
                <motion.span 
                  key={pbKey}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                  className="px-1.5 py-0.5 bg-[#f5c542] text-black text-[9px] font-black rounded-full leading-none"
                >
                  NEW PB!
                </motion.span>
              )}
            </div>
            <div className={`flex items-baseline gap-1 ${getWpmColorClass(liveWpm)}`} style={{ transition: "color 800ms" }}>
              <DigitRoll value={animatedWpm} />
              <span className="text-xs text-white/50 font-medium leading-none">WPM</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-medium">Accuracy</span>
              {/* Streak multiplier visual representation */}
              {multiplier > 1 && (
                <motion.span 
                  key={multiplier}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-black rounded-full leading-none"
                >
                  x{multiplier}
                </motion.span>
              )}
            </div>
            <div 
              className="flex items-baseline gap-1 transition-all duration-400"
              style={{
                filter: streakBroken ? "saturate(0)" : "saturate(1)",
                animation: streakBroken ? "shake 300ms linear" : "none",
              }}
            >
              <DigitRoll value={animatedAccuracy} />
              <span className="text-xs text-white/50 font-medium leading-none">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Paused state frosted glass layer overlay */}
      {isPaused && (
        <div 
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[4px] rounded-2xl animate-fade-in"
          style={{
            transition: "opacity 200ms ease"
          }}
        >
          <div className="text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">Paused</h2>
            <p className="text-xs text-white/50">Press ESC or click settings to resume typing</p>
          </div>
        </div>
      )}

      {/* Security Block overlay screen */}
      {isSecurityBlocked && (
        <div 
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md rounded-2xl animate-fade-in p-6"
        >
          <div className="text-center flex flex-col items-center gap-4 max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">Verification Blocked</h2>
            <p className="text-xs text-white/50 leading-relaxed">
              Our automated system detected machine behaviors or network proxy anomalies. Score validation is disabled for this session.
            </p>
            <button 
              onClick={resetTest}
              className="mt-2 px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/5 hover:border-white/10 rounded-xl font-bold text-xs text-white transition-all active:scale-95 shadow-lg"
            >
              Reset Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
