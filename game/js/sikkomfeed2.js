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

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function countWrecked(world) {
  let n = 0;
  for (const v of world.vehicles) if (v.wrecked) n++;
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
    let msg = null;
    if (cur.wanted > prev.wanted) msg = pick(WANTED_UP);
    else if (cur.wrecked > prev.wrecked) msg = pick(WRECKED_UP);
    else if (cur.copKills > prev.copKills) msg = pick(COPKILL_UP);
    else if (cur.pedKills > prev.pedKills) msg = pick(PEDKILL_UP);
    else if (cur.kills > prev.kills) msg = pick(KILL_UP);
    else if (cur.missionsDone > prev.missionsDone) msg = pick(MISSION_UP);

    if (msg) {
      world.phoneNotifications.push({ text: msg, duration: 4 });
      lastToastAt = world.time;
    }
  }

  prev = cur;
  world._sikkomPrev = prev;
}
