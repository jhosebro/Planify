import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  /** Resolved theme after considering system preference */
  resolvedTheme: 'light' | 'dark';
}

interface ThemeActions {
  setMode: (mode: ThemeMode) => void;
  setSystemTheme: (isDark: boolean) => void;
  loadPersistedTheme: () => Promise<void>;
}

export type ThemeStore = ThemeState & ThemeActions;

const STORAGE_KEY = 'planify_theme_mode';

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'system',
  resolvedTheme: 'light',

  setMode: (mode) => {
    const resolved = mode === 'system' ? get().resolvedTheme : mode;
    set({ mode, resolvedTheme: resolved });
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  },

  setSystemTheme: (isDark) => {
    const currentMode = get().mode;
    if (currentMode === 'system') {
      set({ resolvedTheme: isDark ? 'dark' : 'light' });
    }
  },

  loadPersistedTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        const resolved = stored === 'system' ? get().resolvedTheme : stored;
        set({ mode: stored, resolvedTheme: resolved });
      }
    } catch {
      // Ignore storage errors
    }
  },
}));
