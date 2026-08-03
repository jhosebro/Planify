import type { AuthCredentials, AuthResult } from '@/types/auth';

/**
 * Local mock implementation of the auth API.
 * Stores users in memory for development/testing purposes.
 * Replace with real HTTP calls when backend is available by setting
 * EXPO_PUBLIC_API_URL environment variable.
 */

const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL;

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.planify.app';

// ─── Local Mock Storage ──────────────────────────────────────────────────────

interface StoredUser {
  email: string;
  passwordHash: string;
  userId: string;
}

const localUsers: Map<string, StoredUser> = new Map();

function generateMockToken(userId: string): string {
  // Create a simple base64-encoded JWT-like token for local dev
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      email: userId,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    })
  );
  return `${header}.${payload}.mock-signature`;
}

function generateUserId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'user-' + Math.random().toString(36).substring(2, 15);
}

// Simple hash for local storage (NOT secure — for dev only)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return 'h' + Math.abs(hash).toString(36);
}

// ─── Mock API Implementation ─────────────────────────────────────────────────

const mockApi = {
  async register(credentials: AuthCredentials): Promise<AuthResult> {
    const email = credentials.email.toLowerCase();

    if (localUsers.has(email)) {
      return {
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Ya existe una cuenta con este correo electrónico.' },
      };
    }

    const userId = generateUserId();
    localUsers.set(email, {
      email,
      passwordHash: simpleHash(credentials.password),
      userId,
    });

    const token = generateMockToken(userId);
    return {
      success: true,
      token,
      refreshToken: `refresh-${token}`,
    };
  },

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const email = credentials.email.toLowerCase();
    const user = localUsers.get(email);

    if (!user) {
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
      };
    }

    if (user.passwordHash !== simpleHash(credentials.password)) {
      return {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' },
      };
    }

    const token = generateMockToken(user.userId);
    return {
      success: true,
      token,
      refreshToken: `refresh-${token}`,
    };
  },

  async logout(_token: string): Promise<void> {
    // No-op for local mock
  },

  async refreshToken(_refreshToken: string): Promise<AuthResult> {
    // For local mock, just issue a new token
    const userId = generateUserId();
    const token = generateMockToken(userId);
    return {
      success: true,
      token,
      refreshToken: `refresh-${token}`,
    };
  },

  async requestPasswordReset(_email: string): Promise<{ success: boolean }> {
    // Always succeed in mock mode
    return { success: true };
  },
};

// ─── Real API Implementation ─────────────────────────────────────────────────

const realApi = {
  async register(credentials: AuthCredentials): Promise<AuthResult> {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data: AuthResult = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error ?? { code: 'REGISTER_FAILED', message: 'Registration failed' },
      };
    }
    return data;
  },

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data: AuthResult = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error ?? { code: 'LOGIN_FAILED', message: 'Login failed' },
      };
    }
    return data;
  },

  async logout(token: string): Promise<void> {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data: AuthResult = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error ?? { code: 'REFRESH_FAILED', message: 'Token refresh failed' },
      };
    }
    return data;
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return { success: false };
    }
    return { success: true };
  },
};

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * Auth API layer.
 * Uses local mock when no EXPO_PUBLIC_API_URL is set.
 * Set EXPO_PUBLIC_API_URL in .env to point to a real backend.
 */
export const authApi = USE_MOCK ? mockApi : realApi;
