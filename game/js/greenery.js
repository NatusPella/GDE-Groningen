import { hash2 } from './rng.js';
import { pointInPolygon as inPoly } from './util.js';
// Trees and green at their real place (docs/PROVINCIE-PLAN.md 2.15): species,
// heights and crown shapes, the rules that pick a species where OSM names
// none, and the trees a wood or a park gets where OSM maps only its outline.
// Pure data and geometry: the builder (scripts/world/greenery.mjs) and the
// game (scene3d.js draws them, treeprops.js makes their trunks solid) share it.
//
// A tree is [x, y, sp, hdm, flags]: sp the index into SPECIES, hdm its height
// in decimetres, flags bit 1: a tree filled into a wood or park outline (drawn
// further out, canopy only), bit 2: one of a row. A bare [x, y] (an older
// map) is a lime of a height from its position.

// crown: round, oval, spreading, columnar, weeping, conical. r: crown radius
// (m) at the low and high end of the height range; stem: clear stem as a
// share of the height; color: the leaves in summer (linear sRGB hex), trunk.
export const SPECIES = [
  { id: 'linde', h: [14, 20], crown: 'round', r: [3.8, 5.4], stem: 0.3, color: 0x4f7d3a, trunk: 0x4d3a28 },
  { id: 'plataan', h: [16, 22], crown: 'spreading', r: [5.2, 7.2], stem: 0.3, color: 0x5d8a42, trunk: 0x8f826a },
  { id: 'eik', h: [14, 20], crown: 'spreading', r: [5.0, 6.8], stem: 0.25, color: 0x48703a, trunk: 0x4a3a2c },
  { id: 'beuk', h: [16, 22], crown: 'round', r: [5.0, 6.6], stem: 0.25, color: 0x527a33, trunk: 0x6d6a62 },
  { id: 'es', h: [16, 22], crown: 'oval', r: [4.0, 5.4], stem: 0.35, color: 0x6a9148, trunk: 0x6a6258 },
  { id: 'esdoorn', h: [12, 18], crown: 'round', r: [3.8, 5.2], stem: 0.3, color: 0x58873e, trunk: 0x5a4a3a },
  { id: 'kastanje', h: [14, 20], crown: 'round', r: [5.0, 6.4], stem: 0.25, color: 0x426c2e, trunk: 0x4a3828 },
  { id: 'populier', h: [22, 30], crown: 'columnar', r: [2.2, 3.0], stem: 0.15, color: 0x6a9352, trunk: 0x6c6a5e },
  { id: 'wilg', h: [8, 14], crown: 'weeping', r: [4.2, 6.0], stem: 0.2, color: 0x82a35e, trunk: 0x5a4a38 },
  { id: 'berk', h: [12, 18], crown: 'oval', r: [2.6, 3.6], stem: 0.3, color: 0x78a250, trunk: 0xa9a496 },
  { id: 'den', h: [12, 20], crown: 'conical', r: [2.4, 3.4], stem: 0.35, color: 0x2e4d2a, trunk: 0x6a4a30 },
  // Japanese ornamental cherry: late bloom in pink, kept all summer
  { id: 'kers', h: [6, 9], crown: 'round', r: [3.2, 4.4], stem: 0.3, color: 0xe58fb4, trunk: 0x4a3428 },
];
export const SPECIES_INDEX = Object.fromEntries(SPECIES.map((s, i) => [s.id, i]));
export const TREE_FLAG = { fill: 1, row: 2 };

// OSM species / genus / species:nl (first word) to a species
const OSM_GENUS = {
  tilia: 'linde', linde: 'linde', platanus: 'plataan', plataan: 'plataan', quercus: 'eik', eik: 'eik',
  fagus: 'beuk', beuk: 'beuk', fraxinus: 'es', es: 'es', acer: 'esdoorn', esdoorn: 'esdoorn',
  aesculus: 'kastanje', paardenkastanje: 'kastanje', populus: 'populier', populier: 'populier',
  salix: 'wilg', wilg: 'wilg', betula: 'berk', berk: 'berk', pinus: 'den', picea: 'den', larix: 'den', den: 'den',
  prunus: 'kers', kers: 'kers', sierkers: 'kers',
};
export function speciesFromTags(t = {}) {
  for (const k of ['species', 'genus', 'species:nl', 'taxon']) {
    const v = (t[k] || '').toLowerCase().split(/[\s;]/)[0];
    if (OSM_GENUS[v] !== undefined) return SPECIES_INDEX[OSM_GENUS[v]];
  }
  if (t.leaf_type === 'needleleaved') return SPECIES_INDEX.den;
  return -1;
}

