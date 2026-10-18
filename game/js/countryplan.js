import {
  BLOCK, PW, ROAD_IN, ROAD_W, MAIN_HW, MAAR_HW, VILLAGE_RING, VILLAGE_X,
  chash, countryWeight, countryRect, edgeDistance, edgeRoad, maarX, maarY, villageOf, parcelAt,
} from './countryfield.js';
import { worldPlaceNames } from './worldplaces.js';
import { EDGE, initCountryEdge, edgeBlocked, landOk } from './countryedge.js';
import { farSolidsNear } from './farprops.js';

// Deterministic layout of everything built on the polder grid past the
// province's tiles, per polder block: farmsteads along the polder roads and on
// their own terps, wierde villages and gas sites. Pure data (no three.js): the
// tile props, the traffic and the colliders all read the same plan. Wind
// turbines and pylons are the real ones of the tile build (farprops.js), mills
// the landmark kits'.

export const ROAD_C = ROAD_IN + ROAD_W / 2;
const EDGE_CLEAR = 4;

// Strip-boundary rows (per strip column) and polder-road tree lanes; shared
// by the near props and the maps.
export const TREE_ROW_P = 0.11;
export const WILLOW_ROW_P = 0.05;
export const HEDGE_ROW_P = 0.19;
export const WIRE_ROW_P = 0.34;
export function ROAD_ROW(bx, by, s) {
  return chash(bx * 5 + s, by * 9) < 0.5 ? 'poplar' : chash(bx + s, by) < 0.8 ? 'tree' : null;
}

export function openLand(x, y) {
  return edgeDistance(x, y) > EDGE_CLEAR && countryWeight(x, y) >= 0.92 && landOk(x, y);
}

// ------------------------------------------------------------------ farms

// Local frame: x = depth away from the road (house front at 0), z across.
// boxes: building footprints [x0, x1, z0, z1]; drive: z band of the drive.
export const FARM_TYPES = {
  khr: { depth: 70, hw: 28, drive: [8.5, 13.5], boxes: [[-0.2, 10.2, -6.7, 6.7], [10, 17, -4.2, 4.2], [16.8, 50.3, -12.3, 12.3]] },
  olda: { depth: 80, hw: 31, drive: [12.5, 17.5], boxes: [[-0.2, 12.4, -11.4, 11.4], [12, 56.4, -15.4, 15.4]] },
  small: { depth: 46, hw: 20, drive: [6.8, 10.8], boxes: [[-0.2, 24.3, -5.8, 5.8]] },
  dairy: { depth: 98, hw: 35, drive: [-1.5, 3.5], boxes: [[-0.2, 9.3, -15.3, -4.7], [19.8, 80.3, -17.3, 17.3]] },
};

function pickType(x, y, h) {
  const r = countryRect();
  const dx = x - r.cx, dy = y - r.cy, l = Math.hypot(dx, dy) || 1;
  // the Oldambt lies east / south-east of the city
  const east = Math.max(0, (dx / l) * 0.8 + (dy / l) * 0.4);
  const pO = 0.12 + 0.25 * east;
  if (h < pO) return 'olda';
  if (h < pO + 0.24) return 'dairy';
  if (h < pO + 0.46) return 'small';
  return 'khr';
}

