import { markInstancesDirty } from './util.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createTerrainMaterial } from './terrain3d.js';
import {
  BLOCK, PW, PL, DITCH_HW, MAIN_HW, MAAR_HW, MAAR_WATER, ROAD_IN, ROAD_W,
  chash, countryWeight, countryRect, edgeDistance, parcelAt, parcelUse, blockToWorld, edgeRoad, maarX, maarY, villageOf,
} from './countryfield.js';
import { SkinBuilder, vcMaterial, tubeGeometry, loftGeometry, markShared, composeMatrix } from './pixelart3d.js';
import { buildCowMesh3D, buildSheepMesh3D, buildDuckMesh3D, animateWildlifeMesh3D, runOverAnimal, poseDeadAnimal } from './wildlife.js';
import { distToVehicleBody } from './vehicle.js';
import * as M3 from './countrymodels.js';
import {
  ROAD_C, FARM_TYPES, TREE_ROW_P, WILLOW_ROW_P, HEDGE_ROW_P, WIRE_ROW_P, ROAD_ROW,
  openLand, blockPlan, farmDetail, villagePlan, blockSigns, farmAt, inVillage, pushOutOfPlan,
} from './countryplan.js';
import { updateFarProps, farPropsStats } from './farprops.js';
import { updateCountryLife, lifeStats } from './countrylife.js';
import { buildSign, disposeSign } from './countrysigns.js';
import { EDGE, edgeBlocked, edgeSpanBlocked, roadGap, nearRail, landUseAt, hedgeMapped } from './countryedge.js';
import { ensureCountryEdge } from './countryplan.js';
import { thinDitchOn, ditchRamp, provinceBlock, countrySurface, osmDitchesAt } from './countryfield.js';
import { urbanWeight } from './provinceworld.js';
import { setTileWalls, clearTileWalls, pushOutOfWalls, setTileTrunks, clearTileTrunks, pushOutOfTrunks } from './countrywalls.js';
import { glowMaterial, poolGeometry } from './countryglow.js';
import { updateTileWater, tileWaterStats } from './tilewatermask.js';
import { waterAt } from './waterlevels.js';
import { propRadius } from './viewdist.js';

// Endless Ommelanden past the real map: a ground ring that follows the
// player (same terrain shader, so the feathered edge in terrain3d continues
// without a seam), deterministic prop tiles streamed around the player
// within a per-frame budget, and grazing herds that react to the player.
// What stands where comes from countryplan (farmsteads every few hundred
// metres, wierde villages, gas sites); farprops.js draws the real turbines and
// pylons and countrylife the traffic, boats and birds.
// Everything is instanced per prop type; only the nearest animals get rigs.

const TILE = 160;
const GROUND_Y = -0.05;
const GROUND_HALF = 4000;
const GROUND_SNAP = 500;
const GEN_BUDGET_MS = 1.2;
const REED_R = 230;
const SIM_R = 170;
const SKIN_R = 90;
const SKIN_MAX = 28;
const SHADOW_MAX = 8;
const SIGN_R = 260;

let S = null;

// ------------------------------------------------------------------ geometry

function loftX(rings, sides = 8) {
  const g = loftGeometry(rings.map((r) => ({ y: r.u, d: r.hh, w: r.hw, x: -r.cy })), sides, Math.PI / sides);
  g.rotateZ(-Math.PI / 2);
  const parts = [g];
  const a = rings[0], b = rings[rings.length - 1];
  const capA = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(-Math.PI / 2);
  capA.scale(1, a.hh, a.hw).translate(a.u, a.cy, 0);
  const capB = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(Math.PI / 2);
  capB.scale(1, b.hh, b.hw).translate(b.u, b.cy, 0);
  parts.push(capA.toNonIndexed(), capB.toNonIndexed());
  const pos = [];
  for (const p of parts) pos.push(...p.attributes.position.array);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}

// ------------------------------------------------------------------ horse

const HORSE_SPEC = [
  ['body', null, 0, 1.35, 0],
  ['head', 'body', 0.62, 1.5, 0],
  ['tail', 'body', -0.82, 1.52, 0],
  ['legFL', 'body', 0.55, 1.2, 0.17],
  ['legFR', 'body', 0.55, 1.2, -0.17],
  ['legBL', 'body', -0.6, 1.2, 0.17],
  ['legBR', 'body', -0.6, 1.2, -0.17],
];
const HORSE_COATS = [
  { coat: 0x6b3f22, mane: 0x1f1a17, sock: 0x1f1a17 },
  { coat: 0x8a4a24, mane: 0x5a2e16, sock: 0xd8d2c6 },
  { coat: 0xc9c4bb, mane: 0x8a867e, sock: 0x8a867e },
  { coat: 0x2c2724, mane: 0x151210, sock: 0x151210 },
];

function horseGeometry(v) {
  const C = HORSE_COATS[v];
  const I = {};
  HORSE_SPEC.forEach(([n], i) => { I[n] = i; });
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(loftX([
    { u: -0.86, cy: 1.42, hh: 0.2, hw: 0.17 },
    { u: -0.74, cy: 1.38, hh: 0.31, hw: 0.26 },
    { u: -0.4, cy: 1.34, hh: 0.33, hw: 0.27 },
    { u: 0.1, cy: 1.33, hh: 0.33, hw: 0.26, front: 1.1 },
    { u: 0.5, cy: 1.38, hh: 0.33, hw: 0.24 },
    { u: 0.72, cy: 1.45, hh: 0.26, hw: 0.2 },
  ], 10), null, C.coat);
  for (const [name, x, z] of [['legFL', 0.55, 0.17], ['legFR', 0.55, -0.17], ['legBL', -0.6, 0.17], ['legBR', -0.6, -0.17]]) {
    B.bone = I[name];
    const back = x < 0;
    B.geo(loftGeometry([
      { y: 0.06, d: 0.055, w: 0.055 },
      { y: 0.28, d: 0.045, w: 0.045 },
      { y: 0.55, d: back ? 0.07 : 0.055, w: 0.055, x: back ? -0.03 : 0 },
      { y: 0.9, d: back ? 0.12 : 0.09, w: 0.085, x: back ? -0.02 : 0 },
      { y: 1.25, d: 0.14, w: 0.11 },
    ], 6), composeMatrix(x, 0, z), (px, py) => (py < 0.3 ? C.sock : C.coat));
    B.box(x + 0.01, 0.04, z, 0.13, 0.08, 0.12, 0x2a2622);
  }
  B.bone = I.head;
  B.geo(tubeGeometry([0.55, 1.5, 0], [0.98, 2.02, 0], 0.2, 0.13, 7), null, C.coat);
  B.box(0.72, 1.93, 0, 0.42, 0.14, 0.05, C.mane, 0, 0, 0, 0.87);
  B.geo(tubeGeometry([0.9, 2.05, 0], [1.34, 1.72, 0], 0.13, 0.085, 7), null, C.coat);
  B.box(1.35, 1.71, 0, 0.08, 0.14, 0.15, 0x3a2e28);
  for (const s of [1, -1]) {
    B.geo(new THREE.ConeGeometry(0.035, 0.14, 4), composeMatrix(0.92, 2.2, s * 0.07, s * -0.3, 0, 0), C.coat);
    B.box(1.08, 1.98, s * 0.1, 0.04, 0.04, 0.02, 0x111111);
  }
  B.box(0.98, 2.1, 0, 0.12, 0.08, 0.1, C.mane);
  B.bone = I.tail;
  B.geo(tubeGeometry([-0.84, 1.55, 0], [-1.02, 0.75, 0], 0.075, 0.04, 5), null, C.mane);
  return B.build();
}

const HORSE_MAT = markShared(vcMaterial({ roughness: 0.9 }));
const horseGeoCache = [];

export function buildHorseMesh(v) {
  const geo = horseGeoCache[v] || (horseGeoCache[v] = markShared(horseGeometry(v)));
  const group = new THREE.Group();
  const bones = [], byName = {}, abs = {};
  for (const [name, parent, x, y, z] of HORSE_SPEC) {
    const b = new THREE.Bone();
    abs[name] = [x, y, z];
    if (parent) {
      const p = abs[parent];
      b.position.set(x - p[0], y - p[1], z - p[2]);
      byName[parent].add(b);
    } else b.position.set(x, y, z);
    bones.push(b);
    byName[name] = b;
  }
  group.add(bones[0]);
  const mesh = new THREE.SkinnedMesh(geo, HORSE_MAT);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.1, 0), 1.8);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  for (const b of bones) b.userData.rest = b.position.clone();
  Object.assign(group.userData, {
    bones: byName, head: byName.head, headBaseRotZ: 0, legs: [byName.legFL, byName.legFR, byName.legBL, byName.legBR], tail: byName.tail, grazeDip: 0.95,
  });
  return group;
}

// ------------------------------------------------------------------ animals

const KINDS = {
  cow: { walk: 0.55, run: 2.6, scare: 7, shadow: [1.3, 0.75], radius: 1.1 },
  sheep: { walk: 0.45, run: 3.2, scare: 9, shadow: [0.9, 0.6], radius: 0.6 },
  horse: { walk: 0.7, run: 5.5, scare: 11, shadow: [1.4, 0.7], radius: 1.1 },
  goose: { walk: 0.35, run: 2.2, scare: 12, shadow: [0.45, 0.3], radius: 0.4 },
  duck: { walk: 0.3, run: 1.4, scare: 8, shadow: null, radius: 0.3 },
};

function animalKey(a) {
  if (a.kind === 'cow') return (a.variant === 'red' ? 'cowred' : 'cow') + (Math.floor(a.bobSeed * 1000) % 4);
  if (a.kind === 'horse') return 'horse' + a.variant;
  return a.kind;
}

const GOOSE_LEG = new THREE.MeshStandardMaterial({ color: 0xd9803a, roughness: 0.8, flatShading: true });
const GOOSE_LEG_GEO = new THREE.BoxGeometry(0.02, 0.1, 0.02).translate(0, -0.05, 0);

function buildAnimalMesh(a) {
  switch (a.kind) {
    case 'cow': return buildCowMesh3D(a.bobSeed, a.variant === 'red');
    case 'sheep': return buildSheepMesh3D();
    case 'horse': return buildHorseMesh(a.variant);
    case 'goose': {
      const g = buildDuckMesh3D('goose');
      for (const s of [1, -1]) {
        const leg = new THREE.Mesh(GOOSE_LEG_GEO, GOOSE_LEG);
        leg.position.set(0, 0.0, s * 0.03);
        g.add(leg);
      }
      return g;
    }
    default: return buildDuckMesh3D(chash(Math.floor(a.bobSeed * 1e5), 1) < 0.5 ? 'drake' : 'hen');
  }
}

function templateGeometry(key) {
  const probe = { kind: 'cow', variant: null, bobSeed: 0 };
  if (key.startsWith('cowred')) Object.assign(probe, { variant: 'red', bobSeed: (+key.slice(6)) / 1000 });
  else if (key.startsWith('cow')) probe.bobSeed = (+key.slice(3)) / 1000;
  else if (key.startsWith('horse')) Object.assign(probe, { kind: 'horse', variant: +key.slice(5) });
  else probe.kind = key;
  const m = buildAnimalMesh(probe);
  let geo = null, mat = null;
  m.traverse((o) => { if (o.isSkinnedMesh && !geo) { geo = o.geometry; mat = o.material; } });
  return { geo, mat, scale: m.scale.x };
}

