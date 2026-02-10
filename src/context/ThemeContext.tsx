
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppTheme } from '../types';

export const THEMES: AppTheme[] = [
  { id: 'indigo', name: 'Executive Blue', colors: { primary: '#4f46e5', hover: '#4338ca', light: '#e0e7ff' } },
  { id: 'emerald', name: 'Sustainable Green', colors: { primary: '#059669', hover: '#047857', light: '#d1fae5' } },
  { id: 'violet', name: 'Royal Purple', colors: { primary: '#7c3aed', hover: '#6d28d9', light: '#ede9fe' } },
  { id: 'rose', name: 'Passion Red', colors: { primary: '#e11d48', hover: '#be123c', light: '#ffe4e6' } },
  { id: 'amber', name: 'Sunset Orange', colors: { primary: '#d97706', hover: '#b45309', light: '#fef3c7' } },
  { id: 'slate', name: 'Midnight Dark', colors: { primary: '#334155', hover: '#1e293b', light: '#f1f5f9' } },
  { id: 'teal', name: 'Ocean Teal', colors: { primary: '#0d9488', hover: '#0f766e', light: '#ccfbf1' } },
];

interface ThemeContextType {
  currentTheme: AppTheme;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(THEMES[0]);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('openhr-theme');
    if (saved) {
      const found = THEMES.find(t => t.id === saved);
      if (found) setCurrentTheme(found);
    }
  }, []);

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--primary-hover', currentTheme.colors.hover);
    root.style.setProperty('--primary-light', currentTheme.colors.light);
  }, [currentTheme]);

  const setTheme = (id: string) => {
    const found = THEMES.find(t => t.id === id);
    if (found) {
      setCurrentTheme(found);
      localStorage.setItem('openhr-theme', id);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
