import { markInstancesDirty, WATER_Y } from './util.js';
import { waterAt } from './waterlevels.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BLOCK, MAAR_WATER, chash, edgeDistance, edgeRoad, maarX, maarY, provinceBlock, rectOutside } from './countryfield.js';
import { roadKind } from './tileplace.js';
import { ROAD_C, openLand } from './countryplan.js';
import { GeoBuilder, vcMaterial, markShared, composeMatrix, tubeGeometry } from './pixelart3d.js';
import { tractorBodyGeometry, tractorBaseGeometry, trailerBodyGeometry, trailerBaseGeometry } from './countrymodels.js';
import { glowMaterial, headlightGeometry } from './countryglow.js';
import { Vehicle, MODELS, TRACTOR_MODEL, QUAD_MODEL, makeTwoWheeler, attachToNearestRoad } from './vehicle.js';
import { isSpawnHidden } from './pedestrians.js';

// Life in the Ommelanden: a few slow road users on the polder roads (a
// tractor, a cyclist, the odd car), boats puttering along the maaren, and
// birds: lapwing and starling flocks resting on the fields that fly up and
// wheel round when disturbed, and skeins of geese passing overhead. All of
// it spawns out in the fog around the player and is capped to a handful.

const MAX_TRAFFIC = 5;
const MAX_BOATS = 3;
const LANE = 1.25;
const FLOCK_R = 230;
// within this range a car, tractor, quad or bike is a real vehicle (world.vehicles:
// enter, steal, crash, damage), handed back to the light mesh past RELEASE_R
const CONVERT_R = 70;
const RELEASE_R = 110;

let L = null;

// ------------------------------------------------------------------ meshes

const MAT = markShared(vcMaterial({ roughness: 0.85 }));
const tintMats = new Map();
function tinted(color) {
  let m = tintMats.get(color);
  if (!m) { m = markShared(vcMaterial({ roughness: 0.8, color })); tintMats.set(color, m); }
  return m;
}
const geoCache = new Map();
const cachedGeo = (k, fn) => geoCache.get(k) || geoCache.set(k, markShared(fn())).get(k);

function carGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.62, 0, 4.1, 0.62, 1.72, 0xffffff);
  B.box(-0.3, 1.2, 0, 2.3, 0.56, 1.6, 0xffffff);
  B.box(-0.3, 1.2, 0, 2.34, 0.44, 1.64, 0x2a3440);
  B.box(2.06, 0.62, 0, 0.04, 0.2, 1.3, 0xe8e6d8);
  B.box(-2.06, 0.7, 0, 0.04, 0.16, 1.4, 0xa02020);
  for (const x of [-1.3, 1.3]) for (const s of [-1, 1]) B.geo(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateX(Math.PI / 2), composeMatrix(x, 0.34, s * 0.8), 0x1a1a1a);
  return B.build();
}

function quadGeometry() {
  const B = new GeoBuilder();
  B.box(0, 0.62, 0, 2.0, 0.3, 1.0, 0xffffff);
  B.box(-0.2, 0.85, 0, 0.6, 0.12, 0.36, 0x1c1c1c);
  B.box(0.0, 1.35, 0, 0.3, 0.6, 0.4, 0x5a6a50);
  B.geo(new THREE.SphereGeometry(0.13, 8, 6), composeMatrix(0.0, 1.78, 0), 0xe0b090);
  for (const x of [-0.65, 0.65]) for (const s of [-1, 1]) B.geo(new THREE.CylinderGeometry(0.3, 0.3, 0.26, 10).rotateX(Math.PI / 2), composeMatrix(x, 0.3, s * 0.47), 0x1a1a1a);
  return B.build();
}

function cyclistGeometry() {
  const B = new GeoBuilder();
  const F = 0x2a2a2a;
  for (const x of [-0.55, 0.55]) B.geo(new THREE.TorusGeometry(0.33, 0.035, 4, 12), composeMatrix(x, 0.35, 0), F);
  B.geo(tubeGeometry([-0.55, 0.35, 0], [0.05, 0.75, 0], 0.025, 0.025, 4), null, F);
  B.geo(tubeGeometry([0.05, 0.75, 0], [0.55, 0.35, 0], 0.025, 0.025, 4), null, F);
  B.geo(tubeGeometry([0.45, 0.95, 0], [0.55, 0.35, 0], 0.025, 0.025, 4), null, F);
  B.box(0.45, 0.98, 0, 0.06, 0.04, 0.5, F);
  B.box(-0.12, 1.2, 0, 0.26, 0.5, 0.36, 0xffffff);
  B.geo(tubeGeometry([-0.1, 0.95, 0.1], [0.05, 0.55, 0.1], 0.06, 0.05, 4), null, 0x2a3450);
  B.geo(tubeGeometry([-0.1, 0.95, -0.1], [0.05, 0.55, -0.1], 0.06, 0.05, 4), null, 0x2a3450);
  B.geo(tubeGeometry([0.0, 1.35, 0.15], [0.42, 1.0, 0.2], 0.04, 0.035, 4), null, 0xffffff);
  B.geo(tubeGeometry([0.0, 1.35, -0.15], [0.42, 1.0, -0.2], 0.04, 0.035, 4), null, 0xffffff);
  B.geo(new THREE.SphereGeometry(0.13, 8, 6), composeMatrix(0.02, 1.58, 0), 0xe0b090);
  B.box(-0.62, 0.62, 0, 0.3, 0.06, 0.18, F);
  return B.build();
}

