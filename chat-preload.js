const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chat', {
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  closeWindow: () => ipcRenderer.invoke('close-chat-window'),
  onMessageReceived: (callback) => {
    const subscription = (_event, message) => callback(message);
    ipcRenderer.on('message-received', subscription);
    return () => ipcRenderer.removeListener('message-received', subscription);
  }
});
