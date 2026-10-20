// De stad na de OSM-tegelbouw (#90): wat de oude stadsbouw (citymap.json, scripts/world/greenery.mjs plant) deed en wat de
// provinciebouw per tegel niet kan weten, omdat het de wegen, gebouwen en het handwerk van de héle stad vraagt.
// loadCityDataLaag (pack_tiles.mjs) roept tidyCity aan na de OSM-lagen (de cache van stad_cache.mjs bewaart de ruwe lagen):
//   - gebouwen: mapextras.json voegt eigen gebouwen toe (UMCG, scholen); dezelfde gebouwen komen nu ook uit OSM, dus elk
//     OSM-gebouw dat een extras-gebouw raakt vervalt (de extras hebben de deuren en de bedoelde hoogte);
//   - gebouwen met een binnenplaats: de multipolygoon-gebouwen van OSM komen uit de extract zonder binnenring (extract_province.py bewaart
//     ze alleen bij water), dus een woonhof was een massief blok met een straat erdoor. binnenplaatsen.json (fetch_binnenplaatsen.py)
//     heeft de binnenringen van de stad; ze worden in de omtrek gesneden (cutIslands, zoals een eiland in water);
//   - boomsoorten: de OSM-bomen die de oude stad ook had krijgen hun soort, hoogte en vlaggen terug (stad_bomen.json, stad_bomen.mjs);
//   - bomen: een bos- of kerkhofboom (vlag fill) staat niet op een minigamebaan of -plek, niet in een rijbaan of pad, niet
//     in of vlak bij gebouw, water of spoor (dezelfde regels als greenery.mjs plant, waar de oude stad de bomen mee vulde).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHandBuilding } from './stad_laag.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const centroid = (pts) => { let x = 0, y = 0; for (const p of pts) { x += p[0]; y += p[1]; } return [x / pts.length, y / pts.length]; };
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const segDist = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
  return Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
};
const CELL = 32;
// een raster van voorwerpen op hun bounds (met marge); at(x, y) geeft de voorwerpen in de cel
function gridOf(list, boundsOf, margin = 0) {
  const g = new Map();
  for (const o of list) {
    const [x0, y0, x1, y1] = boundsOf(o);
    for (let i = Math.floor((x0 - margin) / CELL); i <= Math.floor((x1 + margin) / CELL); i++) for (let j = Math.floor((y0 - margin) / CELL); j <= Math.floor((y1 + margin) / CELL); j++) { const k = i + ',' + j; (g.get(k) || g.set(k, []).get(k)).push(o); }
  }
  return { at: (x, y) => g.get(Math.floor(x / CELL) + ',' + Math.floor(y / CELL)) || [] };
}
const boundsOfPts = (pts) => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } return [a, b, c, d]; };

// OSM-rijen die een handrij (landmark, extras, interieur, ...) bedekken, vallen weg. withHand in stad_laag.mjs kijkt alleen of het
// zwaartepunt van de een in de ander ligt; bij een gebouw met binnenplaats (de Academiegebouw, 97 punten) ligt het zwaartepunt buiten
// de eigen omtrek en bleef de OSM-rij naast het handgebouw staan: ook zonder dat telt een rij die voor de helft in de handrij ligt.
const SAMPLES = 8;
const outlineDist = (x, y, P) => { let d = Infinity; for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, segDist(x, y, P[j], P[i])); return d; };
function coveredBy(r, h) {
  const rb = boundsOfPts(r.pts), hb = boundsOfPts(h.pts);
  if (rb[0] > hb[2] || rb[2] < hb[0] || rb[1] > hb[3] || rb[3] < hb[1]) return false;
  // het raster over de omtrek van de OSM-rij; een rij zonder punt daarin (smal of hoekig): haar hoekpunten, op 0,5 m van de handrij ook binnen
  let n = 0, inH = 0;
  for (let i = 0; i < SAMPLES; i++) for (let j = 0; j < SAMPLES; j++) {
    const x = rb[0] + ((i + 0.5) / SAMPLES) * (rb[2] - rb[0]), y = rb[1] + ((j + 0.5) / SAMPLES) * (rb[3] - rb[1]);
    if (!inPoly(x, y, r.pts)) continue;
    n++; if (inPoly(x, y, h.pts)) inH++;
  }
  if (n < 3) for (const p of r.pts) { n++; if (inPoly(p[0], p[1], h.pts) || outlineDist(p[0], p[1], h.pts) < 0.5) inH++; }
  return n > 0 && inH / n >= 0.5;
}
export function dropOverlapped(rows, hand) {
  if (!hand.length) return rows;
  const g = gridOf(hand, (h) => boundsOfPts(h.pts), 4);
  const near = (r) => { const b = boundsOfPts(r.pts), seen = new Set(); for (let x = b[0]; x <= b[2] + CELL; x += CELL) for (let y = b[1]; y <= b[3] + CELL; y += CELL) for (const h of g.at(Math.min(x, b[2]), Math.min(y, b[3]))) seen.add(h); return seen; };
  return rows.filter((r) => {
    if (isHandBuilding(r)) return true;
    const [x, y] = centroid(r.pts);
    return ![...near(r)].some((h) => inPoly(x, y, h.pts) || inPoly(...centroid(h.pts), r.pts) || coveredBy(r, h));
  });
}

