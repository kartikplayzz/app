"use client";

import { motion, AnimatePresence } from "framer-motion";

interface VirtualKeyboardProps {
  targetKey: string;
  keyState?: "correct" | "warning"; // correct = green/primary, warning = yellow
  wrongKey?: string | null; // the key they incorrectly pressed (shows red)
}

const ROW_1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "backspace"];
const ROW_2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"];
const ROW_3 = ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"];

export function VirtualKeyboard({ targetKey, keyState = "correct", wrongKey }: VirtualKeyboardProps) {
  const normalizedTarget = targetKey.toLowerCase();
  const normalizedWrong = wrongKey?.toLowerCase();

  const renderKey = (keyChar: string) => {
    const isTarget = keyChar === normalizedTarget;
    const isWrong = keyChar === normalizedWrong;
    
    let baseStyles = "bg-gradient-to-b from-foreground/5 to-foreground/10 border border-foreground/10 text-foreground/50 shadow-sm";
    
    if (isWrong) {
      baseStyles = "bg-gradient-to-b from-red-500 to-red-600 border border-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.8)]";
    } else if (isTarget) {
      if (keyState === "warning") {
        baseStyles = "bg-gradient-to-b from-yellow-400 to-yellow-500 border border-yellow-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.6)]";
      } else {
        baseStyles = "bg-gradient-to-b from-emerald-400 to-emerald-500 border border-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)]";
      }
    }

    const isBackspace = keyChar === "backspace";

    return (
      <div 
        key={keyChar}
        className={`relative ${
          isBackspace ? "w-20 md:w-28" : "w-12 md:w-16"
        } h-12 md:h-16`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* 3D base shadow */}
        <div className="absolute inset-0 w-full h-full bg-black/60 rounded-xl translate-y-[4px] -z-10 border border-white/5" />

        {/* Floating cap */}
        <motion.div
          className={`absolute inset-0 w-full h-full flex items-center justify-center rounded-xl font-mono font-bold uppercase ${
            isBackspace ? "text-xs md:text-sm" : "text-lg md:text-2xl"
          } ${baseStyles}`}
          animate={{
            y: isWrong ? 4 : isTarget ? [-6, -4, -6] : -4,
            scale: isWrong ? 0.96 : 1,
          }}
          transition={
            isWrong
              ? { type: "spring", stiffness: 600, damping: 10 }
              : isTarget
                ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                : { type: "spring", stiffness: 300, damping: 20 }
          }
          style={{ transformStyle: "preserve-3d" }}
        >
          {isTarget && (
            <motion.div 
              className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
            />
          )}
          <span className="relative z-10 drop-shadow-md">{isBackspace ? "Backspace" : keyChar}</span>
        </motion.div>
      </div>
    );
  };

  const isSpaceTarget = normalizedTarget === " " || normalizedTarget === "space";
  let spaceStyles = "bg-gradient-to-b from-foreground/5 to-foreground/10 border border-foreground/10 text-foreground/50 shadow-sm";
  if (isSpaceTarget) {
    if (keyState === "warning") {
      spaceStyles = "bg-gradient-to-b from-yellow-400 to-yellow-500 border border-yellow-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.6)]";
    } else {
      spaceStyles = "bg-gradient-to-b from-emerald-400 to-emerald-500 border border-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)]";
    }
  }

  return (
    <div className="relative p-4 md:p-6 rounded-[2rem] bg-background/40 backdrop-blur-2xl border border-white/5 shadow-2xl overflow-hidden w-full">
      {/* Premium ambient glow behind keyboard based on state */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full blur-[100px] pointer-events-none transition-colors duration-500 ${
        keyState === "warning" ? "bg-yellow-500/10" : "bg-emerald-500/10"
      }`} />

      <div 
        className="relative z-10 flex flex-col items-center gap-3 w-full"
        style={{
          perspective: "1200px",
          transformStyle: "preserve-3d"
        }}
      >
        <div 
          className="relative z-10 flex flex-col items-center gap-3 w-full"
          style={{
            transform: "rotateX(12deg) translateY(0px) translateZ(0px)",
            transformStyle: "preserve-3d"
          }}
        >
          <div className="flex gap-2 md:gap-3 justify-center w-full">
            {ROW_1.map(renderKey)}
          </div>
          <div className="flex gap-2 md:gap-3 justify-center w-full">
            {ROW_2.map(renderKey)}
          </div>
          <div className="flex gap-2 md:gap-3 justify-center w-full">
            {ROW_3.map(renderKey)}
          </div>
          <div className="flex gap-2 md:gap-3 mt-3 w-full justify-center">
            <div 
              className="relative w-[300px] md:w-[450px] h-12 md:h-16"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Space 3D base shadow */}
              <div className="absolute inset-0 w-full h-full bg-black/60 rounded-xl translate-y-[4px] -z-10 border border-white/5" />
              
              {/* Space floating cap */}
              <motion.div 
                className={`absolute inset-0 w-full h-full flex items-center justify-center rounded-xl ${spaceStyles}`}
                animate={{
                  y: isSpaceTarget ? [-6, -4, -6] : -4,
                }}
                transition={
                  isSpaceTarget
                    ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
                    : { type: "spring", stiffness: 300, damping: 20 }
                }
                style={{ transformStyle: "preserve-3d" }}
              >
                {isSpaceTarget && (
                  <motion.div 
                    className="absolute inset-0 rounded-xl bg-white/20 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
