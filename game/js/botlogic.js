// Pure logic of the Spelbot (issue #186): the status schema, the goal
// follower's steering, stuck detection, the replay format and the run report.
// No imports and no DOM, so scripts/botlogic_test.mjs runs it in plain Node;
// playerapi.js (the page side) and scripts/bot/ (the Node driver) share it.

export const STATUS_VERSION = 1;
export const REPLAY_VERSION = 1;

// --- seeded random (a fixed seed for the run, mulberry32) ---------------------
export function seededRandom(seed = 1) {
  let a = (Number(seed) || 1) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- geometry ---------------------------------------------------------------
// World angles: atan2(dy, dx) with y to the south; +90 degrees is the right-hand side.
export const normAngle = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export const headingTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
export const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The stick (input.padAxis: x right, y down) that walks `heading` when the
// camera looks along camYaw (player.js cameraRelativeMove is the inverse).
export function footStick(heading, camYaw) {
  const r = normAngle(heading - camYaw);
  return [Math.sin(r), -Math.cos(r)];
}

// A planned route that begins far from where the bot stands (#354): the planner starts on the nearest road a vehicle may use, and in a street
// closed to cars (the Gelkingestraat, where the M26 chase starts) that is another road, 130 m away. pts: [[x, y], ...]. Such a route is not followed.
export function routeStartsFar(pos, pts, max = 35) {
  return !!(pts && pts.length && distance(pos, { x: pts[0][0], y: pts[0][1] }) > max);
}

// A cyclist, a walker or a parked car in the lane ahead (#354, the M26 chase through narrow streets): how far to turn the aim away from
// them (radians, positive = to the right, like the steer) and the speed the car can still stop from. obstacles: [{ x, y, r }] in world
// coordinates; the corridor is the car's width plus the obstacle's radius plus a margin, `look` metres ahead. Several obstacles add up.
export function avoidance(car, obstacles, { look = 24, half = 1.2, brake = 7, margin = 0.5 } = {}) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  let bias = 0, cap = Infinity, nearest = null;
  for (const o of obstacles || []) {
    const dx = o.x - car.x, dy = o.y - car.y;
    const f = dx * c + dy * s;      // metres ahead
    const l = -dx * s + dy * c;     // metres to the right (the right-hand side of heading a is a + 90 degrees)
    const r = o.r ?? 0.5;
    const need = half + r + margin;
    if (f < -1 || f > look + r || Math.abs(l) >= need) continue;
    // the side with room: away from where the obstacle is; dead ahead goes left (the Dutch drive on the right, an obstacle in the lane is passed on the left)
    const side = Math.abs(l) < 0.25 ? -1 : l > 0 ? -1 : 1;
    const push = (need - Math.abs(l)) / need;               // 1 dead ahead, 0 at the edge of the corridor
    const near = Math.max(0, 1 - Math.max(0, f - r) / look);  // 1 right on top of it
    bias += side * Math.min(0.9, push * (0.35 + 0.9 * near));
    const room = f - r - 2.5;
    cap = Math.min(cap, room > 0 ? Math.max(4, Math.sqrt(2 * brake * room) + 3) : 2);
    if (!nearest || f < nearest.f) nearest = { f, l, r };
  }
  return { bias: Math.max(-1.1, Math.min(1.1, bias)), cap, nearest };
}

// The speed a car can still keep for the bends of a planned route (#354: in the narrow streets the bot took every corner at full speed and
// ended on the pavement). pts: the route (points {x, y}), from index `from`. A corner of `theta` between two stretches of length a and b
// can be rounded with a radius of at most min(a, b) / (2 tan(theta / 2)), which is driven at sqrt(aLat * radius) (never under `floor`);
// before it the car may be faster by what it can still brake away over the distance: sqrt(vCorner^2 + 2 * brake * distance).
// Returns the lowest of those speeds within `look` metres along the route (Infinity on a straight).
export function curveCap(pts, from, car, { look = 60, aLat = 7, brake = 8, floor = 5 } = {}) {
  const q = [{ x: car.x, y: car.y }, ...(pts || []).slice(Math.max(0, from)).map((p) => ({ x: p.x, y: p.y }))];
  let cap = Infinity, along = 0;
  for (let k = 1; k + 1 < q.length; k++) {
    const a = distance(q[k - 1], q[k]), b = distance(q[k], q[k + 1]);
    along += a;
    if (along > look) break;
    if (a < 0.5 || b < 0.5) continue;
    const theta = Math.min(3.0, Math.abs(normAngle(headingTo(q[k], q[k + 1]) - headingTo(q[k - 1], q[k]))));
    if (theta < 0.25) continue;
    const r = Math.min(a, b, 40) / (2 * Math.tan(theta / 2));
    const vCorner = Math.max(floor, Math.sqrt(aLat * r));
    cap = Math.min(cap, Math.sqrt(vCorner * vCorner + 2 * brake * along));
  }
  return cap;
}

