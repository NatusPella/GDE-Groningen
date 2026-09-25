// AI rivals for a lap race along a fixed centreline (see ringroute.js).
// Rivals are ordinary Vehicles flagged racer/missionCar with driver 'racer'
// and no road, so traffic AI, stealing and the population managers leave
// them alone; this module steers them with applyControls every frame.
import { Vehicle, MODELS, maxCurvature, resolveVehicleBuildingCollision, attachToNearestRoad } from './vehicle.js';
import { clamp, pointInPolygon, closestPointOnSegment } from './util.js';

const A_LAT = 11; // m/s² cornering the speed profile plans for (AI tyre grip is 16)
const PROFILE_DECEL = 11;
const EDGE = 1.7; // keep the car centre this far inside the kerb
const GRID_ROW = 9;
const GRID_LANE = 2.8;
const COUNTDOWN = 3;
const MAX_GRID_WAIT = 14;
const RETIRE_DIST = 140;
const RETIRE_MAX_S = 60;

let lastRaceCar = null;
const retired = [];

const RIVALS = [
  { base: 'sport', color: '#1f5fbf', top: 0.97, skill: 1.0 },
  { base: 'sport', color: '#e0b400', top: 0.95, skill: 0.97 },
  { base: 'sedan', color: '#1e7a3c', top: 1.08, skill: 0.95 },
  { base: 'hatch', color: '#f2efe6', top: 1.12, skill: 0.93 },
];

function modelFor(base, color, topScale = 1) {
  const m = MODELS.find((q) => q.name === base) || MODELS[0];
  return { ...m, color, maxSpeed: m.maxSpeed * topScale };
}

function inBuilding(map, x, y, pad) {
  for (const b of map.buildingsNear(x, y, pad + 1)) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (x < minx - pad || x > maxx + pad || y < miny - pad || y > maxy + pad) continue;
    if (pointInPolygon(x, y, b.pts)) return true;
    if (pad > 0) {
      for (const [ox, oy] of [[pad, 0], [-pad, 0], [0, pad], [0, -pad]]) if (pointInPolygon(x + ox, y + oy, b.pts)) return true;
    }
  }
  return false;
}

// Centreline + a racing line (lateral offset per point, smoothed to cut
// corners but kept inside the carriageway and clear of buildings) + a
// speed profile from its curvature with braking zones propagated backwards.
export function buildTrack(map, route) {
  const n = route.length;
  const x = new Float64Array(n), y = new Float64Array(n), hw = new Float64Array(n);
  for (let i = 0; i < n; i++) { x[i] = route[i][0]; y[i] = route[i][1]; hw[i] = route[i][2] || 3; }
  const s = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) s[i + 1] = s[i] + Math.hypot(x[(i + 1) % n] - x[i], y[(i + 1) % n] - y[i]);
  const L = s[n];
  const nx = new Float64Array(n), ny = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n, b = (i + 1) % n;
    let tx = x[b] - x[a], ty = y[b] - y[a];
    const l = Math.hypot(tx, ty) || 1;
    tx /= l; ty /= l;
    nx[i] = -ty; ny[i] = tx;
  }
  const lim = new Float64Array(n);
  for (let i = 0; i < n; i++) lim[i] = Math.max(0, hw[i] - EDGE);
  const off = new Float64Array(n);
  const px = (i) => x[i] + nx[i] * off[i], py = (i) => y[i] + ny[i] * off[i];
  for (let it = 0; it < 40; it++) {
    for (let i = 0; i < n; i++) {
      const a = (i - 1 + n) % n, b = (i + 1) % n;
      const la = s[i] - s[a] + (a > i ? L : 0), lb = s[b] - s[i] + (b < i ? L : 0);
      const w = la + lb > 0 ? lb / (la + lb) : 0.5;
      const mx = px(a) * w + px(b) * (1 - w), my = py(a) * w + py(b) * (1 - w);
      const d = (mx - x[i]) * nx[i] + (my - y[i]) * ny[i];
      off[i] = clamp(off[i] + (d - off[i]) * 0.5, -lim[i], lim[i]);
    }
  }
  for (let i = 0; i < n; i++) {
    let o = off[i];
    while (Math.abs(o) > 0.2 && inBuilding(map, x[i] + nx[i] * o, y[i] + ny[i] * o, 1.2)) o *= 0.5;
    off[i] = Math.abs(o) > 0.2 ? o : 0;
  }
  const track = { n, x, y, hw, s, L, nx, ny, off, lim, v: new Float64Array(n) };
  const vmax = track.v;
  for (let i = 0; i < n; i++) {
    const p0 = sample(track, s[i] - 10), p2 = sample(track, s[i] + 10);
    const ax = p0.rx, ay = p0.ry, bx = px(i), by = py(i), cx = p2.rx, cy = p2.ry;
    const area2 = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
    const k = (2 * area2) / Math.max(1e-6, Math.hypot(bx - ax, by - ay) * Math.hypot(cx - bx, cy - by) * Math.hypot(cx - ax, cy - ay));
    vmax[i] = Math.min(60, Math.sqrt(A_LAT / Math.max(k, 1e-4)));
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) {
      const b = (i + 1) % n;
      const ds = s[i + 1] - s[i];
      vmax[i] = Math.min(vmax[i], Math.sqrt(vmax[b] * vmax[b] + 2 * PROFILE_DECEL * ds));
    }
  }
  return track;
}

