const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('node:path');
const { openLibraryService } = require('./library-service.cjs');
let win, library, exiting = false;

function handle(name, callback) {
  ipcMain.handle(name, (event,...args) => {
    if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Untrusted request.');
    return callback(...args);
  });
}
// A second process must not migrate or modify the same library concurrently.
const isTest = process.env.NODE_ENV === 'test' && process.env.EPUB_READER_TEST_DATA;
if (isTest) {
  const profile = path.join(isTest, 'chromium');
  require('node:fs').mkdirSync(profile, {recursive:true});
  app.setPath('userData', profile);
}
if (!isTest && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if(win) { if(win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(async () => {
    const root = isTest || app.getPath('userData');
    library = await openLibraryService(root,{thumbnail:bytes=>{
      const image=nativeImage.createFromBuffer(bytes);
      if(image.isEmpty())return null;
      const {width,height}=image.getSize();
      if(width>12000 || height>12000)return null;
      const scale=Math.min(256/width,384/height,1);
      return image.resize({width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),quality:'good'}).toDataURL();
    }});
    handle('library:list', () => library.list());
    handle('book:import', async () => {
      const result = await dialog.showOpenDialog(win, { filters: [{ name: 'EPUB books', extensions: ['epub'] }], properties: ['openFile','multiSelections'] });
      return result.canceled ? library.list() : library.importFiles(result.filePaths);
    });
    handle('book:inspect',id=>library.inspectBook(id));
    handle('book:read', id => library.read(id));
    handle('book:update', (id,value) => library.update(id,value));
    handle('book:remove', id => library.remove(id));
    handle('preferences:get', () => library.getPreferences());
    handle('preferences:migrate', value => library.migratePreferences(value));
    handle('preferences:set', value => library.setPreferences(value));
    win = new BrowserWindow({
      width:1280,height:850,minWidth:820,minHeight:600,backgroundColor:'#f5f3ed',title:'EPUB Reader',
      webPreferences:{ preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true },
    });
    handle('window:fullscreen:get',()=>win.isFullScreen());
    handle('window:fullscreen:set',value=>{if(typeof value!=='boolean')throw new Error('Invalid fullscreen request.');win.setFullScreen(value);});
    win.on('enter-full-screen',()=>win.webContents.send('window:fullscreen',true));
    win.on('leave-full-screen',()=>win.webContents.send('window:fullscreen',false));
    win.webContents.on('before-input-event',(event,input)=>{
      if(input.type!=='keyDown')return;
      if(input.key==='F11'&&!input.isAutoRepeat){event.preventDefault();win.setFullScreen(!win.isFullScreen());}
      if(input.key==='Escape'&&win.isFullScreen()){event.preventDefault();win.setFullScreen(false);}
    });
    win.webContents.setWindowOpenHandler(() => ({action:'deny'}));
    win.webContents.on('will-navigate', event => event.preventDefault());
    win.webContents.on('will-attach-webview', event => event.preventDefault());
    win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback) => callback(false));
    win.webContents.session.webRequest.onBeforeRequest((details,callback) => {
      const url = new URL(details.url);
      const localDev = process.argv.includes('--dev') && ['127.0.0.1','localhost'].includes(url.hostname);
      callback({cancel:['http:','https:','ws:','wss:'].includes(url.protocol) && !localDev});
    });
    if(process.argv.includes('--dev')) await win.loadURL('http://127.0.0.1:5173');
    else await win.loadFile(path.join(__dirname,'../dist/index.html'));
  }).catch(error => {
    if (isTest) console.error(error);
    else dialog.showErrorBox('Could not open EPUB Reader', error.message + '\nYour existing library and migration backups have been preserved.');
    app.quit();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', event => {
    if(exiting) return;
    event.preventDefault();
    // Reject new IPC writes while waiting for existing work to finish.

    for (const channel of ['library:list','book:import','book:read','book:update','book:remove','book:inspect','window:fullscreen:get','window:fullscreen:set','preferences:get','preferences:migrate','preferences:set']) ipcMain.removeHandler(channel);
    Promise.resolve(library?.close()).catch(error => console.error('Could not close library:',error)).finally(() => {exiting=true;app.quit();});
  });
}
