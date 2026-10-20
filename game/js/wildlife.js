import { dist, angleLerp, pointInPolygon, SeededRng, isInWater, WATER_Y } from './util.js';
import { waterPolyAt, waterNearby, BRIDGE_DRY } from './waterlevels.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { SkinBuilder, vcMaterial, composeMatrix, tubeGeometry, loftGeometry, markShared } from './pixelart3d.js';
import { setLeashHolder, setPeopleWeather } from './models3d_people.js';
import { resolveWalker } from './collision.js';
import { pushCircleOutOfVehicle, vehicleHitBody } from './vehicle.js';
import { splatterAnimal, GIB_SPEED } from './gore3d.js';
import { MODS } from './cheatmods.js';
import { buildingAt } from './tileplace.js';
import { onRoadway } from './wegvlak.js';
import { streekAt } from './regioleven.js';
import { wildlifeLimits, grazerPick, gansKans, fleeFrom, STREEK_MIX } from './dierenplan.js';
import { getSettings } from './settings.js';
import { dierVanKind, ONTDEK_M, SET_DIEREN } from './dierenregister.js';
import { recordUnique } from './achievements.js';

// Ambient trailer-parody wildlife: seagulls over the Diepenring,
// ducks and geese on the canals, pigeon flocks on the squares, the odd
// street cat, dogs out for a walk with pedestrians, and the occasional
// cow/sheep in Noorderplantsoen-style green. Pure atmosphere - no health,
// no combat; ground animals only get pushed around (groundContacts).
// Streamed around the player per kind.

const SPAWN_RADIUS = 70;
const DESPAWN_DIST = 150;
const MAINTAIN_INTERVAL = 2.5;
const BIAS_SEARCH_RADIUS = 100;
const CANAL_Y = WATER_Y;

const BASE_LIMITS = { seagull: 7, grazer: 3, duck: 6, pigeon: 14, cat: 2, dog: 3 };
const WATER_LIMITS = { reiger: 1, zeehond: 3, vis: 6 };   // #193: per streek geschaald met STREEK_MIX

const SEAGULL_SPEED_MIN = 3.4;
const SEAGULL_SPEED_MAX = 4.6;
const SEAGULL_TURN = 1.1;
const SEAGULL_WAYPOINT_MIN = 3, SEAGULL_WAYPOINT_MAX = 7;
const SEAGULL_WAYPOINT_RADIUS = 26;
const SEAGULL_ARRIVE_RADIUS = 3;
const SEAGULL_STAND_Y = 0.2;

const GRAZER_SPEED = 0.6;
const GRAZER_TURN = 3;
const GRAZER_HOME_RADIUS_MIN = 6, GRAZER_HOME_RADIUS_MAX = 13;
const GRAZER_PAUSE_MIN = 3, GRAZER_PAUSE_MAX = 8;
const GRAZER_ARRIVE_RADIUS = 1;

const PIGEON_SCARE_DIST = 6;
const PIGEON_STAND_Y = 0.1;

let maintainTimer = 0;

// (no animal picks a spot on a carriageway or in the middle of a junction: they stood in the traffic of the Emmaviaduct, #334)
function openGround(map, x, y) {
  return !buildingAt(map, x, y) && !isInWater(map, x, y) && !onRoadway(map, x, y, 0.4);
}

function randomOpenPointNear(map, x, y, rMin, rMax, rng = Math.random) {
  for (let i = 0; i < 10; i++) {
    const ang = rng() * Math.PI * 2, rad = rMin + rng() * (rMax - rMin);
    const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
    if (openGround(map, px, py)) return [px, py];
  }
  return null;
}

function playerSpeed(player) {
  if (player.inVehicle) return Math.abs(player.inVehicle.speed || 0);
  return Math.hypot(player.vx || 0, player.vy || 0);
}

function steer(a, tx, ty, turn, dt) {
  a.angle = angleLerp(a.angle, Math.atan2(ty - a.y, tx - a.x), Math.min(1, dt * turn));
  a.x += Math.cos(a.angle) * a.speed * dt;
  a.y += Math.sin(a.angle) * a.speed * dt;
  a.stride = (a.stride || 0) + a.speed * dt;
}

// --- spawning ----------------------------------------------------------------

function newSeagull(sx, sy, rng) {
  return {
    kind: 'seagull', x: sx, y: sy, z: 6 + rng() * 4,
    angle: rng() * Math.PI * 2 - Math.PI,
    speed: SEAGULL_SPEED_MIN + rng() * (SEAGULL_SPEED_MAX - SEAGULL_SPEED_MIN),
    wanderTarget: { x: sx, y: sy },
    waypointTimer: rng() * SEAGULL_WAYPOINT_MAX,
    bobSeed: rng() * Math.PI * 2,
    flapSeed: rng() * Math.PI * 2,
    state: 'fly', stateTimer: 10 + rng() * 25, bank: 0, cruise: 6 + rng() * 4,
  };
}

function newGrazer(kind, hx, hy, rng) {
  return {
    kind, x: hx, y: hy,
    angle: rng() * Math.PI * 2 - Math.PI,
    speed: 0,
    wanderTarget: { x: hx, y: hy },
    homeX: hx, homeY: hy,
    homeRadius: GRAZER_HOME_RADIUS_MIN + rng() * (GRAZER_HOME_RADIUS_MAX - GRAZER_HOME_RADIUS_MIN),
    waypointTimer: rng() * GRAZER_PAUSE_MAX,
    bobSeed: rng() * Math.PI * 2,
  };
}


// Random point near (px, py) inside a water/green polygon; the OSM polygons
// can span kilometres, so sample around the player instead of the polygon.
function layerPointNear(map, layer, px, py, rng, rMin, rMax) {
  for (let i = 0; i < 24; i++) {
    const ang = rng() * Math.PI * 2, rad = rMin + rng() * (rMax - rMin);
    const x = px + Math.cos(ang) * rad, y = py + Math.sin(ang) * rad;
    const poly = map[layer](x, y, 1).find((w) => pointInPolygon(x, y, w.pts));
    if (poly) return { x, y, poly };
  }
  return null;
}

// water by the water rule (waterlevels.js waterPolyAt): not under a bridge deck
function waterPointNear(map, px, py, rng, rMin = 8, rMax = 60) {
  for (let i = 0; i < 24; i++) {
    const ang = rng() * Math.PI * 2, rad = rMin + rng() * (rMax - rMin);
    const x = px + Math.cos(ang) * rad, y = py + Math.sin(ang) * rad;
    const poly = waterPolyAt(map, x, y, undefined, BRIDGE_DRY);
    if (poly) return { x, y, poly };
  }
  return null;
}

function spawnDucks(map, px, py, rng) {
  const spot = waterPointNear(map, px, py, rng);
  if (!spot) return [];
  const r = rng();
  const goose = r < 0.22, swan = r > 0.86;
  const out = [];
  for (let i = 0; i < 2; i++) {
    const x = spot.x + (rng() - 0.5) * 1.5, y = spot.y + (rng() - 0.5) * 1.5;
    if (!pointInPolygon(x, y, spot.poly.pts)) continue;
    out.push({
      kind: 'duck', variant: swan ? 'swan' : goose ? 'goose' : i === 0 ? 'drake' : 'hen',
      x, y, angle: rng() * Math.PI * 2, speed: 0, poly: spot.poly,
      wanderTarget: { x, y }, waypointTimer: rng() * 4, bobSeed: rng() * Math.PI * 2,
      state: 'swim', stateTimer: 4 + rng() * 8,
    });
  }
  return out;
}

// Reiger aan de waterkant, zeehonden en vissen in het water (#193). Per streek volgens STREEK_MIX,
// op de kwaliteit geschaald; de aantallen blijven klein (de totale budgetten staan in dierenplan.js).
function spawnWaterLife(map, player, streekId, count, quality, rng) {
  const mix = STREEK_MIX[streekId] || STREEK_MIX.stad;
  const q = quality === 'laag' ? 0.4 : quality === 'middel' ? 0.7 : 1;
  const out = [];
  const lim = (k) => Math.round(WATER_LIMITS[k] * Math.min(1.6, mix[k] || 0) * q);
  if (count.reiger < lim('reiger') && rng() < 0.25) {
    const spot = waterPointNear(map, player.x, player.y, rng, 12, SPAWN_RADIUS);
    const land = spot && randomOpenPointNear(map, spot.x, spot.y, 2, 7, rng);
    if (land) out.push({ kind: 'reiger', x: land[0], y: land[1], angle: rng() * Math.PI * 2, speed: 0, z: 0, state: 'stand', bobSeed: rng() * Math.PI * 2, wanderTarget: { x: land[0], y: land[1] }, waypointTimer: 2 + rng() * 6 });
  }
  if (count.zeehond < lim('zeehond') && rng() < 0.2) {
    const spot = waterPointNear(map, player.x, player.y, rng, 14, SPAWN_RADIUS);
    if (spot) {
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        const x = spot.x + (rng() - 0.5) * 4, y = spot.y + (rng() - 0.5) * 4;
        if (!pointInPolygon(x, y, spot.poly.pts)) continue;
        out.push({ kind: 'zeehond', x, y, angle: rng() * Math.PI * 2, speed: 0, poly: spot.poly, state: 'rust', bobSeed: rng() * Math.PI * 2, wanderTarget: { x, y }, waypointTimer: 3 + rng() * 6 });
      }
    }
  }
  if (count.vis < lim('vis') && rng() < 0.4) {
    const spot = waterPointNear(map, player.x, player.y, rng, 6, 30);
    if (spot) {
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const x = spot.x + (rng() - 0.5) * 3, y = spot.y + (rng() - 0.5) * 3;
        if (!pointInPolygon(x, y, spot.poly.pts)) continue;
        out.push({ kind: 'vis', x, y, angle: rng() * Math.PI * 2, speed: 0.4, poly: spot.poly, state: 'zwem', bobSeed: rng() * Math.PI * 2, wanderTarget: { x, y }, waypointTimer: rng() * 3 });
      }
    }
  }
  return out;
}

function spawnPigeonFlock(map, px, py, rng) {
  const roads = map.roadsNear(px, py, 55).filter((r) => r.cat === 'foot' && r.pts.length >= 2);
  const pool = roads.length ? roads : map.roadsNear(px, py, 45).filter((r) => r.pts.length >= 2);
  for (let tries = 0; tries < 6 && pool.length; tries++) {
    const road = pool[Math.floor(rng() * pool.length)];
    const i = Math.floor(rng() * (road.pts.length - 1));
    const a = road.pts[i], b = road.pts[i + 1], t = rng();
    const cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t;
    const d = dist(cx, cy, px, py);
    if (d < 12 || d > 60 || !openGround(map, cx, cy)) continue;
    const flock = { id: rng() };
    const n = 4 + Math.floor(rng() * 4);
    const out = [];
    for (let k = 0; k < n; k++) {
      const x = cx + (rng() - 0.5) * 3, y = cy + (rng() - 0.5) * 3;
      if (!openGround(map, x, y)) continue;
      out.push({
        kind: 'pigeon', x, y, z: PIGEON_STAND_Y, angle: rng() * Math.PI * 2, speed: 0, flock,
        homeX: cx, homeY: cy, wanderTarget: { x, y }, waypointTimer: rng() * 3,
        bobSeed: rng() * Math.PI * 2, state: 'ground', peck: 0,
      });
    }
    return out;
  }
  return [];
}

function spawnCat(map, px, py, rng) {
  const blds = map.buildingsNear(px, py, 45);
  for (let tries = 0; tries < 8 && blds.length; tries++) {
    const bld = blds[Math.floor(rng() * blds.length)];
    const pts = bld.pts;
    const i = Math.floor(rng() * (pts.length - 1));
    const a = pts[i], b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 3) continue;
    const t = 0.2 + rng() * 0.6;
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    const mx = a[0] + (b[0] - a[0]) * t, my = a[1] + (b[1] - a[1]) * t;
    if (buildingAt(map, mx + nx * 0.5, my + ny * 0.5)) { nx = -nx; ny = -ny; }
    const x = mx + nx * 0.35, y = my + ny * 0.35;
    const d = dist(x, y, px, py);
    if (d < 12 || d > 55 || !openGround(map, x, y)) continue;
    return [{
      kind: 'cat', variant: Math.floor(rng() * 4), x, y, angle: Math.atan2(ny, nx), speed: 0,
      wanderTarget: { x, y }, state: 'sit', stateTimer: 6 + rng() * 14, bobSeed: rng() * Math.PI * 2,
    }];
  }
  return [];
}