function indexAt(t, sl) {
  let lo = 0, hi = t.n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t.s[mid] <= sl) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// Interpolated centreline point, normal, racing-line offset and target
// speed at arc length sl (wraps around the lap).
function sample(t, sl) {
  sl = ((sl % t.L) + t.L) % t.L;
  const i = indexAt(t, sl), j = (i + 1) % t.n;
  const u = (sl - t.s[i]) / Math.max(1e-6, t.s[i + 1] - t.s[i]);
  const x = t.x[i] + (t.x[j] - t.x[i]) * u, y = t.y[i] + (t.y[j] - t.y[i]) * u;
  let nx = t.nx[i] + (t.nx[j] - t.nx[i]) * u, ny = t.ny[i] + (t.ny[j] - t.ny[i]) * u;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  const off = t.off[i] + (t.off[j] - t.off[i]) * u;
  return {
    i, x, y, nx, ny, off,
    lim: Math.min(t.lim[i], t.lim[j]),
    v: t.v[i] + (t.v[j] - t.v[i]) * u,
    rx: x + nx * off, ry: y + ny * off,
  };
}

// Closest centreline point to (px,py) among segments [from, from+count).
function project(t, px, py, from, count) {
  let best = null, bd = Infinity;
  for (let k = 0; k < count; k++) {
    const i = (((from + k) % t.n) + t.n) % t.n, j = (i + 1) % t.n;
    const cp = closestPointOnSegment(px, py, t.x[i], t.y[i], t.x[j], t.y[j]);
    if (cp.dist2 < bd) { bd = cp.dist2; best = { i, u: cp.t, cx: cp.x, cy: cp.y }; }
  }
  const { i, u } = best;
  const sl = t.s[i] + (t.s[i + 1] - t.s[i]) * u;
  const lat = (px - best.cx) * t.nx[i] + (py - best.cy) * t.ny[i];
  return { i, s: sl, lat, dist: Math.sqrt(bd) };
}

const wrap = (d, L) => d - Math.round(d / L) * L;

