// Props en menigte van de lopende evenementen (#203): lage-poly kramen, parasols, hekken,
// podium, draaimolen en vlaggetjes rond het midden, en een menigte van instanced figuren
// met een dichtheid uit evenementen.crowdAt. Alleen evenementen bij de speler (< SHOW_R).
// De indeling is deterministisch per evenement (propLayout, getest in evenementen3d_test.mjs).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { activeEvents, centreOf } from './evenementen.js';
import { propLayout, crowdSpots, crowdCount, fitLayout, MAX_CROWD } from './evenementenlive.js';
import { buitenGolf } from './werf.js';

const SHOW_R = 420;

const COLORS = [0xc0392b, 0xe8b02a, 0x2f7fb8, 0x4d9a55, 0xd9772b, 0xf0e6d2];
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.y = y; return m; };

function makeProp(kind, i) {
  const g = new THREE.Group();
  const c = COLORS[i % COLORS.length];
  switch (kind) {
    case 'kraam': g.add(box(3, 1, 1.6, 0xb08a5a, 0.5), box(3.4, 0.15, 2.2, c, 2.3), box(0.1, 2.2, 0.1, 0x8a6a3a, 1.1)); break;
    case 'parasol': { const t = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 8), mat(c)); t.position.y = 2.4; g.add(t, box(0.08, 2.4, 0.08, 0xdddddd, 1.2)); break; }
    case 'kist': g.add(box(1, 0.7, 1, 0xa88255, 0.35)); break;
    case 'dranghek': g.add(box(3, 0.9, 0.08, 0x9aa3ab, 0.55)); break;
    case 'vlaggetjes': case 'lampjes': g.add(box(0.1, 4, 0.1, 0x6b6b6b, 2), box(1.4, 0.5, 0.05, c, 3.7)); break;
    case 'podium': g.add(box(8, 1.2, 5, 0x6a5238, 0.6), box(8.4, 0.3, 5.4, c, 4.2), box(0.2, 3.2, 0.2, 0x333333, 2.4)); break;
    case 'stoel': g.add(box(0.5, 0.5, 0.5, 0x3a3f46, 0.25)); break;
    case 'draaimolen': { const b = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.4, 10), mat(c)); b.position.y = 0.2; const t = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2, 10), mat(0xe8b02a)); t.position.y = 5; g.add(b, t, box(0.3, 4, 0.3, 0xdddddd, 2.2)); break; }
    case 'wagen': g.add(box(8, 2.4, 3, c, 1.6), box(6, 1.4, 2.6, 0xf0e6d2, 3.5)); break;
    case 'finishboog': g.add(box(0.4, 5, 0.4, 0xdddddd, 2.5), box(0.4, 5, 0.4, 0xdddddd, 2.5), box(9, 0.8, 0.3, 0xc0392b, 5)); g.children[0].position.x = -4.5; g.children[1].position.x = 4.5; break;
    default: g.add(box(1, 1, 1, c, 0.5));
  }
  return g;
}

const built = new Map(); // id -> { group, body, head, n }
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);

function build(scene, ev, ground, free) {
  const c = centreOf(ev), group = new THREE.Group();
  // props en menigte staan niet in huizen of water (free(x, y, marge) uit scene3d.js)
  // (bij een tewaterlating blijven menigte en hekken buiten de golf over de kade: werf.js)
  const vrij = (dx, dy, m) => free(c.x + dx, c.y + dy, m) && (ev.kind !== 'tewaterlating' || buitenGolf(c.x + dx, c.y + dy));
  fitLayout(ev, propLayout(ev), (dx, dy) => vrij(dx, dy, 3)).forEach((pl, i) => {
    const m = makeProp(pl.prop, i);
    const x = c.x + pl.dx, y = c.y + pl.dy;
    m.position.set(x, ground(x, y), y);
    m.rotation.y = pl.angle;
    group.add(m);
  });
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 1.1, 0.32), mat(0xffffff), MAX_CROWD);
  const head = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(0xd9b08c), MAX_CROWD);
  const spots = fitLayout(ev, crowdSpots(ev), (dx, dy) => vrij(dx, dy, 0.8));
  const n = Math.min(spots.length, crowdCount(ev));
  spots.slice(0, n).forEach((s, i) => {
    const x = c.x + s.dx, y = c.y + s.dy, z = ground(x, y);
    q.setFromAxisAngle(up, s.angle);
    m4.compose(p3.set(x, z + 0.55, y), q, s3); body.setMatrixAt(i, m4);
    body.setColorAt(i, new THREE.Color(COLORS[Math.floor(s.hue * COLORS.length)]));
    m4.compose(p3.set(x, z + 1.25, y), q, s3); head.setMatrixAt(i, m4);
  });
  body.count = head.count = n;
  for (const m of [body, head]) { m.frustumCulled = false; group.add(m); }
  scene.add(group);
  return { group, n };
}

export function updateEvenementen3D(scene, world, n, ground, free = () => true) {
  const hour = ((world.clock % 24) + 24) % 24, p = world.player;
  const live = new Set();
  for (const ev of activeEvents(n, hour)) {
    const c = centreOf(ev);
    if (Math.hypot(c.x - p.x, c.y - p.y) > SHOW_R) continue;
    live.add(ev.id);
    if (!built.has(ev.id)) built.set(ev.id, build(scene, ev, ground || (() => 0), free));
  }
  for (const [id, b] of built) {
    if (live.has(id)) continue;
    scene.remove(b.group);
    b.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    built.delete(id);
  }
}
