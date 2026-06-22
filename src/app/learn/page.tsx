"use client";

import { useState } from "react";
import { useStatsStore } from "@/store/useStatsStore";
import { useUserStore } from "@/store/useUserStore";
import { useContentStore } from "@/store/useContentStore";
import { CATEGORY_DETAILS, LessonCategory } from "@/data/lessons";
import { BookOpen, CheckCircle, Lock, Play, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const LESSONS_PER_PAGE = 16;

export default function LearnPage() {
  const { completedLessons } = useStatsStore();
  const { isAdmin } = useUserStore();
  const { lessons } = useContentStore();
  const [activeCategory, setActiveCategory] = useState<LessonCategory>("beginner");
  const [currentPage, setCurrentPage] = useState(1);

  const categoryLessons = lessons.filter(l => l.category === activeCategory);
  
  const totalPages = Math.ceil(categoryLessons.length / LESSONS_PER_PAGE);
  const currentLessons = categoryLessons.slice(
    (currentPage - 1) * LESSONS_PER_PAGE,
    currentPage * LESSONS_PER_PAGE
  );

  const getDifficultyColor = (diff: number) => {
    switch (diff) {
      case 1: return "text-green-400 bg-green-400/10";
      case 2: return "text-blue-400 bg-blue-400/10";
      case 3: return "text-yellow-400 bg-yellow-400/10";
      case 4: return "text-orange-400 bg-orange-400/10";
      case 5: return "text-red-400 bg-red-400/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const handleCategoryChange = (category: LessonCategory) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const getCategoryProgress = (category: LessonCategory) => {
    const total = lessons.filter(l => l.category === category).length;
    const completed = lessons.filter(l => l.category === category && completedLessons.includes(l.id)).length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const categories: LessonCategory[] = ["beginner", "intermediate", "expert", "master"];

  const nextLesson = lessons.find(l => !completedLessons.includes(l.id));
  const globalProgress = Math.round((completedLessons.length / lessons.length) * 100);

  return (
    <div className="max-w-[2048px] w-full mx-auto flex flex-col gap-6 pb-6 pt-2 flex-1">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Learning Path
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Master touch typing through our structured curriculum. Start from the basics and work your way up to professional speeds.
        </p>
      </div>

      {/* Global Progress & Resume Banner */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col gap-2 relative z-10 w-full md:w-1/2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-foreground">Global Progress</h2>
            <span className="text-xs font-bold text-primary">{completedLessons.length} / {lessons.length} Lessons</span>
          </div>
          <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-1000" 
              style={{ width: `${globalProgress}%` }} 
            />
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-1.5 relative z-10">
          {nextLesson ? (
            <>
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Up Next</span>
              <h3 className="text-lg font-bold text-foreground mb-1">{nextLesson.title}</h3>
              <Link 
                href={`/learn/lesson?id=${nextLesson.id}`}
                className="px-5 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Resume Journey
                <Play className="w-4 h-4 fill-current" />
              </Link>
            </>
          ) : (
            <>
              <span className="text-[11px] text-primary font-medium uppercase tracking-wider">Mastery Achieved</span>
              <h3 className="text-lg font-bold text-foreground mb-1">Curriculum Complete!</h3>
              <div className="px-5 py-2 bg-foreground/10 text-muted-foreground text-sm font-bold rounded-lg flex items-center gap-2 cursor-not-allowed">
                <CheckCircle className="w-4 h-4" />
                All Lessons Finished
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const progress = getCategoryProgress(cat);
          return (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`p-3 rounded-xl text-left border transition-all ${
                isActive 
                  ? "bg-primary/10 border-primary" 
                  : "bg-foreground/5 border-foreground/10 hover:border-foreground/30"
              }`}
            >
              <h3 className={`font-bold text-sm mb-0.5 ${isActive ? "text-primary" : "text-foreground"}`}>
                {CATEGORY_DETAILS[cat].title.split(" - ")[0]}
              </h3>
              <p className="text-[11px] text-muted-foreground mb-2">{CATEGORY_DETAILS[cat].title.split(" - ")[1]}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">{progress.percentage}%</span>
                <span className="text-[11px] text-muted-foreground">{progress.completed}/{progress.total}</span>
              </div>
              <div className="w-full h-1 bg-foreground/10 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${isActive ? "bg-primary" : "bg-foreground/30"}`} 
                  style={{ width: `${progress.percentage}%` }} 
                />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{CATEGORY_DETAILS[activeCategory].title}</h2>
            <p className="text-muted-foreground text-sm">{CATEGORY_DETAILS[activeCategory].description}</p>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lesson Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {currentLessons.map((lesson) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const globalIndex = lessons.findIndex(l => l.id === lesson.id);
            const isFirstLesson = globalIndex === 0;
            const previousLessonCompleted = isFirstLesson ? true : completedLessons.includes(lessons[globalIndex - 1].id);
            const isLocked = !isAdmin && !isFirstLesson && !previousLessonCompleted && !isCompleted;

            const CardContent = () => (
              <div className={`p-4 rounded-xl border transition-all h-full flex flex-col justify-between group
                ${isCompleted 
                  ? 'bg-primary/5 border-primary/30 hover:border-primary/60 cursor-pointer' 
                  : isLocked
                    ? 'bg-foreground/5 border-foreground/5 opacity-50 cursor-not-allowed grayscale'
                    : 'bg-foreground/5 border-foreground/5 hover:border-foreground/20 hover:bg-foreground/10 cursor-pointer'
                }`}
              >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-foreground/10 text-muted-foreground uppercase tracking-wider">
                        {lesson.stages.length} Stages
                      </span>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : isLocked ? (
                        <Lock className="w-5 h-5 text-muted-foreground/50" />
                      ) : (
                        <Play className="w-5 h-5 text-foreground/20 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    <h3 className={`text-base font-bold mb-0.5 ${isCompleted ? 'text-primary' : isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {lesson.title}
                    </h3>
                  </div>
              </div>
            );

            if (isLocked) {
              return <div key={lesson.id}><CardContent /></div>;
            }

            return (
              <Link href={`/learn/lesson?id=${lesson.id}`} key={lesson.id}>
                <CardContent />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
