const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { MAX_SIZE, validateEpub, bookPath } = require('./storage.cjs');
const { openLibrary } = require('./database.cjs');

async function openLibraryService(root) {
  await fs.mkdir(path.join(root, 'books'), { recursive: true });
  const database = await openLibrary(root);
  let queue = Promise.resolve();
  const mutate = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  return {
    list: () => database.list(),
    async importFiles(files) {
      return mutate(async () => {
        for (const file of files) {
          if ((await fs.stat(file)).size > MAX_SIZE) throw new Error('Books must be smaller than 100 MB.');
          const bytes = await fs.readFile(file);
          await validateEpub(bytes);
          const id = crypto.createHash('sha256').update(bytes).digest('hex');
          if (database.has(id)) continue;
          const target = bookPath(root,id);
          // Durable file first; an interrupted import leaves at most an unreferenced copy.
          await fs.writeFile(target,bytes);
          database.add({ id, title: path.basename(file,'.epub'), author: 'Unknown author', added: Date.now() });
        }
        return database.list();
      });
    },
    async read(id) {
      database.get(id);
      try { return new Uint8Array(await fs.readFile(bookPath(root,id))); }
      catch (error) { if(error.code === 'ENOENT') throw new Error('This book copy is missing. Remove it from the library and import the original again.'); throw error; }
    },
    update: (id,values) => mutate(() => database.update(id,values)),
    remove: id => mutate(async () => {
      database.get(id);
      // A failed file removal leaves the entry available for another attempt.
      await fs.rm(bookPath(root,id), { force:true });
      database.remove(id);
      return database.list();
    }),
    getPreferences: () => database.getPreferences(),
    setPreferences: value => mutate(() => database.setPreferences(value)),
    migratePreferences: value => mutate(() => database.migratePreferences(value)),
    async close() { await queue; database.close(); },
  };
}
module.exports = { openLibraryService };
