// Street furniture from OSM and from rules (docs/PROVINCIE-PLAN.md 2.14), one
// tile at a time and deterministic: the same tile data gives the same items
// in every build and every worker. Pure data and geometry (no scene): the
// world builder calls furnitureForTile with a tile's data; the game draws the
// items (streetfurniture3d.js) and registers their colliders.
//
//   furnitureForTile({ x0, y0, size, roads, mapped, places, opts })
//     -> { items: [{ k, x, y, a, s, h, v, text, src, key }], colliders: [...] }
//
// k: guardrail (a section of s m along a), gantry (over a carriageway of s
// m, signs in `text`), hectometer (a verge post, its number in `text`),
// hedge (a section of s m, h high; greenery.mjs puts the mapped ones in),
// lamp (by road class: v the lamp type, h its height), speedbump (across a
// road of s m), fence and noise (a section of s m, noise h m high), bollard,
// bench, bin, bikerack, shelter, placesign (a place name board, `text` the
// name) and wegwijzer (a junction signpost, `text` its lines). src: 'osm' for mapped objects, 'rule' for
// the builder's. An item belongs to the tile its position falls in, so
// neighbouring tiles never repeat one; rules walk whole roads, so a guardrail
// carries on across a tile edge without a seam.
import { wgsToWorld } from './rdnew.js';
import { pointInPolygon, polygonBounds, nearestOnRoadList } from './util.js';
import { waterPolyIn } from './waterlevels.js';
import { hash2 as hash } from './rng.js';
import { placeSignItems } from './placesigns.js';
import { segDist, buildingAt } from './tileplace.js';
import { hedgeLines } from './tilegreenery.js';

const MAIN = new Set(['motorway', 'trunk']);
const LINK = new Set(['motorway_link', 'trunk_link']);
// the classes a car drives on: a pavement or a cycle path may hold a post, the
// asphalt may not (#463)
const CAR = new Set(['major', 'normal', 'minor']);

// Street lamps by road class: type (mast: a high mast on the central
// reserve, arm: a pole with an arm over the road, lantern: the urban lantern
// of residential streets, path: a low pole), height and spacing (m).
export const LAMP_RULES = {
  motorway: { v: 'mast', h: 12, spacing: 50 },
  trunk: { v: 'arm', h: 10, spacing: 40 },
  primary: { v: 'arm', h: 8, spacing: 34 },
  secondary: { v: 'arm', h: 7, spacing: 32 },
  tertiary: { v: 'arm', h: 6, spacing: 30 },
  motorway_link: { v: 'arm', h: 10, spacing: 40 },
  trunk_link: { v: 'arm', h: 8, spacing: 36 },
  unclassified: { v: 'arm', h: 6, spacing: 30 },
  residential: { v: 'lantern', h: 5.6, spacing: 28 },
  living_street: { v: 'lantern', h: 4.5, spacing: 24 },
  service: { v: 'lantern', h: 5.6, spacing: 32 },
  pedestrian: { v: 'lantern', h: 4.5, spacing: 24 },
  cycleway: { v: 'path', h: 4.5, spacing: 30 },
  footway: { v: 'path', h: 4.5, spacing: 30 },
  path: { v: 'path', h: 4.5, spacing: 30 },
};
export function lampRule(r) {
  return LAMP_RULES[r.type] || (r.cat === 'foot' || r.cat === 'cycle' ? LAMP_RULES.cycleway : r.cat === 'major' ? LAMP_RULES.secondary : LAMP_RULES.residential);
}

// Places a gantry can sign to, by bearing from where it stands (real towns
// round the city; no operators, no brands)
export const DESTINATIONS = [
  ['Drachten', 53.105, 6.099], ['Leeuwarden', 53.201, 5.799], ['Zuidhorn', 53.246, 6.405], ['Leek', 53.162, 6.378],
  ['Assen', 52.993, 6.562], ['Haren', 53.171, 6.605], ['Zuidlaren', 53.094, 6.682], ['Hoogezand', 53.162, 6.762],
  ['Winschoten', 53.144, 7.034], ['Delfzijl', 53.330, 6.919], ['Appingedam', 53.321, 6.858], ['Eemshaven', 53.441, 6.834],
  ['Bedum', 53.301, 6.603], ['Winsum', 53.330, 6.518],
].map(([n, lat, lon]) => { const [x, y] = wgsToWorld(lat, lon); return { n, x, y }; });

