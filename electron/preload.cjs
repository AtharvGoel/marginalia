const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('reader', {
  list: () => ipcRenderer.invoke('library:list'),
  importBooks: () => ipcRenderer.invoke('book:import'),
  read: id => ipcRenderer.invoke('book:read', id),
  update: (id, value) => ipcRenderer.invoke('book:update', id, value),
  remove: id => ipcRenderer.invoke('book:remove', id)
});