function boatGeometry(kind) {
  const B = new GeoBuilder();
  if (kind === 0) {
    // sloep: white hull, teak deck, someone at the tiller
    B.box(0, 0.35, 0, 5.2, 0.5, 1.9, 0xecebe6);
    B.geo(new THREE.ConeGeometry(0.95, 1.2, 4, 1).rotateZ(-Math.PI / 2).rotateX(Math.PI / 4), composeMatrix(3.2, 0.35, 0, 0, 0, 0, 1, 0.37, 1), 0xecebe6);
    B.box(0, 0.62, 0, 5.0, 0.06, 1.7, 0x9a6a42);
    B.box(-1.8, 0.95, 0, 0.5, 0.6, 0.4, 0x2a4a7a);
    B.geo(new THREE.SphereGeometry(0.13, 8, 6), composeMatrix(-1.8, 1.38, 0), 0xe0b090);
    B.box(0.6, 0.8, 0, 1.2, 0.35, 1.4, 0x2a4a7a);
  } else if (kind === 1) {
    // praam: flat green work barge
    B.box(0, 0.3, 0, 7.5, 0.5, 2.6, 0x2f4a3a);
    B.box(0, 0.58, 0, 7.3, 0.06, 2.4, 0x6a5a48);
    B.box(-2.8, 1.1, 0, 1.2, 1.0, 1.4, 0xd8d4c8);
    B.box(-2.8, 1.62, 0, 1.4, 0.1, 1.6, 0x2f4a3a);
  } else {
    // canoe with two paddlers
    B.geo(new THREE.CylinderGeometry(0.35, 0.35, 4.2, 8, 1).rotateZ(Math.PI / 2), composeMatrix(0, 0.12, 0, 0, 0, 0, 1, 0.55, 1), 0xc9502a);
    for (const x of [-1, 1]) {
      B.box(x, 0.5, 0, 0.3, 0.5, 0.36, x < 0 ? 0xd6b43a : 0x3a7a4a);
      B.geo(new THREE.SphereGeometry(0.12, 8, 6), composeMatrix(x, 0.88, 0), 0xe0b090);
      B.box(x + 0.2, 0.55, 0, 0.05, 0.05, 1.8, 0x5a3a22, 0, 0.5, 0, 0.3);
    }
  }
  return B.build();
}

// birds: frame 0 folded (sitting), 1 wings up, 2 wings down
const BIRDS = {
  lapwing: { back: 0x1e2a22, belly: 0xeeeeea, scale: 1, flap: 4.2 },
  starling: { back: 0x1f1d22, belly: 0x3a3440, scale: 0.8, flap: 7 },
  goose: { back: 0x6e6a60, belly: 0xc8c2b4, scale: 2.6, flap: 2.3 },
};
function birdGeometry(sp, frame) {
  const C = BIRDS[sp];
  const B = new GeoBuilder();
  B.box(0, 0.1, 0, 0.3, 0.1, 0.11, C.back);
  B.box(0, 0.06, 0, 0.26, 0.04, 0.1, C.belly);
  B.box(0.18, 0.14, 0, 0.09, 0.08, 0.08, C.back);
  B.tri([-0.15, 0.11, 0.03], [-0.15, 0.11, -0.03], [-0.25, 0.1, 0], C.back);
  if (sp === 'goose') B.box(0.28, 0.15, 0, 0.14, 0.035, 0.035, C.back);
  const tip = frame === 0 ? [[-0.06, 0.15, 0.07], [-0.14, 0.14, 0.06]] : frame === 1 ? [[0.0, 0.3, 0.32], [-0.06, 0.28, 0.3]] : [[0.0, -0.08, 0.3], [-0.06, -0.06, 0.28]];
  for (const s of [1, -1]) {
    const [t0, t1] = tip;
    B.quadOut([0.08, 0.12, s * 0.05], [-0.07, 0.12, s * 0.05], [t1[0], t1[1], s * t1[2]], [t0[0], t0[1], s * t0[2]], [0, 1, 0], C.back);
    B.quadOut([0.08, 0.12, s * 0.05], [t0[0], t0[1], s * t0[2]], [t1[0], t1[1], s * t1[2]], [-0.07, 0.12, s * 0.05], [0, -1, 0], C.belly);
  }
  return B.build();
}

function init(scene) {
  const group = new THREE.Group();
  group.name = 'countrylife';
  scene.add(group);
  const birdPools = {};
  for (const sp of Object.keys(BIRDS)) {
    birdPools[sp] = [0, 1, 2].map((f) => {
      const m = new THREE.InstancedMesh(markShared(birdGeometry(sp, f)), MAT, 500);
      m.count = 0;
      m.frustumCulled = false;
      m.userData.shared = true;
      group.add(m);
      return m;
    });
  }
  L = { group, traffic: [], boats: [], birdPools, skeins: [], spawnT: 0, boatT: 0, skeinT: 20, ms: 0 };
  window.__countrylife = L;
}

// ------------------------------------------------------------------ roads

const roadV = (i, j) => edgeRoad(i, j, 0);
const roadH = (i, j) => edgeRoad(i, j, 1);

function onRoad(axis, line, c) {
  const k = Math.floor(c / BLOCK);
  return axis === 'v' ? roadV(line, k) : roadH(k, line);
}

function roadPos(a, lateral = LANE) {
  if (a.real) return realPos(a);
  const off = -a.dir * lateral;
  if (a.axis === 'v') return [a.line * BLOCK + ROAD_C + off, a.c];
  return [a.c, a.line * BLOCK + ROAD_C - off];
}

