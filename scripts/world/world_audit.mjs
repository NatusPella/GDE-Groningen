// Wereldaudit (21-11): props en gebouwen over de HELE provincie, uit de gebouwde tegels (game/world)
// en de plekkenbestanden. Eén pass, één ruimte-index, geen generator nodig. Telt:
//   trees / furniture / plekken op rijbaan, spoor, water of gebouw; gebouwen op water, weg of spoor;
//   waterplekken (haven, pier, kraan op de kade, ...) ver van water of op een weg of gebouw;
//   brugdekken zonder iets eronder; landmarkkits met een vorm die de OSM-tags niet dragen
//   (kerk zonder kerk-tags, station zonder spoor, museum zonder museum-tag, ...).
//
//   node scripts/world/world_audit.mjs [--strict] [--json] [--list] [--world <map>] [--max N]
//
// Drempels (CAPS): de gemeten stand na de fixes van 21-11, alleen dalen. Zonder tegels: SKIP.
// Hergebruik: loadTiles uit prop_conflict_audit (zelfde .gdt-lezer).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { worldDir } from '../lib/worldlocator.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
await import('../node3d.mjs');
const G = await import('../../game/js/gdt.js');
const SP = await import('../../game/js/streekplekken.js');
const { CAR_ROAD_CATS } = await import('../../game/js/pedgeom.js');
const WP = await import('../../game/js/waterplekken.js');
const PF = await import('../../game/js/propfilter.js');
const SFN = await import('../../game/js/streetfurniture.js');
const TC = await import('../../game/js/treeclear.js');
const K = await import('../../game/js/landmarkkit.js');

// Drempels: tellers die hoogstens zoveel mogen zijn (0 = nooit). Gemeten stand na de fixes; zie docs/WERELD-AUDIT-21-11.md.
export const CAPS = {
  // wat het spel NA zijn filters tekent (de kaartfilters van streetfurniture, treeclear, propfilter)
  furnitureOnRoadAfter: 0, furnitureOnRail: 0, treesOnRoadAfter: 0,
  streekPartsOnRoadAfter: 0, streekPartsOnRailAfter: 0, streekPartsInBuildingAfter: 0, parkPartsInBuildingAfter: 0,
  waterPartsOnRoadAfter: 0, waterPartsInBuildingAfter: 0, havenPartsFarFromWaterAfter: 0,
  missionPropsOnRoad: 0, missionPropsInBuilding: 0, missionCraneAwayFromWater: 0,
  landmarkMisclassified: 0, stationAwayFromRail: 0, perronAwayFromRail: 13, landmarkInWater: 1, stationFootprintOnRailAfter: 0, stationFootprintOnRoadAfter: 0, stationFootprintInBuildingAfter: 0,
  // geen kit maar een gegeven: wat een herbouw van de tegels vraagt (rapport)
  buildingsInWater: 7, buildingsOnRoad: 146, buildingsInWaterAfter: 2, buildingsOnRoadAfter: 18, buildingsOnRail: 0, bridgesOverNothing: 145, bridgesRaisedOverNothing: 16,
  treesInWater: 83, treesInBuilding: 36, furnitureInWater: 80, furnitureInBuilding: 44,
};

// ---------------------------------------------------------------- ruimte-index

