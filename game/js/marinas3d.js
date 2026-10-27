import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene } from './scene3d.js';
import { Vehicle } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import { WATER_Y } from './util.js';
import { hoofdspeler } from './players.js';

// Jachthavens (#7, scripts/world/marinas.mjs -> game/marinas.json): the
// finger piers of the marinas near the player, with the moored pleasure craft
// lying between them, bow to the quay. Streamed in and out like the parking
// lots; the boats are scripted vehicles (updateBoatAI leaves them where they
// lie, manageBoatPopulation does not count or sweep them: v.moored).

const STREAM_IN = 220;
const STREAM_OUT = 300;
const DECK_Y = WATER_Y + 0.4;   // the deck of a finger pier above the water
const PIER_W = 0.9;

const deckMat = new THREE.MeshLambertMaterial({ color: 0x8c6b45 });
const postMat = new THREE.MeshLambertMaterial({ color: 0x3a2e24 });

let data = null;      // null: not asked yet, [] : none
const live = new Map();   // marina id -> { group, boats }
let tick = 0;

function load() {
  if (data) return;
  data = [];
  fetch(new URL('marinas.json', location.href).href).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (j && Array.isArray(j.marinas)) data = j.marinas;
  }).catch((e) => console.warn('marinas not loaded', e && e.message));
}

// One group: a plank deck and two posts per finger pier.
function pierGroup(m) {
  const g = new THREE.Group();
  g.name = 'marina';
  for (const [x0, y0, x1, y1] of m.fingers) {
    const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.12, PIER_W), deckMat);
    deck.position.set((x0 + x1) / 2, DECK_Y, (y0 + y1) / 2);
    deck.rotation.y = -a;
    deck.receiveShadow = true;
    g.add(deck);
    for (const t of [0.12, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), postMat);
      post.position.set(x0 + (x1 - x0) * t, DECK_Y + 0.4, y0 + (y1 - y0) * t);
      g.add(post);
    }
  }
  return g;
}

function mooredBoats(m) {
  const boats = [];
  for (const b of m.berths) {
    const model = BOAT_KINDS[b.k];
    if (!model) continue;
    const v = new Vehicle(b.x, b.y, b.a, model);
    v.isBoat = true;
    v.scripted = true;
    v.moored = true;
    boats.push(v);
  }
  return boats;
}

export function updateMarinas3D(world) {
  load();
  if (!data.length || (tick = (tick + 1) % 15) !== 0) return;
  const scene = getScene();
  if (!scene) return;
  const p = hoofdspeler(world);
  const px = p.inVehicle ? p.inVehicle.x : p.x, py = p.inVehicle ? p.inVehicle.y : p.y;
  for (const [id, L] of live) {
    const m = data[id];
    if (Math.hypot(m.x - px, m.y - py) > STREAM_OUT) {
      scene.remove(L.group);
      L.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      // the boats stay unless somebody took them out of the harbour
      for (const v of L.boats) if (v.moored && v.driver !== 'player') { const i = world.vehicles.indexOf(v); if (i >= 0) world.vehicles.splice(i, 1); }
      live.delete(id);
    }
  }
  for (const m of data) {
    if (live.has(m.id) || Math.hypot(m.x - px, m.y - py) > STREAM_IN) continue;
    const group = pierGroup(m);
    scene.add(group);
    const boats = mooredBoats(m);
    for (const v of boats) world.vehicles.push(v);
    live.set(m.id, { group, boats });
    break;   // one marina per tick
  }
}
