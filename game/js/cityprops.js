import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PARKS, parkBankSpots } from './parkplekken.js';
import { GeoBuilder, vcMaterial, composeMatrix, tubeGeometry, HABBO_PALETTE } from './pixelart3d.js';
import { Pedestrian, CITY_CENTRE, releaseFromScene, isSpawnHidden } from './pedestrians.js';
import { setPedPose, isInsideBuilding, isOnRoad } from './pedgeom.js';
import { spawnVehicleOnRoad } from './vehicle.js';
import { isInWater, dist, SeededRng, nearestOnRoadList } from './util.js';
import { makeProp, addProp, removeProp, isPropBroken, propKey, updateBreakables } from './breakables.js';
import { initClutter, generateClutter, whiteUV } from './streetclutter.js';
import { breakableWallsIn } from './elevation.js';
import { runGeo } from './geojobs.js';
import { streamRankHere, streamNearHere } from './streambudget.js';
import { wijkProfileAt } from './trafficfleet.js';
import { slotChance } from './streetlifedata.js';
import { crateGeometry, cartGeometry } from './streetlife3d.js';
import { decorateScenePed } from './streetlife.js';
import { pannenkoekenschipGeometry } from './pannenkoekenschip.js';
import { dayState } from './daynight.js';

// Ambient city life: benches, bins, bike racks, café terraces, market stalls,
// canal anglers. Streamed per CELL around the player; each cell merges all its
// props into one static mesh plus one market mesh (daytime only). Seated and
// standing scene people are real Pedestrians (state 'idle', ped.scene set) so
// they get speech bubbles and panic like everyone else.

const CELL = 60;
const BUILD_RADIUS = 140;
const DROP_RADIUS = 170;
const GEN_PER_FRAME = 1;
const MAX_SCENE_PEDS = 18;
const DRIVE_CATS = ['major', 'normal', 'minor', 'cycle'];

const MARKETS = [
  { name: 'Grote Markt', x: 162.77, y: 76.17, r: 34 },
  { name: 'Vismarkt', x: 21.21, y: 245.59, r: 38 },
  { name: 'Nieuwe Markt', x: 290, y: 74, r: 24 },
];

const VENDOR_LINES = ['Verse haring, moi!', 'Kom moar kieken!', 'Twee kilo appels, twee euro!', 'Lekker stoet, vers van vandoag!', 'Grunneger metworst! Wie wil der nog ain?', 'Kom moar, t is hail goud spul!', 'Dank joe wel, tot kiek!'];

let group = null;
let material = null;
let protos = null;
const cells = new Map();
// the streamed cells (scripts/perf/geocheck.js compares their merged buffers)
export function cityPropCells() {
  return cells;
}
let genQueue = [];
let world = null;
let studentTimer = 20;
let slotTimer = 0;
let hauler = null;
let pancakeBoat = null;

function hash(cx, cy) {
  return ((cx * 73856093) ^ (cy * 19349663) ^ 0x5bd1e995) >>> 0;
}

function isFree(map, x, y, r, footOk = true) {
  if (isInWater(map, x, y) || isInsideBuilding(map, x, y)) return false;
  if (map.reservedAt && map.reservedAt(x, y)) return false;
  for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
    if (isInsideBuilding(map, x + dx, y + dy) || isInWater(map, x + dx, y + dy)) return false;
  }
  if (isOnRoad(map, x, y, r, DRIVE_CATS)) return false;
  if (!footOk && isOnRoad(map, x, y, 0, ['foot'])) return false;
  for (const t of map.treesNear(x, y, r + 1)) {
    if (Math.hypot(t[0] - x, t[1] - y) < r + 0.7) return false;
  }
  return true;
}

// --- prototype geometry (local space, +X forward, y up) --------------------

function buildBench() {
  const B = new GeoBuilder(1);
  const wood = HABBO_PALETTE.woodMid, iron = 0x2b2f2a;
  for (let i = 0; i < 3; i++) B.box(0.12 - i * 0.14, 0.45, 0, 0.12, 0.04, 1.6, wood);
  for (let i = 0; i < 2; i++) B.box(-0.2, 0.62 + i * 0.14, 0, 0.03, 0.1, 1.6, wood, 0, 0, 0, 0.12);
  for (const z of [-0.65, 0.65]) {
    B.box(-0.02, 0.22, z, 0.42, 0.44, 0.05, iron);
    B.box(-0.2, 0.62, z, 0.05, 0.36, 0.05, iron);
  }
  return B.build();
}

function buildBin() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.24, 0.21, 0.85, 8), composeMatrix(0, 0.425, 0), 0x2f4a3a);
  B.geo(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 8), composeMatrix(0, 0.87, 0), 0x3d5a47);
  B.geo(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 5), composeMatrix(-0.3, 0.45, 0), 0x2b2f2a);
  return B.build();
}

function buildOmafiets(color) {
  const B = new GeoBuilder(1);
  const r = 0.33, black = 0x1a1a1a, chrome = 0x9a9a98;
  for (const x of [-0.52, 0.52]) {
    B.geo(new THREE.TorusGeometry(r, 0.028, 3, 12), composeMatrix(x, r, 0), black);
    B.geo(tubeGeometry([x, r, 0], [x, r + 0.05, 0], 0.02), null, chrome);
    B.box(x, r + 0.34, 0, 0.5, 0.02, 0.07, color, 0, 0, 0, x > 0 ? -0.35 : 0.35);
  }
  const hub = [-0.52, r, 0], bb = [0, 0.3, 0], seat = [-0.18, 0.86, 0], head = [0.4, 0.88, 0], fork = [0.52, r, 0];
  B.geo(tubeGeometry(hub, bb, 0.02), null, color);
  B.geo(tubeGeometry(hub, seat, 0.02), null, color);
  B.geo(tubeGeometry(bb, seat, 0.025), null, color);
  B.geo(tubeGeometry(bb, [0.22, 0.42, 0], 0.028), null, color);
  B.geo(tubeGeometry([0.22, 0.42, 0], head, 0.028), null, color);
  B.geo(tubeGeometry(head, fork, 0.022), null, color);
  B.geo(tubeGeometry(head, [0.34, 1.05, 0], 0.02), null, chrome);
  B.geo(tubeGeometry([0.3, 1.05, -0.28], [0.3, 1.05, 0.28], 0.015), null, chrome);
  B.box(-0.2, 0.92, 0, 0.26, 0.06, 0.14, 0x2a1d14);
  B.box(-0.55, 0.72, 0, 0.42, 0.03, 0.2, black);
  B.box(-0.18, 0.34, 0.06, 0.5, 0.12, 0.02, color);
  return B.build();
}