// Rule distances (m)
export const RULES = {
  // (above guardrailMaxZ the profile's crash barriers take over, below
  // guardrailMinZ a cutting's retaining walls, elevation.js)
  guardrailPiece: 4, guardrailOffset: 0.7, guardrailGap: 18, guardrailMaxZ: 1.2, guardrailMinZ: -0.9,
  hectometer: 100, hectometerOffset: 1.8,
  gantryBefore: 140, gantryClear: 6.4,
  livingBump: 70,
};

// --------------------------------------------------------------- helpers

export const itemKey = (k, x, y) => `${k}@${Math.round(x * 10)},${Math.round(y * 10)}`;
const nodeKey = (p) => Math.round(p[0] * 100) * 1e7 + Math.round(p[1] * 100);
const len = (P) => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; };

// Walks road r every `step` m from `start`, calling fn(x, y, ux, uy, i, t, s)
// for the point at arc length s on segment i.
function walk(P, step, start, fn) {
  let s0 = 0, next = start;
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], L = Math.hypot(P[i + 1][0] - ax, P[i + 1][1] - ay);
    if (L < 1e-6) continue;
    const ux = (P[i + 1][0] - ax) / L, uy = (P[i + 1][1] - ay) / L;
    while (next <= s0 + L) {
      const t = (next - s0) / L;
      fn(ax + ux * (next - s0), ay + uy * (next - s0), ux, uy, i, t, next);
      next += step;
    }
    s0 += L;
  }
}

// The road profile's height at segment i, t (0 off a profile)
const zAt = (r, i, t) => (r.z ? r.z[i] + (r.z[i + 1] - r.z[i]) * t : 0);

// The nodes shared by car roads: node key -> [road, ...]
function sharedNodes(roads) {
  const m = new Map();
  for (const r of roads) {
    if (!CAR.has(r.cat)) continue;
    for (const p of [r.pts[0], r.pts[r.pts.length - 1], ...r.pts]) {
      const k = nodeKey(p);
      const l = m.get(k) || m.set(k, []).get(k);
      if (!l.includes(r)) l.push(r);
    }
  }
  return m;
}

// Where a carriageway is joined by something other than its own carrying-on
// (a slip road leaving or joining, a side road): positions to keep the
// guardrail open around.
function joinsOf(r, shared) {
  const out = [];
  for (const p of r.pts) {
    const list = shared.get(nodeKey(p));
    if (!list || list.length < 2) continue;
    const other = list.filter((q) => q !== r);
    const carryOn = other.length === 1 && other[0].type === r.type && (other[0].ref || '') === (r.ref || '') && (nodeKey(other[0].pts[0]) === nodeKey(p) || nodeKey(other[0].pts[other[0].pts.length - 1]) === nodeKey(p));
    if (!carryOn) out.push(p);
  }
  return out;
}

// the principal direction of the roads with one ref (for hectometre numbers)
function refAxes(roads) {
  const acc = new Map();
  for (const r of roads) {
    if (!r.ref || !(MAIN.has(r.type))) continue;
    const a = acc.get(r.ref) || acc.set(r.ref, { sx: 0, sy: 0, n: 0, xx: 0, xy: 0, yy: 0 }).get(r.ref);
    for (const p of r.pts) { a.sx += p[0]; a.sy += p[1]; a.n++; }
  }
  for (const r of roads) {
    const a = r.ref && acc.get(r.ref);
    if (!a || !MAIN.has(r.type)) continue;
    const mx = a.sx / a.n, my = a.sy / a.n;
    for (const p of r.pts) { const dx = p[0] - mx, dy = p[1] - my; a.xx += dx * dx; a.xy += dx * dy; a.yy += dy * dy; }
  }
  const out = new Map();
  for (const [ref, a] of acc) {
    const th = 0.5 * Math.atan2(2 * a.xy, a.xx - a.yy);
    let ux = Math.cos(th), uy = Math.sin(th);
    // numbers grow away from the city centre's south-west (a fixed rule)
    if (ux + uy < 0) { ux = -ux; uy = -uy; }
    // a ref's own base so two roads do not share numbers
    let base = 0;
    for (let i = 0; i < ref.length; i++) base = (base * 31 + ref.charCodeAt(i)) % 600;
    out.set(ref, { ux, uy, base: 20 + base / 10 });
  }
  return out;
}

function destinationFor(x, y, ux, uy, places) {
  let best = null, bs = -Infinity;
  for (const p of places) {
    const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy);
    if (d < 4000 || (p.max && d > p.max)) continue;
    const c = (dx * ux + dy * uy) / d;
    // places from the province data carry their own reach (scale) and weight (w)
    const score = c - d / (p.scale || 120000) + (p.w || 0);
    if (score > bs) { bs = score; best = p; }
  }
  return best ? best.n : 'Centrum';
}

