import { dist, pointInPolygon, closestPointOnSegment } from './util.js';
import { spawnVehicleOnRoad, Vehicle } from './vehicle.js';
import { setUserWaypoint } from './routing.js';
import { playMissionIntro, playMissionFailed } from './cinematics.js';
import { playStoryIntro, playStoryOutro, playStoryFail } from './missionstory.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TRIGGER_RADIUS = 4;
const CHECKPOINT_RADIUS = 6;
const RETRY_COOLDOWN = 5;
const FATBIKE_TOUCH_RADIUS = 1.5;
const FATBIKE_MIN_SPEED = 1;
const FATBIKE_COUNT = 8;
const ABANDON_DIST = 45;
const HINT_INTERVAL = 4;

const MISSION_BOAT_MODEL = { name: 'boat', len: 4.4, wid: 1.8, maxSpeed: 4.6, accel: 1.6, brake: 2.2, turnRate: 1.3, color: '#f2efe6', cabin: '#1f4a6e' };

function roadSpot(map, x, y, drivable = false) {
  return map.nearestRoadPoint(x, y, 120, drivable) || { x, y, road: null };
}

// Fixed spots in and around the binnenstad, picked so every leg is a real
// route on the road graph: car legs on the drivable network (the inner city
// is largely one-way and car-free, so straight-line distance lies), foot legs
// on the walk network, boat legs through the Diepenring's water polygon.
function buildDefs(world) {
  const { map } = world;
  const drive = (x, y) => roadSpot(map, x, y, true);
  const walk = (x, y) => roadSpot(map, x, y);
  const kroeg = (name, x, y) => ({ ...walk(x, y), name });
  return [
    {
      type: 'deliver',
      label: "Bommen Berend wil z'n bakkie",
      intro: ['Bommen Berend wil z\'n bakkie vóór de koffie terug. Hij staat bij het Martinikerkhof.', 'Rij \'m heel naar het Boterdiep. Berend telt krassen zoals een ander schaapjes.'],
      outro: 'Berend zei zowaar \'dank je\'. Dat gebeurde sinds 1672 niet meer.',
      timeLimit: 85,
      reward: 250,
      start: drive(224, -27),
      dest: drive(-14, -489),
    },
    {
      type: 'rampage',
      label: 'Chaos op de Grote Markt',
      intro: ['Sikkom kopt: \'Grote Markt saaier dan een lege mensa\'. Dat laten we niet op ons zitten.', 'Acht stuks in 45 seconden. Voor de clicks, zegt Jelmer.'],
      outro: 'De Grote Markt is weer wakker. D\'Olle Grieze keek ervan op.',
      timeLimit: 45,
      reward: 300,
      targetKills: 8,
      start: walk(204, 113),
    },
    {
      type: 'checkpoint',
      label: 'KEI-weekrace door Grunn',
      intro: ['KEI-week: eerstejaars met polsbandjes denken dat ze Grunn al kennen.', 'Laat ze je achterlichten zien. Alle checkpoints, niet stoppen voor gratis tasjes.'],
      outro: 'De eerstejaars bellen hun ouders. Die snappen het ook niet.',
      timeLimit: 65,
      checkpointBonus: 35,
      reward: 350,
      start: drive(-153, 62),
      waypoints: [drive(-35, 13), drive(-216, -358), drive(-327, -286), drive(-153, 62)],
    },
    {
      type: 'deliver',
      label: 'Spoedklus voor Noorderzon',
      intro: ['Noorderzon mist een auto vol decor en in het Noorderplantsoen zit het publiek al klaar.', 'Rijden. Stoplichten zijn in Grunn meer een mening dan een regel.'],
      outro: 'Het decor staat. Het publiek dacht dat de gierende banden bij de show hoorden.',
      timeLimit: 140,
      reward: 500,
      start: drive(787, -95),
      dest: drive(189, -590),
    },
    {
      type: 'checkpoint',
      label: 'Ringweg-race: eindelijk klaar?',
      intro: ['De Zuidelijke Ringweg is af. Echt. Er staat zelfs een bordje.', 'Eén rondje om de binnenstad, vol gas. Staat er ergens een afzetting? Dat is traditie.'],
      outro: 'De ringweg is getest. Hij ligt er nog. Op een paar pionnen na.',
      timeLimit: 90,
      checkpointBonus: 65,
      reward: 750,
      start: drive(667, 35),
      waypoints: [drive(317, 452), drive(-48, 542), drive(-354, 107), drive(-102, -200), drive(305, -302), drive(667, 35)],
    },
    {
      type: 'checkpoint',
      label: 'Kroegentocht: Poelestraat plat',
      intro: ['Kroegentocht! Vier kroegen, één avond, nul excuses. Grunn slaapt toch nooit.', 'Te voet, hè. Tussen de Poelestraat en de Peperstraat zijn al sterkere mensen verdwaald.'],
      outro: 'Vier kroegen gehaald. Morgen wordt een eierbal-ontbijt.',
      timeLimit: 90,
      checkpointBonus: 20,
      reward: 320,
      onFoot: true,
      start: walk(250, 115),
      waypoints: [
        kroeg('Het Concerthuis', 368, 118.6),
        kroeg("'t Pakhuis", 410.5, 170.9),
        kroeg('Nachtcafé Warhol', 352.6, 224.7),
        kroeg('Groote Griet', 213.6, 135.9),
      ],
    },
    {
      type: 'fatbike',
      label: 'Fatbike-terreur: blijf overeind',
      intro: ['Op het Zuiderpark scheuren fatbikes over het fietspad. Remmen hebben ze, gebruiken niet.', 'Loop naar het eind van het pad. Twee keer geschept mag. De derde keer ben je een drempel.'],
      outro: 'Overeind gebleven tussen de fatbikes. Oma Trijntje is trots.',
      timeLimit: 40,
      reward: 275,
      maxHits: 2,
      onFoot: true,
      start: walk(590, 676),
      dest: walk(415, 785),
    },
    {
      type: 'boat',
      label: 'Rondvaart met valse papieren',
      intro: ['Aan de Spilsluizen ligt een rondvaartboot die \'even van niemand\' is. Vraag maar niet hoe.', 'Vaar het rondje over de Diepenring en doe alsof je gids bent. Glimlachen en wijzen.'],
      outro: 'Rondvaart voltooid. Niemand vroeg naar je papieren. Twee toeristen gaven fooi.',
      timeLimit: 60,
      checkpointBonus: 40,
      reward: 400,
      start: { x: -33.8, y: -261.6 },
      boatAt: { x: -33.0, y: -259.5, angle: -0.37 },
      waypoints: [{ x: 84, y: -304 }, { x: 183, y: -295 }, { x: 273, y: -250 }, { x: 369, y: -196 }],
    },
  ];
}