function buildRackRail(n) {
  const B = new GeoBuilder(1);
  const len = n * 0.7;
  B.geo(tubeGeometry([0, 0.4, -len / 2], [0, 0.4, len / 2], 0.025), null, 0x6b6e70);
  for (let i = 0; i <= n; i++) {
    const z = -len / 2 + i * 0.7;
    B.geo(tubeGeometry([0, 0, z], [0, 0.4, z], 0.02), null, 0x6b6e70);
  }
  return B.build();
}

function buildTable() {
  const B = new GeoBuilder(1);
  B.geo(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 10), composeMatrix(0, 0.73, 0), 0xd8d4cc);
  B.geo(tubeGeometry([0, 0, 0], [0, 0.72, 0], 0.03), null, 0x2b2f2a);
  B.geo(new THREE.CylinderGeometry(0.22, 0.24, 0.03, 8), composeMatrix(0, 0.015, 0), 0x2b2f2a);
  B.geo(new THREE.CylinderGeometry(0.04, 0.035, 0.12, 6), composeMatrix(0.1, 0.81, 0.05), 0xe8e2d0);
  return B.build();
}

function buildChair(color) {
  const B = new GeoBuilder(1);
  B.box(0, 0.45, 0, 0.4, 0.04, 0.4, color);
  B.box(0.2, 0.68, 0, 0.04, 0.42, 0.38, color);
  for (const [dx, dz] of [[0.17, 0.17], [-0.17, 0.17], [0.17, -0.17], [-0.17, -0.17]]) {
    B.geo(tubeGeometry([dx, 0, dz], [dx, 0.44, dz], 0.015, 0.015, 4), null, 0x2b2f2a);
  }
  return B.build();
}

function buildParasol(color) {
  const B = new GeoBuilder(1);
  B.geo(tubeGeometry([0, 0, 0], [0, 2.35, 0], 0.035), null, 0xd8d4cc);
  B.geo(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 8), composeMatrix(0, 0.04, 0), 0x3a3b3f);
  B.geo(new THREE.ConeGeometry(1.5, 0.45, 8, 1, true), composeMatrix(0, 2.2, 0), color);
  B.geo(new THREE.CylinderGeometry(1.5, 1.5, 0.14, 8, 1, true), composeMatrix(0, 1.92, 0), color);
  return B.build();
}

const PRODUCE = [0xb8352a, 0x6f9a3a, 0xd98a2b, 0xe0c24a, 0x7a3b5a, 0x9ab84a, 0xc9a07a];

function buildStall(stripe, seed) {
  const rng = new SeededRng(seed);
  const B = new GeoBuilder(1);
  const W = 2.8, D = 1.9, H = 2.25;
  for (const x of [-D / 2, D / 2]) {
    for (const z of [-W / 2, W / 2]) B.geo(tubeGeometry([x, 0, z], [x, x > 0 ? H - 0.25 : H, z], 0.035), null, 0x6b6e70);
  }
  const stripes = 7;
  for (let i = 0; i < stripes; i++) {
    const z = -W / 2 + (i + 0.5) * (W / stripes);
    B.box(0, H - 0.1, z, D + 0.35, 0.04, W / stripes, i % 2 ? stripe : 0xece8de, 0, 0, 0, -0.14);
  }
  B.box(D / 2 + 0.17, H - 0.42, 0, 0.02, 0.3, W + 0.02, stripe);
  B.box(0.45, 0.45, 0, 0.8, 0.9, W - 0.1, 0x6e4a2f);
  B.box(0.45, 0.91, 0, 0.84, 0.02, W - 0.05, 0xd6cab0);
  for (let i = 0; i < 6; i++) {
    const z = -W / 2 + 0.3 + (i % 3) * 0.95 + rng.range(-0.05, 0.05);
    const x = i < 3 ? 0.65 : 0.25;
    const c = PRODUCE[Math.floor(rng.next() * PRODUCE.length)];
    B.box(x, 1.0, z, 0.36, 0.16, 0.7, 0x9a7048, 0, 0, 0, i < 3 ? 0 : 0);
    for (let k = 0; k < 3; k++) {
      B.geo(new THREE.IcosahedronGeometry(0.1, 0), composeMatrix(x + rng.range(-0.08, 0.08), 1.12, z - 0.2 + k * 0.2), c);
    }
  }
  B.box(-0.6, 0.25, 0.9, 0.45, 0.5, 0.45, 0x9a7048);
  B.box(-0.6, 0.25, -0.9, 0.45, 0.5, 0.45, 0x9a7048);
  return B.build();
}

function buildSunkenBike() {
  const B = new GeoBuilder(1);
  const rust = 0x7a4a2a;
  const bike = buildOmafiets(rust);
  B.geo(bike, composeMatrix(0, -1.05, 0, 0.25, 0, 1.0), rust);
  return B.build();
}

// A 2 m section of the ring's crash barrier and of a cutting's fence: only
// ever seen tumbling away (roadstructures3d.js draws the standing ones).
function buildGuardrail() {
  const B = new GeoBuilder(1);
  B.box(0, 0.65, 0, 2, 0.3, 0.12, 0xa4aaae);
  B.box(-1, 0.375, 0, 0.12, 0.75, 0.12, 0x8a9094);
  return B.build();
}

function buildFenceSection() {
  const B = new GeoBuilder(1);
  B.box(0, 1.06, 0, 2, 0.08, 0.06, 0x2f3336);
  B.box(0, 0.475, 0, 2, 0.05, 0.04, 0x2f3336);
  B.box(-1, 0.55, 0, 0.07, 1.1, 0.07, 0x2f3336);
  return B.build();
}

