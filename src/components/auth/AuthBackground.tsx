"use client";

import { useEffect, useRef } from "react";

export function AuthBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      containerRef.current.style.setProperty("--parallax-x", `${x}px`);
      containerRef.current.style.setProperty("--parallax-y", `${y}px`);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={
        {
          background: "linear-gradient(145deg, #050816 0%, #0B1120 40%, #111827 100%)",
          "--parallax-x": "0px",
          "--parallax-y": "0px",
        } as React.CSSProperties
      }
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Aurora gradient blob 1 */}
      <div
        className="absolute w-[800px] h-[600px] rounded-full opacity-30 blur-[120px] animate-aurora-1"
        style={{
          background: "radial-gradient(ellipse, #6366F1 0%, #8B5CF6 40%, transparent 70%)",
          top: "-15%",
          left: "10%",
          transform: "translate(var(--parallax-x), var(--parallax-y))",
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Aurora gradient blob 2 */}
      <div
        className="absolute w-[600px] h-[500px] rounded-full opacity-20 blur-[100px] animate-aurora-2"
        style={{
          background: "radial-gradient(ellipse, #06B6D4 0%, #22C55E 50%, transparent 70%)",
          bottom: "-10%",
          right: "5%",
          transform: "translate(calc(var(--parallax-x) * -0.5), calc(var(--parallax-y) * -0.5))",
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Aurora gradient blob 3 */}
      <div
        className="absolute w-[500px] h-[400px] rounded-full opacity-15 blur-[140px] animate-aurora-3"
        style={{
          background: "radial-gradient(ellipse, #EC4899 0%, #F59E0B 60%, transparent 70%)",
          top: "40%",
          right: "30%",
          transform: "translate(calc(var(--parallax-x) * 0.3), calc(var(--parallax-y) * 0.3))",
          transition: "transform 0.3s ease-out",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/[0.03] animate-float-particle"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Floating 3D/Glassmorphic Keycaps */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {["A", "S", "D", "F", "Enter", "Ctrl", "Space", "Shift", "Esc", "Tab", "J", "K", "L", ";"].map((keyChar, i) => {
          const size = keyChar.length > 2 ? 65 : 45;
          return (
            <div
              key={i}
              className="absolute rounded-xl bg-white/[0.01] border border-white/[0.04] backdrop-blur-[1.5px] flex items-center justify-center font-black text-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.03),0_8px_16px_rgba(0,0,0,0.15)] select-none animate-float-keycap"
              style={{
                width: `${size}px`,
                height: `42px`,
                left: `${5 + Math.random() * 90}%`,
                top: `${10 + Math.random() * 80}%`,
                fontSize: "9px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                animationDelay: `${Math.random() * -30}s`,
                animationDuration: `${20 + Math.random() * 25}s`,
              }}
            >
              {keyChar}
            </div>
          );
        })}
      </div>

      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(var(--parallax-x), var(--parallax-y)) scale(1); }
          33% { transform: translate(calc(var(--parallax-x) + 40px), calc(var(--parallax-y) - 30px)) scale(1.1); }
          66% { transform: translate(calc(var(--parallax-x) - 20px), calc(var(--parallax-y) + 20px)) scale(0.95); }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(calc(var(--parallax-x) * -0.5), calc(var(--parallax-y) * -0.5)) scale(1); }
          50% { transform: translate(calc(var(--parallax-x) * -0.5 - 30px), calc(var(--parallax-y) * -0.5 + 40px)) scale(1.15); }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(calc(var(--parallax-x) * 0.3), calc(var(--parallax-y) * 0.3)) scale(1); }
          50% { transform: translate(calc(var(--parallax-x) * 0.3 + 50px), calc(var(--parallax-y) * 0.3 - 20px)) scale(1.08); }
        }
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { transform: translateY(-80px) translateX(20px); }
        }
        @keyframes float-keycap {
          0% { transform: translateY(0) rotate(0deg) scale(0.9); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-160px) rotate(180deg) scale(1.05); opacity: 0; }
        }
        .animate-aurora-1 { animation: aurora-drift-1 12s ease-in-out infinite; }
        .animate-aurora-2 { animation: aurora-drift-2 15s ease-in-out infinite; }
        .animate-aurora-3 { animation: aurora-drift-3 18s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle var(--duration, 8s) ease-in-out infinite; }
        .animate-float-keycap { animation: float-keycap var(--duration, 24s) linear infinite; }
      `}</style>
    </div>
  );
}
