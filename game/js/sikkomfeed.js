import { playSikkomLine } from './audio.js';
import { syncPlayerWrecks } from './vehicle.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';

const CHECK_INTERVAL = 0.5;
// Sikkom reacts now and then, not to every star or wreck
const COOLDOWN = 90;
const SAME_KIND_COOLDOWN = 300;
const CHANCE = 0.5;
const lastKindAt = {};
let seenLoad = 0;
const NEWS_AFTER_SCENE = 12;

const WANTED_UP = [
  'SIKKOM MELDT: onrust in Grunn, politie massaal op pad',
  'SIKKOM: gierende sirenes in het centrum, politie zit iemand op de hielen',
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

// Only wrecks the player caused count (ambient traffic wrecks itself
// constantly). A monotonic counter rather than a scan of world.vehicles,
// because wrecked vehicles get despawned and would make the count drop.
function snapshot(world) {
  syncPlayerWrecks(world);
  return {
    wanted: world.wanted,
    kills: world.stats.kills,
    pedKills: world.stats.pedKills,
    copKills: world.stats.copKills,
    missionsDone: world.stats.missionsDone,
    wrecked: world.stats.playerWrecks || 0,
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

  // right after a scene the phone is for the story; the news waits its turn
  if (isCinematicActive() || sinceCinematic() < NEWS_AFTER_SCENE) return;
  const cur = snapshot(world);
  // a loaded save jumps every counter: that is no news
  if ((world.loadCount || 0) !== seenLoad) {
    seenLoad = world.loadCount || 0;
    prev = cur;
    world._sikkomPrev = prev;
    return;
  }

  if (world.time - lastToastAt >= COOLDOWN) {
    let msg = null, audioKey = null, kind = null;
    if (cur.wanted > prev.wanted) { const [t, i] = pickIndexed(WANTED_UP); msg = t; audioKey = `wanted_up_${i + 1}`; kind = 'wanted'; }
    else if (cur.wrecked > prev.wrecked) { const [t, i] = pickIndexed(WRECKED_UP); msg = t; audioKey = `wrecked_up_${i + 1}`; kind = 'wrecked'; }
    else if (cur.copKills > prev.copKills) { msg = COPKILL_UP[0]; audioKey = 'copkill_up'; kind = 'copkill'; }
    else if (cur.pedKills > prev.pedKills) { msg = PEDKILL_UP[0]; audioKey = 'pedkill_up'; kind = 'pedkill'; }
    else if (cur.kills > prev.kills) { msg = KILL_UP[0]; audioKey = 'kill_up'; kind = 'kill'; }
    else if (cur.missionsDone > prev.missionsDone) { msg = MISSION_UP[0]; audioKey = 'mission_up'; kind = 'mission'; }
    if (msg && (world.time - (lastKindAt[kind] ?? -Infinity) < SAME_KIND_COOLDOWN || Math.random() > CHANCE)) msg = null;

    if (msg) {
      lastKindAt[kind] = world.time;
      world.phoneNotifications.push({ text: msg, duration: 4, voiced: true });
      playSikkomLine(audioKey);
      lastToastAt = world.time;
    }
  }

  prev = cur;
  world._sikkomPrev = prev;
}
