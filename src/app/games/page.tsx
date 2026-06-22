"use client";
import { useState, useEffect, useRef } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { Gamepad2, Play, Award, Zap, RotateCcw, Heart, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

interface Meteor {
  id: string;
  word: string;
  x: number;
  y: number;
  speed: number;
}

const SAMPLE_WORDS = [
  "react", "next", "state", "effect", "typing", "speed", "laser", "meteor", "planet",
  "space", "galaxy", "orbit", "gravity", "rocket", "thrust", "vector", "matrix", "canvas",
  "render", "loop", "clock", "engine", "shield", "cosmic", "comet", "nebula", "stellar"
];

export default function GamesPage() {
  const { addXp } = useStatsStore();

  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [typedWord, setTypedWord] = useState("");

  const [meteors, setMeteors] = useState<Meteor[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const levelRef = useRef(1);

  // Synced refs
  useEffect(() => {
    scoreRef.current = score;
    levelRef.current = level;
  }, [score, level]);

  // Handle word spawn
  const spawnMeteor = () => {
    if (gameOver || !gameActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const word = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
    const x = 50 + Math.random() * (canvas.width - 150);
    const speed = 0.5 + levelRef.current * 0.15 + Math.random() * 0.3;

    const newMeteor: Meteor = {
      id: crypto.randomUUID(),
      word,
      x,
      y: 0,
      speed
    };

    setMeteors((prev) => [...prev, newMeteor]);
  };

  // Start the game
  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setLives(3);
    setLevel(1);
    setTypedWord("");
    setMeteors([]);

    // Clear previous loops
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);

    // Set spawn rate
    spawnTimerRef.current = setInterval(spawnMeteor, 2200);

    // Trigger canvas animation frame loop
    requestAnimationFrame(updateGame);
  };

  // Canvas loop
  const updateGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid background
    ctx.strokeStyle = "rgba(255, 255, 255, 0.015)";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 30) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Update and draw meteors
    setMeteors((prev) => {
      let hitBottomCount = 0;
      const updated = prev
        .map((m) => {
          const nextY = m.y + m.speed;
          const hitBottom = nextY >= canvas.height - 40;

          if (hitBottom) hitBottomCount++;

          return {
            ...m,
            y: nextY
          };
        })
        .filter((m) => m.y < canvas.height - 40);

      // Decrement lives if meteors hit the ground
      if (hitBottomCount > 0) {
        setLives((l) => {
          const nextLives = Math.max(0, l - hitBottomCount);
          if (nextLives === 0) {
            triggerGameOver();
          }
          return nextLives;
        });
      }

      // Render meteors
      updated.forEach((m) => {
        // Draw meteor fire glow
        const gradient = ctx.createRadialGradient(m.x, m.y - 5, 2, m.x, m.y - 5, 20);
        gradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(m.x, m.y - 5, 20, 0, Math.PI * 2);
        ctx.fill();

        // Draw meteor core
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(m.x, m.y - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw word text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 13px monospace";
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.fillText(m.word, m.x - ctx.measureText(m.word).width / 2, m.y + 12);
        ctx.shadowBlur = 0; // reset
      });

      return updated;
    });

    // Draw laser turret base
    ctx.fillStyle = "rgba(168, 85, 247, 0.2)";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height, 45, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height, 45, Math.PI, 0);
    ctx.stroke();

    // Loop
    if (!gameOver && gameActive) {
      gameLoopRef.current = requestAnimationFrame(updateGame);
    }
  };

  const triggerGameOver = () => {
    setGameOver(true);
    setGameActive(false);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    
    // Add XP rewards based on score: 1 XP per 10 score
    const earnedXp = Math.floor(scoreRef.current / 10);
    if (earnedXp > 0) {
      addXp(earnedXp);
    }
  };

  // Handle typing submission
  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedWord(val);

    // Look for matching meteor words
    const trimmed = val.trim().toLowerCase();
    setMeteors((prev) => {
      const matchIndex = prev.findIndex((m) => m.word === trimmed);
      
      if (matchIndex !== -1) {
        const targetMeteor = prev[matchIndex];
        
        // Fire laser effect on canvas
        drawLaser(targetMeteor.x, targetMeteor.y);

        // Increase score
        setScore((s) => {
          const nextScore = s + 10;
          // Level up every 100 points
          if (nextScore > 0 && nextScore % 100 === 0) {
            setLevel((l) => l + 1);
          }
          return nextScore;
        });

        // Clear word input
        setTypedWord("");
        
        // Filter out destroyed meteor
        return prev.filter((_, idx) => idx !== matchIndex);
      }
      return prev;
    });
  };

  const drawLaser = (tx: number, ty: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw bright neon laser line
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height - 20);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height - 20);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, []);

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
          <Gamepad2 className="w-9 h-9 text-primary animate-pulse" />
          TypeMaster Arcade
        </h1>
        <p className="text-muted-foreground text-lg">
          Practice typing muscle memory through immersive games. Play to earn ranking XP credits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow min-h-[450px]">
        {/* Left: Canvas Area */}
        <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden h-full relative">
          
          {!gameActive && !gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 p-8 text-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg animate-bounce">
                <Flame className="w-8 h-8 text-primary" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-black text-white">Meteor Type</h2>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Words are falling as meteors! Type each word and press space/enter to fire neon defense lasers. Don't let the meteors hit the ground!
                </p>
              </div>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--primary),0.35)] cursor-pointer"
              >
                Launch Meteor Defense
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-30 p-8 text-center gap-6">
              <span className="text-xs font-black text-red-500 bg-red-500/10 px-3 py-1 rounded-full uppercase tracking-widest">System Down</span>
              <div className="flex flex-col gap-1">
                <h2 className="text-4xl font-black text-white">GAME OVER</h2>
                <p className="text-sm text-muted-foreground mt-1">Meteors penetrated the primary defense shields.</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-6 py-4 flex gap-8">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Final Score</span>
                  <div className="text-2xl font-black text-white">{score}</div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">XP Earned</span>
                  <div className="text-2xl font-black text-primary">+{Math.floor(score / 10)} XP</div>
                </div>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/5 font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry defense
              </button>
            </div>
          )}

          {/* Game Stats overlay bar */}
          <div className="bg-white/[0.015] border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0 relative z-20">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Score</span>
                <span className="text-lg font-black text-white">{score}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Wave level</span>
                <span className="text-lg font-black text-primary">{level}</span>
              </div>
            </div>

            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={`w-5.5 h-5.5 ${i < lives ? "text-red-500 fill-current" : "text-white/10"}`}
                />
              ))}
            </div>
          </div>

          {/* Interactive Canvas container */}
          <div className="flex-1 bg-black/45 relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={750}
              height={380}
              className="w-full h-full block"
            />
          </div>

          {/* Word Input box */}
          <div className="bg-white/[0.015] border-t border-white/5 p-4 flex gap-4 shrink-0 relative z-20">
            <input
              type="text"
              placeholder={gameActive ? "Type words appearing on meteors here..." : "Launch defense game to unlock typing inputs..."}
              disabled={!gameActive}
              value={typedWord}
              onChange={handleTextInput}
              className="w-full bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3.5 text-sm text-foreground placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono tracking-wider text-center"
            />
          </div>
        </div>

        {/* Right: Scoreboards & controls */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <SpotlightCard
            glowColor="rgba(255, 255, 255, 0.04)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4"
          >
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-primary" />
              Arcade Highscores
            </h3>
            <div className="flex flex-col gap-2 mt-2">
              {[
                { name: "NeonTypist", score: 840 },
                { name: "KeySlinger", score: 760 },
                { name: "TypeNinja", score: 620 },
              ].map((h, i) => (
                <div key={h.name} className="bg-white/[0.015] border border-white/5 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>{i + 1}. {h.name}</span>
                  <span className="text-white font-black">{h.score} pts</span>
                </div>
              ))}
            </div>
          </SpotlightCard>

          <SpotlightCard
            glowColor="rgba(168, 85, 247, 0.08)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 flex-grow"
          >
            <h3 className="text-xs font-extrabold text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Game Objectives
            </h3>
            <div className="flex flex-col gap-3 mt-1.5">
              {[
                { title: "Defend shields", desc: "Keep incoming meteors from hitting the bottom of the canvas screen." },
                { title: "Build speed combos", desc: "Type words consecutively to level up speed wave frequencies." },
                { title: "Claim XP credits", desc: "Your final score is calculated to credit XP directly into your global rank profile." },
              ].map((obj, i) => (
                <div key={i} className="flex gap-3.5 items-start">
                  <div className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] text-primary font-black shrink-0">{i + 1}</div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-white">{obj.title}</span>
                    <span className="text-[11px] text-muted-foreground leading-normal">{obj.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </motion.div>
  );
}
