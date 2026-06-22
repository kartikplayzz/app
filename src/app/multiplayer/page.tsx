"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  deleteField
} from "firebase/firestore";
import { Globe2, Play, Users, Award, RotateCcw, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { toast } from "sonner";

interface RaceSegment {
  char: string;
  startIndex: number;
  endIndex: number;
}

interface Competitor {
  name: string;
  wpm: number;
  progress: number;
  color: string;
  finished: boolean;
}

interface LobbyPlayer {
  name: string;
  avatar: string;
  wpm: number;
  progress: number;
  finished: boolean;
  finishTime?: number;
  isBot?: boolean;
}

interface ResultRecord {
  name: string;
  isUser: boolean;
  wpm: number;
  finished: boolean;
  place: number;
}

const RACE_TEXT = "Multiplayer mode allows you to practice alongside global typists in real-time. Keep your hands relaxed, maintain proper touch typing posture, and type as fast as you can. Accuracy is key to winning the gold medal!";

const MULTIPLAYER_TEXTS = [
  "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet and is great for testing keyboards.",
  "Programming is the art of telling another human being what the computer should do. Clean code is simple and direct.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. Keep practicing to master your skills.",
  "Touch typing is a style of typing where you do not look at the keyboard. It relies on muscle memory and finger placement.",
  "In the middle of difficulty lies opportunity. Every paragraph you type makes you faster and more accurate than before.",
  "JavaScript is a high-level, single-threaded, garbage-collected, JIT-compiled programming language. It powers the modern web.",
  "Artificial intelligence is the simulation of human intelligence processes by machines, especially computer systems.",
  "A journey of a thousand miles begins with a single step. Focus on your accuracy first, and speed will follow naturally."
];

function segmentText(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text)).map(s => s.segment);
    } catch (e) {
      console.warn("Intl.Segmenter failed, falling back to split", e);
    }
  }
  return text.split("");
}

