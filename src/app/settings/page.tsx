"use client";

import { useSettingsStore } from "@/store/useSettingsStore";
import { Volume2 } from "lucide-react";

export default function SettingsPage() {
  const { soundEnabled, setSoundEnabled } = useSettingsStore();

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Settings
        </h1>
        <p className="text-muted-foreground text-lg">
          Configure your typing environment and data.
        </p>
      </div>

      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
        
        {/* Audio */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Audio
          </h2>
          <div className="flex items-center justify-between p-4 bg-foreground/5 rounded-xl border border-foreground/5">
            <div>
              <h3 className="font-medium text-foreground">Typing Sounds</h3>
              <p className="text-sm text-muted-foreground">Play mechanical keyboard sounds while typing.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={soundEnabled} 
                onChange={() => setSoundEnabled(!soundEnabled)} 
              />
              <div className="w-11 h-6 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6366F1]"></div>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}
