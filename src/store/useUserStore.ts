import { create } from 'zustand';
import { persist, StateStorage, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { syncUserProfileToFirebase } from '@/lib/firebaseSync';

// Custom storage for Zustand using IndexedDB (idb-keyval)
// This ensures we can store large amounts of data securely and purely offline.
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

interface UserState {
  username: string;
  avatar: string;
  joinedAt: number | null;
  isAdmin: boolean;
  setUsername: (name: string) => void;
  setAvatar: (avatar: string) => void;
  resetUser: () => void;
  syncFromAuth: (displayName: string | null, photoURL: string | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      username: "Guest User",
      avatar: "User",
      joinedAt: null,
      isAdmin: false,
      setUsername: (name) => set((state) => {
        const joined = Date.now();
        syncUserProfileToFirebase(name, state.avatar);
        return { username: name, joinedAt: joined };
      }),
      setAvatar: (avatar) => set((state) => {
        syncUserProfileToFirebase(state.username, avatar);
        return { avatar };
      }),
      resetUser: () => set(() => {
        syncUserProfileToFirebase("Guest User", "User");
        return { username: "Guest User", avatar: "User", joinedAt: null, isAdmin: false };
      }),
      syncFromAuth: (displayName, photoURL) => set((state) => {
        const updates: Partial<UserState> = {};
        if (displayName && displayName !== state.username) {
          updates.username = displayName;
        }
        if (photoURL && photoURL !== state.avatar) {
          updates.avatar = photoURL;
        }
        if (!state.joinedAt) {
          updates.joinedAt = Date.now();
        }
        if (Object.keys(updates).length > 0) {
          return updates as any;
        }
        return state;
      }),
    }),
    {
      name: 'master-typing-user-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        username: state.username,
        avatar: state.avatar,
        joinedAt: state.joinedAt,
      }),
    }
  )
);
