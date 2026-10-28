'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  experienceLevel: string;
  dailyMinutes: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

export interface User {
  id: string;
  email: string;
  role: 'LEARNER' | 'ADMIN';
  profile?: UserProfile | null;
  streak?: {
    currentStreak: number;
    longestStreak: number;
  } | null;
  subscriptions?: Array<{
    status: string;
    plan: {
      code: string;
      name: string;
    };
  }>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  signin: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (data: { email: string; password: string; displayName: string }) => Promise<void>;
  signout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiClient('/auth/me');
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('companion_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signin = async (credentials: { email: string; password: string }) => {
    const data = await apiClient('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (data?.token && typeof window !== 'undefined') {
      localStorage.setItem('companion_token', data.token);
    }
    if (data?.user) {
      setUser(data.user);
    }
  };

  const signup = async (payload: { email: string; password: string; displayName: string }) => {
    const data = await apiClient('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (data?.token && typeof window !== 'undefined') {
      localStorage.setItem('companion_token', data.token);
    }
    if (data?.user) {
      setUser(data.user);
    }
  };

  const signout = async () => {
    try {
      await apiClient('/auth/signout', { method: 'POST' });
    } catch (e) {
      // Continue cleanup on frontend
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('companion_token');
      }
      setUser(null);
      window.location.href = '/';
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin, signin, signup, signout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
