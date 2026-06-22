"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard } from "lucide-react";

export function PremiumSplash() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hide splash screen after 1.8 seconds of loading
    const t = setTimeout(() => {
      setLoading(false);
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[9999] bg-[#0b0f19] flex flex-col items-center justify-center select-none"
        >
          {/* Glowing tech background details */}
          <div className="absolute w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px] -translate-y-12 animate-pulse" />
          <div className="absolute w-[250px] h-[250px] bg-blue-500/5 rounded-full blur-[60px] translate-y-12 animate-pulse" />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-6 relative z-10"
          >
            <div className="relative">
              {/* Premium keycap logo with glowing borders */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 flex items-center justify-center shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
                <Keyboard className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-2xl border border-primary/30 animate-ping opacity-40" />
            </div>

            <div className="flex flex-col items-center leading-none mt-2">
              <span className="text-2xl font-black tracking-widest text-white">
                TYPE<span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">MASTER</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.35em] text-white/40 font-bold mt-2">
                Professional Typing Suite
              </span>
            </div>
            
            {/* Minimal loader line */}
            <div className="w-40 h-[2px] bg-white/10 rounded-full overflow-hidden mt-2 relative">
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="absolute w-20 h-full bg-gradient-to-r from-transparent via-primary to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
