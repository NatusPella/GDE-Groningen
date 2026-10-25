// Owned vehicles ("Mijn voertuigen"): the red Fjord Escapade plus everything
// bought at Ome Harm Occasions / Trap & Toeter (the bought collection itself
// lives in shops.js and is saved with it). Rentals and side-job/mission
// vehicles are not in the collection but are never theft either.
//
// API
//   isOwnVehicle(v) -> boolean
//     Hero car, bought, rented or job vehicle: getting in is never stealing.
//   placeOwnedVehicleNear(world, v, x, y, opts?) -> { x, y, angle, street } | null
//     Moves vehicle v (already in the world or not) to a legal parking spot
//     near (x, y): kerbside on an ordinary street (never in water, buildings,
//     on a bridge/ring viaduct or in the sunken ring), clear of other cars.
//     Boats go to the nearest Bootje Huren jetty instead. v ends up parked,
//     stopped and in world.vehicles. Returns null (v untouched) if no spot.
//     opts.outOfView (default true): spot must be hidden from the camera, at
//       minDist..maxDist m (default 60..150); false: default 0..80 m, visible ok.
//     opts.minDist / opts.maxDist override the ring.
//   findParkingSpot(world, x, y, model, opts?) -> spot | null
//     Same search without moving anything (model: { len, wid, name }).
//     A boat's model gets open water (a canal or harbour) and the heli's open,
//     dry ground with room for the rotor: the shared delivery in a session uses
//     this for every kind of own vehicle (#449).
//   getGarageList(world) / getGarageCatalog(world)
//     Owned vehicles (hero first) / the whole collection incl. not yet bought,
//     as plain view objects for the phone app and the pause-menu garage.
//   deliverOwnedVehicle(world, id, opts?) -> { ok, text }
//     opts.here (the Streken cheat): any catalog vehicle, free and at once, right beside you.
//     "Laten afleveren": fee, cooldown, out-of-view placement, message (no route: the car shows on the map).
//     Boats go home to "Jouw steiger" behind the tower, the helicopter to the helidek on its roof (home.js).
//     In een sessie van een ander zet de gastheer een kopie bij je neer; je eigen
//     save en de zijne blijven zoals ze zijn (#449, coopbezit.js bezorgHost).
//     Dat geldt ook voor je boot (op het water bij je) en de heli (op open grond);
//     die vliegt daar niet, hij staat er.
//     Een eigen pand (safehouse, boerderij, huis) gaat met hetzelfde bericht
//     'bezorg' met soort 'pand' (coopbezit.js pandVraag); daar zet de host alleen
//     een deur neer en geen voertuig.
//   locateOwnedVehicle(world, id) -> { ok, text, x, y }
//     "Waar staat hij?": where it is; a route only via an explicit "Zet route".
//   getOwnedVehiclesForMap(world) -> [{ x, y, angle, kind, label, hero, color }]

import { closestPointOnSegment, isInWater } from './util.js';
import { vindBootPlek } from './bootplek.js';
import { ommelandArea } from './ommelandplace.js';
import { buildingAt, roadNear, roadKind, waterGap, streetAt as roadName } from './tileplace.js';
import { isSpawnHidden } from './pedestrians.js';
import { slotFits, propBlocked, sleepingParkedCars } from './parkedcars.js';
import { baysIn } from './parkinglots.js';
import { spawnHeroCarNear, playerTopSpeed } from './vehicle.js';
import { inHomeFlat } from './home.js';
import { BLOCK, ROAD_IN, ROAD_W, edgeDistance, edgeRoad } from './countryfield.js';
import { inProvinceData } from './provinceworld.js';
import { pushOutOfPlan } from './countryplan.js';
import { vehicleDisplayName } from './vehiclenames.js';
import {
  getOwnedEntries,
  getHeroLook,
  spawnOwnedEntry,
  spawnStockVehicle,
  replacementFee,
  getShopsForRender,
  VEHICLE_UNLOCKS,
  unlockMet,
  PAINTS,
  upgradeListForStock,
  REDELIVERY_FEE,
} from './shops.js';
import { VEHICLE_STOCK } from './shopdata.js';

import { HERO_REPLACE_FEE } from './economy.js';
import { getHomeForRender, getHomeMooringForRender, getHomePad, homeWhereLabel } from './home.js';
const DELIVERY_COOLDOWN = 30;
const HELI_FERRY_FEE = 60;
const NEAR_M = 200;
const MAX_TESTS = 700;
const STEP = 6;
const END_CLEAR = 6;
const NO_PARK_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link']);
const HERO_SPEC = { label: 'Fjord Escapade', kind: 'car', color: '#a11f1f', model: { name: 'escort', len: 4.0, wid: 1.65, maxSpeed: 50, accel: 11, brake: 25, turnRate: 3.4 } };

const MEMES = {
  hero: 'Oud, rood en koppig. Net als Tammo.',
  omafiets: 'Zwart, loodzwaar en al drie keer uit het Reitdiep gevist. Rijdt nog prima.',
  stadsfiets: 'Rapper dan een student op weg naar een tentamen dat al begonnen is.',
  fatbike: 'Remmen zijn optioneel, volgens de berijder.',
  brommer: 'Zoemt over het fietspad langs de Herestraat. Iedereen kijkt boos, precies de bedoeling.',
  mug: 'Parkeert in elk gaatje, ook in de Folkingestraat.',
  koopman: 'Hond achterin, oma voorin, zondag naar Pieterburen. Kofferbak voor een halve verhuizing.',
  klusbus: 'Ramt alles opzij, net als een Stadjer bij de Wiebel-uitverkoop.',
  wervelwind: 'Van de Grote Markt naar Delfzijl voordat je koffie koud is. Flitspalen vinden hem prachtig.',
  wiekenwubbo: 'Geen file op de Ring, geen flitspaal, geen parkeerplek nodig. Wel een plat dak.',
};