export { hash2 } from './rng.js';
const pick = (list, h) => {
  let s = 0;
  for (const [, w] of list) s += w;
  let t = h * s;
  for (const [id, w] of list) { t -= w; if (t <= 0) return SPECIES_INDEX[id]; }
  return SPECIES_INDEX[list[list.length - 1][0]];
};

// The species where OSM names none, from where the tree stands:
// ctx: { water (m to the nearest water), church (a church within 60 m),
// place: 'forest' | 'park' | 'cemetery' | 'street', road (the class of the
// nearest road within 12 m), needle (OSM leaf_type), rowSeed (a row's own
// seed, so a row is one species) }
export function speciesFor(ctx, h) {
  if (ctx.needle) return SPECIES_INDEX.den;
  const r = ctx.rowSeed !== undefined ? ctx.rowSeed : h;
  if (ctx.water !== undefined && ctx.water < 5) return r < 0.65 ? SPECIES_INDEX.wilg : SPECIES_INDEX.populier;
  if (ctx.water !== undefined && ctx.water < 14 && r < 0.5) return r < 0.3 ? SPECIES_INDEX.populier : SPECIES_INDEX.wilg;
  if (ctx.church) return r < 0.8 ? SPECIES_INDEX.linde : SPECIES_INDEX.kastanje;
  switch (ctx.place) {
    case 'forest': return pick([['beuk', 4], ['eik', 4], ['berk', 2], ['es', 2], ['den', 1.5], ['esdoorn', 1]], r);
    case 'cemetery': return pick([['linde', 4], ['beuk', 2], ['den', 1.5], ['kastanje', 1], ['berk', 1]], r);
    case 'park': return pick([['linde', 3], ['beuk', 2], ['eik', 2], ['kastanje', 2], ['plataan', 1.5], ['esdoorn', 1.5], ['berk', 1], ['kers', 0.8], ['wilg', 0.5]], r);
    default: break;
  }
  if (ctx.road === 'major') return pick([['plataan', 3], ['linde', 3], ['esdoorn', 2], ['es', 1.5], ['eik', 1]], r);
  return pick([['linde', 3], ['esdoorn', 2.5], ['berk', 1.5], ['es', 1], ['kastanje', 1], ['kers', 0.45], ['plataan', 0.8]], r);
}

// a mature height (dm) for species sp from a hash
export function heightFor(sp, h) {
  const s = SPECIES[sp] || SPECIES[0];
  return Math.round((s.h[0] + (s.h[1] - s.h[0]) * h) * 10);
}

// --------------------------------------------------------------- dims

// The drawn shape of tree t: trunk height and radius, crown radius r and
// vertical radius ry, the crown centre height, the second lobe; plus the
// species. Shared by the instanced trees, the tumbling copy and the camera.
const _d = { sp: 0, h: 0, trunkH: 0, tr: 0, ts: 1, r: 0, ry: 0, cy: 0, lr: 0, lx: 0, ly: 0, lz: 0, h2: 0, crown: 'round', cone: false, rot: 0 };
export function treeDims(t) {
  const x = t[0], y = t[1];
  const hA = hash2(x, y), hB = hash2(y, x);
  const sp = t.length > 2 && t[2] >= 0 ? t[2] : SPECIES_INDEX.linde;
  const s = SPECIES[sp] || SPECIES[0];
  const H = t.length > 3 && t[3] > 0 ? t[3] / 10 : s.h[0] + (s.h[1] - s.h[0]) * hA;
  const u = Math.max(0, Math.min(1, (H - s.h[0]) / Math.max(1, s.h[1] - s.h[0])));
  const d = _d;
  d.sp = sp; d.h = H; d.h2 = hB; d.crown = s.crown; d.cone = s.crown === 'conical'; d.rot = hB * Math.PI * 2;
  const r = (s.r[0] + (s.r[1] - s.r[0]) * u) * (0.9 + 0.2 * hB);
  d.trunkH = Math.max(2.2, H * s.stem);
  d.ts = 1.2 + u * 0.8;
  d.tr = 0.22 * d.ts;
  switch (s.crown) {
    case 'columnar': d.r = r; d.ry = (H - d.trunkH) * 0.5; break;
    case 'conical': d.r = r; d.ry = (H - d.trunkH) * 0.5; break;
    case 'weeping': d.r = r; d.ry = r * 0.75; d.trunkH = Math.max(2.2, H - 2 * d.ry * 0.9); break;
    case 'spreading': d.r = r; d.ry = Math.min(r * 0.8, (H - d.trunkH) * 0.5); break;
    case 'oval': d.r = r; d.ry = Math.max(r * 1.25, (H - d.trunkH) * 0.5); break;
    default: d.r = r; d.ry = Math.max(r * 1.0, (H - d.trunkH) * 0.48); break;
  }
  d.cy = d.trunkH + d.ry * (s.crown === 'weeping' ? 0.9 : 0.95);
  // a second lobe gives the round crowns a less perfect outline
  d.lr = d.cone || s.crown === 'columnar' ? 0 : d.r * (0.55 + hB * 0.15);
  d.lx = Math.cos(hB * 6.3) * d.r * 0.55;
  d.lz = Math.sin(hB * 6.3) * d.r * 0.55;
  d.ly = d.cy + d.ry * (s.crown === 'weeping' ? -0.25 : 0.35);
  return d;
}
// the colour of tree t's leaves (hex), a few percent either way per tree
export function treeColor(t, out) {
  const sp = t.length > 2 && t[2] >= 0 ? t[2] : 0;
  const s = SPECIES[sp] || SPECIES[0];
  const v = 0.9 + 0.2 * hash2(t[1] * 1.7, t[0] * 0.3);
  out.setHex(s.color).multiplyScalar(v);
  return out;
}

