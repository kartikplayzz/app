import { create } from "zustand";
import { persist } from "zustand/middleware";
import { LESSONS, Lesson, LessonStage, LessonCategory } from "@/data/lessons";

export interface LayoutConfig {
  showKeyboard: boolean;
  keyboardSize: "small" | "medium" | "large";
  showStats: boolean;
  showSettingsBar: boolean;
  layoutOrder: string[]; // e.g. ["header", "settings", "text", "keyboard", "stats"]
}

const defaultLayout: LayoutConfig = {
  showKeyboard: true,
  keyboardSize: "medium",
  showStats: true,
  showSettingsBar: true,
  layoutOrder: ["settings", "text", "keyboard"]
};

interface ContentState {
  lessons: Lesson[];
  trash: Lesson[];
  layoutConfig: LayoutConfig;
  
  // Actions
  updateLayoutConfig: (updates: Partial<LayoutConfig>) => void;
  addLesson: (lesson: Lesson) => void;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;
  restoreLesson: (id: string) => void;
  hardDeleteLesson: (id: string) => void;
  reorderLessons: (activeId: string, overId: string) => void;
  
  // Stage actions
  addStage: (lessonId: string, stage: LessonStage) => void;
  updateStage: (lessonId: string, stageId: string, updates: Partial<LessonStage>) => void;
  deleteStage: (lessonId: string, stageId: string) => void;
  reorderStages: (lessonId: string, activeId: string, overId: string) => void;
  
  resetToDefaults: () => void;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set) => ({
      lessons: LESSONS,
      trash: [],
      layoutConfig: defaultLayout,

      updateLayoutConfig: (updates) => set((state) => ({
        layoutConfig: { ...state.layoutConfig, ...updates }
      })),

      addLesson: (lesson) => set((state) => ({ 
        lessons: [...state.lessons, lesson] 
      })),

      updateLesson: (id, updates) => set((state) => ({
        lessons: state.lessons.map(l => l.id === id ? { ...l, ...updates } : l)
      })),

      deleteLesson: (id) => set((state) => {
        const lessonToTrash = state.lessons.find(l => l.id === id);
        if (!lessonToTrash) return state;
        return {
          lessons: state.lessons.filter(l => l.id !== id),
          trash: [...state.trash, lessonToTrash]
        };
      }),

      restoreLesson: (id) => set((state) => {
        const lessonToRestore = state.trash.find(l => l.id === id);
        if (!lessonToRestore) return state;
        return {
          trash: state.trash.filter(l => l.id !== id),
          lessons: [...state.lessons, lessonToRestore].sort((a, b) => a.lessonNumber - b.lessonNumber)
        };
      }),

      hardDeleteLesson: (id) => set((state) => ({
        trash: state.trash.filter(l => l.id !== id)
      })),

      reorderLessons: (activeId, overId) => set((state) => {
        const oldIndex = state.lessons.findIndex(l => l.id === activeId);
        const newIndex = state.lessons.findIndex(l => l.id === overId);
        
        if (oldIndex === -1 || newIndex === -1) return state;
        
        const newLessons = [...state.lessons];
        const [movedItem] = newLessons.splice(oldIndex, 1);
        newLessons.splice(newIndex, 0, movedItem);
        
        // Update lesson numbers
        const updatedLessons = newLessons.map((l, idx) => ({
          ...l,
          lessonNumber: idx + 1
        }));
        
        return { lessons: updatedLessons };
      }),
      
      addStage: (lessonId, stage) => set((state) => ({
        lessons: state.lessons.map(l => {
          if (l.id !== lessonId) return l;
          return { ...l, stages: [...l.stages, stage] };
        })
      })),
      
      updateStage: (lessonId, stageId, updates) => set((state) => ({
        lessons: state.lessons.map(l => {
          if (l.id !== lessonId) return l;
          return {
            ...l,
            stages: l.stages.map(s => s.id === stageId ? { ...s, ...updates } : s)
          };
        })
      })),
      
      deleteStage: (lessonId, stageId) => set((state) => ({
        lessons: state.lessons.map(l => {
          if (l.id !== lessonId) return l;
          return {
            ...l,
            stages: l.stages.filter(s => s.id !== stageId)
          };
        })
      })),
      
      reorderStages: (lessonId, activeId, overId) => set((state) => ({
        lessons: state.lessons.map(l => {
          if (l.id !== lessonId) return l;
          const oldIndex = l.stages.findIndex(s => s.id === activeId);
          const newIndex = l.stages.findIndex(s => s.id === overId);
          if (oldIndex === -1 || newIndex === -1) return l;
          
          const newStages = [...l.stages];
          const [movedItem] = newStages.splice(oldIndex, 1);
          newStages.splice(newIndex, 0, movedItem);
          
          return { ...l, stages: newStages };
        })
      })),

      resetToDefaults: () => set({ lessons: LESSONS, trash: [], layoutConfig: defaultLayout })
    }),
    {
      name: 'content-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0 || !persistedState || (persistedState.lessons && persistedState.lessons.length <= 50)) {
          return {
            ...persistedState,
            lessons: LESSONS,
            trash: [],
          };
        }
        return persistedState;
      }
    }
  )
);