function farmLocal(f, x, y) {
  const dx = x - f.x, dy = y - f.y;
  return [dx * f.ca + dy * f.sa, -dx * f.sa + dy * f.ca];
}
export function farmWorld(f, lx, lz) {
  return [f.x + lx * f.ca - lz * f.sa, f.y + lx * f.sa + lz * f.ca];
}
function localAabb(f, x0, x1, z0, z1) {
  const [ax, ay] = farmWorld(f, x0, z0), [bx, by] = farmWorld(f, x1, z1);
  return [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
}
const overlap = (a, b, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
const inBox = (b, x, y, m = 0) => x > b[0] - m && x < b[2] + m && y > b[1] - m && y < b[3] + m;

// Yard furniture decided with the plan, so colliders and props agree.
// Each: [kind, lx, lz, rot, sx, sy, sz, color?, collide?]
function farmItems(f, R) {
  const T = FARM_TYPES[f.type];
  const it = [];
  const add = (kind, lx, lz, rot = 0, sx = 1, sy = 1, sz = 1, color = 0xffffff, hit = 0) => {
    const o = { kind, lx, lz, rot, sx, sy, sz, color, hit, h: 0 };
    it.push(o);
    return o;
  };
  const [d0, d1] = T.drive;
  const dz = (d0 + d1) / 2;
  const slab = (x0, x1, z0, z1, color) => add('slab', (x0 + x1) / 2, (z0 + z1) / 2, 0, x1 - x0, 1, z1 - z0, color);
  const GRAVEL = 0xa39c8c, CONCRETE = 0xb8b6ae;
  if (f.front > 0) {
    slab(-f.front - 0.4, 2, d0, d1, GRAVEL);
    add('grid', -f.front + 1.6, dz, 0, 1, 1, (d1 - d0) / 3.6);
    for (let z = -T.hw + 5; z < d0 - 1.5; z += 2.3) add('hedge', -f.front + 1.4, z, Math.PI / 2, 2.6, 0.8 + R() * 0.25, 1.2);
    if (R() < 0.8) add('tree', -f.front * 0.45, d0 - 6 - R() * 4, R() * 6, 0.6, 0.6, 0.6);
  }
  const tractor = () => [0x3f7d3a, 0xb8322a, 0x2f5fa8, 0x3f7d3a, 0xc9a227][Math.floor(R() * 5)];
  const shelter = (x0, x1, back, skipZ) => {
    for (let lx = x0; lx <= x1; lx += 7) {
      for (const s of [-1, 1]) {
        if (s === skipZ || R() < 0.15) continue;
        add(R() < 0.7 ? 'tree' : 'poplar', lx + (R() - 0.5) * 2, s * (T.hw - 2.5 - R() * 1.5), R() * 6.28, 0.85 + R() * 0.35, 0.85 + R() * 0.35, 0.85 + R() * 0.35);
      }
    }
    for (let lz = -T.hw + 3; lz <= T.hw - 3; lz += 7) if (R() > 0.12) add('tree', back + (R() - 0.5) * 2, lz, R() * 6.28, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0.9 + R() * 0.3);
  };
  const baleStack = (lx, lz, rot) => {
    const wrap = R() < 0.5 ? 0xe8e8e2 : R() < 0.6 ? 0x2a2a2a : 0x9fb58a;
    for (const [layer, count] of [[0, 4], [1, 3], [2, 2]]) {
      for (let k = 0; k < count; k++) {
        const o = (k - (count - 1) / 2) * 1.3;
        add('bale', lx + Math.cos(rot) * o, lz - Math.sin(rot) * o, rot, 0.86, 0.86, 0.86, wrap).h = layer * 1.3;
      }
    }
  };
  if (f.type === 'khr') {
    slab(10, 60, d1 - 1, 24, GRAVEL);
    slab(50.5, 63, -12, 24, CONCRETE);
    add('tractor', 24, 18.5, R() < 0.5 ? 0 : Math.PI, 1, 1, 1, tractor(), 1);
    if (R() < 0.7) add('trailer', 38, 19, 0, 1, 1, 1, R() < 0.5 ? 0x8a3a2a : 0x3a6a3a, 1);
    if (R() < 0.5) add('plough', 47, 20.5, Math.PI / 2, 1, 1, 1, R() < 0.5 ? 0xb8322a : 0x2f5fa8);
    if (R() < 0.5) add('shed', 61, -17.5, 0, 16, 1, 15, 0x6f7a6c, 1);
    else add('mestsilo', 59, -17, 0, 5, 1, 5, 0x8a9480, 1);
    if (R() < 0.75) add('barrack', 57, 7, 0, 1, 1, 1, 0xffffff, 1);
    if (R() < 0.3) add('towersilo', 55, 16, 0, 1, 1, 1, R() < 0.5 ? 0x3b5a7a : 0xa8aca8, 1);
    baleStack(30, -16, 0);
    shelter(4, 66, 68, 0);
  } else if (f.type === 'olda') {
    slab(12, 64, d1 - 1, 28, GRAVEL);
    slab(56.5, 72, -16, 28, CONCRETE);
    add('tractor', 28, 21.5, 0, 1, 1, 1, tractor(), 1);
    if (R() < 0.6) add('tractor', 44, 22, Math.PI, 1, 1, 1, tractor(), 1);
    add('trailer', 56, 22.5, 0, 1, 1, 1, R() < 0.5 ? 0x8a3a2a : 0x3a6a3a, 1);
    if (R() < 0.75) add('shed', 68, -21, 0, 16, 1, 18, R() < 0.5 ? 0x6f7a6c : 0x8a8a84, 1);
    if (R() < 0.6) add('plough', 64, 5, Math.PI / 2, 1.2, 1, 1.2, R() < 0.5 ? 0xb8322a : 0x2f5fa8);
    baleStack(34, -20, 0);
    shelter(4, 74, 77, 0);
  } else if (f.type === 'small') {
    slab(4, 30, d0, 16, GRAVEL);
    if (R() < 0.7) add('tractor', 16, 12.5, 0, 0.8, 0.8, 0.8, R() < 0.6 ? 0x3f7d3a : 0xb8322a, 1);
    if (R() < 0.55) add('shed', 34, -9.5, 0, 9, 0.7, 10, 0x7a6a58, 1);
    for (let i = 0; i < 6; i++) add('tree', 30 + (i % 3) * 5, 8 + Math.floor(i / 3) * 5, R() * 6, 0.5, 0.5, 0.5);
    if (R() < 0.6) add('bale', 38, 0, R() * 3, 1, 1, 1, 0xc9b26a);
    shelter(4, 40, 43, 1);
  } else {
    slab(9, 21, -17, 26, CONCRETE);
    slab(20, 86, 18, 25, CONCRETE);
    slab(80, 92, -17, 25, CONCRETE);
    add('feedsilo', 23, 21.5, 0, 1, 1, 1, 0x9aa6ae, 1);
    add('feedsilo', 27, 21.5, 0, 1, 1, 1, 0x9aa6ae, 1);
    add('clamp', 52, 28.5, 0, 1, 1, 1, 0xffffff, 1);
    add('mestsilo', 88, -9, 0, 7.5, 1, 7.5, 0x8a9480, 1);
    add('tractor', 84, 21.5, Math.PI / 2, 1, 1, 1, tractor(), 1);
    if (R() < 0.7) add('trailer', 70, 21.5, 0, 1, 1, 1, 0x3a6a8a, 1);
    if (R() < 0.5) baleStack(40, -23, 0);
    for (let lx = 6; lx <= 92; lx += 8) if (R() > 0.2) add(R() < 0.5 ? 'poplar' : 'tree', lx, -T.hw + 2.5, R() * 6, 0.9 + R() * 0.3, 0.9 + R() * 0.3, 0.9 + R() * 0.3);
    for (let lz = -T.hw + 3; lz <= T.hw - 3; lz += 8) if (R() > 0.2) add('tree', 96, lz, R() * 6, 1, 1, 1);
  }
  return it;
}

function mulberry(seed) {
  let s = (seed * 4294967296) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export { mulberry };

function makeFarm(x, y, angle, type, front, seed) {
  const ca = Math.round(Math.cos(angle)), sa = Math.round(Math.sin(angle));
  const T = FARM_TYPES[type];
  const f = { x, y, angle, ca, sa, type, front, seed, look: Math.floor(chash(Math.round(x), Math.round(y) + 7) * 3), lane: null };
  f.yard = localAabb(f, -1, T.depth, -T.hw, T.hw);
  f.full = localAabb(f, -front - 1, T.depth, -T.hw, T.hw);
  f.boxes = T.boxes.map((b) => localAabb(f, b[0], b[1], b[2], b[3]));
  return f;
}

// Radius of the round yard items, matching their countrymodels geometry.
const ROUND_ITEMS = { mestsilo: (it) => it.sx * 1.01, towersilo: () => 3, feedsilo: () => 1.2 };

// Yard furniture and its colliders, built on first use (near the player).
export function farmDetail(f) {
  if (f.items) return f;
  const R = mulberry(f.seed);
  f.items = farmItems(f, R);
  f.circles = [];
  for (const it of f.items) {
    const [wx, wy] = farmWorld(f, it.lx, it.lz);
    it.x = wx; it.y = wy;
    // tractors are real vehicles with their own bodies (parkedcars.js)
    if (!it.hit || it.kind === 'tractor') continue;
    // round silos collide as circles of their real radius, not boxes
    const round = ROUND_ITEMS[it.kind];
    if (round) { f.circles.push({ x: wx, y: wy, r: round(it) }); continue; }
    const r = it.kind === 'shed' ? null : it.kind === 'tractor' ? [2.2, 1.3] : it.kind === 'trailer' ? [3, 1.4] : it.kind === 'clamp' ? [16, 5.5] : it.kind === 'barrack' ? [2.7, 2.7] : [it.sx * (it.kind === 'mestsilo' ? 1 : 1.6), it.sz * (it.kind === 'mestsilo' ? 1 : 1.6)];
    if (it.kind === 'shed') f.boxes.push(localAabb(f, it.lx - it.sx / 2, it.lx + it.sx / 2, it.lz - it.sz / 2, it.lz + it.sz / 2));
    else {
      const q = Math.abs(Math.sin(it.rot)) > 0.7;
      const hx = q ? r[1] : r[0], hz = q ? r[0] : r[1];
      f.boxes.push(localAabb(f, it.lx - hx, it.lx + hx, it.lz - hz, it.lz + hz));
    }
  }
  return f;
}

// ------------------------------------------------------------------ blocks

const blockCache = new Map();
const bkey = (bx, by) => bx * 100003 + by;

export function blockPlanCached(bx, by) {
  return blockCache.get(bkey(bx, by)) || null;
}

// Builds the map-edge layout (once) and forgets plans made without it.
export function ensureCountryEdge(map) {
  if (EDGE.ready || !map) return;
  initCountryEdge(map);
  clearPlans();
}

// Forget every plan (the map-edge layout arrived after some were made).
export let planVersion = 0;
export function clearPlans() {
  planVersion++;
  blockCache.clear();
  villagePlans.clear();
}

export function blockPlan(bx, by) {
  const key = bkey(bx, by);
  let P = blockCache.get(key);
  if (P) return P;
  P = buildBlock(bx, by);
  blockCache.set(key, P);
  if (blockCache.size > 900) {
    // forget the oldest plans; they rebuild identically when needed
    let n = 0;
    for (const k of blockCache.keys()) { blockCache.delete(k); if (++n > 200) break; }
  }
  return P;
}

function roadBands(bx, by) {
  const out = [];
  const X = bx * BLOCK, Y = by * BLOCK;
  if (edgeRoad(bx, by, 0)) out.push([X + ROAD_IN - 2, Y - 1, X + ROAD_IN + ROAD_W + 2, Y + BLOCK + 1]);
  if (edgeRoad(bx, by, 1)) out.push([X - 1, Y + ROAD_IN - 2, X + BLOCK + 1, Y + ROAD_IN + ROAD_W + 2]);
  return out;
}

function buildBlock(bx, by) {
  const X = bx * BLOCK, Y = by * BLOCK;
  const P = { bx, by, farms: [], village: villageOf(bx, by), villageE: villageOf(bx + 1, by), gas: null, mill: null, blocked: [] };
  const inner = [X + 3, Y + 3, X + BLOCK - 3, Y + BLOCK - 3];
  const bands = roadBands(bx, by);
  const villages = [P.village, P.villageE].filter(Boolean);
  const nearVillage = (x, y, m) => villages.some((v) => Math.hypot(x - v.x, y - v.y) < v.r + m);
  const boxOk = (b) => {
    if (b[0] < inner[0] || b[1] < inner[1] || b[2] > inner[2] || b[3] > inner[3]) return false;
    for (const q of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]], [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]]) if (!openLand(q[0], q[1]) || edgeBlocked(q[0], q[1], 4)) return false;
    for (const v of villages) {
      const cx = Math.max(b[0], Math.min(v.x, b[2])), cy = Math.max(b[1], Math.min(v.y, b[3]));
      if (Math.hypot(cx - v.x, cy - v.y) < v.r + 8) return false;
    }
    for (const q of P.blocked) if (overlap(b, q, 6)) return false;
    return true;
  };

  // gas production site (a Groningen wink), beside the low-x polder road
  if (!P.village && edgeRoad(bx, by, 0) && chash(bx * 41 + 9, by * 43 + 1) < 0.08) {
    const gy = Y + 260 + chash(bx - 4, by + 44) * 420;
    const box = [X + ROAD_IN + ROAD_W + 6, gy - 20, X + ROAD_IN + ROAD_W + 62, gy + 20];
    if (boxOk(box) && !bands.slice(1).some((q) => overlap(box, q))) {
      P.gas = { x: box[0], y: gy, box, seed: chash(bx + 5, by - 5) };
      P.blocked.push(box);
    }
  }
  const tryFarm = (x, y, angle, front, seed, typeH, laneFrom) => {
    const type = pickType(x, y, typeH);
    const f = makeFarm(x, y, angle, type, front, seed);
    if (!boxOk(f.yard)) return false;
    for (const q of bands) if (overlap(f.yard, q, 1)) return false;
    if (laneFrom) {
      const T = FARM_TYPES[type];
      const [d0, d1] = T.drive;
      const lane = localAabb(f, -laneFrom, 0, d0 + 0.6, d1 - 0.6);
      for (const q of P.blocked) if (overlap(lane, q, 1)) return false;
      f.lane = lane;
      f.laneLen = laneFrom;
    }
    if (countryWeight(x, y) < 0.99) return false;
    P.farms.push(f);
    P.blocked.push(f.yard);
    if (f.lane) P.blocked.push(f.lane);
    return true;
  };

  // farmsteads every couple of hundred metres along the polder roads, on
  // both sides; the far side belongs to the neighbouring block's road
  const roads = [];
  if (edgeRoad(bx, by, 0)) roads.push({ v: true, fixed: X + ROAD_IN + ROAD_W + 11, angle: 0, front: 11, off: 0 });
  if (edgeRoad(bx + 1, by, 0) && !maarX(bx + 1)) roads.push({ v: true, fixed: X + BLOCK - 11, angle: Math.PI, front: 16, off: 100 });
  if (edgeRoad(bx, by, 1)) roads.push({ v: false, fixed: Y + ROAD_IN + ROAD_W + 11, angle: Math.PI / 2, front: 11, off: 50 });
  if (edgeRoad(bx, by + 1, 1) && !maarY(by + 1)) roads.push({ v: false, fixed: Y + BLOCK - 11, angle: -Math.PI / 2, front: 16, off: 150 });
  roads.forEach((r, ri) => {
    for (let k = 0; k < 5; k++) {
      const h = chash(bx * 97 + ri * 13 + k, by * 89 + k * 7);
      if (h > 0.66) continue;
      const t = 80 + r.off + k * 200 + (chash(bx + k * 5, by - ri * 3) - 0.5) * 60;
      if (t > BLOCK - 50) continue;
      const x = r.v ? r.fixed : X + t, y = r.v ? Y + t : r.fixed;
      tryFarm(x, y, r.angle, r.front, chash(bx * 7 + ri, by * 11 + k * 3 + 1), chash(bx * 3 + k, by * 5 + ri + 77));
    }
  });

  // farms on their own terp out in the fields, reached by a long lane
  for (let k = 0; k < 2; k++) {
    if (chash(bx * 19 + k, by * 23 + 5) > 0.55) continue;
    const lx = 200 + chash(bx - k * 7, by + 31) * 560, ly = 200 + chash(bx + 13, by - k * 9 + 2) * 560;
    let ok = false;
    if (edgeRoad(bx, by, 0)) ok = tryFarm(X + lx, Y + ly, 0, 0, chash(bx + k, by * 3 + 9), chash(bx * 5 - k, by + 3), lx - ROAD_IN - ROAD_W);
    if (!ok && edgeRoad(bx, by, 1)) tryFarm(X + lx, Y + ly, Math.PI / 2, 0, chash(bx + k, by * 3 + 9), chash(bx * 5 - k, by + 3), ly - ROAD_IN - ROAD_W);
  }
  return P;
}