const key = (cx, cy) => (cx + 4096) * 8192 + (cy + 4096);
class SegGrid {
  constructor(cell = 64) { this.c = cell; this.m = new Map(); }
  addLine(f, pts) {
    const c = this.c, seen = new Set();
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (c / 2)));
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n;
        const kk = key(Math.floor(x / c), Math.floor(y / c));
        if (seen.has(kk)) continue;
        seen.add(kk);
        const l = this.m.get(kk); if (l) l.push(f); else this.m.set(kk, [f]);
      }
    }
  }
  near(x, y, r) {
    const c = this.c, out = new Set();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((y - r) / c); j <= Math.floor((y + r) / c); j++) { const l = this.m.get(key(i, j)); if (l) for (const f of l) out.add(f); }
    return out;
  }
}
class PolyGrid {
  constructor(cell = 128) { this.c = cell; this.m = new Map(); }
  add(f, pts) {
    let a = Infinity, b = Infinity, c2 = -Infinity, d = -Infinity;
    for (const p of pts) { if (p[0] < a) a = p[0]; if (p[0] > c2) c2 = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
    f.bb = [a, b, c2, d];
    const c = this.c;
    for (let i = Math.floor(a / c); i <= Math.floor(c2 / c); i++) for (let j = Math.floor(b / c); j <= Math.floor(d / c); j++) { const kk = key(i, j), l = this.m.get(kk); if (l) l.push(f); else this.m.set(kk, [f]); }
  }
  near(x, y, r) {
    const c = this.c, out = new Set();
    for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((y - r) / c); j <= Math.floor((y + r) / c); j++) { const l = this.m.get(key(i, j)); if (l) for (const f of l) if (x >= f.bb[0] - r && x <= f.bb[2] + r && y >= f.bb[1] - r && y <= f.bb[3] + r) out.add(f); }
    return out;
  }
}

const segDist = (x, y, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
  return Math.hypot(ax + dx * t - x, ay + dy * t - y);
};
const lineDist = (x, y, pts) => { let d = Infinity; for (let i = 0; i < pts.length - 1; i++) { const e = segDist(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (e < d) d = e; } return d; };
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const centroid = (P) => { let x = 0, y = 0; const n = P.length - (P.length > 1 && P[0][0] === P[P.length - 1][0] && P[0][1] === P[P.length - 1][1] ? 1 : 0); for (let i = 0; i < n; i++) { x += P[i][0]; y += P[i][1]; } return [x / n, y / n]; };
const segsCross = (a, b, c, d) => {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};

// ---------------------------------------------------------------- wereld laden

export function loadWorld(out) {
  const index = JSON.parse(fs.readFileSync(path.join(out, 'index-provincie.json'), 'utf8'));
  const W = { roads: new SegGrid(), rails: new SegGrid(), water: new PolyGrid(), builds: new PolyGrid(), bridges: [], trees: [], furn: [], buildingRows: [], roadRows: [], heights: new Map(), tiles: 0 };
  const fds = new Map();
  for (const k of Object.keys(index.tiles)) {
    const t = index.tiles[k], f = index.packs[t.pack].file;
    if (!fds.has(f)) fds.set(f, fs.openSync(path.join(out, f), 'r'));
    const buf = Buffer.alloc(t.len);
    fs.readSync(fds.get(f), buf, 0, t.len, t.off);
    const blob = G.decodeBlob(new Uint8Array(zlib.inflateRawSync(buf)));
    W.tiles++;
    for (const s of blob.sections) {
      if (s.type === G.SECTION.ROADS) for (const r of s.rows) {
        if (!r.pts || r.pts.length < 2) continue;
        if (r.bridge) { W.bridges.push(r); continue; }
        if (r.tunnel || r.layer < 0) continue;
        W.roads.addLine(r, r.pts); W.roadRows.push(r);
      } else if (s.type === G.SECTION.RAILS) for (const r of s.rows) { if (r.pts && r.pts.length > 1 && !r.tunnel && !(r.layer < 0)) W.rails.addLine(r, r.pts); }
      else if (s.type === G.SECTION.WATER) for (const r of s.rows) { if (r.pts && r.pts.length > 2) W.water.add(r, r.pts); }
      else if (s.type === G.SECTION.BUILDINGS) for (const r of s.rows) { if (r.pts && r.pts.length > 2) { W.builds.add(r, r.pts); W.buildingRows.push(r); } }
      else if (s.type === G.SECTION.TREES) for (const r of s.rows) for (const p of r.p || []) W.trees.push([p[0], p[1], r.s]);
      else if (s.type === G.SECTION.HEIGHTS) for (const r of s.rows) { if (r.z && r.z.length) W.heights.set(r.gid, r.z); }
      else if (s.type === G.SECTION.FURNITURE) for (const r of s.rows) if (r.pts && r.pts.length) W.furn.push(r);
    }
  }
  for (const fd of fds.values()) fs.closeSync(fd);
  return W;
}

// de vragen
export function judgeWorld(W) {
  return {
    // rijbaan: alleen autowegen op maaiveld (zoals de generatoren ze kennen)
    onRoad: (x, y, m = 0) => { for (const r of W.roads.near(x, y, 12)) { if (!CAR_ROAD_CATS.includes(r.cat)) continue; if (lineDist(x, y, r.pts) < (r.width || 4) / 2 + m) return r; } return null; },
    onRail: (x, y) => { for (const r of W.rails.near(x, y, 4)) if (lineDist(x, y, r.pts) < 2.1) return r; return null; },
    railDist: (x, y, R) => { let d = Infinity; for (const r of W.rails.near(x, y, R)) d = Math.min(d, lineDist(x, y, r.pts)); return d; },
    inWater: (x, y) => { for (const w of W.water.near(x, y, 0)) if (inPoly(x, y, w.pts)) return w; return null; },
    // afstand tot water (0 binnen), tot R
    waterDist: (x, y, R) => {
      let d = Infinity;
      for (const w of W.water.near(x, y, R)) { if (inPoly(x, y, w.pts)) return 0; d = Math.min(d, lineDist(x, y, w.pts)); }
      return d;
    },
    inBuilding: (x, y) => { for (const b of W.builds.near(x, y, 0)) if (inPoly(x, y, b.pts)) return b; return null; },
  };
}

// een kaart in de vorm van TileWorld voor de filters van het spel (roadsNear, buildingsNear, waterNear)
export function mapShim(W) {
  const withB = (o) => { if (!o.bounds) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of o.pts) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; } o.bounds = [a, b, c, d]; } return o; };
  return {
    roadsNear: (x, y, r) => [...W.roads.near(x, y, r)].map(withB),
    buildingsNear: (x, y, r) => [...W.builds.near(x, y, r)].map(withB),
    waterNear: (x, y, r) => [...W.water.near(x, y, r)].map(withB),
    railNear: (x, y, r) => [...W.rails.near(x, y, r)].map(withB),
  };
}