// Steering and pedals for a car at `car` ({x, y, angle, speed}) heading for `target`.
// steer: -1..1 (positive turns right, like D); throttle: 1 gas, -1 brake/reverse, 0 coast.
// opts.stopAt: true to come to rest at the target (opts.rest: from that many metres the wanted speed is 0); opts.top: speed limit in m/s.
// opts.avoid: obstacles for avoidance() (they bend the aim and cap the speed; opts.avoidOpts: its options); opts.curveCap: a speed limit for the bends ahead (curveCap()).
export function carControls(car, target, opts = {}) {
  const top = opts.top ?? 22;
  const av = opts.avoid && opts.avoid.length ? avoidance(car, opts.avoid, opts.avoidOpts) : null;
  const err0 = normAngle(headingTo(car, target) - car.angle);
  const err = av ? normAngle(err0 + av.bias) : err0;
  const d = distance(car, target);
  const steer = clamp(err * 1.6, -1, 1);
  // slow for sharp turns and for the end of the route
  let want = top * clamp(1.15 - Math.abs(err) * 0.9, 0.18, 1);
  if (opts.stopAt) want = d < (opts.rest ?? 0) ? 0 : Math.min(want, Math.max(2, d * 0.5));
  const speed = car.speed || 0;
  // the target is behind us and we are slow: back up with the wheel turned the other way, so the nose swings round
  if (av && av.cap < want) want = av.cap;
  if (opts.curveCap != null && opts.curveCap < want) want = opts.curveCap;
  if (Math.abs(err0) > 2.0 && Math.abs(speed) < 6 && d > 8 && !(av && av.nearest && av.nearest.f < 6)) return { steer: -steer, throttle: -1, err, dist: d, want: -3, reverse: true };
  let throttle = 0;
  if (speed < want - 1) throttle = 1;
  else if (speed > want + 3) throttle = opts.gentle ? -0.3 : -1;   // gentle: a load of eggs breaks above 13 m/s² of braking
  else if (want === 0 && speed > 0.8) throttle = -1;
  return { steer, throttle, err, dist: d, want };
}

// Wedged: the pedals are pushed but the car does not move (a wall, a kerb, another car).
// update(t, speed, throttle) is true once that has lasted `afterS` seconds; the caller
// backs off and calls reset().
export class WedgeDetector {
  constructor({ afterS = 2.5, minSpeed = 0.6 } = {}) { Object.assign(this, { afterS, minSpeed }); this.since = null; }
  reset() { this.since = null; }
  update(t, speed, throttle) {
    if (!throttle || Math.abs(speed || 0) >= this.minSpeed) { this.since = null; return false; }
    if (this.since == null) this.since = t;
    return t - this.since >= this.afterS;
  }
}

// Walks a polyline: next(pos) gives the point to aim for, dropping points that are reached
// or already behind. reach: metres at which a point counts as reached.
export class PathFollower {
  constructor(pts, { reach = 6 } = {}) {
    this.pts = (pts || []).map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));
    this.reach = reach;
    this.i = 0;
  }
  get done() { return this.i >= this.pts.length; }
  get length() { return this.pts.length; }
  next(pos) {
    // drop points that are reached, or that the next point is already nearer than (a corner cut)
    while (this.i < this.pts.length - 1) {
      const d = distance(pos, this.pts[this.i]);
      if (d <= this.reach || (d <= this.reach * 4 && distance(pos, this.pts[this.i + 1]) < d)) this.i++;
      else break;
    }
    if (this.i >= this.pts.length - 1 && this.pts.length && distance(pos, this.pts[this.pts.length - 1]) <= this.reach) { this.i = this.pts.length; return null; }
    return this.pts[this.i] || null;
  }
  remaining(pos) {
    if (this.done) return 0;
    let d = distance(pos, this.pts[this.i]);
    for (let k = this.i; k < this.pts.length - 1; k++) d += distance(this.pts[k], this.pts[k + 1]);
    return d;
  }
}

