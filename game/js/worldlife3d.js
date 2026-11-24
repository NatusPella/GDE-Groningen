// World life (worldlife.js, 21-11): draws the daily events and animals with a fixed number of instanced meshes, no per-person
// objects; the bubbles are DOM through world.extraSpeakers (zero draw calls). Nothing is drawn far from the actors.
// People (#1330): real people from the character system (modularpeople.js bakeModularPose, the same baked Quaternius people as the
// far crowd), not coloured cylinders: one InstancedMesh per rig, look and pose (stand, walk, act), PEOPLE_MESHES in all, of which
// only the ones with someone in them are drawn (LIFE_LIMITS.extraDrawCalls is the ceiling). Until the rigs are loaded nobody is
// drawn, never a stand-in. The look follows the actor's seed, so every client sees the same person.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { LIFE_LIMITS, lifeRoster, lifePose, lifeSpeakers } from './worldlife.js';
import { pigeonMerged } from './pigeonmodel.js';
import { bakeModularPose, modularReady } from './modularpeople.js';
import { vcMaterial } from './pixelart3d.js';

// per rig (man, vrouw) PEOPLE_LOOKS kledingsets, elk in vier houdingen: staan (lifePose pose 0), lopen in twee fasen die twee keer per
// seconde wisselen (pose 1, zoals de verre menigte: geen standbeeld dat over straat schuift) en iets doen (pose 2: zwaaien, fotograferen)
export const PEOPLE_LOOKS = 3;
export const PEOPLE_POSES = Object.freeze([['Idle', 0.3], ['Walk', 0.1], ['Walk', 0.6], ['Wave', 0.45]]);
export const PEOPLE_MESHES = 2 * PEOPLE_LOOKS * PEOPLE_POSES.length;
const SPECIES_COLOR = { eend: 0x7a5a2a, schaap: 0xf0ece0, duif: 0x8a8f9a, zwaluw: 0x23262e };
// [breedte, hoogte, lengte] (halve maten van de omhullende ellips); het dier kijkt langs x
const SPECIES_SIZE = { eend: [0.34, 0.24, 0.5], schaap: [0.5, 0.45, 0.8], duif: [0.1, 0.1, 0.19], zwaluw: [0.06, 0.05, 0.12] };
const REBUILD_S = 2; // look at the roster twice a minute at most...
const MOVE_REBUILD_M = 50; // ...or when the player has moved this far
const BUBBLE_TAG = 'wereldleven';

let group = null, people = null, beasts = null;
let roster = [], rosterKey = '', rosterAt = { x: 1e9, y: 1e9 }, sinceBuild = 0;
let tSec = 0;
const pose = {};
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const speakers = [];
const peopleCount = new Array(PEOPLE_MESHES).fill(0);

function build(scene) {
  group = new THREE.Group(); group.name = 'wereldleven';
  // een dier is het verste niveau van het duivenmodel (pigeonmodel.js: afgeronde romp, kop, vleugels en staart, ca. 100 driehoeken) op eenheidsmaat:
  // geen bol meer. De kleur komt van de instantie, dus de hoekpuntkleuren gaan eraf.
  const beastGeo = pigeonMerged('far', {}, { wings: 'folded' });
  beastGeo.deleteAttribute('color');
  beastGeo.translate(0, 0.105, 0).scale(1 / 0.3, 1 / 0.3, 1 / 0.3);
  beasts = new THREE.InstancedMesh(beastGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), LIFE_LIMITS.maxAnimals);
  beasts.name = 'wereldleven-dieren';
  beasts.frustumCulled = false; beasts.count = 0; beasts.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(beasts);
  group.visible = false;
  scene.add(group);
}

// De mensen: pas als de rigs geladen zijn (modularReady), daarna een keer. [rig][look][houding] in een platte lijst.
function buildPeople() {
  if (people || !modularReady()) return !!people;
  const mat = vcMaterial({ roughness: 0.85 });
  const list = [];
  for (const female of [false, true]) {
    for (let k = 0; k < PEOPLE_LOOKS; k++) {
      for (const [clip, u] of PEOPLE_POSES) {
        const g = bakeModularPose(9100 + k * 173 + (female ? 29 : 0), { female }, clip, u, 1);
        const m = new THREE.InstancedMesh(g, mat, LIFE_LIMITS.maxPeople);
        m.name = 'wereldleven-mensen';
        m.frustumCulled = false; m.count = 0; m.visible = false; m.castShadow = false; m.receiveShadow = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        group.add(m);
        list.push(m);
      }
    }
  }
  people = list;
  return true;
}
// welke mesh een acteur krijgt: zijn rig en look volgen zijn zaad (op elke client dezelfde), de houding volgt lifePose; step (0 of 1)
// is de loopfase
export function peopleSlot(seed, poseKind, step = 0) {
  const s = Math.abs(Math.floor(seed)) || 0;
  const female = s & 1, look = Math.floor(s / 2) % PEOPLE_LOOKS;
  const pk = poseKind === 1 ? 1 + (step & 1) : poseKind === 2 ? 3 : 0;
  return (female * PEOPLE_LOOKS + look) * PEOPLE_POSES.length + pk;
}

