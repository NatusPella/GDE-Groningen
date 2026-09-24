import { dist, closestPointOnSegment } from './util.js';
import { spawnVehicleOnRoad } from './vehicle.js';
import { setUserWaypoint } from './routing.js';
import { playMissionIntro, playMissionOutro, playMissionFailed } from './cinematics.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const TRIGGER_RADIUS = 4;
const RETRY_COOLDOWN = 5;
const FATBIKE_TOUCH_RADIUS = 1.5;

function resolveSpot(map, spawn, dx, dy, drivable = false) {
  const p = map.nearestRoadPoint(spawn.x + dx, spawn.y + dy, 400, drivable);
  return p || { x: spawn.x + dx, y: spawn.y + dy, road: null };
}

// Nearest point on a 'major'-tagged road only - used to snap ring-race
// waypoints onto the city's biggest through-roads instead of any street.
function nearestMajorRoadPoint(map, x, y, maxRadius = 1200) {
  let r = 60, best = null, bestDist2 = Infinity;
  while (!best && r <= maxRadius) {
    for (const road of map.roadsNear(x, y, r)) {
      if (road.cat !== 'major') continue;
      for (let i = 0; i < road.pts.length - 1; i++) {
        const cp = closestPointOnSegment(x, y, road.pts[i][0], road.pts[i][1], road.pts[i + 1][0], road.pts[i + 1][1]);
        if (cp.dist2 < bestDist2) { bestDist2 = cp.dist2; best = { x: cp.x, y: cp.y, road }; }
      }
    }
    r *= 2;
  }
  return best;
}

// Waypoints spread around an ellipse sized to the map's real bounds, each
// snapped to the nearest major road - "roughly a loop around the city" per
// ARCHITECTURE.md's ring-race spec, not a geometrically exact ring.
function ringWaypoints(map, count) {
  const [minx, miny, maxx, maxy] = map.meta.bounds;
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const rx = (maxx - minx) * 0.36, ry = (maxy - miny) * 0.36;
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const tx = cx + Math.cos(a) * rx, ty = cy + Math.sin(a) * ry;
    const hit = nearestMajorRoadPoint(map, tx, ty, 900) || map.nearestRoadPoint(tx, ty, 900, true);
    pts.push(hit || { x: tx, y: ty, road: null });
  }
  return pts;
}

// Random sample of real bar/restaurant/cafe spots from meta.horeca (see
// scripts/add_horeca.py), each snapped to the nearest street so the trigger
// point sits reachable on foot rather than inside a building footprint.
function horecaWaypoints(map, spawn, count) {
  const horeca = map.meta.horeca || [];
  if (horeca.length < count) {
    return [
      resolveSpot(map, spawn, 45, 30),
      resolveSpot(map, spawn, -45, 60),
      resolveSpot(map, spawn, 70, -40),
      resolveSpot(map, spawn, -30, -70),
    ].slice(0, count);
  }
  const pool = horeca.slice();
  const picked = [];
  for (let i = 0; i < count && pool.length; i++) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked.map((h) => map.nearestRoadPoint(h.x, h.y, 150) || { x: h.x, y: h.y, road: null });
}

// The Diepenring's water polygon in citymap.json passes near the world
// origin twice (both banks of the same canal strip); these four points were
// picked by hand off its northern arc (Noorderhaven-ish) - the closest
// ring-shaped water body to (0,0). See task notes for how they were found.
const DIEPENRING_WAYPOINTS = [
  { x: -271.6, y: -157.8 },
  { x: 11.6, y: -278.9 },
  { x: 178.7, y: -309.3 },
  { x: 336.0, y: -216.8 },
];

