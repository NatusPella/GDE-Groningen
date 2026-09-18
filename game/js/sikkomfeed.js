import { playSikkomLine } from './audio.js';

const CHECK_INTERVAL = 0.5;
const COOLDOWN = 9;

const WANTED_UP = [
  'SIKKOM MELDT: onrust in de Grunn, politie massaal op pad',
  'SIKKOM: sirenes gierend door het centrum, politie kan niet wegblijven van jou',
];
const WRECKED_UP = [
  'SIKKOM: auto total loss in het centrum, buurtbewoners verbijsterd',
  'SIKKOM: wéér total loss in Groningen, garages wrijven in hun handen',
];
const COPKILL_UP = [
  'SIKKOM: agent gewond geraakt tijdens dienst, korps in rep en roer',
];
const PEDKILL_UP = [
  'SIKKOM: voetganger gewond, buurtapp ontploft van de reacties',
];
const KILL_UP = [
  'SIKKOM: opnieuw onrust in de straten, politie tast in het duister',
];
const MISSION_UP = [
  'SIKKOM: mysterieuze klusjesman weer aan het werk in Groningen',
];

let checkTimer = 0;
let lastToastAt = -Infinity;
let prev = null;

function pickIndexed(list) {
  const i = Math.floor(Math.random() * list.length);
  return [list[i], i];
}

// Ambient AI traffic wrecks itself constantly in a busy city - only count
// wrecks the player actually caused (own driving, ramming, shooting), same
// "don't blame/credit the player for something they didn't do" rule the
// pedKills/copKills stats already follow, or Sikkom pinged on every random
// two-NPC-cars fender-bender across the whole map.
function countWrecked(world) {
  let n = 0;
  for (const v of world.vehicles) if (v.wrecked && v.wreckedByPlayer) n++;
  return n;
}

function snapshot(world) {
  return {
    wanted: world.wanted,
    kills: world.stats.kills,
    pedKills: world.stats.pedKills,
    copKills: world.stats.copKills,
    missionsDone: world.stats.missionsDone,
    wrecked: countWrecked(world),
  };
}

export function initSikkomFeed(world) {
  checkTimer = 0;
  lastToastAt = -Infinity;
  prev = snapshot(world);
  world._sikkomPrev = prev;
  if (!world.phoneNotifications) world.phoneNotifications = [];
}

export function updateSikkomFeed(dt, world) {
  checkTimer += dt;
  if (checkTimer < CHECK_INTERVAL) return;
  checkTimer = 0;
  if (!prev) {
    initSikkomFeed(world);
    return;
  }

  const cur = snapshot(world);

  if (world.time - lastToastAt >= COOLDOWN) {
    let msg = null, audioKey = null;
    if (cur.wanted > prev.wanted) { const [t, i] = pickIndexed(WANTED_UP); msg = t; audioKey = `wanted_up_${i + 1}`; }
    else if (cur.wrecked > prev.wrecked) { const [t, i] = pickIndexed(WRECKED_UP); msg = t; audioKey = `wrecked_up_${i + 1}`; }
    else if (cur.copKills > prev.copKills) { msg = COPKILL_UP[0]; audioKey = 'copkill_up'; }
    else if (cur.pedKills > prev.pedKills) { msg = PEDKILL_UP[0]; audioKey = 'pedkill_up'; }
    else if (cur.kills > prev.kills) { msg = KILL_UP[0]; audioKey = 'kill_up'; }
    else if (cur.missionsDone > prev.missionsDone) { msg = MISSION_UP[0]; audioKey = 'mission_up'; }

    if (msg) {
      world.phoneNotifications.push({ text: msg, duration: 4 });
      playSikkomLine(audioKey);
      lastToastAt = world.time;
    }
  }

  prev = cur;
  world._sikkomPrev = prev;
}
