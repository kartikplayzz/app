"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SciFiLogo() {
  const [showPro, setShowPro] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPro(true);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-[400px] flex justify-center items-center overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_center,#1e1b4b_0%,#0f172a_100%)] border border-primary/20 shadow-[0_0_50px_rgba(var(--primary),0.1)]">
      
      {/* Background UI Panels (Decorative Code Blocks) */}
      <div className="absolute top-[10%] left-[5%] w-[250px] p-4 bg-slate-900/50 border border-sky-400/20 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1)] hidden md:block">
        <div className="h-2 w-full bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[40%] bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[70%] bg-sky-400/30 rounded-full" />
      </div>
      
      <div className="absolute bottom-[10%] left-[5%] w-[300px] p-4 bg-slate-900/50 border border-sky-400/20 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1)] hidden md:block">
        <div className="h-2 w-[70%] bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-full bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[40%] bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[60%] bg-sky-400/30 rounded-full" />
      </div>

      <div className="absolute top-[10%] right-[5%] w-[200px] p-4 bg-slate-900/50 border border-sky-400/20 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1)] hidden md:block">
        <div className="h-2 w-[40%] bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-full bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[80%] bg-sky-400/30 rounded-full" />
      </div>

      <div className="absolute bottom-[10%] right-[5%] w-[250px] p-4 bg-slate-900/50 border border-sky-400/20 rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.1)] hidden md:block">
        <div className="h-2 w-full bg-sky-400/30 rounded-full mb-3" />
        <div className="h-2 w-[60%] bg-sky-400/30 rounded-full" />
      </div>

      {/* Center Blob Container */}
      <div className="relative w-[300px] sm:w-[500px] h-[250px] sm:h-[300px] flex justify-center items-center">
        
        {/* Glowing Orbit */}
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute w-[120%] h-[120%] rounded-full border-2 border-transparent border-t-amber-500 border-r-sky-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] z-0"
        />

        {/* Morphing Water Blob */}
        <motion.div 
          animate={{ 
            borderRadius: [
              "60% 40% 30% 70% / 60% 30% 70% 40%",
              "30% 60% 70% 40% / 50% 60% 30% 60%",
              "60% 40% 30% 70% / 60% 30% 70% 40%"
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-full h-full bg-gradient-to-br from-white/10 to-transparent backdrop-blur-md border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.37),inset_0_0_20px_rgba(56,189,248,0.5)] z-10"
        />

        {/* Text Layer */}
        <div className="z-20 flex flex-col items-center justify-center text-center">
          <motion.h1 
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "linear" }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-sans text-white tracking-[0.1em] uppercase overflow-hidden whitespace-nowrap border-r-4 border-sky-400 pb-1"
            style={{ textShadow: "0 0 10px #38bdf8, 0 0 20px #38bdf8, 0 0 40px #0284c7" }}
          >
            TYPE MASTER
          </motion.h1>
          
          <AnimatePresence>
            {showPro && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="mt-4 text-xl sm:text-2xl font-bold italic text-white px-8 py-1.5 rounded-full bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_20px_#38bdf8]"
              >
                PRO
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
