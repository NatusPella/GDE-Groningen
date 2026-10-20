// Movable bridges (docs/PROVINCIE-PLAN.md 2.11, "Water"): every road that OSM
// tags bridge:movable (scripts/world/water.mjs sets road.movable) opens for
// boats that do not fit under it, and for a skipper who sounds the horn in
// front of it. A fixed cycle, so a chase or a race can count on it:
//
//   warn      WARN_S    red lights flash, a bell: stop if you still can
//   booms     BOOMS_S   the half barriers come down (cars stop at them)
//   clear               until nobody is on the span (at most CLEAR_MAX_S)
//   opening   MOVE_S    the leaf rises (bascule), turns (swing) or lifts
//   open      HOLD_S    at least; longer while a boat that asked waits near
//   closing   MOVE_S
//   up        BOOMS_S   the barriers go up; then closed
//
// While a bridge is not closed its span is no bridge (road._open: map.isOnBridge
// is false there, so a car that gets on it ends up in the canal and boats
// pass with no deck over them). No scene here: movablebridges3d.js draws the
// leaves, barriers and lights from the state exported below.

import { airDraftOf, passesUnder, BRIDGE_DECK_T, BOEZEM_Y } from './waterlevels.js';

export const BRIDGE_TIMING = { WARN_S: 4, BOOMS_S: 4, CLEAR_MAX_S: 12, MOVE_S: 9, HOLD_S: 14 };
// how far in front of the bridge a skipper's horn counts, and a boat that
// asked keeps it open
const HORN_REACH = 45;
const WAIT_REACH = 35;
// barriers stand this far beyond the span's ends
const BOOM_OUT = 3;

// Automatic opening (#154): a boat too tall for the closed bridge makes it open
// by itself, timed so the leaf is up when the boat arrives. The trigger is the
// boat's time to the deck against the time the bridge needs to open.
export const AUTO = {
  MARGIN_S: 3,        // extra seconds of lead on top of the opening time
  REACH: 260,         // a boat further than this (m) from the deck is not looked at
  LATERAL_PAD: 6,     // the boat is in the channel when within the span plus this
  MIN_SPEED: 0.6,     // below this (m/s) a boat counts as lying still
  STILL_REACH: 45,    // a boat lying still this close asks for it (like a horn)
  PASS_PAD: 8,        // the boat has passed when this far beyond the deck's edge
  MIN_OPEN_S: 5,      // an automatic opening stays open at least this long (a horn: HOLD_S)
  MAX_OPEN_S: 90,     // however many boats ask: after this long open (s) the bridge lets them all go and closes (they ask again if they still need it)
  PASSED_FREE_M: 30,  // a boat that has passed counts as a new boat again once it is this much further than STILL_REACH away (m)
  IGNORE_FREE_M: 15,  // a boat let go (moored, or through and lying still beyond) is looked at again once it has sailed this far (m)
  STILL_PATIENCE_S: 20, // a boat that lies still this long (s) with the span open is let go: it is moored, not waiting
};
// the clearance under a closed city bridge, as waterlevels.bridgeClearance gives it
const STREET_CLEAR = 0 - BRIDGE_DECK_T - BOEZEM_Y;
export function boatNeedsOpening(v) {
  return !passesUnder(airDraftOf(v), STREET_CLEAR);
}
// Seconds a bridge needs from the request until the leaf is up
export function openingLead() {
  const T = BRIDGE_TIMING;
  return T.WARN_S + T.BOOMS_S + T.MOVE_S;
}
// Where a boat is to bridge b: w along the water (across the span; + one side,
// - the other, measured from the deck's edge so 0 is at the edge), s along the
// span from its middle. vw: speed along the water towards the deck (> 0 =
// approaching, < 0 = leaving).
export function boatFrame(b, v) {
  const dx = v.x - b.x, dy = v.y - b.y;
  const nx = -b.uy, ny = b.ux;
  const w = dx * nx + dy * ny, s = dx * b.ux + dy * b.uy;
  const sp = v.speed || 0;
  const vx = Math.cos(v.angle) * sp, vy = Math.sin(v.angle) * sp;
  const vAlong = vx * nx + vy * ny;
  const edge = Math.max(2, b.half);
  return { w: Math.abs(w) - edge, side: Math.sign(w) || 1, s, vw: -Math.sign(w || 1) * vAlong };
}
// Is the boat done with the bridge: sailed through (beyond the deck on the far
// side), or turned back (beyond the pad, heading away)? `from`: the side it came from.
export function boatPassed(b, v, from) {
  const f = boatFrame(b, v);
  return f.w > AUTO.PASS_PAD && (f.side !== from || (f.vw < 0 && Math.abs(v.speed || 0) >= AUTO.MIN_SPEED)); // (drift at a standstill is not turning back)
}
// Should boat v make bridge b open now? Pure: the boat's time to the deck is
// no more than the opening lead plus a margin, it is heading for the deck in
// the channel, or it lies still close by.
export function boatTriggers(b, v) {
  const f = boatFrame(b, v);
  if (Math.abs(f.s) > b.len / 2 + AUTO.LATERAL_PAD) return false;
  if (f.w > AUTO.REACH) return false;
  if (f.w <= 0) return true; // on the span's line already
  if (Math.abs(v.speed || 0) < AUTO.MIN_SPEED) return f.w < AUTO.STILL_REACH;
  if (f.vw <= 0) return false; // sailing away
  return f.w / f.vw <= openingLead() + AUTO.MARGIN_S;
}

