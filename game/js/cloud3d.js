// Wolken aan de hemel (#194, #195): een laag lage-poly wolkjes die met de camera meeloopt en
// langzaam rondtrekt. Aantal, tint en doorzichtigheid komen uit cloudlook.js.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { cloudState, cloudSpots, CLOUD_COUNT } from './cloudlook.js';

const _gm = new THREE.Matrix4(), _im = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

// All blobs are one InstancedMesh (one draw call instead of ~60); the clouds that hang are the first instances.
export function buildCloudLayer() {
  const group = new THREE.Group();
  group.name = 'wolken';
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
  const spots = cloudSpots(CLOUD_COUNT);
  const total = spots.reduce((a, c) => a + c.blobs, 0);
  const mesh = new THREE.InstancedMesh(geo, mat, total);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const clouds = spots.map((c, i) => {
    const blobs = [];
    for (let b = 0; b < c.blobs; b++) {
      const k = 1 - Math.abs(b - (c.blobs - 1) / 2) * 0.22;
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3((b - (c.blobs - 1) / 2) * c.size * 0.7 * c.stretch * 0.5, (b % 2) * 0.06 * c.size, (b % 3 - 1) * 0.15 * c.size),
        new THREE.Quaternion(),
        new THREE.Vector3(c.size * k * c.stretch * 0.6, c.size * k * 0.28, c.size * k * 0.6));
      blobs.push(m);
    }
    return { spot: c, i, blobs };
  });
  mesh.count = 0;
  group.add(mesh);
  group.userData = { mat, mesh, clouds, angle: 0, radius: 0 };
  return group;
}

// Elke frame: volgt de camera, kiest hoeveel wolken zichtbaar zijn en hun kleur.
export function updateCloudLayer(layer, camPos, radius, weather, daylight, night, dt) {
  if (!layer) return;
  const u = layer.userData, st = cloudState(weather, daylight, night);
  u.angle = (u.angle + st.speed * dt) % (Math.PI * 2);
  layer.position.copy(camPos);
  layer.rotation.y = u.angle;
  u.mat.color.setRGB(st.tint[0], st.tint[1], st.tint[2]);
  u.mat.opacity = st.opacity;
  const R = radius * 0.55;
  let n = 0;
  for (let i = 0; i < u.clouds.length && i < st.count; i++) {
    const c = u.clouds[i], s = c.spot;
    const el = s.el * (0.6 + 0.4 * st.spread);
    _p.set(Math.cos(s.az) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(s.az) * Math.cos(el) * R);
    _q.setFromAxisAngle(_up, -s.az - Math.PI / 2); // de blobs liggen langs de raaklijn
    _gm.compose(_p, _q, _s.setScalar(R * 0.22));
    for (const bm of c.blobs) u.mesh.setMatrixAt(n++, _im.multiplyMatrices(_gm, bm));
  }
  u.mesh.count = n;
  u.mesh.instanceMatrix.needsUpdate = true;
}