function spawnDog(world, rng) {
  const { player, pedestrians } = world;
  if (!pedestrians) return [];
  const taken = new Set(world.wildlife.filter((a) => a.kind === 'dog').map((a) => a.owner));
  const candidates = pedestrians.filter((p) => !taken.has(p) && !p.isCop && !p.pose && p.state === 'wander' && !p.scene
    && dist(p.x, p.y, player.x, player.y) > 10 && dist(p.x, p.y, player.x, player.y) < 60);
  if (!candidates.length) return [];
  const owner = candidates[Math.floor(rng() * candidates.length)];
  setLeashHolder(owner._lookSeed, true);
  return [{
    kind: 'dog', breed: Math.floor(rng() * 4), color: rng(), owner,
    x: owner.x - Math.cos(owner.angle) * 0.8, y: owner.y - Math.sin(owner.angle) * 0.8,
    angle: owner.angle, speed: 0, state: 'walk', stateTimer: 0, bobSeed: rng() * Math.PI * 2,
    sideOffset: rng() < 0.5 ? -0.6 : 0.6,
  }];
}

export function initWildlife(world) {
  world.wildlife = [];
}

function releaseAnimal(a) {
  if (a.kind === 'dog' && a.owner) setLeashHolder(a.owner._lookSeed, false);
}

function maintain(world) {
  const list = world.wildlife;
  const { map, player } = world;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (a.gone || dist(a.x, a.y, player.x, player.y) > DESPAWN_DIST) {
      releaseAnimal(a);
      list.splice(i, 1);
    }
  }
  const streek = streekAt(player.x, player.y);
  const streekId = streek ? streek.id : 'stad';
  const LIMITS = wildlifeLimits(streekId, getSettings().quality, BASE_LIMITS);   // #193
  const count = { seagull: 0, grazer: 0, duck: 0, pigeon: 0, cat: 0, dog: 0, reiger: 0, zeehond: 0, vis: 0 };
  for (const a of list) count[a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'gans' ? 'grazer' : a.kind]++;
  const rng = Math.random;
  const waterClose = waterNearby(map, player.x, player.y, BIAS_SEARCH_RADIUS);
  const greenPolys = map.greenNear(player.x, player.y, BIAS_SEARCH_RADIUS);

  for (let n = count.seagull; n < LIMITS.seagull; n++) {
    const spot = waterClose ? waterPointNear(map, player.x, player.y, rng, 10, SPAWN_RADIUS) : null;
    if (spot) list.push(newSeagull(spot.x, spot.y, rng));
    else if (rng() < 0.3) {
      const ang = rng() * Math.PI * 2, rad = 15 + rng() * (SPAWN_RADIUS - 15);
      list.push(newSeagull(player.x + Math.cos(ang) * rad, player.y + Math.sin(ang) * rad, rng));
    }
  }
  const green = greenPolys.length && count.grazer < LIMITS.grazer && rng() < 0.3 ? layerPointNear(map, 'greenNear', player.x, player.y, rng, 15, SPAWN_RADIUS) : null;
  if (green && openGround(map, green.x, green.y)) {
    const hx = green.x, hy = green.y;
    if (count.grazer + 3 <= LIMITS.grazer && rng() < gansKans(streekId)) {   // #193: ganzen op het land
      const n = 3 + Math.floor(rng() * 3);
      for (let k = 0; k < n && count.grazer + k < LIMITS.grazer; k++) { const gx = hx + (rng() - 0.5) * 3, gy = hy + (rng() - 0.5) * 3; if (openGround(map, gx, gy)) list.push(newGrazer('gans', gx, gy, rng)); }
      return;
    }
    const kind = grazerPick(streekId, rng());
    const herd = kind === 'sheep' ? 1 + Math.floor(rng() * 2) : 1;
    for (let k = 0; k < herd && count.grazer + k < LIMITS.grazer; k++) if (openGround(map, hx + k * 1.5, hy + k * 0.8)) list.push(newGrazer(kind, hx + k * 1.5, hy + k * 0.8, rng));
  }
  if (waterClose) list.push(...spawnWaterLife(map, player, streekId, count, getSettings().quality, rng));
  if (count.duck < LIMITS.duck - 1 && waterClose) list.push(...spawnDucks(map, player.x, player.y, rng));
  if (count.pigeon < LIMITS.pigeon * MODS.pigeons - 5) list.push(...spawnPigeonFlock(map, player.x, player.y, rng));
  if (count.cat < LIMITS.cat && rng() < 0.35) list.push(...spawnCat(map, player.x, player.y, rng));
  if (count.dog < LIMITS.dog && rng() < 0.5) list.push(...spawnDog(world, rng));
}

// --- behaviour ---------------------------------------------------------------

function updateSeagull(a, dt, world) {
  const { map, player } = world;
  const scared = dist(a.x, a.y, player.x, player.y) < 4 || (dist(a.x, a.y, player.x, player.y) < 9 && playerSpeed(player) > 4);
  a.stateTimer -= dt;
  const prevAngle = a.angle;
  if (a.state === 'fly') {
    if (dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < SEAGULL_ARRIVE_RADIUS) {
      a.waypointTimer -= dt;
      if (a.waypointTimer <= 0) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 10 + Math.random() * SEAGULL_WAYPOINT_RADIUS;
        a.wanderTarget = { x: a.x + Math.cos(ang) * rad, y: a.y + Math.sin(ang) * rad };
        a.waypointTimer = SEAGULL_WAYPOINT_MIN + Math.random() * (SEAGULL_WAYPOINT_MAX - SEAGULL_WAYPOINT_MIN);
      }
    }
    steer(a, a.wanderTarget.x, a.wanderTarget.y, SEAGULL_TURN, dt);
    a.z += (a.cruise + Math.sin(world.time * 0.5 + a.flapSeed) * 1.2 - a.z) * Math.min(1, dt * 0.8);
    if (a.stateTimer <= 0) {
      const spot = randomOpenPointNear(map, a.x, a.y, 6, 16);
      if (spot && dist(spot[0], spot[1], player.x, player.y) > 8) {
        a.state = 'land';
        a.wanderTarget = { x: spot[0], y: spot[1] };
      } else a.stateTimer = 5;
    }
  } else if (a.state === 'land') {
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = Math.max(1.2, Math.min(a.speed, d * 0.6 + 1));
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 2.5, dt);
    a.z += (SEAGULL_STAND_Y + Math.min(8, d * 0.5) - a.z) * Math.min(1, dt * 1.6);
    if (d < 0.6 || a.z < SEAGULL_STAND_Y + 0.08) {
      a.state = 'ground';
      a.z = SEAGULL_STAND_Y;
      a.speed = 0;
      a.stateTimer = 6 + Math.random() * 12;
      a.waypointTimer = 1 + Math.random() * 3;
    }
    if (scared) takeOff(a);
  } else if (a.state === 'ground') {
    a.z = SEAGULL_STAND_Y;
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      const spot = randomOpenPointNear(map, a.x, a.y, 0.5, 2.5);
      if (spot) a.wanderTarget = { x: spot[0], y: spot[1] };
      a.waypointTimer = 2 + Math.random() * 4;
    }
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = d > 0.2 ? 0.45 : 0;
    if (a.speed) steer(a, a.wanderTarget.x, a.wanderTarget.y, 4, dt);
    if (a.stateTimer <= 0 || scared) takeOff(a);
  }
  const turn = ((a.angle - prevAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  a.bank += ((a.state === 'ground' ? 0 : Math.max(-0.6, Math.min(0.6, turn / Math.max(dt, 1e-3) * 0.5))) - a.bank) * Math.min(1, dt * 3);
}

function takeOff(a) {
  a.state = 'fly';
  a.speed = SEAGULL_SPEED_MIN + Math.random() * (SEAGULL_SPEED_MAX - SEAGULL_SPEED_MIN);
  a.stateTimer = 15 + Math.random() * 25;
  a.takeoffAt = performance.now() / 1000;
  const ang = Math.random() * Math.PI * 2;
  a.wanderTarget = { x: a.x + Math.cos(ang) * 25, y: a.y + Math.sin(ang) * 25 };
}

// Wat de dieren zien aankomen: de speler te voet of een voertuig (dierenplan.fleeFrom).
function moverOf(pl) {
  return pl.inVehicle ? { x: pl.x, y: pl.y, speed: Math.abs(pl.inVehicle.speed || 0), kind: 'voertuig' } : { x: pl.x, y: pl.y, speed: playerSpeed(pl), kind: 'speler' };
}

// Koe en schaap: stappen weg van een speler of voertuig dat te dichtbij komt, geen paniek.
export function updateHerd(a, dt, world) {
  if (!(a.fleeT > 0)) {
    const f = fleeFrom(a.kind === 'cow' ? 'koe' : 'schaap', a.x, a.y, moverOf(world.player));
    if (f) { a.fleeT = 2.5; a.wanderTarget = { x: a.x + f.ux * 12, y: a.y + f.uy * 12 }; a.fleeSpeed = f.speed; }
  }
  if (a.fleeT > 0) {
    a.fleeT -= dt;
    a.speed = a.fleeSpeed || 2;
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 4, dt);
    return;
  }
  updateGrazer(a, dt, world.map);
}

// Reiger: staat roerloos aan de waterkant; schrikt hij, dan vliegt hij weg en is hij na een tijd uit beeld.
function updateReiger(a, dt, world) {
  if (a.state === 'stand') {
    const f = fleeFrom('reiger', a.x, a.y, moverOf(world.player));
    if (f) {
      a.state = 'fly'; a.flyT = 0; a.angle = Math.atan2(f.uy, f.ux) + (Math.random() - 0.5) * 0.6; a.speed = f.speed + 1.5;
      return;
    }
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) { a.waypointTimer = 4 + Math.random() * 8; a.angle += (Math.random() - 0.5) * 1.2; }
    a.speed = 0;
    a.z = 0;
    return;
  }
  a.flyT += dt;
  a.x += Math.cos(a.angle) * a.speed * dt;
  a.y += Math.sin(a.angle) * a.speed * dt;
  a.z = Math.min(8, a.flyT * 2.5);
  if (a.flyT > 7) a.gone = true;
}

// Zeehond: rust in het water; schrikt hij, dan duikt hij weg (een tijd onzichtbaar, daarna weg).
function updateZeehond(a, dt, world) {
  if (a.state === 'duik') { a.diveT += dt; if (a.diveT > 2.5) a.gone = true; return; }
  const f = fleeFrom('zeehond', a.x, a.y, moverOf(world.player));
  if (f) { a.state = 'duik'; a.diveT = 0; a.speed = 0; return; }
  a.waypointTimer -= dt;
  if (a.waypointTimer <= 0) {
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
      const tx = a.x + Math.cos(ang) * r, ty = a.y + Math.sin(ang) * r;
      if (pointInPolygon(tx, ty, a.poly.pts)) { a.wanderTarget = { x: tx, y: ty }; break; }
    }
    a.waypointTimer = 5 + Math.random() * 10;
  }
  const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
  a.speed = d > 0.4 ? 0.3 : 0;
  if (a.speed) {
    const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
    if (pointInPolygon(nx, ny, a.poly.pts)) steer(a, a.wanderTarget.x, a.wanderTarget.y, 1.5, dt); else a.waypointTimer = 0;
  }
}

// Vis: zwemt rustig rond onder het oppervlak en schiet weg voor wie te dichtbij komt.
function updateVis(a, dt, world) {
  const f = fleeFrom('vis', a.x, a.y, moverOf(world.player));
  if (f) {
    a.wanderTarget = { x: a.x + f.ux * 6, y: a.y + f.uy * 6 };
    a.speed = f.speed;
    a.waypointTimer = 1.2;
  } else {
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2, r = 1 + Math.random() * 4;
        const tx = a.x + Math.cos(ang) * r, ty = a.y + Math.sin(ang) * r;
        if (pointInPolygon(tx, ty, a.poly.pts)) { a.wanderTarget = { x: tx, y: ty }; break; }
      }
      a.waypointTimer = 2 + Math.random() * 4;
      a.speed = 0.3 + Math.random() * 0.4;
    }
  }
  const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
  if (pointInPolygon(nx, ny, a.poly.pts)) steer(a, a.wanderTarget.x, a.wanderTarget.y, 5, dt);
  else a.waypointTimer = 0;
}

