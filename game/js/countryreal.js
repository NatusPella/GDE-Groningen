import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BLOCK, COUNTRY_UNIFORMS, setRealZone, realWater, urbanWeight } from './countryfield.js';

// What is left of the real Ommelanden data (scripts/add_ommeland.py): the
// water field, the built-up share, the places, churches, stations, train
// routes and the canals' centre lines of the ~12 km round the city, kept in
// game/ommeland.json + game/ommeland.bin next to the city map. The buildings
// and roads of that area are the province's tiles now (tileworld.js, the
// placement queries in tileplace.js); the old building boxes in the file are
// only read to compute the built-up share.

const URBAN_CELL = 40;

export const REAL = {
  ready: false, ext: null, waterways: [], boatways: [], rails: [], places: [], churches: [], stations: [], routes: [],
  waterField: null, covered: null,
};

// Where a built province tile is the one source (provinceworld.js). Set
// before initReal; null: every cell counts as not covered.
export function setTileCover(fn) { REAL.covered = fn || null; }
export const coveredByTiles = (x, y) => !!REAL.covered && REAL.covered(x, y);

export async function loadOmmeland(mapUrl = 'citymap.json') {
  const base = mapUrl.replace(/[^/]*$/, '');
  try {
    const [j, b] = await Promise.all([
      fetch(base + 'ommeland.json').then((r) => (r.ok ? r.json() : null)),
      fetch(base + 'ommeland.bin').then((r) => (r.ok ? r.arrayBuffer() : null)),
    ]);
    if (!j || !b || typeof DecompressionStream === 'undefined') return null;
    if (j.frame !== 'rd-new') console.error('ommeland.json is not in the rd-new frame (scripts/world/rebase_data.py)');
    const raw = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    return { ...j, bin: raw };
  } catch (e) {
    console.warn('ommeland data not loaded', e);
    return null;
  }
}

const pairs = (p) => {
  const out = [];
  for (let i = 0; i < p.length; i += 2) out.push([p[i], p[i + 1]]);
  return out;
};

export function initReal(map, om) {
  if (!om || REAL.ready) return;
  const t0 = performance.now();
  REAL.ext = om.extent;
  const buf = om.bin;
  const head = new DataView(buf, 0, 12);
  const n = head.getUint32(4, true), stride = head.getUint32(8, true);
  const wm = om.water;
  const water = { ...wm, data: new Uint8Array(buf, 12 + n * stride * 2, wm.w * wm.h) };
  const urban = urbanGrid(om.extent, new Int16Array(buf, 12, n * stride), n, stride);
  REAL.waterField = water;

  REAL.waterways = om.waterways.map((w) => ({ pts: pairs(w.p), hw: w.h, name: w.n || '' }));
  REAL.rails = om.rails.map(pairs);
  REAL.boatways = (om.boatways || []).map((w) => ({ pts: pairs(w.p), hw: w.h })).concat(REAL.waterways.filter((w) => w.pts.length > 3));
  REAL.places = om.places;
  REAL.churches = om.churches;
  REAL.stations = om.stations;
  REAL.routes = om.routes;

  const [x0, y0, x1, y1] = om.extent;
  const zone = {
    bx0: Math.ceil(x0 / BLOCK - 0.5), by0: Math.ceil(y0 / BLOCK - 0.5), bx1: Math.floor(x1 / BLOCK - 0.5), by1: Math.floor(y1 / BLOCK - 0.5),
    water, urban,
  };
  setRealZone(zone);
  COUNTRY_UNIFORMS.uRealWater.value = r8Texture(water.data, water.w, water.h);
  COUNTRY_UNIFORMS.uUrbanTex.value = r8Texture(urban.data, urban.w, urban.h);

  applyRoutes(map, om.routes);
  map.countryStations = REAL.stations.filter((s) => om.routes.some((r) => r.stops.some((q) => q.name === s.name && !q.offmap)));
  map.countryRails = REAL.rails;
  map.countryExtent = om.extent;
  map.ommeland = REAL;
  REAL.initMs = Math.round(performance.now() - t0);
  REAL.ready = true;
}

