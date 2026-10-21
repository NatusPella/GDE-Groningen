// Brug tussen het spel (webversie) en de Android-schil. Alleen in de APK
// meegestaged (android/scripts/stage.mjs); het spel zelf kent hem niet.
// - terugknop = pauzemenu: een Escape-toets, zoals de pauzeknop in touch.js
// - pauzeert als de app naar de achtergrond gaat
// - Range-verzoeken (wereldtegels, geluidspacks) zelf afhandelen, zie hieronder
(() => {
  const cap = window.Capacitor;
  if (!cap || !cap.Plugins || !cap.Plugins.App) return;
  const App = cap.Plugins.App;

  // De lokale server van Capacitor beantwoordt een Range-verzoek met het hele
  // bestand onder 206 en een Content-Range die niet klopt: fetch faalt dan
  // ("Failed to fetch" bij de wereldtegels en geluidspacks). Daarom lezen we
  // zulke bestanden heel (uit de APK, snel) en knippen het stuk er zelf uit.
  // Een kleine LRU houdt de laatst gelezen bestanden vast.
  const nativeFetch = window.fetch.bind(window);
  const whole = new Map(); // url -> Promise<ArrayBuffer>
  let held = 0;
  const LIMIT = 48 * 1024 * 1024;
  const readWhole = (url, signal) => {
    if (whole.has(url)) { const p = whole.get(url); whole.delete(url); whole.set(url, p); return p; }
    const p = nativeFetch(url, { signal }).then(async (r) => {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      const buf = await r.arrayBuffer();
      held += buf.byteLength;
      for (const [u, q] of whole) {
        if (held <= LIMIT || u === url) break;
        whole.delete(u);
        q.then((b) => { held -= b.byteLength; }, () => {});
      }
      return buf;
    });
    p.catch(() => { if (whole.get(url) === p) whole.delete(url); });
    whole.set(url, p);
    return p;
  };
  window.fetch = (input, init) => {
    const req = typeof input === 'string' || input instanceof URL ? null : input;
    const range = new Headers((init && init.headers) || (req && req.headers) || undefined).get('Range');
    const m = /^bytes=(\d+)-(\d*)$/.exec(range || '');
    const url = req ? req.url : new URL(String(input), document.baseURI).href;
    if (!m || !url.startsWith(location.origin + '/')) return nativeFetch(input, init);
    return readWhole(url, (init && init.signal) || (req && req.signal) || undefined).then((buf) => {
      const start = +m[1];
      const end = Math.min(buf.byteLength - 1, m[2] ? +m[2] : buf.byteLength - 1);
      const type = /\.(webm)$/.test(url) ? 'audio/webm' : 'application/octet-stream';
      return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'content-type': type, 'content-range': `bytes ${start}-${end}/${buf.byteLength}` } });
    });
  };
  const key = (type) => {
    const ev = new KeyboardEvent(type, { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true });
    (document.activeElement && document.activeElement !== document.body ? document.activeElement : window).dispatchEvent(ev);
  };
  const escape = () => { key('keydown'); key('keyup'); };
  App.addListener('backButton', escape);
  let hidden = false;
  App.addListener('appStateChange', (s) => {
    // terug uit de achtergrond: niets doen, de speler zit al in het pauzemenu
    if (!s.isActive && !hidden) { hidden = true; escape(); } else if (s.isActive) hidden = false;
  });
  // saves live in localStorage of the WebView: ask for storage Android may not evict
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* niet erg */ }
  document.documentElement.classList.add('android-app');
})();