// Gans op het land: loopt rustig rond, rent weg (geen vlucht) als de speler of een voertuig te dichtbij komt.
function updateGans(a, dt, world) {
  const pl = world.player;
  if (!(a.fleeT > 0) && dist(a.x, a.y, pl.x, pl.y) < (pl.inVehicle ? 12 : 5) && (pl.inVehicle || playerSpeed(pl) > 1)) scareOff(a, world, pl.x, pl.y);
  if (a.fleeT > 0) {
    a.fleeT -= dt;
    a.speed = 3.2;
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 6, dt);
    return;
  }
  updateGrazer(a, dt, world.map);
}

function updateGrazer(a, dt, map) {
  if (dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < GRAZER_ARRIVE_RADIUS) {
    a.speed = 0;
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.random() * a.homeRadius;
      const tx = a.homeX + Math.cos(ang) * rad, ty = a.homeY + Math.sin(ang) * rad;
      a.wanderTarget = !map || openGround(map, tx, ty) ? { x: tx, y: ty } : { x: a.homeX, y: a.homeY };
      a.waypointTimer = GRAZER_PAUSE_MIN + Math.random() * (GRAZER_PAUSE_MAX - GRAZER_PAUSE_MIN);
      a.speed = GRAZER_SPEED * (0.7 + Math.random() * 0.5);
    }
    return;
  }
  steer(a, a.wanderTarget.x, a.wanderTarget.y, GRAZER_TURN, dt);
}

function updateDuck(a, dt) {
  a.stateTimer -= dt;
  const poly = a.poly;
  if (a.state === 'swim') {
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0 || dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < 0.4) {
      for (let i = 0; i < 5; i++) {
        const ang = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 6;
        const tx = a.x + Math.cos(ang) * r, ty = a.y + Math.sin(ang) * r;
        if (pointInPolygon(tx, ty, poly.pts)) { a.wanderTarget = { x: tx, y: ty }; break; }
      }
      a.waypointTimer = 3 + Math.random() * 6;
    }
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = d > 0.3 ? (a.variant === 'goose' || a.variant === 'swan' ? 0.5 : 0.35) : 0;
    if (a.speed) {
      const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
      if (pointInPolygon(nx, ny, poly.pts)) steer(a, a.wanderTarget.x, a.wanderTarget.y, 2, dt);
      else a.waypointTimer = 0;
    }
    if (a.stateTimer <= 0) {
      const r = Math.random();
      a.state = r < 0.55 ? 'dabble' : a.variant === 'goose' || a.variant === 'swan' ? 'preen' : r < 0.8 ? 'dive' : 'preen';
      a.stateTimer = a.state === 'dive' ? 2.2 + Math.random() * 1.5 : 1.8 + Math.random() * 1.6;
      a.speed = 0;
    }
  } else {
    if (a.state === 'dive') {
      const nx = a.x + Math.cos(a.angle) * 0.5 * dt, ny = a.y + Math.sin(a.angle) * 0.5 * dt;
      if (pointInPolygon(nx, ny, poly.pts)) { a.x = nx; a.y = ny; }
    }
    if (a.stateTimer <= 0) {
      a.state = 'swim';
      a.stateTimer = 5 + Math.random() * 10;
    }
  }
  a.stateAge = a.state === a.prevState ? (a.stateAge || 0) + dt : 0;
  a.prevState = a.state;
}

function updatePigeon(a, dt, world) {
  const { player, map } = world;
  const f = a.flock;
  if (a.state === 'ground') {
    const pd = dist(a.x, a.y, player.x, player.y);
    if (pd < 2.2 || (pd < PIGEON_SCARE_DIST && playerSpeed(player) > 3.5)) f.scaredAt = world.time;
    if (f.scaredAt !== undefined && world.time - f.scaredAt < 3 && !(a.fledAt >= f.scaredAt)) {
      a.fledAt = world.time;
      a.state = 'fly';
      const away = Math.atan2(a.y - player.y, a.x - player.x) + (Math.random() - 0.5) * 1.4;
      a.angle = away;
      a.speed = 5 + Math.random() * 2.5;
      a.vz = 3 + Math.random() * 1.5;
      a.cruise = 5 + Math.random() * 5;
      a.stateTimer = 4 + Math.random() * 4;
      a.wanderTarget = { x: a.x + Math.cos(away) * 40, y: a.y + Math.sin(away) * 40 };
      return;
    }
    a.waypointTimer -= dt;
    if (a.waypointTimer <= 0) {
      const ang = Math.random() * Math.PI * 2, r = Math.random() * 2.5;
      const tx = a.homeX + Math.cos(ang) * r, ty = a.homeY + Math.sin(ang) * r;
      if (openGround(map, tx, ty)) a.wanderTarget = { x: tx, y: ty };
      a.waypointTimer = 1 + Math.random() * 3;
    }
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = d > 0.15 ? 0.35 : 0;
    if (a.speed) steer(a, a.wanderTarget.x, a.wanderTarget.y, 6, dt);
    a.peck = a.speed ? 0 : Math.max(0, Math.sin(world.time * 5 + a.bobSeed * 3));
    a.z = PIGEON_STAND_Y;
  } else if (a.state === 'fly') {
    a.stateTimer -= dt;
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 1.5, dt);
    a.z += (a.cruise - a.z) * Math.min(1, dt * 1.2);
    if (a.stateTimer <= 0) {
      const spot = randomOpenPointNear(map, a.x, a.y, 3, 10);
      if (spot) {
        a.state = 'land';
        a.wanderTarget = { x: spot[0], y: spot[1] };
      } else a.stateTimer = 3;
    }
  } else if (a.state === 'land') {
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = Math.max(1, Math.min(a.speed, d + 0.8));
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 3, dt);
    a.z += (PIGEON_STAND_Y + Math.min(6, d * 0.6) - a.z) * Math.min(1, dt * 2);
    if (d < 0.4 || a.z < PIGEON_STAND_Y + 0.05) {
      a.state = 'ground';
      a.z = PIGEON_STAND_Y;
      a.speed = 0;
      a.homeX = a.x;
      a.homeY = a.y;
      a.wanderTarget = { x: a.x, y: a.y };
    }
  }
}

function updateCat(a, dt, world) {
  const { player, map } = world;
  a.stateTimer -= dt;
  const pd = dist(a.x, a.y, player.x, player.y);
  if (a.state !== 'flee' && (pd < 2 || (pd < 6 && playerSpeed(player) > 4))) {
    a.state = 'flee';
    a.stateTimer = 2.5;
    const away = Math.atan2(a.y - player.y, a.x - player.x);
    a.wanderTarget = { x: a.x + Math.cos(away) * 12, y: a.y + Math.sin(away) * 12 };
  }
  if (a.state === 'sit' || a.state === 'groom') {
    a.speed = 0;
    if (a.stateTimer <= 0) {
      const r = Math.random();
      if (r < 0.3) { a.state = a.state === 'sit' ? 'groom' : 'sit'; a.stateTimer = 3 + Math.random() * 6; }
      else {
        const spot = randomOpenPointNear(map, a.x, a.y, 5, 16);
        if (spot) { a.state = 'walk'; a.wanderTarget = { x: spot[0], y: spot[1] }; a.stateTimer = 20; } else a.stateTimer = 4;
      }
    }
  } else {
    const d = dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y);
    a.speed = a.state === 'flee' ? 5 : 0.9;
    const nx = a.x + Math.cos(a.angle) * a.speed * dt, ny = a.y + Math.sin(a.angle) * a.speed * dt;
    if (!openGround(map, nx, ny)) { a.state = 'sit'; a.stateTimer = 4 + Math.random() * 6; a.speed = 0; return; }
    steer(a, a.wanderTarget.x, a.wanderTarget.y, a.state === 'flee' ? 8 : 4, dt);
    if (d < 0.5 || a.stateTimer <= 0) { a.state = 'sit'; a.stateTimer = 6 + Math.random() * 12; a.speed = 0; }
  }
}

function updateDog(a, dt, world) {
  const o = a.owner;
  const ownerGone = !o || o.state === 'dead' || !world.pedestrians.includes(o);
  if (ownerGone && a.state !== 'stray') {
    if (o) setLeashHolder(o._lookSeed, false);
    a.state = 'stray';
    a.stateTimer = 8;
    const ang = Math.random() * Math.PI * 2;
    a.wanderTarget = { x: a.x + Math.cos(ang) * 30, y: a.y + Math.sin(ang) * 30 };
  }
  if (a.state === 'stray') {
    a.speed = 3.5;
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 4, dt);
    a.stateTimer -= dt;
    if (a.stateTimer <= 0) a.gone = true;
    return;
  }
  const oc = Math.cos(o.angle), os = Math.sin(o.angle);
  const ahead = o.speed > 0.2 ? 0.7 : 0.2;
  const tx = o.x + oc * ahead - os * a.sideOffset, ty = o.y + os * ahead + oc * a.sideOffset;
  const d = dist(a.x, a.y, tx, ty);
  a.sniff = (a.sniff || 0) - dt;
  if (a.sniff <= 0 && Math.random() < dt * 0.08) a.sniff = 1.5 + Math.random() * 2;
  const want = a.sniff > 0 && d < 1.6 ? 0 : Math.min(4.5, (o.speed || 0) + Math.max(0, d - 0.2) * 1.5);
  a.speed += (want - a.speed) * Math.min(1, dt * 5);
  if (d > 0.15 && a.speed > 0.05) steer(a, tx, ty, 6, dt);
  const ld = dist(a.x, a.y, o.x, o.y);
  if (ld > 1.9) {
    a.x = o.x + (a.x - o.x) * 1.9 / ld;
    a.y = o.y + (a.y - o.y) * 1.9 / ld;
  }
  if (a.speed < 0.1 && a.sniff <= 0) a.angle = angleLerp(a.angle, o.angle, Math.min(1, dt * 2));
}

// Dierenboek (#193): een dier dat je van dichtbij ziet, schrijf je op (eenmalig per soort, met een kort bericht).
let ontdekT = 0;
export function ontdekDieren(world, dt, extra = null) {
  ontdekT -= dt;
  if (ontdekT > 0) return;
  ontdekT = 0.5;
  const p = world.player;
  for (const list of [world.wildlife, extra]) {
    for (const a of list || []) {
      if (!a || a.dead || typeof a.x !== 'number' || Math.abs(a.x - p.x) > ONTDEK_M || Math.abs(a.y - p.y) > ONTDEK_M) continue;
      const d = dierVanKind(a.kind, a.variant);
      if (d && recordUnique(world, SET_DIEREN, d.id)) world.addMessage(`Dierenboek: ${d.naam}`, 3);
    }
  }
}

export function updateWildlife(dt, world) {
  if (!world.wildlife) world.wildlife = [];
  const list = world.wildlife;
  ontdekDieren(world, dt, world.countryAudible);
  setPeopleWeather(world.weather ? world.weather.intensity : 0);
  maintainTimer -= dt;
  if (maintainTimer <= 0) {
    maintainTimer = MAINTAIN_INTERVAL;
    maintain(world);
  }
  for (const a of list) {
    if (a.dead) {
      if (world.time - a.deadAt > CARCASS_S) a.gone = true;
      continue;
    }
    switch (a.kind) {
      case 'seagull': updateSeagull(a, dt, world); break;
      case 'duck': updateDuck(a, dt); break;
      case 'pigeon': updatePigeon(a, dt, world); break;
      case 'cat': updateCat(a, dt, world); break;
      case 'dog': updateDog(a, dt, world); break;
      case 'gans': updateGans(a, dt, world); break;
      case 'reiger': updateReiger(a, dt, world); break;
      case 'zeehond': updateZeehond(a, dt, world); break;
      case 'vis': updateVis(a, dt, world); break;
      default: updateHerd(a, dt, world);
    }
    keepOffRoad(a, dt, world);
    groundContacts(a, world);
  }
}

