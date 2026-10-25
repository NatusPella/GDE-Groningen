import { playCinematic, roofAt, respawnFromScene, setCinematicLinks } from './cinematics.js';
import { spawnHeroCarNear, spawnVehicleOnRoad, manageTrafficPopulation, manageBikePopulation } from './vehicle.js';
import { slotFits, propBlocked, sleepingParkedCars } from './parkedcars.js';
import { spawnPedestriansNear } from './pedestrians.js';
import { helipadInfo, scriptHeli, landHeliOnPad } from './skyprops.js';
import { isInWater, closestPointOnSegment, pointInPolygon } from './util.js';
import { saveSoon } from './savehook.js';
import { nearestFacility, inDoorRange, poiLayerPlace } from './facilities.js';
import { edgeDistance } from './countryfield.js';

// Genre-style respawn trips, played after the DOOD / OPGEPAKT shot, to the
// nearest real facility (facilities.js), in town and out in the Ommelanden:
//  - dead: a hospital with an emergency department or a huisartsenpost
//    nearby, else the nearest doctor or ambulance post; the trauma
//    helicopter lands on the UMCG roof when that is the one, an ambulance
//    drives you anywhere else;
//  - busted: a police car takes you to the nearest police station.
// Either way you come back at the front door, with your partner and your red
// Escapade parked at the kerb right there. Three calm shots, fades between
// them: the pick-up, the arrival, the front door. The actual respawn
// (respawnPlayer: mission/side-job fail, money, wanted) happens at the first
// cut, or at once when the scene is skipped.

const HELI = { a: 2.6, b: 3.2, c: 2.4 };
const DRIVE = { a: 2.4, b: 3.0, c: 2.4 };
const FADE = 0.4;
const HOLD = 0.2;
const SEARCH_R = 70;
const AMBULANCE_MODEL = { name: 'ambulance', len: 6.0, wid: 2.0, maxSpeed: 30, accel: 8, brake: 18, turnRate: 2.6, color: '#f1d21c' };
const HERO_MODEL = { len: 4.0, wid: 1.65 };

const W = (x, h, y) => ({ x, y, z: h });
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 3;

let fadeEl = null;

// The dip to black between the death/busted moment and the trip (cinematics.js).
export function respawnFade(k, ms = 0) {
  setFade(k, ms);
}

function setFade(k, ms = 0) {
  if (!fadeEl) {
    fadeEl = document.createElement('div');
    fadeEl.id = 'respawn-fade';
    fadeEl.style.cssText = 'position:fixed;inset:0;z-index:14;background:#0c140e;opacity:0;pointer-events:none;';
    document.body.appendChild(fadeEl);
  }
  fadeEl.style.transition = ms ? `opacity ${ms}ms ease` : 'none';
  fadeEl.style.opacity = String(k);
}

// --- map lookups --------------------------------------------------------------

function inBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

function drivable(r) {
  return r.cat !== 'foot' && r.cat !== 'cycle' && !r.z && !/motorway|trunk/.test(r.type || '');
}

// Where to take the player: {site, mode: 'heli' | 'ambulance' | 'police'}.
function destination(w, busted, x, y) {
  let site = nearestFacility(busted ? 'police' : 'medical', x, y);
  if (!site) return null;
  if (busted) return { site, mode: 'police' };
  site = umcgEntrance(w.map, site);
  return { site, mode: site.umcg && helipadInfo(w.map) ? 'heli' : 'ambulance' };
}

// The UMCG's own point is its main entrance (Hoofdingang, meta.hospital).
function umcgEntrance(map, site) {
  const h = poiLayerPlace(map, 'hospital');
  return site.umcg && h ? { ...site, ...h, name: 'UMCG', umcg: true } : site;
}

// --- the Ommelanden ------------------------------------------------------------------

// Out in the Ommelanden, past the city's data: the trauma helicopter stays home.
function inCountry(x, y) {
  return inDoorRange(x, y) && edgeDistance(x, y) > 40;
}

// A polyline following the road network from (x, y) in travel direction
// `sign` (+1 along road.pts, -1 against), chaining onto connected drivable
// roads at the ends, `need` metres long (shorter at a dead end).
function roadPath(map, road, x, y, sign, need) {
  const pts = road.pts;
  let seg = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bd) { bd = cp.dist2; seg = i; }
  }
  const out = [[x, y]];
  let len = 0, r = road, idx = sign > 0 ? seg + 1 : seg, dir = sign;
  const seen = new Set([road]);
  for (let guard = 0; guard < 200 && len < need; guard++) {
    if (idx < 0 || idx >= r.pts.length) {
      const end = out[out.length - 1];
      let next = null;
      for (const o of map.roadsNear(end[0], end[1], 2)) {
        if (seen.has(o) || !drivable(o)) continue;
        const a = o.pts[0], b = o.pts[o.pts.length - 1];
        if (Math.hypot(a[0] - end[0], a[1] - end[1]) < 1.2) { next = { o, idx: 1, dir: 1 }; break; }
        if (!o.oneway && Math.hypot(b[0] - end[0], b[1] - end[1]) < 1.2) { next = { o, idx: o.pts.length - 2, dir: -1 }; break; }
      }
      if (!next) break;
      seen.add(next.o);
      r = next.o; idx = next.idx; dir = next.dir;
      continue;
    }
    const p = r.pts[idx], q = out[out.length - 1];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d > 0.01) { out.push([p[0], p[1]]); len += d; }
    idx += dir;
  }
  return out;
}

