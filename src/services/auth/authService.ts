import type { AuthCredentials, AuthResult } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

/**
 * Maximum number of consecutive failed login attempts before lockout.
 */
const MAX_FAILED_ATTEMPTS = 3;

/**
 * Lockout duration in milliseconds (5 minutes).
 */
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

/**
 * Tracks failed login attempts and lockout state per email.
 */
interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;
}

const lockoutMap = new Map<string, LockoutEntry>();

function getLockoutEntry(email: string): LockoutEntry {
  const normalized = email.toLowerCase();
  if (!lockoutMap.has(normalized)) {
    lockoutMap.set(normalized, { attempts: 0, lockedUntil: null });
  }
  return lockoutMap.get(normalized)!;
}

/**
 * AuthService using Supabase Auth.
 */
export const authService = {
  /**
   * Registers a new user with Supabase Auth.
   */
  async register(credentials: AuthCredentials): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return {
        success: false,
        error: { code: 'REGISTER_FAILED', message: error.message },
      };
    }

    if (data.session && data.user) {
      const store = useAuthStore.getState();
      store.setAuth(
        data.session.access_token,
        data.session.refresh_token,
        data.user.id
      );
      return {
        success: true,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    }

    // Email confirmation required
    return {
      success: true,
      token: undefined,
      refreshToken: undefined,
    };
  },

  /**
   * Authenticates user with Supabase Auth.
   * Enforces client-side lockout after 3 consecutive failed attempts.
   */
  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const email = credentials.email.toLowerCase();

    if (await this.isAccountLocked(email)) {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: 'Cuenta bloqueada por demasiados intentos fallidos. Intenta en 5 minutos.',
        },
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      // Increment failed attempts
      const entry = getLockoutEntry(email);
      entry.attempts += 1;
      if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
        entry.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }

      return {
        success: false,
        error: { code: 'LOGIN_FAILED', message: error.message },
      };
    }

    // Reset failed attempts on success
    lockoutMap.delete(email);

    if (data.session && data.user) {
      const store = useAuthStore.getState();
      store.setAuth(
        data.session.access_token,
        data.session.refresh_token,
        data.user.id
      );
    }

    return {
      success: true,
      token: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  },

  /**
   * Logs out the current user.
   */
  async logout(): Promise<void> {
    await supabase.auth.signOut();
    useAuthStore.getState().clearAuth();
  },

  /**
   * Refreshes the current session.
   */
  async refreshSession(refreshToken: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      useAuthStore.getState().clearAuth();
      return {
        success: false,
        error: { code: 'REFRESH_FAILED', message: error?.message ?? 'Session expired' },
      };
    }

    const store = useAuthStore.getState();
    store.setAuth(
      data.session.access_token,
      data.session.refresh_token,
      data.user?.id ?? store.userId ?? ''
    );

    return {
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    };
  },

  /**
   * Requests a password reset.
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { success: !error };
  },

  async getFailedAttempts(email: string): Promise<number> {
    return getLockoutEntry(email.toLowerCase()).attempts;
  },

  async isAccountLocked(email: string): Promise<boolean> {
    const entry = getLockoutEntry(email.toLowerCase());
    if (entry.lockedUntil === null) return false;
    if (Date.now() >= entry.lockedUntil) {
      lockoutMap.delete(email.toLowerCase());
      return false;
    }
    return true;
  },
};

export { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS };
