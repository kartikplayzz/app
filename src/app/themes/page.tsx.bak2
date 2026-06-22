"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { Monitor, Palette, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

const THEMES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
  { id: "grey", label: "Grey" },
  { id: "purple", label: "Purple" },
  { id: "pink", label: "Pink" },
  { id: "sky-blue", label: "Sky Blue" },
  { id: "sky-grey", label: "Sky Grey" },
  { id: "custom", label: "Custom Theme" },
];

// HSV to Hex helper
function hsvToHex(h: number, s: number, v: number): string {
  s /= 100;
  v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h <= 360) { r = c; g = 0; b = x; }
  
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`.toUpperCase();
}

// HSV to HSL helper
function hsvToHsl(h: number, s: number, v: number) {
  s /= 100;
  v /= 100;
  let l = (2 - s) * v / 2;
  let sl = s * v / (l < 0.5 ? l * 2 : 2 - l * 2) || 0;
  return {
    h: h,
    s: Math.round(sl * 100),
    l: Math.round(l * 100)
  };
}

export default function ThemesPage() {
  const { theme, setTheme, customColor, setCustomColor } = useSettingsStore();

  const [isDraggingSV, setIsDraggingSV] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  
  const updateSV = (clientX: number, clientY: number) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setCustomColor({
      h: customColor?.h ?? 250,
      s: Math.round(x * 100),
      v: Math.round((1 - y) * 100)
    });
  };
  
  const updateHue = (clientX: number) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setCustomColor({
      h: Math.round(x * 360),
      s: customColor?.s ?? 100,
      v: customColor?.v ?? 100
    });
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSV) {
        updateSV(e.clientX, e.clientY);
      }
      if (isDraggingHue) {
        updateHue(e.clientX);
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      if (isDraggingSV) {
        updateSV(e.touches[0].clientX, e.touches[0].clientY);
      }
      if (isDraggingHue) {
        updateHue(e.touches[0].clientX);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingSV(false);
      setIsDraggingHue(false);
    };
    
    if (isDraggingSV || isDraggingHue) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSV, isDraggingHue, customColor]);

  const h = customColor?.h ?? 250;
  const s = customColor?.s ?? 100;
  const v = customColor?.v ?? 100;

  const hexVal = hsvToHex(h, s, v);
  const hslVal = hsvToHsl(h, s, v);

  // Position ratios for pointer overlays
  const svX = s;
  const svY = 100 - v;
  const hueX = (h / 360) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-4xl mx-auto flex flex-col gap-8 pb-12 pt-4 relative"
    >
      {/* Background radial glow */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* Page Header */}
      <div className="flex flex-col gap-2 px-2">
        <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/40 flex items-center gap-3">
          <Palette className="w-10 h-10 text-primary" />
          Themes & Settings
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Personalize your typing interface, custom color palettes, and component states.
        </p>
      </div>

      <SpotlightCard 
        glowColor="rgba(255, 255, 255, 0.04)"
        className="glass-panel p-8 rounded-3xl flex flex-col gap-8 border border-white/5 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Section Title */}
        <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
          <Monitor className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight">Appearance Profile</h3>
            <p className="text-[11px] text-muted-foreground">Select your interface colors or customize accent states.</p>
          </div>
        </div>

        {/* Theme select switcher */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Theme</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {THEMES.map((t) => (
              <motion.button 
                key={t.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setTheme(t.id)}
                className={`relative px-4 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-between border ${
                  theme === t.id 
                    ? "border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
                    : "border-white/5 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-white hover:border-white/10"
                }`}
              >
                <span>{t.label}</span>
                {theme === t.id && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Custom Color Picker Section (Expanded when custom theme is active) */}
        <AnimatePresence>
          {theme === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden border-t border-white/5 pt-6 flex flex-col gap-6"
            >
              <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Theme Designer - Drag to Customize Accent Colors</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Draggable SV Box and Hue Slider (Left Column) */}
                <div className="md:col-span-7 flex flex-col gap-5">
                  
                  {/* Saturation-Value box */}
                  <div 
                    ref={svRef}
                    onMouseDown={(e) => {
                      setIsDraggingSV(true);
                      updateSV(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      setIsDraggingSV(true);
                      updateSV(e.touches[0].clientX, e.touches[0].clientY);
                    }}
                    style={{
                      backgroundColor: `hsl(${h}, 100%, 50%)`,
                      backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)`,
                    }}
                    className="w-full aspect-[4/3] rounded-2xl border border-white/10 relative overflow-hidden select-none cursor-crosshair shadow-lg"
                  >
                    {/* Centered Selection cursor */}
                    <div 
                      style={{
                        left: `${svX}%`,
                        top: `${svY}%`,
                      }}
                      className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-3 border-white shadow-[0_0_8px_rgba(0,0,0,0.65)] pointer-events-none transition-[transform] duration-75"
                    />
                  </div>

                  {/* Hue Slider bar */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hue Color Channel</span>
                    <div 
                      ref={hueRef}
                      onMouseDown={(e) => {
                        setIsDraggingHue(true);
                        updateHue(e.clientX);
                      }}
                      onTouchStart={(e) => {
                        setIsDraggingHue(true);
                        updateHue(e.touches[0].clientX);
                      }}
                      style={{
                        background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
                      }}
                      className="w-full h-4 rounded-full relative select-none cursor-pointer border border-white/5"
                    >
                      {/* Hue handle */}
                      <div 
                        style={{
                          left: `${hueX}%`,
                        }}
                        className="absolute top-1/2 -translate-y-1/2 w-5.5 h-5.5 -ml-2.75 rounded-full border-3 border-white shadow-[0_0_6px_rgba(0,0,0,0.45)] pointer-events-none"
                      >
                        <div 
                          style={{ backgroundColor: `hsl(${h}, 100%, 50%)` }}
                          className="w-full h-full rounded-full"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Color preview card (Right Column) */}
                <div className="md:col-span-5 flex flex-col gap-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Palette Preview</span>
                    
                    <div 
                      style={{ backgroundColor: `hsl(${hslVal.h}, ${hslVal.s}%, ${hslVal.l}%)` }}
                      className="w-full h-24 rounded-xl shadow-inner border border-white/10 flex items-center justify-center transition-colors duration-150"
                    >
                      <span 
                        style={{ color: hslVal.l > 65 ? "oklch(0.12 0.01 250)" : "oklch(0.985 0 0)" }}
                        className="text-sm font-black uppercase tracking-widest select-none transition-colors duration-150"
                      >
                        {hexVal}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">HEX Code</span>
                        <span className="font-mono text-white font-bold">{hexVal}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                        <span className="text-muted-foreground">HSL Channels</span>
                        <span className="font-mono text-white font-bold">hsl({hslVal.h}, {hslVal.s}%, {hslVal.l}%)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                        <span className="text-muted-foreground">HSV Coordinates</span>
                        <span className="font-mono text-white font-bold">hsv({h}, {s}%, {v}%)</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-muted-foreground/60 leading-relaxed border-t border-white/5 pt-4">
                      This color is injected dynamically to styling hooks. Any components relying on primary colors (buttons, progress bars, rings) will immediately mirror your customized accent color.
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </SpotlightCard>
    </motion.div>
  );
}
