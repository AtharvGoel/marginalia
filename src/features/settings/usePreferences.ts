import { useEffect, useState } from 'react';
import { desktop } from '../../services/desktop';
import type { Preferences, ReportError } from '../../types';
function legacyPreferences(): Preferences {
  const theme = localStorage.getItem('theme');
  return { theme: theme === 'dark' || theme === 'sepia' ? theme : 'light', fontSize: Math.min(30, Math.max(14, Number(localStorage.getItem('fontSize')) || 20)) };
}
export function usePreferences(report: ReportError) {
  const [preferences, setState] = useState<Preferences>(legacyPreferences);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const saved = await desktop.getPreferences() || await desktop.migratePreferences(legacyPreferences());
      if (mounted) { setState(saved); setReady(true); }
    };
    void load().catch(report);
    return () => { mounted=false; };
  }, [report]);
  const setPreferences = (value: Preferences) => {
    setState(value);
    // IPC writes are serialized by the main-process library service.
    void desktop.setPreferences(value).catch(report);
  };
  return { preferences, setPreferences, ready };
}

