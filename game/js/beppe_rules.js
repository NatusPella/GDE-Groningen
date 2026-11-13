// Pure rules of the Beppe tribute (issue #832): where the place stands and
// what counts as one visit. No THREE, no DOM, no clock, so
// scripts/beppe_garden_test.mjs can import this file directly;
// game/js/beppe_garden.js draws the place with these spots.
//
// The tribute stands on the western road out of Grunn, where it leaves the
// province on its way to Kollum: the last bench of Grunn on the Groningen
// verge (its plaque says "Goed ite!"), a direction sign to Kollum, and
// Beppe's house with its garden just over the border in Friesland.
//
// Anchor: the 'friesland' world end (worldends.js) sits where the western road
// runs off the edge of the province's data. That data edge lies far into
// Friesland; the edge guard lets the player cross the real provincial border up
// to the buffer the data supports (worldedge.js borderByData: at least 200 m),
// so the house 22 m over the border is inside the playable strip. The game
// walks the same road back from that world end to the real border and puts the
// place there, so the player can reach it. Assumption documented for the issue:
// the tiles around the spot are not built in this worktree (game/world is not
// in git), so the place is placed deterministically from the road and border
// data and has not been seen in the game yet.

import { FAREWELL, HOUSE_ARRIVAL, TODO } from './beppe_texts.js';

// The world end whose road this place follows (worldends.js / ommelandlines.js).
export const BEPPE_END_ID = 'friesland';

// The lifetime set and the ids that make each visit once per player
// (recordUnique/hasUnique, achievements.js); the hidden achievement is
// unlocked on arrival.
export const TRIBUTE = {
  set: 'eerbetoon',
  achievement: 'goed_eten',
  bench: 'bankje',
  arrival: 'aankomst',
  remembrance: 'herinnering',
};
export const TODO_KEY = TODO.key;

// Metres and angles: the bench and the sign on the Groningen verge just before
// the border, Beppe's house and garden a little over it. Everything is an
// offset from the point where the road centre crosses the border (`out` is the
// unit direction from Groningen into Friesland). The side offsets grow with
// the road: a wide road keeps the bench off the asphalt.
export const LAYOUT = {
  benchIn: 24,           // the last bench: this far inside (Groningen side)
  benchSide: 5.2,        // ... and at least this far from the road centre line
  signIn: 18,            // the Kollum sign: a little nearer the border
  signSide: 7.8,
  arrivalR: 38,          // the arrival card when the player comes this close
  houseOut: 22,          // Beppe's house: this far past the border
  houseSide: 15,         // ... and at least this far off the road
  gardenBenchOut: 16,    // the garden bench: in the front garden, reachable
  gardenBenchSide: 9.5,  // ... on the same verge as the house
  houseR: 7.5,           // within this of the house: the memory as a fallback
  leaveR: 80,            // walking away this far sets the doves off
};

// The side offsets for a road of half width hw: a little clear of the asphalt,
// and far enough from the centre line that the whole front garden fits beside
// the road (the garden reaches about 12 m out from the house towards it).
export function sideOffsets(hw = 0) {
  return {
    bench: Math.max(LAYOUT.benchSide, hw + 2.0),
    sign: Math.max(LAYOUT.signSide, hw + 4.2),
    house: Math.max(LAYOUT.houseSide, hw + 14),
    gardenBench: Math.max(LAYOUT.gardenBenchSide, hw + 5.5),
  };
}

const unit = (x, y) => {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : null;
};

// The world end this place follows out of the twelve (worldends.js spots).
export function pickTributeEnd(ends) {
  if (!Array.isArray(ends)) return null;
  const e = ends.find((q) => q && q.id === BEPPE_END_ID);
  if (!e || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return null;
  return { id: e.id, name: e.name || '', road: e.road || '', x: e.x, y: e.y };
}

// Nearest point on a polyline (a road row from roadgraph.js) to (x, y):
// { i, t, x, y, d, ux, uy } with ux/uy the unit direction of that segment.
export function nearestOnPath(pts, x, y) {
  if (!Array.isArray(pts) || pts.length < 2) return null;
  let best = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (!a || !b) continue;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    if (!(l2 > 1e-9)) continue;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2));
    const px = a[0] + dx * t, py = a[1] + dy * t;
    const d = Math.hypot(x - px, y - py);
    if (!best || d < best.d) {
      const l = Math.sqrt(l2);
      best = { i, t, x: px, y: py, d, ux: dx / l, uy: dy / l };
    }
  }
  return best;
}