function newAnimal(kind, variant, x, y, rect, rng) {
  return {
    kind, variant, x, y, angle: rng() * Math.PI * 2, speed: 0, stride: 0, bobSeed: rng(),
    rect, hx: x, hy: y, tx: x, ty: y, timer: rng() * 6, flee: 0, fx: 0, fy: 0, state: 'swim', stateTimer: 5, stateAge: 0, size: 1,
  };
}

// ------------------------------------------------------------------ tiles

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

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

// code: the facade code of a building piece (countrybuilding.js bldCode),
// folded into the red channel on top of the tint
// Clearance (m) each kind keeps from the edge of a road, cycle path or
// drive (countryedge.js roadGap, what the ground shader paints): crowns
// and hedges stay off the asphalt, posts and reeds may reach the verge.
// Kinds not listed (bridges, paving, real buildings, glow) are not held back.
const ROAD_CLEAR = {
  tree: 1.2, poplar: 1.2, willow: 1.2, hedge: 1.0, post: 0.3, wire: 0.3, gate: 0.5, bale: 1.0, reed: 0.3,
  barrack: 1.5, shed: 1.5, mestsilo: 1.5, towersilo: 1.5, feedsilo: 1.5, clamp: 1.5, plough: 1,
  tractorBody: 1, tractorBase: 1, trailerBody: 1, trailerBase: 1, grave: 0.5, glass: 1.5, clubhouse: 1.5,
  mast: 0.5, goal: 1, bank: 0.5, rush: 0.3,
};
const clearOfRoad = (x, y, m) => roadGap(x, y, m + 0.5) >= m;

function push(tile, type, x, y, rotY, sx, sy, sz, color = 0xffffff, jitter = 0.08, yOff = 0, code = 0) {
  const clear = ROAD_CLEAR[type];
  if (clear !== undefined) {
    if (!clearOfRoad(x, y, clear)) return false;
    // a hedge piece lies over the tiles' water, roads or houses at its ends or in between (issue #124)
    if (type === 'hedge') {
      const hx = Math.cos(rotY) * sx * 0.5, hy = -Math.sin(rotY) * sx * 0.5;
      if (edgeSpanBlocked(x - hx, y - hy, x + hx, y + hy, 0.5, 1.3)) return false;
    }
    if (type === 'wire') {
      // the span's ends too: a wire may not cross a lane
      const hx = Math.cos(rotY) * sx * 0.5, hy = -Math.sin(rotY) * sx * 0.5;
      if (!clearOfRoad(x + hx, y + hy, clear) || !clearOfRoad(x - hx, y - hy, clear)) return false;
      // and the wire between them: not across the tiles' water either (issue #185)
      if (edgeSpanBlocked(x - hx, y - hy, x + hx, y + hy, 0.5, 1.3)) return false;
    }
  }
  // hedges and wire fences are low walls you vault (countrywalls.js); the
  // lowest strand stands for the whole fence
  const wall = type === 'hedge' ? [Math.min(1.25, 1.15 * sy), 0.3 * sz] : type === 'wire' && yOff < 0.62 ? [1.15, 0.08] : null;
  if (wall && tile.tx !== undefined) {
    const hl = type === 'hedge' ? 0.5 * sx : sx / 2;
    const hx = Math.cos(rotY) * hl, hy = -Math.sin(rotY) * hl;
    (tile.walls || (tile.walls = [])).push(x - hx, y - hy, x + hx, y + hy, wall[0], wall[1]);
  }
  // a trunk is solid like the city's trees (0.22 m radius there, scaled with the crown)
  if ((type === 'tree' || type === 'poplar' || type === 'willow') && tile.tx !== undefined) {
    (tile.trunks || (tile.trunks = [])).push(x, y, x, y, 99, 0.22 * Math.max(0.8, Math.min(sx, sz)));
  }
  const list = tile.items[type] || (tile.items[type] = { m: [], c: [] });
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m4.compose(_p.set(x, GROUND_Y + yOff, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m4.elements[i]);
  _c.set(color);
  const j = 1 + (chash(Math.round(x * 10), Math.round(y * 10)) - 0.5) * jitter * 2;
  list.c.push(Math.min(1.99, _c.r * j) + code * 2, _c.g * j, _c.b * j);
  return true;
}

function okSpot(x, y, clearDitch = 0) {
  if (!openLand(x, y) || farmAt(x, y, 1) || inVillage(x, y, 3) || edgeBlocked(x, y, 2)) return false;
  const p = parcelAt(x, y);
  if (p.road || p.dMain < MAIN_HW + 0.6 || p.dMaar < MAAR_HW + 0.8) return false;
  return p.dDitch >= clearDitch && clearOfRoad(x, y, 1.5);
}

function inTile(tile, x, y) {
  const x0 = tile.tx * TILE, y0 = tile.ty * TILE;
  return x >= x0 && x < x0 + TILE && y >= y0 && y < y0 + TILE;
}

// A generator: the tile is laid out a section at a time, so streaming can
// spread a dense one (a village, a farm cluster) over several frames.
function* genTileSteps(tx, ty) {
  const tile = { tx, ty, items: {}, animals: [], flocks: [], signs: [], farms: 0, cx: (tx + 0.5) * TILE, cy: (ty + 0.5) * TILE };
  const x0 = tx * TILE, y0 = ty * TILE;
  const bx = Math.floor(x0 / BLOCK), by = Math.floor(y0 / BLOCK);
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const lx0 = x0 - bx * BLOCK, ly0 = y0 - by * BLOCK;
  const aMin = rot ? ly0 : lx0, bMin = rot ? lx0 : ly0;
  const aMax = aMin + TILE, bMax = bMin + TILE;
  const R = mulberry(chash(tx * 3 + 1, ty * 5 + 2));
  const W = (a, b) => blockToWorld(bx, by, rot, a, b);
  const lineAng = rot ? 0 : Math.PI / 2; // three rotY that lays local +X along the strip direction b
  const plan = blockPlan(bx, by);
  yield;

  // strip-boundary lines: tree rows, hedges, electric fences
  for (let col = Math.ceil(aMin / PW); col * PW < aMax; col++) {
    if (col <= 0) continue;
    const a = col * PW;
    const lh = chash(col + bx * 131 + 900, by * 977 + (rot ? 7 : 3));
    const side = chash(col + 3, by + bx) < 0.5 ? -1 : 1;
    if (lh < TREE_ROW_P) {
      const willow = lh < WILLOW_ROW_P;
      for (let b = Math.ceil(bMin / 7) * 7; b < bMax; b += 7) {
        const [x, y] = W(a + side * 2.1, b + (R() - 0.5) * 1.5);
        if (!fadeKeep(x, y) || !okSpot(x, y, 1.6)) continue;
        push(tile, willow ? 'willow' : 'tree', x, y, R() * 6.28, 0.85 + R() * 0.3, 0.85 + R() * 0.35, 0.85 + R() * 0.3, 0xffffff, 0.1);
      }
    } else if (lh < HEDGE_ROW_P) {
      for (let b = Math.ceil(bMin / 2.2) * 2.2; b < bMax; b += 2.2) {
        const [x, y] = W(a + side * 2.0, b);
        if (!fadeKeep(x, y) || !okSpot(x, y, 1.5)) continue;
        push(tile, 'hedge', x, y, lineAng + (R() - 0.5) * 0.3, 2.6, 0.9 + R() * 0.35, 1.3, 0xffffff, 0.08);
      }
    } else if (lh < WIRE_ROW_P) {
      let run = null;
      const flush = () => {
        if (!run || run.n < 2) { run = null; return; }
        const len = Math.hypot(run.x1 - run.x0, run.y1 - run.y0);
        const mx = (run.x0 + run.x1) / 2, my = (run.y0 + run.y1) / 2;
        const ang = -Math.atan2(run.y1 - run.y0, run.x1 - run.x0);
        for (const h of [0.45, 0.85]) push(tile, 'wire', mx, my, ang, len, 1, 1, 0xffffff, 0, h);
        run = null;
      };
      for (let b = Math.ceil(bMin / 3.5) * 3.5; b < bMax; b += 3.5) {
        const [x, y] = W(a + side * 1.6, b);
        if (!fadeKeep(x, y) || !okSpot(x, y, 1.4) || landUseAt(x, y) === 'akker') { flush(); continue; }
        push(tile, 'post', x, y, R() * 6.28, 1, 0.9 + R() * 0.2, 1, 0xffffff, 0.12);
        if (!run) run = { x0: x, y0: y, x1: x, y1: y, n: 1 };
        else { run.x1 = x; run.y1 = y; run.n++; }
      }
      flush();
    }
  }
  yield;
  genFieldEdges(tile, bx, by, rot, aMin, bMin, W);
  yield;

  // polder-road verges: tree lanes of oaks / poplars
  for (const s of [0, 1]) {
    if (!edgeRoad(bx, by, s)) continue;
    const onEdge = s === 0 ? lx0 === 0 : ly0 === 0;
    if (!onEdge) continue;
    const kind = ROAD_ROW(bx, by, s);
    if (!kind) continue;
    const step = kind === 'poplar' ? 8 : 10;
    for (let t = step / 2; t < TILE; t += step) {
      for (const off of [ROAD_IN - 1.4, ROAD_IN + ROAD_W + 1.6]) {
        const x = s === 0 ? x0 + off : x0 + t, y = s === 0 ? y0 + t : y0 + off;
        if (!openLand(x, y) || farmAt(x, y, 2) || inVillage(x, y, 2) || edgeBlocked(x, y, 2) || !fadeKeep(x, y)) continue;
        const p = parcelAt(x, y);
        if (p.dDitch < 1.4 || p.dMaar < MAAR_HW + 0.5) continue;
        push(tile, kind, x, y, R() * 6.28, 0.9 + R() * 0.2, 0.9 + R() * 0.25, 0.9 + R() * 0.2, 0xffffff, 0.1);
      }
    }
  }

  yield;
  // parcels whose centre lies in this tile
  let parcels = 0;
  for (let col = Math.floor(aMin / PW); col * PW < aMax; col++) {
    const a0 = col * PW, a1 = a0 + PW;
    const ac = (a0 + a1) / 2;
    if (ac < aMin || ac >= aMax) continue;
    const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
    for (let row = Math.floor((bMin - PL + off) / PL); row * PL - off < bMax + PL; row++) {
      const b0 = Math.max(0, row * PL - off), b1 = Math.min(BLOCK, (row + 1) * PL - off);
      if (b1 - b0 < 20) continue;
      const bc = (b0 + b1) / 2;
      if (bc < bMin || bc >= bMax) continue;
      genParcel(tile, bx, by, rot, col, row, a0, a1, b0, b1, W, lineAng);
      if (++parcels % 3 === 0) yield;
    }
  }

  // farmsteads whose house stands in this tile
  for (const f of plan.farms) {
    if (!inTile(tile, f.x, f.y)) continue;
    genFarm(tile, farmDetail(f));
    tile.farms++;
    yield;
  }
  if (plan.gas && inTile(tile, plan.gas.x, plan.gas.y)) push(tile, 'gas', plan.gas.x, plan.gas.y, 0, 1, 1, 1, 0xffffff, 0);
  for (const v of [plan.village, villageOf(bx + 1, by)]) {
    if (!v || v.x + v.r < x0 || v.x - v.r > x0 + TILE || v.y + v.r < y0 || v.y - v.r > y0 + TILE) continue;
    genVillage(tile, v);
  }
  genBridges(tile, bx, by);
  yield;
  for (const sg of blockSigns(bx, by)) if (inTile(tile, sg.x, sg.y)) tile.signs.push(sg);

  for (const k in tile.items) {
    const it = tile.items[k];
    it.m = new Float32Array(it.m);
    it.c = new Float32Array(it.c);
  }
  return tile;
}

const FARM_POOL = { khr: 'fkhr', olda: 'folda', small: 'fsmall', dairy: 'fdairy' };
const PAIRED = { tractor: ['tractorBody', 'tractorBase'], trailer: ['trailerBody', 'trailerBase'] };

function genFarm(tile, f) {
  push(tile, FARM_POOL[f.type] + f.look, f.x, f.y, -f.angle, 1, 1, 1, 0xffffff, 0.04);
  const fc = Math.cos(f.angle), fs = Math.sin(f.angle);
  push(tile, 'glowPool', f.x + fc * 22 - fs * 14, f.y + fs * 22 + fc * 14, -f.angle, 1.3, 1, 1.3, 0xffffff, 0);
  for (const it of f.items) {
    const rotY = -f.angle + it.rot;
    // the tractors are real vehicles (parkedcars.js farmVehicleSpots)
    if (it.kind === 'tractor') continue;
    const pair = PAIRED[it.kind];
    if (pair) {
      push(tile, pair[0], it.x, it.y, rotY, it.sx, it.sy, it.sz, it.color, 0.06);
      push(tile, pair[1], it.x, it.y, rotY, it.sx, it.sy, it.sz, 0xffffff, 0);
    } else if (it.kind === 'slab') {
      // plain yard paving follows the farm axes (always a quarter turn)
      push(tile, 'slab', it.x, it.y, -f.angle, it.sx, 1, it.sz, it.color, 0.05);
    } else {
      push(tile, it.kind, it.x, it.y, rotY, it.sx, it.sy, it.sz, it.color, it.kind === 'tree' || it.kind === 'poplar' ? 0.1 : 0.04, it.h);
    }
  }
  if (f.lane) {
    // two dirt ruts with grass between them, from the road to the yard
    const [lx0, ly0, lx1, ly1] = f.lane;
    const alongX = lx1 - lx0 > ly1 - ly0;
    const mx = (lx0 + lx1) / 2, my = (ly0 + ly1) / 2, len = alongX ? lx1 - lx0 : ly1 - ly0;
    for (const o of [-0.85, 0.85]) {
      push(tile, 'slab', alongX ? mx : mx + o, alongX ? my + o : my, 0, alongX ? len : 0.75, 1, alongX ? 0.75 : len, 0x8a7a62, 0.05);
    }
  }
}

function genVillage(tile, v) {
  const V = villagePlan(v);
  const x0 = tile.tx * TILE, y0 = tile.ty * TILE;
  const here = (x, y) => x >= x0 && x < x0 + TILE && y >= y0 && y < y0 + TILE;
  if (here(v.x, v.y)) {
    push(tile, 'mound', v.x, v.y, 0, 1, 1, 1, 0xffffff, 0);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      if (Math.abs(Math.cos(a) + 1) < 0.02) continue;
      push(tile, 'hedge', v.x + Math.cos(a) * 16, v.y + Math.sin(a) * 16, -a + Math.PI / 2, 1.9, 0.8, 1.0, 0xffffff, 0.08, M3.TERP_H - 0.1);
    }
  }
  for (const h of V.houses) if (here(h.x, h.y)) push(tile, 'house' + h.kind + (h.look % 2), h.x, h.y, -h.angle, 1, 1, 1, 0xffffff, 0.06);
  for (const t of V.trees) {
    if (!here(t.x, t.y)) continue;
    const onTerp = Math.hypot(t.x - v.x, t.y - v.y) < 29;
    push(tile, t.poplar ? 'poplar' : 'tree', t.x, t.y, chash(Math.round(t.x), Math.round(t.y)) * 6.28, t.s, t.s, t.s, 0xffffff, 0.1, onTerp ? M3.TERP_H * 0.25 : 0);
  }
  for (const g of V.graves) if (here(g.x, g.y)) push(tile, 'grave', g.x, g.y, g.rot, g.s, g.s, g.s, 0xffffff, 0.12, M3.TERP_H - 0.1);
}

