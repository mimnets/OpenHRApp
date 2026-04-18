
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { hrService } from '../services/hrService';
import { isPocketBaseConfigured } from '../services/pocketbase';
import { sessionManager } from '../services/session/sessionManager';
import { RefreshStatus } from '../services/session/sessionManager.types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  refreshStatus: RefreshStatus;
  login: (user: User) => void;
  logout: () => Promise<void>;
  setConfigured: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthContext is now a thin UI layer. All session/auth lifecycle decisions
 * live in `src/services/session/sessionManager.ts` (FROZEN MODULE). Do not
 * reintroduce pb.authStore.clear() here — route through sessionManager.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>({ kind: 'idle' });
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isPocketBaseConfigured());

  useEffect(() => {
    let mounted = true;

    const unsubscribe = sessionManager.subscribe((snapshot) => {
      if (!mounted) return;
      setUser(snapshot.user);
      setRefreshStatus(snapshot.status);
    });

    const initAuth = async () => {
      setIsLoading(true);
      if (isConfigured) {
        const { user: initialUser } = await sessionManager.initialize();
        if (initialUser) hrService.prefetchMetadata();
      }
      if (mounted) setIsLoading(false);
    };

    initAuth();

    // Subscribe to external auth changes (e.g. from hrService profile updates)
    const unsubscribeHr = hrService.subscribe(() => {
      // hrService.notify() fires after a profile save — re-read the auth model
      // via sessionManager so we stay the single source of truth.
      const snap = sessionManager.getSnapshot();
      if (snap.user) {
        // Force a refresh so the user object reflects updated fields.
        sessionManager.setCurrentUser(snap.user);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      unsubscribeHr();
    };
  }, [isConfigured]);

  // Periodic token refresh (every 30 minutes) — delegated to sessionManager.
  useEffect(() => {
    if (!user) return;
    const stop = sessionManager.scheduleRefresh();
    return stop;
  }, [user]);

  // Refresh when the app returns to foreground — delegated to sessionManager.
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sessionManager.onVisible();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user]);

  const login = (userData: User) => {
    sessionManager.setCurrentUser(userData);
    // prefetchMetadata is called by initAuth on refresh paths; for a fresh
    // login we prefetch here since initAuth already finished.
    hrService.prefetchMetadata();
  };

  const logout = async () => {
    await hrService.logout();
    // hrService.logout → auth.service.logout → sessionManager.forceLogout
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isConfigured, refreshStatus, login, logout, setConfigured: setIsConfigured }}>
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
