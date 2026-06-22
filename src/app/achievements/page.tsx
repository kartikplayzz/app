"use client";

import { useStatsStore } from "@/store/useStatsStore";
import { Trophy, Zap, Target, Medal, Star, Flame, Crown, Sword } from "lucide-react";
import { motion } from "framer-motion";

export default function AchievementsPage() {
  const { highestWpm, testsCompleted, level, recentTests } = useStatsStore();

  const hasFlawless = recentTests.some(test => test.accuracy === 100);

  const achievements = [
    {
      id: "first_steps",
      title: "First Steps",
      description: "Complete your very first typing test.",
      icon: Star,
      unlocked: testsCompleted >= 1,
      color: "from-blue-400 to-blue-600",
    },
    {
      id: "dedicated",
      title: "Dedicated",
      description: "Complete 10 typing tests.",
      icon: Medal,
      unlocked: testsCompleted >= 10,
      color: "from-purple-400 to-purple-600",
    },
    {
      id: "veteran",
      title: "Veteran",
      description: "Complete 50 typing tests.",
      icon: Sword,
      unlocked: testsCompleted >= 50,
      color: "from-red-400 to-red-600",
    },
    {
      id: "speed_demon",
      title: "Speed Demon",
      description: "Reach 80+ WPM on any test.",
      icon: Flame,
      unlocked: highestWpm >= 80,
      color: "from-orange-400 to-red-500",
    },
    {
      id: "sonic",
      title: "Sonic Typist",
      description: "Reach 120+ WPM on any test.",
      icon: Zap,
      unlocked: highestWpm >= 120,
      color: "from-cyan-400 to-blue-500",
    },
    {
      id: "godlike",
      title: "Godlike",
      description: "Reach 150+ WPM on any test.",
      icon: Crown,
      unlocked: highestWpm >= 150,
      color: "from-yellow-300 to-yellow-600",
    },
    {
      id: "flawless",
      title: "Flawless Execution",
      description: "Complete a test with 100% accuracy.",
      icon: Target,
      unlocked: hasFlawless,
      color: "from-green-400 to-emerald-600",
    },
    {
      id: "level_10",
      title: "Rising Star",
      description: "Reach Rank Level 10.",
      icon: Trophy,
      unlocked: level >= 10,
      color: "from-pink-400 to-rose-600",
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
          Achievements
        </h1>
        <p className="text-muted-foreground text-lg flex items-center gap-2">
          You have unlocked <strong className="text-foreground">{unlockedCount}/{achievements.length}</strong> badges.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {achievements.map((badge, idx) => {
          const Icon = badge.icon;
          const isUnlocked = badge.unlocked;

          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 flex items-center gap-6
                ${isUnlocked 
                  ? 'bg-foreground/5 border-foreground/10 hover:bg-foreground/10 shadow-[0_0_30px_rgba(255,255,255,0.02)]' 
                  : 'bg-black/20 border-foreground/5 opacity-60 grayscale'
                }
              `}
            >
              {/* Subtle background glow for unlocked items */}
              {isUnlocked && (
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${badge.color} opacity-10 blur-3xl rounded-full`} />
              )}

              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner
                ${isUnlocked ? `bg-gradient-to-br ${badge.color}` : 'bg-foreground/5 border border-foreground/10'}
              `}>
                <Icon className={`w-8 h-8 ${isUnlocked ? 'text-foreground' : 'text-foreground/30'}`} />
              </div>

              <div className="flex flex-col gap-1 z-10">
                <h3 className={`font-bold text-lg ${isUnlocked ? 'text-foreground' : 'text-foreground/50'}`}>
                  {badge.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {badge.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
