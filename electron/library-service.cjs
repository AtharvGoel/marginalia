const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { MAX_SIZE, validateEpub, bookPath, atomicJson } = require('./storage.cjs');
const { metadata } = require('./metadata.cjs');
const { openLibrary } = require('./database.cjs');

async function openLibraryService(root, {thumbnail = (bytes,mime)=>'data:'+mime+';base64,'+bytes.toString('base64')} = {}) {
  await fs.mkdir(path.join(root, 'books'), { recursive: true });
  await fs.mkdir(path.join(root,'covers'), {recursive:true});
  const database = await openLibrary(root);
  let queue = Promise.resolve();
  const mutate = fn => { const next = queue.then(fn); queue = next.catch(() => {}); return next; };
  const cachePath = id => { bookPath(root,id); return path.join(root,'covers',id+'.json'); };
  async function presentation(id,bytes,parsed) {
    const info=await metadata(bytes,parsed);
    let cover=null;
    if(info.cover) {
      try { cover=await thumbnail(info.cover.bytes,info.cover.mime); } catch { cover=null; }
    }
    if(typeof cover!=='string' || cover.length>2*1024*1024 || !/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(cover)) cover=null;
    const cached={version:1,title:info.title,author:info.author,cover};
    // Thumbnail caching is optional; a cache write failure must not lose an import.
    await atomicJson(cachePath(id),cached).catch(()=>{});
    return cached;
  }
  return {
    list: () => database.list(),
    async importFiles(files) {
      return mutate(async () => {
        for (const file of files) {
          if ((await fs.stat(file)).size > MAX_SIZE) throw new Error('Books must be smaller than 100 MB.');
          const bytes = await fs.readFile(file);
          const parsed=await validateEpub(bytes);
          const id = crypto.createHash('sha256').update(bytes).digest('hex');
          if (database.has(id)) continue;
          const target = bookPath(root,id);
          // Durable file first; an interrupted import leaves at most an unreferenced copy.
          await fs.writeFile(target,bytes);
          const info=await presentation(id,bytes,parsed);
          database.add({ id, title: info.title || path.basename(file,'.epub'), author: info.author || 'Unknown author', added: Date.now() });
        }
        return database.list();
      });
    },
    inspectBook: id => mutate(async () => {
      database.get(id);
      let info;
      try {
        info=JSON.parse(await fs.readFile(cachePath(id),'utf8'));
        if(info.version!==1 || typeof info.title!=='string' || typeof info.author!=='string' || !(info.cover===null || typeof info.cover==='string' && info.cover.length<=2*1024*1024 && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(info.cover))) info=null;
      } catch { info=null; }
      if(!info) {
        const target=bookPath(root,id);
        if((await fs.stat(target)).size>MAX_SIZE) throw new Error('Book copy is too large.');
        info=await presentation(id,await fs.readFile(target));
      }
      return {entry:database.updateMetadata(id,info),cover:info.cover};
    }),
    async read(id) {
      database.get(id);
      try { return new Uint8Array(await fs.readFile(bookPath(root,id))); }
      catch (error) { if(error.code === 'ENOENT') throw new Error('This book copy is missing. Remove it from the library and import the original again.'); throw error; }
    },
    update: (id,values) => mutate(() => database.update(id,values)),
    remove: id => mutate(async () => {
      database.get(id);
      // A failed file removal leaves the entry available for another attempt.
      await fs.rm(cachePath(id),{force:true});
      await fs.rm(bookPath(root,id), { force:true });
      database.remove(id);
      return database.list();
    }),
    listAnnotations: id => database.listAnnotations(id),
    saveAnnotation: (id,value) => mutate(() => database.saveAnnotation(id,value)),
    removeAnnotation: (bookId,id) => mutate(() => database.removeAnnotation(bookId,id)),
    getPreferences: () => database.getPreferences(),
    setPreferences: value => mutate(() => database.setPreferences(value)),
    migratePreferences: value => mutate(() => database.migratePreferences(value)),
    async close() { await queue; database.close(); },
  };
}
module.exports = { openLibraryService };
