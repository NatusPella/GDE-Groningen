// De wegen en het spoor van de stad twee keer: uit citymap.json (A, de oude stad) en uit de OSM-tegelbouw
// (B, STAD_LAAG=roads,rails, stad_wegen.mjs), op de vragen die het spel stelt (#90, fase B3/B4).
//   node scripts/world/city_roads_diff.mjs [--lagen roads,rails] [--json] [--step 8]
//   STAD_LAAG_CACHE=<bestand> bewaart de OSM-bouw (4 minuten) voor een volgende run.
// Meet: aantal en lengte per klasse; geometrie (de monsters van A binnen 1/3 m van een weg van B, en andersom);
// hoogte langs de wegen en op een raster (groundHeightAt binnen 0,25/0,5/1 m); bruggen, tunnels, viaducten en
// beweegbare bruggen per stuk (op OSM-id); rijstroken; kruispunten (junctionModel: besturing en armen); de ring;
// spoor (lengte, stations, overwegen, routes, liften, perrons, spoorhoogte).
import '../node3d.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as P from './pack_tiles.mjs';
import { buildCityCover } from './citycover.mjs';
import { junctionModel } from '../../game/js/junctions.js';
import { isRingRoad } from '../../game/js/derive.js';
import { haveProvince } from './build_province.mjs';

const hyp = Math.hypot;
const len = (P) => { let s = 0; for (let i = 0; i < P.length - 1; i++) s += hyp(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); return s; };
const group = (r) => (r.cat === 'foot' || r.cat === 'cycle' ? r.cat : 'car');
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

function distToRoad(r, x, y) {
  let best = Infinity;
  const P = r.pts;
  for (let i = 0; i < P.length - 1; i++) {
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
    const d = hyp(P[i][0] + dx * t - x, P[i][1] + dy * t - y);
    if (d < best) best = d;
  }
  return best;
}
function nearestZ(r, x, y) {
  let bd = Infinity, bz = 0;
  const P = r.pts, Z = r.z;
  for (let i = 0; i < P.length - 1; i++) {
    const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - P[i][0]) * dx + (y - P[i][1]) * dy) / L2));
    const d = hyp(P[i][0] + dx * t - x, P[i][1] + dy * t - y);
    if (d < bd) { bd = d; bz = Z ? Z[i] + (Z[i + 1] - Z[i]) * t : 0; }
  }
  return [bd, bz];
}

// samples every `step` m along a road: [x, y]
function* samples(r, step) {
  const P = r.pts;
  let carry = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const L = hyp(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    if (L < 1e-6) continue;
    for (let d = carry; d < L; d += step) yield [P[i][0] + ((P[i + 1][0] - P[i][0]) * d) / L, P[i][1] + ((P[i + 1][1] - P[i][1]) * d) / L];
    carry = ((carry - L) % step + step) % step;
  }
}

const near = (map, x, y, rad, g) => map.roadsNear(x, y, rad).filter((r) => group(r) === g);

