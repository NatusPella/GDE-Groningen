// Streams .gdt tiles (docs/PROVINCIE-PLAN.md 2.4, 2.4b): one code path for the
// browser, Electron and Node; only the byte source differs.
//
//   ByteSource   read(file, off, len, signal) -> Uint8Array, readAll(file, signal) -> Uint8Array
//                (the signal is the store's cancellation; a source is bounded by the store anyway)
//     HttpRangeSource  fetch with a Range header: the web version (browser
//                      cache does the rest) and Electron, whose gde:// file
//                      server answers ranges (desktop/main.js serve)
//     MemorySource     bytes in memory, optional virtual latency (tests)
//     a remote tile source for download-on-demand is another ByteSource
//   TileStore    index, request queue with priorities and cancellation,
//                inflate + decode (in a worker pool when there is one),
//                LRU memory budget with pins, hysteresis, prefetch by
//                speed and heading
//   FrameQueue   work for the main thread, run with a time budget per frame
import { decodeBlob, tileIndexOf, tileKey, tileOrigin, tileIndexX, tileIndexY, tileOriginX, tileOriginY, TILE_M } from './gdt.js';
import { serialQueue } from './decodequeue.js';

// #582: a hanging tile fetch or a dead decoder worker must never freeze the
// world or leave the four load slots taken. Every bound is in milliseconds and
// every one of them can be shortened for a test. The HTTP source bounds a read
// itself; the store has a wider safety net for any other ByteSource and for the
// decoder, so the queue always moves on even when a source ignores its signal.
export const HTTP_TIMEOUT_MS = 10000;   // one fetch (headers and body) in HttpRangeSource
export const READ_GUARD_MS = 12000;     // TileStore safety net around source.read
export const WORKER_TIMEOUT_MS = 10000; // one decode job in the worker pool
export const DECODE_GUARD_MS = 15000;   // TileStore safety net around decode (after a worker fallback)

export const timeoutError = (wat, ms) => Object.assign(new Error(`${wat} timed out after ${ms} ms`), { timeout: true, name: 'TimeoutError' });
// Tijdens de boot geen time-outs: een koude portable start of een langzame schijf
// mag het laadscherm niet laten stukgaan. Daarna bewaken ze tegen echte hangs (#582).
const tijdensBoot = () => typeof document !== 'undefined' && document.body && !document.body.classList.contains('game-started');

// --------------------------------------------------------------- sources

export class HttpRangeSource {
  // timeoutMs: 0 disables the time-out (an in-process source that cannot hang)
  constructor(base = '', { timeoutMs = HTTP_TIMEOUT_MS } = {}) {
    this.base = base;
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 0;
    this.requests = 0;
    this.bytes = 0;
  }
  // Races `werk` against the time-out and passes it an AbortSignal that the
  // caller's cancellation also trips. The race covers the body too, so a body
  // that never finishes rejects instead of leaving the caller waiting.
  async _metTimeout(wat, signal, werk) {
    if (typeof AbortController === 'undefined' || tijdensBoot()) return werk(signal);
    const ctl = new AbortController();
    let klaar = false, verlopen = false;
    const afbreken = () => { if (!klaar) { try { ctl.abort(); } catch (e) { /* already gone */ } } };
    if (signal) { if (signal.aborted) afbreken(); else signal.addEventListener('abort', afbreken, { once: true }); }
    try {
      if (this.timeoutMs > 0) {
        let timer = null, timeout = null;
        const mis = new Promise((_, reject) => { timeout = reject; });
        timer = setTimeout(() => { verlopen = true; afbreken(); timeout(timeoutError(wat, this.timeoutMs)); }, this.timeoutMs);
        try { return await Promise.race([Promise.resolve().then(() => werk(ctl.signal)), mis]); }
        catch (err) { throw verlopen ? timeoutError(wat, this.timeoutMs) : err; }
        finally { clearTimeout(timer); }
      }
      return await werk(ctl.signal);
    } finally {
      klaar = true;
      if (signal) signal.removeEventListener('abort', afbreken);
    }
  }
  async read(file, off, len, signal) {
    this.requests++;
    return this._metTimeout(`tile read ${file} ${off}+${len}`, signal, async (sig) => {
      const res = await fetch(this.base + file, { headers: { Range: `bytes=${off}-${off + len - 1}` }, signal: sig });
      if (!res.ok) { const err = new Error(`tile read ${file} ${off}+${len}: ${res.status}`); err.status = res.status; throw err; }
      const buf = new Uint8Array(await res.arrayBuffer());
      this.bytes += buf.length;
      // a server that ignores Range answers 200 with the whole file
      return res.status === 206 || buf.length === len ? buf : buf.subarray(off, off + len);
    });
  }
  async readAll(file, signal) {
    this.requests++;
    return this._metTimeout(`read ${file}`, signal, async (sig) => {
      const res = await fetch(this.base + file, { signal: sig });
      if (!res.ok) { const err = new Error(`read ${file}: ${res.status}`); err.status = res.status; throw err; }
      const buf = new Uint8Array(await res.arrayBuffer());
      this.bytes += buf.length;
      return buf;
    });
  }
}

