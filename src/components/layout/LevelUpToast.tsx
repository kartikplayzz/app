"use client";

import { useEffect, useState, useRef } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

interface Particle {
  id: string;
  dx: number;
  dy: number;
  size: number;
  color: string;
}

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/verify", "/profile-setup"];

export function LevelUpToast() {
  const { level } = useStatsStore();
  const { isAuthenticated, isLoading } = useAuthStore();
  const pathname = usePathname() || "";
  
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [allowToast, setAllowToast] = useState(false);
  
  const prevLevel = useRef(level);
  const particleCount = useRef(0);

  const onAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  // Control toast permission to prevent false-positives during hydration or sync
  useEffect(() => {
    if (isLoading || !isAuthenticated || onAuthRoute) {
      setAllowToast(false);
      return;
    }

    // Wait 3 seconds after authentication settles to allow stats hydration/sync to complete
    const timer = setTimeout(() => {
      setAllowToast(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, onAuthRoute]);

  useEffect(() => {
    if (level > prevLevel.current && prevLevel.current > 0) {
      if (allowToast && !onAuthRoute) {
        // Level up occurred
        setShow(true);
        
        // Generate 50 radial explosion particles
        const colors = ["#facc15", "#f5c542", "#ec4899", "#3b82f6", "#00c896"];
        const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => {
          const angle = Math.random() * Math.PI * 2;
          const distance = 40 + Math.random() * 130; // radial outward range 40px - 170px
          const dx = Math.cos(angle) * distance;
          const dy = Math.sin(angle) * distance;
          const size = 5 + Math.random() * 8; // size 5px to 13px
          const color = colors[Math.floor(Math.random() * colors.length)];
          return {
            id: `${i}-${Math.random()}`,
            dx,
            dy,
            size,
            color,
          };
        });
        
        particleCount.current = 50;
        setParticles(newParticles);
        
        // Play level up synthesizer chime using Web Audio
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.6);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
          }
        } catch {
          // Silence errors if audio context fails to initialize
        }

        const t = setTimeout(() => {
          setShow(false);
        }, 4000);
        return () => clearTimeout(t);
      }
    }
    prevLevel.current = level;
  }, [level, allowToast, onAuthRoute]);

  const handleParticleAnimationEnd = () => {
    particleCount.current--;
    if (particleCount.current <= 0) {
      setParticles([]);
    }
  };

  if (onAuthRoute || !isAuthenticated || isLoading) {
    return null;
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          role="status" // Screen reader announcement for achievements
        >
          <div className="bg-primary/20 backdrop-blur-xl border border-primary/50 shadow-[0_0_50px_rgba(var(--primary),0.5)] p-4 pr-8 rounded-full flex items-center gap-4 relative">
            {/* Render radial explosion particles centered around the Trophy badge */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="particle"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: p.color,
                  left: "24px", // half of Trophy parent's offset
                  top: "24px",
                  marginLeft: `-${p.size / 2}px`,
                  marginTop: `-${p.size / 2}px`,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                } as React.CSSProperties}
                onAnimationEnd={handleParticleAnimationEnd}
              />
            ))}

            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(255,200,0,0.5)] relative z-10">
              <Trophy className="w-6 h-6 text-yellow-900" />
            </div>
            <div className="flex flex-col relative z-10">
              <span className="text-sm font-bold uppercase tracking-widest text-primary">Level Up!</span>
              <span className="text-2xl font-black text-foreground leading-none">Rank {level} Achieved</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
