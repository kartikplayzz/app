"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, customColor } = useSettingsStore();

  useEffect(() => {
    // Apply the theme to the HTML tag
    document.documentElement.setAttribute("data-theme", theme);
    
    // For standard shadcn components that expect "dark" class
    if (theme !== "light") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Handle custom theme accent color overrides
    if (theme === "custom" && customColor) {
      const h = customColor.h;
      const sVal = customColor.s / 100;
      const vVal = customColor.v / 100;
      
      const l = (2 - sVal) * vVal / 2;
      const sl = sVal * vVal / (l < 0.5 ? l * 2 : 2 - l * 2) || 0;
      
      const s = Math.round(sl * 100);
      const lPct = Math.round(l * 100);
      
      // Determine accessible foreground contrast color
      const primaryFg = lPct > 65 ? "oklch(0.12 0.01 250)" : "oklch(0.985 0 0)";
      
      document.documentElement.style.setProperty("--primary", `hsl(${h} ${s}% ${lPct}%)`);
      document.documentElement.style.setProperty("--ring", `hsl(${h} ${s}% ${lPct}%)`);
      document.documentElement.style.setProperty("--primary-foreground", primaryFg);
      document.documentElement.style.setProperty("--border", `hsl(${h} ${s}% ${lPct}% / 0.15)`);
      document.documentElement.style.setProperty("--sidebar-primary", `hsl(${h} ${s}% ${lPct}%)`);
      document.documentElement.style.setProperty("--sidebar-ring", `hsl(${h} ${s}% ${lPct}%)`);
    } else {
      document.documentElement.style.removeProperty("--primary");
      document.documentElement.style.removeProperty("--ring");
      document.documentElement.style.removeProperty("--primary-foreground");
      document.documentElement.style.removeProperty("--border");
      document.documentElement.style.removeProperty("--sidebar-primary");
      document.documentElement.style.removeProperty("--sidebar-ring");
    }
  }, [theme, customColor]);

  return <>{children}</>;
}