// de binnenringen van binnenplaatsen.json in de OSM-gebouwen van de relaties (rij.osm = relatie-id)
export async function cutCourts(data, courts = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/world/binnenplaatsen.json'), 'utf8'))) {
  const { cutIslands } = await import('./build_corridor.mjs');
  let cut = 0;
  for (const b of data.buildings) {
    const rings = b.osm !== undefined && !isHandBuilding(b) ? courts[String(b.osm)] : null;
    if (!rings) continue;
    const pts = cutIslands(b.pts, rings);
    if (pts.length !== b.pts.length) { b.pts = pts; cut++; }
  }
  return cut;
}

// soort, hoogte en vlaggen van de bomen die de oude stad al had (stad_bomen.json, stad_bomen.mjs): de OSM-boom binnen 0,5 m krijgt ze.
// De regels van greenery.js kiezen anders (willekeurig per plek): de Vismarkt had een rij kers, de straten lindes, en dat blijft zo.
export async function treeSpecies(data, old = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/world/stad_bomen.json'), 'utf8'))) {
  const FILL = (await import('../../game/js/greenery.js')).TREE_FLAG.fill;
  const g = new Map();
  const key = (x, y) => Math.floor(x / 2) + ',' + Math.floor(y / 2);
  data.trees.forEach((t) => { if (!(t[4] & FILL)) (g.get(key(t[0], t[1])) || g.set(key(t[0], t[1]), []).get(key(t[0], t[1]))).push(t); });
  const done = new Set();
  let n = 0;
  for (const o of old) {
    let best = null, bd = 0.5;
    for (let dx = -2; dx <= 2; dx += 2) for (let dy = -2; dy <= 2; dy += 2) for (const t of g.get(key(o[0] + dx, o[1] + dy)) || []) { const d = Math.hypot(t[0] - o[0], t[1] - o[1]); if (d < bd && !done.has(t)) { bd = d; best = t; } }
    if (!best) continue;
    done.add(best);
    best[2] = o[2]; best[3] = o[3]; best[4] = o[4];
    n++;
  }
  return { oldTrees: n };
}

export async function treesClear(data, extras) {
  const GR = await import('../../game/js/greenery.js');
  const { createWaterIndex } = await import('../../game/js/waterindex.js');
  const { gameplayClearings, inClearing } = await import('./greenery.mjs');
  const FILL = GR.TREE_FLAG.fill;
  const cl = await gameplayClearings(data);
  const water = createWaterIndex(data.water || []);
  const roads = gridOf(data.roads || [], (r) => boundsOfPts(r.pts), 8);
  const rails = gridOf(data.rails || [], (r) => boundsOfPts(r.pts), 5);
  const buildings = gridOf([...(data.buildings || []), ...((extras && extras.buildings) || [])], (b) => boundsOfPts(b.pts), 3);
  const keep = (x, y) => {
    if (inClearing(cl, x, y)) return false;
    if (water.inWater(x, y) || water.nearestShore(x, y, 4).d < 1.5) return false;
    for (const r of roads.at(x, y)) {
      const hw = (r.width || 4) / 2 + (r.cat === 'foot' ? 1.2 : 2);
      for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i], r.pts[i + 1]) < hw) return false;
    }
    for (const b of buildings.at(x, y)) {
      if (inPoly(x, y, b.pts)) return false;
      for (let i = 0, j = b.pts.length - 1; i < b.pts.length; j = i++) if (segDist(x, y, b.pts[j], b.pts[i]) < 2.5) return false;
    }
    for (const r of rails.at(x, y)) for (let i = 0; i < r.pts.length - 1; i++) if (segDist(x, y, r.pts[i], r.pts[i + 1]) < 4) return false;
    return true;
  };
  const before = data.trees.length;
  data.trees = data.trees.filter((t) => !(t[4] & FILL) || keep(t[0], t[1]));
  return before - data.trees.length;
}

// data: de stadsdata met de OSM-lagen erin (muteert); extras: mapextras.json
export async function tidyCity(data, extras = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/mapextras.json'), 'utf8'))) {
  const stats = { extrasDup: 0, courts: 0, oldTrees: 0, treesDropped: 0 };
  {
    const n = data.buildings.length;
    data.buildings = dropOverlapped(data.buildings, [...data.buildings.filter(isHandBuilding), ...(extras.buildings || [])]);
    stats.extrasDup = n - data.buildings.length;
  }
  stats.courts = await cutCourts(data);
  Object.assign(stats, await treeSpecies(data));
  stats.treesDropped = await treesClear(data, extras);
  return stats;
}