// A ground animal that ends up on a carriageway or a junction anyway (a flock landing, a flight from a car, a shove) leaves:
// no animal stands in the traffic (#334). Looked at a few times a second.
const OFF_ROAD = new Set(['cat', 'pigeon', 'cow', 'sheep', 'gans']);
function keepOffRoad(a, dt, world) {
  if (!OFF_ROAD.has(a.kind) || (a.kind === 'pigeon' && a.state !== 'ground')) return;
  a.roadT = (a.roadT || 0) - dt;
  if (a.roadT > 0) return;
  a.roadT = 0.3 + Math.random() * 0.2;
  if (onRoadway(world.map, a.x, a.y, 0.1)) a.gone = true;
}

// Animals on the ground are bodies like any walker: walls and posts stop
// them, cars shove them aside (and scare them off), the player bumps them.
const GROUND_RADIUS = { grazer: 0.5, gans: 0.22, cat: 0.2, dog: 0.25, pigeon: 0.1, seagull: 0.15 };
function groundContacts(a, world) {
  if (a.kind === 'duck' || a.kind === 'vis' || a.kind === 'zeehond' || a.gone) return;
  if ((a.kind === 'pigeon' || a.kind === 'seagull' || a.kind === 'reiger') && a.state !== 'ground' && a.state !== 'stand') return;
  const r = GROUND_RADIUS[a.kind] || 0.3;
  let moved = a.speed > 0;
  for (const v of world.vehicles) {
    if (v.isBoat || v.sinking || Math.abs(v.x - a.x) > v.halfLen + 1 || Math.abs(v.y - a.y) > v.halfLen + 1) continue;
    const push = pushCircleOutOfVehicle(a.x, a.y, r, v);
    if (!push) continue;
    // birds are gore3d's poofBirds; everything else on four legs goes under
    if (a.kind !== 'pigeon' && a.kind !== 'seagull' && a.kind !== 'reiger' && runOverAnimal(world, a, v)) return;
    a.x = push.x; a.y = push.y;
    moved = true;
    if (Math.abs(v.speed) > 1) scareOff(a, world, v.x, v.y);
  }
  const p = world.player;
  if (!p.inVehicle && !p.water) {
    const dx = a.x - p.x, dy = a.y - p.y, min = r + (p.radius || 0.35), d2 = dx * dx + dy * dy;
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      a.x = p.x + dx / d * min; a.y = p.y + dy / d * min;
      moved = true;
    }
  }
  if (moved) [a.x, a.y] = resolveWalker(a.x, a.y, r, world.map, 0, 0, NO_KICK);
}
const NO_KICK = { kick: false };

// --- run over -------------------------------------------------------------------
// keep: fraction of the car's speed left after the hit (a cow stops you, a
// cat barely registers), dmg: damage to the car, size: body length for the
// gore, burst: small enough to come apart (at GIB_SPEED sheep and dogs too).
const RUN_OVER_SPEED = 4.5;
const CARCASS_S = 45;
const RUN_OVER = {
  cow: { keep: 0.42, dmg: 22, size: 1.5, burst: false },
  horse: { keep: 0.4, dmg: 24, size: 1.5, burst: false },
  sheep: { keep: 0.72, dmg: 6, size: 0.9, burst: false, gibFast: true },
  goose: { keep: 0.94, dmg: 0, size: 0.4, burst: true },
  duck: { keep: 0.97, dmg: 0, size: 0.3, burst: true },
  dog: { keep: 0.86, dmg: 2, size: 0.7, burst: false, gibFast: true },
  cat: { keep: 0.93, dmg: 0, size: 0.4, burst: true },
};
const FUR = {
  cow: [0x1c1c1c, 0xf2f0ea], cowred: [0x7a3a22, 0xf2f0ea], sheep: [0xe8e2d4, 0xd8d0c0], horse: [0x6b3f22, 0x1f1a17],
  goose: [0xd8d4ca, 0x8a8a86], duck: [0x7a5b3c, 0x2f6b3a], dog: [0x6b4a2a, 0x2a2a2a], cat: [0x6b5a48, 0xd08a3a],
};

// A car going faster than walking pace through an animal kills it: blood
// (gore setting permitting), a carcass lying on its side or nothing left of
// the small ones, and heavy animals take a lot of speed out of the car.
// Shared with countryside.js. Returns true when the animal died.
export function runOverAnimal(world, a, v) {
  const spec = RUN_OVER[a.kind];
  if (!spec || a.dead || a.gone || v.isBike || v.isScooter || v.isBoat) return false;
  const sp = v.speed, abs = Math.abs(sp);
  if (abs < RUN_OVER_SPEED) return false;
  const vx = Math.cos(v.angle) * sp, vy = Math.sin(v.angle) * sp;
  const size = spec.size * (a.size || 1);
  const burst = spec.burst || (spec.gibFast && abs > GIB_SPEED);
  vehicleHitBody(v, a.x, a.y, spec.keep + (1 - spec.keep) * (1 - Math.min(1, (a.size || 1))) * 0.5, spec.dmg * (a.size || 1), world);
  const cols = FUR[a.kind === 'cow' && a.variant === 'red' ? 'cowred' : a.kind];
  const gibbed = splatterAnimal(world, a.x, a.y, { vx: vx * 0.6, vy: vy * 0.6, size, cols, vehicle: v, burst }) && burst;
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push({ kind: 'animal_hit', x: a.x, y: a.y, strength: Math.min(1, size * 0.6) });
  releaseAnimal(a);
  a.owner = null;
  if (gibbed) { a.gone = true; return true; }
  a.dead = true;
  a.deadAt = world.time;
  a.speed = 0;
  a.flee = 0;
  a.deadSide = Math.random() < 0.5 ? -1 : 1;
  // flung a little along the car's path and turned by the blow
  const fling = Math.min(3, abs * 0.12) / Math.max(0.6, size);
  a.x += Math.cos(v.angle) * fling;
  a.y += Math.sin(v.angle) * fling;
  a.angle += (Math.random() - 0.5) * 1.2;
  return true;
}

export function scareAnimal(a, world, fromX, fromY) {
  scareOff(a, world, fromX, fromY);
}

// Lying on its side, legs out. Called instead of the live animation.
export function poseDeadAnimal(mesh, a) {
  mesh.rotation.order = 'YXZ';
  mesh.rotation.x = a.deadSide * 1.42;
  const h = { cow: 0.2, horse: 0.2, sheep: 0.14, dog: 0.07, cat: 0.04, goose: 0.04, duck: 0.03 }[a.kind] || 0.08;
  mesh.position.y += h * (a.size || 1);
}

function scareOff(a, world, fromX, fromY) {
  if (a.kind === 'seagull') takeOff(a);
  else if (a.kind === 'gans' && !(a.fleeT > 0)) {
    a.fleeT = 3;
    const away = Math.atan2(a.y - fromY, a.x - fromX);
    a.wanderTarget = { x: a.x + Math.cos(away) * 14, y: a.y + Math.sin(away) * 14 };
  } else if (a.kind === 'pigeon' && a.flock) a.flock.scaredAt = world.time;
  else if (a.kind === 'cat' && a.state !== 'flee') {
    a.state = 'flee';
    a.stateTimer = 2.5;
    const away = Math.atan2(a.y - fromY, a.x - fromX);
    a.wanderTarget = { x: a.x + Math.cos(away) * 12, y: a.y + Math.sin(away) * 12 };
  }
}

// --- 3D models (1 unit = 1 m, facing +X) --------------------------------------
// Every animal is one SkinnedMesh on a small rig, with geometry cached per
// kind/variant and one material shared by all of them.

const MAT = markShared(vcMaterial({ roughness: 0.92 }));
const geoCache = new Map();
function cachedGeo(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = markShared(build());
    geoCache.set(key, g);
  }
  return g;
}

function makeRig(spec) {
  const bones = [], byName = {}, abs = {};
  for (const [name, parent, x, y, z] of spec) {
    const b = new THREE.Bone();
    abs[name] = [x, y, z];
    if (parent) {
      const p = abs[parent];
      b.position.set(x - p[0], y - p[1], z - p[2]);
      byName[parent].add(b);
    } else b.position.set(x, y, z);
    bones.push(b);
    byName[name] = b;
  }
  return { bones, byName };
}

function boneIndex(spec) {
  const out = {};
  spec.forEach(([name], i) => { out[name] = i; });
  return out;
}

function assemble(geometry, spec, radius, cy) {
  const group = new THREE.Group();
  const rig = makeRig(spec);
  group.add(rig.bones[0]);
  const mesh = new THREE.SkinnedMesh(geometry, MAT);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(rig.bones));
  group.userData.bones = rig.byName;
  for (const b of rig.bones) b.userData.rest = b.position.clone();
  return group;
}

function ellipsoid(ws, hs, sx, sy, sz, thStart = 0, thLen = Math.PI) {
  const g = new THREE.SphereGeometry(1, ws, hs, 0, Math.PI * 2, thStart, thLen);
  g.scale(sx, sy, sz);
  return g;
}

// Loft along +x: rings {u, cy, hh, hw, front}; front > 1 bulges the underside.
function loftX(rings, sides = 8, caps = true) {
  const g = loftGeometry(rings.map((r) => ({ y: r.u, d: r.hh, w: r.hw, x: -r.cy, front: r.front })), sides, Math.PI / sides);
  g.rotateZ(-Math.PI / 2);
  if (!caps) return g;
  const parts = [g];
  const a = rings[0], b = rings[rings.length - 1];
  const capA = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(-Math.PI / 2);
  capA.scale(1, a.hh, a.hw).translate(a.u, a.cy, 0);
  const capB = new THREE.CircleGeometry(1, sides, Math.PI / sides).rotateY(Math.PI / 2);
  capB.scale(1, b.hh, b.hw).translate(b.u, b.cy, 0);
  parts.push(capA.toNonIndexed(), capB.toNonIndexed());
  const pos = [];
  for (const p of parts) pos.push(...p.attributes.position.array);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return out;
}

// Flat convex plate in the x/z plane between y0 and y1 (wings, tails).
function slab(B, pts, y0, y1, top, bottom = top, side = top) {
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x; cz += z; }
  cx /= pts.length; cz /= pts.length;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[0], pts[i], pts[i + 1]];
    B.triOut([a[0], y1, a[1]], [b[0], y1, b[1]], [c[0], y1, c[1]], [0, 1, 0], top);
    B.triOut([a[0], y0, a[1]], [b[0], y0, b[1]], [c[0], y0, c[1]], [0, -1, 0], bottom);
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const out = [(a[0] + b[0]) / 2 - cx, 0, (a[1] + b[1]) / 2 - cz];
    B.quadOut([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], out, side);
  }
}

function mirrorZ(pts) {
  return pts.map(([x, z]) => [x, -z]);
}

// --- seagull ---

const GULL_WHITE = 0xeeeeea;
const GULL_GREY = 0xa9b1b6;
const GULL_TIP = 0x1e1f21;
const GULL_BEAK = 0xe0b331;
const GULL_LEG = 0xd9a07a;

const GULL_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.15, 0.04, 0],
  ['wingLi', 'body', 0.03, 0.035, 0.045],
  ['wingLo', 'wingLi', 0.03, 0.035, 0.33],
  ['wingRi', 'body', 0.03, 0.035, -0.045],
  ['wingRo', 'wingRi', 0.03, 0.035, -0.33],
  ['legs', 'body', -0.02, -0.045, 0],
];

