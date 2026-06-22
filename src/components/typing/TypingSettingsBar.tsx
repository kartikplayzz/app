"use client";

import { useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { RotateCcw, Keyboard as KeyboardIcon, Hand, Volume2, VolumeX, PaintBucket, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TypingSettingsBarProps {
  onRestart: () => void;
}

const THEMES = [
  { id: "standard", label: "Standard", preview: "border-white/20 bg-background" },
  { id: "glass", label: "Glass", preview: "rounded-full border-white/20 bg-white/5" },
  { id: "wobbly", label: "Wobbly", preview: "rounded-[10px_5px_15px_5px] border-white/20 bg-transparent" },
  { id: "cartoon", label: "Cartoon", preview: "bg-white text-black font-bold border-b-4 border-gray-300" },
  { id: "marble", label: "Marble", preview: "bg-gradient-to-br from-white to-gray-200 text-black shadow-md" },
  { id: "classic", label: "Classic", preview: "bg-[#e5e5e5] text-[#333] border-b-4 border-[#ccc] rounded-md shadow-sm" },
  { id: "modern", label: "Modern", preview: "bg-white text-gray-500 border border-gray-200 rounded-none" },
  { id: "colorful", label: "Colorful", preview: "bg-gray-800 text-white font-black" },
];

interface NavButtonProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  activeTab: string | null;
  showHands: boolean;
  soundEnabled: boolean;
  onClick: (id: string) => void;
}

function NavButton({ id, icon: Icon, activeTab, showHands, soundEnabled, onClick }: NavButtonProps) {
  const isActive = activeTab === id;
  let isToggledOn = false;
  if (id === "hand") isToggledOn = showHands;
  if (id === "sound") isToggledOn = soundEnabled;

  return (
    <motion.button 
      onClick={() => onClick(id)}
      whileHover={{ scale: 1.15, y: -2 }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`flex justify-center items-center p-2 transition-colors duration-200 border-b-2 ${
        isActive ? "border-[#a855f7] text-[#a855f7]" : "border-transparent text-muted-foreground hover:text-foreground"
      } ${isToggledOn && !isActive ? "text-[#a855f7]" : ""}`}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  );
}

export function TypingSettingsBar({ onRestart }: TypingSettingsBarProps) {
  const { 
    keyboardTheme, setKeyboardTheme, 
    keyboardLayout, setKeyboardLayout,
    keyboardGuide, setKeyboardGuide,
    showHands, setShowHands,
    soundEnabled, setSoundEnabled
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<string | null>(null);

  const toggleTab = (tab: string) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  const handleAction = (tab: string) => {
    if (tab === "restart") {
      onRestart();
      setActiveTab(null);
    } else if (tab === "hand") {
      setShowHands(!showHands);
    } else if (tab === "sound") {
      setSoundEnabled(!soundEnabled);
    } else {
      toggleTab(tab);
    }
  };

  return (
    <div className="relative z-50 flex items-center justify-center">
      {/* Icons */}
      <div className="flex items-center gap-4">
        {/* We can add a Pause button later if needed, but for now stick to these */}
        <NavButton id="restart" icon={RotateCcw} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
        <NavButton id="keyboard" icon={KeyboardIcon} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
        <NavButton id="hand" icon={Hand} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
        <NavButton id="sound" icon={soundEnabled ? Volume2 : VolumeX} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
        <NavButton id="theme" icon={PaintBucket} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
        <NavButton id="settings" icon={Settings} activeTab={activeTab} showHands={showHands} soundEnabled={soundEnabled} onClick={handleAction} />
      </div>

      {/* Expanded Panel */}
      <AnimatePresence>
        {activeTab === "keyboard" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#0b0f19] border border-white/5 rounded-xl shadow-2xl absolute right-0 top-[calc(100%+1rem)] w-[320px] md:w-[400px] cursor-default z-[60]"
          >
            <div className="p-6 flex flex-col gap-6">
              
              {/* Keyboard Guide Toggle */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-[#a855f7] font-medium">Keyboard Guide</span>
                <button 
                  onClick={() => setKeyboardGuide(!keyboardGuide)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${keyboardGuide ? "bg-[#a855f7]" : "bg-white/20"}`}
                >
                  <motion.div 
                    className="w-4 h-4 bg-white rounded-full"
                    animate={{ x: keyboardGuide ? 24 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* Keyboard Layout */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <span className="text-[#a855f7] font-medium">Keyboard Layout</span>
                <div className="flex items-center gap-2 text-[#a855f7] font-medium cursor-pointer hover:text-[#a855f7]/80">
                  <KeyboardIcon className="w-4 h-4" />
                  <span>{keyboardLayout}</span>
                </div>
              </div>

              {/* Themes Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                {THEMES.map((theme) => {
                  const isSelected = keyboardTheme === theme.id;
                  return (
                    <div 
                      key={theme.id}
                      onClick={() => setKeyboardTheme(theme.id as "standard" | "glass" | "wobbly" | "cartoon" | "marble" | "classic" | "modern" | "colorful")}
                      className="flex flex-col items-center gap-3 cursor-pointer group"
                    >
                      {/* Theme Preview Icon */}
                      <div className="relative">
                        <div className="grid grid-cols-2 gap-1 p-2 rounded-lg bg-[#111827] border border-white/5">
                          {["Q", "W", "A", "S"].map((char) => (
                            <div key={char} className={`w-8 h-8 flex items-center justify-center text-xs border ${theme.preview}`}>
                              {char}
                            </div>
                          ))}
                        </div>
                      </div>
                      <span className={`text-sm transition-colors ${isSelected ? "text-[#a855f7] font-bold" : "text-muted-foreground group-hover:text-foreground"}`}>
                        {theme.label}
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
