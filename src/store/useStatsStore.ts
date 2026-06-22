import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { syncStatsToFirebase, loadUserDataFromFirebase } from '@/lib/firebaseSync';
import { useUserStore } from './useUserStore';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export interface TestResult {
  id: string;
  wpm: number;
  accuracy: number;
  timestamp: number;
  type?: 'test' | 'lesson';
  title?: string;
  trustScore?: number;
  verified?: boolean;
  leaderboardEligible?: boolean;
  validationStatus?: 'verified' | 'monitored' | 'challenge' | 'blocked' | 'unverified';
  riskCategory?: string;
  securitySummary?: string[];
}

export interface TestSecurityMetadata {
  trustScore: number;
  verified: boolean;
  leaderboardEligible?: boolean;
  validationStatus: 'verified' | 'monitored' | 'challenge' | 'blocked' | 'unverified';
  riskCategory?: string;
  securitySummary?: string[];
}

interface StatsState {
  level: number;
  xp: number;
  testsCompleted: number;
  highestWpm: number;
  recentTests: TestResult[];
  completedLessons: string[];
  lessonProgress: Record<string, number>;
  addTestResult: (wpm: number, accuracy: number, type?: 'test' | 'lesson', security?: TestSecurityMetadata, title?: string) => void;
  completeLesson: (lessonId: string) => void;
  updateLessonProgress: (lessonId: string, stageIndex: number) => void;
  resetStats: () => void;
  addXp: (amount: number) => void;
  initializeCloudSync: () => Promise<void>;
}

// Background helper to push stats state updates to Firebase
const triggerSync = (state: StatsState) => {
  syncStatsToFirebase({
    level: state.level,
    xp: state.xp,
    testsCompleted: state.testsCompleted,
    highestWpm: state.highestWpm,
    recentTests: state.recentTests,
    completedLessons: state.completedLessons,
    lessonProgress: state.lessonProgress,
  });
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set, getStore) => ({
      level: 1,
      xp: 0,
      testsCompleted: 0,
      highestWpm: 0,
      recentTests: [],
      completedLessons: [],
      lessonProgress: {},
      
      resetStats: () => {
        set({ level: 1, xp: 0, testsCompleted: 0, highestWpm: 0, recentTests: [], completedLessons: [], lessonProgress: {} });
        triggerSync(getStore());
      },

      addXp: (amount) => {
        set((state) => {
          const newXp = state.xp + amount;
          const newLevel = Math.floor(newXp / 1000) + 1;
          const updated = { xp: newXp, level: newLevel };
          
          // Defer sync call
          setTimeout(() => triggerSync({ ...state, ...updated }), 0);
          return updated;
        });
      },

      completeLesson: (lessonId) => {
        set((state) => {
          const updated = {
            completedLessons: state.completedLessons.includes(lessonId) 
              ? state.completedLessons 
              : [...state.completedLessons, lessonId],
            lessonProgress: { ...state.lessonProgress, [lessonId]: 0 }
          };
          
          setTimeout(() => triggerSync({ ...state, ...updated }), 0);
          return updated;
        });
      },

      updateLessonProgress: (lessonId, stageIndex) => {
        set((state) => {
          const currentProgress = state.lessonProgress[lessonId] || 0;
          if (stageIndex > currentProgress) {
            const updated = {
              lessonProgress: { ...state.lessonProgress, [lessonId]: stageIndex }
            };
            setTimeout(() => triggerSync({ ...state, ...updated }), 0);
            return updated;
          }
          return state;
        });
      },

      addTestResult: (wpm, accuracy, type = 'test', security, title) => {
        set((state) => {
          const securityMeta: TestSecurityMetadata = security ?? {
            trustScore: 100,
            verified: true,
            leaderboardEligible: type === 'test' && accuracy >= 95,
            validationStatus: 'verified',
            riskCategory: 'Trusted',
            securitySummary: [],
          };
          const leaderboardEligible =
            securityMeta.leaderboardEligible ?? (type === 'test' && securityMeta.verified && accuracy >= 95);
          const newTest: TestResult = {
            id: crypto.randomUUID(),
            wpm,
            accuracy,
            timestamp: Date.now(),
            type,
            title,
            trustScore: securityMeta.trustScore,
            verified: securityMeta.verified,
            leaderboardEligible,
            validationStatus: securityMeta.validationStatus,
            riskCategory: securityMeta.riskCategory,
            securitySummary: securityMeta.securitySummary,
          };

          const newHighestWpm = leaderboardEligible ? Math.max(state.highestWpm, wpm) : state.highestWpm;
          const newTestsCompleted = type === 'test' ? state.testsCompleted + 1 : state.testsCompleted;
          const earnedXp = Math.floor(10 + (wpm * 0.5) + (accuracy === 100 ? 20 : 0));
          const newXp = state.xp + earnedXp;
          const newLevel = Math.floor(newXp / 1000) + 1;

          const updated = {
            level: newLevel,
            xp: newXp,
            testsCompleted: newTestsCompleted,
            highestWpm: newHighestWpm,
            recentTests: [newTest, ...state.recentTests].slice(0, 50),
          };

          setTimeout(() => triggerSync({ ...state, ...updated }), 0);
          return updated;
        });
      },

      initializeCloudSync: async () => {
        const cloudData = await loadUserDataFromFirebase();
        if (cloudData) {
          // Restore profile parameters to useUserStore
          if (cloudData.username && cloudData.avatar) {
            useUserStore.setState({
              username: cloudData.username,
              avatar: cloudData.avatar
            });
          }
          // Restore stats local parameters
          if (cloudData.stats) {
            set({
              level: cloudData.stats.level ?? 1,
              xp: cloudData.stats.xp ?? 0,
              testsCompleted: cloudData.stats.testsCompleted ?? 0,
              highestWpm: cloudData.stats.highestWpm ?? 0,
              recentTests: cloudData.stats.recentTests ?? [],
              completedLessons: cloudData.stats.completedLessons ?? [],
              lessonProgress: cloudData.stats.lessonProgress ?? {},
            });
          }
        }
      }
    }),
    {
      name: 'master-typing-stats-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
