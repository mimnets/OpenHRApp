
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { hrService } from '../services/hrService';
import { pb, isPocketBaseConfigured } from '../services/pocketbase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setConfigured: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const VISIBILITY_REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes

function buildUserFromModel(model: any): User {
  return {
    id: model.id,
    employeeId: model.employee_id || '',
    name: model.name || 'User',
    email: model.email,
    role: (model.role || 'EMPLOYEE').toString().toUpperCase() as any,
    department: model.department || 'Unassigned',
    designation: model.designation || 'Staff',
    teamId: model.team_id || undefined,
    avatar: model.avatar && pb ? pb.files.getURL(model, model.avatar) : undefined,
  };
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isPocketBaseConfigured());
  const lastRefresh = useRef<number>(0);

  const refreshAuth = useCallback(async () => {
    if (!pb || !pb.authStore.isValid) return false;
    try {
      await pb.collection('users').authRefresh();
      lastRefresh.current = Date.now();
      return true;
    } catch {
      pb.authStore.clear();
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isConfigured && pb?.authStore.isValid && pb?.authStore.model) {
        try {
          await pb.collection('users').authRefresh();
          lastRefresh.current = Date.now();
          const model = pb.authStore.model;
          if (model) {
            setUser(buildUserFromModel(model));
            hrService.prefetchMetadata();
          } else {
            setUser(null);
          }
        } catch {
          // Token expired on server — force logout
          pb.authStore.clear();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();

    // Subscribe to external auth changes (e.g. from hrService updates)
    const unsubscribe = hrService.subscribe(() => {
      if (pb?.authStore.model) {
        setUser(buildUserFromModel(pb.authStore.model));
      } else {
        setUser(null);
      }
    });

    return () => { unsubscribe(); };
  }, [isConfigured, refreshAuth]);

  // Periodic token refresh (every 30 minutes)
  useEffect(() => {
    if (!user || !pb) return;
    const interval = setInterval(() => { refreshAuth(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [user, refreshAuth]);

  // Refresh token when app returns to foreground
  useEffect(() => {
    if (!user || !pb) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > VISIBILITY_REFRESH_COOLDOWN) {
        refreshAuth();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, refreshAuth]);

  const login = (userData: User) => {
    setUser(userData);
    // prefetchMetadata() is called once from initAuth — no duplicate call needed here
  };

  const logout = async () => {
    await hrService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isConfigured, login, logout, setConfigured: setIsConfigured }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
