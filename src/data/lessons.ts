import rawLessons from './lessons.json';

export interface LessonStage {
  id: string;
  title: string;
  targetText: string;
}

export type LessonCategory = "beginner" | "intermediate" | "expert" | "master";

export interface Lesson {
  id: string;
  lessonNumber: number;
  title: string;
  description: string;
  category: LessonCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  stages: LessonStage[];
}

export const CATEGORY_DETAILS = {
  beginner: {
    title: "Beginner - Home Row & Alphabet",
    description: "Lessons 1-150: Master the home row, top row, and bottom row letters.",
  },
  intermediate: {
    title: "Intermediate - Words & Capitalization",
    description: "Lessons 151-350: Build muscle memory with common words and shift key.",
  },
  expert: {
    title: "Expert - Numbers & Symbols",
    description: "Lessons 351-550: Conquer numbers and special characters without looking.",
  },
  master: {
    title: "Master - Speed & Flow",
    description: "Lessons 551-700: Build blistering speed with complex word combinations.",
  },
};

// We cast the imported raw JSON data to our strict TypeScript Lesson array type.
// The procedural generation formula has been permanently deleted from this file,
// and all 700 lessons (and 4,900 stages) are now physically loaded from lessons.json.
export const LESSONS: Lesson[] = rawLessons as Lesson[];