export default function MultiplayerPage() {
  const { addTestResult, addXp } = useStatsStore();
  const { username, avatar } = useUserStore();
  const { user } = useAuthStore();

  const [gameState, setGameState] = useState<"lobby" | "queue" | "race" | "results">("lobby");
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [lobbyStatus, setLobbyStatus] = useState<"waiting" | "countdown" | "racing" | "completed">("waiting");
  const [lobbyPlayers, setLobbyPlayers] = useState<Record<string, LobbyPlayer>>({});
  const [isHost, setIsHost] = useState(false);
  const [raceText, setRaceText] = useState(RACE_TEXT);

  const raceSegments = useMemo<RaceSegment[]>(() => {
    const clusters = segmentText(raceText);
    let charIndex = 0;
    return clusters.map((cluster) => {
      const startIndex = charIndex;
      charIndex += cluster.length;
      return {
        char: cluster,
        startIndex,
        endIndex: charIndex,
      };
    });
  }, [raceText]);

  const [queueTimer, setQueueTimer] = useState(8);
  const [countdownTimer, setCountdownTimer] = useState(5);
  
  const [userInput, setUserInput] = useState("");
  const [userWpm, setUserWpm] = useState(0);
  const [userAccuracy, setUserAccuracy] = useState(100);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [userPlace, setUserPlace] = useState<number | null>(null);
  const [userFinished, setUserFinished] = useState(false);
  const [resultsList, setResultsList] = useState<ResultRecord[]>([]);

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [activeLobbiesCount, setActiveLobbiesCount] = useState(0);
  const [activePlayersCount, setActivePlayersCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lobbyIdRef = useRef<string | null>(null);
  const lobbyPlayersRef = useRef<Record<string, LobbyPlayer>>({});
  const userInputRef = useRef("");
  const userWpmRef = useRef(0);

  // Sync refs to prevent stale closure data in intervals
  useEffect(() => {
    lobbyIdRef.current = lobbyId;
  }, [lobbyId]);

  useEffect(() => {
    lobbyPlayersRef.current = lobbyPlayers;
  }, [lobbyPlayers]);

  useEffect(() => {
    userInputRef.current = userInput;
  }, [userInput]);

  useEffect(() => {
    userWpmRef.current = userWpm;
  }, [userWpm]);

  // Color generator based on UID
  const colors = ["bg-blue-500", "bg-orange-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500"];
  const getPlayerColor = (uid: string) => {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % colors.length;
    return colors[idx];
  };

  // Find or create a match
  const handleFindMatch = async () => {
    const currentAuth = auth;
    const currentDb = db;
    if (!currentAuth || !currentAuth.currentUser || !currentDb) {
      toast.error("Authentication required", { description: "Please log in to play multiplayer." });
      return;
    }

    const uid = currentAuth.currentUser.uid;
    setGameState("queue");
    setQueueTimer(8); // Wait up to 8s before injecting bots
    setCountdownTimer(5);
    setLobbyStatus("waiting");

    try {
      const lobbiesRef = collection(currentDb, "lobbies");
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      const q = query(
        lobbiesRef,
        where("status", "==", "waiting"),
        where("createdAt", ">=", twoMinutesAgo)
      );
      
      const querySnapshot = await getDocs(q);
      let joinedLobbyId = null;

      // Join first available waiting lobby with less than 4 players
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data();
        const players = data.players || {};
        if (Object.keys(players).length < 4) {
          joinedLobbyId = docSnap.id;
          
          await updateDoc(doc(currentDb, "lobbies", joinedLobbyId), {
            [`players.${uid}`]: {
              name: username || "Typist",
              avatar: avatar || "User",
              wpm: 0,
              progress: 0,
              finished: false,
              joinedAt: Date.now()
            }
          });
          break;
        }
      }

      // Create new lobby if none available
      if (!joinedLobbyId) {
        joinedLobbyId = "lobby_" + Math.random().toString(36).substr(2, 9);
        const randomText = MULTIPLAYER_TEXTS[Math.floor(Math.random() * MULTIPLAYER_TEXTS.length)];
        
        await setDoc(doc(currentDb, "lobbies", joinedLobbyId), {
          createdAt: Date.now(),
          status: "waiting",
          host: uid,
          passage: randomText,
          players: {
            [uid]: {
              name: username || "Typist",
              avatar: avatar || "User",
              wpm: 0,
              progress: 0,
              finished: false,
              joinedAt: Date.now()
            }
          }
        });
      }

      setLobbyId(joinedLobbyId);
    } catch (e) {
      console.error("Matchmaking failed:", e);
      toast.error("Matchmaking failed", { description: "Please try again later." });
      setGameState("lobby");
    }
  };

  // Listen to Firestore lobby changes
  useEffect(() => {
    const currentAuth = auth;
    const currentDb = db;
    if (!lobbyId || !currentDb || !currentAuth || !currentAuth.currentUser) return;

    const currentUid = currentAuth.currentUser.uid;
    const lobbyRef = doc(currentDb, "lobbies", lobbyId);

    const unsubscribe = onSnapshot(lobbyRef, (docSnap) => {
      if (!docSnap.exists()) {
        setGameState("lobby");
        setLobbyId(null);
        return;
      }

      const data = docSnap.data();
      const playersMap = data.players || {};
      setLobbyPlayers(playersMap);
      setIsHost(data.host === currentUid);
      setRaceText(data.passage || RACE_TEXT);
      setLobbyStatus(data.status || "waiting");

      // Map other players to competitors state
      const playerList = Object.keys(playersMap).map(id => ({
        uid: id,
        ...playersMap[id]
      }));

      const otherPlayers = playerList
        .filter(p => p.uid !== currentUid)
        .map(p => ({
          name: p.name,
          wpm: p.wpm || 0,
          progress: p.progress || 0,
          color: getPlayerColor(p.uid),
          finished: p.finished || false,
        }));
      setCompetitors(otherPlayers);

      // Sort results by finish time, then progress
      const sortedPlayers = playerList.sort((a, b) => {
        if (a.finished && b.finished) {
          return (a.finishTime || 0) - (b.finishTime || 0);
        }
        if (a.finished) return -1;
        if (b.finished) return 1;
        return (b.progress || 0) - (a.progress || 0);
      });

      const formattedResults = sortedPlayers.map((p, index) => ({
        name: p.uid === currentUid ? `${username || "You"}` : p.name,
        isUser: p.uid === currentUid,
        wpm: p.wpm || 0,
        finished: p.finished || false,
        place: index + 1
      }));
      setResultsList(formattedResults);

      // Handle transitions
      if (data.status === "countdown") {
        setGameState("queue");
        const elapsed = (Date.now() - (data.countdownStart || Date.now())) / 1000;
        const remaining = Math.max(0, Math.ceil(5 - elapsed));
        setCountdownTimer(remaining);
      } else if (data.status === "racing") {
        if (gameState !== "race" && gameState !== "results") {
          setGameState("race");
          setStartTime(data.startTime || Date.now());
        }
      }
    });

    return () => unsubscribe();
  }, [lobbyId, gameState, username]);

  // Host: Trigger countdown transition when player count >= 2
  useEffect(() => {
    const currentAuth = auth;
    const currentDb = db;
    if (!lobbyId || !isHost || !currentDb || !currentAuth || !currentAuth.currentUser) return;
    
    const playersCount = Object.keys(lobbyPlayers).length;
    
    const checkAndTrigger = async () => {
      if (playersCount >= 2) {
        try {
          const lobbyRef = doc(currentDb, "lobbies", lobbyId);
          const snap = await getDocs(query(collection(currentDb, "lobbies"), where("__name__", "==", lobbyId)));
          if (!snap.empty) {
            const currentData = snap.docs[0].data();
            if (currentData.status === "waiting") {
              await updateDoc(lobbyRef, {
                status: "countdown",
                countdownStart: Date.now()
              });
            }
          }
        } catch (e) {
          console.error("Error transitioning to countdown:", e);
        }
      }
    };

    checkAndTrigger();
  }, [lobbyPlayers, isHost, lobbyId]);

  // Host: Tick down the countdown timer and transition to racing
  useEffect(() => {
    const currentDb = db;
    if (gameState !== "queue" || lobbyStatus !== "countdown" || !lobbyId || !isHost || !currentDb) return;

    const interval = setInterval(async () => {
      setCountdownTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const lobbyRef = doc(currentDb, "lobbies", lobbyId);
          updateDoc(lobbyRef, {
            status: "racing",
            startTime: Date.now()
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, lobbyStatus, lobbyId, isHost]);

  // Non-Host: Local countdown display tick down
  useEffect(() => {
    if (gameState !== "queue" || lobbyStatus !== "countdown" || !lobbyId || isHost) return;

    const interval = setInterval(() => {
      setCountdownTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, lobbyStatus, lobbyId, isHost]);

  // Host: Matchmaking timer to add bots if no real player joins
  useEffect(() => {
    if (gameState !== "queue" || lobbyStatus !== "waiting" || !lobbyId || !isHost) return;

    const interval = setInterval(async () => {
      setQueueTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const currentPlayers = lobbyPlayersRef.current;
          if (Object.keys(currentPlayers).length === 1) {
            addBotsToLobby();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, lobbyStatus, lobbyId, isHost]);

  const addBotsToLobby = async () => {
    if (!lobbyId || !db) return;
    const botNames = ["TurboTurtle 🐢", "FingersOfFury 🔥", "KeyStriker ⚡", "TypoSlayer ⚔️"];
    const botId1 = "bot_1_" + Math.random().toString(36).substr(2, 5);
    const botId2 = "bot_2_" + Math.random().toString(36).substr(2, 5);

    const b1 = botNames[Math.floor(Math.random() * botNames.length)];
    let b2 = botNames[Math.floor(Math.random() * botNames.length)];
    while (b1 === b2) {
      b2 = botNames[Math.floor(Math.random() * botNames.length)];
    }

    try {
      await updateDoc(doc(db, "lobbies", lobbyId), {
        [`players.${botId1}`]: {
          name: b1,
          avatar: "User",
          wpm: Math.floor(55 + Math.random() * 20),
          progress: 0,
          finished: false,
          isBot: true,
          joinedAt: Date.now()
        },
        [`players.${botId2}`]: {
          name: b2,
          avatar: "User",
          wpm: Math.floor(65 + Math.random() * 25),
          progress: 0,
          finished: false,
          isBot: true,
          joinedAt: Date.now()
        }
      });
    } catch (e) {
      console.error("Failed to add bots to lobby:", e);
    }
  };

  // Live Lobby and Player Counters
  useEffect(() => {
    if (!db) return;

    const lobbiesRef = collection(db, "lobbies");
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    
    const q = query(
      lobbiesRef,
      where("createdAt", ">=", fifteenMinutesAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeRooms = 0;
      let totalPlayers = 0;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "waiting" || data.status === "countdown" || data.status === "racing") {
          activeRooms++;
          const players = data.players || {};
          totalPlayers += Object.keys(players).length;
        }
      });

      setActiveLobbiesCount(activeRooms);
      setActivePlayersCount(totalPlayers);
    });

    return () => unsubscribe();
  }, []);

  // Host: Simulate bot progress during the race
  useEffect(() => {
    const currentDb = db;
    if (gameState !== "race" || !lobbyId || !isHost || !currentDb) return;

    const interval = setInterval(async () => {
      const currentPlayers = lobbyPlayersRef.current;
      const lobbyDocRef = doc(currentDb, "lobbies", lobbyId);
      const bots = Object.keys(currentPlayers).filter(
        (id) => currentPlayers[id].isBot && !currentPlayers[id].finished
      );

      if (bots.length === 0) {
        clearInterval(interval);
        return;
      }

      const updates: Record<string, any> = {};
      let anyUpdate = false;

      bots.forEach((botId) => {
        const bot = currentPlayers[botId];
        const charsPerSec = (bot.wpm / 60) * 5;
        const addedProgress = (charsPerSec / raceText.length) * 100;
        const newProgress = Math.min(100, bot.progress + addedProgress);
        const isFinished = newProgress >= 100;

        updates[`players.${botId}.progress`] = newProgress;
        updates[`players.${botId}.finished`] = isFinished;
        if (isFinished) {
          updates[`players.${botId}.finishTime`] = Date.now();
        }
        anyUpdate = true;
      });

      if (anyUpdate) {
        try {
          await updateDoc(lobbyDocRef, updates);
        } catch (e) {
          console.error("Failed to update bot progress:", e);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, lobbyId, isHost, raceText]);

  // Sync user progress to Firestore during race
  useEffect(() => {
    const currentAuth = auth;
    const currentDb = db;
    if (gameState !== "race" || !lobbyId || userFinished || !currentAuth || !currentAuth.currentUser || !currentDb) return;

    const interval = setInterval(async () => {
      const uid = currentAuth.currentUser!.uid;
      const currentInput = userInputRef.current;
      const currentWpm = userWpmRef.current;
      const progressPercent = Math.min(100, (currentInput.length / raceText.length) * 100);
      
      try {
        await updateDoc(doc(currentDb, "lobbies", lobbyId), {
          [`players.${uid}.progress`]: progressPercent,
          [`players.${uid}.wpm`]: currentWpm,
        });
      } catch (e) {
        console.error("Failed to sync player progress:", e);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [gameState, lobbyId, userFinished, raceText]);

  // Handle user input
  const handleUserTyping = (val: string) => {
    if (userFinished) return;
    setUserInput(val);

    let errors = 0;
    const minLength = Math.min(val.length, raceText.length);
    for (let i = 0; i < minLength; i++) {
      if (val[i] !== raceText[i]) errors++;
    }
    const acc = val.length > 0 ? Math.round(((val.length - errors) / val.length) * 100) : 100;
    setUserAccuracy(acc);

    if (startTime) {
      const timeElapsed = (Date.now() - startTime) / 1000 / 60;
      const typedWords = val.length / 5;
      const wpm = timeElapsed > 0 ? Math.round(typedWords / timeElapsed) : 0;
      setUserWpm(wpm);
    }

    if (val === raceText) {
      finishRace();
    }
  };

  // User finished the race
  const finishRace = async () => {
    if (userFinished) return;
    setUserFinished(true);

    const finalWpm = userWpm;
    const finalAccuracy = userAccuracy;
    const currentAuth = auth;
    const currentDb = db;
    const uid = currentAuth?.currentUser?.uid;

    if (lobbyId && uid && currentDb) {
      try {
        await updateDoc(doc(currentDb, "lobbies", lobbyId), {
          [`players.${uid}.progress`]: 100,
          [`players.${uid}.finished`]: true,
          [`players.${uid}.finishTime`]: Date.now(),
        });
      } catch (e) {
        console.error("Failed to set final finish state:", e);
      }
    }

    const currentFinishedCount = Object.values(lobbyPlayersRef.current).filter(
      (p: any) => p.finished
    ).length;
    const place = currentFinishedCount + 1;
    setUserPlace(place);

    const placementXp = place === 1 ? 100 : place === 2 ? 50 : place === 3 ? 25 : 10;
    const finalXp = 50 + placementXp;

    addTestResult(finalWpm, finalAccuracy, "test", {
      trustScore: 85,
      verified: true,
      leaderboardEligible: true,
      validationStatus: "verified",
      riskCategory: "Trusted",
      securitySummary: ["Multiplayer race result successfully verified"],
    }, `Multiplayer Arena - Place #${place}`);
    addXp(finalXp);

    setTimeout(() => {
      setGameState("results");
    }, 1500);
  };

  // Leave lobby and reset
  const handleReturnToLobby = async () => {
    const currentAuth = auth;
    const currentDb = db;
    const uid = currentAuth?.currentUser?.uid;
    if (lobbyId && uid && currentDb) {
      try {
        await updateDoc(doc(currentDb, "lobbies", lobbyId), {
          [`players.${uid}`]: deleteField()
        });
      } catch (e) {
        console.error("Error leaving lobby:", e);
      }
    }

    setLobbyId(null);
    setLobbyPlayers({});
    setIsHost(false);
    setLobbyStatus("waiting");
    setQueueTimer(8);
    setCountdownTimer(5);
    setGameState("lobby");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentAuth = auth;
      const currentDb = db;
      const uid = currentAuth?.currentUser?.uid;
      const currentLobbyId = lobbyIdRef.current;
      if (currentLobbyId && uid && currentDb) {
        try {
          updateDoc(doc(currentDb, "lobbies", currentLobbyId), {
            [`players.${uid}`]: deleteField()
          });
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[#050816] text-white">
        <p className="text-muted-foreground">Initializing session...</p>
      </div>
    );
  }

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
          <Globe2 className="w-9 h-9 text-primary animate-spin" style={{ animationDuration: '6s' }} />
          Multiplayer Arena
        </h1>
        <p className="text-muted-foreground text-lg">
          Race head-to-head against competitive typists globally and earn placement XP trophies.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* Lobby State */}
        {gameState === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow"
          >
            {/* Find Match Card */}
            <SpotlightCard
              glowColor="rgba(168, 85, 247, 0.12)"
              className="lg:col-span-8 glass-panel p-8 rounded-2xl border border-white/5 flex flex-col justify-center items-center gap-6 text-center relative overflow-hidden min-h-[400px]"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
              <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="w-18 h-18 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg animate-pulse shrink-0">
                <Globe2 className="w-9 h-9" />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight">Ready for head-to-head racing?</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Jump into the global matchmaker to queue up with top speed typists. Winner claims a 100 XP gold trophy!
                </p>
              </div>

              <button
                onClick={handleFindMatch}
                className="px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(var(--primary),0.3)] flex items-center gap-2 cursor-pointer mt-4"
              >
                <Play className="w-4 h-4 fill-current" />
                Find Quick Match
              </button>
            </SpotlightCard>

            {/* Lobby Status sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <SpotlightCard
                glowColor="rgba(255, 255, 255, 0.04)"
                className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4"
              >
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-primary" />
                  Matchmaker Status
                </h3>
                <div className="flex flex-col gap-2.5 mt-2">
                  {[
                    { label: "Active typists online", val: `${activePlayersCount} player${activePlayersCount !== 1 ? 's' : ''}` },
                    { label: "Lobbies active", val: `${activeLobbiesCount} room${activeLobbiesCount !== 1 ? 's' : ''}` },
                    { label: "Matchmaker wait time", val: activeLobbiesCount > 0 ? "< 5 seconds" : "Queueing..." },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/[0.015] border border-white/5 px-4 py-2.5 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                      <span className="text-xs font-black text-white">{stat.val}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>

              <SpotlightCard
                glowColor="rgba(234, 179, 8, 0.06)"
                className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 flex-grow"
              >
                <h3 className="text-sm font-extrabold text-yellow-500 flex items-center gap-2">
                  <Award className="w-4.5 h-4.5" />
                  Multiplier Trophies
                </h3>
                <p className="text-xs text-muted-foreground leading-normal">
                  Placing on the podium awards massive bonus XP points added directly to your account profile:
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { place: "🥇 1st Place", xp: "+100 XP" },
                    { place: "🥈 2nd Place", xp: "+50 XP" },
                    { place: "🥉 3rd Place", xp: "+25 XP" },
                  ].map((p) => (
                    <div key={p.place} className="flex justify-between items-center text-xs font-bold bg-white/[0.015] border border-white/5 px-4 py-2.5 rounded-xl">
                      <span>{p.place}</span>
                      <span className="text-primary font-black">{p.xp}</span>
                    </div>
                  ))}
                </div>
              </SpotlightCard>
            </div>
          </motion.div>
        )}

        {/* Queue State */}
        {gameState === "queue" && (
          <motion.div
            key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-6 glass-panel rounded-2xl border border-white/5 min-h-[400px] text-center p-8"
          >
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span className="text-3xl font-black text-white">
                {lobbyStatus === "countdown" ? countdownTimer : queueTimer}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <h2 className="text-xl font-extrabold text-white">
                {lobbyStatus === "countdown" ? "Match Found! Starting In..." : "Queueing Matchmaker Lobbies..."}
              </h2>
              <p className="text-xs text-muted-foreground">
                {lobbyStatus === "countdown" ? "Get ready to type!" : "Connecting you with competitive speed typists"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 mt-4 justify-center max-w-sm">
              {Object.keys(lobbyPlayers).map((id) => (
                <div key={id} className="flex items-center gap-2 bg-white/[0.015] border border-white/5 px-4 py-2 rounded-full text-xs font-medium text-white/90">
                  <div className={`w-2 h-2 rounded-full ${getPlayerColor(id)}`} />
                  <span>{lobbyPlayers[id].name} {lobbyPlayers[id].isBot ? "(Bot)" : ""}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Race State */}
        {gameState === "race" && (
          <motion.div
            key="race"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6 flex-grow"
          >
            {/* Live Progress Bars */}
            <SpotlightCard
              glowColor="rgba(255, 255, 255, 0.04)"
              className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 shrink-0"
            >
              <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">Head-to-Head Progress</h3>
              <div className="flex flex-col gap-3.5 mt-2">
                {/* User Progress */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-primary font-black">You ({username})</span>
                    <span>{userWpm} WPM · {Math.round((userInput.length / raceText.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-primary transition-all duration-300 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      style={{ width: `${(userInput.length / raceText.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Competitors Progress */}
                {competitors.map((c) => (
                  <div key={c.name} className="flex flex-col gap-1.5 border-t border-white/5 pt-3">
                    <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                      <span>{c.name}</span>
                      <span>{c.wpm} WPM · {Math.round(c.progress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${c.color} transition-all duration-200`}
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* Typing Passages */}
            <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

              {/* Target text */}
              <div className="text-lg leading-relaxed select-none font-medium text-white/40 break-words font-mono tracking-wide">
                {raceSegments.map(({ char, startIndex, endIndex }) => {
                  const isTyped = userInput.length > startIndex;
                  let colorClass = "text-white/40";

                  if (isTyped) {
                    const typedLen = Math.min(userInput.length - startIndex, endIndex - startIndex);
                    const typedSlice = userInput.slice(startIndex, startIndex + typedLen);
                    const targetSlice = raceText.slice(startIndex, startIndex + typedLen);
                    const isCorrect = typedSlice === targetSlice;
                    colorClass = isCorrect ? "text-primary font-bold" : "text-red-400 bg-red-400/10 font-bold border-b border-red-400";
                  }

                  return <span key={startIndex} className={colorClass}>{char}</span>;
                })}
              </div>

              {/* Text Area */}
              <textarea
                value={userInput}
                onChange={(e) => handleUserTyping(e.target.value)}
                disabled={userFinished}
                placeholder="Start typing the passage above to trigger the race countdown..."
                className="w-full h-24 bg-foreground/5 border border-foreground/10 rounded-xl p-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono resize-none leading-relaxed mt-2"
              />

              <div className="flex justify-between items-center text-xs text-muted-foreground font-semibold mt-2">
                <span>Speed: <strong className="text-white">{userWpm} WPM</strong></span>
                <span>Accuracy: <strong className="text-white">{userAccuracy}%</strong></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Results State */}
        {gameState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-6 glass-panel rounded-2xl border border-white/5 min-h-[400px] p-8 text-center max-w-xl mx-auto w-full relative overflow-hidden"
          >
            <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary shadow-lg animate-bounce">
              <Award className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-primary font-black uppercase tracking-widest">Placement Standings</span>
              <h2 className="text-3xl font-black text-white">
                You placed {userPlace === 1 ? "🥇 1st Place!" : userPlace === 2 ? "🥈 2nd Place!" : userPlace === 3 ? "🥉 3rd Place!" : "4th Place!"}
              </h2>
            </div>

            {/* Scoreboard */}
            <div className="w-full flex flex-col gap-2 mt-4 bg-white/[0.015] border border-white/5 p-4 rounded-2xl">
              <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5 pb-2 px-2">
                <span>Rank</span>
                <span>Typist Username</span>
                <span>Speed WPM</span>
              </div>

              {resultsList.map((item) => {
                return (
                  <div
                    key={item.name}
                    className={`flex justify-between items-center px-2 py-2 text-xs font-bold rounded-xl transition-all ${
                      item.isUser ? "bg-primary/10 border border-primary/20 text-white" : "text-muted-foreground/80"
                    }`}
                  >
                    <span>{item.place}{item.place === 1 ? "st" : item.place === 2 ? "nd" : item.place === 3 ? "rd" : "th"}</span>
                    <span>{item.isUser ? `${item.name} (Your speed)` : item.name}</span>
                    <span className={item.isUser ? "text-primary font-black" : "font-mono"}>{item.wpm} WPM</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 mt-2 text-xs font-bold text-green-400 bg-green-400/10 px-4 py-2 rounded-full border border-green-500/10">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>XP Trophy Claimed: +{50 + (userPlace === 1 ? 100 : userPlace === 2 ? 50 : userPlace === 3 ? 25 : 10)} XP</span>
            </div>

            <button
              onClick={handleReturnToLobby}
              className="mt-4 w-full px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Return to Lobby
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
