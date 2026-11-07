const test=require('node:test');
const assert=require('node:assert/strict');
const JSZip=require('jszip');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {metadata,localResource}=require('../electron/metadata.cjs');
const {openLibraryService}=require('../electron/library-service.cjs');
const {openLibrary}=require('../electron/database.cjs');
const {fixture}=require('./fixture.cjs');
async function book(style='epub3',author='Test, Reader') {
 const zip=await JSZip.loadAsync(await fixture());
 let opf=await zip.file('OEBPS/book.opf').async('string');
 opf=opf.replace('Reader Test',author);
 if(style==='epub3')opf=opf.replace('id="image" href="pixel.png"','id="image" properties="cover-image" href="pixel.png"');
 if(style==='epub2')opf=opf.replace('</metadata>','<meta name="cover" content="image"/></metadata>');
 if(style==='wrapper'){
  opf=opf.replace('</package>','<guide><reference type="cover" href="cover.xhtml"/></guide></package>');
  zip.file('OEBPS/cover.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head><body><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="pixel.png"/></svg></body></html>');
 }
 zip.file('OEBPS/book.opf',opf);
 return zip.generateAsync({type:'nodebuffer'});
}
test('reads embedded title and author and supports EPUB 3, EPUB 2 and cover-page artwork',async()=>{
 for(const style of ['epub3','epub2','wrapper']){
  const info=await metadata(await book(style));
  assert.equal(info.title,'A Quiet Beginning');assert.equal(info.author,'Test, Reader');
  assert.equal(info.cover.mime,'image/png');assert.ok(info.cover.bytes.length>0);
 }
});
test('keeps creator display values, separates multiple authors and ignores sort fields',async()=>{
 const zip=await JSZip.loadAsync(await fixture());
 let opf=await zip.file('OEBPS/book.opf').async('string');
 opf=opf.replace('<dc:creator>Reader Test</dc:creator>','<dc:creator xmlns:opf="http://www.idpf.org/2007/opf" opf:file-as="Test, Reader">Reader Test</dc:creator><dc:creator>Austen, Jane</dc:creator><dc:creator xmlns:opf="http://www.idpf.org/2007/opf" opf:role="trl">Translator</dc:creator>');
 zip.file('OEBPS/book.opf',opf);
 assert.equal((await metadata(await zip.generateAsync({type:'nodebuffer'}))).author,'Reader Test; Austen, Jane');
});
test('missing and remote artwork produce fallback without breaking metadata',async()=>{
 for(const href of ['missing.png','https://example.com/cover.png','../../outside.png']){
  const zip=await JSZip.loadAsync(await book());
  const opf=await zip.file('OEBPS/book.opf').async('string');
  zip.file('OEBPS/book.opf',opf.replace('href="pixel.png"', 'href="'+href+'"'));
  const info=await metadata(await zip.generateAsync({type:'nodebuffer'}));
  assert.equal(info.cover,null);assert.equal(info.title,'A Quiet Beginning');
 }
 assert.equal((await metadata(await fixture())).cover,null);
});
test('rejects encoded absolute and external resource paths',()=>{
 for(const href of ['https://example.com/image.png','file:///C:/secret','%2f%2fexample.com/image.png','../../outside.png','..%5coutside.png','%']){
  assert.equal(localResource('OEBPS/book.opf',href),null);
 }
 assert.equal(localResource('OEBPS/book.opf','Images/cover%20art.png'),'OEBPS/Images/cover art.png');
});
test('formats surname-first people while preserving existing order, suffixes and multiple authors',async()=>{
 const {formatAuthors}=await import('../src/utils/formatAuthors.mjs');
 for(const [input,expected]of [
  ['Austen, Jane','Jane Austen'],['Jane Austen','Jane Austen'],['García Márquez, Gabriel','Gabriel García Márquez'],
  ['Doe, Jane, Jr.','Jane Doe Jr.'],['Jane Doe, Jr.','Jane Doe, Jr.'],['Acme, Inc.','Acme, Inc.'],
  ['Austen, Jane; Dickens, Charles','Jane Austen & Charles Dickens'],['Smith, John & Jones, Jane','John Smith & Jane Jones'],
 ])assert.equal(formatAuthors(input),expected);
});
test('imports clean metadata immediately and backfills old entries without changing reading activity',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'epub-metadata-'));
 let svc,db;
 try{
  const bytes=await book(),id=crypto.createHash('sha256').update(bytes).digest('hex');
  const data=path.join(root,'data'),file=path.join(root,'random_download__42.epub');
  await fs.writeFile(file,bytes);
  svc=await openLibraryService(data);
  const imported=await svc.importFiles([file]);
  assert.equal(imported[0].title,'A Quiet Beginning');assert.equal(imported[0].author,'Test, Reader');
  const first=await svc.inspectBook(id);assert.match(first.cover,/^data:image\/png;base64,/);
  const saved=await svc.update(id,{location:'saved CFI',bookmarks:['saved bookmark']});
  await svc.close();svc=null;
  db=await openLibrary(data);db.updateMetadata(id,{title:'messy_filename',author:'Unknown author'});db.close();db=null;
  await fs.rm(path.join(data,'covers',id+'.json'));
  svc=await openLibraryService(data);
  const inspected=await svc.inspectBook(id);
  assert.equal(inspected.entry.title,'A Quiet Beginning');
  assert.equal(inspected.entry.lastOpened,saved.lastOpened);
  assert.equal(inspected.entry.location,'saved CFI');
  assert.deepEqual(inspected.entry.bookmarks,['saved bookmark']);
  await svc.close();svc=null;
  // Persisted cover remains usable without re-opening the archive.
  await fs.rename(path.join(data,'books',id+'.epub'),path.join(root,'moved.epub'));
  svc=await openLibraryService(data);
  assert.equal((await svc.inspectBook(id)).cover,first.cover);
  await svc.remove(id);
  assert.deepEqual(await fs.readdir(path.join(data,'covers')),[]);
 }finally{if(svc)await svc.close();if(db)db.close();await fs.rm(root,{recursive:true,force:true});}
});
module.exports={book};
