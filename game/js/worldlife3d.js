// World life (worldlife.js, 21-11): draws the daily events and animals with a fixed number of instanced meshes.
// Three InstancedMesh objects in all (people bodies, people heads, animals: LIFE_LIMITS.extraDrawCalls), no per-person
// objects; the bubbles are DOM through world.extraSpeakers (zero draw calls). Outfit colours come from the NPC role pools
// of the clothing (npcOutfit, same seed and role = same colours on every client). Nothing is drawn far from the actors.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { LIFE_LIMITS, lifeRoster, lifePose, lifeSpeakers } from './worldlife.js';
import { npcOutfit, parsePiece } from './clothing.js';

const SKIN = [0xf0c9a4, 0xd9a577, 0xb07c54, 0x7d5336, 0xe8b894];
const SPECIES_COLOR = { eend: 0x7a5a2a, schaap: 0xf0ece0, duif: 0x8a8f9a, zwaluw: 0x23262e };
const SPECIES_SIZE = { eend: [0.34, 0.24, 0.5], schaap: [0.5, 0.45, 0.8], duif: [0.2, 0.17, 0.32], zwaluw: [0.12, 0.07, 0.22] };
const REBUILD_S = 2; // look at the roster twice a minute at most...
const MOVE_REBUILD_M = 50; // ...or when the player has moved this far
const BUBBLE_TAG = 'wereldleven';

let group = null, bodies = null, heads = null, beasts = null;
let roster = [], rosterKey = '', rosterAt = { x: 1e9, y: 1e9 }, sinceBuild = 0;
let tSec = 0;
const pose = {};
const dummy = new THREE.Object3D();
const color = new THREE.Color();
const speakers = [];
const colorCache = new Map();

function build(scene) {
  group = new THREE.Group(); group.name = 'wereldleven';
  const mat = () => new THREE.MeshLambertMaterial({ color: 0xffffff });
  const bodyGeo = new THREE.CylinderGeometry(0.27, 0.23, 1.1, 6); bodyGeo.translate(0, 0.75, 0);
  const headGeo = new THREE.SphereGeometry(0.17, 6, 5); headGeo.translate(0, 1.5, 0);
  const beastGeo = new THREE.SphereGeometry(1, 6, 4); beastGeo.translate(0, 0.5, 0);
  bodies = new THREE.InstancedMesh(bodyGeo, mat(), LIFE_LIMITS.maxPeople);
  heads = new THREE.InstancedMesh(headGeo, mat(), LIFE_LIMITS.maxPeople);
  beasts = new THREE.InstancedMesh(beastGeo, mat(), LIFE_LIMITS.maxAnimals);
  for (const m of [bodies, heads, beasts]) { m.frustumCulled = false; m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); group.add(m); }
  group.visible = false;
  scene.add(group);
}

// The body colour of a person: the top of the NPC outfit of his role (cached per seed and role).
function bodyColor(a) {
  const k = `${a.seed}|${a.role}|${a.hot ? 1 : 0}${a.rain ? 1 : 0}`;
  let c = colorCache.get(k);
  if (c === undefined) {
    const worn = npcOutfit(a.seed, a.role, { hot: a.hot, rain: a.rain, hair: false });
    const top = parsePiece(worn.outer || worn.top);
    c = top ? top.hex : 0x888888;
    if (colorCache.size > 600) colorCache.clear();
    colorCache.set(k, c);
  }
  return c;
}

function placed(m, i, x, y, z, heading, sx, sy, sz, hex) {
  dummy.position.set(x, z, y); // the game's ground plane is (x, y), three's is (x, z)
  dummy.rotation.set(0, -heading, 0);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
  m.setColorAt(i, color.setHex(hex));
}

// Called once per frame (weather.js applyWeatherToScene3D). Returns the draw calls this frame adds (0 or 3).
export function updateWorldLife(scene, world, px, py, dt) {
  if (!group) build(scene);
  const day = world.calendar && Number.isFinite(world.calendar.day) ? world.calendar.day : 1;
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
  let nP = 0, nA = 0;
  for (let i = 0; i < roster.length; i++) {
    const a = roster[i];
    lifePose(a, tSec, pose);
    if (Math.abs(pose.x - px) > LIFE_LIMITS.nearM || Math.abs(pose.y - py) > LIFE_LIMITS.nearM) continue;
    if (a.kind === 'people') {
      const bob = pose.pose === 1 ? Math.abs(Math.sin(tSec * 6 + a.phase)) * 0.06 : pose.pose === 2 ? Math.abs(Math.sin(tSec * 3 + a.phase)) * 0.05 : 0;
      placed(bodies, nP, pose.x, pose.y, pose.z + bob, pose.heading, a.scale, a.scale, a.scale, bodyColor(a));
      placed(heads, nP, pose.x, pose.y, pose.z + bob, pose.heading, a.scale, a.scale, a.scale, SKIN[a.seed % SKIN.length]);
      nP++;
    } else {
      const sz = SPECIES_SIZE[a.species] || SPECIES_SIZE.eend, s = a.scale;
      placed(beasts, nA, pose.x, pose.y, pose.z, pose.heading, sz[0] * s, sz[1] * s, sz[2] * s, SPECIES_COLOR[a.species] || 0x888888);
      nA++;
    }
  }
  bodies.count = heads.count = nP; beasts.count = nA;
  for (const m of [bodies, heads, beasts]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  // bubbles: at most two, DOM only (scene3d.js syncSpeechBubbles reads world.extraSpeakers)
  lifeSpeakers(roster, px, py, tSec, day, speakers);
  syncBubbles(world);
  return 3;
}

function clearBubbles(world) {
  if (world.extraSpeakers) world.extraSpeakers = world.extraSpeakers.filter((e) => e.mgTag !== BUBBLE_TAG);
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