function polyline(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1];
  return {
    len,
    at(s) {
      if (pts.length < 2) return { x: pts[0][0], y: pts[0][1], a: 0 };
      s = Math.max(0, Math.min(len - 1e-3, s));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const a = pts[i - 1], b = pts[i];
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      return { x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    },
  };
}

function laneOf(road) {
  return road.oneway ? 0 : Math.min(1.8, (road.width || road.w || 6) / 4);
}

// Driving pose `s` metres along a path, kept in the right-hand lane.
function drivePose(path, s, lane) {
  const p = path.at(s);
  return { x: p.x - Math.sin(p.a) * lane, y: p.y + Math.cos(p.a) * lane, a: p.a };
}

function overlapsVehicle(w, x, y, r, skip) {
  for (const o of w.vehicles) {
    if (o === skip || o.cineTemp) continue;
    if (Math.hypot(o.x - x, o.y - y) < r + o.halfLen + 0.4) return true;
  }
  for (const o of sleepingParkedCars(w)) {
    if (Math.hypot(o.x - x, o.y - y) < r + o.halfLen + 0.4) return true;
  }
  return false;
}

function onOtherDrivable(map, own, x, y) {
  for (const r of map.roadsNear(x, y, 10)) {
    if (r === own || !drivable(r)) continue;
    const hw = (r.width || 3) / 2 + 0.3;
    for (let i = 0; i < r.pts.length - 1; i++) {
      if (closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]).dist2 < hw * hw) return true;
    }
  }
  return false;
}

// A legal kerbside spot for the hero car near `door`: on the stoep beside
// the road like the parked cars (level 0), else at the kerb inside the lane
// (level 1); facing the traffic on that side, clear of junctions, facades,
// water, bridges, street clutter and other cars.
function findKerbSpot(w, door, hero) {
  const map = w.map, m = HERO_MODEL;
  const cands = [];
  for (const r of map.roadsNear(door.x, door.y, SEARCH_R)) {
    if (!drivable(r) || r.bridge || r.roundabout) continue;
    const pts = r.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 6) continue;
      const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
      const clear = len >= 14 ? 5 : len / 2;
      const short = len < 14 ? 12 : 0;
      for (let t = clear; t <= len - clear + 0.01; t += 2) {
        for (const side of [1, -1]) {
          const nx = -ty * side, ny = tx * side;
          const angle = Math.atan2(ty, tx) + (side < 0 && !r.oneway ? Math.PI : 0);
          const hw = (r.width || 6) / 2;
          for (const [level, off] of [[0, hw + m.wid / 2 + 0.45], [1, Math.max(0, hw - m.wid / 2 - 0.25)]]) {
            const x = a[0] + tx * t + nx * off, y = a[1] + ty * t + ny * off;
            const d = Math.hypot(x - door.x, y - door.y);
            if (d > SEARCH_R) continue;
            const score = d + level * 20 + short + (r.cat === 'major' ? 8 : 0) + (r.type === 'service' ? 3 : 0);
            cands.push({ x, y, angle, road: r, nx, ny, level, score });
          }
        }
      }
    }
  }
  cands.sort((p, q) => p.score - q.score);
  let tested = 0;
  for (const c of cands) {
    if (++tested > 400) break;
    if (overlapsVehicle(w, c.x, c.y, m.len / 2, hero) || propBlocked(c.x, c.y, c.angle, m) || map.isOnBridge(c.x, c.y)) continue;
    if (c.level === 0) {
      if (!slotFits(map, c.road, c.x, c.y, c.angle, m, c.nx, c.ny)) continue;
    } else {
      const ca = Math.cos(c.angle), sa = Math.sin(c.angle);
      let bad = false;
      for (const [lx, ly] of [[m.len / 2, m.wid / 2], [m.len / 2, -m.wid / 2], [-m.len / 2, m.wid / 2], [-m.len / 2, -m.wid / 2], [0, 0]]) {
        const px = c.x + lx * ca - ly * sa, py = c.y + lx * sa + ly * ca;
        if (inBuilding(map, px, py) || isInWater(map, px, py) || onOtherDrivable(map, c.road, px, py)) { bad = true; break; }
      }
      if (bad) continue;
    }
    return c;
  }
  return null;
}

