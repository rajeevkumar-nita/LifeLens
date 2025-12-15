
import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  // Default to 'dark' mode initially
  const [theme, setTheme] = useState<Theme>('dark');

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem('lifelens_theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    // If no saved theme, we rely on the default 'dark' state set above
  }, []);

  // Apply theme to document and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lifelens_theme', theme);

    // Expose API for external control
    (window as any).LifeLensTheme = {
      get: () => theme,
      set: (newTheme: Theme) => setTheme(newTheme),
      toggle: () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
    };
  }, [theme]);

  // Keyboard shortcut listener (Ctrl/Cmd + J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return { theme, toggleTheme };
};