function initProtos() {
  const bikeColors = [0x1e1e1e, 0x1e1e1e, 0x23324a, 0x2f4a3a, 0x5a2a24, 0x3a3b3f];
  protos = {
    bench: buildBench(),
    bin: buildBin(),
    bikes: bikeColors.map((c) => { const g = buildOmafiets(c); g.userData.tint = c; return g; }),
    rails: [3, 4, 5, 6].map(buildRackRail),
    table: buildTable(),
    chairs: [0x2f4a3a, 0x6b2a24, 0x23324a].map(buildChair),
    parasols: [0xe6e1d6, 0x8f2f2a, 0x2f5a3f, 0xc99a3a].map(buildParasol),
    stalls: [0x8f2f2a, 0x2f5a3f, 0x23428a, 0xc99a3a].map((c, i) => buildStall(c, 17 + i * 31)),
    sunkenBike: buildSunkenBike(),
    vangrail: buildGuardrail(),
    hek: buildFenceSection(),
  };
  for (const v of Object.values(protos)) for (const g of Array.isArray(v) ? v : [v]) whiteUV(g);
}

// A cell's props are merged into one mesh (geokernels.js mergeInstances, in
// the geometry worker): the job carries each distinct geometry's attributes
// and every item's matrix; v0 / vn are the item's vertex range.
const plainAttr = (a) => ({ array: a.array, itemSize: a.itemSize, normalized: a.normalized });
function mergeJob(lists) {
  const ids = new Map(), geos = [];
  const out = lists.map((list) => {
    let o = 0;
    return list.map((it) => {
      const { geo, m } = it;
      let gi = ids.get(geo);
      if (gi === undefined) {
        const A = geo.attributes;
        ids.set(geo, gi = geos.length);
        geos.push({ position: plainAttr(A.position), normal: plainAttr(A.normal), color: plainAttr(A.color), uv: plainAttr(A.uv) });
      }
      it.v0 = o;
      it.vn = geo.attributes.position.count;
      o += it.vn;
      return [gi, m.elements];
    });
  });
  return { geos, lists: out };
}

function mergedGeometry(r) {
  if (!r) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(r.nor, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(r.col, 3, true));
  g.setAttribute('uv', new THREE.BufferAttribute(r.uvs, 2, true));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(r.sphere[0], r.sphere[1], r.sphere[2]), r.sphere[3]);
  return g;
}

function place(x, y, angle, y0 = 0) {
  return composeMatrix(x, y0, y, 0, -angle, 0);
}

// Breakable item: `axis` is the direction of the prop's long side.
function propItem(geo, kind, x, y, angle, axis = angle, extra = null) {
  return { geo, m: place(x, y, angle), prop: { kind, x, y, face: angle, axis, ...extra } };
}

// --- cell generation --------------------------------------------------------

function roadSamples(roads, cx0, cy0, cats, spacing, rng, fn) {
  for (const r of roads) {
    if (!cats.includes(r.cat)) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 4) continue;
      const segA = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let t = rng.range(0, spacing); t < len; t += spacing) {
        const x = a[0] + (b[0] - a[0]) * (t / len), y = a[1] + (b[1] - a[1]) * (t / len);
        if (x < cx0 || x >= cx0 + CELL || y < cy0 || y >= cy0 + CELL) continue;
        fn(r, x, y, segA);
      }
    }
  }
}

// The solid props one clutter cell would place, without building it
// (spotcheck.js probes the race lap with them).
export function cellPropSpots(map, gx, gy) {
  if (!protos) return [];
  const c = generateCell(map, gx, gy);
  return [...c.items, ...c.market].filter((it) => it.prop).map((it) => ({ ...it.prop, angle: it.prop.axis }));
}
// The standing-person slots a cell would get (streetlife_test.mjs counts them).
export function cellSlotSpots(map, gx, gy) {
  if (!protos) return [];
  return generateCell(map, gx, gy).slots.map((s) => ({ kind: s.kind, x: s.x, y: s.y, angle: s.angle, pose: s.pose }));
}
export const CLUTTER_CELL = CELL;

