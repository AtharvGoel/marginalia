const { _electron:electron,expect }=require('@playwright/test');
const { spawn }=require('node:child_process');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const { fixture }=require('./fixture.cjs');
const { setTimeout:delay }=require('node:timers/promises');
const repo=path.resolve(__dirname,'..');
const install=path.join(repo,'release','installation-test');
const dataNames=['epub-reader-validation','EPUB Reader Validation'];
let data,app;
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.EPUB_READER_TEST_DATA;env.NODE_ENV='production';
async function exists(file){try{await fs.access(file);return true;}catch{return false;}}
function execute(file,args) {
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{windowsHide:true,env,stdio:'ignore'});
  child.once('error',reject);
  child.once('exit',code=>code===0?resolve():reject(new Error(path.basename(file)+' exited '+code)));
 });
}
async function launch(version){
 app=await electron.launch({executablePath:path.join(install,'EPUB Reader Validation.exe'),args:[],env});
 const page=await app.firstWindow();
 await page.getByRole('heading',{name:'My library.'}).waitFor();
 assert.equal(await app.evaluate(({app})=>app.getVersion()),version);
 data=await app.evaluate(({app})=>app.getPath('userData'));
 const resolved=path.resolve(data);
 // Only this distinct validation application's data folder may be cleaned.
 assert.equal(path.dirname(resolved).toLowerCase(),path.resolve(process.env.APPDATA).toLowerCase());
 assert.ok(dataNames.includes(path.basename(resolved)));
 return page;
}
(async()=>{
 assert.ok(install.startsWith(repo+path.sep));
 if(await exists(install)) throw new Error('An installation-test folder already exists. Review it before rerunning this test.');
 for(const name of dataNames) if(await exists(path.join(process.env.APPDATA,name))) throw new Error('Existing validation app data found; refusing to replace it.');
 let uninstalled=false;
 try {
  const old=path.join(repo,'release','validation-0.1.0','EPUB Reader Validation Setup 0.1.0.exe');
  const current=path.join(repo,'release','validation-0.2.0','EPUB Reader Validation Setup 0.2.0.exe');
  await execute(old,['--current-user','/S','/D='+install]);
  const sample=path.join(repo,'release','installer-sample.epub');
  await fs.writeFile(sample,await fixture());
  let page=await launch('0.1.0');
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},sample);
  await page.getByRole('button',{name:'Add books'}).click();
  const books=await page.evaluate(()=>window.reader.list());
  const id=books[0].id;
  await page.evaluate(async id=>{
   await window.reader.update(id,{location:'installer-upgrade-position',bookmarks:['installer-bookmark']});
   await window.reader.setPreferences({theme:'sepia',fontSize:24});
  },id);
  await app.close();app=null;
  const before=await fs.readFile(path.join(data,'library.sqlite'));
  assert.equal(before.subarray(0,15).toString(),'SQLite format 3');
  await execute(current,['--current-user','/S','/D='+install]);
  page=await launch('0.2.0');
  const state=await page.evaluate(async()=>({books:await window.reader.list(),prefs:await window.reader.getPreferences()}));
  assert.equal(state.books[0].location,'installer-upgrade-position');
  assert.deepEqual(state.books[0].bookmarks,['installer-bookmark']);
  assert.equal(state.prefs.theme,'sepia');assert.equal(state.prefs.fontSize,24);
  await app.close();app=null;
  const beforeUninstall=await fs.readFile(path.join(data,'library.sqlite'));
  const uninstaller=path.join(install,'Uninstall EPUB Reader Validation.exe');
  assert.ok(await exists(uninstaller),'Uninstaller was not installed');
  const shortcut=path.join(process.env.APPDATA,'Microsoft','Windows','Start Menu','Programs','EPUB Reader Validation.lnk');
  assert.ok(await exists(shortcut),'Start-menu shortcut was not installed');
  await execute(uninstaller,['/S']);
  for(let attempt=0;attempt<300;attempt++){
   if(!await exists(path.join(install,'EPUB Reader Validation.exe')) && !await exists(shortcut))break;
   await delay(200);
  }
  assert.equal(await exists(path.join(install,'EPUB Reader Validation.exe')),false);
  assert.equal(await exists(shortcut),false);
  assert.deepEqual(await fs.readFile(path.join(data,'library.sqlite')),beforeUninstall);
  await fs.access(path.join(data,'books',id+'.epub'));
  await fs.access(sample);
  uninstalled=true;
  console.log('PASS: isolated silent installation, version upgrade preserving SQLite and preferences, uninstaller removal of app and shortcut, preservation of books and reading data.');
 } finally {
  if(app)await app.close();
  // Failed installations are left intact for diagnosis; never touch the normal app.
  if(uninstalled && data && dataNames.includes(path.basename(path.resolve(data))) && path.dirname(path.resolve(data)).toLowerCase()===path.resolve(process.env.APPDATA).toLowerCase())await fs.rm(data,{recursive:true,force:true});
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
