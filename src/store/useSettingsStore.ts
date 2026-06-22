import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface style_settings_var {
  input: string;
  layout: string;
  style: string;
  bg: string;
}

export interface global_settings_var {
  style: style_settings_var;
  bg: style_settings_var;
  input: style_settings_var;
  layout: style_settings_var;
}

export interface SettingsState {
  theme: string;
  soundEnabled: boolean;
  soundProfile: 'click' | 'blue' | 'red' | 'typewriter' | 'retro' | 'bubble';
  keyboardTheme: 'standard' | 'glass' | 'wobbly' | 'cartoon' | 'marble' | 'classic' | 'modern' | 'colorful';
  keyboardLayout: string;
  keyboardGuide: boolean;
  showHands: boolean;
  toolbarPosition: { x: number; y: number };
  customColor: { h: number; s: number; v: number };
  style: string;
  bg: string;
  input: string;
  layout: string;
  global_settings_var: global_settings_var;
  setTheme: (theme: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSoundProfile: (profile: SettingsState['soundProfile']) => void;
  setKeyboardTheme: (theme: SettingsState['keyboardTheme']) => void;
  setKeyboardLayout: (layout: string) => void;
  setKeyboardGuide: (guide: boolean) => void;
  setShowHands: (show: boolean) => void;
  setToolbarPosition: (position: { x: number; y: number }) => void;
  setCustomColor: (color: { h: number; s: number; v: number }) => void;
  setStyle: (style: string) => void;
  setBg: (bg: string) => void;
  setInput: (input: string) => void;
  setLayout: (layout: string) => void;
  setGlobalSettingsVar: (global_settings_var: global_settings_var) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark", // default theme
      soundEnabled: true,
      soundProfile: "click",
      keyboardTheme: "standard",
      keyboardLayout: "United States",
      keyboardGuide: true,
      showHands: true,
      toolbarPosition: { x: 0, y: 0 },
      customColor: { h: 250, s: 100, v: 100 },
      style: "default",
      bg: "default",
      input: "default",
      layout: "default",
      global_settings_var: {
        style: { input: "", layout: "", style: "", bg: "" },
        bg: { input: "", layout: "", style: "", bg: "" },
        input: { input: "", layout: "", style: "", bg: "" },
        layout: { input: "", layout: "", style: "", bg: "" }
      },
      setTheme: (theme) => set({ theme }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSoundProfile: (soundProfile) => set({ soundProfile }),
      setKeyboardTheme: (keyboardTheme) => set({ keyboardTheme }),
      setKeyboardLayout: (keyboardLayout) => set({ keyboardLayout }),
      setKeyboardGuide: (keyboardGuide) => set({ keyboardGuide }),
      setShowHands: (showHands) => set({ showHands }),
      setToolbarPosition: (toolbarPosition) => set({ toolbarPosition }),
      setCustomColor: (customColor) => set({ customColor }),
      setStyle: (style) => set({ style }),
      setBg: (bg) => set({ bg }),
      setInput: (input) => set({ input }),
      setLayout: (layout) => set({ layout }),
      setGlobalSettingsVar: (global_settings_var) => set({ global_settings_var }),
    }),
    {
      name: 'master-typing-settings',
      storage: createJSONStorage(() => localStorage), // fine for settings
    }
  )
);