function seagullGeometry() {
  const I = boneIndex(GULL_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(8, 6, 0.2, 0.068, 0.07), composeMatrix(0, 0, 0, 0, 0, 0.04), GULL_WHITE);
  B.geo(ellipsoid(8, 3, 0.17, 0.072, 0.072, 0, Math.PI * 0.38), composeMatrix(-0.02, 0.004, 0), GULL_GREY);
  slab(B, [[-0.14, 0.03], [-0.27, 0.06], [-0.28, -0.06], [-0.14, -0.03]], -0.004, 0.008, GULL_WHITE);
  B.bone = I.head;
  B.geo(ellipsoid(7, 5, 0.062, 0.055, 0.05), composeMatrix(0.19, 0.055, 0), GULL_WHITE);
  B.geo(new THREE.ConeGeometry(0.017, 0.075, 4).rotateZ(-Math.PI / 2), composeMatrix(0.285, 0.045, 0, 0, 0, -0.08), GULL_BEAK);
  B.box(0.275, 0.034, 0, 0.012, 0.012, 0.018, 0xb8322a);
  for (const s of [1, -1]) B.box(0.22, 0.068, s * 0.035, 0.012, 0.012, 0.01, 0x111111);
  for (const s of [1, -1]) {
    const k = s === 1 ? 'L' : 'R';
    const m = (pts) => (s === 1 ? pts : mirrorZ(pts));
    B.bone = I['wing' + k + 'i'];
    slab(B, m([[0.075, 0.045], [0.065, 0.33], [-0.085, 0.33], [-0.12, 0.045]]), 0.028, 0.045, GULL_GREY, GULL_WHITE, GULL_GREY);
    B.bone = I['wing' + k + 'o'];
    slab(B, m([[0.065, 0.33], [0.035, 0.45], [-0.095, 0.45], [-0.085, 0.33]]), 0.03, 0.043, GULL_GREY, GULL_WHITE, GULL_GREY);
    slab(B, m([[0.035, 0.45], [-0.06, 0.63], [-0.1, 0.6], [-0.095, 0.45]]), 0.031, 0.042, GULL_TIP, GULL_TIP, GULL_TIP);
    B.box(-0.07, 0.043, s * 0.575, 0.03, 0.004, 0.035, GULL_WHITE);
    B.bone = I.legs;
    B.geo(tubeGeometry([-0.02, -0.04, s * 0.025], [-0.02, -0.19, s * 0.025], 0.008, 0.007, 4), null, GULL_LEG);
    B.box(0.005, -0.195, s * 0.025, 0.055, 0.008, 0.035, GULL_LEG);
  }
  return B.build();
}

export function buildSeagullMesh3D() {
  const group = assemble(cachedGeo('gull', seagullGeometry), GULL_SPEC, 0.8, 0);
  const b = group.userData.bones;
  b.wingLi.userData.sign = 1;
  b.wingRi.userData.sign = -1;
  group.userData.wings = [b.wingLi, b.wingRi];
  group.userData.foldShift = 0.13;
  group.userData.head = b.head;
  return group;
}

// --- cow ---

const COW_WHITE = 0xe9e6de;
const COW_BLACK = 0x1f1e1d;
const COW_RED = 0x7a3520;
const COW_PINK = 0xd9a7a0;
const COW_HOOF = 0x2a2622;

const COW_SPEC = [
  ['body', null, 0, 1.05, 0],
  ['head', 'body', 0.62, 1.08, 0],
  ['tail', 'body', -0.88, 1.28, 0],
  ['legFL', 'body', 0.55, 0.95, 0.19],
  ['legFR', 'body', 0.55, 0.95, -0.19],
  ['legBL', 'body', -0.6, 0.95, 0.2],
  ['legBR', 'body', -0.6, 0.95, -0.2],
];

function holstein(seed, dark = COW_BLACK) {
  const rng = new SeededRng(Math.floor(seed * 1e6) + 7);
  const blobs = [];
  const n = 9 + Math.floor(rng.next() * 4);
  for (let i = 0; i < n; i++) {
    blobs.push({ x: -0.85 + rng.next() * 1.6, y: 0.85 + rng.next() * 0.6, z: (i % 2 ? 1 : -1) * (0.15 + rng.next() * 0.25), r: 0.13 + rng.next() * 0.17 });
  }
  return (x, y, z) => {
    for (const b of blobs) {
      const dx = x - b.x, dy = (y - b.y) * 1.3, dz = z - b.z;
      if (dx * dx + dy * dy + dz * dz < b.r * b.r) return dark;
    }
    return COW_WHITE;
  };
}

function cowGeometry(seed, dark = COW_BLACK) {
  const I = boneIndex(COW_SPEC);
  const B = new SkinBuilder(1);
  const coat = holstein(seed, dark);
  B.bone = I.body;
  B.geo(loftX([
    { u: -0.9, cy: 1.12, hh: 0.17, hw: 0.14 },
    { u: -0.8, cy: 1.1, hh: 0.3, hw: 0.25 },
    { u: -0.55, cy: 1.07, hh: 0.36, hw: 0.31 },
    { u: -0.15, cy: 1.03, hh: 0.4, hw: 0.34, front: 1.15 },
    { u: 0.25, cy: 1.05, hh: 0.39, hw: 0.32, front: 1.08 },
    { u: 0.58, cy: 1.1, hh: 0.34, hw: 0.26 },
    { u: 0.78, cy: 1.16, hh: 0.24, hw: 0.19 },
  ], 10), null, coat);
  B.geo(ellipsoid(6, 4, 0.16, 0.11, 0.14), composeMatrix(-0.38, 0.7, 0), COW_PINK);
  for (const dx of [-0.05, 0.05]) for (const dz of [-0.05, 0.05]) B.box(-0.38 + dx, 0.58, dz, 0.025, 0.06, 0.025, shadeHex(COW_PINK, 0.9));
  for (const [name, x, z] of [['legFL', 0.55, 0.19], ['legFR', 0.55, -0.19], ['legBL', -0.6, 0.2], ['legBR', -0.6, -0.2]]) {
    B.bone = I[name];
    const back = x < 0;
    B.geo(loftGeometry([
      { y: 0.08, d: 0.05, w: 0.05 },
      { y: 0.3, d: 0.05, w: 0.048 },
      { y: 0.45, d: back ? 0.07 : 0.058, w: 0.056, x: back ? -0.02 : 0 },
      { y: 0.7, d: back ? 0.11 : 0.085, w: 0.08, x: back ? -0.01 : 0 },
      { y: 1.02, d: 0.13, w: 0.1 },
    ], 6), composeMatrix(x, 0, z), (px, py, pz) => (py > 0.55 ? coat(px, py, pz) : COW_WHITE));
    B.box(x + 0.01, 0.045, z, 0.12, 0.09, 0.11, COW_HOOF);
  }
  B.bone = I.head;
  const H = composeMatrix(0.62, 1.08, 0, 0, 0, -0.45).multiply(composeMatrix(0.1, 0, 0));
  const headCoat = (x, y, z) => (Math.abs(z) < 0.04 && y > 0.95 ? COW_WHITE : dark);
  const hg = loftX([
    { u: -0.22, cy: 0, hh: 0.22, hw: 0.16 },
    { u: 0.2, cy: 0.02, hh: 0.17, hw: 0.12 },
    { u: 0.38, cy: 0.04, hh: 0.16, hw: 0.13 },
    { u: 0.56, cy: 0.0, hh: 0.12, hw: 0.11 },
    { u: 0.66, cy: -0.02, hh: 0.1, hw: 0.1 },
  ], 8);
  B.geo(hg, H, headCoat);
  const hm = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => H.clone().multiply(composeMatrix(x, y, z, rx, ry, rz, sx, sy, sz));
  B.geo(new THREE.BoxGeometry(0.05, 0.17, 0.2), hm(0.66, -0.02, 0), COW_PINK);
  for (const s of [1, -1]) {
    B.geo(new THREE.BoxGeometry(0.1, 0.04, 0.16), hm(0.3, 0.1, s * 0.17, s * 0.4, 0, 0), dark);
    B.geo(new THREE.ConeGeometry(0.022, 0.09, 4), hm(0.33, 0.2, s * 0.08, s * -0.7, 0, -0.2), 0xd8d0b8);
    B.geo(new THREE.BoxGeometry(0.03, 0.03, 0.02), hm(0.44, 0.08, s * 0.125), 0x111111);
    B.geo(new THREE.BoxGeometry(0.01, 0.03, 0.03), hm(0.69, -0.03, s * 0.045), 0x2a1a1a);
  }
  B.bone = I.tail;
  B.geo(tubeGeometry([-0.88, 1.28, 0], [-0.92, 0.62, 0], 0.022, 0.014, 4), null, COW_WHITE);
  B.geo(ellipsoid(5, 4, 0.04, 0.1, 0.04), composeMatrix(-0.925, 0.56, 0), COW_BLACK);
  return B.build();
}

function shadeHex(hex, f) {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * f));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * f));
  const b = Math.min(255, Math.round((hex & 0xff) * f));
  return (r << 16) | (g << 8) | b;
}

// red: roodbont (MRIJ) coat instead of Holstein black-and-white.
export function buildCowMesh3D(seed = 0, red = false) {
  const variant = Math.floor(Math.abs(seed * 1000)) % 4;
  const key = (red ? 'cowred' : 'cow') + variant;
  const group = assemble(cachedGeo(key, () => cowGeometry(variant + 0.137, red ? COW_RED : COW_BLACK)), COW_SPEC, 1.6, 0.8);
  const b = group.userData.bones;
  group.userData.head = b.head;
  group.userData.headBaseRotZ = 0;
  group.userData.legs = [b.legFL, b.legFR, b.legBL, b.legBR];
  group.userData.tail = b.tail;
  group.userData.grazeDip = 1.1;
  return group;
}

// --- sheep ---

const SHEEP_WOOL = 0xdcd6c6;
const SHEEP_DARK = 0x2a2624;

const SHEEP_SPEC = [
  ['body', null, 0, 0.62, 0],
  ['head', 'body', 0.36, 0.66, 0],
  ['tail', 'body', -0.5, 0.66, 0],
  ['legFL', 'body', 0.3, 0.46, 0.13],
  ['legFR', 'body', 0.3, 0.46, -0.13],
  ['legBL', 'body', -0.3, 0.46, 0.13],
  ['legBR', 'body', -0.3, 0.46, -0.13],
];

function woolBlob(B, x, y, z, sx, sy, sz, seed, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    const j = 1 + (Math.sin(Math.round(vx * 40) * 12.9898 + Math.round(vy * 40) * 78.233 + Math.round(vz * 40) * 37.719 + seed) * 43758.5453 % 1) * 0.12;
    p.setXYZ(i, vx * sx * j + x, vy * sy * j + y, vz * sz * j + z);
  }
  B.geo(g, null, (cx, cy, cz) => ((Math.round(cx * 17 + cy * 23 + cz * 29) & 3) === 0 ? 0xcfc8b6 : cy < 0.5 ? 0xc9c1ae : SHEEP_WOOL));
}

function sheepGeometry() {
  const I = boneIndex(SHEEP_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  woolBlob(B, 0, 0.66, 0, 0.5, 0.26, 0.29, 1);
  for (const [x, y, z, s] of [[0.22, 0.8, 0.1, 0.14], [0.2, 0.8, -0.1, 0.13], [-0.18, 0.84, 0.08, 0.15], [-0.2, 0.82, -0.1, 0.14], [0.02, 0.9, 0, 0.16], [-0.38, 0.72, 0, 0.15]]) {
    woolBlob(B, x, y, z, s, s * 0.85, s, x * 7 + z * 3, 0);
  }
  for (const [name, x, z] of [['legFL', 0.3, 0.13], ['legFR', 0.3, -0.13], ['legBL', -0.3, 0.13], ['legBR', -0.3, -0.13]]) {
    B.bone = I[name];
    B.geo(loftGeometry([{ y: 0.05, d: 0.026, w: 0.026 }, { y: 0.25, d: 0.03, w: 0.028 }, { y: 0.5, d: 0.045, w: 0.04 }], 5), composeMatrix(x, 0, z), SHEEP_DARK);
    B.box(x + 0.008, 0.028, z, 0.06, 0.055, 0.055, 0x151312);
  }
  B.bone = I.head;
  const H = composeMatrix(0.36, 0.66, 0, 0, 0, -0.35).multiply(composeMatrix(0.1, 0, 0));
  B.geo(loftX([
    { u: -0.12, cy: 0, hh: 0.1, hw: 0.09 },
    { u: 0.12, cy: 0.0, hh: 0.085, hw: 0.075 },
    { u: 0.24, cy: -0.01, hh: 0.06, hw: 0.055 },
    { u: 0.28, cy: -0.015, hh: 0.045, hw: 0.045 },
  ], 7), H, SHEEP_DARK);
  const hm = (x, y, z, rx = 0, ry = 0, rz = 0) => H.clone().multiply(composeMatrix(x, y, z, rx, ry, rz));
  B.geo(new THREE.IcosahedronGeometry(1, 0).scale(0.08, 0.06, 0.08), hm(0.03, 0.08, 0), SHEEP_WOOL);
  for (const s of [1, -1]) {
    B.geo(new THREE.BoxGeometry(0.08, 0.025, 0.1), hm(0.06, 0.05, s * 0.1, 0, s * 0.3, 0), SHEEP_DARK);
    B.geo(new THREE.BoxGeometry(0.02, 0.018, 0.015), hm(0.15, 0.035, s * 0.07), 0xb89a5a);
  }
  B.bone = I.tail;
  woolBlob(B, -0.52, 0.62, 0, 0.06, 0.09, 0.06, 5, 0);
  return B.build();
}

export function buildSheepMesh3D() {
  const group = assemble(cachedGeo('sheep', sheepGeometry), SHEEP_SPEC, 0.9, 0.5);
  const b = group.userData.bones;
  group.userData.head = b.head;
  group.userData.headBaseRotZ = 0;
  group.userData.legs = [b.legFL, b.legFR, b.legBL, b.legBR];
  group.userData.tail = b.tail;
  group.userData.grazeDip = 1.1;
  return group;
}

// --- duck / goose ---

const DUCK_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.11, 0.07, 0],
  ['tail', 'body', -0.13, 0.04, 0],
];

