"use client";
import { useState, useEffect } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { Trophy, Award, Target, Flame, Play, Sparkles, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface Challenge {
  id: string;
  title: string;
  description: string;
  reward: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  checkProgress: (store: ReturnType<typeof useStatsStore.getState>) => { current: number; target: number; percentage: number };
}

export default function ChallengesPage() {
  const store = useStatsStore();
  const { addXp, highestWpm, testsCompleted, level, recentTests } = store;

  // List of challenges
  const challenges: Challenge[] = [
    {
      id: "speed_demon_120",
      title: "Speed Demon",
      description: "Reach 120 WPM on any typing test.",
      reward: 500,
      icon: Flame,
      color: "from-orange-500 to-red-500",
      checkProgress: (s) => {
        const cur = s.highestWpm;
        const tar = 120;
        return { current: cur, target: tar, percentage: Math.min(100, Math.round((cur / tar) * 100)) };
      }
    },
    {
      id: "practitioner_10",
      title: "Consistent Practitioner",
      description: "Complete 10 typing tests.",
      reward: 300,
      icon: Award,
      color: "from-blue-500 to-cyan-500",
      checkProgress: (s) => {
        const cur = s.testsCompleted;
        const tar = 10;
        return { current: cur, target: tar, percentage: Math.min(100, Math.round((cur / tar) * 100)) };
      }
    },
    {
      id: "accuracy_100",
      title: "Accuracy Master",
      description: "Achieve 100% accuracy on a test.",
      reward: 800,
      icon: Target,
      color: "from-green-500 to-emerald-500",
      checkProgress: (s) => {
        const hasFlawless = s.recentTests.some(t => t.accuracy === 100);
        return { current: hasFlawless ? 1 : 0, target: 1, percentage: hasFlawless ? 100 : 0 };
      }
    },
    {
      id: "legendary_150",
      title: "Legendary Typist",
      description: "Reach 150 WPM on any typing test.",
      reward: 2000,
      icon: Trophy,
      color: "from-yellow-400 to-amber-500",
      checkProgress: (s) => {
        const cur = s.highestWpm;
        const tar = 150;
        return { current: cur, target: tar, percentage: Math.min(100, Math.round((cur / tar) * 100)) };
      }
    },
    {
      id: "marathon_50",
      title: "Typing Marathon",
      description: "Complete 50 typing tests.",
      reward: 1500,
      icon: Award,
      color: "from-purple-500 to-indigo-500",
      checkProgress: (s) => {
        const cur = s.testsCompleted;
        const tar = 50;
        return { current: cur, target: tar, percentage: Math.min(100, Math.round((cur / tar) * 100)) };
      }
    },
    {
      id: "rank_master_10",
      title: "Rank Master",
      description: "Reach level 10.",
      reward: 1200,
      icon: Trophy,
      color: "from-pink-500 to-rose-500",
      checkProgress: (s) => {
        const cur = s.level;
        const tar = 10;
        return { current: cur, target: tar, percentage: Math.min(100, Math.round((cur / tar) * 100)) };
      }
    }
  ];

  const [claimedIds, setClaimedIds] = useState<string[]>([]);

  useEffect(() => {
    // Load claimed list
    const claimed: string[] = [];
    challenges.forEach((c) => {
      if (localStorage.getItem(`challenge_claimed_${c.id}`) === "true") {
        claimed.push(c.id);
      }
    });
    setClaimedIds(claimed);
  }, []);

  const handleClaim = (id: string, reward: number) => {
    if (claimedIds.includes(id)) return;
    addXp(reward);
    localStorage.setItem(`challenge_claimed_${id}`, "true");
    setClaimedIds((prev) => [...prev, id]);
  };

  const unlockedCount = challenges.filter(c => c.checkProgress(store).percentage === 100).length;

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
          <Trophy className="w-9 h-9 text-yellow-500 animate-bounce" />
          Milestones & Challenges
        </h1>
        <p className="text-muted-foreground text-lg">
          Complete seasonal curriculum milestones to earn bonus XP and power up your rank level.
        </p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((c) => {
          const { current, target, percentage } = c.checkProgress(store);
          const isCompleted = percentage === 100;
          const isClaimed = claimedIds.includes(c.id);
          const Icon = c.icon;

          return (
            <SpotlightCard
              key={c.id}
              glowColor={isClaimed ? "rgba(34, 197, 94, 0.05)" : isCompleted ? "rgba(234, 179, 8, 0.12)" : "rgba(255, 255, 255, 0.04)"}
              className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between group transition-all duration-300 relative overflow-hidden h-[210px] ${
                isClaimed
                  ? "bg-emerald-500/[0.01] border-emerald-500/10 opacity-70"
                  : isCompleted
                  ? "bg-yellow-500/[0.02] border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.08)]"
                  : "bg-white/[0.015] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
              }`}
            >
              {/* background design */}
              <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${c.color}`} />

              <div className="flex flex-col gap-4 relative z-10 w-full">
                <div className="flex justify-between items-start">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${c.color} shadow-inner`}>
                    <Icon className="w-5.5 h-5.5 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    +{c.reward} XP
                  </span>
                </div>

                <div className="flex flex-col">
                  <h3 className="font-extrabold text-base text-white truncate leading-tight">{c.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-normal">{c.description}</p>
                </div>
              </div>

              {/* Progress Slider */}
              <div className="flex flex-col gap-2 relative z-10 w-full pt-4 mt-auto">
                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground">
                  <span>Progress: {current} / {target}</span>
                  <span className={isCompleted ? "text-yellow-500" : ""}>{percentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full bg-gradient-to-r ${c.color} transition-all duration-1000`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Claim Rewards */}
                {isCompleted ? (
                  isClaimed ? (
                    <div className="flex items-center gap-1.5 justify-end text-[10px] text-green-400 font-bold uppercase tracking-wider mt-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Reward Claimed</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaim(c.id, c.reward)}
                      className="mt-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-wider text-[10px] py-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.3)] cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 animate-spin" />
                      Claim {c.reward} XP Reward
                    </button>
                  )
                ) : (
                  <div className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider text-right mt-1.5">
                    In Progress
                  </div>
                )}
              </div>
            </SpotlightCard>
          );
        })}
      </div>
    </motion.div>
  );
}
