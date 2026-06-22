"use client";

import { LibrarySection } from "@/components/typing/LibrarySection";
import { motion } from "framer-motion";

export default function HistoryPage() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1"
    >
      <div className="flex flex-col gap-2 px-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Typing Test Library
        </h1>
        <p className="text-muted-foreground text-lg">
          Review your past performance history, analyze speed metrics, check your rank level progression, and study insights.
        </p>
      </div>

      <LibrarySection />
    </motion.div>
  );
}