// cps: indices into the route, cps[0] = start/finish line.
export function createRace(world, route, cps) {
  const track = buildTrack(world.map, route);
  const cpS = cps.map((i) => track.s[i]);
  const race = { track, cpS, rivals: [], phase: 'grid', timer: 0, playerProg: 0, playerCar: null, finishers: 0, playerPos: 0, lastBeat: -1 };
  const p = world.player;
  const car = p.inVehicle && !p.inVehicle.isBoat && !p.inVehicle.isBike && !p.inVehicle.isScooter ? p.inVehicle : null;
  const pv = car || p;
  const pp = project(track, pv.x, pv.y, 0, track.n);
  const playerLat = clamp(pp.lat, -3, 3);

  for (const { r } of retired.splice(0)) {
    const k = world.vehicles.indexOf(r.v);
    if (k >= 0 && !r.v.wrecked) world.vehicles.splice(k, 1);
  }
  if (lastRaceCar && lastRaceCar !== p.inVehicle && lastRaceCar.driver !== 'player') {
    const k = world.vehicles.indexOf(lastRaceCar);
    if (k >= 0) world.vehicles.splice(k, 1);
  }
  lastRaceCar = null;
  if (!car) {
    const at = sample(track, 2);
    const lat = playerLat > 0 ? -GRID_LANE : GRID_LANE;
    const spot = { x: at.x + at.nx * lat, y: at.y + at.ny * lat };
    const ang = Math.atan2(-at.nx, at.ny);
    const v = new Vehicle(spot.x, spot.y, ang, modelFor('sport', '#c8102e'));
    // handed to the player: never counts as theft, before or after the race
    v.missionCar = true;
    world.vehicles.push(v);
    race.playerCar = v;
    lastRaceCar = v;
  }

  // Clear the grid of parked/through traffic, then line the rivals up in
  // pairs behind the start line, away from wherever the player stands.
  const slots = [];
  for (let row = 1; slots.length < RIVALS.length && row < 8; row++) {
    for (const side of [1, -1]) {
      const at = sample(track, -row * GRID_ROW);
      const lat = clamp(side * GRID_LANE, -at.lim, at.lim);
      const sx = at.x + at.nx * lat, sy = at.y + at.ny * lat;
      if (Math.hypot(sx - pv.x, sy - pv.y) < 6) continue;
      if (race.playerCar && Math.hypot(sx - race.playerCar.x, sy - race.playerCar.y) < 6) continue;
      slots.push({ sl: -row * GRID_ROW, lat, x: sx, y: sy, ang: Math.atan2(-at.nx, at.ny) });
      if (slots.length >= RIVALS.length) break;
    }
  }
  for (let i = world.vehicles.length - 1; i >= 0; i--) {
    const o = world.vehicles[i];
    if (o.driver === 'player' || o.missionCar || o.isPolice || o === p.inVehicle) continue;
    if (slots.some((q) => Math.hypot(o.x - q.x, o.y - q.y) < 7 + o.halfLen)) world.vehicles.splice(i, 1);
  }
  slots.forEach((q, k) => {
    const def = RIVALS[k];
    const v = new Vehicle(q.x, q.y, q.ang, modelFor(def.base, def.color, def.top));
    v.racer = true;
    v.missionCar = true;
    v.driver = 'racer';
    v.road = null;
    world.vehicles.push(v);
    const pr = project(track, v.x, v.y, 0, track.n);
    race.rivals.push({
      v, skill: def.skill, bias: (k % 2 ? 1 : -1) * 0.6, i: pr.i, sLap: pr.s, prog: q.sl, lat: q.lat, curLat: q.lat,
      passLat: 0, passUntil: -1, stuckT: 0, reverseT: 0, stuckCount: 0, finished: false, place: 0, doneAt: 0,
    });
  });
  return race;
}

// Player progress, bounded by the checkpoints so a shortcut or respawn
// never jumps the standings ahead of what the checkpoints allow.
function trackPlayer(world, race, wpIndex) {
  const t = race.track;
  const p = world.player;
  const obj = p.inVehicle || p;
  const lo = race.cpS[wpIndex] ?? 0;
  const hi = wpIndex + 1 < race.cpS.length ? race.cpS[wpIndex + 1] : t.L;
  const from = Math.max(0, indexAt(t, Math.max(0, lo - 30)));
  const to = indexAt(t, Math.min(t.L - 0.01, hi + 30));
  const pr = project(t, obj.x, obj.y, from, Math.max(1, to - from + 2));
  race.playerProg = clamp(pr.s, lo, hi - 0.05);
}

function standings(race) {
  let ahead = 0;
  for (const r of race.rivals) {
    if (r.v.wrecked && !r.finished) continue;
    if (r.finished || r.prog > race.playerProg) ahead++;
  }
  return ahead + 1;
}

// Other cars (and the player on foot) located in track coordinates, so a
// car round the next bend is seen where it really is on the road.
function nearbyOnTrack(world, r, t, reach) {
  const v = r.v, out = [];
  const p = world.player;
  const add = (ox, oy, speed, ang, half) => {
    if (Math.abs(ox - v.x) > reach || Math.abs(oy - v.y) > reach) return;
    const pr = project(t, ox, oy, r.i - 3, 40);
    if (pr.dist > t.hw[pr.i] + 4) return;
    const i = pr.i;
    const tx = t.ny[i], ty = -t.nx[i];
    out.push({ fwd: wrap(pr.s - r.sLap, t.L), lat: pr.lat, speed: speed * (Math.cos(ang) * tx + Math.sin(ang) * ty), half });
  };
  for (const o of world.vehicles) if (o !== v) add(o.x, o.y, o.wrecked ? 0 : o.speed, o.angle, o.halfWid);
  if (!p.inVehicle) add(p.x, p.y, 0, 0, 0.4);
  return out;
}

