const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { fixture } = require('./fixture.cjs');
(async () => {
 const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'epub-desktop-'));
 const sample = path.join(temporary, 'sample.epub');
 await fs.writeFile(sample, await fixture());
 let app;
 const env = { ...process.env, NODE_ENV: 'test', EPUB_READER_TEST_DATA: path.join(temporary, 'data') };
 delete env.ELECTRON_RUN_AS_NODE;
 async function launch() {
  app = await electron.launch({ args: ['.'], env });
  const page = await app.firstWindow();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.getByRole('heading', {name:'My library.'}).waitFor();
  return page;
 }
 try {
  let page = await launch();
  await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, sample);
  await page.getByRole('button', {name:'Add books'}).click();
  await page.getByRole('button', {name:'Read sample', exact:true}).click();
  await expect(page.locator('.loading')).toHaveCount(0, {timeout:30000});
  await expect(page.frameLocator('iframe').getByRole('heading', {name:'The beginning', exact:true})).toBeVisible();
  await expect(page.locator('.error')).toHaveCount(0);
  await page.getByRole('button', {name:'Search',exact:true}).click();
  await page.getByLabel('Search within book').fill('story continues');
  await page.getByRole('button', {name:'Find',exact:true}).click();
  await expect(page.locator('.search-result')).toHaveCount(1);
  await page.locator('.search-result').click();
  await expect(page.frameLocator('iframe').getByRole('heading', {name:'A second chapter',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Chapters',exact:true}).click();
  await expect(page.getByRole('button', {name:'The beginning', exact:true})).toBeVisible();
  await page.getByLabel('Reading theme').selectOption('dark');
  await expect(page.locator('.app')).toHaveClass('app dark');
  await page.getByRole('button', {name:'A second chapter', exact:true}).click();
  await expect(page.frameLocator('iframe').getByRole('heading', {name:'A second chapter', exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Bookmark', exact:false}).filter({hasText:'＋ Bookmark'}).click();
  await expect(page.getByRole('button', {name:'＋ Bookmark',exact:true})).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.reader.list().then(x => x[0].location))).toBeTruthy();
  if (await page.evaluate(() => window.compromised)) throw new Error('Book script ran');
  await page.screenshot({ path: 'test-results/reader.png' });
  await app.close(); app = null;
  page = await launch();
  await page.getByRole('button', {name:'Read A Quiet Beginning',exact:true}).click();
  await expect(page.locator('.loading')).toHaveCount(0, {timeout:30000});
  await expect(page.frameLocator('iframe').getByRole('heading', {name:'A second chapter', exact:true})).toBeVisible();
  await page.getByRole('button', {name:'Bookmarks',exact:true}).click();
  await expect(page.getByRole('button', {name:'Bookmark 1',exact:true})).toBeVisible();
  await page.getByRole('button', {name:'All books',exact:false}).click();
  await page.screenshot({ path: 'test-results/library.png' });
  await app.evaluate(({ dialog }, file) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] }); }, sample);
  await page.getByRole('button', {name:'Add books'}).click();
  await expect(page.locator('.book-card')).toHaveCount(1);
  console.log('PASS: import, render, chapter navigation, dark theme, bookmarks, restart persistence, duplicate import, disabled book scripts.');
 } finally { if(app) await app.close(); await fs.rm(temporary, { recursive:true, force:true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