// ------------------------------------------------------------------ villages

const NAMES = [
  // sectors clockwise from north (world -y is north, +x east)
  ['Adorp', 'Sauwerd', 'Winsum', 'Baflo', 'Onderdendam', 'Warffum', 'Usquert', 'Uithuizen', 'Kantens', 'Rottum'],
  ['Bedum', 'Ten Post', 'Stedum', 'Middelstum', 'Loppersum', 'Zeerijp', "'t Zandt", 'Uithuizermeeden', 'Roodeschool', 'Spijk'],
  ['Garmerwolde', 'Thesinge', 'Ten Boer', 'Woltersum', 'Wittewierum', 'Garrelsweer', 'Appingedam', 'Delfzijl', 'Farmsum', 'Termunten'],
  ['Engelbert', 'Harkstede', 'Scharmer', 'Slochteren', 'Kolham', 'Siddeburen', 'Hoogezand', 'Meeden', 'Scheemda', 'Winschoten'],
  ['Haren', 'Glimmen', 'Onnen', 'Noordlaren', 'Zuidlaren', 'Midlaren', 'Tynaarlo', 'Vries', 'Zeegse', 'Anloo'],
  ['Hoogkerk', 'Eelde', 'Paterswolde', 'Peize', 'Roden', 'Leek', 'Tolbert', 'Nietap', 'Zevenhuizen', 'Marum'],
  ['Dorkwerd', 'Aduard', 'Den Horn', 'Zuidhorn', 'Noordhorn', 'Oldehove', 'Niekerk', 'Grijpskerk', 'Visvliet', 'Kommerzijl'],
  ['Wierumerschouw', 'Garnwerd', 'Ezinge', 'Feerwerd', 'Den Ham', 'Saaksum', 'Mensingeweer', 'Eenrum', 'Pieterburen', 'Kloosterburen'],
];

