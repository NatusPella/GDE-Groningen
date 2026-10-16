// Merges simple three.js geometries (position + normal; uv and color when
// every part has them) into one non-indexed BufferGeometry: one draw call for a prop made
// of boxes and cylinders. No scene, no DOM.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function mergeGeometries(list) {
  let count = 0;
  const flat = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; count += n.attributes.position.count; return n; });
  const withUv = flat.every((g) => g.attributes.uv);
  const withColor = flat.every((g) => g.attributes.color);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = withUv ? new Float32Array(count * 2) : null;
  const col = withColor ? new Float32Array(count * 3) : null;
  let o = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    if (col) col.set(g.attributes.color.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Gives a geometry one vertex colour (linear), for merging parts of several
// colours under one material with vertexColors.
const _c = new THREE.Color();
export function tint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  _c.setHex(hex);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