// The door, stepped out of its building towards the street.
function doorOut(map, door, toward) {
  const dx = toward.x - door.x, dy = toward.y - door.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  for (let s = 0; s <= Math.min(60, d); s += 0.5) {
    const x = door.x + ux * s, y = door.y + uy * s;
    if (inBuilding(map, x, y)) continue;
    const step = Math.min(1.2, Math.max(0, d - s - 2));
    const px = x + ux * step, py = y + uy * step;
    return inBuilding(map, px, py) ? { x, y } : { x: px, y: py };
  }
  const [x, y] = map.escapeBuilding(door.x, door.y, 1.2);
  return { x, y };
}

function walkable(map, x, y) {
  return !inBuilding(map, x, y) && !isInWater(map, x, y);
}

// OSM puts some sites on an address point in an empty lot; use the nearest
// facade then, so you still come out of a building.
function snapToFacade(map, site) {
  let best = null, bd = 4 * 4;
  for (const b of map.buildingsNear(site.x, site.y, 45)) {
    if (pointInPolygon(site.x, site.y, b.pts)) return site;
    const pts = b.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(site.x, site.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < bd) return site;
      if (!best || cp.dist2 < best.d2) best = { x: cp.x, y: cp.y, d2: cp.dist2 };
    }
  }
  return best && best.d2 < 45 * 45 ? { ...site, x: best.x, y: best.y } : site;
}

// Everything about where the player, the partner and the car end up.
function planArrival(w, siteIn) {
  const map = w.map;
  const site = snapToFacade(map, siteIn);
  const hero = w.vehicles.find((v) => v.isHeroCar && !v.wrecked && !v.sinking) || null;
  const car = findKerbSpot(w, site, hero);
  let p = null;
  if (car) {
    const door = doorOut(map, site, car);
    const ca = Math.cos(car.angle), sa = Math.sin(car.angle);
    const hl = HERO_MODEL.len / 2, hw = HERO_MODEL.wid / 2;
    const gap = (x, y) => {
      const dx = x - car.x, dy = y - car.y;
      return Math.hypot(Math.max(0, Math.abs(dx * ca + dy * sa) - hl), Math.max(0, Math.abs(dy * ca - dx * sa) - hw));
    };
    // at the door; else beside the car on the pavement side
    const side = Math.sign((door.y - car.y) * ca - (door.x - car.x) * sa) || 1;
    const nx = -sa * side, ny = ca * side;
    const cands = [];
    if (Math.hypot(door.x - car.x, door.y - car.y) <= 22) {
      cands.push([door.x, door.y]);
      for (const k of [1, -1]) cands.push([door.x + ca * k * (hl + 1.2), door.y + sa * k * (hl + 1.2)]);
    }
    for (const along of [-(hl + 1.2), hl + 1.2, 0]) cands.push([car.x + ca * along + nx * (hw + 1.4), car.y + sa * along + ny * (hw + 1.4)]);
    for (const [x, y] of cands) {
      if (gap(x, y) < 1.1 || !walkable(map, x, y) || onOtherDrivable(map, null, x, y) || !map.canWalkOut(x, y, 40)) continue;
      p = { x, y };
      break;
    }
  }
  if (!p) {
    const o = map.findOpenSpawn(site.x, site.y, 120) || { x: site.x, y: site.y };
    p = { x: o.x, y: o.y };
  }
  // face along the street, the car ahead
  let angle = car ? car.angle : 0;
  if (car && Math.cos(angle) * (car.x - p.x) + Math.sin(angle) * (car.y - p.y) < 0) angle += Math.PI;
  if (!car) {
    const rp = map.nearestRoadPoint(p.x, p.y, 60, true, true);
    if (rp) angle = Math.atan2(rp.y - p.y, rp.x - p.x);
  }
  return { car, player: { x: p.x, y: p.y, angle } };
}

// --- placing the car and the partner --------------------------------------------

function parkHeroCar(w, plan) {
  const map = w.map, c = plan.car;
  let hero = w.vehicles.find((v) => v.isHeroCar) || null;
  if (hero && (hero.wrecked || hero.sinking)) {
    // the old one stays behind as an ordinary wreck; a fresh one is brought
    hero.isHeroCar = false;
    hero = null;
  }
  if (!c) {
    if (hero) {
      const i = w.vehicles.indexOf(hero);
      if (i >= 0) w.vehicles.splice(i, 1);
    }
    const fresh = spawnHeroCarNear(map, plan.player.x, plan.player.y);
    if (fresh) w.vehicles.push(fresh);
    return fresh;
  }
  if (!hero) {
    hero = spawnHeroCarNear(map, c.x, c.y);
    if (!hero) return null;
    w.vehicles.push(hero);
  }
  Object.assign(hero, {
    x: c.x, y: c.y, angle: c.angle, z: map.spawnZ(c.x, c.y), vz: 0, pitch: 0,
    speed: 0, steer: 0, driftX: 0, driftY: 0, yawVel: 0, driver: null, passenger: null,
    road: null, plan: [], horn: false,
  });
  return hero;
}

