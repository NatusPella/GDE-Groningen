// De stad per laag uit de gedeelde OSM-tegelbouw (#90 fase B, `STAD_LAAG=water,green,trees` bij het bouwen).
// loadSources (pack_tiles.mjs) vervangt de laag in de stadsdata vóór de GameMap, zodat de
// afleiding (droge kruisingen, woonboten, ...) en de gids van de vaste stadsset vanzelf kloppen.
// Alleen rijen met hun zwaartepunt binnen de dekking van de stadskaart (citycover.mjs): daarbuiten dekken de
// overlaytegels van build_province.mjs, dus geen dubbele rijen (#212).
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';

// laag -> [tegelsectie, rij -> GameMap-object, zwaartepunt]
const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
// de plaatsen waarmee een rij bij de stad of bij de overlaytegel hoort: het midden van de omtrek én het zwaartepunt van de hoekpunten.
// outsideCover (build_province.mjs) laat de overlay alles weg waarvan een van de twee in de dekking ligt, de stad neemt alles waarvan
// een van de twee erin ligt: zo staat een rij nooit in beide (Kardingerplas als vijver en als kanaal) of in geen van beide, en een
// kanaal dat uit stukken bestaat blijft in de stad bij elkaar
const middle = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [(a + c) / 2, (b + d) / 2]; };
const places = (pts) => [middle(pts), centroid(pts)];
const polyRow = ({ gid, g, ...row }) => row;
// gebouwen: de OSM-rij zonder gid en passages; het handwerk van de stad (landmarks, interieurs, markt, dakvormen) blijft, zie handBuildings
const buildingRow = ({ gid, g, passages, ...row }) => row;
const LAAG = {
  buildings: { section: () => G.SECTION.BUILDINGS, object: buildingRow, at: (r) => places(r.pts) },
  water: { section: () => G.SECTION.WATER, object: polyRow, at: (r) => places(r.pts) },
  green: { section: () => G.SECTION.GREEN, object: polyRow, at: (r) => places(r.pts) },
  // een boom is [x, y, soort, hoogte (dm), vlaggen] (treeRow in pack_tiles.mjs, tileworld.js)
  trees: { section: () => G.SECTION.TREES, object: (r) => [r.p[0][0], r.p[0][1], r.s ?? 0, r.h ?? 0, r.f || 0], at: (r) => [r.p[0]] },
};
export const LAGEN_UIT_OSM = Object.keys(LAAG);

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
  const built = buildProvince({ cityKeys: new Set(), only: keys, profile: keys, map: false, fillOld: false });
  const out = {};
  for (const l of lagen) out[l] = [];
  for (const [, b] of built.blobs) {
    for (const s of G.decodeBlob(b.bytes).sections) {
      for (const l of lagen) {
        const L = LAAG[l];
        if (s.type !== L.section() || !s.rows) continue;
        for (const r of s.rows) {
          if (!L.at(r).some(([cx, cy]) => inside(cx, cy))) continue;
          out[l].push(L.object(r));
        }
      }
    }
  }
  if (out.buildings && data) out.buildings = withHand(out.buildings, data.buildings.filter(isHandBuilding));
  return out;
}
