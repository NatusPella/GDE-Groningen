import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SPIKE_SPAN, SPIKE_DEPTH } from './roadshards.js';

// The police spike strips (roadshards.js dropSpikes, #204): a flat dark mat
// across the road with a row of small silver teeth. One small group per strip
// on world.shards.fields (at most two at a time); cartoon, nothing worse than a
// flat tyre. Called every frame with the 3D scene.
const meshes = new Map();
let geo = null;

function build() {
  if (!geo) {
    geo = {
      mat: new THREE.BoxGeometry(SPIKE_SPAN, 0.04, SPIKE_DEPTH * 1.6),
      tooth: new THREE.ConeGeometry(0.05, 0.16, 4),
      matM: new THREE.MeshLambertMaterial({ color: 0x24262a }),
      toothM: new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.6, roughness: 0.4 }),
    };
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo.mat, geo.matM));
  const n = 18;
  for (let i = 0; i < n; i++) {
    for (const row of [-0.2, 0.2]) {
      const t = new THREE.Mesh(geo.tooth, geo.toothM);
      t.position.set(-SPIKE_SPAN / 2 + 0.3 + (i / (n - 1)) * (SPIKE_SPAN - 0.6), 0.1, row);
      g.add(t);
    }
  }
  return g;
}

export function updateSpikeStrips3D(dt, world, scene) {
  const fields = world.shards && world.shards.fields ? world.shards.fields.filter((f) => f.kind === 'spijkers') : [];
  for (const [f, m] of meshes) {
    if (fields.includes(f) && !f.hit) continue;
    if (scene) scene.remove(m);
    meshes.delete(f);
  }
  if (!scene) return;
  for (const f of fields) {
    if (f.hit || meshes.has(f)) continue;
    const m = build();
    m.position.set(f.x, (world.map && world.map.groundHeightAt ? world.map.groundHeightAt(f.x, f.y, 0) || 0 : 0) + 0.03, f.y);
    // the strip's long side lies across the road, which runs along f.angle (x east, y to three's z)
    m.rotation.y = -(f.angle + Math.PI / 2);
    scene.add(m);
    meshes.set(f, m);
  }
}