const SHOP_NAME = { auto: 'Ome Harm Occasions', fietsen: 'Trap & Toeter', boot: 'Bootje Huren', heli: 'Rotor Roelf Eelde' };
const KIND_LABEL = { car: 'Auto', bike: 'Fiets', scooter: 'E-step', boat: 'Boot', heli: 'Helikopter' };

let lastDeliveryAt = -Infinity;

export function isOwnVehicle(v) {
  return !!(v && (v.isHeroCar || v.playerOwned || v.missionCar));
}

// --- parking spot search ----------------------------------------------------

function parkingRoad(r, twoWheel) {
  if (r.bridge || r.z || r.roundabout || !r.pts || r.pts.length < 2 || NO_PARK_TYPES.has(r.type)) return false;
  if (r.cat === 'normal' || r.cat === 'minor') return (r.width || 0) >= (twoWheel ? 3 : 5);
  return twoWheel && r.cat === 'cycle';
}

function clearOfVehicles(world, x, y, halfLen, ignore) {
  const check = (o) => {
    if (o === ignore) return true;
    const r = halfLen + (o.halfLen || 2) + 0.6;
    return Math.abs(o.x - x) > r || Math.abs(o.y - y) > r || Math.hypot(o.x - x, o.y - y) > r;
  };
  for (const o of world.vehicles) if (!check(o)) return false;
  for (const o of sleepingParkedCars(world)) if (!check(o)) return false;
  return true;
}

function hiddenFootprint(world, x, y, angle, halfLen) {
  const fx = Math.cos(angle) * halfLen, fy = Math.sin(angle) * halfLen;
  return isSpawnHidden(world, x, y) && isSpawnHidden(world, x + fx, y + fy) && isSpawnHidden(world, x - fx, y - fy);
}

function ringFor(opts) {
  const outOfView = opts.outOfView !== false;
  return {
    outOfView,
    minDist: opts.minDist ?? (outOfView ? 60 : 0),
    maxDist: opts.maxDist ?? (outOfView ? 150 : 80),
  };
}

function searchRing(world, x, y, model, twoWheel, ring, ignore) {
  const map = world.map;
  const m = { len: (model.len || 4) + 2 * (model.trailer || 0), wid: model.wid || 1.7 };
  const halfLen = m.len / 2;
  const target = ring.minDist + (ring.maxDist - ring.minDist) * 0.25;
  const cands = [];
  for (const r of map.roadsNear(x, y, ring.maxDist)) {
    if (!parkingRoad(r, twoWheel)) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < END_CLEAR * 2 + m.len) continue;
      const near = closestPointOnSegment(x, y, a[0], a[1], b[0], b[1]);
      if (near.dist2 > ring.maxDist * ring.maxDist) continue;
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const off = twoWheel ? (r.width || 4) / 2 + 0.8 : (r.width || 6) / 2 + m.wid / 2 + 0.45;
      for (let t = END_CLEAR; t <= len - END_CLEAR; t += STEP) {
        for (const side of [1, -1]) {
          const nx = -ty * side, ny = tx * side;
          const px = a[0] + tx * t + nx * off, py = a[1] + ty * t + ny * off;
          const d = Math.hypot(px - x, py - y);
          if (d < ring.minDist || d > ring.maxDist) continue;
          // parked with the traffic on its side of the street
          const angle = Math.atan2(ty, tx) + (side < 0 ? Math.PI : 0);
          cands.push({ x: px, y: py, angle, nx, ny, road: r, score: Math.abs(d - target) });
        }
      }
    }
  }
  cands.sort((p, q) => p.score - q.score);
  let tests = 0;
  for (const c of cands) {
    if (++tests > MAX_TESTS) break;
    if (!clearOfVehicles(world, c.x, c.y, halfLen, ignore)) continue;
    if (ring.outOfView && !hiddenFootprint(world, c.x, c.y, c.angle, halfLen)) continue;
    if (map.offStreetLevel && map.offStreetLevel(c.x, c.y)) continue;
    if (!slotFits(map, c.road, c.x, c.y, c.angle, m, c.nx, c.ny)) continue;
    if (propBlocked(c.x, c.y, c.angle, m)) continue;
    return { x: c.x, y: c.y, angle: c.angle, street: c.road.name || '' };
  }
  return null;
}

export function findParkingSpot(world, x, y, model, opts = {}) {
  if (!world || !world.map || !model) return null;
  // Samen spelen (#449): een boot hoort op het water en de heli op open grond;
  // de gastheer zoekt die plek met dezelfde grenzen als een parkeerplek.
  if (model.name === 'boat') return boatSpotNear(world, x, y, model, opts);
  if (model.name === 'heli') return heliSpotNear(world, x, y, model, opts);
  const twoWheel = model.name === 'bike' || model.name === 'scooter';
  const ring = ringFor(opts);
  return (twoWheel ? null : baySpot(world, x, y, model, ring, opts.ignore || null))
    || searchRing(world, x, y, model, twoWheel, ring, opts.ignore || null)
    // nothing in the ring (dense centre, water all around): widen it once
    || searchRing(world, x, y, model, twoWheel, { ...ring, minDist: ring.minDist * 0.6, maxDist: ring.maxDist * 1.6 }, opts.ignore || null)
    // out in the Ommelanden: the verge of a country road (real or polder
    // roads), else beside the nearest real road
    || (edgeDistance(x, y) > -30 ? countryKerbSpot(world, x, y, model, ring, opts.ignore || null) : null)
    || countrySpot(world, x, y, model, opts.ignore || null);
}

