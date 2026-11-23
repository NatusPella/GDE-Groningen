// Loads a .glb in Node with three's GLTFLoader (no DOM; the animal and fish packs have no textures) and turns a posed
// model into one coloured, non-indexed geometry for the software renderer (scripts/lib/kleding_clip_png.mjs).
// Import './node3d.mjs' (scripts/) before this module.
import { readFileSync } from 'node:fs';

const THREE = await import('three');
const { GLTFLoader } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');

export async function loadGlb(file) {
  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((ok, fail) => new GLTFLoader().parse(ab, '', ok, fail));
}

// The clip with this short name (the packs carry every clip twice: "Walk" and "AnimalArmature|Walk").
export function findClip(gltf, name) {
  const want = name.toLowerCase();
  return gltf.animations.find((c) => c.name.toLowerCase() === want) || gltf.animations.find((c) => c.name.toLowerCase().endsWith('|' + want)) || null;
}

// Pose the scene at time t of a clip (or the bind pose without a clip).
export function pose(gltf, clipName, t) {
  const root = gltf.scene;
  const clip = clipName ? findClip(gltf, clipName) : null;
  if (clip) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    mixer.setTime(Math.min(t, clip.duration - 1e-3));
  }
  root.updateMatrixWorld(true);
  return root;
}

// Posed vertices with the material colour of each primitive, in world space, as plain arrays (pos, col).
export function bakeColoured(root, out = { pos: [], col: [] }, shift = [0, 0, 0], extra = null) {
  const v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const g = o.geometry, p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count;
    const c = (o.material && o.material.color) || new THREE.Color(0x888888);
    const vc = g.attributes.color;
    if (o.isSkinnedMesh) o.skeleton.update();   // the bone matrices are otherwise only refreshed by the renderer
    for (let k = 0; k < n; k++) {
      const j = idx ? idx.getX(k) : k;
      if (o.isSkinnedMesh) o.getVertexPosition(j, v); else v.fromBufferAttribute(p, j);
      v.applyMatrix4(o.matrixWorld);
      if (extra) v.applyMatrix4(extra);
      out.pos.push(v.x + shift[0], v.y + shift[1], v.z + shift[2]);
      if (vc) out.col.push(vc.getX(j) * c.r, vc.getY(j) * c.g, vc.getZ(j) * c.b); else out.col.push(c.r, c.g, c.b);
    }
  });
  return out;
}

export function boxOf(root) {
  return new THREE.Box3().setFromObject(root, true);
}
