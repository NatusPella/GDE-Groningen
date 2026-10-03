// Checks that the geometry worker builds exactly what the main thread built
// before it (desktop --perf-script, see scripts/perf/geocheck.sh): the city
// prop cells around a few spots and the Ommeland water of a few hundred
// tiles, each three ways: the old code (copied here, three.js on the main
// thread), the kernel on the main thread (the fallback) and the kernel in a
// fresh geometry worker. Every buffer must match byte for byte.
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const THREE = await import('/vendor/npm/three@0.160.0/build/three.module.js');
const GK = await import('/js/geokernels.js');
const CP = await import('/js/cityprops.js');
const CW = await import('/js/countrywatergeo.js');
const CE = await import('/js/countryedge.js');
const CF = await import('/js/countryfield.js');
const D = window.__debug; const w = D.world; const p = w.player;
w.devInvuln = true;

const worker = new Worker('/js/geoworker.js', { type: 'module' });
let nextId = 1;
const waiting = new Map();
worker.onmessage = (e) => { const f = waiting.get(e.data.id); waiting.delete(e.data.id); f(e.data); };
const inWorker = (kind, data) => new Promise((res, rej) => {
  const id = nextId++;
  waiting.set(id, (m) => (m.error ? rej(new Error(m.error)) : res(m.result)));
  worker.postMessage({ id, kind, data });
});

const bytes = (a) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
function same(a, b) {
  if (!a || !b) return a === b;
  if (a.constructor !== b.constructor || a.length !== b.length) return false;
  const x = bytes(a), y = bytes(b);
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  return true;
}
const report = { city: { cells: 0, buffers: 0, verts: 0, bad: [] }, water: { chunks: 0, buffers: 0, verts: 0, bad: [] }, roads: { roads: 0, buffers: 0, verts: 0, bad: [] }, terrain: {} };

