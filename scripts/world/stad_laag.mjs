// De stad per laag uit de gedeelde OSM-tegelbouw (#90 fase B, `STAD_LAAG=water,green,trees,buildings,roads,rails` bij het bouwen).
// Wegen en spoor (roads, rails) zijn hele wegen met hoogteprofiel en gaan via stad_wegen.mjs (collect-haak in buildProvince).
// loadSources (pack_tiles.mjs) vervangt de laag in de stadsdata vóór de GameMap, zodat de
// afleiding (droge kruisingen, woonboten, ...) en de gids van de vaste stadsset vanzelf kloppen.
// Alleen rijen met hun zwaartepunt binnen de dekking van de stadskaart (citycover.mjs): daarbuiten dekken de
// overlaytegels van build_province.mjs, dus geen dubbele rijen (#212).
import fs from 'node:fs';
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';

// laag -> [tegelsectie, rij -> GameMap-object, zwaartepunt]
const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const polyRow = ({ gid, g, ...row }) => row;
// gebouwen: de OSM-rij zonder gid en passages; het handwerk van de stad (landmarks, interieurs, markt, dakvormen) blijft, zie handBuildings
const buildingRow = ({ gid, g, passages, ...row }) => row;
const LAAG = {
  buildings: { section: () => G.SECTION.BUILDINGS, object: buildingRow, at: (r) => centroid(r.pts) },
  water: { section: () => G.SECTION.WATER, object: polyRow, at: (r) => centroid(r.pts) },
  green: { section: () => G.SECTION.GREEN, object: polyRow, at: (r) => centroid(r.pts) },
  // een boom is [x, y, soort, hoogte (dm), vlaggen] (treeRow in pack_tiles.mjs, tileworld.js)
  trees: { section: () => G.SECTION.TREES, object: (r) => [r.p[0][0], r.p[0][1], r.s ?? 0, r.h ?? 0, r.f || 0], at: (r) => r.p[0] },
};
// wegen en spoor zijn geen tegelsecties maar hele wegen met profiel: stad_wegen.mjs (collect in buildProvince)
export const LAGEN_WEGEN = ['roads', 'rails'];
export const LAGEN_UIT_OSM = [...Object.keys(LAAG), ...LAGEN_WEGEN];

// de gebouwen die in citymap.json met de hand zijn gemaakt of bijgewerkt: die blijven, en geen OSM-gebouw ligt erop
export const isHandBuilding = (b) => !!(b.landmark || b.landmarkPart || b.parts || b.pitch || b.helipad || b.interior || b.markt || b.noPassages);
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
function withHand(rows, hand) {
  const cell = (v) => Math.floor(v / 50), grid = new Map();
  const add = (h) => { const [x, y] = centroid(h.pts); const k = cell(x) + ',' + cell(y); (grid.get(k) || grid.set(k, []).get(k)).push(h); };
  hand.forEach(add);
  const near = (x, y) => { const o = []; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) o.push(...(grid.get((cell(x) + i) + ',' + (cell(y) + j)) || [])); return o; };
  const keep = rows.filter((r) => { const [x, y] = centroid(r.pts); return !near(x, y).some((h) => inPoly(x, y, h.pts) || inPoly(...centroid(h.pts), r.pts)); });
  return [...hand, ...keep];
}

// keys: de stadstegels; inside(x, y): de dekking; data: de stadsdata (voor het handwerk); geeft { laag: [object] }
export async function osmCityLayers(keys, inside, lagen, data = null) {
  const { buildProvince } = await import('./build_province.mjs');
  const wegen = lagen.some((l) => LAGEN_WEGEN.includes(l)) ? (await import('./stad_wegen.mjs')).collector() : null;
  const cached = cacheRead(keys, lagen);
  if (cached) return cached;
  const built = buildProvince({ cityKeys: new Set(), only: keys, profile: keys, map: false, fillOld: false, ...(wegen ? { collect: wegen.collect } : null) });
  const out = {};
  for (const l of lagen) out[l] = [];
  if (wegen) out.wegen = wegen.result();
  for (const [, b] of built.blobs) {
    for (const s of G.decodeBlob(b.bytes).sections) {
      for (const l of lagen) {
        const L = LAAG[l];
        if (!L || s.type !== L.section() || !s.rows) continue;
        for (const r of s.rows) {
          const [cx, cy] = L.at(r);
          if (!inside(cx, cy)) continue;
          out[l].push(L.object(r));
        }
      }
    }
  }
  if (out.buildings && data) out.buildings = withHand(out.buildings, data.buildings.filter(isHandBuilding));
  cacheWrite(keys, lagen, out);
  return out;
}

// STAD_LAAG_CACHE=<bestand>: de uitkomst van de OSM-bouw (4 minuten) bewaren voor audits en tests die de nieuwe stad vaak laden.
// Alleen voor ontwikkeling: de sleutel is de tegelset en de lagen, niet de code of het extract; wis het bestand na een wijziging.
function cacheRead(keys, lagen) {
  const f = process.env.STAD_LAAG_CACHE;
  if (!f || !fs.existsSync(f)) return null;
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (c.keys !== [...keys].sort().join('|') || !lagen.every((l) => c.lagen.includes(l))) return null;
    const out = {};
    for (const l of lagen) out[l] = c.out[l];
    if (c.out.wegen) out.wegen = c.out.wegen;
    return out;
  } catch { return null; }
}
function cacheWrite(keys, lagen, out) {
  const f = process.env.STAD_LAAG_CACHE;
  if (f) fs.writeFileSync(f, JSON.stringify({ keys: [...keys].sort().join('|'), lagen, out }));
}
