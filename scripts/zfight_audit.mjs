// Z-fight QA on the city's buildings: builds every building mesh the way the
// game does (models3d_buildings.js and the models it hands off to:
// marktgebouwen.js, landmarks3d.js, thuis3d.js, paddepoel3d.js, plus
// canopies3d.js) and finds coplanar overlapping triangles with a different
// look (material, vertex colour or texture) that face the same way (or
// either side is double-sided), within --tol metres along the normal.
// Pairs are bucketed by how far apart the two planes are:
//   flush   < 2 mm   fights at any distance
//   close   2-12 mm  can fight inside the 140 m detail radius (24-bit depth, near 0.5)
//   near    12 mm-tol only at long range / grazing angles
// A pair whose materials differ in polygonOffsetUnits, with the more negative one in front, is "layered" (settled at any
// distance, not counted); with the more negative one behind it is "bleed" (the offset pulls it through at range).
//   node scripts/zfight_audit.mjs [--all] [--r=450] [--area=x0,y0,x1,y1]
//        [--tol=0.02] [--top=20] [--json] [--module=generic]
// --vehicles audits the vehicle meshes instead of the city (#382): every traffic model plus the
// bus with its destination boards, police, ambulance and the other specials, each as a module
// 'vehicle:<name>' (no map, no building data needed). --list prints every spot.
// Needs the vendored three.js once: cd desktop && npm run stage
import './node3d.mjs';
import fs from 'node:fs';

const args = process.argv.slice(2);
const has = (k) => args.some((a) => a === '--' + k || a.startsWith('--' + k + '='));
const opt = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const TOL = +opt('tol', 0.02);
const TOP = +opt('top', 20);
const RADIUS = has('all') ? Infinity : +opt('r', 450);
const AREA = opt('area', '') ? opt('area').split(',').map(Number) : null;
const ONLY = opt('module', '');
const VEH = has('vehicles');
let DEBUG = +opt('debug', 0); // print the first N visible pairs with their normals, for hunting a pattern
const MIN_AREA = 0.0004;
const T0 = Date.now();
const log = (...a) => { if (!has('json')) console.error(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a); };

const root = new URL('../game/', import.meta.url);
const { GameMap, applyMapExtras } = await import('../game/js/mapdata.js');
await import('../game/js/player.js');
const MB = await import('../game/js/models3d_buildings.js');
const { marktKind } = await import('../game/js/marktgebouwen.js');
const { hasLandmarkModel } = await import('../game/js/landmarks3d.js');
const { getLandmarkModel } = await import('../game/js/landmarkmodels.js');
const THREE = await import('three');
// where each GeoBuilder triangle comes from: the first frames outside pixelart3d.js
const { GeoBuilder } = await import('../game/js/pixelart3d.js');
Error.stackTraceLimit = 12;
const siteNames = [], siteIds = new Map();
function callSite() {
  const fr = [];
  for (const l of new Error().stack.split('\n').slice(2)) {
    const m = l.match(/at (?:(\S+) )?\(?.*\/(\w+)\.js:(\d+):\d+\)?$/);
    if (!m || m[2] === 'pixelart3d') continue;
    fr.push(`${m[2]}:${m[3]}${m[1] ? ' ' + m[1].replace(/^.*\./, '') : ''}`);
    if (fr.length === 3) break;
  }
  const k = fr.join(' < ');
  let id = siteIds.get(k);
  if (id === undefined) { siteIds.set(k, id = siteNames.length); siteNames.push(k); }
  return id;
}
const push0 = GeoBuilder.prototype._push, build0 = GeoBuilder.prototype.build;
GeoBuilder.prototype._push = function (g, ...rest) {
  push0.call(this, g, ...rest);
  (this.groups[g].site || (this.groups[g].site = [])).push(callSite());
};
GeoBuilder.prototype.build = function () {
  const geo = build0.call(this);
  geo.userData.sites = this.groups.flatMap((g) => g.site || []);
  return geo;
};

let map = null;
if (!VEH) {
  const { loadCityData } = await import('./lib/loadworld.mjs');
  const data = await loadCityData();
  map = new GameMap(data);
  MB.setBuildingMap(map);
  try { (await import('../game/js/home.js')).prepareHomeMap(map); } catch (e) { log('prepareHomeMap skipped:', e.message); }
  log('map loaded,', map.buildings.length, 'buildings');
}

