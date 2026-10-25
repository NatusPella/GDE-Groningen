// Railway simulation: shuttle trains on the routes baked into stad.json
// (scripts/add_railways.py), level crossings that warn/close ahead of them,
// and what happens to anything standing on the track. Rendering lives in
// railway3d.js, which only reads the state exported here.
import { requestRespawn } from './world.js';
import { DEAD_DURATION } from './pedconst.js';
import { knockDown } from './ragdoll.js';
import { disableVehicle } from './vehiclewreck.js';
import { vehicleHooks } from './vehiclehooks.js';
import { splatterPed, bleedPed, GIB_SPEED } from './gore3d.js';
import { railHeightFn } from './railprofile.js';
import { onPerron } from './perrons.js';
import { duwVanWagen, volgTrein, TREIN_SPRONG_M } from './treincoop.js';
import { MAP_PALETTE, INK } from './mapstyle.js';

const HALF_WIDTH = 1.45;
const DWELL = 25;
const ACCEL = 0.75;
const DECEL = 0.8;
const WARN_AHEAD_S = 14;
const WARN_CLEAR_M = 8;
const BOOM_DELAY = 3;
const BOOM_DOWN_S = 5;
const BOOM_UP_S = 4;
const BELL_INTERVAL = 0.32;
const CLACK_EVERY_M = 19;
const HIT_COOLDOWN = 1.2;
const LEVEL_RADIUS = 28;

// Look-alikes of what runs through Groningen, without any operator marks:
// a yellow/blue double-deck intercity (VIRM-style) and turquoise/white
// regional sets with a short central power module (GTW / WINK-style).
// segments run from the +s end (index 0) to the -s end of the train.
const GTW_SEGMENTS = [
  { len: 17.5, kind: 'car', cab: 1 }, { len: 4.6, kind: 'power' }, { len: 17.5, kind: 'car', cab: -1 },
];
export const TRAIN_TYPES = {
  gtw: {
    label: 'Stoptrein', vmax: 22, height: 3.75, doubleDeck: false, front: 'gtw', gap: 0.35,
    body: 0xf2f4f3, stripe: 0x00a3ad, door: 0x00a3ad, nose: 0x00a3ad, accent: 0x0b3b4f,
    segments: GTW_SEGMENTS,
  },
  wink: {
    label: 'Stoptrein', vmax: 22, height: 3.85, doubleDeck: false, front: 'wink', gap: 0.35,
    body: 0xeef2f2, stripe: 0x00a3ad, door: 0x0b3b4f, nose: 0x00a3ad, accent: 0x0b3b4f,
    segments: [{ len: 19.5, kind: 'car', cab: 1 }, { len: 5, kind: 'power' }, { len: 19.5, kind: 'car', cab: -1 }],
  },
  virm: {
    label: 'Intercity', vmax: 24, height: 4.7, doubleDeck: true, front: 'virm', gap: 1.0,
    body: 0xffc917, stripe: 0x003082, door: 0x003082, nose: 0xffc917, accent: 0xd52b1e,
    segments: [
      { len: 26.5, kind: 'car', cab: 1 }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car' }, { len: 26.5, kind: 'car', cab: -1 },
    ],
  },
};
// story only (fjordtrain.js): a diesel loco with car-carrier flats
const MISSION_TRAIN_TYPES = {
  goederen: {
    label: 'Goederentrein', vmax: 12, height: 4.1, doubleDeck: false, front: 'wink', gap: 0.8,
    body: 0x3d4a57, stripe: 0xe8b21c, door: 0x2a323b, nose: 0xe8b21c, accent: 0x1c2228,
    segments: [{ len: 17, kind: 'loco' }, { len: 14, kind: 'flat' }, { len: 14, kind: 'flat' }, { len: 14, kind: 'flat' }],
  },
};
export const FLAT_DECK_Z = 1.25;

let routes = [];
let trains = [];
let crossings = [];
let bridgeZones = [];
let lifts = [];
let bounds = null;
let ready = false;

export function getTrains() { return trains; }
// the built routes (stagerit.js finds the line near a story platform)
export function getRoutes() { return routes; }
export function getLevelCrossings() { return crossings; }

// Track height above ground at (x, y): the solved track profile
// (railprofile.js, scripts/world/railprofile.mjs) where the map has one, else
// ramps round the rail lifts of add_railways.py; flat elsewhere.
let profileZ = null;
export function railZ(x, y) {
  if (profileZ) return profileZ(x, y);
  let z = 0;
  for (const L of lifts) {
    const d = Math.hypot(L.x - x, L.y - y);
    if (d >= L.plateau + L.ramp) continue;
    const t = Math.max(0, (d - L.plateau) / L.ramp);
    const h = L.h * (1 - t * t * (3 - 2 * t));
    if (h > z) z = h;
  }
  return z;
}

// Off the map edge (plus a margin in the fog) the trains are not drawn.
// setRailExtraWorld: more built world (the proefstrook's tiles, ?corridor).
let extraWorld = null;
export function setRailExtraWorld(fn) { extraWorld = fn; }
export function isOffMap(x, y, margin = 40) {
  if (!bounds) return false;
  if (extraWorld && extraWorld(x, y)) return false;
  return x < bounds[0] - margin || x > bounds[2] + margin || y < bounds[1] - margin || y > bounds[3] + margin;
}

function buildRoute(r) {
  const pts = r.pts;
  const s = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) s[i] = s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { name: r.name, train: r.train || 'gtw', pts, s, len: s[pts.length - 1], stops: r.stops.slice().sort((a, b) => a.s - b.s), crossings: [] };
}

// Position on a route at arc length `at` (clamped to its ends).
export function routePoint(route, at) {
  const { pts, s } = route;
  if (at <= 0) return [pts[0][0], pts[0][1]];
  if (at >= route.len) { const p = pts[pts.length - 1]; return [p[0], p[1]]; }
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (s[mid] <= at) lo = mid; else hi = mid;
  }
  const t = (at - s[lo]) / ((s[hi] - s[lo]) || 1);
  return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * t, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * t];
}

