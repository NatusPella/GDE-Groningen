// Bridge for the game page: only these desktop features, nothing else of
// Node/Electron is reachable from the renderer.
const { contextBridge, ipcRenderer } = require('electron');

const listeners = new Set();
ipcRenderer.on('gte:fullscreen', (e, on) => { for (const fn of listeners) fn(on); });

contextBridge.exposeInMainWorld('gteDesktop', {
  isDesktop: true,
  platform: process.platform,
  isFullscreen: () => ipcRenderer.sendSync('gte:is-fullscreen'),
  setFullscreen: (on) => ipcRenderer.send('gte:set-fullscreen', !!on),
  onFullscreenChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  quit: () => ipcRenderer.send('gte:quit'),
});
