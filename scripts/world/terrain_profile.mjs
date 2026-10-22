// Hoogteprofielen over het AHN-terrein (#269): de bases en voorkeurshoogtes die de oplosser (profile.mjs, onTerrain)
// nodig heeft, en de stap die de uitkomst als tweede profiel `zt` op de wegen zet.
//
// Het spel (mapdata.js terrainBase) leest een profiel terug relatief aan een basis:
//   - een brug of tunnel: de lijn tussen het terrein aan zijn twee uiteinden (deckterrain.js deckRefs);
//   - elke andere weg: het terrein op zijn eigen hoekpunten, recht ertussen (roadTerrainAt).
// De oplosser rekent in absolute hoogtes en schrijft z = hoogte - basis, dus met dezelfde basis als het spel.
//
// AHN heeft onder een viaduct geen data en vult het gat uit de omgeving: de straat die onder het viaduct doorgaat
// meet daar de aanloopdijk (5 m) in plaats van zijn eigen niveau. Zo'n straat krijgt een voorkeurshoogte: de lijn
// tussen zijn niveau aan beide voeten van de dijk (underWindows), nooit boven het terrein. De basis blijft het terrein
// op zijn hoekpunten, dus het profiel van die straat loopt over de dijk negatief (-5 m) en het spel hoeft niets te weten.
import { deckRefs, isDeckRoad } from '../../game/js/deckterrain.js';

export const FOOT_STEP = 4;      // m between the samples along a street
export const FOOT_REACH = 160;   // m each way the foot of the dyke is looked for
export const FOOT_DROP = 0.25;   // m: the foot lies where the ground does not fall this much anywhere over the next FOOT_LOOK m
export const FOOT_LOOK = 30;
export const UNDER_MIN = 0.3;    // m the terrain must stand over the line before the street is lowered

const cumulative = (P) => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return c; };

// the point at arc position s of a polyline
function pointAt(P, cum, s) {
  const L = cum[cum.length - 1];
  s = Math.max(0, Math.min(L, s));
  let i = 0;
  while (i < P.length - 2 && cum[i + 1] < s) i++;
  const d = cum[i + 1] - cum[i] || 1, t = (s - cum[i]) / d;
  return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t];
}

// arc position of the point on the polyline nearest to (x, y)
function arcOf(P, cum, x, y) {
  let best = Infinity, pos = 0;
  for (let i = 0; i + 1 < P.length; i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, l2 = dx * dx + dy * dy;
    const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) { best = d; pos = cum[i] + t * Math.sqrt(l2); }
  }
  return pos;
}

// The base of every road of the list: a deck from its line, any other road from the terrain at its vertices.
export function terrainBases(roads, terrain) {
  const out = new Map();
  for (const r of roads) {
    out.set(r, isDeckRoad(r) ? Float64Array.from(deckRefs(r.pts, terrain)) : Float64Array.from(r.pts, (p) => terrain(p[0], p[1])));
  }
  return out;
}

// The foot of the dyke each way from arc position sc of a street: the first sample, going out, from which the ground no longer
// falls (it may be flat on the top of the dyke first: that is not the foot while it falls further on). Returns { s0, s1, h0, h1 } (arc positions and terrain there), or null when the street is too short to have one.
export function dykeFeet(P, cum, terrain, sc, { reach = FOOT_REACH, step = FOOT_STEP } = {}) {
  const L = cum[cum.length - 1];
  const T = (s) => { const [x, y] = pointAt(P, cum, s); return terrain(x, y); };
  const walk = (dir) => {
    let s = sc;
    for (let k = 0; k * step <= reach; k++) {
      s = sc + dir * k * step;
      if (s < 0 || s > L) { s = Math.max(0, Math.min(L, s)); break; }
      // lowest ground over the next FOOT_LOOK m outward
      let low = Infinity;
      for (let q = 0; q <= FOOT_LOOK; q += step) low = Math.min(low, T(Math.max(0, Math.min(L, s + dir * q))));
      if (T(s) - low < FOOT_DROP) break;
    }
    return [s, T(s)];
  };
  const [s0, h0] = walk(-1), [s1, h1] = walk(1);
  if (s1 - s0 < step) return null;
  return { s0, s1, h0, h1 };
}

// Where a street passes under a deck (a crossing without a shared vertex whose upper road is a bridge), its voorkeurshoogte:
// min(terrain, the line between the terrain at the two feet of the dyke). `list` gives the roads whose `pri` rows are lowered
// (the originals for the estimates, the solver's densified copies for the node priors): pri: Map(road -> Float64Array, abs).
// `spots` are { lo (a road of `list`), x, y }. Returns the roads that were lowered by more than UNDER_MIN anywhere.
export function underWindows(spots, pri, terrain) {
  const lowered = new Set();
  const cache = new Map();
  for (const { lo, x, y } of spots) {
    const row = pri.get(lo);
    if (!row) continue;
    let c = cache.get(lo);
    if (!c) cache.set(lo, (c = cumulative(lo.pts)));
    const sc = arcOf(lo.pts, c, x, y);
    const f = dykeFeet(lo.pts, c, terrain, sc);
    if (!f) continue;
    const span = f.s1 - f.s0 || 1;
    for (let i = 0; i < lo.pts.length; i++) {
      const s = c[i];
      if (s < f.s0 || s > f.s1) continue;
      const line = f.h0 + (f.h1 - f.h0) * ((s - f.s0) / span);
      const t = terrain(lo.pts[i][0], lo.pts[i][1]);
      if (t - line > UNDER_MIN && line < row[i]) { row[i] = line; lowered.add(lo); }
    }
  }
  return lowered;
}