// Bridges where a polder road carries on over a maar.
function genBridges(tile, bx, by) {
  const X = bx * BLOCK, Y = by * BLOCK;
  if (maarY(by) && edgeRoad(bx, by, 0) && edgeRoad(bx, by - 1, 0) && inTile(tile, X + ROAD_C, Y)) push(tile, 'bridge', X + ROAD_C, Y, -Math.PI / 2, 1, 1, 1, 0xffffff, 0);
  if (maarX(bx) && edgeRoad(bx, by, 1) && edgeRoad(bx - 1, by, 1) && inTile(tile, X, Y + ROAD_C)) push(tile, 'bridge', X, Y + ROAD_C, 0, 1, 1, 1, 0xffffff, 0);
}

// Rows of trees, hedges and fences thin out towards the city in 25 m
// pieces, so the countryside fades in rather than starting on a line.
function fadeKeep(x, y) {
  const r = ditchRamp(x, y);
  return r >= 1 || chash(Math.floor(x / 25) + 71, Math.floor(y / 25) - 13) < r * 1.1 - 0.05;
}


// Graphics preset 'laag' (scene3d.js applyViewSettings): field edges with
// fewer fences on wider posts with two strands, and no rushes, cross-ditch
// fences or houtwal trees.
// Applies to tiles laid out from then on.
let fieldLow = false;
export function setCountryPropLevel(level) { fieldLow = level === 'laag'; }

function parcelGate(R, a0, b0, b1) {
  if (R() >= 0.45) return null;
  const endB = R() < 0.5 && b0 > 0 ? b0 + 1.9 : b1 < BLOCK ? b1 - 1.9 : b0 + 1.9;
  return { endB, ga: a0 + 5 + R() * (PW - 14) };
}
const parcelRng = (seed) => mulberry(chash(Math.floor(seed * 1e7), 91));

// pastures (and some mown strips) kept in by barbed wire
// (x, y): where the tiles give the land use (OSM landuse: arable has no barbed wire, a meadow keeps it), they decide; else the hash does
function fencedParcel(seed, x, y) {
  const real = x === undefined ? null : landUseAt(x, y);
  if (real === 'akker') return false;
  const use = real === 'weide' ? 'pasture' : parcelUse(seed), h = chash(Math.floor(seed * 1e6), 5);
  return use === 'pasture' ? h < 0.8 : use === 'mown' && h < 0.25;
}

// emit(s, e) for each stretch of samples t0, t0 + step, .. t1 that all pass
// ok, cut into pieces of at most maxLen that share their end samples
function lineRuns(t0, t1, step, ok, maxLen, emit) {
  let s = null, last = 0;
  for (let t = t0; t <= t1 + 1e-6; t += step) {
    if (!ok(t)) { if (s !== null && last > s) emit(s, last); s = null; continue; }
    if (s === null) s = t;
    else if (t - s > maxLen) { if (last > s) emit(s, last); s = last; }
    last = t;
  }
  if (s !== null && last > s) emit(s, last);
}

const segOf = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, Math.hypot(B[0] - A[0], B[1] - A[1]), -Math.atan2(B[1] - A[1], B[0] - A[0])];
const angOf = (P, t) => { const A = P(t, 0), B = P(t + 1, 0); return -Math.atan2(B[1] - A[1], B[0] - A[0]); };

// A wire span across a (painted) ditch: the posts stand either side of it, the strands would hang over the water
function spanOnDitch(ax, ay, bx, by) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 1.5));
  for (let k = 1; k < n; k++) if (countrySurface(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n) === 'sloot') return true;
  return false;
}

// barbed wire: weathered posts, three dull strands
// postUntil: the posts stop here (default t1); the last wire span runs on to t1, the first post of the next tile, so a
// tile seam has no hole in the fence (a post and 5-10 m of wire were missing on every 160 m, #124)
function fenceLine(tile, P, t0, t1, step, ok, postUntil = t1) {
  let prev = null; // the sample before: the wire to it must not cross a ditch, lane or house of the tiles
  let afterRail = false; // the fence was cut by the track: a field gate stands at each end of the cut (an overweghek)
  const railGate = (x, y, t) => { if (!fieldLow) push(tile, 'gate', x, y, angOf(P, t), 1, 1, 1, 0xffffff, 0.04); };
  lineRuns(t0, t1, step, (t) => {
    const [x, y] = P(t);
    if (!ok(x, y, t)) {
      const onRail = nearRail(x, y);
      if (prev && onRail) railGate(prev[0], prev[1], t);
      afterRail = onRail;
      prev = null;
      return false;
    }
    const last = prev;
    prev = [x, y];
    if (afterRail) { railGate(x, y, t); afterRail = false; }
    if (last && (edgeSpanBlocked(last[0], last[1], x, y, 0.5) || spanOnDitch(last[0], last[1], x, y))) return false;
    if (t > postUntil) return true; // the neighbour tile's first post stands here
    const h = chash(Math.round(x * 5), Math.round(y * 5));
    return push(tile, 'post', x, y, h * 6.28, 1, 0.92 + h * 0.16, 1, 0xa89a86, 0.12);
  }, 48, (a, b) => {
    const [mx, my, len, ang] = segOf(P(a), P(b));
    for (const h of fieldLow ? [0.5, 0.9] : [0.4, 0.68, 0.96]) push(tile, 'wire', mx, my, ang, len, 1, 1, 0x8e8e8a, 0, h);
  });
}

// a mapped hedge this near makes the hash's own hedge stay out (m)
const HEDGE_KEEP = 6;
// a hedge, with a tree every treeStep m standing treeOff behind it (houtwal)
function hedgeLine(tile, P, t0, t1, ok, treeStep, treeOff) {
  const ang = angOf(P, t0);
  for (let t = t0 + 1.1; t < t1; t += 2.2) {
    const [x, y] = P(t, 0);
    if (!ok(x, y) || hedgeMapped(x, y, HEDGE_KEEP)) continue; // OSM maps a hedge here: it is the real one

    const h = chash(Math.round(x * 3), Math.round(y * 3) + 7);
    push(tile, 'hedge', x, y, ang + (h - 0.5) * 0.3, 2.6, 0.9 + h * 0.4, 1.3, 0xffffff, 0.08);
    if (treeStep && Math.floor(t / treeStep) !== Math.floor((t + 2.2) / treeStep)) {
      const [tx, ty] = P(t, treeOff);
      if (ok(tx, ty)) push(tile, h < 0.3 ? 'willow' : 'tree', tx, ty, h * 6.28, 0.8 + h * 0.3, 0.8 + h * 0.4, 0.8 + h * 0.3, 0xffffff, 0.1);
    }
  }
}