let bridges = [];
let ready = false;
// bridges closed to traffic by a ship's blow (bridgehitworld.js): they get
// the same barriers and the same stop for the traffic AI, nothing else
let extra = [];
export function setDamagedBridgeBarriers(list) { extra = list; }

export function getMovableBridges() { return bridges; }

// A footway or cycle path that runs beside a movable road over the same water is part of the same leaf in the real
// world, but OSM tags only the carriageway: left alone it stays a closed deck beside the open one. Such a way
// (parallel, at most 12 m beside the span) takes over the kind of the carriageway.
const SIDE_CATS = new Set(['foot', 'cycle']);
export function adoptSideSpans(roads) {
  const spans = [];
  for (const r of roads) {
    if (!r.movable || !r.bridge || r.pts.length < 2) continue;
    const a = r.pts[0], b = r.pts[r.pts.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len >= 3) spans.push({ r, a, len, ux: (b[0] - a[0]) / len, uy: (b[1] - a[1]) / len });
  }
  if (!spans.length) return;
  for (const r of roads) {
    if (r.movable || !r.bridge || !SIDE_CATS.has(r.cat) || r.pts.length < 2) continue;
    const a = r.pts[0], b = r.pts[r.pts.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 3) continue;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    for (const q of spans) {
      if (Math.abs(ux * q.uy - uy * q.ux) > 0.26) continue; // not parallel
      const s = (mx - q.a[0]) * q.ux + (my - q.a[1]) * q.uy, o = -(mx - q.a[0]) * q.uy + (my - q.a[1]) * q.ux;
      if (s < 0 || s > q.len || Math.abs(o) > 12) continue;
      r.movable = q.r.movable;
      break;
    }
  }
}

// The bridges of a map: one per movable road. Span along the road from its
// first to its last vertex; `half` the deck's half width.
function makeBridge(r, pinned) {
  if (!r.movable || !r.bridge || r.pts.length < 2) return null;
  const a = r.pts[0], b = r.pts[r.pts.length - 1];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 3) return null;
  const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
  const wide = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor';
  return {
    r, kind: r.movable, ax: a[0], ay: a[1], bx: b[0], by: b[1], len, ux, uy,
    x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2,
    half: (r.width || 4) / 2 + (wide ? 1.8 : 0.15),
    name: r.name || '', pinned,
    state: 'closed', t: 0, open: 0, boom: 0, flash: 0, warn: false, requests: 0, waitFor: null,
    snapped: null, _booms: null, boats: new Map(), manual: false, still: new Map(), ignored: new Map(), passed: new Set(),
  };
}

// The bridges of a map: one per movable road. Span along the road from its
// first to its last vertex; `half` the deck's half width.
export function buildMovableBridges(map) {
  bridges = [];
  adoptSideSpans(map.roads || []);
  for (const r of map.roads || []) { const b = makeBridge(r, true); if (b) bridges.push(b); }
  ready = true;
  version++;
  return bridges;
}

// The movable bridges of the province come with the tiles that stream in, not with map.roads (#235: they never opened,
// had no barriers, signals or boat passage): the tile world hands the roads near a new tile to addMovableRoads, and
// pruneMovableBridges drops the ones whose road has left the grids. The array stays the same one (other modules hold it).
let version = 0, pruneClock = 0;
export const movableBridgesVersion = () => version;
export function addMovableRoads(roads) {
  adoptSideSpans(roads);
  let n = 0;
  for (const r of roads) {
    if (!r.movable || !r.bridge || bridges.some((q) => q.r === r)) continue;
    const b = makeBridge(r, false);
    if (b) { bridges.push(b); n++; }
  }
  if (n) { ready = true; version++; }
  return n;
}
// map: anything with roadsNear(x, y, r). A bridge of a city road (pinned) stays.
export function pruneMovableBridges(map) {
  let n = 0;
  for (let i = bridges.length - 1; i >= 0; i--) {
    const b = bridges[i];
    if (b.pinned || map.roadsNear(b.x, b.y, 3).includes(b.r)) continue;
    b.r._open = false;
    bridges.splice(i, 1);
    n++;
  }
  if (n) version++;
  return n;
}

