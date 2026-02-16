/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ThemeId =
  | 'midnight'
  | 'slate'
  | 'slate-rose'
  | 'slate-emerald'
  | 'slate-gold'
  | 'obsidian'
  | 'aurora'
  | 'nebula'
  | 'neon'
  | 'ember'
  | 'sage'
  | 'copper'
  | 'cosmos'
  | 'arctic'
  | 'horizon';

export type ThemeMood = 'clean' | 'tech' | 'warm' | 'bold';

interface ThemeInfo {
  id: ThemeId;
  nameKey: string;
  mood: ThemeMood;
  moodKey: string;
}

export const THEMES: ThemeInfo[] = [
  { id: 'midnight', nameKey: 'theme.midnight', mood: 'clean', moodKey: 'theme.mood.clean' },
  { id: 'slate', nameKey: 'theme.slate', mood: 'clean', moodKey: 'theme.mood.clean' },
  { id: 'slate-rose', nameKey: 'theme.slate_rose', mood: 'clean', moodKey: 'theme.mood.clean' },
  {
    id: 'slate-emerald',
    nameKey: 'theme.slate_emerald',
    mood: 'clean',
    moodKey: 'theme.mood.clean',
  },
  { id: 'slate-gold', nameKey: 'theme.slate_gold', mood: 'clean', moodKey: 'theme.mood.clean' },
  { id: 'obsidian', nameKey: 'theme.obsidian', mood: 'clean', moodKey: 'theme.mood.clean' },
  { id: 'aurora', nameKey: 'theme.aurora', mood: 'tech', moodKey: 'theme.mood.tech' },
  { id: 'nebula', nameKey: 'theme.nebula', mood: 'tech', moodKey: 'theme.mood.tech' },
  { id: 'neon', nameKey: 'theme.neon', mood: 'tech', moodKey: 'theme.mood.tech' },
  { id: 'ember', nameKey: 'theme.ember', mood: 'warm', moodKey: 'theme.mood.warm' },
  { id: 'sage', nameKey: 'theme.sage', mood: 'warm', moodKey: 'theme.mood.warm' },
  { id: 'copper', nameKey: 'theme.copper', mood: 'warm', moodKey: 'theme.mood.warm' },
  { id: 'cosmos', nameKey: 'theme.cosmos', mood: 'bold', moodKey: 'theme.mood.bold' },
  { id: 'arctic', nameKey: 'theme.arctic', mood: 'bold', moodKey: 'theme.mood.bold' },
  { id: 'horizon', nameKey: 'theme.horizon', mood: 'bold', moodKey: 'theme.mood.bold' },
];

const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const STORAGE_KEY = 'app_theme';

function loadTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEME_IDS.has(stored)) return stored as ThemeId;
  } catch {
    // ignore
  }
  return 'slate-emerald';
}

function applyTheme(themeId: ThemeId) {
  const root = document.documentElement;
  // Remove existing theme classes
  root.className = root.className
    .split(' ')
    .filter((cls) => !cls.startsWith('theme-'))
    .join(' ');
  // Ensure dark class is present
  if (!root.classList.contains('dark')) {
    root.classList.add('dark');
  }
  root.classList.add(`theme-${themeId}`);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const initial = loadTheme();
    applyTheme(initial);
    return initial;
  });

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  }, []);

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
