"use client";
import { useState, useMemo } from "react";
import { useContentStore } from "@/store/useContentStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { CATEGORY_DETAILS, LessonCategory } from "@/data/lessons";
import { Library, Search, Play, CheckCircle, Lock, Filter, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/SpotlightCard";

export default function LessonLibraryPage() {
  const { lessons } = useContentStore();
  const { completedLessons } = useStatsStore();
  const { isAdmin } = useUserStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || lesson.category === selectedCategory;
      
      let matchesDifficulty = true;
      if (selectedDifficulty !== "all") {
        const diffNum = parseInt(selectedDifficulty, 10);
        const totalKeys = lesson.stages.reduce((acc, stage) => acc + stage.targetText.length, 0);
        // Categorize difficulty based on length of text / number of unique characters
        const diffRating = Math.min(5, Math.ceil(totalKeys / 150) || 1);
        matchesDifficulty = diffRating === diffNum;
      }

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [lessons, searchQuery, selectedCategory, selectedDifficulty]);

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
          <Library className="w-9 h-9 text-primary animate-pulse" />
          Lesson Curriculum Library
        </h1>
        <p className="text-muted-foreground text-lg">
          Browse and filter the complete structured database of keyboard typing lessons.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <SpotlightCard
        glowColor="rgba(255, 255, 255, 0.04)"
        className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4 border border-white/5"
      >
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lessons by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-foreground/5 border border-foreground/10 rounded-xl pl-10 pr-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-44 bg-foreground/5 border border-foreground/10 rounded-xl px-3.5 py-3 text-sm text-foreground focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
            <option value="master">Master</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="w-full md:w-36 bg-foreground/5 border border-foreground/10 rounded-xl px-3.5 py-3 text-sm text-foreground focus:outline-none transition-all cursor-pointer shrink-0"
        >
          <option value="all">All Difficulties</option>
          <option value="1">★☆☆☆☆ Easy</option>
          <option value="2">★★☆☆☆ Normal</option>
          <option value="3">★★★☆☆ Medium</option>
          <option value="4">★★★★☆ Hard</option>
          <option value="5">★★★★★ Expert</option>
        </select>
      </SpotlightCard>

      {/* Grid count and status */}
      <div className="flex justify-between items-center px-2">
        <span className="text-xs text-muted-foreground font-semibold">
          Found <strong className="text-white">{filteredLessons.length}</strong> lessons
        </span>
        <span className="text-xs text-muted-foreground">
          Completed <strong className="text-primary">{completedLessons.length}</strong> of <strong className="text-white">{lessons.length}</strong>
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredLessons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filteredLessons.map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const globalIndex = lessons.findIndex((l) => l.id === lesson.id);
              const isFirstLesson = globalIndex === 0;
              const previousLessonCompleted = isFirstLesson ? true : completedLessons.includes(lessons[globalIndex - 1].id);
              const isLocked = !isAdmin && !isFirstLesson && !previousLessonCompleted && !isCompleted;

              return (
                <SpotlightCard
                  key={lesson.id}
                  glowColor={isCompleted ? "rgba(34, 197, 94, 0.08)" : isLocked ? "rgba(255, 255, 255, 0)" : "rgba(168, 85, 247, 0.08)"}
                  className={`glass-panel p-5 rounded-2xl border flex flex-col justify-between group transition-all duration-300 relative overflow-hidden h-[155px] ${
                    isCompleted
                      ? "bg-emerald-500/[0.02] border-emerald-500/10 hover:border-emerald-500/20"
                      : isLocked
                      ? "opacity-45 bg-black/20 border-foreground/5 cursor-not-allowed"
                      : "bg-white/[0.015] border-white/5 hover:border-primary/25 hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Glowing background */}
                  {isCompleted && (
                    <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  )}
                  
                  <div className="flex flex-col gap-3 relative z-10 w-full">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        lesson.category === "beginner" ? "bg-green-500/10 text-green-400" :
                        lesson.category === "intermediate" ? "bg-blue-500/10 text-blue-400" :
                        lesson.category === "expert" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {lesson.category}
                      </span>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 shadow-inner" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4 text-muted-foreground/45" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    <div className="flex flex-col">
                      <h3 className={`font-bold text-base leading-tight truncate ${
                        isCompleted ? "text-emerald-400" : isLocked ? "text-muted-foreground" : "text-foreground"
                      }`}>
                        {lesson.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground/60 mt-1">
                        Lesson #{lesson.lessonNumber} · {lesson.stages.length} Stages
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-auto relative z-10">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                      {lesson.category === "master" ? "Curriculum Max" : `Step ${globalIndex + 1}`}
                    </span>
                    {!isLocked ? (
                      <Link
                        href={`/learn/lesson?id=${lesson.id}`}
                        className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                          isCompleted
                            ? "text-emerald-400 hover:text-emerald-300"
                            : "text-primary hover:text-white"
                        }`}
                      >
                        {isCompleted ? "Retry" : "Start"}
                        <Play className="w-3 h-3 fill-current" />
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/35 font-bold uppercase tracking-wide">Locked</span>
                    )}
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-white/5 rounded-3xl gap-3">
            <Library className="w-12 h-12 text-muted-foreground/30 animate-pulse" />
            <h3 className="text-lg font-bold text-white">No lessons match your filters</h3>
            <p className="text-xs text-muted-foreground">Try clearing your search query or selecting other filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedDifficulty("all");
              }}
              className="mt-2 px-4 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl text-xs font-bold text-primary transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
