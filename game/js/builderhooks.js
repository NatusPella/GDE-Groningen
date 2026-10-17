// The F1c hooks of the world builder (worldbuilder.js registerHook; run per
// tile by scripts/world/build_corridor.mjs): trees and green (docs 2.15) and
// street furniture (2.14) for tiles the builder makes.
//
// greenery: every tree row of the tile gets a species, height and flags
//   (greenery.js speciesFor from the tile's own water, green and roads), and
//   the wood and forest outlines are filled (greenery.js fillPolygon, 9 m),
//   clear of ways, buildings, water, track and the mapped trees; the new trees
//   go into the tile's tree rows with ids of their own (FILL_GID0 + tile + n).
// furniture: nothing to store. The rule furniture (guardrails, gantries,
//   hectometre posts) is made in the game per tile from the tile's roads
//   (streetfurniture3d.js furnitureForTile), the same items in every build;
//   mapped furniture comes with an OSM extract that has it (furniture.mjs).
//
// rows: the tile's rows by kind plus rows.tile = { i, j, x0, y0, size }.
import { registerHook } from './worldbuilder.js';
import { speciesFor, speciesFromTags, heightFor, fillPolygon, hash2, findRows, TREE_FLAG } from './greenery.js';

export const FILL_GID0 = 20_000_000;

function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
}
function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
function polyDist(x, y, P) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, segDist(x, y, P[j], P[i]));
  return inPoly(x, y, P) ? 0 : d;
}
const lineDist = (x, y, P) => { let d = Infinity; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(x, y, P[i], P[i + 1])); return d; };
const tx = (t) => (Array.isArray(t) ? t[0] : t[0] ?? t.x);

export function greeneryHook(rows) {
  const tile = rows.tile || { i: 0, j: 0 };
  const water = rows.water || [], green = rows.green || [], roads = rows.roads || [], rails = rows.rails || [], buildings = rows.buildings || [];
  const trees = rows.trees || (rows.trees = []);
  const waterDist = (x, y) => water.reduce((d, w) => Math.min(d, polyDist(x, y, w.pts)), Infinity);
  const placeAt = (x, y) => { for (const g of green) if ((g.kind === 'forest' || g.kind === 'park' || g.kind === 'cemetery') && inPoly(x, y, g.pts)) return g.kind; return 'street'; };
  const roadAt = (x, y) => { let best = null, bd = 12; for (const r of roads) { const d = lineDist(x, y, r.pts) - (r.width || 4) / 2; if (d < bd) { bd = d; best = r; } } return best ? (best.cat === 'major' ? 'major' : best.cat) : null; };
  // the mapped trees of the tile: a row of five or more in a near straight line is one species
  // (greenery.js findRows, as scripts/world/greenery.mjs gives the city's trees)
  const mapped = trees.filter((t) => !(t[4] & TREE_FLAG.fill));
  const at = mapped.map((t) => [tx(t), t[1]]);
  const inRow = findRows(at);
  const churches = buildings.filter((b) => b.type === 'church' || b.type === 'chapel' || b.type === 'cathedral').map((b) => b.pts.reduce((a, p) => [a[0] + p[0] / b.pts.length, a[1] + p[1] / b.pts.length], [0, 0]));
  mapped.forEach((t, i) => {
    if (t[2] !== undefined && t[2] >= 0) return;
    const x = tx(t), y = t[1];
    const tags = t.tags || {};
    let sp = speciesFromTags(tags);
    if (sp < 0) {
      const ctx = { water: waterDist(x, y), church: churches.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 60), place: placeAt(x, y), road: roadAt(x, y), needle: tags.leaf_type === 'needleleaved' };
      if (t.rowSeed !== undefined) ctx.rowSeed = t.rowSeed;
      else if (inRow[i] >= 0) ctx.rowSeed = hash2(at[inRow[i]][0], at[inRow[i]][1]);
      sp = speciesFor(ctx, hash2(x, y));
    }
    t[2] = sp; t[3] = heightFor(sp, hash2(y * 0.5, x * 0.5)); t[4] = (t[4] || 0) | (inRow[i] >= 0 || t.rowSeed !== undefined ? TREE_FLAG.row : 0);
    const th = parseFloat(String(tags.height || '').replace(',', '.'));
    if (th > 2 && th < 45) t[3] = Math.round(th * 10);
  });
  // fill the woods
  const keep = (x, y) => {
    if (water.some((w) => polyDist(x, y, w.pts) < 1.5)) return false;
    if (roads.some((r) => lineDist(x, y, r.pts) < (r.width || 4) / 2 + (r.cat === 'foot' ? 1.2 : 2))) return false;
    if (rails.some((r) => lineDist(x, y, r.pts) < 4)) return false;
    if (buildings.some((b) => polyDist(x, y, b.pts) < 2.5)) return false;
    return !trees.some((t) => Math.hypot(tx(t) - x, t[1] - y) < 4);
  };
  let n = 0;
  const base = FILL_GID0 + ((tile.i + 2000) * 4000 + (tile.j + 2000)) * 4096;
  green.forEach((g, gi) => {
    if (g.kind !== 'forest') return;
    for (const [x, y] of fillPolygon(g.pts, { spacing: 9, keep, salt: gi % 97 })) {
      if (n >= 4095) return;
      const sp = speciesFor({ place: 'forest', water: waterDist(x, y) }, hash2(x * 0.7, y * 1.3));
      const t = [x, y, sp, heightFor(sp, hash2(y, x * 0.9)), TREE_FLAG.fill];
      t.gid = base + n++;
      trees.push(t);
    }
  });
  return [];
}

export function furnitureHook() {
  return [];
}

let registered = false;
export function registerBuilderHooks() {
  if (registered) return;
  registered = true;
  registerHook('greenery', greeneryHook);
  registerHook('furniture', furnitureHook);
}