// `dist` metres along the polyline from `from` ({ i, t }), direction +1 with
// the point order or -1 against it: { i, t, x, y }, or null off the ends.
export function walkPath(pts, from, dir, dist) {
  if (!Array.isArray(pts) || pts.length < 2 || !from) return null;
  let i = from.i, t = from.t, left = Math.max(0, dist);
  while (left > 0) {
    const a = pts[i], b = pts[i + 1];
    if (!a || !b) return null;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!(l > 1e-9)) return null;
    const span = dir > 0 ? (1 - t) * l : t * l;
    if (left <= span) {
      const t2 = dir > 0 ? t + left / l : t - left / l;
      return { i, t: t2, x: a[0] + (b[0] - a[0]) * t2, y: a[1] + (b[1] - a[1]) * t2 };
    }
    left -= span;
    i += dir;
    if (i < 0 || i > pts.length - 2) return null;
    t = dir > 0 ? 0 : 1;
  }
  return { i, t, x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t };
}

// Where the road of a world end runs back into the province: the road centre
// crossing the real provincial border, walked from the world end's standing
// spot (`at`) along the road row. regionOf(x, y) -> 'friesland' | 'groningen'
// | ... and inData(x, y) -> whether a province tile lies there tell the walk
// which way is inward. Returns { x, y, ux, uy } (point; outward unit direction
// from Groningen into Friesland) or null when this road has no such crossing.
export function crossingOnRoad(pts, at, { regionOf, inData, step = 3, max = 6000 } = {}) {
  if (typeof regionOf !== 'function' || !at) return null;
  const q = nearestOnPath(pts, at.x, at.y);
  if (!q) return null;
  if (regionOf(q.x, q.y) === 'groningen') return null;
  // inward: the way along the road that still has province data a moment on
  // (the world end stands 14 m inside the data edge, so the other way leaves it)
  let inward = 0, bestScore = -1;
  for (const dir of [1, -1]) {
    const p = walkPath(pts, q, dir, 140);
    if (!p) continue;
    const inHere = typeof inData === 'function' ? !!inData(p.x, p.y) : true;
    const far = walkPath(pts, q, dir, 2200) || p;
    const score = (inHere ? 2 : 0) + (regionOf(far.x, far.y) === 'groningen' ? 1 : 0);
    if (score > bestScore) { bestScore = score; inward = dir; }
  }
  if (!inward) return null;
  let prev = q;
  for (let dist = step; dist <= max; dist += step) {
    const p = walkPath(pts, q, inward, dist);
    if (!p) return null;
    const area = regionOf(p.x, p.y);
    if (area && area !== 'friesland') {
      if (area !== 'groningen') return null;
      const out = unit(prev.x - p.x, prev.y - p.y);
      if (!out) return null;
      return { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2, ux: out.x, uy: out.y };
    }
    prev = p;
  }
  return null;
}

// The first step from Friesland back into Groningen along a straight line, for
// a road row that ends before the border: walks `step` metres from `at` along
// unit direction dir and returns { x, y, ux, uy } (the crossing and the outward
// direction from Groningen into Friesland) or null.
export function crossingAhead(at, dir, { regionOf, max = 5000, step = 4 } = {}) {
  const u = unit(dir.x, dir.y);
  if (!at || !u || typeof regionOf !== 'function') return null;
  if (regionOf(at.x, at.y) === 'groningen') return null;
  let prev = { x: at.x, y: at.y };
  for (let d = step; d <= max; d += step) {
    const p = { x: at.x + u.x * d, y: at.y + u.y * d };
    const area = regionOf(p.x, p.y);
    if (area && area !== 'friesland') {
      if (area !== 'groningen') return null;
      return { x: (prev.x + p.x) / 2, y: (prev.y + p.y) / 2, ux: -u.x, uy: -u.y };
    }
    prev = p;
  }
  return null;
}

