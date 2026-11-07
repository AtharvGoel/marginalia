const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('reader', {
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
