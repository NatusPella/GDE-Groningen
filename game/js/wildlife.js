import { aandeel, minAfstand } from './coopfoci.js';
import { hoofdspeler, naasteSpeler, voorElkeSpeler } from './spelersregister.js';
import { dist, angleLerp, pointInPolygon, SeededRng, isInWater, WATER_Y } from './util.js';
import { waterPolyAt, waterNearby, BRIDGE_DRY } from './waterlevels.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pigeonBoneParts, mergePigeonGeometries } from './pigeonmodel.js';
import { buildAnimalModel, animateAnimalModel, preloadAnimalModels } from './animalmodels.js';
import { spawnProvinceAnimals, updateProvinceAnimal, queueAnimalHit } from './provinceanimals.js';
import { animalLods, setupSkinnedLods, updateSkinnedLod } from './meshlod.js';
import { buildFishModel, animateFishModel } from './fishmodels.js';
import { dsWereld } from './worldpalette.js';
import { SkinBuilder, vcMaterial, composeMatrix, tubeGeometry, loftGeometry, markShared } from './pixelart3d.js';
import { setLeashHolder, setPeopleWeather } from './models3d_people.js';
import { resolveWalker } from './collision.js';
import { vehiclesNear } from './vehicleindex.js';
import { pushCircleOutOfVehicle, vehicleHitBody } from './vehicle.js';
import { splatterAnimal, GIB_SPEED } from './gore3d.js';
import { MODS } from './cheatmods.js';
import { buildingAt } from './tileplace.js';
import { onRoadway } from './wegvlak.js';
import { streekAt } from './regioleven.js';
import { wildlifeLimits, fleeFrom, STREEK_MIX } from './dierenplan.js';
import { maxDierSchaal } from './dierschaal.js';
import { getSettings } from './settings.js';
import { dierVanKind, ONTDEK_M, SET_DIEREN, biotoopVanPlek, veeVoorPlek } from './dierenregister.js';
import { urbanWeight } from './provinceworld.js';
import { inBebouwdeKom } from './worldplaces.js';
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
        // one in three lies on the shore (close to the water) and crawls back into the water when scared
        const land = rng() < 0.34 && randomOpenPointNear(map, spot.x, spot.y, 1.5, 5, rng);
        if (land) out.push({ kind: 'zeehond', x: land[0], y: land[1], angle: Math.atan2(y - land[1], x - land[0]) + Math.PI + (rng() - 0.5), speed: 0, poly: spot.poly, state: 'kant', bobSeed: rng() * Math.PI * 2, wanderTarget: { x, y }, waypointTimer: 0 });
        else out.push({ kind: 'zeehond', x, y, angle: rng() * Math.PI * 2, speed: 0, poly: spot.poly, state: 'rust', bobSeed: rng() * Math.PI * 2, wanderTarget: { x, y }, waypointTimer: 3 + rng() * 6 });
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
    const bobSeed = rng() * Math.PI * 2;
    return [{
      kind: 'cat', variant: Math.floor(rng() * 4), x, y, angle: Math.atan2(ny, nx), speed: 0,
      wanderTarget: { x, y }, state: 'sit', stateTimer: 6 + rng() * 14, bobSeed,
      tam: Math.floor(bobSeed * 100) % 10 < 6,   // #437: een tamme kat blijft zitten als je rustig komt, je kunt hem aaien
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
  if (typeof window !== 'undefined' && typeof fetch === 'function') preloadAnimalModels();   // the province animals (small json files, game/models/dieren)
}

function releaseAnimal(a) {
  if (a.kind === 'dog' && a.owner) setLeashHolder(a.owner._lookSeed, false);
}

// focus: een losse groep spelers (samen spelen, spelers uit elkaar, #429, coopfoci.js); n = het aantal foci, die delen het totaalbudget
function maintain(world, focus = null, n = 1) {
  const list = world.wildlife;
  const { map } = world;
  const player = focus || hoofdspeler(world);
  const lokaal = n > 1, hier = (a) => dist(a.x, a.y, player.x, player.y) <= DESPAWN_DIST;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (a.gone || (lokaal ? minAfstand(world.coopFoci, a.x, a.y) : dist(a.x, a.y, player.x, player.y)) > DESPAWN_DIST) {
      releaseAnimal(a);
      list.splice(i, 1);
    }
  }
  const streek = streekAt(player.x, player.y);
  const streekId = streek ? streek.id : 'stad';
  // #330: vee hoort op weide en dijk. Wie de bebouwde kom in komt (of de stad in rijdt), laat het achter.
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if ((a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'gans') && (!lokaal || hier(a)) && biotoopVanPlek(streekId, urbanWeight(a.x, a.y), inBebouwdeKom(a.x, a.y)) === 'stad') list.splice(i, 1);
  }
  const LIMITS = wildlifeLimits(streekId, getSettings().quality, BASE_LIMITS);   // #193
  if (lokaal) for (const k of Object.keys(LIMITS)) LIMITS[k] = Math.ceil(LIMITS[k] * aandeel(n)); // de foci delen het budget
  const count = { seagull: 0, grazer: 0, duck: 0, pigeon: 0, cat: 0, dog: 0, reiger: 0, zeehond: 0, vis: 0, ree: 0, vos: 0, wolf: 0, ezel: 0, alpaca: 0, varken: 0, haas: 0 };
  for (const a of list) if (!lokaal || hier(a)) count[a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'gans' ? 'grazer' : a.kind]++;
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
  const biotoop = green ? biotoopVanPlek(streekId, urbanWeight(green.x, green.y), inBebouwdeKom(green.x, green.y)) : null;
  const vee = green ? veeVoorPlek(streekId, biotoop, ((world.clock % 24) + 24) % 24, rng()) : null;   // #330: nooit in de bebouwde kom
  if (vee === 'gans') {
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n && count.grazer + k < LIMITS.grazer; k++) { const gx = green.x + (rng() - 0.5) * 3, gy = green.y + (rng() - 0.5) * 3; if (openGround(map, gx, gy)) list.push(newGrazer('gans', gx, gy, rng)); }
    return;
  }
  if (vee) {
    const herd = vee === 'sheep' ? 1 + Math.floor(rng() * 2) : 1;
    for (let k = 0; k < herd && count.grazer + k < LIMITS.grazer; k++) if (openGround(map, green.x + k * 1.5, green.y + k * 0.8)) list.push(newGrazer(vee, green.x + k * 1.5, green.y + k * 0.8, rng));
  }
  if (waterClose) list.push(...spawnWaterLife(map, player, streekId, count, getSettings().quality, rng));
  for (const p of spawnProvinceAnimals(spawnCtx(world, player, streekId, rng), count)) list.push(p);   // ree, vos, wolf, erfdieren (provinceanimals.js)
  if (count.duck < LIMITS.duck - 1 && waterClose) list.push(...spawnDucks(map, player.x, player.y, rng));
  if (count.pigeon < LIMITS.pigeon * MODS.pigeons - 5) list.push(...spawnPigeonFlock(map, player.x, player.y, rng));
  if (count.cat < LIMITS.cat && rng() < 0.35) list.push(...spawnCat(map, player.x, player.y, rng));
  if (!focus && count.dog < LIMITS.dog && rng() < 0.5) list.push(...spawnDog(world, rng));
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

// Wie de dieren om zich heen hebben: de dichtstbijzijnde speler (#446), als lichaam met x, y en inVehicle. Een meespeler
// komt van het netwerk en heeft geen eigen voertuig hier: die telt als loper op zijn plek.
function naasteLichaam(world, x, y) {
  const r = naasteSpeler(world, x, y);
  return r && r.entiteit ? r.entiteit : r;
}