const CENTRE = { x: 100.63, y: 76.18 };
function moduleOf(b) {
  if (b.landmark && b.name && getLandmarkModel(b.name)) return 'glb';
  if (marktKind(b)) return 'marktgebouwen';
  if (hasLandmarkModel(b)) {
    if (b.model) return 'thuis3d';
    if (b.landmark === 'Winkelcentrum Paddepoel') return 'paddepoel3d';
    return 'landmarks3d';
  }
  return b.landmark ? 'landmark-generic' : 'generic';
}
const centreOf = (b) => [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2];
function wanted(b, mod) {
  if (b.hidden || !b.bounds || mod === 'glb') return false;
  if (ONLY && mod !== ONLY) return false;
  const [cx, cy] = centreOf(b);
  if (AREA) return cx >= AREA[0] && cx <= AREA[2] && cy >= AREA[1] && cy <= AREA[3];
  return mod !== 'generic' || Math.hypot(cx - CENTRE.x, cy - CENTRE.y) <= RADIUS;
}

// ------------------------------------------------------------ triangles
// flat arrays: 9 coords, normal, plane offset, look id, owner id, flags
let cap = 1 << 20, N = 0;
let P = new Float64Array(cap * 9), NRM = new Float32Array(cap * 3), D = new Float64Array(cap);
let LOOK = new Int32Array(cap), SITE = new Int32Array(cap), OWNER = new Int32Array(cap), DBL = new Uint8Array(cap), POFF = new Int8Array(cap);
function grow() {
  cap *= 2;
  const g = (A, k) => { const B = new A.constructor(cap * k); B.set(A); return B; };
  P = g(P, 9); NRM = g(NRM, 3); D = g(D, 1); LOOK = g(LOOK, 1); SITE = g(SITE, 1); OWNER = g(OWNER, 1); DBL = g(DBL, 1); POFF = g(POFF, 1);
}
const looks = new Map(), lookNames = [];
function lookId(key, name) {
  let id = looks.get(key);
  if (id === undefined) { id = lookNames.length; looks.set(key, id); lookNames.push(name); }
  return id;
}
const owners = []; // { b, mod, name }
const matIds = new Map();
const matId = (m) => { let i = matIds.get(m); if (i === undefined) matIds.set(m, i = matIds.size); return i; };

