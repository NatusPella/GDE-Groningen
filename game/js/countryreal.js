import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BLOCK, COUNTRY_UNIFORMS, chash, setRealZone, realWater, urbanWeight } from './countryfield.js';

// The real Ommelanden (scripts/add_ommeland.py): OSM roads, rail lines,
// water, villages, churches, stations and building boxes for ~12 km round
// the city, kept in game/ommeland.json + game/ommeland.bin next to the
// city map. Inside this extent the polder generator keeps only its fields,
// ditches, animals and filler: roads, canals and villages come from here.
// Everything is low detail: roads and water are painted by the ground
// shader (countryedge / countryfield), buildings are instanced boxes with a
// roof, streamed in the same 160 m tiles as the other countryside props.

export const RTILE = 160;
const URBAN_CELL = 40;

export const REAL = {
  ready: false, ext: null, roads: [], cycleways: [], waterways: [], rails: [], places: [], churches: [], stations: [], routes: [],
  n: 0, bx: null, by: null, bw: null, bl: null, ba: null, code: null, lv: null, fill: null,
  bTiles: new Map(), rTiles: new Map(), signTiles: new Map(), churchTiles: new Map(),
  // village shopfronts: building -> face (1 +x, 2 -x, 3 +z, 4 -z of its
  // model), and the countryside's hook that repaints that building
  shopFace: new Map(), onShop: null,
};

export function markShop(i, face) {
  if (REAL.shopFace.get(i) === face) return;
  REAL.shopFace.set(i, face);
  if (REAL.onShop) REAL.onShop(i);
}

const tkey = (tx, ty) => tx * 100003 + ty;

