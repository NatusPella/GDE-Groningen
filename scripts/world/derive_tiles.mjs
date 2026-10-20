// What the city's map derives from raw OSM rows, for the province's packs
// (docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md A2): the same code the GameMap
// constructor runs (game/js/derive.js, passages.js) over one pack's features,
// before they are cut into tiles.
//
//   clearance   footprints kept 1.5 m from the centreline of a ground-level
//               car road (building_clearance.mjs, issue #77)
//   derive      doubled footprints merged, platform roofs and building=roof
//               as canopies, bridge machinery and footprints on a ring
//               carriageway dropped, houseboats moored
//   roof steps  a footprint inside another of the same height lifts 0.4 m
//   waterways   a canal or river of unmapped width (a guess of 14 / 10 m) is
//               narrowed, down to 3 m, where a footprint stands on the bank
//               (issue #124: farms in the water)
//   afloat      a footprint 20 % or more in the water (the compact boxes of the
//               Ommeland sit a few metres off the bank, OSM's water areas run
//               under quays) slides at most 12 m to dry land, as the houseboats
//               slide onto water; further in it stays and the audit counts it
//   clipped     footways and cycleways through a solid block end at its
//               facade (passages.js clipWaysInBuildings)
//
// The city path is not touched: pack_tiles.mjs still reads the GameMap.
import { deriveBuildings, liftNestedRoofs } from '../../game/js/derive.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { clipWaysInBuildings } from '../../game/js/passages.js';
import { polygonBounds } from '../../game/js/util.js';
import { clearFootprints } from './building_clearance.mjs';
import { waterIndex, wetFraction, isLandingStage as landingStage, WET_FRAC } from './placement_audit.mjs';

const MIN_HW = 1.5; // a trimmed waterway stays 3 m wide
const BANK = 0.6; // and keeps this far from a footprint

const segDist2 = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return (a[0] + dx * t - x) ** 2 + (a[1] + dy * t - y) ** 2;
};
const inRing = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  }
  return c;
};

const MAX_SLIDE = 12;
export const FAR_SLIDE = 25; // the second pass for the few that are further in (#297)


// Footprints in the water slid the shortest way onto dry land (12 m at most, steps of 0.5 m
// over 16 directions), clear of other footprints; none is dropped. Houseboats and landmarks stay.
// -> the number moved
export function slideOutOfWater(feats, maxSlide = MAX_SLIDE) {
  const water = feats.filter((f) => f.kind === 'water').map((f) => f.row);
  const blds = feats.filter((f) => f.kind === 'buildings').map((f) => f.row);
  if (!water.length || !blds.length) return 0;
  const wet = waterIndex(water);
  const grid = new SpatialGrid(60);
  const box = new Map();
  const boundsOf = (b) => box.get(b) || box.set(b, polygonBounds(b.pts)).get(b);
  for (const b of blds) grid.insert(b, boundsOf(b));
  let moved = 0;
  for (const b of blds) {
    if (b.type === 'houseboat' || b.landmark || b.landmarkKind || b.landmarkPart || b.helipad || b.parts || landingStage(b.pts)) continue;
    if (wetFraction(b.pts, wet) < WET_FRAC) continue;
    const q = boundsOf(b);
    const others = grid.query(q[0] - maxSlide, q[1] - maxSlide, q[2] + maxSlide, q[3] + maxSlide).filter((o) => o !== b);
    const clear = (ox, oy) => !others.some((o) => {
      const ob = boundsOf(o);
      if (ob[0] > q[2] + ox || ob[2] < q[0] + ox || ob[1] > q[3] + oy || ob[3] < q[1] + oy) return false;
      return b.pts.some(([x, y]) => inRing(x + ox, y + oy, o.pts)) || o.pts.some(([x, y]) => inRing(x - ox, y - oy, b.pts));
    });
    let best = null;
    for (let d = 0.5; d <= maxSlide && !best; d += 0.5) {
      for (let a = 0; a < 16 && !best; a++) {
        const ox = Math.cos((a * Math.PI) / 8) * d, oy = Math.sin((a * Math.PI) / 8) * d;
        const P = b.pts.map(([x, y]) => [Math.round((x + ox) * 100) / 100, Math.round((y + oy) * 100) / 100]);
        if (wetFraction(P, wet) < 0.03 && clear(ox, oy)) best = P;
      }
    }
    if (!best) continue;
    grid.remove(b, q);
    b.pts = best;
    box.delete(b);
    grid.insert(b, boundsOf(b));
    moved++;
  }
  return moved;
}

