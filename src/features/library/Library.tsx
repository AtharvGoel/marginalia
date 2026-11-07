import { useState } from 'react';
import { BookCover } from './BookCover';
import { formatAuthors } from '../../utils/formatAuthors.mjs';
import type { Entry } from '../../types';
export function Library({ books: library, busy, open, importBooks, remove, inspected }: { inspected: (entry: Entry)=>void; books: Entry[]; busy: boolean; open: (entry: Entry) => void; importBooks: () => Promise<void>; remove: (entry: Entry) => Promise<void> }) {
 const [query, setQuery] = useState('');
 const filtered = [...library].filter(b => (b.title + ' ' + b.author + ' ' + formatAuthors(b.author)).toLowerCase().includes(query.toLowerCase())).sort((a,b) => (b.lastOpened || b.added) - (a.lastOpened || a.added));
 return <>        <header className="library-header"><div><div className="eyebrow">MAKE TIME FOR A GOOD BOOK</div><h1>My library<span>.</span></h1><p>Your stories, right where you left them.</p></div><button className="primary" disabled={busy} onClick={() => void importBooks()}>{busy ? 'Importing…' : '＋ Add books'}</button></header>
        <div className="library-tools"><span>{library.length} {library.length === 1 ? 'book' : 'books'} · Recently read first</span><input aria-label="Search library" placeholder="Search title or author…" value={query} onChange={e => setQuery(e.target.value)}/></div>
        {!library.length ? <section className="empty"><div className="empty-art">▥</div><div className="eyebrow">A NEW CHAPTER STARTS HERE</div><h2>Make yourself at home.</h2><p>Add an EPUB book to start reading.<br/>Your place will be saved as you go.</p><button className="primary" disabled={busy} onClick={() => void importBooks()}>Choose your first book</button><small>DRM-free EPUB · No account needed</small></section> :
          <div className="book-grid">{filtered.map((book, i) => <article key={book.id} className="book-card">
            <BookCover book={book} author={formatAuthors(book.author)} index={i} open={open} inspected={inspected}/>
            <button className="book-title" onClick={() => open(book)}>{book.title}</button><p className="book-author">{formatAuthors(book.author)}</p>
            <div className="book-actions"><span>{book.location ? 'Continue reading' : 'Ready to open'}</span><button aria-label={'Remove ' + book.title} onClick={() => void remove(book)}>Remove</button></div>
          </article>)}</div>}
        {!!library.length && !filtered.length && <p className="no-results">No books match your search.</p>}
        <footer className="library-footer">A quieter way to read.</footer>
</>;
}
