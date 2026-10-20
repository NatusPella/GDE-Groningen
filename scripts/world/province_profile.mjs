// Hoogteprofielen voor de wegen van een provinciepack (#235, docs/PROVINCIE-PLAN.md 2.11).
// De tegels van de provincie hadden er geen: elk viaduct en elke brug over een weg of
// spoorlijn lag op hoogte 0. Dit draait dezelfde oplosser als de stadskaart
// (profile.mjs solve) over de wegen en sporen van een pack: bruggen stijgen, wat eronder
// door gaat zakt of blijft, de wegen ertussen krijgen een helling. Daarna krijgt elk
// tegelstuk van een weg zijn eigen profiel (cutZ) in de heights-sectie.
import { solve, apply, audit, densify, STEP } from './profile.mjs';
import { nearestOn } from './bridge_audit.mjs';
import { CAR } from '../../game/js/roadprofile.js';
import { MAIN_WATERWAYS, SHIPPING_CLEAR, BRIDGE_DECK_T, BOEZEM_Y } from '../../game/js/waterlevels.js';

const r2 = (v) => Math.round(v * 100) / 100;

// z van een stuk van een weg: voor elk punt van `pts` (liggend op de lijn van row.pts) de
// hoogte uit het profiel van de hele weg; null als de weg geen profiel heeft
export function cutZ(row, pts) {
  if (!row.z) return null;
  return pts.map((p) => r2(nearestOn(row, p[0], p[1]).z));
}
// een stuk zonder noemenswaardig hoogteverschil krijgt geen profiel
export const isFlat = (z) => !z || z.every((q) => Math.abs(q) < 0.02);

// Where a fixed bridge over a shipping waterway has to lie: at least this high over the terrain (the road's surface)
export const SHIPPING_DECK_Z = Math.round((SHIPPING_CLEAR + BRIDGE_DECK_T + BOEZEM_Y + 0.05) * 100) / 100;
// The canals of the MAIN_WATERWAYS by name (a lake of that name, the Lauwersmeer, is not a canal)
export const shippingWater = (w) => !!w.name && w.kind !== 'meer' && MAIN_WATERWAYS.test(w.name);

// The pins (profile.mjs solve) of the fixed bridges over shipping water: every vertex of a bridge way that lies over such a
// canal (or within 2 m of it: the way's end lies on the bank) has to be SHIPPING_DECK_Z high.
export function shippingPins(roads, waters, { reach = 0.6, minZ = SHIPPING_DECK_Z } = {}) {
  const polys = waters.filter(shippingWater).map((w) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of w.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    return { pts: w.pts, box: [x0 - 2, y0 - 2, x1 + 2, y1 + 2] };
  });
  if (!polys.length) return [];
  const inside = (x, y, P) => {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
    return c;
  };
  const wet = (x, y) => polys.some((q) => x >= q.box[0] && x <= q.box[2] && y >= q.box[1] && y <= q.box[3] && [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => inside(x + dx, y + dy, q.pts)));
  const pins = [];
  for (const r of roads) {
    if (!r.bridge || r.movable || r.tunnel || r.rail) continue;
    for (const p of r.pts) if (wet(p[0], p[1])) pins.push({ road: r, x: p[0], y: p[1], reach, minZ });
  }
  return pins;
}

const pick = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]));

// feats: [{ kind, row }] van een pack. Zet row.z (en dichtere row.pts) op de wegen die een
// profiel nodig hebben. Geeft { roads, profiled, before, after } terug; before/after zijn de
// aantallen uit de profielaudit (clearance: wegen onder hun vrije hoogte).
export function profileFeats(feats, { passes = 6, shipping = true } = {}) {
  const roads = feats.filter((f) => f.kind === 'roads').map((f) => f.row);
  const rails = feats.filter((f) => f.kind === 'rails').map((f) => f.row);
  const data = { roads, rails, levelCrossings: [], water: [] };
  // The solver only looks at crossings where a way already has a profile (the city's came from
  // its elevation script). OSM says bridge, tunnel or layer for the rest: a flat profile as the
  // prior, which the clearances then lift or sink. A movable bridge stays at street level.
  for (const r of roads) if (!r.z && !r.movable && (r.bridge || r.tunnel) && r.pts.length >= 2) {
    // (a road that already has a profile is not densified by the solver, so the vertices come first)
    r.pts = densify(r.pts, STEP);
    r.z = r.pts.map(() => 0);
  }
  const before = pick(audit(data));
  // a bridge over a shipping canal clears the barges (SHIPPING_DECK_Z); nothing is sunk (the province draws no trench)
  const pins = shipping ? shippingPins(roads, feats.filter((f) => f.kind === 'water').map((f) => f.row)) : [];
  let densified = 0;
  for (let p = 0; p < passes; p++) {
    const sol = solve(data, { pins, noSink: true });
    const res = apply(data, sol);
    densified += sol.pts.size;
    if (!res.changed && !res.cleared && !sol.pts.size) break;
  }
  const after = pick(audit(data));
  return { roads: roads.length, profiled: roads.filter((r) => r.z).length, densified, before, after, pins: pins.length };
}

// Dekken: de bruggen met een auto-klasse die een profiel hebben, voor de statistiek
export const profiledBridges = (roads) => roads.filter((r) => r.bridge && CAR.has(r.cat) && r.z && r.z.some((q) => Math.abs(q) > 0.3)).length;