// polyline P offset by `off` m to the right of travel (y points south, so
// the right of (ux, uy) is (-uy, ux)); mitred, the mitre held to 2x
function offsetLine(P, off) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let nx = 0, ny = 0;
    for (const [p, q] of [[P[Math.max(0, i - 1)], P[i]], [P[i], P[Math.min(P.length - 1, i + 1)]]]) {
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
      if (l > 1e-6) { nx += -dy / l; ny += dx / l; }
    }
    const l = Math.hypot(nx, ny);
    if (l < 1e-6) { const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1; nx = -dy / m; ny = dx / m; } else { nx /= l; ny /= l; }
    // mitre: 1 / cos(half the turn), at most 2
    let k = 1;
    if (i > 0 && i < P.length - 1) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], m = Math.hypot(dx, dy) || 1;
      k = Math.min(2, 1 / Math.max(0.5, -nx * dy / m + ny * dx / m));
    }
    out.push([P[i][0] + nx * off * k, P[i][1] + ny * off * k]);
  }
  return out;
}

// drops the points of a densely sampled line that lie on a straight run
// (Douglas-Peucker, 3 cm)
function straighten(P, tol = 0.03) {
  const keep = new Uint8Array(P.length);
  keep[0] = keep[P.length - 1] = 1;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = P[a][0], ay = P[a][1], dx = P[b][0] - ax, dy = P[b][1] - ay, l = Math.hypot(dx, dy) || 1e-9;
    let worst = -1, wd = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((P[i][0] - ax) * dy - (P[i][1] - ay) * dx) / l;
      if (d > wd) { wd = d; worst = i; }
    }
    if (worst > 0) { keep[worst] = 1; stack.push([a, worst], [worst, b]); }
  }
  return P.filter((_, i) => keep[i]);
}

// a polyline cut into straight pieces of at most `piece` m: [x, y, angle, length]
function pieces(P, piece) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], L = Math.hypot(P[i + 1][0] - ax, P[i + 1][1] - ay);
    if (L < 0.2) continue;
    const n = Math.max(1, Math.round(L / piece)), a = Math.atan2(P[i + 1][1] - ay, P[i + 1][0] - ax);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const z = P[i].length > 2 ? Math.round((P[i][2] + (P[i + 1][2] - P[i][2]) * t) * 100) / 100 : undefined;
      out.push([ax + (P[i + 1][0] - ax) * t, ay + (P[i + 1][1] - ay) * t, a, L / n, z]);
    }
  }
  return out;
}

// nearest road to (x, y): { r, ux, uy, d }
function nearestRoad(roads, x, y, filter = () => true) {
  const q = nearestOnRoadList(roads, x, y, filter);
  return q && { r: q.road, ux: q.ux, uy: q.uy, d: q.d, i: q.i, t: q.t };
}

// a polyline passing within d m of (x, y)
function segNear(P, x, y, d) {
  for (let i = 0; i < P.length - 1; i++) {
    if (segDist(x, y, P[i], P[i + 1])[0] < d) return true;
  }
  return false;
}

// Metres from (x, y) to the nearest house of the list (0 inside it), up to
// `reach`: a post keeps its distance from a wall and from the awning over the
// pavement (#463).
function houseGap(buildings, x, y, reach) {
  let best = Infinity;
  for (const b of buildings) {
    const q = b.bounds || (b.bounds = polygonBounds(b.pts));
    if (x < q[0] - reach || x > q[2] + reach || y < q[1] - reach || y > q[3] + reach) continue;
    if (pointInPolygon(x, y, b.pts)) return 0;
    for (let i = 0; i < b.pts.length - 1; i++) best = Math.min(best, segDist(x, y, b.pts[i], b.pts[i + 1])[0]);
  }
  return best;
}

// A lamp post keeps this far from a facade: a shop's awning hangs about a
// metre and a quarter over the pavement (#463)
export const LAMP_AWNING = 1.4;

// Where a lamp post stands on `side` of the point (x, y) along (ux, uy): on the
// verge, or at the kerb when the verge is against a facade or under an awning.
// ok(px, py) says whether a post may stand there; null when neither fits.
export function lampSpot(x, y, ux, uy, side, road, path, ok) {
  const hw = (road.width || (path ? 3 : 6)) / 2;
  for (const off of path ? [hw + 0.5] : [hw + 0.9, hw + 0.45]) {
    const px = x - uy * side * off, py = y + ux * side * off;
    if (ok(px, py)) return { x: px, y: py };
  }
  return null;
}

