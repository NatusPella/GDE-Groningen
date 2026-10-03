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
  // Foutrapport (errorlog.js): a save dialog, then the text to that file; true when saved
  saveTextFile: (name, text) => ipcRenderer.invoke('gte:save-text', String(name), String(text)),
  // only answered in a --trailer-frames run (main.js)
  captureFrame: (n) => ipcRenderer.invoke('gte:capture-frame', n),
  // only in a --trailer-video run: the sound sheet the export mixes
  videoBegin: (sheet) => ipcRenderer.invoke('gte:video-begin', sheet),
});