// --- on foot: the planned route knows no stall poles, bins or benches (#218) ---------
// `free(x, y)` says whether a walker fits at the point (the page side asks the game's own collision).
// segmentFree samples a straight stretch every `step` metres; repairPath replaces every blocked stretch
// of a route by a way round it: A* on a grid of `cell` metres over the stretch's box (8 directions, a
// diagonal only between free corners), then pulled tight again with straight lines of sight.
export function segmentFree(a, b, free, step = 0.4) {
  const d = distance(a, b), n = Math.max(1, Math.ceil(d / step));
  for (let i = 1; i <= n; i++) if (!free(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
  return true;
}

export function detourAround(a, b, free, { cell = 0.8, margin = 14, maxCells = 90 } = {}) {
  const x0 = Math.min(a.x, b.x) - margin, y0 = Math.min(a.y, b.y) - margin;
  const w = Math.min(maxCells, Math.ceil((Math.abs(a.x - b.x) + 2 * margin) / cell)), h = Math.min(maxCells, Math.ceil((Math.abs(a.y - b.y) + 2 * margin) / cell));
  const at = (i, j) => ({ x: x0 + (i + 0.5) * cell, y: y0 + (j + 0.5) * cell });
  const cellOf = (p) => [Math.max(0, Math.min(w - 1, Math.floor((p.x - x0) / cell))), Math.max(0, Math.min(h - 1, Math.floor((p.y - y0) / cell)))];
  const memo = new Map();
  const ok = (i, j) => { const k = j * w + i; let v = memo.get(k); if (v === undefined) { const p = at(i, j); v = free(p.x, p.y); memo.set(k, v); } return v; };
  const [si, sj] = cellOf(a), [gi, gj] = cellOf(b);
  const key = (i, j) => j * w + i;
  const g = new Map([[key(si, sj), 0]]), from = new Map(), open = [[0, si, sj]], done = new Set();
  const hz = (i, j) => Math.hypot(i - gi, j - gj);
  while (open.length) {
    let best = 0;
    for (let q = 1; q < open.length; q++) if (open[q][0] < open[best][0]) best = q;
    const [, i, j] = open.splice(best, 1)[0];
    const k = key(i, j);
    if (done.has(k)) continue;
    done.add(k);
    if (i === gi && j === gj) break;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
      const goal = ni === gi && nj === gj;
      if (!goal && !ok(ni, nj)) continue;
      if (di && dj && !(ok(i + di, j) && ok(i, j + dj))) continue;
      const nk = key(ni, nj), c = g.get(k) + Math.hypot(di, dj);
      if (c < (g.has(nk) ? g.get(nk) : Infinity)) { g.set(nk, c); from.set(nk, k); open.push([c + hz(ni, nj), ni, nj]); }
    }
  }
  if (!from.has(key(gi, gj)) && !(si === gi && sj === gj)) return null;
  const cells = [];
  for (let k = key(gi, gj); k !== undefined; k = from.get(k)) { cells.push({ x: at(k % w, Math.floor(k / w)).x, y: at(k % w, Math.floor(k / w)).y }); if (k === key(si, sj)) break; }
  cells.reverse();
  const pts = [a, ...cells.slice(1, -1), b];
  // pull tight: from each point jump to the furthest one that is still in line of sight
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !segmentFree(pts[i], pts[j], free)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

// pts: [[x, y], ...] (a planned route, the goal last); only the first `horizon` metres are looked at
export function repairPath(pts, free, { horizon = 160, ...opts } = {}) {
  const P = pts.map((p) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p.x, y: p.y }));
  const out = [P[0]];
  let along = 0, fixed = 0;
  for (let i = 1; i < P.length; i++) {
    const a = out[out.length - 1], b = P[i];
    along += distance(a, b);
    if (along > horizon || segmentFree(a, b, free)) { out.push(b); continue; }
    const d = detourAround(a, b, free, opts);
    if (d && d.length > 1) { out.push(...d.slice(1)); fixed++; } else out.push(b);
  }
  return { pts: out.map((p) => [p.x, p.y]), fixed };
}

// --- stuck detection ------------------------------------------------------------
// Progress = the distance to the goal got `minGain` metres smaller than the best so far
// (or, without a goal distance, the position moved `minMove` metres from where it
// was). No progress for `windowS` seconds is "stuck". hold(t) pauses the clock for
// cutscenes, talks and menus; a changed `key` (another mission step) starts over.
export class StuckDetector {
  // windowS: no progress for this long is stuck. Progress is a goal distance that got minGain smaller than the best so far, or (with a
  // goal) a move of roamM metres away from where the last progress was seen: a detour round a block gets longer before it gets shorter.
  // hardS caps the roaming: this long without a better goal distance is stuck whatever the bot moves.
  constructor({ windowS = 30, minGain = 3, minMove = 4, roamM = 25, hardS = 150 } = {}) {
    Object.assign(this, { windowS, minGain, minMove, roamM, hardS });
    this.reset(0);
  }
  reset(t = 0, key = null) {
    this.key = key;
    this.best = Infinity;
    this.tBest = t;
    this.tHard = t;
    this.anchor = null;
    this.stuckCount = 0;
  }
  hold(t) { this.tBest = Math.max(this.tBest, t); this.tHard = Math.max(this.tHard, t); }
  // acknowledge: after a rescue, wait another window before the next one
  acknowledge(t) { this.tBest = t; this.tHard = t; this.best = Infinity; this.anchor = null; this.stuckCount++; }
  update(t, { x, y, goalDist = null, key = null }) {
    if (key !== this.key) this.reset(t, key);
    if (Number.isFinite(goalDist)) {
      if (goalDist < this.best - this.minGain) { this.best = goalDist; this.tBest = t; this.tHard = t; this.anchor = { x, y }; }
      else if (!this.anchor) this.anchor = { x, y };
      else if (this.roamM && Math.hypot(x - this.anchor.x, y - this.anchor.y) >= this.roamM) { this.anchor = { x, y }; this.tBest = t; }
    } else {
      if (!this.anchor || Math.hypot(x - this.anchor.x, y - this.anchor.y) >= this.minMove) { this.anchor = { x, y }; this.tBest = t; this.tHard = t; }
    }
    const idleFor = Math.max(t - this.tBest, this.hardS && t - this.tHard >= this.hardS ? t - this.tHard : 0);
    return { stuck: idleFor >= this.windowS, idleFor };
  }
}