const villagePlans = new Map();
export function villagePlan(v) {
  const key = v.bx * 100003 + v.by;
  let V = villagePlans.get(key);
  if (V) return V;
  const R = mulberry(chash(v.bx * 5 + 1, v.by * 7 + 3));
  const r = countryRect();
  const dx = v.x - r.cx, dy = v.y - r.cy;
  const ang = Math.atan2(dx, -dy); // 0 = north, clockwise
  const sector = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
  // past the province's tiles: names its places do not use already
  let list = NAMES[sector];
  const used = worldPlaceNames();
  if (used.size) {
    const free = list.filter((n) => !used.has(n));
    if (free.length) list = free;
  }
  const ring = Math.max(0, Math.hypot(dx, dy) - Math.max(r.hx, r.hy));
  let idx = Math.min(list.length - 1, Math.floor(ring / 2600) + (chash(v.bx, v.by + 1) < 0.35 ? 1 : 0));
  V = { v, name: list[idx], houses: [], trees: [], graves: [], hedges: [], saddle: chash(v.bx + 3, v.by) < 0.62, colliders: [] };
  const roadX = v.x - VILLAGE_X + ROAD_C;
  // angle: world heading of the house's back (its front faces the street)
  const house = (x, y, angle, kind) => {
    if (!openLand(x, y) || edgeBlocked(x, y, 3)) return;
    const p = parcelAt(x, y);
    if (p.road) return;
    V.houses.push({ x, y, angle, kind: kind ?? Math.floor(R() * 4), look: Math.floor(R() * 3) });
    V.colliders.push({ x, y, r: 5.2 });
  };
  // ring of houses round the church terp, fronts to the ring street
  for (const [rad, step, skipW] of [[44, 13, 0.9], [72, 17, 0.8]]) {
    if (rad + 8 > v.r) continue;
    const n = Math.floor((Math.PI * 2 * rad) / step);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (R() - 0.5) * 0.06;
      if (Math.cos(a) < -Math.cos(skipW)) continue;
      if (rad > 60 && R() < 0.3) continue;
      const x = v.x + Math.cos(a) * rad, y = v.y + Math.sin(a) * rad;
      house(x, y, a);
      if (R() < 0.55) V.trees.push({ x: v.x + Math.cos(a) * (rad + 10), y: v.y + Math.sin(a) * (rad + 10), s: 0.8 + R() * 0.4 });
    }
  }
  // houses both sides of the polder road through the village
  for (let t = -v.r + 12; t < v.r - 8; t += 13 + R() * 4) {
    if (Math.abs(t) < VILLAGE_RING + 10) continue;
    const y = v.y + t;
    if (R() < 0.85) house(roadX + 11, y, 0, R() < 0.5 ? 1 : undefined);
    if (R() < 0.7) house(roadX - 15, y, Math.PI);
  }
  // lime trees on the terp and a ring of trees round the village
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    V.trees.push({ x: v.x + Math.cos(a) * 27.5, y: v.y + Math.sin(a) * 27.5, s: 0.9 + R() * 0.3 });
  }
  const edgeN = Math.floor((Math.PI * 2 * v.r * 0.92) / 11);
  for (let i = 0; i < edgeN; i++) {
    if (R() < 0.3) continue;
    const a = (i / edgeN) * Math.PI * 2;
    const x = v.x + Math.cos(a) * v.r * (0.9 + R() * 0.06), y = v.y + Math.sin(a) * v.r * (0.9 + R() * 0.06);
    if (Math.abs(x - roadX) < 7 || !openLand(x, y)) continue;
    V.trees.push({ x, y, s: 0.9 + R() * 0.4, poplar: R() < 0.3 });
  }
  // graves on the terp round the church
  for (let gx = -13; gx <= 13; gx += 2.2) {
    for (let gz = -13; gz <= 13; gz += 2.6) {
      if (Math.hypot(gx, gz) > 14.5 || (Math.abs(gz) < 6.5 && gx > -15 && gx < 13.5) || R() < 0.35) continue;
      V.graves.push({ x: v.x + gx, y: v.y + gz, rot: (R() - 0.5) * 0.15, s: 0.8 + R() * 0.4 });
    }
  }
  V.colliders.push({ x: v.x, y: v.y, r: 23 });
  villagePlans.set(key, V);
  return V;
}