export async function loadOmmeland(mapUrl = 'citymap.json') {
  const base = mapUrl.replace(/[^/]*$/, '');
  try {
    const [j, b] = await Promise.all([
      fetch(base + 'ommeland.json').then((r) => (r.ok ? r.json() : null)),
      fetch(base + 'ommeland.bin').then((r) => (r.ok ? r.arrayBuffer() : null)),
    ]);
    if (!j || !b || typeof DecompressionStream === 'undefined') return null;
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

// Model for building i: what the countryside props, skyline and maps draw.
// kind: 'house' (gable or hip), 'block' (flat, windows), 'barn', 'shed',
// 'glass'. Buildings that share walls (groupRows) are one row: one height,
// one brick and roof, the ridge along the row; long is then the width along
// the row (it can be the shorter side), short the depth.
export const BRICKS = [0x9a4a36, 0x8a3e30, 0xa8583e, 0x7a4636, 0xb87a56, 0xd8d0c0, 0x94503c, 0x6e3e32];
const BRICK_FAMILY = [
  [0x9a4a36, 0x94503c, 0x8a4434], [0x8a3e30, 0x7e3a2e, 0x8e4434], [0xa8583e, 0xb06446, 0x9e5038],
  [0x7a4636, 0x6e3e32, 0x744234], [0xb87a56, 0xae6e4c, 0xc08462], [0xd8d0c0, 0xe2dccc, 0xcfc6b4],
];
const ROOF_TILE = [0x9a3e2a, 0x3e4246, 0x8a3a28, 0x2e3236, 0xa8502e];
const BARN_ROOF = [0x3a3e40, 0x4a5a48, 0x6a6e6c, 0x3a3e40];
const SHED_WALL = [0x8a9296, 0x5a6a78, 0xb8b6ae, 0x6f7a6c, 0x9a8a70];
// A wing of an outline in parts: its first rectangle's model on its own box,
// the roof scaled to keep the pitch, so the roofs meet in valleys.
export const isWing = (i) => !!REAL.grp && REAL.grp[i] !== i;
export function buildingModel(i) {
  if (isWing(i)) {
    const m = buildingModel(REAL.grp[i]);
    const w = REAL.bw[i], l = REAL.bl[i];
    const short = Math.min(w, l);
    const roof = m.roof > 0 ? Math.max(1.4, Math.min(m.roof * 1.15, (m.roof * short) / Math.max(1, m.short))) : 0;
    return { ...m, long: Math.max(w, l), short, angle: w >= l ? REAL.ba[i] : REAL.ba[i] + Math.PI / 2, roof, wing: true };
  }
  return ownModel(i);
}
function ownModel(i) {
  const code = REAL.code[i], w = REAL.bw[i], l = REAL.bl[i], area = REAL.grpArea[i] || w * l * REAL.fill[i];
  const root = REAL.row ? REAL.row[i] : i, ax = REAL.rowAxis ? REAL.rowAxis[i] : -1;
  const row = ax >= 0 && REAL.rowN[root] > 1;
  const lv = row ? REAL.rowLv[root] : REAL.lv[i];
  // the row's seed sets height and palette; the unit's own only small things
  const h = chash(REAL.bx[root], REAL.by[root]), hu = chash(REAL.bx[i] + 7, REAL.by[i] - 3);
  let long = Math.max(w, l), short = Math.min(w, l), angle = w >= l ? REAL.ba[i] : REAL.ba[i] + Math.PI / 2;
  if (row) { long = ax === 0 ? w : l; short = ax === 0 ? l : w; angle = ax === 0 ? REAL.ba[i] : REAL.ba[i] + Math.PI / 2; }
  const depth = row ? REAL.rowDep[root] : short;
  const fam = BRICK_FAMILY[Math.floor(h * 97) % BRICK_FAMILY.length];
  let kind = 'house', wall = 3 + h * 2.6, roof = Math.min(6, Math.max(2.2, depth * 0.55)), hip = false;
  let color = fam[hu < 0.18 ? 1 + (Math.floor(hu * 11) % 2) : 0], rc = ROOF_TILE[Math.floor(h * 53) % ROOF_TILE.length];
  const urban = urbanWeight(REAL.bx[i], REAL.by[i]);
  if (code === 8 || code === 10 || (code === 0 && area < 38)) { kind = 'shed'; wall = 2.4 + hu * 0.6; roof = 0; color = hu < 0.5 ? 0x6a5a48 : 0x8a8478; }
  else if (code === 5) { kind = 'glass'; wall = 3.6; roof = 0; color = 0xc8dcd6; }
  else if (code === 2 || code === 9 || lv >= 3) { kind = 'block'; wall = Math.max(2, lv || (code === 9 ? 2 : 4)) * 3 + 0.6; roof = 0; color = h < 0.5 ? color : [0xd8d0c0, 0xb8b0a0, 0x8a8a84][Math.floor(h * 7) % 3]; }
  else if (code === 6) { kind = 'shed'; wall = 6 + h * 4; roof = 0; color = SHED_WALL[Math.floor(h * 31) % SHED_WALL.length]; }
  else if (code === 4 || (code === 0 && area > 380 && urban < 0.5)) {
    kind = 'barn'; wall = 3.4 + h; roof = Math.min(9, Math.max(3.5, short * 0.42)); hip = h < 0.7;
    color = h < 0.4 ? 0x7a4a3a : SHED_WALL[Math.floor(h * 31) % SHED_WALL.length]; rc = BARN_ROOF[Math.floor(h * 13) % BARN_ROOF.length];
  }
  else if (code === 3) { wall = 3.6; roof = Math.min(7.5, Math.max(4, short * 0.6)); hip = true; }
  else if (code === 0 && area > 380) { kind = 'block'; wall = 6.5 + h * 5; roof = 0; color = SHED_WALL[Math.floor(h * 31) % SHED_WALL.length]; }
  else if (lv) { wall = lv * 2.9 + 0.3; }
  // one OSM outline for a whole terrace stays a pitched row, not a block
  if (kind === 'house' && !row && long > 26 && area > 300 && (code !== 1 || short > 14)) { kind = 'block'; wall = 6 + h * 3; roof = 0; }
  // a big detached house out in the polder is a farmhouse with a hipped roof
  if (kind === 'house' && !row && !hip && area > 150 && urban < 0.35) { hip = true; wall = Math.min(wall, 3.4); roof = Math.min(8, Math.max(4.5, short * 0.62)); }
  else if (kind === 'house' && !row && !hip && hu < 0.12) hip = true;
  return { kind, wall, roof, hip, color, roofColor: rc, long, short, angle, row };
}

// Buildings that share a wall (aligned boxes less than a metre apart with
// most of the wall in common) form a row: a terrace, a pair of semis.
// REAL.row[i] is the row's lowest index, rowAxis[i] the unit's own axis
// along the row (0: along ba, 1: across it, -1: detached); rowN, rowLv and
// rowDep (mean depth) are kept at that first index.
function groupRows() {
  const n = REAL.n, CELL = 32;
  const { bx: X, by: Y, bw: W, bl: L, ba: A } = REAL;
  const par = new Int32Array(n);
  for (let i = 0; i < n; i++) par[i] = i;
  const find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  const axis = new Int8Array(n).fill(-1);
  const cls = new Uint8Array(n), rad = new Float32Array(n), ca = new Float32Array(n), sa = new Float32Array(n);
  // counting-sort grid of the candidates by the cell of their centre
  const [ex0, ey0, ex1, ey1] = REAL.ext;
  const gw = Math.ceil((ex1 - ex0) / CELL) + 2, gh = Math.ceil((ey1 - ey0) / CELL) + 2;
  const cellOf = new Int32Array(n).fill(-1), start = new Int32Array(gw * gh + 1);
  for (let i = 0; i < n; i++) {
    const c = REAL.code[i];
    if ((c !== 0 && c !== 1 && c !== 2) || REAL.fill[i] < 0.6 || W[i] * L[i] < 30 || REAL.grp[i] !== i || (i + 1 < n && REAL.grp[i + 1] === i)) continue;
    const gx = Math.floor((X[i] - ex0) / CELL) + 1, gy = Math.floor((Y[i] - ey0) / CELL) + 1;
    if (gx < 1 || gy < 1 || gx >= gw - 1 || gy >= gh - 1) continue;
    cls[i] = c === 2 || REAL.lv[i] >= 3 ? 2 : 1;
    rad[i] = Math.sqrt(W[i] * W[i] + L[i] * L[i]) / 2 + 0.8;
    ca[i] = Math.cos(A[i]); sa[i] = Math.sin(A[i]);
    cellOf[i] = gy * gw + gx;
    start[cellOf[i] + 1]++;
  }
  for (let k = 0; k < gw * gh; k++) start[k + 1] += start[k];
  const fillAt = start.slice(0, gw * gh), order = new Int32Array(start[gw * gh]);
  for (let i = 0; i < n; i++) if (cellOf[i] >= 0) order[fillAt[cellOf[i]]++] = i;
  const touch = (a, b) => {
    const cd = ca[a] * ca[b] + sa[a] * sa[b], sd = Math.abs(sa[a] * ca[b] - ca[a] * sa[b]);
    if (Math.min(Math.abs(cd), sd) > 0.17) return -1;
    const swap = Math.abs(cd) < 0.7071;
    const hau = W[a] / 2, hav = L[a] / 2;
    const hbu = (swap ? L[b] : W[b]) / 2, hbv = (swap ? W[b] : L[b]) / 2;
    const dx = X[b] - X[a], dy = Y[b] - Y[a];
    const u = dx * ca[a] + dy * sa[a], v = -dx * sa[a] + dy * ca[a];
    const gu = Math.abs(u) - hau - hbu, gv = Math.abs(v) - hav - hbv;
    if (gu > -0.8 && gu < 1 && gv < 0 && Math.min(hav, v + hbv) - Math.max(-hav, v - hbv) > 1.2 * Math.min(hav, hbv)) return 0;
    if (gv > -0.8 && gv < 1 && gu < 0 && Math.min(hau, u + hbu) - Math.max(-hau, u - hbu) > 1.2 * Math.min(hau, hbu)) return 1;
    return -1;
  };
  // each pair once: the own cell (b after a) and four of the eight neighbours
  const NB = [0, 1, gw - 1, gw, gw + 1];
  for (let p = 0; p < order.length; p++) {
    const a = order[p], ka = cellOf[a];
    for (let o = 0; o < 5; o++) {
      const kb = ka + NB[o];
      for (let q = o === 0 ? p + 1 : start[kb]; q < start[kb + 1]; q++) {
        const b = order[q];
        if (cls[a] !== cls[b]) continue;
        const dx = X[b] - X[a], dy = Y[b] - Y[a], r = rad[a] + rad[b];
        if (dx * dx + dy * dy > r * r) continue;
        const t = touch(a, b);
        if (t < 0) continue;
        if (axis[a] < 0) axis[a] = t;
        if (axis[b] < 0) axis[b] = Math.abs(ca[a] * ca[b] + sa[a] * sa[b]) < 0.7071 ? 1 - t : t;
        const ra = find(a), rb = find(b);
        if (ra !== rb) par[Math.max(ra, rb)] = Math.min(ra, rb);
      }
    }
  }
  const rowN = new Uint16Array(n), rowLv = new Uint8Array(n), rowDep = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = (par[i] = find(i));
    if (rowN[r] < 65535) rowN[r]++;
    rowLv[r] = Math.max(rowLv[r], REAL.lv[i]);
    rowDep[r] += axis[i] === 1 ? REAL.bw[i] : axis[i] === 0 ? REAL.bl[i] : Math.min(REAL.bw[i], REAL.bl[i]);
  }
  for (let i = 0; i < n; i++) if (rowN[i]) rowDep[i] /= rowN[i];
  REAL.row = par; REAL.rowAxis = axis; REAL.rowN = rowN; REAL.rowLv = rowLv; REAL.rowDep = rowDep;
}

export function initReal(map, om) {
  if (!om || REAL.ready) return;
  const t0 = performance.now();
  REAL.ext = om.extent;
  const buf = om.bin;
  const head = new DataView(buf, 0, 12);
  const n = head.getUint32(4, true), stride = head.getUint32(8, true);
  const I = new Int16Array(buf, 12, n * stride);
  REAL.n = n;
  REAL.bx = new Float32Array(n); REAL.by = new Float32Array(n); REAL.bw = new Float32Array(n); REAL.bl = new Float32Array(n);
  REAL.ba = new Float32Array(n); REAL.code = new Uint8Array(n); REAL.lv = new Uint8Array(n); REAL.fill = new Float32Array(n);
  // an outline kept as 2-3 rectangles: every part points at its first one
  // (grp), whose seed picks the looks; grpArea is the whole footprint there
  REAL.grp = new Int32Array(n); REAL.grpArea = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * stride;
    REAL.bw[i] = I[o + 2] / 10; REAL.bl[i] = I[o + 3] / 10;
    REAL.ba[i] = (I[o + 4] * Math.PI) / 180; REAL.code[i] = I[o + 5]; REAL.lv[i] = I[o + 6]; REAL.fill[i] = Math.max(0.3, I[o + 7] / 100);
    const back = stride > 8 ? I[o + 8] : 0;
    REAL.grp[i] = i - back;
    REAL.grpArea[i - back] += REAL.bw[i] * REAL.bl[i] * REAL.fill[i];
    if (stride > 8 && (I[o + 9] || I[o + 10])) {
      const c = Math.cos(REAL.ba[i]), s = Math.sin(REAL.ba[i]), cu = I[o + 9] / 10, cv = I[o + 10] / 10;
      REAL.bx[i] = I[o] + cu * c - cv * s; REAL.by[i] = I[o + 1] + cu * s + cv * c;
    } else { REAL.bx[i] = I[o]; REAL.by[i] = I[o + 1]; }
    const k = tkey(Math.floor(REAL.bx[i] / RTILE), Math.floor(REAL.by[i] / RTILE));
    let a = REAL.bTiles.get(k);
    if (!a) REAL.bTiles.set(k, (a = []));
    a.push(i);
  }
  const tr = performance.now();
  groupRows();
  REAL.rowMs = Math.round(performance.now() - tr);
  const wm = om.water;
  const water = { ...wm, data: new Uint8Array(buf, 12 + n * stride * 2, wm.w * wm.h) };
  const urban = urbanGrid(om.extent);
  REAL.waterField = water;

  REAL.roads = om.roads.map((r) => ({ pts: pairs(r.p), kind: r.k, w: r.w, name: r.n || '', ref: r.r || '', oneway: !!r.o, bridge: !!r.b, cycle: !!r.c }));
  REAL.cycleways = (om.cycleways || []).map((c) => ({ pts: pairs(c.p), hw: c.h }));
  REAL.waterways = om.waterways.map((w) => ({ pts: pairs(w.p), hw: w.h, name: w.n || '' }));
  REAL.rails = om.rails.map(pairs);
  REAL.boatways = (om.boatways || []).map((w) => ({ pts: pairs(w.p), hw: w.h })).concat(REAL.waterways.filter((w) => w.pts.length > 3));
  REAL.places = om.places;
  REAL.churches = om.churches;
  REAL.stations = om.stations;
  REAL.routes = om.routes;
  REAL.roads.forEach((r, ri) => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const t0x = Math.floor(Math.min(a[0], b[0]) / RTILE), t1x = Math.floor(Math.max(a[0], b[0]) / RTILE);
      const t0y = Math.floor(Math.min(a[1], b[1]) / RTILE), t1y = Math.floor(Math.max(a[1], b[1]) / RTILE);
      for (let tx = t0x; tx <= t1x; tx++) {
        for (let ty = t0y; ty <= t1y; ty++) {
          const k = tkey(tx, ty);
          let L = REAL.rTiles.get(k);
          if (!L) REAL.rTiles.set(k, (L = []));
          L.push(ri, i);
        }
      }
    }
  });
  for (const c of REAL.churches) {
    const k = tkey(Math.floor(c.x / RTILE), Math.floor(c.y / RTILE));
    if (!REAL.churchTiles.has(k)) REAL.churchTiles.set(k, []);
    REAL.churchTiles.get(k).push(c);
  }

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
  REAL.churchNear = (x, y) => (churchesInTile(Math.floor(x / RTILE), Math.floor(y / RTILE)) || []).some((c) => Math.hypot(c.x - x, c.y - y) < 30);
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
function urbanGrid(ext) {
  const [x0, y0, x1, y1] = ext;
  const w = Math.ceil((x1 - x0) / URBAN_CELL), h = Math.ceil((y1 - y0) / URBAN_CELL);
  const acc = new Float32Array(w * h);
  for (let i = 0; i < REAL.n; i++) {
    const c = REAL.code[i];
    if (c === 5 || c === 8) continue;
    const gx = Math.floor((REAL.bx[i] - x0) / URBAN_CELL), gy = Math.floor((REAL.by[i] - y0) / URBAN_CELL);
    if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
    acc[gy * w + gx] += Math.min(900, REAL.bw[i] * REAL.bl[i] * REAL.fill[i]);
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

export function buildingsInTile(tx, ty) {
  return REAL.bTiles.get(tkey(tx, ty)) || null;
}

export function roadsInTile(tx, ty) {
  return REAL.rTiles.get(tkey(tx, ty)) || null;
}

export function churchesInTile(tx, ty) {
  return REAL.churchTiles.get(tkey(tx, ty)) || null;
}

// Local frame of building i: [along, across] offsets of (x, y) and half sizes.
function localOf(i, x, y) {
  const c = Math.cos(REAL.ba[i]), s = Math.sin(REAL.ba[i]);
  const dx = x - REAL.bx[i], dy = y - REAL.by[i];
  return [dx * c + dy * s, -dx * s + dy * c, c, s];
}

// Index of a building whose box (grown by m) holds (x, y), or -1.
export function buildingAt(x, y, m = 0) {
  if (!REAL.ready) return -1;
  const tx = Math.floor(x / RTILE), ty = Math.floor(y / RTILE);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const L = REAL.bTiles.get(tkey(tx + ox, ty + oy));
      if (!L) continue;
      for (const i of L) {
        const hw = REAL.bw[i] / 2 + m, hl = REAL.bl[i] / 2 + m;
        if (Math.abs(REAL.bx[i] - x) > hw + hl || Math.abs(REAL.by[i] - y) > hw + hl) continue;
        const [u, v] = localOf(i, x, y);
        if (Math.abs(u) < hw && Math.abs(v) < hl) return i;
      }
    }
  }
  return -1;
}

