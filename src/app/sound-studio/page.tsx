"use client";
import { useState } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Music, Volume2, Sparkles, Check, Play, Keyboard } from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface SoundProfile {
  id: 'click' | 'blue' | 'red' | 'typewriter' | 'retro' | 'bubble';
  name: string;
  desc: string;
  type: string;
  vol: string;
}

export default function SoundStudioPage() {
  const { soundEnabled, setSoundEnabled, soundProfile, setSoundProfile } = useSettingsStore();
  const [sandboxText, setSandboxText] = useState("");

  const profiles: SoundProfile[] = [
    { id: "click", name: "Standard Click", desc: "Default metallic click audio file playback.", type: "Sample MP3", vol: "Medium" },
    { id: "blue", name: "Cherry MX Blue", desc: "Crisp tactile switch click with spring release bottom out.", type: "Synthesized", vol: "Loud" },
    { id: "red", name: "Cherry MX Red", desc: "Quiet linear switch sound with muffled bottom out.", type: "Synthesized", vol: "Soft" },
    { id: "typewriter", name: "Vintage Typewriter", desc: "Mechanical hammer strike with a slight metallic ring.", type: "Synthesized", vol: "Medium" },
    { id: "retro", name: "Retro Beep", desc: "Short square-wave electronic beep from vintage arcade units.", type: "Synthesized", vol: "Soft" },
    { id: "bubble", name: "Bubble Click", desc: "Rounded sine-wave organic pop sound.", type: "Synthesized", vol: "Medium" }
  ];

  // Synthesize sounds for quick preview on key hover/click
  const playPreviewSound = (id: typeof soundProfile) => {
    if (!soundEnabled) return;

    if (id === "click") {
      const audio = new Audio("/sounds/click.mp3");
      audio.volume = 0.15;
      audio.play().catch(() => {});
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const audioCtx = new AudioCtx();

        if (id === "blue") {
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = "triangle";
          osc1.frequency.setValueAtTime(1200, audioCtx.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
          gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
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
          gain2.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.015);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.start(audioCtx.currentTime + 0.015);
          osc2.stop(audioCtx.currentTime + 0.06);
        } else if (id === "red") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(150, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.04);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.04);
        } else if (id === "typewriter") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(350, audioCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.08);
        } else if (id === "retro") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(440, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.06);
        } else if (id === "bubble") {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, audioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.07);
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.07);
        }
      } catch (err) {
        console.error("Web Audio playback failed", err);
      }
    }
  };

  const handleSelectProfile = (id: typeof soundProfile) => {
    setSoundProfile(id);
    playPreviewSound(id);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace") {
      playPreviewSound(soundProfile); // or separate backspace click
    } else if (e.key.length === 1 || e.key === "Enter" || e.key === " ") {
      playPreviewSound(soundProfile);
    }
  };

  // Keyboard preview key layouts (Row QWERTY)
  const virtualKeys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
    ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"]
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 px-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 flex items-center gap-3">
          <Music className="w-9 h-9 text-primary animate-pulse" />
          Sound Customization Studio
        </h1>
        <p className="text-muted-foreground text-lg">
          Personalize mechanical key switch profiles and audio feedback for typing tests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Left: Sound Profile Catalog */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Master Volume toggle */}
          <SpotlightCard
            glowColor="rgba(255, 255, 255, 0.04)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center justify-between shrink-0"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20 shrink-0">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Audio Feedback</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">Toggle mechanical key clicks during sessions.</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={soundEnabled}
                onChange={() => setSoundEnabled(!soundEnabled)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6366F1]" />
            </label>
          </SpotlightCard>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow overflow-y-auto max-h-[380px] pr-1">
            {profiles.map((p) => {
              const isActive = soundProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id)}
                  disabled={!soundEnabled}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl border text-left transition-all duration-300 group ${
                    !soundEnabled ? "opacity-35 cursor-not-allowed border-white/5 bg-black/10" :
                    isActive
                      ? "border-primary bg-primary/[0.06] shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                      : "border-white/5 bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/15"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-black transition-colors ${
                        isActive ? "text-primary" : "text-white group-hover:text-white"
                      }`}>{p.name}</span>
                      <span className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wider font-bold">{p.type} · Vol: {p.vol}</span>
                    </div>
                    {isActive && (
                      <div className="w-5.5 h-5.5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 leading-normal">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Keyboard Switch Tester & Sandbox */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Keyboard Switch virtual keycaps */}
          <SpotlightCard
            glowColor="rgba(168, 85, 247, 0.08)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <Keyboard className="w-4.5 h-4.5 text-primary" />
              <span className="text-xs font-extrabold text-white uppercase tracking-widest">Virtual Keycap Tester</span>
            </div>

            <div className="flex flex-col gap-2.5 mt-2 w-full max-w-sm mx-auto select-none">
              {virtualKeys.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-1.5 justify-center" style={{ paddingLeft: `${rIdx * 12}px` }}>
                  {row.map((k) => (
                    <motion.button
                      key={k}
                      whileHover={{ scale: 1.1, zIndex: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => playPreviewSound(soundProfile)}
                      onClick={() => playPreviewSound(soundProfile)}
                      disabled={!soundEnabled}
                      className="w-8 h-8 rounded bg-white/[0.02] border border-white/5 hover:border-primary/40 text-[10px] font-black text-white/90 hover:text-white transition-all shadow-[0_1px_2px_rgba(0,0,0,0.5)] cursor-pointer uppercase flex items-center justify-center select-none"
                    >
                      {k}
                    </motion.button>
                  ))}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] text-muted-foreground/60 font-semibold border-t border-white/5 pt-3.5 mt-2">
              <span>Hover or click switches to fire trigger sound</span>
              <span>Audio Synthesis Mode</span>
            </div>
          </SpotlightCard>

          {/* Sandbox Input test */}
          <SpotlightCard
            glowColor="rgba(255, 255, 255, 0.04)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-3 flex-grow"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span>Typing Sandbox Testing Area</span>
            </div>
            <textarea
              value={sandboxText}
              onChange={(e) => setSandboxText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={!soundEnabled}
              placeholder={soundEnabled ? "Start typing standard letters in this sandbox to test keycap repeat latency..." : "Enable audio feedback to unlock sandbox typing..."}
              className="w-full h-24 bg-foreground/5 border border-foreground/10 rounded-xl p-3.5 text-xs text-foreground placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono resize-none leading-relaxed"
            />
            <button
              onClick={() => setSandboxText("")}
              className="text-[9px] text-muted-foreground hover:text-white uppercase font-black tracking-wider text-right transition-colors"
            >
              Clear Sandbox
            </button>
          </SpotlightCard>
        </div>
      </div>
    </motion.div>
  );
}