// The rescue ladder once stuck: first a nudge that a player would also try,
// then the cheats of the test menu API. Every rung beyond 'nudge' is logged as
// "had een cheat nodig". Returns the rung for the nth rescue of one step.
// 'skip' is the last rung: a win that did not stick (stage machinery re-entered) is followed by the story skip, which
// finishes the step whatever path the mission took (M09, M10 needed nine wins in the first run).
export const RESCUES = ['nudge', 'teleport', 'objective', 'win', 'skip'];
export const rescueFor = (count) => RESCUES[Math.min(count, RESCUES.length - 1)];
export const isCheat = (rung) => rung !== 'nudge';

// A stunt (jump, drift, scratch-free run) wants speed and no braking for the target: the label or a message names it.
export function isStunt(s) {
  const m = s.mission || {};
  if (m.stage === 'stunt') return true;
  const words = [m.label, m.type, ...((s.hud && s.hud.messages) || [])].join(' ');
  return /stunt|schans|sprong|spring|driften|drift/i.test(words);
}

// How a minigame is started at its spot, in order: a key, 'interact' (the activity's own interact()) or 'jitter'
// (step a few metres aside and wait for the prompt again). The first run flickered on the fixed e, e, f, e; the
// per-minigame openings put the key that is known to start it first.
const OPENING = {
  drift: ['e', 'f', 'interact', 'jitter', 'e'],
  hengelen: ['e', ' ', 'interact', 'jitter', 'e'],
  wandeling: ['e', 'interact', 'jitter', 'e', 'enter'],
  pitchputt: ['e', ' ', 'interact', 'jitter', 'e'],
  hoogvlieger: ['e', ' ', 'interact', 'jitter', 'e'],
  geheimen: ['e', 'interact', 'jitter', 'e', 'f'],
  snackketen: ['e', 'f', 'interact', 'jitter', 'e'],
};
const GENERIC_OPENING = ['e', 'e', 'f', 'interact', 'jitter', 'e', ' ', 'interact'];
export const startAttempts = (id) => (OPENING[id] || GENERIC_OPENING).slice();
// the nth jitter: a spot beside the spot, round the compass (metres)
export function jitterOffset(n, r = 3) {
  const a = (n % 8) * (Math.PI / 4);
  return { dx: Math.round(Math.cos(a) * r * 100) / 100, dy: Math.round(Math.sin(a) * r * 100) / 100 };
}