// A spot for street furniture over a streamed map (#463): off every
// carriageway (roadsNear), out of the houses by `house` m (buildingAt) and out
// of the water (waterNear). The same answer in the city and the province, so a
// post or a bench never stands in the asphalt or in a shopfront.
export function spotFreeOnMap(map, x, y, { house = 0.35, road = 0.25 } = {}) {
  if (!map) return true;
  if (buildingAt(map, x, y, house)) return false;
  if (map.waterNear && waterPolyIn(map.waterNear(x, y, 6), x, y)) return false;
  for (const r of map.roadsNear ? map.roadsNear(x, y, 8) : []) {
    if (r.cat === 'foot' || r.cat === 'cycle' || !r.pts || r.pts.length < 2) continue;
    if (segNear(r.pts, x, y, (r.width || 5) / 2 + road)) return false;
  }
  return true;
}

// --------------------------------------------------------------- the tile

// opts: towns (province places [{ n, x, y, kind }]: place name boards and
// junction signposts, placesigns.js),
// lamps (emit lamps; the game draws its own, nightlights3d.js),
// bollards (cycle path entrances), livingBumps (plateaus in woonerven)
export function furnitureForTile({ x0, y0, size = 1000, roads = [], mapped = [], water = [], rails = [], buildings = [], places = DESTINATIONS, opts = {} }) {
  const items = [];
  const inTile = (x, y) => x >= x0 && x < x0 + size && y >= y0 && y < y0 + size;
  const add = (it) => { if (inTile(it.x, it.y)) { it.key = itemKey(it.k, it.x, it.y); items.push(it); } };
  const shared = sharedNodes(roads);
  const axes = refAxes(roads);
  // carriageways and cycle paths by cell: nothing a rule puts down may stand on another way
  const RG = 24, rgrid = new Map();
  for (const r of roads) {
    if (r.cat === 'foot' || !r.pts) continue;
    const P = r.pts, h = r.width / 2 + 0.3;
    for (let i = 0; i < P.length - 1; i++) {
      for (let gx = Math.floor((Math.min(P[i][0], P[i + 1][0]) - h) / RG); gx <= Math.floor((Math.max(P[i][0], P[i + 1][0]) + h) / RG); gx++)
        for (let gy = Math.floor((Math.min(P[i][1], P[i + 1][1]) - h) / RG); gy <= Math.floor((Math.max(P[i][1], P[i + 1][1]) + h) / RG); gy++)
          (rgrid.get(gx * 65536 + gy) || rgrid.set(gx * 65536 + gy, []).get(gx * 65536 + gy)).push(r, i);
    }
  }
  // cats: only the ways of these classes count (a pavement holds a post, the asphalt does not, #463)
  const onOtherRoad = (own, x, y, cats = null) => {
    const c = rgrid.get(Math.floor(x / RG) * 65536 + Math.floor(y / RG));
    if (!c) return false;
    for (let k = 0; k < c.length; k += 2) {
      const r = c[k], i = c[k + 1];
      if (cats && !cats.has(r.cat)) continue;
      const P = r.pts, dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      if (Math.abs(zAt(r, i, t)) > 3) continue;
      // (its own carriageway where a tight bend folds the offset line back onto it)
      if (Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y) < r.width / 2 + (r === own ? -0.05 : 0.3)) return true;
    }
    return false;
  };

  // water polygons (with .bounds or not) holding a point
  const wet = (x, y) => !!waterPolyIn(water, x, y);
  // the track (its ballast is 4.2 m wide), a footway's own width and a house: a fence or hedge is not drawn through them (#124)
  const onRail = (x, y) => rails.some((r) => r.pts && segNear(r.pts, x, y, 2.1 + 0.4));
  const onFoot = (x, y) => roads.some((r) => r.cat === 'foot' && r.pts && !r.bridge && segNear(r.pts, x, y, Math.max(0.6, (r.width || 1.5) / 2)));
  const inHouse = (x, y) => buildings.some((b) => { const q = b.bounds || (b.bounds = polygonBounds(b.pts)); return x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3] && pointInPolygon(x, y, b.pts); });
  // a piece of s m at (x, y) along a: its middle or either end on a carriageway, a track, a footway, in a house or in water
  const pieceOnWayOrWater = (x, y, a, s) => {
    const hx = Math.cos(a) * s / 2, hy = Math.sin(a) * s / 2;
    for (const [px, py] of [[x, y], [x - hx, y - hy], [x + hx, y + hy]]) if (onOtherRoad(null, px, py) || wet(px, py) || onRail(px, py) || onFoot(px, py) || inHouse(px, py)) return true;
    return false;
  };
  // a post, a bench or a bin stands off the carriageways, out of the houses and
  // out of the water (#463): what OSM draws on the asphalt or in a shopfront is
  // a gap in the data, not something to put there
  const freeSpot = (x, y, reach = 0.35) => !onOtherRoad(null, x, y, CAR) && !wet(x, y) && !onRail(x, y) && houseGap(buildings, x, y, reach) > reach;

  // mapped objects (OSM)
  for (const m of mapped) {
    if (m.pts && m.pts.length > 1) {
      const k = m.k === 'guard_rail' ? 'guardrail' : m.k === 'noise_barrier' ? 'noise' : m.k === 'wall' ? 'noise' : m.k;
      if (!['guardrail', 'fence', 'noise', 'hedge'].includes(k)) continue;
      // een heg die een weg kruist is in stukken geknipt (tilegreenery.js, #508): alle stukken worden getekend
      for (const line of k === 'hedge' ? hedgeLines(m) : [m.pts]) for (const [x, y, a, s] of pieces(line, k === 'guardrail' ? RULES.guardrailPiece : 3)) {
        // a mapped fence or hedge that OSM draws over a carriageway or into water is a gap in the data, not a barrier to put there (issue #124)
        if ((k === 'fence' || k === 'hedge') && pieceOnWayOrWater(x, y, a, s)) continue;
        add({ k, x, y, a, s, h: k === 'noise' ? (m.h || 4) : k === 'hedge' ? (m.h || 1.4) : undefined, src: 'osm' });
      }
      continue;
    }
    const x = m.x ?? (m.pts && m.pts[0][0]), y = m.y ?? (m.pts && m.pts[0][1]);
    if (!Number.isFinite(x)) continue;
    const near = nearestRoad(roads, x, y, (r) => r.cat !== 'foot' || m.k !== 'speedbump');
    const a = near ? Math.atan2(near.uy, near.ux) : 0;
    if (m.k === 'speedbump') {
      if (!near || near.d > near.r.width / 2 + 1 || !CAR.has(near.r.cat)) continue;
      add({ k: 'speedbump', x, y, a, s: near.r.width, v: m.v || 'table', src: 'osm' });
    } else if (['bench', 'bin', 'bikerack', 'shelter', 'bollard', 'lamp'].includes(m.k)) {
      // (a post or a bench that OSM puts in the asphalt or against a facade is
      // left out, #463)
      if (!freeSpot(x, y, m.k === 'lamp' ? LAMP_AWNING : 0.35)) continue;
      add({ k: m.k, x, y, a, src: 'osm', ...(m.k === 'lamp' ? { v: near ? lampRule(near.r).v : 'lantern', h: near ? lampRule(near.r).h : 5.6 } : null) });
    }
  }

  for (const r of roads) {
    const P = r.pts;
    if (!P || P.length < 2) continue;
    const L = len(P);
    // guardrails: motorway and trunk carriageways and their slip roads at
    // street level (the raised and sunken ones have the profile's barriers,
    // elevation.js), right verge, and the central reserve of a one-way
    // carriageway of a dual road; open where something joins
    if ((MAIN.has(r.type) || LINK.has(r.type)) && !r.bridge && !r.tunnel) {
      const joins = joinsOf(r, shared);
      const sides = r.oneway ? (MAIN.has(r.type) ? [1, -1] : [1]) : [1, -1];
      for (const side of sides) {
        // along the offset line, in runs where a rail may stand: at street
        // level, clear of joins and of other carriageways
        const O = offsetLine(P, side * (r.width / 2 + RULES.guardrailOffset));
        let run = [];
        const g = roads.indexOf(r) * 2 + (side > 0 ? 0 : 1);
        const flush = () => {
          if (run.length > 1) for (const [x, y, a, sl, z] of pieces(straighten(run), RULES.guardrailPiece)) add({ k: 'guardrail', x, y, z, a, s: sl, g, src: 'rule' });
          run = [];
        };
        for (let i = 0; i < O.length - 1; i++) {
          const n = Math.max(1, Math.ceil(Math.hypot(O[i + 1][0] - O[i][0], O[i + 1][1] - O[i][1]) / 1));
          for (let k = 0; k <= n; k++) {
            if (k === 0 && i > 0) continue;
            const t = k / n, x = O[i][0] + (O[i + 1][0] - O[i][0]) * t, y = O[i][1] + (O[i + 1][1] - O[i][1]) * t;
            const cx = P[i][0] + (P[i + 1][0] - P[i][0]) * t, cy = P[i][1] + (P[i + 1][1] - P[i][1]) * t;
            const z = zAt(r, i, t);
            const ok = z <= RULES.guardrailMaxZ && z >= RULES.guardrailMinZ && !joins.some((p) => Math.hypot(p[0] - cx, p[1] - cy) < RULES.guardrailGap) && !onOtherRoad(r, x, y);
            if (ok) run.push([x, y, z]); else flush();
          }
        }
        flush();
      }
    }
    // hectometre posts on the right verge of motorways and trunk roads with a ref
    if (MAIN.has(r.type) && r.ref && axes.has(r.ref)) {
      const ax = axes.get(r.ref);
      walk(P, 5, 0, (x, y, ux, uy, i, t) => {
        if (Math.abs(zAt(r, i, t)) > 0.3) return;
        const hm = (x * ax.ux + y * ax.uy) / 100;
        if (Math.abs(hm - Math.round(hm)) > 0.025) return;
        const off = r.width / 2 + RULES.hectometerOffset;
        const nx = -uy, ny = ux; // right of travel (y south)
        if (onOtherRoad(r, x + nx * off, y + ny * off)) return;
        add({ k: 'hectometer', x: x + nx * off, y: y + ny * off, a: Math.atan2(uy, ux), text: (ax.base + Math.round(hm) / 10).toFixed(1).replace('.', ','), src: 'rule' });
      });
    }
    // gantries: where a slip road leaves a motorway or trunk carriageway, a
    // portal over the carriageway before the split, signing the exit and the
    // way on
    if (LINK.has(r.type) && r.oneway) {
      const k0 = nodeKey(P[0]);
      // the main carriageway running into the split (it may end there: OSM splits ways at junctions)
      const main = (shared.get(k0) || []).find((q) => q !== r && MAIN.has(q.type) && q.oneway && nodeKey(q.pts[0]) !== k0);
      if (main) {
        // the split's arc length on the main road, then back along it
        let s = 0, at = -1;
        for (let i = 0; i < main.pts.length; i++) { if (i) s += Math.hypot(main.pts[i][0] - main.pts[i - 1][0], main.pts[i][1] - main.pts[i - 1][1]); if (nodeKey(main.pts[i]) === k0) { at = s; break; } }
        const back = Math.max(at - RULES.gantryBefore, Math.min(at - 40, 10));
        if (at >= 40) {
          walk(main.pts, 1e9, back, (x, y, ux, uy, i, t) => {
            if (Math.abs(zAt(main, i, t)) > 0.3) return;
            const exitDir = [P[P.length - 1][0] - P[0][0], P[P.length - 1][1] - P[0][1]];
            const el = Math.hypot(exitDir[0], exitDir[1]) || 1;
            const exitTo = destinationFor(x, y, exitDir[0] / el, exitDir[1] / el, places);
            const onTo = destinationFor(x, y, ux, uy, places);
            const ref = main.ref ? main.ref.split(';')[0] : '';
            add({
              k: 'gantry', x, y, a: Math.atan2(uy, ux), s: main.width + 3, h: RULES.gantryClear,
              text: [`${ref ? ref + ' ' : ''}${onTo}`, `${r.ref ? r.ref.split(';')[0] + ' ' : ''}${exitTo === onTo ? 'Centrum' : exitTo}`], src: 'rule',
            });
          });
        }
      }
    }
    // plateaus in woonerven (living streets)
    if (opts.livingBumps && r.type === 'living_street' && L > RULES.livingBump) {
      walk(P, RULES.livingBump, RULES.livingBump / 2, (x, y, ux, uy) => add({ k: 'speedbump', x, y, a: Math.atan2(uy, ux), s: r.width, v: 'table', src: 'rule' }));
    }
    // street lamps by road class (the game draws its own: nightlights3d.js);
    // a post stands at the verge, or at the kerb when the verge is against a
    // facade or under an awning, and never in the asphalt (#463)
    if (opts.lamps && (CAR.has(r.cat) || r.cat === 'cycle' || r.cat === 'foot')) {
      const rule = lampRule(r);
      const path = r.cat === 'cycle' || r.cat === 'foot';
      const h0 = hash(P[0][0], P[0][1]);
      const side = rule.v === 'mast' ? 0 : h0 < 0.5 ? 1 : -1;
      const clear = (px, py) => !wet(px, py) && !onRail(px, py) && houseGap(buildings, px, py, LAMP_AWNING) > LAMP_AWNING;
      // (a mast stands on the central reserve, its own carriageway is no obstacle)
      const ok = side ? (px, py) => clear(px, py) && !onOtherRoad(r, px, py, CAR) : clear;
      walk(P, rule.spacing, 4 + h0 * rule.spacing * 0.6, (x, y, ux, uy, i, t) => {
        if (!side) {
          if (!ok(x, y)) return;
          add({ k: 'lamp', x, y, a: Math.atan2(uy, ux), v: rule.v, h: rule.h, z: zAt(r, i, t), src: 'rule' });
          return;
        }
        const spot = lampSpot(x, y, ux, uy, side, r, path, ok);
        if (!spot) return;
        add({ k: 'lamp', x: spot.x, y: spot.y, a: Math.atan2(uy, ux) + (side < 0 ? Math.PI : 0), v: rule.v, h: rule.h, z: zAt(r, i, t), src: 'rule' });
      });
    }
    // bollards where a cycle or foot path leaves a car road (on the path, never
    // in the asphalt of the road it leaves, #463)
    if (opts.bollards && (r.cat === 'cycle' || r.cat === 'foot') && L > 6) {
      for (const [end, nxt] of [[0, 1], [P.length - 1, P.length - 2]]) {
        const list = shared.get(nodeKey(P[end]));
        if (!list || !list.some((q) => CAR.has(q.cat))) continue;
        const dx = P[nxt][0] - P[end][0], dy = P[nxt][1] - P[end][1], l = Math.hypot(dx, dy) || 1;
        if (l < 2.5) continue;
        const bx = P[end][0] + dx / l * 2, by = P[end][1] + dy / l * 2;
        if (!freeSpot(bx, by, 0.6)) continue;
        add({ k: 'bollard', x: bx, y: by, a: Math.atan2(dy, dx), src: 'rule' });
      }
    }
  }
  // place name boards and junction signposts (only with the province's places)
  if (opts.towns && opts.towns.length) {
    const blocked = (r, x, y) => onOtherRoad(r, x, y, CAR) || wet(x, y) || inHouse(x, y);
    for (const it of placeSignItems({ roads, towns: opts.towns, inTile, blocked })) add(it);
  }
  items.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  // a narrow central reserve gets one rail, not one from each carriageway;
  // one item per key
  const kept = [], seenKey = new Set(), DG = new Map();
  for (const it of items) {
    if (seenKey.has(it.key)) continue;
    if (it.k === 'guardrail') {
      const gk = `${Math.floor(it.x / 4)},${Math.floor(it.y / 4)}`;
      let dup = false;
      for (let gx = -1; gx <= 1 && !dup; gx++) for (let gy = -1; gy <= 1 && !dup; gy++) {
        for (const o of DG.get(`${Math.floor(it.x / 4) + gx},${Math.floor(it.y / 4) + gy}`) || []) {
          if (o.g !== it.g && Math.hypot(o.x - it.x, o.y - it.y) < 1.2 && Math.abs(Math.sin(o.a - it.a)) < 0.3) { dup = true; break; }
        }
      }
      if (dup) continue;
      (DG.get(gk) || DG.set(gk, []).get(gk)).push(it);
    }
    seenKey.add(it.key);
    kept.push(it);
  }
  return { items: kept, colliders: furnitureColliders(kept) };
}