// Open water in de ring om (x, y) waar de romp in een van een paar koersen vrij
// ligt (een gracht is smal), zonder andere voertuigen. Voor het bezorgen in een
// sessie: de boot komt naast de gast in het water, niet aan de verre steiger.
function boatSpotNear(world, x, y, model, opts) {
  const map = world.map;
  const ring = ringFor(opts);
  const half = (model.len || 4) / 2;
  const ignore = opts.ignore || null;
  const water = (px, py) => { try { return isInWater(map, px, py); } catch (e) { return false; } }; // geen waterlaag: dan is het droog
  const koers = (px, py) => {
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      const fx = Math.cos(a) * half, fy = Math.sin(a) * half;
      if (water(px + fx, py + fy) && water(px - fx, py - fy)) return a;
    }
    return null;
  };
  const found = vindBootPlek({
    x, y, maxR: Math.max(ring.maxDist || 0, 80), stap: 8,
    isWater: water,
    vrij: (px, py) => {
      if (Math.hypot(px - x, py - y) < ring.minDist) return false;
      return koers(px, py) != null && clearOfVehicles(world, px, py, half, ignore);
    },
  });
  if (!found) return null;
  const angle = koers(found.x, found.y);
  return { x: found.x, y: found.y, angle: angle ?? 0, street: roadName(map, found.x, found.y) || '' };
}

// Open, droge grond met ruimte voor de rotor, in de ring om (x, y); dezelfde
// proeven als de "Voertuig hier"-cheat, maar rond de gast in plaats van de host.
function heliSpotNear(world, x, y, model, opts) {
  const map = world.map;
  const ring = ringFor(opts);
  const gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) : 0;
  const radii = [7, 10, 14, 19, 25, 32, 40, 50].filter((r) => r >= ring.minDist * 0.6 && r <= Math.max(ring.maxDist || 0, 40));
  return spotAround(world, x, y, 0, gz, 'heli', model, opts.ignore || null, radii);
}

// A free bay in a real parking lot or parking lane (parkinglots.js) in the ring.
function baySpot(world, x, y, model, ring, ignore) {
  const m = { len: model.len || 4, wid: model.wid || 1.7 };
  const target = ring.minDist + (ring.maxDist - ring.minDist) * 0.25;
  const R = ring.maxDist;
  const bays = baysIn(world.map, x - R, y - R, x + R, y + R)
    .filter((b) => b.len >= m.len + 0.3 && b.wid >= m.wid - 0.1)
    .map((b) => ({ b, d: Math.hypot(b.x - x, b.y - y) }))
    .filter((q) => q.d >= ring.minDist && q.d <= ring.maxDist)
    .sort((p, q) => Math.abs(p.d - target) - Math.abs(q.d - target));
  let tests = 0;
  for (const { b } of bays) {
    if (++tests > MAX_TESTS) break;
    if (!clearOfVehicles(world, b.x, b.y, m.len / 2, ignore)) continue;
    if (ring.outOfView && !hiddenFootprint(world, b.x, b.y, b.angle, m.len / 2)) continue;
    if (propBlocked(b.x, b.y, b.angle, m)) continue;
    const rp = world.map.nearestRoadPoint(b.x, b.y, 40, true);
    return { x: b.x, y: b.y, angle: b.angle, street: (rp && rp.road.name) || roadName(world.map, b.x, b.y) || '', bay: true };
  }
  return null;
}

// Beside the nearest Ommeland road, 25-120 m out, on dry open ground.
function countrySpot(world, x, y, model, ignore) {
  const m = { len: (model.len || 4) + 2 * (model.trailer || 0), wid: model.wid || 1.7 };
  for (const r of [45, 70, 30, 100, 120]) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const rr = roadNear(world.map, x + Math.cos(a) * r, y + Math.sin(a) * r, 30);
      if (!rr) continue;
      for (const side of [1, -1]) {
        const off = (rr.road.width || 5) / 2 + m.wid / 2 + 0.4;
        const px = rr.x - rr.uy * off * side, py = rr.y + rr.ux * off * side;
        const d = Math.hypot(px - x, py - y);
        if (d < 20 || d > 140) continue;
        if (isInWater(world.map, px, py) || buildingAt(world.map, px, py, m.len / 2 + 0.5)) continue;
        if (!clearOfVehicles(world, px, py, m.len / 2, ignore)) continue;
        const angle = Math.atan2(rr.uy, rr.ux) + (side < 0 ? Math.PI : 0);
        if (propBlocked(px, py, angle, m)) continue;
        return { x: px, y: py, angle, street: rr.road.name || '' };
      }
    }
  }
  return null;
}

