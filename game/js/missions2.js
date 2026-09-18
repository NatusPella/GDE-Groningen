import { dist, closestPointOnSegment } from './util2.js';
import { spawnVehicleOnRoad } from './vehicle2.js';
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
      label: 'Jat een auto en lever hem af',
      timeLimit: 90,
      reward: 250,
      start: resolveSpot(map, sp, 15, 12, true),
      dest: resolveSpot(map, sp, 130, -70),
    },
    {
      type: 'rampage',
      label: 'Rampage: maak 8 mensen af',
      timeLimit: 45,
      reward: 300,
      targetKills: 8,
      start: resolveSpot(map, sp, -60, 25),
    },
    {
      type: 'checkpoint',
      label: 'Checkpoint race',
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
      label: 'De grote klus: lever de auto snel af',
      timeLimit: 75,
      reward: 500,
      start: resolveSpot(map, sp, 40, -20, true),
      dest: resolveSpot(map, sp, -160, 110),
    },
    {
      type: 'checkpoint',
      label: 'Rondje Ring: race langs de ringweg',
      timeLimit: 70,
      checkpointBonus: 40,
      reward: 750,
      start: resolveSpot(map, sp, 70, -90, true),
      waypoints: ringWaypoints(map, 6),
    },
    {
      type: 'checkpoint',
      label: 'Horeca-tour: doe de kroegentocht',
      timeLimit: 100,
      checkpointBonus: 20,
      reward: 320,
      start: resolveSpot(map, sp, -100, 70),
      waypoints: horecaWaypoints(map, sp, 4),
    },
    {
      type: 'fatbike',
      label: 'Fatbike-gauntlet: ontwijk de fatbikes',
      timeLimit: 35,
      reward: 275,
      maxHits: 2,
      start: resolveSpot(map, sp, 100, 80),
      dest: resolveSpot(map, sp, 150, 130),
    },
    {
      type: 'boat',
      label: 'Bootje door de Diepenring',
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
    pub: { type: null, label: '', phase: 'idle', timeLeft: 0, index: 0, total: defs.length, marker: { x: 0, y: 0 }, remainingWaypoints: [] },
  };
  world.mission = chain.pub;
  syncPub(world);
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
  world.addMessage(`${def.label} voltooid! +€${def.reward}`, 4);
  chain.index = (chain.index + 1) % chain.defs.length;
  chain.phase = 'idle';
  chain.wpIndex = 0;
}

function fail(world, def, reason) {
  world.addMessage(`${def.label} mislukt${reason ? ' — ' + reason : ''}`, 3.5);
  chain.phase = 'cooldown';
  chain.cooldownTimer = RETRY_COOLDOWN;
  chain.wpIndex = 0;
}

function startMission(world, def) {
  chain.phase = 'active';
  chain.timeLeft = def.timeLimit;
  chain.wpIndex = 0;
  if (def.type === 'rampage') {
    chain.killBaseline = world.stats.pedKills;
  } else if (def.type === 'deliver' && def.start.road) {
    world.vehicles.push(spawnVehicleOnRoad(world.map, def.start.road, false, Math.random, false, false, def.start));
  } else if (def.type === 'fatbike') {
    chain.fatbikeHits = 0;
    chain.fatbikeContact = new Set();
  }
  world.addMessage(def.label, 3);
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
        world.addMessage(`Geraakt door een fatbike! (${chain.fatbikeHits}/${chain.defs[chain.index].maxHits})`, 2);
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

  chain.timeLeft -= dt;
  if (chain.timeLeft <= 0) {
    fail(world, def, 'tijd op');
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
      fail(world, def, 'te vaak een fatbike geraakt');
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

export function drawMissions(ctx, world) {
  const m = world.mission;
  if (!m) return;

  const pulse = 1 + Math.sin(world.time * 4) * 0.25;
  const color = m.phase === 'active' ? '#3fd0ff' : '#ffd23f';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.18;
  ctx.beginPath();
  ctx.arc(m.marker.x, m.marker.y, 1.4 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.marker.x, m.marker.y, 0.35, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();

  const p = world.player;
  const d = dist(p.x, p.y, m.marker.x, m.marker.y);
  if (d > TRIGGER_RADIUS + 3) {
    const angle = Math.atan2(m.marker.y - p.y, m.marker.x - p.x);
    const bob = 1.9 + Math.sin(world.time * 5) * 0.12;
    const ax = p.x + Math.cos(angle) * bob, ay = p.y + Math.sin(angle) * bob;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(0.45, 0);
    ctx.lineTo(-0.25, 0.32);
    ctx.lineTo(-0.1, 0);
    ctx.lineTo(-0.25, -0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.restore();

    if (d > 25) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '0.9px "Arial Narrow", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.translate(p.x + Math.cos(angle) * 2.6, p.y + Math.sin(angle) * 2.6);
      ctx.fillText(Math.round(d) + 'm', 0, 0);
      ctx.restore();
    }
  }

  if ((m.type === 'checkpoint' || m.type === 'boat') && m.phase === 'active') {
    const def = chain.defs[chain.index];
    ctx.save();
    ctx.fillStyle = 'rgba(63,208,255,0.35)';
    for (let i = chain.wpIndex + 1; i < def.waypoints.length; i++) {
      const wp = def.waypoints[i];
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- 3D representation ---------------------------------------------------
// Local origin at ground level (y=0) for both builders below; the integrator
// positions groups/meshes at (worldX, y, worldY) per the ARCHITECTURE.md
// mapping (three.x=world.x, three.z=world.y). Colors match the old 2D
// marker palette: cyan while a mission is active, yellow while idle/on
// cooldown (i.e. showing where to go to START the next mission).

export const MARKER_COLOR_ACTIVE = 0x3fd0ff;
export const MARKER_COLOR_IDLE = 0xffd23f;

const markerBeamMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_IDLE,
  transparent: true,
  opacity: 0.4,
  depthWrite: false,
});
const markerRingMaterial = new THREE.MeshBasicMaterial({ color: MARKER_COLOR_IDLE, transparent: true, opacity: 0.9 });
const markerCoreMaterial = new THREE.MeshBasicMaterial({ color: MARKER_COLOR_IDLE });

// One floating waypoint beacon: a translucent glow-beam with a ring and a
// pulsing core near the top. There is only ever one active mission, so the
// integrator builds a single instance of this and repositions it every
// frame - it does not need Map-based bookkeeping like the dots below.
export function buildMissionMarker3D() {
  const group = new THREE.Group();

  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8, 1, true), markerBeamMaterial);
  beam.position.y = 1.6;
  group.add(beam);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 20), markerRingMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.4;
  group.add(ring);

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), markerCoreMaterial);
  core.position.y = 3.05;
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

  const pulse = 1 + Math.sin(time * 4) * 0.25;
  group.userData.ring.scale.setScalar(pulse);
  group.userData.ring.position.y = 2.4 + Math.sin(time * 2) * 0.15;
  group.userData.core.scale.setScalar(0.8 + Math.sin(time * 4) * 0.25);
}

const waypointDotGeometry = new THREE.SphereGeometry(0.5, 10, 8);
const waypointDotMaterial = new THREE.MeshBasicMaterial({
  color: MARKER_COLOR_ACTIVE,
  transparent: true,
  opacity: 0.35,
  depthWrite: false,
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