let chain = null;

export function initMissions(world) {
  const defs = buildDefs(world);
  chain = {
    defs,
    index: 0,
    phase: 'idle',
    timeLeft: 0,
    cooldownTimer: 0,
    killBaseline: 0,
    wpIndex: 0,
    completed: new Set(),
    seen: new Set(),
    run: null,
    vehicle: null,
    leftover: null,
    boarded: false,
    armed: true,
    hintAt: -Infinity,
    pub: { type: null, label: '', phase: 'idle', timeLeft: 0, index: 0, total: defs.length, marker: { x: 0, y: 0 }, distanceToMarker: 0, remainingWaypoints: [] },
  };
  world.mission = chain.pub;
  syncPub(world);
  world.onRespawn.push((w, { busted }) => {
    failActiveMission(w, busted ? 'Missie mislukt: opgepakt' : 'Missie mislukt: je bent dood', busted ? 'Opgepakt door de politie' : 'Je bent dood');
  });
}

export function failActiveMission(world, reason, bannerReason) {
  if (!chain || chain.phase !== 'active') return false;
  const def = chain.defs[chain.index];
  playMissionFailed(world, { reason: bannerReason || reason, stats: runStats(world, def) }, false);
  endInFailure(world, reason);
  syncPub(world);
  return true;
}

function speakerName(world) {
  const c = world.companion;
  if (c && c.character) return c.character === 'tammo' ? 'Tammo' : 'Anita';
  return world.player.character === 'tammo' ? 'Anita' : 'Tammo';
}