// Water features that came from a waterway line (f.line) without a mapped width
// get their ribbon again with the half width cut to the nearest footprint
// (houseboats are meant to float and do not count). -> the number trimmed
export function trimWaterways(feats) {
  const lines = feats.filter((f) => f.kind === 'water' && f.line && !f.line.fixed);
  const blds = feats.filter((f) => f.kind === 'buildings' && f.row.type !== 'houseboat');
  if (!lines.length || !blds.length) return 0;
  const grid = new SpatialGrid(60);
  for (const f of blds) { f.row._wb = polygonBounds(f.row.pts); grid.insert(f.row, f.row._wb); }
  let trimmed = 0;
  for (const f of lines) {
    const hw = f.line.hw;
    // the centreline in pieces of at most 4 m
    const P = [];
    for (let i = 0; i < f.line.pts.length; i++) {
      const a = f.line.pts[i];
      P.push(a);
      const c = f.line.pts[i + 1];
      if (!c) break;
      const n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 4);
      for (let k = 1; k < n; k++) P.push([a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n]);
    }
    const hws = P.map(() => hw);
    let any = false;
    P.forEach((p, i) => {
      let best = hw + BANK;
      for (const b of grid.query(p[0] - hw - 1, p[1] - hw - 1, p[0] + hw + 1, p[1] + hw + 1)) {
        const q = b._wb;
        if (p[0] < q[0] - hw - 1 || p[0] > q[2] + hw + 1 || p[1] < q[1] - hw - 1 || p[1] > q[3] + hw + 1) continue;
        if (inRing(p[0], p[1], b.pts)) { best = 0; break; }
        for (let k = 0; k < b.pts.length - 1; k++) best = Math.min(best, Math.sqrt(segDist2(p[0], p[1], b.pts[k], b.pts[k + 1])));
      }
      if (best < hw + BANK) { hws[i] = Math.max(MIN_HW, best - BANK); any = true; }
    });
    if (!any) continue;
    // (a narrowing is eased over the neighbouring pieces: no sawtooth of the bank)
    const eased = hws.map((h, i) => Math.min(h, (hws[i - 1] ?? h) + 2, (hws[i + 1] ?? h) + 2));
    const L = [], R = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l, h = eased[i];
      L.push([Math.round((P[i][0] + nx * h) * 100) / 100, Math.round((P[i][1] + ny * h) * 100) / 100]);
      R.push([Math.round((P[i][0] - nx * h) * 100) / 100, Math.round((P[i][1] - ny * h) * 100) / 100]);
    }
    const ring = [...L, ...R.reverse()];
    f.row.pts = [...ring, ring[0]];
    trimmed++;
  }
  for (const f of blds) delete f.row._wb;
  return trimmed;
}

// a waterway line as a polygon strip of half width hw
const r2 = (v) => Math.round(v * 100) / 100;
export function ribbon(P, hw) {
  const L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    L.push([r2(P[i][0] + nx * hw), r2(P[i][1] + ny * hw)]);
    R.push([r2(P[i][0] - nx * hw), r2(P[i][1] - ny * hw)]);
  }
  const ring = [...L, ...R.reverse()];
  return [...ring, ring[0]];
}

