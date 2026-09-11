import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'planify_onboarding_done';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userId: string | null;
  hasSeenOnboarding: boolean;
  onboardingHydrated: boolean;
}

interface AuthActions {
  setAuth: (token: string, refreshToken: string, userId: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
  hydrateOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  userId: null,
  hasSeenOnboarding: false,
  onboardingHydrated: false,

  setAuth: (token, refreshToken, userId) =>
    set({ token, refreshToken, isAuthenticated: true, userId }),

  clearAuth: () =>
    set({ token: null, refreshToken: null, isAuthenticated: false, userId: null }),

  setToken: (token) => set({ token }),

  /** Reads the persisted flag from AsyncStorage on app start. */
  hydrateOnboarding: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({ hasSeenOnboarding: value === 'true', onboardingHydrated: true });
    } catch {
      set({ hasSeenOnboarding: false, onboardingHydrated: true });
    }
  },

  /** Marks onboarding as done and persists it. */
  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // non-critical — worst case onboarding shows again next launch
    }
    set({ hasSeenOnboarding: true });
  },
}));
