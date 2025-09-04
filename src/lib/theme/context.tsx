// src/lib/theme/context.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define theme types
export type Theme = 'light' | 'dark' | 'beige';
export type ColorScheme = 'default' | 'blue' | 'green' | 'purple' | 'orange';

// Define the theme context type
interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('default');

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Default to system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }
    
    if (savedColorScheme) {
      setColorScheme(savedColorScheme);
    }
  }, []);

  // Apply theme to document when it changes
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'beige');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply color scheme when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'beige';
      return 'light';
    });
  };

  const updateColorScheme = (scheme: ColorScheme) => {
    setColorScheme(scheme);
  };

  const value = {
    theme,
    colorScheme,
    toggleTheme,
    setTheme,
    setColorScheme: updateColorScheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}