// --- the brain: what to do now, from a status --------------------------------------
// Pure. `s` is a status (validateStatus), `mem` the follower's memory
// ({ boardTries }). Returns { type, ... }:
//   wait            something owns the screen that resolves itself
//   skip            a cutscene: skip it
//   choose  key     a choice panel: press its first option
//   closemenu       the pause menu is open
//   enter   vehicle walk to the vehicle and press the enter key
//   goto    mode    'drive' | 'walk' to s.target
//   press   key     one key
export function decide(s, mem = {}) {
  const b = s.blocking || {};
  if (b.pauseMenu) return { type: 'closemenu' };
  if (b.dialog && b.dialog.options && b.dialog.options.length) return { type: 'choose', key: b.dialog.options[0].key };
  if (b.cinematic || b.banner || b.ride) return { type: 'skip' };
  // the car is on fire ("Stap uit (E) voor hij ontploft"): out, whatever the stage; a plane in flames has no way out
  if (s.player && s.player.vehicle && !s.player.vehicle.plane && !s.player.vehicle.heli && ((s.hud && s.hud.messages) || []).some((m) => /staat in brand|ontploft/i.test(m))) return { type: 'press', key: 'e', why: 'brand' };
  // an open shop (the story's item is the one highlighted): Enter selects, Enter buys, Escape walks out again
  if (b.shop) return { type: 'shop', n: mem.shopN = (mem.shopN || 0) + 1 };
  if (mem.shopN) mem.shopN = 0;
  if (b.respawn || b.loading) return { type: 'wait', why: b.respawn ? 'respawn' : 'laden' };
  // a talk during a mission is subtitles while you play on (M08: the fatbikes keep coming); outside one it is a conversation to hear out
  if (b.talk && !(s.mission && s.mission.active)) return { type: 'wait', why: 'gesprek' };
  if (s.player && s.player.pigeon && s.target) return { type: 'pigeon' };
  // after a failure the game offers to start the mission over (#214: Enter fades back to the start, to the last checkpoint stage):
  // a player takes it instead of driving back, so the bot does too (once per offer, the message stays up a few seconds)
  if (s.mission && !s.mission.active && (s.hud.messages || []).some((m) => /opnieuw beginnen\? Druk op Enter/i.test(m)) && (s.t - (mem.retryAt ?? -99)) > 8) { mem.retryAt = s.t; return { type: 'press', key: 'enter', why: 'opnieuw' }; }
  if (!s.target) return { type: 'wait', why: 'geen doel' };
  const t = s.target;
  const veh = s.player.vehicle;
  const onFootOnly = !!(s.mission && s.mission.onFoot);
  const stage = (s.mission && s.mission.stage) || '';
  const stunt = isStunt(s);
  // a 'board' stage wants the vehicle that is standing there: any free one close by, whatever the distance to the marker
  // on a bike or scooter the board stage's vehicle (a tractor, a quad) is another one: get off first, and pick a motor vehicle over the bike just left
  const light = (k) => k === 'fiets' || k === 'scooter';
  // in some other vehicle at a 'board' stage (a bike, or last mission's car): get out, then take the one that is standing there
  // the marker is a vehicle (the tractor of the mission) and the bot sits in another one: out of it, then into the right one
  // (a chase is no boarding while the fleeing vehicle is far off: the bot stays in its own car and drives after it, M26 #218;
  // a parked one within reach can still be boarded, the hijack of the tanker)
  const chaseFar = (stage === 'chase' || stage === 'boatchase') && t.distance > 12;
  if (t.vehicle && !chaseFar && !(veh && veh.plane)) {
    if (veh) { if ((veh.speed || 0) < 3 && (mem.vehTries || 0) < 4) { mem.vehTries = (mem.vehTries || 0) + 1; return { type: 'press', key: 'e', why: 'uitstappen' }; } }
    else if ((mem.boardTries || 0) < 12) {
      const v = (s.nearby && s.nearby.vehicles || []).find((c) => Math.hypot(c.x - t.x, c.y - t.y) < 1.5);
      if (v) return { type: 'enter', vehicle: v };
    }
  }
  if (veh && !veh.plane && (stage === 'board' || stage === 'plane') && (mem.boardTries || 0) < 4) {
    const other = (s.nearby && s.nearby.vehicles || []).find((c) => c.free && c.distance < 40 && (stage === 'plane' ? c.kind === 'vliegtuig' : c.drivable && (light(veh.kind) ? !light(c.kind) : true)));
    if (other && (veh.speed || 0) < 3) { mem.boardTries = (mem.boardTries || 0) + 1; return { type: 'press', key: 'e', why: 'uitstappen' }; }
  }
  if (!veh && (stage === 'board' || stage === 'plane') && (mem.boardTries || 0) < 4) {
    // a boat or a plane counts too: M17 starts in a sloep, M15 in a plane
    // a car with someone at the wheel is a carjacking: the police are on us at once (the bot got arrested a dozen times on the way)
    const free0 = (s.nearby && s.nearby.vehicles || []).filter((c) => c.free && c.distance < 80);
    const near = free0.some((c) => !c.occupied) ? free0.filter((c) => !c.occupied) : free0;
    // the marker of a board stage stands on the mission's own car: a free vehicle right at the marker wins over the nearest one (M22: the Escapade stands in a car park among other cars)
    const atMarker = t && Number.isFinite(t.x) ? near.filter((c) => Math.hypot(c.x - t.x, c.y - t.y) < 8).sort((a, c) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(c.x - t.x, c.y - t.y))[0] : null;
    // the marker is still far off and no car stands there: walk to it first (20 s), not into the nearest car (a stolen one brings the police)
    if (!atMarker && t && t.distance > 30) { if (mem.boardWalkUntil == null) mem.boardWalkUntil = (s.t || 0) + 20; if ((s.t || 0) < mem.boardWalkUntil) return { type: 'goto', mode: 'walk' }; }
    const v = atMarker || near.find((c) => !light(c.kind)) || near[0];
    if (v) return { type: 'enter', vehicle: v };
  }
  // on foot at the marker with a prompt on screen (the loket, the pinautomaat, a counter): press the action key a few times
  const prompt = (s.hud && s.hud.prompt) || '';
  if (!veh && prompt && t.distance <= Math.max(4, ((s.mission && s.mission.triggerRadius) || 0) + 1) && (mem.pressTries || 0) < 4) {
    return { type: 'press', key: 'e', why: 'handeling', interact: true };
  }
  // the plan panel of a heist (M06 'Kies met A of S'): take the first way in
  if (stage === 'plan' && (mem.planTries || 0) < 3) { mem.planTries = (mem.planTries || 0) + 1; return { type: 'press', key: 'a', why: 'plan' }; }
  // a hold stage (stand still in the ring): stop walking once inside (the ring is 9 m wide: closer than 5.5 m counts, M26: after a firework hit the bot
  // kept walking to 3.5 m, and the wedge sidesteps took it out of the ring again, 135 s for a 30 s stage)
  if (stage === 'hold' && t.distance <= 5.5) return { type: 'wait', why: 'vasthouden' };
  // at the shop the story sent us to: a shop opens for someone on foot, so get off the bike or out of the car at the door
  if (veh && !veh.plane && t.source === 'winkel' && t.distance < 25 && Math.abs(veh.speed || 0) < 3 && (mem.vehTries || 0) < 6) { mem.vehTries = (mem.vehTries || 0) + 1; return { type: 'press', key: 'e', why: 'uitstappen' }; }
  if (veh && veh.plane) return { type: 'fly' };
  if (veh) {
    if (onFootOnly) return { type: 'press', key: 'e', why: 'uitstappen' };
    return { type: 'goto', mode: veh.boat ? 'boat' : veh.heli ? 'fly' : 'drive', ...(stunt ? { stunt: true, top: 30 } : {}) };
  }
  // on foot: a vehicle close by is worth it for a long way
  if (t.distance > 140 && !onFootOnly && (mem.boardTries || 0) < 3) {
    // 60 m round us for a trip of a few hundred metres, a walk of 250 m for a trip of kilometres (the bot walked 33 km to M13 on foot)
    const reach = t.distance > 1500 ? 250 : 60;
    const v = (s.nearby && s.nearby.vehicles || []).find((c) => c.free && c.drivable && !c.occupied && c.distance < reach);
    if (v) return { type: 'enter', vehicle: v };
  }
  return { type: 'goto', mode: 'walk' };
}

