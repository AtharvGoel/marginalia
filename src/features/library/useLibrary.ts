import { useCallback, useEffect, useState } from 'react';
import { desktop } from '../../services/desktop';
import type { Entry, ReportError, SaveBook } from '../../types';
export function useLibrary(report: ReportError) {
  const [books, setBooks] = useState<Entry[]>([]);
  const [active, setActive] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(() => desktop.list().then(setBooks).catch(report), [report]);
  useEffect(() => { void refresh(); }, [refresh]);
  const save: SaveBook = useCallback(async (id, values) => {
    try {
      const updated = await desktop.update(id, values);
      setBooks(all => all.map(book => book.id === id ? updated : book));
      setActive(old => old?.id === id ? updated : old);
    } catch (error) { report(error); }
  }, [report]);
  const importBooks = async () => {
    setBusy(true);
    try { setBooks(await desktop.importBooks()); }
    catch (error) { report(error); await refresh(); }
    finally { setBusy(false); }
  };
  const remove = async (entry: Entry) => {
    if (!confirm('Remove this book from your library? Your original file will remain untouched.')) return;
    try { setBooks(await desktop.remove(entry.id)); }
    catch (error) { report(error); }
  };
  const inspected=useCallback((entry: Entry)=>{
    const merge=(book: Entry)=>book.id===entry.id ? {...book,title:entry.title,author:entry.author} : book;
    setBooks(books=>books.map(merge));
    setActive(book=>book ? merge(book) : book);
  },[]);
  return { inspected, books, active, setActive, busy, save, importBooks, remove };
}