function siteOf(k) {
  let id = siteIds.get(k);
  if (id === undefined) { siteIds.set(k, id = siteNames.length); siteNames.push(k); }
  return id;
}
const _v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function addObject(rootObj, owner) {
  rootObj.updateMatrixWorld(true);
  rootObj.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
    const g = o.geometry, pos = g.attributes.position, col = g.attributes.color, uv = g.attributes.uv, idx = g.index;
    const sites = g.userData.sites;
    const meshSite = siteOf(o.name || (o === rootObj.userData.facadeDetail ? 'detail' : 'mesh') + ':' + (g.type || ''));
    const groups = g.groups.length ? g.groups : [{ start: 0, count: idx ? idx.count : pos.count, materialIndex: 0 }];
    for (const gr of groups) {
      const m = Array.isArray(o.material) ? o.material[gr.materialIndex] : o.material;
      if (!m || m.visible === false || m.colorWrite === false) continue;
      const dbl = m.side === THREE.DoubleSide ? 1 : 0;
      // polygonOffsetUnits of the material (negative: drawn nearer the camera by that many depth steps, at any distance)
      const poff = m.polygonOffset ? Math.max(-100, Math.min(100, Math.round(m.polygonOffsetUnits || 0))) : 0;
      const mid = matId(m);
      const end = Math.min(gr.start + gr.count, idx ? idx.count : pos.count);
      for (let k = gr.start; k + 2 < end; k += 3) {
        const ia = idx ? idx.getX(k) : k, ib = idx ? idx.getX(k + 1) : k + 1, ic = idx ? idx.getX(k + 2) : k + 2;
        _v[0].fromBufferAttribute(pos, ia).applyMatrix4(o.matrixWorld);
        _v[1].fromBufferAttribute(pos, ib).applyMatrix4(o.matrixWorld);
        _v[2].fromBufferAttribute(pos, ic).applyMatrix4(o.matrixWorld);
        const ux = _v[1].x - _v[0].x, uy = _v[1].y - _v[0].y, uz = _v[1].z - _v[0].z;
        const vx = _v[2].x - _v[0].x, vy = _v[2].y - _v[0].y, vz = _v[2].z - _v[0].z;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const L = Math.hypot(nx, ny, nz);
        if (L < 2 * MIN_AREA) continue;
        nx /= L; ny /= L; nz /= L;
        let key = 'm' + mid, name = (m.name || m.type.replace('Mesh', '').replace('Material', '')) + mid;
        if (m.vertexColors && col) {
          const c = [col.getX(ia), col.getY(ia), col.getZ(ia)].map((x) => Math.round(x * 255));
          // colours within a few levels of each other look the same: not a visible fight
          key += ':' + c.map((x) => Math.round(x / 6)).join(',');
          name += ' #' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
        } else if (m.color) name += ' #' + m.color.getHexString();
        // textured: same material with different texture coordinates is a different look
        if (m.map && uv) {
          const s = [uv.getX(ia), uv.getY(ia), uv.getX(ib), uv.getY(ib)].map((x) => Math.round(x * 20)).join(',');
          key += '|uv' + s;
        }
        if (N >= cap) grow();
        const o9 = N * 9;
        for (let j = 0; j < 3; j++) { P[o9 + j * 3] = _v[j].x; P[o9 + j * 3 + 1] = _v[j].y; P[o9 + j * 3 + 2] = _v[j].z; }
        NRM[N * 3] = nx; NRM[N * 3 + 1] = ny; NRM[N * 3 + 2] = nz;
        D[N] = nx * _v[0].x + ny * _v[0].y + nz * _v[0].z;
        LOOK[N] = lookId(key, name);
        OWNER[N] = owner;
        SITE[N] = sites && sites.length * 3 === (idx ? idx.count : pos.count) ? sites[ia / 3 | 0] : meshSite;
        DBL[N] = dbl;
        POFF[N] = poff;
        N++;
      }
    }
  });
}

