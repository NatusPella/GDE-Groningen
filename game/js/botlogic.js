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

// The speed that keeps a convoy together (M23, game/js/convoyrules.js: warning at 90 m, apart after 12 s beyond 170 m): the leader waits for the one
// furthest behind. gaps: metres from the leader to each member. The line itself is about 100 m long behind a steady leader (every member aims at a
// trail point two places further back), so only a gap beyond that counts: full `top` up to 105 m, easing down to 3 m/s at 150 m, standing still from 160 m.
export function convoyPace(gaps, top = 11) {
  const worst = Math.max(0, ...(gaps || []).filter(Number.isFinite));
  if (worst >= 160) return 0;
  if (worst <= 105) return top;
  return Math.max(3, top - (top - 3) * (worst - 105) / 45);
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
// Progress = the distance to the goal got `minGain` metres smaller than the best so far,
// the score of a stunt climbed `minScore` points (M01: the square is reached long before
// the fifteen hundred points are, so the score is the progress there), or, without a goal
// distance, the position moved `minMove` metres from where it was. No progress for
// `windowS` seconds is "stuck". hold(t) pauses the clock for cutscenes, talks and menus;
// a changed `key` (another mission step) starts over.
export class StuckDetector {
  // windowS: no progress for this long is stuck. Progress is a goal distance that got minGain smaller than the best so far, or (with a
  // goal) a move of roamM metres away from where the last progress was seen: a detour round a block gets longer before it gets shorter.
  // hardS caps the roaming: this long without a better goal distance (or a higher score) is stuck whatever the bot moves.
  constructor({ windowS = 30, minGain = 3, minMove = 4, roamM = 25, hardS = 150, minScore = 10 } = {}) {
    Object.assign(this, { windowS, minGain, minMove, roamM, hardS, minScore });
    this.reset(0);
  }
  reset(t = 0, key = null) {
    this.key = key;
    this.best = Infinity;
    this.bestScore = -Infinity;
    this.tBest = t;
    this.tHard = t;
    this.anchor = null;
    this.stuckCount = 0;
  }
  hold(t) { this.tBest = Math.max(this.tBest, t); this.tHard = Math.max(this.tHard, t); }
  // acknowledge: after a rescue, wait another window before the next one
  acknowledge(t) { this.tBest = t; this.tHard = t; this.best = Infinity; this.anchor = null; this.stuckCount++; }
  update(t, { x, y, goalDist = null, key = null, score = null }) {
    if (key !== this.key) this.reset(t, key);
    // a stunt scores points without coming any closer to the square (M01): a higher score is progress too, or the bot is lifted out mid-stunt
    if (Number.isFinite(score) && score > this.bestScore + this.minScore) { this.bestScore = score; this.tBest = t; this.tHard = t; }
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

// A branch that keeps the clock itself (a pigeon flight, a plane, a heist panel, a timing meter) never reaches the loop's wait budget: it
// calls hold() on the stuck detector and the wait clock never starts. Each of those gets a budget of its own (#387: the pigeon flew M04
// without an end and the run hung for twenty minutes without a line in the report). update(kind, key, t) starts over when the branch (kind)
// or its goal (key: another step, another photo target) changes; from `budget` seconds it is time up, with the seconds for the report.
export class TaskWatch {
  constructor({ budget = 300 } = {}) { this.budget = budget; this.kind = null; this.key = null; this.t0 = 0; }
  reset() { this.kind = null; this.key = null; this.t0 = 0; }
  update(kind, key, t) {
    if (kind !== this.kind || key !== this.key) { this.kind = kind; this.key = key; this.t0 = t; }
    const forS = Math.max(0, t - this.t0);
    return { tooLong: forS >= this.budget, forS, budget: this.budget };
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
  // the stunt evening runs (M01): its score is on the mission, whatever the message line says by now
  if (m.stunt && !(m.stunt.score >= m.stunt.target)) return true;
  // before the square is reached the score does not run yet, but the goal is the middle of it (after the stunt the goal is the delivery)
  if (m.stuntSpec && s.target && Math.hypot(s.target.x - m.stuntSpec.x, s.target.y - m.stuntSpec.y) < 15) return true;
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

// --- the gates of M15: which one, how high, how far (#312) ------------------------------------------------------
// planestage.js judges the gates one at a time, in the order of the mission (gates[i], a ring of r metres, and
// the plane has to be between lo and hi metres above the ground). The mission moves its marker onto the gate it
// is on, so the gate to fly for is the one the marker stands on. gateAim returns it, with the height halfway
// between lo and hi. The first ring that holds the marker wins, so the order of the mission is kept: the kermis
// rings lie 168 m apart and a near tie may never skip one (which planestage counts as a missed gate).
export function gateAim(gates, target, { slack = 5 } = {}) {
  if (!Array.isArray(gates) || !gates.length) return null;
  let i = 0;
  if (target) {
    let bd = Infinity, found = -1;
    for (let k = 0; k < gates.length; k++) {
      const d = distance(gates[k], target);
      if (d <= (gates[k].r || 0) + slack) { found = k; break; }
      if (d < bd) { bd = d; i = k; }
    }
    if (found >= 0) i = found;
  }
  const g = gates[i];
  const lo = Number.isFinite(g.lo) ? g.lo : 0, hi = Number.isFinite(g.hi) ? g.hi : lo;
  return { i, gate: g, aim: { x: g.x, y: g.y }, lo, hi, alt: (lo + hi) / 2, r: g.r || 0, from: target ? distance(g, target) : null };
}

// --- plane autopilot (M15 Laag over het graan): pure, tested against arcadeplane.js -------------------------------
// The arcade plane (planecontrol.js) takes W/S (throttle), A/D (roll), Space (nose up), Ctrl (nose down) and Shift (brake).
// planeKeys(p, o) says which keys to hold this tick. p = the plane state { x, y, z, heading, speed, pitch, roll, vz, onGround, throttle },
// o = { agl, goal: {x, y}, alt, mode: 'fly' | 'land', strip, phase }: agl above the ground here, alt the wanted height above
// the ground, phase the landing circuit ('circuit' | 'final', kept by the caller: the keys hand it back as keys.phase).
// 'land' flies the circuit: on to a point past the approach fix 700 m before the strip, one turn onto final, then the
// localizer (a heading that closes the distance to the centre line) with a 6.5 % glide slope to the ground 80 m past the
// middle, and brakes after touching down. Measured in scripts/bot_vlieg_test.mjs: M15's five gates, the circuit and a
// soft touchdown on the strip in under four minutes of game time.
export const PLANE_LAND = {
  approach: 700,   // the approach fix lies this far before the middle of the strip
  glide: 0.065,    // metres down per metre along (a 6.5 % slope: 50 m at the fix, the ground 80 m past the middle)
  glideFrom: 80,   // the slope reaches the ground this far past the middle of the strip
  circuitAlt: 40,  // height of the circuit, above the ground
  vCircuit: 44,    // m/s on the circuit
  vFinal: 32,      // m/s on final
  join: 400,       // the localizer closes this many metres of cross-track error with one correction
  maxJoin: 0.5,    // rad, the widest localizer correction
  bank: 1.2,       // rad of error to the bank, on final
  damp: 0.9,       // the bank damps itself: without it the plane drifts beside the centre line (measured)
  run: 1200,       // the circuit aims this far beyond the fix, not at the fix itself (a point that close is orbited)
  vzBand: 1.8,     // m/s of sink it may be off before the nose goes up or down (a narrower band porpoises +-14 m/s)
  lowBand: 0.5,    // the same near the ground, where a steady shallow sink is wanted
  lowSink: 1.2,    // m/s the sink is held at under 6 m
};
export function planeKeys(p, o) {
  const keys = new Set();
  const stall = 22;
  if (p.onGround) {
    if (o.mode === 'land') { if (p.speed > 0.5) { keys.add('shift'); keys.add('s'); } return keys; }
    if (p.throttle < 0.98) keys.add('w');
    if (p.speed >= 32) keys.add(' ');
    return keys;
  }
  const land = o.mode === 'land';
  let goal = o.goal, alt = o.alt ?? 20, vT = 46;
  if (land && o.strip) {
    const st = o.strip, c = Math.cos(st.heading), sn = Math.sin(st.heading);
    const at = (a) => ({ x: st.x + c * a, y: st.y + sn * a });
    const dx = p.x - st.x, dy = p.y - st.y, along = dx * c + dy * sn, across = -dx * sn + dy * c;
    const end = Number.isFinite(st.length) ? st.length : 520;
    // which half of the circuit: to the fix, or the final with the localizer. The phase is kept by the caller
    // (o.phase, handed back on the keys) with 200 m of slack: a plane that turns right at the boundary would
    // otherwise flip between the two aims every tick and circle the boundary for ever (measured in the test)
    const phase = o.phase || (along > -PLANE_LAND.approach - 200 ? 'circuit' : 'final');
    if (phase === 'final' && along > end + 100) keys.phase = 'circuit';
    else if (phase === 'circuit' && along < -PLANE_LAND.approach - 200) keys.phase = 'final';
    else keys.phase = phase;
    if (keys.phase === 'circuit') {
      // still on the strip's side of the approach fix (M15 comes back from the kermis, which lies beyond the strip;
      // a plane over the strip goes around): on to the fix, so the turn onto final happens past it with room and
      // height left for the descent
      goal = at(-PLANE_LAND.approach - PLANE_LAND.run);
      alt = PLANE_LAND.circuitAlt; vT = PLANE_LAND.vCircuit;
    } else {
      // final: the localizer is a heading that closes the distance to the centre line (aiming at a point on the line
      // swings past it, the bank turns the plane itself), and the glide slope brings it down. Pointing the other way
      // after the turn is the same rule: the error is large, so the bank goes to its stop
      const join = clamp(-across / PLANE_LAND.join, -PLANE_LAND.maxJoin, PLANE_LAND.maxJoin);
      const want = normAngle(st.heading + join);
      goal = { x: p.x + Math.cos(want) * 1000, y: p.y + Math.sin(want) * 1000 };
      alt = along < PLANE_LAND.glideFrom ? clamp((PLANE_LAND.glideFrom - along) * PLANE_LAND.glide, 0, 50) : 0;
      vT = PLANE_LAND.vFinal;
    }
  }
  const e = normAngle(headingTo(p, goal) - p.heading);
  // close to the ground only a little roll: a wing down on touch-down is a crash
  const rollMax = land && o.agl < 8 ? 0.12 : 0.75;
  // a goal dead behind us sits at ±π, where the sign of the error flips every tick and the roll with it (the plane
  // stays on its course for ever, measured in scripts/bot_vlieg_test.mjs): hold the turn we are already in
  const held = Math.abs(e) > 3.0 ? (p.roll >= 0 ? 1 : -1) : 0;
  // on final the bank damps itself: a plain gain leaves the plane drifting beside the centre line, and the roll then
  // swings from side to side (measured in scripts/bot_vlieg_test.mjs)
  const want = held ? held * rollMax : e * (land ? PLANE_LAND.bank : 2.2) - (land && !held ? p.roll * PLANE_LAND.damp : 0);
  const rollWant = clamp(want, -rollMax, rollMax);
  const band = land && !held ? 0.02 : 0.12;
  if (p.roll < rollWant - band) keys.add('d'); else if (p.roll > rollWant + band) keys.add('a');
  if (p.speed < vT - 3 || p.speed < stall + 7) keys.add('w'); else if (p.speed > vT + 4) keys.add('s');
  const low = land && o.agl < 6;
  const vzWant = clamp((land && low ? -PLANE_LAND.lowSink : (alt - o.agl) * (land ? 0.45 : 0.28)), -5, 6);
  if (p.speed >= stall + 5) {
    // the band keeps the nose from going up and down every frame: a narrow one porpoises +-14 m/s and ends in a crash
    const vzBand = low ? PLANE_LAND.lowBand : land ? PLANE_LAND.vzBand : 0.8;
    if (p.vz < vzWant - vzBand) keys.add(' '); else if (p.vz > vzWant + vzBand) keys.add('control');
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

// --- disc golf in het Stadspark (discgolf.js): hoek, kracht en release ------------------------------------------
// discgolf.js gooit met discgolfrules.simulateFlight: een lanceersnelheid (power 0.12..1 van de vmax van de
// schijf), een richting, een hoek en een release; de wind duwt door de weerstand. Dat model staat in
// discgolfrules.js en niet hier (botlogic heeft geen imports), dus de bot krijgt het vliegmodel van het spel
// mee als `simulate` en zoekt daarmee: eerst de kracht die de schijf op de afstand van de mand laat landen
// (bisectie), dan de hoek die het dichtst bij de mand uitkomt (waaier, met de wind in het model), voor elke
// release. De afstanden zijn die van discgolfrules.suggestDisc. Zonder model blijft er een ruwe schatting over
// (alleen als de regelmodule ontbreekt); die is nooit de proef. `env` gaat ongewijzigd naar simulateFlight:
// zit daar een `rng` in (de kettingen loten of de schijf blijft hangen), geef er dan een met een zaadje aan,
// anders is dezelfde worp niet dezelfde worp.
export const DISC_WORP = {
  ver: 50,             // verder dan dit: de afstandsschijf (suggestDisc)
  nadering: 22,        // verder dan dit: de naderingsschijf, daaronder de putt
  kracht: [0.12, 1],   // simulateFlight klemt de power hierop
  loft: 0.15,          // de hoek die discgolf.js bij een nieuwe lig neerzet (een putt 0,1)
  laag: 0.08,          // de vlakke hoek waarmee de bot op de kettingen mikt (powerForBasket)
  zoek: 14,            // stappen in de bisectie op de kracht
  span: 0.35,          // rad: zover waaiert de hoekzoektocht om de rechte lijn
  scan: 15,            // zoveel hoeken links en rechts van de rechte lijn
  cirkel: 12,          // CIRCLE_M: binnen de cirkel telt als dichtbij
};
export function discgolfWorp(lie, basket, opts = {}) {
  const o = { simulate: null, env: null, disc: null, loft: DISC_WORP.loft, releases: [0, -1, 1], ...opts };
  const d = distance(lie, basket);
  const disc = o.disc || (d > DISC_WORP.ver ? 'driver' : d > DISC_WORP.nadering ? 'midrange' : 'putter');
  const basis = headingTo(lie, basket);
  if (typeof o.simulate !== 'function') {
    // geen vliegmodel: de schatting uit de vmax van de schijven (25/19/14 m/s), alleen als de regels ontbreken
    const bereik = disc === 'driver' ? 95 : disc === 'midrange' ? 52 : 21;
    return { disc, yaw: basis, power: clamp(d / bereik, DISC_WORP.kracht[0], 1), loft: o.loft, release: 0, dist: d, end: null, holed: false, why: 'schatting' };
  }
  const vlieg = (p) => o.simulate({ x: lie.x, y: lie.y, ...p }, o.env || {});
  // dichtbij mikt de bot op de kettingen (de schijf die op 1 m hoogte de mand raakt, zoals
  // discgolfrules.powerForBasket), verder weg op de plek waar hij neerkomt
  const dichtbij = d <= DISC_WORP.nadering;
  const loft = dichtbij ? DISC_WORP.laag : o.loft;
  const reik = (r) => {
    if (!dichtbij) return distance(lie, r.end);
    const p = r.path || [];
    for (let i = 1; i < p.length; i++) if (p[i][2] <= 1 && p[i - 1][2] > 1) return Math.hypot(p[i][0] - lie.x, p[i][1] - lie.y);
    return distance(lie, r.end);
  };
  let best = null;
  const beoordeel = (r, k) => {
    const af = distance(r.end, basket);
    const score = af - (r.holed ? 100 : 0);   // in de mand wint van elke afstand
    if (!best || score < best.score) {
      best = {
        score, disc, yaw: normAngle(k.yaw), power: k.power, loft, release: k.release, dist: af, end: { x: r.end.x, y: r.end.y }, holed: !!r.holed, reason: r.reason,
        why: r.holed ? 'in de mand' : af <= DISC_WORP.cirkel ? 'in de cirkel' : 'dichtbij',
      };
    }
  };
  for (const release of o.releases) {
    // de kracht die op de afstand van de mand uitkomt (of daar op 1 m hoogte langskomt)
    const krachtVoor = (yaw) => {
      let lo = DISC_WORP.kracht[0], hi = DISC_WORP.kracht[1];
      for (let i = 0; i < DISC_WORP.zoek; i++) {
        const mid = (lo + hi) / 2;
        if (reik(vlieg({ yaw, power: mid, loft, release, disc })) < d) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    // twee ronden: de kracht bij de beste hoek, dan de hoek bij die kracht. Eén ronde laat de wind de
    // hoekzoektocht op de verkeerde kracht zetten (gemeten met 4,4 m/s dwarswind: +8 in plaats van +4)
    let yaw = basis, power = krachtVoor(basis);
    for (let ronde = 0; ronde < 2; ronde++) {
      // de hoek: de wind blaast de schijf van de lijn, dus de waaier om de rechte lijn heen
      const span = DISC_WORP.span / (ronde + 1);
      let besteYaw = yaw, besteAf = Infinity;
      for (let k = -DISC_WORP.scan; k <= DISC_WORP.scan; k++) {
        const y = yaw + (k / DISC_WORP.scan) * span;
        const r = vlieg({ yaw: y, power, loft, release, disc });
        beoordeel(r, { yaw: y, power, release });
        const af = distance(r.end, basket);
        if (af < besteAf || (r.holed && besteAf > 0)) { besteAf = r.holed ? 0 : af; besteYaw = y; }
      }
      yaw = besteYaw;
      power = krachtVoor(yaw);
      beoordeel(vlieg({ yaw, power, loft, release, disc }), { yaw, power, release });
    }
  }
  if (!best) return null;
  delete best.score;
  return best;
}

// --- fierljep (#186): de naald van de aanloop en de greep, het klimmen, de sprong -------------------------------
// Het fierljep-duel (pg_fierljep.js) vraagt twee keer een druk terwijl de naald door het midden van de balk
// gaat (kwaliteit q = 1 - |naald - 0,5| / 0,5; de naald zwaait op 0,55 en daarna 0,85 Hz), dan 2,2 s tikken
// (dertien tikken is een volle klim), en rekent dat om naar een afstand: kwaliteit = 0,35 q1 + 0,35 q2 + 0,3 q3,
// 8 m * kwaliteit^1,25 bonus voorbij de overkant, een plons onder 0,3 / 0,3 / 0,25. De naald legt tot pi * hz
// per seconde af, dus een druk moet tegen de naald van het volgende beeld worden beoordeeld, niet tegen die van
// dit beeld: verder dan een halve beeldstap van het midden is er altijd een beeld dichterbij.
export const FIERLJEP = {
  hz: [0.55, 0.85],   // pg_fierljep.js NEEDLE_HZ (aanloop, greep)
  beeld: 1 / 60,      // de tijd tussen twee beelden waarin de naald gelezen wordt
  klimS: 2.2,         // pg_fierljep.js CLIMB_S
  klimTik: 13,        // pg_fierljep.js CLIMB_TAPS
  bonus: 8,           // pg_fierljep.js BONUS_MAX
  goud: 6.6,          // pg_fierljep.js GOLD_BONUS
  basis: 2.2,         // meter voorbij de overkant voor de bonus begint
  faal: [0.3, 0.3, 0.25],
  weeg: [0.35, 0.35, 0.3],
};
// s: { fase: 'aim1' | 'aim2', needle 0..1, wacht (seconden van de pauze), dt, hz }
// memoria onthoudt de naald van het vorige beeld (voor de stap) en of de naald net uit een pauze komt.
export function fierljepTik(s, mem = {}) {
  const hz = Number.isFinite(s.hz) ? s.hz : s.fase === 'aim2' ? FIERLJEP.hz[1] : FIERLJEP.hz[0];
  const dt = Number.isFinite(s.dt) ? s.dt : FIERLJEP.beeld;
  if (mem.fase !== s.fase) { mem.fase = s.fase; mem.needle = null; }
  const vorige = mem.needle;
  mem.needle = s.needle;
  // in de pauze staat de naald stil (pg_fierljep.js laat update terugkeren): een druk daar telt niet en kost
  // de beurt. De eerste proef drukte op de stilstaande naald van 0,5 en kreeg q 0,02 voor de greep.
  if (s.wacht > 0) { mem.pauze = true; return { press: false, wacht: s.wacht, why: 'pauze' }; }
  // vlak na de pauze is de stand van de naald nog die van voor de pauze; het spel loot de naaldtijd opnieuw
  // als de greep begint, dus de eerste druk zou op een sprong worden beoordeeld (gemeten: q 0,32)
  if (mem.pauze) { mem.pauze = false; mem.needle = null; return { press: false, why: 'naald springt bij' }; }
  // aim() schuift de naald eerst een beeld op en beoordeelt de druk daarna: mik op de naald van het volgende beeld
  const stap = Number.isFinite(vorige) ? s.needle - vorige : 0;
  const verwacht = s.needle + stap;
  const zone = Math.abs(stap) / 2 + 0.004;
  const af = Math.abs(verwacht - 0.5);
  const q = clamp(1 - Math.abs(s.needle - 0.5) / 0.5, 0, 1);
  return { press: af <= zone, q, zone, verwacht, why: af <= zone ? 'midden' : 'wachten' };
}
// s: { tikken, klimT } — tik zolang de klim loopt en de dertien tikken er niet zijn (niet blijven hameren)
export function fierljepKlim(s) {
  const tikken = s.tikken || 0;
  if (!(s.klimT > 0)) return { press: false, klaar: true, q: clamp(tikken / FIERLJEP.klimTik, 0, 1) };
  if (tikken >= FIERLJEP.klimTik) return { press: false, klaar: false, q: 1 };
  return { press: true, klaar: false, q: clamp((tikken + 1) / FIERLJEP.klimTik, 0, 1) };
}
// De sprong uit de drie kwaliteiten, precies als pg_fierljep.js playerJump: afstand = sloot + 2,2 + bonus.
export function fierljepSpring(q, breedte) {
  const w = FIERLJEP.weeg, f = FIERLJEP.faal;
  const kwaliteit = clamp(w[0] * (q[0] || 0) + w[1] * (q[1] || 0) + w[2] * (q[2] || 0), 0, 1);
  const faal = !(q[0] >= f[0]) || !(q[1] >= f[1]) || !(q[2] >= f[2]);
  const bonus = FIERLJEP.bonus * Math.pow(kwaliteit, 1.25);
  return { kwaliteit, faal, bonus, afstand: (breedte || 0) + FIERLJEP.basis + bonus, goud: !faal && bonus >= FIERLJEP.goud };
}

// --- de kermis (#186): welk spel, welke inzet, en hoe de botsauto rijdt ------------------------------------------
// kermis.js: de botsauto's kosten EUR 3 (gratis in de verhaalstap), 75 s rijden, punten voor elke bots die de
// speler geeft (meer in de flank, een reeks voor snelle botsen na elkaar), prijzengeld 0/5/12/25 bij
// 0/60/110/160 punten en dubbel op een kermisavond. Het reuzenrad (reuzenrad.js) kost EUR 2 en is een rit van
// twee rondes zonder prijs. De tent is 20 bij 12 m (roadaccess.js KERMIS_TENT hu/hv).
export const KERMIS = {
  prijs: 3, wielPrijs: 2, ritS: 75, autoR: 0.92, hu: 10, hv: 6,
  prijzen: [0, 5, 12, 25], medailles: [0, 60, 110, 160], flank: 0.55,
};
// Welk spel en welke inzet: het verhaal geeft een gratis rit, anders de botsauto's zolang het geld er is, en
// anders het reuzenrad (goedkoper, maar er valt niets te winnen). Te weinig geld: niets.
export function kermisKeuze({ geld = 0, verhaal = false, avond = false, wiel = true } = {}) {
  if (verhaal) return { speel: 'botsauto', prijs: 0, bonus: !!avond, waarom: 'gratis van Jan in het verhaal' };
  if (geld >= KERMIS.prijs) return { speel: 'botsauto', prijs: KERMIS.prijs, bonus: !!avond, waarom: avond ? 'kermisavond: dubbel prijzengeld' : "de botsauto's betalen zich terug" };
  if (wiel && geld >= KERMIS.wielPrijs) return { speel: 'hoogvlieger', prijs: KERMIS.wielPrijs, bonus: false, waarom: "te weinig voor de botsauto's: het reuzenrad" };
  return { speel: null, prijs: 0, bonus: false, waarom: 'te weinig geld' };
}
// De punten van een bots, als kermis.js ze telt: naar de snelheid waarmee de bot de ander raakt, 1,8 keer in de
// flank, 1,4 van achteren, 0,7 kop op kop, en een kwart meer per stap in de reeks (hooguit vier).
export function kermisPunten({ into = 0, hoek = 0, combo = 0 } = {}) {
  const soort = Math.abs(hoek) < KERMIS.flank ? 1.8 : hoek < 0 ? 1.4 : 0.7;
  return Math.max(1, Math.round(into * 1.3 * soort * (1 + Math.min(4, Math.max(0, combo - 1)) * 0.25)));
}
// Eén tik van de botsauto: gas en stuur in de tent (kermis-lokaal: u langs de tent, v dwars, a de hoek).
// De auto's van het spel zoeken de speler (kermis.js aiDrive: 40 tot 55 % jaagt), dus de beste kansen liggen
// midden in de tent: een langzame slinger over de vloer houdt de auto snel en levert de botsen op. Bij de rand
// stuurt hij terug naar het midden in plaats van tegen het elastiek te blijven hangen. s = { u, v, a, t, hu, hv }.
export function kermisStap(s, mem = {}) {
  const hu = s.hu || KERMIS.hu, hv = s.hv || KERMIS.hv, R = s.autoR || KERMIS.autoR;
  const t = Number.isFinite(s.t) ? s.t : 0;
  const marge = 1.6;
  const bijRand = Math.abs(s.u) > hu - R - marge || Math.abs(s.v) > hv - R - marge;
  // de slinger: 0,55 rad/s heen en weer over de volle breedte, zodat elke auto die jaagt in de baan komt
  const aim = bijRand ? { u: 0, v: 0 } : { u: Math.cos(t * 0.55) * (hu - R - 2.2), v: Math.sin(t * 0.8) * (hv - R - 2) };
  const err = normAngle(Math.atan2(aim.v - s.v, aim.u - s.u) - (s.a || 0));
  const turn = clamp(err * 1.6, -1, 1);
  // de auto draait op de plaats en slaat pas aan als de neus de goede kant op staat: achteruit steken als het
  // doel pal achter ligt (kermis.js steer: achteruit is 0,7 keer gas)
  const throttle = Math.abs(err) > 2.3 ? -0.7 : 1;
  void mem;
  return { throttle, turn, aim, hold: false, why: bijRand ? 'terug naar het midden' : 'slinger over de vloer' };
}

// --- het reuzenrad (#436, reuzenrad.js): instappen en uitstappen op het juiste moment ---------------------------
// De gondels hangen op i/N * 2pi + rot, het laagste punt is -pi/2, het rad draait met OMEGA en de rit duurt
// LAPS rondes; instappen en uitstappen kan alleen binnen BOARD_WINDOW van het laagste punt. De uitgang zet een
// verzoek (E) en stapt uit zodra de eigen gondel onderaan hangt, dus de bot drukt pas als de rit om is: hij
// wacht met een hold (de wachtteller van de pagina mag niet aflopen op een rit van 105 s).
export const WHEEL = { N: 12, omega: 0.12, rondes: 2, raam: 0.26, prijs: 2 };
const TAU = Math.PI * 2;
// De gondel van het reuzenrad: `plan` is de rit van het spel (reuzenradrules.ridePlan); de pagina kent alleen
// het deel van de rit (state().fraction), dus die geeft `klaar`/`index`/`links` in plaats van de plan-standen.
export function hoogvliegerStap(s, mem = {}) {
  const N = s.N || WHEEL.N, omega = s.omega || WHEEL.omega, raam = s.raam || WHEEL.raam;
  const rot = Number.isFinite(s.rot) ? s.rot : 0;
  const gat = (i) => normAngle((i / N) * TAU + rot + Math.PI / 2);   // 0 = precies onderaan
  if (s.inGondel) {
    const plan = s.plan || null;
    const index = plan ? plan.index : s.index || 0;
    const klaar = plan ? rot >= plan.endRot - 1e-9 : !!s.klaar;
    const links = plan ? Math.max(0, (plan.endRot - rot) / omega) : Number.isFinite(s.links) ? s.links : 0;
    const magUit = Math.abs(gat(index)) <= raam;
    void mem;
    return { press: klaar && magUit, magUit, klaar, links, hold: !(klaar && magUit), why: klaar ? (magUit ? 'uitstappen' : 'wachten op het laagste punt') : 'de rit duurt nog' };
  }
  let beste = 0, bg = Infinity;
  for (let i = 0; i < N; i++) { const g = gat(i); if (Math.abs(g) < Math.abs(bg)) { bg = g; beste = i; } }
  if (Math.abs(bg) <= raam) return { press: true, index: beste, wacht: 0, hold: false, why: 'instappen' };
  // seconden tot de volgende gondel instapbaar hangt (het rad draait één kant op)
  let wacht = Infinity;
  for (let i = 0; i < N; i++) { const d = (((-gat(i)) % TAU) + TAU) % TAU; wacht = Math.min(wacht, Math.max(0, d - raam) / omega); }
  return { press: false, index: beste, wacht, hold: true, why: 'wachten op een gondel' };
}

// --- padel (#443, padelmatch.js): de stoel van de bot in een wedstrijd tegen anderen -----------------------------
// tikPadel(m, dt, invoer) neemt per mens { mx, my, buttons } (bit 2 = Spatie) en gebruikt mx/my ook voor de
// plaatsing van de slag: mx naar de kant waar de tegenstanders niet staan, my omlaag (my < 0) is diep. De
// bottik: naar de voorspelde bal toe als die van de tegenstander komt en op onze helft is, anders naar de
// eigen plek; slaan als de bal binnen bereik is, met een nieuwe druk (de wedstrijd leest alleen de opgaande
// rand, dus de knop moet tussen twee slagen los). memoria houdt de vorige stand van de knop bij.
export function padelInvoer(m, slot, mem = {}) {
  const stoel = (m.stoelen || []).find((x) => x.slot === slot);
  const stil = { mx: 0, my: 0, buttons: 0, why: 'geen stoel' };
  if (!stoel) return stil;
  const F = stoel.team === 0 ? 1 : -1;                 // vooruit: naar het net
  const b = m.ball, fase = m.phase || m.fase;
  let doel = { u: stoel.hu, v: stoel.hv };
  let slaan = false;
  const serve = fase === 'serve' && m.serverStoel === stoel.i;
  if (serve) {
    slaan = !!b && !!b.toss;                           // de toss is er: slaan zodra de bal op heuphoogte is
  } else if (b && b.live && b.hitter !== stoel.team) {
    const p = b.crossed ? b : m.pred || b;
    doel = { u: p.u, v: p.v };
    // pas slaan als de bal over het net is en binnen bereik (padelmatch.js: REACH 1,45 m, hoogte 0,08-2,4 m)
    slaan = b.crossed && Math.hypot(b.u - stoel.u, b.v - stoel.v) < 1.35 && b.z > 0.08 && b.z < 2.4;
  }
  const du = doel.u - stoel.u, dv = doel.v - stoel.v, d = Math.hypot(du, dv);
  let mx = d < 0.25 ? 0 : clamp((F * du) / d, -1, 1);
  let my = d < 0.25 ? 0 : clamp((-F * dv) / d, -1, 1);
  if (slaan) {
    // de slag: naar de kant waar de tegenstanders niet staan, en diep. Bij de opslag juist niet: de stick
    // schuift de opslag zijwaarts (padelmatch.js: -teken(u) * 2,6 + F * mx * 3,0) en buiten het vak is een fout
    if (!serve) {
      const tegen = (m.stoelen || []).filter((x) => x.team !== stoel.team);
      const gem = tegen.length ? tegen.reduce((a, x) => a + x.u, 0) / tegen.length : 0;
      mx = gem > 0 ? -0.5 : 0.5;
      my = -0.6;
    } else { mx = 0; my = 0; }
  }
  const buttons = slaan && !mem.sw ? 2 : 0;
  mem.sw = !!buttons;
  return { mx, my, buttons, slaan, why: slaan ? (serve ? 'opslag' : 'slaan') : fase === 'serve' ? 'klaarstaan' : 'naar de bal' };
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
    timeouts: events.filter((e) => e.type === 'timeout'),
    cheats: events.filter((e) => e.type === 'cheat'),
    annuleer: events.filter((e) => e.type === 'annuleer'),
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
  // a run that did not finish says where it hung before anything else: the last step, where the bot stood, and how long the log had been
  // silent (a branch that keeps the clock itself used to eat twenty minutes without a single line, #387)
  if (meta.result && !/^(KLAAR|REPLAY)/.test(String(meta.result))) {
    const end = [...events].reverse().find((e) => e.type === 'einde');
    const pos = end && Number.isFinite(end.x) ? end : [...events].reverse().find((e) => Number.isFinite(e.x) && Number.isFinite(e.y));
    const timed = events.filter((e) => Number.isFinite(e.t));
    const last = timed[timed.length - 1] || {};
    const step = (end && end.step) || (pos && pos.step) || (S.missions.length && S.missions[S.missions.length - 1].id) || '?';
    const label = (S.missions.find((m) => m.id === String(step).split(':')[0]) || {}).label || (end && end.label) || '';
    out.push('', '## Waar de run stopte', '');
    out.push(`- Stap: ${step}${label ? ` (${label})` : ''}`);
    if (pos) out.push(`- Plek: (${Math.round(pos.x)}, ${Math.round(pos.y)})${Number.isFinite(pos.goalDist) ? `, ${Math.round(pos.goalDist)} m van het doel` : Number.isFinite(pos.dist) ? `, ${Math.round(pos.dist)} m van het doel` : ''}`);
    if (end && Number.isFinite(end.inStepS)) out.push(`- In deze stap: ${fmtS(end.inStepS)}`);
    const silentS = Math.round((meta.gameSeconds ?? last.t ?? 0) - (last.t ?? 0));
    if (silentS > 5) out.push(`- Stilte: ${fmtS(silentS)} zonder één gebeurtenis voor het eind (laatste was ${last.type || '?'} op ${fmtS(last.t || 0)})`);
    if (end && end.reason) out.push(`- Reden: ${end.reason}`);
  }
  out.push('', '## Tijd per missie', '', '| Stap | Titel | Tijd | Uitkomst | Mislukt | Vast | Cheats |', '|---|---|---|---|---|---|---|');
  for (const m of S.missions) {
    const dur = m.end != null ? fmtS(m.end - m.start) : 'niet af';
    out.push(`| ${m.id} | ${m.label} | ${dur} | ${m.outcome || 'niet af'} | ${m.fails} | ${m.stuck} | ${m.cheats.length ? m.cheats.join(', ') : '-'} |`);
  }
  if (!S.missions.length) out.push('| (geen) | | | | | | |');
  out.push('', '## Vastzitten', '');
  if (!S.stuck.length) out.push('Niet vastgezeten.');
  for (const e of S.stuck) out.push(`- ${fmtS(e.t)} bij ${e.step || '?'} op (${Math.round(e.x)}, ${Math.round(e.y)}), ${Math.round(e.idleFor || 0)} s zonder voortgang, afstand tot doel ${e.goalDist != null ? Math.round(e.goalDist) + ' m' : 'onbekend'}`);
  out.push('', '## Time-outs', '');
  if (!S.timeouts.length) out.push('Geen.');
  for (const e of S.timeouts) out.push(`- ${fmtS(e.t)} bij ${e.step || '?'}: ${e.what || 'duurde te lang'} na ${Math.round(e.forS || 0)} s${e.doel && Number.isFinite(e.doel.x) ? ` bij doel (${Math.round(e.doel.x)}, ${Math.round(e.doel.y)})` : ''}`);
  out.push('', '## Had een cheat nodig', '');
  const real = S.cheats.filter((c) => isCheat(c.rung));
  if (!real.length) out.push('Geen cheats nodig.');
  for (const e of real) out.push(`- ${fmtS(e.t)} bij ${e.step || '?'}: ${e.rung}${e.why ? ` (${e.why})` : ''}`);
  if (S.annuleer.length) {
    out.push('', '## Missie gestopt uit het menu (#390)', '');
    for (const e of S.annuleer) out.push(`- ${fmtS(e.t)} bij ${e.voor && e.voor.id}: knop ${e.knop ? 'ja' : '**nee**'}, vraag ${e.vraagZichtbaar ? 'ja' : '**nee**'}, na de vraag nog actief ${e.nogActiefNaVraag ? 'ja' : 'nee'}, na Ja ${e.na && e.na.actief ? '**nog actief**' : 'gestopt'} (mislukkingen ${e.voor && e.voor.fails} naar ${e.na && e.na.fails}, geld ${e.voor && e.voor.money} naar ${e.na && e.na.money}): ${e.ok ? 'klopt' : '**klopt niet**'}`);
  }
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
