const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const JSZip=require('jszip');
const {fixture}=require('./fixture.cjs');
const {coverBook}=require('./cover-fixture.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'epub-bookshelf-'));
 const env={...process.env,NODE_ENV:'test',EPUB_READER_TEST_DATA:path.join(root,'data')};
 delete env.ELECTRON_RUN_AS_NODE;
 let app;
 async function launch(){
  app=await electron.launch({args:process.env.EPUB_TEST_EXECUTABLE?[]:['.'],executablePath:process.env.EPUB_TEST_EXECUTABLE||undefined,env});
  const page=await app.firstWindow();
  await page.getByRole('heading',{name:'My library.'}).waitFor();
  return page;
 }
 async function withoutCover(title,broken=false){
  const zip=await JSZip.loadAsync(broken?await coverBook():await fixture());
  let opf=await zip.file('OEBPS/book.opf').async('string');
  zip.file('OEBPS/book.opf',opf.replace('A Quiet Beginning',title));
  if(broken)zip.file('OEBPS/pixel.png','invalid image bytes');
  return zip.generateAsync({type:'nodebuffer'});
 }
 try{
  const files=[path.join(root,'download_92_random_name.epub'),path.join(root,'noart.epub'),path.join(root,'badart.epub')];
  await fs.writeFile(files[0],await coverBook('epub3','Austen, Jane',true));
  await fs.writeFile(files[1],await withoutCover('No Artwork'));
  await fs.writeFile(files[2],await withoutCover('Broken Artwork',true));
  let page=await launch();
  await app.evaluate(({dialog},files)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:files});},files);
  await page.getByRole('button',{name:'Add books'}).click();
  await expect(page.locator('.book-card')).toHaveCount(3);
  const covered=page.locator('.book-card').filter({has:page.getByRole('button',{name:'Read A Quiet Beginning',exact:true})});
  await expect(covered.locator('.book-author')).toHaveText('Jane Austen');
  await expect(covered.locator('img')).toBeVisible();
  await expect.poll(()=>covered.locator('img').evaluate(img=>img.naturalWidth)).toBe(240);
  await expect(covered.locator('.book-title')).toHaveText('A Quiet Beginning');
  await expect(page.getByRole('button',{name:'Read No Artwork',exact:true}).locator('strong')).toHaveText('No Artwork');
  await expect(page.getByRole('button',{name:'Read Broken Artwork',exact:true}).locator('strong')).toHaveText('Broken Artwork');
  await expect.poll(()=>page.evaluate(()=>window.reader.list().then(books=>books.every(book=>!book.lastOpened)))).toBe(true);
  await page.getByLabel('Search library').fill('Jane Austen');
  await expect(page.locator('.book-card')).toHaveCount(1);
  await page.getByLabel('Search library').fill('');
  await page.setViewportSize({width:1280,height:850});
  await page.screenshot({path:'test-results/bookshelf-covers.png'});
  await app.close();app=null;
  page=await launch();
  await expect(page.getByRole('button',{name:'Read A Quiet Beginning',exact:true}).locator('img')).toBeVisible();
  await expect(page.locator('.book-author').filter({hasText:'Jane Austen'})).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  console.log('PASS: embedded cover rendered, messy filename replaced immediately, given-name-first display/search, no-art and corrupt-art fallback, no reading activity from thumbnails, restart persistence.');
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
