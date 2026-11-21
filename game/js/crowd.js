// Publiek (bouwsteen G0b): het tekenen van een crowd uit crowdplan.js. De figuren zijn de
// gewone personenmodellen (buildPersonMesh), uit een pool van acht looks, dus de rompgeometrie
// wordt gedeeld en een publiek van 60 kost geen 60 modellen. Verderaf animeren ze zuiniger
// (LOD) en voorbij LOD_HIDDEN worden ze niet getekend.
//
//   const c = buildCrowd(world, { shape: 'ring', x, y, radius: 12, count: 40, seed }, { key: 'M26.plein' });
//   updateCrowd(c, dt, { x: speler.x, y: speler.y }, camera);   // elk beeld
//   disposeCrowd(c);                                            // bij het einde van de stap of scène
//
// Samen spelen: lokaal opgebouwd uit spec en seed (geen netwerkstaat); claimCrowd per sleutel
// voorkomt een dubbel publiek bij een gast die dezelfde scène naspeelt.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { animateActor } from './actoranim.js';
import { isInsideBuilding, isOnRoad, CAR_ROAD_CATS } from './pedgeom.js';
import { isInWater } from './util.js';
import { crowdPlan, crowdReact, crowdLod, claimCrowd, releaseCrowd, CROWD_LOOKS } from './crowdplan.js';

const SHIRTS = [0xc8552e, 0x2f6fb0, 0xe0b93a, 0x3f8a52, 0x8a4a8a, 0xd8d2c2, 0x555f6e, 0xb0485a];
const SKINS = [0xf1c9a5, 0xd9a06e, 0xa9744a, 0x7a4e2e];
const LOOKS = Array.from({ length: CROWD_LOOKS }, (_, i) => ({
  shirt: SHIRTS[i % SHIRTS.length], skin: SKINS[(i * 3) % SKINS.length], seed: 9100 + i, variant: i % 3 === 0 ? 'female' : null,
}));

// Waar een figuur mag staan: niet in een gebouw, niet in het water en niet op de rijbaan
// (een voetpad of fietspad mag wel; dat is waar publiek hoort).
export function crowdGround(map) {
  if (!map) return null;
  return (x, y) => {
    try {
      if (typeof map.buildingsNear === 'function' && isInsideBuilding(map, x, y)) return false;
      if (isInWater(map, x, y)) return false;
      if (typeof map.roadsNear === 'function' && isOnRoad(map, x, y, 0.5, CAR_ROAD_CATS)) return false;
    } catch (e) { return false; }
    return true;
  };
}

// spec in wereldmaten (crowdplan.js). opts: { key, scene }. null als er geen scène is, als de
// sleutel al een publiek heeft, of als er niets te plaatsen viel.
export function buildCrowd(world, spec, { key = null, scene: target = null, ground = undefined } = {}) {
  const scene = target || getScene();
  if (!scene) return null;
  if (key != null && !claimCrowd(key)) return null;
  const map = world && world.map;
  const plan = crowdPlan(spec, ground === undefined ? crowdGround(map) : ground);
  if (!plan.members.length) { if (key != null) releaseCrowd(key); return null; }
  const group = new THREE.Group();
  group.name = 'crowd' + (key != null ? '-' + key : '');
  const zAt = (x, y) => (map && map.groundHeightAt ? (map.groundHeightAt(x, y, 50) || 0) : 0);
  const members = plan.members.map((m) => {
    const lk = LOOKS[m.look % LOOKS.length];
    const mesh = buildPersonMesh(lk.shirt, lk.skin, { seed: lk.seed, variant: lk.variant, role: 'feestganger' });
    mesh.position.set(m.x, zAt(m.x, m.y), m.y);
    mesh.rotation.y = -m.a;
    mesh.scale.y = m.h;
    group.add(mesh);
    return { ...m, mesh, state: null, tick: m.id % 4, lod: 0 };
  });
  scene.add(group);
  return { key, group, members, plan, t: 0 };
}

// Elk beeld. focus: { x, y } van wat voorbijkomt (de speler, het voertuig); cam: { x, y } van
// de camera voor de LOD (zonder camera: volle animatie).
export function updateCrowd(c, dt, focus = null, cam = null) {
  if (!c) return;
  c.t += dt;
  for (const m of c.members) {
    const lod = cam ? crowdLod(Math.hypot(cam.x - m.x, cam.y - m.y)) : 0;
    m.lod = lod;
    m.mesh.visible = lod < 2;
    if (lod >= 2) continue;
    m.state = crowdReact(m.state, m, focus, c.t);
    if (lod === 1 && (m.tick = (m.tick + 1) % 4) !== 0) continue;
    animateActor(m.mesh, { anim: m.state.anim, speed: 0, gaze: m.state.gaze, t: c.t + m.delay, dt: lod === 1 ? dt * 4 : dt });
  }
}

export function disposeCrowd(c) {
  if (!c) return;
  for (const m of c.members) {
    releasePersonGeometry(m.mesh);
    m.mesh.removeFromParent();
  }
  c.group.removeFromParent();
  c.members.length = 0;
  if (c.key != null) releaseCrowd(c.key);
}