function generateCell(map, cx, cy) {
  const rng = new SeededRng(hash(cx, cy));
  const cx0 = cx * CELL, cy0 = cy * CELL;
  const mid = { x: cx0 + CELL / 2, y: cy0 + CELL / 2 };
  const items = [], market = [], slots = [];
  const taken = [];
  const clear = (x, y, r) => taken.every((t) => Math.hypot(t[0] - x, t[1] - y) > t[2] + r);
  const take = (x, y, r) => taken.push([x, y, r]);
  // a map may measure its own centres
  const centreD = map.centreDist ? map.centreDist(mid.x, mid.y) : dist(mid.x, mid.y, CITY_CENTRE.x, CITY_CENTRE.y);
  const roads = map.roadsNear(mid.x, mid.y, CELL * 0.75);

  for (const mk of MARKETS) {
    if (mk.x < cx0 || mk.x >= cx0 + CELL || mk.y < cy0 || mk.y >= cy0 + CELL) continue;
    const rowA = nearestRoadAngle(map, mk.x, mk.y);
    const fx = Math.cos(rowA), fy = Math.sin(rowA), nx = -fy, ny = fx;
    let n = 0;
    for (const row of [0, 1, -1, 2, -2]) {
      let inRow = 0;
      for (const col of [0, 1, -1, 2, -2, 3, -3, 4, -4]) {
        if (n >= 12 || inRow >= 5) break;
        const x = mk.x + fx * col * 3.3 + nx * row * 6, y = mk.y + fy * col * 3.3 + ny * row * 6;
        if (Math.hypot(x - mk.x, y - mk.y) > mk.r) continue;
        if (!isFree(map, x, y, 1.7) || !clear(x, y, 1.6)) continue;
        take(x, y, 1.6);
        const face = rowA + (row % 2 ? Math.PI / 2 : -Math.PI / 2);
        const stall = propItem(protos.stalls[Math.floor(rng.next() * protos.stalls.length)], 'stall', x, y, face, face + Math.PI / 2);
        market.push(stall);
        if (rng.next() < 0.75) {
          stall.slot = { kind: 'vendor', x: x - Math.cos(face) * 0.55, y: y - Math.sin(face) * 0.55, angle: face, pose: 'vendor', day: true, occ: 0, propKey: propKey('stall', x, y) };
          slots.push(stall.slot);
        }
        n++;
        inRow++;
      }
    }
  }

  for (const pk of PARKS) {
    if (pk.x < cx0 || pk.x >= cx0 + CELL || pk.y < cy0 || pk.y >= cy0 + CELL) continue;
    for (const sp of parkBankSpots(pk)) {
      if (!isFree(map, sp.x, sp.y, 0.9) || !clear(sp.x, sp.y, 1)) continue;
      take(sp.x, sp.y, 1);
      items.push(propItem(protos.bench, 'bench', sp.x, sp.y, sp.angle, sp.angle + Math.PI / 2));
      const bx = sp.x + Math.cos(sp.angle + Math.PI / 2) * 1.5, by = sp.y + Math.sin(sp.angle + Math.PI / 2) * 1.5;
      if (sp.bin && isFree(map, bx, by, 0.35) && clear(bx, by, 0.4)) { take(bx, by, 0.4); items.push(propItem(protos.bin, 'bin', bx, by, sp.angle)); }
    }
  }

  const horeca = (map.meta.horeca || []).filter((h) => h.x >= cx0 && h.x < cx0 + CELL && h.y >= cy0 && h.y < cy0 + CELL);
  let terraces = 0;
  for (const h of horeca) {
    if (terraces >= 3 || dist(h.x, h.y, CITY_CENTRE.x, CITY_CENTRE.y) > 1100) break;
    const spot = findTerraceSpot(map, h, clear);
    if (!spot) continue;
    terraces++;
    const { x, y, angle } = spot;
    const px = -Math.sin(angle), py = Math.cos(angle);
    const sets = [[x + px * 1.1, y + py * 1.1], [x - px * 1.1, y - py * 1.1]].filter(([sx, sy]) => isFree(map, sx, sy, 0.9));
    if (!sets.length) sets.push([x, y]);
    const chairProto = protos.chairs[Math.floor(rng.next() * protos.chairs.length)];
    for (const [sx, sy] of sets) {
      take(sx, sy, 1.1);
      items.push(propItem(protos.table, 'table', sx, sy, angle));
      for (const s of [1, -1]) {
        const chx = sx + Math.cos(angle) * 0.7 * s, chy = sy + Math.sin(angle) * 0.7 * s;
        const chair = propItem(chairProto, 'chair', chx, chy, angle + (s > 0 ? 0 : Math.PI));
        chair.slot = { kind: 'terrace', x: chx, y: chy, angle: angle + (s > 0 ? Math.PI : 0), pose: 'sit', occ: rng.next(), propKey: propKey('chair', chx, chy) };
        items.push(chair);
        slots.push(chair.slot);
      }
    }
    items.push(propItem(protos.parasols[Math.floor(rng.next() * protos.parasols.length)], 'parasol', x, y, angle));
  }

  roadSamples(roads, cx0, cy0, ['foot'], 26, rng, (r, x, y, segA) => {
    if (rng.next() > 0.45) return;
    const side = rng.next() < 0.5 ? 1 : -1;
    const off = (r.width || 4) / 2 + 0.9;
    const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
    const bx = x + nx * off, by = y + ny * off;
    if (!isFree(map, bx, by, 0.9) || !clear(bx, by, 1)) return;
    take(bx, by, 1);
    const face = Math.atan2(-ny, -nx);
    items.push(propItem(protos.bench, 'bench', bx, by, face, face + Math.PI / 2));
    const tx = bx + Math.cos(segA) * 1.4, ty = by + Math.sin(segA) * 1.4;
    if (rng.next() < 0.6 && isFree(map, tx, ty, 0.35) && clear(tx, ty, 0.4)) {
      take(tx, ty, 0.4);
      items.push(propItem(protos.bin, 'bin', tx, ty, face));
    }
  });

  if (centreD < 900) {
    roadSamples(roads, cx0, cy0, ['normal', 'major', 'minor'], 38, rng, (r, x, y, segA) => {
      if (rng.next() > (centreD < 450 ? 0.5 : 0.25)) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = (r.width || 6) / 2 + 1.7;
      const rx = x + nx * off, ry = y + ny * off;
      const n = 3 + Math.floor(rng.next() * 4);
      const len = n * 0.7;
      const fx = Math.cos(segA), fy = Math.sin(segA);
      const ends = [[rx + fx * len / 2, ry + fy * len / 2], [rx - fx * len / 2, ry - fy * len / 2]];
      if (!clear(rx, ry, len / 2 + 0.5)) return;
      if (!isFree(map, rx + nx * 0.6, ry + ny * 0.6, 0.5) || !isFree(map, rx - nx * 0.6, ry - ny * 0.6, 0.3)) return;
      if (ends.some(([ex, ey]) => !isFree(map, ex, ey, 0.4))) return;
      take(rx, ry, len / 2 + 0.5);
      items.push(propItem(protos.rails[n - 3], 'rail', rx, ry, segA + Math.PI / 2, segA, { half: len / 2 }));
      const bikeA = Math.atan2(ny, nx);
      for (let i = 0; i < n; i++) {
        if (rng.next() < 0.18) continue;
        const t = -len / 2 + 0.35 + i * 0.7;
        const bx = rx + fx * t, by = ry + fy * t;
        const geo = protos.bikes[Math.floor(rng.next() * protos.bikes.length)];
        const ba = bikeA + (i % 2 ? Math.PI : 0) + rng.range(-0.08, 0.08);
        items.push(propItem(geo, 'bike', bx, by, ba, ba, { locked: true, tint: geo.userData.tint }));
      }
    });
    roadSamples(roads, cx0, cy0, ['normal', 'minor'], 55, rng, (r, x, y, segA) => {
      if (rng.next() > 0.35) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const off = (r.width || 6) / 2 + 1.2;
      const bx = x + nx * off, by = y + ny * off;
      if (!isFree(map, bx, by, 0.35) || !clear(bx, by, 0.5)) return;
      take(bx, by, 0.5);
      items.push(propItem(protos.bin, 'bin', bx, by, segA));
    });
  }

  if (rng.next() < 0.35) {
    const spot = findQuaySpot(map, cx0, cy0, rng);
    if (spot && clear(spot.x, spot.y, 1)) {
      take(spot.x, spot.y, 1);
      slots.push({ kind: 'fisher', x: spot.x, y: spot.y, angle: spot.angle, pose: 'fish', occ: 0 });
    }
  }
  if (!map.centreDist) streetFolkSlots({ map, rng, cx0, cy0, mid, centreD, roads, items, slots, clear, take });
  if (bernard && bernard.x >= cx0 && bernard.x < cx0 + CELL && bernard.y >= cy0 && bernard.y < cy0 + CELL) {
    const { x, y, angle } = bernard;
    items.push({ geo: crateGeo(), m: place(x, y, angle) });
    items.push({ geo: cartGeo(), m: place(x + Math.sin(angle) * 1.05, y - Math.cos(angle) * 1.05, angle) });
    slots.push({ kind: 'bernard', x, y, angle, pose: 'sit', occ: 0 });
  }
  if (hauler && hauler.x >= cx0 && hauler.x < cx0 + CELL && hauler.y >= cy0 && hauler.y < cy0 + CELL) {
    const { x, y, angle } = hauler;
    const bx = x + Math.cos(angle) * 1.9, by = y + Math.sin(angle) * 1.9;
    items.push({ geo: protos.sunkenBike, m: place(bx, by, angle + Math.PI / 2) });
    items.push({ geo: ropeGeometry(), m: place(x, y, angle) });
    slots.push({ kind: 'hauler', x, y, angle, pose: 'haul', occ: 0 });
  }

  if (pancakeBoat && pancakeBoat.x >= cx0 && pancakeBoat.x < cx0 + CELL && pancakeBoat.y >= cy0 && pancakeBoat.y < cy0 + CELL) {
    items.push({ geo: pancakeBoatGeo(), m: place(pancakeBoat.x, pancakeBoat.y, pancakeBoat.angle) });
  }

  generateClutter({ map, rng, cx0, cy0, CELL, centreD, roads, items, clear, take, horeca });

  // nothing street-level on the ring's viaducts, embankments and cuttings,
  // and nothing standing in a carriageway (a railing or bin offset from one
  // way can land on the next)
  const offLimits = (x, y) => map.onCarriageway(x, y, -0.4) || (map.elev && map.elev.has && map.offStreetLevel(x, y)) || (map.reservedAt && map.reservedAt(x, y));
  for (let i = items.length - 1; i >= 0; i--) {
    const e = items[i].m && items[i].m.elements;
    if (e && offLimits(e[12], e[14])) items.splice(i, 1);
  }
  for (let i = slots.length - 1; i >= 0; i--) if (offLimits(slots[i].x, slots[i].y)) slots.splice(i, 1);
  const walls = map.elev && map.elev.has ? breakableWallsIn(map.elev, cx0, cy0, CELL) : [];

  return { cx, cy, items, market, slots, walls, mesh: null, marketMesh: null, active: false };
}