// Villages in a square window, nearest first.
export function villagesAround(x, y, radius) {
  const out = [];
  const b0x = Math.floor((x - radius) / BLOCK), b1x = Math.floor((x + radius) / BLOCK);
  const b0y = Math.floor((y - radius) / BLOCK), b1y = Math.floor((y + radius) / BLOCK);
  for (let by = b0y; by <= b1y; by++) {
    for (let bx = b0x; bx <= b1x; bx++) {
      const v = villageOf(bx, by);
      if (!v) continue;
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < radius) out.push({ v, d });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return out;
}

// ------------------------------------------------------------------ signs

// Place-name signs at the village ends and direction signs at junctions.
export function blockSigns(bx, by) {
  const P = blockPlan(bx, by);
  if (P.signs) return P.signs;
  const signs = [];
  const X = bx * BLOCK, Y = by * BLOCK;
  const v = P.village;
  if (v) {
    const name = villagePlan(v).name;
    const roadX = X + ROAD_C;
    signs.push({ kind: 'place', text: name, x: roadX - 4.3, y: v.y - v.r - 6, rot: 0 });
    signs.push({ kind: 'place', text: name, x: roadX + 4.3, y: v.y + v.r + 6, rot: Math.PI });
  }
  if (edgeRoad(bx, by, 0) && edgeRoad(bx, by, 1)) {
    const jx = X + ROAD_C, jy = Y + ROAD_C;
    const arms = [[1, 0], [0, 1]];
    if (edgeRoad(bx - 1, by, 1)) arms.push([-1, 0]);
    if (edgeRoad(bx, by - 1, 0)) arms.push([0, -1]);
    const near = villagesAround(jx, jy, 9000);
    const blades = [];
    const used = new Set();
    for (const [ax, ay] of arms) {
      let best = null;
      for (const { v: w, d } of near) {
        if (d < 150) continue;
        const c = ((w.x - jx) * ax + (w.y - jy) * ay) / d;
        if (c < 0.6) continue;
        const name = villagePlan(w).name;
        if (used.has(name)) continue;
        best = { name, km: Math.max(1, Math.round(d / 1000)) };
        break;
      }
      if (!best) continue;
      used.add(best.name);
      blades.push({ ax, ay, text: best.name, km: best.km });
    }
    if (blades.length) signs.push({ kind: 'junction', x: jx + 5.6, y: jy + 5.6, blades });
  }
  P.signs = signs;
  return signs;
}

// ------------------------------------------------------------------ queries

// Farm whose yard, drive or lane covers (x, y): for props and reeds.
export function farmAt(x, y, margin = 0) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  const lx = x - bx * BLOCK, ly = y - by * BLOCK;
  const check = (P) => {
    for (const f of P.farms) {
      if (inBox(f.full, x, y, margin) || (f.lane && inBox(f.lane, x, y, margin))) return f;
    }
    if (P.gas && inBox(P.gas.box, x, y, margin + 2)) return P.gas;
    return null;
  };
  let f = check(blockPlan(bx, by));
  // drives of the far-side farms cross into this block's road verge
  if (!f && lx < 24) f = check(blockPlan(bx - 1, by));
  if (!f && ly < 24) f = check(blockPlan(bx, by - 1));
  return f;
}

