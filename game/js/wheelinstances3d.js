import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { perfOff } from './devflags.js';

// Vehicle wheels as instances: every car and bike keeps its own wheel meshes
// (spin, steer, skid marks read them) but they are taken off the render
// layer, and one InstancedMesh per wheel geometry and material draws them
// all from their world matrices (the hubcaps on the wheels with them): four to eight draws per vehicle become a
// few for the whole street (and as many in the shadow pass).

const HIDDEN_LAYER = 31;
const pools = new Map();
const sharedMats = new Map();
let root = null;

function matKey(m) {
  return `${m.type}|${m.roughness}|${m.metalness}|${m.color ? m.color.getHex() : ''}|${m.vertexColors ? 1 : 0}|${m.side}`;
}

function sharedMaterial(m) {
  const k = matKey(m);
  let s = sharedMats.get(k);
  if (!s) {
    s = m.clone();
    s.userData = { shared: true };
    sharedMats.set(k, s);
  }
  return s;
}

function poolFor(geo, mat, cast) {
  const k = geo.uuid + '|' + matKey(mat) + (cast ? '+s' : '');
  let p = pools.get(k);
  if (!p) pools.set(k, p = { geo, mat: sharedMaterial(mat), cast, mesh: null, cap: 0, n: 0 });
  return p;
}

function grow(p, need) {
  const cap = Math.max(32, p.cap * 2, need);
  const m = new THREE.InstancedMesh(p.geo, p.mat, cap);
  m.frustumCulled = false;
  m.castShadow = p.cast;
  m.receiveShadow = true;
  m.matrixAutoUpdate = false;
  m.userData.shared = true;
  m.name = 'wheel-instances';
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (p.mesh) {
    m.instanceMatrix.array.set(p.mesh.instanceMatrix.array.subarray(0, p.n * 16));
    p.mesh.removeFromParent();
    p.mesh.dispose();
  }
  root.add(m);
  p.mesh = m;
  p.cap = cap;
}

export function beginWheels(scene) {
  if (!root) {
    root = new THREE.Group();
    root.name = 'wheel-instances';
    root.matrixAutoUpdate = false;
    scene.add(root);
  }
  for (const p of pools.values()) p.n = 0;
}

const _sphere = new THREE.Sphere();

// one vehicle's group (in the scene, matrices about to be drawn); frustum:
// the camera's last one, vehicles well outside it add no instances
export function addVehicleWheels(group, frustum = null) {
  const wheels = group.userData.wheels;
  if (!wheels || !wheels.length) return;
  const ok = group.visible && !!group.parent && !(frustum && !frustum.intersectsSphere(_sphere.set(group.position, 8)));
  // only a vehicle whose wheels are drawn needs its matrices now (the rest of the street is not walked twice)
  if (ok || perfOff('wielen')) group.updateMatrixWorld(true);
  for (const w of wheels) {
    const m = w.material;
    if (!w.isMesh || Array.isArray(m) || m.transparent || !w.parent) { w.layers.set(0); continue; }
    let vis = ok && w.visible;
    for (let a = w.parent; vis && a && a !== group; a = a.parent) vis = a.visible;
    w.layers.set(HIDDEN_LAYER);
    if (!vis) continue;
    const p = poolFor(w.geometry, m, w.castShadow);
    if (p.n >= p.cap) grow(p, p.n + 1);
    w.matrixWorld.toArray(p.mesh.instanceMatrix.array, p.n * 16);
    p.n++;
    // what sits on the wheel (the hubcaps) goes the same way, one more instance each
    for (const c of w.children) {
      if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || Array.isArray(c.material) || c.material.transparent) continue;
      c.layers.set(HIDDEN_LAYER);
      if (!vis || !c.visible) continue;
      const q = poolFor(c.geometry, c.material, c.castShadow);
      if (q.n >= q.cap) grow(q, q.n + 1);
      c.matrixWorld.toArray(q.mesh.instanceMatrix.array, q.n * 16);
      q.n++;
    }
  }
}

export function endWheels() {
  for (const p of pools.values()) {
    if (!p.mesh) continue;
    p.mesh.count = p.n;
    p.mesh.visible = p.n > 0;
    if (p.n) {
      const a = p.mesh.instanceMatrix;
      a.clearUpdateRanges ? (a.clearUpdateRanges(), a.addUpdateRange(0, p.n * 16)) : (a.updateRange.offset = 0, a.updateRange.count = p.n * 16);
      a.needsUpdate = true;
    }
  }
}

