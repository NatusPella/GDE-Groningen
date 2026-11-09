// Wandeling Winsum (minigames batch 3, Pieterpad/Winsum): the rules of a walk
// along stamp posts (pure, no DOM, no THREE; node-tested in
// scripts/minigames3_test.mjs). The walk follows the Pieterpad at Winsum: five
// stamp posts in a fixed order, each collected by walking within STAMP_R of it.
// Walking is the point: running is allowed but medals go by the average pace
// (a stroll is bronze, a brisk walk silver, a sprint gold), plus a bonus for
// every extra stop (a bench with a view). The coordinates are approximate
// and meant to be checked against the map before the route goes in the game.
import { geo, medalFrom } from './minigamekit.js';
import { scaleTarget } from './difficulty.js'; // #800

export const STAMP_R = 22;
export const MAX_STEP = 40; // a jump longer than this in one frame (a teleport or a ride) does not count as walking
export const WALK_VMAX = 8;

export const STAMPS = [
  { id: 'station', name: 'Station Winsum', lat: 53.33455, lon: 6.51385 },
  { id: 'molen', name: 'De molen', lat: 53.33672, lon: 6.52241 },
  { id: 'dijk', name: 'Op de dijk', lat: 53.34012, lon: 6.52905 },
  { id: 'bankje', name: 'Bankje met uitzicht', lat: 53.34331, lon: 6.52172 },
  { id: 'terug', name: 'Terug bij de brug', lat: 53.33624, lon: 6.51484 },
];
export const PACE_MEDAL_AT = [1.6, 2.6, 3.6]; // m/s average
// #800: de stand schaalt de pacelimieten; Standaard geeft exact de oude waarden.
export const scaledPaceAt = (mode = 'standaard') => PACE_MEDAL_AT.map((v) => Math.round(scaleTarget(v, mode, false) * 10) / 10);

export function routePoints() {
  return STAMPS.map((s) => ({ ...s, ...geo(s.lat, s.lon) }));
}

export function routeLength(pts = routePoints()) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

export function createWalk(pts = routePoints()) {
  return { pts, next: 0, stamps: [], t: 0, dist: 0, last: null, phase: 'walk', cheat: 0 };
}

// pos: { x, y }; returns events
export function stepWalk(st, pos, dt) {
  const ev = [];
  if (st.phase !== 'walk') return ev;
  st.t += dt;
  if (st.last) {
    const d = Math.hypot(pos.x - st.last.x, pos.y - st.last.y);
    if (d > MAX_STEP || d / Math.max(dt, 1e-6) > WALK_VMAX * 4) st.cheat++;
    else st.dist += d;
  }
  st.last = { x: pos.x, y: pos.y };
  const target = st.pts[st.next];
  if (target && Math.hypot(pos.x - target.x, pos.y - target.y) <= STAMP_R) {
    st.stamps.push({ id: target.id, t: st.t });
    ev.push({ type: 'stamp', id: target.id, name: target.name, n: st.stamps.length, of: st.pts.length });
    st.next++;
    if (st.next >= st.pts.length) { st.phase = 'done'; ev.push({ type: 'done' }); }
  }
  return ev;
}

export const averagePace = (st) => (st.t > 0 ? st.dist / st.t : 0);
// a pace is only worth a medal when most of the route was actually walked
export function walkMedal(st, length = routeLength(st.pts), mode = 'standaard') {
  if (st.phase !== 'done' || st.dist < length * 0.8) return 0;
  return medalFrom(averagePace(st), scaledPaceAt(mode));
}

// which stamp to head for, and how far (for the HUD arrow)
export function nextTarget(st, pos) {
  const t = st.pts[st.next];
  if (!t) return null;
  return { id: t.id, name: t.name, dist: Math.hypot(t.x - pos.x, t.y - pos.y), bearing: Math.atan2(t.y - pos.y, t.x - pos.x) };
}


