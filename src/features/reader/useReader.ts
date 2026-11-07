import { useEffect, useRef, useState } from 'react';
import { desktop } from '../../services/desktop';
import { EpubSession } from '../../services/epub';
import type { Chapter, Entry, Match, Preferences, ReportError, SaveBook } from '../../types';

export function useReader(entry: Entry | null, save: SaveBook, exit: () => void, report: ReportError, preferences: Preferences) {
  const host = useRef<HTMLDivElement>(null);
  const session = useRef<EpubSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapter, setChapter] = useState('');
  const [current, setCurrent] = useState('');
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const latest = useRef({ save, exit, report, preferences });
  latest.current = { save, exit, report, preferences };

  useEffect(() => {
    if (!entry || !host.current) return;
    let mounted = true;
    setBusy(true); setChapters([]); setChapter(''); setCurrent('');
    setSearchText(''); setMatches([]); setSearching(false);
    const reader = new EpubSession({
      chapters: value => { if (mounted) setChapters(value); },
      relocated: (cfi, label) => {
        if (!mounted) return;
        setCurrent(cfi); setChapter(label);
        void latest.current.save(entry.id, { location: cfi });
      },
      exit: () => latest.current.exit(),
      error: error => { if (mounted) latest.current.report(error); },
    });
    session.current = reader;
    const open = async () => {
      const bytes = await desktop.read(entry.id);
      if (!mounted) return;
      await reader.open(bytes, host.current!, entry);
      if (mounted) reader.appearance(latest.current.preferences);
    };
    void open().catch(error => { if (mounted) latest.current.report(error); }).finally(() => { if (mounted) setBusy(false); });
    return () => { mounted = false; session.current = null; reader.destroy(); };
  }, [entry?.id]);

  useEffect(() => { session.current?.appearance(preferences); }, [preferences.theme, preferences.fontSize]);
  const navigate = (target: string) => { void session.current?.navigate(target).catch(report); };
  const next = () => { void session.current?.next().catch(report); };
  const previous = () => { void session.current?.previous().catch(report); };
  const search = async () => {
    const reader = session.current;
    if (!reader || searching) return;
    setSearching(true); setMatches([]);
    try {
      const results = await reader.search(searchText);
      if (session.current === reader) setMatches(results);
    } catch (error) { if (session.current === reader) report(error); }
    finally { if (session.current === reader) setSearching(false); }
  };
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!entry || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
      if (event.key === 'Escape') latest.current.exit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [entry?.id]);
  return { host, busy, chapters, chapter, current, searchText, setSearchText, matches, searching, search, navigate, next, previous };
}
export type ReaderControls = ReturnType<typeof useReader>;
