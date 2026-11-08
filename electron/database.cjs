const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { validId } = require('./storage.cjs');
const SCHEMA_VERSION = 2;
const {validatePreferences} = require('./preferences.cjs');
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
    if(version<2){
      if(version===1){
        const directory=path.join(root,'backups');
        await fs.mkdir(directory,{recursive:true});
        const snapshot=path.join(directory,'library-v0.2-'+Date.now()+'-'+crypto.randomUUID()+'.sqlite');
        db.prepare('VACUUM INTO ?').run(snapshot);
      }
      transaction(db,()=>{
        db.exec(`
          ALTER TABLE preferences ADD COLUMN font_family TEXT NOT NULL DEFAULT 'book' CHECK(font_family IN ('book','serif','sans','mono'));
          ALTER TABLE preferences ADD COLUMN line_height REAL NOT NULL DEFAULT 1.6 CHECK(line_height BETWEEN 1.3 AND 2.2);
          ALTER TABLE preferences ADD COLUMN margin REAL NOT NULL DEFAULT 24 CHECK(margin BETWEEN 8 AND 64);
          ALTER TABLE preferences ADD COLUMN reading_width REAL NOT NULL DEFAULT 800 CHECK(reading_width BETWEEN 480 AND 1200);
          ALTER TABLE preferences ADD COLUMN layout TEXT NOT NULL DEFAULT 'paginated' CHECK(layout IN ('paginated','scroll'));
          ALTER TABLE preferences ADD COLUMN sidebar_width REAL NOT NULL DEFAULT 280 CHECK(sidebar_width BETWEEN 220 AND 420);
          ALTER TABLE preferences ADD COLUMN sidebar_collapsed INTEGER NOT NULL DEFAULT 0 CHECK(sidebar_collapsed IN (0,1));
          PRAGMA user_version = 2;
        `);
        db.prepare('INSERT INTO migration_history VALUES(2,?,?)').run(Date.now(),'reading comfort preferences');
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
  updateMetadata(id, value) {
    const book=this.get(id);
    const title=value.title || book.title, author=value.author || book.author;
    if(title!==book.title || author!==book.author) this.db.prepare('UPDATE books SET title=?,author=? WHERE id=?').run(title,author,id);
    return this.get(id);
  }
  remove(id) { this.get(id); this.db.prepare('DELETE FROM books WHERE id=?').run(id); }
  getPreferences() {
    const row=this.db.prepare('SELECT theme,font_size AS fontSize,font_family AS fontFamily,line_height AS lineHeight,margin,reading_width AS readingWidth,layout,sidebar_width AS sidebarWidth,sidebar_collapsed AS sidebarCollapsed FROM preferences WHERE id=1').get();
    return row?{...row,sidebarCollapsed:!!row.sidebarCollapsed}:null;
  }
  setPreferences(value) {
    const p=validatePreferences(value,this.getPreferences()||undefined);
    this.db.prepare(`INSERT INTO preferences(id,theme,font_size,font_family,line_height,margin,reading_width,layout,sidebar_width,sidebar_collapsed)
      VALUES(1,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET theme=excluded.theme,font_size=excluded.font_size,font_family=excluded.font_family,line_height=excluded.line_height,margin=excluded.margin,reading_width=excluded.reading_width,layout=excluded.layout,sidebar_width=excluded.sidebar_width,sidebar_collapsed=excluded.sidebar_collapsed`).run(p.theme,p.fontSize,p.fontFamily,p.lineHeight,p.margin,p.readingWidth,p.layout,p.sidebarWidth,Number(p.sidebarCollapsed));
    return p;
  }
  async migratePreferences(value) {
    const saved = this.getPreferences();
    if (saved) return saved;
    const p = validatePreferences(value);
    await backup(this.root, 'preferences-v0.1', JSON.stringify(p, null, 2));
    return this.setPreferences(p);
  }
  close() { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); this.db.close(); }
}
module.exports = { openLibrary, SCHEMA_VERSION };