export function compare(A, B, { step = 8, cover = buildCityCover(A) } = {}) {
  const rep = {};
  const inCover = (r) => { const p = r.pts[Math.floor(r.pts.length / 2)]; return cover.inside(p[0], p[1]); };
  // 1. aantal en lengte per klasse, binnen de dekking
  const cnt = (map) => { const o = {}; for (const r of map.roads.filter(inCover)) { const c = (o[r.cat] = o[r.cat] || { n: 0, km: 0 }); c.n++; c.km += len(r.pts) / 1000; } for (const c of Object.values(o)) c.km = Math.round(c.km * 10) / 10; return o; };
  rep.klassen = { A: cnt(A), B: cnt(B) };
  // 2. geometrie: monsters van de ene binnen 1/3 m van een weg van dezelfde soort in de andere
  const geo = (X, Y) => {
    const o = { n: 0, w1: 0, w3: 0, perGroup: {} };
    for (const r of X.roads) {
      const g = group(r);
      const pg = (o.perGroup[g] = o.perGroup[g] || { n: 0, w1: 0, w3: 0 });
      for (const [x, y] of samples(r, step * 2)) {
        if (!cover.inside(x, y)) continue;
        let d = Infinity;
        for (const q of near(Y, x, y, 3.2, g)) d = Math.min(d, distToRoad(q, x, y));
        o.n++; pg.n++;
        if (d <= 1) { o.w1++; pg.w1++; }
        if (d <= 3) { o.w3++; pg.w3++; }
      }
    }
    for (const pg of [o, ...Object.values(o.perGroup)]) { pg.p1 = pct(pg.w1, pg.n); pg.p3 = pct(pg.w3, pg.n); }
    return o;
  };
  rep.geometrie = { oudInNieuw: geo(A, B), nieuwInOud: geo(B, A) };
  // 3. op OSM-id: vlaggen, rijstroken
  const byOsm = (map) => { const m = new Map(); for (const r of map.roads) if (r.osm !== undefined) (m.get(r.osm) || m.set(r.osm, []).get(r.osm)).push(r); return m; };
  const mA = byOsm(A), mB = byOsm(B);
  const flags = ['bridge', 'tunnel', 'viaduct', 'movable', 'layer', 'cutting', 'embankment'];
  const fl = Object.fromEntries(flags.map((f) => [f, { A: 0, gelijk: 0, ontbreekt: 0 }]));
  const lane = { paren: 0, lanes: 0, lanesFwd: 0, lanesBwd: 0, laneW: 0, width05: 0, oneway: 0, speed: 0, cat: 0, ref: 0 };
  const mid = (r) => r.pts[Math.floor(r.pts.length / 2)];
  const flagEx = [];
  for (const [id, as] of mA) {
    const bs = mB.get(id);
    for (const a of as) {
      if (!inCover(a)) continue;
      // het stuk van B dat bij a hoort: het dichtstbij
      let b = null, bd = 40;
      for (const q of bs || []) { const d = hyp(mid(q)[0] - mid(a)[0], mid(q)[1] - mid(a)[1]); if (d < bd) { bd = d; b = q; } }
      for (const f of flags) {
        if (!a[f]) continue;
        fl[f].A++;
        if (!b) fl[f].ontbreekt++;
        else if (JSON.stringify(a[f]) === JSON.stringify(b[f])) fl[f].gelijk++;
        else if (flagEx.length < 12 && f !== 'layer') flagEx.push([f, id, a.name, a[f], b[f]]);
      }
      if (b && group(a) === 'car') {
        lane.paren++;
        for (const k of ['lanes', 'lanesFwd', 'lanesBwd', 'laneW', 'oneway', 'speed', 'cat', 'ref']) if (JSON.stringify(a[k]) === JSON.stringify(b[k])) lane[k]++;
        if (Math.abs((a.width || 0) - (b.width || 0)) <= 0.5) lane.width05++;
      }
    }
  }
  rep.vlaggen = fl; rep.vlagVoorbeelden = flagEx;
  rep.rijstroken = { ...lane, ...Object.fromEntries(['lanes', 'lanesFwd', 'lanesBwd', 'laneW', 'width05', 'oneway', 'speed', 'cat', 'ref'].map((k) => ['p_' + k, pct(lane[k], lane.paren)])) };
  const ids = (m) => new Set([...m.keys()]);
  const iA = ids(mA), iB = ids(mB);
  rep.osmIds = { A: iA.size, B: iB.size, beide: [...iA].filter((i) => iB.has(i)).length, alleenA: [...iA].filter((i) => !iB.has(i)).length };
  // 3b. het handwerk van mapextras (busbanen, buslanen) en de wegen die er bij komen
  const hand = (m) => ({ busOnly: m.roads.filter((r) => r.busOnly).length, busway: m.roads.filter((r) => r.type === 'busway').length, busLane: m.roads.filter((r) => r.busLane).length, busContra: m.roads.filter((r) => r.busContra).length });
  rep.handwerk = { A: hand(A), B: hand(B) };
  // 4. hoogte: langs de wegen van A (op het dek van A) en op een raster
  const hz = (zs) => { const n = zs.length; const w = (t) => zs.filter((d) => d <= t).length; return { n, w25: pct(w(0.25), n), w50: pct(w(0.5), n), w100: pct(w(1), n), max: Math.round(Math.max(0, ...zs) * 100) / 100 }; };
  const dzAll = [], dzRing = [], dzProf = [], worst = [];
  for (const r of A.roads) {
    if (group(r) === 'foot' && !r.z) continue;
    for (const [x, y] of samples(r, step * 2)) {
      if (!cover.inside(x, y)) continue;
      const za = A.roadZAt(r, x, y);
      const zb = B.groundHeightAt(x, y, za);
      const d = Math.abs(za - zb);
      dzAll.push(d);
      if (isRingRoad(r)) dzRing.push(d);
      if (r.z) { dzProf.push(d); if (d > 1 && worst.length < 400) worst.push([r.osm, r.name, Math.round(x), Math.round(y), +za.toFixed(2), +zb.toFixed(2)]); }
    }
  }
  rep.hoogteLangsWegen = { alle: hz(dzAll), metProfiel: hz(dzProf), ring: hz(dzRing) };
  const wn = new Map(); for (const w of worst) { const k = `${w[1]}/${w[0]}`; wn.set(k, (wn.get(k) || 0) + 1); }
  rep.hoogteSlechtst = [...wn].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const dzGrid = [];
  const b0 = A.meta.bounds;
  for (let x = b0[0]; x < b0[2]; x += 25) for (let y = b0[1]; y < b0[3]; y += 25) if (cover.inside(x, y)) dzGrid.push(Math.abs(A.groundHeightAt(x, y) - B.groundHeightAt(x, y)));
  rep.hoogteRaster = hz(dzGrid);
  // 5. kruispunten
  const jA = [...junctionModel(A).values()], jB = [...junctionModel(B).values()];
  const grid = new Map();
  for (const j of jB) { const k = `${Math.floor(j.x / 20)},${Math.floor(j.y / 20)}`; (grid.get(k) || grid.set(k, []).get(k)).push(j); }
  let matched = 0, control = 0, arms = 0, rules = 0, lost = 0;
  const ctl = {};
  for (const a of jA) {
    if (!cover.inside(a.x, a.y)) continue;
    let b = null, bd = 4;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get(`${Math.floor(a.x / 20) + i},${Math.floor(a.y / 20) + j}`) || []) { const d = hyp(q.x - a.x, q.y - a.y); if (d < bd) { bd = d; b = q; } }
    if (!b) { lost++; continue; }
    matched++;
    const ck = `${a.control}>${b.control}`;
    ctl[ck] = (ctl[ck] || 0) + 1;
    if (a.control === b.control) control++;
    if (a.arms.length === b.arms.length) { arms++; const ra = a.arms.map((x) => x.rule).sort().join(), rb = b.arms.map((x) => x.rule).sort().join(); if (ra === rb) rules++; }
  }
  const jInA = jA.filter((j) => cover.inside(j.x, j.y)).length, jInB = jB.filter((j) => cover.inside(j.x, j.y)).length;
  const sig = (m) => m.meta.trafficLights.length;
  rep.kruispunten = { A: jInA, B: jInB, gekoppeld: matched, ontbreektInB: lost, besturingGelijk: pct(control, matched), armenGelijk: pct(arms, matched), regelsGelijk: pct(rules, matched), lichtenA: sig(A), lichtenB: sig(B), besturing: ctl };
  // 6. spoor
  const railKm = (m) => Math.round(m.rails.reduce((s, r) => s + len(r.pts), 0) / 100) / 10;
  const lc = (m) => m.levelCrossings.map((c) => [c.x, c.y]);
  const lcA = lc(A), lcB = lc(B);
  const dz = [];
  for (const r of A.rails) {
    for (let i = 0; i < r.pts.length; i += 3) {
      let bd = 3, bz = null;
      for (const q of B.rails) { const [d, z] = nearestZ(q, r.pts[i][0], r.pts[i][1]); if (d < bd) { bd = d; bz = z; } }
      if (bz !== null) dz.push(Math.abs((r.z ? r.z[i] : 0) - bz));
    }
  }
  rep.spoor = {
    km: { A: railKm(A), B: railKm(B) }, polylijnen: { A: A.rails.length, B: B.rails.length },
    stations: { A: A.stations.map((s) => `${s.name}@${Math.round(s.x)},${Math.round(s.y)}`), B: B.stations.map((s) => `${s.name}@${Math.round(s.x)},${Math.round(s.y)}`) },
    overwegen: { A: lcA.length, B: lcB.length, gekoppeld: lcA.filter((p) => lcB.some((q) => hyp(p[0] - q[0], p[1] - q[1]) < 30)).length },
    routes: { A: A.railRoutes.map((r) => [r.name, Math.round(len(r.pts)), r.stops.length]), B: B.railRoutes.map((r) => [r.name, Math.round(len(r.pts)), r.stops.length]) },
    liften: { A: A.railLifts.length, B: B.railLifts.length, gekoppeld: A.railLifts.filter((l) => B.railLifts.some((q) => hyp(l.x - q.x, l.y - q.y) < 30)).length },
    perrons: { A: (A.railPlatforms || []).length, B: (B.railPlatforms || []).length },
    hoogteLangsSpoor: hz(dz),
    metProfiel: { A: A.rails.filter((r) => r.z).length, B: B.rails.filter((r) => r.z).length },
  };
  return rep;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
  if (!haveProvince()) { console.log('geen provincie-extract in data/cache/province (GDE_PROVINCE_SRC)'); return; }
  const lagen = P.parseLagen(opt('lagen', process.env.STAD_LAAG || 'roads,rails'));
  const A = P.loadSources().map;
  const src = await P.loadSourcesLaag(undefined, lagen);
  const rep = compare(A, src.map, { step: Number(opt('step', 8)) });
  rep.verslag = src.report;
  if (args.includes('--json')) { console.log(JSON.stringify(rep)); return; }
  console.log(JSON.stringify(rep, null, 1));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