// files: { name: Uint8Array }. latency 0: answers at once; a number: virtual
// milliseconds, completed by advance(ms) (tests drive the clock)
export class MemorySource {
  constructor(files, { latency = 0 } = {}) {
    this.files = files; this.latency = latency; this.now = 0; this.pending = []; this.requests = 0; this.bytes = 0; this.aborted = 0;
  }
  _answer(get, signal) {
    this.requests++;
    if (!this.latency) { const b = get(); this.bytes += b.length; return Promise.resolve(b); }
    return new Promise((resolve, reject) => {
      const job = { due: this.now + this.latency, run: () => { const b = get(); this.bytes += b.length; resolve(b); } };
      this.pending.push(job);
      if (signal) signal.addEventListener('abort', () => { this.aborted++; this.pending = this.pending.filter((j) => j !== job); reject(new DOMException('aborted', 'AbortError')); });
    });
  }
  read(file, off, len, signal) { return this._answer(() => this.files[file].subarray(off, off + len), signal); }
  readAll(file) { return this._answer(() => this.files[file]); }
  async advance(ms) {
    this.now += ms;
    const due = this.pending.filter((j) => j.due <= this.now);
    this.pending = this.pending.filter((j) => j.due > this.now);
    for (const j of due) j.run();
    // let the continuations run
    for (let k = 0; k < 6; k++) await Promise.resolve();
  }
}

// --------------------------------------------------------------- inflate

export async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('deflate-raw');
    const out = new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(await out);
  }
  const zlib = await import(/* @vite-ignore */ 'node:zlib');
  return new Uint8Array(zlib.inflateRawSync(bytes));
}

// aside: a list of section types whose row ids come back as `gids` next to the rows (gdt.js decodeSection); the store passes its
// meta as the second argument to a plain decoder, which is not a list and is ignored
export async function decodeCompressed(bytes, aside = null) {
  return decodeBlob(await inflateRaw(bytes), Array.isArray(aside) ? aside : null);
}

// --------------------------------------------------------------- frame queue