export function resetMovableBridges() {
  for (const b of bridges) { b.state = 'closed'; b.t = 0; b.open = 0; b.boom = 0; b.warn = false; b.waitFor = null; b.boats.clear(); b.still.clear(); b.ignored.clear(); b.passed.clear(); b.manual = false; b.snapped = null; b._hinted = null; b.r._open = false; }
}

// Ask bridge `b` to open (a boat in front of it). `who`: the boat, kept as
// the reason to hold it open while it is near.
export function requestOpening(b, who = null, twins = true, auto = false) {
  // a bridge beside it over the same water (the cycle bridge next to the
  // road bridge) opens with it
  if (twins) for (const o of bridges) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < 30) requestOpening(o, who, false, auto);
  b.requests++;
  if (!auto) b.manual = true;
  if (who) {
    b.waitFor = who;
    // the side the boat came from: it has passed when it is on the other one
    if (!b.boats.has(who)) b.boats.set(who, who.x !== undefined ? boatFrame(b, who).side : 1);
  }
  if (b.state === 'closed') { b.state = 'warn'; b.t = 0; }
  else if (b.state === 'closing' || b.state === 'up') {
    // it opens again from where it is
    b.state = 'opening'; b.t = BRIDGE_TIMING.MOVE_S * (1 - b.open);
  }
}

// The nearest movable bridge whose span a boat at (x, y) is in front of
// (within reach, beside the span's line), or null.
export function bridgeAhead(x, y, reach = HORN_REACH) {
  let best = null, bd = reach;
  for (const b of bridges) {
    const dx = x - b.x, dy = y - b.y;
    const along = Math.abs(dx * b.ux + dy * b.uy);
    if (along > b.len / 2 + 2) continue;
    const across = Math.abs(-dx * b.uy + dy * b.ux);
    if (across < bd) { bd = across; best = b; }
  }
  return best;
}

// The player's horn in a boat: the bridge ahead opens.
export function hornAt(x, y, boat = null) {
  const b = bridgeAhead(x, y);
  if (b) requestOpening(b, boat);
  return b;
}

// Is anything on the span? (x, y) within the deck plus a metre
export function onSpan(b, x, y, pad = 1) {
  const dx = x - b.ax, dy = y - b.ay;
  const s = dx * b.ux + dy * b.uy, o = -dx * b.uy + dy * b.ux;
  return s > -pad && s < b.len + pad && Math.abs(o) < b.half + pad;
}

function spanBusy(b, world) {
  if (!world) return false;
  for (const v of world.vehicles || []) if (!v.isBoat && !v.sinking && onSpan(b, v.x, v.y, v.halfLen || 2)) return true;
  const p = world.player;
  if (p && !p.inVehicle && !p.water && onSpan(b, p.x, p.y)) return true;
  for (const ped of world.pedestrians || []) if (onSpan(b, ped.x, ped.y, 0.5) && ped.state !== 'dead') return true;
  return false;
}

