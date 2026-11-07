const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const JSZip = require('jszip');
const { validateEpub, bookPath, atomicJson } = require('../electron/storage.cjs');
const { fixture } = require('./fixture.cjs');
test('accepts a complete EPUB archive', async () => { await validateEpub(await fixture()); });
test('rejects arbitrary bytes and ZIPs without EPUB structure', async () => {
 await assert.rejects(validateEpub(Buffer.from('not a book')));
 const zip = new JSZip(); zip.file('mimetype', 'text/plain');
 await assert.rejects(validateEpub(await zip.generateAsync({type:'nodebuffer'})), /valid EPUB/);
});
test('rejects identifiers that could escape the book directory', () => {
 for (const id of ['../secret', 'C:\\secret', '', 'a'.repeat(63), null]) assert.throws(() => bookPath('library', id));
 assert.equal(bookPath('library', 'a'.repeat(64)), path.join('library', 'books', 'a'.repeat(64) + '.epub'));
});
test('atomically replaces metadata and leaves no temporary files', async () => {
 const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'epub-storage-'));
 try {
  const file = path.join(dir, 'library.json');
  await atomicJson(file, { version: 1, books: [] });
  await atomicJson(file, { version: 1, books: [{ title: 'Saved' }] });
  assert.equal(JSON.parse(await fs.readFile(file)).books[0].title, 'Saved');
  assert.deepEqual(await fs.readdir(dir), ['library.json']);
 } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('rejects broken package XML and missing chapters before importing', async () => {
 for (const change of [
  zip => zip.file('META-INF/container.xml','<container><rootfiles>'),
  zip => zip.file('OEBPS/book.opf','<package/>'),
  zip => zip.remove('OEBPS/one.xhtml'),
 ]) {
  const zip=await JSZip.loadAsync(await fixture());change(zip);
  await assert.rejects(validateEpub(await zip.generateAsync({type:'nodebuffer'})));
 }
});
test('rejects traversal paths and oversize expanded archives', async () => {
 const zip=await JSZip.loadAsync(await fixture());
 zip.file('../outside','unexpected');
 await assert.rejects(validateEpub(await zip.generateAsync({type:'nodebuffer'})),/Unsafe/);
 const original=JSZip.loadAsync;
 JSZip.loadAsync=async()=>({
   file:name => name==='mimetype' ? {async:async()=>'application/epub+zip'} : {},
   files:{bomb:{_data:{uncompressedSize:301*1024*1024}}},
 });
 try { await assert.rejects(validateEpub(Buffer.from('fake')),/too large/); }
 finally {JSZip.loadAsync=original;}
});

