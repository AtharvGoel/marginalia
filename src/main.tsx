import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ePub, { Book, Rendition } from 'epubjs';
import type Section from 'epubjs/types/section';
import './style.css';

type Entry = { id: string; title: string; author: string; added: number; lastOpened?: number; location?: string; bookmarks?: string[] };
type Chapter = { id: string; href: string; label: string; subitems?: Chapter[] };
declare global {
  interface Window { reader: {
    list(): Promise<Entry[]>; importBooks(): Promise<Entry[]>; read(id: string): Promise<Uint8Array>;
    update(id: string, value: Partial<Entry>): Promise<Entry>; remove(id: string): Promise<Entry[]>;
  } }
}
const flatten = (items: Chapter[]): Chapter[] => items.flatMap(item => [item, ...flatten(item.subitems || [])]);
const palettes = { light: { background: '#fffdf8', color: '#292d28' }, sepia: { background: '#f2e6cc', color: '#453b2d' }, dark: { background: '#222923', color: '#e4e8df' } };
function App() {
  const [library, setLibrary] = useState<Entry[]>([]);
  const [active, setActive] = useState<Entry | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapter, setChapter] = useState('');
  const [current, setCurrent] = useState('');
  const [theme, setTheme] = useState<keyof typeof palettes>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'sepia' ? saved : 'light';
  });
  const [size, setSize] = useState(() => Math.min(30, Math.max(14, Number(localStorage.getItem('fontSize')) || 20)));
  const [panel, setPanel] = useState<'chapters' | 'bookmarks' | 'search'>('chapters');
  const [searchText, setSearchText] = useState('');
  const [matches, setMatches] = useState<{ cfi: string; excerpt: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const search = async () => {
    const book = bookRef.current, token = generation.current, text = searchText.trim();
    if (!book || text.length < 2) return;
    setSearching(true); setMatches([]);
    try {
      const sections: Section[] = [];
      book.spine.each((section: Section) => sections.push(section));
      const found: { cfi: string; excerpt: string }[] = [];
      for (const section of sections) {
        if (generation.current !== token) return;
        await section.load(book.load.bind(book));
        found.push(...section.find(text) as unknown as {cfi: string; excerpt: string}[]);
        if (found.length >= 100) break;
      }
      if (generation.current === token) setMatches(found.slice(0,100));
    } catch(e) { if(generation.current === token) report(e); }
    finally { if(generation.current === token) setSearching(false); }
  };
  const host = useRef<HTMLDivElement>(null);
  const rendition = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const generation = useRef(0);
  const report = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const refresh = () => window.reader.list().then(setLibrary).catch(report);
  useEffect(() => { void refresh(); }, []);
  const save = async (id: string, values: Partial<Entry>) => {
    try {
      const updated = await window.reader.update(id, values);
      setLibrary(all => all.map(b => b.id === id ? updated : b));
      setActive(old => old?.id === id ? updated : old);
    } catch (e) { report(e); }
  };
  useEffect(() => {
    localStorage.setItem('theme', theme); localStorage.setItem('fontSize', String(size));
    const r = rendition.current;
    if (r) {
      r.themes.default({ body: { 'background-color': palettes[theme].background, color: palettes[theme].color }, 'a': { color: theme === 'dark' ? '#b6d7ad' : '#3b6747' } });
      r.themes.fontSize(size + 'px');
    }
  }, [theme, size, busy]);
  useEffect(() => {
    if (!active || !host.current) return;
    const id = active.id;
    const token = ++generation.current;
    let book: Book | undefined;
    let mounted = true;
    setSearching(false); setSearchText(''); setMatches([]); setBusy(true); setChapters([]); setCurrent(''); setChapter(''); setError('');
    (async () => {
      const bytes = await window.reader.read(id);
      if (!mounted) return;
      book = ePub(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      bookRef.current = book;
      await book.ready;
      if (!mounted) return;
      const metadata = await book.loaded.metadata;
      await save(id, { title: metadata.title || active.title, author: metadata.creator || active.author });
      if (!mounted) return;
      setChapters(flatten((await book.loaded.navigation).toc as Chapter[]));
      const r = book.renderTo(host.current!, { width: '100%', height: '100%', flow: 'paginated', spread: 'none', allowScriptedContent: false });
      rendition.current = r;
      r.hooks.content.register((content: { document: Document }) => {
        // Books are documents, never executable application content.
        content.document.querySelectorAll('script,iframe,object,embed,form,base,meta[http-equiv]').forEach(el => el.remove());
        content.document.querySelectorAll('*').forEach(el => {
          Array.from(el.attributes).forEach(attr => {
            if (/^on/i.test(attr.name) || /^(javascript|https?|ftp):/i.test(attr.value.trim()) && ['href', 'src', 'xlink:href', 'action'].includes(attr.name)) el.removeAttribute(attr.name);
          });
        });
      });
      r.on('relocated', (location: { start: { cfi: string; href: string } }) => {
        if (!mounted) return;
        setCurrent(location.start.cfi);
        const found = flatten((book!.navigation.toc || []) as Chapter[]).find(c => c.href.split('#')[0] === location.start.href.split('#')[0]);
        setChapter(found?.label.trim() || 'Reading');
        void save(id, { location: location.start.cfi });
      });
      r.on('keyup', (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight') void r.next().catch(report);
        if (event.key === 'ArrowLeft') void r.prev().catch(report);
        if (event.key === 'Escape') setActive(null);
      });
      try { await r.display(active.location || undefined); }
      catch { await r.display(); }
      if (mounted) setBusy(false);
    })().catch(e => { if (mounted) { report(e); setBusy(false); } });
    return () => {
      mounted = false;
      generation.current++;
      if (generation.current === token + 1) { rendition.current = null; bookRef.current = null; }
      book?.destroy();
    };
  }, [active?.id]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!active || event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); void rendition.current?.next().catch(report); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); void rendition.current?.prev().catch(report); }
      if (event.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active?.id]);
  const importBooks = async () => {
    setError(''); setBusy(true);
    try { setLibrary(await window.reader.importBooks()); }
    catch (e) { report(e); await refresh(); }
    finally { setBusy(false); }
  };
  const navigate = (target: string) => { void rendition.current?.display(target).catch(report); };
  const filtered = [...library].filter(b => (b.title + ' ' + b.author).toLowerCase().includes(query.toLowerCase())).sort((a,b) => (b.lastOpened || b.added) - (a.lastOpened || a.added));
  return <div className={'app ' + theme}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon">◧</span> EPUB Reader</div>
      <div className="eyebrow">YOUR READING SPACE</div>
      {active ? <>
        <button className="nav-item" onClick={() => setActive(null)}>← All books</button>
        <h2 className="sidebar-title">{active.title}</h2>
        <div className="tabs"><button className={panel === 'chapters' ? 'selected' : ''} onClick={() => setPanel('chapters')}>Chapters</button><button className={panel === 'bookmarks' ? 'selected' : ''} onClick={() => setPanel('bookmarks')}>Bookmarks</button><button className={panel === 'search' ? 'selected' : ''} onClick={() => setPanel('search')}>Search</button></div>
        <nav aria-label={panel} className="chapter-list">
          {panel === 'search' ? <><form className="book-search" onSubmit={e => { e.preventDefault(); void search(); }}><input aria-label="Search within book" placeholder="Find in this book…" minLength={2} maxLength={100} value={searchText} onChange={e => setSearchText(e.target.value)}/><button disabled={searching || busy || searchText.trim().length < 2}>{searching ? 'Searching…' : 'Find'}</button></form><p className="muted">{searching ? 'Searching chapters…' : matches.length + ' results (up to 100)'}</p>{matches.map((match,i) => <button className="search-result" key={i} onClick={() => navigate(match.cfi)}>{match.excerpt}</button>)}</> : panel === 'chapters' ? chapters.map((c, i) => <button key={c.id + i} onClick={() => navigate(c.href)}>{c.label.trim()}</button>) :
            (active.bookmarks || []).length ? active.bookmarks!.map((cfi, i) => <div className="bookmark" key={cfi}><button onClick={() => navigate(cfi)}>Bookmark {i+1}</button><button aria-label={'Remove bookmark ' + (i+1)} onClick={() => void save(active.id, { bookmarks: active.bookmarks!.filter(b => b !== cfi) })}>×</button></div>) : <p className="muted">Save a place using Bookmark above the page.</p>}
        </nav>
      </> : <><button className="nav-item selected">▤ &nbsp; My library <span>{library.length}</span></button><p className="sidebar-note">A little room for<br/>your next great read.</p></>}
      <div className="sidebar-footer"><span className="status-dot"/> Offline · Stored on this device</div>
    </aside>
    <main>
      {error && <div role="alert" className="error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {active ? <>
        <header className="reader-toolbar">
          <div className="reader-title">{chapter || active.title}</div>
          <label>Text <input aria-label="Text size" type="range" min="14" max="30" value={size} onChange={e => setSize(Number(e.target.value))}/></label>
          <select aria-label="Reading theme" value={theme} onChange={e => setTheme(e.target.value as keyof typeof palettes)}><option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option></select>
          <button disabled={!current || active.bookmarks?.includes(current)} onClick={() => void save(active.id, { bookmarks: [...(active.bookmarks || []), current] })}>＋ Bookmark</button>
        </header>
        <div className="reading-area" style={{ background: palettes[theme].background }}>
          {busy && <div className="loading" role="status">Opening your book…</div>}
          <div ref={host} className="epub-host"/>
        </div>
        <footer className="reader-footer"><button onClick={() => void rendition.current?.prev().catch(report)}>← Previous</button><span>{chapter || 'Use the arrow keys to turn pages'}</span><button onClick={() => void rendition.current?.next().catch(report)}>Next →</button></footer>
      </> : <>
        <header className="library-header"><div><div className="eyebrow">MAKE TIME FOR A GOOD BOOK</div><h1>My library<span>.</span></h1><p>Your stories, right where you left them.</p></div><button className="primary" disabled={busy} onClick={() => void importBooks()}>{busy ? 'Importing…' : '＋ Add books'}</button></header>
        <div className="library-tools"><span>{library.length} {library.length === 1 ? 'book' : 'books'} · Recently read first</span><input aria-label="Search library" placeholder="Search title or author…" value={query} onChange={e => setQuery(e.target.value)}/></div>
        {!library.length ? <section className="empty"><div className="empty-art">▥</div><div className="eyebrow">A NEW CHAPTER STARTS HERE</div><h2>Make yourself at home.</h2><p>Add an EPUB book to start reading.<br/>Your place will be saved as you go.</p><button className="primary" disabled={busy} onClick={() => void importBooks()}>Choose your first book</button><small>DRM-free EPUB · No account needed</small></section> :
          <div className="book-grid">{filtered.map((book, i) => <article key={book.id} className="book-card">
            <button className={'book-cover cover-' + (i % 4)} onClick={() => setActive(book)} aria-label={'Read ' + book.title}><span className="cover-rule"/><strong>{book.title}</strong><span>{book.author}</span><span className="cover-mark">E R</span></button>
            <button className="book-title" onClick={() => setActive(book)}>{book.title}</button><p>{book.author}</p>
            <div className="book-actions"><span>{book.location ? 'Continue reading' : 'Ready to open'}</span><button aria-label={'Remove ' + book.title} onClick={async () => { if (confirm('Remove this book from your library? Your original file will remain untouched.')) { try { setLibrary(await window.reader.remove(book.id)); } catch(e) { report(e); } } }}>Remove</button></div>
          </article>)}</div>}
        {!!library.length && !filtered.length && <p className="no-results">No books match your search.</p>}
        <footer className="library-footer">A quieter way to read.</footer>
      </>}
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);