// One step of a bridge's cycle (pure apart from `world`, which only tells
// whether the span is busy and whether the waiting boat is still near).
export function stepBridge(b, dt, world = null) {
  const T = BRIDGE_TIMING;
  b.t += dt;
  b.flash += dt;
  switch (b.state) {
    case 'closed': b.boom = 0; b.open = 0; break;
    case 'warn':
      if (b.t >= T.WARN_S) { b.state = 'booms'; b.t = 0; }
      break;
    case 'booms':
      b.boom = Math.min(1, b.t / T.BOOMS_S);
      if (b.t >= T.BOOMS_S) { b.state = 'clear'; b.t = 0; }
      break;
    case 'clear':
      b.boom = 1;
      if (!spanBusy(b, world) || b.t >= T.CLEAR_MAX_S) { b.state = 'opening'; b.t = 0; }
      break;
    case 'opening':
      b.open = Math.min(1, b.t / T.MOVE_S);
      if (b.t >= T.MOVE_S) { b.state = 'open'; b.t = 0; }
      break;
    case 'open': {
      b.open = 1;
      const w = b.waitFor;
      const near = w && !w.wrecked && !w.sinking && Math.hypot(w.x - b.x, w.y - b.y) < WAIT_REACH;
      // boats that asked and have not yet sailed through hold it open (several in a row)
      for (const [boat, from] of b.boats) {
        const gone = !boat || boat.wrecked || boat.sinking || (world && world.vehicles && !world.vehicles.includes(boat));
        if (!gone && !boatPassed(b, boat, from)) continue;
        b.boats.delete(boat); b.still.delete(boat);
        // a boat that has sailed through and then lies still beyond the bridge does not ask for it again (a boat
        // that comes back under way still does: the moving rule of boatTriggers)
        if (!gone && boat.x !== undefined) b.passed.add(boat);
      }
      // a boat that lies still with the span open is moored, not waiting: after the patience it no longer holds the bridge
      // open (nor makes it open again) until it sails off
      for (const boat of [...b.boats.keys()]) {
        if (Math.abs(boat.speed || 0) >= AUTO.MIN_SPEED) { b.still.delete(boat); continue; }
        const idle = (b.still.get(boat) || 0) + dt;
        if (idle >= AUTO.STILL_PATIENCE_S) { b.boats.delete(boat); b.still.delete(boat); b.ignored.set(boat, [boat.x, boat.y]); if (b.waitFor === boat) b.waitFor = null; } else b.still.set(boat, idle);
      }
      if (b.t >= AUTO.MAX_OPEN_S) { for (const boat of b.boats.keys()) if (boat.x !== undefined) b.ignored.set(boat, [boat.x, boat.y]); b.boats.clear(); b.still.clear(); b.waitFor = null; b.manual = false; }
      const waiting = b.boats.size > 0 || (b.manual && near);
      if (b.t >= (b.manual ? T.HOLD_S : AUTO.MIN_OPEN_S) && !waiting) { b.state = 'closing'; b.t = 0; b.waitFor = null; b.manual = false; }
      break;
    }
    case 'closing':
      b.open = Math.max(0, 1 - b.t / T.MOVE_S);
      if (b.t >= T.MOVE_S) { b.state = 'up'; b.t = 0; b.open = 0; }
      break;
    case 'up':
      b.boom = Math.max(0, 1 - b.t / T.BOOMS_S);
      if (b.t >= T.BOOMS_S) { b.state = 'closed'; b.t = 0; b.boom = 0; b.snapped = null; }
      break;
  }
  b.warn = b.state !== 'closed';
  // the deck is not there from the moment it starts to rise until it is down
  b.r._open = b.state === 'opening' || b.state === 'open' || b.state === 'closing';
}

// Seconds from a request until the span is no longer drivable (the race
// window: cross before the barriers are down) and until it is drivable again.
export function raceWindow() {
  const T = BRIDGE_TIMING;
  return { boomsDown: T.WARN_S + T.BOOMS_S, deckGone: T.WARN_S + T.BOOMS_S, cycle: T.WARN_S + 2 * T.BOOMS_S + 2 * T.MOVE_S + T.HOLD_S };
}

// The light for boats at a bridge: green only while the span lies open, red
// while it is closed or busy (warning, barriers, moving).
export function boatSignal(b) { return b.state === 'open' ? 'green' : 'red'; }

// The hint (#154) for someone near the bridge, at the moment its state turns to
// `warn` (it is going to open) or `open` (it lies open). `onWater`: a boat or
// swimmer, else road traffic. null for any other change.
const HINT_REACH = 70;
export function bridgeHint(state, onWater) {
  if (state === 'warn') return 'Brug gaat open';
  if (state === 'open') return 'Brug open';
  return null;
}

function hintNear(b, world) {
  const p = world && world.player;
  if (!p || !world.addMessage) return;
  const v = p.inVehicle;
  const x = v ? v.x : p.x, y = v ? v.y : p.y;
  if (Math.abs(x - b.x) > HINT_REACH + b.len / 2 || Math.abs(y - b.y) > HINT_REACH + b.len / 2) return;
  const text = bridgeHint(b.state, !!(v && v.isBoat));
  if (text) world.addMessage(text, 3, { kind: 'tip' });
}