// Field boundaries: low grass banks along the painted ditches with tufts of
// rush on the pastures, barbed wire round the pastures (their end fences
// open on the strip's gate) and behind the polder-road verges with a gate
// now and then, and the odd hedge or houtwal on a cross ditch or a road.
function genFieldEdges(tile, bx, by, rot, aMin, bMin, W) {
  const aMax = aMin + TILE, bMax = bMin + TILE;
  const step = fieldLow ? 8 : 5;
  const gates = new Map();
  const gateOf = (p) => {
    let g = gates.get(p.seed);
    if (g === undefined) gates.set(p.seed, g = parcelGate(parcelRng(p.seed), p.a0, p.b0, p.b1));
    return g;
  };
  const fenceOk = (x, y) => fadeKeep(x, y) && okSpot(x, y, 1.4) && fencedParcel(parcelAt(x, y).seed, x, y);
  // across: a cross ditch, its bank running along a
  const bankOk = (x, y, across) => {
    if (!openLand(x, y) || farmAt(x, y, 1) || inVillage(x, y, 2) || edgeBlocked(x, y, 1)) return false;
    const p = parcelAt(x, y);
    if (osmDitchesAt(p.bx, p.by)) return false; // no painted ditch here, so no bank
    if (p.road || p.dMain < MAIN_HW + 0.8 || p.dMaar < MAAR_HW + 1 || !thinDitchOn(p)) return false;
    const other = across ? Math.min(p.a - p.a0, p.a1 - p.a) : Math.min(p.b - p.b0, p.b1 - p.b);
    return other >= 1.8 && clearOfRoad(x, y, 0.8);
  };
  const bank = (P, t0, t1, across) => {
    lineRuns(t0, t1, 2.5, (t) => {
      const [x, y] = P(t, 1.25);
      if (!bankOk(x, y, across)) return false;
      if (!fieldLow && chash(Math.round(x * 2), Math.round(y * 2) + 17) < 0.1 && parcelUse(parcelAt(x, y).seed) === 'pasture') {
        const [rx, ry] = P(t, 1.0), h = chash(Math.round(x * 7), Math.round(y * 7));
        push(tile, 'rush', rx, ry, h * 6.28, 0.8 + h * 0.5, 0.8 + h * 0.5, 0.8 + h * 0.5, 0xffffff, 0.1);
      }
      return true;
    }, fieldLow ? 30 : 20, (s, e) => {
      const [mx, my, len, ang] = segOf(P(s - 0.6, 1.25), P(e + 0.6, 1.25));
      push(tile, 'bank', mx, my, ang, len, 1, 1, 0xffffff, 0.06);
    });
  };

  // strip ditches: banks on both sides, barbed wire on a pasture side of a
  // line without a row of its own (one side where both are pasture)
  for (let col = Math.ceil(aMin / PW); col * PW < aMax; col++) {
    if (col <= 0) continue;
    const a = col * PW;
    const lh = chash(col + bx * 131 + 900, by * 977 + (rot ? 7 : 3));
    const pick = chash(col + bx * 7, by * 5 + 33) < 0.5 ? -1 : 1;
    const t0 = Math.max(bMin, 0) + 1.25, t1 = Math.min(bMax, BLOCK) - 0.01;
    // the fences run from the tile's own edge to the next tile's first post
    const f0 = Math.ceil(Math.max(bMin, 0) / step) * step, f1 = Math.min(bMax, BLOCK);
    for (const sd of [-1, 1]) {
      bank((t, o) => W(a + sd * o, t), t0, t1, false);
      if (lh < (fieldLow ? 0.67 : WIRE_ROW_P)) continue;
      fenceLine(tile, (t) => W(a + sd * 1.9, t), f0, f1, step, (x, y, t) => {
        if (!fenceOk(x, y)) return false;
        if (sd === pick) return true;
        const [ox, oy] = W(a - sd * 1.9, t);
        return !fencedParcel(parcelAt(ox, oy).seed, ox, oy);
      }, t1);
    }
  }

  // cross ditches between the strips' parcels: banks, the pastures' end
  // fences with a gap for their gate, or now and then a hedge / houtwal
  for (let col = Math.floor(aMin / PW); col * PW < aMax; col++) {
    const a0 = col * PW, a1 = a0 + PW;
    const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
    for (let row = Math.ceil((bMin + off) / PL); row * PL - off < bMax; row++) {
      const b = row * PL - off;
      if (b <= 0 || b >= BLOCK) continue;
      const t0 = Math.max(a0, aMin), t1 = Math.min(a1, aMax) - 0.01;
      for (const sd of [-1, 1]) bank((t, o) => W(t, b + sd * o), t0 + 1.25, t1, true);
      if (fieldLow) continue;
      const kind = chash(col * 17 + bx * 31 + row, by * 13 + 404);
      if (kind < 0.09) {
        const sd = kind < 0.045 ? -1 : 1;
        const [px, py] = W((a0 + a1) / 2, b + sd * 3);
        if (gateOf(parcelAt(px, py))) continue;
        const ok = (x, y) => fadeKeep(x, y) && okSpot(x, y, 1.5);
        hedgeLine(tile, (t, o) => W(t, b + sd * (2.0 + o)), t0, t1, ok, kind < 0.06 ? 8 : 0, 0.5);
        continue;
      }
      for (const sd of [-1, 1]) {
        const bl = b + sd * 1.9;
        fenceLine(tile, (t) => W(t, bl), a0 + 2, a1 - 2, step, (x, y) => {
          const p = parcelAt(x, y);
          if (p.a < aMin || p.a >= aMax) return false;
          const g = gateOf(p);
          if (g && Math.abs(g.endB - bl) < 0.5 && Math.abs(p.a - g.ga) < 2.4) return false;
          return fenceOk(x, y);
        });
      }
    }
  }

  // polder roads: barbed wire behind the verge with a field gate now and
  // then, or a houtwal where the road has no lane of trees
  const x0 = tile.tx * TILE, y0 = tile.ty * TILE;
  for (const s of [0, 1]) {
    if (!edgeRoad(bx, by, s) || (s === 0 ? x0 - bx * BLOCK : y0 - by * BLOCK) !== 0) continue;
    const rh = chash(bx * 17 + s * 5 + 3, by * 23 + 11);
    const off = ROAD_IN + ROAD_W + 3.4, base = s === 0 ? y0 : x0;
    const P = (t, o = 0) => (s === 0 ? [x0 + off + o, y0 + t] : [x0 + t, y0 + off + o]);
    const ok = (x, y) => fadeKeep(x, y) && okSpot(x, y, 1.4) && !farmAt(x, y, 5) && landUseAt(x, y) !== 'akker';
    if (rh < 0.6) {
      const gateAt = (k) => chash(k + s * 7919, (s === 0 ? bx : by) * 31 + 3) < 0.45;
      const gap = (u) => { const k = Math.floor(u / 48); return gateAt(k) && Math.abs(u - (k + 0.5) * 48) < 2.4; };
      fenceLine(tile, P, 2, TILE - 0.01, step, (x, y) => !gap(s === 0 ? y : x) && ok(x, y));
      for (let k = Math.floor(base / 48); (k + 0.5) * 48 < base + TILE; k++) {
        const u = (k + 0.5) * 48;
        if (u < base || !gateAt(k)) continue;
        const [gx, gy] = P(u - base);
        if (ok(gx, gy)) push(tile, 'gate', gx, gy, s === 0 ? -Math.PI / 2 : 0, 1, 1, 1, 0xffffff, 0.04);
      }
    } else if (rh < 0.72 && !ROAD_ROW(bx, by, s)) {
      hedgeLine(tile, P, 0, TILE, ok, fieldLow ? 0 : 9, 0.6);
    }
  }
}

