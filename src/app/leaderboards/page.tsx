"use client";
import { useState, useMemo, useEffect } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { Medal, Trophy, Star, ShieldAlert, ArrowUpRight, Search } from "lucide-react";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { type: "spring" as const, stiffness: 350, damping: 25 } 
  }
};

interface TypistRank {
  rank: number;
  name: string;
  wpm: number;
  accuracy: number;
  level: number;
  badge: string;
  isVerified?: boolean;
  isUser?: boolean;
  uid?: string;
}



export default function LeaderboardsPage() {
  const { level, highestWpm, recentTests } = useStatsStore();
  const { username, isAdmin: currentIsAdmin } = useUserStore();

  const [activeBoard, setActiveBoard] = useState<"daily" | "weekly" | "all-time">("all-time");
  const [searchQuery, setSearchQuery] = useState("");
  const [realUsers, setRealUsers] = useState<Omit<TypistRank, "rank">[]>([]);
  const [loadingReal, setLoadingReal] = useState(true);

  // Subscribe to real users stats in Firestore in real-time
  useEffect(() => {
    if (!db) {
      setLoadingReal(false);
      return;
    }
    const usersRef = collection(db, "users");
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const fetched: Omit<TypistRank, "rank">[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.username && !data.displayName) return; // skip uninitialized records
        
        const stats = data.stats || {};
        const wpm = stats.highestWpm ?? 0;
        const lvl = stats.level ?? 1;
        const usernameStr = data.username || data.displayName || "Unknown Typist";
        
        // Filter out administrator accounts from displaying on the leaderboard
        if (data.isAdmin === true || usernameStr.toLowerCase().includes("admin")) {
          return;
        }

        // Find best test accuracy
        let accuracy = 95;
        if (stats.recentTests && stats.recentTests.length > 0) {
          const bestTest = [...stats.recentTests].sort((a: any, b: any) => b.wpm - a.wpm)[0];
          if (bestTest) {
            accuracy = bestTest.accuracy ?? 95;
          }
        }
        
        fetched.push({
          name: usernameStr,
          wpm,
          accuracy,
          level: lvl,
          badge: lvl >= 30 ? "Master" : lvl >= 20 ? "Expert" : lvl >= 10 ? "Intermediate" : "Beginner",
          isVerified: wpm > 0,
          uid: data.uid || doc.id
        });
      });
      setRealUsers(fetched);
      setLoadingReal(false);
    }, (err) => {
      console.error("Leaderboards: Realtime fetch failed:", err);
      setLoadingReal(false);
    });

    return () => unsubscribe();
  }, []);

  const verifiedBestTest = useMemo(() => {
    return [...recentTests]
      .filter((test) => {
        const legacyEligible = test.verified === undefined && test.leaderboardEligible === undefined;
        return test.accuracy >= 95 && (test.leaderboardEligible || (test.type !== "lesson" && legacyEligible));
      })
      .sort((a, b) => b.wpm - a.wpm)[0];
  }, [recentTests]);

  const leaderboardData = useMemo(() => {
    // Insert user dynamically based on verified leaderboard-eligible records.
    const userWpm = verifiedBestTest?.wpm ?? highestWpm ?? 0;
    
    // Find best accuracy among recent tests as fallback
    const bestRecentTest = [...recentTests].sort((a, b) => b.wpm - a.wpm)[0];
    const userAccuracy = verifiedBestTest?.accuracy ?? bestRecentTest?.accuracy ?? 0;

    const userProfile: Omit<TypistRank, "rank"> = {
      name: `${username || "Guest User"} (You)`,
      wpm: userWpm,
      accuracy: userAccuracy,
      level: level,
      badge: level >= 30 ? "Master" : level >= 20 ? "Expert" : level >= 10 ? "Intermediate" : "Beginner",
      isVerified: userWpm > 0,
      isUser: true,
    };

    // Filter other real users to exclude the current logged-in user to prevent duplicates
    const currentUid = auth?.currentUser?.uid;
    const otherRealUsers = realUsers.filter((item) => {
      if (currentUid && item.uid === currentUid) return false;
      if (item.name === username) return false;
      return true;
    });

    // Combine other database users
    const combined = [...otherRealUsers];
    
    // Find if user is already matching in speed or insert them
    const userIndex = combined.findIndex(item => item.isUser);
    if (userIndex !== -1) combined.splice(userIndex, 1);
    
    // Only add user profile if the current user is not an administrator
    const isCurrentUserAdmin = currentIsAdmin || username.toLowerCase().includes("admin");
    if (!isCurrentUserAdmin) {
      combined.push(userProfile);
    }
    
    // Sort descending by WPM
    combined.sort((a, b) => b.wpm - a.wpm);
    
    // Assign ranks
    const ranked: TypistRank[] = combined.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    // Filter by search query
    return ranked.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [level, username, searchQuery, verifiedBestTest, realUsers]);

  const userRanking = useMemo(() => {
    const user = leaderboardData.find(item => item.isUser);
    return user ? user.rank : 999;
  }, [leaderboardData]);

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
          <Medal className="w-9 h-9 text-primary animate-bounce" />
          Competitive Leaderboards
        </h1>
        <p className="text-muted-foreground text-lg">
          See where you stack up against the fastest typists. Improve your WPM record to rank up.
        </p>
      </div>

      {/* Board controls and search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Board switcher */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl w-fit select-none">
          {(["daily", "weekly", "all-time"] as const).map((board) => (
            <button
              key={board}
              onClick={() => setActiveBoard(board)}
              className={`relative px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors duration-200 z-10 ${
                activeBoard === board ? "text-primary-foreground" : "text-muted-foreground hover:text-white"
              }`}
            >
              {activeBoard === board && (
                <motion.div
                  layoutId="activeBoardBg"
                  className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-[0_0_12px_rgba(var(--primary),0.3)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {board === "all-time" ? "All-Time Records" : `${board} Standings`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search typists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[400px]">
        {/* Left: Leaderboards Grid */}
        <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden h-full">
          {/* Header Row */}
          <div className="bg-white/[0.015] border-b border-white/5 px-6 py-4 flex items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest shrink-0">
            <span className="w-12 text-center">Rank</span>
            <span className="flex-1 pl-4">Typist Name</span>
            <span className="w-24 text-center">Rank Level</span>
            <span className="w-24 text-center">Accuracy</span>
            <span className="w-28 text-right">Speed Record</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto pr-1">
            {leaderboardData.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="flex flex-col"
              >
                {leaderboardData.map((item) => {
                  const isTop3 = item.rank <= 3;
                  const medalEmoji = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : item.rank === 3 ? "🥉" : null;

                  return (
                    <motion.div
                      key={item.name}
                      variants={itemVariants}
                      whileHover={{ 
                        y: -2,
                        z: 10,
                        scale: 1.008,
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                        borderColor: "rgba(255, 255, 255, 0.08)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={`px-6 py-3.5 flex items-center border-b border-white/5 last:border-0 text-sm font-semibold transition-all relative ${
                        item.isUser ? "bg-primary/5 text-primary" : "text-foreground"
                      }`}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {/* Rank Column */}
                      <span className="w-12 text-center text-xs font-black">
                        {medalEmoji ? (
                          <span className="text-lg leading-none">{medalEmoji}</span>
                        ) : (
                          <span className="text-muted-foreground/60">{item.rank}</span>
                        )}
                      </span>

                      {/* Name Column */}
                      <div className="flex-1 pl-4 flex items-center gap-2 truncate">
                        <span className={`truncate ${item.isUser ? "font-black" : "text-white/90"}`}>
                          {item.name}
                        </span>
                        {item.isUser && (
                          <span className="bg-primary/20 text-primary text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                            You
                          </span>
                        )}
                        {item.isVerified && (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                            Verified
                          </span>
                        )}
                      </div>

                      {/* Badge / Level Column */}
                      <span className="w-24 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          item.badge === "Master" ? "bg-red-400" :
                          item.badge === "Expert" ? "bg-yellow-400" :
                          item.badge === "Intermediate" ? "bg-blue-400" :
                          "bg-green-400"
                        }`} />
                        Lvl {item.level}
                      </span>

                      {/* Accuracy Column */}
                      <span className="w-24 text-center font-mono text-xs text-muted-foreground">
                        {item.accuracy}%
                      </span>

                      {/* Speed Column */}
                      <span className={`w-28 text-right font-black font-mono text-base ${item.isUser ? "text-primary" : "text-white"}`}>
                        {item.wpm} <span className="text-[10px] text-muted-foreground font-semibold">WPM</span>
                      </span>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Search className="w-12 h-12 text-muted-foreground/20 animate-pulse" />
                <h3 className="text-base font-bold text-white">No typists match your search</h3>
              </div>
            )}
          </div>
        </div>

        {/* Right: Personal Position Info */}
        <div className="lg:col-span-4 flex flex-col gap-6" style={{ perspective: "1000px" }}>
          <motion.div
            whileHover={{ 
              rotateX: 4, 
              rotateY: -4, 
              y: -5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <SpotlightCard
              glowColor="rgba(234, 179, 8, 0.1)"
              className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-center items-center gap-5 text-center relative overflow-hidden min-h-[220px]"
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-lg shrink-0">
                <Trophy className="w-7 h-7" />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest">Your Standing Position</span>
                <h2 className="text-3xl font-black text-white"># {userRanking} Ranked</h2>
                <p className="text-xs text-muted-foreground max-w-xs leading-normal mt-0.5">
                  Your verified record of <strong>{verifiedBestTest?.wpm ?? 0} WPM</strong> puts you in rank placement #{userRanking} on the All-Time board.
                </p>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div
            whileHover={{ 
              rotateX: 4, 
              rotateY: -4, 
              y: -5,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex-grow flex"
          >
            <SpotlightCard
              glowColor="rgba(255, 255, 255, 0.04)"
              className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 flex-grow w-full"
            >
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-primary" />
                Leaderboard Guidelines
              </h3>
              <p className="text-xs text-muted-foreground leading-normal">
                Placement ranks are computed automatically using your local offline record database. To claim a slot higher in the leaderboard:
              </p>
              <div className="flex flex-col gap-2.5 mt-1">
                {[
                  "Complete any Standard Typing Test.",
                  "Maintain 95%+ accuracy and a trusted security score.",
                  "Only verified runs can update leaderboard placement."
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2.5 items-start text-xs text-muted-foreground leading-normal">
                    <span className="text-primary font-black">{idx + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
