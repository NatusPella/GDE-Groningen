import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Static batching for city buildings and roads: the meshes of every
// building (road) in a 48 m cell are merged into one mesh per material, which
// turns a few hundred draw calls in a street into a few dozen. Only items
// well inside the detail radius are merged (the far LOD takes over at its
// edge, so a merged building must never outlive its own detail mesh); their
// own meshes stay in the scene, hidden, for the camera's ray tests. A cell
// is merged a few pieces per frame within a time budget, its buffers filled
// the same way, and swapped in at once. Their geometry already holds world
// coordinates (meshes sit at the origin; small child offsets are baked in).

const CELL = 48;
const MARGIN = 15;
const MIN_MEMBERS = 3;

// geometry edited in place (a knocked-out crash barrier) bumps
// geometry.userData.batchVer, so the cell holding its old copy is redone
function verOf(parts) {
  let v = 0;
  for (const p of parts) v += p.geometry.userData.batchVer || 0;
  return v;
}

const FAR = [1e9, 1e9];
const centreOf = (b) => (b.bounds ? [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2] : FAR);

// the child meshes of a building that go into its cell's batch
function partsOf(mesh, withDetail, only = null, out = []) {
  for (const c of only ? [only] : mesh.children) {
    // a child group of plain meshes (a road's civil works) goes in too
    if (c && c.isGroup && c.userData.batchChildren) { partsOf(c, withDetail, null, out); continue; }
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
  c.memberSet = null;
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
  B.job = { c, list, withDetail, pieces, i: 0, buckets: new Map(), bake: !!B.bake };
}

const _v = new THREE.Vector3();
const _n = new THREE.Matrix3();
let remap = new Int32Array(1024);

// Materials that differ only in colour share one batch material: the colour
// is baked into a vertex colour (linear, the same numbers the shader would
// multiply), so a cell draws one mesh per kind of material instead of one per
// colour (only for the buildings and their facade details: the road materials draw their paving through their own shader and lose it). A cell of 48 m held about six wall colours: ~6 draw calls (and as
// many in the shadow pass) became ~2 (docs/PERF-METING-2026-10-19.md).
function bakeSig(m) {
  if (m.userData.bakeSig !== undefined) return m.userData.bakeSig;
  let s = null;
  if (m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.vertexColors && !m.transparent && m.color && !m.lightMap && !m.aoMap && !m.normalMap
    && !m.bumpMap && !m.envMap && !m.emissiveMap && !m.roughnessMap && !m.metalnessMap && !m.alphaMap && !m.userData.noBake) {
    s = [m.map ? m.map.uuid : '', m.roughness, m.metalness, m.emissive.getHex(), m.emissiveIntensity, m.flatShading ? 1 : 0, m.side, m.shadowSide ?? '', m.opacity, m.alphaTest,
      m.polygonOffset ? `${m.polygonOffsetFactor},${m.polygonOffsetUnits}` : '', m.depthWrite ? 1 : 0, m.depthTest ? 1 : 0, m.envMapIntensity, m.fog ? 1 : 0, m.toneMapped ? 1 : 0,
      m.customProgramCacheKey ? m.customProgramCacheKey() : '', m.onBeforeCompile ? m.onBeforeCompile.toString().length : ''].join('|');
  }
  m.userData.bakeSig = s;
  return s;
}
const bakedMats = new Map();
function bakedMaterial(rep, sig) {
  let b = bakedMats.get(sig);
  if (!b) {
    b = rep.clone();
    b.color.setRGB(1, 1, 1);
    b.vertexColors = true;
    b.userData.shared = true;
    b.userData.bakeSig = null;
    b.onBeforeCompile = rep.onBeforeCompile;
    const ck = rep.customProgramCacheKey;
    b.customProgramCacheKey = () => (ck ? ck.call(rep) : '') + '|bakedcolor';
    bakedMats.set(sig, b);
  }
  return b;
}

function addPiece(job, pc) {
  const { g, mat, part } = pc;
  const sig = job.bake && !g.attributes.color ? bakeSig(mat) : null;
  const key = sig ? `bake|${sig}|${part.castShadow ? 1 : 0}|${attrSig(g)}` : `${mat.uuid}|${part.castShadow ? 1 : 0}|${attrSig(g)}`;
  let bk = job.buckets.get(key);
  if (!bk) {
    const names = Object.keys(g.attributes);
    if (sig) names.push('color');
    job.buckets.set(key, bk = { mat: sig ? bakedMaterial(mat, sig) : mat, cast: part.castShadow, names, norm: names.map((k) => (k === 'color' && sig ? false : g.attributes[k].normalized)), chunks: [], verts: 0, idx: 0, bake: !!sig });
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
    if (bk.bake && name === 'color') {
      const col = new Float32Array(verts.length * 3);
      for (let j = 0; j < verts.length; j++) { col[j * 3] = mat.color.r; col[j * 3 + 1] = mat.color.g; col[j * 3 + 2] = mat.color.b; }
      data[name] = col;
      continue;
    }
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

// The merged buffers are filled a chunk at a time (a generator, stepped under
// the same per-frame budget as the pieces), so a large cell never lands in
// one frame. The bounds are three's computeBoundingBox and
// computeBoundingSphere done over the chunks: the same values.
const _p = new THREE.Vector3();
function* finishWork(job) {
  job.geos = [];
  for (const bk of job.buckets.values()) {
    if (!bk.idx || !bk.chunks.length) continue;
    const geo = new THREE.BufferGeometry();
    const box = new THREE.Box3();
    for (let ni = 0; ni < bk.names.length; ni++) {
      const name = bk.names[ni];
      const first = bk.chunks[0].data[name];
      const n = first.length / bk.chunks[0].verts;
      const out = new first.constructor(bk.verts * n);
      let o = 0;
      for (const ch of bk.chunks) {
        const src = ch.data[name];
        out.set(src, o);
        o += src.length;
        if (name === 'position') for (let i = 0; i < src.length; i += 3) box.expandByPoint(_p.set(src[i], src[i + 1], src[i + 2]));
        yield;
      }
      geo.setAttribute(name, new THREE.BufferAttribute(out, n, bk.norm[ni]));
    }
    const index = new Uint32Array(bk.idx);
    let base = 0, o = 0;
    for (const ch of bk.chunks) {
      for (let i = 0; i < ch.index.length; i++) index[o + i] = ch.index[i] + base;
      o += ch.index.length;
      base += ch.verts;
      yield;
    }
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    const center = box.getCenter(new THREE.Vector3());
    let maxR2 = 0;
    for (const ch of bk.chunks) {
      const src = ch.data.position;
      for (let i = 0; i < src.length; i += 3) maxR2 = Math.max(maxR2, center.distanceToSquared(_p.set(src[i], src[i + 1], src[i + 2])));
      yield;
    }
    geo.boundingSphere = new THREE.Sphere(center, Math.sqrt(maxR2));
    geo.boundingBox = box;
    job.geos.push({ geo, bk });
  }
}

function makeGroup(B, job) {
  const group = new THREE.Group();
  group.name = B.name;
  for (const { geo, bk } of job.geos) {
    const mesh = new THREE.Mesh(geo, bk.mat);
    mesh.castShadow = bk.cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.staticBatch = true;
    group.add(mesh);
  }
  group.matrixAutoUpdate = false;
  return group;
}

function finishJob(B) {
  const job = B.job;
  const group = job.group || makeGroup(B, job);
  const c = job.c;
  unmerge(B, c);
  c.group = group;
  c.members = job.list;
  c.memberSet = new Set(job.list.map((m) => m.b));
  c.withDetail = job.withDetail;
  for (const m of c.members) for (const p of m.parts) p.visible = false;
  B.root.add(group);
  B.stats.merged++;
  B.stats.builds++;
  B.job = null;
}

// --- per frame -------------------------------------------------------------

// opts: { name, eligible(item, mesh), valid(item, mesh, ctx, dist), cell,
// minMembers, part(mesh), inner(ctx), fresh, dist(item, px, py) }: which items may be merged,
// whether a merged one may stay merged, the cell size, the fewest items worth
// a batch, the one child mesh to merge instead of all of them, the distance
// an item must be within to be merged (default: the detail radius less a
// margin), how many newcomers redo a merged cell (default 3), and the
// item's distance (default: from its bounds' centre).
function createStaticBatcher(opts) {
  const B = { name: opts.name, bake: !!opts.bake, cells: new Map(), job: null, frame: 0, root: null, stats: { cells: 0, merged: 0, builds: 0, dropped: 0, ms: 0, frames: 0 } };
  const cell = opts.cell || CELL, minMembers = opts.minMembers || MIN_MEMBERS;
  const memberOk = (m, ctx, dist) => ctx.meshes.get(m.b) === m.mesh && !(ctx.hidden && ctx.hidden.has(m.b)) && m.mesh.parent && verOf(m.parts) === m.ver && opts.valid(m.b, m.mesh, ctx, dist);

  // ctx: { scene, meshes (Map item -> group), hidden (Set or null), px, py,
  // detailR, drawDist, withDetail, budgetMs }
  function update(ctx) {
    const t0 = performance.now();
    try { step(ctx); } finally { B.stats.ms += performance.now() - t0; B.stats.frames++; }
  }
  function step(ctx) {
    if (!B.root) {
      B.root = new THREE.Group();
      B.root.name = B.name + 'es';
      B.root.matrixAutoUpdate = false;
      ctx.scene.add(B.root);
    }
    B.frame++;
    const { meshes, hidden, px, py } = ctx;
    const dist = opts.dist ? (b) => opts.dist(b, px, py) : (b) => { const [x, y] = centreOf(b); return Math.hypot(x - px, y - py); };
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
      if (job.i < job.pieces.length) return;
      const stale = () => job.withDetail !== ctx.withDetail || job.list.some((m) => !memberOk(m, ctx, dist));
      if (!job.fin) {
        if (stale()) { B.job = null; return; }
        job.fin = finishWork(job);
      }
      let done = false;
      while (performance.now() < deadline && !(done = job.fin.next().done));
      if (!done) return;
      if (stale()) B.job = null;
      else {
        // a merged mesh with a material whose shaders are not linked yet draws only once they are (a first draw
        // blocked the frame for 0.3 to 1 s, #247): compile it first, in the background, and wait up to 2 s
        if (ctx.compile && !job.group) { job.group = makeGroup(B, job); ctx.compile(job.group); job.linkSince = performance.now(); }
        if (job.group && ctx.ready && !ctx.ready(job.group) && performance.now() - job.linkSince < 2000) return;
        finishJob(B);
        B.kick = true;
      }
      return;
    }
    if (B.frame % 8 && !B.kick) return;
    B.kick = false;
    // a cell is merged from its items well inside (inner) and stays merged
    // while each of them is valid; items crossing inner (or streaming in)
    // one by one draw on their own until a rebuild is worth it: a few of
    // them, or the cell is then complete
    const inner = opts.inner ? opts.inner(ctx) : Math.min(ctx.drawDist, ctx.detailR) - MARGIN;
    const want = new Map();
    for (const [b, mesh] of meshes) {
      if ((hidden && hidden.has(b)) || !mesh.parent || !mesh.visible || mesh.userData.noBatch || !opts.eligible(b, mesh)) continue;
      const d = dist(b);
      const [x, y] = centreOf(b);
      const key = `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
      let w = want.get(key);
      if (!w) want.set(key, w = { key, d: Infinity, far: 0, list: [] });
      w.far = Math.max(w.far, d);
      if (d > inner) continue;
      w.d = Math.min(w.d, d);
      w.list.push({ b, mesh, parts: null });
    }
    for (const c of B.cells.values()) if (c.group && !want.has(c.key)) unmerge(B, c);
    let best = null;
    for (const w of want.values()) {
      if (w.list.length < minMembers) continue;
      const c = B.cells.get(w.key);
      if (c && c.group && c.withDetail === ctx.withDetail) {
        let fresh = 0;
        for (const m of w.list) if (!c.memberSet.has(m.b)) fresh++;
        if (!fresh || (w.far > inner && fresh < Math.max(opts.fresh || 3, w.list.length / 4))) continue;
      }
      if (!best || w.d < best.d) best = w;
    }
    B.stats.cells = want.size;
    B.lastWant = want;
    if (!best) return;
    let c = B.cells.get(best.key);
    if (!c) B.cells.set(best.key, c = { key: best.key, group: null, members: [], memberSet: null, withDetail: ctx.withDetail });
    for (const m of best.list) {
      m.parts = opts.part ? partsOf(m.mesh, true, opts.part(m.mesh)) : partsOf(m.mesh, ctx.withDetail);
      m.ver = verOf(m.parts);
    }
    startJob(B, c, best.list, ctx.withDetail);
  }

  function info() {
    let meshesN = 0;
    for (const c of B.cells.values()) if (c.group) meshesN += c.group.children.length;
    const detail = B.lastWant ? [...B.lastWant.values()].map((w) => [w.key, w.list.length, Math.round(w.d), Math.round(w.far), B.cells.get(w.key) && B.cells.get(w.key).group ? 1 : 0]) : [];
    return { ...B.stats, meshes: meshesN, job: B.job ? `${B.job.i}/${B.job.pieces.length}` : null, detail };
  }

  // every cell back to its own meshes (the batcher is switched off)
  function clear() {
    B.job = null;
    for (const c of B.cells.values()) if (c.group) unmerge(B, c);
  }

  return { update, info, clear };
}

// scripts/perf/geocheck.js: one cell's merge in a single call, with the
// buckets the old one-frame finish would have merged
export function mergeAtOnce(list, withDetail = true) {
  const B = { job: null };
  for (const m of list) m.parts = partsOf(m.mesh, withDetail);
  startJob(B, null, list, withDetail);
  const job = B.job;
  while (job.i < job.pieces.length) addPiece(job, job.pieces[job.i++]);
  for (const _ of finishWork(job));
  return job;
}

// buildings: never past their detail radius (the far LOD draws them there)
export const buildingBatcher = createStaticBatcher({
  name: 'building-batch',
  bake: true,
  eligible: (b, mesh) => !b.landmark && mesh.position.y === 0,
  valid: (b, mesh, ctx, dist) => dist(b) <= ctx.detailR - 1,
});

// 'laag' (or a busy CPU) draws facade details only up close: those of the
// buildings well inside that radius are merged per cell on their own;
// detailR is the facade detail radius here
export const facadeBatcher = createStaticBatcher({
  name: 'facade-batch',
  bake: true,
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
  // a road is valid wherever its mesh is in the scene (bounds within the
  // draw distance); merged once its nearest point is 15 m inside that, so
  // it stays a while; a merged cell is redone once two roads have come in
  dist: (r, px, py) => {
    const b = r.bounds;
    return b ? Math.hypot(Math.max(b[0] - px, 0, px - b[2]), Math.max(b[1] - py, 0, py - b[3])) : 1e9;
  },
  inner: (ctx) => ctx.drawDist - 15,
  fresh: 2,
  eligible: () => true,
  valid: () => true,
});

// shores (quaywalls.js): the meshes of the banks and quay walls of the water polygons, merged per material over the cells (items are the
// shore meshes: item { mesh, bounds } -> holder { mesh, parent, visible, userData }; scene3d.js keeps the map in step with the water in the scene). The water
// surface is transparent and stays on its own.
export const shoreBatcher = createStaticBatcher({
  name: 'shore-batch',
  cell: 600,
  minMembers: 2,
  dist: (it, px, py) => {
    const b = it.bounds;
    return Math.hypot(Math.max(b[0] - px, 0, px - b[2]), Math.max(b[1] - py, 0, py - b[3]));
  },
  inner: (ctx) => ctx.drawDist - 15,
  fresh: 2,
  part: (holder) => holder.mesh,
  eligible: () => true,
  valid: () => true,
});
