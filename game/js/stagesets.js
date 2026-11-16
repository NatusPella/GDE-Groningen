// #956: a mission stage that plays indoors gets a real room around the player instead of a
// conversation in the open air. Two sets, both from office3d.js:
//   kantoor      the intake at Wiebelwerk (M18): the player stands at the visitor's side,
//                the account manager behind the desk, a colleague at work;
//   serverkamer  the server room (M18): the same long hall that builds the scene of M18.3.
//
// The set stands on the map's floor height and is turned to the east (+u = +x), like the
// indoor scenes (cutscenehost.js keeps an indoor set square). The choice stage keeps the
// player at his chair (`hold`) so he cannot walk out through a wall; the wait stage in the
// server room leaves him free (the hall is wide enough).
//
// The layout (stageSetLayout) is pure and tested; drawing needs three.js and the scene.
import * as THREE from 'three';
import { getScene } from './scene3d.js';
import { buildOffice, buildServerRoom } from './office3d.js';
import { buildPersonMesh, releasePersonGeometry } from './models3d_people.js';
import { animateActor } from './actoranim.js';
import { NPC } from './missionstory.js';

export const STAGE_SETS = ['kantoor', 'serverkamer'];

// Where the room goes: in the office the player stands 0.55 m before the middle (between the
// door and the visitor's chair, not on the table); the server room is centred on the player.
// The player faces +x (the desk or the terminal), as in the indoor scenes.
export function stageSetLayout(kind, player) {
  if (!STAGE_SETS.includes(kind) || !player) return null;
  const x = Number.isFinite(player.x) ? player.x : 0;
  const y = Number.isFinite(player.y) ? player.y : 0;
  if (kind === 'kantoor') return { kind, x: x + 0.55, y, hold: { x, y, angle: 0 }, facing: 0 };
  return { kind, x, y, hold: null, facing: 0 };
}

function buildPerson(key, at, face) {
  const look = NPC[key];
  const m = buildPersonMesh(look.shirt, look.skin, look);
  m.position.set(at[0], 0, at[1]);
  m.rotation.y = -face;
  return m;
}

function disposePerson(m) {
  m.removeFromParent();
  m.traverse((o) => {
    if (!o.isMesh) return;
    if (o.geometry && typeof o.geometry.userData.personRefs === 'number') releasePersonGeometry(o);
    else if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const mat of mats) if (mat && mat.dispose) mat.dispose();
  });
}

// The room for this stage, or null when the scene or the map is not there. `targetScene` is
// for the test: without a running game there is no scene to put the room in yet.
export function buildStageSet(world, kind, player, targetScene = null) {
  const layout = stageSetLayout(kind, player);
  const scene = targetScene || getScene();
  if (!layout || !scene) return null;
  let base = 0;
  try {
    if (world && world.map && world.map.groundHeightAt) base = world.map.groundHeightAt(layout.x, layout.y, 50) || 0;
  } catch (e) { base = 0; }
  const kit = kind === 'kantoor' ? buildOffice(layout.x, layout.y, base) : buildServerRoom(layout.x, layout.y, base);
  const group = new THREE.Group();
  group.add(kit.group);
  const people = [];
  if (kind === 'kantoor') {
    // the account manager behind the desk (local 3.25 / -0.4), a colleague at work
    people.push({ mesh: buildPerson('accountmanager', [3.25, -0.4], 180), anim: () => 'talk', gaze: 0 });
    people.push({ mesh: buildPerson('student', [1.2, 2.4], 250), anim: (t) => (Math.sin(t * 0.8) > 0 ? 'phone' : 'look'), gaze: 0 });
  }
  for (const p of people) kit.group.add(p.mesh);
  scene.add(group);
  fadeIntoSet();
  return { kind, layout, group, kit, people, t: 0, hold: layout.hold };
}

// Every frame: the server room's leds and the people in the room live.
export function updateStageSet(set, dt) {
  if (!set) return;
  set.t += dt;
  if (set.kit && typeof set.kit.frame === 'function') set.kit.frame(set.t);
  for (const p of set.people) animateActor(p.mesh, { anim: p.anim(set.t), speed: 0, gaze: p.gaze, t: set.t, dt });
}

export function disposeStageSet(set) {
  if (!set) return;
  if (set.kit && typeof set.kit.dispose === 'function') set.kit.dispose();
  for (const p of set.people) disposePerson(p.mesh);
  set.group.removeFromParent();
  set.people.length = 0;
  set.kit = null;
}

// #955: the transition indoors: a short fade from black into the room, under the HUD
// (z-index 12, the choice panel sits at 15). Without a DOM (test) nothing happens.
let fadeEl = null;
function fadeIntoSet() {
  if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return;
  try {
    if (!fadeEl) {
      fadeEl = document.createElement('div');
      fadeEl.id = 'stage-set-fade';
      fadeEl.style.cssText = 'position:fixed;inset:0;z-index:12;background:#0c140e;opacity:0;pointer-events:none';
      document.body.appendChild(fadeEl);
    }
    fadeEl.style.transition = 'none';
    fadeEl.style.opacity = '1';
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f) => setTimeout(f, 16);
    raf(() => {
      fadeEl.style.transition = 'opacity .45s';
      fadeEl.style.opacity = '0';
    });
  } catch (e) { /* no DOM: the room works without the transition too */ }
}