const DUCK_LOOKS = {
  drake: { body: 0x8f8a82, back: 0x6a5a48, chest: 0x6b3a28, head: 0x1f5a3a, bill: 0xd8b83a, ring: true, speculum: 0x3a4fa0, tail: 0x1c1c1c, scale: 1, neck: 0.05 },
  hen: { body: 0x8a6a48, back: 0x6a4e34, chest: 0x7a5a3c, head: 0x7a5a3c, bill: 0xb8783a, ring: false, speculum: 0x3a4fa0, tail: 0x5a4430, scale: 0.95, neck: 0.05 },
  goose: { body: 0x8a8274, back: 0x6e6658, chest: 0x9a9284, head: 0x7e776a, bill: 0xd9803a, ring: false, speculum: 0x5a5448, tail: 0xe6e1d6, scale: 1.7, neck: 0.11 },
  // mute swan: all white, long neck, orange bill with the black knob
  // blauwe reiger: grijs, wit, lange hals, gele snavel, hoge poten (alleen deze look krijgt poten)
  reiger: { body: 0x8d9aa3, back: 0x76848d, chest: 0xdfe3e4, head: 0xeceeee, bill: 0xd9a93a, ring: false, speculum: 0x4a5560, tail: 0x6b7780, scale: 3.4, neck: 0.3, legs: true },
  swan: { body: 0xeeece6, back: 0xe2dfd6, chest: 0xf2f0ea, head: 0xf2f0ea, bill: 0xe0702a, ring: false, speculum: 0xe2dfd6, tail: 0xe8e6de, scale: 3.1, neck: 0.2 },
};

function duckGeometry(variant) {
  const L = DUCK_LOOKS[variant];
  const I = boneIndex(DUCK_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(8, 5, 0.17, 0.075, 0.095), composeMatrix(0, 0.02, 0), L.body);
  B.geo(ellipsoid(8, 2, 0.15, 0.078, 0.085, 0, Math.PI * 0.32), composeMatrix(-0.015, 0.024, 0), L.back);
  B.geo(ellipsoid(6, 4, 0.07, 0.065, 0.075), composeMatrix(0.1, 0.04, 0), L.chest);
  for (const s of [1, -1]) B.box(-0.03, 0.055, s * 0.083, 0.07, 0.025, 0.01, L.speculum, 0, 0, 0, 0.1);
  B.bone = I.tail;
  slab(B, [[-0.13, 0.03], [-0.21, 0.02], [-0.22, -0.02], [-0.13, -0.03]], 0.035, 0.05, L.tail);
  if (variant === 'drake') B.geo(tubeGeometry([-0.2, 0.05, 0], [-0.19, 0.09, 0], 0.008, 0.005, 4), null, 0x1c1c1c);
  if (L.legs) for (const s of [1, -1]) B.geo(tubeGeometry([0.0, 0.0, s * 0.03], [0.01, -0.17, s * 0.03], 0.007, 0.005, 4), null, 0x7d6a4a);
  B.bone = I.head;
  const nk = L.neck;
  B.geo(tubeGeometry([0.1, 0.05, 0], [0.13, 0.1 + nk, 0], 0.028, 0.022, 6), null, L.head);
  if (L.ring) B.geo(loftGeometry([{ y: 0.09, d: 0.03, w: 0.03 }, { y: 0.102, d: 0.029, w: 0.029 }], 6), composeMatrix(0.022, 0, 0, 0, 0, -0.3), 0xe6e1d6);
  B.geo(ellipsoid(6, 5, 0.048, 0.042, 0.038), composeMatrix(0.145, 0.13 + nk, 0), L.head);
  B.geo(new THREE.BoxGeometry(0.06, 0.016, 0.034), composeMatrix(0.205, 0.12 + nk, 0, 0, 0, -0.15), L.bill);
  for (const s of [1, -1]) B.box(0.165, 0.142 + nk, s * 0.03, 0.01, 0.01, 0.008, 0x111111);
  if (variant === 'goose') B.box(0.14, 0.11 + nk, 0, 0.03, 0.02, 0.07, 0xe6e1d6);
  if (variant === 'swan') B.box(0.178, 0.132 + nk, 0, 0.02, 0.022, 0.02, 0x1a1a1a);
  if (variant === 'hen') for (const s of [1, -1]) B.box(0.155, 0.142 + nk, s * 0.035, 0.05, 0.008, 0.006, 0x4a3422);
  return B.build();
}

export function buildDuckMesh3D(variant = 'drake') {
  const L = DUCK_LOOKS[variant] || DUCK_LOOKS.drake;
  const group = assemble(cachedGeo('duck' + variant, () => duckGeometry(variant)), DUCK_SPEC, 0.4, 0.05);
  group.scale.setScalar(L.scale);
  group.userData.head = group.userData.bones.head;
  return group;
}

// --- zeehond en vis (#193): eenvoudige low-poly figuren op dezelfde romp als de eend ---
function sealGeometry() {
  const I = boneIndex(DUCK_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(8, 6, 0.5, 0.16, 0.2), composeMatrix(0, 0.1, 0), 0x7d8085);
  B.geo(ellipsoid(8, 3, 0.46, 0.1, 0.17), composeMatrix(0.0, 0.06, 0), 0xbfc0b8);
  B.bone = I.tail;
  for (const s of [1, -1]) B.box(-0.55, 0.06, s * 0.07, 0.12, 0.02, 0.07, 0x5f6266, 0, s * 0.4, 0);
  B.bone = I.head;
  B.geo(ellipsoid(6, 5, 0.13, 0.11, 0.11), composeMatrix(0.5, 0.2, 0), 0x868a8e);
  B.box(0.62, 0.17, 0, 0.05, 0.05, 0.08, 0x9a9d9f);
  B.box(0.64, 0.19, 0, 0.02, 0.02, 0.03, 0x1a1a1a);
  for (const s of [1, -1]) B.box(0.57, 0.24, s * 0.06, 0.016, 0.016, 0.016, 0x111111);
  return B.build();
}
export function buildSealMesh3D() {
  const group = assemble(cachedGeo('zeehond', sealGeometry), DUCK_SPEC, 0.8, 0.15);
  group.userData.head = group.userData.bones.head;
  return group;
}
function fishGeometry() {
  const I = boneIndex(DUCK_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(6, 4, 0.12, 0.04, 0.025), composeMatrix(0, 0, 0), 0x9fb0b8);
  B.geo(ellipsoid(6, 2, 0.1, 0.03, 0.022, 0, Math.PI * 0.4), composeMatrix(0, 0.01, 0), 0x56707c);
  B.bone = I.tail;
  slab(B, [[-0.1, 0.0], [-0.19, 0.04], [-0.19, -0.04]], -0.004, 0.004, 0x6f8792);
  return B.build();
}
export function buildFishMesh3D() {
  const group = assemble(cachedGeo('vis', fishGeometry), DUCK_SPEC, 0.3, 0);
  group.scale.setScalar(1.8);
  return group;
}

// --- pigeon ---

const PIGEON_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.055, 0.04, 0],
  ['wingL', 'body', 0.01, 0.03, 0.035],
  ['wingR', 'body', 0.01, 0.03, -0.035],
];

function pigeonGeometry(tone) {
  const I = boneIndex(PIGEON_SPEC);
  const body = [0x8a8f99, 0x6e727a, 0x9a8e84, 0x5a5e66][tone];
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(7, 5, 0.085, 0.05, 0.048), composeMatrix(0, 0, 0, 0, 0, 0.2), body);
  slab(B, [[-0.06, 0.02], [-0.15, 0.03], [-0.155, -0.03], [-0.06, -0.02]], 0.0, 0.01, shadeHex(body, 0.8));
  B.box(-0.145, 0.006, 0, 0.02, 0.011, 0.06, 0x2a2a2e);
  for (const s of [1, -1]) {
    B.geo(tubeGeometry([0.0, -0.035, s * 0.015], [0.0, -0.095, s * 0.015], 0.005, 0.004, 4), null, 0xc86a6a);
    B.box(0.012, -0.097, s * 0.015, 0.03, 0.005, 0.02, 0xc86a6a);
  }
  B.bone = I.head;
  B.geo(ellipsoid(6, 4, 0.035, 0.04, 0.032), composeMatrix(0.058, 0.035, 0), 0x4a5a58);
  B.geo(ellipsoid(6, 4, 0.03, 0.03, 0.027), composeMatrix(0.075, 0.07, 0), shadeHex(body, 0.85));
  B.geo(new THREE.ConeGeometry(0.008, 0.025, 4).rotateZ(-Math.PI / 2), composeMatrix(0.112, 0.066, 0), 0x2a2a2a);
  B.box(0.1, 0.073, 0, 0.01, 0.008, 0.012, 0xe6e1d6);
  for (const s of [1, -1]) B.box(0.088, 0.078, s * 0.02, 0.008, 0.008, 0.006, 0xc86a2a);
  for (const s of [1, -1]) {
    const m = (pts) => (s === 1 ? pts : mirrorZ(pts));
    B.bone = s === 1 ? I.wingL : I.wingR;
    slab(B, m([[0.05, 0.035], [0.03, 0.2], [-0.04, 0.26], [-0.07, 0.2], [-0.06, 0.035]]), 0.025, 0.035, body, shadeHex(body, 1.1));
    B.box(-0.02, 0.036, s * 0.07, 0.015, 0.003, 0.06, 0x2a2a2e);
    B.box(-0.045, 0.036, s * 0.07, 0.015, 0.003, 0.06, 0x2a2a2e);
    slab(B, m([[0.03, 0.2], [-0.04, 0.26], [-0.07, 0.2]]), 0.026, 0.034, 0x2a2a2e);
  }
  return B.build();
}

export function buildPigeonMesh3D(tone = 0) {
  const group = assemble(cachedGeo('pigeon' + tone, () => pigeonGeometry(tone)), PIGEON_SPEC, 0.4, 0);
  const b = group.userData.bones;
  b.wingL.userData.sign = 1;
  b.wingR.userData.sign = -1;
  group.userData.wings = [b.wingL, b.wingR];
  group.userData.foldShift = 0.03;
  group.userData.head = b.head;
  return group;
}

// --- cat / dog (shared quadruped) ---

const QUAD_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0, 0, 0],
  ['tail', 'body', 0, 0, 0],
  ['legFL', 'body', 0, 0, 0],
  ['legFR', 'body', 0, 0, 0],
  ['legBL', 'body', 0, 0, 0],
  ['legBR', 'body', 0, 0, 0],
];

function quadSpec(P) {
  const hx = P.len / 2, h = P.leg + P.hh;
  return [
    ['body', null, 0, h, 0],
    ['head', 'body', hx * 0.95, h + P.hh * 0.6, 0],
    ['tail', 'body', -hx, h + P.hh * 0.4, 0],
    ['legFL', 'body', hx * 0.7, P.leg + P.hh * 0.4, P.hw * 0.55],
    ['legFR', 'body', hx * 0.7, P.leg + P.hh * 0.4, -P.hw * 0.55],
    ['legBL', 'body', -hx * 0.7, P.leg + P.hh * 0.4, P.hw * 0.55],
    ['legBR', 'body', -hx * 0.7, P.leg + P.hh * 0.4, -P.hw * 0.55],
  ];
}

