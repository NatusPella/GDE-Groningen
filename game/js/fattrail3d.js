// Het vetspoor van de tankwagen (vettruck 23-11): wat er uit de aftapkraan van Us Mem Vet lekt, als platte plassen op het asfalt.
// Vervangt de 420 gele bollen die trailer.js boven de tank liet opspatten (de eigenaar: "de bollen vet", een zwevende tros boven de
// vrachtwagen in de trailer en de benchmark). Een plas ligt altijd op de grond: de hoogte komt van de aanroeper (groundHeightAt),
// met een kleine marge en polygonOffset tegen z-fighting. Eén InstancedMesh, één drawcall, geen werk per frame als er niets bijkomt.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TRAIL_MAX = 160;
const TRAIL_LIFT = 0.015; // m boven het wegdek

export function buildFatTrail() {
  const geo = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x6f5219, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const m = new THREE.InstancedMesh(geo, mat, TRAIL_MAX);
  m.frustumCulled = false;
  m.renderOrder = 1;
  m.count = 0;
  m.userData.n = 0;
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

// Een plas op (x, z) in three-coördinaten, op hoogte y (het wegdek), straal r; rek > 1 trekt hem in de rijrichting uit (hoek a).
export function addTrailPuddle(m, x, z, y, r, rek = 1.3, a = 0) {
  const n = m.userData.n;
  if (n >= TRAIL_MAX || !Number.isFinite(x + z + y + r)) return false;
  _q.setFromAxisAngle(_up, -a);
  m.setMatrixAt(n, _m.compose(_p.set(x, y + TRAIL_LIFT, z), _q, _s.set(r * rek, 1, r)));
  m.userData.n = n + 1;
  return true;
}

export function commitTrail(m) {
  m.count = m.userData.n;
  m.instanceMatrix.needsUpdate = true;
}

export function clearTrail(m) {
  m.userData.n = 0;
  m.count = 0;
}