let crateGeoCache = null, cartGeoCache = null;
const crateGeo = () => crateGeoCache || (crateGeoCache = whiteUV(crateGeometry()));
const cartGeo = () => cartGeoCache || (cartGeoCache = whiteUV(cartGeometry()));

// Street-paper sellers and someone sitting with a cup in the busy parts, and
// magnet fishers on the quays (streetlifedata.slotChance: heavy in the
// centre, none in the polders; the Ommeland's own map is left alone).
function streetFolkSlots({ map, rng, cx0, cy0, mid, centreD, roads, items, slots, clear, take }) {
  const prof = wijkProfileAt(map, mid.x, mid.y).key;
  const onPavement = (kind, cats, off, pose, crate) => {
    if (rng.next() >= slotChance(kind, prof, centreD)) return;
    let done = false;
    roadSamples(roads, cx0, cy0, cats, 30, rng, (r, x, y, segA) => {
      if (done || rng.next() > 0.3) return;
      const side = rng.next() < 0.5 ? 1 : -1;
      const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
      const o = (r.width || 4) / 2 + off;
      const bx = x + nx * o, by = y + ny * o;
      if (!isFree(map, bx, by, 0.6) || !clear(bx, by, 1.4)) return;
      take(bx, by, 1.4);
      done = true;
      const face = Math.atan2(-ny, -nx);
      if (crate) items.push({ geo: crateGeo(), m: place(bx, by, face) });
      slots.push({ kind, x: bx, y: by, angle: face, pose, occ: 0 });
    });
  };
  onPavement('seller', ['foot', 'minor', 'normal'], 0.9, 'vendor', false);
  onPavement('beggar', ['foot', 'minor'], 0.8, 'sit', true);
  if (rng.next() < slotChance('magnet', prof, centreD)) {
    const spot = findQuaySpot(map, cx0, cy0, rng);
    if (spot && clear(spot.x, spot.y, 1.2)) {
      take(spot.x, spot.y, 1.2);
      items.push({ geo: ropeGeometry(), m: place(spot.x, spot.y, spot.angle) });
      slots.push({ kind: 'magnet', x: spot.x, y: spot.y, angle: spot.angle, pose: 'haul', occ: 0 });
    }
  }
}

let ropeGeo = null;
function ropeGeometry() {
  if (!ropeGeo) {
    const B = new GeoBuilder(1);
    B.geo(tubeGeometry([0.45, 1.05, 0], [1.9, -0.55, 0], 0.012, 0.012, 3), null, 0xd8c89a);
    B.box(1.9, -0.6, 0, 0.12, 0.08, 0.12, 0x6b6e70);
    ropeGeo = whiteUV(B.build());
  }
  return ropeGeo;
}

function nearestRoadAngle(map, x, y) {
  const rp = map.nearestRoadPoint(x, y, 120, true);
  if (!rp) return 0;
  const q = nearestOnRoadList([rp.road], x, y);
  return q ? Math.atan2(q.dy, q.dx) : 0;
}

function findTerraceSpot(map, h, clear) {
  let best = null;
  for (const r of [2.2, 3.2, 4.2, 5.5, 7]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r;
      if (!isFree(map, x, y, 1.3) || !clear(x, y, 2.2)) continue;
      const back = x - Math.cos(a) * 3.5, backY = y - Math.sin(a) * 3.5;
      if (!isInsideBuilding(map, back, backY) && !isInsideBuilding(map, h.x, h.y)) continue;
      best = { x, y, angle: a };
      break;
    }
    if (best) break;
  }
  return best;
}

