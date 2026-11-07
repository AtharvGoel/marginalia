const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const { openLibraryService }=require('../electron/library-service.cjs');
const { fixture }=require('./fixture.cjs');
test('managed copies survive removal of the original; deletion preserves the original and queued state persists',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'epub-service-'));
 let service;
 try {
  const file=path.join(root,'original.epub'),bytes=await fixture();
  await fs.writeFile(file,bytes);
  service=await openLibraryService(path.join(root,'data'));
  await service.importFiles([file,file]);
  const [book]=service.list();assert.equal(service.list().length,1);
  const writes=[service.update(book.id,{location:'position A'}),service.update(book.id,{location:'position B',bookmarks:['saved']})];
  await service.close(); service=null; await Promise.all(writes);
  service=await openLibraryService(path.join(root,'data'));
  assert.equal(service.list()[0].location,'position B');
  await fs.rm(file);
  assert.deepEqual(Buffer.from(await service.read(book.id)),bytes);
  await fs.writeFile(file,bytes);
  await service.remove(book.id);
  assert.deepEqual(await fs.readFile(file),bytes);
  assert.deepEqual(service.list(),[]);
  assert.deepEqual(await fs.readdir(path.join(root,'data','books')),[]);
  await service.importFiles([file]);
  await fs.rm(path.join(root,'data','books',book.id+'.epub'));
  await assert.rejects(service.read(book.id),/missing/);
 } finally { if(service) await service.close(); await fs.rm(root,{recursive:true,force:true}); }
});