function r8Texture(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.unpackAlignment = 1;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// Built-up share per 40 m cell (buildings minus sheds and glasshouses),
// box-blurred over 200 m so a lone farm stays country and a village is town.
// I: the file's building table (x, y in m, w and l in dm, angle, code, levels,
// fill in %, ...).
function urbanGrid(ext, I, n, stride) {
  const [x0, y0, x1, y1] = ext;
  const w = Math.ceil((x1 - x0) / URBAN_CELL), h = Math.ceil((y1 - y0) / URBAN_CELL);
  const acc = new Float32Array(w * h);
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    const code = I[o + 5];
    if (code === 5 || code === 8) continue;
    // a building kept as several rectangles has its part's own centre
    let bx = I[o], by = I[o + 1];
    if (stride > 8 && (I[o + 9] || I[o + 10])) {
      const a = (I[o + 4] * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), cu = I[o + 9] / 10, cv = I[o + 10] / 10;
      bx = I[o] + cu * c - cv * s; by = I[o + 1] + cu * s + cv * c;
    }
    const gx = Math.floor((bx - x0) / URBAN_CELL), gy = Math.floor((by - y0) / URBAN_CELL);
    if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
    acc[gy * w + gx] += Math.min(900, (I[o + 2] / 10) * (I[o + 3] / 10) * Math.max(0.3, I[o + 7] / 100));
  }
  const blur = (src, horiz) => {
    const out = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let s = 0;
        for (let k = -2; k <= 2; k++) {
          const ii = horiz ? i + k : i, jj = horiz ? j : j + k;
          if (ii >= 0 && jj >= 0 && ii < w && jj < h) s += src[jj * w + ii];
        }
        out[j * w + i] = s / 5;
      }
    }
    return out;
  };
  const b = blur(blur(acc, true), false);
  const data = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) data[k] = Math.min(255, Math.round((b[k] / (URBAN_CELL * URBAN_CELL)) * 255));
  return { x0, y0, cell: URBAN_CELL, w, h, data };
}

// The city's train routes carried on to the real stations and the edge.
function applyRoutes(map, ext) {
  const byName = new Map((map.railRoutes || []).map((r) => [r.name, r]));
  const out = [];
  for (const e of ext) {
    const base = byName.get(e.base);
    if (!base) continue;
    const P = base.pts;
    let s = 0, cut = P.length - 1;
    for (let i = 1; i < P.length; i++) {
      s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (s >= e.cutS - 0.5) { cut = i; break; }
    }
    const tail = pairs(e.pts);
    const pts = P.slice(0, cut).concat(tail);
    const stops = base.stops.filter((q) => e.keep.includes(q.name)).map((q) => ({ ...q }));
    for (const q of e.stops) stops.push({ ...q, s: e.cutS + q.s });
    const route = { ...base, name: e.name, pts, stops };
    if (e.train) route.train = e.train;
    out.push(route);
  }
  const replaced = new Set(out.map((r) => r.name));
  map.railRoutes = (map.railRoutes || []).filter((r) => !replaced.has(r.name)).concat(out);
}

// ------------------------------------------------------------------ queries

export function inRealExtent(x, y, m = 0) {
  const E = REAL.ext;
  return !!E && x > E[0] + m && x < E[2] - m && y > E[1] + m && y < E[3] - m;
}

// Open water or built-up land keeps procedural props away (the tiles' own
// buildings, roads and water are checked by provinceworld.js realBlockedAt).
export function realBlocked(x, y, m = 2) {
  if (!REAL.ready || !inRealExtent(x, y)) return false;
  if (realWater(x, y) > -m - 0.5) return true;
  return urbanWeight(x, y) > 0.15;
}

// Real places whose label point lies in the window: [{ name, x, y, r }].
export function realPlaceLabels(x0, y0, x1, y1) {
  const out = [];
  for (const p of REAL.places) if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) out.push({ name: p.n, x: p.x, y: p.y, r: p.r, kind: p.k });
  return out;
}

// Nearest real place (for signs and the direction blades).
export function nearestPlace(x, y, minD = 0, any = false) {
  let best = null, bd = Infinity;
  for (const p of REAL.places) {
    if (!any && (p.k === 'quarter' || p.k === 'suburb')) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d >= minD && d < bd) { bd = d; best = p; }
  }
  return best;
}
