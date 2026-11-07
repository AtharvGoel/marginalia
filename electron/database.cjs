const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validId } = require('./storage.cjs');
const SCHEMA_VERSION = 1;
const themes = new Set(['light', 'sepia', 'dark']);
function preferences(value) {
  if (!value || !themes.has(value.theme) || !Number.isFinite(value.fontSize) || value.fontSize < 14 || value.fontSize > 30) throw new Error('Invalid reading preferences.');
  return { theme: value.theme, fontSize: value.fontSize };
}
function validateEntry(book) {
  if (!book || !validId(book.id) || typeof book.title !== 'string' || typeof book.author !== 'string' || !Number.isFinite(book.added)) throw new Error('Invalid book in saved library.');
  if (book.lastOpened != null && !Number.isFinite(book.lastOpened)) throw new Error('Invalid last-opened date.');
  if (book.location != null && typeof book.location !== 'string') throw new Error('Invalid reading position.');
  if (book.bookmarks != null && (!Array.isArray(book.bookmarks) || book.bookmarks.some(x => typeof x !== 'string'))) throw new Error('Invalid bookmarks.');
  return book;
}
function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
async function backup(root, name, bytes) {
  const folder = path.join(root, 'backups');
  await fs.mkdir(folder, { recursive: true });
  const target = path.join(folder, name + '-' + Date.now() + '-' + crypto.randomUUID() + '.json');
  await fs.writeFile(target, bytes, { flag: 'wx' });
  return target;
}
async function openLibrary(root) {
  await fs.mkdir(root, { recursive: true });
  const db = new DatabaseSync(path.join(root, 'library.sqlite'));
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > SCHEMA_VERSION) throw new Error('This library was created by a newer app. Install that version to open it.');
    // DDL and legacy data are committed together. Failed migration can be retried.
    if (version === 0) {
      let legacy;
      try {
        const bytes = await fs.readFile(path.join(root, 'library.json'));
        legacy = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
        if (legacy.version !== 1 || !Array.isArray(legacy.books)) throw new Error('Unsupported saved library format.');
        legacy.books.forEach(validateEntry);
        await backup(root, 'library-v0.1', bytes);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      transaction(db, () => {
        db.exec(`
          CREATE TABLE books (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL,
            added INTEGER NOT NULL, lastOpened INTEGER, location TEXT
          );
          CREATE TABLE bookmarks (
            book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            ordinal INTEGER NOT NULL, cfi TEXT NOT NULL,
            PRIMARY KEY(book_id, ordinal)
          );
          CREATE TABLE preferences (
            id INTEGER PRIMARY KEY CHECK(id = 1),
            theme TEXT NOT NULL CHECK(theme IN ('light','sepia','dark')),
            font_size REAL NOT NULL CHECK(font_size BETWEEN 14 AND 30)
          );
          CREATE TABLE migration_history (
            version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL, source TEXT NOT NULL
          );
        `);
        const insert = db.prepare('INSERT INTO books(id,title,author,added,lastOpened,location) VALUES(?,?,?,?,?,?)');
        const mark = db.prepare('INSERT INTO bookmarks(book_id,ordinal,cfi) VALUES(?,?,?)');
        for (const book of legacy?.books || []) {
          insert.run(book.id, book.title, book.author, book.added, book.lastOpened ?? null, book.location ?? null);
          (book.bookmarks || []).forEach((cfi, i) => mark.run(book.id, i, cfi));
        }
        db.prepare('INSERT INTO migration_history VALUES(1,?,?)').run(Date.now(), legacy ? 'library.json' : 'new library');
        db.exec('PRAGMA user_version = 1');
      });
    }
    // Use WAL for small durable updates, and checkpoint cleanly on exit.
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    return new LibraryDatabase(db, root);
  } catch (error) { db.close(); throw error; }
}
class LibraryDatabase {
  constructor(db, root) { this.db = db; this.root = root; }
  decode(row) {
    if (!row) throw new Error('Book not found.');
    const { lastOpened, location, ...book } = row;
    return { ...book, ...(lastOpened != null ? { lastOpened } : {}), ...(location != null ? { location } : {}),
      bookmarks: this.db.prepare('SELECT cfi FROM bookmarks WHERE book_id=? ORDER BY ordinal').all(book.id).map(x => x.cfi) };
  }
  list() { return this.db.prepare('SELECT * FROM books ORDER BY added, id').all().map(row => this.decode(row)); }
  get(id) {
    if (!validId(id)) throw new Error('Invalid book identifier.');
    return this.decode(this.db.prepare('SELECT * FROM books WHERE id=?').get(id));
  }
  has(id) { return !!this.db.prepare('SELECT id FROM books WHERE id=?').get(id); }
  add(book) {
    validateEntry(book);
    this.db.prepare('INSERT INTO books(id,title,author,added) VALUES(?,?,?,?)').run(book.id, book.title, book.author, book.added);
    return this.get(book.id);
  }
  update(id, values) {
    const book = this.get(id);
    if (!values || typeof values !== 'object') throw new Error('Invalid book update.');
    for (const key of ['title','author','location']) {
      if (values[key] !== undefined) {
        if (typeof values[key] !== 'string' || values[key].length > 4096) throw new Error('Invalid ' + key + '.');
        book[key] = values[key];
      }
    }
    if (values.bookmarks !== undefined) {
      if (!Array.isArray(values.bookmarks) || values.bookmarks.length > 500 || values.bookmarks.some(cfi => typeof cfi !== 'string' || cfi.length > 4096)) throw new Error('Invalid bookmarks.');
      book.bookmarks = [...new Set(values.bookmarks)];
    }
    return transaction(this.db, () => {
      this.db.prepare('UPDATE books SET title=?,author=?,location=?,lastOpened=? WHERE id=?').run(book.title, book.author, book.location ?? null, Date.now(), id);
      if (values.bookmarks !== undefined) {
        this.db.prepare('DELETE FROM bookmarks WHERE book_id=?').run(id);
        const insert = this.db.prepare('INSERT INTO bookmarks VALUES(?,?,?)');
        book.bookmarks.forEach((cfi,i) => insert.run(id,i,cfi));
      }
      return this.get(id);
    });
  }
  remove(id) { this.get(id); this.db.prepare('DELETE FROM books WHERE id=?').run(id); }
  getPreferences() {
    const row = this.db.prepare('SELECT theme, font_size AS fontSize FROM preferences WHERE id=1').get();
    return row ? { ...row } : null;
  }
  setPreferences(value) {
    const p = preferences(value);
    this.db.prepare('INSERT INTO preferences VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET theme=excluded.theme,font_size=excluded.font_size').run(p.theme,p.fontSize);
    return p;
  }
  async migratePreferences(value) {
    const saved = this.getPreferences();
    if (saved) return saved;
    const p = preferences(value);
    await backup(this.root, 'preferences-v0.1', JSON.stringify(p, null, 2));
    return this.setPreferences(p);
  }
  close() { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); this.db.close(); }
}
module.exports = { openLibrary, SCHEMA_VERSION };