// A spot on the verge of an Ommeland road (the real roads, else the polder
// roads), clear of buildings, farms, water and other cars. Open country
// hides little, so a spot in view is taken when no hidden one is found.
function countryKerbSpot(world, x, y, model, ring, ignore) {
  const m = { len: (model.len || 4) + 2 * (model.trailer || 0), wid: model.wid || 1.7 };
  // polder roads run a block (960 m) apart: look up to 700 m out, nearest first
  const maxD = 700, target = ring.minDist + (Math.max(ring.maxDist, 120) - ring.minDist) * 0.25;
  const cands = [];
  const add = (px, py, angle, street) => {
    const d = Math.hypot(px - x, py - y);
    if (d > maxD || d < ring.minDist * 0.6) return;
    cands.push({ x: px, y: py, angle, street, score: Math.abs(d - target) });
  };
  if (inProvinceData(x, y)) {
    for (const r of world.map.roadsNear(x, y, maxD)) {
      if (r.z || r.bridge || roadKind(r) <= 2) continue;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < m.len + 6) continue;
        const tx2 = (b[0] - a[0]) / len, ty2 = (b[1] - a[1]) / len, off = (r.width || 5) / 2 + m.wid / 2 + 0.5;
        for (let t = 3 + m.len / 2; t <= len - 3 - m.len / 2; t += 6) {
          for (const side of [1, -1]) add(a[0] + tx2 * t - ty2 * off * side, a[1] + ty2 * t + tx2 * off * side, Math.atan2(ty2, tx2) + (side < 0 ? Math.PI : 0), r.name || r.ref || '');
        }
      }
    }
  } else {
    const off = ROAD_W / 2 + m.wid / 2 + 0.5, C = ROAD_IN + ROAD_W / 2;
    for (let by = Math.floor((y - maxD) / BLOCK); by <= Math.floor((y + maxD) / BLOCK); by++) {
      for (let bx = Math.floor((x - maxD) / BLOCK); bx <= Math.floor((x + maxD) / BLOCK); bx++) {
        if (edgeRoad(bx, by, 0)) {
          const t0 = Math.max(by * BLOCK + 12, y - maxD), t1 = Math.min((by + 1) * BLOCK - 12, y + maxD);
          for (let t = t0; t <= t1; t += 6) for (const side of [1, -1]) add(bx * BLOCK + C + off * side, t, side > 0 ? Math.PI / 2 : -Math.PI / 2, '');
        }
        if (edgeRoad(bx, by, 1)) {
          const t0 = Math.max(bx * BLOCK + 12, x - maxD), t1 = Math.min((bx + 1) * BLOCK - 12, x + maxD);
          for (let t = t0; t <= t1; t += 6) for (const side of [1, -1]) add(t, by * BLOCK + C - off * side, side > 0 ? 0 : Math.PI, '');
        }
      }
    }
  }
  cands.sort((p, q) => p.score - q.score);
  const ok = (c) => {
    if (edgeDistance(c.x, c.y) < 0 || waterGap(world.map, c.x, c.y, 3) > -1.5 || !clearOfVehicles(world, c.x, c.y, m.len / 2, ignore)) return false;
    const fx = Math.cos(c.angle) * m.len / 2, fy = Math.sin(c.angle) * m.len / 2;
    for (const [px, py] of [[c.x, c.y], [c.x + fx, c.y + fy], [c.x - fx, c.y - fy]]) {
      const o = { x: px, y: py };
      if (pushOutOfPlan(o, m.wid / 2 + 0.3)) return false;
    }
    return true;
  };
  let open = null, tests = 0;
  for (const c of cands) {
    if (++tests > MAX_TESTS) break;
    if (!ok(c)) continue;
    if (!ring.outOfView || hiddenFootprint(world, c.x, c.y, c.angle, m.len / 2)) return spotOut(world, c);
    if (!open) open = c;
  }
  return open && spotOut(world, open);
}
const spotOut = (world, c) => ({ x: c.x, y: c.y, angle: c.angle, street: c.street || roadName(world.map, c.x, c.y) || '' });

function jettySpot(world, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const s of getShopsForRender()) {
    if (s.type !== 'boot' || !s.water) continue;
    const d = Math.hypot(s.water.x - x, s.water.y - y);
    if (d < bd) { bd = d; best = s; }
  }
  return best ? { x: best.water.x, y: best.water.y, angle: best.water.angle, street: best.wijk || best.street || '' } : null;
}

function parkAt(world, v, spot) {
  v.x = spot.x;
  v.y = spot.y;
  v.angle = spot.angle;
  v.speed = 0;
  v.throttle = 0;
  v.steer = 0;
  v.driftX = 0;
  v.driftY = 0;
  v.yawVel = 0;
  v.horn = false;
  v.road = null;
  v.parked = false;
  v.driver = null;
  v.homeStored = false;
  v.homeSlot = null;
  if (!v.isBoat && !v.isHeli) { v.z = world.map.spawnZ ? world.map.spawnZ(spot.x, spot.y) : 0; v.vz = 0; v.airborne = false; }
  if (!world.vehicles.includes(v)) world.vehicles.push(v);
}

export function placeOwnedVehicleNear(world, v, x, y, opts = {}) {
  if (!world || !v || v.driver === 'player') return null;
  const ring = ringFor(opts);
  const spot = v.isBoat
    ? jettySpot(world, x, y, Math.max(400, ring.maxDist * 3))
    : findParkingSpot(world, x, y, v.model, { ...opts, ignore: v });
  if (!spot) return null;
  parkAt(world, v, spot);
  return spot;
}

// --- views --------------------------------------------------------------------

function heroCar(world) {
  return world.vehicles.find((v) => v.isHeroCar && !v.wrecked) || null;
}

// Samen spelen: je eigen voertuigen en je Escapade staan opzij in de wereld van
// een ander (#428), maar ze zijn niet weg: de garage noemt ze niet afgeschreven (#449).
const eigenOpzij = (world) => !!(world && world.coopNet && world.coopNet.eigenVoertuigen);

function wijkAt(map, x, y) {
  let best = '', bd = Infinity;
  for (const h of map.meta.neighbourhoodPoints || []) {
    const d = (h.x - x) ** 2 + (h.y - y) ** 2;
    if (d < bd) { bd = d; best = h.name; }
  }
  return best;
}

// Street and wijk; out in the Ommeland the country road and the village (or "bij <village>").
function placeOf(map, x, y) {
  const area = ommelandArea(x, y);
  if (!area) return { street: streetAt(map, x, y), wijk: wijkAt(map, x, y) };
  return { street: roadName(map, x, y), wijk: area.place ? (area.near ? `bij ${area.place}` : area.place) : 'Ommeland' };
}

function streetAt(map, x, y) {
  const rp = map.nearestRoadPoint(x, y, 40);
  return rp && rp.road.name ? rp.road.name : '';
}