// ------------------------------------------------------------ build
async function addVehicles() {
  const { buildVehicleMesh, setHorseMeshBuilder } = await import('../game/js/models3d_vehicles.js');
  const { buildHorseMesh } = await import('../game/js/countryside.js');
  setHorseMeshBuilder(buildHorseMesh);
  const { Vehicle, TRAFFIC_MODELS } = await import('../game/js/vehicle.js');
  const { attachBusBoards } = await import('../game/js/busboard3d.js');
  const seen = new Set();
  const cases = [];
  for (const m of TRAFFIC_MODELS()) {
    if (seen.has(m.name)) continue;
    seen.add(m.name);
    cases.push([m.name, m, {}]);
  }
  const extra = (name, base, flags) => { const m = TRAFFIC_MODELS().find((x) => x.name === base); if (m) cases.push([name, m, flags]); };
  // models the traffic table does not hold (the same list scripts/seat_audit.mjs seats people in)
  for (const [n, len, wid, flags = {}] of [['cashvan', 5.2, 2.0], ['foodtruck', 5.4, 2.1], ['truck', 8.5, 2.5], ['truck', 8.5, 2.5, { model: { tank: true } }], ['trekkerlimo', 5.6, 2.0], ['tractor', 4.3, 2.3], ['quad', 2.1, 1.2], ['taxi', 4.6, 1.8], ['escort', 4.0, 1.65, { isHeroCar: true }], ['midibus', 8.4, 2.3]]) {
    cases.push([n + (flags.model && flags.model.tank ? '-tank' : ''), { name: n, len, wid, color: '#888888' }, flags]);
  }
  extra('police', 'sedan', { isPolice: true });
  extra('ambulance', 'van', { isAmbulance: true });
  extra('bus-gelede', 'bus', { model: { trailer: 6.8 } });
  // the destination boards (busboard3d.js attachBusBoards) on every bus the game builds
  for (const c of cases.slice()) if (/bus/.test(c[0])) cases.push([c[0] + '+borden', c[1], { ...c[2], borden: true }]);
  let col = 0;
  for (const [name, model0, flags] of cases) {
    const model = { ...model0, ...(flags.model || {}) };
    const v = new Vehicle(0, 0, 0, model);
    Object.assign(v, flags, { model });
    delete v.borden;
    v.isBike = model.name === 'bike';
    v.isScooter = model.name === 'scooter';
    let grp;
    try { grp = buildVehicleMesh(v); } catch (e) { log('build failed', name, e.message); continue; }
    if (flags.borden) {
      const tex = new THREE.Texture(document.createElement('canvas'));
      if (attachBusBoards) attachBusBoards(grp, model, tex);
      else {
        // busboard3d.js from before #382 (an older commit, for the "voor" count): the boards inline, 0.02 m off the hull
        const hl = model.len / 2, hw = model.wid / 2;
        for (const [x, z, w, ry] of [[hl + 0.02, 0, Math.min(1.9, model.wid * 0.75), Math.PI / 2], [hl - 1.6, hw + 0.02, 1.5, 0], [hl - 1.6, -hw - 0.02, 1.5, Math.PI]]) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 20 / 128), new THREE.MeshBasicMaterial({ map: tex }));
          m.position.set(x, 2.5, z); m.rotation.y = ry; grp.add(m);
        }
      }
    }
    grp.position.set(col++ * 30, 0, -9000);
    owners.push({ b: null, mod: 'vehicle:' + name, name });
    const n0 = N;
    addObject(grp, owners.length - 1);
    const s = modStat('vehicle:' + name);
    s.buildings++;
    s.tris += N - n0;
  }
}
const perModule = {};
const modStat = (m) => perModule[m] || (perModule[m] = { buildings: 0, tris: 0, pairs: 0, flush: 0, close: 0, near: 0, area: 0, layered: 0, bleed: 0 });
for (const b of (VEH ? [] : map.buildings)) {
  const mod = moduleOf(b);
  if (!wanted(b, mod)) continue;
  let grp;
  try { grp = MB.buildBuildingMesh(b); } catch (e) { log('build failed', b.name || '', centreOf(b).map(Math.round), e.message); continue; }
  const n0 = N;
  owners.push({ b, mod, name: b.name || b.markt || b.model || b.type || '' });
  addObject(grp, owners.length - 1);
  const s = modStat(mod);
  s.buildings++;
  s.tris += N - n0;
}
if (VEH) await addVehicles();
if (!VEH && (!ONLY || ONLY === 'canopies')) {
  try {
    const grp = (await import('../game/js/canopies3d.js')).buildCanopies(map);
    owners.push({ b: null, mod: 'canopies', name: 'canopies' });
    const n0 = N;
    addObject(grp, owners.length - 1);
    const s = modStat('canopies');
    s.buildings++;
    s.tris += N - n0;
  } catch (e) { log('canopies skipped:', e.message); }
}
log('triangles', N, 'from', owners.length, 'owners');

// ------------------------------------------------------------ pairs
// 3D grid of CELL m; a pair is tested in the cell holding the min corner of
// the overlap of the two triangles' boxes (each pair once)
const CELL = 4;
const BOX = new Float64Array(N * 6);
for (let i = 0; i < N; i++) {
  const o = i * 9, b = i * 6;
  BOX[b] = Math.min(P[o], P[o + 3], P[o + 6]); BOX[b + 3] = Math.max(P[o], P[o + 3], P[o + 6]);
  BOX[b + 1] = Math.min(P[o + 1], P[o + 4], P[o + 7]); BOX[b + 4] = Math.max(P[o + 1], P[o + 4], P[o + 7]);
  BOX[b + 2] = Math.min(P[o + 2], P[o + 5], P[o + 8]); BOX[b + 5] = Math.max(P[o + 2], P[o + 5], P[o + 8]);
}
const grid = new Map();
const cellKey = (x, y, z) => x * 73856093 ^ y * 19349663 ^ z * 83492791;
for (let i = 0; i < N; i++) {
  const b = i * 6;
  const x0 = Math.floor(BOX[b] / CELL), x1 = Math.floor(BOX[b + 3] / CELL);
  const y0 = Math.floor(BOX[b + 1] / CELL), y1 = Math.floor(BOX[b + 4] / CELL);
  const z0 = Math.floor(BOX[b + 2] / CELL), z1 = Math.floor(BOX[b + 5] / CELL);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
    const k = cellKey(x, y, z);
    let a = grid.get(k);
    if (!a) grid.set(k, a = []);
    a.push(i);
  }
}
log('grid cells', grid.size);