function placeCompanion(w, plan) {
  const c = w.companion, map = w.map;
  if (!c) return;
  if (c.inVehicle) { c.inVehicle.passenger = null; c.inVehicle = null; }
  if (c.state === 'dead') { c.state = 'alive'; c.health = 100; }
  const p = plan.player;
  const car = plan.car;
  const spots = [];
  for (const side of [1, -1]) {
    const a = p.angle + side * Math.PI / 2;
    spots.push([p.x + Math.cos(a) * 1.1, p.y + Math.sin(a) * 1.1]);
  }
  if (car) {
    // or by the car's kerb-side door
    const ca = Math.cos(car.angle), sa = Math.sin(car.angle);
    for (const side of [1, -1]) {
      const nx = -sa * side, ny = ca * side;
      spots.push([car.x + nx * (HERO_MODEL.wid / 2 + 0.75), car.y + ny * (HERO_MODEL.wid / 2 + 0.75)]);
    }
  }
  let at = null;
  for (const [x, y] of spots) {
    if (walkable(map, x, y) && !onOtherDrivable(map, null, x, y) && Math.hypot(x - p.x, y - p.y) < 16 && Math.hypot(x - p.x, y - p.y) > 0.9) { at = [x, y]; break; }
  }
  if (!at) at = map.escapeBuilding(p.x + Math.cos(p.angle + Math.PI / 2) * 1.1, p.y + Math.sin(p.angle + Math.PI / 2) * 1.1, 0.3);
  [c.x, c.y] = at;
  c.vx = 0; c.vy = 0; c.z = 0; c.vz = 0;
  c.water = null; c.swimming = false; c.climb = null; c.climbSpot = null; c.swimTilt = 0;
  c.angle = Math.atan2(p.y - c.y, p.x - c.x);
}

function repopulate(w) {
  const p = w.player;
  try {
    manageTrafficPopulation(w);
    manageBikePopulation(w);
    w.pedestrians = w.pedestrians.filter((q) => q.state === 'dead' || Math.hypot(q.x - p.x, q.y - p.y) < 150);
    if (w.pedestrians.length < 45) w.pedestrians.push(...spawnPedestriansNear(w.map, p.x, p.y, 45 - w.pedestrians.length, Math.random));
  } catch (e) { console.warn(e); }
}

// --- temp vehicles (ambulance / police car) -----------------------------------------

function tempVehicle(w, kind, road, x, y) {
  const v = spawnVehicleOnRoad(w.map, road, kind === 'police', Math.random, false, false, { x, y });
  if (kind === 'ambulance') {
    v.model = AMBULANCE_MODEL;
    v.isAmbulance = true;
  }
  v.road = null; v.plan = []; v.speed = 0;
  v.driver = 'cine';
  v.cineTemp = true;
  v.missionCar = true;
  v.sirenOn = true;
  w.vehicles.push(v);
  return v;
}

// Ambient traffic standing on the scripted route (gameplay is paused) goes.
function clearRoute(w, path, lane, from, to) {
  w.vehicles = w.vehicles.filter((v) => {
    if (!v.road || v.cineTemp || v.isHeroCar || v.playerOwned || v.missionCar || v.isPolice || v.driver === 'player' || v.isBoat) return true;
    for (let s = from; s <= to; s += 3) {
      const q = drivePose(path, s, lane);
      if (Math.hypot(v.x - q.x, v.y - q.y) < v.halfLen + 3) return false;
    }
    return true;
  });
}

// First spot along the route where the vehicle does not stand in another one
// (the player's own car after a bust, the police cars that stopped you).
function freeStart(w, path, lane, len) {
  for (let s = 0; s < path.len - 8; s += 1) {
    const q = drivePose(path, s, lane);
    if (!overlapsVehicle(w, q.x, q.y, len / 2 + 0.6, null)) return s;
  }
  return 0;
}

function poseVehicle(w, v, pose, speed) {
  v.x = pose.x; v.y = pose.y; v.angle = pose.a;
  v.speed = speed;
  v.z = w.map.spawnZ(pose.x, pose.y);
}

// Pick-up path at (x, y): the longer way along the nearest street.
function departure(w, x, y) {
  const rp = w.map.nearestRoadPoint(x, y, 60, true, true);
  if (!rp || rp.road.z) return null;
  const fwd = roadPath(w.map, rp.road, rp.x, rp.y, 1, 45);
  const back = rp.road.oneway ? null : roadPath(w.map, rp.road, rp.x, rp.y, -1, 45);
  const path = polyline(back && polyline(back).len > polyline(fwd).len ? back : fwd);
  if (path.len < 4) return null;
  return { road: rp.road, path, lane: laneOf(rp.road) };
}

