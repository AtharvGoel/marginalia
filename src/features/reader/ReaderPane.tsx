import type { Entry, Preferences, SaveBook } from '../../types';
import { palettes } from '../../services/epub';
import { ReaderToolbar } from '../settings/ReaderToolbar';
import type { ReaderControls } from './useReader';
export function ReaderPane({ entry, reader, preferences, setPreferences, save }: { entry: Entry; reader: ReaderControls; preferences: Preferences; setPreferences: (value: Preferences) => void; save: SaveBook }) {
 const { host, busy, chapter, current } = reader;
 const {theme} = preferences;
 return <><ReaderToolbar entry={entry} chapter={chapter} current={current} preferences={preferences} setPreferences={setPreferences} save={save}/>        <div className="reading-area" style={{ background: palettes[theme].background }}>
          {busy && <div className="loading" role="status">Opening your book…</div>}
          <div ref={host} className="epub-host"/>
        </div>
        <footer className="reader-footer"><button onClick={() => reader.previous()}>← Previous</button><span>{chapter || 'Use the arrow keys to turn pages'}</span><button onClick={() => reader.next()}>Next →</button></footer>
</>;
}