// convex polygon clip (2D), Sutherland-Hodgman
function clip(poly, ax, ay, bx, by) {
  const out = [];
  const side = (p) => (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax);
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
const area2 = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };
function overlap(i, j) {
  const nx = NRM[i * 3], ny = NRM[i * 3 + 1], nz = NRM[i * 3 + 2];
  // in-plane basis
  let ux, uy, uz;
  if (Math.abs(ny) < 0.9) { ux = nz; uy = 0; uz = -nx; } else { ux = 0; uy = -nz; uz = ny; }
  const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
  const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
  const proj = (t) => [0, 1, 2].map((k) => { const o = t * 9 + k * 3; return [P[o] * ux + P[o + 1] * uy + P[o + 2] * uz, P[o] * vx + P[o + 1] * vy + P[o + 2] * vz]; });
  let A = proj(i), Bt = proj(j);
  if (area2(A) < 0) A.reverse();
  if (area2(Bt) < 0) Bt.reverse();
  let poly = A;
  for (let k = 0; k < 3 && poly.length; k++) poly = clip(poly, Bt[k][0], Bt[k][1], Bt[(k + 1) % 3][0], Bt[(k + 1) % 3][1]);
  if (poly.length < 3) return null;
  const a = area2(poly);
  if (a < MIN_AREA) return null;
  let cu = 0, cv = 0;
  for (const p of poly) { cu += p[0]; cv += p[1]; }
  cu /= poly.length; cv /= poly.length;
  const d = D[i];
  const W3 = (pu, pv) => [pu * ux + pv * vx + d * nx, pu * uy + pv * vy + d * ny, pu * uz + pv * vz + d * nz];
  const samples = [W3(cu, cv)];
  const step = Math.max(1, Math.floor(poly.length / 4));
  for (let k = 0; k < poly.length && samples.length < 5; k += step) samples.push(W3(cu + (poly[k][0] - cu) * 0.8, cv + (poly[k][1] - cv) * 0.8));
  const c = samples[0];
  return { a, samples, x: c[0], y: c[1], z: c[2] };
}