// --- plane autopilot (M15 Laag over het graan): pure, tested against arcadeplane.js -------------------------------
// The arcade plane (planecontrol.js) takes W/S (throttle), A/D (roll), Space (nose up), Ctrl (nose down) and Shift (brake).
// planeKeys(p, o) says which keys to hold this tick. p = the plane state { x, y, z, heading, speed, pitch, roll, vz, onGround, throttle },
// o = { agl, goal: {x, y}, alt, mode: 'fly' | 'land', strip }: agl above the ground here, alt the wanted height above the ground.
// 'land' flies an approach fix 700 m before the strip, then a glide slope to a point 60 m in, and brakes after touching down.
export function planeKeys(p, o) {
  const keys = new Set();
  const stall = 22;
  if (p.onGround) {
    if (o.mode === 'land') { if (p.speed > 0.5) { keys.add('shift'); keys.add('s'); } return keys; }
    if (p.throttle < 0.98) keys.add('w');
    if (p.speed >= 32) keys.add(' ');
    return keys;
  }
  let goal = o.goal, alt = o.alt ?? 20, vT = 46;
  if (o.mode === 'land' && o.strip) {
    const st = o.strip, c = Math.cos(st.heading), sn = Math.sin(st.heading);
    const at = (a) => ({ x: st.x + c * a, y: st.y + sn * a });
    const fix = at(-700), touch = at(60);
    const dx = p.x - st.x, dy = p.y - st.y, along = dx * c + dy * sn, across = -dx * sn + dy * c;
    const aligned = along < 300 && Math.abs(across) < 60 + Math.max(0, -along) * 0.12 && Math.abs(normAngle(p.heading - st.heading)) < 0.5;
    if (!aligned && distance(p, fix) > 160) { goal = fix; alt = 40; vT = 44; }
    else {
      // glide slope to a touch point 80 m in; past it keep descending straight down the strip
      alt = along < 80 ? clamp((80 - along) * 0.065, 0, 50) : 0;
      vT = 32;
      // a carrot on the centre line 120 m ahead of the plane keeps it lined up with the strip
      goal = at(Math.min(400, along + 120));
    }
  }
  const e = normAngle(headingTo(p, goal) - p.heading);
  // close to the ground only a little roll: a wing down on touch-down is a crash
  const rollMax = o.mode === 'land' && o.agl < 8 ? 0.12 : 0.75;
  const rollWant = clamp(e * 2.2, -rollMax, rollMax);
  if (p.roll < rollWant - 0.12) keys.add('d'); else if (p.roll > rollWant + 0.12) keys.add('a');
  if (p.speed < vT - 3 || p.speed < stall + 7) keys.add('w'); else if (p.speed > vT + 4) keys.add('s');
  const vzWant = clamp((alt - o.agl) * (o.mode === 'land' ? 0.45 : 0.28), -5, 6);
  const low = o.agl < 6 && o.mode === 'land';
  if (p.speed >= stall + 5) {
    if (p.vz < (low ? -1.2 : vzWant) - 0.8) keys.add(' '); else if (p.vz > (low ? -1.2 : vzWant) + 0.8) keys.add('control');
    if (low && o.agl < 2.5) keys.add('s');
  }
  return keys;
}

