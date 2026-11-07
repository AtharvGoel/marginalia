const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openLibrary } = require('../electron/database.cjs');
const entry = { id:'a'.repeat(64),title:'A saved book',author:'An author',added:123,lastOpened:456,location:'epubcfi(/6/2!/4/2)',bookmarks:['first','second'] };
async function temporary(work) {
 const root = await fs.mkdtemp(path.join(os.tmpdir(),'epub-db-'));
 try { await work(root); } finally { await fs.rm(root,{recursive:true,force:true}); }
}
test('migrates exact legacy reading data, keeps backup, and never reimports stale JSON', () => temporary(async root => {
 const original = JSON.stringify({version:1,books:[entry]});
 await fs.writeFile(path.join(root,'library.json'),original);
 let db=await openLibrary(root);
 assert.deepEqual(db.list(),[entry]);
 const backups=await fs.readdir(path.join(root,'backups'));
 assert.equal(await fs.readFile(path.join(root,'backups',backups[0]),'utf8'),original);
 assert.equal(await fs.readFile(path.join(root,'library.json'),'utf8'),original);
 db.update(entry.id,{location:'new location',bookmarks:['third']});
 db.close();
 await fs.writeFile(path.join(root,'library.json'),'stale invalid legacy file');
 db=await openLibrary(root);
 assert.equal(db.get(entry.id).location,'new location');
 assert.deepEqual(db.get(entry.id).bookmarks,['third']);
 assert.equal((await fs.readdir(path.join(root,'backups'))).length,1);
 db.close();
}));
test('failed legacy import rolls back schema and data and can be retried', () => temporary(async root => {
 await fs.writeFile(path.join(root,'library.json'),JSON.stringify({version:1,books:[entry,entry]}));
 await assert.rejects(openLibrary(root),/UNIQUE/);
 const raw=new DatabaseSync(path.join(root,'library.sqlite'));
 assert.equal(raw.prepare('PRAGMA user_version').get().user_version,0);
 assert.equal(raw.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table'").get().n,0);
 raw.close();
 await fs.writeFile(path.join(root,'library.json'),JSON.stringify({version:1,books:[entry]}));
 const db=await openLibrary(root); assert.equal(db.list().length,1); db.close();
}));
test('malformed legacy source is preserved and rejected', () => temporary(async root => {
 await fs.writeFile(path.join(root,'library.json'),'broken JSON');
 await assert.rejects(openLibrary(root));
 assert.equal(await fs.readFile(path.join(root,'library.json'),'utf8'),'broken JSON');
}));
test('database updates validate input, preserve unrelated fields and cascade removed bookmarks', () => temporary(async root => {
 const db=await openLibrary(root);
 db.add(entry); db.update(entry.id,{bookmarks:['one','two'],location:'saved'});
 assert.throws(() => db.update(entry.id,{title:'changed',bookmarks:[null]}),/Invalid bookmarks/);
 assert.equal(db.get(entry.id).title,entry.title);
 db.update(entry.id,{title:'renamed'});
 assert.deepEqual(db.get(entry.id).bookmarks,['one','two']);
 assert.equal(db.get(entry.id).location,'saved');
 db.remove(entry.id);
 assert.deepEqual(db.list(),[]);
 assert.equal(db.db.prepare('SELECT count(*) AS n FROM bookmarks').get().n,0);
 db.close();
}));
test('preferences are backed up once, validated, and survive restart', () => temporary(async root => {
 let db=await openLibrary(root);
 assert.equal(db.getPreferences(),null);
 await db.migratePreferences({theme:'sepia',fontSize:23});
 db.setPreferences({theme:'dark',fontSize:27});
 assert.throws(() => db.setPreferences({theme:'invalid',fontSize:27}),/Invalid/);
 assert.throws(() => db.setPreferences({theme:'dark',fontSize:Infinity}),/Invalid/);
 db.close();
 db=await openLibrary(root);
 assert.deepEqual(await db.migratePreferences({theme:'light',fontSize:20}),{theme:'dark',fontSize:27});
 assert.equal((await fs.readdir(path.join(root,'backups'))).length,1);
 db.close();
}));
test('future database versions are rejected without downgrading them', () => temporary(async root => {
 const raw=new DatabaseSync(path.join(root,'library.sqlite'));
 raw.exec('PRAGMA user_version = 99');raw.close();
 await assert.rejects(openLibrary(root),/newer app/);
 const check=new DatabaseSync(path.join(root,'library.sqlite'));
 assert.equal(check.prepare('PRAGMA user_version').get().user_version,99);check.close();
}));