// "in de Oude Boteringestraat", "aan de Oosterkade", "op de Grote Markt"
export function streetPhrase(name) {
  if (!name) return 'om de hoek';
  const n = name.toLowerCase();
  if (/(kade|singel|diep|gracht|wal|haven|dijk)$/.test(n)) return `aan de ${name}`;
  if (/(markt|plein|hof)$/.test(n)) return `op de ${name}`;
  if (n.includes(' der ')) return `aan de ${name}`;
  // a numbered road out in the Ommeland: "op de N361"
  if (/^[an]\d+$/.test(n)) return `op de ${name}`;
  return `in de ${name}`;
}

const kmh = (ms) => Math.round(ms * 3.6);

function perfModel(base, upgradeIds, list) {
  const m = { ...base };
  for (const id of upgradeIds) {
    const u = list.find((x) => x.id === id);
    if (u) for (const [k, f] of Object.entries(u.mult)) m[k] = m[k] * f;
  }
  return m;
}

function paintLabel(color, fallback) {
  const p = PAINTS.find((x) => x.color.toLowerCase() === String(color || '').toLowerCase());
  return p ? p.label : fallback;
}

function nameOf(spec, v) {
  const n = vehicleDisplayName(v || { model: spec.model, id: spec.nameIdx || 0 });
  return n.make ? { make: n.make, model: n.model, label: `${n.make} ${n.model}` } : { make: '', model: n.model, label: n.model };
}

function statusOf(world, v, lost, kind, key) {
  if (lost) return { key: 'lost', label: 'Afgeschreven' };
  if (world.player.inVehicle === v) return { key: 'driving', label: 'Je zit erin' };
  if (!v || !world.vehicles.includes(v) || v.homeStored) return { key: 'garage', label: homeWhereLabel(key) || (kind === 'heli' ? 'Thuis op het helidek' : kind === 'boat' ? 'Thuis aan jouw steiger' : 'Thuis in de garage') };
  const d = Math.hypot(v.x - world.player.x, v.y - world.player.y);
  return d < NEAR_M ? { key: 'near', label: 'In de buurt', dist: d } : { key: 'far', label: ommelandArea(v.x, v.y) ? 'In het Ommeland' : 'Ergens in Grunn', dist: d };
}

function view(world, { id, hero, spec, color, upgrades, v, lost, key }) {
  const list = upgradeListForStock(spec);
  const perf = perfModel(spec.model, upgrades, list);
  // the top the player gets out of it (vehicle.js playerTune), scaled by its upgrades
  const top = playerTopSpeed(spec.model) * perf.maxSpeed / spec.model.maxSpeed;
  const status = statusOf(world, v, lost, spec.kind, hero ? 'hero' : key);
  const where = v && status.key !== 'garage' && status.key !== 'lost' ? placeOf(world.map, v.x, v.y) : null;
  const fee = hero ? (lost || !v ? HERO_REPLACE_FEE : 0) : lost ? replacementFee({ spec }) : status.key === 'garage' && (spec.kind === 'heli' || spec.kind === 'boat') ? 0 : spec.kind === 'heli' ? HELI_FERRY_FEE : REDELIVERY_FEE;
  return {
    id, key, hero, owned: true, v, spec,
    ...nameOf(spec, v),
    kind: glyphKind(spec), kindLabel: spec.type || KIND_LABEL[spec.kind], color,
    paint: paintLabel(color, hero ? 'Fjordrood' : 'Fabriekskleur'),
    upgrades: upgrades.map((u) => (list.find((x) => x.id === u) || {}).label).filter(Boolean),
    topSpeed: kmh(top), accel: perf.accel, accelScore: Math.max(1, Math.min(10, Math.round(perf.accel / 1.2))),
    meme: MEMES[hero ? 'hero' : key] || spec.desc || '',
    price: hero ? 0 : spec.price,
    status: status.key, statusLabel: status.label, dist: status.dist ?? null, where,
    fee, feeLabel: fee ? `€${fee}` : 'gratis',
  };
}

export function getGarageList(world) {
  const out = [];
  const hero = heroCar(world);
  const look = getHeroLook();
  out.push(view(world, {
    id: 'hero', key: 'hero', hero: true, spec: HERO_SPEC, color: look.color || HERO_SPEC.color,
    upgrades: look.upgrades, v: hero, lost: !hero && !eigenOpzij(world),
  }));
  for (const o of getOwnedEntries()) {
    out.push(view(world, {
      id: o.key, key: o.key, hero: false, spec: o.spec, color: o.color,
      upgrades: o.v ? o.v.upgrades || [] : o.upgrades || [], v: o.v, lost: !!o.lost,
    }));
  }
  return out;
}

// Samen spelen (#449): de spec van een eigen voertuig bij zijn sleutel uit de
// garage ('hero' of een winkel), zodat de gastheer dezelfde auto neerzet.
export function eigenSpec(key) {
  return key === 'hero' ? HERO_SPEC : VEHICLE_STOCK[key] || null;
}

// Wat er van een eigen voertuig naar de sessie van een ander gaat: alleen
// gegevens (kleur, onderdelen, schade), geen objecten en niets uit de save.
// De host maakt er zijn eigen kopie van (coopbezit.js bezorgHost).
export function bezorgGegevens(world, id) {
  const e = getGarageList(world).find((x) => x.id === id);
  if (!e) return null;
  const o = id === 'hero' ? null : getOwnedEntries().find((x) => x.key === id);
  // je Escapade staat in een sessie opzij (#428): zijn schade zit dan niet in world.vehicles
  const v = e.v || (id === 'hero' ? (((world.coopNet && world.coopNet.eigenVoertuigen) || []).find((x) => x.isHeroCar) || null) : null);
  const ups = id === 'hero' ? getHeroLook().upgrades : (v ? v.upgrades || [] : o && o.upgrades) || [];
  const dmg = v ? { health: v.health, dents: v.dentLog, flat: v.flat } : { health: o && o.health, dents: o && o.dents, flat: o && o.flat };
  return {
    id, kind: e.spec.kind, label: e.spec.label, model: e.model,
    color: e.color, upgrades: [...ups],
    health: Number.isFinite(dmg.health) ? dmg.health : 100,
    dents: Array.isArray(dmg.dents) ? dmg.dents.slice(-12).map((d) => d.slice(0, 3)) : [],
    flat: dmg.flat === true,
  };
}

