import type { Entry, Preferences, SaveBook, Theme } from '../../types';
export function ReaderToolbar({ entry, chapter, current, preferences, setPreferences, save }: { entry: Entry; chapter: string; current: string; preferences: Preferences; setPreferences: (value: Preferences) => void; save: SaveBook }) {
 const {theme, fontSize: size} = preferences;
 const active = entry;
 return (        <header className="reader-toolbar">
          <div className="reader-title">{chapter || entry.title}</div>
          <label>Text <input aria-label="Text size" type="range" min="14" max="30" value={size} onChange={e => setPreferences({ ...preferences, fontSize: Number(e.target.value) })}/></label>
          <select aria-label="Reading theme" value={theme} onChange={e => setPreferences({ ...preferences, theme: e.target.value as Theme })}><option value="light">Light</option><option value="sepia">Sepia</option><option value="dark">Dark</option></select>
          <button disabled={!current || entry.bookmarks?.includes(current)} onClick={() => void save(entry.id, { bookmarks: [...(entry.bookmarks || []), current] })}>＋ Bookmark</button>
        </header>
);
}