// Work that touches the scene or the grids, a few ms per frame (plan 2.4b:
// 1.5 / 2 / 3 ms). Items run in priority order (lower first); at least one
// item per call so nothing starves.
export class FrameQueue {
  constructor() { this.items = []; this.seq = 0; this.stats = { ran: 0, maxMs: 0, over: 0, byKind: {} }; }
  add(fn, priority = 0, label = '') { this.items.push({ fn, priority, seq: this.seq++, label }); }
  get size() { return this.items.length; }
  drop(label) { this.items = this.items.filter((i) => i.label !== label); }
  run(budgetMs, now = () => performance.now()) {
    if (!this.items.length) return 0;
    this.items.sort((a, b) => a.priority - b.priority || a.seq - b.seq);
    const t0 = now();
    let n = 0;
    while (this.items.length) {
      const it = this.items.shift();
      const t = now();
      it.fn();
      n++;
      const spent = now() - t;
      this.stats.maxMs = Math.max(this.stats.maxMs, spent);
      // per kind of item ('add', 'drop': the label up to the colon) the count, the total and the longest, and how many took over 5, 20 and 50 ms (#247)
      const k = it.label.split(':')[0] || '-', ks = this.stats.byKind[k] || (this.stats.byKind[k] = { n: 0, ms: 0, max: 0, over5: 0, over20: 0, over50: 0 });
      ks.n++; ks.ms += spent; ks.max = Math.max(ks.max, spent);
      if (spent > 5) ks.over5++;
      if (spent > 20) ks.over20++;
      if (spent > 50) ks.over50++;
      if (now() - t0 >= budgetMs) break;
    }
    this.stats.ran += n;
    const total = now() - t0;
    if (total > budgetMs * 1.5) this.stats.over++;
    return n;
  }
}

// --------------------------------------------------------------- store

// budgetBytes counts the raw (inflated) bytes of the resident tiles, but a decoded tile is ~26 times as large on the JS heap (rows, points and
// bounds as objects: 640 kB for the average streamed tile, scripts/perf/tilemem.mjs, #379). 150e6 raw never filled up (all 2930 province tiles
// are 92 MB raw), so nothing was ever evicted and a long trip piled up 0.6 MB per tile on the heap, up to 2.4 GB for the whole province. 40e6 raw
// is the pinned city (14e6) plus ~830 tiles (~530 MB of heap) at the hard cap, and from 20e6 the tiles that lie beyond the wanted ring
// (hysteresis in prefetch) go first.
const DEFAULTS = { budgetBytes: 40e6, concurrency: 4, holdMs: 10000, unloadMargin: 300, readMs: READ_GUARD_MS, decodeMs: DECODE_GUARD_MS };

export class TileStore {
  // index: parsed index.json; decode(bytes) -> Promise<tile> (default: inflate + decode on this thread)
  constructor({ source, index, decode = decodeCompressed, now = () => performance.now(), ...opts }) {
    Object.assign(this, DEFAULTS, opts);
    this.source = source;
    this.index = index;
    this.decode = decode;
    this.now = now;
    this.entries = new Map(); // key -> entry
    this.queue = [];
    this.active = 0;
    this.gen = 0;
    this.residentBytes = 0;
    this.listeners = { tile: [], drop: [] };
    this.stats = { loads: 0, hits: 0, cancels: 0, evictions: 0, late: 0, maxQueue: 0, bytes: 0, errors: 0 };
    // a pack the source does not have (404) is not coming back this session:
    // its tiles are skipped and the warning is said once per pack (brokenPacks)
    this.brokenPacks = new Set();
    this.warned = new Set();
  }

  on(ev, fn) { this.listeners[ev].push(fn); }
  has(key) { return !!this.index.tiles[key]; }
  ready(key) { const e = this.entries.get(key); return !!e && e.state === 'ready'; }
  tile(key) { const e = this.entries.get(key); if (e && e.state === 'ready') { e.last = this.now(); return e.tile; } return null; }
  get residentKeys() { return [...this.entries].filter(([, e]) => e.state === 'ready').map(([k]) => k); }
  get loading() { return this.active + this.queue.length; }

  // (counted: the city's permanent pins, the map view and the placement windows overlap on the same tiles)
  pin(key) { const e = this._entry(key); if (e) { e.pins = (e.pins || 0) + 1; e.pinned = true; } }
  unpin(key) { const e = this.entries.get(key); if (e && e.pins > 0) { e.pins--; e.pinned = e.pins > 0; } }