export function inVillage(x, y, margin = 0) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  for (const v of [villageOf(bx, by), villageOf(bx + 1, by)]) if (v && Math.hypot(x - v.x, y - v.y) < v.r + margin) return v;
  return null;
}

// Hard surface for gameplay (yards, drives, lanes): no meadow slowdown.
export function onFarmPaving(x, y) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  const lx = x - bx * BLOCK, ly = y - by * BLOCK;
  const list = [blockPlan(bx, by)];
  if (lx < 24) list.push(blockPlan(bx - 1, by));
  if (ly < 24) list.push(blockPlan(bx, by - 1));
  for (const P of list) {
    for (const f of P.farms) {
      if (f.lane && inBox(f.lane, x, y)) return true;
      if (!inBox(f.full, x, y)) continue;
      const [flx, flz] = farmLocal(f, x, y);
      for (const it of farmDetail(f).items) {
        if (it.kind !== 'slab') continue;
        if (Math.abs(flx - it.lx) < it.sx / 2 && Math.abs(flz - it.lz) < it.sz / 2) return true;
      }
    }
    if (P.gas && inBox(P.gas.box, x, y)) return true;
  }
  return false;
}

function pushBox(obj, b, radius) {
  const x0 = b[0] - radius, x1 = b[2] + radius, y0 = b[1] - radius, y1 = b[3] + radius;
  if (obj.x <= x0 || obj.x >= x1 || obj.y <= y0 || obj.y >= y1) return false;
  const opts = [[obj.x - x0, x0, obj.y], [x1 - obj.x, x1, obj.y], [obj.y - y0, obj.x, y0], [y1 - obj.y, obj.x, y1]];
  opts.sort((u, v) => u[0] - v[0]);
  obj.x = opts[0][1]; obj.y = opts[0][2];
  return true;
}
function pushCircle(obj, cx, cy, r, radius) {
  const dx = obj.x - cx, dy = obj.y - cy, d = Math.hypot(dx, dy), R = r + radius;
  if (d >= R) return false;
  const k = d > 1e-4 ? R / d : 0;
  obj.x = cx + (k ? dx * k : R);
  obj.y = cy + (k ? dy * k : 0);
  return true;
}