// Colliders for what you can hit, as breakables.js props: kind (its prop
// kind), x, y, r, half, angle; `static` ones never break.
export function furnitureColliders(items) {
  const out = [];
  for (const it of items) {
    switch (it.k) {
      case 'guardrail': out.push({ kind: 'vangrail', x: it.x, y: it.y, r: 0.14, half: it.s / 2, angle: it.a, key: it.key }); break;
      case 'fence': out.push({ kind: 'hek', x: it.x, y: it.y, r: 0.08, half: it.s / 2, angle: it.a, key: it.key }); break;
      case 'hedge': out.push({ kind: 'heg', x: it.x, y: it.y, r: 0.4, half: it.s / 2, angle: it.a, key: it.key, static: true, top: it.h }); break;
      case 'noise': out.push({ kind: 'wall', x: it.x, y: it.y, r: 0.15, half: it.s / 2, angle: it.a, key: it.key, static: true, top: it.h }); break;
      case 'gantry': {
        const nx = Math.sin(it.a), ny = -Math.cos(it.a);
        for (const s of [1, -1]) out.push({ kind: 'mast', x: it.x + nx * s * it.s / 2, y: it.y + ny * s * it.s / 2, r: 0.32, key: `${it.key}/${s}`, static: true, top: it.h + 2 });
        break;
      }
      case 'placesign': case 'wegwijzer': out.push({ kind: 'paal', x: it.x, y: it.y, r: 0.1, key: it.key, static: true, top: 2.2 }); break;
      case 'bench': out.push({ kind: 'bench', x: it.x, y: it.y, r: 0.32, half: 0.7, angle: it.a, key: it.key }); break;
      case 'bin': out.push({ kind: 'bin', x: it.x, y: it.y, r: 0.3, key: it.key }); break;
      case 'bikerack': out.push({ kind: 'rail', x: it.x, y: it.y, r: 0.14, half: 1, angle: it.a, key: it.key }); break;
      case 'bollard': out.push({ kind: 'paal', x: it.x, y: it.y, r: 0.12, key: it.key, static: true, top: 1 }); break;
      case 'lamp': out.push({ kind: 'lamp', x: it.x, y: it.y, r: 0.17, key: it.key }); break;
      case 'shelter': out.push({ kind: 'abri', x: it.x, y: it.y, r: 0.2, half: 1.6, angle: it.a, key: it.key, static: true, top: 2.5 }); break;
      default: break;
    }
  }
  return out;
}

