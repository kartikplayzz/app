"use client";
import { useState, useRef, useEffect } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { Bot, Send, User, Sparkles, Activity, AlertTriangle, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import Link from "next/link";

interface Message {
  sender: "coach" | "user";
  text: string;
  timestamp: Date;
  customPractice?: string;
}

export default function AICoachPage() {
  const { highestWpm, testsCompleted, xp, level } = useStatsStore();
  const { username } = useUserStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "coach",
      text: `Hello ${username || "Guest User"}! I am your TypeMaster AI Coach. I've finished scanning your local logs:\n\n• Highest speed: ${highestWpm} WPM\n• Rank Level: ${level} (${xp} XP)\n• Tests run: ${testsCompleted}\n\nWhat typing obstacle or goal should we tackle today? Select an option below or type a custom question.`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = {
      sender: "user",
      text,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate coach response
    setTimeout(() => {
      setIsTyping(false);
      let reply = "";
      let practice = "";

      const lowerText = text.toLowerCase();
      if (lowerText.includes("speed") || lowerText.includes("wpm") || lowerText.includes("improve")) {
        reply = `To raise your speed above your current ${highestWpm} WPM record, you need to minimize visual confirmation. Focus on key combinations rather than single letters. Start typing in word chunks (e.g., seeing 'the' or 'ing' as single physical motions rather than separate strokes). Try this custom speed-burst drill.`;
        practice = "the quick brown fox jumps over the lazy dog through the rhythm of typing speed burst trials standard keys";
      } else if (lowerText.includes("delay") || lowerText.includes("weak") || lowerText.includes("accuracy")) {
        reply = `Based on your stats, your home row finger anchoring is solid, but you have a subpixel latency spikes when reaching for peripheral keys (like Q, P, Z, and X). Let's do a muscle-memory correction training drill. Focus purely on accuracy over speed here. Keep accuracy above 98%.`;
        practice = "quizzical puppies play perplexingly while crazy zebras extra quiet explore peripheral paths next zero page";
      } else if (lowerText.includes("warm") || lowerText.includes("exercise") || lowerText.includes("drill")) {
        reply = `Here is a custom layout warm-up focusing on vertical finger reaches and numeric switches. Do this for 2 minutes before starting your tests.`;
        practice = "123 alpha beta gamma 456 reach high row keys type quick path 789 zero start typing master pro level";
      } else {
        reply = `That is an interesting question. General touch typing rules state that muscle memory improves best with brief, frequent daily sessions (15 minutes/day) rather than long weekly grinds. Since you have finished ${testsCompleted} tests, you are in the build phase. Keep focused on a relaxed finger posture!`;
      }

      const coachMsg: Message = {
        sender: "coach",
        text: reply,
        timestamp: new Date(),
        customPractice: practice || undefined
      };
      setMessages((prev) => [...prev, coachMsg]);
    }, 1200);
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

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
          <Bot className="w-9 h-9 text-primary animate-bounce" />
          AI Typing Coach
        </h1>
        <p className="text-muted-foreground text-lg">
          Get real-time feedback on your metrics, learn speed-building habits, and study layout strategies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-[450px]">
        {/* Left: Chat Container */}
        <div className="lg:col-span-8 flex flex-col glass-panel rounded-2xl border border-white/5 overflow-hidden h-full">
          {/* Chat log header */}
          <div className="bg-white/[0.015] border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="absolute right-0 bottom-0 w-3 h-3 bg-green-500 border-2 border-[#12131a] rounded-full" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Coach Master</h3>
                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Active Analysis</span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Offline LLM Mode</span>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isCoach = msg.sender === "coach";
              return (
                <div
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${isCoach ? "self-start" : "self-end flex-row-reverse"}`}
                >
                  <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center shrink-0 border ${
                    isCoach 
                      ? "bg-primary/10 border-primary/20 text-primary" 
                      : "bg-white/5 border-white/10 text-white"
                  }`}>
                    {isCoach ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isCoach
                        ? "bg-white/[0.015] border border-white/5 text-foreground rounded-tl-sm"
                        : "bg-primary text-primary-foreground font-medium rounded-tr-sm"
                    }`}>
                      {msg.text.split("\n").map((line, i) => (
                        <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line}</p>
                      ))}

                      {/* Embed custom practice block */}
                      {msg.customPractice && (
                        <div className="mt-4 p-3 bg-black/40 border border-white/5 rounded-xl flex flex-col gap-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Recommended Drill Text:</span>
                          </div>
                          <p className="font-mono text-xs text-white/90 bg-white/5 p-2 rounded border border-white/5 leading-normal select-all">
                            {msg.customPractice}
                          </p>
                          <Link
                            href={`/tests?mode=custom&text=${encodeURIComponent(msg.customPractice)}`}
                            className="text-[10px] bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all text-center w-full block border border-primary/20"
                          >
                            Load as Custom Typing Test
                          </Link>
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] text-muted-foreground/50 font-bold ${isCoach ? "text-left" : "text-right"}`}>
                      {msg.timestamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "numeric" })}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 self-start">
                <div className="w-8.5 h-8.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white/[0.015] border border-white/5 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Message input */}
          <div className="bg-white/[0.015] border-t border-white/5 p-4 flex gap-2.5 shrink-0">
            <input
              type="text"
              placeholder="Ask the coach a question (e.g. 'How do I improve my accuracy?')..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputText)}
              className="flex-1 bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              className="p-3 rounded-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Metrics & Advice Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Weakness Analysis */}
          <SpotlightCard
            glowColor="rgba(249, 115, 22, 0.1)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-orange-400">
              <AlertTriangle className="w-4.5 h-4.5" />
              <span>Peripheral Reach Latency</span>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Analyzing layout coordinate offsets under current <strong>{highestWpm} WPM</strong> speeds. The outer keys on the left/right hand fingers require home row anchoring adjustments:
            </p>
            <div className="flex flex-col gap-2">
              {[
                { finger: "Left Pinky (A, Q, Z)", latency: "High delay", value: "320ms" },
                { finger: "Right Pinky (P, ;, /)", latency: "Average delay", value: "285ms" },
                { finger: "Left Ring (S, W, X)", latency: "Optimal", value: "190ms" },
              ].map((item) => (
                <div key={item.finger} className="bg-white/[0.015] border border-white/5 px-3 py-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-white">{item.finger}</span>
                    <span className="text-[10px] text-muted-foreground">{item.latency}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    item.latency.includes("High") ? "text-red-400 bg-red-400/10" :
                    item.latency.includes("Average") ? "text-yellow-400 bg-yellow-400/10" :
                    "text-green-400 bg-green-400/10"
                  }`}>{item.value}</span>
                </div>
              ))}
            </div>
          </SpotlightCard>

          {/* Quick Questions */}
          <SpotlightCard
            glowColor="rgba(168, 85, 247, 0.1)"
            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col gap-4 flex-1"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
              <span>Recommended Coach Queries</span>
            </div>
            <p className="text-xs text-muted-foreground leading-normal">
              Click any of the quick-action prompts below to ask the AI coach for instant guidance:
            </p>
            <div className="flex flex-col gap-2">
              {[
                { label: "How do I improve my accuracy?", query: "How do I improve my accuracy?" },
                { label: "Give me a custom speed-burst drill", query: "Give me a custom speed-burst drill" },
                { label: "Analyze my key delay weaknesses", query: "Analyze my key delay weaknesses" },
                { label: "Custom numeric row warm-up", query: "Custom numeric row warm-up" }
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickQuestion(q.query)}
                  className="w-full text-left text-xs bg-white/[0.015] border border-white/5 hover:border-primary/25 hover:bg-primary/[0.03] p-3 rounded-xl transition-all duration-200 text-muted-foreground hover:text-white font-medium"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </SpotlightCard>
        </div>
      </div>
    </motion.div>
  );
}
