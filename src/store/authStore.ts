import { create } from 'zustand';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  userId: string | null;
}

interface AuthActions {
  setAuth: (token: string, refreshToken: string, userId: string) => void;
  clearAuth: () => void;
  setToken: (token: string) => void;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  userId: null,

  setAuth: (token, refreshToken, userId) =>
    set({
      token,
      refreshToken,
      isAuthenticated: true,
      userId,
    }),

  clearAuth: () =>
    set({
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      userId: null,
    }),

  setToken: (token) =>
    set({ token }),
}));