const HERD_STEP = 8;
function genParcel(tile, bx, by, rot, col, row, a0, a1, b0, b1, W, lineAng) {
  const seed = chash(col * 7 + bx * 1009, row * 13 + by * 2003 + 1);
  const [cx0, cy0] = W((a0 + a1) / 2, (b0 + b1) / 2);
  // the tiles' land use (OSM landuse) over the hash: arable is not grazed, a meadow is
  const real = landUseAt(cx0, cy0);
  const use = real === 'akker' ? 'crop' : real === 'weide' ? 'pasture' : parcelUse(seed);
  const R = parcelRng(seed);
  const [cx, cy] = W((a0 + a1) / 2, (b0 + b1) / 2);
  if (!openLand(cx, cy) || inVillage(cx, cy, -10)) return;
  const inReal = provinceBlock(bx, by);
  if (inReal && urbanWeight(cx, cy) > 0.3) return;
  const inset = 3;
  const c0 = W(a0 + inset, b0 + inset), c1 = W(a1 - inset, b1 - inset);
  const rect = [Math.min(c0[0], c1[0]), Math.min(c0[1], c1[1]), Math.max(c0[0], c1[0]), Math.max(c0[1], c1[1])];
  let herdsOk = openLand(rect[0], rect[1]) && openLand(rect[2], rect[1]) && openLand(rect[0], rect[3]) && openLand(rect[2], rect[3]);
  // real roads, water, the track or houses through the strip: no herd grazing on them (also in a block the tiles cover
  // only in part: realBlockedAt answers for the tiles that are in, and false for the rest)
  if (herdsOk) {
    // (every HERD_STEP m: the herd grazes over the whole strip; a 5 x 5 grid let a pond, a ditch or the track through, #210)
    const nx = Math.max(2, Math.ceil((rect[2] - rect[0]) / HERD_STEP)), ny = Math.max(2, Math.ceil((rect[3] - rect[1]) / HERD_STEP));
    for (let i = 0; i <= nx && herdsOk; i++) for (let j = 0; j <= ny; j++) { const hx = rect[0] + ((rect[2] - rect[0]) * i) / nx, hy = rect[1] + ((rect[3] - rect[1]) * j) / ny; if (edgeBlocked(hx, hy, 3) || landUseAt(hx, hy) === 'akker') { herdsOk = false; break; } }
  }

  // gate at one end of the strip, with short fence wings (a fenced
  // pasture's end fence comes from genFieldEdges)
  const gate = parcelGate(R, a0, b0, b1);
  if (gate) {
    const { endB, ga } = gate;
    const [gx, gy] = W(ga, endB);
    if (okSpot(gx, gy, 0.5)) {
      const across = rot ? -Math.PI / 2 : 0;
      push(tile, 'gate', gx, gy, across + (R() < 0.3 ? 0.5 : 0), 1, 1, 1, 0xffffff, 0.04);
      for (const s of fieldLow || !fencedParcel(seed, gx, gy) ? [-1, 1] : []) {
        for (let k = 1; k <= 2; k++) {
          const [px, py] = W(ga + s * (2.1 + k * 2.2), endB);
          if (okSpot(px, py, 0.5)) push(tile, 'post', px, py, 0, 1, 1, 1, 0xffffff, 0.12);
        }
        const [mx, my] = W(ga + s * 4.3, endB);
        for (const h of [0.45, 0.85]) push(tile, 'wire', mx, my, rot ? -Math.PI / 2 : 0, 4.4, 1, 1, 0xffffff, 0, h);
      }
    }
  }

  // round bales on mown / hay strips, sometimes in long rows
  if ((use === 'hay' || use === 'mown') && R() < 0.45) {
    const colors = [0xe8e8e2, 0x2a2a2a, 0x9fb58a, 0xc9b26a, 0xc9b26a];
    const color = colors[Math.floor(R() * colors.length)];
    const n = 4 + Math.floor(R() * 10);
    const ba = a0 + 8 + R() * (PW - 16), bb = b0 + 15 + R() * Math.max(1, b1 - b0 - 30);
    const rowWise = R() < 0.5;
    for (let i = 0; i < n; i++) {
      const [x, y] = rowWise ? W(ba + (R() - 0.5) * 1.5, bb + i * 1.7) : W(ba + (R() - 0.5) * 14, bb + (R() - 0.5) * 40);
      if (!okSpot(x, y, 2)) continue;
      push(tile, 'bale', x, y, rowWise ? lineAng + Math.PI / 2 + (R() - 0.5) * 0.2 : R() * 6.28, 1, 1, 1, color, 0.05);
    }
  }

  // lapwings / starlings resting on open arable and mown strips
  if (use !== 'pasture' && R() < 0.22 && herdsOk) {
    const [fx, fy] = W(a0 + PW / 2 + (R() - 0.5) * 16, b0 + 20 + R() * Math.max(1, b1 - b0 - 40));
    if (okSpot(fx, fy, 3)) tile.flocks.push({ x: fx, y: fy, n: 8 + Math.floor(R() * 16), kind: R() < 0.7 ? 'lapwing' : 'starling', seed: R() });
  }

  if (!herdsOk || (use !== 'pasture' && !(use === 'mown' && R() < 0.3))) return;
  if (farmAt(cx, cy, 20)) return;
  const k = R();
  let kind = null, variant = null, n = 0, spread = 10, young = 0;
  if (k < 0.3) { kind = 'cow'; n = 6 + Math.floor(R() * 10); spread = 14; young = 0.15; }
  else if (k < 0.42) { kind = 'cow'; variant = 'red'; n = 4 + Math.floor(R() * 8); spread = 12; young = 0.2; }
  else if (k < 0.64) { kind = 'sheep'; n = 10 + Math.floor(R() * 16); spread = 10; young = R() < 0.6 ? 0.35 : 0; }
  else if (k < 0.73) { kind = 'horse'; variant = Math.floor(R() * HORSE_COATS.length); n = 2 + Math.floor(R() * 4); spread = 15; young = 0.25; }
  if (kind) {
    const hc = W(a0 + PW / 2 + (R() - 0.5) * (PW - 16), b0 + 20 + R() * Math.max(1, b1 - b0 - 40));
    for (let i = 0; i < n; i++) {
      const x = Math.min(rect[2], Math.max(rect[0], hc[0] + (R() - 0.5) * spread * 2));
      const y = Math.min(rect[3], Math.max(rect[1], hc[1] + (R() - 0.5) * spread * 2));
      if (farmAt(x, y, 1) || edgeBlocked(x, y, 1)) continue; // a narrow ditch slips between the grid points above
      const a = newAnimal(kind, kind === 'horse' ? (variant + (R() < 0.3 ? 1 : 0)) % HORSE_COATS.length : variant, x, y, rect, R);
      a.hx = hc[0]; a.hy = hc[1]; a.spread = spread;
      if (R() < young) a.size = kind === 'sheep' ? 0.6 : kind === 'horse' ? 0.62 : 0.66;
      tile.animals.push(a);
    }
  }
  // a flock of geese grazing near the ditch, or a pair of ducks in it
  if (R() < 0.14) {
    const gb = R() < 0.5 ? b0 + 5 : b1 - 5;
    const hc = W(a0 + 6 + R() * (PW - 12), gb);
    const m = 6 + Math.floor(R() * 12);
    for (let i = 0; i < m; i++) {
      const x = Math.min(rect[2], Math.max(rect[0], hc[0] + (R() - 0.5) * 10));
      const y = Math.min(rect[3], Math.max(rect[1], hc[1] + (R() - 0.5) * 10));
      if (farmAt(x, y, 1)) continue;
      const g = newAnimal('goose', null, x, y, rect, R);
      g.hx = hc[0]; g.hy = hc[1]; g.spread = 6;
      tile.animals.push(g);
    }
  } else if (R() < 0.08) {
    const db = b0 + 20 + R() * Math.max(1, b1 - b0 - 40);
    const [dx0, dy0] = W(a0, db - 30), [dx1, dy1] = W(a0, db + 30);
    const drect = [Math.min(dx0, dx1) - 0.25, Math.min(dy0, dy1) - 0.25, Math.max(dx0, dx1) + 0.25, Math.max(dy0, dy1) + 0.25];
    for (let i = 0; i < 2; i++) {
      const [x, y] = W(a0, db + i * 1.2);
      if (!openLand(x, y) || parcelAt(x, y).road || farmAt(x, y, 1)) continue;
      const d = newAnimal('duck', null, x, y, drect, R);
      d.hx = x; d.hy = y; d.spread = 25;
      tile.animals.push(d);
    }
  }
}

// ------------------------------------------------------------------ pools

const farmGeo = (fn, looks) => looks.map((L) => () => fn(L));
const PROP_TYPES = {
  tree: { geo: M3.roundTreeGeometry, cap: 9000, shadow: true },
  poplar: { geo: M3.poplarGeometry, cap: 6000, shadow: true },
  willow: { geo: M3.willowGeometry, cap: 4000, shadow: true },
  hedge: { geo: M3.hedgeGeometry, cap: 8000, shadow: false },
  post: { geo: () => M3.boxGeometry(0.11, 1.15, 0.11, 0x8d8474), cap: 9000, shadow: false },
  wire: { geo: () => M3.boxGeometry(1, 0.025, 0.025, 0xdad6c8), cap: 6000, shadow: false },
  gate: { geo: M3.gateGeometry, cap: 1500, shadow: false },
  bale: { geo: M3.baleGeometry, cap: 6000, shadow: true },
  barrack: { geo: M3.barrackGeometry, cap: 300, shadow: true },
  reed: { geo: M3.reedGeometry, cap: 14000, shadow: false, near: true, double: true },
  slab: { geo: M3.slabGeometry, cap: 7000, shadow: false, paving: true },
  grid: { geo: M3.cattleGridGeometry, cap: 400, shadow: false },
  shed: { geo: M3.shedGeometry, cap: 900, shadow: true },
  mestsilo: { geo: M3.mestSiloGeometry, cap: 300, shadow: true },
  towersilo: { geo: M3.towerSiloGeometry, cap: 200, shadow: true },
  feedsilo: { geo: M3.feedSiloGeometry, cap: 300, shadow: true },
  clamp: { geo: M3.clampGeometry, cap: 200, shadow: true },
  tractorBody: { geo: M3.tractorBodyGeometry, cap: 500, shadow: true },
  tractorBase: { geo: M3.tractorBaseGeometry, cap: 500, shadow: true },
  trailerBody: { geo: M3.trailerBodyGeometry, cap: 400, shadow: true },
  trailerBase: { geo: M3.trailerBaseGeometry, cap: 400, shadow: false },
  plough: { geo: M3.ploughGeometry, cap: 300, shadow: false },
  mound: { geo: M3.moundGeometry, cap: 40, shadow: false },
  grave: { geo: M3.graveGeometry, cap: 3000, shadow: false },
  gas: { geo: M3.gasSiteGeometry, cap: 40, shadow: true },
  bridge: { geo: M3.bridgeGeometry, cap: 300, shadow: true },
  glass: { geo: M3.greenhouseGeometry, cap: 400, shadow: false },
  clubhouse: { geo: M3.clubhouseGeometry, cap: 40, shadow: true },
  mast: { geo: M3.lightMastGeometry, cap: 200, shadow: true },
  goal: { geo: M3.goalGeometry, cap: 120, shadow: false },
  bank: { geo: M3.bankGeometry, cap: 6000, shadow: false },
  rush: { geo: M3.rushGeometry, cap: 6000, shadow: false },
};
farmGeo(M3.farmKHRGeometry, M3.FARM_LOOKS).forEach((g, i) => { PROP_TYPES['fkhr' + i] = { geo: g, cap: 120, shadow: true }; });
farmGeo(M3.farmOldaGeometry, M3.OLDA_LOOKS).forEach((g, i) => { PROP_TYPES['folda' + i] = { geo: g, cap: 120, shadow: true }; });
farmGeo(M3.farmSmallGeometry, M3.SMALL_LOOKS).forEach((g, i) => { PROP_TYPES['fsmall' + i] = { geo: g, cap: 120, shadow: true }; });
farmGeo(M3.farmDairyGeometry, M3.FARM_LOOKS).forEach((g, i) => { PROP_TYPES['fdairy' + i] = { geo: g, cap: 120, shadow: true }; });
for (let k = 0; k < 4; k++) for (let l = 0; l < 2; l++) PROP_TYPES['house' + k + l] = { geo: () => M3.houseGeometry(k, M3.HOUSE_LOOKS[l]), cap: 400, shadow: true };
Object.assign(PROP_TYPES, {
  // yard lights at night (countryglow.js; hidden by day)
  glowPool: { geo: () => poolGeometry(5), cap: 2000, shadow: false, glow: true },
});

// Props are drawn per chunk of CHUNK x CHUNK tiles: one instanced mesh per
// prop type present, with the chunk's bounding sphere, so the renderer culls
// whole chunks against the view and the shadow camera, and a tile coming or
// going re-uploads only its own chunk.
const CHUNK = 2;
const MID_R = 300;
const CHUNK_MS = 1.0;

function typeGeo(k) {
  return S.geos[k] || (S.geos[k] = markShared(PROP_TYPES[k].geo()));
}

function chunkMesh(ch, k, n) {
  const T = PROP_TYPES[k];
  // headroom: every tile that streams into the chunk grows it, and a full
  // reallocation (new mesh and GPU buffers) per tile is a hitch at long view distance
  const cap = Math.ceil((n * 1.4) / 64) * 64;
  const mesh = new THREE.InstancedMesh(typeGeo(k), T.glow ? glowMaterial() : T.double ? S.reedMat : T.paving ? S.pavingMat : S.propMat, cap);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  mesh.count = 0;
  mesh.boundingSphere = ch.sphere;
  mesh.castShadow = !!T.shadow;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.userData.shared = true;
  mesh.userData.kind = 'country:' + k;
  if (T.paving) mesh.renderOrder = -1;
  return mesh;
}

