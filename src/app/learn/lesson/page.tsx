"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useContentStore } from "@/store/useContentStore";
import { TypingEngine, ProfessionalStats } from "@/components/typing/TypingEngine";
import { TestResults } from "@/components/typing/TestResults";
import { useStatsStore } from "@/store/useStatsStore";
import { KeyboardUI } from "@/components/typing/KeyboardUI";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function LessonContent({ lessonId }: { lessonId: string }) {
  const router = useRouter();
  
  const { lessons } = useContentStore();
  const { completeLesson, lessonProgress, updateLessonProgress } = useStatsStore();
  const lesson = lessons.find(l => l.id === lessonId);
  
  const [currentStageIndex, setCurrentStageIndex] = useState(() => {
    return lessonProgress[lessonId || ""] || 0;
  });
  const [showBriefing, setShowBriefing] = useState(currentStageIndex === 0);
  const [stageState, setStageState] = useState<"typing" | "transition" | "finished">("typing");
  const [finalResults, setFinalResults] = useState<ProfessionalStats | null>(null);

  const handleNextStage = useCallback(() => {
    if (!lesson) return;
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < lesson.stages.length) {
      setCurrentStageIndex(nextIndex);
      updateLessonProgress(lesson.id, nextIndex);
    }
    setStageState("typing");
    setFinalResults(null);
  }, [currentStageIndex, lesson, updateLessonProgress]);

  const handleStageFinish = useCallback((results: ProfessionalStats) => {
    if (!lesson) return;
    if (currentStageIndex === 0) {
      handleNextStage();
      return;
    }

    setFinalResults(results);
    setStageState("finished");

    if (currentStageIndex === lesson.stages.length - 1) {
      completeLesson(lesson.id);
    }
  }, [currentStageIndex, lesson, handleNextStage, completeLesson]);

  useEffect(() => {
    if (!lesson) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (showBriefing) {
          setShowBriefing(false);
        } else if (stageState === "finished") {
          if (currentStageIndex < lesson.stages.length - 1) {
            handleNextStage();
          } else {
            const nextId = lesson.lessonNumber < 700 ? `lesson-${lesson.lessonNumber + 1}` : null;
            if (nextId) router.push(`/learn/lesson?id=${nextId}`);
            else router.push(`/learn`);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stageState, currentStageIndex, showBriefing, router, lesson, handleNextStage]);

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-foreground">Lesson Not Found</h1>
        <Link href="/learn" className="text-primary hover:underline">Return to Library</Link>
      </div>
    );
  }

  const currentStage = lesson.stages[currentStageIndex];

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 px-4 flex-1">
      <div className="flex items-center gap-4 mb-1">
        <Link href="/learn" className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">{lesson.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-bold bg-foreground/5 px-2 py-1 rounded">
            <BookOpen className="w-3 h-3 text-primary" />
            {lesson.category}
          </div>
        </div>
      </div>

      <div className="w-full flex-grow flex flex-col">
        {stageState === "typing" && (
          <motion.div 
            key={`stage-${currentStage.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-4 md:gap-6"
          >
            <div className="relative overflow-hidden px-6 py-3 rounded-[1rem] bg-gradient-to-r from-foreground/5 to-transparent border border-white/5 shadow-md flex items-center justify-between group">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-30 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-4">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-1 rounded">Objective</span>
                <h2 className="text-lg font-bold text-foreground tracking-tight drop-shadow-md">{currentStage.title}</h2>
              </div>
              <div className="relative z-10 flex items-center gap-4">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Stage {currentStageIndex + 1} of {lesson.stages.length}
                </span>
                <div className="flex gap-1">
                  {[...Array(lesson.stages.length)].map((_, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= currentStageIndex ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" : "bg-foreground/20"}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <TypingEngine 
                key={`engine-${currentStage.id}`}
                initialText={currentStage.targetText} 
                timeLimit={120} 
                mode="progress"
                onFinish={handleStageFinish}
                isPaused={showBriefing}
                sessionType="lesson"
                title={`${lesson.title} - ${currentStage.title}`}
              />
              
              <AnimatePresence>
                {showBriefing && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-[-2rem] z-50 flex flex-col items-center justify-center bg-background/50 backdrop-blur-xl rounded-[2rem]"
                  >
                    <div className="flex flex-col items-center gap-6 bg-background/80 p-8 md:p-12 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden text-center max-w-2xl w-full scale-95 md:scale-100">
                      <span className="text-xs font-black text-primary uppercase tracking-[0.4em] drop-shadow-[0_0_15px_rgba(var(--primary),0.8)]">
                        Mission Briefing
                      </span>
                      <h3 className="text-3xl md:text-5xl font-black tracking-tight text-foreground relative z-10 leading-tight">
                        {lesson.category === "beginner" ? "Master the Keys" :
                         lesson.category === "intermediate" ? "Word Combinations" :
                         lesson.category === "expert" ? "Numbers & Symbols" :
                         "Blistering Speed"}
                      </h3>
                      <p className="text-muted-foreground text-lg relative z-10">
                        {lesson.category === "beginner" ? "Place your fingers on the home row and prepare to learn new keys." :
                         lesson.category === "intermediate" ? "Focus on maintaining a steady rhythm and watch out for capital letters." :
                         lesson.category === "expert" ? "Do not look down at your keyboard. Trust your muscle memory." :
                         "Push yourself to your absolute limit. Do not slow down."}
                      </p>
                      <button 
                        onClick={() => setShowBriefing(false)}
                        className="mt-4 px-10 py-4 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(var(--primary),0.4)] relative z-10 flex items-center gap-3"
                      >
                        Press Enter to Begin
                        <span className="bg-background/20 px-2 py-1 rounded text-xs">⏎</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {stageState === "finished" && finalResults && (
          <motion.div
            key={`finished-${currentStageIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <TestResults 
              results={finalResults}
              onChangeSettings={() => {}}
              onRestart={() => {
                setStageState("typing");
                setFinalResults(null);
              }}
              onNextStage={currentStageIndex < lesson.stages.length - 1 ? handleNextStage : undefined}
              onNextLesson={currentStageIndex === lesson.stages.length - 1 ? () => {
                const nextId = lesson.lessonNumber < 700 ? `lesson-${lesson.lessonNumber + 1}` : null;
                if (nextId) router.push(`/learn/lesson?id=${nextId}`);
                else router.push(`/learn`);
              } : undefined}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function LessonContentWrapper() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("id") || "";
  return <LessonContent key={lessonId} lessonId={lessonId} />;
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center text-muted-foreground">Loading lesson...</div>}>
      <LessonContentWrapper />
    </Suspense>
  );
}
