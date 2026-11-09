import { playSikkomLine } from './audio.js';
import { syncPlayerWrecks } from './vehicle.js';
import { isCinematicActive, sinceCinematic } from './cinematics.js';
import { mayStart } from './narrative.js';
import { getStat } from './achievements.js';
import { kiesKiekdoar } from './kiekdoarregels.js';

const CHECK_INTERVAL = 0.5;
let checkTimer = 0;
let lastToastAt = -Infinity;
let prev = null;
let seenLoad = 0;
const lastKindAt = {};
const NEWS_AFTER_SCENE = 12;

// Only wrecks the player caused count (ambient traffic wrecks itself
// constantly). A monotonic counter rather than a scan of world.vehicles,
// because wrecked vehicles get despawned and would make the count drop.
function snapshot(world) {
  syncPlayerWrecks(world);
  const s = world.stats || {};
  return {
    wanted: world.wanted | 0,
    inRespawn: !!world.pendingRespawn, // #812: een respawn (gepakt of neer) is geen ontsnapping
    kills: s.kills | 0,
    pedKills: s.pedKills | 0,
    copKills: s.copKills | 0,
    missionsDone: s.missionsDone | 0,
    heistsDone: s.heistsDone | 0, // #818: een geslaagde overval
    racesWon: s.racesWon | 0, // #818: een gewonnen solo-race
    wrecked: s.playerWrecks | 0,
    topSpeed: getStat('topSpeed'), // #812: nieuw topsnelheidsrecord
  };
}

export function initSikkomFeed(world) {
  checkTimer = 0;
  lastToastAt = -Infinity;
  for (const k of Object.keys(lastKindAt)) delete lastKindAt[k];
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

  // De keuze is puur en getest (kiekdoarregels.js): één kop per keer, met de
  // cooldowns en de kans. Een nieuwe soort heeft geen opname, dus geen audio.
  const keuze = kiesKiekdoar(prev, cur, world.time, { lastToastAt, lastKindAt, random: Math.random });
  if (keuze && mayStart('phone')) {
    lastKindAt[keuze.kind] = world.time;
    world.phoneNotifications.push({ text: keuze.text, duration: 4, voiced: keuze.voiced });
    if (keuze.audioKey) playSikkomLine(keuze.audioKey); // alleen als er een bestaande opname is
    lastToastAt = world.time;
  }

  prev = cur;
  world._sikkomPrev = prev;
}