function statusOf(i) {
  if (chain.phase === 'active' && i === chain.index) return 'actief';
  if (i === chain.index) return 'volgende';
  return chain.completed.has(i) ? 'geklaard' : 'open';
}

export function getMissionList() {
  if (!chain) return [];
  return chain.defs.map((d, i) => ({ index: i, label: d.label, type: d.type, reward: d.reward, status: statusOf(i), start: { x: d.start.x, y: d.start.y } }));
}

export function getNextMission() {
  if (!chain) return null;
  const d = chain.defs[chain.index];
  return { index: chain.index, label: d.label, reward: d.reward, active: chain.phase === 'active' };
}

export function isMissionActive() {
  return !!chain && chain.phase === 'active';
}

// Makes mission i the next one in the chain and routes the player to its start.
export function trackMission(world, i) {
  if (!chain || !chain.defs[i]) return false;
  if (chain.phase === 'active') return i === chain.index;
  chain.index = i;
  chain.phase = 'idle';
  chain.armed = true;
  chain.wpIndex = 0;
  const d = chain.defs[i];
  setUserWaypoint(d.start.x, d.start.y, d.label);
  syncPub(world);
  return true;
}

export function getMissionProgress() {
  if (!chain) return null;
  return { index: chain.index, completed: [...chain.completed], seen: [...chain.seen] };
}

export function setMissionProgress(world, prog) {
  if (!chain || !prog) return;
  const n = chain.defs.length;
  releaseMissionVehicle(world);
  chain.index = Number.isInteger(prog.index) && prog.index >= 0 && prog.index < n ? prog.index : 0;
  const valid = (list) => (Array.isArray(list) ? list : []).filter((i) => Number.isInteger(i) && i >= 0 && i < n);
  chain.completed = new Set(valid(prog.completed));
  chain.seen = new Set([...valid(prog.seen), ...chain.completed]);
  chain.phase = 'idle';
  chain.armed = true;
  chain.wpIndex = 0;
  chain.run = null;
  syncPub(world);
}

function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const killCount = (world) => world.stats.pedKills + world.stats.copKills;

function runStats(world, def) {
  const r = chain.run;
  if (!r) return [];
  const stats = [['Tijd', fmtTime(r.elapsed)]];
  const kills = killCount(world) - r.kills;
  if (def.type === 'rampage' || kills > 0) stats.push(['Kills', String(Math.max(0, kills))]);
  stats.push(['Schade', `${Math.round(r.damage)}%`]);
  return stats;
}

function trackRun(dt, world) {
  const r = chain.run;
  if (!r) return;
  r.elapsed += dt;
  const hp = world.health + world.armor;
  if (hp < r.hp) r.damage += r.hp - hp;
  r.hp = hp;
}

// Until the player sits in the mission car/boat, point them at it rather
// than at the destination they can't complete without it.
function vehicleToBoard(world, def) {
  if (def.type !== 'deliver' && def.type !== 'boat') return null;
  const v = chain.vehicle;
  const p = world.player;
  if (!v || v.wrecked) return null;
  if (def.type === 'deliver' ? p.inVehicle === v : p.inVehicle && p.inVehicle.isBoat) return null;
  return v;
}

function syncPub(world) {
  const st = chain;
  const def = st.defs[st.index];
  const pub = st.pub;
  pub.type = def.type;
  pub.label = def.label;
  pub.phase = st.phase;
  pub.timeLeft = st.phase === 'active' ? st.timeLeft : null;
  pub.index = st.index;
  pub.total = st.defs.length;
  const board = st.phase === 'active' ? vehicleToBoard(world, def) : null;
  let target;
  if (st.phase !== 'active' || def.type === 'rampage') target = def.start;
  else if (board) target = board;
  else if (def.type === 'deliver' || def.type === 'fatbike') target = def.dest;
  else target = def.waypoints[st.wpIndex];
  pub.marker.x = target.x;
  pub.marker.y = target.y;
  pub.distanceToMarker = dist(world.player.x, world.player.y, pub.marker.x, pub.marker.y);
  if (def.type === 'rampage' && st.phase === 'active') {
    pub.killProgress = killCount(world) - st.killBaseline;
    pub.killTarget = def.targetKills;
  }
  if (def.type === 'checkpoint' || def.type === 'boat') {
    pub.wpIndex = st.wpIndex;
    pub.wpTotal = def.waypoints.length;
  }
  if (def.type === 'fatbike' && st.phase === 'active') {
    pub.fatbikeHits = st.fatbikeHits;
    pub.fatbikeMaxHits = def.maxHits;
  }
  pub.remainingWaypoints =
    (def.type === 'checkpoint' || def.type === 'boat') && st.phase === 'active' && !board
      ? def.waypoints.slice(st.wpIndex + 1).map((wp) => ({ x: wp.x, y: wp.y }))
      : [];
  world.mission = pub;
}

