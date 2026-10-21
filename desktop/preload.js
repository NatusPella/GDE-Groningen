// Bridge for the game page: only these desktop features, nothing else of
// Node/Electron is reachable from the renderer.
const { contextBridge, ipcRenderer, clipboard } = require('electron');

const listeners = new Set();
const coopListeners = new Set();
ipcRenderer.on('gde:coop-event', (e, kind, payload) => { for (const fn of coopListeners) fn(kind, payload); });
ipcRenderer.on('gde:fullscreen', (e, on) => { for (const fn of listeners) fn(on); });

contextBridge.exposeInMainWorld('gdeDesktop', {
  isDesktop: true,
  platform: process.platform,
  // Steam sets SteamDeck=1 for a game on the Deck (game/js/deck.js: the first-start defaults)
  isSteamDeck: process.env.SteamDeck === '1',
  isFullscreen: () => ipcRenderer.sendSync('gde:is-fullscreen'),
  setFullscreen: (on) => ipcRenderer.send('gde:set-fullscreen', !!on),
  onFullscreenChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  quit: () => ipcRenderer.send('gde:quit'),
  // Klembord voor de tekstvelden (js/textfield.js): zonder menu plakt Electron zelf niet altijd
  clipboard: { readText: () => clipboard.readText(), writeText: (t) => clipboard.writeText(String(t).slice(0, 2000)) },
  // Foutrapport (errorlog.js): a save dialog, then the text to that file; true when saved
  saveTextFile: (name, text) => ipcRenderer.invoke('gde:save-text', String(name), String(text)),
  // Coöp online (#95): alleen deze vier aanroepen; TCP en UPnP draaien in het main-proces
  coop: {
    host: (max) => ipcRenderer.invoke('gde:coop-host', max),
    join: (code) => ipcRenderer.invoke('gde:coop-join', String(code)),
    send: (id, bytes) => ipcRenderer.send('gde:coop-send', id, bytes),
    close: (id) => ipcRenderer.send('gde:coop-close', id),
    setMax: (n) => ipcRenderer.send('gde:coop-max', n),
    stop: () => ipcRenderer.invoke('gde:coop-stop'),
    diagnose: () => ipcRenderer.invoke('gde:coop-diagnose'),
    onEvent: (fn) => { coopListeners.add(fn); return () => coopListeners.delete(fn); },
  },
  // only answered in a --trailer-frames run (main.js)
  captureFrame: (n) => ipcRenderer.invoke('gde:capture-frame', n),
  // only in a --trailer-video run: the sound sheet the export mixes
  videoBegin: (sheet) => ipcRenderer.invoke('gde:video-begin', sheet),
});