// --- pigeon autopilot (M04 Kieken van boven, M24 touwen): pure ------------------------------------------------------
// The pigeon turns with A/D, climbs with Space and dives with Shift (pigeonmode.js updateFly). f = { x, y, z, ground, yaw },
// tgt = { x, y, z? } (z absent: stay within ~40 m above the ground, the stage wants under 80). Returns the keys to hold.
export function pigeonKeys(f, tgt) {
  const keys = new Set();
  const e = normAngle(headingTo(f, tgt) - f.yaw);
  if (e > 0.06) keys.add('d'); else if (e < -0.06) keys.add('a');
  const want = Number.isFinite(tgt.z) ? tgt.z : f.ground + 38;
  if (f.z < want - 3) keys.add(' '); else if (f.z > want + 7) keys.add('shift');
  return keys;
}

// --- status schema -------------------------------------------------------------------
const need = (obj, path, kind, problems) => {
  let v = obj;
  for (const k of path.split('.')) { v = v == null ? undefined : v[k]; }
  const ok = kind === 'number' ? Number.isFinite(v) : kind === 'array' ? Array.isArray(v) : kind === 'object' ? v && typeof v === 'object' : typeof v === kind;
  if (!ok) problems.push(`${path}: verwacht ${kind}`);
};
export function validateStatus(s) {
  const p = [];
  if (!s || typeof s !== 'object') return ['status ontbreekt'];
  if (s.v !== STATUS_VERSION) p.push(`v: verwacht ${STATUS_VERSION}`);
  need(s, 't', 'number', p);
  need(s, 'player', 'object', p);
  for (const k of ['x', 'y', 'angle', 'camYaw']) need(s, 'player.' + k, 'number', p);
  need(s, 'story', 'object', p);
  need(s, 'mission', 'object', p);
  need(s, 'hud', 'object', p);
  need(s, 'hud.messages', 'array', p);
  need(s, 'blocking', 'object', p);
  need(s, 'nearby', 'object', p);
  need(s, 'nearby.vehicles', 'array', p);
  if (s.target != null) { need(s, 'target.x', 'number', p); need(s, 'target.y', 'number', p); need(s, 'target.distance', 'number', p); }
  return p;
}

// --- replay format -------------------------------------------------------------------
// One JSON line per event: { t, type, ... }. t = seconds of game time. Input events
// ('key' down/up, 'axis') are enough to play a run back; the others are the timeline
// ('mission', 'stuck', 'cheat', 'step', 'shot', 'console', 'status').
export class RunLog {
  constructor(meta = {}) { this.meta = { replay: REPLAY_VERSION, ...meta }; this.events = []; }
  add(t, type, data = {}) { const e = { t: Math.round(t * 1000) / 1000, type, ...data }; this.events.push(e); return e; }
  toJsonl() { return [JSON.stringify({ type: 'meta', ...this.meta }), ...this.events.map((e) => JSON.stringify(e))].join('\n') + '\n'; }
  static parse(text) {
    const log = new RunLog();
    for (const line of String(text).split(/\r?\n/)) {
      if (!line.trim()) continue;
      let e;
      try { e = JSON.parse(line); } catch (err) { continue; }
      if (e.type === 'meta') { const { type, ...m } = e; log.meta = m; } else log.events.push(e);
    }
    return log;
  }
  inputs() { return replayInputs(this.events); }
}

// The input events of a run in order, and balanced: every keydown has its keyup
// (a held key at the end of the log gets a release appended).
export function replayInputs(events) {
  const ins = events.filter((e) => e.type === 'key' || e.type === 'axis').sort((a, b) => a.t - b.t);
  const down = new Map();
  for (const e of ins) {
    if (e.type !== 'key') continue;
    if (e.down) down.set(e.key, e); else down.delete(e.key);
  }
  const last = ins.length ? ins[ins.length - 1].t : 0;
  for (const [key] of down) ins.push({ t: last, type: 'key', key, down: false, auto: true });
  return ins;
}

// Keys that are down without their keyup (the AGENTS.md rule: never).
export function unbalancedKeys(events) {
  const down = new Set();
  for (const e of events) if (e.type === 'key') { if (e.down) down.add(e.key); else down.delete(e.key); }
  return [...down];
}

// --- the run report ------------------------------------------------------------------
const fmtS = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Per mission: start/end time, outcome, fails, restarts, stuck moments, cheats.
export function summarise(events) {
  const missions = [];
  let cur = null;
  const open = (e, id) => { cur = { id, label: e.label || '', start: e.t, end: null, outcome: null, fails: 0, starts: 0, stuck: 0, cheats: [] }; missions.push(cur); return cur; };
  const forId = (e) => { const id = e.id || (cur && cur.id) || '?'; return cur && cur.id === id ? cur : missions.find((m) => m.id === id && m.end == null) || open(e, id); };
  for (const e of events) {
    if (e.type === 'mission') {
      if (e.event === 'start') { const m = forId(e); m.starts++; m.label = e.label || m.label; }
      else if (e.event === 'fail') { const m = forId(e); m.fails++; }
      else if (e.event === 'done') { const m = forId(e); m.end = e.t; m.outcome = 'klaar'; cur = null; }
    } else if (e.type === 'step') {
      if (e.event === 'begin') open(e, e.id);
      else if (e.event === 'end') { const m = forId(e); m.end = e.t; m.outcome = m.outcome || e.outcome || 'klaar'; cur = null; }
    } else if (e.type === 'stuck' && cur) cur.stuck++;
    else if (e.type === 'cheat' && cur) cur.cheats.push(e.rung);
  }
  const consoleErrors = events.filter((e) => e.type === 'console' && (e.level === 'error' || e.level === 3));
  const nan = events.filter((e) => e.type === 'console' && /Computed radius is NaN/.test(e.msg || '')).length;
  const warnings = events.filter((e) => e.type === 'console' && (e.level === 'warning' || e.level === 2));
  return {
    missions, consoleErrors, nan, warnings: warnings.length,
    stuck: events.filter((e) => e.type === 'stuck'),
    cheats: events.filter((e) => e.type === 'cheat'),
    minigames: events.filter((e) => e.type === 'minigame'),
    shots: events.filter((e) => e.type === 'shot').map((e) => e.name),
    unbalanced: unbalancedKeys(events),
  };
}