// The car/boat stays in the world after the mission, but as ordinary
// traffic that the population managers may despawn.
function releaseMissionVehicle(world) {
  const v = chain.vehicle;
  if (!v) return;
  v.missionCar = false;
  if (v.isBoat) v.waterPoly = world.map.waterNear(v.x, v.y, 1).find((w) => pointInPolygon(v.x, v.y, w.pts)) || null;
  chain.leftover = v;
  chain.vehicle = null;
}

function removeLeftover(world) {
  const v = chain.leftover;
  chain.leftover = null;
  if (!v || v.driver === 'player' || v.passenger) return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
}

// How far the Tammo/Anita story has got for mission i: normally i itself,
// lower when missions were played out of order.
function storyStage(i) {
  const before = chain.completed.size - (chain.completed.has(i) ? 1 : 0);
  return Math.min(i, before);
}

function succeed(world, def) {
  world.money += def.reward;
  world.stats.missionsDone++;
  world.addMessage(`${def.label} geklaard! +€${def.reward}`, 4);
  const i = chain.index;
  playStoryOutro(world, i, { stage: storyStage(i), short: chain.completed.has(i), reward: def.reward, stats: runStats(world, def), reason: def.outro || def.label });
  releaseMissionVehicle(world);
  chain.completed.add(chain.index);
  chain.run = null;
  chain.index = (chain.index + 1) % chain.defs.length;
  chain.phase = 'idle';
  chain.wpIndex = 0;
}

function fail(world, def, reason) {
  const pretty = reason ? reason[0].toUpperCase() + reason.slice(1) : def.label;
  playStoryFail(world, chain.index, { reason: pretty, stats: runStats(world, def) });
  endInFailure(world, `${def.label} mislukt${reason ? ' — ' + reason : ''}`);
}

function endInFailure(world, text) {
  world.addMessage(text, 3.5);
  releaseMissionVehicle(world);
  chain.phase = 'cooldown';
  chain.armed = false;
  chain.cooldownTimer = RETRY_COOLDOWN;
  chain.wpIndex = 0;
  chain.run = null;
}

// A point `offset` metres along the road from p, towards whichever end has
// room, so the parked car doesn't spawn on top of the player at the marker.
function pointAlongRoad(road, p, offset) {
  const pts = road.pts;
  let seg = 0, t = 0, best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(p.x, p.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) { best = cp.dist2; seg = i; t = cp.t; }
  }
  const segLen = (i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  let ahead = segLen(seg) * (1 - t), behind = segLen(seg) * t;
  for (let i = seg + 1; i < pts.length - 1; i++) ahead += segLen(i);
  for (let i = seg - 1; i >= 0; i--) behind += segLen(i);
  const dir = ahead >= behind ? 1 : -1;
  let left = Math.min(offset, Math.max(ahead, behind));
  let i = seg, x = p.x, y = p.y;
  while (left > 0 && i >= 0 && i < pts.length - 1) {
    const [tx, ty] = dir > 0 ? pts[i + 1] : pts[i];
    const d = Math.hypot(tx - x, ty - y);
    if (d >= left) { x += (tx - x) / d * left; y += (ty - y) / d * left; break; }
    left -= d; x = tx; y = ty; i += dir;
  }
  return { x, y };
}

function spawnMissionCar(world, def) {
  const at = pointAlongRoad(def.start.road, def.start, world.player.inVehicle ? 10 : 6);
  const car = spawnVehicleOnRoad(world.map, def.start.road, false, Math.random, false, false, at);
  car.road = null;
  car.speed = 0;
  car.missionCar = true;
  return car;
}

