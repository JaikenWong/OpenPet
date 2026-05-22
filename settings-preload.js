const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getSkinManifest: () => ipcRenderer.invoke('get-skin-manifest'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  close: () => ipcRenderer.invoke('close-settings-window')
});
