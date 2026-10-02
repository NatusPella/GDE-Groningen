// Lets Node import the game's 3D modules: the three.js CDN URLs resolve to
// the copy the desktop build vendors (desktop/vendor-cache, filled by
// `cd desktop && npm run stage`), and a minimal document/canvas/window stub
// stands in for the browser bits the generators touch at import time.
//   import './node3d.mjs';  (before any game module, then import() them)
import fs from 'node:fs';
import { registerHooks } from 'node:module';

const CDN = 'https://cdn.jsdelivr.net/npm/';
const ROOT = new URL('../', import.meta.url);
const CACHES = ['desktop/vendor-cache/npm/', 'desktop/build/game/vendor/npm/'].map((p) => new URL(p, ROOT));

function local(url) {
  for (const c of CACHES) {
    const f = new URL(url.slice(CDN.length), c);
    if (fs.existsSync(f)) return f.href;
  }
  throw new Error(`${url} is not vendored yet: run \`cd desktop && npm run stage\` once`);
}
const vendored = (url) => CACHES.some((c) => url.startsWith(c.href));

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === 'three') return { url: local(CDN + 'three@0.160.0/build/three.module.js'), shortCircuit: true };
    if (spec.startsWith('three/addons/')) return { url: local(CDN + 'three@0.160.0/examples/jsm/' + spec.slice(13)), shortCircuit: true };
    if (spec.startsWith(CDN)) return { url: local(spec), shortCircuit: true };
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (vendored(url)) return { format: 'module', source: fs.readFileSync(new URL(url)), shortCircuit: true };
    return next(url, ctx);
  },
});

const noop = () => {};
const ctx2d = new Proxy({}, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'getImageData' || k === 'createImageData') return (x, y, w = 1, h = 1) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
    if (k === 'measureText') return () => ({ width: 10 });
    if (/^create(Linear|Radial|Conic)Gradient$|^createPattern$/.test(k)) return () => ({ addColorStop: noop });
    return noop;
  },
  set(t, k, v) { t[k] = v; return true; },
});
const element = () => ({
  width: 1, height: 1, style: { setProperty: noop, removeProperty: noop }, dataset: {}, children: [], classList: { toggle: noop, add: noop, remove: noop, contains: () => false },
  getContext: () => ctx2d, addEventListener: noop, removeEventListener: noop, appendChild: noop, removeChild: noop, remove: noop,
  setAttribute: noop, querySelector: () => null, querySelectorAll: () => [], toDataURL: () => '', getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }),
});
const g = globalThis;
if (typeof g.document === 'undefined') {
  g.document = {
    createElement: element, createElementNS: element, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    addEventListener: noop, removeEventListener: noop, body: null, head: element(), documentElement: element(), fonts: { check: () => true },
  };
}
const mem = new Map();
Object.defineProperty(g, 'localStorage', {
  configurable: true,
  value: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k), clear: () => mem.clear() },
});
if (typeof g.window === 'undefined') g.window = g;
for (const k of ['addEventListener', 'removeEventListener', 'dispatchEvent']) if (typeof g[k] !== 'function') g[k] = noop;
if (typeof g.requestAnimationFrame !== 'function') g.requestAnimationFrame = noop;
if (typeof g.innerWidth !== 'number') { g.innerWidth = 1280; g.innerHeight = 720; g.devicePixelRatio = 1; }
if (typeof g.self === 'undefined') g.self = g;
