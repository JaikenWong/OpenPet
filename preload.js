const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openpet', {
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  setAlwaysOnTop: (v) => ipcRenderer.invoke('set-always-on-top', v),
  isAlwaysOnTop: () => ipcRenderer.invoke('is-always-on-top'),
  showChatWindow: () => ipcRenderer.invoke('show-chat-window'),
  toggleChatWindow: () => ipcRenderer.invoke('toggle-chat-window'),
  closeChatWindow: () => ipcRenderer.invoke('close-chat-window'),
  closeSettingsWindow: () => ipcRenderer.invoke('close-settings-window'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', x, y),
  setPetWindowSize: (mode) => ipcRenderer.invoke('set-pet-window-size', mode),
  getPetWindowBounds: () => ipcRenderer.invoke('get-pet-window-bounds'),
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  openSettingsWindow: () => ipcRenderer.invoke('open-settings-window')
});