function placed(m, i, x, y, z, heading, sx, sy, sz, hex) {
  dummy.position.set(x, z, y); // the game's ground plane is (x, y), three's is (x, z)
  dummy.rotation.set(0, -heading, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
  if (hex != null) m.setColorAt(i, color.setHex(hex));
}

// De dag voor het rooster: een gast simuleert de kalender niet maar krijgt de dag van de host (world.coopDag, 'klok'-gebeurtenis);
// zijn eigen calendar.day is die van zijn eigen save. Zo zien host en gast dezelfde markt en kermis (review 22-11).
export function lifeDay(world) {
  if (world.coopRole === 'client' && Number.isInteger(world.coopDag)) return world.coopDag;
  return world.calendar && Number.isFinite(world.calendar.day) ? world.calendar.day : 1;
}

// Called once per frame (weather.js applyWeatherToScene3D). Returns the draw calls this frame adds (0 up to LIFE_LIMITS.extraDrawCalls).
export function updateWorldLife(scene, world, px, py, dt) {
  if (!group) build(scene);
  const day = lifeDay(world);
  const hour = typeof world.clock === 'number' ? world.clock : 12;
  tSec += dt;
  sinceBuild += dt;
  const key = `${day}|${Math.floor(hour * 6)}`;
  if (key !== rosterKey || (sinceBuild > REBUILD_S && Math.hypot(px - rosterAt.x, py - rosterAt.y) > MOVE_REBUILD_M)) {
    roster = lifeRoster(day, hour, { x: px, y: py, r: LIFE_LIMITS.nearM });
    rosterKey = key; rosterAt = { x: px, y: py }; sinceBuild = 0;
  }
  if (!roster.length) { group.visible = false; clearBubbles(world); return 0; }
  group.visible = true;
  let nA = 0;
  const peopleOn = buildPeople();
  peopleCount.fill(0);
  const ground = world.map && world.map.groundHeightAt ? world.map : null;
  for (let i = 0; i < roster.length; i++) {
    const a = roster[i];
    lifePose(a, tSec, pose);
    if (Math.abs(pose.x - px) > LIFE_LIMITS.nearM || Math.abs(pose.y - py) > LIFE_LIMITS.nearM) continue;
    // op de grond waar hij staat (een zwaluw of een sprong telt er zijn eigen hoogte bij op)
    // een hoogtevraag alleen als de acteur meer dan een meter verder staat dan bij de vorige vraag
    if (ground && !(Math.abs(pose.x - (a._gx ?? 1e9)) < 1 && Math.abs(pose.y - (a._gy ?? 1e9)) < 1)) { a._gx = pose.x; a._gy = pose.y; a._gz = ground.groundHeightAt(pose.x, pose.y, 0) || 0; }
    const gz = ground ? a._gz : 0;
    if (a.kind === 'people') {
      if (!peopleOn) continue;
      const slot = peopleSlot(a.seed, pose.pose, Math.floor(tSec * 2 + (a.phase || 0)));
      const m = people[slot];
      if (peopleCount[slot] >= LIFE_LIMITS.maxPeople) continue;
      placed(m, peopleCount[slot]++, pose.x, pose.y, gz + pose.z, pose.heading, a.scale, a.scale, a.scale, null);
    } else {
      const sz = SPECIES_SIZE[a.species] || SPECIES_SIZE.eend, s = a.scale;
      placed(beasts, nA, pose.x, pose.y, gz + pose.z, pose.heading, sz[2] * s, sz[1] * s, sz[0] * s, SPECIES_COLOR[a.species] || 0x888888);
      nA++;
    }
  }
  beasts.count = nA;
  beasts.instanceMatrix.needsUpdate = true; if (beasts.instanceColor) beasts.instanceColor.needsUpdate = true;
  let calls = nA ? 1 : 0;
  beasts.visible = nA > 0;
  if (people) for (let k = 0; k < people.length; k++) {
    const m = people[k], n = peopleCount[k];
    m.count = n; m.visible = n > 0;
    if (n) { m.instanceMatrix.needsUpdate = true; calls++; }
  }
  // bubbles: at most two, DOM only (scene3d.js syncSpeechBubbles reads world.extraSpeakers)
  lifeSpeakers(roster, px, py, tSec, day, speakers);
  syncBubbles(world);
  return calls;
}

function clearBubbles(world) {
  // alleen opruimen als er iets van ons staat: geen nieuwe array per beeld bij een leeg rooster (review 22-11)
  if (world.extraSpeakers && world.extraSpeakers.some((e) => e.mgTag === BUBBLE_TAG)) world.extraSpeakers = world.extraSpeakers.filter((e) => e.mgTag !== BUBBLE_TAG);
}

function syncBubbles(world) {
  const list = world.extraSpeakers || (world.extraSpeakers = []);
  for (let i = list.length - 1; i >= 0; i--) if (list[i].mgTag === BUBBLE_TAG && list[i].speechUntil <= world.time) list.splice(i, 1); // our own expired ones
  for (const s of speakers) {
    const a = s.actor;
    lifePose(a, tSec, pose);
    const h = a.kind === 'people' ? 1.9 * a.scale : 0.8;
    const had = list.find((e) => e.mgTag === BUBBLE_TAG && e.lifeId === a.id);
    if (had) { had.x = pose.x; had.y = pose.y; continue; }
    if (list.some((e) => e.mgTag === BUBBLE_TAG && e.speechText === s.text)) continue;
    if (list.filter((e) => e.mgTag === BUBBLE_TAG).length >= LIFE_LIMITS.maxBubbles) continue;
    list.push({ x: pose.x, y: pose.y, h, female: false, lifeId: a.id, speechText: s.text, speechUntil: world.time + (s.until - tSec), mgTag: BUBBLE_TAG });
  }
}
