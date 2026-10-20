// Trees and green at their real place (docs/PROVINCIE-PLAN.md 2.15).
//
//   node scripts/world/greenery.mjs           audit the city (stad.json and the OSM layers)
//   node scripts/world/greenery.mjs --write   species and heights for every tree, woods and parks filled, then audit
//   node scripts/world/greenery.mjs --strict  exit 1 when the audit finds a problem
//
// --write gives every mapped tree (natural=tree, tree_row: what
// process_osm.py put in `trees`) a species and a height (game/js/greenery.js):
// OSM species/genus/leaf_type/height where tagged (matched by position to the
// OSM caches), else the rules (by water, a church, a wood, park or
// cemetery, the class of the road it stands by; a row of five or more one
// species). Wood and forest outlines get trees on a jittered grid (9 m), parks
// sparser with glades (24 m); never on a way, in a building, in water, on the
// track or on top of a mapped tree. Mapped hedges go into `furniture`
// (barrier=hedge). Run again it gives the same trees (the fill is dropped and
// made anew).
//
// The audit: no tree on a carriageway, in a building or in water; the
// species mix; mapped trees against the OSM count.
import '../node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GR = await import('../../game/js/greenery.js');
const { GameMap, applyMapExtras } = await import('../../game/js/mapdata.js');
const { createWaterIndex } = await import('../../game/js/waterindex.js');
const { wgsToWorld } = await import('../../game/js/rdnew.js');

const FILL = GR.TREE_FLAG.fill, ROW = GR.TREE_FLAG.row;
// (parks are left as OSM maps them: the city's parks hold the minigames,
// missions and hidden things, laid out round the trees that are there)
export const FILL_RULES = { forest: { spacing: 9, open: 0 }, cemetery: { spacing: 18, open: 0.3 } };

// Places the fill keeps clear of: the minigame courses (tee to basket or
// green, 25 m either side), the skatepark and the kart track, and the points
// of the map's meta (pois, shops, horeca, garages, landmarks).
export async function gameplayClearings(data) {
  const out = { lines: [], circles: [] };
  const tryImport = async (f) => { try { return await import(f); } catch (e) { return null; } };
  const DR = await tryImport('../../game/js/discgolfrules.js');
  if (DR) for (const h of DR.courseHoles()) out.lines.push([h.tee.x, h.tee.y, h.basket.x, h.basket.y, 25]);
  const PL = await tryImport('../../game/js/puttinglogic.js');
  if (PL) for (const h of PL.PP_HOLES) { const a = wgsToWorld(h.tee.lat, h.tee.lon), b = wgsToWorld(h.green.lat, h.green.lon); out.lines.push([a[0], a[1], b[0], b[1], 25]); }
  // the skatepark and the kart track (skatepark.js, kartbaan.js ORIGIN; their
  // modules pull in the whole activity graph, so the points are copied here)
  for (const [lat, lon, r] of [[53.204169, 6.547889, 70], [53.240572, 6.600072, 170]]) { const [x, y] = wgsToWorld(lat, lon); out.circles.push([x, y, r]); }
  const meta = data.meta || {};
  for (const k of ['pois', 'shops', 'horeca', 'garages', 'landmarks']) for (const p of Array.isArray(meta[k]) ? meta[k] : Object.values(meta[k] || {}).flat()) if (p && Number.isFinite(p.x)) out.circles.push([p.x, p.y, 25]);
  return out;
}
export function inClearing(cl, x, y) {
  for (const [cx, cy, r] of cl.circles) if (Math.abs(cx - x) < r && Math.abs(cy - y) < r && Math.hypot(cx - x, cy - y) < r) return true;
  for (const [ax, ay, bx, by, r] of cl.lines) if (segDist(x, y, [ax, ay], [bx, by]) < r) return true;
  return false;
}