function chunkFor(t) {
  const kx = Math.floor(t.tx / CHUNK), ky = Math.floor(t.ty / CHUNK), key = kx * 100003 + ky;
  let ch = S.chunks.get(key);
  if (!ch) {
    const half = (CHUNK * TILE) / 2, cx = kx * CHUNK * TILE + half, cy = ky * CHUNK * TILE + half;
    ch = { key, cx, cy, tiles: new Set(), meshes: new Map(), dirty: true, sphere: new THREE.Sphere(new THREE.Vector3(cx, 8, cy), half * 1.42 + 30) };
    S.chunks.set(key, ch);
  }
  return ch;
}

const inTier = (k, t) => { const lod = PROP_TYPES[k].lod; return !lod || (lod === 'mid') === t.mid; };

function rebuildChunk(ch) {
  ch.dirty = false;
  const want = new Map();
  for (const t of ch.tiles) {
    for (const k in t.items) {
      if (k === 'reed' || !inTier(k, t)) continue;
      want.set(k, (want.get(k) || 0) + t.items[k].c.length / 3);
    }
  }
  for (const [k, mesh] of ch.meshes) {
    if (want.get(k)) continue;
    S.group.remove(mesh);
    mesh.dispose();
    ch.meshes.delete(k);
  }
  for (const [k, n] of want) {
    let mesh = ch.meshes.get(k);
    if (mesh && mesh.instanceMatrix.count < n) { S.group.remove(mesh); mesh.dispose(); mesh = null; }
    if (!mesh) { mesh = chunkMesh(ch, k, n); ch.meshes.set(k, mesh); S.group.add(mesh); }
    let off = 0;
    for (const t of ch.tiles) {
      const it = t.items[k];
      if (!it || !inTier(k, t)) continue;
      mesh.instanceMatrix.array.set(it.m, off * 16);
      mesh.instanceColor.array.set(it.c, off * 3);
      off += it.c.length / 3;
    }
    mesh.count = off;
    markInstancesDirty(mesh.instanceMatrix, off);
    markInstancesDirty(mesh.instanceColor, off);
  }
}

function dropChunk(ch) {
  for (const mesh of ch.meshes.values()) { S.group.remove(mesh); mesh.dispose(); }
  ch.meshes.clear();
  S.chunks.delete(ch.key);
}

// Tier per tile (with some slack), then the dirty chunks nearest first.
function syncChunks(px, py, budgetEnd) {
  for (const t of S.tiles.values()) {
    const d = Math.hypot(t.cx - px, t.cy - py);
    const mid = d > MID_R + (t.mid ? -30 : 30);
    if (mid !== t.mid) { t.mid = mid; chunkFor(t).dirty = true; }
    if (t.reedMesh) t.reedMesh.visible = d < REED_R;
  }
  const list = [];
  for (const ch of S.chunks.values()) if (ch.dirty) list.push([Math.hypot(ch.cx - px, ch.cy - py), ch]);
  list.sort((a, b) => a[0] - b[0]);
  let n = 0;
  for (const [, ch] of list) {
    if (n > 0 && performance.now() > budgetEnd) break;
    if (ch.tiles.size) rebuildChunk(ch); else dropChunk(ch);
    n++;
  }
}

