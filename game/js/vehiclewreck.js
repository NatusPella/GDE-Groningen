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

export function disableVehicle(v, byPlayer, world = null) {
  if (v.wrecked || v.disabled) return;
  v.health = 0;
  if (world && !v.isBoat && !v.isHeli) dropShards(world.shards || (world.shards = createShards()), v.x, v.y, world.time || 0);
  if (byPlayer) markWreckedByPlayer(v, world);
  if (v.isBike || v.isScooter || v.isBoat) {
    v.wrecked = true;
    v.speed = 0;
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