function buildDefs(world) {
  const { map, spawnPoint: sp } = world;
  return [
    {
      type: 'deliver',
      label: "Bommen Berend wil z'n bakkie",
      intro: ['Bommen Berend belde. Z\'n bakkie staat hier, hij wil \'m vóór de koffie terug.', 'Rij \'m heel naar hem toe. Heel, hè. Niet zoals de vorige keer.'],
      outro: 'Berend heeft z\'n bakkie terug. Hij zei zowaar \'dank je\'.',
      timeLimit: 90,
      reward: 250,
      start: resolveSpot(map, sp, 15, 12, true),
      dest: resolveSpot(map, sp, 130, -70),
    },
    {
      type: 'rampage',
      label: 'Chaos op de Grote Markt',
      intro: ['Iemand op Sikkom schreef dat de Grote Markt saai is geworden.', 'Laat maar zien dat dat niet klopt. Acht stuks, 45 seconden.'],
      outro: 'De Grote Markt is weer eens flink wakker geschud.',
      timeLimit: 45,
      reward: 300,
      targetKills: 8,
      start: resolveSpot(map, sp, -60, 25),
    },
    {
      type: 'checkpoint',
      label: 'KEI-weekrace door Grunn',
      intro: ['De KEI-week is begonnen en de eerstejaars denken dat ze snel zijn.', 'Laat ze je achterlichten zien. Alle checkpoints, niet treuzelen.'],
      outro: 'De eerstejaars zijn nog steeds aan het bijkomen.',
      timeLimit: 55,
      checkpointBonus: 8,
      reward: 350,
      start: resolveSpot(map, sp, -20, -55),
      waypoints: [
        resolveSpot(map, sp, -90, -90),
        resolveSpot(map, sp, -140, -20),
        resolveSpot(map, sp, -70, 40),
        resolveSpot(map, sp, -20, -55),
      ],
    },
    {
      type: 'deliver',
      label: 'Spoedklus voor Noorderzon',
      intro: ['Noorderzon mist een lading spullen en de voorstelling begint zo.', 'Pak die auto en rij door. Stoplichten zijn in Grunn meer een suggestie.'],
      outro: 'Het doek kan op. Noorderzon is gered.',
      timeLimit: 75,
      reward: 500,
      start: resolveSpot(map, sp, 40, -20, true),
      dest: resolveSpot(map, sp, -160, 110),
    },
    {
      type: 'checkpoint',
      label: 'Ringweg-race: eindelijk klaar?',
      intro: ['Ze zijn eindelijk klaar met de Zuidelijke Ringweg. Zeggen ze.', 'Eén rondje om de stad, vol gas. Kijken of \'t klopt.'],
      outro: 'De ringweg is getest. Hij ligt er nog. Grotendeels.',
      timeLimit: 70,
      checkpointBonus: 40,
      reward: 750,
      start: resolveSpot(map, sp, 70, -90, true),
      waypoints: ringWaypoints(map, 6),
    },
    {
      type: 'checkpoint',
      label: 'Kroegentocht: Poelestraat plat',
      intro: ['Kroegentocht! Vier kroegen, één avond, nul excuses.', 'En niet verdwalen tussen de Poelestraat en de Peperstraat.'],
      outro: 'Vier kroegen gehaald. Morgen wordt zwaar.',
      timeLimit: 100,
      checkpointBonus: 20,
      reward: 320,
      start: resolveSpot(map, sp, -100, 70),
      waypoints: horecaWaypoints(map, sp, 4),
    },
    {
      type: 'fatbike',
      label: 'Fatbike-terreur: blijf overeind',
      intro: ['De fatbikes zijn los en ze stoppen voor niemand.', 'Kom heelhuids aan de overkant. Twee keer geschept mag, meer niet.'],
      outro: 'Overeind gebleven tussen de fatbikes. Knap werk.',
      timeLimit: 35,
      reward: 275,
      maxHits: 2,
      start: resolveSpot(map, sp, 100, 80),
      dest: resolveSpot(map, sp, 150, 130),
    },
    {
      type: 'boat',
      label: 'Rondvaart met valse papieren',
      intro: ['Er is een rondvaartboot \'vrijgekomen\'. Vraag maar niet hoe.', 'Vaar het rondje over de Diepenring en doe alsof je gids bent.'],
      outro: 'Rondvaart voltooid. Niemand vroeg naar je papieren.',
      timeLimit: 90,
      checkpointBonus: 25,
      reward: 400,
      start: map.nearestRoadPoint(DIEPENRING_WAYPOINTS[0].x, DIEPENRING_WAYPOINTS[0].y, 300) || DIEPENRING_WAYPOINTS[0],
      waypoints: DIEPENRING_WAYPOINTS,
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
    run: null,
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
  chain.wpIndex = 0;
  const d = chain.defs[i];
  setUserWaypoint(d.start.x, d.start.y, d.label);
  syncPub(world);
  return true;
}

export function getMissionProgress() {
  if (!chain) return null;
  return { index: chain.index, completed: [...chain.completed] };
}

export function setMissionProgress(world, prog) {
  if (!chain || !prog) return;
  const n = chain.defs.length;
  chain.index = Number.isInteger(prog.index) && prog.index >= 0 && prog.index < n ? prog.index : 0;
  chain.completed = new Set((prog.completed || []).filter((i) => Number.isInteger(i) && i >= 0 && i < n));
  chain.phase = 'idle';
  chain.wpIndex = 0;
  chain.run = null;
  syncPub(world);
}

function fmtTime(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function runStats(world, def) {
  const r = chain.run;
  if (!r) return [];
  const stats = [['Tijd', fmtTime(r.elapsed)]];
  const kills = world.stats.kills - r.kills;
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
  if (st.phase === 'idle' || st.phase === 'cooldown') {
    pub.marker.x = def.start.x;
    pub.marker.y = def.start.y;
  } else if (def.type === 'deliver') {
    pub.marker.x = def.dest.x;
    pub.marker.y = def.dest.y;
  } else if (def.type === 'checkpoint' || def.type === 'boat') {
    const wp = def.waypoints[st.wpIndex];
    pub.marker.x = wp.x;
    pub.marker.y = wp.y;
  } else if (def.type === 'rampage') {
    pub.marker.x = def.start.x;
    pub.marker.y = def.start.y;
  } else if (def.type === 'fatbike') {
    pub.marker.x = def.dest.x;
    pub.marker.y = def.dest.y;
  }
  pub.distanceToMarker = dist(world.player.x, world.player.y, pub.marker.x, pub.marker.y);
  if (def.type === 'rampage' && st.phase === 'active') {
    pub.killProgress = world.stats.pedKills - st.killBaseline;
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
  // Mirrors the old 2D drawMissions()'s "remaining waypoints preview" gate
  // exactly ((type is checkpoint/boat) && phase==='active') so 3D code can
  // draw the same dots without reaching into chain/def (module-private).
  pub.remainingWaypoints =
    (def.type === 'checkpoint' || def.type === 'boat') && st.phase === 'active'
      ? def.waypoints.slice(st.wpIndex + 1).map((wp) => ({ x: wp.x, y: wp.y }))
      : [];
  world.mission = pub;
}

function succeed(world, def) {
  world.money += def.reward;
  world.stats.missionsDone++;
  world.addMessage(`${def.label} geklaard! +€${def.reward}`, 4);
  playMissionOutro(world, { reason: def.outro || def.label, reward: def.reward, stats: runStats(world, def) });
  chain.completed.add(chain.index);
  chain.run = null;
  chain.index = (chain.index + 1) % chain.defs.length;
  chain.phase = 'idle';
  chain.wpIndex = 0;
}

function fail(world, def, reason) {
  const pretty = reason ? reason[0].toUpperCase() + reason.slice(1) : def.label;
  playMissionFailed(world, { reason: pretty, stats: runStats(world, def) });
  endInFailure(world, `${def.label} mislukt${reason ? ' — ' + reason : ''}`);
}

function endInFailure(world, text) {
  world.addMessage(text, 3.5);
  chain.phase = 'cooldown';
  chain.cooldownTimer = RETRY_COOLDOWN;
  chain.wpIndex = 0;
  chain.run = null;
}

function startMission(world, def) {
  chain.phase = 'active';
  chain.timeLeft = def.timeLimit;
  chain.wpIndex = 0;
  chain.run = { elapsed: 0, kills: world.stats.kills, hp: world.health + world.armor, damage: 0 };
  if (def.type === 'rampage') {
    chain.killBaseline = world.stats.pedKills;
  } else if (def.type === 'deliver' && def.start.road) {
    // the car to steal: parked and waiting, not driving off as traffic
    const car = spawnVehicleOnRoad(world.map, def.start.road, false, Math.random, false, false, def.start);
    car.road = null;
    car.speed = 0;
    car.missionCar = true;
    world.vehicles.push(car);
  } else if (def.type === 'fatbike') {
    chain.fatbikeHits = 0;
    chain.fatbikeContact = new Set();
  }
  const who = speakerName(world);
  playMissionIntro(world, {
    kicker: `Missie ${chain.index + 1}/${chain.defs.length}`,
    title: `Missie: ${def.label}`,
    lines: (def.intro || []).map((text) => ({ speaker: who, text })),
    objective: def.dest || (def.waypoints && def.waypoints[0]) || def.start,
  });
}

// Only counts a hit once per fatbike per continuous touch, so lingering
// next to one for several frames doesn't burn through maxHits instantly.
function checkFatbikeHits(world, chain) {
  const p = world.player;
  const nowTouching = new Set();
  for (const v of world.vehicles) {
    if (!v.isBike || !v.model.fat || v.wrecked) continue;
    if (dist(p.x, p.y, v.x, v.y) < FATBIKE_TOUCH_RADIUS) {
      nowTouching.add(v.id);
      if (!chain.fatbikeContact.has(v.id)) {
        chain.fatbikeHits++;
        world.addMessage(`Geschept door een fatbike! (${chain.fatbikeHits}/${chain.defs[chain.index].maxHits})`, 2);
      }
    }
  }
  chain.fatbikeContact = nowTouching;
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
    if (dist(p.x, p.y, def.start.x, def.start.y) < TRIGGER_RADIUS) {
      startMission(world, def);
    }
    syncPub(world);
    return;
  }

  trackRun(dt, world);
  chain.timeLeft -= dt;
  if (chain.timeLeft <= 0) {
    fail(world, def, 'tijd op, sukkel');
    syncPub(world);
    return;
  }

  if (def.type === 'deliver') {
    if (p.inVehicle && dist(p.x, p.y, def.dest.x, def.dest.y) < TRIGGER_RADIUS + 2) {
      succeed(world, def);
    }
  } else if (def.type === 'rampage') {
    if (world.stats.pedKills - chain.killBaseline >= def.targetKills) {
      succeed(world, def);
    }
  } else if (def.type === 'checkpoint') {
    const wp = def.waypoints[chain.wpIndex];
    if (dist(p.x, p.y, wp.x, wp.y) < TRIGGER_RADIUS + 2) {
      chain.wpIndex++;
      chain.timeLeft = Math.min(def.timeLimit, chain.timeLeft + def.checkpointBonus);
      if (chain.wpIndex >= def.waypoints.length) {
        succeed(world, def);
      }
    }
  } else if (def.type === 'fatbike') {
    checkFatbikeHits(world, chain);
    if (chain.fatbikeHits > def.maxHits) {
      fail(world, def, 'geveld door de fatbikes, typisch Grunn');
      syncPub(world);
      return;
    }
    if (dist(p.x, p.y, def.dest.x, def.dest.y) < TRIGGER_RADIUS + 2) {
      succeed(world, def);
    }
  } else if (def.type === 'boat') {
    if (p.inVehicle && p.inVehicle.isBoat) {
      const wp = def.waypoints[chain.wpIndex];
      if (dist(p.x, p.y, wp.x, wp.y) < TRIGGER_RADIUS + 2) {
        chain.wpIndex++;
        chain.timeLeft = Math.min(def.timeLimit, chain.timeLeft + def.checkpointBonus);
        if (chain.wpIndex >= def.waypoints.length) {
          succeed(world, def);
        }
      }
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