// A walkable point right at a quay edge, facing the water.
function findQuaySpot(map, cx0, cy0, rng) {
  const polys = map.waterNear(cx0 + CELL / 2, cy0 + CELL / 2, CELL / 2);
  for (const w of polys) {
    const pts = w.pts;
    const start = Math.floor(rng.next() * pts.length);
    for (let j = 0; j < Math.min(pts.length, 60); j++) {
      const i = (start + j) % (pts.length - 1);
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 4) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (mx < cx0 || mx >= cx0 + CELL || my < cy0 || my >= cy0 + CELL) continue;
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (const s of [1, -1]) {
        const ox = mx + nx * s * 0.7, oy = my + ny * s * 0.7;
        const wx = mx - nx * s * 1.5, wy = my - ny * s * 1.5;
        if (!isInWater(map, wx, wy) || isInWater(map, ox, oy)) continue;
        if (!isFree(map, ox + nx * s * 0.4, oy + ny * s * 0.4, 0.4) || isInsideBuilding(map, ox, oy)) continue;
        return { x: ox, y: oy, angle: Math.atan2(-ny * s, -nx * s) };
      }
    }
  }
  return null;
}

// Bernhard sits where the Grote Markt's stalls end, on a footway, facing the street.
let bernard = null;
export function getBernardSpot() {
  return bernard;
}
function findBernardSpot(map) {
  const m = MARKETS[0];
  const rng = new SeededRng(777);
  let best = null, bestD = Infinity;
  for (const road of map.roadsNear(m.x, m.y, m.r + 40)) {
    if (road.cat !== 'foot' || !road.pts || road.pts.length < 2) continue;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const a = road.pts[i], b = road.pts[i + 1];
      const segA = Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (const side of [1, -1]) {
        const nx = -Math.sin(segA) * side, ny = Math.cos(segA) * side;
        const o = (road.width || 3) / 2 + 1.0;
        const x = (a[0] + b[0]) / 2 + nx * o, y = (a[1] + b[1]) / 2 + ny * o;
        const d = Math.abs(Math.hypot(x - m.x, y - m.y) - (m.r + 8)) + rng.next() * 0.01;
        if (d >= bestD || !isFree(map, x, y, 1.6) || !isFree(map, x - ny * 1.05, y + nx * 1.05, 0.7)) continue;
        bestD = d;
        best = { x, y, angle: Math.atan2(-ny, -nx) };
      }
    }
  }
  return best;
}

// Het Pannenkoekenschip (#23): moored along the first long quay near the
// Noorderhaven, parallel to it, a little out into the water.
let pancakeGeoCache = null;
const pancakeBoatGeo = () => pancakeGeoCache || (pancakeGeoCache = whiteUV(pannenkoekenschipGeometry({ len: 24, wid: 6 })));
function findPancakeBoatSpot(map) {
  const rng = new SeededRng(2323);
  const target = { x: -420, y: -40 };
  const len = 24, wid = 6;
  let best = null, bestD = Infinity;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gy = -4; gy <= 4; gy++) {
      const cx0 = Math.floor(target.x / CELL + gx) * CELL, cy0 = Math.floor(target.y / CELL + gy) * CELL;
      const s = findQuaySpot(map, cx0, cy0, rng);
      if (!s) continue;
      // s.angle points from the quay into the water
      const ux = Math.cos(s.angle), uy = Math.sin(s.angle), off = wid / 2 + 1.2;
      const x = s.x + ux * off, y = s.y + uy * off, ax = -uy, ay = ux;
      const water = [[0, 0], [len / 2, 0], [-len / 2, 0], [len / 2, wid / 2], [-len / 2, -wid / 2], [len / 2, -wid / 2], [-len / 2, wid / 2]];
      if (!water.every(([a, b]) => isInWater(map, x + ax * a + ux * b, y + ay * a + uy * b))) continue;
      const d = Math.hypot(x - target.x, y - target.y);
      if (d < bestD) { bestD = d; best = { x, y, angle: Math.atan2(ay, ax) }; }
    }
  }
  return best;
}

// Where the boat lies, and the quay spot opposite it where the pancake minigame
// (pannenkoek.js) starts: a few metres back from the water's edge.
export function getPancakeBoatSpot() {
  if (!pancakeBoat) return null;
  const ux = Math.sin(pancakeBoat.angle), uy = -Math.cos(pancakeBoat.angle);
  return { ...pancakeBoat, quay: { x: pancakeBoat.x - ux * 5.2, y: pancakeBoat.y - uy * 5.2 } };
}

function findHaulerSpot(map) {
  const rng = new SeededRng(4242);
  const target = { x: 15.27, y: 372.53 };
  let best = null, bestD = Infinity;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gy = -4; gy <= 4; gy++) {
      const cx0 = Math.floor(target.x / CELL + gx) * CELL, cy0 = Math.floor(target.y / CELL + gy) * CELL;
      const s = findQuaySpot(map, cx0, cy0, rng);
      if (!s) continue;
      const d = Math.hypot(s.x - target.x, s.y - target.y);
      if (d < bestD) { bestD = d; best = s; }
    }
  }
  return best;
}

// --- streaming ------------------------------------------------------------

function collapseItem(mesh, it) {
  const pos = mesh.geometry.attributes.position;
  const a = pos.array, o = it.v0 * 3;
  for (let i = 3; i < it.vn * 3; i += 3) { a[o + i] = a[o]; a[o + i + 1] = a[o + 1]; a[o + i + 2] = a[o + 2]; }
  pos.needsUpdate = true;
}

function registerItems(cell, list, mesh) {
  for (const it of list) {
    const d = it.prop;
    if (!d) continue;
    const key = propKey(d.kind, d.x, d.y);
    if (isPropBroken(key)) { collapseItem(mesh, it); continue; }
    if (!it.p) {
      it.p = makeProp(d.kind, d.x, d.y, {
        ...d.opts,
        key,
        angle: d.axis,
        face: d.face,
        tint: d.tint,
        locked: !!d.locked,
        ...(d.half ? { half: d.half } : null),
        makeMesh: () => {
          const m = new THREE.Mesh(it.geo, material);
          if (d.tilted) m.quaternion.setFromRotationMatrix(it.m);
          else m.rotation.y = -d.face;
          return m;
        },
      });
    }
    it.p.onBreak = () => {
      if (it.mesh) collapseItem(it.mesh, it);
      if (it.slot) scareSlotPed(it.slot);
    };
    it.p.off = false;
    it.mesh = mesh;
    if (addProp(it.p)) cell.props.push(it.p);
  }
}