// The real ditches, drains and brooks (worldbuilder.js: line.ditch) against the ways they meet (#124):
//  - a ditch that crosses the track is interrupted there (a culvert: the rails run on dry ground, 3 m each side of the line);
//  - a ditch that crosses a road at ground level is interrupted too (the road stays whole, its width and 1 m each side);
//  - the end of a ditch that lies within CONNECT m of other water but does not touch it is carried on to that water's bank;
//  - a piece left under MIN_DITCH m is dropped.
// A bridge or a tunnel over the ditch is no obstacle: the ditch runs under it. -> { cut, joined, dropped }
export const DITCH = { CONNECT: 12, RAIL_GAP: 3, ROAD_GAP: 1, MIN: 6 };
const segCross = (a, b, c, d) => {
  const rx = b[0] - a[0], ry = b[1] - a[1], sx = d[0] - c[0], sy = d[1] - c[1], den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
};
const lenOf = (P) => { let s = 0; for (let i = 1; i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return s; };
// the part of a polyline between the arclengths s0 and s1
function sub(P, s0, s1) {
  const out = [];
  let s = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    const a = Math.max(s0, s), b = Math.min(s1, s + L);
    if (b > a + 1e-9 && L > 0) {
      const pt = (q) => [r2(P[i][0] + ((P[i + 1][0] - P[i][0]) * (q - s)) / L), r2(P[i][1] + ((P[i + 1][1] - P[i][1]) * (q - s)) / L)];
      if (!out.length) out.push(pt(a));
      out.push(pt(b));
    }
    s += L;
  }
  return out;
}
export function cutDitches(feats) {
  const ditches = feats.filter((f) => f.kind === 'water' && f.line && f.line.ditch);
  const stats = { cut: 0, joined: 0, dropped: 0 };
  if (!ditches.length) return stats;
  const ways = [];
  for (const f of feats) {
    if (f.kind === 'rails') ways.push({ P: f.row.pts, gap: DITCH.RAIL_GAP });
    else if (f.kind === 'roads' && !f.row.bridge && !f.row.tunnel && !(f.row.layer > 0) && f.row.cat !== 'foot') ways.push({ P: f.row.pts, gap: (f.row.width || 4) / 2 + DITCH.ROAD_GAP });
  }
  const wb = ways.map((w) => polygonBounds(w.P));
  // 1. carry an end on to the bank of other water within CONNECT m
  const others = feats.filter((f) => f.kind === 'water' && !(f.line && f.line.ditch));
  const ob = others.map((f) => polygonBounds(f.row.pts));
  for (const f of ditches) {
    const P = f.line.pts;
    for (const end of [0, P.length - 1]) {
      const p = P[end];
      let best = null, bd = DITCH.CONNECT;
      others.forEach((o, k) => {
        const q = ob[k];
        if (p[0] < q[0] - bd || p[0] > q[2] + bd || p[1] < q[1] - bd || p[1] > q[3] + bd) return;
        if (inRing(p[0], p[1], o.row.pts)) { bd = -1; best = null; return; } // already in the water
        for (let i = 0; i < o.row.pts.length - 1; i++) {
          const a = o.row.pts[i], b = o.row.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2)), d = Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]);
          if (bd >= 0 && d < bd && d > 0.3) { bd = d; best = [r2(a[0] + dx * t), r2(a[1] + dy * t)]; }
        }
      });
      if (best && bd > 0) { if (end === 0) P.unshift(best); else P.push(best); stats.joined++; }
    }
  }
  // 2. cut at the track and the roads
  const out = [];
  for (const f of feats) {
    if (!(f.kind === 'water' && f.line && f.line.ditch)) { out.push(f); continue; }
    const P = f.line.pts, cuts = [];
    let s = 0;
    for (let i = 0; i + 1 < P.length; i++) {
      const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
      const bx0 = Math.min(P[i][0], P[i + 1][0]), bx1 = Math.max(P[i][0], P[i + 1][0]), by0 = Math.min(P[i][1], P[i + 1][1]), by1 = Math.max(P[i][1], P[i + 1][1]);
      ways.forEach((w, k) => {
        const q = wb[k];
        if (q[2] < bx0 - w.gap || q[0] > bx1 + w.gap || q[3] < by0 - w.gap || q[1] > by1 + w.gap) return;
        for (let j = 0; j + 1 < w.P.length; j++) {
          const t = segCross(P[i], P[i + 1], w.P[j], w.P[j + 1]);
          if (t !== null) cuts.push([s + t * L - w.gap, s + t * L + w.gap]);
        }
      });
      s += L;
    }
    if (!cuts.length) { out.push(f); continue; }
    cuts.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const c of cuts) { const l = merged[merged.length - 1]; if (l && c[0] <= l[1]) l[1] = Math.max(l[1], c[1]); else merged.push([...c]); }
    const total = lenOf(P);
    let from = 0;
    const pieces = [];
    for (const [a, b] of [...merged, [total, total]]) { if (a - from >= 0.5) pieces.push([from, a]); from = Math.max(from, b); }
    stats.cut += merged.length;
    for (const [a, b] of pieces) {
      const pts = sub(P, a, b);
      if (pts.length < 2 || b - a < DITCH.MIN) { stats.dropped++; continue; }
      out.push({ ...f, line: { ...f.line, pts }, row: { ...f.row, pts: ribbon(pts, f.line.hw) } });
    }
  }
  feats.length = 0;
  feats.push(...out);
  return stats;
}