// The mapped furniture of an OSM extract ({ elements } of Overpass/osmium JSON)
// as rows for the tiles: { k, pts } (one point for a node; world frame, cm),
// plus v (speed bump kind) and h (a noise barrier's height)
// opts.hedges: a mapped barrier=hedge becomes a row too (the province's tiles: houtwallen and field hedges; the city draws its own
// hedges from the greenery build and leaves them out, so a hedge is not drawn twice, #124)
export function mappedFromOsm(elements, { hedges = false } = {}) {
  const out = [];
  const P = (lat, lon) => wgsToWorld(lat, lon).map((v) => Math.round(v * 100) / 100);
  for (const e of elements) {
    const t = e.tags || {};
    const pts = e.geometry ? e.geometry.map((g) => P(g.lat, g.lon)) : null;
    const pt = e.type === 'node' ? P(e.lat, e.lon) : null;
    let k = null, v, h;
    if (t.barrier === 'guard_rail') k = 'guard_rail';
    else if (t.barrier === 'wall' && t.wall === 'noise_barrier') { k = 'noise_barrier'; h = parseFloat(t.height) || undefined; }
    else if (t.barrier === 'fence') k = 'fence';
    else if (t.barrier === 'hedge' && hedges) k = 'hedge';
    else if (t.barrier === 'bollard') k = 'bollard';
    else if (t.traffic_calming && ['bump', 'table', 'cushion', 'hump'].includes(t.traffic_calming)) { k = 'speedbump'; v = t.traffic_calming; }
    else if (t.amenity === 'bench' || t.leisure === 'picnic_table') k = 'bench';
    else if (t.amenity === 'waste_basket') k = 'bin';
    else if (t.amenity === 'bicycle_parking' && e.type === 'node') k = 'bikerack';
    else if (t.amenity === 'shelter' && (t.shelter_type === 'public_transport' || !t.shelter_type) && e.type === 'node') k = 'shelter';
    else if (t.highway === 'street_lamp') k = 'lamp';
    if (!k) continue;
    if (pt) out.push({ k, pts: [pt], ...(v ? { v } : null), ...(h ? { h } : null), osm: e.id });
    else if (pts && pts.length > 1) {
      // a speed table mapped as a way: its middle
      if (k === 'speedbump') { const m = pts[Math.floor(pts.length / 2)]; out.push({ k, pts: [m], v, osm: e.id }); } else out.push({ k, pts, ...(h ? { h } : null), osm: e.id });
    }
  }
  return out;
}

