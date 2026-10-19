// Wolken aan de hemel (#194, #195): een laag lage-poly wolkjes die met de camera meeloopt en
// langzaam rondtrekt. Aantal, tint en doorzichtigheid komen uit cloudlook.js.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { cloudState, cloudSpots, CLOUD_COUNT } from './cloudlook.js';

export function buildCloudLayer() {
  const group = new THREE.Group();
  group.name = 'wolken';
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: false, depthWrite: false });
  const clouds = cloudSpots(CLOUD_COUNT).map((c, i) => {
    const g = new THREE.Group();
    for (let b = 0; b < c.blobs; b++) {
      const m = new THREE.Mesh(geo, mat);
      const k = 1 - Math.abs(b - (c.blobs - 1) / 2) * 0.22;
      m.scale.set(c.size * k * c.stretch * 0.6, c.size * k * 0.28, c.size * k * 0.6);
      m.position.set((b - (c.blobs - 1) / 2) * c.size * 0.7 * c.stretch * 0.5, (b % 2) * 0.06 * c.size, (b % 3 - 1) * 0.15 * c.size);
      m.frustumCulled = false;
      g.add(m);
    }
    g.userData = { spot: c, i };
    group.add(g);
    return g;
  });
  group.userData = { mat, clouds, angle: 0, radius: 0 };
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
  u.clouds.forEach((g, i) => {
    const on = i < st.count;
    g.visible = on;
    if (!on) return;
    const s = g.userData.spot;
    const el = s.el * (0.6 + 0.4 * st.spread);
    g.position.set(Math.cos(s.az) * Math.cos(el) * R, Math.sin(el) * R, Math.sin(s.az) * Math.cos(el) * R);
    g.scale.setScalar(R * 0.22);
    g.rotation.y = -s.az - Math.PI / 2; // de blobs liggen langs de raaklijn
  });
}
