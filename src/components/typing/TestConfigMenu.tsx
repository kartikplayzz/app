"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, AlignLeft, Settings, Play } from "lucide-react";

interface TestConfigMenuProps {
  onStart: (timeLimit: number, textMode: string, customTextPayload?: string) => void;
}

const TIME_OPTIONS = [
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
  { label: "4m", value: 240 },
  { label: "5m", value: 300 },
  { label: "10m", value: 600 },
  { label: "30m", value: 1800 },
  { label: "Custom", value: "custom" },
];

const TEXT_MODES = [
  { id: "short", label: "Short Paragraph", desc: "A quick burst of text (~20 words)." },
  { id: "medium", label: "Medium Paragraph", desc: "A standard test length (~50 words)." },
  { id: "long", label: "Long Paragraph", desc: "For endurance testing (~100 words)." },
  { id: "code", label: "Programming", desc: "Includes symbols, numbers, and brackets." },
  { id: "web", label: "Wikipedia Extract", desc: "Fetches a random real-world article." },
  { id: "custom", label: "Custom Text", desc: "Paste your own text to type." },
];

export function TestConfigMenu({ onStart }: TestConfigMenuProps) {
  const [selectedTime, setSelectedTime] = useState<number | "custom">(60);
  const [customTime, setCustomTime] = useState<number>(15); // Default custom 15s
  const [selectedMode, setSelectedMode] = useState<string>("medium");
  const [customText, setCustomText] = useState<string>("");

  const handleStart = () => {
    const timeToPass = selectedTime === "custom" ? customTime : selectedTime;
    onStart(timeToPass, selectedMode, selectedMode === "custom" ? customText : undefined);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8">
      <div className="glass-panel p-8 rounded-3xl flex flex-col lg:flex-row gap-12">
        
        {/* Left Section: Time Options */}
        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Duration
          </h2>

          <div className="grid grid-cols-4 gap-3">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setSelectedTime(opt.value as number | "custom")}
                className={`p-3 rounded-xl font-medium transition-all ${
                  selectedTime === opt.value
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                    : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground border border-foreground/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedTime === "custom" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-4 mt-2"
            >
              <input 
                type="number" 
                value={customTime}
                onChange={(e) => setCustomTime(Number(e.target.value) || 1)}
                className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter seconds..."
                min="1"
              />
              <span className="text-muted-foreground font-medium">seconds</span>
            </motion.div>
          )}
        </div>

        <div className="hidden lg:block w-px bg-foreground/10 self-stretch" />

        {/* Middle Section: Paragraph Mode */}
        <div className="flex-1 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-primary" />
            Paragraph Mode
          </h2>
          <div className="flex flex-col gap-3">
            {TEXT_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-4 rounded-xl text-left transition-all flex flex-col gap-1 ${
                  selectedMode === mode.id
                    ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.2)] border"
                    : "bg-foreground/5 border-foreground/5 hover:bg-foreground/10 border"
                }`}
              >
                <span className={`font-semibold ${selectedMode === mode.id ? "text-primary" : "text-foreground"}`}>
                  {mode.label}
                </span>
                <span className="text-xs text-muted-foreground">{mode.desc}</span>
              </button>
            ))}

            {selectedMode === "custom" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }}
                className="mt-2"
              >
                <textarea 
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  className="w-full h-32 bg-foreground/5 border border-foreground/10 rounded-xl p-4 text-foreground placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  placeholder="Paste your custom text here..."
                />
              </motion.div>
            )}
          </div>
        </div>

      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStart}
        className="self-center flex items-center gap-3 bg-white text-black hover:bg-gray-200 px-12 py-5 rounded-2xl font-bold text-xl transition-colors shadow-[0_0_30px_rgba(255,255,255,0.3)]"
      >
        <Play className="w-6 h-6" />
        Start Typing Test
      </motion.button>
    </div>
  );
}
