// The F1c hooks of the world builder (worldbuilder.js registerHook; run per
// tile by scripts/world/build_corridor.mjs): trees and green (docs 2.15) and
// street furniture (2.14) for tiles the builder makes.
//
// greenery: every tree row of the tile gets a species, height and flags
//   (greenery.js speciesFor from the tile's own water, green and roads), and
//   the wood, forest and cemetery outlines are filled (greenery.js fillPolygon, 9 m; a cemetery 18 m with glades),
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
import { pointInPolygon as inPoly, segDist as segDistXY } from './util.js';

export const FILL_GID0 = 20_000_000;
// (the glades of a cemetery follow the position, with one salt, so they run on across the edge of a tile)
const FILL_RULES = { forest: { spacing: 9 }, cemetery: { spacing: 18, open: 0.3, salt: 7 } };

const segDist = (x, y, a, b) => segDistXY(x, y, a[0], a[1], b[0], b[1]);
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
  // fill the woods and the cemeteries (the city's rules, scripts/world/greenery.mjs FILL_RULES: a wood 9 m apart, a cemetery 18 m with glades)
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
    const rule = FILL_RULES[g.kind];
    if (!rule) return;
    for (const [x, y] of fillPolygon(g.pts, { spacing: rule.spacing, open: rule.open || 0, keep, salt: rule.salt ?? gi % 97 })) {
      if (n >= 4095) return;
      const sp = speciesFor({ place: g.kind, water: waterDist(x, y) }, hash2(x * 0.7, y * 1.3));
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