// Arrival path: the last stretch of street up to a stop in the lane just
// ahead of where the hero car is parked.
function arrival(w, plan, len) {
  const c = plan.car;
  const map = w.map;
  const road = c ? c.road : (map.nearestRoadPoint(plan.player.x, plan.player.y, 80, true, true) || {}).road;
  if (!road || !drivable(road)) return null;
  const ref = c || plan.player;
  const rp = { x: ref.x, y: ref.y };
  const ang = c ? c.angle : plan.player.angle;
  const ahead = c ? HERO_MODEL.len / 2 + len / 2 + 1.5 : 0;
  const lane = laneOf(road);
  // travel direction = the parked car's heading
  const pts = road.pts;
  let seg = 0, bd = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(ref.x, ref.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < bd) { bd = cp.dist2; seg = i; rp.x = cp.x; rp.y = cp.y; }
  }
  const sa = Math.atan2(pts[seg + 1][1] - pts[seg][1], pts[seg + 1][0] - pts[seg][0]);
  const sign = Math.cos(ang - sa) >= 0 ? 1 : -1;
  const fwd = polyline(roadPath(map, road, rp.x, rp.y, sign, ahead + 1));
  const stop = fwd.at(Math.min(ahead, fwd.len));
  const back = roadPath(map, road, stop.x, stop.y, -sign, 22);
  const path = polyline(back.reverse());
  if (path.len < 2) return null;
  return { road, path, lane };
}

// --- cameras ----------------------------------------------------------------------------

// No building between a camera at (ax, ay, az) and a target at (bx, by, bz).
function sightClear(map, ax, ay, az, bx, by, bz) {
  for (let i = 1; i < 10; i++) {
    const f = i / 10;
    if (roofAt(map, ax + (bx - ax) * f, ay + (by - ay) * f) > az + (bz - az) * f) return false;
  }
  return true;
}

// A calm ground-level vantage `dist` from (x, y), preferring direction `pref`,
// with a clear line of sight to what it films.
function vantage(w, x, y, pref, dist, h, lookZ = 1.2) {
  const map = w.map;
  for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, Math.PI]) {
    const a = pref + da;
    const cx = x + Math.cos(a) * dist, cy = y + Math.sin(a) * dist;
    if (!roofAt(map, cx, cy) && sightClear(map, cx, cy, h, x, y, lookZ) && !overlapsVehicle(w, cx, cy, 2.5, null)) return W(cx, h, cy);
  }
  const cx = x + Math.cos(pref) * dist, cy = y + Math.sin(pref) * dist;
  return W(cx, Math.max(h, roofAt(map, cx, cy) + 2), cy);
}

// The front door from the street side: player, partner, car and facade in
// one calm frame, drifting in a little.
function doorCam(w, plan) {
  const map = w.map, p = plan.player, car = plan.car;
  let ux = Math.cos(p.angle + Math.PI / 2), uy = Math.sin(p.angle + Math.PI / 2), d = 4;
  if (car) {
    d = Math.max(4, Math.hypot(car.x - p.x, car.y - p.y));
    ux = (car.x - p.x) / d; uy = (car.y - p.y) / d;
  } else {
    const rp = map.nearestRoadPoint(p.x, p.y, 60, true, true);
    const rl = rp ? Math.hypot(rp.x - p.x, rp.y - p.y) : 0;
    if (rl > 0.5) { ux = (rp.x - p.x) / rl; uy = (rp.y - p.y) / rl; }
  }
  const vx = -uy, vy = ux;
  // from the side, between the door and the car: both in frame, facade behind
  const far = Math.max(1, d / 8);
  for (const [along, lat] of [[0.5, 6.5], [0.5, -6.5], [1, 5], [1, -5], [1.3, 3.5], [1.3, -3.5]]) {
    const cx = p.x + ux * d * along + vx * lat * far, cy = p.y + uy * d * along + vy * lat * far;
    const mx = p.x + ux * d * 0.4, my = p.y + uy * d * 0.4;
    const dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1;
    if (!roofAt(map, cx, cy) && sightClear(map, cx, cy, 3, p.x, p.y, 1.2) && sightClear(map, cx, cy, 3, mx, my, 1) && !isInWater(map, cx, cy) && !overlapsVehicle(w, cx, cy, 1.5, null)) return { x: cx, y: cy, ux: dx / dl, uy: dy / dl };
  }
  return null;
}

