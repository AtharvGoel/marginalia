import { useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Library } from './features/library/Library';
import { ReaderPane } from './features/reader/ReaderPane';
import { useReader } from './features/reader/useReader';
import { usePreferences } from './features/settings/usePreferences';
import { useLibrary } from './features/library/useLibrary';

export function App() {
  const [error, setError] = useState('');
  const report = useCallback((error: unknown) => setError(error instanceof Error ? error.message : String(error)), []);
  const library = useLibrary(report);
  const { preferences, setPreferences } = usePreferences();
  const reader = useReader(library.active, library.save, () => library.setActive(null), report, preferences);
  return <div className={'app ' + preferences.theme}>
    <Sidebar active={library.active} count={library.books.length} reader={reader} save={library.save} exit={() => library.setActive(null)}/>
    <main>
      {error && <div role="alert" className="error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
      {library.active
        ? <ReaderPane entry={library.active} reader={reader} preferences={preferences} setPreferences={setPreferences} save={library.save}/>
        : <Library books={library.books} busy={library.busy} open={entry => { setError(''); library.setActive(entry); }} importBooks={library.importBooks} remove={library.remove}/>}
    </main>
  </div>;
}

