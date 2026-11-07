const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { MAX_SIZE, validateEpub, atomicJson, bookPath } = require('./storage.cjs');
let win, root, library = [], queue = Promise.resolve();
const mutate = (fn) => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
async function save() { await atomicJson(path.join(root, 'library.json'), { version: 1, books: library }); }
function trusted(event) {
  if (event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Untrusted request.');
}
function handle(name, fn) { ipcMain.handle(name, (event, ...args) => { trusted(event); return fn(...args); }); }
app.whenReady().then(async () => {
  root = process.env.NODE_ENV === 'test' && process.env.EPUB_READER_TEST_DATA || app.getPath('userData');
  await fs.mkdir(path.join(root, 'books'), { recursive: true });
  try {
    const stored = JSON.parse(await fs.readFile(path.join(root, 'library.json'), 'utf8'));
    if (stored.version !== 1 || !Array.isArray(stored.books)) throw new Error('Unsupported library format');
    library = stored.books;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      dialog.showErrorBox('Library could not be loaded', 'Your saved library could not be read. The app will close without replacing it.');
      app.quit(); return;
    }
  }
  handle('library:list', () => library);
  handle('book:import', () => mutate(async () => {
    const result = await dialog.showOpenDialog(win, { filters: [{ name: 'EPUB books', extensions: ['epub'] }], properties: ['openFile', 'multiSelections'] });
    if (result.canceled) return library;
    for (const file of result.filePaths) {
      if ((await fs.stat(file)).size > MAX_SIZE) throw new Error('Books must be smaller than 100 MB.');
      const bytes = await fs.readFile(file);
      await validateEpub(bytes);
      const id = crypto.createHash('sha256').update(bytes).digest('hex');
      if (library.some(b => b.id === id)) continue;
      await fs.writeFile(bookPath(root, id), bytes);
      library.push({ id, title: path.basename(file, '.epub'), author: 'Unknown author', added: Date.now() });
      await save();
    }
    return library;
  }));
  handle('book:read', async id => {
    if (!library.some(b => b.id === id)) throw new Error('Book not found.');
    return new Uint8Array(await fs.readFile(bookPath(root, id)));
  });
  handle('book:update', (id, update) => mutate(async () => {
    const book = library.find(b => b.id === id);
    if (!book) throw new Error('Book not found.');
    for (const key of ['title', 'author', 'location']) if (typeof update[key] === 'string') book[key] = update[key].slice(0, 4096);
    if (Array.isArray(update.bookmarks)) book.bookmarks = update.bookmarks.filter(x => typeof x === 'string').slice(0, 500);
    book.lastOpened = Date.now();
    await save(); return book;
  }));
  handle('book:remove', id => mutate(async () => {
    const target = bookPath(root, id);
    library = library.filter(b => b.id !== id);
    await save(); await fs.rm(target, { force: true }); return library;
  }));
  win = new BrowserWindow({ width: 1280, height: 850, minWidth: 820, minHeight: 600, backgroundColor: '#f5f3ed', title: 'EPUB Reader',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const localDev = process.argv.includes('--dev') && ['127.0.0.1', 'localhost'].includes(url.hostname);
    callback({ cancel: ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !localDev });
  });
  if (process.argv.includes('--dev')) await win.loadURL('http://127.0.0.1:5173');
  else await win.loadFile(path.join(__dirname, '../dist/index.html'));
}).catch(error => { dialog.showErrorBox('Could not start EPUB Reader', error.message); app.quit(); });
app.on('window-all-closed', () => app.quit());


let exiting = false;
app.on('before-quit', event => {
  if (exiting) return;
  event.preventDefault();
  queue.finally(() => { exiting = true; app.quit(); });
});
