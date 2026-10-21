import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildWeaponMesh } from './models3d_people.js';
import { hasWeapon } from './combat.js';
import { RAGE, pickupPlan, dropLabel } from './roadragerules.js';

// Wapens oppakken (issue #52): wat een neergeslagen ruziemaker laat vallen
// (roadrage.js) ligt op straat, draait zachtjes boven een gele ring, en gaat
// met E mee. Een stuk speelgoed of knuppel, geen echt wapen. De drops worden
// niet bewaard: na twee minuten, of als je ver weg bent, zijn ze weg.
// world.weaponDrops = [{ id, key, x, y, gz, t }].

let seq = 0;
let scene = null;
const meshes = new Map();
let ringGeo = null;
let ringMat = null;

export function dropWeapon(world, key, x, y, gz = 0) {
  const list = world.weaponDrops || (world.weaponDrops = []);
  const d = { id: ++seq, key, x, y, gz, t: world.time || 0 };
  list.push(d);
  while (list.length > RAGE.dropMax) list.shift();
  return d;
}

function nearestDrop(world, reach = RAGE.pickupReach) {
  const p = world.player;
  if (!p || p.inVehicle || p.swimming || p.dead || !world.weaponDrops) return null;
  let best = null, bd = reach;
  for (const d of world.weaponDrops) {
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd <= bd) { best = d; bd = dd; }
  }
  return best;
}

export function weaponDropPrompt(world) {
  const d = nearestDrop(world);
  if (!d) return null;
  const plan = pickupPlan(d.key, world.ammo[d.key] || 0);
  return { id: 'drop-' + d.id, x: d.x, y: d.y, h: 0.5, key: 'E', label: dropLabel(d.key), sub: plan.ok ? 'Van de grond' : plan.msg, ring: true, dim: !plan.ok };
}

function usePickup(world) {
  const d = nearestDrop(world);
  if (!d) return false;
  const plan = pickupPlan(d.key, world.ammo[d.key] || 0);
  if (!plan.ok) { world.addMessage(plan.msg, 3); return true; }
  world.ammo[d.key] = plan.ammo;
  if (world.weapon === 'fists' || !hasWeapon(world, world.weapon)) world.weapon = d.key;
  world.weaponDrops.splice(world.weaponDrops.indexOf(d), 1);
  world.addMessage(plan.msg, 4);
  return true;
}

export function tryWeaponDropInteract(world) {
  const { input } = world;
  if (!input || !(input.wasPressed('e') || input.wasPressed('f'))) return false;
  if (!nearestDrop(world)) return false;
  input.consume('e');
  input.consume('f');
  return usePickup(world);
}

function ring() {
  if (!ringGeo) {
    ringGeo = new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2);
    ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  }
  return new THREE.Mesh(ringGeo, ringMat);
}

function buildDrop(d) {
  const g = new THREE.Group();
  const w = buildWeaponMesh(d.key);
  if (w) { w.scale.setScalar(1.3); w.position.y = 0.45; g.add(w); g.userData.weapon = w; }
  const r = ring();
  r.position.y = 0.06;
  g.add(r);
  return g;
}

// Called from the frame loop with the 3D scene: expires old drops, keeps one
// small mesh per drop.
export function updateWeaponDrops3D(dt, world, sc) {
  if (sc) scene = sc;
  const list = world.weaponDrops;
  if (list && list.length && world.player) {
    const p = world.player, now = world.time || 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (now - d.t > RAGE.dropLife || Math.hypot(d.x - p.x, d.y - p.y) > RAGE.dropFar) list.splice(i, 1);
    }
  }
  if (!scene) return;
  const live = new Set(list || []);
  for (const [d, m] of meshes) {
    if (live.has(d)) continue;
    scene.remove(m);
    meshes.delete(d);
  }
  if (!list) return;
  const t = (world.time || 0);
  for (const d of list) {
    let m = meshes.get(d);
    if (!m) {
      m = buildDrop(d);
      scene.add(m);
      meshes.set(d, m);
    }
    m.position.set(d.x, (d.gz || 0), d.y);
    const w = m.userData.weapon;
    if (w) { w.rotation.y = t * 1.2 + d.id; w.position.y = 0.45 + Math.sin(t * 2.4 + d.id) * 0.06; }
  }
}
