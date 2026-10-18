// De stad per laag uit de gedeelde OSM-tegelbouw (#90 fase B, `STAD_LAAG=water` bij het bouwen).
// loadSources (pack_tiles.mjs) vervangt de laag in de stadsdata vóór de GameMap, zodat de
// afleiding (droge kruisingen, woonboten, ...) en de gids van de vaste stadsset vanzelf kloppen.
// Alleen rijen met hun zwaartepunt binnen meta.bounds: daarbuiten dekken de overlaytegels (geen dubbele rijen, #212).
import '../node3d.mjs';
import * as G from '../../game/js/gdt.js';

export const LAGEN_UIT_OSM = ['water'];

const SECTION_OF = { water: () => G.SECTION.WATER };
const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };

// keys: de stadstegels; geeft { water: [rij] } met gid weggelaten
export async function osmCityLayers(keys, bounds, lagen) {
  const { buildProvince } = await import('./build_province.mjs');
  const built = buildProvince({ cityKeys: new Set(), only: keys, profile: keys, map: false, fillOld: false });
  const out = {};
  for (const l of lagen) out[l] = [];
  for (const [, b] of built.blobs) {
    for (const s of G.decodeBlob(b.bytes).sections) {
      for (const l of lagen) {
        if (s.type !== SECTION_OF[l]() || !s.rows) continue;
        for (const r of s.rows) {
          const [cx, cy] = centroid(r.pts);
          if (cx < bounds[0] || cx > bounds[2] || cy < bounds[1] || cy > bounds[3]) continue;
          const { gid, g, ...row } = r;
          out[l].push(row);
        }
      }
    }
  }
  return out;
}