function obstacleAhead(r, others, sp, decel) {
  const v = r.v;
  const range = 12 + sp * 0.6 + (sp * sp) / (2 * decel);
  let best = null;
  for (const o of others) {
    if (o.fwd < 1.5 || o.fwd > range) continue;
    const gap = o.half + v.halfWid + 0.6;
    if (Math.abs(o.lat - r.curLat) > gap && Math.abs(o.lat - r.lat) > gap) continue;
    if (o.speed > sp - 0.5) continue;
    if (!best || o.fwd < best.fwd) best = o;
  }
  return best;
}

function laneClear(r, others, lat, sp) {
  const v = r.v;
  return !others.some((o) => o.fwd > -7 && o.fwd < 14 + sp * 0.8 && Math.abs(o.lat - lat) < o.half + v.halfWid + 0.7);
}

function steerTo(v, tx, ty) {
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const dx = tx - v.x, dy = ty - v.y;
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const alpha = Math.atan2(lat, fwd);
  const curv = (2 * lat) / Math.max(1, dx * dx + dy * dy);
  return Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(curv / maxCurvature(v), -1, 1);
}

function respawnOnTrack(r, t) {
  const at = sample(t, r.sLap);
  r.v.x = at.x + at.nx * at.off;
  r.v.y = at.y + at.ny * at.off;
  r.v.angle = Math.atan2(-at.nx, at.ny);
  r.v.speed = 8;
  r.v.driftX = r.v.driftY = r.v.yawVel = 0;
  r.curLat = at.off;
  r.stuckT = 0;
  r.stuckCount = 0;
}

function driveRival(r, dt, world, race) {
  const t = race.track, v = r.v, m = v.model;
  const pr = project(t, v.x, v.y, r.i - 4, 48);
  const far = pr.dist > 40 ? project(t, v.x, v.y, 0, t.n) : pr;
  r.prog += wrap(far.s - r.sLap, t.L);
  r.sLap = far.s;
  r.i = far.i;
  r.curLat = far.lat;

  if (race.phase !== 'race') {
    v.applyControls(dt, 0, 0, 1);
    return;
  }
  if (!r.finished && r.prog >= t.L) {
    r.finished = true;
    r.place = ++race.finishers;
    r.doneAt = world.time;
  }

  const sp = Math.max(0, v.speed);
  const at = sample(t, r.sLap);
  const player = world.player;
  const pdist = Math.hypot((player.inVehicle || player).x - v.x, (player.inVehicle || player).y - v.y);

  if (far.dist > 30 || r.stuckCount > 3) {
    if (pdist > 70) { respawnOnTrack(r, t); return; }
  }

  if (r.reverseT > 0) {
    r.reverseT -= dt;
    const ahead = sample(t, r.sLap + 8);
    v.applyControls(dt, -1, -steerTo(v, ahead.rx, ahead.ry), 0);
    resolveVehicleBuildingCollision(v, world.map, dt);
    return;
  }

  // rubber band on the player's progress (between 75% and 110% pace)
  const gap = r.prog - race.playerProg;
  let band = gap > 0 ? clamp(1 - gap / 1200, 0.75, 1) : clamp(1 - gap / 1400, 1, 1.1);
  if (r.finished) band = 0.55;

  let targetLat = at.off + r.bias;
  let cap = Infinity;
  const decel = m.brake * 0.75;
  const passLim = Math.max(at.lim, t.hw[far.i] - v.halfWid - 0.35);
  r.lat = r.lat ?? r.curLat;
  const others = nearbyOnTrack(world, r, t, 30 + sp * 2.5);
  const block = obstacleAhead(r, others, sp, decel);
  if (block) {
    if (world.time > r.passUntil) {
      const side = block.half + v.halfWid + 0.9;
      const opts = [block.lat - side, block.lat + side]
        .filter((q) => Math.abs(q) <= passLim)
        .sort((a, b) => Math.abs(a - targetLat) - Math.abs(b - targetLat));
      const pick = opts.find((q) => laneClear(r, others, q, sp));
      if (pick !== undefined) { r.passLat = pick; r.passUntil = world.time + 1.6 + block.fwd / Math.max(8, sp); }
    }
    if (world.time > r.passUntil) cap = Math.sqrt(block.speed * block.speed + 2 * decel * Math.max(0, block.fwd - v.halfLen - 4));
  }
  if (world.time <= r.passUntil) targetLat = clamp(r.passLat, -passLim, passLim);
  else targetLat = clamp(targetLat, -at.lim, at.lim);
  r.lat += clamp(targetLat - r.lat, -3.2 * dt, 3.2 * dt);

  const look = clamp(5 + sp * 0.42, 6, 22);
  const tp = sample(t, r.sLap + look);
  const aimLim = world.time <= r.passUntil ? Math.max(tp.lim, t.hw[tp.i] - v.halfWid - 0.35) : tp.lim;
  const aimLat = clamp(r.lat + (tp.off - at.off), -aimLim, aimLim);
  const steer = steerTo(v, tp.x + tp.nx * aimLat, tp.y + tp.ny * aimLat);

  let vT = Math.min(at.v, sample(t, r.sLap + 4).v, sample(t, r.sLap + 12).v) * r.skill * band;
  vT = Math.min(vT, m.maxSpeed, cap);
  if (Math.abs(far.lat) > t.hw[far.i] + 3) vT = Math.min(vT, 10);
  let throttle = 0, brake = 0;
  if (sp < vT - 0.4) throttle = 1;
  else if (sp > vT + 1) brake = clamp((sp - vT) / 5, 0.25, 1);
  v.applyControls(dt, throttle, steer, brake);
  resolveVehicleBuildingCollision(v, world.map, dt);

  if (sp < 1.5 && vT > 4) r.stuckT += dt;
  else r.stuckT = Math.max(0, r.stuckT - dt * 2);
  if (r.stuckT > 1.8) {
    r.stuckT = 0;
    r.reverseT = 1.1;
    r.stuckCount++;
  } else if (sp > 8) r.stuckCount = 0;
}