// ---- city props: the old mergeInstances
function oldMerge(list) {
  let total = 0;
  for (const it of list) total += it.geo.attributes.position.count;
  if (!total) return null;
  const pos = new Float32Array(total * 3), nor = new Int8Array(total * 3), col = new Uint8Array(total * 3), uvs = new Uint16Array(total * 2);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let o = 0;
  for (const it of list) {
    const { geo, m } = it;
    const P = geo.attributes.position, N = geo.attributes.normal, C = geo.attributes.color, U = geo.attributes.uv;
    nm.getNormalMatrix(m);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      n.set(N.getX(i), N.getY(i), N.getZ(i)).applyMatrix3(nm).normalize();
      nor[o * 3] = Math.round(n.x * 127); nor[o * 3 + 1] = Math.round(n.y * 127); nor[o * 3 + 2] = Math.round(n.z * 127);
      col[o * 3] = C.array[i * 3]; col[o * 3 + 1] = C.array[i * 3 + 1]; col[o * 3 + 2] = C.array[i * 3 + 2];
      uvs[o * 2] = Math.round(U.array[i * 2] * 65535); uvs[o * 2 + 1] = Math.round(U.array[i * 2 + 1] * 65535);
      o++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeBoundingSphere();
  const s = g.boundingSphere;
  return { pos, nor, col, uvs, sphere: [s.center.x, s.center.y, s.center.z, s.radius] };
}
// the job as cityprops.js sends it
const plainAttr = (a) => ({ array: a.array, itemSize: a.itemSize, normalized: a.normalized });
function mergeJob(lists) {
  const ids = new Map(), geos = [];
  return { geos, lists: lists.map((list) => list.map(({ geo, m }) => {
    let gi = ids.get(geo);
    if (gi === undefined) { ids.set(geo, gi = geos.length); geos.push({ position: plainAttr(geo.attributes.position), normal: plainAttr(geo.attributes.normal), color: plainAttr(geo.attributes.color), uv: plainAttr(geo.attributes.uv) }); }
    return [gi, m.elements];
  })) };
}
const cmpMerged = (a, b) => (!a || !b ? a === b : same(a.pos, b.pos) && same(a.nor, b.nor) && same(a.col, b.col) && same(a.uvs, b.uvs) && a.sphere.every((x, i) => Object.is(x, b.sphere[i])));

const SPOTS = [[167, 283], [105, 161], [124, 7], [18, 244], [162, 78], [-300, 400], [600, -200]];
const checked = new Set();
for (const [x, y] of SPOTS) {
  if (p.inVehicle) p.exitVehicle(w.map, w);
  p.x = x; p.y = y;
  await sleep(5000);
  for (const [key, cell] of CP.cityPropCells()) {
    if (checked.has(key)) continue;
    checked.add(key);
    const lists = [cell.items, cell.market];
    const ref = lists.map(oldMerge);
    const job = mergeJob(lists);
    const sync = GK.KERNELS.cityMerge(job).result;
    const work = await inWorker('cityMerge', job);
    report.city.cells++;
    ref.forEach((r, i) => {
      if (!r) return;
      report.city.buffers += 4;
      report.city.verts += r.pos.length / 3;
      if (!cmpMerged(r, sync[i]) || !cmpMerged(r, work[i])) report.city.bad.push(key + ':' + i);
    });
  }
}

// ---- Ommeland water: the old per-chunk merge
function oldMergeGeo(parts, attrs) {
  let nv = 0, ni = 0;
  for (const q of parts) { nv += q.pos.length / 3; ni += q.idx.length; }
  const geo = new THREE.BufferGeometry();
  const idx = new Uint32Array(ni);
  const arrays = {};
  for (const [name, size] of attrs) arrays[name] = new Float32Array(nv * size);
  let vo = 0, io = 0;
  for (const q of parts) {
    for (const [name, size, src] of attrs) arrays[name].set(q[src], vo * size);
    for (let k = 0; k < q.idx.length; k++) idx[io + k] = q.idx[k] + vo;
    vo += q.pos.length / 3;
    io += q.idx.length;
  }
  for (const [name, size] of attrs) geo.setAttribute(name, new THREE.BufferAttribute(arrays[name], size));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return geo;
}
function oldChunk(tiles, T) {
  const surf = [], bank = [];
  for (const t of tiles) {
    const wt = CW.tileWater(CE.openWater, t.tx, t.ty, T, t.mid);
    if (!wt) continue;
    surf.push(wt.s);
    if (wt.b) bank.push(wt.b);
  }
  if (!surf.length) return null;
  const water = oldMergeGeo(surf, [['position', 3, 'pos'], ['aEdge', 1, 'edge'], ['aFlow', 2, 'flow']]);
  let basin = null;
  if (bank.length) { basin = oldMergeGeo(bank, [['position', 3, 'pos'], ['color', 3, 'col']]); basin.computeVertexNormals(); }
  return { water, basin };
}
const cmpGeo = (geo, part) => {
  if (!geo || !part) return !geo && !part;
  if (!same(geo.index.array, part.index)) return false;
  for (const k in geo.attributes) if (!same(geo.attributes[k].array, part[k])) return false;
  return Object.keys(part).length === Object.keys(geo.attributes).length + 1;
};
const z = CF.realZone();
const grid = (G) => ({ ...G, data: G.data.slice() });
await inWorker('waterInit', { bounds: CF.countryBounds(), zone: { ...z, water: grid(z.water), urban: grid(z.urban) }, canals: CE.canalGridSnapshot() });
GK.setWaterQuery(CE.openWater);
const T = 160;
// chunks of 2x2 tiles along the heli route and round the map edge, both tiers
const chunks = [];
const R = CF.countryRect();
for (let kx = Math.floor((R.cx - R.hx - 1500) / 320); kx <= Math.floor((R.cx + R.hx + 1500) / 320); kx += 2) {
  for (let ky = Math.floor((R.cy - R.hy - 1500) / 320); ky <= Math.floor((R.cy + R.hy + 1500) / 320); ky += 2) {
    chunks.push([kx, ky]);
  }
}
for (const [kx, ky] of chunks) {
  for (const mid of [false, true]) {
    const tiles = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) tiles.push({ tx: kx * 2 + dx, ty: ky * 2 + dy, mid: mid && (dx + dy) % 2 === 0 });
    const ref = oldChunk(tiles, T);
    const sync = GK.KERNELS.waterChunk({ tiles, T }).result;
    const work = await inWorker('waterChunk', { tiles, T });
    if (!ref) { if (sync || work) report.water.bad.push(`${kx},${ky} extra`); continue; }
    report.water.chunks++;
    report.water.buffers += 4 + (ref.basin ? 4 : 0);
    report.water.verts += ref.water.attributes.position.count + (ref.basin ? ref.basin.attributes.position.count : 0);
    const ok = (r) => r && cmpGeo(ref.water, r.water) && cmpGeo(ref.basin, r.bank);
    if (!ok(sync) || !ok(work)) report.water.bad.push(`${kx},${ky},${mid}`);
  }
}
// ---- city roads: every road's surfaces, main thread vs the worker's own map
const RS = await import('/js/roadsurface.js');
const map = w.map;
RS.setRoadNetwork(map);
const init = await inWorker('roadInit', { url: new URL('citymap.json', location.href).href, keys: map.roads.map(RS.roadKey) });
report.roads.workerMap = init;
const cmpPlain = (geo, p) => {
  if (!geo || !p) return !geo && !p;
  if (!same(geo.index && geo.index.array, p.index)) return false;
  for (const k in geo.attributes) if (!p.attrs[k] || !same(geo.attributes[k].array, p.attrs[k].array) || geo.attributes[k].itemSize !== p.attrs[k].itemSize) return false;
  const s = geo.boundingSphere;
  return Object.keys(p.attrs).length === Object.keys(geo.attributes).length && JSON.stringify(geo.groups) === JSON.stringify(p.groups)
    && [s.center.x, s.center.y, s.center.z, s.radius].every((x, i) => Object.is(x, p.sphere[i]));
};
let t = performance.now();
for (const r of map.roads) {
  const ref = RS.roadSurfaceGeometries(r, RS.roadDetail());
  const work = await inWorker('roadGeo', { key: RS.roadKey(r), detail: RS.roadDetail() });
  report.roads.roads++;
  let ok = !!work;
  for (const k of ['sidewalk', 'road', 'mark']) {
    if (ref[k]) { report.roads.buffers += Object.keys(ref[k].attributes).length + 1; report.roads.verts += ref[k].attributes.position.count; }
    if (ok && !cmpPlain(ref[k], work[k])) ok = false;
    if (ref[k]) ref[k].dispose();
  }
  if (!ok) report.roads.bad.push(RS.roadKey(r).slice(0, 50));
  if (performance.now() - t > 2000) { await sleep(0); t = performance.now(); }
}
report.roads.bad = report.roads.bad.slice(0, 20).concat(report.roads.bad.length > 20 ? ['... ' + report.roads.bad.length] : []);
// ---- terrain: the whole grid, main thread vs worker
const TR = await import('/js/terrain3d.js');
{
  const water = map.water.map((q) => ({ pts: q.pts, bounds: q.bounds }));
  let t0 = performance.now();
  const ref = TR.terrainArrays(map.meta.bounds, map.water);
  const mainMs = performance.now() - t0;
  t0 = performance.now();
  const work = await inWorker('terrain', { bounds: map.meta.bounds, water });
  const workerMs = performance.now() - t0;
  const ok = same(ref.positions, work.positions) && same(ref.normals, work.normals) && ref.tiles.length === work.tiles.length
    && ref.tiles.every((q, i) => same(q.index, work.tiles[i].index) && q.box.every((x, k) => Object.is(x, work.tiles[i].box[k])))
    && ref.y === work.y && ref.droppedTriangles === work.droppedTriangles && ref.maxTriangles === work.maxTriangles;
  report.terrain = { verts: ref.positions.length / 3, tiles: ref.tiles.length, mainMs: Math.round(mainMs), workerRoundTripMs: Math.round(workerMs), ok };
}
worker.terminate();
report.ok = report.terrain.ok && !report.city.bad.length && !report.water.bad.length && !report.roads.bad.length && report.roads.roads > 0 && report.city.cells > 0 && report.water.chunks > 0;
return JSON.stringify(report);