// Koe en schaap: stappen weg van een speler of voertuig dat te dichtbij komt, geen paniek.
export function updateHerd(a, dt, world) {
  if (!(a.fleeT > 0)) {
    const f = fleeFrom(a.kind === 'cow' ? 'koe' : 'schaap', a.x, a.y, moverOf(naasteLichaam(world, a.x, a.y)));
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
    const f = fleeFrom('reiger', a.x, a.y, moverOf(naasteLichaam(world, a.x, a.y)));
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

// Seal: rests in the water or lies on the shore; when scared it dives away (invisible for a while, then gone). On the shore it
// first crawls to the water (wanderTarget is a point in the water) and dives there.
function updateZeehond(a, dt, world) {
  if (a.state === 'duik') { a.diveT += dt; if (a.diveT > 2.5) a.gone = true; return; }
  if (a.state === 'naarWater') {
    a.speed = 1.1;
    steer(a, a.wanderTarget.x, a.wanderTarget.y, 3, dt);
    if (pointInPolygon(a.x, a.y, a.poly.pts) || dist(a.x, a.y, a.wanderTarget.x, a.wanderTarget.y) < 0.5) { a.state = 'duik'; a.diveT = 0; a.speed = 0; }
    return;
  }
  if (a.state === 'kant') {
    a.speed = 0;
    if (fleeFrom('zeehond', a.x, a.y, moverOf(naasteLichaam(world, a.x, a.y)))) a.state = 'naarWater';
    return;
  }
  const f = fleeFrom('zeehond', a.x, a.y, moverOf(naasteLichaam(world, a.x, a.y)));
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
  const f = fleeFrom('vis', a.x, a.y, moverOf(naasteLichaam(world, a.x, a.y)));
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
  const pl = naasteLichaam(world, a.x, a.y);
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

// Een kat hoort niet in het water (#436): is hij er toch in geduwd, dan
// scharrelt hij naar de dichtstbijzijnde droge kant en schudt zich daar uit.
// Geeft true als de kat in het water zat (en deze stap dus voor de kant was).
export function stepKatUitWater(a, dt, map, rng = Math.random) {
  if (!isInWater(map, a.x, a.y)) return false;
  a.state = 'flee';
  a.stateTimer = 4;
  if (!(a.waterTarget && openGround(map, a.waterTarget[0], a.waterTarget[1]))) a.waterTarget = randomOpenPointNear(map, a.x, a.y, 2, 24, rng);
  const spot = a.waterTarget;
  if (!spot) { a.speed = 0; return true; }
  const ang = Math.atan2(spot[1] - a.y, spot[0] - a.x);
  a.angle = angleLerp(a.angle, ang, Math.min(1, dt * 8));
  a.speed = 2.4;
  a.x += Math.cos(a.angle) * a.speed * dt;
  a.y += Math.sin(a.angle) * a.speed * dt;
  if (!isInWater(map, a.x, a.y)) { a.waterTarget = null; a.state = 'sit'; a.stateTimer = 2.5; a.speed = 0; }
  return true;
}

function updateCat(a, dt, world) {
  const { player, map } = world;
  if (stepKatUitWater(a, dt, map)) return;
  a.stateTimer -= dt;
  const pd = dist(a.x, a.y, player.x, player.y);
  const tamRust = (a.tam && playerSpeed(player) < 2.5 && pd >= 0.4) || a.aaiT > 0;   // #437: rustig dichtbij komen mag bij een tamme kat
  if (a.state !== 'flee' && !tamRust && (pd < 2 || (pd < 6 && playerSpeed(player) > 4))) {
    a.state = 'flee';
    a.stateTimer = 2.5;
    const away = Math.atan2(a.y - player.y, a.x - player.x);
    a.wanderTarget = { x: a.x + Math.cos(away) * 12, y: a.y + Math.sin(away) * 12 };
  }
  if (a.aaiT > 0) {   // wordt geaaid (aaien.js): blijft zitten en kijkt naar de speler
    a.aaiT -= dt;
    a.state = 'sit';
    a.speed = 0;
    a.stateTimer = Math.max(a.stateTimer, 1.5);
    a.angle = angleLerp(a.angle, Math.atan2(player.y - a.y, player.x - a.x), Math.min(1, dt * 4));
    return;
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
  if (a.state === 'loose') {
    // losgebroken (straatgebeurtenis, streeteventlive.js): rent naar looseTarget, het baasje erachteraan; daarna weer aan de riem
    a.speed += ((a.looseSpeed || 4.2) - a.speed) * Math.min(1, dt * 4);
    if (a.looseTarget) steer(a, a.looseTarget.x, a.looseTarget.y, 5, dt);
    return;
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
  if (a.aaiT > 0) { a.aaiT -= dt; a.sniff = 0; }   // wordt geaaid (aaien.js): staat even stil
  const want = a.aaiT > 0 || (a.sniff > 0 && d < 1.6) ? 0 : Math.min(4.5, (o.speed || 0) + Math.max(0, d - 0.2) * 1.5);
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
  const p = hoofdspeler(world);
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
  setPeopleWeather(world.weather ? world.weather.intensity : 0, world.weather && world.weather.summer ? world.weather.summer.sunglasses : 0);
  maintainTimer -= dt;
  if (maintainTimer <= 0) {
    maintainTimer = MAINTAIN_INTERVAL;
    const foci = world.coopFoci && world.coopFoci.length > 1 ? world.coopFoci : null;
    maintain(world, null, foci ? foci.length : 1);
    if (foci) for (const f of foci) if (!f.host) maintain(world, f, foci.length);
  }
  for (const a of list) {
    if (a.dead) {
      if (world.time - a.deadAt > CARCASS_S) a.gone = true;
      continue;
    }
    if (a.ontvoerd) continue;   // #333: de schotel heeft dit schaap (schaapontvoeringrt.js), het loopt niet meer
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
      case 'ree': case 'vos': case 'wolf': case 'ezel': case 'alpaca': case 'varken': case 'haas': updateProvinceAnimal(a, dt, provinceCtx(world)); break;
      default: updateHerd(a, dt, world);
    }
    keepOffRoad(a, dt, world);
    groundContacts(a, world);
    if (WATCH_KINDS.has(a.kind)) zetBlik(a, naasteLichaam(world, a.x, a.y));
  }
}

// The helpers the province animals use (provinceanimals.js), made once per world: no new objects per animal per frame.
function spawnCtx(world, player, streekId, rng) {
  const { map } = world;
  return {
    map, player, streekId, rng, hour: ((world.clock % 24) + 24) % 24,
    greenPoint: (rMin, rMax) => layerPointNear(map, 'greenNear', player.x, player.y, rng, rMin, rMax),
    openGround: (x, y) => openGround(map, x, y), urbanAt: (x, y) => urbanWeight(x, y), inKom: (x, y) => inBebouwdeKom(x, y),
    message: (t) => { if (world.addMessage) world.addMessage(t, 3); },
  };
}
let _pctx = null, _pctxWorld = null;
function provinceCtx(world) {
  if (_pctxWorld === world) return _pctx;
  _pctxWorld = world;
  _pctx = {
    world, rng: Math.random,
    nearest: (a) => naasteLichaam(world, a.x, a.y),
    mover: (a) => moverOf(naasteLichaam(world, a.x, a.y)),
    steer: (a, tx, ty, turn, dt) => steer(a, tx, ty, turn, dt),
    openGround: (x, y) => openGround(world.map, x, y),
    playersNear: (a, r) => { const b = naasteLichaam(world, a.x, a.y); return !!b && dist(a.x, a.y, b.x, b.y) < r; },
    prey: (a, r) => {
      let best = null, bd = r;
      for (const o of world.wildlife) if ((o.kind === 'sheep' || o.kind === 'cow' || o.kind === 'gans') && !o.gone && !o.dead && !o.ontvoerd) { const d = dist(a.x, a.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
      return best;
    },
    message: (t) => { if (world.addMessage) world.addMessage(t, 3); },
    // only this device's player takes the bite here; a guest takes it in its own game (coopextra3d.js)
    bite: (body, damage) => { if (body === hoofdspeler(world)) queueAnimalHit(world, damage); }, // hoofdspeler valt zelf terug op world.player
  };
  return _pctx;
}

// Een dier dat de speler van dichtbij ziet draait zijn kop mee (animatie): a.watch is de hoek van de speler ten opzichte van de neus
// van het dier, of null als er niemand in de buurt is. Per dier een paar vermenigvuldigingen, geen nieuwe objecten.
const WATCH_KINDS = new Set(['cow', 'sheep', 'cat', 'dog', 'pigeon', 'seagull', 'gans', 'zeehond', 'haas']);
export function zetBlik(a, p, straal = 11) {
  if (!p || a.dead) { a.watch = null; return; }
  const dx = p.x - a.x, dy = p.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > straal * straal) { a.watch = null; return; }
  a.watchD2 = d2;
  let w = Math.atan2(dy, dx) - a.angle;
  w -= Math.PI * 2 * Math.round(w / (Math.PI * 2));
  a.watch = w;
}

// A ground animal that ends up on a carriageway or a junction anyway (a flock landing, a flight from a car, a shove) leaves:
// no animal stands in the traffic (#334). Looked at a few times a second.
const OFF_ROAD = new Set(['cat', 'pigeon', 'cow', 'sheep', 'gans', 'ree', 'vos', 'ezel', 'alpaca', 'varken', 'haas']);
function keepOffRoad(a, dt, world) {
  if (!OFF_ROAD.has(a.kind) || (a.kind === 'pigeon' && a.state !== 'ground')) return;
  a.roadT = (a.roadT || 0) - dt;
  if (a.roadT > 0) return;
  a.roadT = 0.3 + Math.random() * 0.2;
  if (onRoadway(world.map, a.x, a.y, 0.1)) a.gone = true;
}

// Animals on the ground are bodies like any walker: walls and posts stop
// them, cars shove them aside (and scare them off), the player bumps them.
const GROUND_RADIUS = { grazer: 0.5, gans: 0.22, cat: 0.2, dog: 0.25, pigeon: 0.1, seagull: 0.15, ree: 0.3, vos: 0.2, haas: 0.15, wolf: 0.3, ezel: 0.45, alpaca: 0.4, varken: 0.4 };
const _nearVeh = []; // #653: hergebruikte kandidatenlijst
function groundContacts(a, world) {
  if (a.kind === 'duck' || a.kind === 'vis' || a.kind === 'zeehond' || a.gone) return;
  if ((a.kind === 'pigeon' || a.kind === 'seagull' || a.kind === 'reiger') && a.state !== 'ground' && a.state !== 'stand') return;
  const r = GROUND_RADIUS[a.kind] || 0.3;
  let moved = a.speed > 0;
  // #653: buren uit de index; de checks blijven gelijk
  for (const v of vehiclesNear(world, a.x, a.y, 16, _nearVeh)) {
    if (v.isBoat || v.sinking || Math.abs(v.x - a.x) > v.halfLen + 1 || Math.abs(v.y - a.y) > v.halfLen + 1) continue;
    const push = pushCircleOutOfVehicle(a.x, a.y, r, v);
    if (!push) continue;
    // birds are gore3d's poofBirds; everything else on four legs goes under
    if (a.kind !== 'pigeon' && a.kind !== 'seagull' && a.kind !== 'reiger' && runOverAnimal(world, a, v)) return;
    a.x = push.x; a.y = push.y;
    moved = true;
    if (Math.abs(v.speed) > 1) scareOff(a, world, v.x, v.y);
  }
  // elke speler duwt een dier opzij, ook een meespeler (#446)
  voorElkeSpeler(world, (rec) => {
    const p = rec.entiteit;
    if (!p || p.inVehicle || p.water) return;
    const dx = a.x - p.x, dy = a.y - p.y, min = r + (p.radius || 0.35), d2 = dx * dx + dy * dy;
    if (d2 < min * min && d2 > 1e-8) {
      const d = Math.sqrt(d2);
      a.x = p.x + dx / d * min; a.y = p.y + dy / d * min;
      moved = true;
    }
  });
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

// The fish in the canals and ditches: the fish of the fish book (fishmodels.js) at their real length, chosen by the animal's seed:
// mostly roach, perch and bream, some carp, now and then a pike or an eel. Seed 0 is a perch (the register's model).
const CANAL_FISH = [['baars', 0.22], ['voorn', 0.3], ['brasem', 0.18], ['karper', 0.12], ['snoek', 0.1], ['paling', 0.08]];
export function canalFishSpecies(seed) {
  let r = ((Math.abs(seed) * 7.13) % 1 + 1) % 1;
  for (const [id, w] of CANAL_FISH) { if (r < w) return id; r -= w; }
  return 'voorn';
}
export const buildCanalFishMesh3D = (seed = 0) => buildFishModel(canalFishSpecies(seed));

// The register's builder for the province animals (dierenregister.js model.fn).
export const buildProvinceAnimalMesh3D = (id) => buildAnimalModel(id);

// --- 3D models (1 unit = 1 m, facing +X) --------------------------------------
// Every animal is one SkinnedMesh on a small rig, with geometry cached per
// kind/variant and one material shared by all of them.

const MAT = markShared(vcMaterial({ roughness: 0.92 }));
const PIGEON_MAT = markShared(vcMaterial({ roughness: 0.9, flatShading: false })); // de duif is glad, de andere dieren zijn gefacetteerd
const geoCache = new Map();
function cachedGeo(key, build) {
  let g = geoCache.get(key);
  if (!g) {
    g = markShared(build());
    g.name = key;   // the LOD register (lodregistry.js) knows the model by this name
    geoCache.set(key, g);
  }
  return g;
}

function makeRig(spec) {
  const bones = [], byName = {}, abs = {};
  for (const [name, parent, x, y, z] of spec) {
    const b = new THREE.Bone();
    b.name = name;   // named bones: tools and tests can tell the head and the tail from the body (scripts/lib/diermaat.mjs)
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

function assemble(geometry, spec, radius, cy, material = MAT) {
  const group = new THREE.Group();
  const rig = makeRig(spec);
  group.add(rig.bones[0]);
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, cy, 0), radius);
  group.add(mesh);
  group.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(rig.bones));
  group.userData.bones = rig.byName;
  for (const b of rig.bones) b.userData.rest = b.position.clone();
  group.userData.lod = withLods(mesh);
  return group;
}

// Mesh LODs for every animal built here (meshlod.js): the cluster levels are made once per shared geometry and shared too.
const lodCache = new WeakMap();
export function withLods(skinned) {
  let geos = lodCache.get(skinned.geometry);
  if (!geos) {
    const g = skinned.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const sz = g.boundingBox.getSize(new THREE.Vector3());
    geos = animalLods(g, Math.max(sz.x, sz.y, sz.z), g.name || 'dier');
    for (const x of geos) markShared(x);
    lodCache.set(g, geos);
  }
  return setupSkinnedLods(skinned, geos);
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

// De meeuw is het middelniveau van het duivenmodel in zijn meeuwkleuren (wit, grijze vleugels met zwarte toppen, gele snavel) met lange poten en
// vleugels (pigeonmodel.js, kind 'gull') op een skelet met een binnen- en buitenbot per vleugel.
const GULL_K = 1.05;
const GULL_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.19 * GULL_K, 0.115 * GULL_K, 0],
  ['wingLi', 'body', 0.035 * GULL_K, 0.055 * GULL_K, 0.055 * GULL_K],
  ['wingLo', 'wingLi', 0.035 * GULL_K, 0.055 * GULL_K, 0.245 * GULL_K],
  ['wingRi', 'body', 0.035 * GULL_K, 0.055 * GULL_K, -0.055 * GULL_K],
  ['wingRo', 'wingRi', 0.035 * GULL_K, 0.055 * GULL_K, -0.245 * GULL_K],
  ['legs', 'body', 0.02 * GULL_K, -0.075 * GULL_K, 0],
  ['tail', 'body', -0.15 * GULL_K, 0.012 * GULL_K, 0],
];

// het skelet van een duiventype: de botnamen van de delen van pigeonBoneParts vertaald naar de botten van de spec
function pigeonSkinGeometry(spec, opts, k, names, lod = 'mid') {
  const I = boneIndex(spec);
  const list = pigeonBoneParts(lod, { ...opts, map: dsWereld }, k).map(({ bone, geo }) => {
    const bi = I[names[bone] || bone] ?? I.body;
    const n = geo.attributes.position.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    return geo;
  });
  const g = mergePigeonGeometries(list);
  for (const x of list) x.dispose();
  return g;
}

function seagullGeometry(lod) {
  return pigeonSkinGeometry(GULL_SPEC, { kind: 'gull', legScale: 1.7 }, GULL_K, { wingL: 'wingLi', wingOutL: 'wingLo', wingR: 'wingRi', wingOutR: 'wingRo', leg: 'legs' }, lod);
}

// lod: 'mid' voor de wereld, 'hi' voor een filmpje of een voorbeeldweergave van dichtbij (pigeonmodel.js)
export function buildSeagullMesh3D(lod = 'mid') {
  const group = assemble(cachedGeo('gull' + lod, () => seagullGeometry(lod)), GULL_SPEC, 0.8, 0, PIGEON_MAT);
  const b = group.userData.bones;
  b.wingLi.userData.sign = 1;
  b.wingRi.userData.sign = -1;
  group.userData.wings = [b.wingLi, b.wingRi];
  group.userData.foldShift = 0.06;
  group.userData.foldLift = -0.02;
  group.userData.foldZ = -0.3;
  group.userData.head = b.head;
  return group;
}

// --- cow ---

const COW_WHITE = 0xe9e6de;
const COW_BLACK = 0x1f1e1d;
const COW_RED = 0x7a3520;
const COW_PINK = 0xd9a7a0;
const COW_HOOF = 0x2a2622;

// De wereldpositie van een punt in het lokale stelsel van een kop (de matrix H van de geometrie): de draaipunten van de oorbotten.
const _pv = new THREE.Vector3();
const earPivot = (H, x, y, z) => { _pv.set(x, y, z).applyMatrix4(H); return [_pv.x, _pv.y, _pv.z]; };
const COW_H = composeMatrix(0.62, 1.08, 0, 0, 0, -0.45).multiply(composeMatrix(0.1, 0, 0));
const COW_SPEC = [
  ['body', null, 0, 1.05, 0],
  ['head', 'body', 0.62, 1.08, 0],
  ['tail', 'body', -0.88, 1.28, 0],
  ['legFL', 'body', 0.55, 0.95, 0.19],
  ['legFR', 'body', 0.55, 0.95, -0.19],
  ['legBL', 'body', -0.6, 0.95, 0.2],
  ['legBR', 'body', -0.6, 0.95, -0.2],
  ['earL', 'head', ...earPivot(COW_H, 0.3, 0.1, 0.1)],
  ['earR', 'head', ...earPivot(COW_H, 0.3, 0.1, -0.1)],
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
    B.bone = I[s > 0 ? 'earL' : 'earR'];
    B.geo(new THREE.BoxGeometry(0.1, 0.04, 0.16), hm(0.3, 0.1, s * 0.17, s * 0.4, 0, 0), dark);
    B.geo(new THREE.BoxGeometry(0.06, 0.012, 0.09), hm(0.3, 0.085, s * 0.19, s * 0.4, 0, 0), COW_PINK);   // de binnenkant van het oor
    if (s > 0) B.geo(new THREE.BoxGeometry(0.03, 0.012, 0.035), hm(0.3, 0.123, s * 0.2, s * 0.4, 0, 0), 0xe0c030);   // het oormerk van de boer
    B.bone = I.head;
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
  group.userData.earMode = 'plat';
  return group;
}

// --- sheep ---

const SHEEP_WOOL = 0xdcd6c6;
const SHEEP_DARK = 0x2a2624;
// Vier soorten schaap, zodat een kudde niet uit klonen bestaat: de wit-met-zwart-gezicht van altijd, een crèmekleurige met een witte kop en poten (Texelaar),
// een grijsbruine (Drents heideschaap) en een donkere met licht gezicht. wol: [vlak, rand, onderkant]; kop en poten: donker.
export const SHEEP_LOOKS = [
  { wol: [0xdcd6c6, 0xcfc8b6, 0xc9c1ae], donker: 0x2a2624, hoef: 0x151312 },
  { wol: [0xece4cc, 0xdfd6bb, 0xd4cab0], donker: 0xe6ded0, hoef: 0x4a4038 },
  { wol: [0x9c8f7c, 0x8a7d6a, 0x7d715f], donker: 0x4a3f36, hoef: 0x1c1816 },
  { wol: [0x6e655b, 0x5f574e, 0x544d45], donker: 0xcfc6b6, hoef: 0x2a2624 },
];
export const SHEEP_VARIANTEN = SHEEP_LOOKS.length;
// Het soort schaap uit een zaad (0..1); een ongeldig zaad geeft de eerste soort.
export const sheepVariantOf = (seed) => (Number.isFinite(seed) ? Math.floor(Math.abs(seed) * 1000) % SHEEP_VARIANTEN : 0);

const SHEEP_SPEC = [
  ['body', null, 0, 0.62, 0],
  ['head', 'body', 0.36, 0.66, 0],
  ['tail', 'body', -0.5, 0.66, 0],
  ['legFL', 'body', 0.3, 0.46, 0.13],
  ['legFR', 'body', 0.3, 0.46, -0.13],
  ['legBL', 'body', -0.3, 0.46, 0.13],
  ['legBR', 'body', -0.3, 0.46, -0.13],
  ['earL', 'head', ...earPivot(composeMatrix(0.36, 0.66, 0, 0, 0, -0.35).multiply(composeMatrix(0.1, 0, 0)), 0.06, 0.05, 0.08)],
  ['earR', 'head', ...earPivot(composeMatrix(0.36, 0.66, 0, 0, 0, -0.35).multiply(composeMatrix(0.1, 0, 0)), 0.06, 0.05, -0.08)],
];

function woolBlob(B, x, y, z, sx, sy, sz, seed, detail = 1, wol = SHEEP_LOOKS[0].wol) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    const j = 1 + (Math.sin(Math.round(vx * 40) * 12.9898 + Math.round(vy * 40) * 78.233 + Math.round(vz * 40) * 37.719 + seed) * 43758.5453 % 1) * 0.12;
    p.setXYZ(i, vx * sx * j + x, vy * sy * j + y, vz * sz * j + z);
  }
  B.geo(g, null, (cx, cy, cz) => ((Math.round(cx * 17 + cy * 23 + cz * 29) & 3) === 0 ? wol[1] : cy < 0.5 ? wol[2] : wol[0]));
}

function sheepGeometry(variant = 0) {
  const L = SHEEP_LOOKS[variant] || SHEEP_LOOKS[0], wol = L.wol, SHEEP_DARK = L.donker;
  const I = boneIndex(SHEEP_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  woolBlob(B, 0, 0.66, 0, 0.5, 0.26, 0.29, 1, 1, wol);
  for (const [x, y, z, s] of [[0.22, 0.8, 0.1, 0.14], [0.2, 0.8, -0.1, 0.13], [-0.18, 0.84, 0.08, 0.15], [-0.2, 0.82, -0.1, 0.14], [0.02, 0.9, 0, 0.16], [-0.38, 0.72, 0, 0.15]]) {
    woolBlob(B, x, y, z, s, s * 0.85, s, x * 7 + z * 3, 0, wol);
  }
  for (const [name, x, z] of [['legFL', 0.3, 0.13], ['legFR', 0.3, -0.13], ['legBL', -0.3, 0.13], ['legBR', -0.3, -0.13]]) {
    B.bone = I[name];
    B.geo(loftGeometry([{ y: 0.05, d: 0.026, w: 0.026 }, { y: 0.25, d: 0.03, w: 0.028 }, { y: 0.5, d: 0.045, w: 0.04 }], 5), composeMatrix(x, 0, z), SHEEP_DARK);
    B.box(x + 0.008, 0.028, z, 0.06, 0.055, 0.055, L.hoef);
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
  B.geo(new THREE.IcosahedronGeometry(1, 0).scale(0.08, 0.06, 0.08), hm(0.03, 0.08, 0), wol[0]);
  for (const s of [1, -1]) {
    B.bone = I[s > 0 ? 'earL' : 'earR'];
    B.geo(new THREE.BoxGeometry(0.08, 0.025, 0.1), hm(0.06, 0.05, s * 0.1, 0, s * 0.3, 0), SHEEP_DARK);
    B.bone = I.head;
    B.geo(new THREE.BoxGeometry(0.02, 0.018, 0.015), hm(0.15, 0.035, s * 0.07), 0xb89a5a);
  }
  B.bone = I.tail;
  woolBlob(B, -0.52, 0.62, 0, 0.06, 0.09, 0.06, 5, 0, wol);
  return B.build();
}

// variant: 0 tot en met SHEEP_VARIANTEN - 1 (ongeldig: de eerste soort); geometrie per soort gedeeld.
export function buildSheepMesh3D(variant = 0) {
  const v = Number.isInteger(variant) && variant >= 0 && variant < SHEEP_VARIANTEN ? variant : 0;
  const group = assemble(cachedGeo('sheep' + (v ? v : ''), () => sheepGeometry(v)), SHEEP_SPEC, 0.9, 0.5);
  group.scale.setScalar(MODEL_SCALE.sheep);   // schoft 0.7 m (the wool made it too tall)
  const b = group.userData.bones;
  group.userData.head = b.head;
  group.userData.headBaseRotZ = 0;
  group.userData.legs = [b.legFL, b.legFR, b.legBL, b.legBR];
  group.userData.tail = b.tail;
  group.userData.earMode = 'plat';
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
  reiger: { body: 0x8d9aa3, back: 0x76848d, chest: 0xdfe3e4, head: 0xeceeee, bill: 0xd9a93a, ring: false, speculum: 0x4a5560, tail: 0x6b7780, scale: 1.56, neck: 0.3, legs: true },
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
  // de gevouwen vleugel langs de flank: een spitse veerplaat die richting de staart oploopt, met een lichte rand
  for (const s of [1, -1]) {
    B.geo(ellipsoid(7, 4, 0.125, 0.04, 0.014), composeMatrix(-0.05, 0.05, s * 0.086, 0, 0, 0.12), shadeHex(L.back, 0.9));
    B.geo(ellipsoid(6, 3, 0.1, 0.01, 0.016), composeMatrix(-0.06, 0.036, s * 0.088, 0, 0, 0.12), shadeHex(L.back, 1.25));
  }
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
  if (variant === 'reiger') {
    B.geo(tubeGeometry([0.13, 0.15 + nk, 0], [0.04, 0.12 + nk, 0], 0.006, 0.002, 4), null, 0x1c1f24);   // de zwarte kuif
    for (const s of [1, -1]) B.box(0.1, 0.152 + nk, s * 0.034, 0.1, 0.012, 0.006, 0x1c1f24);   // de zwarte streep boven het oog
    B.geo(tubeGeometry([0.09, 0.05, 0], [0.12, 0.1 + nk, 0], 0.012, 0.01, 4), composeMatrix(0.012, 0, 0.0), 0x4a5560);   // de donkere halsvlekken
  }
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

// --- seal (harbour seal, #193) ---
// Its own rig: torso, neck with head, hind flippers and two fore flippers. Grey with dark spots (in the vertex colour, no extra
// triangles), a light belly, big dark eyes, a muzzle with nostrils and whiskers. Built lying down: belly at y = -0.06, nose to +x.
const SEAL_SPEC = [
  ['body', null, 0, 0.1, 0],
  ['head', 'body', 0.4, 0.16, 0],
  ['tail', 'body', -0.38, 0.09, 0],
  ['flipL', 'body', 0.22, 0.03, 0.15],
  ['flipR', 'body', 0.22, 0.03, -0.15],
];
const SEAL_GREY = 0x7d8085;

function sealGeometry() {
  const I = boneIndex(SEAL_SPEC);
  const B = new SkinBuilder(1);
  const flip = 0x5c5f64;
  B.bone = I.body;
  B.geo(ellipsoid(10, 6, 0.46, 0.16, 0.2), composeMatrix(0.02, 0.1, 0), SEAL_GREY);
  B.geo(ellipsoid(8, 3, 0.42, 0.1, 0.17, Math.PI * 0.55, Math.PI * 0.45), composeMatrix(0.02, 0.085, 0), 0xb9bab2);   // light belly
  for (const s of [1, -1]) {
    B.bone = I[s > 0 ? 'flipL' : 'flipR'];
    B.geo(ellipsoid(5, 3, 0.085, 0.016, 0.042), composeMatrix(0.25, 0.01, s * 0.17, 0, s * 0.5, -0.25), flip);
  }
  B.bone = I.tail;
  B.geo(ellipsoid(8, 4, 0.2, 0.1, 0.12), composeMatrix(-0.4, 0.09, 0), SEAL_GREY);   // the hips taper off
  for (const s of [1, -1]) B.geo(ellipsoid(5, 3, 0.1, 0.014, 0.055), composeMatrix(-0.64, 0.08, s * 0.045, 0, s * 0.35, 0), flip);   // hind flippers
  B.bone = I.head;
  B.geo(ellipsoid(6, 4, 0.13, 0.115, 0.13), composeMatrix(0.42, 0.17, 0), SEAL_GREY);   // neck
  B.geo(ellipsoid(8, 6, 0.125, 0.11, 0.115), composeMatrix(0.53, 0.22, 0), 0x868a8e);   // round head
  B.geo(ellipsoid(6, 4, 0.065, 0.05, 0.07), composeMatrix(0.63, 0.195, 0), 0x9fa29f);    // muzzle
  B.box(0.69, 0.215, 0, 0.02, 0.022, 0.035, 0x1a1a1a);                                    // nose
  for (const s of [1, -1]) {
    B.box(0.698, 0.21, s * 0.012, 0.008, 0.012, 0.008, 0x0c0c0c, 0, 0, s * 0.5, 0);      // nostrils in a V
    B.geo(ellipsoid(5, 3, 0.018, 0.022, 0.012), composeMatrix(0.6, 0.255, s * 0.068), 0x0e0e10);   // big dark eyes
    B.box(0.65, 0.19, s * 0.09, 0.002, 0.026, 0.07, 0xd8d6cc, 0, 0, s * 0.45, 0);        // whiskers: one thin fan per side
  }
  const g = B.build();
  // spots: dark patches on the grey coat (the most common colour after the world palette) from a fixed noise over the
  // vertices; no extra triangles
  const p = g.attributes.position, c = g.attributes.color, counts = new Map();
  for (let i = 0; i < c.count; i++) { const k = c.getX(i) + ',' + c.getY(i) + ',' + c.getZ(i); counts.set(k, (counts.get(k) || 0) + 1); }
  const coat = [...counts].sort((u, v) => v[1] - u[1])[0][0];
  for (let i = 0; i < p.count; i++) {
    if (c.getX(i) + ',' + c.getY(i) + ',' + c.getZ(i) !== coat) continue;
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 0.1) continue;
    const n = Math.sin(x * 41.3 + z * 23.7) * Math.sin(z * 37.1 - x * 17.9 + y * 29.3);
    if (n > 0.12) c.setXYZ(i, c.getX(i) * 0.42, c.getY(i) * 0.42, c.getZ(i) * 0.46);
  }
  return g;
}
export function buildSealMesh3D() {
  const group = assemble(cachedGeo('zeehond', sealGeometry), SEAL_SPEC, 0.8, 0.15);
  group.scale.setScalar(MODEL_SCALE.zeehond);   // 1.6 m long
  group.userData.head = group.userData.bones.head;
  return group;
}
// --- fish (#193): a simple low-poly figure on the duck rig ---
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
  group.scale.setScalar(MODEL_SCALE.vis);   // 0.3 m: a roach or perch
  return group;
}

// --- pigeon ---

// De stadsduif is het middelniveau van het ene duivenmodel (pigeonmodel.js) op een skelet: romp, kop en per vleugel een binnen- en buitenbot.
const PIGEON_K = 0.64; // het model is 0,6 m van snavel tot staart; een stadsduif ca. 0,38 m
const PIGEON_VARIANTS = ['grijs', 'gevlekt', 'bruin', 0x5a5e66];
const PIGEON_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.19 * PIGEON_K, 0.115 * PIGEON_K, 0],
  ['wingL', 'body', 0.035 * PIGEON_K, 0.055 * PIGEON_K, 0.055 * PIGEON_K],
  ['wingOutL', 'wingL', 0.035 * PIGEON_K, 0.055 * PIGEON_K, 0.245 * PIGEON_K],
  ['wingR', 'body', 0.035 * PIGEON_K, 0.055 * PIGEON_K, -0.055 * PIGEON_K],
  ['wingOutR', 'wingR', 0.035 * PIGEON_K, 0.055 * PIGEON_K, -0.245 * PIGEON_K],
  ['legs', 'body', 0.02 * PIGEON_K, -0.075 * PIGEON_K, 0],
  ['tail', 'body', -0.15 * PIGEON_K, 0.012 * PIGEON_K, 0],
];

function pigeonGeometry(tone, lod) {
  return pigeonSkinGeometry(PIGEON_SPEC, { variant: PIGEON_VARIANTS[tone % PIGEON_VARIANTS.length] }, PIGEON_K, { wingL: 'wingL', wingOutL: 'wingOutL', wingR: 'wingR', wingOutR: 'wingOutR', leg: 'legs' }, lod);
}

export function buildPigeonMesh3D(tone = 0, lod = 'mid') {
  const group = assemble(cachedGeo('pigeon' + tone + lod, () => pigeonGeometry(tone, lod)), PIGEON_SPEC, 0.4, 0, PIGEON_MAT);
  const b = group.userData.bones;
  b.wingL.userData.sign = 1;
  b.wingR.userData.sign = -1;
  group.userData.wings = [b.wingL, b.wingR];
  group.userData.foldShift = 0.01;
  group.userData.foldLift = -0.013;
  group.userData.foldZ = -0.3;
  group.userData.head = b.head;
  return group;
}

// --- kip (#1101, de kippen van Bezit): een echte kip in plaats van een eend ---
// Romp met borst, een opgeheven staart van drie veren, kam en lellen, een gele snavel en gele poten met tenen. Vier looks (wit, bruin, roodbruin,
// gespikkeld) en een haan met grotere kam en een sikkelstaart. Kijkt naar +x, voeten op y = 0, ongeveer 0,4 m hoog.
const KIP_SPEC = [
  ['body', null, 0, 0.17, 0],
  ['head', 'body', 0.02, 0.2, 0],
  ['tail', 'body', -0.11, 0.22, 0],
];
export const KIP_LOOKS = [
  { naam: 'wit', body: 0xefece2, wing: 0xdcd8cb, tail: 0xe6e2d6, spot: null },
  { naam: 'bruin', body: 0x9a6a3e, wing: 0x7c5230, tail: 0x3a2a1c, spot: null },
  { naam: 'roodbruin', body: 0xb4572c, wing: 0x8e4220, tail: 0x2a1f18, spot: null },
  { naam: 'gespikkeld', body: 0x8c8176, wing: 0x6c6258, tail: 0x2c2a28, spot: 0xe8e2d4 },
];
export const KIP_VARIANTEN = KIP_LOOKS.length * 2;   // vier looks, elk als hen en als haan

function kipGeometry(variant) {
  const L = KIP_LOOKS[variant % KIP_LOOKS.length], haan = variant >= KIP_LOOKS.length;
  const I = boneIndex(KIP_SPEC);
  const B = new SkinBuilder(1);
  const kam = 0xc4302a, snavel = 0xe0a52b, poot = 0xd9a63a;
  B.bone = I.body;
  B.geo(ellipsoid(8, 6, 0.135, 0.095, 0.08), composeMatrix(0, 0, 0, 0, 0, 0.1), L.body);                  // romp
  B.geo(ellipsoid(6, 5, 0.07, 0.075, 0.07), composeMatrix(0.075, 0.015, 0), L.body);                      // borst
  for (const s of [1, -1]) B.geo(ellipsoid(6, 4, 0.085, 0.05, 0.016), composeMatrix(-0.015, 0.012, s * 0.074, s * -0.08, 0, 0.12), L.wing);   // vleugels tegen de romp
  if (L.spot) for (const [x, y, z] of [[0.02, 0.07, 0.04], [-0.05, 0.06, -0.04], [0.06, 0.03, -0.055], [-0.02, 0.0, 0.07]]) B.geo(ellipsoid(4, 3, 0.02, 0.012, 0.02), composeMatrix(x, y, z), L.spot);
  for (const s of [1, -1]) {   // poten met drie tenen
    const z = s * 0.032;
    B.geo(tubeGeometry([0.01, -0.07, z], [0.012, -0.165, z], 0.008, 0.006, 4), null, poot);
    for (const t of [-0.3, 0, 0.3]) B.geo(new THREE.BoxGeometry(0.05, 0.007, 0.01), composeMatrix(0.038, -0.169, z + t * 0.04, 0, t, 0), poot);
  }
  B.bone = I.tail;
  const staartLen = haan ? 0.2 : 0.13, staartHoog = haan ? 0.17 : 0.1;
  for (const [dz, ry, kleur] of [[0, 0, L.tail], [-0.022, 0.3, L.body], [0.022, -0.3, L.body]]) {   // drie veren als staande platen, naar achteren en omhoog
    B.geo(ellipsoid(5, 3, staartLen * 0.6, 0.045, 0.007), composeMatrix(-0.13 - staartLen * 0.35, staartHoog * 0.5, dz, 0, ry, -0.6), kleur);
  }
  if (haan) B.geo(tubeGeometry([-0.14, 0.1, 0], [-0.25, 0.1, 0], 0.012, 0.004, 4), null, 0x1f5a3a);   // sikkelveer
  B.bone = I.head;
  B.geo(tubeGeometry([0.03, 0.02, 0], [0.055, 0.1, 0], 0.032, 0.022, 6), null, L.body);                   // hals
  B.geo(ellipsoid(6, 5, 0.034, 0.036, 0.03), composeMatrix(0.07, 0.122, 0), L.body);                       // kop
  B.geo(new THREE.ConeGeometry(0.012, 0.04, 4).rotateZ(-Math.PI / 2), composeMatrix(0.108, 0.116, 0), snavel);   // snavel
  B.box(0.064, haan ? 0.172 : 0.16, 0, 0.035, haan ? 0.045 : 0.026, 0.01, kam);                             // kam
  B.box(0.094, 0.088, 0, 0.012, haan ? 0.05 : 0.032, 0.016, kam);                                            // lellen
  for (const s of [1, -1]) B.box(0.092, 0.13, s * 0.026, 0.008, 0.008, 0.006, 0x14110e);                     // ogen
  const g = B.build();
  g.translate(0, 0.17, 0);   // de bouw staat rond de romp; de poten komen zo op y = 0
  return g;
}

// variant: 0 tot en met KIP_VARIANTEN - 1 (een onbekende waarde valt terug op de witte hen); geometrie per variant gedeeld.
export function buildChickenMesh3D(variant = 0) {
  const v = Number.isInteger(variant) && variant >= 0 && variant < KIP_VARIANTEN ? variant : 0;
  const group = assemble(cachedGeo('kip' + v, () => kipGeometry(v)), KIP_SPEC, 0.4, 0.15);
  group.userData.head = group.userData.bones.head;
  group.userData.kipVariant = v;
  return group;
}

// Een vaste pose voor een dier van de kudde dat niet geanimeerd wordt (herdview3d.js): per zaad staat het dier rechtop, graast het of kijkt het opzij,
// zodat een weide er niet uitziet als een rij standbeelden. Deterministisch (zelfde zaad, zelfde pose); model: 'cow' | 'sheep' | 'hen'. Geeft de gekozen pose terug.
export const KUDDE_POSES = ['staan', 'kijken', 'grazen', 'grazen-diep'];
export function poseHerdAnimal(mesh, model, seed = 0) {
  const s = Number.isFinite(seed) ? ((seed % 1) + 1) % 1 : 0;
  const pose = KUDDE_POSES[Math.min(KUDDE_POSES.length - 1, Math.floor(s * KUDDE_POSES.length))];
  const b = mesh && mesh.userData && mesh.userData.bones;
  if (!b || !b.head) return pose;
  const draai = ((s * 7.31) % 1 - 0.5) * 1.1;
  if (model === 'hen') {
    const pik = pose === 'grazen-diep' ? 1 : pose === 'grazen' ? 0.7 : 0;
    b.head.rotation.set(0, pose === 'kijken' ? draai : 0, -pik * 0.95);
    if (b.body) b.body.rotation.z = -pik * 0.32;
    if (b.tail) b.tail.rotation.z = pik * 0.25;
  } else {
    const dip = mesh.userData.grazeDip || 0.6;
    const k = pose === 'grazen-diep' ? 1 : pose === 'grazen' ? 0.65 : 0;
    b.head.rotation.set(0, pose === 'kijken' ? draai : 0, -dip * k);
    if (b.body) b.body.rotation.z = -0.06 * k;
  }
  return pose;
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
  ['earL', 'head', 0, 0, 0],
  ['earR', 'head', 0, 0, 0],
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
    ['earL', 'head', hx * 0.95 + P.head * 0.3, h + P.hh * 0.6 + P.hh * 0.3 + (P.floppy ? P.head * 0.35 : P.head * 0.5), P.head * 0.28],
    ['earR', 'head', hx * 0.95 + P.head * 0.3, h + P.hh * 0.6 + P.hh * 0.3 + (P.floppy ? P.head * 0.35 : P.head * 0.5), -P.head * 0.28],
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
    B.bone = I[s > 0 ? 'earL' : 'earR'];
    if (P.floppy) B.geo(new THREE.BoxGeometry(P.head * 0.35, P.head * 0.6, 0.02), hm(P.head * 0.3, P.hh * 0.3 + P.head * 0.05, s * P.head * 0.5, s * 0.15, 0, 0.1), P.ear);
    else if (P.earLen) {   // the hare: long spoon ears with a black tip
      // a spoon: wide in the middle, rounded at the tip, leaning back; the black tip sits on the ear in the ear's own frame
      const L = P.head * P.earLen;
      const E = hm(P.head * 0.05, P.hh * 0.3 + P.head * 0.35, s * P.head * 0.22, s * -0.2, 0, 0.45).multiply(composeMatrix(0, L / 2, 0));
      B.geo(ellipsoid(5, 4, P.head * 0.2, L / 2, P.head * 0.07, 0, Math.PI).rotateZ(Math.PI / 2).rotateZ(-Math.PI / 2), E, P.ear);
      B.geo(ellipsoid(5, 3, P.head * 0.13, L * 0.14, P.head * 0.075), E.clone().multiply(composeMatrix(0, L * 0.38, 0)), P.earTip);
    } else B.geo(new THREE.ConeGeometry(P.head * 0.2, P.head * 0.45, 3), hm(P.head * 0.3, P.hh * 0.3 + P.head * 0.6, s * P.head * 0.28, s * -0.25, 0, 0.1), P.ear);
    B.bone = I.head;
  }
  if (P.collar) B.geo(loftGeometry([{ y: -0.015, d: P.hh * 0.82, w: P.hw * 0.8 }, { y: 0.015, d: P.hh * 0.8, w: P.hw * 0.78 }], 8), hm(-P.hh * 0.35, -P.hh * 0.1, 0, 0, 0, -1.2), P.collar);
  B.bone = I.tail;
  const tp = spec[2];
  const t0 = [tp[2], tp[3], 0];
  const t1 = [tp[2] - P.tail * 0.55, tp[3] + P.tail * P.tailUp * 0.6, 0];
  const t2 = [tp[2] - P.tail * 0.8, tp[3] + P.tail * P.tailUp, 0];
  if (P.scut) B.geo(ellipsoid(6, 4, P.tailR * 1.4, P.tailR * 1.3, P.tailR * 1.3), composeMatrix(t0[0] - P.tailR * 0.6, t0[1] + P.tailR * 0.4, 0), P.scut);   // a white scut, no tail
  else {
    B.geo(tubeGeometry(t0, t1, P.tailR, P.tailR * 0.85, 5), null, coat);
    B.geo(tubeGeometry(t1, t2, P.tailR * 0.85, P.tailR * 0.5, 5), null, P.tailTip || coat);
  }
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

// The hare (haas, 23-11, in no Quaternius pack): our own quad with long spoon ears, a white scut, a sandy brown coat with a light
// belly; schoft 0.3 m (dierenregister.js maat). It hops: front and hind legs together (animateQuad).
const HARE_LOOKS = [{ base: 0x8a6a48, dark: 0x5e4630, belly: 0xd8cbb0 }, { base: 0x96764e, dark: 0x664a32, belly: 0xe0d4ba }];
// A real hare in our own rig (QUAD_SPEC bones, its own shape), from the reference (Lepus europaeus, Mammalian Species 52/997; HMW):
// head and body 55-65 cm, ears 10-14 cm with black tips, hind foot 13-16 cm (about twice the front leg), eyes high on the side of
// the head, back arched, tail white below and black on top. Crouched: a round, high rump, the long hind feet flat on the ground
// (heels down), short thin front legs. No block feet. Schoft 0.28 m, length 0.55 m.
const HARE_SPEC = [
  ['body', null, 0, 0.16, 0],
  ['head', 'body', 0.15, 0.2, 0],
  ['tail', 'body', -0.21, 0.2, 0],
  ['legFL', 'body', 0.1, 0.12, 0.035],
  ['legFR', 'body', 0.1, 0.12, -0.035],
  ['legBL', 'body', -0.09, 0.15, 0.06],
  ['legBR', 'body', -0.09, 0.15, -0.06],
  ['earL', 'head', 0.19, 0.27, 0.022],
  ['earR', 'head', 0.19, 0.27, -0.022],
];
function hareGeometry(v) {
  const c = HARE_LOOKS[v % HARE_LOOKS.length];
  const I = boneIndex(HARE_SPEC);
  const B = new SkinBuilder(1);
  const coat = (x, y, z) => (y < 0.1 && Math.abs(z) < 0.06 ? c.belly : noiseHare(x, y, z) > 0.78 ? c.dark : c.base);
  B.bone = I.body;
  B.geo(ellipsoid(12, 8, 0.15, 0.115, 0.1), composeMatrix(-0.07, 0.17, 0, 0, 0, 0.12), coat);   // the round, high rump
  B.geo(ellipsoid(10, 7, 0.11, 0.08, 0.07), composeMatrix(0.07, 0.15, 0, 0, 0, -0.15), coat);   // the chest, lower to the front
  B.geo(ellipsoid(8, 6, 0.05, 0.06, 0.05), composeMatrix(0.13, 0.19, 0, 0, 0, -0.5), coat);    // the neck
  for (const s of [1, -1]) {
    // hind leg: a big thigh on the flank, the long foot flat on the ground from the heel forward
    B.bone = I[s > 0 ? 'legBL' : 'legBR'];
    B.geo(ellipsoid(9, 6, 0.08, 0.07, 0.035), composeMatrix(-0.08, 0.11, s * 0.075, 0, 0, 0.5), coat);
    B.geo(ellipsoid(6, 4, 0.03, 0.05, 0.02), composeMatrix(-0.15, 0.05, s * 0.07, 0, 0, -0.35), c.base);   // the shank down to the heel
    B.geo(ellipsoid(6, 3, 0.075, 0.016, 0.022), composeMatrix(-0.1, 0.016, s * 0.065), c.dark);          // the long hind foot
    // front leg: short and thin, a small rounded paw
    B.bone = I[s > 0 ? 'legFL' : 'legFR'];
    B.geo(tubeGeometry([0.1, 0.12, s * 0.035], [0.115, 0.012, s * 0.035], 0.014, 0.011, 5), null, c.base);
    B.geo(ellipsoid(5, 3, 0.022, 0.011, 0.014), composeMatrix(0.122, 0.01, s * 0.035), c.base);
  }
  B.bone = I.tail;
  B.geo(ellipsoid(6, 4, 0.028, 0.03, 0.03), composeMatrix(-0.215, 0.2, 0), 0xf2efe6);          // the white scut
  B.geo(ellipsoid(5, 3, 0.02, 0.012, 0.02), composeMatrix(-0.21, 0.226, 0), c.dark);           // dark on top
  B.bone = I.head;
  const hl = 0.13;   // head length
  B.geo(ellipsoid(10, 7, hl / 2, 0.05, 0.045), composeMatrix(0.19, 0.22, 0, 0, 0, -0.15), coat);
  B.geo(ellipsoid(6, 4, 0.03, 0.03, 0.033), composeMatrix(0.245, 0.205, 0), c.belly);           // muzzle
  B.box(0.272, 0.21, 0, 0.012, 0.012, 0.016, 0x3a2a24);                                         // nose
  for (const s of [1, -1]) B.geo(ellipsoid(5, 4, 0.012, 0.012, 0.008), composeMatrix(0.205, 0.235, s * 0.04), 0xc8902a);   // amber eyes
  for (const s of [1, -1]) {
    B.bone = I[s > 0 ? 'earL' : 'earR'];
    const L = 0.125;   // reference (Lepus europaeus): ears 10-14 cm from the notch, longer than the head
    const E = composeMatrix(0.19, 0.27, s * 0.022, s * -0.15, 0, 0.35).multiply(composeMatrix(0, L / 2, 0));
    B.geo(ellipsoid(7, 5, 0.024, L / 2, 0.009), E, c.base);
    B.geo(ellipsoid(5, 3, 0.017, L * 0.13, 0.0095), E.clone().multiply(composeMatrix(0, L * 0.4, 0)), 0x1a1714);   // black tip
  }
  return B.build();
}
const noiseHare = (x, y, z) => { const v = Math.sin(Math.floor(x * 40) * 12.9898 + Math.floor(y * 40) * 78.233 + Math.floor(z * 40) * 37.719) * 43758.5453; return v - Math.floor(v); };
// the fields animateQuad reads (len, leg, hh: the hop length; floppy: ear mode)
const HARE_P = { len: 0.5, leg: 0.1, hh: 0.06, hw: 0.08, head: 0.13, floppy: false };
export function buildHareMesh3D(variant = 0) {
  const v = Math.abs(variant | 0) % HARE_LOOKS.length;
  const group = assemble(cachedGeo('haas' + v, () => hareGeometry(v)), HARE_SPEC, 0.4, 0.15);
  const b = group.userData.bones;
  group.userData.head = b.head;
  group.userData.legs = [b.legFL, b.legFR, b.legBL, b.legBR];
  group.userData.tail = b.tail;
  group.userData.quad = HARE_P;
  group.userData.earMode = 'op';
  return group;
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
  group.userData.earMode = P.floppy ? 'slap' : 'op';
  return group;
}

// Real sizes (dierenregister.js maat, scripts/dierschaal_test.mjs): the model scale of the animals whose build was off.
export const MODEL_SCALE = Object.freeze({ cat: 0.85, sheep: 0.8, gans: 1.95, reiger: 1.56, vis: 1, zeehond: 1.13 });   // vis: the fish book models carry their own length
const GOOSE_BODY_Y = 0.2 * MODEL_SCALE.gans / 1.7;   // the goose body was 0.2 m up at scale 1.7
export const gooseBodyY = () => GOOSE_BODY_Y;

export function buildCatMesh3D(variant = 0) {
  const g = buildQuad('cat' + (variant % CAT_LOOKS.length), catParams(variant));
  g.scale.setScalar(MODEL_SCALE.cat);   // schoft 0.25 m
  return g;
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

// --- goose (greylag goose, #436) ---
// Its own rig in one SkinnedMesh (it used to be the duck body plus four loose meshes for legs and wings): torso, neck with head,
// tail, two webbed legs and two wings. In the bind pose the wings lie folded along the flank, so the goose looks the same in the
// herd instancing (countryside.js); animateGans opens them with one quaternion per wing. Body 0.2 m above the ground.
const GOOSE_SPEC = [
  ['body', null, 0, 0, 0],
  ['head', 'body', 0.11, 0.07, 0],
  ['tail', 'body', -0.13, 0.04, 0],
  ['legL', 'body', 0, -0.03, 0.035],
  ['legR', 'body', 0, -0.03, -0.035],
  ['wingL', 'body', 0.06, 0.065, 0.075],
  ['wingR', 'body', 0.06, 0.065, -0.075],
];
const GOOSE_COLORS = { body: 0x8a8274, back: 0x6e6658, edge: 0xb8b0a0, chest: 0x9e968a, belly: 0xd8d2c6, head: 0x7e776a, bill: 0xe8893a, nail: 0xece4d4, undertail: 0xeeeae0, foot: 0xe3a08e, primaries: 0x504a42 };
// The fold: a wing that points along +z (left) or -z (right) when spread, chord along x and flat, lies folded with its leading
// edge on top along the flank and its tip pointing back. GOOSE_UNFOLD: the rotation back to spread (the bone quaternion fully open).
const _bx = new THREE.Vector3(0, 1, 0);
const GOOSE_FOLD = [
  new THREE.Matrix4().makeBasis(_bx, new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)),
  new THREE.Matrix4().makeBasis(_bx, new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)),
];
const GOOSE_UNFOLD = GOOSE_FOLD.map((m) => new THREE.Quaternion().setFromRotationMatrix(m).invert());