// Real buildings, water and built-up land keep procedural props away.
export function realBlocked(x, y, m = 2) {
  if (!REAL.ready || !inRealExtent(x, y)) return false;
  if (realWater(x, y) > -m - 0.5) return true;
  if (urbanWeight(x, y) > 0.15) return true;
  return buildingAt(x, y, m) >= 0;
}

// Pushes obj ({x, y}) out of the real buildings.
export function pushOutOfReal(obj, radius) {
  if (!REAL.ready || !inRealExtent(obj.x, obj.y)) return false;
  let hit = false;
  const tx = Math.floor(obj.x / RTILE), ty = Math.floor(obj.y / RTILE);
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const L = REAL.bTiles.get(tkey(tx + ox, ty + oy));
      if (!L) continue;
      for (const i of L) {
        const hw = REAL.bw[i] / 2 + radius, hl = REAL.bl[i] / 2 + radius;
        if (Math.abs(REAL.bx[i] - obj.x) > hw + hl || Math.abs(REAL.by[i] - obj.y) > hw + hl) continue;
        const [u, v, c, s] = localOf(i, obj.x, obj.y);
        if (Math.abs(u) >= hw || Math.abs(v) >= hl) continue;
        let nu = u, nv = v;
        if (hw - Math.abs(u) < hl - Math.abs(v)) nu = Math.sign(u || 1) * hw;
        else nv = Math.sign(v || 1) * hl;
        obj.x = REAL.bx[i] + nu * c - nv * s;
        obj.y = REAL.by[i] + nu * s + nv * c;
        hit = true;
      }
    }
  }
  return hit;
}

