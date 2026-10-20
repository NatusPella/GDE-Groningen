import { pointInPolygon } from './util.js';

// Camera paths for cutscenes, free of DOM and three.js: poses use map
// coordinates (x/y on the map, z = height in metres).

export const V = (x, y, z) => ({ x, y, z });
export const W = (wx, h, wy) => ({ x: wx, y: wy, z: h });
export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOut = (t) => 1 - (1 - t) ** 3;

function cr(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  const f = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  return V(f(a.x, b.x, c.x, d.x), f(a.y, b.y, c.y, d.y), f(a.z, b.z, c.z, d.z));
}

// Smooth Catmull-Rom camera move through evenly timed keyframes {pos, look, fov?}.
export function pathShot(keys, ease = easeInOut) {
  return (u) => {
    const s = ease(clamp01(u)) * (keys.length - 1);
    const i = Math.min(keys.length - 2, Math.floor(s));
    const t = s - i;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const pose = { position: cr(k0.pos, k1.pos, k2.pos, k3.pos, t), lookAt: cr(k0.look, k1.look, k2.look, k3.look, t) };
    if (k1.fov != null && k2.fov != null) pose.fov = k1.fov + (k2.fov - k1.fov) * t;
    return pose;
  };
}

const LEVEL_H = 3.1;

export function roofAt(map, x, y) {
  let top = 0;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    top = Math.max(top, (b.h || 3) * LEVEL_H + 3.5);
  }
  return top;
}

function edgeDistance(x, y, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)));
  }
  return best;
}

// How far the building at (x, y) reaches from that point (the farthest corner of its bounds) and how high its roof
// is. A landmark orbit has to start outside this reach: the Forum is 85 m wide, so an orbit of 28 m around its
// point runs through the building (#329). Only the buildings that hold the point count; a landmark point beside its building (within `pad` m) takes the
// closest landmark building instead, not every big neighbour.
export function buildingReach(map, x, y, pad = 12) {
  let near = null, nearD = pad;
  const hold = [];
  const corners = (b) => { let r = 0; const [x0, y0, x1, y1] = b.bounds; for (const cx of [x0, x1]) for (const cy of [y0, y1]) r = Math.max(r, Math.hypot(cx - x, cy - y)); return r; };
  for (const b of map.buildingsNear(x, y, 80)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 - pad || x > x1 + pad || y < y0 - pad || y > y1 + pad) continue;
    if (pointInPolygon(x, y, b.pts)) { hold.push({ r: corners(b), t: (b.h || 3) * LEVEL_H + 3.5 }); continue; }
    // a landmark point just beside its building: the closest such building, not every big neighbour
    const d = b.landmark ? edgeDistance(x, y, b.pts) : Infinity;
    if (d <= nearD) { near = b; nearD = d; }
  }
  // of the buildings that hold the point the tall ones count: a low plinth or hall under a tower does not set the orbit
  const top = Math.max(0, ...hold.map((q) => q.t));
  const reach = Math.max(0, ...hold.filter((q) => q.t >= top * 0.6).map((q) => q.r));
  if (!hold.length && near) return { reach: corners(near), top: (near.h || 3) * LEVEL_H + 3.5 };
  return { reach, top };
}

// Lifts any keyframe that would sit inside a building up over its roof.
export function clearKeys(w, keys) {
  const lift = keys.map((k) => roofAt(w.map, k.pos.x, k.pos.y));
  for (let i = 0; i + 1 < keys.length; i++) {
    const m = roofAt(w.map, (keys[i].pos.x + keys[i + 1].pos.x) / 2, (keys[i].pos.y + keys[i + 1].pos.y) / 2);
    lift[i] = Math.max(lift[i], m);
    lift[i + 1] = Math.max(lift[i + 1], m);
  }
  keys.forEach((k, i) => { if (lift[i] && k.pos.z < lift[i] + 1.5) k.pos.z = lift[i] + 1.5; });
  return keys;
}

// A calm, low flyover through one characteristic street of the new wijk:
// a named residential street near the player (long, straight-ish, close to
// the wijk), glided along a little above the rooftops looking down the
// street, then a gentle rise and glide back to behind the player.
const WIJK_STREET_CATS = new Set(['minor', 'normal', 'major']);
const WIJK_RUN = 110; // metres of street the camera travels

function roadStraightRun(road) {
  const p = road.pts;
  let best = null, start = 0, len = 0, prevA = null;
  const close = (i) => { if (!best || len > best.len) best = { a: p[start], b: p[i], len }; };
  for (let i = 0; i < p.length - 1; i++) {
    const a = Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]);
    let turn = prevA == null ? 0 : Math.abs(a - prevA);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    if (turn > 0.3) { close(i); start = i; len = 0; }
    len += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
    prevA = a;
  }
  close(p.length - 1);
  return best;
}

