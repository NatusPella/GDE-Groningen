// De stad per laag uit de gedeelde OSM-tegelbouw (#90 fase B, `STAD_LAAG=water,green,trees` bij het bouwen).
// loadSources (pack_tiles.mjs) vervangt de laag in de stadsdata vóór de GameMap, zodat de
// afleiding (droge kruisingen, woonboten, ...) en de gids van de vaste stadsset vanzelf kloppen.
// Alleen rijen met hun zwaartepunt binnen meta.bounds: daarbuiten dekken de overlaytegels (geen dubbele rijen, #212).
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';

// laag -> [tegelsectie, rij -> GameMap-object, zwaartepunt]
const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const polyRow = ({ gid, g, ...row }) => row;
const LAAG = {
  water: { section: () => G.SECTION.WATER, object: polyRow, at: (r) => centroid(r.pts) },
  green: { section: () => G.SECTION.GREEN, object: polyRow, at: (r) => centroid(r.pts) },
  // een boom is [x, y, soort, hoogte (dm), vlaggen] (treeRow in pack_tiles.mjs, tileworld.js)
  trees: { section: () => G.SECTION.TREES, object: (r) => [r.p[0][0], r.p[0][1], r.s ?? 0, r.h ?? 0, r.f || 0], at: (r) => r.p[0] },
};
export const LAGEN_UIT_OSM = Object.keys(LAAG);

// keys: de stadstegels; geeft { laag: [object] }
export async function osmCityLayers(keys, bounds, lagen) {
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
          const [cx, cy] = L.at(r);
          if (cx < bounds[0] || cx > bounds[2] || cy < bounds[1] || cy > bounds[3]) continue;
          out[l].push(L.object(r));
        }
      }
    }
  }
  return out;
}