// --------------------------------------------------------------- filling


// Trees in a polygon on a jittered grid (deterministic: the jitter is a hash
// of the cell), `spacing` m apart on average; keep(x, y) says whether a spot
// is free (no road, building, water, track or other tree). A clearing noise
// leaves open glades in a park (open: the share left open).
export function fillPolygon(P, { spacing = 9, open = 0, keep = () => true, salt = 0 } = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const out = [];
  for (let gx = Math.floor(x0 / spacing); gx <= Math.floor(x1 / spacing); gx++) {
    for (let gy = Math.floor(y0 / spacing); gy <= Math.floor(y1 / spacing); gy++) {
      const x = (gx + 0.1 + 0.8 * hash2(gx + salt, gy * 1.3)) * spacing;
      const y = (gy + 0.1 + 0.8 * hash2(gy - salt, gx * 0.7 + 3)) * spacing;
      if (!inPoly(x, y, P)) continue;
      if (open > 0) {
        // glades: a smooth noise over ~60 m cells
        const n = smoothNoise(x / 60, y / 60, salt);
        if (n < open) continue;
      }
      if (!keep(x, y)) continue;
      out.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
    }
  }
  return out;
}
function smoothNoise(x, y, salt) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const s = (t) => t * t * (3 - 2 * t);
  const v = (a, b) => hash2(a + salt * 0.37, b - salt * 0.11);
  const a = v(ix, iy), b = v(ix + 1, iy), c = v(ix, iy + 1), d = v(ix + 1, iy + 1);
  return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy);
}

// Rows: trees in a near straight line about every 4-12 m. Returns per tree
// the index of its row (or -1): rows of 5 or more get one species.
export function findRows(trees, maxGap = 12) {
  const n = trees.length, G = 16, grid = new Map();
  trees.forEach((t, i) => { const k = Math.floor(t[0] / G) * 65536 + Math.floor(t[1] / G); (grid.get(k) || grid.set(k, []).get(k)).push(i); });
  const parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = (i) => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  const nb = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const [x, y] = trees[i];
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) for (const j of grid.get((Math.floor(x / G) + gx) * 65536 + Math.floor(y / G) + gy) || []) {
      if (j <= i) continue;
      const d = Math.hypot(trees[j][0] - x, trees[j][1] - y);
      if (d >= 3 && d <= maxGap) { nb[i].push(j); nb[j].push(i); }
    }
  }
  // a tree with at most two neighbours roughly opposite each other is on a line
  for (let i = 0; i < n; i++) {
    if (nb[i].length < 1 || nb[i].length > 2) continue;
    if (nb[i].length === 2) {
      const [a, b] = nb[i];
      const ax = trees[a][0] - trees[i][0], ay = trees[a][1] - trees[i][1], bx = trees[b][0] - trees[i][0], by = trees[b][1] - trees[i][1];
      if ((ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by)) > -0.9) continue;
    }
    for (const j of nb[i]) if (nb[j].length <= 2) { const x = find(i), y = find(j); if (x !== y) parent[x] = y; }
  }
  const size = new Map();
  for (let i = 0; i < n; i++) size.set(find(i), (size.get(find(i)) || 0) + 1);
  return Int32Array.from({ length: n }, (_, i) => (size.get(find(i)) >= 5 ? find(i) : -1));
}