function doorShot(w, plan, u, cam) {
  const p = plan.player, car = plan.car;
  const look = car ? W(lerp(p.x, car.x, 0.4), 1.1, lerp(p.y, car.y, 0.4)) : W(p.x, 1.2, p.y);
  if (cam) {
    const k = smooth(u);
    const side = (0.5 - k) * 2.4; // drift across, partner and car sliding into place
    return {
      position: W(cam.x + cam.ux * k * 1.6 - cam.uy * side, lerp(3.4, 2.6, k), cam.y + cam.uy * k * 1.6 + cam.ux * side),
      lookAt: look, fov: lerp(50, 44, k), cut: true,
    };
  }
  const fx = Math.cos(p.angle), fy = Math.sin(p.angle);
  const back = lerp(8.2, 7, smooth(u)), up = lerp(4.2, 3.4, smooth(u));
  return { position: W(p.x - fx * back, up, p.y - fy * back), lookAt: look, fov: 55, cut: true };
}

// --- the scene --------------------------------------------------------------------------

export function startRespawnScene(w, pending, opts) {
  try {
    return begin(w, pending, opts);
  } catch (e) {
    console.warn('respawn scene', e);
    return false;
  }
}

function begin(w, pending, opts) {
  const p = w.player;
  const fromX = p.inVehicle ? p.inVehicle.x : p.x, fromY = p.inVehicle ? p.inVehicle.y : p.y;
  let dest = destination(w, opts.busted, fromX, fromY);
  if (!dest) return false;
  // in a town park no ambulance gets through: the trauma heli comes instead
  const umcg = poiLayerPlace(w.map, 'hospital');
  if (dest.mode === 'ambulance' && umcg && helipadInfo(w.map) && !inCountry(fromX, fromY) && !inCountry(dest.site.x, dest.site.y) && !departure(w, fromX, fromY)) dest = { site: { ...umcg, name: 'UMCG', umcg: true }, mode: 'heli' };
  const plan = planArrival(w, dest.site);
  const T = dest.mode === 'heli' ? HELI : DRIVE;
  const total = T.a + T.b + T.c;
  const state = { w, pending, opts, dest, plan, done: false, vehicle: null, heli: null, fromX, fromY, doorCam: doorCam(w, plan) };
  const name = dest.site.name;
  const penalty = opts.moneyPenalty ? `, €${opts.moneyPenalty} boete` : '';
  const partner = w.companion ? (w.companion.character === 'tammo' ? 'Tammo' : 'Tessa') : null;
  const withCar = partner ? `${partner} staat klaar met de Escapade.` : 'De Escapade staat klaar.';
  const bureau = name.replace(/^Politiebureau\s+/, 'Bureau ');
  state.message = dest.mode === 'police'
    ? `Vrijgelaten bij ${bureau}${penalty}. ${withCar}`
    : dest.site.umcg ? `Opgelapt in het UMCG. ${withCar}` : `Opgelapt bij ${name}. ${withCar}`;

  let shotA, shotB;
  if (dest.mode === 'heli') {
    shotA = heliPickup(state, T.a);
    shotB = heliLanding(state, T.b);
  } else {
    shotA = drivePickup(state, T.a);
    shotB = driveArrival(state, T.b);
  }
  const kicker = dest.mode === 'heli' ? 'Traumaheli' : dest.mode === 'ambulance' ? 'Ambulance' : 'Afgevoerd';
  const title = dest.mode === 'police' ? bureau : dest.site.umcg ? 'UMCG' : name;

  pending.scene = true;
  const ok = playCinematic({
    id: 'respawn-trip', priority: 5, duration: total, pause: true, letterbox: true, skippable: true,
    kicker, title, cardFor: 2.1,
    onStart() {
      w.cinematicHidePlayers = dest.mode !== 'heli';
      setFade(1);
    },
    shot(u, t) {
      let fade = t < FADE ? 1 - t / FADE : 0;
      for (const [cut, hold] of [[T.a, HOLD], [T.a + T.b, HOLD]]) {
        const d = t < cut ? (cut - t) / FADE : Math.max(0, t - cut - hold) / FADE;
        fade = Math.max(fade, 1 - Math.min(1, d));
      }
      setFade(fade);
      if (t < T.a) return shotA(t);
      if (!state.done) respawnNow(state);
      if (t < T.a + T.b) return shotB(t - T.a);
      w.cinematicHidePlayers = false;
      if (state.vehicle) removeVehicle(state);
      return doorShot(w, plan, (t - T.a - T.b) / T.c, state.doorCam);
    },
    onEnd(skipped) {
      if (!state.done) respawnNow(state);
      finishScene(state);
      if (skipped) {
        setFade(1);
        requestAnimationFrame(() => setFade(0, 600));
      } else setFade(0, 250);
    },
  });
  if (!ok) {
    pending.scene = false;
    return false;
  }
  return true;
}