function makeTraffic(type, R) {
  const g = new THREE.Group();
  let vmax;
  if (type === 'tractor') {
    const col = [0x3f7d3a, 0xb8322a, 0x2f5fa8, 0x3f7d3a][Math.floor(R() * 4)];
    g.add(new THREE.Mesh(cachedGeo('tb', tractorBodyGeometry), tinted(col)));
    g.add(new THREE.Mesh(cachedGeo('tba', tractorBaseGeometry), MAT));
    if (R() < 0.55) {
      const tb = new THREE.Mesh(cachedGeo('trb', trailerBodyGeometry), tinted(R() < 0.5 ? 0x8a3a2a : 0x3a6a3a));
      const tbb = new THREE.Mesh(cachedGeo('trba', trailerBaseGeometry), MAT);
      for (const m of [tb, tbb]) { m.position.x = -6.4; m.userData.trailer = true; g.add(m); }
    }
    vmax = 6 + R() * 3;
  } else if (type === 'car') {
    g.add(new THREE.Mesh(cachedGeo('car', carGeometry), tinted([0xd8d8d4, 0x2a2a2e, 0x8a1e1e, 0x2a4a7a, 0x9aa0a4][Math.floor(R() * 5)])));
    vmax = 13 + R() * 5;
  } else if (type === 'quad') {
    g.add(new THREE.Mesh(cachedGeo('quad', quadGeometry), tinted([0xb8322a, 0x2f5fa8, 0x3f7d3a, 0xc9a227][Math.floor(R() * 4)])));
    vmax = 8 + R() * 4;
  } else {
    g.add(new THREE.Mesh(cachedGeo('cyc', cyclistGeometry), tinted([0xd6b43a, 0xb8322a, 0x3a7a4a, 0x2a4a7a, 0xe8e6e0][Math.floor(R() * 5)])));
    vmax = 4 + R() * 1.8;
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // the body as a box in its own frame (+x ahead): back, front, half width
  const bb = new THREE.Box3().setFromObject(g);
  const body = [bb.min.x, bb.max.x, Math.max(-bb.min.z, bb.max.z)];
  // what is left drawn (and solid) of a tractor whose tractor is a real vehicle
  let trailer = null;
  const tm = g.children.filter((o) => o.userData.trailer);
  if (tm.length) {
    const tb = new THREE.Box3();
    for (const m of tm) tb.expandByObject(m);
    trailer = [tb.min.x, tb.max.x, Math.max(-tb.min.z, tb.max.z)];
  }
  // headlights (one additive mesh, hidden by day with the glow material)
  const hl = new THREE.Mesh(cachedGeo('hl' + type, () => (type === 'car' ? headlightGeometry(2.08, 0.66, 0.55, 18) : type === 'tractor' ? headlightGeometry(2.12, 1.15, 0.4, 12) : headlightGeometry(0.75, 0.85, 0, 7))), glowMaterial());
  hl.renderOrder = 2;
  g.add(hl);
  return { g, vmax, body, trailer, color: R() };
}

function spawnTraffic(px, py, dist) {
  const R = Math.random;
  for (let tries = 0; tries < 6; tries++) {
    const ang = R() * Math.PI * 2;
    const x = px + Math.cos(ang) * dist, y = py + Math.sin(ang) * dist;
    const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
    const opts = [];
    if (roadV(bx, by)) opts.push({ axis: 'v', line: bx, c: y });
    if (roadH(bx, by)) opts.push({ axis: 'h', line: by, c: x });
    if (!opts.length) continue;
    const o = opts[Math.floor(R() * opts.length)];
    const a = { ...o, dir: R() < 0.5 ? 1 : -1, speed: 0, yaw: 0, stride: 0, lastJ: null };
    const [wx, wy] = roadPos(a);
    if (!openLand(wx, wy) || Math.hypot(wx - px, wy - py) < dist * 0.8) continue;
    const r = R();
    const type = r < 0.4 ? 'tractor' : r < 0.66 ? 'cyclist' : r < 0.74 ? 'quad' : 'car';
    Object.assign(a, { type }, makeTraffic(type, R));
    a.speed = a.vmax * 0.8;
    a.yaw = headingOf(a);
    L.group.add(a.g);
    L.traffic.push(a);
    return;
  }
}

function headingOf(a) {
  if (a.real) { const [ux, uy] = segDir(a); return Math.atan2(uy * a.dir, ux * a.dir); }
  return a.axis === 'v' ? (a.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (a.dir > 0 ? 0 : Math.PI);
}

// ------------------------------------------------------------------ tile roads

// A road user on a road of the tiles: its row `road`, segment si, t metres
// from the segment start, dir +1 along the road's points or -1 against.
function segDir(a) {
  const P = a.road.pts, A = P[a.si], B = P[a.si + 1];
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  return [(B[0] - A[0]) / L, (B[1] - A[1]) / L, L];
}
function realPos(a) {
  const A = a.road.pts[a.si];
  const [ux, uy] = segDir(a);
  const lat = a.road.oneway ? 0 : Math.min((a.road.width || 5) / 4, 2.2) * a.dir;
  return [A[0] + ux * a.t - uy * lat, A[1] + uy * a.t + ux * lat];
}
const realTypes = (kind) => (kind <= 3 ? ['car'] : kind === 7 ? ['car', 'cyclist', 'car'] : ['tractor', 'cyclist', 'car', 'car', 'tractor', 'cyclist', 'car', 'car', 'quad']);
// the roads road users drive: classed car roads at ground level
const drivable = (r) => roadKind(r) > 0 && !r.z && r.cat !== 'foot' && r.cat !== 'cycle' && !r.busOnly;

function spawnRealTraffic(px, py, dist) {
  const R = Math.random;
  for (let tries = 0; tries < 8; tries++) {
    const ang = R() * Math.PI * 2;
    const x = px + Math.cos(ang) * dist, y = py + Math.sin(ang) * dist;
    if (edgeDistance(x, y) < 40) continue;
    const roads = L.map.roadsNear(x, y, 100).filter(drivable);
    if (!roads.length) continue;
    const road = roads[Math.floor(R() * roads.length)];
    const dir = road.oneway || R() < 0.5 ? 1 : -1;
    const a = { real: true, road, si: Math.floor(R() * (road.pts.length - 1)), t: 0, dir, speed: 0, yaw: 0, stride: 0 };
    const [, , len] = segDir(a);
    a.t = R() * len;
    const [wx, wy] = realPos(a);
    if (Math.hypot(wx - px, wy - py) < dist * 0.75 || edgeDistance(wx, wy) < 30) continue;
    const kind = roadKind(road);
    const opts = realTypes(kind);
    const type = opts[Math.floor(R() * opts.length)];
    Object.assign(a, { type }, makeTraffic(type, R));
    if (kind <= 3) a.vmax = 20 + R() * 7;
    else if (kind <= 5 && type === 'car') a.vmax = 14 + R() * 5;
    a.speed = a.vmax * 0.8;
    a.yaw = headingOf(a);
    L_add(a);
    return true;
  }
  return false;
}
function L_add(a) {
  L.group.add(a.g);
  L.traffic.push(a);
}

// Road ends with something standing on them (worldends.js): traffic turns round there.
let roadBlocks = [];
export function setRealRoadBlocks(list) {
  roadBlocks = list || [];
}

// Carry on at the end of a road: another road touching this point (not
// against its one-way direction), else turn round.
// How much of its speed a road user keeps when it moves on from one way to the
// next at a turn of `turn` rad (#165): all of it where the road simply carries on
// into the next way (OSM cuts a road at every junction, so a straight road is
// many ways), 0.7 for a right-angle corner, 0.4 turning back.
export function turnSpeedFactor(turn) {
  const t = Math.abs(((turn + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return 1 - 0.6 * Math.min(1, t / Math.PI);
}

function realJunction(a) {
  const r = a.road;
  const h0 = headingOf(a);
  const end = a.dir > 0 ? r.pts[r.pts.length - 1] : r.pts[0];
  const opts = [];
  for (const o of L.map.roadsNear(end[0], end[1], 3)) {
    if (o === r || !drivable(o)) continue;
    const kind = roadKind(o);
    if (a.type !== 'car' && kind <= 2) continue;
    if (a.type === 'quad' && kind <= 4) continue;
    o.pts.forEach((q, j) => {
      if (Math.abs(q[0] - end[0]) > 1.5 || Math.abs(q[1] - end[1]) > 1.5) return;
      if (j < o.pts.length - 1) opts.push({ road: o, si: j, dir: 1 });
      if (j > 0 && !o.oneway) opts.push({ road: o, si: j - 1, dir: -1 });
    });
  }
  if (!opts.length) {
    if (r.oneway) return false;
    a.dir = -a.dir;
    a.speed *= 0.3;
    return true;
  }
  const o = opts[Math.floor(Math.random() * opts.length)];
  a.road = o.road; a.si = o.si; a.dir = o.dir;
  a.t = o.dir > 0 ? 0 : segDir(a)[2];
  a.speed *= turnSpeedFactor(headingOf(a) - h0);
  return true;
}

function stepRealTraffic(a, dt, world) {
  const p = world.player;
  const v = p.inVehicle;
  const ox = v ? v.x : p.x, oy = v ? v.y : p.y;
  const [wx, wy] = realPos(a);
  const h = headingOf(a), hx = Math.cos(h), hy = Math.sin(h);
  for (const b of roadBlocks) {
    const bx = b.x - wx, by = b.y - wy, ah = bx * hx + by * hy;
    if (ah > 0 && ah < 16 && Math.abs(-bx * hy + by * hx) < 6) {
      if (a.road.oneway) a.speed = 0;
      else { a.dir = -a.dir; a.speed *= 0.3; }
      return;
    }
  }
  // country traffic is drawn at ground level: it turns round before the
  // city's data, where the roads rise onto viaducts and sink into cuttings;
  // a real vehicle carries on as city traffic on the street it meets there
  if (edgeDistance(wx + hx * 8, wy + hy * 8) < 0) {
    if (a.veh && handOver(a, world)) return;
    if (a.road.oneway) a.gone = true;
    else { a.dir = -a.dir; a.speed *= 0.3; }
    return;
  }
  const rx = ox - wx, ry = oy - wy;
  const ahead = rx * hx + ry * hy, side = Math.abs(-rx * hy + ry * hx);
  let want = a.vmax;
  if (ahead > 0 && ahead < 18 && side < laneClear(a, v)) want = ahead < 6 ? 0 : a.vmax * (ahead - 6) / 12;
  a.speed += (want - a.speed) * Math.min(1, dt * (want < a.speed ? 3 : 0.8));
  let step = a.speed * dt;
  for (let guard = 0; guard < 8 && step > 0; guard++) {
    const len = segDir(a)[2];
    const room = a.dir > 0 ? len - a.t : a.t;
    if (step < room) { a.t += step * a.dir; break; }
    step -= room;
    const P = a.road.pts;
    if (a.dir > 0 && a.si < P.length - 2) { a.si++; a.t = 0; continue; }
    if (a.dir < 0 && a.si > 0) { a.si--; a.t = segDir(a)[2]; continue; }
    a.t = a.dir > 0 ? len : 0;
    if (!realJunction(a)) { a.gone = true; return; }
    break;
  }
  const [nx, ny] = realPos(a);
  bodyContact(a, nx, ny, world);
}

function stepTraffic(a, dt, world) {
  if (a.real) { stepRealTraffic(a, dt, world); return; }
  const p = world.player;
  const v = p.inVehicle;
  const ox = v ? v.x : p.x, oy = v ? v.y : p.y;
  const [wx, wy] = roadPos(a);
  // brake for the player standing or driving in the lane ahead
  const h = headingOf(a), hx = Math.cos(h), hy = Math.sin(h);
  const rx = ox - wx, ry = oy - wy;
  const ahead = rx * hx + ry * hy, side = Math.abs(-rx * hy + ry * hx);
  let want = a.vmax;
  if (ahead > 0 && ahead < 16 && side < laneClear(a, v)) want = ahead < 6 ? 0 : a.vmax * (ahead - 6) / 10;
  a.speed += (want - a.speed) * Math.min(1, dt * (want < a.speed ? 3 : 0.8));
  const step = a.dir * a.speed * dt;
  const look = a.c + a.dir * 7;
  const [lx, ly] = a.axis === 'v' ? [a.line * BLOCK + ROAD_C, look] : [look, a.line * BLOCK + ROAD_C];
  if (!onRoad(a.axis, a.line, look) || !openLand(lx, ly)) {
    a.dir = -a.dir;
    a.speed *= 0.3;
    return;
  }
  const prev = a.c;
  a.c += step;
  // junctions every block at ROAD_C past the block edge
  const J = Math.floor((a.dir > 0 ? a.c : prev) / BLOCK) * BLOCK + ROAD_C;
  if ((prev - J) * (a.c - J) <= 0 && a.lastJ !== J) {
    a.lastJ = J;
    const k = Math.floor(J / BLOCK);
    const opts = [];
    if (a.axis === 'v') {
      if (roadH(a.line, k)) opts.push({ axis: 'h', line: k, dir: 1 });
      if (roadH(a.line, k) && roadH(a.line - 1, k)) opts.push({ axis: 'h', line: k, dir: -1 });
    } else {
      if (roadV(k, a.line)) opts.push({ axis: 'v', line: k, dir: 1 });
      if (roadV(k, a.line) && roadV(k, a.line - 1)) opts.push({ axis: 'v', line: k, dir: -1 });
    }
    if (opts.length && Math.random() < 0.45) {
      const o = opts[Math.floor(Math.random() * opts.length)];
      const along = a.axis === 'v' ? a.line * BLOCK + ROAD_C : a.line * BLOCK + ROAD_C;
      a.axis = o.axis; a.line = o.line; a.dir = o.dir; a.c = along;
      a.lastJ = along;
      a.speed *= 0.6;
    }
  }
  // shove the player aside rather than drive through them
  const [nx, ny] = roadPos(a);
  bodyContact(a, nx, ny, world);
}

// How far to the side the player may be ahead of a before it brakes:
// someone in the other lane is let past.
const laneClear = (a, v) => a.body[2] + (v ? v.halfWid || 0.9 : 0.4) + 0.5;

// Shoves the player (or the vehicle they are in) out of road user a's body
// box at (x, y), heading a.yaw as drawn: box against box like city traffic,
// so passing close by in the other lane is free.
function bodyContact(a, x, y, world) {
  // a real vehicle collides by itself; only a tractor's trailer is left here
  const box = a.veh ? a.trailer : a.body;
  if (!box) return;
  const p = world.player, v = p.inVehicle;
  if ((v && v.isHeli && !v.onGround) || (!v && world.pigeonMode)) return;
  const ox = v ? v.x : p.x, oy = v ? v.y : p.y;
  const c = Math.cos(a.yaw), s = Math.sin(a.yaw);
  const dx = ox - x, dy = oy - y;
  const lu = dx * c + dy * s, lv = -dx * s + dy * c;
  const [back, front, hw] = box;
  let eu = lu - Math.max(back, Math.min(front, lu)), ev = lv - Math.max(-hw, Math.min(hw, lv));
  let d = Math.hypot(eu, ev);
  if (d < 1e-3) {
    // centre inside the box: out through the nearest side
    const o = [[lu - back, -1, 0], [front - lu, 1, 0], [hw - lv, 0, 1], [lv + hw, 0, -1]].sort((m, n) => m[0] - n[0])[0];
    eu = o[1]; ev = o[2]; d = -o[0];
  } else { eu /= d; ev /= d; }
  // the other body's reach along that direction
  const wx = eu * c - ev * s, wy = eu * s + ev * c;
  let reach = 0.4;
  if (v) {
    const vc = Math.cos(v.angle), vs = Math.sin(v.angle);
    reach = Math.abs(wx * vc + wy * vs) * (v.halfLen || 2) + Math.abs(-wx * vs + wy * vc) * (v.halfWid || 0.9);
  }
  const pen = reach + 0.05 - d;
  if (pen <= 0) return;
  if (v) { v.x += wx * pen; v.y += wy * pen; v.speed *= 0.5; }
  else { p.x += wx * pen; p.y += wy * pen; }
  a.speed = 0;
}

// Near the player a car, tractor, quad or bike is a real vehicle: placed on the
// road user's pose every frame while it drives, and let go as an ordinary
// vehicle (rolling out) the moment someone takes it, hits it or shoves it.
function trafficModel(a) {
  if (a.type === 'tractor') return { ...TRACTOR_MODEL, color: ['#3f7d3a', '#b8322a', '#2f5fa8', '#3f7d3a'][Math.floor(a.color * 4)] };
  if (a.type === 'quad') return { ...QUAD_MODEL };
  const cars = MODELS.filter((m) => m.name !== 'sport');
  return cars[Math.floor(a.color * cars.length)];
}
function showLight(a, on) {
  for (const o of a.g.children) if (!o.userData.trailer) o.visible = on;
}
// A real vehicle at the city's edge becomes an ordinary city road user on
// the street there (vehicle.js traffic AI), the road user is done.
function handOver(a, world) {
  const v = a.veh;
  if (!v || !world.map || !world.map.nearestRoadPoint(v.x, v.y, 25, true) || !attachToNearestRoad(v, world.map)) return false;
  v.countryDrive = false;
  v.cruiseScale = 0.9 + Math.random() * 0.2;
  a.veh = null;
  a.handed = true;
  a.gone = true;
  return true;
}
function dropVehicle(a, world) {
  const v = a.veh;
  if (!v || !v.countryDrive) return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
  a.veh = null;
}
function syncVehicle(a, world) {
  if (a.left) return;
  const [x, y] = roadPos(a);
  const p = world.player;
  const d = Math.hypot(x - p.x, y - p.y);
  const v = a.veh;
  if (!v) {
    if (d > CONVERT_R || world.cinematicActive || !world.vehicles) return;
    // not on top of a vehicle that is already there (#265): wait until the spot is free
    if (world.vehicles.some((o) => Math.hypot(o.x - x, o.y - y) < 5 + (o.halfLen || 2))) return;
    const nv = a.type === 'cyclist' ? makeTwoWheeler('bike', x, y, a.yaw, null, () => a.color) : new Vehicle(x, y, a.yaw, trafficModel(a));
    nv.countryDrive = true;
    nv.speed = a.speed;
    world.vehicles.push(nv);
    a.veh = nv; a.vx = x; a.vy = y;
    showLight(a, false);
    return;
  }
  if (v.driver || v.wrecked || v.health < 100 || !world.vehicles.includes(v) || Math.hypot(v.x - a.vx, v.y - a.vy) > 0.4) {
    // taken over: an ordinary vehicle from here on; a trailer stays put
    v.countryDrive = false;
    a.veh = null;
    if (a.trailer) { a.left = true; a.speed = 0; } else a.gone = true;
    return;
  }
  if (d > RELEASE_R) { dropVehicle(a, world); showLight(a, true); return; }
  v.x = x; v.y = y; v.angle = a.yaw; v.speed = a.speed;
  a.vx = x; a.vy = y;
}

function placeTraffic(a, dt) {
  const [x, y] = roadPos(a);
  const target = headingOf(a);
  let d = ((target - a.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  a.yaw += d * Math.min(1, dt * 4);
  a.stride += a.speed * dt;
  a.g.position.set(x, a.type === 'cyclist' ? Math.abs(Math.sin(a.stride * 2.2)) * 0.02 : 0, y);
  a.g.rotation.y = -a.yaw;
  if (a.type === 'tractor') a.g.rotation.z = Math.sin(a.stride * 1.7) * 0.012;
}

// ------------------------------------------------------------------ boats

function spawnBoat(px, py, dist) {
  const lines = [];
  const i0 = Math.floor((px - dist) / BLOCK), i1 = Math.floor((px + dist) / BLOCK) + 1;
  const j0 = Math.floor((py - dist) / BLOCK), j1 = Math.floor((py + dist) / BLOCK) + 1;
  for (let i = i0; i <= i1; i++) if (maarX(i)) lines.push({ vert: true, c: i * BLOCK });
  for (let j = j0; j <= j1; j++) if (maarY(j)) lines.push({ vert: false, c: j * BLOCK });
  if (!lines.length) return;
  const ln = lines[Math.floor(Math.random() * lines.length)];
  const along = (ln.vert ? py : px) + (Math.random() - 0.5) * dist * 1.6;
  const k = Math.floor(along / BLOCK);
  const lo = k * BLOCK + 40, hi = (k + 1) * BLOCK - 40;
  const t = Math.min(hi, Math.max(lo, along));
  const dir = Math.random() < 0.5 ? 1 : -1;
  const b = { ln, lo, hi, t, dir, lat: -dir * 1.3, speed: 1.8 + Math.random() * 1.8, bob: Math.random() * 6, kind: Math.floor(Math.random() * 3) };
  const [x, y] = boatPos(b);
  // (the maaren are the polder grid's: not in the blocks the tiles cover, where their water is)
  if (!openLand(x, y) || provinceBlock(Math.floor(x / BLOCK), Math.floor(y / BLOCK)) || edgeDistance(x, y) < 30 || Math.hypot(x - px, y - py) < 120) return;
  b.g = new THREE.Mesh(cachedGeo('boat' + b.kind, () => boatGeometry(b.kind)), MAT);
  b.g.castShadow = true;
  b.yaw = boatYaw(b);
  L.group.add(b.g);
  L.boats.push(b);
}

function boatPos(b) {
  return b.ln.vert ? [b.ln.c + b.lat, b.t] : [b.t, b.ln.c - b.lat];
}
function boatYaw(b) {
  return b.ln.vert ? (b.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (b.dir > 0 ? 0 : Math.PI);
}

function stepBoat(b, dt, time, map) {
  b.t += b.dir * b.speed * dt;
  if (b.t > b.hi || b.t < b.lo) {
    b.dir = -b.dir;
    b.t = Math.min(b.hi, Math.max(b.lo, b.t));
  }
  b.lat += (-b.dir * 1.3 - b.lat) * Math.min(1, dt * 0.4);
  const target = boatYaw(b);
  let d = ((target - b.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  b.yaw += d * Math.min(1, dt * 0.6);
  const [x, y] = boatPos(b);
  // on the tiles' deep water the surface lies at WATER_Y
  const wq = rectOutside(x, y) > 0 ? waterAt(map, x, y) : null;
  const wy = wq && !wq.wade ? WATER_Y - 0.13 : -0.18;
  b.wy = b.wy === undefined ? wy : b.wy + (wy - b.wy) * Math.min(1, dt * 1.5);
  b.g.position.set(x, b.wy + Math.sin(time * 1.3 + b.bob) * 0.03, y);
  b.g.rotation.set(Math.sin(time * 0.9 + b.bob) * 0.03, -b.yaw, 0, 'YXZ');
}

// ------------------------------------------------------------------ birds

function threat(world) {
  const p = world.player, v = p.inVehicle;
  if (world.pigeonMode) return { x: p.x, y: p.y, r: 14 };
  if (v) {
    const sp = Math.abs(v.speed || 0);
    return { x: v.x, y: v.y, r: v.horn ? 110 : sp > 1.5 ? 40 + sp * 1.5 : 12 };
  }
  const sp = Math.hypot(p.vx || 0, p.vy || 0);
  return { x: p.x, y: p.y, r: sp > 4 ? 34 : 22 };
}

function flockBirds(f) {
  if (f.birds) return f.birds;
  f.birds = [];
  for (let i = 0; i < f.n; i++) {
    const h1 = chash(Math.floor(f.seed * 1e6) + i, 3), h2 = chash(i * 7, Math.floor(f.seed * 1e6) - 1);
    f.birds.push({ ox: (h1 - 0.5) * 14, oy: (h2 - 0.5) * 14, yaw: h1 * 6.28, ph: h2 * 6.28, x: 0, y: 0, h: 0 });
  }
  f.state = 'rest';
  f.t = 0;
  return f.birds;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3();
const counts = { lapwing: [0, 0, 0], starling: [0, 0, 0], goose: [0, 0, 0] };

function drawBird(sp, frame, x, h, y, yaw, bank, s) {
  const pool = L.birdPools[sp][frame];
  const n = counts[sp][frame];
  if (n >= 500) return;
  _e.set(0, -yaw, bank, 'YXZ');
  _q.setFromEuler(_e);
  _m.compose(_v.set(x, h, y), _q, _sc.set(s, s, s));
  _m.toArray(pool.instanceMatrix.array, n * 16);
  counts[sp][frame] = n + 1;
}

function updateFlocks(dt, world, flocks, time) {
  const th = threat(world);
  const p = world.player;
  for (const f of flocks) {
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d > FLOCK_R) continue;
    const birds = flockBirds(f);
    const C = BIRDS[f.kind];
    const dt2 = Math.hypot(f.x - th.x, f.y - th.y);
    if (f.state === 'rest') {
      if (dt2 < th.r) {
        f.state = 'fly'; f.t = 0;
        f.rad = 28 + chash(Math.floor(f.seed * 999), 1) * 30;
        f.spin = chash(Math.floor(f.seed * 777), 2) < 0.5 ? 1 : -1;
        f.alt = f.kind === 'starling' ? 14 : 9 + chash(Math.floor(f.seed * 555), 3) * 10;
        f.a0 = Math.atan2(f.y - th.y, f.x - th.x);
      }
    } else {
      f.t += dt;
      if (f.t > 16 && dt2 > th.r * 1.8) f.state = 'land';
    }
    for (const b of birds) {
      if (f.state === 'rest') {
        b.x = f.x + b.ox; b.y = f.y + b.oy; b.h = 0;
        const peck = Math.sin(time * 0.8 + b.ph) > 0.6 ? 0.25 : 0;
        drawBird(f.kind, 0, b.x, -0.05, b.y, b.yaw, peck, C.scale);
        continue;
      }
      // wheel round the resting spot, each bird a little out of step
      const up = f.state === 'fly' ? Math.min(1, f.t / 2.5) : Math.max(0, 1 - (f.t2 = (f.t2 || 0) + dt) / 4);
      const ang = f.a0 + f.spin * (f.t * 0.45 + b.ph * 0.08);
      const r = f.rad * Math.min(1, f.t / 3) * up + 0.01;
      const tx = f.x + b.ox * (0.4 + 0.6 * (1 - up)) + Math.cos(ang) * r;
      const ty = f.y + b.oy * (0.4 + 0.6 * (1 - up)) + Math.sin(ang) * r;
      const th2 = f.alt * up + Math.sin(time * 1.3 + b.ph) * 1.2 * up;
      const vx = tx - b.x, vy = ty - b.y;
      if (Math.hypot(vx, vy) > 0.02) b.yaw = Math.atan2(vy, vx);
      b.x = tx; b.y = ty; b.h = th2;
      if (f.state === 'land' && up <= 0) { b.x = f.x + b.ox; b.y = f.y + b.oy; }
      const fr = Math.sin(time * C.flap * 6.28 + b.ph) > 0 ? 1 : 2;
      drawBird(f.kind, b.h < 0.3 ? 0 : fr, b.x, Math.max(-0.05, b.h), b.y, b.yaw, f.spin * 0.35 * up, C.scale);
    }
    if (f.state === 'land' && (f.t2 || 0) > 4) { f.state = 'rest'; f.t2 = 0; f.t = 0; }
  }
}

function updateSkeins(dt, world, time, active) {
  const p = world.player;
  L.skeinT -= dt;
  if (active && L.skeinT <= 0 && L.skeins.length < 2) {
    L.skeinT = 35 + Math.random() * 50;
    const dirA = (Math.random() < 0.5 ? -Math.PI / 4 : Math.PI * 3 / 4) + (Math.random() - 0.5) * 0.8;
    const dx = Math.cos(dirA), dy = Math.sin(dirA), side = (Math.random() - 0.5) * 240;
    const n = 7 + Math.floor(Math.random() * 10);
    L.skeins.push({ x: p.x - dx * 480 - dy * side, y: p.y - dy * 480 + dx * side, dx, dy, h: 45 + Math.random() * 30, n, life: 75, ph: Math.random() * 6 });
  }
  for (const s of L.skeins) {
    s.life -= dt;
    s.x += s.dx * 13 * dt; s.y += s.dy * 13 * dt;
    const yaw = Math.atan2(s.dy, s.dx);
    for (let i = 0; i < s.n; i++) {
      const row = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? 1 : -1;
      const bx = s.x - s.dx * row * 3.2 - s.dy * side * row * 2.6, by = s.y - s.dy * row * 3.2 + s.dx * side * row * 2.6;
      const fr = Math.sin(time * BIRDS.goose.flap * 6.28 + i * 0.7 + s.ph) > 0 ? 1 : 2;
      drawBird('goose', fr, bx, s.h + Math.sin(time * 0.6 + i) * 0.4, by, yaw, 0, BIRDS.goose.scale);
    }
  }
  L.skeins = L.skeins.filter((s) => s.life > 0);
}

// ------------------------------------------------------------------ frame

// fogFar: the scene's fog distance (spawns happen out in the haze).
export function updateCountryLife(dt, world, scene, flocks, fogFar) {
  if (!L) init(scene);
  L.map = world.map;
  const t0 = performance.now();
  const p = world.player;
  const time = world.time || 0;
  // new road users only out in the Ommeland; the ones about stay until out of sight
  const active = edgeDistance(p.x, p.y) > 60 && !world.cinematicActive;
  const paused = world.paused;
  const spawnD = Math.min(Math.max(170, fogFar * 0.85), 480);
  const keepD = Math.max(spawnD + 120, fogFar + 80);

  if (!paused) {
    L.spawnT -= dt;
    if (active && L.spawnT <= 0) {
      L.spawnT = 1.5 + Math.random() * 2;
      if (L.traffic.length < MAX_TRAFFIC) {
        // on the tiles' roads, and on the polder grid where there are no tiles
        if (!spawnRealTraffic(p.x, p.y, spawnD)) spawnTraffic(p.x, p.y, spawnD);
      }
    }
    L.boatT -= dt;
    if (active && L.boatT <= 0) {
      L.boatT = 3 + Math.random() * 4;
      if (L.boats.length < MAX_BOATS) {
        spawnBoat(p.x, p.y, spawnD);
      }
    }
  }
  L.traffic = L.traffic.filter((a) => {
    const [x, y] = roadPos(a);
    const d = Math.hypot(x - p.x, y - p.y);
    // done (turned off the data, handed over to the city) or, with the player
    // back in town, no longer needed: gone once out of sight, never in view
    const leave = a.gone || !active;
    if (d > keepD || world.cinematicActive || (leave && !a.veh && isSpawnHidden(world, x, y)) || a.handed) {
      L.group.remove(a.g); if (!a.handed) dropVehicle(a, world); return false;
    }
    // a road user with nowhere to go waits, its real vehicle too, until let go
    if (a.gone) { a.speed = 0; placeTraffic(a, 0); if (!paused) syncVehicle(a, world); return true; }
    if (!paused && !a.left) stepTraffic(a, dt, world);
    placeTraffic(a, paused || a.left ? 0 : dt);
    if (!paused) syncVehicle(a, world);
    return true;
  });
  L.boats = L.boats.filter((b) => {
    const [x, y] = boatPos(b);
    if (Math.hypot(x - p.x, y - p.y) > keepD || world.cinematicActive || (!active && isSpawnHidden(world, x, y))) { L.group.remove(b.g); return false; }
    if (!paused) stepBoat(b, dt, time, world.map);
    return true;
  });

  for (const sp in counts) counts[sp].fill(0);
  if (edgeDistance(p.x, p.y) > -40) {
    updateFlocks(paused ? 0 : dt, world, flocks, time);
    updateSkeins(paused ? 0 : dt, world, time, active);
  }
  for (const sp in counts) {
    L.birdPools[sp].forEach((m, f) => {
      m.count = counts[sp][f];
      if (m.count) markInstancesDirty(m.instanceMatrix, m.count);
    });
  }
  L.ms = L.ms * 0.95 + (performance.now() - t0) * 0.05;
}

export function lifeStats() {
  if (!L) return null;
  let birds = 0;
  for (const sp in counts) birds += counts[sp].reduce((a, b) => a + b, 0);
  return { ms: +L.ms.toFixed(3), traffic: L.traffic.map((a) => a.type), real: L.traffic.filter((a) => a.veh).length, boats: L.boats.length, birds, skeins: L.skeins.length };
}

// The road users (scripts/country_vehicles_test.mjs).
export function countryTraffic() {
  return L ? L.traffic : [];
}