function gooseGeometry() {
  const L = GOOSE_COLORS;
  const I = boneIndex(GOOSE_SPEC);
  const B = new SkinBuilder(1);
  B.bone = I.body;
  B.geo(ellipsoid(8, 5, 0.17, 0.075, 0.095), composeMatrix(0, 0.02, 0), L.body);
  B.geo(ellipsoid(8, 2, 0.15, 0.078, 0.085, 0, Math.PI * 0.32), composeMatrix(-0.015, 0.024, 0), L.back);
  B.geo(ellipsoid(6, 4, 0.07, 0.065, 0.075), composeMatrix(0.1, 0.04, 0), L.chest);
  B.geo(ellipsoid(6, 3, 0.1, 0.03, 0.06), composeMatrix(-0.06, -0.035, 0), L.belly);   // light belly towards the tail
  for (const s of [1, -1]) {
    B.bone = I[s > 0 ? 'legL' : 'legR'];
    const z = s * 0.035;
    B.geo(tubeGeometry([0, -0.03, z], [0.004, -0.106, z], 0.009, 0.007, 4), null, L.foot);
    B.geo(new THREE.BoxGeometry(0.045, 0.006, 0.034), composeMatrix(0.018, -0.107, z), L.foot);   // webbed foot
    // the wing: built in the spread frame (pointing along z), then folded onto the flank
    B.bone = I[s > 0 ? 'wingL' : 'wingR'];
    const V = composeMatrix(0.06, 0.065, s * 0.075).multiply(GOOSE_FOLD[s > 0 ? 0 : 1]);
    const at = (x, y, zz) => V.clone().multiply(composeMatrix(x, y, zz * s));
    B.geo(ellipsoid(6, 4, 0.042, 0.012, 0.115), at(-0.015, -0.011, 0.11), L.back);       // coverts
    B.geo(ellipsoid(5, 3, 0.012, 0.014, 0.095), at(-0.05, -0.012, 0.105), L.edge);       // light trailing edge
    B.geo(ellipsoid(5, 3, 0.032, 0.01, 0.075), at(-0.022, -0.013, 0.21), L.primaries);   // dark primaries
  }
  B.bone = I.tail;
  slab(B, [[-0.13, 0.03], [-0.21, 0.02], [-0.22, -0.02], [-0.13, -0.03]], 0.035, 0.05, L.back, L.undertail, L.undertail);
  B.bone = I.head;
  const nk = 0.11;
  B.geo(tubeGeometry([0.1, 0.05, 0], [0.13, 0.1 + nk, 0], 0.03, 0.022, 6), null, L.head);
  B.geo(ellipsoid(6, 5, 0.05, 0.042, 0.038), composeMatrix(0.145, 0.13 + nk, 0), L.head);
  B.geo(new THREE.BoxGeometry(0.064, 0.02, 0.034), composeMatrix(0.205, 0.118 + nk, 0, 0, 0, -0.15), L.bill);
  B.box(0.238, 0.112 + nk, 0, 0.01, 0.012, 0.022, L.nail);   // light nail on the bill tip
  for (const s of [1, -1]) B.box(0.165, 0.142 + nk, s * 0.03, 0.01, 0.01, 0.008, 0x111111);
  return B.build();
}

