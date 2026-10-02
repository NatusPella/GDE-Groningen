import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Static batching for city buildings: the meshes of every building in a
// 48 m cell are merged into one mesh per material, which turns a few
// hundred draw calls in a street into a few dozen. Only buildings well
// inside the detail radius are merged (the far LOD takes over at its edge,
// so a merged building must never outlive its own detail mesh); their own
// meshes stay in the scene, hidden, for the camera's ray tests. A cell is
// merged a few pieces per frame within a time budget and swapped in at once.
// Building geometry already holds world coordinates (meshes sit at the origin).

const CELL = 48;
const MARGIN = 15;
const MIN_MEMBERS = 3;

const cells = new Map();
let job = null;
let frame = 0;
let root = null;
const stats = { cells: 0, merged: 0, meshes: 0, builds: 0, dropped: 0 };

const ids = new WeakMap();
let nextId = 1;
const idOf = (b) => { let i = ids.get(b); if (!i) ids.set(b, i = nextId++); return i; };
const centreOf = (b) => [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2];

function eligible(b, mesh) {
  return !b.landmark && mesh.parent && mesh.visible && mesh.position.y === 0 && !mesh.userData.noBatch;
}

// the child meshes of a building that go into its cell's batch
function partsOf(mesh, withDetail) {
  const out = [];
  for (const c of mesh.children) {
    if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || c.userData.noBatch) continue;
    if (!withDetail && c === mesh.userData.facadeDetail) continue;
    const g = c.geometry;
    if (!g.attributes.position || !g.attributes.normal) continue;
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    if (mats.some((m) => !m || m.transparent) || (Array.isArray(c.material) && !g.groups.length)) continue;
    out.push(c);
  }
  return out;
}

function attrSig(g) {
  return Object.keys(g.attributes).sort().map((k) => {
    const a = g.attributes[k];
    return `${k}${a.itemSize}${a.array.constructor.name[0]}${a.normalized ? 'n' : ''}`;
  }).join(',');
}

function unmerge(c) {
  if (!c.group) return;
  for (const m of c.members) for (const p of m.parts) p.visible = true;
  c.group.removeFromParent();
  for (const o of c.group.children) o.geometry.dispose();
  c.group = null;
  c.members = [];
  c.sig = '';
  stats.merged--;
}

// --- merging --------------------------------------------------------------

function startJob(c, list, withDetail) {
  const pieces = [];
  for (const m of list) {
    for (const p of m.parts) {
      const g = p.geometry;
      const mats = Array.isArray(p.material) ? p.material : null;
      const groups = mats ? g.groups : [{ start: 0, count: g.index ? g.index.count : g.attributes.position.count, materialIndex: 0 }];
      for (const gr of groups) {
        const mat = mats ? mats[gr.materialIndex] : p.material;
        pieces.push({ part: p, g, mat, start: gr.start, count: gr.count });
      }
    }
  }
  job = { c, list, withDetail, pieces, i: 0, buckets: new Map() };
}

const _v = new THREE.Vector3();
const _n = new THREE.Matrix3();
let remap = new Int32Array(1024);

function addPiece(pc) {
  const { g, mat, part } = pc;
  const key = `${mat.uuid}|${part.castShadow ? 1 : 0}|${attrSig(g)}`;
  let bk = job.buckets.get(key);
  if (!bk) {
    const names = Object.keys(g.attributes);
    job.buckets.set(key, bk = { mat, cast: part.castShadow, names, norm: names.map((k) => g.attributes[k].normalized), chunks: [], verts: 0, idx: 0 });
  }
  const nV = g.attributes.position.count;
  const end = Math.min(pc.start + pc.count, g.index ? g.index.count : nV);
  if (end <= pc.start) return;
  const verts = [];
  let local;
  if (g.index) {
    if (remap.length < nV) remap = new Int32Array(nV * 2);
    remap.fill(-1, 0, nV);
    const src = g.index.array;
    local = new Uint32Array(end - pc.start);
    for (let i = pc.start; i < end; i++) {
      const v = src[i];
      if (remap[v] < 0) { remap[v] = verts.length; verts.push(v); }
      local[i - pc.start] = remap[v];
    }
  } else {
    local = new Uint32Array(end - pc.start);
    for (let i = pc.start; i < end; i++) { local[i - pc.start] = verts.length; verts.push(i); }
  }
  part.updateWorldMatrix(true, false);
  const M = part.matrixWorld;
  const ident = M.equals(IDENTITY);
  if (!ident) _n.getNormalMatrix(M);
  const data = {};
  for (const name of bk.names) {
    const a = g.attributes[name];
    const n = a.itemSize;
    const out = new a.array.constructor(verts.length * n);
    const inter = a.isInterleavedBufferAttribute;
    for (let j = 0; j < verts.length; j++) {
      const v = verts[j];
      if (!ident && (name === 'position' || name === 'normal')) {
        _v.fromBufferAttribute(a, v);
        if (name === 'position') _v.applyMatrix4(M); else _v.applyMatrix3(_n).normalize();
        out[j * 3] = _v.x; out[j * 3 + 1] = _v.y; out[j * 3 + 2] = _v.z;
      } else if (inter) {
        for (let k = 0; k < n; k++) out[j * n + k] = a.getComponent(v, k);
      } else {
        const arr = a.array;
        for (let k = 0; k < n; k++) out[j * n + k] = arr[v * n + k];
      }
    }
    data[name] = out;
  }
  bk.chunks.push({ data, index: local, verts: verts.length });
  bk.verts += verts.length;
  bk.idx += local.length;
}