// The spots of the place, laid out from the border crossing and the outward
// direction. side: +1/-1 picks the verge; leave it 0 to let `dry` decide (a
// verge is dry when dry(x, y) says so; the other side is tried first). a is the
// facing angle in map coordinates for a group whose local +x points that way
// (the same convention as geheimen.js/worldends.js).
export function layoutTribute({ border, ux, uy, hw = 3, side = 0, dry = null } = {}) {
  const out = unit(ux, uy);
  if (!border || !Number.isFinite(border.x) || !Number.isFinite(border.y) || !out) return null;
  const off = sideOffsets(hw);
  const nx = -out.y, ny = out.x;
  const at = (along, lat, s) => ({
    x: border.x + out.x * along + nx * lat * s,
    y: border.y + out.y * along + ny * lat * s,
  });
  const needed = (s) => [
    at(-LAYOUT.benchIn, off.bench, s),
    at(-LAYOUT.signIn, off.sign, s),
    at(LAYOUT.houseOut, off.house, s),
    at(LAYOUT.gardenBenchOut, off.gardenBench, s),
  ];
  const drySide = (s) => !dry || needed(s).every((p) => dry(p.x, p.y));
  let used = side;
  if (!used) used = drySide(1) || !dry ? 1 : drySide(-1) ? -1 : 1;
  const wet = !!dry && !drySide(used);
  const facing = Math.atan2(out.y, out.x);
  // the house faces the road (from the house back to the centre line)
  const front = Math.atan2(-ny * used, -nx * used);
  const bench = at(-LAYOUT.benchIn, off.bench, used);
  const sign = at(-LAYOUT.signIn, off.sign, used);
  const house = at(LAYOUT.houseOut, off.house, used);
  const gardenBench = at(LAYOUT.gardenBenchOut, off.gardenBench, used);
  return {
    border: { x: border.x, y: border.y }, out, side: used, hw, wet,
    bench: { ...bench, a: facing },
    sign: { ...sign, a: facing },
    house: { ...house, a: front },
    gardenBench: { ...gardenBench, a: front },
  };
}

// A point in the house's own frame (+x towards the road, +z to the side), in
// world coordinates: the garden is laid out in that frame.
export function housePoint(site, lx, lz) {
  if (!site || !site.house) return null;
  const a = site.house.a, c = Math.cos(a), s = Math.sin(a);
  return { x: site.house.x + lx * c - lz * s, y: site.house.y + lx * s + lz * c };
}

// The special map icon for the garden bench (hud_panel.js draws kind 'beppe' in
// its own style): always visible so the place can be found, and it offers the
// route as a place goal (a click on the marker) plus its Te-doen card.
export function markerOf(site) {
  if (!site || !site.gardenBench) return null;
  const x = site.gardenBench.x, y = site.gardenBench.y;
  return {
    kind: 'beppe', x, y, name: HOUSE_ARRIVAL.title, sub: TODO.sub,
    goal: { kind: 'place', name: TODO.title, sub: TODO.sub, x, y },
    todo: TODO_KEY,
  };
}

// The post-game guided-route target: the place, until the remembrance there has
// been read. postgame.js follows this once after the story, before the
// challenges; null when the player has already been there or the site is unknown.
export function farewellGuide(site, found = false) {
  if (found || !site || !site.gardenBench) return null;
  return { x: site.gardenBench.x, y: site.gardenBench.y, name: FAREWELL.guideName };
}

// The "Te doen" entry (group Ommeland) for the place: made by this pure module
// so the test can check it; beppe_garden fills in the site and the found state.
export function tributeTodo(site, found = false) {
  if (!site || !site.gardenBench) return null;
  const x = site.gardenBench.x, y = site.gardenBench.y;
  return {
    key: TODO_KEY, group: 'ommeland', icon: 'beppe', title: TODO.title,
    status: found ? 'klaar' : '', meta: TODO.meta, medal: null,
    record: found ? TODO.done : '', x, y,
    goal: { kind: 'place', name: TODO.title, sub: TODO.sub, x, y },
    detail: { kicker: TODO.kicker, text: TODO.text, rows: [] },
  };
}

// One mark per session, for the parts that are not in the player's lifetime set
// (the doves and the plain messages): state is any plain object.
export function once(state, key) {
  if (!state || typeof key !== 'string' || !key) return false;
  if (state[key]) return false;
  state[key] = true;
  return true;
}