function spawnMissionBoat(def) {
  const b = def.boatAt;
  const boat = new Vehicle(b.x, b.y, b.angle, MISSION_BOAT_MODEL);
  boat.isBoat = true;
  boat.missionCar = true;
  return boat;
}

// Fatbikes riding the cycle paths along the walk; the model is picked at
// random inside spawnVehicleOnRoad, so re-roll until it comes up fat.
function spawnFatbikes(world, def) {
  const { map, player } = world;
  for (let i = 0; i < FATBIKE_COUNT; i++) {
    const t = (i + 0.5) / FATBIKE_COUNT;
    const pt = { x: def.start.x + (def.dest.x - def.start.x) * t, y: def.start.y + (def.dest.y - def.start.y) * t };
    const near = (r) => r.pts.some((q, k) => k < r.pts.length - 1 && closestPointOnSegment(pt.x, pt.y, q[0], q[1], r.pts[k + 1][0], r.pts[k + 1][1]).dist2 < 15 * 15);
    const rideable = map.roadsNear(pt.x, pt.y, 15).filter((r) => (r.cat === 'cycle' || r.cat === 'normal' || r.cat === 'minor') && near(r));
    const cycle = rideable.filter((r) => r.cat === 'cycle');
    const roads = cycle.length ? cycle : rideable;
    if (!roads.length) continue;
    for (let tries = 0; tries < 40; tries++) {
      const v = spawnVehicleOnRoad(map, roads[Math.floor(Math.random() * roads.length)], false, Math.random, true, false, pt);
      if (!v.model.fat) continue;
      if (dist(v.x, v.y, player.x, player.y) < 10) break;
      v.missionFatbike = true;
      world.vehicles.push(v);
      break;
    }
  }
}

function startMission(world, def) {
  removeLeftover(world);
  chain.phase = 'active';
  chain.timeLeft = def.timeLimit;
  chain.wpIndex = 0;
  chain.boarded = false;
  chain.hintAt = -Infinity;
  chain.run = { elapsed: 0, kills: killCount(world), hp: world.health + world.armor, damage: 0 };
  if (def.type === 'rampage') {
    chain.killBaseline = killCount(world);
  } else if (def.type === 'deliver' && def.start.road) {
    chain.vehicle = spawnMissionCar(world, def);
    world.vehicles.push(chain.vehicle);
  } else if (def.type === 'boat') {
    chain.vehicle = spawnMissionBoat(def);
    world.vehicles.push(chain.vehicle);
  } else if (def.type === 'fatbike') {
    chain.fatbikeHits = 0;
    chain.fatbikeContact = new Set();
    spawnFatbikes(world, def);
  }
  const i = chain.index;
  const kicker = `Missie ${i + 1}/${chain.defs.length}`;
  const title = def.label;
  const objective = chain.vehicle || def.dest || (def.waypoints && def.waypoints[0]) || def.start;
  const shown = playStoryIntro(world, i, { stage: storyStage(i), short: chain.seen.has(i), kicker, title, target: objective });
  if (!shown) {
    const who = speakerName(world);
    playMissionIntro(world, { kicker, title: `Missie: ${title}`, lines: (def.intro || []).map((text) => ({ speaker: who, text })), objective });
  }
  chain.seen.add(i);
}

// Only counts a hit once per fatbike per continuous touch, so lingering
// next to one for several frames doesn't burn through maxHits instantly.
function checkFatbikeHits(world) {
  const p = world.player;
  const nowTouching = new Set();
  for (const v of world.vehicles) {
    if (!v.isBike || !v.model.fat || v.wrecked || v.driver === 'player') continue;
    if (dist(p.x, p.y, v.x, v.y) >= FATBIKE_TOUCH_RADIUS) continue;
    nowTouching.add(v.id);
    if (!chain.fatbikeContact.has(v.id) && Math.abs(v.speed) > FATBIKE_MIN_SPEED) {
      chain.fatbikeHits++;
      world.addMessage(`Au! Geschept door een fatbike (${chain.fatbikeHits}/${chain.defs[chain.index].maxHits})`, 2);
    }
  }
  chain.fatbikeContact = nowTouching;
}