// Call once per frame while the race runs. wpIndex is the player's next
// checkpoint (0-based into cps.slice(1) + finish).
export function updateRace(dt, world, race, wpIndex) {
  const p = world.player;
  if (race.phase === 'grid') {
    race.timer += dt;
    const inCar = p.inVehicle && !p.inVehicle.isBoat;
    if (inCar || race.timer > MAX_GRID_WAIT) { race.phase = 'countdown'; race.timer = 0; }
    else if (race.timer > 0.5 && race.lastBeat < 0) {
      race.lastBeat = 0;
      world.addMessage(race.playerCar ? 'Stap in je racewagen, de rest staat al te ronken.' : 'Instappen en klaarmaken.', 3);
    }
  } else if (race.phase === 'countdown') {
    race.timer += dt;
    const beat = Math.floor(race.timer);
    if (beat !== race.lastBeat && beat < COUNTDOWN) {
      race.lastBeat = beat;
      world.addMessage(String(COUNTDOWN - beat), 0.9);
    }
    if (race.timer >= COUNTDOWN) {
      race.phase = 'race';
      world.addMessage('GO! GO! GO!', 1.5);
    }
  }
  trackPlayer(world, race, wpIndex);
  for (const r of race.rivals) {
    if (r.v.wrecked) continue;
    if (!world.vehicles.includes(r.v)) { r.v.wrecked = true; continue; }
    driveRival(r, dt, world, race);
  }
  race.playerPos = standings(race);
}

export function raceStandings(race) {
  return { position: race.playerPos || standings(race), total: race.rivals.length + 1, finished: race.finishers };
}

// After the race the rivals stay racer cars (never stealable, no police or
// witness interest) and cruise on along the route until they are out of
// sight or a minute has passed; updateRetiredRacers then removes them.
export function disposeRace(world, race) {
  if (!race) return;
  for (const r of race.rivals) {
    if (r.v.wrecked) { r.v.missionCar = false; r.v.racer = false; r.v.driver = null; continue; }
    r.finished = true;
    r.retiredAt = world.time;
    retired.push({ r, race });
  }
  race.phase = 'race';
  race.rivals.length = 0;
}

export function updateRetiredRacers(dt, world) {
  const p = world.player;
  const px = (p.inVehicle || p).x, py = (p.inVehicle || p).y;
  for (let k = retired.length - 1; k >= 0; k--) {
    const { r, race } = retired[k];
    const v = r.v;
    const gone = !world.vehicles.includes(v);
    const d = Math.hypot(v.x - px, v.y - py);
    if (gone || v.wrecked || d > RETIRE_DIST || (world.time - r.retiredAt > RETIRE_MAX_S && d > 40)) {
      retired.splice(k, 1);
      if (v.wrecked) { v.missionCar = false; v.racer = false; v.driver = null; }
      else if (!gone) world.vehicles.splice(world.vehicles.indexOf(v), 1);
      continue;
    }
    driveRival(r, dt, world, race);
  }
}