// The mapped signals, signs, crossings and gates of one OSM node, for the
// province's tiles (the city keeps its own lists: meta.trafficLights, signs
// by rule): [{ k, pts: [[x, y]], v?, osm }] with k signals (a traffic light
// or a signalised crossing: junction_tiles.mjs snaps it onto its road), stop,
// giveway, crossing (v: zebra, marked, uncontrolled), gate (v: the barrier),
// postbox. Nothing draws them yet.
export const GATE_KINDS = new Set(['gate', 'lift_gate', 'swing_gate', 'block', 'cycle_barrier', 'cattle_grid']);
export function mappedSignsFromOsm(el) {
  const t = el.tags || {};
  if (el.type !== 'node' || el.lat === undefined) return [];
  let k = null, v;
  if (t.highway === 'traffic_signals' || t.crossing === 'traffic_signals') k = 'signals';
  else if (t.highway === 'stop') k = 'stop';
  else if (t.highway === 'give_way') k = 'giveway';
  else if (t.highway === 'crossing' && ['zebra', 'marked', 'uncontrolled'].includes(t.crossing)) { k = 'crossing'; v = t.crossing; }
  else if (GATE_KINDS.has(t.barrier)) { k = 'gate'; v = t.barrier; }
  else if (t.amenity === 'post_box') k = 'postbox';
  if (!k) return [];
  const [x, y] = wgsToWorld(el.lat, el.lon).map((q) => Math.round(q * 100) / 100);
  return [{ k, pts: [[x, y]], ...(v ? { v } : null), osm: el.id }];
}