function quadGeometry(P, spec) {
  const I = boneIndex(QUAD_SPEC);
  const B = new SkinBuilder(1);
  const hx = P.len / 2, h = P.leg + P.hh;
  const coat = P.coat;
  B.bone = I.body;
  B.geo(loftX([
    { u: -hx, cy: h + P.hh * 0.1, hh: P.hh * 0.75, hw: P.hw * 0.8 },
    { u: -hx * 0.55, cy: h, hh: P.hh, hw: P.hw },
    { u: hx * 0.2, cy: h - P.hh * 0.05, hh: P.hh * 0.95, hw: P.hw * 0.95, front: P.deepChest || 1 },
    { u: hx * 0.75, cy: h + P.hh * 0.1, hh: P.hh * 1.05, hw: P.hw * 0.95, front: P.deepChest || 1 },
    { u: hx * 1.02, cy: h + P.hh * 0.35, hh: P.hh * 0.7, hw: P.hw * 0.7 },
  ], 8), null, coat);
  for (const [name, sx, sz] of [['legFL', 1, 1], ['legFR', 1, -1], ['legBL', -1, 1], ['legBR', -1, -1]]) {
    B.bone = I[name];
    const x = sx * hx * 0.7, z = sz * P.hw * 0.55;
    const r = P.legR;
    B.geo(loftGeometry([
      { y: 0.02, d: r * 0.85, w: r * 0.8 },
      { y: P.leg * 0.45, d: r * 0.8, w: r * 0.75, x: sx < 0 ? -r * 0.4 : 0 },
      { y: P.leg + P.hh * 0.5, d: r * 1.5, w: r * 1.2 },
    ], 5), composeMatrix(x, 0, z), P.legCoat || coat);
    B.box(x + r * 0.5, 0.018, z, r * 2.6, 0.036, r * 2, P.paw || P.legCoat || coat);
  }
  B.bone = I.head;
  const hp = spec[1];
  const H = composeMatrix(hp[2], hp[3], 0);
  const hm = (x, y, z, rx = 0, ry = 0, rz = 0) => H.clone().multiply(composeMatrix(x, y, z, rx, ry, rz));
  B.geo(loftX([
    { u: -P.hh * 0.6, cy: -P.hh * 0.2, hh: P.hh * 0.75, hw: P.hw * 0.7 },
    { u: P.head * 0.3, cy: P.hh * 0.3, hh: P.head * 0.5, hw: P.head * 0.48 },
    { u: P.head * 0.75, cy: P.hh * 0.3, hh: P.head * 0.46, hw: P.head * 0.44 },
    { u: P.head * 0.8 + P.snout * 0.6, cy: P.hh * 0.3 - P.head * 0.15, hh: P.head * 0.24, hw: P.head * 0.22 },
    { u: P.head * 0.8 + P.snout, cy: P.hh * 0.3 - P.head * 0.17, hh: P.head * 0.18, hw: P.head * 0.17 },
  ], 7), H, P.face || coat);
  const tipX = P.head * 0.8 + P.snout;
  B.geo(new THREE.BoxGeometry(0.02, P.head * 0.14, P.head * 0.2), hm(tipX + 0.005, P.hh * 0.3 - P.head * 0.12, 0), P.nose);
  for (const s of [1, -1]) {
    B.geo(new THREE.BoxGeometry(0.012, P.head * 0.12, P.head * 0.14), hm(P.head * 0.72, P.hh * 0.3 + P.head * 0.14, s * P.head * 0.28, 0, -s * 0.5, 0), P.eye);
    if (P.floppy) B.geo(new THREE.BoxGeometry(P.head * 0.35, P.head * 0.6, 0.02), hm(P.head * 0.3, P.hh * 0.3 + P.head * 0.05, s * P.head * 0.5, s * 0.15, 0, 0.1), P.ear);
    else B.geo(new THREE.ConeGeometry(P.head * 0.2, P.head * 0.45, 3), hm(P.head * 0.3, P.hh * 0.3 + P.head * 0.6, s * P.head * 0.28, s * -0.25, 0, 0.1), P.ear);
  }
  if (P.collar) B.geo(loftGeometry([{ y: -0.015, d: P.hh * 0.82, w: P.hw * 0.8 }, { y: 0.015, d: P.hh * 0.8, w: P.hw * 0.78 }], 8), hm(-P.hh * 0.35, -P.hh * 0.1, 0, 0, 0, -1.2), P.collar);
  B.bone = I.tail;
  const tp = spec[2];
  const t0 = [tp[2], tp[3], 0];
  const t1 = [tp[2] - P.tail * 0.55, tp[3] + P.tail * P.tailUp * 0.6, 0];
  const t2 = [tp[2] - P.tail * 0.8, tp[3] + P.tail * P.tailUp, 0];
  B.geo(tubeGeometry(t0, t1, P.tailR, P.tailR * 0.85, 5), null, coat);
  B.geo(tubeGeometry(t1, t2, P.tailR * 0.85, P.tailR * 0.5, 5), null, P.tailTip || coat);
  return B.build();
}

const CAT_LOOKS = [
  { base: 0xc97a3a, stripe: 0x9a5424, belly: 0xe0b890 },
  { base: 0x1e1c1c, stripe: 0x1e1c1c, belly: 0x1e1c1c },
  { base: 0x7a7a7e, stripe: 0x5a5a5e, belly: 0xb8b8b8 },
  { base: 0x1e1c1c, stripe: 0x1e1c1c, belly: 0xe6e1d6 },
];

function catParams(v) {
  const c = CAT_LOOKS[v % CAT_LOOKS.length];
  const coat = (x, y, z) => (y < 0.2 && Math.abs(z) < 0.05 && x > 0 ? c.belly : (Math.floor(x * 30) & 1 ? c.stripe : c.base));
  return {
    len: 0.42, leg: 0.17, hh: 0.075, hw: 0.065, legR: 0.018, head: 0.1, snout: 0.03,
    tail: 0.32, tailR: 0.014, tailUp: 1.1, coat, legCoat: c.base, paw: c.belly, face: c.base,
    nose: 0xc88a8a, eye: 0xb8b040, ear: c.base, floppy: false,
  };
}

const DOG_BREEDS = [
  { name: 'labrador', len: 0.72, leg: 0.34, hh: 0.14, hw: 0.12, legR: 0.035, head: 0.17, snout: 0.1, tail: 0.34, tailR: 0.025, tailUp: 0.35, floppy: true, colors: [0xc9a46a, 0x2a2420, 0x5a3a26] },
  { name: 'terrier', len: 0.38, leg: 0.15, hh: 0.08, hw: 0.07, legR: 0.02, head: 0.11, snout: 0.05, tail: 0.14, tailR: 0.016, tailUp: 1.4, floppy: false, colors: [0xe6e1d6, 0xb88a5a, 0xd8d0c0] },
  { name: 'teckel', len: 0.55, leg: 0.08, hh: 0.075, hw: 0.07, legR: 0.022, head: 0.11, snout: 0.08, tail: 0.24, tailR: 0.016, tailUp: 0.3, floppy: true, deepChest: 1.25, colors: [0x7a3a1e, 0x2a2420, 0x9a5a2a] },
  { name: 'herder', len: 0.78, leg: 0.4, hh: 0.14, hw: 0.11, legR: 0.034, head: 0.17, snout: 0.12, tail: 0.4, tailR: 0.03, tailUp: 0.2, floppy: false, colors: [0x6a4a2a, 0x2a2420, 0x8a6a4a] },
];
const COLLARS = [0xb8322a, 0x2f5c8a, 0x3f6b3f, 0xc9a227];

function dogParams(breed, colorT) {
  const B = DOG_BREEDS[breed % DOG_BREEDS.length];
  const base = B.colors[Math.min(B.colors.length - 1, Math.floor(colorT * B.colors.length))];
  const saddle = B.name === 'herder' ? 0x1e1a18 : null;
  const coat = saddle ? (x, y) => (y > B.leg + B.hh * 1.3 && x < B.len * 0.35 ? saddle : base) : base;
  return {
    ...B, coat, legCoat: base, face: base, nose: 0x1a1414, eye: 0x1a1410,
    ear: B.floppy ? shadeHex(base, 0.8) : base, collar: COLLARS[Math.floor(colorT * 97) % COLLARS.length],
  };
}

function buildQuad(key, P) {
  const spec = quadSpec(P);
  const group = assemble(cachedGeo(key, () => quadGeometry(P, spec)), spec, P.len + 0.3, P.leg);
  const b = group.userData.bones;
  group.userData.head = b.head;
  group.userData.legs = [b.legFL, b.legFR, b.legBL, b.legBR];
  group.userData.tail = b.tail;
  group.userData.quad = P;
  return group;
}

export function buildCatMesh3D(variant = 0) {
  return buildQuad('cat' + (variant % CAT_LOOKS.length), catParams(variant));
}

const LEASH_GEO = markShared(new THREE.CylinderGeometry(0.006, 0.006, 1, 4, 1, true).translate(0, 0.5, 0));
const LEASH_MAT = markShared(new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));

export function buildDogMesh3D(breed = 0, colorT = 0) {
  const P = dogParams(breed, colorT);
  const group = buildQuad('dog' + breed + '|' + P.legCoat + '|' + P.collar, P);
  const leash = new THREE.Mesh(LEASH_GEO, LEASH_MAT);
  leash.frustumCulled = false;
  group.add(leash);
  group.userData.leash = leash;
  const hp = quadSpec(P)[1];
  group.userData.collar = new THREE.Vector3(hp[2] - P.hh * 0.3, hp[3] - P.hh * 0.1, 0);
  return group;
}

export function buildWildlifeMesh3D(a) {
  switch (a.kind) {
    case 'seagull': return buildSeagullMesh3D();
    case 'sheep': return buildSheepMesh3D();
    case 'duck': return buildDuckMesh3D(a.variant);
    case 'gans': return buildDuckMesh3D('goose');
    case 'reiger': return buildDuckMesh3D('reiger');
    case 'zeehond': return buildSealMesh3D();
    case 'vis': return buildFishMesh3D();
    case 'pigeon': return buildPigeonMesh3D(Math.floor((a.bobSeed || 0) * 10) % 4);
    case 'cat': return buildCatMesh3D(a.variant || 0);
    case 'dog': return buildDogMesh3D(a.breed || 0, a.color || 0);
    default: return buildCowMesh3D(a.bobSeed, a.variant === 'red');
  }
}

// Blob-shadow footprint [length, width] per kind (null: none, e.g. birds in flight).
export function wildlifeShadowSize(kind) {
  return { cow: [1.3, 0.75], sheep: [0.9, 0.6], gans: [0.5, 0.3], cat: [0.45, 0.2], dog: [0.8, 0.35], pigeon: [0.2, 0.12], duck: [0.35, 0.2], reiger: [0.5, 0.3] }[kind] || null;
}

// --- animation ---------------------------------------------------------------

const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

function setWings(ud, sign, inner, outer, fold = 0) {
  for (const w of ud.wings) {
    const s = w.userData.sign;
    w.rotation.set(-s * inner, -s * fold * 1.45, 0);
    w.position.set(w.userData.rest.x + fold * (ud.foldShift || 0), w.userData.rest.y, w.userData.rest.z * (1 - fold * 0.3));
    const o = w.children[0];
    if (o) o.rotation.set(-s * outer, -s * fold * 0.15, 0);
  }
}

function walkLegs(ud, phase, amp) {
  const [fl, fr, bl, br] = ud.legs;
  fl.rotation.z = Math.sin(phase) * amp;
  br.rotation.z = Math.sin(phase + 0.3) * amp;
  fr.rotation.z = Math.sin(phase + Math.PI) * amp;
  bl.rotation.z = Math.sin(phase + Math.PI + 0.3) * amp;
}

