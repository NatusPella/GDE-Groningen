// Railway simulation: shuttle trains on the routes baked into citymap.json
// (scripts/add_railways.py), level crossings that warn/close ahead of them,
// and what happens to anything standing on the track. Rendering lives in
// railway3d.js, which only reads the state exported here.
import { requestRespawn } from './world.js';
import { DEAD_DURATION } from './pedestrians.js';

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

let routes = [];
let trains = [];
let crossings = [];
let bridgeZones = [];
let ready = false;

export function getTrains() { return trains; }
export function getLevelCrossings() { return crossings; }

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
      if (nearLevelCrossing(x, y)) continue;
      for (const road of map.roadsNear(x, y, 12)) {
        if (road.cat === 'foot' || road.cat === 'cycle') continue;
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
  const cfg = TRAIN_TYPES[type] || TRAIN_TYPES.gtw;
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
    trains.push(makeTrain(route, route.train, end, end === 0 ? 1 : -1, 4 + i * 9));
  });
  for (const t of trains) placeCars(t);
  ready = true;
}

function placeCars(t) {
  const { route } = t;
  for (const car of t.cars) {
    const at = t.c + car.off;
    const bogie = car.len * 0.36;
    const a = routePoint(route, at - bogie);
    const b = routePoint(route, at + bogie);
    car.x = (a[0] + b[0]) / 2;
    car.y = (a[1] + b[1]) / 2;
    car.angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
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

function stepTrain(t, dt, world) {
  const { route, cfg } = t;
  if (t.state === 'dwell') {
    t.timer -= dt;
    if (t.timer <= 0) {
      t.state = 'run';
      t.target = t.dir > 0 ? route.stops.length - 1 : 0;
      audio(world, { kind: 'train_horn', x: t.cars[0].x, y: t.cars[0].y });
      const p = world.player;
      if (Math.hypot(p.x - t.cars[0].x, p.y - t.cars[0].y) < 90) {
        world.addMessage(`${cfg.label} naar ${route.stops[t.target].name} vertrekt`, 3.5);
      }
    }
    return;
  }
  const goal = route.stops[t.target].s;
  const dist = (goal - t.c) * t.dir;
  const vBrake = Math.max(dist > 0.05 ? 0.4 : 0, Math.sqrt(2 * DECEL * Math.max(0, dist)));
  const vWant = Math.min(cfg.vmax, vBrake);
  if (t.v < vWant) t.v = Math.min(vWant, t.v + ACCEL * (1 - 0.6 * (t.v / cfg.vmax) ** 2) * dt);
  else t.v = Math.max(vWant, t.v - DECEL * 1.6 * dt);
  const step = Math.min(t.v * dt, Math.max(0, dist));
  t.c += step * t.dir;
  t.clackRun += step;
  if (t.clackRun > CLACK_EVERY_M) {
    t.clackRun = 0;
    const p = world.player;
    const car = t.cars[(Math.random() * t.cars.length) | 0];
    if (Math.hypot(p.x - car.x, p.y - car.y) < 140) audio(world, { kind: 'train_clack', x: car.x, y: car.y, strength: Math.min(1, t.v / 20) });
  }
  if (dist - step < 0.05) {
    t.c = goal;
    t.v = 0;
    t.state = 'dwell';
    t.timer = DWELL;
    t.dir = t.target === 0 ? 1 : -1;
    const p = world.player;
    if (Math.hypot(p.x - t.cars[0].x, p.y - t.cars[0].y) < 90) world.addMessage(`${cfg.label} is aangekomen in ${route.stops[t.target].name}`, 3);
  }
}

// A crossing warns while any train is on it or will be within WARN_AHEAD_S.
function trainThreatens(t, at) {
  const rel = (at - t.c) * t.dir;
  if (Math.abs(at - t.c) < t.halfLen + WARN_CLEAR_M) return true;
  if (rel < 0) return false;
  const goal = t.route.stops[t.state === 'dwell' ? (t.dir > 0 ? t.route.stops.length - 1 : 0) : t.target].s;
  if ((goal - at) * t.dir < -t.halfLen) return false;
  const eta = (t.state === 'dwell' ? t.timer : 0) + timeToCover(rel - t.halfLen, t.state === 'dwell' ? 0 : t.v, t.cfg.vmax);
  return eta < WARN_AHEAD_S;
}

function updateCrossings(dt, world) {
  for (const c of crossings) c.threat = false;
  for (const t of trains) {
    for (const rc of t.route.crossings) if (trainThreatens(t, rc.s)) rc.crossing.threat = true;
  }
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
  if (v.health <= 0 && !v.wrecked) { v.wrecked = true; v.speed = 0; }
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
  p.vz = 4 + Math.min(4, t.v * 0.25);
  let dmg = 25 + t.v * 3.5;
  if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
  world.health -= dmg;
  const strength = Math.min(1, t.v / 12);
  world.lastImpact = { strength, time: world.time, x: p.x, y: p.y };
  world.particles.push({ kind: 'impact', x: p.x, y: p.y, strength, until: world.time + 0.4 });
  world.addMessage('Aangereden door de trein!', 2.5);
  if (world.health <= 0) { world.health = 0; requestRespawn(world); }
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
}

function resolveContacts(world) {
  const p = world.player;
  for (const t of trains) {
    for (const car of t.cars) {
      const hl = car.len / 2;
      const reach = hl + 4;
      for (const v of world.vehicles) {
        if (v.isBoat || v.sinking) continue;
        if (Math.abs(v.x - car.x) > reach + v.halfLen || Math.abs(v.y - car.y) > reach + v.halfLen) continue;
        if (inRailBridgeZone(v.x, v.y)) continue;
        const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
        const r = v.halfWid;
        const off = Math.max(0, v.halfLen - r);
        for (const k of [0, 1, -1]) {
          const push = pushOut(car, hl, v.x + fx * off * k, v.y + fy * off * k, r);
          if (push) { hitVehicle(v, t, car, push, world); break; }
        }
      }
      if (!p.inVehicle && (p.z || 0) < 3.5 && Math.abs(p.x - car.x) < reach && Math.abs(p.y - car.y) < reach && !inRailBridgeZone(p.x, p.y)) {
        const push = pushOut(car, hl, p.x, p.y, p.radius || 0.35);
        if (push) hitPlayer(t, car, push, world);
      }
      for (const ped of world.pedestrians) {
        if (Math.abs(ped.x - car.x) > reach || Math.abs(ped.y - car.y) > reach) continue;
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
export function drawRailsOnMap(ctx, map, x0, y0, x1, y1, widthM, color = '#55524c') {
  const rails = map.rails || [];
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const pass of [0, 1]) {
    ctx.strokeStyle = pass ? '#d8d4c8' : color;
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
  ctx.strokeStyle = '#1b1d22';
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