// Solid circles other modules keep up to date (ommelandfun.js: the props of
// the wereldeinden and the dorpsuitjes): [{ x, y, r }].
let extraSolids = [];
export function setExtraSolids(list) {
  extraSolids = list;
}
export function planExtraSolids() {
  return extraSolids;
}

// Keeps obj ({x, y}) out of every building, silo, mast and terp.
export function pushOutOfPlan(obj, radius) {
  const bx = Math.floor(obj.x / BLOCK), by = Math.floor(obj.y / BLOCK);
  let hit = false;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const P = blockPlanCached(bx + ox, by + oy) || (ox === 0 && oy === 0 ? blockPlan(bx, by) : null);
      if (!P) continue;
      for (const f of P.farms) {
        if (!inBox(f.yard, obj.x, obj.y, radius + 2)) continue;
        const fd = farmDetail(f);
        for (const b of fd.boxes) if (pushBox(obj, b, radius)) hit = true;
        for (const c of fd.circles) if (pushCircle(obj, c.x, c.y, c.r, radius)) hit = true;
      }
      if (P.gas && pushBox(obj, [P.gas.box[0] + 2, P.gas.box[1], P.gas.box[2], P.gas.box[3]], radius)) hit = true;
      if (ox === 0 && oy === 0) {
        for (const v of [P.village, P.villageE]) {
          if (!v || Math.hypot(obj.x - v.x, obj.y - v.y) > v.r + 10) continue;
          for (const c of villagePlan(v).colliders) if (pushCircle(obj, c.x, c.y, c.r, radius)) hit = true;
        }
      }
    }
  }
  for (const c of farSolidsNear(obj.x, obj.y, radius)) if (pushCircle(obj, c.x, c.y, c.r, radius)) hit = true;
  for (const c of extraSolids) if (Math.abs(obj.x - c.x) < c.r + radius && Math.abs(obj.y - c.y) < c.r + radius && pushCircle(obj, c.x, c.y, c.r, radius)) hit = true;
  return hit;
}
