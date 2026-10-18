// Hoogteprofielen voor de wegen van een provinciepack (#235, docs/PROVINCIE-PLAN.md 2.11).
// De tegels van de provincie hadden er geen: elk viaduct en elke brug over een weg of
// spoorlijn lag op hoogte 0. Dit draait dezelfde oplosser als de stadskaart
// (profile.mjs solve) over de wegen en sporen van een pack: bruggen stijgen, wat eronder
// door gaat zakt of blijft, de wegen ertussen krijgen een helling. Daarna krijgt elk
// tegelstuk van een weg zijn eigen profiel (cutZ) in de heights-sectie.
import { solve, apply, audit, densify, STEP } from './profile.mjs';
import { nearestOn } from './bridge_audit.mjs';
import { CAR } from '../../game/js/roadprofile.js';

const r2 = (v) => Math.round(v * 100) / 100;

// z van een stuk van een weg: voor elk punt van `pts` (liggend op de lijn van row.pts) de
// hoogte uit het profiel van de hele weg; null als de weg geen profiel heeft
export function cutZ(row, pts) {
  if (!row.z) return null;
  return pts.map((p) => r2(nearestOn(row, p[0], p[1]).z));
}
// een stuk zonder noemenswaardig hoogteverschil krijgt geen profiel
export const isFlat = (z) => !z || z.every((q) => Math.abs(q) < 0.02);

const pick = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]));

// feats: [{ kind, row }] van een pack. Zet row.z (en dichtere row.pts) op de wegen die een
// profiel nodig hebben. Geeft { roads, profiled, before, after } terug; before/after zijn de
// aantallen uit de profielaudit (clearance: wegen onder hun vrije hoogte).
export function profileFeats(feats, { passes = 6 } = {}) {
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
  let densified = 0;
  for (let p = 0; p < passes; p++) {
    const sol = solve(data, {});
    const res = apply(data, sol);
    densified += sol.pts.size;
    if (!res.changed && !res.cleared && !sol.pts.size) break;
  }
  const after = pick(audit(data));
  return { roads: roads.length, profiled: roads.filter((r) => r.z).length, densified, before, after };
}

// Dekken: de bruggen met een auto-klasse die een profiel hebben, voor de statistiek
export const profiledBridges = (roads) => roads.filter((r) => r.bridge && CAR.has(r.cat) && r.z && r.z.some((q) => Math.abs(q) > 0.3)).length;
