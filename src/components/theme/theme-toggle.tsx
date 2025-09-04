// src/components/theme/theme-toggle.tsx

'use client';

import { useTheme } from '@/lib/theme/context';
import { Button } from '@/components/ui/button';
import {
  Sun,
  Moon,
  Palette
} from 'lucide-react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'beige':
        return <Palette className="h-5 w-5" />;
      default:
        return <Sun className="h-5 w-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'dark':
        return 'Dark Mode';
      case 'beige':
        return 'Beige Mode';
      default:
        return 'Light Mode';
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} title={`Switch to ${getThemeLabel()}`}>
      {getThemeIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}