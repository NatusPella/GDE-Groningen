// Streams .gdt tiles (docs/PROVINCIE-PLAN.md 2.4, 2.4b): one code path for the
// browser, Electron and Node; only the byte source differs.
//
//   ByteSource   read(file, off, len, signal) -> Uint8Array, readAll(file) -> Uint8Array
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
import { decodeBlob, tileIndexOf, tileKey, tileOrigin, TILE_M } from './gdt.js';

// --------------------------------------------------------------- sources

export class HttpRangeSource {
  constructor(base = '') { this.base = base; this.requests = 0; this.bytes = 0; }
  async read(file, off, len, signal) {
    this.requests++;
    const res = await fetch(this.base + file, { headers: { Range: `bytes=${off}-${off + len - 1}` }, signal });
    if (!res.ok) throw new Error(`tile read ${file} ${off}+${len}: ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    this.bytes += buf.length;
    // a server that ignores Range answers 200 with the whole file
    return res.status === 206 || buf.length === len ? buf : buf.subarray(off, off + len);
  }
  async readAll(file) {
    this.requests++;
    const res = await fetch(this.base + file);
    if (!res.ok) throw new Error(`read ${file}: ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    this.bytes += buf.length;
    return buf;
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

export async function decodeCompressed(bytes) {
  return decodeBlob(await inflateRaw(bytes));
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

const DEFAULTS = { budgetBytes: 150e6, concurrency: 4, holdMs: 10000, unloadMargin: 300 };

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
    this.stats = { loads: 0, hits: 0, cancels: 0, evictions: 0, late: 0, maxQueue: 0, bytes: 0 };
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
      if (!meta) return null;
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

  cancel(token) {
    for (const e of this.entries.values()) {
      if (!e.waiters.length) continue;
      const mine = e.waiters.filter((w) => w.token === token);
      if (!mine.length) continue;
      e.waiters = e.waiters.filter((w) => w.token !== token);
      for (const w of mine) w.reject(Object.assign(new Error('cancelled'), { cancelled: true }));
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
      this._load(e).finally(() => { this.active--; this._pump(); });
    }
  }

  async _load(e) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    e.ctl = ctl;
    const { pack, off, len } = e.meta;
    try {
      const bytes = await this.source.read(this.index.packs[pack].file, off, len, ctl && ctl.signal);
      if (e.state === 'cancelled') throw Object.assign(new Error('cancelled'), { cancelled: true });
      const tile = await this.decode(bytes, e.meta);
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
      for (const w of ws) w.reject(err);
      if (!err.cancelled && !(err && err.name === 'AbortError')) throw err;
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
  prefetch(x, y, { vx = 0, vy = 0, radius = 1500, ahead = 10, tokenPrefix = 'pf', extra = [] } = {}) {
    this.gen++;
    const speed = Math.hypot(vx, vy);
    const r = radius + speed * ahead;
    const [i0, j0] = tileIndexOf(x - r, y - r), [i1, j1] = tileIndexOf(x + r, y + r);
    const want = new Map();
    const half = TILE_M * Math.SQRT1_2;
    const consider = (i, j, bonus = 0) => {
      const key = tileKey(i, j);
      if (!this.index.tiles[key]) return;
      const [ox, oy] = tileOrigin(i, j);
      const cx = ox + TILE_M / 2, cy = oy + TILE_M / 2;
      const d = Math.hypot(cx - x, cy - y);
      if (d - half > r && !bonus) return;
      let score = d;
      if (speed > 0.5 && d > 1) score -= speed * 8 * ((cx - x) * vx + (cy - y) * vy) / (d * speed);
      score -= bonus;
      if (!want.has(key) || score < want.get(key)) want.set(key, score);
    };
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) consider(i, j);
    for (const [i, j, bonus] of extra) consider(i, j, bonus ?? 500);
    const now = this.now();
    for (const e of this.entries.values()) {
      const was = e.wanted;
      e.wanted = want.has(e.key);
      if (e.wanted) { e.outside = 0; e.last = now; }
      else {
        if (was) e.outside = now;
        if (e.state === 'queued' || e.state === 'loading') { if (e.token === tokenPrefix || !e.waiters.length) this._maybeAbort(e); }
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
    // hysteresis: only tiles that have been unwanted for holdMs and lie beyond the margin go first
    const far = r + this.unloadMargin + half;
    for (const e of this.entries.values()) {
      if (e.state !== 'ready' || e.pinned || e.wanted) continue;
      const [ox, oy] = tileOrigin(e.meta.i, e.meta.j);
      const d = Math.hypot(ox + TILE_M / 2 - x, oy + TILE_M / 2 - y);
      if (d > far && now - e.outside >= this.holdMs && this.residentBytes > this.budgetBytes * 0.5) this._drop(e);
    }
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
export function makeWorkerDecoder(url, size = 2) {
  if (typeof Worker === 'undefined') return null;
  const workers = [];
  const open = new Map();
  let next = 1, rr = 0;
  try {
    for (let k = 0; k < size; k++) {
      const w = new Worker(url, { type: 'module' });
      w.onmessage = (e) => {
        const { id, tile, error } = e.data;
        const j = open.get(id);
        if (!j) return;
        open.delete(id);
        if (error) j.reject(new Error(error)); else j.resolve(tile);
      };
      w.onerror = (e) => { for (const j of open.values()) j.reject(new Error(e.message || 'tile worker error')); open.clear(); };
      workers.push(w);
    }
  } catch (e) { return null; }
  const decode = (bytes) => new Promise((resolve, reject) => {
    const id = next++;
    open.set(id, { resolve, reject });
    const copy = bytes.slice();
    workers[rr++ % workers.length].postMessage({ id, bytes: copy }, [copy.buffer]);
  });
  decode.terminate = () => workers.forEach((w) => w.terminate());
  return decode;
}
