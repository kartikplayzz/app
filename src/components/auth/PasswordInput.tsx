"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "••••••••",
  label,
  error,
  autoComplete = "current-password",
  disabled = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  const hasValue = value.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wider text-white/50"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`w-full bg-white/[0.04] rounded-2xl px-5 py-3.5 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 border ${
            error
              ? "border-red-500/60 shadow-[0_0_16px_rgba(239,68,68,0.15)]"
              : focused
              ? "border-[#6366F1]/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
              : "border-white/[0.06] hover:border-white/10"
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          disabled={disabled}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1 disabled:opacity-40 disabled:pointer-events-none"
          tabIndex={-1}
        >
          {visible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-red-400 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