// A fixed spot (a shop door, a café, a padel door) inside a real building
// box, moved to just outside it: in the Ommelanden those boxes are solid, so
// a door inside one can never be reached. null when the spot is clear.
// ok(x, y): the caller's own test (not in the water, not in a city footprint).
export function clearOfReal(x, y, ok = () => true, margin = 0.9) {
  const i = buildingAt(x, y, 0.2);
  if (i < 0) return null;
  // the four sides of the box, nearest first
  const [u, v, c, s] = localOf(i, x, y);
  const hw = REAL.bw[i] / 2 + margin, hl = REAL.bl[i] / 2 + margin;
  const exits = [[hw, v], [-hw, v], [u, hl], [u, -hl]]
    .map(([eu, ev]) => ({ x: REAL.bx[i] + eu * c - ev * s, y: REAL.by[i] + eu * s + ev * c, d: Math.hypot(eu - u, ev - v) }))
    .sort((a, b) => a.d - b.d);
  for (const e of exits) {
    const o = { x: e.x, y: e.y };
    for (let k = 0; k < 3 && buildingAt(o.x, o.y, 0.2) >= 0; k++) pushOutOfReal(o, margin);
    if (buildingAt(o.x, o.y, 0.2) < 0 && ok(o.x, o.y)) return o;
  }
  return null;
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

// ------------------------------------------------------------------ signs

// Place-name boards where the roads into a village cross its edge, facing
// the traffic heading in; the city limit gets "Groningen" with "Grunn".
export function buildRealSigns(edgeDist) {
  const out = [];
  const add = (sg) => {
    const k = tkey(Math.floor(sg.x / RTILE), Math.floor(sg.y / RTILE));
    if (!REAL.signTiles.has(k)) REAL.signTiles.set(k, []);
    REAL.signTiles.get(k).push(sg);
    out.push(sg);
  };
  const cross = (r, i, t) => {
    const a = r.pts[i], b = r.pts[i + 1];
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { x, y, ux: (b[0] - a[0]) / L, uy: (b[1] - a[1]) / L };
  };
  // place a board on the right of traffic moving along (ux, uy)
  const board = (c, dir, hw, text, sub) => {
    const ux = c.ux * dir, uy = c.uy * dir;
    const rx = -uy, ry = ux;
    add({ kind: 'place', text, sub, x: c.x + rx * (hw + 1.6), y: c.y + ry * (hw + 1.6), rot: Math.atan2(-ux, uy) });
  };
  for (const p of REAL.places) {
    if (p.k === 'suburb' || p.k === 'quarter') continue;
    let n = 0;
    for (const r of REAL.roads) {
      if (r.kind === 1 || r.kind === 2 || n >= 6) continue;
      for (let i = 0; i < r.pts.length - 1 && n < 6; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const da = Math.hypot(a[0] - p.x, a[1] - p.y) - p.r, db = Math.hypot(b[0] - p.x, b[1] - p.y) - p.r;
        if (da * db > 0) continue;
        const t = da / (da - db);
        const c = cross(r, i, t);
        board(c, da > 0 ? 1 : -1, r.w / 2, p.n, p.g || '');
        n++;
      }
    }
  }
  // city limit: where the bigger roads leave the data
  if (edgeDist) {
    for (const r of REAL.roads) {
      if (r.kind > 5 || r.kind === 1 || r.kind === 2) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const da = edgeDist(a[0], a[1]) - 60, db = edgeDist(b[0], b[1]) - 60;
        if (da * db > 0) continue;
        const c = cross(r, i, da / (da - db));
        board(c, da > 0 ? 1 : -1, r.w / 2, 'Groningen', 'Grunn');
        break;
      }
    }
  }
  return out;
}

// Name of the real road within ~15 m of (x, y), or ''.
export function realStreetAt(x, y) {
  const L = REAL.rTiles.get(tkey(Math.floor(x / RTILE), Math.floor(y / RTILE)));
  if (!L) return '';
  let best = '', bd = 15;
  for (let k = 0; k < L.length; k += 2) {
    const r = REAL.roads[L[k]];
    if (!r.name && !r.ref) continue;
    const a = r.pts[L[k + 1]], b = r.pts[L[k + 1] + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y) - r.w / 2;
    if (d < bd) { bd = d; best = r.name || r.ref; }
  }
  return best;
}

export function signsInTile(tx, ty) {
  return REAL.signTiles.get(tkey(tx, ty)) || null;
}
