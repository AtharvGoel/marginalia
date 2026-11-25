const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),JSZip=require('jszip');
const {coverBook}=require('./cover-fixture.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'marginalia-import-compatibility-'));
 const env={...process.env,NODE_ENV:'test',EPUB_READER_TEST_DATA:path.join(root,'data')};delete env.ELECTRON_RUN_AS_NODE;
 let app,page;
 const title='A Quiet \ufffd Beginning';
 async function launch(){app=await electron.launch({args:process.env.EPUB_TEST_EXECUTABLE?[]:['.'],executablePath:process.env.EPUB_TEST_EXECUTABLE||undefined,env});page=await app.firstWindow();await page.getByRole('heading',{name:'My library.'}).waitFor();}
 try{
  const zip=await JSZip.loadAsync(await coverBook('wrapper','Test, Reader',true));
  zip.file('OEBPS/book.opf',(await zip.file('OEBPS/book.opf').async('string')).replace('A Quiet Beginning',title));
  for(const name of Object.keys(zip.files).filter(name=>/\.(xhtml|svg)$/.test(name))){const text=await zip.file(name).async('string');zip.file(name,text.replace(/(<(?:img|image)\b)/,'<!-- \ufffd -->$1'));}
  const bytes=await zip.generateAsync({type:'nodebuffer'}),file=path.join(root,'unicode-book.epub');await fs.writeFile(file,bytes);await launch();
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.getByRole('button',{name:'Add books'}).click();const read=page.getByRole('button',{name:'Read '+title,exact:true});await expect(read).toBeVisible();await expect(read.locator('img')).toBeVisible();
  const books=await page.evaluate(()=>window.reader.list());assert.equal(books.length,1);assert.equal(books[0].title,title);
  const stored=await page.evaluate(id=>window.reader.read(id).then(bytes=>Array.from(bytes)),books[0].id);assert.deepEqual(Buffer.from(stored),bytes);assert.deepEqual(await fs.readFile(file),bytes);
  await read.click();await expect(page.locator('.loading')).toHaveCount(0);await page.frameLocator('.epub-host iframe').first().getByRole('heading',{name:'The beginning',exact:true}).waitFor();await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({path:'test-results/unicode-import-reading.png'});await app.close();app=null;await launch();await expect(page.getByRole('button',{name:'Read '+title,exact:true})).toBeVisible();
  const broken=path.join(root,'broken.epub');zip.file('OEBPS/book.opf',(await zip.file('OEBPS/book.opf').async('string')).replace('</metadata>','</broken>'));await fs.writeFile(broken,await zip.generateAsync({type:'nodebuffer'}));
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},broken);await page.getByRole('button',{name:'Add books'}).click();await expect(page.getByRole('alert')).toContainText('Invalid EPUB package XML');await expect(page.getByRole('alert')).not.toContainText('Reporting warning');assert.equal((await page.evaluate(()=>window.reader.list())).length,1);
  console.log('PASS: reported Unicode warning reproduced by fixture; import, cover, rendering and restart work; exact source bytes retained; genuinely malformed XML still rejected.');
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
