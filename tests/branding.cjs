const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {fixture}=require('./fixture.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'marginalia-branding-'));
 const data=path.join(root,'data');
 const env={...process.env,NODE_ENV:'test',EPUB_READER_TEST_DATA:data};delete env.ELECTRON_RUN_AS_NODE;
 let app;
 try{
  app=await electron.launch({args:process.env.EPUB_TEST_EXECUTABLE?[]:['.'],executablePath:process.env.EPUB_TEST_EXECUTABLE||undefined,env});
  const page=await app.firstWindow();
  await page.getByRole('heading',{name:'My library.'}).waitFor();
  assert.equal(await app.evaluate(({app})=>app.getName()),'Marginalia');
  assert.equal(await app.evaluate(({app})=>app.getPath('userData')),path.join(data,'chromium'));
  await expect(page).toHaveTitle('Marginalia');
  const brand=page.getByRole('img',{name:'Marginalia',exact:true});
  await expect(brand).toBeVisible();
  for(const img of await brand.locator('img').all())await expect.poll(()=>img.evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'test-results/marginalia-library.png'});
  const file=path.join(root,'book.epub');await fs.writeFile(file,await fixture());
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.getByRole('button',{name:'Add books'}).click();
  await page.getByRole('button',{name:'Read A Quiet Beginning',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'chapters'})).toBeVisible();
  await expect(brand).toBeVisible();
  const size=await brand.boundingBox();assert.ok(size.height<=36,'Compact branding must preserve chapter space');
  await expect(page.locator('.loading')).toHaveCount(0);
  await page.screenshot({path:'test-results/marginalia-reader.png'});
  console.log('PASS: Marginalia window/name, both supplied images loaded, isolated test data, compact reading branding.');
 }finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
