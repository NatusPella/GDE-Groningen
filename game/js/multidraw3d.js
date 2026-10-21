import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { RangeAllocator, frustumPlanes, cullRanges } from './drawpool.js';

// The multi-draw pool for static world geometry (#246). The static batchers (staticbatch3d.js) merge the buildings
// and roads of a 48 to 96 m cell into one mesh per material; a street still held a hundred of those meshes, each a
// scene node that three walks (matrices, frustum, render list, program state) and draws on its own, ~14 us of
// main-thread time per draw. Here the merged geometry of every cell is copied into one big buffer per material and
// the cells that show are drawn by ONE multi-draw call (WEBGL_multi_draw): three sees one object per material, the
// per-cell frustum test is a sphere test over typed arrays (drawpool.js), and the GPU process takes over the draws.
//
// The pool is a THREE.BatchedMesh with an identity matrix at index 0 and no batchId data (the attribute is all
// zeros): that is what makes three set the batching define, bind the matrix texture and call renderMultiDraw with
// the ranges chosen here. Its material is a copy of the source material: three recompiles a program every time a
// material switches between a batched and a plain mesh, and the originals still draw the loose meshes. The copy
// follows the few properties the game changes at runtime (syncMaterials).

const VERT0 = 1 << 15;
const IDX0 = 1 << 16;
const SLOT0 = 64;
const MIRROR = ['envMapIntensity', 'emissiveIntensity', 'opacity', 'roughness', 'metalness'];

const SHADOW_SIDE = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
const _pm = new THREE.Matrix4();
const _planes = new Float64Array(24);

function growTyped(a, n) {
  const b = new a.constructor(n);
  b.set(a);
  return b;
}

class DrawPool extends THREE.BatchedMesh {
  constructor(material, cast, layout, receive) {
    super(1, 1, 1, material);
    this.layout = layout; // [{ name, size, ctor, norm }]
    this.frustumCulled = false;
    this.castShadow = cast;
    this.receiveShadow = receive;
    this.matrixAutoUpdate = false;
    this.perObjectFrustumCulled = false;
    this.sortObjects = false;
    this.userData.pool = true;
    this._matricesTexture.image.data.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._matricesTexture.needsUpdate = true;
    this.vAlloc = new RangeAllocator(VERT0);
    this.iAlloc = new RangeAllocator(IDX0);
    this.arrays = layout.map((l) => new l.ctor(VERT0 * l.size));
    this.index = new Uint32Array(IDX0);
    this.ids = new Uint16Array(VERT0);
    this.slotCap = SLOT0;
    this.spheres = new Float32Array(SLOT0 * 4).fill(-1);
    this.firsts = new Int32Array(SLOT0);
    this.counts = new Int32Array(SLOT0);
    this.freeSlots = [];
    this.slotTop = 0;
    this.live = 0;
    this._multiDrawStarts = new Int32Array(SLOT0);
    this._multiDrawCounts = new Int32Array(SLOT0);
    this.rebuildGeometry();
    this.name = 'pool';
    // the shared depth material of the shadow pass would flip between batched and plain casters (a program lookup each time): the pool has its own
    if (cast) this.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: material.shadowSide != null ? material.shadowSide : SHADOW_SIDE[material.side] });
  }

  // a new BufferGeometry over the current arrays (first time, and after a buffer grew); the old one frees its GL buffers
  rebuildGeometry() {
    const old = this.geometry;
    const g = new THREE.BufferGeometry();
    this.layout.forEach((l, i) => {
      const a = new THREE.BufferAttribute(this.arrays[i], l.size, l.norm);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(l.name, a);
    });
    const ix = new THREE.BufferAttribute(this.index, 1);
    ix.setUsage(THREE.DynamicDrawUsage);
    g.setIndex(ix);
    const id = new THREE.BufferAttribute(this.ids, 1);
    g.setAttribute('batchId', id);
    this.geometry = g;
    if (old) old.dispose();
  }

  ensure(nV, nI) {
    let grew = false;
    if (this.vAlloc.largest() < nV) {
      const cap = Math.max(this.vAlloc.capacity * 2, this.vAlloc.capacity + nV);
      this.vAlloc.grow(cap);
      this.arrays = this.arrays.map((a, i) => growTyped(a, cap * this.layout[i].size));
      this.ids = growTyped(this.ids, cap);
      grew = true;
    }
    if (this.iAlloc.largest() < nI) {
      const cap = Math.max(this.iAlloc.capacity * 2, this.iAlloc.capacity + nI);
      this.iAlloc.grow(cap);
      this.index = growTyped(this.index, cap);
      grew = true;
    }
    if (grew) this.rebuildGeometry();
  }

  add(geo) {
    const nV = geo.attributes.position.count, nI = geo.index.count;
    this.ensure(nV, nI);
    const v0 = this.vAlloc.alloc(nV), i0 = this.iAlloc.alloc(nI);
    const g = this.geometry;
    this.layout.forEach((l, i) => {
      const src = geo.attributes[l.name].array;
      this.arrays[i].set(src, v0 * l.size);
      const a = g.attributes[l.name];
      a.addUpdateRange(v0 * l.size, nV * l.size);
      a.needsUpdate = true;
    });
    const src = geo.index.array;
    for (let k = 0; k < nI; k++) this.index[i0 + k] = src[k] + v0;
    g.index.addUpdateRange(i0, nI);
    g.index.needsUpdate = true;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    const bs = geo.boundingSphere;
    let slot = this.freeSlots.pop();
    if (slot === undefined) {
      slot = this.slotTop++;
      if (slot >= this.slotCap) {
        const cap = this.slotCap * 2;
        const sp = new Float32Array(cap * 4).fill(-1);
        sp.set(this.spheres);
        this.spheres = sp;
        this.firsts = growTyped(this.firsts, cap);
        this.counts = growTyped(this.counts, cap);
        this._multiDrawStarts = new Int32Array(cap);
        this._multiDrawCounts = new Int32Array(cap);
        this.slotCap = cap;
      }
    }
    this.spheres[slot * 4] = bs.center.x; this.spheres[slot * 4 + 1] = bs.center.y; this.spheres[slot * 4 + 2] = bs.center.z; this.spheres[slot * 4 + 3] = bs.radius;
    this.firsts[slot] = i0;
    this.counts[slot] = nI;
    this.live++;
    this.visible = true;
    return { pool: this, slot, v0, nV, i0, nI, r: bs.radius };
  }

  remove(h) {
    this.spheres[h.slot * 4 + 3] = -1;
    this.counts[h.slot] = 0;
    this.freeSlots.push(h.slot);
    this.vAlloc.release(h.v0, h.nV);
    this.iAlloc.release(h.i0, h.nI);
    this.live--;
    if (!this.live) this.visible = false;
  }

  // a cell that is out of the distance sits the pass out (radius -1 is what a free slot has)
  setVisible(h, on) {
    this.spheres[h.slot * 4 + 3] = on ? h.r : -1;
  }

  select(camera) {
    _pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumPlanes(_pm.elements, _planes);
    this._multiDrawCount = cullRanges(this.spheres, this.firsts, this.counts, this.slotTop, _planes, 4, this._multiDrawStarts, this._multiDrawCounts);
  }

  onBeforeRender(renderer, scene, camera) { this.select(camera); }

  onBeforeShadow(renderer, object, camera, shadowCamera) { this.select(shadowCamera); }
}

