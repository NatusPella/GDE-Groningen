import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { mergeGeometries } from './geomerge.js';

// #1039: a bird of pigeonmode.js (buildBird) was ~28 meshes, each its own draw call: four birds at a feeding spot in a street
// were 100+ of the ~310 draw calls of a frame. The parts that move together (body, head, tail, each wing half, each leg) are baked into
// ONE mesh per group with the colours as vertex colours; the groups stay, so poseBird (rotation and position of the groups) works
// as before. A part with a shiny material (the iridescent neck) keeps its own mesh and its own look. 28 draws become 11.

let sharedMaterial = null;
// one material for every baked part of every bird (the colours are in the vertices)
export function birdBakeMaterial() {
  if (!sharedMaterial) sharedMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  return sharedMaterial;
}

const isShiny = (m) => !!m && (m.metalness > 0 || m.emissive?.getHex?.() > 0);
const _m = new THREE.Matrix4();

// The direct mesh children of `group` that can be baked: not shiny, one plain material.
export function bakeableParts(group) {
  return group.children.filter((c) => c.isMesh && !c.isSkinnedMesh && !Array.isArray(c.material) && !isShiny(c.material));
}

// Bakes the direct mesh children of `group` into one mesh (first child, so group.children[0] stays "the body" for callers that
// pick it). Returns the new mesh, or null when there were fewer than two parts.
export function bakeGroup(group) {
  const parts = bakeableParts(group);
  if (parts.length < 2) return null;
  const geos = parts.map((p) => {
    p.updateMatrix();
    const g = (p.geometry.index ? p.geometry.toNonIndexed() : p.geometry.clone());
    g.applyMatrix4(_m.copy(p.matrix));
    const n = g.attributes.position.count, a = new Float32Array(n * 3), c = p.material.color;
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    return g;
  });
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(merged, birdBakeMaterial());
  mesh.castShadow = parts.some((p) => p.castShadow);
  mesh.receiveShadow = parts.some((p) => p.receiveShadow);
  for (const p of parts) { group.remove(p); p.geometry.dispose(); }
  group.add(mesh);
  group.children.unshift(group.children.pop());
  return mesh;
}

// The moving groups of a bird built by buildBird: body, head, tail, both wings and their outer halves, both leg groups.
export function bakeBird(root) {
  const u = root.userData;
  const groups = [u.body, u.head, u.tail, u.wingL, u.wingR, u.wingL.userData.outer, u.wingR.userData.outer, ...u.legParts];
  let meshes = 0;
  for (const g of groups) if (g && bakeGroup(g)) meshes++;
  return meshes;
}

// the draw calls a bird costs now (meshes in its tree), for the budget test
export function birdDraws(root) {
  let n = 0;
  root.traverse((o) => { if (o.isMesh) n++; });
  return n;
}