function hint(world, text) {
  if (world.time - chain.hintAt < HINT_INTERVAL) return;
  chain.hintAt = world.time;
  world.addMessage(text, 2.5);
}

// Returns a failure reason when the mission car/boat is gone or left behind.
function vehicleProblem(world, def) {
  const v = chain.vehicle;
  const p = world.player;
  if (!v || !world.vehicles.includes(v)) return def.type === 'boat' ? 'de boot is foetsie' : 'de auto is foetsie';
  if (v.wrecked) return def.type === 'boat' ? 'de boot ligt nu tussen de fietsen op de bodem' : 'de auto is total loss, Sikkom heeft al foto\'s';
  if (p.inVehicle === v) { chain.boarded = true; return null; }
  if (def.type === 'boat' && p.inVehicle && p.inVehicle.isBoat) return null;
  if (dist(p.x, p.y, v.x, v.y) > ABANDON_DIST) {
    const what = def.type === 'boat' ? 'de boot' : 'de auto';
    return chain.boarded ? `${what} gewoon achtergelaten` : `je liet ${what} staan. Parkeren kost hier meer dan de auto`;
  }
  return null;
}

function reachCheckpoint(world, def) {
  const wp = def.waypoints[chain.wpIndex];
  chain.wpIndex++;
  chain.timeLeft += def.checkpointBonus;
  if (chain.wpIndex >= def.waypoints.length) {
    succeed(world, def);
    return;
  }
  if (wp.name) world.addMessage(`Proost in ${wp.name}! Hup, door naar ${def.waypoints[chain.wpIndex].name}.`, 3);
}

export function updateMissions(dt, world) {
  if (!chain) return;
  const def = chain.defs[chain.index];
  const p = world.player;

  if (chain.phase === 'cooldown') {
    chain.cooldownTimer -= dt;
    if (chain.cooldownTimer <= 0) chain.phase = 'idle';
    syncPub(world);
    return;
  }

  if (chain.phase === 'idle') {
    const d = dist(p.x, p.y, def.start.x, def.start.y);
    if (d > TRIGGER_RADIUS + 2) chain.armed = true;
    else if (d < TRIGGER_RADIUS && chain.armed) startMission(world, def);
    syncPub(world);
    return;
  }

  trackRun(dt, world);
  chain.timeLeft -= dt;
  if (chain.timeLeft <= 0) {
    fail(world, def, 'tijd op. Zelfs de bus was sneller');
    syncPub(world);
    return;
  }

  if (def.type === 'deliver' || def.type === 'boat') {
    const problem = vehicleProblem(world, def);
    if (problem) {
      fail(world, def, problem);
      syncPub(world);
      return;
    }
  }
  if (def.onFoot && def.type === 'fatbike' && p.inVehicle) {
    fail(world, def, 'je moest lopen, niet stiekem rijden');
    syncPub(world);
    return;
  }

  if (def.type === 'deliver') {
    if (p.inVehicle === chain.vehicle && dist(p.x, p.y, def.dest.x, def.dest.y) < CHECKPOINT_RADIUS) {
      succeed(world, def);
    }
  } else if (def.type === 'rampage') {
    if (killCount(world) - chain.killBaseline >= def.targetKills) {
      succeed(world, def);
    }
  } else if (def.type === 'checkpoint') {
    const wp = def.waypoints[chain.wpIndex];
    if (dist(p.x, p.y, wp.x, wp.y) < CHECKPOINT_RADIUS) {
      if (def.onFoot && p.inVehicle) hint(world, 'Uitstappen, jong. Het heet kroegentocht, niet kroegenrit.');
      else reachCheckpoint(world, def);
    }
  } else if (def.type === 'fatbike') {
    checkFatbikeHits(world);
    if (chain.fatbikeHits > def.maxHits) {
      fail(world, def, 'platgewalst door dikke banden, typisch Grunn');
      syncPub(world);
      return;
    }
    if (dist(p.x, p.y, def.dest.x, def.dest.y) < CHECKPOINT_RADIUS) {
      succeed(world, def);
    }
  } else if (def.type === 'boat') {
    if (p.inVehicle && p.inVehicle.isBoat) {
      const wp = def.waypoints[chain.wpIndex];
      if (dist(p.x, p.y, wp.x, wp.y) < CHECKPOINT_RADIUS + 2) reachCheckpoint(world, def);
    }
  }

  syncPub(world);
}

