const{_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const JSZip=require('jszip');
const{fixture}=require('./fixture.cjs');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'epub-comfort-'));
 const env={...process.env,NODE_ENV:'test',EPUB_READER_TEST_DATA:path.join(root,'data')};delete env.ELECTRON_RUN_AS_NODE;
 const title='On Looking: Eleven Walks with Expert Eyes — A Long Title for the Navigation Check';
 const zip=await JSZip.loadAsync(await fixture());
 let opf=await zip.file('OEBPS/book.opf').async('string');
 opf=opf.replace('A Quiet Beginning',title).replace('</manifest>',Array.from({length:30},(_,i)=>'<item id="c'+(i+1)+'" href="c'+(i+1)+'.xhtml" media-type="application/xhtml+xml"/>').join('')+'</manifest>').replace(/<spine>[\s\S]*?<\/spine>/,'<spine>'+Array.from({length:30},(_,i)=>'<itemref idref="c'+(i+1)+'"/>').join('')+'</spine>');
 zip.file('OEBPS/book.opf',opf);
 const chapterName=i=>'Chapter '+String(i).padStart(2,'0');
 for(let i=1;i<=30;i++){
  const paragraphs=Array.from({length:i===1?160:5},(_,j)=>'<p id="p'+String(j+1).padStart(3,'0')+'">Passage '+(j+1)+'. '+('A quiet reading space makes room for a longer thought. ').repeat(5)+'</p>').join('');
  zip.file('OEBPS/c'+i+'.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><head><title>'+chapterName(i)+'</title></head><body><h1>'+chapterName(i)+'</h1>'+paragraphs+'</body></html>');
 }
 zip.file('OEBPS/nav.xhtml','<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol>'+Array.from({length:30},(_,i)=>'<li><a href="c'+(i+1)+'.xhtml">'+chapterName(i+1)+'</a></li>').join('')+'</ol></nav></body></html>');
 const file=path.join(root,'longbook.epub');await fs.writeFile(file,await zip.generateAsync({type:'nodebuffer'}));
 let app,page;
 async function launch(){
  app=await electron.launch({args:process.env.EPUB_TEST_EXECUTABLE?[]:['.'],executablePath:process.env.EPUB_TEST_EXECUTABLE||undefined,env});
  page=await app.firstWindow();
  page.on('pageerror',error=>console.error('PAGE ERROR:',error.message));
  await page.getByRole('heading',{name:'My library.'}).waitFor();
 }
 const prefs=()=>page.evaluate(()=>window.reader.getPreferences());
 async function currentCfi(){return page.evaluate(()=>window.reader.list().then(books=>books[0].location));}
 async function contentFrame(name='Chapter 01'){
  for(let attempt=0;attempt<100;attempt++){
   for(const frame of page.frames()){
    try{if(frame!==page.mainFrame()&&await frame.locator('h1').filter({hasText:name}).count())return frame;}catch{}
   }
   await new Promise(resolve=>setTimeout(resolve,30));
  }
  throw new Error('Chapter frame not found: '+name);
 }
 async function settled(){await expect(page.locator('.loading')).toHaveCount(0,{timeout:30000});}
 try{
  await launch();
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},file);
  await page.getByRole('button',{name:'Add books'}).click();
  await page.getByRole('button',{name:'Read '+title,exact:true}).click();await settled();
  await expect(page.getByRole('button',{name:'Chapter 01',exact:true})).toHaveAttribute('aria-current','location');
  const nav=await page.getByRole('navigation',{name:'chapters',exact:true}).boundingBox();
  if(!nav||nav.height<(await page.evaluate(()=>window.innerHeight))*.6)throw new Error('Chapters still occupy less than 60% of the window: '+JSON.stringify({nav,height:await page.evaluate(()=>window.innerHeight)}));
  const resizer=page.getByRole('separator',{name:'Sidebar width'});
  const oldWidth=await page.locator('.reader-sidebar').evaluate(el=>el.getBoundingClientRect().width);
  const handle=await resizer.boundingBox();if(!handle)throw new Error('Resize handle missing');
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);await page.mouse.down();await page.mouse.move(handle.x+65,handle.y+handle.height/2,{steps:6});await page.mouse.up();
  await expect.poll(async()=>page.locator('.reader-sidebar').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(oldWidth+40);
  await resizer.focus();await page.keyboard.press('Home');
  await expect.poll(async()=>(await prefs()).sidebarWidth).toBe(220);
  await resizer.press('ArrowRight');await expect.poll(async()=>(await prefs()).sidebarWidth).toBe(230);
  await page.getByRole('button',{name:'Hide sidebar',exact:true}).first().click();
  await expect(page.locator('.reader-sidebar')).toHaveCount(0);
  await page.getByRole('button',{name:'Show sidebar',exact:true}).click();
  await expect(page.locator('.reader-sidebar')).toBeVisible();
  await page.getByRole('button',{name:'Chapter 15',exact:true}).click();await settled();
  await expect(page.getByRole('button',{name:'Chapter 15',exact:true})).toHaveAttribute('aria-current','location');
  await expect(page.getByRole('button',{name:'Chapter 15',exact:true})).toBeInViewport();
  await page.screenshot({path:'test-results/reader-sidebar-comfort.png'});
  await page.getByRole('button',{name:'Chapter 01',exact:true}).click();
  await expect(page.getByRole('button',{name:'Chapter 01',exact:true})).toHaveAttribute('aria-current','location');
  await expect.poll(currentCfi).toMatch(/^epubcfi\(\/6\/2!/);
  for(let i=0;i<3;i++){const previous=await currentCfi();await page.getByRole('button',{name:'Next →',exact:true}).click();await expect.poll(currentCfi).not.toBe(previous);}
  await expect.poll(currentCfi).toMatch(/\[p\d+\]/);
  const cfi=await currentCfi(),anchor=cfi.match(/\[(p\d+)\]/)[1];
  const originalFont=await(await contentFrame()).locator('body').evaluate(el=>getComputedStyle(el).fontFamily);
  await page.getByRole('button',{name:'Reading settings',exact:true}).click();
  await page.getByLabel('Reading font',{exact:true}).selectOption('sans');
  await page.getByLabel('Line spacing',{exact:true}).fill('1.9');
  await page.getByLabel('Reading margins',{exact:true}).fill('40');
  await page.getByLabel('Reading width',{exact:true}).fill('640');
  await expect.poll(async()=>{const frame=await contentFrame();return frame.locator('body').evaluate(el=>getComputedStyle(el).fontFamily).catch(()=>'');}).toContain('Segoe UI');
  await expect.poll(async()=>{const frame=await contentFrame();return frame.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).lineHeight)/parseFloat(getComputedStyle(el).fontSize)).catch(()=>0);}).toBeCloseTo(1.9,1);
  await expect.poll(()=>page.locator('.reader-page').evaluate(el=>el.getBoundingClientRect().width)).toBe(640);
  await settled();
  await expect(async()=>{await expect((await contentFrame()).locator('#'+anchor)).toBeInViewport({timeout:1000});}).toPass({timeout:8000});
  for(const [font,expected]of [['mono','Consolas'],['book',originalFont],['serif','Georgia'],['sans','Segoe UI']]){
   await page.getByLabel('Reading font',{exact:true}).selectOption(font);
   await expect.poll(async()=>{const frame=await contentFrame();return frame.locator('body').evaluate(el=>getComputedStyle(el).fontFamily).catch(()=>'');}).toContain(expected);
   await settled();await expect(async()=>{await expect((await contentFrame()).locator('#'+anchor)).toBeInViewport({timeout:1000});}).toPass({timeout:8000});
  }
  await page.screenshot({path:'test-results/reader-settings.png'});
  await page.getByLabel('Reading mode',{exact:true}).selectOption('scroll');
  await expect(page.locator('.epub-host')).toHaveAttribute('data-layout','scroll',{timeout:30000});await settled();
  await expect(async()=>{await expect((await contentFrame()).locator('#'+anchor)).toBeInViewport({timeout:1000});}).toPass({timeout:8000});
  await page.getByRole('button',{name:'Close reading settings'}).click();
  const before=await currentCfi(),area=await page.locator('.reader-page').boundingBox();if(!area)throw new Error('Reader page missing');
  await page.mouse.move(area.x+100,area.y+100);await page.mouse.wheel(0,650);
  await expect.poll(currentCfi,{timeout:10000}).not.toBe(before);
  await page.getByRole('button',{name:'Chapter 15',exact:true}).click();
  await expect(page.getByRole('button',{name:'Chapter 15',exact:true})).toHaveAttribute('aria-current','location');
  await expect(async()=>{await expect((await contentFrame('Chapter 15')).locator('h1')).toBeInViewport({timeout:1000});}).toPass({timeout:8000});
  await page.mouse.move(area.x+100,area.y+100);await page.mouse.wheel(0,1800);
  await expect.poll(()=>page.locator('.chapter-list [aria-current=location]').innerText(),{timeout:15000}).not.toBe('Chapter 15');
  await page.getByRole('button',{name:'Reading settings',exact:true}).click();
  await page.getByLabel('Reading mode',{exact:true}).selectOption('paginated');
  await expect(page.locator('.epub-host')).toHaveAttribute('data-layout','paginated',{timeout:30000});await settled();
  await page.getByRole('button',{name:'Close reading settings'}).click();
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(true);
  await expect(page.getByRole('button',{name:'Exit full screen',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await expect(page.locator('.epub-host')).toBeVisible();
  await page.locator('.epub-host iframe').first().contentFrame().locator('body').click({position:{x:20,y:20}});
  await page.keyboard.press('F11');
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(true);
  await page.keyboard.press('F11');
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isFullScreen())).toBe(false);
  await page.setViewportSize({width:820,height:600});await settled();
  await expect(page.getByRole('button',{name:'Reading settings',exact:true})).toBeVisible();
  const smallNav=await page.getByRole('navigation',{name:'chapters',exact:true}).boundingBox();if(!smallNav||smallNav.height<350)throw new Error('Chapter list is cramped at minimum window size');
  await page.getByRole('button',{name:'Reading settings',exact:true}).click();
  await page.getByLabel('Reading mode',{exact:true}).selectOption('scroll');
  await expect(page.locator('.epub-host')).toHaveAttribute('data-layout','scroll',{timeout:30000});
  await page.getByRole('button',{name:'Close reading settings'}).click();
  await page.getByRole('button',{name:'Hide sidebar',exact:true}).first().click();
  await expect.poll(prefs).toMatchObject({fontFamily:'sans',lineHeight:1.9,margin:40,readingWidth:640,layout:'scroll',sidebarWidth:230,sidebarCollapsed:true});
  await app.close();app=null;await launch();
  await expect.poll(prefs).toMatchObject({fontFamily:'sans',lineHeight:1.9,margin:40,readingWidth:640,layout:'scroll',sidebarWidth:230,sidebarCollapsed:true});
  await page.getByRole('button',{name:'Read '+title,exact:true}).click();await settled();
  await expect(page.locator('.epub-host')).toHaveAttribute('data-layout','scroll');
  await expect(page.getByRole('button',{name:'Show sidebar',exact:true})).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  console.log('PASS: long-title chapter space, current chapter, pointer/keyboard resizing, collapse/restore, font/spacing/margins/width, CFI reflow preservation, continuous scroll and scrolling persistence, fullscreen button/F11/Escape, minimum window size, settings after restart.');
 }catch(error){if(app){await page.screenshot({path:'test-results/comfort-failure.png'});console.log('COMFORT STATE',await page.locator('.reader-footer').innerText(),await currentCfi(),await page.locator('.epub-host').getAttribute('data-layout'));}throw error;}finally{if(app)await app.close();await fs.rm(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