// ---------------------------------------------------------------- de controles

const FURN_CHECK = new Set(['bench', 'bin', 'bikerack', 'lamp', 'postbox', 'shelter', 'stop']);
const FURN_PLATFORM = new Set(['bench', 'shelter', 'stop', 'bin', 'lamp', 'bikerack']); // staan terecht naast spoor op een perron: alleen op het spoor zelf telt

// kit-vorm tegen OSM-tags: wat de tags niet dragen, is een foute classificatie
export function kitTagsOk(it) {
  const t = it.t || {}, n = (it.n || '').toLowerCase();
  const rel = t.religion || t.amenity === 'place_of_worship' || t.building === 'church' || t.building === 'chapel' || t.building === 'cathedral' || t.building === 'mosque' || t.building === 'synagogue' || t.building === 'temple' || t.building === 'monastery' || t.historic === 'church' || t.historic === 'monastery' || t.man_made === 'bell_tower' || t.man_made === 'campanile' || t.building === 'bell_tower';
  switch (it.k) {
    case 'church': return !!(rel || /kerk|kapel|dom|cathedr|basiliek|kloos|abdij/.test(n));
    case 'chapel': return !!(rel || /kapel|chapel/.test(n));
    case 'station': return !!(t.railway === 'station' || t.railway === 'halt' || t.building === 'train_station' || t.public_transport);
    case 'museum': return !!(t.tourism === 'museum' || t.amenity === 'museum' || /museum/.test(n));
    case 'school': return !!(t.amenity === 'school' || t.amenity === 'college' || t.amenity === 'university' || t.building === 'school' || t.building === 'college' || t.building === 'university' || t.building === 'kindergarten' || /school|college|universiteit/.test(n));
    case 'townhall': return !!(t.amenity === 'townhall' || t.building === 'civic' || t.building === 'government' || t.office === 'government' || /stadhuis|gemeentehuis|raadhuis/.test(n));
    case 'lighthouse': return !!(t.man_made === 'lighthouse' || /vuurtoren/.test(n));
    case 'mill': return !!(t.man_made === 'windmill' || t.man_made === 'watermill' || t.building === 'mill' || t.building === 'windmill' || t.industrial === 'mill' || t.mill === 'yes' || /molen|mill/.test(n) || t.historic === 'windmill' || t.historic === 'watermill');
    case 'watertower': return !!(t.man_made === 'water_tower' || t.man_made === 'tower' || /watertoren/.test(n));
    case 'castle': return !!(t.historic === 'castle' || t.castle_type || t.historic === 'manor' || t.historic === 'fort' || /borg|kasteel|state|slot|fort|havezate/.test(n));
    default: return true;
  }
}