function projectOnRoute(route, x, y) {
  const { pts, s } = route;
  let best = Infinity, at = 0;
  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], ay = pts[i - 1][1];
    const dx = pts[i][0] - ax, dy = pts[i][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const d2 = (ax + dx * t - x) ** 2 + (ay + dy * t - y) ** 2;
    if (d2 < best) { best = d2; at = s[i - 1] + (s[i] - s[i - 1]) * t; }
  }
  return { s: at, d: Math.sqrt(best) };
}

// Samen spelen (#428): een gast speelt geen eigen dienstregeling, de host stuurt waar een trein staat (het midden van de trein
// en zijn snelheid met teken). Zet de dienstregeltrein van die route daar neer; de wagons volgen uit de route.
// De gast zet de wagens niet meteen op die plek (#434): het doel komt van de host, zijn eigen booglengte (t.gastC) loopt
// tussen twee snapshots door met de laatste snelheid mee en schuift zacht bij (stapTreinenGast, treincoop.js volgTrein).
export function zetTreinVanHost(routeIdx, x, y, v) {
  const route = routes[routeIdx];
  if (!route) return null;
  const t = trains.find((q) => q.route === route && q.state !== 'mission' && q.state !== 'player');
  if (!t) return null;
  const s = projectOnRoute(route, x, y).s;
  t.gastDoel = s;
  t.gastV = Number.isFinite(v) ? v : 0; // met teken: de booglengte loopt mee met de rijrichting
  t.v = Math.abs(t.gastV);
  if (Math.abs(t.gastV) > 0.05) t.dir = t.gastV > 0 ? 1 : -1;
  // de eerste snapshot en een sprong (de host zette de trein ergens anders neer): meteen goed staan; anders stapTreinenGast
  if (!Number.isFinite(t.gastC) || Math.abs(s - t.gastC) > TREIN_SPRONG_M) { t.gastC = s; t.c = s; placeCars(t); }
  return t;
}
// Elke frame bij de gast (gastOverwegen): de trein rijdt door met de laatste snelheid van de host en haalt een late
// snapshot zacht in, in plaats van stil te staan en dan te springen (#434).
export function stapTreinenGast(dt) {
  for (const t of trains) {
    if (t.gastWeg !== false || !Number.isFinite(t.gastDoel)) continue;
    const c = volgTrein(Number.isFinite(t.gastC) ? t.gastC : t.gastDoel, t.gastDoel, t.gastV, dt, t.route.len);
    if (c === t.c) continue;
    t.gastC = c;
    t.c = c;
    placeCars(t);
  }
}
// Alle treinen van de host in één keer: lijst = [{ route, x, y, v }]. De gast speelt de rest van de dienstregeling niet: een trein die de host
// niet noemt, staat bij de gast niet getekend (gastWeg) en laat de overwegen met rust, in plaats van stil te staan op een verzonnen plek.
export function zetTreinenVanHost(lijst) {
  const gekozen = new Set();
  for (const h of lijst || []) { const t = zetTreinVanHost(h.route, h.x, h.y, h.v); if (t) gekozen.add(t); }
  for (const t of trains) if (t.state !== 'mission' && t.state !== 'player') t.gastWeg = !gekozen.has(t);
}
// De overwegen van een gast: de slagbomen, het knipperlicht en de bel volgen de treinen die de host stuurt (elke frame; updateRailway draait niet bij een gast).
// Daarna de trein zelf: die is ook solide (gastTreinContact).
export function gastOverwegen(dt, world) {
  stapTreinenGast(dt);
  for (const c of crossings) c.threat = false;
  for (const t of trains) {
    if (t.gastWeg) continue;
    for (const rc of t.route.crossings) {
      const rel = (rc.s - t.c) * t.dir;
      if (Math.abs(rc.s - t.c) < t.halfLen + WARN_CLEAR_M || (rel > 0 && t.v > 0.5 && (rel - t.halfLen) / t.v < WARN_AHEAD_S)) rc.crossing.threat = true;
    }
  }
  stapOverwegen(dt, world);
  gastTreinContact(world);
}

