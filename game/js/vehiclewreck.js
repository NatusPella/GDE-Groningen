// Voertuig uitschakelen en de telling van door de speler gesloopte voertuigen: leaf-module,
// zodat railway.js en breakables.js geen cyclus met vehicle.js vormen (#108).
import { createShards, dropShards } from './roadshards.js';
import { noteWantedWhy } from './wantedwhy.js';

// world.stats.playerWrecks is a monotonic counter (sikkomfeed diffs it), so
// each vehicle may only add to it once. Callers without a world (the
// collision pass) queue the count until the next call that has one.
let pendingPlayerWrecks = 0;

export function markWreckedByPlayer(v, world) {
  if (v.wreckedByPlayer) return;
  v.wreckedByPlayer = true;
  pendingPlayerWrecks++;
  if (world) syncPlayerWrecks(world);
}

export function syncPlayerWrecks(world) {
  if (!pendingPlayerWrecks) return;
  world.stats.playerWrecks = (world.stats.playerWrecks || 0) + pendingPlayerWrecks;
  pendingPlayerWrecks = 0;
}

const BURN_MIN = 7;
const BURN_MAX = 11;

// Een wrak staat stil (#436): geen snelheid, geen zijwaartse driftsnelheid en geen draai meer.
// Zonder dit hielden een fiets, scooter of boot die total loss sloeg zijn drift en spin, en schoot
// een wrak dat een aanhanger nog een zet gaf (of dat later in de garage werd opgeknapt, want
// repairVehicle laat de snelheid staan) alsnog weg. De hup van een ontploffing (v.vz) blijft.
export function restWreck(v) {
  if (!v) return v;
  v.speed = 0;
  v.driftX = 0;
  v.driftY = 0;
  v.yawVel = 0;
  return v;
}

export function disableVehicle(v, byPlayer, world = null) {
  if (v.wrecked || v.disabled) return;
  v.health = 0;
  if (world && !v.isBoat && !v.isHeli) dropShards(world.shards || (world.shards = createShards()), v.x, v.y, world.time || 0);
  if (byPlayer) markWreckedByPlayer(v, world);
  if (v.isBike || v.isScooter || v.isBoat) {
    v.wrecked = true;
    restWreck(v);
    return;
  }
  v.disabled = true;
  v.burnLeft = BURN_MIN + Math.random() * (BURN_MAX - BURN_MIN);
  v.horn = false;
  // an AI driver bails out (pedestrians.js) and the car rolls on unmanned
  if ((v.road || v.countryDrive) && v.driver !== 'player') v.bailPending = true;
  if (v.driver !== 'player' && !v.racer) v.road = null;
}

export function wreckVehicle(world, v, byPlayer) {
  // already burning: every hit brings the explosion closer
  if (v.disabled) { v.burnLeft -= 0.7; return; }
  if (v.wrecked) return;
  disableVehicle(v, byPlayer, world);
  if (!byPlayer) return;
  if (v.isPolice && !v.hijacked) {
    world.stats.kills++;
    world.stats.copKills++;
    world.wanted = Math.min(5, world.wanted + 2);
    noteWantedWhy(world, 'copAanval');
  }
}
