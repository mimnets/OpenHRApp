
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isPocketBaseConfigured());

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isConfigured && pb?.authStore.isValid && pb?.authStore.model) {
        const model = pb.authStore.model;
        const normalizedRole = (model.role || 'EMPLOYEE').toString().toUpperCase() as any;

        const userData: User = {
          id: model.id,
          employeeId: model.employee_id || '', 
          name: model.name || 'User',
          email: model.email,
          role: normalizedRole,
          department: model.department || 'Unassigned',
          designation: model.designation || 'Staff',
          teamId: model.team_id || undefined,
          avatar: model.avatar ? pb.files.getURL(model, model.avatar) : undefined
        };

        setUser(userData);
        // Background prefetch
        hrService.prefetchMetadata();
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();

    // Subscribe to external auth changes (e.g. from hrService updates)
    const unsubscribe = hrService.subscribe(() => {
      if (pb?.authStore.model) {
        const m = pb.authStore.model;
        const normalized = (m.role || 'EMPLOYEE').toString().toUpperCase() as any;
        setUser({
          id: m.id,
          employeeId: m.employee_id || '', 
          name: m.name || 'User',
          email: m.email,
          role: normalized,
          department: m.department || 'Unassigned',
          designation: m.designation || 'Staff',
          teamId: m.team_id || undefined,
          avatar: m.avatar ? pb.files.getURL(m, m.avatar) : undefined
        });
      } else {
        setUser(null);
      }
    });

    return () => { unsubscribe(); };
  }, [isConfigured]);

  const login = (userData: User) => {
    setUser(userData);
    hrService.prefetchMetadata();
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
