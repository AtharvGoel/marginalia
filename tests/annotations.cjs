const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {fixture}=require('./fixture.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'marginalia-passages-'));
 const env={...process.env,NODE_ENV:'test',EPUB_READER_TEST_DATA:path.join(root,'data')};delete env.ELECTRON_RUN_AS_NODE;
 let app,page,bookId;const errors=[];
 async function launch(){
  app=await electron.launch({args:process.env.EPUB_TEST_EXECUTABLE?[]:['.'],executablePath:process.env.EPUB_TEST_EXECUTABLE||undefined,env});page=await app.firstWindow();
  page.on('pageerror',error=>errors.push(error.message));
  await page.getByRole('heading',{name:'My library.'}).waitFor();
  await app.evaluate(({shell})=>{globalThis.annotationSearchUrls=[];shell.openExternal=async url=>{globalThis.annotationSearchUrls.push(url);};});
 }
 async function settled(){await expect(page.locator('.loading')).toHaveCount(0);await expect(page.locator('.epub-host')).toHaveAttribute('data-layout',/paginated|scroll/);}
 async function frame(){await settled();for(const frame of page.frames())if(frame!==page.mainFrame()&&await frame.locator('h1').filter({hasText:'The beginning'}).count())return frame;throw Error('Chapter frame missing');}
 const actions=()=>page.getByRole('region',{name:'Passage actions'});
 const saved=()=>page.evaluate(id=>window.reader.listAnnotations(id),bookId);
 async function selectPassage(index=0){const f=await frame();await f.locator('p').nth(index).evaluate(p=>{const range=document.createRange();range.selectNodeContents(p);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});await expect(actions()).toBeVisible();}
 async function review(index=0){await page.getByRole('button',{name:'Notes',exact:true}).click();await page.locator('.annotation-card').nth(index).getByRole('button',{name:'Edit annotation'}).click();await expect(actions()).toBeVisible();}
 try{
  const file=path.join(root,'book.epub');await fs.writeFile(file,await fixture());await launch();
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);await page.getByRole('button',{name:'Add books'}).click();
  await page.getByRole('button',{name:'Read A Quiet Beginning',exact:true}).waitFor();
  bookId=(await page.evaluate(()=>window.reader.list()))[0].id;
  await page.getByRole('button',{name:'Read A Quiet Beginning',exact:true}).click();
  const f=await frame();await f.locator('p').first().click({clickCount:3});await expect(actions()).toBeVisible();
  await actions().getByRole('button',{name:'Highlight yellow',exact:true}).click();await expect(actions()).toHaveCount(0);await expect.poll(saved).toHaveLength(1);await expect(page.locator('.marginalia-highlight')).toHaveCount(1);
  await expect(page.locator('.marginalia-highlight')).toHaveAttribute('fill','#f4d35e');
  await page.locator('.marginalia-highlight').click({force:true});await expect(actions()).toBeVisible();
  for(const color of ['green','blue','yellow']){await actions().getByRole('button',{name:'Highlight '+color,exact:true}).click();await expect(actions()).toHaveCount(0);await page.locator('.marginalia-highlight').click({force:true});await expect(actions()).toBeVisible();}
  await actions().getByRole('button',{name:'Close passage actions'}).click();
  assert.equal((await saved())[0].text.trim(),'A quiet beginning is a good place to start.');
  console.log('PASS: native mouse passage selection and persisted colour highlight.');
  await review();await actions().getByRole('button',{name:'Add note',exact:true}).click();
  const note=page.getByRole('dialog');await expect(note).toBeVisible();
  await note.getByLabel('Your note').fill('A personal thought — <script>literal text</script>');await note.getByRole('button',{name:'Save note',exact:true}).click();await expect(note).toHaveCount(0);
  await expect.poll(async()=>(await saved())[0].note).toContain('literal text');await expect(page.locator('.annotation-preview')).toContainText('<script>literal text</script>');
  await review();await actions().getByRole('button',{name:'Highlight pink',exact:true}).click();await expect.poll(async()=>(await saved())[0].color).toBe('pink');await expect(page.locator('.marginalia-highlight')).toHaveAttribute('fill','#f5a1bb');
  const first=(await saved())[0];await review();await actions().getByRole('button',{name:'Edit note'}).click();await page.getByLabel('Your note').fill('Changed but cancelled');await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();assert.equal((await saved())[0].note,first.note);
  await actions().getByRole('button',{name:'Edit note'}).click();await page.getByLabel('Your note').fill('An edited thought');await page.getByRole('button',{name:'Save note',exact:true}).click();
  await expect.poll(async()=>(await saved())[0].note).toBe('An edited thought');
  assert.equal((await saved()).length,1);assert.equal((await saved())[0].id,first.id);
  await page.getByRole('button',{name:'Chapters',exact:true}).click();await page.getByRole('button',{name:'A second chapter',exact:true}).click();await settled();
  await page.getByRole('button',{name:'Notes',exact:true}).click();await page.locator('.annotation-card').first().getByRole('button',{name:'Go to passage'}).click();await settled();await expect(page.locator('.marginalia-highlight')).toHaveCount(1);
  console.log('PASS: note creation/edit/cancel, literal text safety, recolouring, one record per passage.');
  await selectPassage(1);await actions().getByRole('button',{name:'Add note',exact:true}).click();await page.getByLabel('Your note').fill('A note without a highlight');await page.getByRole('button',{name:'Save note',exact:true}).click();await expect.poll(saved).toHaveLength(2);await expect(page.locator('.marginalia-note')).toHaveCount(1);
  assert.equal((await saved())[1].color,null);
  await selectPassage(0);const selected=await actions().locator('blockquote').innerText();await actions().getByRole('button',{name:/Search on Web/}).click();
  const urls=await app.evaluate(()=>globalThis.annotationSearchUrls);assert.equal(urls.length,1);const url=new URL(urls[0]);assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('q'),selected.trim());
  assert.equal((await saved()).length,2);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);
  await selectPassage(2);const keyboardFrame=await frame();await keyboardFrame.evaluate(()=>window.focus());
  const cfiBefore=(await page.evaluate(()=>window.reader.list()))[0].location;
  await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Alt+m');await expect(actions().getByRole('button',{name:'Close passage actions'})).toBeFocused();await page.keyboard.press('Escape');await expect(actions()).toHaveCount(0);
  assert.equal((await page.evaluate(()=>window.reader.list()))[0].location,cfiBefore);
  console.log('PASS: note-only marker and explicit default-browser search with exact selected text.');
  await page.getByRole('button',{name:'Reading settings',exact:true}).click();await page.getByLabel('Reading font',{exact:true}).selectOption('sans');
  await page.getByRole('button',{name:'Close reading settings',exact:true}).click();await settled();await expect(page.locator('.marginalia-highlight')).toHaveCount(1);await expect(page.locator('.marginalia-note')).toHaveCount(1);
  await page.getByRole('button',{name:'Reading settings',exact:true}).click();await page.getByLabel('Reading mode',{exact:true}).selectOption('scroll');await page.getByRole('button',{name:'Close reading settings',exact:true}).click();await expect(page.locator('.epub-host')).toHaveAttribute('data-layout','scroll');await settled();
  await expect(page.locator('.marginalia-highlight')).toHaveCount(1);await expect(page.locator('.marginalia-note')).toHaveCount(1);
  const marked=await page.locator('.marginalia-note').boundingBox(),paragraph=await (await frame()).locator('p').nth(1).boundingBox();
  assert.ok(marked&&paragraph&&marked.y>=paragraph.y-5&&marked.y<=paragraph.y+paragraph.height+5,'Note marker must stay on its original passage after reflow');
  await page.setViewportSize({width:820,height:600});await settled();await expect(async()=>{await selectPassage(0);}).toPass({timeout:10000});const box=await actions().boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=820&&box.y+box.height<=600);
  await page.screenshot({path:'test-results/passage-actions.png'});await actions().getByRole('button',{name:'Close passage actions'}).click();
  await app.close();app=null;await launch();assert.equal((await saved()).length,2);await page.getByRole('button',{name:'Read A Quiet Beginning',exact:true}).click();await settled();await expect(page.locator('.marginalia-highlight')).toHaveCount(1);await expect(page.locator('.marginalia-note')).toHaveCount(1);
  await page.getByRole('button',{name:'Notes',exact:true}).click();await expect(page.locator('.annotation-card')).toHaveCount(2);await page.screenshot({path:'test-results/passage-notes.png'});
  await review();await actions().getByRole('button',{name:'Remove highlight'}).click();await expect.poll(async()=>(await saved())[0].color).toBe(null);await expect(page.locator('.marginalia-highlight')).toHaveCount(0);await expect(page.locator('.marginalia-note')).toHaveCount(2);
  await review();await actions().getByRole('button',{name:'Delete note'}).click();await expect.poll(saved).toHaveLength(1);await review();await actions().getByRole('button',{name:'Delete note'}).click();await expect.poll(saved).toHaveLength(0);await expect(page.locator('.marginalia-note')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);assert.deepEqual(errors,[]);
  console.log('PASS: typography, scroll mode, minimum-window menu, restart, independent highlight/note deletion and marker cleanup.');
 }catch(error){if(page)await page.screenshot({path:'test-results/passage-failure.png'}).catch(()=>{});throw error;}
 finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