// --- 3D representation ---------------------------------------------------
// Local origin at ground level (y=0) for both builders below; the integrator
// positions groups/meshes at (worldX, y, worldY) per the ARCHITECTURE.md
// mapping (three.x=world.x, three.z=world.y). Colors match the old 2D
// marker palette: cyan while a mission is active, yellow while idle/on
// cooldown (i.e. showing where to go to START the next mission).

export const MARKER_COLOR_ACTIVE = 0x3fd0ff;
export const MARKER_COLOR_IDLE = 0xffd23f;

// Earlier pass: a 0.07m-radius, 3.2m-tall beam at opacity 0.4 with no
// blending. At any real driving/on-foot distance that is a few pixels of
// faint tint against sky/fog - technically positioned correctly (syncPub's
// pub.marker.x/y is always a real, current point, never NaN) but invisible
// in practice, which matches the "ik zie geen waypoints in 3D" report.
// Fix: much thicker/taller beam, additive ("glow") blending instead of
// plain alpha so it reads as light rather than a tinted sliver, a ground
// glow disc for close-range readability, and a bigger ring/core cluster.
const markerBeamMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_IDLE,
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const markerRingMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_IDLE,
  transparent: true,
  opacity: 1,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const markerCoreMaterial = new THREE.MeshBasicMaterial({ color: MARKER_COLOR_IDLE });
const markerGroundMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_IDLE,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

const BEAM_HEIGHT = 38;

// One floating waypoint beacon: a ground glow disc, a tall glow-beam (tall
// enough to clear most rooftops so it reads from across a neighbourhood),
// a ring and a pulsing core near head height for close-up readability.
// There is only ever one active mission, so the integrator builds a single
// instance of this and repositions it every frame - it does not need
// Map-based bookkeeping like the dots below.
export function buildMissionMarker3D() {
  const group = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), markerGroundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.05;
  group.add(ground);

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, BEAM_HEIGHT, 12, 1, true), markerBeamMaterial);
  beam.position.y = BEAM_HEIGHT / 2;
  group.add(beam);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.16, 10, 24), markerRingMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.6;
  group.add(ring);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), markerCoreMaterial);
  core.position.y = 3.6;
  group.add(core);

  group.userData.ring = ring;
  group.userData.core = core;
  return group;
}

// Recolors (MARKER_COLOR_ACTIVE when phase==='active', else MARKER_COLOR_IDLE)
// and pulses/bobs the beacon built by buildMissionMarker3D(). Call once per
// frame, after positioning the group, with world.time and world.mission.phase.
// Mutates the shared marker materials directly - safe since only one marker
// mesh ever exists at a time.
export function updateMissionMarker3D(group, time, phase) {
  const hex = phase === 'active' ? MARKER_COLOR_ACTIVE : MARKER_COLOR_IDLE;
  markerBeamMaterial.color.setHex(hex);
  markerRingMaterial.color.setHex(hex);
  markerCoreMaterial.color.setHex(hex);
  markerGroundMaterial.color.setHex(hex);

  const pulse = 1 + Math.sin(time * 4) * 0.25;
  group.userData.ring.scale.setScalar(pulse);
  group.userData.ring.position.y = 2.6 + Math.sin(time * 2) * 0.2;
  group.userData.core.scale.setScalar(0.85 + Math.sin(time * 4) * 0.25);
}

const waypointDotGeometry = new THREE.SphereGeometry(1.1, 12, 10);
const waypointDotMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_ACTIVE,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Cheap translucent preview dot for one entry of world.mission.remainingWaypoints
// (checkpoint/boat missions only). Geometry and material are shared module-
// scope singletons per-file convention here, since several of these can be
// live at once - callers must NOT call .dispose() on an individual dot
// mesh's material when tearing one down (every dot mesh shares the same
// material instance); just remove the mesh from the scene.
export function buildWaypointDotMesh3D() {
  return new THREE.Mesh(waypointDotGeometry, waypointDotMaterial);
}