// what the depth material of a pool can reproduce: a cut-out (alpha test, alpha map) or a displacement needs the shared depth variants
export function poolable(m) {
  return !(m.alphaTest > 0) && !m.alphaMap && !m.displacementMap && !m.wireframe && !m.isShaderMaterial;
}

const copies = new Map();
function copyOf(mat) {
  let c = copies.get(mat);
  if (!c) {
    c = mat.clone();
    c.onBeforeCompile = mat.onBeforeCompile;
    const ck = mat.customProgramCacheKey;
    c.customProgramCacheKey = () => (ck ? ck.call(mat) : '') + '|pool';
    c.userData = { ...mat.userData, shared: true, poolOf: mat };
    copies.set(mat, c);
  }
  return c;
}

const layoutSig = (g) => Object.keys(g.attributes).sort().map((k) => {
  const a = g.attributes[k];
  return `${k}${a.itemSize}${a.array.constructor.name[0]}${a.normalized ? 'n' : ''}`;
}).join(',');

export function createDrawHub(name) {
  const pools = new Map();
  const root = new THREE.Group();
  root.name = name;
  root.matrixAutoUpdate = false;
  const hub = {
    root,
    pools,
    // called with each new pool: scene3d.js starts compiling its program right away
    onPool: null,
    // geo: merged, indexed, world coordinates, with a bounding sphere; returns the handle for remove
    add(mat, cast, geo, receive = true) {
      const key = `${mat.uuid}|${cast ? 1 : 0}${receive ? 1 : 0}|${layoutSig(geo)}`;
      let p = pools.get(key);
      if (!p) {
        const layout = Object.keys(geo.attributes).sort().map((k) => {
          const a = geo.attributes[k];
          return { name: k, size: a.itemSize, ctor: a.array.constructor, norm: a.normalized };
        });
        p = new DrawPool(copyOf(mat), cast, layout, receive);
        p.visible = false;
        root.add(p);
        pools.set(key, p);
        if (hub.onPool) hub.onPool(p);
      }
      return p.add(geo);
    },
    remove(h) { h.pool.remove(h); },
    setVisible(h, on) { h.pool.setVisible(h, on); },
    // the pool's copy of a material (for compiling it before the first cell is added)
    materialFor: copyOf,
    // the pool materials follow what the game changes in the originals at runtime
    syncMaterials() {
      for (const p of pools.values()) {
        const m = p.material, s = m.userData.poolOf;
        for (const k of MIRROR) if (m[k] !== s[k]) m[k] = s[k];
        if (!m.color.equals(s.color) && !m.vertexColors) m.color.copy(s.color);
      }
    },
    stats() {
      let cells = 0, verts = 0, idx = 0, mem = 0;
      for (const p of pools.values()) {
        cells += p.live; verts += p.vAlloc.used; idx += p.iAlloc.used;
        mem += p.arrays.reduce((a, x) => a + x.byteLength, 0) + p.index.byteLength + p.ids.byteLength;
      }
      return { pools: pools.size, cells, verts, idx, mb: +(mem / 1e6).toFixed(1) };
    },
  };
  return hub;
}

// the one hub of the static scene: the cells of the batchers (staticbatch3d.js) and the tiles of the far LOD (farlod.js)
export const drawHub = createDrawHub('pool-statisch');