// feats: [{ kind, row }] of a pack (build_corridor.mjs features()) ->
// { feats, stats }: the buildings are the derived ones, canopies come as
// { kind: 'canopies', row }, cut footways replace the way they came from.
export function deriveFeatures(feats, { clear = true, clip = true } = {}) {
  const of = (kind) => feats.filter((f) => f.kind === kind);
  const bFeats = of('buildings'), rFeats = of('roads');
  const buildings = bFeats.map((f) => f.row);
  const roads = rFeats.map((f) => f.row);
  const stats = { buildings: buildings.length, moved: 0, merged: 0, canopies: 0, lifted: 0, clipped: 0, trimmed: 0, afloat: 0 };
  // (before the clearance: the footprints settle on dry land first, then keep off the roads)
  stats.trimmed = trimWaterways(feats);
  Object.assign(stats, { ditchCut: 0, ditchJoined: 0, ditchDropped: 0 });
  { const c = cutDitches(feats); stats.ditchCut = c.cut; stats.ditchJoined = c.joined; stats.ditchDropped = c.dropped; }
  stats.afloat = slideOutOfWater(feats) + slideOutOfWater(feats, FAR_SLIDE);
  if (clear && buildings.length && roads.length) {
    const was = buildings.map((b) => b.pts);
    clearFootprints({ roads, buildings });
    stats.moved = buildings.reduce((n, b, i) => n + (b.pts !== was[i] ? 1 : 0), 0);
  }
  const rowFeat = new Map(bFeats.map((f) => [f.row, f]));
  // (no height profiles yet: a bridge or tunnel carriageway does not run on the footprints under it)
  const ringRoads = roads.filter((r) => !r.bridge && !r.tunnel && !(r.layer > 0));
  const d = deriveBuildings({ buildings, roads, ringRoads, water: of('water').map((f) => f.row), rails: of('rails').map((f) => f.row) });
  const kept = d.buildings;
  stats.canopies = d.canopies.length;
  stats.merged = buildings.length - kept.length - d.canopies.length;
  // roof steps: the grid holds the solid footprints only (as the GameMap does)
  const grid = new SpatialGrid(80);
  for (const b of kept) { b.bounds = polygonBounds(b.pts); grid.insert(b, b.bounds); }
  liftNestedRoofs(kept, grid);
  stats.lifted = kept.filter((b) => b.lift).length;
  // ways through a solid block
  let roadFeats = rFeats;
  if (clip && kept.length && roads.length) {
    const roadGrid = new SpatialGrid(80);
    for (const r of roads) { r.bounds = polygonBounds(r.pts); roadGrid.insert(r, r.bounds); }
    const map = {
      roads: roads.slice(), buildings: kept, buildingGrid: grid, passageWays: [],
      roadsNear: (x, y, r) => roadGrid.query(x - r, y - r, x + r, y + r),
    };
    const cut = clipWaysInBuildings(map);
    stats.clipped = cut.length;
    if (cut.length) {
      const was = new Map(rFeats.map((f) => [f.row, f]));
      roadFeats = map.roads.map((r) => was.get(r) || { kind: 'roads', row: r });
    }
    for (const r of roadFeats) delete r.row.bounds;
  }
  for (const b of kept) { delete b.bounds; b.passages = null; b._doors = null; }
  const out = [];
  for (const f of feats) if (f.kind !== 'buildings' && f.kind !== 'roads') out.push(f);
  for (const b of kept) out.push(rowFeat.get(b));
  for (const c of d.canopies) { delete c.bounds; out.push({ kind: 'canopies', row: c }); }
  for (const f of roadFeats) out.push(f);
  return { feats: out, stats };
}