  _entry(key) {
    let e = this.entries.get(key);
    if (!e) {
      const meta = this.index.tiles[key];
      if (!meta || this.brokenPacks.has(meta.pack)) return null;
      e = { key, meta, state: 'idle', tile: null, pinned: false, wanted: false, last: this.now(), outside: 0, waiters: [], priority: 0, ctl: null };
      this.entries.set(key, e);
    }
    return e;
  }

  // The tile when it is in (or its promise); null for a key that has no tile (sea, empty).
  // `token` identifies who wants it: cancel(token) drops interest.
  request(key, { priority = 0, token = null } = {}) {
    const e = this._entry(key);
    if (!e) return Promise.resolve(null);
    e.last = this.now();
    if (e.state === 'ready') { this.stats.hits++; return Promise.resolve(e.tile); }
    return new Promise((resolve, reject) => {
      e.waiters.push({ resolve, reject, token });
      e.priority = Math.min(e.priority, priority);
      if (e.state === 'idle') { e.state = 'queued'; e.priority = priority; this.queue.push(e); this.stats.maxQueue = Math.max(this.stats.maxQueue, this.queue.length); }
      this._pump();
    });
  }

  // Wie zijn interesse intrekt (een venster dat sluit, een scène die stopt) laat zijn
  // wachtenden hier afbreken; een laad die daarna niemand meer wil, stopt zelf (#588).
  cancel(token) {
    for (const e of this.entries.values()) {
      if (!e.waiters.length) continue;
      const mine = e.waiters.filter((w) => w.token === token);
      if (!mine.length) continue;
      e.waiters = e.waiters.filter((w) => w.token !== token);
      for (const w of mine) w.resolve(null); // afgebroken interesse is geen fout voor de wachter (storytest/hud) — null = geen tegel
      this._maybeAbort(e);
    }
  }

  _maybeAbort(e) {
    if (e.waiters.length || e.pinned || e.wanted) return;
    if (e.state === 'queued') { this.queue = this.queue.filter((q) => q !== e); e.state = 'idle'; this.stats.cancels++; this.entries.delete(e.key); }
    else if (e.state === 'loading') { e.state = 'cancelled'; if (e.ctl) e.ctl.abort(); this.stats.cancels++; }
  }

  _pump() {
    while (this.active < this.concurrency && this.queue.length) {
      this.queue.sort((a, b) => a.priority - b.priority);
      const e = this.queue.shift();
      e.state = 'loading';
      this.active++;
      this._load(e).catch((err) => this._failed(e, err)).finally(() => { this.active--; this._pump(); });
    }
  }

  // A load that failed: the waiters already got their rejection in _load, but a
  // prefetched tile has none, and without this catch every missing tile became
  // an unhandled rejection (hundreds in the report, #496). A 404 means the
  // build is incomplete, not that the network hiccupped: say it once and stop
  // asking, or prefetch puts the same tile in the queue every frame.
  _failed(e, err) {
    this.stats.errors++;
    if (!err || err.cancelled) return;
    const pack = e.meta && e.meta.pack;
    const file = (pack && this.index.packs[pack] && this.index.packs[pack].file) || pack || '?';
    const missing = err.status === 404;
    if (missing) this.brokenPacks.add(pack);
    const seen = (missing ? '404 ' : 'fout ') + file;
    if (this.warned.has(seen)) return;
    this.warned.add(seen);
    if (missing) console.warn(`tegelpakket ontbreekt in deze build: ${file} (de wereldindex hoort niet bij de bestanden; bouw opnieuw)`);
    else console.warn(`tegel laden mislukt: ${file}: ${err.message}`);
  }

