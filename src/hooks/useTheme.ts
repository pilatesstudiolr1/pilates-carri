'use client';

import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Sincronizar estado inicial en el cliente
    const saved = localStorage.getItem('pilates_theme') as Theme | null;
    const isDarkClass = document.documentElement.classList.contains('dark');
    const initialTheme: Theme = saved || (isDarkClass ? 'dark' : 'light');
    setTheme(initialTheme);

    const handleThemeChange = () => {
      const current = (localStorage.getItem('pilates_theme') as Theme | null) ||
        (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      setTheme(current);
    };

    window.addEventListener('storage', handleThemeChange);
    window.addEventListener('theme-change', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme: Theme = isCurrentlyDark ? 'light' : 'dark';

    setTheme(nextTheme);
    localStorage.setItem('pilates_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Notificar a todos los demás componentes que usan el hook
    window.dispatchEvent(new Event('theme-change'));
  };

  return { theme, toggleTheme };
}
