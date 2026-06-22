"use client";

import { motion } from "framer-motion";
import { Keyboard, Trophy, Flame, Target, TrendingUp } from "lucide-react";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

// ==========================================
// Sub-components
// ==========================================

interface WelcomeSectionProps {
  username: string;
}

function WelcomeSection({ username }: WelcomeSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
        Welcome back, {username}
      </h1>
      <p className="text-muted-foreground text-sm">
        Your typing skills are improving. Keep up the momentum!
      </p>
    </div>
  );
}

interface StatItem {
  name: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <SpotlightCard
          key={stat.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
          glowColor={
            stat.color.includes("blue") ? "rgba(59, 130, 246, 0.12)" :
            stat.color.includes("orange") ? "rgba(249, 115, 22, 0.12)" :
            stat.color.includes("yellow") ? "rgba(234, 179, 8, 0.12)" :
            stat.color.includes("green") ? "rgba(34, 197, 94, 0.12)" :
            "rgba(255, 255, 255, 0.05)"
          }
          className="glass-panel p-4 rounded-xl flex flex-col border border-white/5 relative overflow-hidden group hover:border-white/10 hover:bg-white/[0.01] transition-all duration-300 cursor-pointer"
        >
          {/* Background Glow */}
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity bg-current ${stat.color}`} />
          
          {/* Inner content wrapper to translate on hover without layout shifting the card boundaries */}
          <div className="flex flex-col gap-2 relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">{stat.name}</span>
              <div className={`p-2 rounded-xl bg-foreground/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
              <span className="text-green-400 text-[11px] font-medium bg-green-400/10 px-1.5 py-0.5 rounded">
                {stat.change}
              </span>
            </div>
          </div>
        </SpotlightCard>
      ))}
    </section>
  );
}

function RecentPerformanceCard() {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="lg:col-span-2 glass-panel rounded-xl p-4 min-h-[300px] flex flex-col relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Recent Performance
        </h2>
        <button className="text-xs bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-full transition-colors border border-foreground/10">
          View Detailed Report
        </button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full">
        <PerformanceChart />
      </div>
    </motion.section>
  );
}

interface Challenge {
  title: string;
  desc: string;
  progress: number;
  reward: string;
}

interface DailyChallengesCardProps {
  challenges: Challenge[];
}

function DailyChallengesCard({ challenges }: DailyChallengesCardProps) {
  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="glass-panel rounded-xl p-4 flex flex-col gap-4"
    >
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Trophy className="text-yellow-500" />
        Daily Challenges
      </h2>
      
      <div className="space-y-3">
        {challenges.map((challenge) => (
          <div key={challenge.title} className="bg-foreground/5 border border-foreground/5 p-3 rounded-lg hover:bg-foreground/10 transition-colors cursor-pointer">
            <div className="flex justify-between items-start mb-1.5">
              <h3 className="font-semibold text-sm">{challenge.title}</h3>
              <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded font-medium">{challenge.reward}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{challenge.desc}</p>
            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${challenge.progress}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              />
            </div>
          </div>
        ))}
      </div>

      <button className="mt-auto w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(var(--primary),0.3)]">
        Start AI Practice Session
      </button>
    </motion.section>
  );
}

// ==========================================
// Main Page component
// ==========================================

export default function Dashboard() {
  const { xp, level, testsCompleted, highestWpm, recentTests } = useStatsStore();
  const { username } = useUserStore();

  // Calculate real trends for the stats cards
  const recentTestsCount = recentTests.length;
  const lastTest = recentTestsCount > 0 ? recentTests[0] : null;
  const prevTest = recentTestsCount > 1 ? recentTests[1] : null;

  let accuracyChange = "No data";
  if (lastTest && prevTest) {
    const diff = lastTest.accuracy - prevTest.accuracy;
    accuracyChange = diff > 0 ? `+${diff}%` : `${diff}%`;
  } else if (lastTest) {
    accuracyChange = "Baseline";
  }

  const stats: StatItem[] = [
    { name: "Tests Completed", value: testsCompleted.toString(), change: recentTestsCount > 0 ? "Active" : "Start typing!", icon: Keyboard, color: "text-blue-500" },
    { name: "Highest WPM", value: highestWpm.toString(), change: lastTest && lastTest.wpm >= highestWpm ? "New Record!" : "All-time Best", icon: Flame, color: "text-orange-500" },
    { name: "Current Level", value: level.toString(), change: `${xp} Total XP`, icon: Trophy, color: "text-yellow-500" },
    { name: "Latest Accuracy", value: lastTest ? `${lastTest.accuracy}%` : "0%", change: accuracyChange, icon: Target, color: "text-green-500" },
  ];

  const challenges: Challenge[] = [
    { 
      title: "Speed Demon", 
      desc: "Reach 120 WPM", 
      progress: Math.min(Math.round((highestWpm / 120) * 100), 100), 
      reward: "500 XP" 
    },
    { 
      title: "Consistent Practitioner", 
      desc: "Complete 10 typing tests", 
      progress: Math.min(Math.round((testsCompleted / 10) * 100), 100), 
      reward: "300 XP" 
    },
    { 
      title: "Accuracy Master", 
      desc: "Achieve 100% accuracy on a test", 
      progress: recentTests.some(t => t.accuracy === 100) ? 100 : (recentTests.length > 0 ? recentTests[0].accuracy : 0), 
      reward: "800 XP" 
    },
  ];

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1">
      <WelcomeSection username={username} />
      <StatsGrid stats={stats} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <RecentPerformanceCard />
        <DailyChallengesCard challenges={challenges} />
      </div>
    </div>
  );
}