export function buildGooseMesh3D() {
  const group = assemble(cachedGeo('gans', gooseGeometry), GOOSE_SPEC, 0.6, 0.05);
  group.scale.setScalar(MODEL_SCALE.gans);   // 0.8 m standing
  const b = group.userData.bones;
  group.userData.head = b.head;
  b.wingL.userData.side = 0;
  b.wingR.userData.side = 1;
  return group;
}

function bouwWildlifeMesh3D(a) {
  switch (a.kind) {
    case 'seagull': return buildSeagullMesh3D(a.lod);
    case 'sheep': return buildSheepMesh3D(sheepVariantOf(a.bobSeed));
    case 'duck': return buildDuckMesh3D(a.variant);
    case 'gans': return buildGooseMesh3D();
    case 'reiger': return buildDuckMesh3D('reiger');
    case 'zeehond': return buildSealMesh3D();
    case 'vis': return buildCanalFishMesh3D(a.bobSeed || 0);
    case 'pigeon': return buildPigeonMesh3D(Math.floor((a.bobSeed || 0) * 10) % 4, a.lod);
    case 'cat': return buildCatMesh3D(a.variant || 0);
    case 'haas': return buildHareMesh3D(Math.floor((a.bobSeed || 0) * 10) % 2);
    case 'dog': return buildDogMesh3D(a.breed || 0, a.color || 0);
    case 'ree': case 'vos': case 'wolf': case 'ezel': case 'alpaca': case 'varken': return buildAnimalModel(a.kind);   // province animals (animalmodels.js, provinceanimals.js)
    default: return buildCowMesh3D(a.bobSeed, a.variant === 'red');
  }
}

