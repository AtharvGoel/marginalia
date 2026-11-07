import { useState } from 'react';
import type { Entry, SaveBook } from '../types';
import type { ReaderControls } from '../features/reader/useReader';
export function Sidebar({ active, count, reader, save, exit }: { active: Entry | null; count: number; reader: ReaderControls; save: SaveBook; exit: () => void }) {
 const [panel, setPanel] = useState<'chapters' | 'bookmarks' | 'search'>('chapters');
 const { chapters, searchText, setSearchText, matches, searching, search, busy, navigate } = reader;
 const library = { length: count };
 return (    <aside className="sidebar">
      <div className="brand"><span className="brand-icon">◧</span> EPUB Reader</div>
      <div className="eyebrow">YOUR READING SPACE</div>
      {active ? <>
        <button className="nav-item" onClick={() => exit()}>← All books</button>
        <h2 className="sidebar-title">{active.title}</h2>
        <div className="tabs"><button className={panel === 'chapters' ? 'selected' : ''} onClick={() => setPanel('chapters')}>Chapters</button><button className={panel === 'bookmarks' ? 'selected' : ''} onClick={() => setPanel('bookmarks')}>Bookmarks</button><button className={panel === 'search' ? 'selected' : ''} onClick={() => setPanel('search')}>Search</button></div>
        <nav aria-label={panel} className="chapter-list">
          {panel === 'search' ? <><form className="book-search" onSubmit={e => { e.preventDefault(); void search(); }}><input aria-label="Search within book" placeholder="Find in this book…" minLength={2} maxLength={100} value={searchText} onChange={e => setSearchText(e.target.value)}/><button disabled={searching || busy || searchText.trim().length < 2}>{searching ? 'Searching…' : 'Find'}</button></form><p className="muted">{searching ? 'Searching chapters…' : matches.length + ' results (up to 100)'}</p>{matches.map((match,i) => <button className="search-result" key={i} onClick={() => navigate(match.cfi)}>{match.excerpt}</button>)}</> : panel === 'chapters' ? chapters.map((c, i) => <button key={c.id + i} onClick={() => navigate(c.href)}>{c.label.trim()}</button>) :
            (active.bookmarks || []).length ? active.bookmarks!.map((cfi, i) => <div className="bookmark" key={cfi}><button onClick={() => navigate(cfi)}>Bookmark {i+1}</button><button aria-label={'Remove bookmark ' + (i+1)} onClick={() => void save(active.id, { bookmarks: active.bookmarks!.filter(b => b !== cfi) })}>×</button></div>) : <p className="muted">Save a place using Bookmark above the page.</p>}
        </nav>
      </> : <><button className="nav-item selected">▤ &nbsp; My library <span>{library.length}</span></button><p className="sidebar-note">A little room for<br/>your next great read.</p></>}
      <div className="sidebar-footer"><span className="status-dot"/> Offline · Stored on this device</div>
    </aside>
);
}