function pickWijkStreet(w, wijk, R) {
  const p = w.player;
  const cx = (wijk.x + p.x) / 2, cy = (wijk.y + p.y) / 2;
  const reach = Math.max(120, Math.min(R, Math.hypot(wijk.x - p.x, wijk.y - p.y) / 2 + 90));
  let best = null;
  for (const r of w.map.roadsNear(cx, cy, reach)) {
    if (!r.name || !WIJK_STREET_CATS.has(r.cat) || r.bridge || r.z || r.pts.length < 2) continue;
    const run = roadStraightRun(r);
    if (!run || run.len < 45) continue;
    const mx = (run.a[0] + run.b[0]) / 2, my = (run.a[1] + run.b[1]) / 2;
    const dPlayer = Math.hypot(mx - p.x, my - p.y), dWijk = Math.hypot(mx - wijk.x, my - wijk.y);
    if (dPlayer > 260) continue;
    // skip streets that run under buildings (passages, poorten, data overlap):
    // the camera would look straight into a wall
    let covered = 0;
    const n = Math.ceil(run.len / 6);
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      if (roofAt(w.map, run.a[0] + (run.b[0] - run.a[0]) * f, run.a[1] + (run.b[1] - run.a[1]) * f) > 0) covered++;
    }
    if (covered > n * 0.05) continue;
    // long residential streets close to the player and inside the wijk win
    const catK = r.cat === 'major' ? 0.6 : r.cat === 'normal' ? 1.1 : 1;
    const score = Math.min(run.len, 220) * catK / (1 + dPlayer / 90) / (1 + dWijk / (R * 1.5));
    if (!best || score > best.score) best = { r, run, score };
  }
  return best;
}

// Highest roof within `side` metres of the line a-b (sampled).
function roofline(w, ax, ay, bx, by, side) {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const nx = -(by - ay) / len, ny = (bx - ax) / len;
  let top = 0;
  const n = Math.max(2, Math.ceil(len / 12));
  for (let i = 0; i <= n; i++) {
    const x = ax + (bx - ax) * (i / n), y = ay + (by - ay) * (i / n);
    for (const o of [-side, -side / 2, 0, side / 2, side]) top = Math.max(top, roofAt(w.map, x + nx * o, y + ny * o));
  }
  return top;
}

function wijkRadius(w, wijk) {
  const d = (w.map.meta.neighbourhoodPoints || [])
    .filter((q) => q !== wijk && q.name !== wijk.name)
    .map((q) => Math.hypot(q.x - wijk.x, q.y - wijk.y))
    .sort((a, b) => a - b);
  const near = d.length >= 3 ? (d[0] + d[1] + d[2]) / 3 : d[0] || 300;
  return Math.min(420, Math.max(130, near * 0.55));
}

// a: the player's heading; behind: the closing pose behind the player {pos, look}.
// clearKeys, plus every roof along each leg (not just its midpoint)
function clearPath(w, keys) {
  clearKeys(w, keys);
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i].pos, b = keys[i + 1].pos;
    const top = roofline(w, a.x, a.y, b.x, b.y, 3) + 2;
    if (a.z < top) a.z = top;
    if (b.z < top) b.z = top;
  }
  return keys;
}

export function wijkStreetShot(w, wijk, a, behind) {
  const p = w.player;
  const pick = pickWijkStreet(w, wijk, wijkRadius(w, wijk));
  if (!pick) return null;
  let [ax, ay] = pick.run.a, [bx, by] = pick.run.b;
  // travel towards the player's end of the street, so the glide home is short
  if (Math.hypot(ax - p.x, ay - p.y) < Math.hypot(bx - p.x, by - p.y)) [ax, ay, bx, by] = [bx, by, ax, ay];
  let len = Math.hypot(bx - ax, by - ay);
  const ux = (bx - ax) / len, uy = (by - ay) / len;
  if (len > WIJK_RUN) { ax = bx - ux * WIJK_RUN; ay = by - uy * WIJK_RUN; len = WIJK_RUN; }
  const nx = -uy, ny = ux;
  const roofs = roofline(w, ax, ay, bx, by, 14);
  const h = Math.min(30, Math.max(12, roofs + 3));
  const side = 2.5;
  const at = (d, off, hh) => W(ax + ux * d + nx * off, hh, ay + uy * d + ny * off);
  // look down the street, never past its straight end (round a bend is a wall)
  const ahead = (d) => { const k = Math.min(d + 34, len + 6); return W(ax + ux * k, 1.5, ay + uy * k); };
  const street = [
    { pos: at(-12, side, h + 6), look: ahead(-4), fov: 56 },
    { pos: at(len * 0.35, side * 0.6, h + 2), look: ahead(len * 0.35), fov: 56 },
    { pos: at(len * 0.72, 0, h), look: ahead(len * 0.72), fov: 56 },
    { pos: at(len, -side * 0.5, h), look: ahead(len), fov: 56 },
  ];
  // the rise over the rooftops and down behind the player
  const bxP = p.x - Math.cos(a) * 16, byP = p.y - Math.sin(a) * 16;
  const over = Math.max(h + 4, roofline(w, bx, by, bxP, byP, 6) + 6);
  const b = behind;
  const home = [
    { pos: { ...street[3].pos }, look: { ...street[3].look }, fov: 56 },
    { pos: W((bx + bxP) / 2, over, (by + byP) / 2), look: W(p.x, 2, p.y), fov: 56 },
    { pos: W(bxP, Math.max(9, roofline(w, bxP, byP, p.x, p.y, 4) + 3), byP), look: W(p.x, 1.4, p.y), fov: 58 },
    { pos: b.pos, look: b.look, fov: 60 },
  ];
  const streetShot = pathShot(clearPath(w, street), (t) => t);
  const homeShot = pathShot(clearPath(w, home), (t) => 1 - (1 - t) ** 2);
  const SPLIT = 0.66;
  // ease into the street glide, keep a steady drift, blend into the rise
  const ease = (t) => (t < 0.2 ? (t * t) / 0.4 : 0.1 + (t - 0.2) * 1.125);
  return (u) => (u < SPLIT ? streetShot(ease(u / SPLIT)) : homeShot((u - SPLIT) / (1 - SPLIT)));
}
