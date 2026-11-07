// The province's traffic lights and junction model (docs/ARCHITECTUUR-STAD-NAAR-TEGELS.md A4, A6):
// the city's own code (game/js/junctions.js junctionModel, autoSignals) over
// one pack's road rows, written into the tiles as the JUNCTIONS section
// (the same rows pack_tiles.mjs writes for the city) and as `signals`
// furniture rows (the city's meta.trafficLights).
//
//   signals   the OSM nodes (highway=traffic_signals, crossing=traffic_signals)
//             snapped onto the car road they belong to, as add_traffic_lights.py
//             does for the city: 2.5 m for a car road, 1.5 m for a cycle path
//             only (bike: 1), else dropped; plus the busy crossings OSM left
//             without lights (autoSignals, auto: 1)
//   junctions one row per car junction node: control (signals, roundabout,
//             priority, equal, graded), per arm the rule and the stop line
import { junctionModel, allSignals, RULES } from '../../game/js/junctions.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { polygonBounds } from '../../game/js/util.js';

const CAR = new Set(['major', 'normal', 'minor']);
const SNAP_CAR = 2.5, SNAP_CYCLE = 1.5;
const r2 = (v) => Math.round(v * 100) / 100;

function nearestOn(grid, x, y, reach, cats) {
  let best = null, bd = reach;
  for (const r of grid.query(x - reach, y - reach, x + reach, y + reach)) {
    if (!cats.has(r.cat)) continue;
    const P = r.pts;
    for (let i = 0; i < P.length - 1; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
      const px = P[i][0] + dx * t, py = P[i][1] + dy * t, d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = [px, py]; }
    }
  }
  return best;
}

// feats of a pack -> { feats (signals snapped or dropped), lights: [{ x, y, bike? }] }
export function snapSignals(feats) {
  const grid = new SpatialGrid(80);
  for (const f of feats) if (f.kind === 'roads' && (CAR.has(f.row.cat) || f.row.cat === 'cycle')) grid.insert(f.row, polygonBounds(f.row.pts));
  const lights = [], out = [];
  for (const f of feats) {
    if (f.kind !== 'furniture' || f.row.k !== 'signals') { out.push(f); continue; }
    const [x, y] = f.row.pts[0];
    const car = nearestOn(grid, x, y, SNAP_CAR, CAR);
    const at = car || nearestOn(grid, x, y, SNAP_CYCLE, new Set(['cycle']));
    if (!at) continue;
    const row = { ...f.row, pts: [[r2(at[0]), r2(at[1])]], ...(car ? null : { bike: 1 }) };
    lights.push({ x: row.pts[0][0], y: row.pts[0][1], ...(car ? null : { bike: 1 }) });
    out.push({ ...f, row });
  }
  return { feats: out, lights };
}

// The junction model of a pack's roads with its lights: the model's nodes
// (arms refer to the road rows) and the lights the rules add (autoSignals),
// as `signals` furniture feats.
export function junctionsOf(feats, lights) {
  const roads = feats.filter((f) => f.kind === 'roads').map((f) => f.row);
  // junctionIndex leest het wegraster (#314 C2b): de bouwer maakt er een uit zijn eigen rijen.
  const roadGrid = new SpatialGrid(80);
  for (const r of roads) roadGrid.insert(r, polygonBounds(r.pts));
  const map = { roads, roadGrid, meta: { trafficLights: lights } };
  const nodes = [...junctionModel(map).values()];
  const auto = allSignals(map).filter((l) => l.auto).map((l) => ({ kind: 'furniture', row: { k: 'signals', pts: [[r2(l.x), r2(l.y)]], auto: 1 } }));
  return { nodes, auto };
}

export { RULES };