// Een dier wordt nooit groter dan zijn eigen bouw (#433): de bouwer zet de schaal van de soort (de zwaan 3,1,
// de reiger 3,4) en een ongeldige of te grote schaal wordt hier hard begrensd. Zo krijgt ook een gast, een
// cutscene of een andere beller nooit een reuzenvogel; alleen de Reuzenduif-cheat schaalt daarna in scene3d.js.
export function buildWildlifeMesh3D(a) {
  const group = bouwWildlifeMesh3D(a);
  const max = maxDierSchaal(a.kind) || 1;
  // elk dier een andere maat (tot 12% kleiner dan de grootste, nooit groter dan zijn eigen bouw)
  if ((a.kind === 'cow' || a.kind === 'sheep' || a.kind === 'cat') && Number.isFinite(a.bobSeed)) group.scale.setScalar(max * (0.88 + 0.12 * ((Math.abs(a.bobSeed) * 7.31) % 1)));
  const s = group.scale.x;
  const veilig = Number.isFinite(s) && s > 0 ? Math.min(s, max) : max;
  if (group.scale.x !== veilig || group.scale.y !== veilig || group.scale.z !== veilig) group.scale.setScalar(veilig);
  group.userData.modelSchaal = veilig;
  return group;
}

// Blob-shadow footprint [length, width] per kind (null: none, e.g. birds in flight).
export function wildlifeShadowSize(kind) {
  return { cow: [1.3, 0.75], sheep: [0.9, 0.6], gans: [0.5, 0.3], cat: [0.45, 0.2], dog: [0.8, 0.35], pigeon: [0.2, 0.12], duck: [0.35, 0.2], reiger: [0.5, 0.3], ree: [0.9, 0.35], vos: [0.7, 0.25], haas: [0.5, 0.2], wolf: [1, 0.35], ezel: [1.3, 0.5], alpaca: [1.1, 0.45], varken: [1, 0.5] }[kind] || null;
}