// a face is hidden when the point just in front of it lies inside a building
// (party walls, faces inside a neighbour); footprint up to its eave height
const { pointInPolygon } = await import('../game/js/util.js');
const solidTop = (b) => Math.max(2.4, b.h * 3.1) + (b.lift || 0);
// per built building: a 1 m height field of its up-facing faces (roof tops),
// so a tower doesn't swallow the low roofs round it
const ownerOf = new Map();
owners.forEach((o, k) => { if (o.b) ownerOf.set(o.b, k); });
const trisOf = new Map();
for (let t = 0; t < N; t++) { const a = trisOf.get(OWNER[t]); if (a) a.push(t); else trisOf.set(OWNER[t], [t]); }
const HF = new Map();
function heightField(k) {
  let h = HF.get(k);
  if (h) return h;
  h = new Map();
  for (const t of trisOf.get(k) || []) {
    if (Math.abs(NRM[t * 3 + 1]) < 0.3) continue;
    const o = t * 9, b = t * 6;
    const put = (cx, cz, y) => { const key = cx * 100003 + cz; if (!(h.get(key) >= y)) h.set(key, y); };
    for (let x = Math.floor(BOX[b]); x <= Math.floor(BOX[b + 3]); x++) {
      for (let z = Math.floor(BOX[b + 2]); z <= Math.floor(BOX[b + 5]); z++) {
        // plane height at the cell centre, clamped to the triangle's own range
        const px = x + 0.5, pz = z + 0.5;
        const y = D[t] / NRM[t * 3 + 1] - (NRM[t * 3] * px + NRM[t * 3 + 2] * pz) / NRM[t * 3 + 1];
        const w0 = (P[o + 3] - P[o]) * (pz - P[o + 2]) - (P[o + 5] - P[o + 2]) * (px - P[o]);
        const w1 = (P[o + 6] - P[o + 3]) * (pz - P[o + 5]) - (P[o + 8] - P[o + 5]) * (px - P[o + 3]);
        const w2 = (P[o] - P[o + 6]) * (pz - P[o + 8]) - (P[o + 2] - P[o + 8]) * (px - P[o + 6]);
        if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) put(x, z, Math.min(BOX[b + 4], Math.max(BOX[b + 1], y)));
      }
    }
    for (let v = 0; v < 3; v++) put(Math.floor(P[o + v * 3]), Math.floor(P[o + v * 3 + 2]), P[o + v * 3 + 1]);
  }
  HF.set(k, h);
  return h;
}
function insideSolid(x, y, z) {
  if (y < -1 || !map) return false;
  for (const b of map.buildingsNear(x, z, 0.5)) {
    if (b.hidden || !pointInPolygon(x, z, b.pts)) continue;
    const k = ownerOf.get(b);
    let top = -Infinity;
    if (k === undefined) top = solidTop(b);
    else {
      const h = heightField(k), cx = Math.floor(x), cz = Math.floor(z);
      for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) { const v = h.get((cx + a) * 100003 + cz + c); if (v > top) top = v; }
      if (top === -Infinity) top = solidTop(b);
    }
    if (y < top - 0.05) return true;
  }
  return false;
}
// first triangle hit along a short ray (beyond the coplanar band): the
// overlap is covered by a box face, sill or cornice right in front of it
const REACH = 2;
function covered(px, py, pz, dx, dy, dz) {
  const seen = new Set();
  for (let k = 0; k <= 1; k++) {
    const qx = px + dx * REACH * k, qy = py + dy * REACH * k, qz = pz + dz * REACH * k;
    const list = grid.get(cellKey(Math.floor(qx / CELL), Math.floor(qy / CELL), Math.floor(qz / CELL)));
    if (!list || seen.has(list)) continue;
    seen.add(list);
    for (const t of list) {
      const o = t * 9;
      const e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2];
      const e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
      const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
      const a = e1x * hx + e1y * hy + e1z * hz;
      if (Math.abs(a) < 1e-9) continue;
      const f = 1 / a, sx = px - P[o], sy = py - P[o + 1], sz = pz - P[o + 2];
      const u = f * (sx * hx + sy * hy + sz * hz);
      if (u < 0 || u > 1) continue;
      const qx2 = sy * e1z - sz * e1y, qy2 = sz * e1x - sx * e1z, qz2 = sx * e1y - sy * e1x;
      const v = f * (dx * qx2 + dy * qy2 + dz * qz2);
      if (v < 0 || u + v > 1) continue;
      const tt = f * (e2x * qx2 + e2y * qy2 + e2z * qz2);
      if (tt > TOL && tt < REACH) return true;
    }
  }
  return false;
}
// share of the overlap (5 samples) that is open air on the given side of t
function openShare(t, ov, sign) {
  const nx = NRM[t * 3] * sign, ny = NRM[t * 3 + 1] * sign, nz = NRM[t * 3 + 2] * sign;
  let open = 0;
  for (const s of ov.samples) {
    if (insideSolid(s[0] + nx * 0.06, s[1] + ny * 0.06, s[2] + nz * 0.06)) continue;
    if (covered(s[0], s[1], s[2], nx, ny, nz)) continue;
    open++;
  }
  return open / ov.samples.length;
}
// visible share: some side that both triangles show is open
function pairVisible(i, j, dot, ov) {
  if (DBL[i] && DBL[j]) {
    const up = openShare(i, ov, 1), down = openShare(i, ov, -1);
    // back to back (a wall top under a slab, a box against a box): both sides have to be open, else one side is
    // inside a solid and nothing of the pair can be seen from there
    return dot < 0 ? Math.min(up, down) : Math.max(up, down);
  }
  if (dot > 0) return openShare(i, ov, 1);
  // opposite facing: i's front with j's back (j double-sided), or j's front with i's back
  return Math.max(DBL[j] ? openShare(i, ov, 1) : 0, DBL[i] ? openShare(j, ov, 1) : 0);
}
let hiddenPairs = 0, hiddenArea = 0;
const spots = new Map(), patterns = new Map();
let tested = 0;
const band = (s) => (s < 0.002 ? "flush" : s < 0.012 ? "close" : "near");
for (const [, list] of grid) {
  if (list.length < 2) continue;
  for (let p = 0; p < list.length; p++) {
    const i = list[p], bi = i * 6;
    for (let q = p + 1; q < list.length; q++) {
      const j = list[q];
      if (LOOK[i] === LOOK[j]) continue;
      const dot = NRM[i * 3] * NRM[j * 3] + NRM[i * 3 + 1] * NRM[j * 3 + 1] + NRM[i * 3 + 2] * NRM[j * 3 + 2];
      if (Math.abs(dot) < 0.9995) continue;
      if (dot < 0 && !DBL[i] && !DBL[j]) continue;
      const bj = j * 6;
      const mx = Math.max(BOX[bi], BOX[bj]), my = Math.max(BOX[bi + 1], BOX[bj + 1]), mz = Math.max(BOX[bi + 2], BOX[bj + 2]);
      if (mx > Math.min(BOX[bi + 3], BOX[bj + 3]) + 1e-6 || my > Math.min(BOX[bi + 4], BOX[bj + 4]) + 1e-6 || mz > Math.min(BOX[bi + 5], BOX[bj + 5]) + 1e-6) continue;
      // own cell only
      const cx = Math.floor(mx / CELL), cy = Math.floor(my / CELL), cz = Math.floor(mz / CELL);
      if (grid.get(cellKey(cx, cy, cz)) !== list) continue;
      // plane separation: j's vertices against i's plane
      const nx = NRM[i * 3], ny = NRM[i * 3 + 1], nz = NRM[i * 3 + 2];
      let sMin = Infinity, sMax = -Infinity;
      for (let k = 0; k < 3; k++) {
        const o = j * 9 + k * 3;
        const s = nx * P[o] + ny * P[o + 1] + nz * P[o + 2] - D[i];
        if (s < sMin) sMin = s;
        if (s > sMax) sMax = s;
      }
      if (sMin < -TOL || sMax > TOL || sMax - sMin > TOL) continue;
      tested++;
      const ov = overlap(i, j);
      if (!ov) continue;
      const vis = pairVisible(i, j, dot, ov);
      if (!vis) { hiddenPairs++; hiddenArea += ov.a; continue; }
      hiddenArea += ov.a * (1 - vis);
      ov.a *= vis;
      const sep = Math.max(Math.abs(sMin), Math.abs(sMax));
      if (DEBUG > 0 && ov.a > +opt('debugarea', 0) && DEBUG-- > 0) console.error('pair', 'n', [0, 1, 2].map((k) => NRM[i * 3 + k].toFixed(2)).join(','), [0, 1, 2].map((k) => NRM[j * 3 + k].toFixed(2)).join(','), 'dbl', DBL[i], DBL[j], 'sep', sep.toFixed(4), 'area', ov.a.toFixed(2), 'vis', vis, 'at', ov.x.toFixed(2), ov.y.toFixed(2), ov.z.toFixed(2));
      const oi = owners[OWNER[i]], oj = owners[OWNER[j]];
      const mod = OWNER[i] === OWNER[j] ? oi.mod : [oi.mod, oj.mod].sort().join('+');
      const s = modStat(mod);
      // a polygonOffset difference settles the pair at every distance when the material with the larger (more negative)
      // offset is also the nearer plane: "layered", not counted as a fight. When it is the plane behind, the offset
      // pulls it through the other one at range: "bleed", counted as a fight and reported apart.
      const du = POFF[j] - POFF[i];
      if (du !== 0 && dot > 0) {
        const mid = (sMin + sMax) / 2, winnerJ = du < 0;
        if (winnerJ ? mid >= -0.0005 : mid <= 0.0005) { s.layered += ov.a; continue; }
        s.bleed += ov.a;
      }
      s.pairs++;
      s[band(sep)] += ov.a;
      s.area += ov.a;
      // spots: per owner pair, look pair and band
      const la = Math.min(LOOK[i], LOOK[j]), lb = Math.max(LOOK[i], LOOK[j]);
      const key = `${Math.min(OWNER[i], OWNER[j])}/${Math.max(OWNER[i], OWNER[j])}/${la}/${lb}/${band(sep)}`;
      let sp = spots.get(key);
      if (!sp) spots.set(key, sp = { mod, owners: [...new Set([oi.name, oj.name])].join(' | '), looks: `${lookNames[la]}  vs  ${lookNames[lb]}`, band: band(sep), sep: 0, area: 0, n: 0, x: ov.x, y: ov.y, z: ov.z });
      sp.area += ov.a;
      sp.n++;
      const sa = siteNames[SITE[i]], sb = siteNames[SITE[j]];
      const pk = `${band(sep)}|${sa < sb ? sa + '  vs  ' + sb : sb + '  vs  ' + sa}`;
      let pt = patterns.get(pk);
      if (!pt) patterns.set(pk, pt = { band: band(sep), sites: pk.slice(pk.indexOf('|') + 1), area: 0, n: 0, owners: new Set(), at: [Math.round(ov.x), Math.round(ov.z), +ov.y.toFixed(1)] });
      pt.area += ov.a;
      pt.n++;
      pt.owners.add(OWNER[i]);
      sp.sep = Math.max(sp.sep, sep);
    }
  }
}
log('tested', tested, 'coplanar candidates;', hiddenPairs, 'pairs (' + Math.round(hiddenArea), 'm2) hidden inside buildings');

