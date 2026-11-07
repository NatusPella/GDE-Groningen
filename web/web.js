// Browser-only loader (web build, see web/build.mjs). Runs before the game:
// - registers the service worker (sw.js) and waits until it controls the page,
//   so the very first visit already lands in the cache;
// - resolves audio URLs the game asks for (audio/**.mp3|wav) to Opus or the
//   original, out of the packs in audio/index.json, only when a clip plays;
// - shows real download sizes for the map data on the loading screen;
// - then imports js/main.js.
(() => {
  const CACHE = '__GDE_CACHE__';
  const SIZES = __GDE_SIZES__;
  const BASE = new URL('./', document.baseURI).href;
  const probe = document.createElement('audio');
  const OPUS = !/[?&]mp3\b/.test(location.search) && probe.canPlayType('audio/webm; codecs="opus"') === 'probably';
  const nativeFetch = window.fetch.bind(window);
  window.__gteWeb = { cache: CACHE, opus: OPUS, clips: 0, bytes: 0 };

  let cacheP = null;
  const openCache = () => (cacheP = cacheP || (window.caches ? caches.open(CACHE).catch(() => null) : Promise.resolve(null)));

  // --- audio ---------------------------------------------------------------
  let indexP = null;
  const audioIndex = () => (indexP = indexP || nativeFetch(BASE + 'audio/index.json').then((r) => r.json()).catch((e) => { indexP = null; throw e; }));

  const keyOf = (u) => {
    let href;
    try { href = new URL(String(u), document.baseURI).href; } catch (e) { return null; }
    if (!href.startsWith(BASE)) return null;
    let k = href.slice(BASE.length).split(/[?#]/)[0];
    try { k = decodeURIComponent(k); } catch (e) { /* keep */ }
    return /^audio\/.+\.(mp3|wav)$/i.test(k) ? k : null;
  };

  // packs fetched whole where the server ignored Range
  const wholePacks = new Map();
  async function packSlice(pack, off, len, type) {
    const url = BASE + pack;
    const ck = url + '?at=' + off;
    const cache = await openCache();
    const hit = cache && await cache.match(ck);
    if (hit) return hit.blob();
    let buf;
    if (!wholePacks.has(url)) {
      const r = await nativeFetch(url, { headers: { Range: `bytes=${off}-${off + len - 1}` } });
      if (r.status === 206) buf = await r.arrayBuffer();
      else if (r.ok) wholePacks.set(url, r.arrayBuffer());
      else throw new Error(r.status + ' ' + pack);
    }
    if (!buf) buf = (await wholePacks.get(url)).slice(off, off + len);
    window.__gteWeb.bytes += len;
    const blob = new Blob([buf], { type });
    if (cache) cache.put(ck, new Response(blob, { headers: { 'content-type': type } })).catch(() => {});
    return blob;
  }

  const blobs = new Map();
  function clipBlob(key) {
    if (!blobs.has(key)) {
      blobs.set(key, (async () => {
        const idx = await audioIndex();
        const music = idx.music[key];
        if (music) {
          const r = await nativeFetch(BASE + (OPUS ? music : key));
          if (!r.ok) throw new Error(r.status + ' ' + key);
          return r.blob();
        }
        const e = idx.files[key];
        if (!e) throw new Error('not in audio index: ' + key);
        window.__gteWeb.clips++;
        if (OPUS) return packSlice(idx.packs[e[0]], e[1], e[2], 'audio/webm');
        return packSlice(idx.packs[e[3]], e[4], e[5], /\.wav$/i.test(key) ? 'audio/wav' : 'audio/mpeg');
      })());
      blobs.get(key).catch(() => blobs.delete(key));
    }
    return blobs.get(key);
  }
  const urls = new Map();
  function clipUrl(key) {
    if (!urls.has(key)) {
      urls.set(key, clipBlob(key).then((b) => URL.createObjectURL(b)));
      urls.get(key).catch(() => urls.delete(key));
    }
    return urls.get(key);
  }

  // <audio>: an audio/ URL is only remembered; the clip is fetched when the
  // game calls play(), so the 14 G-Music elements made up front stay empty
  const M = HTMLMediaElement.prototype;
  const srcDesc = Object.getOwnPropertyDescriptor(M, 'src');
  const nativePlay = M.play, nativePause = M.pause, removeAttr = Element.prototype.removeAttribute;
  Object.defineProperty(M, 'src', {
    configurable: true,
    enumerable: true,
    get() { return this.gteWant || srcDesc.get.call(this); },
    set(v) {
      const key = keyOf(v);
      if (!key) { this.gteKey = this.gteWant = this.gteSet = null; srcDesc.set.call(this, v); return; }
      this.gteKey = key;
      this.gteWant = new URL(String(v), document.baseURI).href;
      this.gteSet = null;
      if (this.hasAttribute('src')) removeAttr.call(this, 'src');
    },
  });
  M.removeAttribute = function (name) {
    if (String(name).toLowerCase() === 'src') this.gteKey = this.gteWant = this.gteSet = null;
    return removeAttr.call(this, name);
  };
  M.pause = function () { this.gteHold = true; return nativePause.call(this); };
  M.play = function () {
    const key = this.gteKey;
    this.gteHold = false;
    if (!key || this.gteSet === key) return nativePlay.call(this);
    const want = this.gteWant;
    return clipUrl(key).catch(() => want).then((url) => {
      if (this.gteKey !== key) throw new DOMException('source changed', 'AbortError');
      if (this.gteSet !== key) { this.gteSet = key; srcDesc.set.call(this, url); }
      if (this.gteHold) throw new DOMException('paused before it loaded', 'AbortError');
      return nativePlay.call(this);
    });
  };
  const NativeAudio = window.Audio;
  function Audio(src) {
    const el = new NativeAudio();
    if (src !== undefined) el.src = src;
    return el;
  }
  Audio.prototype = NativeAudio.prototype;
  window.Audio = Audio;

  // --- fetch: audio clips, and download progress for the essentials --------
  const status = () => document.querySelector('#loading .ld-status');
  const total = Object.values(SIZES).reduce((a, b) => a + b, 0);
  let got = 0, open = 0;
  const fmt = (n) => (n / 1e6).toFixed(1).replace('.', ',');
  function paint() {
    const s = status();
    if (!s || s.classList.contains('error')) return;
    s.textContent = open ? `Grunn downloaden… ${fmt(got)} / ${fmt(total)} MB` : 'Grunn laden…';
  }
  function counted(res, size) {
    if (!res.ok || !res.body) return res;
    open++;
    const reader = res.body.getReader();
    const body = new ReadableStream({
      async pull(ctl) {
        const { done, value } = await reader.read();
        if (done) { open--; paint(); ctl.close(); return; }
        got += value.length;
        paint();
        ctl.enqueue(value);
      },
      cancel(r) { open--; return reader.cancel(r); },
    });
    // the decoded size: a gzip-served file reports its compressed length
    const headers = new Headers(res.headers);
    headers.set('content-length', String(size));
    headers.delete('content-encoding');
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  }
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input && input.url;
    const key = url && keyOf(url);
    if (key) return clipBlob(key).then((b) => new Response(b, { headers: { 'content-type': b.type } }), () => nativeFetch(input, init));
    let size = 0;
    try {
      const href = new URL(url, document.baseURI).href;
      if (href.startsWith(BASE)) size = SIZES[href.slice(BASE.length).split(/[?#]/)[0]] || 0;
    } catch (e) { /* not a URL */ }
    return size ? nativeFetch(input, init).then((r) => counted(r, size)) : nativeFetch(input, init);
  };

  // --- service worker, then the game ---------------------------------------
  const timeout = (ms) => new Promise((r) => setTimeout(r, ms));
  async function worker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || /[?&]nosw\b/.test(location.search)) return;
    const sw = navigator.serviceWorker;
    const controlled = new Promise((r) => sw.addEventListener('controllerchange', r, { once: true }));
    const reg = await sw.register('sw.js');
    // a new build installs and takes over before the game loads a single file
    if (sw.controller) await Promise.race([reg.update().catch(() => {}), timeout(2500)]);
    if (!sw.controller || reg.installing || reg.waiting) await Promise.race([controlled, timeout(8000)]);
  }
  function start() {
    const s = status();
    if (s) s.textContent = 'Grunn laden…';
    import('./js/main.js').catch((e) => {
      const st = status();
      if (st) { st.textContent = 'Fout bij laden: ' + e.message; st.classList.add('error'); }
    });
  }
  const s = status();
  if (s) s.textContent = 'Opstarten…';
  // #657: de eerste module hoeft niet op de service worker te wachten; die
  // installeert op de achtergrond en pakt de volgende start.
  start();
  worker().catch((e) => console.warn('service worker', e));
})();