// --- animation ---------------------------------------------------------------

const _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Folded (fold 1) exactly like poseBird in pigeonmode.js: the arm wing swings back along the flank and the hand wing folds over
// it (2.9 rad), so no primaries stick out as spikes. A negative fold (landing flare) sweeps the wing forward.
function setWings(ud, sign, inner, outer, fold = 0) {
  for (const w of ud.wings) {
    const s = w.userData.sign;
    w.rotation.set(-s * inner, -s * fold * 1.55, 0);
    w.position.set(w.userData.rest.x + fold * (ud.foldShift || 0), w.userData.rest.y + fold * (ud.foldLift || 0), w.userData.rest.z * (1 - fold * (ud.foldZ ?? 0.3)));
    const o = w.children[0];
    if (o) o.rotation.set(-s * outer, fold > 0 ? s * fold * 2.9 : -s * fold * 0.15, 0);
  }
}

function walkLegs(ud, phase, amp, lift = 0, gallop = 0) {
  const [fl, fr, bl, br] = ud.legs;
  // stap: diagonale paren; galop: de voorpoten samen en de achterpoten samen, de achterpoten een slag later
  const pf = gallop * 0.3, pb = gallop * (Math.PI - 0.6);
  fl.rotation.z = Math.sin(phase) * amp;
  br.rotation.z = Math.sin(phase + 0.3 + pb) * amp;
  fr.rotation.z = Math.sin(phase + Math.PI * (1 - gallop) + pf) * amp;
  bl.rotation.z = Math.sin(phase + Math.PI * (1 - gallop) + 0.3 + pb) * amp;
  if (lift > 0) {
    // de poot gaat van de grond als hij naar voren zwaait (de afgeleide van de zwaai is positief)
    for (let i = 0; i < 4; i++) {
      const l = ud.legs[i], r = l.userData.rest;
      l.position.y = r.y + Math.max(0, Math.cos(i === 0 ? phase : i === 1 ? phase + Math.PI * (1 - gallop) + pf : i === 2 ? phase + Math.PI * (1 - gallop) + 0.3 + pb : phase + 0.3 + pb)) * lift;
    }
  }
}

// Het kantelpunt van een snuif of een schrikreactie: een weinig voorkomende puls van 0 tot 1 (per dier verschoven met zijn zaad).
function puls(time, seed, periode, duur) {
  const u = (((time + seed * 97) % periode) + periode) % periode;
  return u < duur ? Math.sin((u / duur) * Math.PI) : 0;
}

// Oren: een schuddend oor tegen de vliegen, naar voren als het dier iets ziet, plat naar achteren op de vlucht.
// 'plat' zijn de oren van koe en schaap (zij steken zijwaarts uit), 'op' die van paard, kat en hond (staand), 'slap' die van de labrador en de teckel.
function animateEars(ud, seed, time, stand, phase = 0, run = 0) {
  const b = ud.bones;
  if (!b.earL) return;
  const mode = ud.earMode || 'plat';
  const vlieg = puls(time, seed, 7.3, 0.35);
  const vlieg2 = puls(time + 3.1, seed * 1.7, 9.1, 0.3);
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? 1 : -1, ear = i === 0 ? b.earL : b.earR;
    const f = (i === 0 ? vlieg : vlieg2) * Math.sin(time * 32 + i);
    if (mode === 'plat') {
      ear.rotation.set(s * (-0.12 * f + (stand === 2 ? 0.45 : 0) + Math.sin(phase * 2) * 0.05 * run), s * (stand === 1 ? 0.4 : stand === 2 ? -0.5 : 0), 0);
    } else if (mode === 'op') {
      ear.rotation.set(s * (0.15 * f + (stand === 2 ? 0.7 : 0) + (stand === 1 ? 0.12 : 0)), 0, 0.28 * f * s + (stand === 1 ? -0.22 : stand === 2 ? 0.75 : Math.sin(time * 0.7 + seed + i) * 0.06));
    } else {
      ear.rotation.set(0, 0, -run * 0.5 + Math.sin(phase * 2 + i) * 0.18 * run + (stand === 1 ? -0.2 : 0) + 0.1 * f);
    }
  }
}

// --- birds: pigeon and gull ---------------------------------------------------
// One flight cycle for both, tuned per species: a faster downstroke than upstroke, the hand wing half folding on the upstroke,
// gliding (the pigeon in a V, the gull with its crooked wing and small trim corrections), a tail that steers in turns and
// fans out when landing, legs tucked in flight that swing forward to land, and a head that stays level. On the ground: head
// bobbing while walking (hold and thrust), pecking, jerky glances, breathing, and the pigeon coos (neck puffed, bowing and
// turning, tail spread) while the gull calls or stretches its wings. Far away (ud.ver) only wings, body and legs.
// Everything on the existing bones, no new objects per frame.
const fract = (x) => x - Math.floor(x);
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const PIGEON_ANIM = {
  rate: 18, start: 22, amp: 0.9, nod: 0.026, stepRate: 22, restPitch: 0.1, foldOuter: 0, dihedral: 0.42, crook: 0, coos: true, standY: PIGEON_STAND_Y,
  glideOf: (time, seed) => clamp01((Math.sin(time * 0.5 + seed) - 0.35) * 2.5),
};
const GULL_ANIM = {
  rate: 9, start: 13, amp: 0.75, nod: 0.014, stepRate: 14, restPitch: 0.15, foldOuter: 0.05, dihedral: 0.06, crook: 0.3, coos: false, standY: SEAGULL_STAND_Y,
  glideOf: (time, seed) => Math.max(0, Math.sin(time * 0.45 + seed)) ** 0.6,
};

// A bird's turn rate from the change of its heading (the gull already has a.bank from its simulation): the body banks into the turn.
function birdBank(ud, a, time) {
  if (Number.isFinite(a.bank)) return a.bank;
  const dt = time - (ud.bankT ?? time);
  let d = (a.angle || 0) - (ud.bankA ?? (a.angle || 0));
  d -= Math.PI * 2 * Math.round(d / (Math.PI * 2));
  ud.bankT = time;
  ud.bankA = a.angle || 0;
  if (dt > 1e-4 && dt < 0.5) ud.bank = (ud.bank || 0) + (Math.max(-0.7, Math.min(0.7, (d / dt) * 0.35)) - (ud.bank || 0)) * Math.min(1, dt * 4);
  return ud.bank || 0;
}

// A bird looks around in jerks: a new direction every ~1.1 s and a fast turn towards it; with a.watch it looks at the player.
function birdGlance(ud, a, time, seed, spread) {
  const w = a.watch;
  const target = w !== undefined && w !== null ? Math.max(-1.2, Math.min(1.2, -w)) : (fract(Math.sin(Math.floor(time * 0.9 + seed * 5) * 12.9898 + seed) * 43758.5453) - 0.5) * spread;
  ud.kijkY = (ud.kijkY || 0) + (target - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 14);
  ud.kijkT = time;
  return ud.kijkY;
}

