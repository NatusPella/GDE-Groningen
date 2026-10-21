// node scripts/multidraw_test.mjs: the multi-draw pool (game/js/multidraw3d.js) without a GL context: pieces in and out of one buffer,
// growing, packing a fragmented buffer, the ranges chosen for a camera and the material copies
import './node3d.mjs';

const THREE = await import('three');
const { createDrawHub, poolable } = await import('../game/js/multidraw3d.js');

let fail = 0;
const ok = (name, cond, extra = '') => { if (!cond) fail++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name} ${extra}`); };

// a piece of n quads at x0: positions carry x0 so that a copied piece can be recognised by its vertices
function piece(x0, n, z = -10) {
  const pos = [], nor = [], idx = [];
  for (let q = 0; q < n; q++) {
    const b = q * 4;
    for (const [dx, dy] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { pos.push(x0 + dx, dy + q, z); nor.push(0, 0, 1); }
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  g.computeBoundingSphere();
  return g;
}
// the x0 and the quad count of the piece a handle points at, read back from the pool's arrays (null when the indices point outside it)
function readBack(h) {
  const p = h.pool, pos = p.arrays[p.layout.findIndex((l) => l.name === 'position')];
  let x0 = Infinity;
  for (let v = h.v0; v < h.v0 + h.nV; v++) x0 = Math.min(x0, pos[v * 3]);
  for (let k = 0; k < h.nI; k++) { const i = p.index[h.i0 + k]; if (i < h.v0 || i >= h.v0 + h.nV) return null; }
  return { x0, quads: h.nV / 4 };
}

const mat = new THREE.MeshStandardMaterial({ color: 0x884422 });
const hub = createDrawHub('test');

// two pieces of the same material end up in one pool, a different material or a flag in another
const a = hub.add(mat, true, piece(0, 3)), b = hub.add(mat, true, piece(10, 5));
ok('same material, same flags: one pool', hub.pools.size === 1 && a.pool === b.pool);
const c = hub.add(mat, false, piece(20, 2));
ok('no shadow casting: its own pool', hub.pools.size === 2 && c.pool !== a.pool);
const d = hub.add(mat, true, piece(30, 2), false);
ok('no shadow receiving: its own pool', hub.pools.size === 3);
const pool = a.pool;
ok('the pool is a batched mesh with its own material copy', pool.isBatchedMesh === true && pool.material !== mat && pool.material.userData.poolOf === mat);
ok('the copy follows the original', (() => { mat.envMapIntensity = 2.5; hub.syncMaterials(); return pool.material.envMapIntensity === 2.5; })());
ok('a caster has its own depth material', pool.customDepthMaterial && pool.customDepthMaterial.isMeshDepthMaterial);
ok('the data is where the handle says', readBack(a).x0 === 0 && readBack(a).quads === 3 && readBack(b).x0 === 10 && readBack(b).quads === 5);
ok('poolable: alpha test and shader materials are not', poolable(mat) && !poolable(new THREE.MeshStandardMaterial({ alphaTest: 0.5 })) && !poolable(new THREE.ShaderMaterial()));

// ranges for a camera looking down -z from the origin: the piece at x 0 is inside, a piece far to the side is not
const cam = new THREE.PerspectiveCamera(60, 1.5, 0.5, 100);
cam.updateMatrixWorld();
hub.add(mat, true, piece(5000, 2));
pool.select(cam);
ok('the pieces in view are drawn, the one far to the side is not', pool._multiDrawCount === 2, String(pool._multiDrawCount));
const firstStart = pool._multiDrawStarts[0] / 4;
ok('the range starts at the index of the piece, in bytes', firstStart === a.i0 || firstStart === b.i0);
const far = pool.handles.find((h) => h && readBack(h).x0 === 5000);
hub.setVisible(a, false);
pool.select(cam);
ok('a hidden piece is left out', pool._multiDrawCount === 1, String(pool._multiDrawCount));
hub.setVisible(a, true);
pool.select(cam);
ok('and back', pool._multiDrawCount === 2);
hub.remove(b);
pool.select(cam);
ok('a removed piece is left out and its slot is free for the next', pool._multiDrawCount === 1 && pool.live === 2);
hub.remove(b);
ok('removing twice does no harm', pool.live === 2);
void far;

// growing: more vertices than the first buffer holds; every piece still reads back
{
  const hs = [];
  for (let i = 0; i < 40; i++) hs.push([hub.add(mat, true, piece(100 + i * 3, 300)), 100 + i * 3]);
  ok('the buffer grew', pool.vAlloc.capacity > 32768, String(pool.vAlloc.capacity));
  ok('every piece reads back after growing', hs.every(([h, x]) => { const r = readBack(h); return r && r.x0 === x && r.quads === 300; }));
  ok('the older pieces too', readBack(a).x0 === 0 && readBack(pool.handles.find((h) => h && h.nV === 8 && readBack(h).x0 === 5000)).x0 === 5000);

  // fragmenting: take out every other piece, then ask for a piece that fits no single hole
  for (let i = 0; i < hs.length; i += 2) hub.remove(hs[i][0]);
  const cap0 = pool.vAlloc.capacity, comp0 = pool.compacted || 0;
  const big = hub.add(mat, true, piece(9000, 1500));
  ok('a fragmented buffer is packed instead of grown', pool.vAlloc.capacity === cap0 && (pool.compacted || 0) > comp0, `${cap0} ${pool.vAlloc.capacity} ${pool.compacted}`);
  ok('after that every live piece still reads back', hs.filter((_, i) => i % 2).every(([h, x]) => { const r = readBack(h); return r && r.x0 === x; }) && readBack(big).x0 === 9000 && readBack(a).x0 === 0);
  // the ranges follow the packed pieces
  cam.position.set(100, 0, 0); cam.updateMatrixWorld();
  pool.select(cam);
  ok('the ranges point at the packed indices', (() => { for (let k = 0; k < pool._multiDrawCount; k++) { const first = pool._multiDrawStarts[k] / 4, n = pool._multiDrawCounts[k]; const h = pool.handles.find((q) => q && q.i0 === first); if (!h || h.nI !== n) return false; } return true; })());
}
process.exit(fail ? 1 : 0);