function animateSeagull(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones;
  const seed = a.flapSeed || 0;
  const standing = a.state === 'ground';
  mesh.position.y = a.z ?? 6 + Math.sin(time * 2 + seed) * 1.2;
  if (standing) {
    setWings(ud, 1, -0.25, 0.05, 1);
    b.legs.rotation.z = 0;
    b.body.rotation.set(0, 0, 0.15);
    const step = a.speed > 0.05 ? Math.sin((a.stride || 0) * 14) : 0;
    b.body.position.y = step * 0.01;
    b.head.rotation.set(0, Math.sin(time * 0.9 + seed) * 0.6, a.speed > 0.05 ? step * 0.12 : Math.sin(time * 0.5 + seed) * 0.1);
    return;
  }
  b.body.position.y = 0;
  const landing = a.state === 'land';
  const sinceTakeoff = a.takeoffAt ? performance.now() / 1000 - a.takeoffAt : 99;
  const glide = landing ? 0.4 : sinceTakeoff < 2 ? 0 : Math.max(0, Math.sin(time * 0.45 + seed)) ** 0.6;
  const rate = sinceTakeoff < 2 ? 13 : 9;
  const ph = time * rate + seed;
  const flap = Math.sin(ph) * 0.75 * (1 - glide);
  const lag = Math.sin(ph - 0.9) * 0.55 * (1 - glide);
  setWings(ud, 1, 0.15 + flap, -0.12 * glide + lag * 0.6 - 0.05);
  b.legs.rotation.z = landing ? -0.2 : -1.35;
  b.body.rotation.set(-(a.bank || 0), 0, landing ? 0.25 : Math.max(-0.2, Math.min(0.2, (a.cruise - (a.z || 0)) * -0.05)));
  b.head.rotation.set(a.bank * 0.5, Math.sin(time * 0.3 + seed) * 0.25, 0);
}

function animatePigeon(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones;
  mesh.position.y = a.z ?? PIGEON_STAND_Y;
  if (a.state === 'ground') {
    setWings(ud, 1, -0.12, 0, 1);
    const walking = a.speed > 0.05;
    const s = (a.stride || 0) * 22;
    b.head.position.x = b.head.userData.rest.x + (walking ? Math.max(0, Math.sin(s)) * 0.025 : 0);
    b.head.rotation.z = -(a.peck || 0) * 0.9;
    b.body.rotation.set(0, 0, walking ? 0.1 : -(a.peck || 0) * 0.35 + 0.1);
    b.body.position.y = walking ? Math.abs(Math.sin(s)) * 0.008 : 0;
    return;
  }
  b.head.position.x = b.head.userData.rest.x;
  b.head.rotation.z = 0;
  b.body.position.y = 0;
  const f = Math.sin(time * 18 + a.bobSeed * 5);
  const glide = a.state === 'land' && a.z < 1.5 ? 0.5 : 0;
  setWings(ud, 1, f * 0.9 * (1 - glide) + 0.1, Math.sin(time * 18 + a.bobSeed * 5 - 0.8) * 0.4 * (1 - glide));
  b.body.rotation.set(0, 0, a.state === 'land' ? 0.3 : 0.05);
}

function animateGans(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  const walking = a.speed > 0.05;
  mesh.visible = true;
  mesh.position.y = walking ? Math.abs(Math.sin(time * (a.fleeT > 0 ? 9 : 4) + seed)) * 0.02 : 0;
  const graze = walking ? 0 : Math.max(0, Math.sin(time * 0.3 + seed * 3)) ** 0.5;
  b.head.rotation.set(0, (1 - graze) * Math.sin(time * 0.5 + seed) * 0.5, -0.9 * graze);
  b.tail.rotation.set(0, walking ? Math.sin(time * 6 + seed) * 0.2 : 0, 0);
  b.body.rotation.set(0, 0, walking ? 0 : -0.15 * graze);
}

function animateReiger(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  mesh.visible = true;
  if (a.state === 'fly') {
    mesh.position.y = (a.z || 0) + 0.5;
    b.body.rotation.set(0, 0, 0.35);
    b.head.rotation.set(0, 0, -0.5 + Math.sin(time * 9 + seed) * 0.08);
    b.tail.rotation.set(0, Math.sin(time * 9 + seed) * 0.15, 0);
    return;
  }
  mesh.position.y = 0.58;   // poten: de romp hangt op 17 cm x schaal 3,4
  b.body.rotation.set(0, 0, 0);
  b.head.rotation.set(0, Math.sin(time * 0.3 + seed) * 0.4, Math.max(0, Math.sin(time * 0.15 + seed * 2)) > 0.9 ? -0.9 : 0);
  b.tail.rotation.set(0, 0, 0);
}

function animateZeehond(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  const dive = a.state === 'duik' ? Math.min(1, (a.diveT || 0) * 1.5) : 0;
  mesh.visible = dive < 0.95;
  mesh.position.y = CANAL_Y - 0.06 + Math.sin(time * 1.3 + seed) * 0.01 - 0.35 * dive;
  b.body.rotation.set(0, 0, -0.5 * dive);
  b.head.rotation.set(0, Math.sin(time * 0.5 + seed) * 0.5, 0.15 + Math.sin(time * 0.9 + seed) * 0.08);
  b.tail.rotation.set(0, Math.sin(time * 1.5 + seed) * 0.2, 0);
}

function animateVis(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  mesh.visible = true;
  mesh.position.y = CANAL_Y - 0.28 + Math.sin(time * 1.1 + seed) * 0.03;
  b.tail.rotation.set(0, Math.sin(time * (4 + a.speed * 6) + seed) * 0.5, 0);
}

function animateDuck(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  const t = a.stateAge || 0;
  let y = CANAL_Y + Math.sin(time * 1.7 + seed) * 0.008, pitch = Math.sin(time * 1.3 + seed) * 0.03;
  mesh.visible = true;
  b.head.rotation.set(0, Math.sin(time * 0.6 + seed) * 0.5, 0);
  b.tail.rotation.set(0, a.speed > 0.05 ? Math.sin(time * 6 + seed) * 0.25 : 0, 0);
  if (a.state === 'dabble') {
    const k = Math.min(1, t * 4, (a.stateTimer || 0) * 4);
    pitch = -1.25 * k;
    y -= 0.03 * k;
    b.head.rotation.set(0, 0, -0.4 * k);
    b.tail.rotation.set(0, Math.sin(time * 9) * 0.3 * k, 0);
  } else if (a.state === 'dive') {
    const k = Math.min(1, t * 3);
    pitch = -0.8 * k;
    y -= 0.5 * k;
    mesh.visible = k < 0.9;
  } else if (a.state === 'preen') {
    b.head.rotation.set(0, 2.2 + Math.sin(time * 5) * 0.2, -0.3);
  }
  mesh.position.y = y;
  b.body.rotation.set(Math.sin(time * 1.1 + seed) * 0.04, 0, pitch);
}

function animateQuad(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones, P = ud.quad;
  const seed = a.bobSeed || 0;
  const speed = a.speed || 0;
  const moving = speed > 0.05;
  const legLen = P.leg + P.hh * 0.4;
  const phase = (a.stride || 0) / (legLen * 2.2) * Math.PI * 2;
  const run = Math.min(1, speed / 3);
  mesh.position.y = 0;
  b.body.position.copy(b.body.userData.rest);
  b.body.rotation.set(0, 0, 0);
  for (const l of ud.legs) l.rotation.set(0, 0, 0);
  b.head.rotation.set(0, 0, 0);
  const sitting = a.kind === 'cat' && (a.state === 'sit' || a.state === 'groom');
  if (sitting) {
    b.body.rotation.z = 0.55;
    b.body.position.y -= P.leg * 0.45;
    b.body.position.x -= P.len * 0.12;
    ud.legs[0].rotation.z = -0.55;
    ud.legs[1].rotation.z = -0.55;
    ud.legs[2].rotation.z = 0.9;
    ud.legs[3].rotation.z = 0.9;
    if (a.state === 'groom') {
      b.head.rotation.set(0.3, 0.4, -0.6 + Math.sin(time * 6) * 0.15);
      ud.legs[0].rotation.z = 0.9 + Math.sin(time * 6) * 0.25;
    } else b.head.rotation.set(0, Math.sin(time * 0.4 + seed) * 0.7, -0.4 + Math.sin(time * 0.3) * 0.08);
    b.tail.rotation.set(Math.sin(time * 1.5 + seed) * 0.5, 0, -1.2);
    return;
  }
  if (moving) {
    walkLegs(ud, phase, 0.45 + run * 0.35);
    b.body.position.y += Math.abs(Math.sin(phase)) * 0.015 * (1 + run * 2);
    b.body.rotation.z = Math.sin(phase * 2) * 0.03 * run;
  }
  const sniff = a.kind === 'dog' && a.sniff > 0 && !moving;
  b.head.rotation.set(0, moving ? 0 : Math.sin(time * 0.5 + seed) * 0.5, sniff ? -0.7 + Math.sin(time * 9) * 0.05 : moving ? Math.sin(phase * 2) * 0.05 : 0);
  const wag = a.kind === 'dog' ? Math.sin(time * (moving ? 12 : 16) + seed) * 0.6 : Math.sin(time * 1.2 + seed) * 0.3;
  b.tail.rotation.set(wag, 0, a.kind === 'cat' && a.state === 'flee' ? -0.5 : 0);
}

function updateLeash(mesh, a) {
  const leash = mesh.userData.leash;
  if (!leash) return;
  const o = a.owner;
  if (!o || a.state === 'stray') { leash.visible = false; return; }
  leash.visible = true;
  const ca = Math.cos(o.angle), sa = Math.sin(o.angle);
  const hx = o.x + ca * 0.2 + sa * 0.3, hy = o.y + sa * 0.2 - ca * 0.3;
  const dx = hx - a.x, dz = hy - a.y, dy = 0.78 - mesh.position.y;
  const c = Math.cos(a.angle), s = Math.sin(a.angle);
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  const col = mesh.userData.collar;
  _v.set(lx - col.x, dy - col.y, lz - col.z);
  const len = _v.length() || 0.01;
  leash.position.copy(col);
  leash.quaternion.setFromUnitVectors(_up, _v.divideScalar(len));
  leash.scale.set(1, len, 1);
}

// Seagulls/pigeons flap, glide and land; ducks bob, dabble and dive; cats
// sit, groom and slink; dogs trot, sniff and wag; grazers step and graze.
export function animateWildlifeMesh3D(mesh, a, time) {
  const ud = mesh.userData;
  if (a.dead) { poseDeadAnimal(mesh, a); return; }
  switch (a.kind) {
    case 'seagull': animateSeagull(mesh, a, time); return;
    case 'pigeon': animatePigeon(mesh, a, time); return;
    case 'duck': animateDuck(mesh, a, time); return;
    case 'gans': animateGans(mesh, a, time); return;
    case 'reiger': animateReiger(mesh, a, time); return;
    case 'zeehond': animateZeehond(mesh, a, time); return;
    case 'vis': animateVis(mesh, a, time); return;
    case 'cat': animateQuad(mesh, a, time); return;
    case 'dog': animateQuad(mesh, a, time); updateLeash(mesh, a); return;
  }
  if (!ud.bones) return;
  const seed = a.bobSeed || 0;
  const walking = a.speed > 0.05;
  const b = ud.bones;
  mesh.position.y = 0;
  const phase = (a.stride || 0) * (a.kind === 'cow' ? 3.2 : 5);
  if (walking) walkLegs(ud, phase, 0.28);
  else for (const l of ud.legs) l.rotation.z *= 0.9;
  b.body.position.y = b.body.userData.rest.y + (walking ? Math.abs(Math.sin(phase)) * 0.02 : 0);
  const grazeT = walking ? 0 : Math.max(0, Math.sin(time * 0.25 + seed * 3)) ** 0.5;
  const chew = walking ? 0 : Math.sin(time * 5 + seed) * 0.04 * grazeT;
  b.body.rotation.z = -0.06 * grazeT;
  b.head.rotation.set(0, (1 - grazeT) * Math.sin(time * 0.4 + seed) * 0.35, -ud.grazeDip * grazeT + chew + (walking ? Math.sin(phase * 2) * 0.05 : 0));
  if (ud.tail) b.tail.rotation.set(Math.sin(time * 1.8 + seed) * 0.35 + (Math.sin(time * 0.37 + seed) > 0.8 ? Math.sin(time * 9) * 0.3 : 0), 0, 0);
}
