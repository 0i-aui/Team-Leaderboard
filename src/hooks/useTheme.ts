import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types';

const KEY = 'team-leaderboard-theme';

function initial(): ThemeMode {
  const saved = localStorage.getItem(KEY) as ThemeMode | null;
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => (typeof window === 'undefined' ? 'dark' : initial()));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}