// Garage glyph: bus/truck/boat get their own silhouette.
function glyphKind(spec) {
  if (spec.kind === 'boat') return 'boat';
  if (spec.kind === 'heli') return 'heli';
  const n = spec.model.name;
  if (n === 'bus' || n === 'midibus') return 'bus';
  if (n === 'truck' || n === 'trekkerlimo') return 'truck';
  return spec.kind;
}

// Owned first, then the models still for sale and the ones still locked
// (greyed out in the garage).
export function getGarageCatalog(world) {
  const owned = getGarageList(world);
  const have = new Set(owned.map((e) => e.key));
  const rest = Object.entries(VEHICLE_STOCK).filter(([key]) => !have.has(key)).map(([key, spec]) => {
    const locked = !!spec.unlock && !unlockMet(spec);
    const shop = SHOP_NAME[spec.shop] || '';
    return {
      id: key, key, hero: false, owned: false, locked, v: null, spec, ...nameOf(spec, null),
      kind: glyphKind(spec), kindLabel: spec.type || KIND_LABEL[spec.kind], color: spec.color, paint: paintLabel(spec.color, 'Fabriekskleur'),
      upgrades: [], topSpeed: kmh(playerTopSpeed(spec.model)), accel: spec.model.accel,
      accelScore: Math.max(1, Math.min(10, Math.round(spec.model.accel / 1.2))),
      meme: MEMES[key] || spec.desc, price: spec.price || 0, shop,
      unlockText: spec.unlock ? VEHICLE_UNLOCKS[spec.unlock].text : '',
      status: locked ? 'locked' : 'forsale',
      statusLabel: spec.unlock ? (locked ? 'Op slot' : 'Vrijgespeeld: staat zo thuis in de garage') : `Te koop bij ${shop}`,
      where: null, fee: 0, feeLabel: '',
    };
  });
  return [...owned, ...rest];
}

export function getOwnedVehiclesForMap(world) {
  const out = [];
  const pv = world.player.inVehicle;
  const hero = heroCar(world);
  const look = getHeroLook();
  if (hero && hero !== pv) out.push({ x: hero.x, y: hero.y, angle: hero.angle, kind: 'car', label: 'Fjord Escapade', hero: true, color: look.color || HERO_SPEC.color });
  for (const o of getOwnedEntries()) {
    const v = o.v;
    if (!v || v.wrecked || v === pv || !world.vehicles.includes(v)) continue;
    out.push({ x: v.x, y: v.y, angle: v.angle, kind: o.spec.kind, label: o.spec.label, hero: false, color: o.color });
  }
  return out;
}

// --- actions ----------------------------------------------------------------------

function describeSpot(world, spot, name) {
  const street = spot.street || streetAt(world.map, spot.x, spot.y);
  return `Je ${name} staat ${streetPhrase(street)}. Je ziet hem op je kaart`;
}

// Puts the owned vehicle `id` ('hero' or a collection key) in the world on
// the spot pick(kind, model, ignoreVehicle) finds: the standing instance
// moves, a missing or wrecked one is built anew. Returns the spot or null.
function placeEntry(world, id, pick) {
  if (id === 'hero') {
    const old = heroCar(world);
    if (old) {
      const spot = pick('car', old.model, old);
      if (spot) parkAt(world, old, spot);
      return spot;
    }
    const spot = pick('car', HERO_SPEC.model, null);
    // (from the city's nearest street when the spot is out in the country;
    // parkAt moves it to the spot)
    const car = spot && (spawnHeroCarNear(world.map, spot.x, spot.y) || spawnHeroCarNear(world.map, 0, 0));
    if (!car) return null;
    for (const w of world.vehicles) if (w.isHeroCar && w.wrecked) w.isHeroCar = false;
    parkAt(world, car, spot);
    return spot;
  }
  const o = getOwnedEntries().find((x) => x.key === id);
  if (!o) return null;
  if (o.v && world.vehicles.includes(o.v) && !o.lost) {
    const spot = pick(o.spec.kind, o.v.model, o.v);
    if (spot) parkAt(world, o.v, spot);
    return spot;
  }
  const spot = pick(o.spec.kind, o.spec.model, null);
  return spot && spawnOwnedEntry(world, o, spot.x, spot.y, spot.angle) ? spot : null;
}

// --- delivery right beside you (Streken > Voertuig hier) ---------------------

const solidAt = (map, x, y, m) => {
  const [ex, ey] = map.escapeBuilding(x, y, m);
  return Math.hypot(ex - x, ey - y) > 0.05 || !!buildingAt(map, x, y, m);
};

// Beside you (3 m and out, the first try to your side), facing as you do: dry and
// level for a car or bike, open water for a boat, room for the rotor for the
// heli; never in a building, farm, prop or other vehicle. Else the kerb
// spot nearby (cars, bikes), visible this time.
function besideSpot(world, kind, model, ignore) {
  const p = world.player;
  const radii = kind === 'boat' ? [3, 6, 10, 15, 20, 28, 36, 45] : kind === 'heli' ? [7, 10, 14, 19, 25, 32] : [3, 4.5, 6, 8, 11, 15, 20];
  const spot = spotAround(world, p.x, p.y, p.angle, p.gz || 0, kind, model, ignore, radii);
  if (spot || kind === 'boat' || kind === 'heli') return spot;
  return findParkingSpot(world, p.x, p.y, model, { outOfView: false, ignore });
}