function respawnNow(state) {
  const { w, pending, opts, plan, dest } = state;
  state.done = true;
  if (w.pendingRespawn !== pending) return;
  w.pendingRespawn = null;
  const p = w.player;
  if (p.water && typeof p.leaveWater === 'function') p.leaveWater();
  p.climb = null;
  respawnFromScene(w, { ...opts, spot: { ...plan.player, name: dest.site.name, message: state.message } });
  parkHeroCar(w, plan);
  placeCompanion(w, plan);
  repopulate(w);
  if (w.input && w.input.reset) w.input.reset();
  // no new-wijk flyover straight after the trip
  w.quietUntil = w.time + 12;
  saveSoon(1.5);
}

function finishScene(state) {
  const { w } = state;
  w.cinematicHidePlayers = false;
  if (state.vehicle) removeVehicle(state);
  if (state.heli) landHeliOnPad(w);
}

function removeVehicle(state) {
  const w = state.w, v = state.vehicle;
  state.vehicle = null;
  const i = w.vehicles.indexOf(v);
  if (i >= 0) w.vehicles.splice(i, 1);
}

// --- trauma helicopter --------------------------------------------------------------

function poseHeli(state, h, x, y, z, heading, pitch, groundZ) {
  const w = state.w;
  h.x = x; h.y = y; h.z = z; h.heading = heading; h.pitch = pitch; h.bank = 0;
  h.rotor = 1;
  h.groundZ = groundZ;
  const agl = z - groundZ;
  h.downwash = agl < 24 ? clamp01((24 - agl) / 18) : 0;
  const night = w.dayNight ? w.dayNight.night : 0;
  h.searchlight = night > 0.25 ? 1 : 0;
}

function heliPickup(state, dur) {
  const w = state.w, map = w.map;
  const pad = helipadInfo(map);
  const x = state.fromX, y = state.fromY;
  let roof = 0;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    for (const r of [0, 7, 14]) roof = Math.max(roof, roofAt(map, x + Math.cos(a) * r, y + Math.sin(a) * r));
  }
  const hover = Math.max(15, roof + 9);
  // it comes in from the hospital side, towards the camera
  let ux = x - pad.x, uy = y - pad.y;
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul; uy /= ul;
  if (ul < 5) { ux = 1; uy = 0; }
  const sx = x - ux * 85, sy = y - uy * 85, sz = hover + 28;
  const heading = Math.atan2(uy, ux);
  const cam = vantage(w, x, y, Math.atan2(uy, ux) + 0.35, 24, 3);
  return (t) => {
    if (!state.heli) state.heli = scriptHeli(w);
    const h = state.heli;
    const k = easeOut(t / 2.0);
    const dip = 3 * smooth((t - 1.9) / 0.7);
    if (h) poseHeli(state, h, lerp(sx, x, k), lerp(sy, y, k), lerp(sz, hover, k) - dip, heading, 0.1 * (1 - k), 0);
    const hz = lerp(sz, hover, k) - dip;
    const lookZ = lerp(1.5, hz * 0.72, smooth(t / 1.6));
    const lx = lerp(x, h ? h.x : x, 0.35), ly = lerp(y, h ? h.y : y, 0.35);
    const drift = t * 0.5;
    return { position: W(cam.x + ux * drift, cam.z + t * 0.15, cam.y + uy * drift), lookAt: W(lx, lookZ, ly), fov: 52, cut: true };
  };
}

function heliLanding(state, dur) {
  const w = state.w, map = w.map;
  const pad = helipadInfo(map);
  const ax = Math.cos(pad.angle), ay = Math.sin(pad.angle);
  const sx = pad.x - ax * 60, sy = pad.y - ay * 60, sz = pad.deck + 20;
  // side-on to the final approach, a little above the deck
  let cam = null;
  for (const [side, dist] of [[1, 32], [-1, 32], [1, 46], [-1, 46]]) {
    const cx = pad.x - ay * side * dist - ax * 8, cy = pad.y + ax * side * dist - ay * 8;
    if (roofAt(map, cx, cy) < pad.deck + 3) { cam = W(cx, pad.deck + 7, cy); break; }
  }
  if (!cam) {
    const cx = pad.x - ay * 40 - ax * 8, cy = pad.y + ax * 40 - ay * 8;
    cam = W(cx, Math.max(pad.deck + 7, roofAt(map, cx, cy) + 3), cy);
  }
  return (t) => {
    const h = state.heli || (state.heli = scriptHeli(w));
    if (!h) return null;
    const k = easeOut(t / 1.9);
    const down = smooth((t - 1.9) / 0.9);
    const z = lerp(sz, pad.deck + 4, k) - 4 * down;
    poseHeli(state, h, lerp(sx, pad.x, k), lerp(sy, pad.y, k), z, pad.angle, 0.1 * (1 - k), pad.deck);
    const push = smooth(t / dur) * 0.18;
    return { position: W(lerp(cam.x, pad.x, push), cam.z - push * 4, lerp(cam.y, pad.y, push)), lookAt: W(lerp(pad.x, h.x, 0.7), z + 1, lerp(pad.y, h.y, 0.7)), fov: lerp(46, 40, smooth(t / dur)), cut: true };
  };
}

