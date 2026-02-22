
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppTheme } from '../types';
import { apiClient } from '../services/api.client';

export const THEMES: AppTheme[] = [
  { id: 'indigo', name: 'Executive Blue', colors: { primary: '#4f46e5', hover: '#4338ca', light: '#e0e7ff' } },
  { id: 'emerald', name: 'Sustainable Green', colors: { primary: '#059669', hover: '#047857', light: '#d1fae5' } },
  { id: 'violet', name: 'Royal Purple', colors: { primary: '#7c3aed', hover: '#6d28d9', light: '#ede9fe' } },
  { id: 'rose', name: 'Passion Red', colors: { primary: '#e11d48', hover: '#be123c', light: '#ffe4e6' } },
  { id: 'amber', name: 'Sunset Orange', colors: { primary: '#d97706', hover: '#b45309', light: '#fef3c7' } },
  { id: 'slate', name: 'Midnight Dark', colors: { primary: '#334155', hover: '#1e293b', light: '#f1f5f9' } },
  { id: 'teal', name: 'Ocean Teal', colors: { primary: '#0d9488', hover: '#0f766e', light: '#ccfbf1' } },
];

export type DarkModePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  currentTheme: AppTheme;
  setTheme: (id: string) => void;
  darkMode: boolean;
  darkModePreference: DarkModePreference;
  setDarkModePreference: (pref: DarkModePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);
  const [darkModePreference, setDarkModePrefState] = useState<DarkModePreference>('system');
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);

  const darkMode = darkModePreference === 'system' ? systemDark : darkModePreference === 'dark';

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('openhr-theme');
    if (savedTheme) {
      const found = THEMES.find(t => t.id === savedTheme);
      if (found) setCurrentTheme(found);
    } else {
      // No user preference — try fetching platform default from PocketBase
      fetchPlatformDefault();
    }
    const savedDark = localStorage.getItem('openhr-dark-mode') as DarkModePreference | null;
    if (savedDark && ['light', 'dark', 'system'].includes(savedDark)) {
      setDarkModePrefState(savedDark);
    }
  }, []);

  const fetchPlatformDefault = async () => {
    try {
      if (!apiClient.pb || !apiClient.isConfigured()) return;
      const record = await apiClient.pb.collection('settings').getFirstListItem(
        'key = "default_theme"',
        { requestKey: 'platform_default_theme' }
      );
      if (record?.value) {
        const found = THEMES.find(t => t.id === record.value);
        if (found) setCurrentTheme(found);
      }
    } catch {
      // Not found or not configured — keep default indigo
    }
  };

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply dark class to <html> and update meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', darkMode ? '#0f172a' : '#fcfdfe');
    }
  }, [darkMode]);

  // Apply CSS variables whenever accent theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--primary-hover', currentTheme.colors.hover);
    root.style.setProperty('--primary-light', currentTheme.colors.light);
    root.style.setProperty('--primary-light-dark', `${currentTheme.colors.primary}20`);
  }, [currentTheme]);

  const setTheme = (id: string) => {
    const found = THEMES.find(t => t.id === id);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('openhr-theme', id);
    }
  };

  const setDarkModePreference = (pref: DarkModePreference) => {
    setDarkModePrefState(pref);
    localStorage.setItem('openhr-dark-mode', pref);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, darkMode, darkModePreference, setDarkModePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