export function plant(data, map, elements, clearings = { lines: [], circles: [] }) {
  // the mapped trees (a fill from an earlier run is dropped)
  const mapped = (data.trees || []).filter((t) => !(t[4] & FILL)).map((t) => [t[0], t[1]]);
  // OSM tags by position
  const tagged = new Map();
  const key = (x, y) => `${Math.round(x * 2)},${Math.round(y * 2)}`;
  for (const e of elements) {
    const t = e.tags || {};
    if (e.type === 'node' && t.natural === 'tree') {
      const [x, y] = wgsToWorld(e.lat, e.lon);
      tagged.set(key(x, y), t);
    }
  }
  const tagsAt = (x, y) => {
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { const t = tagged.get(`${Math.round(x * 2) + dx},${Math.round(y * 2) + dy}`); if (t) return t; }
    return null;
  };
  // context lookups
  const water = createWaterIndex(data.water);
  const waterDist = (x, y) => (water.inWater(x, y) ? 0 : water.nearestShore(x, y, 20).d);
  const churches = map.buildings.filter((b) => b.type === 'church' || b.type === 'chapel' || b.type === 'cathedral').map((b) => [(b.bounds[0] + b.bounds[2]) / 2, (b.bounds[1] + b.bounds[3]) / 2]);
  for (const l of (data.meta && data.meta.landmarks) || []) if (l.kind === 'church') churches.push([l.x, l.y]);
  const placeAt = (x, y) => {
    for (const g of map.greenNear(x, y, 0.5)) {
      if (!['forest', 'park', 'cemetery'].includes(g.kind)) continue;
      const b = g.bounds;
      if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
      if (inPoly(x, y, g.pts)) return g.kind;
    }
    return 'street';
  };
  const roadAt = (x, y) => {
    let best = null, bd = 12;
    for (const r of map.roadsNear(x, y, 12)) {
      const P = r.pts;
      for (let i = 0; i < P.length - 1; i++) {
        const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
        const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
        const d = Math.hypot(P[i][0] + dx * t - x, P[i][1] + dy * t - y) - r.width / 2;
        if (d < bd) { bd = d; best = r; }
      }
    }
    return best ? (best.cat === 'major' ? 'major' : best.cat) : null;
  };
  const rows = GR.findRows(mapped);
  const out = [];
  const stats = { osmSpecies: 0, osmHeight: 0, rows: 0, rule: 0 };
  mapped.forEach(([x, y], i) => {
    const h = GR.hash2(x, y);
    const tags = tagsAt(x, y) || {};
    let sp = GR.speciesFromTags(tags);
    if (sp >= 0) stats.osmSpecies++;
    else {
      const ctx = { water: waterDist(x, y), church: churches.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 60), place: placeAt(x, y), road: roadAt(x, y), needle: tags.leaf_type === 'needleleaved' };
      if (rows[i] >= 0) { ctx.rowSeed = GR.hash2(mapped[rows[i]][0], mapped[rows[i]][1]); stats.rows++; }
      sp = GR.speciesFor(ctx, h);
      stats.rule++;
    }
    let hdm = GR.heightFor(sp, GR.hash2(y * 0.5, x * 0.5));
    const th = parseFloat(String(tags.height || '').replace(',', '.'));
    if (th > 2 && th < 45) { hdm = Math.round(th * 10); stats.osmHeight++; }
    out.push([x, y, sp, hdm, rows[i] >= 0 ? ROW : 0]);
  });
  // fill woods, parks and cemeteries
  const TG = 8, tgrid = new Map();
  const addT = (t) => { const k = Math.floor(t[0] / TG) * 65536 + Math.floor(t[1] / TG); (tgrid.get(k) || tgrid.set(k, []).get(k)).push(t); };
  for (const t of out) addT(t);
  const nearTree = (x, y, r) => {
    for (let gx = -1; gx <= 1; gx++) for (let gy = -1; gy <= 1; gy++) for (const t of tgrid.get((Math.floor(x / TG) + gx) * 65536 + Math.floor(y / TG) + gy) || []) if (Math.hypot(t[0] - x, t[1] - y) < r) return true;
    return false;
  };
  const railNear = (x, y) => (map.rails || []).some((r) => r.pts.some((p, i) => i < r.pts.length - 1 && segDist(x, y, p, r.pts[i + 1]) < 4));
  const keep = (x, y) => {
    if (inClearing(clearings, x, y)) return false;
    if (water.inWater(x, y) || waterDist(x, y) < 1.5) return false;
    for (const r of map.roadsNear(x, y, 10)) {
      const P = r.pts;
      for (let i = 0; i < P.length - 1; i++) if (segDist(x, y, P[i], P[i + 1]) < r.width / 2 + (r.cat === 'foot' ? 1.2 : 2)) return false;
    }
    for (const b of map.buildingsNear(x, y, 3)) {
      const bb = b.bounds;
      if (x < bb[0] - 2.5 || x > bb[2] + 2.5 || y < bb[1] - 2.5 || y > bb[3] + 2.5) continue;
      if (inPoly(x, y, b.pts) || distToPoly(x, y, b.pts) < 2.5) return false;
    }
    if (nearTree(x, y, 4)) return false;
    if (map.offStreetLevel && map.offStreetLevel(x, y)) return false;
    return !railNear(x, y);
  };
  const filled = { forest: 0, cemetery: 0 };
  data.green.forEach((g, gi) => {
    const rule = FILL_RULES[g.kind];
    if (!rule) return;
    for (const [x, y] of GR.fillPolygon(g.pts, { ...rule, keep, salt: gi % 97 })) {
      const sp = GR.speciesFor({ place: g.kind, water: waterDist(x, y) }, GR.hash2(x * 0.7, y * 1.3));
      const t = [x, y, sp, GR.heightFor(sp, GR.hash2(y, x * 0.9)), FILL];
      out.push(t);
      addT(t);
      filled[g.kind]++;
    }
  });
  return { trees: out, stats: { mapped: mapped.length, ...stats, filled } };
}

