"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Palette,
  Wrench,
  Save,
  Database,
  Sliders,
  Keyboard,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { logAdminAction } from "@/lib/adminService";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "typing" | "system">("general");
  const [isLoading, setIsLoading] = useState(true);

  // General site configs
  const [siteName, setSiteName] = useState("Master Typing Pro");
  const [themePreset, setThemePreset] = useState("classic-dark");
  const [allowRegistration, setAllowRegistration] = useState(true);

  // Typing configs
  const [allowBackspace, setAllowBackspace] = useState(true);
  const [highlightErrors, setHighlightErrors] = useState(true);
  const [defaultDuration, setDefaultDuration] = useState(60);

  // System Configs
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [analyticsInterval, setAnalyticsInterval] = useState("daily");

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        if (!db) {
          setIsLoading(false);
          return;
        }

        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSiteName(data.siteName || "Master Typing Pro");
          setThemePreset(data.themePreset || "classic-dark");
          setAllowRegistration(data.allowRegistration !== false);
          setAllowBackspace(data.allowBackspace !== false);
          setHighlightErrors(data.highlightErrors !== false);
          setDefaultDuration(data.defaultDuration || 60);
          setMaintenanceMode(data.maintenanceMode || false);
          setAnalyticsInterval(data.analyticsInterval || "daily");
        }
      } catch (err) {
        console.error("Failed to fetch global settings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        siteName,
        themePreset,
        allowRegistration,
        allowBackspace,
        highlightErrors,
        defaultDuration,
        maintenanceMode,
        analyticsInterval,
        updatedAt: Date.now(),
      };

      if (db) {
        await setDoc(doc(db, "settings", "global"), payload, { merge: true });
      }

      await logAdminAction("Update Global Settings", "Modified system parameters console");
      toast.success("Settings Saved", {
        description: "Global system configuration updated successfully.",
      });
    } catch (err) {
      console.error("Failed to update global settings:", err);
      toast.error("Save Failed", { description: "An error occurred writing to cloud settings." });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            System Console
          </h1>
          <p className="text-sm text-slate-400">
            Control platform brand settings, typing tests controls, and main server switches.
          </p>
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-xl min-h-[500px]">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/40 p-4 space-y-1 bg-slate-950/15">
          {[
            { id: "general", label: "Branding & Presets", icon: Palette },
            { id: "typing", label: "Typing Engine", icon: Keyboard },
            { id: "system", label: "Maintenance Switches", icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-250 hover:bg-slate-900/40"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Forms */}
        <form onSubmit={handleSaveSettings} className="flex-1 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="w-1/3 h-5 bg-slate-800 rounded" />
                <div className="w-full h-10 bg-slate-850 rounded" />
                <div className="w-2/3 h-10 bg-slate-850 rounded" />
              </div>
            ) : (
              <>
                {/* 1. General Branding Presets */}
                {activeTab === "general" && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-indigo-400" /> Platform Styling & Brand
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Configure user-facing titles and logo presets.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Site Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Application Name</label>
                        <input
                          type="text"
                          value={siteName}
                          onChange={(e) => setSiteName(e.target.value)}
                          className="w-full max-w-md bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-slate-200"
                        />
                      </div>

                      {/* Theme Selection */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Default Theme Accent</label>
                        <select
                          value={themePreset}
                          onChange={(e) => setThemePreset(e.target.value)}
                          className="w-full max-w-md bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                        >
                          <option value="classic-dark">Classic Indigo Dark</option>
                          <option value="sunset-orange">Sunset Orange Glow</option>
                          <option value="cyber-blue">Cybernetic Neon Blue</option>
                          <option value="gold-master">Premium Gold Master</option>
                        </select>
                      </div>

                      {/* Registrations */}
                      <div className="flex items-center justify-between max-w-md py-3 border-b border-slate-850">
                        <div>
                          <h4 className="text-xs font-bold text-slate-350">Open Registrations</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Allow new students to register profiles.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowRegistration}
                          onChange={(e) => setAllowRegistration(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Typing Engine Settings */}
                {activeTab === "typing" && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Keyboard className="w-4 h-4 text-indigo-400" /> Typing Calculator Parameters
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Adjust accuracy check rules and test constraints.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Backspace parameter */}
                      <div className="flex items-center justify-between max-w-md py-3 border-b border-slate-850">
                        <div>
                          <h4 className="text-xs font-bold text-slate-350">Allow Backspace Correction</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Let typists modify mistyped words.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowBackspace}
                          onChange={(e) => setAllowBackspace(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                        />
                      </div>

                      {/* Error Highlight */}
                      <div className="flex items-center justify-between max-w-md py-3 border-b border-slate-850">
                        <div>
                          <h4 className="text-xs font-bold text-slate-350">Color-code Typo Highlight</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Red highlights for inaccurate letters.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={highlightErrors}
                          onChange={(e) => setHighlightErrors(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                        />
                      </div>

                      {/* Default Duration */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Default Trial Duration</label>
                        <select
                          value={defaultDuration}
                          onChange={(e) => setDefaultDuration(Number(e.target.value))}
                          className="w-full max-w-md bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                        >
                          <option value={30}>30 Seconds</option>
                          <option value={60}>60 Seconds</option>
                          <option value={120}>120 Seconds</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. System Telemetry & Maintenance */}
                {activeTab === "system" && (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-indigo-400" /> Maintenance & Diagnostics
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1">Control system status and operational states.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Maintenance Mode */}
                      <div className="flex items-center justify-between max-w-md py-3 border-b border-slate-850">
                        <div>
                          <h4 className="text-xs font-bold text-slate-350">Lock down (Maintenance Mode)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Prevent non-admin users from accessing tests.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={maintenanceMode}
                          onChange={(e) => setMaintenanceMode(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 bg-slate-950 border-slate-800 rounded focus:ring-indigo-500"
                        />
                      </div>

                      {/* Analytics Logs */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Audit Logs Aggregation</label>
                        <select
                          value={analyticsInterval}
                          onChange={(e) => setAnalyticsInterval(e.target.value)}
                          className="w-full max-w-md bg-slate-950/40 border border-slate-800 focus:border-indigo-500/50 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-200"
                        >
                          <option value="realtime">Real-time Logging</option>
                          <option value="daily">Daily Batch Sync</option>
                          <option value="weekly">Weekly Archiving</option>
                        </select>
                      </div>

                      {/* Firebase SDK Configs Info */}
                      <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-4 max-w-md space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-400" /> Firebase Connection
                        </h4>
                        <div className="text-[10px] text-slate-500 space-y-1.5 font-mono">
                          <div>API Key: *************************************</div>
                          <div>Project ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "master-typing-pro"}</div>
                          <div>Auth Domain: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "typing-pro.firebaseapp.com"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Submit */}
          <div className="mt-8 pt-4 border-t border-slate-850 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Save className="w-4.5 h-4.5" />
              Save Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