const r3 = (x) => Math.round(x * 1000) / 1000;
const mods = Object.entries(perModule).sort((a, b) => b[1].area - a[1].area);
const RANK = { flush: 0, close: 1, near: 2 };
const top = [...spots.values()].sort((a, b) => RANK[a.band] - RANK[b.band] || b.area - a.area).slice(0, TOP);
const total = mods.reduce((t, [, s]) => ({ pairs: t.pairs + s.pairs, flush: t.flush + s.flush, close: t.close + s.close, near: t.near + s.near, layered: t.layered + s.layered, bleed: t.bleed + s.bleed }), { pairs: 0, flush: 0, close: 0, near: 0, layered: 0, bleed: 0 });
const pats = [...patterns.values()].sort((a, b) => RANK[a.band] - RANK[b.band] || b.area - a.area).slice(0, TOP).map((p) => ({ ...p, owners: p.owners.size }));
if (has('json')) {
  console.log(JSON.stringify({ tol: TOL, total, modules: Object.fromEntries(mods), top, patterns: pats }, null, 1));
} else {
  console.log(`z-fight audit (tol ${TOL} m, ${has('all') ? 'whole city' : AREA ? 'area ' + AREA.join(',') : 'generic within ' + RADIUS + ' m of the centre, all special models'})`);
  console.log('module'.padEnd(34), 'bldgs'.padStart(6), 'tris'.padStart(9), 'pairs'.padStart(7), 'flush m2'.padStart(9), 'close m2'.padStart(9), 'near m2'.padStart(9), 'layered'.padStart(9), 'bleed m2'.padStart(9));
  for (const [m, s] of mods) console.log(m.padEnd(34), String(s.buildings).padStart(6), String(s.tris).padStart(9), String(s.pairs).padStart(7), s.flush.toFixed(2).padStart(9), s.close.toFixed(2).padStart(9), s.near.toFixed(2).padStart(9), s.layered.toFixed(2).padStart(9), s.bleed.toFixed(2).padStart(9));
  console.log('TOTAL'.padEnd(34), ''.padStart(6), String(N).padStart(9), String(total.pairs).padStart(7), total.flush.toFixed(2).padStart(9), total.close.toFixed(2).padStart(9), total.near.toFixed(2).padStart(9), total.layered.toFixed(2).padStart(9), total.bleed.toFixed(2).padStart(9));
  console.log(`\ntop ${pats.length} patterns (source sites, flush first):`);
  for (const t of pats) console.log(`${t.band.padEnd(5)} ${t.area.toFixed(2).padStart(9)}m2 x${t.n} in ${t.owners} bldgs  e.g. @ ${t.at[0]},${t.at[1]} h${t.at[2]}\n      ${t.sites}`);
  console.log(`\ntop ${top.length} spots (flush first), map x,y and height:`);
  for (const t of top) console.log(`${t.band.padEnd(5)} ${(t.sep * 1000).toFixed(1).padStart(5)}mm ${t.area.toFixed(3).padStart(8)}m2 x${t.n}  @ ${Math.round(t.x)},${Math.round(t.z)} h${t.y.toFixed(1)}  [${t.mod}] ${t.owners}: ${t.looks}`);
}
