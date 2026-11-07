import { useEffect, useState } from 'react';
import type { Preferences } from '../../types';
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const theme = localStorage.getItem('theme');
    return { theme: theme === 'dark' || theme === 'sepia' ? theme : 'light', fontSize: Math.min(30, Math.max(14, Number(localStorage.getItem('fontSize')) || 20)) };
  });
  useEffect(() => {
    localStorage.setItem('theme', preferences.theme);
    localStorage.setItem('fontSize', String(preferences.fontSize));
  }, [preferences]);
  return { preferences, setPreferences };
}