const IDENTITY = new THREE.Matrix4();

function finishJob(scene) {
  const group = new THREE.Group();
  group.name = 'building-batch';
  for (const bk of job.buckets.values()) {
    if (!bk.idx || !bk.chunks.length) continue;
    const geo = new THREE.BufferGeometry();
    bk.names.forEach((name, ni) => {
      const first = bk.chunks[0].data[name];
      const n = first.length / bk.chunks[0].verts;
      const out = new first.constructor(bk.verts * n);
      let o = 0;
      for (const ch of bk.chunks) { out.set(ch.data[name], o); o += ch.data[name].length; }
      geo.setAttribute(name, new THREE.BufferAttribute(out, n, bk.norm[ni]));
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
    const mesh = new THREE.Mesh(geo, bk.mat);
    mesh.castShadow = bk.cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.buildingBatch = true;
    group.add(mesh);
  }
  group.matrixAutoUpdate = false;
  const c = job.c;
  unmerge(c);
  c.group = group;
  c.members = job.list;
  c.sig = job.sig;
  c.withDetail = job.withDetail;
  for (const m of c.members) for (const p of m.parts) p.visible = false;
  root.add(group);
  stats.merged++;
  stats.builds++;
  job = null;
}

// --- per frame -------------------------------------------------------------

// ctx: { scene, meshes (Map building -> group), hidden (Set), px, py,
// detailR, drawDist, withDetail, budgetMs }
export function updateBuildingBatches(ctx) {
  if (!root) {
    root = new THREE.Group();
    root.name = 'building-batches';
    root.matrixAutoUpdate = false;
    ctx.scene.add(root);
  }
  frame++;
  const { meshes, hidden, px, py } = ctx;
  const dist = (b) => { const [x, y] = centreOf(b); return Math.hypot(x - px, y - py); };
  // merged cells must never hold a building that left its detail radius,
  // got hidden or rebuilt
  for (const c of cells.values()) {
    if (!c.group) continue;
    let bad = c.withDetail !== ctx.withDetail;
    for (let i = 0; i < c.members.length && !bad; i++) {
      const m = c.members[i];
      if (meshes.get(m.b) !== m.mesh || hidden.has(m.b) || !m.mesh.parent || dist(m.b) > ctx.detailR - 1) bad = true;
    }
    if (bad) { unmerge(c); stats.dropped++; continue; }
    for (const m of c.members) for (const p of m.parts) p.visible = false;
  }
  if (job) {
    const deadline = performance.now() + ctx.budgetMs;
    while (job.i < job.pieces.length && performance.now() < deadline) addPiece(job.pieces[job.i++]);
    if (job.i >= job.pieces.length) {
      const stale = job.list.some((m) => meshes.get(m.b) !== m.mesh || hidden.has(m.b) || !m.mesh.parent || dist(m.b) > ctx.detailR - 1) || job.withDetail !== ctx.withDetail;
      if (stale) job = null; else finishJob(ctx.scene);
    }
    return;
  }
  if (frame % 8) return;
  // wanted membership per cell
  const inner = Math.min(ctx.drawDist, ctx.detailR) - MARGIN;
  const want = new Map();
  for (const [b, mesh] of meshes) {
    if (hidden.has(b) || !eligible(b, mesh)) continue;
    const d = dist(b);
    if (d > inner) continue;
    const [x, y] = centreOf(b);
    const key = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
    let w = want.get(key);
    if (!w) want.set(key, w = { key, d: Infinity, list: [] });
    w.d = Math.min(w.d, d);
    w.list.push({ b, mesh, parts: null });
  }
  for (const c of cells.values()) if (c.group && !want.has(c.key)) unmerge(c);
  let best = null;
  for (const w of want.values()) {
    if (w.list.length < MIN_MEMBERS) {
      const c = cells.get(w.key);
      if (c && c.group) unmerge(c);
      continue;
    }
    w.sig = w.list.map((m) => idOf(m.b)).sort((a, b) => a - b).join('|') + (ctx.withDetail ? '+d' : '');
    const c = cells.get(w.key);
    if (c && c.group && c.sig === w.sig) continue;
    if (!best || w.d < best.d) best = w;
  }
  stats.cells = want.size;
  if (!best) return;
  let c = cells.get(best.key);
  if (!c) cells.set(best.key, c = { key: best.key, group: null, members: [], sig: '', withDetail: ctx.withDetail });
  for (const m of best.list) m.parts = partsOf(m.mesh, ctx.withDetail);
  startJob(c, best.list, ctx.withDetail);
  job.sig = best.sig;
}

export function buildingBatchStats() {
  let meshesN = 0;
  for (const c of cells.values()) if (c.group) meshesN += c.group.children.length;
  return { ...stats, meshes: meshesN, job: job ? `${job.i}/${job.pieces.length}` : null };
}