// Dezelfde zoektocht rond een punt in plaats van rond de speler: de cheat zet
// het voertuig naast je neer, de gastheer naast de gast (#449).
function spotAround(world, x0, y0, angle, gz, kind, model, ignore, radii) {
  const map = world.map;
  // a gelede bus's rear unit trails behind the body: room for it either way
  const len = (model.len || 4) + 2 * (model.trailer || 0), wid = model.wid || 1.7, half = len / 2;
  const fx = Math.cos(angle) * half, fy = Math.sin(angle) * half;
  const wet = (px, py) => isInWater(map, px, py);
  for (const r of radii) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = angle + Math.PI / 2 + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (Math.PI * 2 / n);
      const x = x0 + Math.cos(a) * r, y = y0 + Math.sin(a) * r;
      if (kind === 'boat') {
        if (wet(x, y) && wet(x + fx, y + fy) && wet(x - fx, y - fy) && clearOfVehicles(world, x, y, half, ignore)) return { x, y, angle, street: '' };
        continue;
      }
      if (wet(x, y) || wet(x + fx, y + fy) || wet(x - fx, y - fy)) continue;
      if (map.groundHeightAt && Math.abs((map.groundHeightAt(x, y, gz) || 0) - gz) > 0.8) continue;
      if (kind === 'heli') {
        if (solidAt(map, x, y, 8) || !clearOfVehicles(world, x, y, 7, ignore)) continue;
        // rotor (r 5) clear of the street trees' crowns (r up to 6.4)
        if (map.treesNear && map.treesNear(x, y, 10).some((t) => Math.hypot((t.x ?? t[0]) - x, (t.y ?? t[1]) - y) < 10)) continue;
        return { x, y, angle, street: '' };
      }
      const e = wid / 2 + 0.3;
      if (solidAt(map, x, y, e) || solidAt(map, x + fx, y + fy, e) || solidAt(map, x - fx, y - fy, e)) continue;
      if (!clearOfVehicles(world, x, y, half, ignore) || propBlocked(x, y, angle, { len, wid })) continue;
      return { x, y, angle, street: '' };
    }
  }
  return null;
}

let tempStock = null;

const HERE_FAIL = {
  boat: 'Een boot kan alleen op het water. Ga aan de kant staan',
  heli: 'Te weinig ruimte voor de rotor. Zoek een open plek',
};

// The cheat's delivery: any vehicle of the garage catalog (own or showroom),
// free, at once and right next to you. The same placement as "Laten
// afleveren" (placeEntry), only the spot differs.
function deliverHere(world, id) {
  if (world.pigeonMode) return { ok: false, text: 'Eerst weer mens worden' };
  if (inHomeFlat()) return { ok: false, text: 'Eerst de flat uit' };
  if (world.player.swimming) return { ok: false, text: 'Eerst even uit het water klimmen' };
  const e = getGarageCatalog(world).find((x) => x.id === id);
  if (!e) return { ok: false, text: 'Dat voertuig bestaat niet' };
  const short = e.hero ? 'Escapade' : e.model || e.spec.label;
  if (e.status === 'driving') return { ok: false, text: `Je zit al in je ${short}` };
  const kind = e.spec.kind;
  const pick = (k, model, ignore) => besideSpot(world, k, model, ignore);
  let spot;
  if (e.owned) spot = placeEntry(world, id, pick);
  else {
    spot = pick(kind, e.spec.model, tempStock);
    if (spot) {
      if (tempStock && tempStock.driver !== 'player') {
        const i = world.vehicles.indexOf(tempStock);
        if (i >= 0) world.vehicles.splice(i, 1);
      }
      tempStock = spawnStockVehicle(world, id, spot.x, spot.y, spot.angle);
      if (!tempStock) spot = null;
      else parkAt(world, tempStock, spot);
    }
  }
  if (!spot) return { ok: false, text: HERE_FAIL[kind] || 'Hier past hij niet. Ga op een open plek staan' };
  const text = `${short} staat klaar`;
  return { ok: true, text, x: spot.x, y: spot.y };
}


// Samen spelen (#449): bezorgen in de wereld van de gastheer. De eigen auto,
// boot of heli blijft thuis (in je eigen save); de host zet zijn eigen kopie bij
// je neer en de anderen zien hem met het echte model, de kleur en de deuken
// (#428). Een boot komt in het water naast je, de heli op open grond: daar
// vliegt hij niet, hij staat er.
function bezorgInSessie(world, e) {
  const short = e.hero ? 'Escapade' : e.model;
  if (world.pigeonMode) return { ok: false, text: 'Duiven krijgen geen auto bezorgd' };
  if (world.player.inVehicle) return { ok: false, text: 'Stap eerst uit je voertuig' };
  const wait = Math.ceil(lastDeliveryAt + DELIVERY_COOLDOWN - world.time);
  if (wait > 0) return { ok: false, text: `De bezorger is nog onderweg met de vorige. Probeer het over ${wait} s` };
  if (world.money < e.fee) return { ok: false, text: `Te weinig geld: afleveren kost ${e.feeLabel}` };
  const g = bezorgGegevens(world, e.id);
  if (!g) return { ok: false, text: `Je ${short} staat niet in je garage` };
  const res = world.coopBezitVraag(g) || { ok: false, tekst: 'Wie het spel opende is even niet bereikbaar.' };
  if (!res.ok) return { ok: false, text: res.tekst || 'Dat lukt nu niet' };
  if (e.fee) world.money -= e.fee;
  lastDeliveryAt = world.time;
  world.addMessage(res.tekst, 5);
  return { ok: true, text: res.tekst };
}

