"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TypingEngine, ProfessionalStats } from "@/components/typing/TypingEngine";
import { TestConfigMenu } from "@/components/typing/TestConfigMenu";
import { TestResults } from "@/components/typing/TestResults";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const SAMPLE_TEXTS: Record<string, string[]> = {
  short: [
    "The quick brown fox jumps over the lazy dog.",
    "A journey of a thousand miles begins with a single step.",
    "To be or not to be, that is the question."
  ],
  medium: [
    "Programming is the art of telling another human what one wants the computer to do. A good programmer is someone who always looks both ways before crossing a one-way street.",
    "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. Believe you can and you're halfway there."
  ],
  long: [
    "Every great developer you know got there by solving problems they were unqualified to solve until they actually did it. The most disastrous thing that you can ever learn is your first programming language. Once you've learned it, you're stuck with it.",
    "In computer science, a sorting algorithm is an algorithm that puts elements of a list into an order. The most frequently used orders are numerical order and lexicographical order, and either ascending or descending. Efficient sorting is important for optimizing the efficiency of other algorithms.",
    "Space exploration is the use of astronomy and space technology to explore outer space. While the exploration of space is carried out mainly by astronomers with telescopes, its physical exploration though is conducted both by uncrewed robotic space probes and human spaceflight."
  ],
  code: [
    "function bubbleSort(arr) { for(let i = 0; i < arr.length; i++) { for(let j = 0; j < arr.length - i - 1; j++) { if (arr[j] > arr[j + 1]) { let temp = arr[j]; arr[j] = arr[j+1]; arr[j+1] = temp; } } } return arr; }",
    "const fetchUser = async (id) => { try { const res = await fetch(`/api/users/${id}`); if (!res.ok) throw new Error('Not found'); return await res.json(); } catch (err) { console.error(err); return null; } };",
    "class LinkedListNode { constructor(data) { this.data = data; this.next = null; } } class LinkedList { constructor() { this.head = null; } add(data) { const newNode = new LinkedListNode(data); if (!this.head) { this.head = newNode; } else { let current = this.head; while (current.next) { current = current.next; } current.next = newNode; } } }"
  ],
};

function TestsPageContent() {
  const [testState, setTestState] = useState<"config" | "loading" | "running" | "results">("config");
  const [timeLimit, setTimeLimit] = useState(30);
  const [textMode, setTextMode] = useState("medium");
  const [activeText, setActiveText] = useState("");
  const [finalResults, setFinalResults] = useState<ProfessionalStats | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const mode = searchParams.get("mode");
    const text = searchParams.get("text");
    const timeParam = searchParams.get("time");

    if (mode === "custom" && text) {
      const sanitized = text
        .replace(/\r?\n/g, " ")
        .replace(/\t/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      setActiveText(sanitized || "No custom text provided.");
      setTextMode("custom");

      let initialTime = 60; // Default to 60s for custom drills
      if (timeParam) {
        const parsedTime = parseInt(timeParam, 10);
        if (!isNaN(parsedTime) && parsedTime > 0) {
          initialTime = parsedTime;
        }
      }
      setTimeLimit(initialTime);
      setTestState("running");
    }
  }, [searchParams]);

  const handleStart = async (selectedTime: number, selectedMode: string, customTextPayload?: string) => {
    setTimeLimit(selectedTime);
    setTextMode(selectedMode);
    
    if (selectedMode === "web") {
      setTestState("loading");
      try {
        const res = await fetch("https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&generator=random&grnnamespace=0&prop=extracts&exchars=800&explaintext=1");
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        let extract = pages[pageId].extract;
        
        // Clean up the text
        extract = extract.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
        setActiveText(extract || "Failed to fetch text. Please try again.");
      } catch (err) {
        console.error("Failed to fetch wikipedia text", err);
        setActiveText("Failed to connect to Wikipedia API. Please check your internet connection and try again.");
      }
      setTestState("running");
    } else if (selectedMode === "custom") {
      const sanitized = (customTextPayload || "")
        .replace(/\r?\n/g, " ")
        .replace(/\t/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      setActiveText(sanitized || "No custom text provided.");
      setTestState("running");
    } else {
      const options = SAMPLE_TEXTS[selectedMode] || SAMPLE_TEXTS["medium"];
      const randomText = options[Math.floor(Math.random() * options.length)];
      setActiveText(randomText);
      setTestState("running");
    }
  };

  const handleFinish = (results: ProfessionalStats) => {
    setFinalResults(results);
    setTestState("results");
  };

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1">
      {testState === "config" && (
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Typing Tests
          </h1>
          <p className="text-muted-foreground text-lg">
            Test your speed and accuracy. Go for the high score!
          </p>
        </div>
      )}

      <div className="w-full flex-1 flex flex-col">
        {testState === "config" && (
          <motion.div
            key="config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TestConfigMenu onStart={handleStart} />
          </motion.div>
        )}

        {testState === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-4 w-full h-[400px] glass-panel rounded-3xl"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <h2 className="text-xl font-bold text-foreground">Fetching live article from Wikipedia...</h2>
            <p className="text-muted-foreground">Connecting to knowledge base</p>
          </motion.div>
        )}

        {testState === "running" && (
          <motion.div
            key="running"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-8 w-full"
          >
            <TypingEngine 
              initialText={activeText} 
              timeLimit={timeLimit} 
              onFinish={handleFinish} 
              title={
                textMode === "web" 
                  ? "Wikipedia Article" 
                  : textMode === "custom" 
                    ? "Custom Text Practice" 
                    : `Standard Test (${textMode.charAt(0).toUpperCase() + textMode.slice(1)})`
              }
            />
          </motion.div>
        )}

        {testState === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {finalResults && (
              <TestResults 
                results={finalResults}
                onRestart={() => setTestState("running")} 
                onChangeSettings={() => setTestState("config")} 
              />
            )}
          </motion.div>
        )}
      </div>

    </div>
  );
}

export default function TestsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center gap-4 w-full h-[400px]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h2 className="text-xl font-bold text-foreground">Loading typing test...</h2>
      </div>
    }>
      <TestsPageContent />
    </Suspense>
  );
}
