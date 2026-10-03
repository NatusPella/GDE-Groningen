import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Static batching for city buildings and roads: the meshes of every
// building (road) in a 48 m cell are merged into one mesh per material, which
// turns a few hundred draw calls in a street into a few dozen. Only items
// well inside the detail radius are merged (the far LOD takes over at its
// edge, so a merged building must never outlive its own detail mesh); their
// own meshes stay in the scene, hidden, for the camera's ray tests. A cell
// is merged a few pieces per frame within a time budget and swapped in at
// once. Their geometry already holds world coordinates (meshes sit at the
// origin; small child offsets are baked in).

const CELL = 48;
const MARGIN = 15;
const MIN_MEMBERS = 3;

const ids = new WeakMap();
let nextId = 1;
const idOf = (b) => { let i = ids.get(b); if (!i) ids.set(b, i = nextId++); return i; };
const FAR = [1e9, 1e9];
const centreOf = (b) => (b.bounds ? [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2] : FAR);

// the child meshes of a building that go into its cell's batch
function partsOf(mesh, withDetail, only = null) {
  const out = [];
  for (const c of only ? [only] : mesh.children) {
    if (!c || !c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || c.userData.noBatch) continue;
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

function unmerge(B, c) {
  if (!c.group) return;
  for (const m of c.members) for (const p of m.parts) p.visible = true;
  c.group.removeFromParent();
  for (const o of c.group.children) o.geometry.dispose();
  c.group = null;
  c.members = [];
  c.sig = '';
  B.stats.merged--;
}

// --- merging --------------------------------------------------------------

function startJob(B, c, list, withDetail) {
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
  B.job = { c, list, withDetail, pieces, i: 0, buckets: new Map() };
}

const _v = new THREE.Vector3();
const _n = new THREE.Matrix3();
let remap = new Int32Array(1024);

function addPiece(job, pc) {
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

function finishJob(B) {
  const job = B.job;
  const group = new THREE.Group();
  group.name = B.name;
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
    mesh.userData.staticBatch = true;
    group.add(mesh);
  }
  group.matrixAutoUpdate = false;
  const c = job.c;
  unmerge(B, c);
  c.group = group;
  c.members = job.list;
  c.sig = job.sig;
  c.withDetail = job.withDetail;
  for (const m of c.members) for (const p of m.parts) p.visible = false;
  B.root.add(group);
  B.stats.merged++;
  B.stats.builds++;
  B.job = null;
}

// --- per frame -------------------------------------------------------------

// opts: { name, eligible(item, mesh), valid(item, mesh, ctx, dist), cell,
// minMembers, part(mesh) }: which items may be merged, whether a merged one
// may stay merged, the cell size, the fewest items worth a batch, and the one
// child mesh to merge instead of all of them.
export function createStaticBatcher(opts) {
  const B = { name: opts.name, cells: new Map(), job: null, frame: 0, root: null, stats: { cells: 0, merged: 0, builds: 0, dropped: 0 } };
  const cell = opts.cell || CELL, minMembers = opts.minMembers || MIN_MEMBERS;
  const memberOk = (m, ctx, dist) => ctx.meshes.get(m.b) === m.mesh && !(ctx.hidden && ctx.hidden.has(m.b)) && m.mesh.parent && opts.valid(m.b, m.mesh, ctx, dist);

  // ctx: { scene, meshes (Map item -> group), hidden (Set or null), px, py,
  // detailR, drawDist, withDetail, budgetMs }
  function update(ctx) {
    if (!B.root) {
      B.root = new THREE.Group();
      B.root.name = B.name + 'es';
      B.root.matrixAutoUpdate = false;
      ctx.scene.add(B.root);
    }
    B.frame++;
    const { meshes, hidden, px, py } = ctx;
    const dist = (b) => { const [x, y] = centreOf(b); return Math.hypot(x - px, y - py); };
    for (const c of B.cells.values()) {
      if (!c.group) continue;
      let bad = c.withDetail !== ctx.withDetail;
      for (let i = 0; i < c.members.length && !bad; i++) if (!memberOk(c.members[i], ctx, dist)) bad = true;
      if (bad) { unmerge(B, c); B.stats.dropped++; continue; }
      for (const m of c.members) for (const p of m.parts) p.visible = false;
    }
    if (B.job) {
      const job = B.job;
      const deadline = performance.now() + ctx.budgetMs;
      while (job.i < job.pieces.length && performance.now() < deadline) addPiece(job, job.pieces[job.i++]);
      if (job.i >= job.pieces.length) {
        if (job.withDetail !== ctx.withDetail || job.list.some((m) => !memberOk(m, ctx, dist))) B.job = null;
        else finishJob(B);
      }
      return;
    }
    if (B.frame % 8) return;
    const inner = Math.min(ctx.drawDist, ctx.detailR) - MARGIN;
    const want = new Map();
    for (const [b, mesh] of meshes) {
      if ((hidden && hidden.has(b)) || !mesh.parent || !mesh.visible || mesh.userData.noBatch || !opts.eligible(b, mesh)) continue;
      const d = dist(b);
      if (d > inner) continue;
      const [x, y] = centreOf(b);
      const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
      let w = want.get(key);
      if (!w) want.set(key, w = { key, d: Infinity, list: [] });
      w.d = Math.min(w.d, d);
      w.list.push({ b, mesh, parts: null });
    }
    for (const c of B.cells.values()) if (c.group && !want.has(c.key)) unmerge(B, c);
    let best = null;
    for (const w of want.values()) {
      if (w.list.length < minMembers) {
        const c = B.cells.get(w.key);
        if (c && c.group) unmerge(B, c);
        continue;
      }
      w.sig = w.list.map((m) => idOf(m.b)).sort((a, b) => a - b).join('|') + (ctx.withDetail ? '+d' : '');
      const c = B.cells.get(w.key);
      if (c && c.group && c.sig === w.sig) continue;
      if (!best || w.d < best.d) best = w;
    }
    B.stats.cells = want.size;
    if (!best) return;
    let c = B.cells.get(best.key);
    if (!c) B.cells.set(best.key, c = { key: best.key, group: null, members: [], sig: '', withDetail: ctx.withDetail });
    for (const m of best.list) m.parts = opts.part ? partsOf(m.mesh, true, opts.part(m.mesh)) : partsOf(m.mesh, ctx.withDetail);
    startJob(B, c, best.list, ctx.withDetail);
    B.job.sig = best.sig;
  }

  function info() {
    let meshesN = 0;
    for (const c of B.cells.values()) if (c.group) meshesN += c.group.children.length;
    return { ...B.stats, meshes: meshesN, job: B.job ? `${B.job.i}/${B.job.pieces.length}` : null };
  }

  // every cell back to its own meshes (the batcher is switched off)
  function clear() {
    B.job = null;
    for (const c of B.cells.values()) if (c.group) unmerge(B, c);
  }

  return { update, info, clear };
}

// buildings: never past their detail radius (the far LOD draws them there)
export const buildingBatcher = createStaticBatcher({
  name: 'building-batch',
  eligible: (b, mesh) => !b.landmark && mesh.position.y === 0,
  valid: (b, mesh, ctx, dist) => dist(b) <= ctx.detailR - 1,
});

// 'laag' (or a busy CPU) draws facade details only up close: those of the
// buildings well inside that radius are merged per cell on their own;
// detailR is the facade detail radius here
export const facadeBatcher = createStaticBatcher({
  name: 'facade-batch',
  part: (mesh) => mesh.userData.facadeDetail,
  eligible: (b, mesh) => !b.landmark && mesh.position.y === 0 && !!mesh.userData.facadeDetail,
  valid: (b, mesh, ctx, dist) => dist(b) <= ctx.detailR - 1,
});

// roads: merged while their own meshes are there; a road (an OSM way) is
// longer than a building, so the cells are larger and two make a batch
export const roadBatcher = createStaticBatcher({
  name: 'road-batch',
  cell: 96,
  minMembers: 2,
  eligible: () => true,
  valid: () => true,
});
