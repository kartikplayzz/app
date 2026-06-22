const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  openExternal: (url) => ipcRenderer.send('open-external', url),
  onAuthDeepLink: (callback) => {
    const subscription = (event, token) => callback(token);
    ipcRenderer.on('auth-deep-link', subscription);
    return () => {
      ipcRenderer.removeListener('auth-deep-link', subscription);
    };
  }
});