function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
}
function distToPoly(x, y, P) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, segDist(x, y, P[j], P[i]));
  return d;
}

// hedges (barrier=hedge lines) as furniture rows
export function hedgesFrom(elements, bounds) {
  const out = [];
  const seen = new Set();
  for (const e of elements) {
    const t = e.tags || {};
    if (t.barrier !== 'hedge' || !e.geometry || seen.has(e.id)) continue;
    seen.add(e.id);
    const pts = e.geometry.map((g) => wgsToWorld(g.lat, g.lon).map((v) => Math.round(v * 100) / 100));
    if (bounds && !pts.every((p) => p[0] >= bounds[0] && p[0] <= bounds[2] && p[1] >= bounds[1] && p[1] <= bounds[3])) continue;
    out.push({ k: 'hedge', pts, osm: e.id });
  }
  return out;
}

export function audit(map, trees) {
  // (the mapped trees stand where OSM puts them, GameMap drops the ones on a
  // carriageway; the checks are for the trees this step puts down)
  const rep = { trees: trees.length, species: {}, fill: 0, onRoad: 0, inBuilding: 0, inWater: 0 };
  for (const t of trees) {
    const id = (GR.SPECIES[t[2]] || {}).id || '?';
    rep.species[id] = (rep.species[id] || 0) + 1;
    if (!(t[4] & FILL)) continue;
    rep.fill++;
    const [x, y] = t;
    for (const r of map.roadsNear(x, y, 8)) {
      if (r.cat === 'foot') continue;
      if (r.pts.some((p, i) => i < r.pts.length - 1 && segDist(x, y, p, r.pts[i + 1]) < r.width / 2 - 0.2)) { rep.onRoad++; break; }
    }
    for (const b of map.buildingsNear(x, y, 0.5)) if (inPoly(x, y, b.pts)) { rep.inBuilding++; break; }
    for (const w of map.waterNear(x, y, 0.5)) if (inPoly(x, y, w.pts)) { rep.inWater++; break; }
  }
  return rep;
}

async function main() {
  const args = process.argv.slice(2);
  const { loadCityData } = await import('../lib/loadworld.mjs');
  const data = await loadCityData({ extras: false });
  if (args.includes('--write')) {
    // de bomen van de stad komen uit de OSM-tegelbouw (stad_laag.mjs, trees); de heggen zijn meubilair van de tegelbouw
    console.log('--write bestaat niet meer: de lagen van de stad komen uit de OSM-tegelbouw (game/stad.json heeft alleen de handlaag)');
    process.exit(1);
  }
  const extras = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/mapextras.json'), 'utf8'));
  applyMapExtras(data, extras);
  const map = new GameMap(data);
  const rep = audit(map, map.trees);
  console.log(`${rep.trees} trees in the game (${rep.fill} filled into woods and parks; of those on a way ${rep.onRoad}, in a building ${rep.inBuilding}, in water ${rep.inWater})`);
  console.log(`species: ${Object.entries(rep.species).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (args.includes('--strict') && rep.onRoad + rep.inBuilding + rep.inWater) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