export function deliverOwnedVehicle(world, id, opts = {}) {
  if (opts.here) return deliverHere(world, id);
  const e = getGarageList(world).find((x) => x.id === id);
  if (!e) return { ok: false, text: 'Dat voertuig heb je niet' };
  // Samen spelen (#449): in de wereld van een ander zet de gastheer je eigen
  // voertuig neer. Je eigen save blijft zoals hij was, en de zijne ook: de kopie
  // hoort niet bij zijn collectie en gaat weg als je weggaat (coopbezit.js).
  if (world.coopRole === 'client' && world.coopBezitVraag) return bezorgInSessie(world, e);
  const short = e.hero ? 'Escapade' : e.model;
  if (e.status === 'driving') return { ok: false, text: `Je zit al in je ${short}` };
  if (world.pigeonMode) return { ok: false, text: 'Duiven krijgen geen auto bezorgd' };
  if (world.wanted > 0) return { ok: false, text: 'Met de politie op je hielen bezorgt niemand iets. Eerst ze kwijt!' };
  if (world.player.swimming) return { ok: false, text: 'Eerst even uit het water klimmen' };
  if (e.status === 'near' && e.dist < 60) {
    return { ok: true, text: `Je ${short} staat al om de hoek. Je ziet hem op je kaart` };
  }
  const wait = Math.ceil(lastDeliveryAt + DELIVERY_COOLDOWN - world.time);
  if (wait > 0) return { ok: false, text: `De bezorger is nog onderweg met de vorige. Probeer het over ${wait} s` };
  if (world.money < e.fee) return { ok: false, text: `Te weinig geld: afleveren kost ${e.feeLabel}` };

  const home = homeDelivery(world, e);
  if (home) return home;
  const px = world.player.x, py = world.player.y;
  const pick = (kind, model, ignore) => (kind === 'boat' ? jettySpot(world, px, py, ignore ? 450 : 5000) : findParkingSpot(world, px, py, model, { ignore }));
  const spot = placeEntry(world, id, pick);
  if (!spot) return { ok: false, text: 'De bezorger kan hier nergens parkeren. Loop eens naar een gewone straat' };
  if (e.fee) world.money -= e.fee;
  lastDeliveryAt = world.time;
  const text = describeSpot(world, spot, short);
  world.addMessage(text, 5);
  return { ok: true, text, x: spot.x, y: spot.y };
}

// Boats and the helicopter are brought home: the boat to "Jouw steiger", the
// heli to the helidek (home.js spawns them there once you are near).
function homeDelivery(world, e) {
  const kind = e.spec.kind;
  if (kind !== 'boat' && kind !== 'heli') return null;
  const o = getOwnedEntries().find((x) => x.key === e.id);
  if (!o) return null;
  const short = e.model;
  const where = kind === 'heli' ? 'op het helidek van jullie flat' : 'aan jouw steiger achter de House of Groningen';
  const after = kind === 'heli' ? '. Lift omhoog en de trap naar het dak' : '';
  if (e.status === 'garage') {
    const text = `Je ${short} ${kind === 'heli' ? 'staat' : 'ligt'} al klaar ${where}${after}`;
    world.addMessage(text, 5);
    return { ok: true, text, ...homeSpot(world, kind) };
  }
  const v = o.v;
  if (v) {
    if ((v.health ?? 100) < 100) o.health = v.health;
    o.flat = !!v.flat;
    const i = world.vehicles.indexOf(v);
    if (i >= 0) world.vehicles.splice(i, 1);
    o.v = null;
  }
  o.lost = false;
  if (e.fee) world.money -= e.fee;
  lastDeliveryAt = world.time;
  const text = `Je ${short} ${kind === 'heli' ? 'wordt naar het helidek van jullie flat gevlogen' : 'wordt naar jouw steiger achter de House of Groningen gevaren'}${after}`;
  world.addMessage(text, 5);
  return { ok: true, text, ...homeSpot(world, kind) };
}

function homeSpot(world, kind) {
  const p = kind === 'heli' ? getHomePad() : getHomeMooringForRender(world)[0];
  return p ? { x: p.x, y: p.y } : {};
}

export function locateOwnedVehicle(world, id) {
  const e = getGarageList(world).find((x) => x.id === id);
  if (!e) return { ok: false, text: 'Dat voertuig heb je niet' };
  const short = e.hero ? 'Escapade' : e.model;
  if (e.status === 'lost') return { ok: false, text: `Je ${short} is afgeschreven. Laat een nieuwe afleveren` };
  if (e.status === 'garage') {
    const kind = e.spec.kind;
    const hs = kind === 'heli' || kind === 'boat' ? homeSpot(world, kind) : null;
    if (hs && hs.x != null) return { ok: true, text: kind === 'heli' ? `Je ${short} staat thuis op het helidek, boven op de House of Groningen` : `Je ${short} ligt thuis aan jouw steiger in Paddepoel`, ...hs };
    const h = getHomeForRender()[0];
    if (!h) return { ok: false, text: `Je ${short} staat in de garage. Laat hem afleveren` };
    return { ok: true, text: `Je ${short} staat thuis in de garage in Paddepoel`, x: h.x, y: h.y };
  }
  if (e.status === 'driving') return { ok: false, text: `Je zit er al in` };
  const where = e.where && e.where.street ? `${streetPhrase(e.where.street)}${e.where.wijk ? ` (${e.where.wijk})` : ''}` : 'op je kaart';
  return { ok: true, text: `Je ${short} staat ${where}`, x: e.v.x, y: e.v.y };
}

export function whereText(e) {
  if (!e.where) return '';
  const parts = [e.where.street, e.where.wijk].filter(Boolean);
  const d = e.dist != null ? (e.dist < 1000 ? `${Math.round(e.dist / 10) * 10} m` : `${(e.dist / 1000).toFixed(1).replace('.', ',')} km`) : '';
  return [parts.join(', '), d].filter(Boolean).join(' · ');
}