// --- ambulance / police car -------------------------------------------------------------

function drivePickup(state, dur) {
  const w = state.w, map = w.map;
  const x = state.fromX, y = state.fromY;
  const kind = state.dest.mode;
  const dep = departure(w, x, y);
  if (!dep) {
    // nowhere to drive: a slow rise over the spot
    const cam = vantage(w, x, y, 0.6, 9, 3);
    return (t) => ({ position: W(cam.x, cam.z + t * 1.2, cam.y), lookAt: W(x, 0.8, y), fov: 50, cut: true });
  }
  const vlen = kind === 'ambulance' ? AMBULANCE_MODEL.len : 4.3;
  const s0 = freeStart(w, dep.path, dep.lane, vlen);
  const start = drivePose(dep.path, s0, dep.lane);
  const fx = Math.cos(start.a), fy = Math.sin(start.a);
  // behind and to the pavement side of the start, looking along the street
  const cam = vantage(w, start.x, start.y, start.a + Math.PI - 0.8, 10, 2.6);
  return (t) => {
    if (!state.vehicle && !state.done) {
      clearRoute(w, dep.path, dep.lane, s0, dep.path.len);
      state.vehicle = tempVehicle(w, kind, dep.road, start.x, start.y);
    }
    const v = state.vehicle;
    const tt = Math.max(0, t - 0.8);
    const s = Math.min(dep.path.len - 0.5, s0 + 0.5 * 5.5 * tt * tt);
    const pose = drivePose(dep.path, s, dep.lane);
    if (v) poseVehicle(w, v, pose, 5.5 * tt);
    return { position: W(cam.x, cam.z, cam.y), lookAt: W(pose.x + fx * 2, 1.1, pose.y + fy * 2), fov: 50, cut: true };
  };
}

function driveArrival(state, dur) {
  const w = state.w, map = w.map;
  const kind = state.dest.mode;
  const len = kind === 'ambulance' ? AMBULANCE_MODEL.len : 4.3;
  const arr = arrival(w, state.plan, len);
  const p = state.plan.player;
  if (!arr) return (t) => doorShot(w, state.plan, t / dur, state.doorCam);
  const stopT = dur - 0.5;
  const L = arr.path.len;
  const decel = (2 * L) / (stopT * stopT);
  const end = drivePose(arr.path, L, arr.lane);
  // from the pavement near the door, the vehicle pulling up in front
  let cx = p.x, cy = p.y;
  const ex = Math.cos(end.a), ey = Math.sin(end.a);
  let found = false;
  for (const [al, lat] of [[0, 0], [-6, 0], [-10, 0], [6, 0], [10, 0], [-6, 1.5], [-6, -1.5], [12, 1.5], [12, -1.5]]) {
    const x = p.x + ex * al - ey * lat, y = p.y + ey * al + ex * lat;
    if (Math.hypot(x - end.x, y - end.y) < 7 || roofAt(map, x, y) || !walkable(map, x, y)) continue;
    cx = x; cy = y; found = true;
    break;
  }
  if (!found) {
    // ahead of the stop, looking back down the street at it
    for (const d of [13, 9, 17]) {
      const x = end.x + ex * d, y = end.y + ey * d;
      if (!roofAt(map, x, y) && !isInWater(map, x, y)) { cx = x; cy = y; break; }
    }
  }
  const lift = roofAt(map, cx, cy);
  return (t) => {
    const w2 = state.w;
    if (!state.vehicle || !state.arriving) {
      state.arriving = true;
      clearRoute(w2, arr.path, arr.lane, 0, L);
      if (!state.vehicle) {
        const a = drivePose(arr.path, 0, arr.lane);
        state.vehicle = tempVehicle(w2, kind, arr.road, a.x, a.y);
      }
      // the police car arrives quietly; the ambulance keeps its lights on
      state.vehicle.sirenOn = kind === 'ambulance';
    }
    const rem = Math.max(0, stopT - t);
    const s = L - 0.5 * decel * rem * rem;
    const pose = drivePose(arr.path, s, arr.lane);
    poseVehicle(w2, state.vehicle, pose, decel * rem);
    return { position: W(cx, 2.1 + lift, cy), lookAt: W(lerp(pose.x, end.x, 0.3), 1.1, lerp(pose.y, end.y, 0.3)), fov: 50, cut: true };
  };
}

// Where the player comes back for a facility (spotcheck.js, facilities_test).
export function respawnArrival(w, site) {
  return planArrival(w, umcgEntrance(w.map, site));
}

// Debug handle for testing from the console.
if (typeof window !== 'undefined') {
  window.__gdeRespawn = {
    destination: (w, busted, x, y) => destination(w, busted, x, y),
    plan: (w, site) => planArrival(w, site),
  };
}

setCinematicLinks({ startRespawnScene, respawnFade });