export function updateMovableBridges(dt, world) {
  if (!ready || dt <= 0) return;
  pruneClock += dt;
  if (pruneClock > 2 && world && world.map && world.map.roadsNear) { pruneClock = 0; pruneMovableBridges(world.map); }
  for (const b of bridges) {
    // a boat that does not fit under the closed bridge makes it open, timed to
    // arrive as the leaf is up (a horn, hornAt, still works by hand)
    if (world) {
      for (const v of world.vehicles || []) {
        if (!v.isBoat || v.wrecked || v.sinking || (v.needsOpening ? !v.needsOpening(b) : !boatNeedsOpening(v))) continue;
        if (b.passed.size && b.passed.has(v)) {
          if (Math.hypot(v.x - b.x, v.y - b.y) > AUTO.STILL_REACH + AUTO.PASSED_FREE_M) b.passed.delete(v);
          else if (Math.abs(v.speed || 0) < AUTO.MIN_SPEED) continue;
        }
        if (b.ignored.size && b.ignored.has(v)) { const q = b.ignored.get(v); if (Math.hypot(v.x - q[0], v.y - q[1]) > AUTO.IGNORE_FREE_M) b.ignored.delete(v); else continue; }
        if (!boatTriggers(b, v)) continue;
        if (b.state === 'open' || b.state === 'opening' || b.state === 'warn' || b.state === 'booms' || b.state === 'clear') {
          if (!b.boats.has(v)) b.boats.set(v, boatFrame(b, v).side);
        } else requestOpening(b, v, true, true);
      }
    }
    stepBridge(b, dt, world);
    // one hint per bridge per change (a request may have set `warn` before this step)
    if (b._hinted !== b.state) {
      b._hinted = b.state;
      if (b.state === 'warn' || b.state === 'open') hintNear(b, world);
    }
  }
}

// --- barriers (like railway.js level crossing booms) ----------------------

// The barrier arms as game-plane segments: one per end on the right-hand
// side of the way in (both ends; the whole width on a one-way or narrow way).
export function boomsOf(b) {
  if (b._booms) return b._booms;
  b._booms = [];
  const r = b.r, small = r.cat === 'cycle' || r.cat === 'foot';
  for (const end of [0, 1]) {
    // travelling onto the bridge from this end: direction in
    const ux = end ? -b.ux : b.ux, uy = end ? -b.uy : b.uy;
    const rx = -uy, ry = ux; // to the right of the way in (y south: right-hand)
    const ex = end ? b.bx : b.ax, ey = end ? b.by : b.ay;
    const px = ex - ux * BOOM_OUT + rx * (b.half + 0.3), py = ey - uy * BOOM_OUT + ry * (b.half + 0.3);
    const len = (r.oneway || small ? b.half * 2 : b.half) + 0.3;
    b._booms.push({ c: b, i: b._booms.length, ax: px - rx * 0.1, ay: py - ry * 0.1, bx: px - rx * (len + 0.1), by: py - ry * (len + 0.1), px, py, ux, uy, rx, ry, len });
  }
  return b._booms;
}

export function loweredBridgeBoomsNear(x, y, r = 30) {
  const out = [];
  for (const b of bridges.concat(extra)) {
    if (b.boom < 0.6 || Math.abs(b.x - x) > r + b.len / 2 + 10 || Math.abs(b.y - y) > r + b.len / 2 + 10) continue;
    for (const bm of boomsOf(b)) if (!(b.snapped && b.snapped[bm.i])) out.push(bm);
  }
  return out;
}

// Traffic AI hook (vehicle.js, beside railway.js crossingSpeedLimit): the
// speed that halts a vehicle before the barrier of a bridge that is not
// closed. `project` is vehicle.js projectOnPath.
export function bridgeSpeedLimit(v, path, project) {
  let vmax = Infinity;
  for (const b of extra.length ? bridges.concat(extra) : bridges) {
    if (!b.warn) continue;
    const dx = b.x - v.x, dy = b.y - v.y;
    if (dx * dx + dy * dy > (70 + b.len) ** 2) continue;
    const decel = v.model.brake * 0.45;
    for (const end of [0, 1]) {
      const ex = end ? b.bx + b.ux * BOOM_OUT : b.ax - b.ux * BOOM_OUT, ey = end ? b.by + b.uy * BOOM_OUT : b.ay - b.uy * BOOM_OUT;
      const pr = project(path, ex, ey);
      if (!pr || pr.lat > b.half + 1) continue;
      // already past this end's barrier (on the span or beyond): drive on
      const stopS = pr.s - 1.5 - v.halfLen;
      if (stopS < -0.5) continue;
      // in the warn phase whoever cannot stop in time goes on
      if (b.state === 'warn' && Math.sqrt(2 * decel * Math.max(0, stopS)) < Math.abs(v.speed || 0) * 0.8) continue;
      vmax = Math.min(vmax, Math.sqrt(2 * decel * Math.max(0, stopS)));
    }
  }
  return vmax;
}

// for tests and the story test
export function _setBridgesForTest(list) { bridges = list; ready = true; }