// Een trein rijdt niet door een gast heen (#436): de gast speelt de dienstregeling niet, maar de wagens staan op de plek uit
// de snapshot (zetTreinenVanHost). Zijn eigen lichaam wordt er elke frame uit geduwd, net als de host dat met zijn spelers doet;
// geen schade, want het lichaam van de gast is van de host (die de klap in resolveContacts al afhandelt).
export function gastTreinContact(world) {
  const p = world && world.player;
  if (!p || p.inVehicle || world.trainDriving || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return 0;
  const z = (p.gz || 0) + (p.z || 0);
  let n = 0;
  for (const t of trains) {
    if (t.gastWeg !== false) continue; // nog geen snapshot gehad, of de host noemt deze trein niet (#428)
    for (const car of t.cars) {
      if (Math.abs(car.x - p.x) > car.len / 2 + 3 || Math.abs(car.y - p.y) > car.len / 2 + 3) continue;
      if (Math.abs((car.z || 0) - z) > 2.5) continue; // wie op een viaduct of een hoog perron staat, staat niet op het spoor (#436)
      if (opPerron(world, p.x, p.y, z)) continue; // het perron ligt naast het spoor
      const push = duwVanWagen(car, p.x, p.y, p.radius || 0.35);
      if (push) { p.x += push.nx * push.depth; p.y += push.ny * push.depth; n++; }
    }
  }
  if (world) world.coopTreinDuw = n; // voor de testbank
  return n;
}

function nearLevelCrossing(x, y) {
  for (const c of crossings) if (Math.hypot(c.x - x, c.y - y) < LEVEL_RADIUS) return true;
  return false;
}

// Where a car road crosses the track away from a level crossing it is a
// bridge or underpass in reality; nothing there meets the train.
function findBridgeZones(map) {
  const zones = [];
  for (const route of routes) {
    for (let at = 0; at < route.len; at += 2) {
      const [x, y] = routePoint(route, at);
      const [x2, y2] = routePoint(route, at + 1);
      const tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1;
      if (nearLevelCrossing(x, y) || railZ(x, y) > 2) continue;
      for (const road of map.roadsNear(x, y, 12)) {
        if (road.cat === 'foot') continue;
        const P = road.pts;
        for (let i = 0; i < P.length - 1; i++) {
          const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay;
          const L2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
          const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
          const cross = Math.abs((dx * ty - dy * tx) / (Math.sqrt(L2) * tl));
          if (d < road.width / 2 + 1 && cross > 0.4) {
            if (!zones.some((z) => Math.hypot(z.x - x, z.y - y) < 4)) zones.push({ x, y, r: road.width / 2 + 5 });
          }
        }
      }
    }
  }
  return zones;
}

export function inRailBridgeZone(x, y) {
  for (const z of bridgeZones) if ((z.x - x) ** 2 + (z.y - y) ** 2 < z.r * z.r) return true;
  return false;
}

function makeTrain(route, type, atStop, dir, dwell) {
  const cfg = TRAIN_TYPES[type] || MISSION_TRAIN_TYPES[type] || TRAIN_TYPES.gtw;
  const segs = cfg.segments;
  const len = segs.reduce((a, g) => a + g.len, 0) + (segs.length - 1) * cfg.gap;
  // arc offset of each segment's centre from the train centre (+s first)
  let run = len / 2;
  const cars = segs.map((g) => {
    const off = run - g.len / 2;
    run -= g.len + cfg.gap;
    return { x: 0, y: 0, angle: 0, off, len: g.len, seg: g };
  });
  return {
    route, type, cfg, halfLen: len / 2,
    c: route.stops[atStop].s, v: 0, dir, target: atStop, state: 'dwell', timer: dwell,
    cars, clackRun: 0,
  };
}

export function initRailway(world) {
  const map = world.map;
  lifts = map.railLifts || [];
  const fn = railHeightFn(map);
  profileZ = fn.profiled ? fn : null;
  bounds = map.meta.bounds;
  routes = (map.railRoutes || []).map(buildRoute);
  crossings = (map.levelCrossings || []).map((c) => ({
    x: c.x, y: c.y, railAngle: c.railAngle,
    roads: c.roads.map((r) => {
      const ux = Math.cos(r.angle), uy = Math.sin(r.angle);
      const mid = (r.t0 + r.t1) / 2;
      return { ...r, ux, uy, cx: r.x + ux * mid, cy: r.y + uy * mid, halfSpan: (r.t1 - r.t0) / 2 + 2 };
    }),
    warn: false, warnAt: 0, boom: 0, flash: 0, bellT: 0,
  }));
  for (const route of routes) {
    for (const c of crossings) {
      const pr = projectOnRoute(route, c.x, c.y);
      if (pr.d < 10) route.crossings.push({ crossing: c, s: pr.s });
    }
  }
  bridgeZones = findBridgeZones(map);

  trains = [];
  routes.forEach((route, i) => {
    if (route.stops.length < 2) return;
    // alternate starting ends so the shuttles are out of phase
    const end = i % 2 ? 0 : route.stops.length - 1;
    trains.push(makeTrain(route, route.train, end, end === 0 ? 1 : -1, 4 + i * 12));
  });
  for (const t of trains) placeCars(t);
  ready = true;
}

export { placeCars as placeTrain };

function placeCars(t) {
  const { route } = t;
  // a train standing still (dwell, parked) is already where its arc length puts it
  if (t.placedAt === t.c && t.placedRoute === route) return;
  t.placedAt = t.c;
  t.placedRoute = route;
  for (const car of t.cars) {
    const at = t.c + car.off;
    const bogie = car.len * 0.36;
    const a = routePoint(route, at - bogie);
    const b = routePoint(route, at + bogie);
    car.x = (a[0] + b[0]) / 2;
    car.y = (a[1] + b[1]) / 2;
    car.angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const za = railZ(a[0], a[1]), zb = railZ(b[0], b[1]);
    car.z = (za + zb) / 2;
    car.pitch = Math.atan2(zb - za, 2 * bogie);
  }
}

// Seconds for the train to cover `d` metres from speed v (accelerating to vmax).
function timeToCover(d, v, vmax) {
  if (d <= 0) return 0;
  const dAcc = Math.max(0, (vmax * vmax - v * v) / (2 * ACCEL));
  if (d <= dAcc) return (-v + Math.sqrt(v * v + 2 * ACCEL * d)) / ACCEL;
  return (vmax - v) / ACCEL + (d - dAcc) / vmax;
}

function audio(world, ev) {
  const q = world.audioEvents || (world.audioEvents = []);
  if (q.length < 64) q.push(ev);
}

const DWELL_TERMINUS = 35;

function dwellAt(route, idx) {
  const stop = route.stops[idx];
  if (stop.offmap) return 70 + Math.random() * 60;
  return idx === 0 || idx === route.stops.length - 1 ? DWELL_TERMINUS : DWELL;
}

function nearPlayer(world, t, r) {
  const p = world.player, car = t.cars[t.cars.length >> 1];
  return Math.hypot(p.x - car.x, p.y - car.y) < r;
}

function stepTrain(t, dt, world) {
  const { route, cfg } = t;
  const stops = route.stops;
  if (t.state === 'player') { stepDriven(t, dt, world); return; }
  if (t.state === 'mission') { stepMission(t, dt, world); return; }
  if (t.state === 'parked') { stepParked(t, dt, world); return; }
  if (t.state === 'dwell') {
    t.timer -= dt;
    if (t.timer <= 0) {
      const from = stops[t.target];
      t.state = 'run';
      t.target += t.dir;
      if (!from.offmap) {
        audio(world, { kind: 'train_horn', x: t.cars[0].x, y: t.cars[0].y });
        const dest = stops[t.dir > 0 ? stops.length - 1 : 0].name;
        if (nearPlayer(world, t, 90)) world.addMessage(`${cfg.label} naar ${dest} vertrekt`, 3.5);
      }
    }
    return;
  }
  const goal = stops[t.target].s;
  const dist = (goal - t.c) * t.dir;
  const vBrake = Math.max(dist > 0.05 ? 0.4 : 0, Math.sqrt(2 * DECEL * Math.max(0, dist)));
  const vWant = Math.min(cfg.vmax, vBrake, blockedSpeed(t));
  if (t.v < vWant) t.v = Math.min(vWant, t.v + ACCEL * (1 - 0.6 * (t.v / cfg.vmax) ** 2) * dt);
  else t.v = Math.max(vWant, t.v - DECEL * 1.6 * dt);
  const step = Math.min(t.v * dt, Math.max(0, dist));
  t.c += step * t.dir;
  clack(t, step, world);
  if (dist - step < 0.05) {
    t.c = goal;
    t.v = 0;
    t.state = 'dwell';
    t.timer = dwellAt(route, t.target);
    if (t.target === 0) t.dir = 1;
    else if (t.target === stops.length - 1) t.dir = -1;
    if (!stops[t.target].offmap && nearPlayer(world, t, 90)) world.addMessage(`${cfg.label} is aangekomen in ${stops[t.target].name}`, 3);
  }
}

function clack(t, step, world) {
  t.clackRun += step;
  if (t.clackRun <= CLACK_EVERY_M) return;
  t.clackRun = 0;
  const p = world.player;
  const car = t.cars[(Math.random() * t.cars.length) | 0];
  if (Math.hypot(p.x - car.x, p.y - car.y) < 140) audio(world, { kind: 'train_clack', x: car.x, y: car.y, strength: Math.min(1, t.v / 20) });
}

// --- a train driven by the player (traindrive.js sets t.ctl) ---------------
// t.cab: +1 when the cab is the +s end; t.pv: signed speed along +s.
const DRIVE_VMAX_K = 1.45;
const DRIVE_ACCEL = 1.6;
const DRIVE_BRAKE = 2.2;
const DRIVE_EBRAKE = 3.6;
const DRIVE_REV_MAX = 6;
const DRIVE_END_DECEL = 2.4;
const PARK_RESUME_S = 25;
const PARK_RESUME_DIST = 70;
const PARK_MAX_S = 180;

function isStolen(t) { return t.state === 'player' || t.state === 'parked' || t.state === 'mission'; }

// Arc range of the route the player may drive on: inside the map, never off
// into the fog where the city is not streamed in.
export function driveRange(route) {
  if (route.driveRange) return route.driveRange;
  let lo = null, hi = 0;
  for (let at = 0; at <= route.len; at += 5) {
    const [x, y] = routePoint(route, at);
    if (isOffMap(x, y, -30)) continue;
    if (lo === null) lo = at;
    hi = at;
  }
  route.driveRange = [lo ?? 0, lo === null ? route.len : hi];
  return route.driveRange;
}

export function hijackTrain(t, cab) {
  t.state = 'player';
  t.cab = cab;
  t.pv = 0;
  t.v = 0;
  t.dir = cab;
  t.ctl = { throttle: false, brake: false, emergency: false };
  t.endWarned = false;
}

export function parkTrain(t) {
  t.state = 'parked';
  t.parkT = 0;
  t.pv = 0;
  t.v = 0;
  t.ctl = null;
}

// Back into the timetable from wherever it was left: on to the next stop.
function resumeService(t) {
  const stops = t.route.stops;
  const ahead = (dir) => {
    const list = stops.map((st, i) => i).filter((i) => (stops[i].s - t.c) * dir > 1);
    if (!list.length) return -1;
    return dir > 0 ? list[0] : list[list.length - 1];
  };
  let dir = t.dir || 1;
  let idx = ahead(dir);
  if (idx < 0) { dir = -dir; idx = ahead(dir); }
  if (idx < 0) idx = 0;
  Object.assign(t, { state: 'run', dir, target: idx, v: 0, pv: 0, ctl: null, cab: 0 });
}

export function returnStolenTrains() {
  for (const t of trains) if (t.state === 'parked') resumeService(t);
}

function stepParked(t, dt, world) {
  t.parkT += dt;
  const p = world.player;
  const car = t.cars[t.cars.length >> 1];
  const far = Math.hypot(p.x - car.x, p.y - car.y) > PARK_RESUME_DIST + t.halfLen;
  if ((t.parkT > PARK_RESUME_S && far) || t.parkT > PARK_MAX_S) resumeService(t);
}

function stepDriven(t, dt, world) {
  const { route, cfg } = t;
  const ctl = t.ctl || {};
  const vmax = cfg.vmax * DRIVE_VMAX_K;
  let u = (t.pv || 0) * t.cab;
  const toward = (target, rate) => { u = u > target ? Math.max(target, u - rate * dt) : Math.min(target, u + rate * dt); };
  if (ctl.emergency) toward(0, DRIVE_EBRAKE);
  else if (ctl.power !== undefined) {
    // tractiehendel (treincabine.js): power 0..1 trekt, brakeF 0..1 remt; de rem laat de trein nooit achteruit rijden
    if (ctl.brakeF > 0) toward(0, DRIVE_BRAKE * ctl.brakeF);
    else if (ctl.power > 0) {
      if (u < -0.2) toward(0, DRIVE_BRAKE);
      else {
        const cap = vmax * (0.4 + 0.6 * ctl.power);
        if (u < cap) u = Math.min(cap, u + DRIVE_ACCEL * ctl.power * Math.max(0.08, 1 - (u / vmax) ** 2) * dt);
        else toward(0, 0.05 + 0.0004 * u * u);
      }
    } else toward(0, 0.05 + 0.0004 * u * u);
  } else if (ctl.throttle && !ctl.brake) {
    if (u < -0.2) toward(0, DRIVE_BRAKE);
    else u = Math.min(vmax, u + DRIVE_ACCEL * Math.max(0.08, 1 - (u / vmax) ** 2) * dt);
  } else if (ctl.brake) {
    if (u > 0.2) toward(0, DRIVE_BRAKE);
    else toward(-DRIVE_REV_MAX, DRIVE_ACCEL * 0.5);
  } else toward(0, 0.05 + 0.0004 * u * u);
  let pv = u * t.cab;
  // hard stop short of the end of the drivable track
  const [lo, hi] = driveRange(route);
  const md = Math.sign(pv);
  if (md) {
    const room = md > 0 ? hi - t.halfLen - t.c : t.c - (lo + t.halfLen);
    const vAllow = Math.sqrt(2 * DRIVE_END_DECEL * Math.max(0, room));
    if (Math.abs(pv) > vAllow) {
      pv = md * vAllow;
      if (!t.endWarned && room < 120) { t.endWarned = true; world.addMessage('Sein op rood: verder gaat het spoor niet', 3); }
    } else if (room > 160) t.endWarned = false;
  }
  const hit = trainAhead(t, md, Math.abs(pv) * dt + 1.5);
  if (hit) {
    if (Math.abs(pv) > 3) {
      const strength = Math.min(1, Math.abs(pv) / 15);
      world.lastImpact = { strength, time: world.time, x: hit.x, y: hit.y };
      world.particles.push({ kind: 'impact', x: hit.x, y: hit.y, strength, until: world.time + 0.4 });
      world.addMessage('Klap! Er staat een andere trein', 2.5);
    }
    pv = 0;
  }
  const step = pv * dt;
  t.c = Math.max(lo + t.halfLen, Math.min(hi - t.halfLen, t.c + step));
  t.pv = pv;
  t.v = Math.abs(pv);
  t.dir = t.v > 0.05 ? Math.sign(pv) : t.cab;
  clack(t, Math.abs(step), world);
}

// --- a scripted train for a story mission (fjordtrain.js) -------------------
// t.ctl: vWant (m/s), stopAt (arc length its nose stops short of, or null),
// brake (m/s2). It holds for any train on the track ahead.
export function addMissionTrain(routeName, type, c, dir) {
  const route = routes.find((r) => r.name === routeName);
  if (!route) return null;
  const t = makeTrain(route, type, 0, dir, 0);
  Object.assign(t, { c, state: 'mission', v: 0, pv: 0, cab: dir, ctl: { vWant: 0, stopAt: null, brake: DECEL } });
  placeCars(t);
  trains.push(t);
  return t;
}

export function removeMissionTrain(t) {
  const i = trains.indexOf(t);
  if (i >= 0) trains.splice(i, 1);
}

// Keeps the timetable off the mission train's track between arc lengths s0
// and s1 for `hold` seconds: trains of routes sharing it wait at the
// platform they stand at, or out at their far terminus.
export function clearTrackFor(t, s0, s1, world, hold = 240) {
  const p = world.player;
  for (const o of trains) {
    if (o === t || isStolen(o)) continue;
    let shares = o.route === t.route;
    for (let at = s0; at <= s1 && !shares; at += 25) {
      const [x, y] = routePoint(t.route, at);
      shares = projectOnRoute(o.route, x, y).d < 6;
    }
    if (!shares) continue;
    const mid = o.cars[o.cars.length >> 1];
    const pr = projectOnRoute(t.route, mid.x, mid.y);
    const onStretch = pr.d < 8 && pr.s > s0 - o.halfLen - 20 && pr.s < s1 + o.halfLen + 20;
    // one waiting where it stands (out of the way) keeps waiting; anything
    // running could come onto the stretch head-on, so it goes out to the terminus
    if (o.state === 'dwell' && !onStretch) {
      o.timer = Math.max(o.timer, hold);
      continue;
    }
    let far = -1;
    o.route.stops.forEach((st, i) => { if (st.offmap) far = i; });
    if (far < 0) continue;
    Object.assign(o, { c: o.route.stops[far].s, v: 0, state: 'dwell', target: far, timer: hold, dir: far === 0 ? 1 : -1 });
    placeCars(o);
  }
}

function stepMission(t, dt, world) {
  const ctl = t.ctl;
  let vWant = ctl.vWant;
  if (ctl.stopAt != null) {
    const room = (ctl.stopAt - (t.c + t.dir * t.halfLen)) * t.dir;
    vWant = room <= 0 ? 0 : Math.min(vWant, Math.sqrt(2 * ctl.brake * room));
  }
  const look = (t.v * t.v) / (2 * DECEL) + 25;
  for (let d = 4; d < look && vWant > 0; d += 6) {
    if (trainAhead(t, t.dir, d)) vWant = Math.min(vWant, Math.sqrt(2 * DECEL * Math.max(0, d - 12)));
  }
  if (t.v < vWant) t.v = Math.min(vWant, t.v + ACCEL * 0.7 * dt);
  else t.v = Math.max(vWant, t.v - Math.max(ctl.brake, DECEL) * dt);
  const step = t.v * dt;
  t.c = Math.max(t.halfLen, Math.min(t.route.len - t.halfLen, t.c + step * t.dir));
  t.pv = t.v * t.dir;
  clack(t, step, world);
}

// Another train's carriage within `reach` metres ahead of this train's nose.
function trainAhead(t, md, reach) {
  if (!md) return null;
  const [nx, ny] = routePoint(t.route, t.c + md * (t.halfLen + reach));
  for (const o of trains) {
    if (o === t) continue;
    for (const car of o.cars) {
      if (Math.abs(car.x - nx) > car.len || Math.abs(car.y - ny) > car.len) continue;
      const [lx, ly] = carLocal(car, nx, ny);
      if (Math.abs(lx) < car.len / 2 + 0.5 && Math.abs(ly) < HALF_WIDTH + 0.4) return { x: nx, y: ny };
    }
  }
  return null;
}

// Scheduled trains hold at a red signal behind a stolen one on their track.
function blockedSpeed(t) {
  let vmax = Infinity;
  const look = t.halfLen + (t.v * t.v) / (2 * DECEL) + 40;
  for (const o of trains) {
    if (o === t || !isStolen(o)) continue;
    const mid = o.cars[o.cars.length >> 1];
    const [cx, cy] = routePoint(t.route, t.c);
    if (Math.hypot(mid.x - cx, mid.y - cy) > look + o.halfLen + 20) continue;
    for (let d = t.halfLen; d < look; d += 6) {
      const [x, y] = routePoint(t.route, t.c + t.dir * d);
      let blocked = false;
      for (const car of o.cars) {
        const [lx, ly] = carLocal(car, x, y);
        if (Math.abs(lx) < car.len / 2 + 2 && Math.abs(ly) < HALF_WIDTH + 1) { blocked = true; break; }
      }
      if (blocked) { vmax = Math.min(vmax, Math.sqrt(2 * DECEL * Math.max(0, d - t.halfLen - 12))); break; }
    }
  }
  return vmax;
}

// A crossing warns while any train is on it or will be within WARN_AHEAD_S.
function trainThreatens(t, at) {
  const rel = (at - t.c) * t.dir;
  if (Math.abs(at - t.c) < t.halfLen + WARN_CLEAR_M) return true;
  if (rel < 0) return false;
  if (isStolen(t)) return t.state !== 'parked' && t.v > 0.5 && (rel - t.halfLen) / t.v < WARN_AHEAD_S;
  const next = t.state === 'dwell' ? t.target + t.dir : t.target;
  const goal = t.route.stops[Math.max(0, Math.min(t.route.stops.length - 1, next))].s;
  if ((goal - at) * t.dir < -t.halfLen) return false;
  const eta = (t.state === 'dwell' ? t.timer : 0) + timeToCover(rel - t.halfLen, t.state === 'dwell' ? 0 : t.v, t.cfg.vmax);
  return eta < WARN_AHEAD_S;
}

function updateCrossings(dt, world) {
  for (const c of crossings) c.threat = false;
  for (const t of trains) {
    for (const rc of t.route.crossings) if (trainThreatens(t, rc.s)) rc.crossing.threat = true;
  }
  stapOverwegen(dt, world);
}

function stapOverwegen(dt, world) {
  for (const c of crossings) {
    if (c.threat && !c.warn) { c.warn = true; c.warnAt = world.time; }
    else if (!c.threat && c.warn) c.warn = false;
    if (c.warn) {
      if (world.time - c.warnAt > BOOM_DELAY) c.boom = Math.min(1, c.boom + dt / BOOM_DOWN_S);
      c.flash += dt;
      c.bellT -= dt;
      if (c.bellT <= 0) {
        c.bellT = BELL_INTERVAL;
        const p = world.player;
        if (Math.hypot(p.x - c.x, p.y - c.y) < 130) audio(world, { kind: 'crossing_bell', x: c.x, y: c.y });
      }
    } else {
      c.boom = Math.max(0, c.boom - dt / BOOM_UP_S);
      c.flash = 0;
      if (c.boom === 0) c.snapped = null;
    }
  }
}

// --- contact with the train ------------------------------------------------
function carLocal(car, x, y) {
  const dx = x - car.x, dy = y - car.y;
  const ca = Math.cos(car.angle), sa = Math.sin(car.angle);
  return [dx * ca + dy * sa, -dx * sa + dy * ca];
}

// Push a circle out of a carriage box; returns the world-space push normal.
function pushOut(car, hl, x, y, r) {
  const [lx, ly] = carLocal(car, x, y);
  const px = hl + r - Math.abs(lx), py = HALF_WIDTH + r - Math.abs(ly);
  if (px <= 0 || py <= 0) return null;
  const ca = Math.cos(car.angle), sa = Math.sin(car.angle);
  if (py < px) {
    const s = ly >= 0 ? 1 : -1;
    return { nx: -sa * s, ny: ca * s, depth: py };
  }
  const s = lx >= 0 ? 1 : -1;
  return { nx: ca * s, ny: sa * s, depth: px };
}

const thrown = [];

function hitVehicle(v, t, car, push, world) {
  const tv = t.v * t.dir;
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const fresh = !(v._trainHitAt > world.time - HIT_COOLDOWN);
  v.x += push.nx * push.depth;
  v.y += push.ny * push.depth;
  if (!fresh || t.v < 1) return;
  v._trainHitAt = world.time;
  const k = Math.min(1, t.v / 18);
  const lat = 3 + t.v * 0.35;
  thrown.push({ v, vx: fx * tv * 0.8 + push.nx * lat, vy: fy * tv * 0.8 + push.ny * lat, spin: (Math.random() < 0.5 ? -1 : 1) * (1.5 + 3 * k), until: world.time + 1.6 });
  v.speed = 0;
  v.driftX = 0;
  v.driftY = 0;
  v.health = Math.max(0, v.health - (35 + t.v * 5));
  if (v.health <= 0 && !v.wrecked) disableVehicle(v, false, world);
  const strength = Math.min(1, t.v / 14);
  world.particles.push({ kind: 'impact', x: v.x, y: v.y, strength, until: world.time + 0.4 });
  v.hitThisFrame = true; v.hitX = v.x; v.hitY = v.y; v.hitImpactSpeed = t.v;
  if (v.driver === 'player') world.lastImpact = { strength, time: world.time, x: v.x, y: v.y };
}

function updateThrown(dt, world) {
  for (let i = thrown.length - 1; i >= 0; i--) {
    const h = thrown[i];
    if (world.time > h.until || !world.vehicles.includes(h.v)) { thrown.splice(i, 1); continue; }
    const v = h.v;
    v.x += h.vx * dt;
    v.y += h.vy * dt;
    v.angle += h.spin * dt;
    const decay = Math.exp(-2.2 * dt);
    h.vx *= decay; h.vy *= decay; h.spin *= decay;
  }
}

function hitPlayer(t, car, push, world) {
  const p = world.player;
  p.x += push.nx * push.depth;
  p.y += push.ny * push.depth;
  if (t.v < 1.5 || p._trainHitAt > world.time - HIT_COOLDOWN) return;
  p._trainHitAt = world.time;
  const tv = t.v * t.dir;
  p.shoveX = Math.cos(car.angle) * tv * 0.5 + push.nx * 6;
  p.shoveY = Math.sin(car.angle) * tv * 0.5 + push.ny * 6;
  p.vz = (4 + Math.min(4, t.v * 0.25)) * 0.78; // as high as it was at the old g 16
  let dmg = 25 + t.v * 3.5;
  if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
  world.health -= dmg;
  const strength = Math.min(1, t.v / 12);
  world.lastImpact = { strength, time: world.time, x: p.x, y: p.y };
  world.particles.push({ kind: 'impact', x: p.x, y: p.y, strength, until: world.time + 0.4 });
  world.addMessage('Aangereden door de trein!', 2.5);
  knockDown(p, world, { kind: 'hit', dead: world.health <= 0, vx: p.shoveX, vy: p.shoveY, vz: p.vz, lieFor: 2.5 });
  if (world.health <= 0) { world.health = 0; requestRespawn(world); }
}

function hitCompanion(c, t, car, push, world) {
  c.x += push.nx * push.depth;
  c.y += push.ny * push.depth;
  if (t.v < 1.5 || c._trainHitAt > world.time - HIT_COOLDOWN) return;
  c._trainHitAt = world.time;
  const tv = t.v * t.dir;
  c.health = Math.max(0, (c.health ?? 100) - (25 + t.v * 3.5));
  const dead = c.health <= 0;
  if (dead) { c.state = 'dead'; c.deadUntil = world.time + DEAD_DURATION; }
  c.vx = 0; c.vy = 0;
  knockDown(c, world, { kind: 'hit', dead, vx: Math.cos(car.angle) * tv * 0.5 + push.nx * 6, vy: Math.sin(car.angle) * tv * 0.5 + push.ny * 6, vz: 4 + Math.min(4, t.v * 0.25), lieFor: 2.5 });
  world.addMessage(`${c.character === 'tammo' ? 'Tammo' : 'Tessa'} is aangereden door de trein!`, 3);
}

function hitPedestrian(ped, t, car, push, world) {
  ped.x += push.nx * push.depth;
  ped.y += push.ny * push.depth;
  if (t.v < 2 || ped.state === 'dead' || ped.scene) return;
  const tv = t.v * t.dir;
  ped.knockVX = Math.cos(car.angle) * tv * 0.8 + push.nx * 3;
  ped.knockVY = Math.sin(car.angle) * tv * 0.8 + push.ny * 3;
  ped.angle = Math.atan2(-ped.knockVY, -ped.knockVX);
  ped.state = 'dead';
  ped.health = 0;
  ped._hp = 0;
  ped.speed = 0;
  ped.deadUntil = world.time + DEAD_DURATION;
  if (t.v >= GIB_SPEED && splatterPed(ped, world, { vx: ped.knockVX, vy: ped.knockVY, vz: 3 + t.v * 0.15 })) return;
  knockDown(ped, world, { kind: 'hit', dead: true, vx: ped.knockVX * 1.1, vy: ped.knockVY * 1.1, vz: 3 + t.v * 0.2 });
  bleedPed(ped, world);
}

// Wie op een perron staat (de vloer van perrons.js) wordt niet geraakt: het perron is naast het spoor, ook als de rand van de wagen de rand van het perron raakt (#436)
const opPerron = (world, x, y, z) => { const P = world.map && world.map.elev && world.map.elev.perrons; return !!P && onPerron(P, x, y, z); };

function resolveContacts(world) {
  const p = world.player;
  for (const t of trains) {
    for (const car of t.cars) {
      // a car up on an embankment hits only whoever stands up there too (a platform: #436), not what is under it
      const high = car.z > 2.2;
      const hl = car.len / 2;
      const reach = hl + 4;
      for (const v of high ? [] : world.vehicles) {
        if (v.isBoat || v.sinking || v.onTrain) continue;
        if (Math.abs(v.x - car.x) > reach + v.halfLen || Math.abs(v.y - car.y) > reach + v.halfLen) continue;
        if (Math.abs((v.z || 0) - (car.z || 0)) > 2.5) continue; // een viaduct erboven (of een spoordijk): de zone van een brug hielp ook wie eronder op het spoor stond, een auto reed dwars door de trein (#436)
        const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
        const r = v.halfWid;
        const off = Math.max(0, v.halfLen - r);
        for (const k of [0, 1, -1]) {
          const push = pushOut(car, hl, v.x + fx * off * k, v.y + fy * off * k, r);
          if (push) { hitVehicle(v, t, car, push, world); break; }
        }
      }
      if (!p.inVehicle && !world.trainDriving && Math.abs((p.gz || 0) + (p.z || 0) - (car.z || 0)) < 3.5 && Math.abs(p.x - car.x) < reach && Math.abs(p.y - car.y) < reach && !opPerron(world, p.x, p.y, (p.gz || 0) + (p.z || 0))) {
        const push = pushOut(car, hl, p.x, p.y, p.radius || 0.35);
        if (push) hitPlayer(t, car, push, world);
      }
      const c = world.companion;
      if (c && !c.inVehicle && !world.trainDriving && !c.water && c.state !== 'dead' && Math.abs((c.gz || 0) + (c.z || 0) - (car.z || 0)) < 3.5 && Math.abs(c.x - car.x) < reach && Math.abs(c.y - car.y) < reach && !opPerron(world, c.x, c.y, (c.gz || 0) + (c.z || 0))) {
        const push = pushOut(car, hl, c.x, c.y, c.radius || 0.35);
        if (push) hitCompanion(c, t, car, push, world);
      }
      if (world.coopFigures) for (const f of Object.values(world.coopFigures)) { // de derde en vierde speler (#434): een trein rijdt niet door ze heen, ze worden opzij gezet
        if (!f || f.inVeh || !Number.isFinite(f.x) || Math.abs(f.x - car.x) > reach || Math.abs(f.y - car.y) > reach || inRailBridgeZone(f.x, f.y) || opPerron(world, f.x, f.y, f.gz || 0)) continue;
        const push = pushOut(car, hl, f.x, f.y, 0.35);
        if (push) { f.x += push.nx * push.depth; f.y += push.ny * push.depth; }
      }
      for (const ped of high ? [] : world.pedestrians) {
        if (Math.abs(ped.x - car.x) > reach || Math.abs(ped.y - car.y) > reach || opPerron(world, ped.x, ped.y, ped.gz || 0)) continue;
        const push = pushOut(car, hl, ped.x, ped.y, ped.radius || 0.35);
        if (push && !inRailBridgeZone(ped.x, ped.y)) hitPedestrian(ped, t, car, push, world);
      }
    }
  }
}

export function updateRailway(dt, world) {
  if (!ready || dt <= 0) return;
  for (const t of trains) { stepTrain(t, dt, world); placeCars(t); }
  updateCrossings(dt, world);
  updateThrown(dt, world);
  resolveContacts(world);
}

// Boom arms as game-plane segments, in the same approach order railway3d
// builds them (roads x travel directions), mirroring its placement.
function boomsOf(c) {
  if (c._booms) return c._booms;
  c._booms = [];
  for (const r of c.roads) {
    for (const sign of r.oneway ? [1] : [1, -1]) {
      const ux = r.ux * sign, uy = r.uy * sign;
      const rx = -uy, ry = ux;
      const tEdge = sign > 0 ? r.t0 - 3.4 : r.t1 + 3.4;
      const half = r.width / 2;
      const small = r.cat === 'cycle' || r.cat === 'foot';
      const len = (r.oneway || small ? r.width : half) + 0.3;
      const px = r.x + r.ux * tEdge + rx * (half + 0.55) + ux * 0.3;
      const py = r.y + r.uy * tEdge + ry * (half + 0.55) + uy * 0.3;
      c._booms.push({ c, i: c._booms.length, ax: px - rx * 0.1, ay: py - ry * 0.1, bx: px - rx * (len + 0.1), by: py - ry * (len + 0.1) });
    }
  }
  return c._booms;
}

// Lowered (and not snapped off) booms near (x, y), for vehicle collisions.
export function loweredBoomsNear(x, y, r = 30) {
  const out = [];
  for (const c of crossings) {
    if (c.boom < 0.6 || Math.abs(c.x - x) > r + 15 || Math.abs(c.y - y) > r + 15) continue;
    for (const b of boomsOf(c)) if (!(c.snapped && c.snapped[b.i])) out.push(b);
  }
  return out;
}

export function snapBoom(b) {
  const c = b.c;
  (c.snapped || (c.snapped = []))[b.i] = true;
}

// Traffic AI hook (vehicle.js): speed that halts the vehicle before a
// warning level crossing on its path. `project` is vehicle.js's projectOnPath.
export function crossingSpeedLimit(v, path, project) {
  let vmax = Infinity;
  for (const c of crossings) {
    if (!c.warn) continue;
    const dx = c.x - v.x, dy = c.y - v.y;
    if (dx * dx + dy * dy > 70 * 70) continue;
    const decel = v.model.brake * 0.45;
    for (const r of c.roads) {
      const pr = project(path, r.cx, r.cy);
      if (!pr || pr.lat > Math.max(3, r.width / 2 + 0.5)) continue;
      const stopS = pr.s - r.halfSpan - 2 - v.halfLen;
      if (stopS < -0.5) continue;
      vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
    }
  }
  return vmax;
}

// 2D map layers (minimap + full map): track lines, and the trains on top.
// The colours come from the map's palette (mapstyle.js), so the night palette reaches the rails too.
export function drawRailsOnMap(ctx, map, x0, y0, x1, y1, widthM, palette = MAP_PALETTE) {
  const rails = map.rails || [];
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? palette.railTie : palette.rail;
    ctx.lineWidth = pass ? widthM * 0.35 : widthM;
    ctx.setLineDash(pass ? [widthM * 1.4, widthM * 1.4] : []);
    for (const r of rails) {
      const P = r.pts;
      let inView = false;
      for (const q of P) if (q[0] > x0 && q[0] < x1 && q[1] > y0 && q[1] < y1) { inView = true; break; }
      if (!inView) continue;
      ctx.beginPath();
      ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawTrainsOnMap(ctx) {
  ctx.save();
  ctx.strokeStyle = INK.railBed;
  ctx.lineWidth = 0.8;
  for (const t of trains) {
    ctx.fillStyle = '#' + t.cfg.nose.toString(16).padStart(6, '0');
    for (const car of t.cars) {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.fillRect(-car.len / 2, -HALF_WIDTH * 1.6, car.len, HALF_WIDTH * 3.2);
      ctx.strokeRect(-car.len / 2, -HALF_WIDTH * 1.6, car.len, HALF_WIDTH * 3.2);
      ctx.restore();
    }
  }
  ctx.restore();
}

export { HALF_WIDTH as TRAIN_HALF_WIDTH, nearLevelCrossing };

vehicleHooks.crossingSpeedLimit = crossingSpeedLimit;
vehicleHooks.loweredBoomsNear = loweredBoomsNear;
vehicleHooks.snapBoom = snapBoom;