function animateBird(mesh, a, time, C) {
  const ud = mesh.userData, b = ud.bones;
  const gull = C === GULL_ANIM;
  const seed = gull ? a.flapSeed || 0 : (a.bobSeed || 0) * 5;
  mesh.position.y = a.z ?? (gull ? 6 + Math.sin(time * 2 + seed) * 1.2 : PIGEON_STAND_Y);
  const bank = birdBank(ud, a, time);
  const hr = b.head.userData.rest;
  if (a.state === 'ground') {
    const walking = a.speed > 0.05;
    const s = (a.stride || 0) * C.stepRate;
    const peck = a.peck || 0;
    // cooing (pigeon) or calling (gull): now and then, only standing still and close by (a.coo forces it, for pictures)
    const show = walking || peck > 0.05 || ud.ver ? 0 : a.coo ?? puls(time, seed, gull ? 17 : 9, gull ? 1.6 : 2.4);
    const coo = C.coos ? show : 0;
    const bow = Math.max(0, Math.sin(time * 5.5)) * coo;
    const call = C.coos ? 0 : show;
    const stretch = gull && !walking && !ud.ver ? puls(time, seed * 2, 31, 1.4) : 0;   // the gull stretches its wings now and then
    setWings(ud, 1, -0.5 + stretch * 1.3, C.foldOuter + stretch * 0.2, 1 - stretch * 0.85);
    if (b.legs) b.legs.rotation.z = 0;
    // hold and thrust: the head stays put while the body walks on beneath it, then shoots forward
    const u = fract(s / (Math.PI * 2));
    const nod = walking ? (u < 0.7 ? 1 - (u / 0.7) * 2 : -1 + ((u - 0.7) / 0.3) * 2) * C.nod : 0;
    b.head.position.set(hr.x + nod + peck * C.nod * 0.8, hr.y - peck * C.nod * 1.2 + bow * C.nod * 0.4, hr.z);
    const breath = Math.sin(time * 4.2 + seed) * 0.012;
    b.body.scale.set(1, 1 + breath + 0.07 * coo, 1 + breath + 0.09 * coo);   // the cock pigeon puffs up his neck
    b.body.position.y = walking ? Math.abs(Math.sin(s)) * 0.008 : 0;
    b.body.rotation.set(walking ? Math.sin(s) * 0.04 : 0, Math.sin(time * 1.3) * 0.6 * coo, C.restPitch - (walking ? 0 : peck * 0.35) - bow * 0.3 - call * 0.15);
    if (ud.ver) {
      b.head.rotation.set(0, 0, -peck * 0.9);
      return;
    }
    const glance = walking || peck > 0.3 || show > 0.2 ? 0 : birdGlance(ud, a, time, seed, 1.8);
    b.head.rotation.set(0, glance, -peck * 0.9 - bow * 0.6 + call * 1.15 + (walking ? 0 : Math.sin(time * 0.5 + seed) * 0.05));
    // the tail flicks up when pecking and drags, spread, while cooing
    b.tail.rotation.set(0, walking ? Math.sin(s) * 0.12 : 0, -peck * 0.25 + bow * 0.2 + coo * 0.25);
    b.tail.scale.set(1, 1, 1 + 0.6 * coo);
    return;
  }
  b.head.position.set(hr.x, hr.y, hr.z);
  b.body.scale.set(1, 1, 1);
  const landing = a.state === 'land';
  const flare = landing ? clamp01(1 - ((a.z ?? 1) - C.standY) / 1.2) : 0;   // just above the ground: brake with wings and tail
  const climb = !landing && a.cruise !== undefined && a.z < a.cruise - 0.6 ? 1 : 0;
  const justUp = gull && a.takeoffAt ? performance.now() / 1000 - a.takeoffAt < 2 : false;
  const glide = a.glide ?? (landing ? 0.45 * (1 - flare) : climb || justUp ? 0 : C.glideOf(time, seed));
  const rate = flare > 0 ? C.start * 1.15 : climb || justUp ? C.start : C.rate;
  const ph = time * rate + seed;
  const w = ph - 0.5 * Math.sin(ph);   // the downstroke is faster than the upstroke
  const amp = (1 - glide) * (C.amp + flare * 0.25);
  const f = Math.sin(w);
  const upstroke = Math.max(0, Math.cos(w)) * (1 - glide);   // the hand wing half folds and sweeps back
  const trim = Math.sin(time * 3.1 + seed) * 0.04 * glide;
  setWings(ud, 1, 0.12 + f * amp + glide * C.dihedral + trim, Math.sin(w - 0.9) * amp * 0.4 - glide * C.crook - 0.05, upstroke * 0.15 - flare * 0.15);
  const pitch = landing ? 0.25 + flare * 0.45 : climb ? 0.3 : Math.max(-0.2, Math.min(0.2, ((a.cruise ?? a.z ?? 0) - (a.z ?? 0)) * 0.08));
  b.body.position.y = Math.sin(w - 1.2) * 0.008 * amp;
  b.body.rotation.set(-bank, 0, pitch);
  if (b.legs) b.legs.rotation.z = flare > 0 ? -1.3 + flare * 1.6 : -1.3;   // tucked; forward and down when landing
  if (ud.ver) return;
  // the head stays level in turns and climbs; the tail steers along and fans out when braking
  b.head.rotation.set(bank * 0.85, bank * 0.35 + Math.sin(time * 0.3 + seed) * 0.15, -pitch * 0.8);
  b.tail.rotation.set(-bank * 0.7, bank * 0.45, flare * 0.45 + f * amp * 0.06);
  b.tail.scale.set(1, 1, 1 + flare * 0.7 + Math.abs(bank) * 0.5 + glide * 0.15);
}

function animateSeagull(mesh, a, time) { animateBird(mesh, a, time, GULL_ANIM); }
function animatePigeon(mesh, a, time) { animateBird(mesh, a, time, PIGEON_ANIM); }

// The goose: waddling (the body rolls from foot to foot, the swinging foot leaves the ground), grazing with a tug at the grass,
// neck low and forward when someone comes too close (hissing), the head following you, a wing flap now and then, and on the run
// with beating wings. Far away (ud.ver) only the step, the grazing and the flight. No new objects per frame.
const _gq = new THREE.Quaternion(), _gx = new THREE.Vector3(1, 0, 0);
function setGooseWing(w, open, beat, stretch) {
  if (open <= 0) {   // closed: the bind pose, which only needs setting once
    if (!w.userData.closed) { w.quaternion.identity(); w.scale.set(1, 1, 1); w.userData.closed = true; }
    return;
  }
  w.userData.closed = false;
  const s = w.userData.side ? -1 : 1;
  _gq.setFromAxisAngle(_gx, -s * beat).multiply(GOOSE_UNFOLD[w.userData.side]);
  w.quaternion.identity().slerp(_gq, open);
  w.scale.set(1 + stretch * open, 1, 1);
}

function animateGans(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones;
  const seed = a.bobSeed || 0;
  const speed = a.speed || 0;
  const walking = speed > 0.05;
  const flee = a.fleeT > 0 || a.flee > 0;
  mesh.visible = true;
  const s = (a.stride || time * speed * 1.5) * (speed > 1 ? 9 : 14);
  const graze = walking || flee ? 0 : Math.max(0, Math.sin(time * 0.3 + seed * 3)) ** 0.5;
  const tug = graze > 0.6 ? puls(time, seed, 1.7, 0.25) : 0;   // a tug at the grass
  const w = a.watch;
  const near = w !== undefined && w !== null;
  const hiss = !walking && !flee && !ud.ver ? a.hiss ?? (near && a.watchD2 < 16 && graze < 0.3 ? 1 : 0) : 0;   // within 4 m
  mesh.position.y = GOOSE_BODY_Y + (walking ? Math.abs(Math.sin(s)) * (flee ? 0.025 : 0.012) : 0) - hiss * 0.015;   // on its legs
  // waddle: the body rolls towards the standing foot
  b.body.rotation.set(walking ? Math.sin(s) * (flee ? 0.06 : 0.1) : 0, 0, -0.04 - graze * 0.3 - (flee ? 0.18 : 0) - hiss * 0.12);
  for (let i = 0; i < 2; i++) {
    const l = i === 0 ? b.legL : b.legR, k = i === 0 ? Math.sin(s) : -Math.sin(s);
    l.rotation.z = walking ? k * (flee ? 0.7 : 0.45) : 0;
    l.position.y = l.userData.rest.y + (walking ? Math.max(0, i === 0 ? Math.cos(s) : -Math.cos(s)) * 0.014 : 0);
  }
  if (ud.ver) {
    const beat = Math.sin(time * 20 + seed * 7) * 0.6 + 0.5;
    b.body.scale.set(1, 1, 1);
    b.head.rotation.set(0, 0, -0.95 * graze);
    setGooseWing(b.wingL, flee ? 1 : 0, beat, 0.8);
    setGooseWing(b.wingR, flee ? 1 : 0, beat, 0.8);
    return;
  }
  const breath = Math.sin(time * 2.2 + seed * 4);
  b.body.scale.set(1, 1 + breath * 0.012, 1 + breath * 0.015);
  // the head: grazing, tugging, hissing with the neck low and forward, watching whoever comes near, nodding while walking
  const target = near && graze < 0.3 ? Math.max(-1, Math.min(1, -w)) : (1 - graze) * Math.sin(time * 0.5 + seed) * 0.5;
  ud.kijkY = (ud.kijkY || 0) + (target - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 4);
  ud.kijkT = time;
  b.head.rotation.set(hiss * Math.sin(time * 3.1) * 0.12, walking ? 0 : ud.kijkY, -0.95 * graze + tug * 0.25 - hiss * 0.7 + (walking ? Math.sin(s * 2) * 0.07 : 0) + (flee ? 0.25 : 0));
  // wings: closed; a flap now and then; wide open and beating on the run
  const stretch = !walking && !flee && graze < 0.3 && !hiss ? puls(time, seed * 2, 37, 1.6) : 0;
  const open = flee ? 1 : stretch;
  const beat = flee ? 0.5 + Math.sin(time * 20 + seed * 7) * 0.6 : stretch ? 0.45 + Math.sin(time * 11) * 0.55 : 0.1;
  setGooseWing(b.wingL, open, beat, 0.8);
  setGooseWing(b.wingR, open, beat, 0.8);
  // the tail wags after walking and after a wing flap
  b.tail.rotation.set(0, walking ? Math.sin(s) * 0.2 : puls(time, seed * 3, 13, 0.6) * Math.sin(time * 26) * 0.3 + stretch * Math.sin(time * 20) * 0.2, hiss ? -0.25 : 0);
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
  mesh.position.y = 0.17 * MODEL_SCALE.reiger;   // poten: de romp hangt op 17 cm x de modelschaal
  b.body.rotation.set(0, 0, 0);
  b.head.rotation.set(0, Math.sin(time * 0.3 + seed) * 0.4, Math.max(0, Math.sin(time * 0.15 + seed * 2)) > 0.9 ? -0.9 : 0);
  b.tail.rotation.set(0, 0, 0);
}

