
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppTheme } from '../types';
import { apiClient } from '../services/api.client';

const THEME_CACHE_KEY = 'openhr-global-theme';

export const THEMES: AppTheme[] = [
  // Original themes
  { id: 'arctic-frost', name: 'Arctic Frost', colors: { primary: '#4a6fa5', hover: '#3b5d8c', light: '#d4e4f7' } },
  { id: 'corporate-blue', name: 'Corporate Blue', colors: { primary: '#2563eb', hover: '#1d4ed8', light: '#dbeafe' } },
  { id: 'ocean-depths', name: 'Ocean Depths', colors: { primary: '#2d8b8b', hover: '#24706f', light: '#ccecec' } },
  { id: 'modern-minimal', name: 'Modern Minimal', colors: { primary: '#36454f', hover: '#2a363e', light: '#e8ecef' } },
  { id: 'forest-canopy', name: 'Forest Canopy', colors: { primary: '#2d4a2b', hover: '#1f3620', light: '#d5e3d4' } },
  { id: 'midnight-galaxy', name: 'Midnight Galaxy', colors: { primary: '#4a4e8f', hover: '#3b3f73', light: '#e0e1f0' } },
  { id: 'tech-innovation', name: 'Tech Innovation', colors: { primary: '#0066ff', hover: '#0052cc', light: '#d6e8ff' } },
  // Warm tones
  { id: 'sunset-orange', name: 'Sunset Orange', colors: { primary: '#e2582e', hover: '#c44a25', light: '#fde0d5' } },
  { id: 'rose-garden', name: 'Rose Garden', colors: { primary: '#e11d62', hover: '#be1854', light: '#fce4ef' } },
  { id: 'golden-amber', name: 'Golden Amber', colors: { primary: '#b8860b', hover: '#9a7009', light: '#faf0d4' } },
  // Cool tones
  { id: 'deep-indigo', name: 'Deep Indigo', colors: { primary: '#4f46e5', hover: '#4338ca', light: '#e0e0fc' } },
  { id: 'royal-purple', name: 'Royal Purple', colors: { primary: '#7c3aed', hover: '#6d28d9', light: '#ede4fd' } },
  { id: 'teal-wave', name: 'Teal Wave', colors: { primary: '#0d9488', hover: '#0f766e', light: '#ccfbf1' } },
  // Neutral
  { id: 'charcoal-slate', name: 'Charcoal Slate', colors: { primary: '#475569', hover: '#334155', light: '#e2e8f0' } },
];

function getCachedTheme(): AppTheme {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      const found = THEMES.find(t => t.id === cached);
      if (found) return found;
    }
  } catch { /* localStorage unavailable */ }
  return THEMES.find(t => t.id === 'charcoal-slate') ?? THEMES[0]; // Charcoal Slate
}

export function cacheThemeId(themeId: string) {
  try { localStorage.setItem(THEME_CACHE_KEY, themeId); } catch { /* noop */ }
}

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
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(getCachedTheme);
  const [darkModePreference, setDarkModePrefState] = useState<DarkModePreference>('system');
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);
  const realtimeActive = useRef(false);

  const darkMode = darkModePreference === 'system' ? systemDark : darkModePreference === 'dark';

  const applyThemeById = useCallback((themeId: string) => {
    const found = THEMES.find(t => t.id === themeId);
    if (found) {
      setCurrentTheme(found);
      cacheThemeId(themeId);
    }
  }, []);

  const fetchPlatformDefault = useCallback(async () => {
    try {
      if (!apiClient.pb || !apiClient.isConfigured()) return;
      const record = await apiClient.pb.collection('settings').getFirstListItem(
        'key = "default_theme"',
        { requestKey: 'platform_default_theme_' + Date.now() }
      );
      if (record?.value) {
        applyThemeById(record.value as string);
      }
    } catch {
      // Not found or not configured — keep cached or default Arctic Frost
    }
  }, [applyThemeById]);

  // Load saved preferences on mount
  useEffect(() => {
    // Accent theme: localStorage cache was already applied via initial state.
    // Now fetch from PocketBase to get the latest value.
    fetchPlatformDefault();
    const savedDark = localStorage.getItem('openhr-dark-mode') as DarkModePreference | null;
    if (savedDark && ['light', 'dark', 'system'].includes(savedDark)) {
      setDarkModePrefState(savedDark);
    }
  }, [fetchPlatformDefault]);

  // Subscribe to realtime updates for the settings collection
  // When super admin changes the theme, all connected clients update live
  useEffect(() => {
    if (!apiClient.pb || !apiClient.isConfigured()) return;

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      try {
        unsubscribe = await apiClient.pb!.collection('settings').subscribe('*', (e) => {
          const record = e.record;
          if (record.key === 'default_theme' && record.value) {
            applyThemeById(record.value as string);
          }
        });
        realtimeActive.current = true;
      } catch {
        realtimeActive.current = false;
      }
    };

    subscribe();

    return () => {
      realtimeActive.current = false;
      if (unsubscribe) unsubscribe();
    };
  }, [applyThemeById]);

  // Polling fallback: re-fetch every 60s if realtime subscription failed
  useEffect(() => {
    const interval = setInterval(() => {
      if (!realtimeActive.current) {
        fetchPlatformDefault();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchPlatformDefault]);

  // Re-fetch theme when tab becomes visible (fallback for realtime)
  // Throttled to once per 60s to avoid excessive API calls on iOS (notification center, app switcher, etc.)
  const lastVisibilityFetch = useRef(0);
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastVisibilityFetch.current > 60_000) {
          lastVisibilityFetch.current = now;
          fetchPlatformDefault();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPlatformDefault]);

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
