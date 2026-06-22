"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { useSettingsStore } from "@/store/useSettingsStore";

const keyboardRows = [
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
  ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
  ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
  ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift-R"],
  ["Space"]
];

const FINGER_MAP: Record<string, string> = {
  // Left Pinky
  "`": "LP", "1": "LP", "q": "LP", "a": "LP", "z": "LP", "Tab": "LP", "CapsLock": "LP", "Shift": "LP",
  // Left Ring
  "2": "LR", "w": "LR", "s": "LR", "x": "LR",
  // Left Middle
  "3": "LM", "e": "LM", "d": "LM", "c": "LM",
  // Left Index
  "4": "LI", "5": "LI", "r": "LI", "t": "LI", "f": "LI", "g": "LI", "v": "LI", "b": "LI",
  // Right Index
  "6": "RI", "7": "RI", "y": "RI", "u": "RI", "h": "RI", "j": "RI", "n": "RI", "m": "RI",
  // Right Middle
  "8": "RM", "i": "RM", "k": "RM", ",": "RM",
  // Right Ring
  "9": "RR", "o": "RR", "l": "RR", ".": "RR",
  // Right Pinky
  "0": "RP", "-": "RP", "=": "RP", "p": "RP", "[": "RP", "]": "RP", "\\": "RP", ";": "RP", "'": "RP", "/": "RP", "Backspace": "RP", "Enter": "RP", "Shift-R": "RP",
  // Thumbs
  "Space": "TH", " ": "TH"
};

interface KeyboardUIProps {
  targetKey?: string | null;
}