  // #582: await a read or a decode with a hard bound. `bijTimeout` aborts the
  // read so a timed-out entry does not keep a fetch open. A promise that settles
  // after the time-out is ignored (it already has a handler here), and the slot
  // is freed by _pump's finally like any other failure.
  _begrensd(maak, ms, wat, bijTimeout = null) {
    const p = Promise.resolve().then(maak);
    if (!(ms > 0) || tijdensBoot()) return p;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (bijTimeout) { try { bijTimeout(); } catch (e) { /* already gone */ } }
        reject(timeoutError(wat, ms));
      }, ms);
      if (timer && typeof timer.unref === 'function') timer.unref(); // Node: a stopped world does not keep the process open
      p.then((v) => { clearTimeout(timer); resolve(v); }, (err) => { clearTimeout(timer); reject(err); });
    });
  }

  async _load(e) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    e.ctl = ctl;
    const { pack, off, len } = e.meta;
    const file = this.index.packs[pack].file;
    try {
      const bytes = await this._begrensd(
        () => this.source.read(file, off, len, ctl && ctl.signal),
        this.readMs, `tile read ${file} ${off}+${len}`,
        () => { try { if (ctl) ctl.abort(); } catch (err) { /* already gone */ } });
      if (e.state === 'cancelled') throw Object.assign(new Error('cancelled'), { cancelled: true });
      const tile = await this._begrensd(() => this.decode(bytes, e.meta), this.decodeMs, `tile decode ${file} ${off}+${len}`);
      if (e.state === 'cancelled') throw Object.assign(new Error('cancelled'), { cancelled: true });
      e.tile = tile;
      e.state = 'ready';
      e.last = this.now();
      this.residentBytes += e.meta.raw;
      this.stats.loads++;
      this.stats.bytes += len;
      for (const f of this.listeners.tile) f(tile, e.key);
      const ws = e.waiters;
      e.waiters = [];
      for (const w of ws) w.resolve(tile);
      this._evict();
    } catch (err) {
      const ws = e.waiters;
      e.waiters = [];
      this.entries.delete(e.key);
      const afgebroken = !!err.cancelled || (err && err.name === 'AbortError');
      for (const w of ws) { if (afgebroken) w.resolve(null); else w.reject(err); }
      if (!afgebroken) throw err;
    }
  }

  // Over budget: drop the least recently used tiles that nobody pins or wants.
  _evict() {
    if (this.residentBytes <= this.budgetBytes) return;
    const cands = [...this.entries.values()].filter((e) => e.state === 'ready' && !e.pinned && !e.wanted).sort((a, b) => a.last - b.last);
    for (const e of cands) {
      if (this.residentBytes <= this.budgetBytes) break;
      this._drop(e);
    }
  }

  _drop(e) {
    this.entries.delete(e.key);
    this.residentBytes -= e.meta.raw;
    this.stats.evictions++;
    for (const f of this.listeners.drop) f(e.key);
  }

  // The wanted set for a position: tiles within `radius` metres ahead plus
  // `ahead` seconds of travel, ordered by (distance - speed * 8 s * cos to the
  // heading). Unwanted queued loads are cancelled; resident tiles outside
  // radius + unloadMargin for holdMs become evictable at once.
  prefetch(x, y, { vx = 0, vy = 0, radius = 1500, ahead = 10, extra = [], foci = [] } = {}) {
    this.gen++;
    const speed = Math.hypot(vx, vy);
    const r = radius + speed * ahead;
    // #651: scalaire indexen en origin, zodat de hot loop geen arrays alloceert
    const i0 = tileIndexX(x - r), j0 = tileIndexY(y - r), i1 = tileIndexX(x + r), j1 = tileIndexY(y + r);
    const want = new Map();
    const half = TILE_M * Math.SQRT1_2;
    const consider = (i, j, bonus = 0) => {
      const key = tileKey(i, j);
      if (!this.index.tiles[key]) return;
      const cx = tileOriginX(i) + TILE_M / 2, cy = tileOriginY(j) + TILE_M / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d - half > r && !bonus) return;
      let score = d;
      if (speed > 0.5 && d > 1) score -= speed * 8 * ((cx - x) * vx + (cy - y) * vy) / (d * speed);
      score -= bonus;
      if (!want.has(key) || score < want.get(key)) want.set(key, score);
    };
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) consider(i, j);
    for (const [i, j, bonus] of extra) consider(i, j, bonus ?? 500);
    // samen spelen, spelers uit elkaar (#429, coopfoci.js): ook rond elke losse groep, met een eigen (kleinere) straal; de ene wensenlijst is de unie
    for (const f of foci) {
      const fr = f.radius || 800, fi0 = tileIndexX(f.x - fr), fj0 = tileIndexY(f.y - fr), fi1 = tileIndexX(f.x + fr), fj1 = tileIndexY(f.y + fr);
      for (let i = fi0; i <= fi1; i++) for (let j = fj0; j <= fj1; j++) {
        const key = tileKey(i, j);
        if (!this.index.tiles[key]) continue;
        const d = Math.hypot(tileOriginX(i) + TILE_M / 2 - f.x, tileOriginY(j) + TILE_M / 2 - f.y);
        if (d - half > fr) continue;
        if (!want.has(key) || d < want.get(key)) want.set(key, d);
      }
    }
    const now = this.now();
    // #651: één scan over de entries i.p.v. drie (wanted bijwerken, aflopende
    // aanvragen afbreken en de hysteresis-evictie in dezelfde ronde).
    const far = r + this.unloadMargin + half;
    const evict = this.residentBytes > this.budgetBytes * 0.5;
    for (const e of this.entries.values()) {
      const was = e.wanted;
      e.wanted = want.has(e.key);
      if (e.wanted) { e.outside = 0; e.last = now; continue; }
      if (was) e.outside = now;
      if (e.state === 'queued' || e.state === 'loading') { if (!e.waiters.length) this._maybeAbort(e); } // een prefetch zonder wachtenden stopt zelf
      if (evict && e.state === 'ready' && !e.pinned && now - e.outside >= this.holdMs) {
        const d = Math.hypot(tileOriginX(e.meta.i) + TILE_M / 2 - x, tileOriginY(e.meta.j) + TILE_M / 2 - y);
        if (d > far) this._drop(e);
      }
    }
    for (const [key, score] of want) {
      const e = this._entry(key);
      if (!e) continue;
      e.wanted = true;
      if (e.state === 'idle') { e.state = 'queued'; e.priority = score; this.queue.push(e); }
      else if (e.state === 'queued') e.priority = Math.min(e.priority, score);
    }
    this.stats.maxQueue = Math.max(this.stats.maxQueue, this.queue.length);
    this._pump();
    this._evict();
    return want;
  }

  // the keys of the tiles within `radius` of (x, y) that exist
  keysAround(x, y, radius) {
    const [i0, j0] = tileIndexOf(x - radius, y - radius), [i1, j1] = tileIndexOf(x + radius, y + radius);
    const out = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = tileKey(i, j); if (this.index.tiles[k]) out.push(k); }
    return out;
  }

  // every wanted tile that is not in yet, nearest first (what a cut or a
  // teleport has to wait for)
  missing(keys) { return keys.filter((k) => this.index.tiles[k] && !this.ready(k)); }
}

