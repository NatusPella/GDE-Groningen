// Bomen van een pack naast de weg (#324): de OSM-bomen van de provincietegels lagen op en tegen de rijbaan (979 van 982.797
// bomen op de rijbaan, 823 binnen 0,4 m van de rand; langs Gaykingastraat, Oudeschanskerweg, Pamaweg tot 2,5 m erin), omdat de
// bouw ze zonder meer overnam. De stadstegels zetten ze bij het laden naast de weg (treeclear.js); hier doet de pack-bouw
// hetzelfde voor de gestreamde tegels: een boom op of tegen de rijbaan gaat 0,7 m buiten de rand, of verdwijnt waar daar
// geen plek voor is (huis, water, een andere weg, het midden van de weg).
//
// feats: de features van één pack (build_province.mjs), na afleiding en hoogteprofielen. Geeft de features terug zonder de
// verdwenen bomen; de verplaatste bomen zijn ter plekke aangepast. stats: { moved, removed } wordt opgeteld.
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { clearTreesFromRoads } from '../../game/js/treeclear.js';

const boundsOf = (pts) => {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; }
  return [a, b, c, d];
};

export function clearPackTrees(feats, stats = { moved: 0, removed: 0 }) {
  const treeFeats = feats.filter((f) => f.kind === 'trees');
  if (!treeFeats.length) return feats;
  const roads = new SpatialGrid(64), buildings = new SpatialGrid(64), water = new SpatialGrid(64);
  const put = (grid, o) => grid.insert(o, o.bounds);
  for (const f of feats) {
    const r = f.row;
    if (!r || !r.pts || r.pts.length < 2) continue;
    // (kopieën met bounds: de rijen zelf blijven zoals ze naar de tegel gaan)
    if (f.kind === 'roads') put(roads, { cat: r.cat, width: r.width, pts: r.pts, bridge: r.bridge, tunnel: r.tunnel, z: r.z, bounds: boundsOf(r.pts) });
    else if (f.kind === 'buildings') put(buildings, { pts: r.pts, bounds: boundsOf(r.pts) });
    else if (f.kind === 'water' && r.pts.length > 2) put(water, { pts: r.pts, bounds: boundsOf(r.pts) });
  }
  const near = (grid) => (x, y, rad) => grid.query(x - rad, y - rad, x + rad, y + rad);
  const map = { roadsNear: near(roads), buildingsNear: near(buildings), waterNear: near(water), meta: {} };
  const kept = new Set(clearTreesFromRoads(map, treeFeats.map((f) => f.row), stats));
  return feats.filter((f) => f.kind !== 'trees' || kept.has(f.row));
}
