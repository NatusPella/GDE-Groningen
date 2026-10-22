// The second height profile of the roads, over the AHN terrain (#269): `road.zt`, the profile the game reads with ?terrain,
// next to the flat `road.z` it reads without. Both come from the same solver (profile.mjs): `z` flat as ever, `zt` with
// opts.onTerrain (the references the game reads back, absolute clearances, the streets under a deck held at their own level).
// A road that has `z` and needs nothing over the terrain gets `zt = []` (flat in terrain mode); a road without `z` that
// needs a profile over the terrain gets `zt` and denser vertices on the same line (its `z`, if any, is resampled).
import { solve, wetTest } from './profile.mjs';
import { isDeckRoad } from '../../game/js/deckterrain.js';
import { loadTerrainField } from './terrain.mjs';

const r2 = (v) => Math.round(v * 100) / 100;

// the profile `z` of the polyline `oldPts` read at the points `newPts` that lie on it
function resampleZ(oldPts, z, newPts) {
  const cum = [0];
  for (let i = 1; i < oldPts.length; i++) cum.push(cum[i - 1] + Math.hypot(oldPts[i][0] - oldPts[i - 1][0], oldPts[i][1] - oldPts[i - 1][1]));
  return newPts.map((q) => {
    let best = Infinity, out = z[0];
    for (let i = 0; i + 1 < oldPts.length; i++) {
      const ax = oldPts[i][0], ay = oldPts[i][1], dx = oldPts[i + 1][0] - ax, dy = oldPts[i + 1][1] - ay, l2 = dx * dx + dy * dy;
      const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)) : 0;
      const d = Math.hypot(q[0] - ax - dx * t, q[1] - ay - dy * t);
      if (d < best) { best = d; out = z[i] + (z[i + 1] - z[i]) * t; }
    }
    return r2(out);
  });
}

// Puts a terrain solution on the roads: road.zt (and the densified vertices of a road that got a profile)
export function applyTerrain(data, sol) {
  let changed = 0;
  for (const [r, zs] of sol.roads) {
    const flatZs = zs.every((q) => Math.abs(q) < 0.02);
    // a road that stays flat over the terrain keeps its own vertices (the solver densified it for a ramp it did not need)
    if (sol.pts.has(r) && !flatZs) {
      const P = sol.pts.get(r);
      if (r.z) r.z = resampleZ(r.pts, r.z, P);
      r.pts = P;
    }
    // (a deck keeps a flat profile too: it is a ribbon over the line between its ends, elevation.js)
    const zt = !flatZs ? zs : isDeckRoad(r) ? new Array(r.pts.length).fill(0) : r.z ? [] : undefined;
    const was = r.zt ? r.zt.join() : '';
    const now = zt ? zt.join() : '';
    if (was !== now) changed++;
    if (zt) r.zt = zt; else delete r.zt;
  }
  return { changed };
}

// The design heights of the bridges over water (a city bridge clears the boats by its flat profile): a vertex of a bridge that stands over
// water and is raised by its flat profile lies at least that high over the bridge's base. The province has its own pins (province_profile.mjs).
export function bridgePins(data) {
  const water = data.water || [];
  if (!water.length) return [];
  const wet = wetTest(water), pins = [];
  for (const r of data.roads) {
    if (!r.bridge || r.tunnel || r.movable || !r.z || r.pts.length < 2 || r.z.length !== r.pts.length) continue;
    r.pts.forEach((p, i) => { if (r.z[i] > 0.5 && wet(p[0], p[1])) pins.push({ road: r, x: p[0], y: p[1], reach: 0.6, minZ: r.z[i] }); });
  }
  return pins;
}

// Solves `data.roads` over the terrain until nothing changes (3 passes at most) and marks the rest: a road with a flat profile
// and no terrain profile is flat over the terrain (zt = []). Needs `terrain` (x, y) -> m NAP.
export function solveTerrainRoads(data, { terrain, protect = new Set(), pins = [], noSink = false, passes = 3 } = {}) {
  let n = 0, densified = 0, last = null;
  for (let pass = 0; pass < passes; pass++) {
    last = solve(data, { terrain, onTerrain: true, protect, pins: [...pins, ...bridgePins(data)], noSink });
    const res = applyTerrain(data, last);
    n++;
    densified += last.pts.size;
    if (!res.changed) break;
  }
  let flat = 0;
  for (const r of data.roads) if (r.z && !r.zt) { r.zt = []; flat++; }
  return { passes: n, densified, flat, zt: data.roads.filter((r) => r.zt && r.zt.length).length };
}

// The AHN terrain as one sampler (m NAP), null when no rasters were fetched (data/world/ahn) or GDE_ZT=0: then no road gets a
// terrain profile and ?terrain keeps the flat ones.
let ahn;
export function ahnTerrain() {
  if (ahn === undefined) {
    ahn = null;
    if (process.env.GDE_ZT !== '0') { const f = loadTerrainField(); if (f.size) ahn = f.at; }
  }
  return ahn;
}
