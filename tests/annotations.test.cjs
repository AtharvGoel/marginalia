const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const {openLibrary,SCHEMA_VERSION}=require('../electron/database.cjs');
const {validateAnnotation,webSearchUrl}=require('../electron/annotations.cjs');
const {openLibraryService}=require('../electron/library-service.cjs');
const {fixture}=require('./fixture.cjs');
const book={id:'a'.repeat(64),title:'A book',author:'An author',added:123};
const passage={cfi:'epubcfi(/6/4!/4/2,/1:0,/1:12)',text:'A quiet beginning',color:'yellow',note:''};
async function temporary(work){const root=await fs.mkdtemp(path.join(os.tmpdir(),'marginalia-annotations-'));try{await work(root);}finally{await fs.rm(root,{recursive:true,force:true});}}

test('annotations persist, update without duplication, preserve reading state, and cascade with books',()=>temporary(async root=>{
 let db=await openLibrary(root);db.add(book);db.add({...book,id:'b'.repeat(64)});
 db.update(book.id,{location:'saved location',bookmarks:['saved mark']});const before=db.get(book.id);
 let [saved]=db.saveAnnotation(book.id,passage);assert.equal(saved.text,passage.text);
 const id=saved.id,created=saved.createdAt;
 [saved]=db.saveAnnotation(book.id,{...passage,color:'pink',note:'  My first thought  '});
 assert.equal(saved.id,id);assert.equal(saved.createdAt,created);assert.equal(saved.color,'pink');assert.equal(saved.note,'My first thought');
 assert.deepEqual(db.get(book.id),before);assert.equal(db.listAnnotations(book.id).length,1);
 assert.throws(()=>db.removeAnnotation('b'.repeat(64),id),/not found/);
 db.close();db=await openLibrary(root);assert.deepEqual(db.listAnnotations(book.id),[saved]);
 [saved]=db.saveAnnotation(book.id,{...passage,color:null,note:'Note without colour'});assert.equal(saved.color,null);
 db.removeAnnotation(book.id,saved.id);assert.deepEqual(db.listAnnotations(book.id),[]);
 db.saveAnnotation(book.id,passage);db.remove(book.id);assert.equal(db.db.prepare('SELECT count(*) AS n FROM annotations').get().n,0);db.close();
}));

test('rejects malformed anchors, unsupported colours, empty annotations and oversized input',()=>temporary(async root=>{
 const db=await openLibrary(root);db.add(book);
 for(const value of [null,[],{...passage,cfi:'javascript:alert(1)'},{...passage,cfi:'epubcfi(/6/4!/4/2)'},{...passage,cfi:'epubcfi(bad,bad,bad)'},{...passage,cfi:'epubcfi(/6/4!/4/2,/1:-1,/1:12)'},{...passage,text:''},{...passage,text:'x'.repeat(20001)},{...passage,color:'red'},{...passage,color:null,note:' '},{...passage,note:'x'.repeat(50001)}])assert.throws(()=>db.saveAnnotation(book.id,value));
 assert.throws(()=>db.removeAnnotation(book.id,'../other'));assert.deepEqual(db.listAnnotations(book.id),[]);
 const literal=validateAnnotation({...passage,note:'<img src=x onerror=alert(1)>'});assert.equal(literal.note,'<img src=x onerror=alert(1)>');
 assert.throws(()=>db.saveAnnotation('b'.repeat(64),passage),/Book not found/);db.close();
}));

async function oldSchema(root,withHistory=true){
 const db=await openLibrary(root);db.add(book);db.update(book.id,{location:'old position',bookmarks:['old bookmark']});db.setPreferences({theme:'dark',fontSize:23});db.close();
 const raw=new DatabaseSync(path.join(root,'library.sqlite'));
 raw.exec('DROP TABLE annotations;DELETE FROM migration_history WHERE version=3;PRAGMA user_version=2;');
 if(!withHistory)raw.exec('DROP TABLE migration_history;');raw.close();
}
test('schema-2 upgrade makes an independently readable backup and retains books and preferences',()=>temporary(async root=>{
 await oldSchema(root);let db=await openLibrary(root);
 assert.equal(db.db.prepare('PRAGMA user_version').get().user_version,SCHEMA_VERSION);
 assert.equal(db.get(book.id).location,'old position');assert.deepEqual(db.get(book.id).bookmarks,['old bookmark']);assert.equal(db.getPreferences().theme,'dark');assert.equal(db.getPreferences().fontSize,23);
 db.saveAnnotation(book.id,passage);db.close();
 const files=await fs.readdir(path.join(root,'backups'));assert.equal(files.length,1);
 const snapshot=new DatabaseSync(path.join(root,'backups',files[0]),{readOnly:true});assert.equal(snapshot.prepare('PRAGMA user_version').get().user_version,2);assert.equal(snapshot.prepare('SELECT location FROM books').get().location,'old position');assert.equal(snapshot.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='annotations'").get().n,0);snapshot.close();
 db=await openLibrary(root);assert.equal(db.listAnnotations(book.id).length,1);db.close();assert.equal((await fs.readdir(path.join(root,'backups'))).length,1);
}));
test('failed annotation migration rolls back its table and version while preserving the old library',()=>temporary(async root=>{
 await oldSchema(root,false);await assert.rejects(openLibrary(root),/migration_history/);
 const raw=new DatabaseSync(path.join(root,'library.sqlite'));assert.equal(raw.prepare('PRAGMA user_version').get().user_version,2);assert.equal(raw.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='annotations'").get().n,0);assert.equal(raw.prepare('SELECT location FROM books').get().location,'old position');raw.close();
}));
test('queued annotation writes finish before library close and deletion preserves original source',()=>temporary(async root=>{
 const source=path.join(root,'source.epub'),data=path.join(root,'data');await fs.writeFile(source,await fixture());
 let service=await openLibraryService(data);const [book]=await service.importFiles([source]);
 const first=service.saveAnnotation(book.id,passage),second=service.saveAnnotation(book.id,{...passage,note:'Queued note'});await service.close();await Promise.all([first,second]);
 service=await openLibraryService(data);assert.equal(service.listAnnotations(book.id)[0].note,'Queued note');await service.remove(book.id);assert.equal(service.list().length,0);await fs.access(source);await service.close();
}));
test('web search safely encodes all selected text into a fixed HTTPS search URL',()=>{
 const text='A & B? \"quoted\" #passage / café — 日本語 javascript:alert(1)';const url=new URL(webSearchUrl(text));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/search');assert.equal(url.searchParams.get('q'),text);assert.deepEqual([...url.searchParams.keys()],['q']);
 for(const value of [null,{},'', '  ','x'.repeat(2001)])assert.throws(()=>webSearchUrl(value));
});
