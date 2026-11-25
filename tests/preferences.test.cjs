const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const {openLibrary,SCHEMA_VERSION}=require('../electron/database.cjs');
const {defaults,validatePreferences}=require('../electron/preferences.cjs');
async function temporary(work){const root=await fs.mkdtemp(path.join(os.tmpdir(),'epub-preferences-'));try{await work(root);}finally{await fs.rm(root,{recursive:true,force:true});}}
function versionOne(root,history=true){
 const db=new DatabaseSync(path.join(root,'library.sqlite'));
 db.exec("CREATE TABLE books(id TEXT PRIMARY KEY,title TEXT,author TEXT,added INTEGER,lastOpened INTEGER,location TEXT);CREATE TABLE bookmarks(book_id TEXT,ordinal INTEGER,cfi TEXT);CREATE TABLE preferences(id INTEGER PRIMARY KEY,theme TEXT,font_size REAL);INSERT INTO preferences VALUES(1,'dark',23);PRAGMA user_version=1;");
 if(history)db.exec("CREATE TABLE migration_history(version INTEGER PRIMARY KEY,applied_at INTEGER,source TEXT);INSERT INTO migration_history VALUES(1,1,'old library');");
 db.prepare('INSERT INTO books VALUES(?,?,?,?,?,?)').run('a'.repeat(64),'Old title','Old author',123,456,'saved CFI');
 db.prepare('INSERT INTO bookmarks VALUES(?,?,?)').run('a'.repeat(64),0,'saved bookmark');
 db.close();
}
test('upgrades a real version-1 database with a readable pre-upgrade snapshot',()=>temporary(async root=>{
 versionOne(root);
 const db=await openLibrary(root);
 assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,SCHEMA_VERSION);
 assert.deepEqual(db.getPreferences(),{...defaults,theme:'dark',fontSize:23});
 const book=db.list()[0];assert.equal(book.location,'saved CFI');assert.equal(book.lastOpened,456);assert.deepEqual(book.bookmarks,['saved bookmark']);
 const backup=(await fs.readdir(path.join(root,'backups'))).find(name=>name.endsWith('.sqlite'));
 assert.ok(backup);
 const old=new DatabaseSync(path.join(root,'backups',backup),{readOnly:true});
 assert.equal(old.prepare('PRAGMA user_version').get().user_version,1);
 assert.deepEqual({...old.prepare('SELECT theme,font_size FROM preferences').get()},{theme:'dark',font_size:23});
 assert.equal(old.prepare('SELECT location FROM books').get().location,'saved CFI');old.close();
 db.setPreferences({...defaults,fontFamily:'sans',lineHeight:1.9,readingWidth:640,margin:40,layout:'scroll',sidebarWidth:330,sidebarCollapsed:true});
 db.close();
 const reopened=await openLibrary(root);
 assert.deepEqual(reopened.getPreferences(),{...defaults,fontFamily:'sans',lineHeight:1.9,readingWidth:640,margin:40,layout:'scroll',sidebarWidth:330,sidebarCollapsed:true});
 assert.equal((await fs.readdir(path.join(root,'backups'))).length,1);
 reopened.close();
}));
test('rolls back preference schema changes if an old database is incomplete',()=>temporary(async root=>{
 versionOne(root,false);
 await assert.rejects(openLibrary(root),/migration_history/);
 const db=new DatabaseSync(path.join(root,'library.sqlite'));
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);
 assert.deepEqual(db.prepare('PRAGMA table_info(preferences)').all().map(column=>column.name),['id','theme','font_size']);
 assert.equal(db.prepare('SELECT location FROM books').get().location,'saved CFI');
 db.close();
}));
test('rejects unsafe or out-of-range options and retains new settings when old clients update theme',()=>temporary(async root=>{
 const db=await openLibrary(root);
 db.setPreferences({...defaults,fontFamily:'sans',layout:'scroll',readingWidth:640});
 for(const invalid of [{fontFamily:'url(https://example.com)'},{lineHeight:NaN},{lineHeight:4},{margin:-1},{readingWidth:9999},{sidebarWidth:'300'},{sidebarCollapsed:1},{layout:'invalid'}])assert.throws(()=>db.setPreferences(invalid),/Invalid/);
 const saved=db.setPreferences({theme:'sepia',fontSize:25});
 assert.equal(saved.fontFamily,'sans');assert.equal(saved.layout,'scroll');assert.equal(saved.readingWidth,640);
 db.close();
}));
test('shared defaults and validated default preferences agree',()=>{
 assert.deepEqual(validatePreferences(defaults),defaults);
});
