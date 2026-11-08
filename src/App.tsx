import { useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Library } from './features/library/Library';
import { ReaderPane } from './features/reader/ReaderPane';
import { useReader } from './features/reader/useReader';
import { useFullscreen } from './features/settings/useFullscreen';
import { usePreferences } from './features/settings/usePreferences';
import { useLibrary } from './features/library/useLibrary';

export function App() {
  const [error, setError] = useState('');
  const report = useCallback((error: unknown) => setError(error instanceof Error ? error.message : String(error)), []);
  const library = useLibrary(report);
  const { preferences, setPreferences, ready } = usePreferences(report);
  const fullscreen=useFullscreen(report);
  const reader = useReader(library.active, library.save, report, preferences);
  if (!ready) return <main><p role="status">Loading your reading preferences…</p>{error && <p role="alert">{error}</p>}</main>;
  return <div className={'app ' + preferences.theme}>
    <Sidebar preferences={preferences} setPreferences={setPreferences} active={library.active} count={library.books.length} reader={reader} save={library.save} exit={() => library.setActive(null)}/>
    <main>
      {error && <div role="alert" className="error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {library.active
        ? <ReaderPane {...fullscreen} exit={() => library.setActive(null)} entry={library.active} reader={reader} preferences={preferences} setPreferences={setPreferences} save={library.save}/>
        : <Library inspected={library.inspected} books={library.books} busy={library.busy} open={entry => { setError(''); library.setActive(entry); }} importBooks={library.importBooks} remove={library.remove}/>}
    </main>
  </div>;
}
