'use client';

import * as React from 'react';

import { apiRequest, setAccessToken } from '@/lib/api/client';
import type { AuthResponse, PublicUser } from '@/lib/api/types';

/**
 * Client auth state. The access token is kept in memory by the API client; this
 * context tracks the current user and exposes login/register/logout. On mount it
 * attempts a silent refresh (httpOnly cookie) to restore an existing session
 * across reloads without persisting any token in storage.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface LoginArgs {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterArgs {
  email: string;
  password: string;
  username: string;
  isAdult: true;
  acceptTerms: true;
  acceptPrivacy: true;
  rememberMe?: boolean;
}

export interface VerifyTotpArgs {
  email: string;
  password: string;
  code: string;
  rememberMe?: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  login: (args: LoginArgs) => Promise<{ totp_required?: boolean; role?: string }>;
  register: (args: RegisterArgs) => Promise<void>;
  logout: () => Promise<void>;
  verifyTotp: (args: VerifyTotpArgs) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function applyAuth(
  res: AuthResponse,
  setUser: (u: PublicUser | null) => void,
  setStatus: (s: AuthStatus) => void,
): void {
  setAccessToken(res.access_token);
  setUser(res.user);
  setStatus('authenticated');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>('loading');

  // Silent bootstrap: try to mint a fresh access token from the refresh cookie.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiRequest<AuthResponse>('/auth/refresh', {
          method: 'POST',
          body: {},
        });
        if (!cancelled) {
          applyAuth(res, setUser, setStatus);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (args: LoginArgs): Promise<{ totp_required?: boolean; role?: string }> => {
    const res = await apiRequest<AuthResponse & { totp_required?: boolean }>('/auth/login', {
      method: 'POST',
      body: args,
    });
    if (res.totp_required) {
      return { totp_required: true };
    }
    applyAuth(res, setUser, setStatus);
    return { role: res.user?.role };
  }, []);

  const register = React.useCallback(async (args: RegisterArgs) => {
    const res = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: args });
    applyAuth(res, setUser, setStatus);
  }, []);

  const verifyTotp = React.useCallback(async (args: VerifyTotpArgs) => {
    const res = await apiRequest<AuthResponse>('/auth/totp/verify', { method: 'POST', body: args });
    applyAuth(res, setUser, setStatus);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST', body: {} });
    } finally {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('chat_draft_')) {
            keysToRemove.push(key);
          }
        }
        for (const key of keysToRemove) {
          window.localStorage.removeItem(key);
        }
      }
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, verifyTotp }),
    [status, user, login, register, logout, verifyTotp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