function init(scene) {
  const group = new THREE.Group();
  group.name = 'countryside';
  group.matrixAutoUpdate = false;
  scene.add(group);
  const propMat = markShared(vcMaterial({ roughness: 0.9 }));
  const reedMat = markShared(vcMaterial({ roughness: 0.9, side: THREE.DoubleSide }));
  const pavingMat = markShared(vcMaterial({ roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
  // geometries are made on first use (or one per frame ahead of need)
  S = {
    group, geos: {}, chunks: new Map(), gen: null, groundKey: '', blobs: null, propMat, reedMat, pavingMat,
    tiles: new Map(), queue: [], wantKey: '', genMax: 0,
    animals: [], animalDirty: true,
    skinned: new Map(), meshPool: new Map(), herdPools: new Map(),
    farmCount: 0, signs: new Map(), flocks: [], poolWarm: Object.keys(PROP_TYPES),
    prev: null, surf: null, splashAt: 0,
    audible: [],
  };
  const groundMat = createTerrainMaterial();
  const ground = new THREE.Mesh(new THREE.BufferGeometry(), groundMat);
  ground.position.y = GROUND_Y;
  ground.receiveShadow = true;
  ground.userData.isTerrain = true;
  group.add(ground);
  S.ground = ground;

  const blobTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
  const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), blobMat, 3000);
  blobs.count = 0;
  blobs.frustumCulled = false;
  blobs.matrixAutoUpdate = false;
  group.add(blobs);
  S.blobs = blobs;
  // hidden samples of the prop materials for the shader warm-up (scene3d)
  const warm = new THREE.Group();
  warm.visible = false;
  for (const [k, shadow] of [['tree', true], ['reed', false], ['slab', false]]) {
    const m = chunkMesh({ sphere: new THREE.Sphere() }, k, 1);
    m.count = 1;
    m.castShadow = shadow;
    warm.add(m);
  }
  group.add(warm);
  window.__countryside = S;
}

// ------------------------------------------------------------------ ground ring

function updateGround(px, py) {
  const cx = Math.round(px / GROUND_SNAP) * GROUND_SNAP, cy = Math.round(py / GROUND_SNAP) * GROUND_SNAP;
  const key = cx + ',' + cy;
  if (key === S.groundKey) return;
  S.groundKey = key;
  const r = countryRect();
  // terrain3d's mesh spans the map bounds plus 15% of the larger extent
  const pad = Math.max(r.hx, r.hy) * 2 * 0.15 - 1;
  const I = [r.cx - r.hx - pad, r.cy - r.hy - pad, r.cx + r.hx + pad, r.cy + r.hy + pad];
  const O = [cx - GROUND_HALF, cy - GROUND_HALF, cx + GROUND_HALF, cy + GROUND_HALF];
  const rects = [];
  const ix0 = Math.max(O[0], I[0]), iy0 = Math.max(O[1], I[1]), ix1 = Math.min(O[2], I[2]), iy1 = Math.min(O[3], I[3]);
  if (ix0 >= ix1 || iy0 >= iy1) rects.push(O);
  else {
    if (O[1] < iy0) rects.push([O[0], O[1], O[2], iy0]);
    if (iy1 < O[3]) rects.push([O[0], iy1, O[2], O[3]]);
    if (O[0] < ix0) rects.push([O[0], iy0, ix0, iy1]);
    if (ix1 < O[2]) rects.push([ix1, iy0, O[2], iy1]);
  }
  const pos = [], idx = [];
  for (const [x0, y0, x1, y1] of rects) {
    const nx = Math.max(1, Math.ceil((x1 - x0) / 400)), ny = Math.max(1, Math.ceil((y1 - y0) / 400));
    const base = pos.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pos.push(x0 + ((x1 - x0) * i) / nx, 0, y0 + ((y1 - y0) * j) / ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  S.ground.geometry.dispose();
  S.ground.geometry = geo;
}

// ------------------------------------------------------------------ streaming


function syncTiles(px, py, viewDist, budgetEnd) {
  const R = propRadius(viewDist);
  const t0x = Math.floor((px - R) / TILE), t1x = Math.floor((px + R) / TILE);
  const t0y = Math.floor((py - R) / TILE), t1y = Math.floor((py + R) / TILE);
  const key = t0x + ',' + t0y + ',' + Math.round(R);
  if (key !== S.wantKey) {
    S.wantKey = key;
    const want = [];
    for (let ty = t0y; ty <= t1y; ty++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
        const d = Math.hypot(cx - px, cy - py);
        if (d > R + TILE * 0.71) continue;
        if (edgeDistance(cx, cy) < -(180 + 110 + TILE * 0.71)) continue;
        const k = tx + ',' + ty;
        if (!S.tiles.has(k)) want.push({ tx, ty, k, d });
      }
    }
    want.sort((a, b) => a.d - b.d);
    S.queue = want;
    for (const [k, t] of S.tiles) {
      if (Math.hypot(t.cx - px, t.cy - py) > R + TILE * 1.3) {
        unloadTile(t);
        S.tiles.delete(k);
      }
    }
    // a half-built tile the player has left behind is dropped
    if (S.gen && !want.some((w) => w.k === S.gen.w.k)) S.gen = null;
  }
  let steps = 0;
  while (steps === 0 || performance.now() < budgetEnd) {
    if (!S.gen) {
      let w = null;
      while (S.queue.length && !w) { const c = S.queue.shift(); if (!S.tiles.has(c.k)) w = c; }
      if (!w) break;
      S.gen = { w, steps: genTileSteps(w.tx, w.ty) };
    }
    const a = performance.now();
    const r = S.gen.steps.next();
    S.genMax = Math.max(S.genMax * 0.999, performance.now() - a);
    steps++;
    if (r.done) {
      const t = r.value;
      S.tiles.set(S.gen.w.k, t);
      loadTile(t);
      S.gen = null;
    }
  }
}

function loadTile(t) {
  setTileWalls(t.tx, t.ty, t.walls);
  setTileTrunks(t.tx, t.ty, t.trunks);
  t.mid = Math.hypot(t.cx - S.px, t.cy - S.py) > MID_R;
  const ch = chunkFor(t);
  ch.tiles.add(t);
  ch.dirty = true;
  for (const a of t.animals) S.animals.push(a);
  if (t.animals.length) S.animalDirty = true;
  for (const f of t.flocks) S.flocks.push(f);
  S.farmCount += t.farms;
  if (t.signs.length) {
    t.signMeshes = t.signs.map((sg) => {
      const m = buildSign(sg);
      S.group.add(m);
      return m;
    });
  }
}

function unloadTile(t) {
  clearTileWalls(t.tx, t.ty);
  clearTileTrunks(t.tx, t.ty);
  const ch = chunkFor(t);
  ch.tiles.delete(t);
  ch.dirty = true;
  if (t.reedMesh) { S.group.remove(t.reedMesh); t.reedMesh.dispose(); t.reedMesh = null; }
  if (t.animals.length) {
    const gone = new Set(t.animals);
    S.animals = S.animals.filter((a) => !gone.has(a));
    for (const a of t.animals) releaseSkin(a);
    S.animalDirty = true;
  }
  if (t.flocks.length) {
    const gone = new Set(t.flocks);
    S.flocks = S.flocks.filter((f) => !gone.has(f));
  }
  S.farmCount -= t.farms;
  if (t.signMeshes) {
    for (const m of t.signMeshes) { S.group.remove(m); disposeSign(m); }
    t.signMeshes = null;
  }
}

// Reed clumps along the ditch banks, only for tiles near the player.
function addReeds(t) {
  t.reeds = true;
  const it = reedItems(t);
  if (!it || !it.c.length) return;
  // the tile's own mesh, shown only while the tile is near
  const n = it.c.length / 3;
  const mesh = chunkMesh({ sphere: new THREE.Sphere(new THREE.Vector3(t.cx, 1, t.cy), TILE * 0.72) }, 'reed', n);
  mesh.instanceMatrix.array.set(it.m);
  mesh.instanceColor.array.set(it.c);
  mesh.count = n;
  markInstancesDirty(mesh.instanceMatrix, n);
  markInstancesDirty(mesh.instanceColor, n);
  t.reedMesh = mesh;
  S.group.add(mesh);
}

function reedItems(t) {
  const x0 = t.tx * TILE, y0 = t.ty * TILE;
  const bx = Math.floor(x0 / BLOCK), by = Math.floor(y0 / BLOCK);
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const lx0 = x0 - bx * BLOCK, ly0 = y0 - by * BLOCK;
  const aMin = rot ? ly0 : lx0, bMin = rot ? lx0 : ly0;
  const tmp = { items: {} };
  const put = (a, b) => {
    const [x, y] = blockToWorld(bx, by, rot, a, b);
    const clump = chash(Math.floor(x / 7) + 5, Math.floor(y / 7) - 3);
    if (clump > 0.42 || !openLand(x, y)) return;
    const p = parcelAt(x, y);
    if (p.road || p.dMain < MAIN_HW * 0.8 || p.dMaar < MAAR_WATER || (p.dDitch < DITCH_HW * 0.72 && p.dMain > MAIN_HW + 0.5)) return;
    if (farmAt(x, y, 0) || inVillage(x, y, 0) || edgeBlocked(x, y, 1)) return;
    if (p.dDitch < DITCH_HW * 0.72 + 1.2 && p.dMain > MAIN_HW + 0.5 && !thinDitchOn(p)) return;
    const h = chash(Math.round(x * 3), Math.round(y * 3));
    push(tmp, 'reed', x, y, h * 6.28, 0.9 + h * 0.3, 0.6 + clump * 1.1, 0.9 + h * 0.3, 0xffffff, 0.12);
  };
  // strip ditches (and the block's own main ditch at a = 0 / b = 0)
  for (let col = Math.ceil(aMin / PW); col * PW < aMin + TILE; col++) {
    const a = col * PW, hw = col === 0 ? MAIN_HW * 0.8 : DITCH_HW * 0.72;
    for (let b = bMin + 0.6; b < bMin + TILE; b += 1.25) {
      for (const sd of [-1, 1]) put(a + sd * (hw + 0.25 + chash(Math.round(b * 4), col) * 0.35), b);
    }
  }
  if (bMin === 0) {
    for (let a = aMin + 0.6; a < aMin + TILE; a += 1.25) put(a, MAIN_HW * 0.8 + 0.3 + chash(Math.round(a * 4), 9) * 0.35);
  }
  // cross ditches between the strips' parcels
  for (let col = Math.floor(aMin / PW); col * PW < aMin + TILE; col++) {
    const off = chash(col + bx * 131 + by * 977, rot ? 18 : 17) * PL;
    for (let row = Math.ceil((bMin + off) / PL); row * PL - off < bMin + TILE; row++) {
      const b = row * PL - off;
      if (b <= 0 || b >= BLOCK) continue;
      for (let a = col * PW + 1.5; a < col * PW + PW - 1.5; a += 1.25) {
        for (const sd of [-1, 1]) put(a, b + sd * (DITCH_HW * 0.72 + 0.25 + chash(Math.round(a * 4), row) * 0.35));
      }
    }
  }
  // maar banks
  for (const [on, vert, c] of [[maarX(bx), true, bx * BLOCK], [maarX(bx + 1), true, (bx + 1) * BLOCK], [maarY(by), false, by * BLOCK], [maarY(by + 1), false, (by + 1) * BLOCK]]) {
    if (!on) continue;
    const lo = vert ? x0 : y0;
    if (c < lo - 6 || c > lo + TILE + 6) continue;
    for (let q = 0.6; q < TILE; q += 1.1) {
      for (const sd of [-1, 1]) {
        const o = sd * (MAAR_WATER + 0.25 + chash(Math.round(q * 4), sd + 7) * 0.4);
        const x = vert ? c + o : x0 + q, y = vert ? y0 + q : c + o;
        const clump = chash(Math.floor(x / 7) + 5, Math.floor(y / 7) - 3);
        if (clump > 0.5 || !openLand(x, y) || parcelAt(x, y).road || farmAt(x, y, 0) || edgeBlocked(x, y, 1)) continue;
        const h = chash(Math.round(x * 3), Math.round(y * 3));
        push(tmp, 'reed', x, y, h * 6.28, 1 + h * 0.3, 0.8 + clump * 1.2, 1 + h * 0.3, 0xffffff, 0.12);
      }
    }
  }
  return tmp.items.reed || null;
}

// the scene (for audits and tests).
// the scene (scripts/country_props_audit.mjs).
export function countryTileItems(tx, ty) {
  const g = genTileSteps(tx, ty);
  let r = g.next();
  while (!r.done) r = g.next();
  const tile = r.value;
  const reed = reedItems(tile);
  if (reed) tile.items.reed = reed;
  return tile;
}

// ------------------------------------------------------------------ animals

function acquireSkin(a) {
  const key = animalKey(a);
  const pool = S.meshPool.get(key);
  let mesh = pool && pool.length ? pool.pop() : buildAnimalMesh(a);
  mesh.userData.poolKey = key;
  if (mesh.userData.baseScale === undefined) mesh.userData.baseScale = mesh.scale.x;
  mesh.scale.setScalar(mesh.userData.baseScale * (a.size || 1));
  mesh.visible = true;
  S.group.add(mesh);
  S.skinned.set(a, mesh);
  return mesh;
}

function releaseSkin(a) {
  const mesh = S.skinned.get(a);
  if (!mesh) return;
  S.skinned.delete(a);
  S.animalDirty = true;
  S.group.remove(mesh);
  const key = mesh.userData.poolKey;
  if (!S.meshPool.has(key)) S.meshPool.set(key, []);
  const pool = S.meshPool.get(key);
  if (pool.length < 12) pool.push(mesh);
}

function makePool(geo, mat, cap, shadow) {
  const mesh = new THREE.InstancedMesh(geo, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  mesh.userData.shared = true;
  return mesh;
}

function herdPool(key) {
  let p = S.herdPools.get(key);
  if (!p) {
    const tpl = templateGeometry(key);
    p = makePool(tpl.geo, tpl.mat, 2500, false);
    p.userData.scale = tpl.scale;
    p.castShadow = false;
    S.group.add(p);
    S.herdPools.set(key, p);
  }
  return p;
}

function threatOf(world) {
  const p = world.player;
  const v = p.inVehicle;
  if (world.pigeonMode) return { x: p.x, y: p.y, r: 3, horn: false };
  if (v) {
    const sp = Math.abs(v.speed || 0);
    return { x: v.x, y: v.y, r: v.horn ? 45 : sp > 1.5 ? 14 + sp * 0.8 : 5, horn: !!v.horn, v, sp };
  }
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  return { x: p.x, y: p.y, r: sp > 4 ? 1.35 : sp > 0.5 ? 1 : 0.6, rel: true };
}

function clampRect(a) {
  const r = a.rect;
  a.x = Math.min(r[2], Math.max(r[0], a.x));
  a.y = Math.min(r[3], Math.max(r[1], a.y));
}

function simAnimal(a, dt, th, time, world) {
  if (a.dead) return;
  const K = KINDS[a.kind];
  const dx = a.x - th.x, dy = a.y - th.y;
  const d = Math.hypot(dx, dy);
  // at speed the car doesn't shove it aside any more: it goes under
  if (th.v && d < th.v.halfLen + K.radius + 1 && distToVehicleBody(th.v, a.x, a.y) < K.radius * 0.7 && runOverAnimal(world, a, th.v)) {
    S.animalDirty = true;
    return;
  }
  const scareR = th.rel ? K.scare * th.r : th.r * (a.kind === 'cow' ? 0.8 : 1);
  if (d < scareR && a.flee <= 0.5) {
    a.flee = 2.5 + Math.random() * 2;
    a.fx = dx / (d || 1); a.fy = dy / (d || 1);
  }
  // cars shove animals aside instead of driving through them
  if (th.v && d < K.radius + 1.6) {
    const push = (K.radius + 1.6 - d);
    a.x += (dx / (d || 1)) * push;
    a.y += (dy / (d || 1)) * push;
  }
  const prevA = a.angle;
  if (a.flee > 0) {
    a.flee -= dt;
    const tx = a.x + a.fx * 10, ty = a.y + a.fy * 10;
    const want = Math.atan2(ty - a.y, tx - a.x);
    a.angle = lerpAngle(a.angle, want, Math.min(1, dt * 5));
    a.speed += (K.run * (a.flee > 1 ? 1 : a.flee) - a.speed) * Math.min(1, dt * 3);
  } else {
    const td = Math.hypot(a.tx - a.x, a.ty - a.y);
    if (td < 0.8) {
      a.speed = Math.max(0, a.speed - dt * 1.5);
      a.timer -= dt;
      if (a.timer <= 0) {
        const ang = Math.random() * Math.PI * 2, rad = Math.random() * (a.spread || 10);
        a.tx = a.hx + Math.cos(ang) * rad;
        a.ty = a.hy + Math.sin(ang) * rad;
        a.tx = Math.min(a.rect[2], Math.max(a.rect[0], a.tx));
        a.ty = Math.min(a.rect[3], Math.max(a.rect[1], a.ty));
        a.timer = 4 + Math.random() * 10;
      }
    } else {
      a.angle = lerpAngle(a.angle, Math.atan2(a.ty - a.y, a.tx - a.x), Math.min(1, dt * 2.5));
      a.speed += (K.walk - a.speed) * Math.min(1, dt * 2);
    }
  }
  const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
  const r = a.rect;
  if (nx < r[0] || nx > r[2] || ny < r[1] || ny > r[3]) {
    // ditch ahead: slide along it, and turn away if fleeing into it
    if (a.flee > 0) {
      if (nx < r[0] || nx > r[2]) a.fx = -a.fx * 0.5;
      if (ny < r[1] || ny > r[3]) a.fy = -a.fy * 0.5;
      const l = Math.hypot(a.fx, a.fy) || 1;
      a.fx /= l; a.fy /= l;
    } else a.timer = 0;
  }
  a.x = nx; a.y = ny;
  clampRect(a);
  a.stride += a.speed * dt;
  a.turn = (a.angle - prevA) / Math.max(dt, 1e-3);
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}

function animateGoose(mesh, a, time) {
  const b = mesh.userData.bones;
  const moving = a.speed > 0.05;
  const s = a.stride * (a.speed > 1 ? 9 : 14);
  mesh.position.y = 0.2 + (moving ? Math.abs(Math.sin(s)) * 0.015 : 0);
  const graze = moving ? 0 : Math.max(0, Math.sin(time * 0.7 + a.bobSeed * 9)) ** 0.5;
  b.body.rotation.set(moving ? Math.sin(s) * 0.08 : 0, 0, -0.1 - graze * 0.35);
  b.head.rotation.set(0, moving ? 0 : Math.sin(time * 0.5 + a.bobSeed * 4) * 0.4, -graze * 0.9 + (graze > 0.5 ? Math.sin(time * 7) * 0.08 : 0));
  b.tail.rotation.set(0, Math.sin(time * 3 + a.bobSeed) * 0.15, 0);
}

function updateAnimals(dt, world, time, simulate) {
  const p = world.player;
  const th = threatOf(world);
  const cands = [];
  for (const a of S.animals) {
    if (a.gone) continue;
    if (a.dead && time - a.deadAt > 60) { a.gone = true; S.animalDirty = true; continue; }
    const d2 = (a.x - p.x) ** 2 + (a.y - p.y) ** 2;
    if (d2 > SIM_R * SIM_R) continue;
    if (simulate) simAnimal(a, dt, th, time, world);
    a._d2 = d2;
    cands.push(a);
  }
  cands.sort((u, v) => u._d2 - v._d2);
  const want = new Set();
  for (let i = 0; i < cands.length && want.size < SKIN_MAX; i++) {
    if (cands[i]._d2 < SKIN_R * SKIN_R) want.add(cands[i]);
  }
  for (const a of [...S.skinned.keys()]) if (!want.has(a)) releaseSkin(a);
  let shadows = 0, fresh = 0;
  for (const a of want) {
    let mesh = S.skinned.get(a);
    if (!mesh) {
      if (fresh++ >= 4) continue;
      mesh = acquireSkin(a);
      S.animalDirty = true;
    }
    mesh.position.set(a.x, 0, a.y);
    mesh.rotation.y = -a.angle;
    mesh.rotation.x = 0;
    if (a.dead) poseDeadAnimal(mesh, a);
    else if (a.kind === 'goose') animateGoose(mesh, a, time);
    else if (a.kind === 'duck') {
      animateWildlifeMesh3D(mesh, a, time);
      mesh.position.y = -0.06 + Math.sin(time * 1.7 + a.bobSeed * 6) * 0.008;
    } else animateWildlifeMesh3D(mesh, a, time);
    const cast = shadows < SHADOW_MAX && a._d2 < 40 * 40 && a.kind !== 'duck';
    if (cast) shadows++;
    if (mesh.userData.cast !== cast) {
      mesh.userData.cast = cast;
      mesh.traverse((o) => { if (o.isMesh) o.castShadow = cast; });
    }
  }

  // everything else: static instanced herds, refreshed a few times a second
  S.herdTimer = (S.herdTimer || 0) - dt;
  if (S.herdTimer <= 0 || S.animalDirty) {
    S.herdTimer = S.animalDirty ? 0 : 0.25;
    S.animalDirty = false;
    const counts = new Map();
    let built = 0;
    for (const pool of S.herdPools.values()) pool.count = 0;
    for (const a of S.animals) {
      if (S.skinned.has(a) || a.gone) continue;
      const key = animalKey(a);
      // one new herd template per frame keeps the first arrival hitch-free
      if (!S.herdPools.has(key)) {
        if (built++) { S.animalDirty = true; continue; }
      }
      const pool = herdPool(key);
      const n = counts.get(key) || 0;
      if (n >= 2500) continue;
      const sc = (pool.userData.scale || 1) * (a.size || 1);
      if (a.dead) _e.set(a.deadSide * 1.42, -a.angle, 0, 'YXZ');
      else _e.set(0, -a.angle, 0, 'XYZ');
      _q.setFromEuler(_e);
      _m4.compose(_p.set(a.x, a.dead ? 0.2 * (a.size || 1) : a.kind === 'goose' ? 0.2 : a.kind === 'duck' ? -0.06 : 0, a.y), _q, _s.set(sc, sc, sc));
      _m4.toArray(pool.instanceMatrix.array, n * 16);
      pool.instanceColor.array[n * 3] = pool.instanceColor.array[n * 3 + 1] = pool.instanceColor.array[n * 3 + 2] = 1;
      counts.set(key, n + 1);
    }
    for (const [key, pool] of S.herdPools) {
      pool.count = counts.get(key) || 0;
      markInstancesDirty(pool.instanceMatrix, pool.count);
      markInstancesDirty(pool.instanceColor, pool.count);
    }
  }

  // soft blob shadows under every nearby animal
  let n = 0;
  const arr = S.blobs.instanceMatrix.array;
  for (const a of cands) {
    const sz = KINDS[a.kind].shadow;
    if (!sz || n >= 3000) continue;
    _e.set(0, -a.angle, 0);
    _q.setFromEuler(_e);
    _m4.compose(_p.set(a.x, 0.0, a.y), _q, _s.set(sz[0] * 1.5, 1, sz[1] * 1.8));
    _m4.toArray(arr, n * 16);
    n++;
  }
  S.blobs.count = n;
  markInstancesDirty(S.blobs.instanceMatrix, n);

  // ambience.js picks moos/bleats from world.countryAudible: keep it to the
  // two nearest cows and one sheep so it stays an occasional, distant sound
  const aud = S.audible;
  aud.length = 0;
  let cows = 0, sheep = 0;
  for (const a of cands) {
    if (a._d2 > 90 * 90) break;
    if (a.kind === 'cow' && cows < 2) { aud.push(a); cows++; }
    else if (a.kind === 'sheep' && sheep < 1) { aud.push(a); sheep++; }
    if (cows >= 2 && sheep >= 1) break;
  }
  world.countryAudible = aud;
}

// ------------------------------------------------------------------ gameplay

function gameplay(dt, world) {
  const p = world.player;
  if (world.pigeonMode || world.paused) { S.prev = null; return; }
  const v = p.inVehicle;
  // AI vehicles out here (police giving chase, parked cars) stay out of barns too
  for (const o of world.vehicles || []) {
    if (o === v || o.isBoat || o.wrecked || o.countryDrive || Math.abs(o.x - p.x) > 250 || Math.abs(o.y - p.y) > 250) continue;
    if (countryWeight(o.x, o.y) > 0.5 && pushOutOfPlan(o, 1.2)) o.speed *= 0.3;
    // the meadow drag and the ditches are vehicle.js offroadDrag, for every driver
    if (o.splashed) { o.splashed = false; if (Math.abs(o.x - p.x) < 80 && Math.abs(o.y - p.y) < 80) splash(world, o.x, o.y); }
  }
  if (v) {
    if (v.splashed) { v.splashed = false; splash(world, v.x, v.y); }
    S.surf = null;
    S.prev = null;
    return;
  }
  // on foot: wading in the tiles' shallow water, swimming in deep water (player.js)
  const w = edgeDistance(p.x, p.y) > 0 && !p.water && !p.swimming ? waterAt(world.map, p.x, p.y) : null;
  const wading = !!w && w.wade && w.body < 0 && !world.map.isOnBridge(p.x, p.y);
  if (wading && S.prev && Math.hypot(p.x - S.prev[0], p.y - S.prev[1]) < 3) {
    p.x = S.prev[0] + (p.x - S.prev[0]) * 0.45;
    p.y = S.prev[1] + (p.y - S.prev[1]) * 0.45;
  }
  if (wading && (p.z || 0) <= 0.001 && !(p.vz > 0)) p.z = -0.32;
  else if (!wading && p.z < 0 && !p.water) p.z = 0;
  if (wading && S.surf !== 'sloot') splash(world, p.x, p.y);
  if (countryWeight(p.x, p.y) > 0.5) {
    pushOutOfPlan(p, p.radius || 0.35);
    pushOutOfTrunks(p, p.radius || 0.35);
    // field hedges and fences: over them only with a vault (player.js)
    if (!p.vault && (p.gz || 0) < 0.5 && (p.z || 0) < 1) pushOutOfWalls(p, p.radius || 0.35);
  }
  S.surf = wading ? 'sloot' : null;
  S.prev = [p.x, p.y];
}

function splash(world, x, y) {
  const now = world.time;
  if (now - S.splashAt < 0.8) return;
  S.splashAt = now;
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'splash', x, y });
}

// ------------------------------------------------------------------ entry

// One call per frame from scene3d's update3D (after gameplay, before the
// player mesh is placed): streams the countryside around the player, runs
// the herds and applies the meadow/ditch effects on the player.
export function updateCountryside(dt, world, scene, cam, viewDist) {
  // the map-edge layout is built once, well before the player can see it
  if (!EDGE.ready && world.map && edgeDistance(world.player.x, world.player.y) > -1600) ensureCountryEdge(world.map);
  if (!S) init(scene);
  // streams around the camera's focus in a cutscene (scene3d.js updateStreamFocus)
  const p = world.streamFocus || world.player;
  const t0 = performance.now();
  const near = edgeDistance(p.x, p.y) > -(propRadius(viewDist) + 200);
  updateGround(p.x, p.y);
  S.px = p.x; S.py = p.y;
  if (near || S.tiles.size) {
    syncTiles(p.x, p.y, viewDist, t0 + GEN_BUDGET_MS * (S.queue.length > 6 ? 2 : 1));
    if (!S.queue.length && !S.gen && performance.now() < t0 + GEN_BUDGET_MS) {
      for (const t of S.tiles.values()) {
        if (t.reeds || (t.cx - p.x) ** 2 + (t.cy - p.y) ** 2 > REED_R * REED_R) continue;
        addReeds(t);
        break;
      }
    }
    // make one missing prop geometry per frame, before tiles need it
    if (S.poolWarm.length) typeGeo(S.poolWarm.shift());
    syncChunks(p.x, p.y, Math.max(performance.now(), t0 + GEN_BUDGET_MS) + CHUNK_MS);
    updateAnimals(world.paused ? 0 : dt, world, world.time, !world.paused);
  } else if (!S.idle) {
    // back in the city: drop whatever the last countryside frame left drawn
    for (const ch of [...S.chunks.values()]) dropChunk(ch);
    for (const pool of S.herdPools.values()) pool.count = 0;
    for (const a of [...S.skinned.keys()]) releaseSkin(a);
    S.blobs.count = 0;
    world.countryAudible = [];
  }
  S.idle = !(near || S.tiles.size);
  updateTileWater(world.map, scene, p.x, p.y, S.idle ? 0 : propRadius(viewDist) - 50, world.time);
  gameplay(dt, world);
  updateFarProps(dt, world, scene, cam);
  updateCountryLife(dt, world, scene, S.idle ? [] : S.flocks, scene.fog ? scene.fog.far : viewDist);
  const ms = performance.now() - t0;
  S.ms = (S.ms || 0) * 0.95 + ms * 0.05;
  S.maxMs = Math.max((S.maxMs || 0) * 0.995, ms);
}

export function countrysideStats() {
  if (!S) return null;
  const pools = {};
  let meshes = 0;
  for (const ch of S.chunks.values()) for (const [k, m] of ch.meshes) { pools[k] = (pools[k] || 0) + m.count; meshes++; }
  let herd = 0;
  for (const m of S.herdPools.values()) herd += m.count;
  return {
    ms: +(S.ms || 0).toFixed(3), maxMs: +(S.maxMs || 0).toFixed(2), genMax: +S.genMax.toFixed(2), tiles: S.tiles.size, queue: S.queue.length, chunks: S.chunks.size, meshes,
    animals: S.animals.length, skinned: S.skinned.size, herd, farms: S.farmCount, flocks: S.flocks.length, pools,
    farprops: farPropsStats(), life: lifeStats(), water: tileWaterStats(),
  };
}