export async function runAudit(out, { list = false } = {}) {
  const W = loadWorld(out);
  const J = judgeWorld(W);
  const R = { tiles: W.tiles, counts: {}, total: {}, samples: {} };
  const add = (k, info) => { R.counts[k] = (R.counts[k] || 0) + 1; (R.samples[k] || (R.samples[k] = [])).length < 12 && R.samples[k].push(info); };
  const tot = (k, n = 1) => { R.total[k] = (R.total[k] || 0) + n; };

  const M = mapShim(W);
  // 1. straatmeubilair: ruwe OSM-rijen en wat spotFreeOnMap (streetfurniture3d) ervan overlaat
  for (const f of W.furn) {
    if (!FURN_CHECK.has(f.k)) continue;
    const [x, y] = f.pts[0]; tot('furniture');
    const r = J.onRoad(x, y);
    if (r) { add('furnitureOnRoadRaw', [f.k, Math.round(x), Math.round(y), r.name || r.type]); if (SFN.spotFreeOnMap(M, x, y, f.k === 'lamp' ? { house: SFN.LAMP_AWNING } : undefined)) add('furnitureOnRoadAfter', [f.k, Math.round(x), Math.round(y), r.name || r.type]); }
    if (J.onRail(x, y) && SFN.spotFreeOnMap(M, x, y)) add('furnitureOnRail', [f.k, Math.round(x), Math.round(y)]);
    if (J.inWater(x, y)) add('furnitureInWater', [f.k, Math.round(x), Math.round(y)]);
    if (J.inBuilding(x, y)) add('furnitureInBuilding', [f.k, Math.round(x), Math.round(y)]);
  }
  // 2. bomen uit OSM: treeBesideRoad (treeclear.js) zet of haalt weg wat op de rijbaan staat
  for (const [x, y, sp] of W.trees) {
    tot('trees');
    if (J.onRoad(x, y)) {
      add('treesOnRoadRaw', [sp, Math.round(x), Math.round(y)]);
      const p = TC.treeBesideRoad(M, x, y);
      if (p && J.onRoad(p[0], p[1])) add('treesOnRoadAfter', [sp, Math.round(x), Math.round(y)]);
    }
    if (J.inWater(x, y)) add('treesInWater', [sp, Math.round(x), Math.round(y)]);
    if (J.inBuilding(x, y)) add('treesInBuilding', [sp, Math.round(x), Math.round(y)]);
  }
  // 3. gebouwen
  for (const b of W.buildingRows) {
    tot('buildings');
    if (b.type === 'roof' || b.type === 'houseboat' || b.type === 'static_caravan' || b.type === 'dock') continue;
    const [cx, cy] = centroid(b.pts);
    const w = J.inWater(cx, cy);
    if (w) add('buildingsInWater', [b.type, b.name, Math.round(cx), Math.round(cy), w.kind]);
    const r = J.onRoad(cx, cy); if (r) add('buildingsOnRoad', [b.type, b.name, Math.round(cx), Math.round(cy), r.name || r.type]);
    if (J.onRail(cx, cy)) add('buildingsOnRail', [b.type, b.name, Math.round(cx), Math.round(cy)]);
    // wat het spel bij het laden van de tegel overlaat (propfilter.misplacedBuilding, tileworld.js addTileSteps)
    const mp = PF.misplacedBuilding(M, b);
    if (w && !mp) add('buildingsInWaterAfter', [b.type, b.name, Math.round(cx), Math.round(cy), w.kind]);
    if (r && !mp) add('buildingsOnRoadAfter', [b.type, b.name, Math.round(cx), Math.round(cy), r.name || r.type]);
  }
  // 4. brugdekken zonder iets eronder: water, spoor of een andere weg. Per OSM-weg beoordeeld (een weg is aan de
  //    tegelgrenzen in rijen geknipt; steun in een van de rijen telt voor de hele weg). Vlak (z <= 2,2 m: een brug over
  //    een sloot of pad, het dek ligt op de grond) is onschuldig; verhoogd zonder iets eronder vraagt pijlers
  //    (roadstructures3d + bridge_support_test).
  const byWay = new Map();
  for (const r of W.bridges) { if (r.pts.length < 2) continue; const k = r.osm || 'g' + r.gid; const l = byWay.get(k); if (l) l.push(r); else byWay.set(k, [r]); }
  const supported = (r) => {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
      for (let k = 0; k <= n; k++) {
        const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
        if (J.waterDist(x, y, 6) < 6 || J.railDist(x, y, 8) < 8) return true;
      }
      for (const o of W.roads.near((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 40)) for (let j = 0; j < o.pts.length - 1; j++) if (segsCross(a, b, o.pts[j], o.pts[j + 1])) return true;
    }
    return false;
  };
  for (const rows of byWay.values()) {
    tot('bridges');
    if (rows.some(supported)) continue;
    const r = rows[0], [mx, my] = r.pts[Math.floor(r.pts.length / 2)];
    const zmax = Math.max(0, ...rows.map((q) => Math.max(0, ...(W.heights.get(q.gid) || [0]))));
    add('bridgesOverNothing', [r.cat, r.name, Math.round(mx), Math.round(my), Math.round(r.pts.length)]);
    if (zmax > 2.2) add('bridgesRaisedOverNothing', [r.cat, r.name, Math.round(mx), Math.round(my), +zmax.toFixed(1)]);
  }
  // 5. streekplekken: de onderdelen (partsToWorld) voor en na dropStreekParts; parken eerst door dropOnRoad (zoals het spel)
  const sp = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/streekplekken.json'), 'utf8')).plekken;
  for (const p of sp) {
    tot('plekken');
    const raw = SP.partsToWorld(p);
    const pre = p.t === 'park' ? SP.dropOnRoad(raw, (x, y) => !!J.onRoad(x, y)) : raw;
    for (const q of raw) { if (q.h >= 0.1 && J.onRoad(q.x, q.z)) add('streekPartsOnRoadRaw', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]); }
    for (const q of PF.dropStreekParts(pre, M, p.t)) {
      if (q.h < 0.1) continue;
      if (J.onRoad(q.x, q.z)) add('streekPartsOnRoadAfter', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
      if (p.t !== 'perron' && J.inBuilding(q.x, q.z)) add(p.t === 'park' ? 'parkPartsInBuildingAfter' : 'streekPartsInBuildingAfter', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    }
    for (const q of pre) if (q.h >= 0.1 && p.t !== 'perron' && J.inBuilding(q.x, q.z)) add('streekPartsInBuildingRaw', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    for (const q of raw) if (q.h >= 0.1 && J.onRail(q.x, q.z)) add('streekPartsOnRailRaw', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    for (const q of PF.dropStreekParts(pre, M, p.t)) if (q.h >= 0.1 && J.onRail(q.x, q.z)) add('streekPartsOnRailAfter', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    if (p.t === 'perron') {
      // een perron is lang en kan buigen: een van de punten langs zijn as ligt bij het spoor
      const c = Math.cos(p.a || 0), sn = Math.sin(p.a || 0); let d = Infinity;
      for (const f of [-0.45, -0.25, 0, 0.25, 0.45]) d = Math.min(d, J.railDist(p.x + c * f * (p.l || 0), p.y + sn * f * (p.l || 0), 40));
      if (d > 15) add('perronAwayFromRail', [p.sub, Math.round(p.x), Math.round(p.y), Math.round(p.l || 0)]);
    }
  }
  // 6. waterplekken: onderdelen voor en na dropWaterParts; een kade, pier of kraan hoort aan water
  const wp = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/waterplekken.json'), 'utf8')).plekken;
  for (const p of wp) {
    tot('waterplekken');
    const raw = WP.partsToWorld(p);
    const road = p.t !== 'brug' && p.t !== 'sluis' && p.t !== 'sluisdeur' && p.t !== 'stuw' && p.t !== 'dijk' && p.t !== 'helling';
    const far = PF.WATER_REACH[p.t];
    for (const q of raw) {
      if (road && J.onRoad(q.x, q.z)) add('waterPartsOnRoadRaw', [p.t, Math.round(q.x), Math.round(q.z)]);
      if (road && J.inBuilding(q.x, q.z)) add('waterPartsInBuildingRaw', [p.t, Math.round(q.x), Math.round(q.z)]);
      if (far && J.waterDist(q.x, q.z, far + 2) > far) add('havenPartsFarFromWaterRaw', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    }
    for (const q of PF.dropWaterParts(raw, M, p)) {
      if (road && J.onRoad(q.x, q.z)) add('waterPartsOnRoadAfter', [p.t, Math.round(q.x), Math.round(q.z)]);
      if (road && J.inBuilding(q.x, q.z)) add('waterPartsInBuildingAfter', [p.t, Math.round(q.x), Math.round(q.z)]);
      if (far && J.waterDist(q.x, q.z, far + 2) > far) add('havenPartsFarFromWaterAfter', [p.t, p.sub, Math.round(q.x), Math.round(q.z)]);
    }
  }
  // 6b. het vaste plan van M13 (containerplan.js): kade, kraan, stapels en rollen
  const CP = await import('../../game/js/containerplan.js');
  {
    const prop = (name, x, y, rad) => {
      for (const [dx, dy] of [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad]]) {
        if (J.onRoad(x + dx, y + dy, 0.3)) { add('missionPropsOnRoad', [name, Math.round(x), Math.round(y)]); break; }
      }
      if (J.inBuilding(x, y) || J.inWater(x, y)) add('missionPropsInBuilding', [name, Math.round(x), Math.round(y)]);
    };
    prop('kade', CP.M13_QUAY.x, CP.M13_QUAY.y, 2); prop('lammert', CP.M13_LAMMERT.x, CP.M13_LAMMERT.y, 2);
    prop('kraan', CP.M13_CRANE.x, CP.M13_CRANE.y, 4);
    CP.CONTAINER_STACKS.forEach((c, i) => prop('stapel' + i, c.x, c.y, c.lengte / 2));
    CP.CABLE_REELS.forEach((c, i) => prop('rol' + i, c.x, c.y, c.r));
    if (J.waterDist(CP.M13_CRANE.x, CP.M13_CRANE.y, 60) > 25) add('missionCraneAwayFromWater', ['kraan', Math.round(CP.M13_CRANE.x), Math.round(CP.M13_CRANE.y)]);
    tot('missionProps', 4 + CP.CONTAINER_STACKS.length + CP.CABLE_REELS.length);
  }
  // 7. landmarkkits tegen hun OSM-tags en hun plek
  const lm = JSON.parse(fs.readFileSync(path.join(ROOT, 'game/landmarkkits.json'), 'utf8')).items;
  for (const it of lm) {
    tot('landmarks');
    if (!kitTagsOk(it)) add('landmarkMisclassified', [it.k, it.n, JSON.stringify(it.t).slice(0, 120)]);
    if (it.k === 'station' && !it.o) {
      // het spel zet het gebouw met stationFit (propfilter.js) naast het spoor; voor de fix stond het met willekeurige hoek op het punt
      const foot = (p, tag) => {
        const c = Math.cos(p.angle || 0), sn = Math.sin(p.angle || 0); let rail = 0, road = 0, bld = 0, n = 0;
        for (let u = -p.len / 2; u <= p.len / 2; u += 2) for (let v = -p.wid / 2; v <= p.wid / 2; v += 2) { const x = p.x + u * c - v * sn, y = p.y + u * sn + v * c; n++; if (J.onRail(x, y)) rail++; if (J.onRoad(x, y)) road++; if (J.inBuilding(x, y)) bld++; }
        if (rail / n > 0.10) add('stationFootprintOnRail' + tag, [it.n, Math.round(it.x), Math.round(it.y), Math.round((rail / n) * 100) + '%']);
        if (road / n > 0.05) add('stationFootprintOnRoad' + tag, [it.n, Math.round(it.x), Math.round(it.y), Math.round((road / n) * 100) + '%']);
        if (bld / n > 0.15) add('stationFootprintInBuilding' + tag, [it.n, Math.round(it.x), Math.round(it.y), Math.round((bld / n) * 100) + '%']);
      };
      const raw = K.landmarkParams(it);
      if (raw) foot(raw, 'Raw');
      const fit = PF.stationFit(M, it);
      if (fit && fit !== 'tile') foot({ ...raw, ...fit }, 'After');
    }
    if (it.k === 'station' && J.railDist(it.x, it.y, 150) > 120) add('stationAwayFromRail', [it.n, Math.round(it.x), Math.round(it.y)]);
    if (J.inWater(it.x, it.y) && it.k !== 'lighthouse') add('landmarkInWater', [it.k, it.n, Math.round(it.x), Math.round(it.y)]);
    const r = it.k === 'station' ? null : J.onRoad(it.x, it.y, -2); if (r) add('landmarkOnRoad', [it.k, it.n, Math.round(it.x), Math.round(it.y), r.name || r.type]);
  }
  return R;
}

export function overCaps(R) {
  const bad = [];
  for (const [k, max] of Object.entries(CAPS)) if ((R.counts[k] || 0) > max) bad.push(`${k}: ${R.counts[k]} (hoogstens ${max})`);
  return bad;
}

async function main() {
  const args = process.argv.slice(2);
  const wi = args.indexOf('--world');
  const out = wi >= 0 ? path.resolve(args[wi + 1]) : worldDir();
  if (!fs.existsSync(path.join(out, 'index-provincie.json'))) { console.log('SKIP geen game/world met de provinciegegevens'); return; }
  const R = await runAudit(out);
  if (args.includes('--json')) console.log(JSON.stringify(R));
  else {
    console.log(`${R.tiles} tegels; geteld: ${Object.entries(R.total).map(([k, v]) => k + ' ' + v).join(', ')}`);
    for (const [k, v] of Object.entries(R.counts).sort()) {
      console.log(`${k.padEnd(26)} ${String(v).padStart(7)}${CAPS[k] !== undefined && CAPS[k] < 1e9 ? `  (max ${CAPS[k]})` : ''}`);
      if (args.includes('--list')) for (const s of R.samples[k]) console.log('    ' + JSON.stringify(s));
    }
  }
  if (args.includes('--strict')) {
    const bad = overCaps(R);
    for (const m of bad) console.log('TE VEEL ' + m);
    if (bad.length) process.exit(1);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