// The breakable crash barrier and fence sections of the ring in this cell:
// props without a cell mesh, hiding their piece of the road structure.
function registerWalls(cell) {
  for (const d of cell.walls || []) {
    const key = propKey(d.kind, d.x, d.y), w = d.w;
    if (isPropBroken(key)) { if (w.collapse) w.collapse(); continue; }
    if (!d.p) {
      const geo = protos[d.kind];
      d.p = makeProp(d.kind, d.x, d.y, {
        // (a sunken road's fence stands at street level, under the decks crossing it)
        key, angle: d.angle, face: d.angle, half: d.half, z: d.z, top: d.z + (d.kind === 'hek' ? 1.1 : 0.8), base: d.z - 1.2,
        makeMesh: () => {
          const m = new THREE.Mesh(geo, material);
          m.rotation.y = -d.angle;
          m.scale.x = d.half;
          return m;
        },
      });
      d.p.onBreak = () => { if (w.collapse) w.collapse(); };
      d.p.onRestore = () => { if (w.restore) w.restore(); };
    }
    d.p.off = false;
    if (addProp(d.p)) cell.props.push(d.p);
  }
}

function scareSlotPed(slot) {
  const ped = slot.ped;
  slot.ped = null;
  if (!ped || !ped.scene || ped.state === 'dead') return;
  releaseFromScene(ped);
  ped.state = 'flee';
  ped.stateUntil = world.time + 6 + Math.random() * 3;
  ped.fleeFrom = { x: slot.x, y: slot.y };
}

function buildCellMeshes(cell) {
  cell.props = [];
  cell.active = true;
  const token = cell.buildToken = (cell.buildToken || 0) + 1;
  // near: the merge of the cell at the player's feet goes before one far behind
  // (geojobs.js queue), and at speed the cells ahead come first (#247)
  const near = streamNearHere((cell.cx + 0.5) * CELL, (cell.cy + 0.5) * CELL);
  runGeo('cityMerge', mergeJob([cell.items, cell.market]), ([r, mr]) => {
    if (cell.buildToken !== token || !cell.active) return;
    const g = mergedGeometry(r);
    if (g) {
      cell.mesh = new THREE.Mesh(g, material);
      cell.mesh.castShadow = true;
      cell.mesh.receiveShadow = true;
      group.add(cell.mesh);
      registerItems(cell, cell.items, cell.mesh);
    }
    const mg = mergedGeometry(mr);
    if (mg) {
      cell.marketMesh = new THREE.Mesh(mg, material);
      cell.marketMesh.castShadow = true;
      cell.marketMesh.receiveShadow = true;
      group.add(cell.marketMesh);
      registerItems(cell, cell.market, cell.marketMesh);
    }
    registerWalls(cell);
  }, near);
}

function dropCell(cell) {
  cell.buildToken = (cell.buildToken || 0) + 1;
  for (const p of cell.props || []) removeProp(p);
  cell.props = [];
  for (const it of cell.items) it.mesh = null;
  for (const it of cell.market) it.mesh = null;
  for (const m of [cell.mesh, cell.marketMesh]) {
    if (!m) continue;
    group.remove(m);
    m.geometry.dispose();
  }
  cell.mesh = cell.marketMesh = null;
  cell.active = false;
  for (const s of cell.slots) removeSlotPed(s);
}

function removeSlotPed(slot) {
  const ped = slot.ped;
  slot.ped = null;
  if (!ped || !ped.scene) return;
  setPedPose(ped, null);
  const i = world.pedestrians.indexOf(ped);
  if (i >= 0) world.pedestrians.splice(i, 1);
}

const isNight = () => dayState(world).isNight;

function slotWanted(slot, night) {
  if (slot.propKey && isPropBroken(slot.propKey)) return false;
  if (slot.kind === 'vendor') return !night;
  if (slot.kind === 'terrace') return slot.occ < (night ? 0.8 : 0.4);
  if (slot.kind === 'fisher' || slot.kind === 'seller' || slot.kind === 'magnet') return !night;
  return true;
}

function updateSlots(activeCells) {
  const night = isNight();
  const alive = new Set(world.pedestrians);
  let count = 0;
  for (const cell of activeCells) for (const s of cell.slots) if (s.ped && s.ped.scene && alive.has(s.ped)) count++;
  const p = world.player;
  const ordered = [];
  for (const cell of activeCells) for (const s of cell.slots) ordered.push(s);
  ordered.sort((a, b) => (a.kind === 'terrace') - (b.kind === 'terrace'));
  {
    for (const s of ordered) {
      if (s.ped && (!s.ped.scene || !alive.has(s.ped) || s.ped.state === 'dead')) {
        if (s.ped.scene && alive.has(s.ped)) removeSlotPed(s);
        s.ped = null;
        s.cooldownUntil = world.time + 90;
      }
      const want = slotWanted(s, night);
      if (s.ped && !want) { removeSlotPed(s); count--; continue; }
      if (s.ped || !want || count >= MAX_SCENE_PEDS || world.time < (s.cooldownUntil || 0)) continue;
      if (dist(s.x, s.y, p.x, p.y) < 25 && world.time > 5) continue;
      if (world.time > 5 && !isSpawnHidden(world, s.x, s.y)) continue;
      const ped = new Pedestrian(s.x, s.y, s.angle);
      ped.state = 'idle';
      ped.scene = { x: s.x, y: s.y, angle: s.angle, pose: s.pose, kind: s.kind };
      decorateScenePed(ped, s.kind);
      setPedPose(ped, s.pose);
      world.pedestrians.push(ped);
      s.ped = ped;
      count++;
    }
  }
}

let vendorLineAt = -Infinity;
let haulerSpoke = false;
function sceneChatter(activeCells) {
  const p = world.player;
  for (const cell of activeCells) {
    for (const s of cell.slots) {
      const ped = s.ped;
      if (!ped || !ped.scene || ped.state !== 'idle') continue;
      const d = dist(ped.x, ped.y, p.x, p.y);
      if (s.kind === 'hauler' && !haulerSpoke && d < 9) {
        haulerSpoke = true;
        ped.speechText = 'Alweer n fiets uut t Diep, joh!';
        ped.speechUntil = world.time + 4;
      } else if (s.kind === 'vendor' && d < 8 && world.time - vendorLineAt > 35) {
        vendorLineAt = world.time;
        ped.speechText = VENDOR_LINES[Math.floor(Math.random() * VENDOR_LINES.length)];
        ped.speechUntil = world.time + 3;
      }
    }
  }
}