// The seal: in the water it swims with sideways strokes of its hind flippers (the body undulates along, fore flippers against the
// body, head above water); lying still in the water it now and then raises its head high and looks around or at the player. On
// the shore it lies like a banana (head and hind flippers up), breathes, scratches with a fore flipper and rolls a little; when
// scared it crawls to the water in undulating hops. Diving: head first. Far away (ud.ver) only the posture and the stroke.
function animateZeehond(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones;
  const seed = a.bobSeed || 0;
  const speed = a.speed || 0;
  const ashore = a.state === 'kant' || a.state === 'naarWater';
  const dive = a.state === 'duik' ? Math.min(1, (a.diveT || 0) * 1.5) : 0;
  mesh.visible = dive < 0.95;
  b.body.position.copy(b.body.userData.rest);
  b.body.scale.set(1, 1, 1);
  b.flipL.rotation.set(0, 0, 0);
  b.flipR.rotation.set(0, 0, 0);
  if (ashore) {
    mesh.position.y = 0.06 * MODEL_SCALE.zeehond;   // belly on the ground
    if (a.state === 'naarWater') {
      // undulating crawl: the chest lifts and the fore flippers push off, then the hind body follows
      const s = (a.stride || 0) * 9;
      b.body.position.y += Math.max(0, Math.sin(s)) * 0.05;
      b.body.rotation.set(0, 0, Math.sin(s) * 0.12);
      b.flipL.rotation.z = b.flipR.rotation.z = -0.4 + Math.sin(s + 0.6) * 0.6;
      b.head.rotation.set(0, 0, 0.2 - Math.sin(s) * 0.15);
      b.tail.rotation.set(0, Math.sin(s * 0.5) * 0.1, -0.3 + Math.sin(s) * 0.1);
      return;
    }
    // the banana: head and hind flippers up, now and then on its side
    const roll = puls(time, seed, 19, 6) * 0.45;
    b.body.rotation.set(roll, 0, 0);
    b.tail.rotation.set(0, Math.sin(time * 0.6 + seed) * 0.08, -0.35 + Math.sin(time * 0.9 + seed) * 0.06);
    if (ud.ver) { b.head.rotation.set(0, 0, 0.25); return; }
    const breath = Math.sin(time * 1.1 + seed);
    b.body.scale.set(1, 1 + breath * 0.02, 1 + breath * 0.025);
    const scratch = puls(time, seed * 2, 11, 1.4);
    b.flipL.rotation.set(scratch * 0.9, 0, scratch * Math.sin(time * 14) * 0.35);
    const w = a.watch;
    const target = w !== undefined && w !== null ? Math.max(-1, Math.min(1, -w)) : Math.sin(time * 0.35 + seed) * 0.4;
    ud.kijkY = (ud.kijkY || 0) + (target - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 3);
    ud.kijkT = time;
    b.head.rotation.set(-roll * 0.8, ud.kijkY, 0.25 + Math.sin(time * 0.5 + seed) * 0.05);
    return;
  }
  const swimming = speed > 0.05;
  // head up: lying still in the water it raises head and chest high now and then (and when someone approaches)
  const w = a.watch;
  const headUp = swimming || dive ? 0 : a.headUp ?? Math.max(puls(time, seed, 14, 5), w !== undefined && w !== null ? 0.7 : 0);
  mesh.position.y = CANAL_Y - 0.06 - (swimming ? 0.05 : 0) + Math.sin(time * 1.3 + seed) * 0.01 - 0.35 * dive + headUp * 0.04;
  const stroke = Math.sin(time * 3 + seed);
  b.body.rotation.set(swimming ? stroke * 0.06 : 0, swimming ? -stroke * 0.08 : 0, -0.5 * dive + headUp * 0.35 + (swimming ? 0.08 : 0));
  b.tail.rotation.set(0, swimming ? stroke * 0.4 : Math.sin(time * 1.5 + seed) * 0.15, headUp * 0.4);
  b.flipL.rotation.set(0, 0, swimming ? -0.5 : Math.sin(time * 1.2 + seed) * 0.2);
  b.flipR.rotation.set(0, 0, swimming ? -0.5 : Math.sin(time * 1.2 + seed + 1) * 0.2);
  if (ud.ver) { b.head.rotation.set(0, 0, 0.15); return; }
  const target = w !== undefined && w !== null ? Math.max(-1, Math.min(1, -w)) : Math.sin(time * 0.5 + seed) * 0.5 * (1 - headUp * 0.4);
  ud.kijkY = (ud.kijkY || 0) + (target - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 3);
  ud.kijkT = time;
  b.head.rotation.set(0, swimming ? 0 : ud.kijkY, 0.15 + Math.sin(time * 0.9 + seed) * 0.08 - headUp * 0.2 - dive * 0.4);
}

function animateVis(mesh, a, time) {
  const b = mesh.userData.bones;
  const seed = a.bobSeed || 0;
  mesh.visible = true;
  mesh.position.y = CANAL_Y - 0.28 + Math.sin(time * 1.1 + seed) * 0.03;
  if (mesh.userData.fishId) { mesh.userData.lodD2 = mesh.userData.lodD2 || 0; animateFishModel(mesh, { state: 'zwem', speed: a.speed || 0 }, time); return; }   // a fish of the fish book (fishmodels.js)
  const slag = time * (4 + a.speed * 6) + seed;
  b.body.rotation.set(0, Math.sin(slag - 0.8) * 0.12, Math.sin(time * 0.7 + seed) * 0.04);   // het lijf slingert mee met de staart
  b.tail.rotation.set(0, Math.sin(slag) * 0.5, 0);
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
  for (const l of ud.legs) { l.rotation.set(0, 0, 0); l.position.y = l.userData.rest.y; }
  b.head.rotation.set(0, 0, 0);
  // ademhaling (een hond snakt na het rennen) en de oren: plat op de vlucht, naar voren bij iets nieuws
  const ad = Math.sin(time * (a.kind === 'dog' && speed > 1.5 ? 11 : 2.6) + seed * 5) * (a.kind === 'dog' && speed > 1.5 ? 0.02 : 0.012);
  if (!ud.ver) b.body.scale.set(1 + ad * 0.5, 1, 1 + ad);
  const w = a.watch;
  const stand = a.state === 'flee' || a.fleeT > 0 ? 2 : (w !== undefined && w !== null ? 1 : 0);
  if (!ud.ver) animateEars(ud, seed, time, stand, phase, moving ? Math.min(1, speed / 2) : 0);
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
    if (a.aaiT > 0) {   // wordt geaaid: kopje tegen de hand, ogen dicht, staart omhoog en zacht heen en weer
      b.head.rotation.set(0, 0.25 + Math.sin(time * 2.2) * 0.12, -0.1 + Math.sin(time * 2.2) * 0.12);
      b.tail.rotation.set(Math.sin(time * 2.4 + seed) * 0.6, 0, -0.8);
      return;
    }
    b.tail.rotation.set(Math.sin(time * 1.5 + seed) * 0.5, 0, -1.2);
    return;
  }
  if (moving) {
    const gallop = run > 0.8 || a.kind === 'haas' ? 1 : 0;   // een rennende hond of kat: voorpoten en achterpoten samen; een haas huppelt altijd
    walkLegs(ud, phase, 0.45 + run * 0.35, P.leg * (0.1 + run * 0.12), gallop);
    b.body.position.y += Math.abs(Math.sin(phase)) * 0.015 * (1 + run * 2);
    b.body.rotation.z = Math.sin(phase * 2) * 0.03 * run + (gallop ? Math.sin(phase) * 0.1 : 0);
    b.body.rotation.x = Math.sin(phase) * 0.025;
  }
  if (a.kind === 'haas' && moving) b.body.position.y += Math.max(0, Math.sin(phase)) * 0.05;   // the hop
  if (a.kind === 'haas' && !moving && stand === 1) { b.body.rotation.z = 0.35; b.body.position.y += P.leg * 0.25; }   // sits up and looks
  const sniff = a.kind === 'dog' && a.sniff > 0 && !moving;
  const doel = !moving && w !== undefined && w !== null ? Math.max(-1, Math.min(1, -w)) : Math.sin(time * 0.5 + seed) * 0.5;
  ud.kijkY = (ud.kijkY || 0) + (doel - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 3);
  ud.kijkT = time;
  b.head.rotation.set(0, moving ? 0 : ud.kijkY, sniff ? -0.7 + Math.sin(time * 9) * 0.05 : moving ? Math.sin(phase * 2) * 0.05 : 0);
  if (a.aaiT > 0 && a.kind === 'dog') b.head.rotation.set(0, 0, -0.35 + Math.sin(time * 3) * 0.08);   // kop schuin in de hand
  const wag = a.kind === 'dog' ? Math.sin(time * (a.aaiT > 0 ? 22 : moving ? 12 : 16) + seed) * (a.aaiT > 0 ? 0.9 : 0.6) : Math.sin(time * 1.2 + seed) * 0.3;
  b.tail.rotation.set(wag, 0, a.kind === 'cat' && a.state === 'flee' ? -0.5 : 0);
}

function updateLeash(mesh, a) {
  const leash = mesh.userData.leash;
  if (!leash) return;
  const o = a.owner;
  if (!o || a.state === 'stray' || a.state === 'loose') { leash.visible = false; return; }
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
// Every animal: the animation for its kind, then the mesh LOD for its distance (userData.lodD2, set by whoever places it).
export function animateWildlifeMesh3D(mesh, a, time) {
  animateKind(mesh, a, time);
  const ud = mesh.userData;
  if (ud.lod && !ud.animalModel) updateSkinnedLod(ud.lod, Math.sqrt(ud.lodD2 || 0), time);
}

function animateKind(mesh, a, time) {
  const ud = mesh.userData;
  if (a.dead) { poseDeadAnimal(mesh, a); return; }
  switch (a.kind) {
    case 'seagull': animateSeagull(mesh, a, time); return;
    case 'pigeon': animatePigeon(mesh, a, time); return;
    case 'duck': animateDuck(mesh, a, time); return;
    case 'gans': case 'goose': animateGans(mesh, a, time); return;
    case 'reiger': animateReiger(mesh, a, time); return;
    case 'zeehond': animateZeehond(mesh, a, time); return;
    case 'vis': animateVis(mesh, a, time); return;
    case 'cat': case 'haas': animateQuad(mesh, a, time); return;
    case 'dog': animateQuad(mesh, a, time); updateLeash(mesh, a); return;
    case 'ree': case 'vos': case 'wolf': case 'ezel': case 'alpaca': case 'varken': animateAnimalModel(mesh, a, time); return;
  }
  if (!ud.bones) return;
  animateGrazer(mesh, a, time);
}

// Koe, schaap en paard: gewicht in de stap (de poot komt van de grond, de romp deint mee), een galop als ze schrikken, ademhaling,
// grazen met kauwen, een kop die de speler volgt, oren en staart tegen de vliegen en een schuddende kop af en toe.
// Alles op bestaande botten en zonder nieuwe objecten per beeld; ver weg (ud.ver) alleen de stap en het grazen.
function animateGrazer(mesh, a, time) {
  const ud = mesh.userData, b = ud.bones;
  const seed = a.bobSeed || 0;
  const speed = a.speed || 0;
  const walking = speed > 0.05;
  const fleeing = a.fleeT > 0 || a.flee > 0;
  const paard = a.kind === 'horse';
  const gallop = fleeing && speed > (paard ? 3 : 1.6) ? 1 : 0;
  mesh.position.y = 0;
  const phase = (a.stride || 0) * (a.kind === 'cow' ? 3.2 : 5);
  const swing = gallop ? 0.55 : fleeing ? 0.4 : 0.28;
  if (walking) walkLegs(ud, phase, swing, gallop ? 0.1 : 0.045, gallop);
  else for (const l of ud.legs) { l.rotation.z *= 0.9; l.position.y = l.userData.rest.y; }
  const grazeT = walking || fleeing ? 0 : Math.max(0, Math.sin(time * 0.25 + seed * 3)) ** 0.5;
  const chew = grazeT > 0.5 ? Math.sin(time * 5 + seed) * 0.04 * grazeT : 0;
  const bounce = walking ? (gallop ? Math.sin(phase) * 0.07 : Math.abs(Math.sin(phase)) * 0.02) : 0;
  b.body.position.y = b.body.userData.rest.y + bounce * (gallop ? 0.5 : 1);
  b.body.rotation.set(walking && !gallop ? Math.sin(phase) * 0.02 : 0, 0, -0.06 * grazeT + (gallop ? -Math.sin(phase) * 0.06 : 0));
  if (ud.ver) {
    b.head.rotation.set(0, 0, -ud.grazeDip * grazeT + chew);
    return;
  }
  // ademhaling: de flank zet uit, vooral na de galop
  const ad = Math.sin(time * (gallop ? 5 : 1.7) + seed * 6) * (gallop ? 0.02 : 0.011);
  b.body.scale.set(1 + ad * 0.5, 1, 1 + ad);
  // de kop: kijkt naar wat er dichterbij komt, kantelt omhoog bij schrik, schudt af en toe
  const w = a.watch;
  const kijk = !walking && !fleeing && w !== undefined && w !== null && grazeT < 0.3;
  const doel = kijk ? Math.max(-1, Math.min(1, -w)) : 0;
  ud.kijkY = (ud.kijkY || 0) + (doel - (ud.kijkY || 0)) * Math.min(1, Math.max(0, time - (ud.kijkT ?? time)) * 3);
  ud.kijkT = time;
  const schud = puls(time, seed, 23, 0.8) * Math.sin(time * 28) * 0.22;
  const op = fleeing ? 0.22 : kijk ? 0.1 : 0;
  b.head.rotation.set(0, (1 - grazeT) * (kijk ? ud.kijkY : Math.sin(time * 0.4 + seed) * 0.35) + schud, -ud.grazeDip * grazeT + chew + op + (walking ? Math.sin(phase * (gallop ? 1 : 2)) * (gallop ? 0.12 : 0.05) : 0));
  animateEars(ud, seed, time, fleeing ? 2 : kijk ? 1 : 0, phase, walking ? 1 : 0);
  if (ud.tail) {
    const vlieg = puls(time, seed * 3, 11, 1.1);
    b.tail.rotation.set(Math.sin(time * 1.8 + seed) * 0.35 + vlieg * Math.sin(time * 11) * 0.5, gallop ? 0 : Math.sin(time * 0.9 + seed) * 0.12, gallop ? -0.55 : (walking ? -0.12 : 0));
  }
  if (b.mane) b.mane.rotation.set(0, 0, walking ? Math.sin(phase * 2) * (gallop ? 0.14 : 0.05) : Math.sin(time * 1.3 + seed) * 0.02);
}
