// Checks that the geometry worker builds exactly what the main thread built
// before it (desktop --perf-script, see scripts/perf/geocheck.sh): the city
// prop cells around a few spots, each three ways: the old code (copied here,
// three.js on the main thread), the kernel on the main thread (the fallback)
// and the kernel in a fresh geometry worker; then every road (with its civil works) and city shore (main thread vs the
// worker's own map) and the road batch cells (finish spread over frames vs
// the old one-frame finish). Every buffer must match byte for byte.
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const THREE = await import('/vendor/npm/three@0.160.0/build/three.module.js');
const GK = await import('/js/geokernels.js');
const CP = await import('/js/cityprops.js');
const CF = await import('/js/countryfield.js');
const { PL } = await import('/js/worldframe.js');
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
const report = { city: { cells: 0, buffers: 0, verts: 0, bad: [] }, roads: { roads: 0, buffers: 0, verts: 0, bad: [] }, structs: { roads: 0, parts: 0, verts: 0, breakable: 0, bad: [] }, terrain: {} };

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

const SPOTS = PL([[167, 283], [105, 161], [124, 7], [18, 244], [162, 78], [-300, 400], [600, -200]]);
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

// ---- city roads: every road's surfaces, main thread vs the worker's own map
const RS = await import('/js/roadsurface.js');
const map = w.map;
RS.setRoadNetwork(map);
const init = await inWorker('roadInit', { url: new URL('stad.json', location.href).href, keys: map.roads.map(RS.roadKey) });
report.roads.workerMap = init;
const cmpPlain = (geo, p) => {
  if (!geo || !p) return !geo && !p;
  if (!same(geo.index && geo.index.array, p.index)) return false;
  for (const k in geo.attributes) if (!p.attrs[k] || !same(geo.attributes[k].array, p.attrs[k].array) || geo.attributes[k].itemSize !== p.attrs[k].itemSize) return false;
  const s = geo.boundingSphere;
  return Object.keys(p.attrs).length === Object.keys(geo.attributes).length && JSON.stringify(geo.groups) === JSON.stringify(p.groups)
    && [s.center.x, s.center.y, s.center.z, s.radius].every((x, i) => Object.is(x, p.sphere[i]));
};
// and their civil works (roadstructures3d.js), main-thread arrays vs the worker's
const RST = await import('/js/roadstructures3d.js');
const cmpStruct = (a, b) => {
  if (!a || !b) return !a && !b;
  if (a.parts.length !== b.parts.length || JSON.stringify(a.hide) !== JSON.stringify(b.hide)) return false;
  return a.parts.every((p, i) => { const q = b.parts[i]; return p.m === q.m && same(p.pos, q.pos) && same(p.nor, q.nor) && p.sphere.every((x, j) => Object.is(x, q.sphere[j])); });
};
let t = performance.now();
for (const r of map.roads) {
  const ref = RS.roadSurfaceGeometries(r, RS.roadDetail());
  const work = await inWorker('roadGeo', { key: RS.roadKey(r), detail: RS.roadDetail(), struct: true });
  if (map.elev.has && work) {
    const S = r.z ? RST.structureArrays(r, map) : RST.overpassDeckArrays(r, map);
    if (S || work.struct) {
      report.structs.roads++;
      if (S) for (const p of S.parts) { report.structs.parts++; report.structs.verts += p.pos.length / 3; }
      if (S) report.structs.breakable += S.hide.length;
      if (!cmpStruct(S, work.struct) || (work.struct && RST.structureGroup(map, work.struct) === undefined)) report.structs.bad.push(RS.roadKey(r).slice(0, 50));
    }
  }
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
report.structs.bad = report.structs.bad.slice(0, 20);
report.roads.bad = report.roads.bad.slice(0, 20).concat(report.roads.bad.length > 20 ? ['... ' + report.roads.bad.length] : []);
// ---- city shores: every water polygon, main thread vs the worker's (slimmed) map
{
  const QW = await import('/js/quaywalls.js');
  await inWorker('shoreInit', { bounds: CF.countryBounds() });
  report.shores = { polys: 0, parts: 0, verts: 0, seats: 0, hulls: 0, bad: [] };
  const y = -0.35;
  for (let wi = 0; wi < map.water.length; wi++) {
    const poly = map.water[wi];
    const ref = QW.shoreParts(poly, map, y, true);
    const work = await inWorker('shore', { wi, n: poly.pts.length, x: poly.pts[0][0], y: poly.pts[0][1], waterY: y, withApron: true });
    report.shores.polys++;
    let ok = !!work && work.parts.length === ref.parts.length && JSON.stringify(work.seats) === JSON.stringify(ref.seats) && JSON.stringify(work.hulls) === JSON.stringify(ref.hulls);
    for (let i = 0; ok && i < ref.parts.length; i++) ok = ref.parts[i].kind === work.parts[i].kind && cmpPlain(ref.parts[i].geo, work.parts[i].geo);
    for (const q of ref.parts) { report.shores.parts++; report.shores.verts += q.geo.attributes.position.count; q.geo.dispose(); }
    report.shores.seats += ref.seats.length;
    report.shores.hulls += ref.hulls.length;
    if (!ok) report.shores.bad.push(wi);
  }
}
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
// ---- road batch cells: the finish spread over frames against the old one-frame finish
{
  const SB = await import('/js/staticbatch3d.js');
  function oldFinish(job) {
    const out = [];
    for (const bk of job.buckets.values()) {
      if (!bk.idx || !bk.chunks.length) continue;
      const geo = new THREE.BufferGeometry();
      bk.names.forEach((name, ni) => {
        const first = bk.chunks[0].data[name];
        const n = first.length / bk.chunks[0].verts;
        const o2 = new first.constructor(bk.verts * n);
        let o = 0;
        for (const ch of bk.chunks) { o2.set(ch.data[name], o); o += ch.data[name].length; }
        geo.setAttribute(name, new THREE.BufferAttribute(o2, n, bk.norm[ni]));
      });
      const index = new Uint32Array(bk.idx);
      let base = 0, o = 0;
      for (const ch of bk.chunks) {
        for (let i = 0; i < ch.index.length; i++) index[o + i] = ch.index[i] + base;
        o += ch.index.length;
        base += ch.verts;
      }
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
      out.push(geo);
    }
    return out;
  }
  const vec = (v) => [v.x, v.y, v.z];
  const sameGeo = (a, b) => same(a.index.array, b.index.array) && Object.keys(a.attributes).every((k) => b.attributes[k] && same(a.attributes[k].array, b.attributes[k].array))
    && Object.keys(a.attributes).length === Object.keys(b.attributes).length
    && [...vec(a.boundingSphere.center), a.boundingSphere.radius, ...vec(a.boundingBox.min), ...vec(a.boundingBox.max)]
      .every((x, i) => Object.is(x, [...vec(b.boundingSphere.center), b.boundingSphere.radius, ...vec(b.boundingBox.min), ...vec(b.boundingBox.max)][i]));
  report.batch = { cells: 0, meshes: 0, verts: 0, bad: [] };
  for (const [x, y] of PL([[167, 283], [105, 161], [-300, 400]])) {
    p.x = x; p.y = y;
    await sleep(5000);
    const sc = window.__scene3d.scene;
    const cells = new Map();
    const bb = new THREE.Box3(), c = new THREE.Vector3();
    for (const o of sc.children) {
      if (o.name !== 'road' || !o.isGroup) continue;
      bb.setFromObject(o).getCenter(c);
      const k = Math.floor(c.x / 96) + ',' + Math.floor(c.z / 96);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push({ b: o, mesh: o, parts: null });
    }
    for (const [k, list] of cells) {
      if (list.length < 2) continue;
      const job = SB.mergeAtOnce(list);
      const ref = oldFinish(job);
      report.batch.cells++;
      report.batch.meshes += ref.length;
      for (const g of ref) report.batch.verts += g.attributes.position.count;
      if (ref.length !== job.geos.length || !ref.every((g, i) => sameGeo(g, job.geos[i].geo))) report.batch.bad.push(x + ',' + y + ':' + k);
      for (const g of ref) g.dispose();
      for (const { geo } of job.geos) geo.dispose();
    }
  }
}
worker.terminate();
report.ok = report.batch.cells > 0 && !report.batch.bad.length && report.shores.polys > 0 && !report.shores.bad.length && report.terrain.ok && !report.city.bad.length && !report.roads.bad.length && report.roads.roads > 0 && report.structs.roads > 0 && !report.structs.bad.length && report.city.cells > 0;
return JSON.stringify(report);