export function buildReport(events, meta = {}) {
  const S = summarise(events);
  const out = [];
  out.push(`# Spelbot-rapport${meta.title ? `: ${meta.title}` : ''}`, '');
  if (meta.seed != null) out.push(`- Seed: ${meta.seed}`);
  if (meta.arc) out.push(`- Verhaal: ${meta.arc}`);
  if (meta.started) out.push(`- Gestart: ${meta.started}`);
  if (meta.result) out.push(`- Uitkomst: **${meta.result}**`);
  if (meta.gameSeconds != null) out.push(`- Speltijd: ${fmtS(meta.gameSeconds)}`);
  if (meta.wallSeconds != null) out.push(`- Echte tijd: ${fmtS(meta.wallSeconds)}`);
  out.push('', '## Tijd per missie', '', '| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |', '|---|---|---|---|---|---|---|');
  for (const m of S.missions) {
    const dur = m.end != null ? fmtS(m.end - m.start) : 'niet af';
    out.push(`| ${m.id} | ${m.label} | ${dur} | ${m.outcome || 'niet af'} | ${m.fails} | ${m.stuck} | ${m.cheats.length ? m.cheats.join(', ') : '-'} |`);
  }
  if (!S.missions.length) out.push('| (geen) | | | | | | |');
  out.push('', '## Vastzitten', '');
  if (!S.stuck.length) out.push('Niet vastgezeten.');
  for (const e of S.stuck) out.push(`- ${fmtS(e.t)} bij ${e.step || '?'} op (${Math.round(e.x)}, ${Math.round(e.y)}), ${Math.round(e.idleFor || 0)} s zonder voortgang, afstand tot doel ${e.goalDist != null ? Math.round(e.goalDist) + ' m' : 'onbekend'}`);
  out.push('', '## Had een cheat nodig', '');
  const real = S.cheats.filter((c) => isCheat(c.rung));
  if (!real.length) out.push('Geen cheats nodig.');
  for (const e of real) out.push(`- ${fmtS(e.t)} bij ${e.step || '?'}: ${e.rung}${e.why ? ` (${e.why})` : ''}`);
  out.push('', '## Consolefouten', '');
  if (!S.consoleErrors.length) out.push('Geen.');
  for (const e of S.consoleErrors.slice(0, 40)) out.push(`- ${fmtS(e.t)} ${String(e.msg).slice(0, 200)}`);
  if (S.consoleErrors.length > 40) out.push(`- ... en nog ${S.consoleErrors.length - 40}`);
  out.push('', '## NaN-waarschuwingen', '', S.nan ? `**${S.nan}** (computeBoundingSphere): de verhaaltest zou falen.` : 'Geen.');
  out.push('', `Overige console-waarschuwingen: ${S.warnings}.`);
  if (S.minigames.length) {
    out.push('', '## Minigames', '', '| Minigame | Gestart | Gespeeld (s) | Geld | Vast | Gestopt | Fouten |', '|---|---|---|---|---|---|---|');
    for (const m of S.minigames) out.push(`| ${m.id} | ${m.started ? 'ja' : '**nee**'} | ${m.playedS ?? 0} | ${m.moneyDelta ?? 0} | ${m.stuck ? '**ja**' : 'nee'} | ${m.quit || '-'} | ${m.errors ?? 0} |`);
  }
  out.push('', '## Invoer', '', S.unbalanced.length ? `**Toetsen zonder keyup:** ${S.unbalanced.join(', ')}` : 'Elke keydown heeft zijn keyup.');
  out.push('', '## Screenshots', '');
  if (!S.shots.length) out.push('Geen.');
  for (const n of S.shots) out.push(`- ${meta.shotPrefix || 'shots-'}${n}.png`);
  if (meta.notes && meta.notes.length) { out.push('', '## Opmerkingen', ''); for (const n of meta.notes) out.push(`- ${n}`); }
  out.push('', 'Niet beoordeeld door de bot: of het leuk is en hoe de besturing voelt.', '');
  return out.join('\n');
}
