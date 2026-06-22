"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { evaluatePasswordStrength, type PasswordStrength } from "@/lib/authService";

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = evaluatePasswordStrength(password);

  if (!password) return null;

  const colors: Record<number, string> = {
    0: "#ef4444",
    1: "#ef4444",
    2: "#f59e0b",
    3: "#22c55e",
    4: "#06b6d4",
  };

  const color = colors[strength.score] || "#ef4444";

  const criteria = [
    { key: "length", label: "At least 8 characters", met: strength.checks.length },
    { key: "uppercase", label: "Uppercase letter", met: strength.checks.uppercase },
    { key: "lowercase", label: "Lowercase letter", met: strength.checks.lowercase },
    { key: "number", label: "Number", met: strength.checks.number },
    { key: "symbol", label: "Special character", met: strength.checks.symbol },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-3 mt-2"
    >
      {/* Segment bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all duration-500 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: i < strength.score ? "100%" : "0%" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="h-full rounded-full"
                style={{ background: color }}
              />
            </div>
          ))}
        </div>
        <span
          className="text-[10px] font-black uppercase tracking-wider min-w-[50px] text-right"
          style={{ color }}
        >
          {strength.label}
        </span>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {criteria.map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            {c.met ? (
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            ) : (
              <X className="w-3 h-3 text-white/20 shrink-0" />
            )}
            <span
              className={`text-[10px] font-medium transition-colors ${
                c.met ? "text-emerald-400/80" : "text-white/25"
              }`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