// --------------------------------------------------------------- worker pool

// decode(bytes) running in module workers (tileworker.js); the compressed
// bytes go over as a transferable, the decoded tile comes back as a clone.
// #582: a worker that dies or stays silent is terminated and removed from the
// pool, the work that hung on it is decoded on the main thread instead, and the
// pool tries to take a new worker. With no live worker left the decoder falls
// back to the main thread altogether, so a broken worker never blocks a slot.
// opts: { timeoutMs, fallback } (a test shortens the time-out and spies on the
// fallback; the default decoder is decodeCompressed on this thread).
export function makeWorkerDecoder(url, size = 2, aside = null, opts = {}) {
  if (typeof Worker === 'undefined') return null;
  const aantal = Math.max(1, Math.min(8, Number(size) || 1));
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : WORKER_TIMEOUT_MS;
  const fallback = typeof opts.fallback === 'function' ? opts.fallback : (bytes) => decodeCompressed(bytes, aside);
  const pool = []; // { w, dood }; a dead worker is gone from this list
  const open = new Map(); // id -> { resolve, reject, timer, rec, bron }
  let next = 1, rr = 0, gestopt = false;

  // #651: één tegel tegelijk op de hoofdthread, met een yield ertussen
  const hoofdthread = serialQueue((bytes) => fallback(bytes, aside));
  const maak = () => {
    const rec = { w: null, dood: false };
    rec.w = new Worker(url, { type: 'module' });
    rec.w.onmessage = (e) => {
      const { id, tile, error } = (e && e.data) || {};
      const j = open.get(id);
      if (!j || j.rec !== rec) return;
      clearTimeout(j.timer);
      open.delete(id);
      if (error) j.reject(new Error(error)); else j.resolve(tile);
    };
    rec.w.onmessageerror = () => sterf(rec, 'tile worker message error');
    rec.w.onerror = (e) => sterf(rec, (e && e.message) || 'tile worker error');
    return rec;
  };
  // De taken die aan deze worker hingen gaan naar de hoofdthread (de bytes zijn
  // hier nog niet overgedragen: `bron` is de originele buffer), de dode worker
  // gaat weg en er komt zo mogelijk een nieuwe voor in de plaats. `bron` in de
  // open-tabel is precies daarvoor: na postMessage is de kopie overgedragen.
  function sterf(rec, reden) {
    if (rec.dood || gestopt) return;
    rec.dood = true;
    for (const [id, j] of [...open]) {
      if (j.rec !== rec) continue;
      clearTimeout(j.timer);
      open.delete(id);
      hoofdthread(j.bron).then(j.resolve, j.reject);
    }
    try { if (rec.w && typeof rec.w.terminate === 'function') rec.w.terminate(); } catch (e) { /* already gone */ }
    const k = pool.indexOf(rec);
    if (k >= 0) pool.splice(k, 1);
    try { pool.push(maak()); } catch (e) { /* no new worker: the pool stays smaller (or empty) */ }
    if (!pool.length) console.warn(`tegel-decoder: ${reden}; decoderen gebeurt nu op de hoofdthread`);
  }
  try { for (let k = 0; k < aantal; k++) pool.push(maak()); }
  catch (e) { for (const rec of pool) { rec.dood = true; try { rec.w.terminate && rec.w.terminate(); } catch (er) { /* already gone */ } } return null; }

  const decode = (bytes) => new Promise((resolve, reject) => {
    if (gestopt) { reject(Object.assign(new Error('tile worker stopped'), { cancelled: true })); return; }
    const levend = pool.filter((rec) => !rec.dood);
    if (!levend.length) { hoofdthread(bytes).then(resolve, reject); return; }
    const rec = levend[rr++ % levend.length];
    const id = next++;
    const copy = bytes.slice();
    const timer = setTimeout(() => {
      const j = open.get(id);
      if (!j) return;
      open.delete(id);
      sterf(rec, 'tile worker timeout'); // the worker's other jobs also go to the main thread
      hoofdthread(bytes).then(resolve, reject);
    }, timeoutMs);
    open.set(id, { resolve, reject, timer, rec, bron: bytes });
    try { rec.w.postMessage({ id, bytes: copy, aside }, [copy.buffer]); }
    catch (e) {
      clearTimeout(timer);
      open.delete(id);
      sterf(rec, 'tile worker postMessage');
      hoofdthread(bytes).then(resolve, reject);
    }
  });
  decode.terminate = () => {
    if (gestopt) return;
    gestopt = true;
    for (const [id, j] of [...open]) { clearTimeout(j.timer); open.delete(id); j.reject(Object.assign(new Error('tile worker stopped'), { cancelled: true })); }
    for (const rec of pool.splice(0)) { rec.dood = true; try { if (rec.w && rec.w.terminate) rec.w.terminate(); } catch (e) { /* already gone */ } }
  };
  return decode;
}





