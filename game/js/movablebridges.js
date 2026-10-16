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

export const BRIDGE_TIMING = { WARN_S: 4, BOOMS_S: 4, CLEAR_MAX_S: 12, MOVE_S: 9, HOLD_S: 14 };
// how far in front of the bridge a skipper's horn counts, and a boat that
// asked keeps it open
const HORN_REACH = 45;
const WAIT_REACH = 35;
// barriers stand this far beyond the span's ends
const BOOM_OUT = 3;

let bridges = [];
let ready = false;

export function getMovableBridges() { return bridges; }

// The bridges of a map: one per movable road. Span along the road from its
// first to its last vertex; `half` the deck's half width.
export function buildMovableBridges(map) {
  bridges = [];
  for (const r of map.roads || []) {
    if (!r.movable || !r.bridge || r.pts.length < 2) continue;
    const a = r.pts[0], b = r.pts[r.pts.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 3) continue;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    const wide = r.cat === 'major' || r.cat === 'normal' || r.cat === 'minor';
    bridges.push({
      r, kind: r.movable, ax: a[0], ay: a[1], bx: b[0], by: b[1], len, ux, uy,
      x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2,
      half: (r.width || 4) / 2 + (wide ? 1.8 : 0.15),
      name: r.name || '',
      state: 'closed', t: 0, open: 0, boom: 0, flash: 0, warn: false, requests: 0, waitFor: null,
      snapped: null, _booms: null,
    });
  }
  ready = true;
  return bridges;
}

export function resetMovableBridges() {
  for (const b of bridges) { b.state = 'closed'; b.t = 0; b.open = 0; b.boom = 0; b.warn = false; b.waitFor = null; b.snapped = null; b.r._open = false; }
}

// Ask bridge `b` to open (a boat in front of it). `who`: the boat, kept as
// the reason to hold it open while it is near.
export function requestOpening(b, who = null, twins = true) {
  // a bridge beside it over the same water (the cycle bridge next to the
  // road bridge) opens with it
  if (twins) for (const o of bridges) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < 30) requestOpening(o, who, false);
  b.requests++;
  if (who) b.waitFor = who;
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
      if (b.t >= T.HOLD_S && !near) { b.state = 'closing'; b.t = 0; b.waitFor = null; }
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

export function updateMovableBridges(dt, world) {
  if (!ready || dt <= 0) return;
  for (const b of bridges) {
    // a boat that does not fit under the closed bridge asks for it
    if (b.state === 'closed' && world) {
      for (const v of world.vehicles || []) {
        if (!v.isBoat || v.wrecked || !v.needsOpening) continue;
        if (Math.hypot(v.x - b.x, v.y - b.y) > HORN_REACH) continue;
        if (v.needsOpening(b)) { requestOpening(b, v); break; }
      }
    }
    stepBridge(b, dt, world);
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
  for (const b of bridges) {
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
  for (const b of bridges) {
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
