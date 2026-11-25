const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('reader', {
  toggleFullscreen:()=>ipcRenderer.invoke('window:fullscreen:toggle'),
  getFullscreen:()=>ipcRenderer.invoke('window:fullscreen:get'),
  setFullscreen:value=>ipcRenderer.invoke('window:fullscreen:set',value),
  onFullscreen:callback=>{
    const listener=(_event,value)=>callback(value);
    ipcRenderer.on('window:fullscreen',listener);
    return()=>ipcRenderer.removeListener('window:fullscreen',listener);
  },
  listAnnotations: id => ipcRenderer.invoke('annotations:list',id),
  saveAnnotation: (id,value) => ipcRenderer.invoke('annotations:save',id,value),
  removeAnnotation: (bookId,id) => ipcRenderer.invoke('annotations:remove',bookId,id),
  searchWeb: text => ipcRenderer.invoke('selection:search-web',text),
  list: () => ipcRenderer.invoke('library:list'),
  importBooks: () => ipcRenderer.invoke('book:import'),
  inspectBook: id => ipcRenderer.invoke('book:inspect',id),
  read: id => ipcRenderer.invoke('book:read', id),
  update: (id,value) => ipcRenderer.invoke('book:update',id,value),
  remove: id => ipcRenderer.invoke('book:remove',id),
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  migratePreferences: value => ipcRenderer.invoke('preferences:migrate',value),
  setPreferences: value => ipcRenderer.invoke('preferences:set',value),
});