// Groups of students cycling together through the centre in daytime.
function spawnStudentGroup() {
  const { map, player } = world;
  if (dist(player.x, player.y, CITY_CENTRE.x, CITY_CENTRE.y) > CITY_CENTRE.r + 400 || isNight()) return;
  const bikes = world.vehicles.filter((v) => v.isBike).length;
  if (bikes > 26) return;
  const roads = map.roadsNear(player.x, player.y, 110).filter((r) => (r.cat === 'cycle' || r.cat === 'minor') && r.pts.length >= 2);
  for (let attempt = 0; attempt < 6 && roads.length; attempt++) {
    const road = roads[Math.floor(Math.random() * roads.length)];
    const lead = spawnVehicleOnRoad(map, road, false, Math.random, true);
    const d = dist(lead.x, lead.y, player.x, player.y);
    if (d < 55 || d > 115) continue;
    if (world.vehicles.some((v) => dist(v.x, v.y, lead.x, lead.y) < 10)) continue;
    const n = 3 + Math.floor(Math.random() * 2);
    const riders = ['#3f5c8a', '#c94b3a', '#1f4a2e', '#c9a227', '#4a3a54', '#e8e6e0'];
    const group = [lead];
    const bx = Math.cos(lead.angle), by = Math.sin(lead.angle);
    for (let k = 1; k < n; k++) {
      const v = spawnVehicleOnRoad(map, road, false, Math.random, true, false, { x: lead.x, y: lead.y });
      v.angle = lead.angle;
      v.dir = lead.dir;
      v.segIdx = lead.segIdx;
      v.x = lead.x - bx * 2.4 * k + -by * (k % 2 ? 0.5 : -0.1);
      v.y = lead.y - by * 2.4 * k + bx * (k % 2 ? 0.5 : -0.1);
      if (isInsideBuilding(map, v.x, v.y) || isInWater(map, v.x, v.y)) continue;
      group.push(v);
    }
    for (const v of group) {
      v.model = { ...v.model, rider: riders[Math.floor(Math.random() * riders.length)], maxSpeed: 5.4 };
      v.studentGroup = true;
    }
    world.vehicles.push(...group);
    return;
  }
}

export function initCityProps(w) {
  world = w;
  const atlas = initClutter();
  initProtos();
  material = vcMaterial({ roughness: 0.9, map: atlas });
  hauler = findHaulerSpot(w.map);
  pancakeBoat = findPancakeBoatSpot(w.map);
  bernard = w.map.centreDist ? null : findBernardSpot(w.map);
}

export function updateCityProps(dt, w, scene) {
  if (!protos || !scene) return;
  world = w;
  if (!group) {
    group = new THREE.Group();
    group.name = 'cityprops';
    scene.add(group);
  }
  const p = w.player;
  const pcx = Math.floor(p.x / CELL), pcy = Math.floor(p.y / CELL);
  const span = Math.ceil(BUILD_RADIUS / CELL);
  const activeCells = [];
  // generating a cell and building its meshes are both several ms: at most
  // one of the two per frame, except for the cell the player stands in
  let busy = false;

  for (let gx = pcx - span; gx <= pcx + span; gx++) {
    for (let gy = pcy - span; gy <= pcy + span; gy++) {
      const dx = Math.max(0, Math.abs(p.x - (gx + 0.5) * CELL) - CELL / 2);
      const dy = Math.max(0, Math.abs(p.y - (gy + 0.5) * CELL) - CELL / 2);
      if (Math.hypot(dx, dy) > BUILD_RADIUS) continue;
      const key = gx + ',' + gy;
      if (!cells.has(key)) {
        if (!genQueue.includes(key)) genQueue.push(key);
        continue;
      }
      const cell = cells.get(key);
      if (!cell.active && (!busy || (gx === pcx && gy === pcy))) { buildCellMeshes(cell); busy = true; }
    }
  }

  genQueue = genQueue.filter((key) => {
    const [gx, gy] = key.split(',').map(Number);
    return Math.hypot(p.x - (gx + 0.5) * CELL, p.y - (gy + 0.5) * CELL) < BUILD_RADIUS + CELL;
  });
  genQueue.sort((a, b) => {
    // in de rijrichting eerst (#247): hetzelfde vooruitkijken als de gebouwen
    const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number);
    return streamRankHere((ax + 0.5) * CELL, (ay + 0.5) * CELL) - streamRankHere((bx + 0.5) * CELL, (by + 0.5) * CELL);
  });
  for (let i = 0; i < GEN_PER_FRAME && genQueue.length; i++) {
    if (busy && genQueue[0] !== pcx + ',' + pcy) break;
    const key = genQueue.shift();
    const [gx, gy] = key.split(',').map(Number);
    cells.set(key, generateCell(w.map, gx, gy));
  }

  const night = isNight();
  for (const cell of cells.values()) {
    if (!cell.active) continue;
    const cxm = (cell.cx + 0.5) * CELL, cym = (cell.cy + 0.5) * CELL;
    if (Math.hypot(p.x - cxm, p.y - cym) > DROP_RADIUS + CELL / 2) { dropCell(cell); continue; }
    if (cell.marketMesh && cell.marketMesh.visible === night) {
      cell.marketMesh.visible = !night;
      for (const it of cell.market) if (it.p) it.p.off = night;
    }
    activeCells.push(cell);
  }
  if (cells.size > 400) {
    for (const [key, cell] of cells) if (!cell.active) cells.delete(key);
  }

  updateBreakables(dt, w, scene);
  if (w.paused) return;
  slotTimer -= dt;
  if (slotTimer <= 0) {
    slotTimer = 0.5;
    updateSlots(activeCells);
  }
  sceneChatter(activeCells);
  studentTimer -= dt;
  if (studentTimer <= 0) {
    studentTimer = 25 + Math.random() * 20;
    spawnStudentGroup();
  }
}