export function KeyboardUI({ targetKey }: KeyboardUIProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [errorKeys, setErrorKeys] = useState<Set<string>>(new Set());
  const [ripples, setRipples] = useState<{ id: string; key: string }[]>([]);
  const { keyboardTheme, keyboardGuide } = useSettingsStore();

  const keyTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const normalizedTarget = targetKey?.toLowerCase() === " " ? "space" : targetKey?.toLowerCase() || null;

  const pressKey = (keyName: string) => {
    const k = keyName.toLowerCase();
    
    // Clear pending release timeouts to prevent flickers on rapid key repeat
    if (keyTimeouts.current[k]) {
      clearTimeout(keyTimeouts.current[k]);
      delete keyTimeouts.current[k];
    }
    
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });

    // Inject self-cleaning keycap ripples
    const rippleId = Math.random().toString(36).substring(2, 9);
    setRipples((prev) => [...prev, { id: rippleId, key: k }]);

    // Trigger error key visualizer flash if user misses targets
    if (normalizedTarget && k !== normalizedTarget && !["tab", "capslock", "shift-r", "shift", "enter", "backspace"].includes(k)) {
      setErrorKeys((prev) => {
        const next = new Set(prev);
        next.add(k);
        return next;
      });
      setTimeout(() => {
        setErrorKeys((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }, 500);
    }
  };

  const releaseKey = (keyName: string) => {
    const k = keyName.toLowerCase();
    if (keyTimeouts.current[k]) {
      clearTimeout(keyTimeouts.current[k]);
    }
    
    // Debounce keycap deactivation to visual-friendly duration (150ms) to reduce flicker
    keyTimeouts.current[k] = setTimeout(() => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      delete keyTimeouts.current[k];
    }, 150);
  };

  const removeRipple = (id: string) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent OS key-hold repeat spam
      
      const k = e.key.toLowerCase();
      pressKey(k);
      
      if (e.code === "Space") pressKey("space");
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      releaseKey(k);
      
      if (e.code === "Space") releaseKey("space");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      // Clean up all active deactivation schedules
      Object.values(keyTimeouts.current).forEach(clearTimeout);
    };
  }, [normalizedTarget]);

  const getKeyWidth = (key: string) => {
    switch (key) {
      case "Backspace": return "w-20 md:w-24";
      case "Tab": return "w-16 md:w-20";
      case "CapsLock": return "w-20 md:w-24";
      case "Enter": return "w-24 md:w-28";
      case "Shift": return "w-28 md:w-32";
      case "Shift-R": return "w-28 md:w-32";
      case "Space": return "w-[300px] md:w-[400px]";
      default: return "w-10 md:w-12";
    }
  };

  const getDisplayKey = (key: string) => {
    switch (key) {
      case "Space": return "";
      case "Shift-R": return "Shift";
      default: return key;
    }
  };

  const getBaseClasses = () => {
    switch (keyboardTheme) {
      case "glass": return "bg-black/30 border border-white/5 rounded-[1rem] md:rounded-[1.2rem]";
      case "wobbly": return "bg-black/40 border-2 border-white/10 rounded-[12px_6px_14px_5px/6px_14px_6px_12px]";
      case "cartoon": return "bg-gray-800 border-2 border-black rounded-xl";
      case "marble": return "bg-gray-400 border border-gray-500 rounded-lg shadow-sm";
      case "classic": return "bg-[#808080] border border-[#404040] rounded";
      case "modern": return "bg-gray-200 border border-gray-300";
      case "colorful": return "bg-gray-950 rounded-lg border border-black/30";
      default: return "bg-black/50 border border-white/5 rounded-xl";
    }
  };

  const getThemeClasses = (key: string, isPressed: boolean, isTarget: boolean, hasError: boolean) => {
    let base = "absolute inset-0 w-full h-full flex items-center justify-center text-xs md:text-sm font-medium high-perf-key ";
    
    if (hasError) {
      base += "animate-error-key-flash ";
    }

    if (keyboardTheme === "glass") {
      base += "rounded-[1rem] md:rounded-[1.2rem] backdrop-blur-md border border-white/20 bg-white/5 ";
      if (isPressed) base += "bg-white/20 border-white/40 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)] ";
      else if (isTarget && keyboardGuide) base += "bg-primary/30 border-primary/50 text-white ";
      else base += "text-white/70 hover:bg-white/10 ";
      base += "after:content-[''] after:absolute after:top-1.5 after:left-1.5 after:w-2 after:h-1.5 after:bg-white/40 after:rounded-full after:blur-[1px] ";
    } 
    else if (keyboardTheme === "wobbly") {
      base += "rounded-[12px_6px_14px_5px/6px_14px_6px_12px] border-2 border-white/20 bg-transparent font-mono ";
      if (isPressed) base += "bg-white/10 border-white/40 ";
      else if (isTarget && keyboardGuide) base += "border-primary bg-primary/20 text-white shadow-[0_0_15px_rgba(var(--primary),0.3)] ";
      else base += "text-white/60 ";
    }
    else if (keyboardTheme === "cartoon") {
      base += "rounded-xl border-2 border-black bg-white text-black font-black uppercase ";
      if (isPressed) base += "bg-gray-100 ";
      else if (isTarget && keyboardGuide) base += "border-primary bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.4)] ";
      else base += "hover:bg-gray-50 ";
    }
    else if (keyboardTheme === "marble") {
      base += "rounded-lg border border-white/50 bg-gradient-to-br from-white to-gray-200 text-black shadow-md font-bold ";
      if (isPressed) base += "from-gray-200 to-gray-300 shadow-none ";
      else if (isTarget && keyboardGuide) base += "from-primary/20 to-primary/40 border-primary text-primary-dark shadow-[0_0_15px_rgba(var(--primary),0.4)] ";
    }
    else if (keyboardTheme === "classic") {
      base += "rounded border border-[#c0c0c0] bg-[#e5e5e5] text-[#333] shadow-sm font-sans font-semibold ";
      if (isPressed) base += "bg-[#d5d5d5] ";
      else if (isTarget && keyboardGuide) base += "border-primary bg-primary/20 text-primary-dark ";
    }
    else if (keyboardTheme === "modern") {
      base += "rounded-none border border-gray-200 bg-white text-gray-500 font-light ";
      if (isPressed) base += "bg-gray-100 border-gray-300 text-gray-800 ";
      else if (isTarget && keyboardGuide) base += "border-primary bg-primary/10 text-primary ";
    }
    else if (keyboardTheme === "colorful") {
      base += "rounded-lg border-2 border-gray-900 bg-gray-800 text-white font-black ";
      if (isPressed) base += "bg-gray-700 ";
      else if (isTarget && keyboardGuide) base += "border-primary bg-primary shadow-[0_0_20px_rgba(var(--primary),0.6)] ";
      else base += "hover:bg-gray-750 ";
    }
    else {
      base += "rounded-xl border border-foreground/10 bg-background/50 font-medium ";
      if (isPressed) base += "bg-foreground/20 border-foreground/30 shadow-[inset_0_4px_10px_rgba(0,0,0,0.5)] ";
      else if (isTarget && keyboardGuide) base += "border-primary/50 bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)] ";
      else base += "text-muted-foreground hover:border-foreground/20 ";
    }

    return base;
  };

  return (
    <div 
      className="relative overflow-hidden w-full max-w-5xl mx-auto rounded-[2rem]"
      aria-hidden="true" // Screen readers do not need purely decorative visualizers
    >
      {/* Dynamic Background Glow based on typing theme */}
      {keyboardTheme === "glass" && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 pointer-events-none" />
      )}
      
      <div 
        className="p-2 md:p-4 flex flex-col gap-2.5 items-center relative z-10 w-full"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
      >
        {keyboardRows.map((row, i) => (
          <div 
            key={i} 
            className="flex gap-2 relative z-10 w-full justify-center"
            style={{
              transform: "rotateX(14deg) translateY(0px) translateZ(0px)",
              transformStyle: "preserve-3d"
            }}
          >
            {row.map((key, j) => {
              const rawKey = key.toLowerCase() === "shift-r" ? "shift" : key.toLowerCase();
              const isPressed = pressedKeys.has(rawKey);
              const isTarget = rawKey === normalizedTarget;
              const hasError = errorKeys.has(rawKey);
              const widthClass = getKeyWidth(key);
              
              // Modifier scaling check: Shift, Backspace, Enter scale slightly less
              const isModifier = ["shift", "shift-r", "backspace", "enter"].includes(rawKey);
              const pressedScale = isModifier ? 0.92 : 0.88;

              return (
                <div
                  key={`${i}-${j}`}
                  className={`${widthClass} h-11 md:h-14 relative`}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pressKey(rawKey);
                    if (rawKey === "space") pressKey("space");
                  }}
                  onPointerUp={() => {
                    releaseKey(rawKey);
                    if (rawKey === "space") releaseKey("space");
                  }}
                  onPointerLeave={() => {
                    releaseKey(rawKey);
                    if (rawKey === "space") releaseKey("space");
                  }}
                >
                  {/* 3D Depth Chassis Base Layer */}
                  <div 
                    className={`absolute inset-0 w-full h-full ${getBaseClasses()} translate-y-[4px] -z-10`}
                  />

                  {/* Floating physical Keycap Layer */}
                  <motion.div
                    className={getThemeClasses(key, isPressed, isTarget, hasError)}
                    animate={{
                      y: isPressed ? 4 : isTarget && keyboardGuide ? [-6, -4, -6] : -4,
                      scale: isPressed ? pressedScale : 1,
                    }}
                    transition={
                      isPressed 
                        ? { duration: 0.04, ease: "easeIn" } // Press Down Timing
                        : { duration: 0.12, ease: [0.34, 1.56, 0.64, 1] } // Spring Release Feel
                    }
                    style={{
                      transformStyle: "preserve-3d",
                      transitionProperty: "background-color, box-shadow",
                      transitionDuration: isPressed ? "30ms" : "180ms",
                      transitionTimingFunction: "ease"
                    }}
                  >
                    {getDisplayKey(key)}
                    
                    {/* Render active self-cleaning ripples inside keycap */}
                    {ripples.filter((r) => r.key === rawKey).map((ripple) => (
                      <span
                        key={ripple.id}
                        className="ripple absolute w-8 h-8 rounded-full pointer-events-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        onAnimationEnd={() => removeRipple(ripple.id)}
                      />
                    ))}

                    {/* Subtle target glow behind/inside the key cap */}
                    {isTarget && keyboardGuide && ['standard', 'glass', 'wobbly'].includes(keyboardTheme) && (
                      <motion.div 
                        className="absolute inset-0 bg-primary/20 blur-md -z-10 rounded-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      />
                    )}
                  </motion.div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
