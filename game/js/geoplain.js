import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Leaf module: wraps the plain arrays a geometry job returns (geokernels.js)
// in a BufferGeometry; roadsurface.js and quaywalls.js use it without
// importing the kernels (which import them).
export function geometryFromPlain(p) {
  if (!p) return null;
  const g = new THREE.BufferGeometry();
  for (const k in p.attrs) { const a = p.attrs[k]; g.setAttribute(k, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized)); }
  if (p.index) g.setIndex(new THREE.BufferAttribute(p.index, 1));
  for (const q of p.groups) g.addGroup(q.start, q.count, q.materialIndex);
  if (p.sphere) g.boundingSphere = new THREE.Sphere(new THREE.Vector3(p.sphere[0], p.sphere[1], p.sphere[2]), p.sphere[3]);
  return g;
}
