// Wegen en spoor van de stad uit de gedeelde OSM-tegelbouw (#90 fase B3/B4, STAD_LAAG=roads,rails).
//
// De tegels knippen een weg in stukken van een tegel; de stad heeft hele wegen met hoogteprofiel. Daarom
// luistert deze module mee in buildProvince (`collect`: de hele wegen en sporen van een pack, ná de afleiding
// en het koppelen van de verkeerslichten) en doet daarna wat build_map.py deed, in JS:
//
//   wegen      knippen op de dekking van de stad (de overlaytegels dekken de rest), stadssnelheid
//   hoogtes    ring_elevation.mjs (add_elevation.py) > profile.mjs (de oplosser) > railprofile.mjs > profile.mjs > railprofile.mjs
//   spoor      stad_spoor.mjs (add_railways.py: sporen, stations, overwegen, routes, liften, paden afgeknipt bij het spoor)
//   handwerk   mapextras (busRoads, busLanes, roadZ) komt via applyMapExtras op de OSM-wegen, op coördinaat;
//              de busbanen en beschermde wegen gaan mee in de oplosser zoals bij de oude keten
//   lichten    meta.trafficLights uit de OSM-knopen (junction_tiles.mjs snapSignals)
import { ROAD_SPEC, LANE_W } from '../../game/js/worldbuilder.js';
import { SpatialGrid } from '../../game/js/spatialgrid.js';
import { waterPolyIn } from '../../game/js/waterlevels.js';
import { polygonBounds } from '../../game/js/util.js';
import { wgsToWorld } from '../../game/js/rdnew.js';
import { ringHeights, railItemsFrom } from './ring_elevation.mjs';
import { cityRail, cutPathsAtRails } from './stad_spoor.mjs';
import { dropDuplicateBridges } from './bridgededupe.mjs';
import * as PR from './profile.mjs';
import * as RP from './railprofile.mjs';
import { derivePerrons } from './perrons.mjs';
import { solveTerrainRoads, ahnTerrain } from './terrain_solve.mjs';

const RING_TYPES = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link']);

// ------------------------------------------------------------------ verzamelen

// collect-haak voor buildProvince; result(): { roads, lights, elements } zonder dubbelen van twee packs
export function collector() {
  const roads = [], seen = new Set(), lights = [], seenLight = new Set(), elements = [], seenEl = new Set();
  return {
    collect(feats, info) {
      for (const f of feats) {
        if (f.kind !== 'roads') continue;
        const key = `${f.row.osm}:${f.row.pts[0][0]},${f.row.pts[0][1]}`;
        if (f.row.osm !== undefined && seen.has(key)) continue;
        seen.add(key);
        roads.push(f.row);
      }
      for (const l of info.lights) {
        const k = `${l.x},${l.y}`;
        if (!seenLight.has(k)) { seenLight.add(k); lights.push(l); }
      }
      for (const el of info.els) {
        const t = el.tags || {};
        if (!t.railway && t.public_transport !== 'platform') continue;
        const id = el.type + el.id;
        if (seenEl.has(id)) continue;
        seenEl.add(id);
        elements.push(el);
      }
    },
    result: () => ({ roads, lights, elements }),
  };
}

// ------------------------------------------------------------------ wegen

// een weg van de OSM-bouw als rij van de stadskaart: de stad kende geen dorpssnelheid en geen _-sleutels
export function cityRoadRow(row) {
  const out = {};
  for (const k of Object.keys(row)) if (k[0] !== '_' && row[k] !== undefined) out[k] = k === 'pts' ? row[k].map((p) => p.slice()) : row[k];
  // (OSM kent ways met een knoop die twee keer achter elkaar staat: een lijnstuk van nul meter geeft het kruispuntmodel een extra arm)
  out.pts = out.pts.filter((p, i) => i === 0 || p[0] !== out.pts[i - 1][0] || p[1] !== out.pts[i - 1][1]);
  const spec = ROAD_SPEC[row.type];
  if (spec) out.speed = spec.speed;
  return out;
}

// De stukken van een weg binnen de dekking (binnen(x, y)): alleen daar knippen waar een stuk de rand kruist, de
// hoekpunten blijven, zodat de weg niet verdicht wordt. Het stuk dat buiten valt is aan de overlaytegels.
export function cutToCover(roads, inside, step = 10) {
  const out = [];
  for (const r of roads) {
    const P = r.pts;
    const ins = P.map((p) => inside(p[0], p[1]));
    let allIn = true;
    for (let i = 0; i < P.length - 1 && allIn; i++) {
      if (!ins[i] || !ins[i + 1]) { allIn = false; break; }
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
      for (let t = 1; t < n; t++) if (!inside(ax + ((bx - ax) * t) / n, ay + ((by - ay) * t) / n)) { allIn = false; break; }
    }
    if (allIn) { out.push(r); continue; }
    let run = null;
    const flush = () => { if (run && run.length > 1) out.push({ ...r, pts: run }); run = null; };
    // (nooit twee gelijke punten achter elkaar: een wisselpunt kan op een hoekpunt vallen)
    const add = (q) => { if (!run) run = []; const l = run[run.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) run.push(q); };
    for (let i = 0; i < P.length; i++) {
      if (i > 0) {
        // binnen het stuk i-1 -> i: waar de status wisselt, het wisselpunt (op `step` m)
        const [ax, ay] = P[i - 1], [bx, by] = P[i];
        const n = Math.ceil(Math.hypot(bx - ax, by - ay) / step);
        let state = ins[i - 1];
        for (let t = 1; t <= n; t++) {
          const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
          const s = t === n ? ins[i] : inside(x, y);
          if (s === state) continue;
          const q = [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
          if (state) { if (!run) add(P[i - 1]); add(q); flush(); } else { run = null; add(q); }
          state = s;
        }
        if (state) { if (!run) add(P[i - 1]); add(P[i]); }
        else run = null;
      } else if (ins[0]) add(P[0]);
    }
    flush();
  }
  return out;
}

// Een eenrichtingsweg (secondary, tertiary) is een rijbaan van een dubbele weg als een parallelle weg de andere kant op loopt
// (worldbuilder.js dualCarriageways), maar dat wordt op het midden van elk stuk getest: een straat in stukken had stukken met de
// breedte van zijn rijstroken (5 m voor een strook) en stukken met de klassebreedte (8 m), een stap in de stoeprand waar ze
// samenkomen (road_seams.mjs widthJump, #130). Een stuk dat met dezelfde naam aansluit op een stuk met de gemodelleerde breedte
// krijgt die breedte ook, tenzij een breedtetag het anders zegt. lanes.py chain_duals; geeft het aantal gewijzigde wegen.
const CAR_CATS = new Set(['major', 'normal', 'minor']);
const modelledWidth = (r) => Math.round((r.lanesFwd * (r.laneW !== undefined ? r.laneW : LANE_W[r.type] !== undefined ? LANE_W[r.type] : 3.0) + ONEWAY_EXTRA[r.type]) * 100) / 100;
const ONEWAY_EXTRA = { secondary: 2.0, tertiary: 2.0 };
export function chainDuals(roads) {
  const cand = roads.filter((r) => r.oneway && !r.roundabout && CAR_CATS.has(r.cat) && (r.type === 'secondary' || r.type === 'tertiary') && r.name && r.lanesFwd);
  const k = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const ends = new Map();
  cand.forEach((r, i) => { for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const key = k(p); if (!ends.has(key)) ends.set(key, []); ends.get(key).push(i); } });
  const parent = cand.map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (const ids of ends.values()) if (ids.length === 2 && ids[0] !== ids[1] && cand[ids[0]].name === cand[ids[1]].name) parent[find(ids[0])] = find(ids[1]);
  const model = new Map();
  cand.forEach((r, i) => { if (r.widthSrc === 'lanes' && Math.abs(r.width - modelledWidth(r)) < 0.01) { const g = find(i); if (!model.has(g)) model.set(g, new Set()); model.get(g).add(i); } });
  let n = 0;
  cand.forEach((r, i) => {
    const g = find(i);
    if (!model.has(g) || model.get(g).has(i) || r.widthSrc === 'tag') return;
    const w = modelledWidth(r);
    if (Math.abs(r.width - w) > 0.01) { r.width = w; r.widthSrc = 'lanes'; n++; }
  });
  return n;
}

// Een wegeinde dat 0,3 tot 4 m naast de lijn van een andere weg op hetzelfde niveau ophoudt, zonder die te raken, laat een reep gras
// tussen beide (road_seams.mjs gap): OSM heeft de twee niet aan elkaar geknoopt (de twee rijbanen van de Peizerweg, een zandpad dat bij
// de Godekenheerd net naast de straat eindigt). Het einde loopt door tot op die lijn en de aansluiting wordt een gedeeld hoekpunt van
// beide wegen (een T-kruising); het snijpunt valt binnen een halve meter van een bestaand hoekpunt: dan dat hoekpunt. Draait vóór de
// hoogtes (de wegen hebben dan nog geen profiel). Geeft het aantal gesloten gaten.
const GAP_MAX = 4, GAP_MIN = 0.3;
export function closeGaps(roads) {
  const car = roads.filter((r) => CAR_CATS.has(r.cat) && r.pts.length > 1);
  const level = (r) => r.layer ?? (r.tunnel ? -1 : r.bridge ? 1 : 0);
  const k = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const nodes = new Map();
  const note = (r, p) => { const key = k(p); let l = nodes.get(key); if (!l) nodes.set(key, l = new Set()); l.add(r); };
  for (const r of car) for (const p of r.pts) note(r, p);
  const G = 16, grid = new Map();
  const cellsOf = (a, b) => { const out = []; for (let gx = Math.floor((Math.min(a[0], b[0]) - GAP_MAX) / G); gx <= Math.floor((Math.max(a[0], b[0]) + GAP_MAX) / G); gx++) for (let gy = Math.floor((Math.min(a[1], b[1]) - GAP_MAX) / G); gy <= Math.floor((Math.max(a[1], b[1]) + GAP_MAX) / G); gy++) out.push(gx * 100003 + gy); return out; };
  for (const r of car) for (let i = 0; i < r.pts.length - 1; i++) for (const c of cellsOf(r.pts[i], r.pts[i + 1])) { let l = grid.get(c); if (!l) grid.set(c, l = []); l.push(r); }
  const proj = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)); const q = [a[0] + dx * t, a[1] + dy * t]; return { q, d: Math.hypot(q[0] - p[0], q[1] - p[1]) }; };
  let closed = 0;
  for (const r of car) {
    for (const atEnd of [false, true]) {
      const p = atEnd ? r.pts[r.pts.length - 1] : r.pts[0];
      if ([...(nodes.get(k(p)) || [])].some((o) => o !== r)) continue;
      let best = null;
      // (de weg loopt door: de verlenging wijkt hooguit 60 graden af van de richting van het einde; anders is het een rijbaan die tegen
      // een tegenrichting of een eigen uiteinde aan loopt en wordt het een haarspeld van 180 graden: Peizerweg, Godekenheerd)
      const nb = atEnd ? r.pts[r.pts.length - 2] : r.pts[1];
      const hl = Math.hypot(p[0] - nb[0], p[1] - nb[1]) || 1, hx = (p[0] - nb[0]) / hl, hy = (p[1] - nb[1]) / hl;
      for (const o of grid.get(Math.floor(p[0] / G) * 100003 + Math.floor(p[1] / G)) || []) {
        if (o === r || level(o) !== level(r)) continue;
        for (let j = 0; j < o.pts.length - 1; j++) {
          const h = proj(p, o.pts[j], o.pts[j + 1]);
          if (h.d > GAP_MIN && h.d < GAP_MAX && h.d > o.width / 2 + 0.01 - 0.3 && (!best || h.d < best.d) && ((h.q[0] - p[0]) * hx + (h.q[1] - p[1]) * hy) / h.d >= 0.5) best = { ...h, o, j };
        }
      }
      if (!best) continue;
      const { o, j } = best;
      let q = best.q;
      // (een bestaand hoekpunt van de andere weg, als dat binnen een halve meter ligt)
      for (const v of [o.pts[j], o.pts[j + 1]]) if (Math.hypot(v[0] - q[0], v[1] - q[1]) < 0.5) { q = v; break; }
      q = [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100];
      if (q !== o.pts[j] && q !== o.pts[j + 1] && !(k(q) === k(o.pts[j]) || k(q) === k(o.pts[j + 1]))) o.pts.splice(j + 1, 0, q);
      if (atEnd) r.pts.push(q.slice()); else r.pts.unshift(q.slice());
      note(r, q); note(o, q);
      closed++;
    }
  }
  return closed;
}

// Twee autowegen op hetzelfde niveau die naast elkaar lopen zonder knoop te delen (de twee rijbanen van een dubbele weg, een woonstraat of
// servicestrook naast een doorgaande weg) hebben lintvlakken die over elkaar liggen: twee coplanaire linten met elk hun eigen patroon
// flikkeren waar ze overlappen (road_seams.mjs overlap, #268). roadsurface.js ribbonClip knipt dat bij het tekenen bij, maar alleen
// halverwege en niet overal; hier krijgt de data zelf de juiste breedte. Een lint is de rijstroken plus een marge van een halve meter per
// kant (lanes.js: de rijstrookbreedte volgt de lintbreedte), dus de linten mogen een meter overlappen. Wat meer overlapt, wordt smaller
// gemaakt tot de linten elkaar net raken: beide evenveel, en de weg die niet kan (een strook is nooit smaller dan de rijstroken
// en een breedtetag blijft staan) laat de andere meer afstaan. Draait vóór de hoogtes. Geeft { pairs, narrowed, left }.
export const RIBBON_MARGIN = 1; // m die linten mogen overlappen (road_seams.mjs trekt dezelfde marge af)
const MIN_LANE_W = 2.75, HARD_LANE_W = 2.6, MIN_WIDTH = 2.5, SEP_MIN = 2, STEP_MAX = 1.4; // zachte en harde stroken-ondergrens; de smalste weg; dichterbij is een dubbele weg; stap tussen twee stukken (road_seams.mjs: 1,5)
const laneCount = (r) => Math.max(1, (r.lanesFwd || 0) + (r.lanesBwd || 0) + (r.lanesBoth || 0));
const laneFloor = (r, lane) => Math.min(r.width, Math.max(MIN_WIDTH, laneCount(r) * lane + 0.4));
// de ondergrens: een breedtetag blijft staan zolang het kan (zacht), een strook is nooit smaller dan de harde ondergrens
const floorWidth = (r, hard) => (hard ? laneFloor(r, HARD_LANE_W) : r.widthSrc === 'tag' ? r.width : laneFloor(r, MIN_LANE_W));
// verdeel `total` m smaller maken over twee wegen: gelijk, en wat de ene niet kan neemt de andere
function allocate(a, b, total, hard) {
  const roomA = Math.max(0, a.width - floorWidth(a, hard)), roomB = Math.max(0, b.width - floorWidth(b, hard));
  let ca = Math.min(roomA, total / 2), cb = Math.min(roomB, total / 2);
  if (ca < total / 2) cb = Math.min(roomB, total - ca); else if (cb < total / 2) ca = Math.min(roomA, total - cb);
  return [ca, cb];
}
export function separateRibbons(roads) {
  const car = roads.filter((r) => CAR_CATS.has(r.cat) && r.pts.length > 1);
  const level = (r) => r.layer ?? (r.tunnel ? -1 : r.bridge ? 1 : 0);
  const k = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const nodes = new Map();
  car.forEach((r, ri) => { for (const p of r.pts) { const key = k(p); let l = nodes.get(key); if (!l) nodes.set(key, l = new Set()); l.add(ri); } });
  const G = 30, grid = new Map();
  const cells = (a, b, f) => { for (let gx = Math.floor((Math.min(a[0], b[0]) - 8) / G); gx <= Math.floor((Math.max(a[0], b[0]) + 8) / G); gx++) for (let gy = Math.floor((Math.min(a[1], b[1]) - 8) / G); gy <= Math.floor((Math.max(a[1], b[1]) + 8) / G); gy++) f(gx + ',' + gy); };
  car.forEach((r, ri) => { for (let i = 0; i < r.pts.length - 1; i++) cells(r.pts[i], r.pts[i + 1], (c) => { let l = grid.get(c); if (!l) grid.set(c, l = []); l.push([ri, i]); }); });
  const segDist = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / L2)); return Math.hypot(a[0] + dx * t - px, a[1] + dy * t - py); };
  const shares = (ra, rb) => car[ra].pts.some((p) => nodes.get(k(p)).has(rb));
  const pairs = new Map();
  for (const bucket of grid.values()) {
    for (let x = 0; x < bucket.length; x++) for (let y = x + 1; y < bucket.length; y++) {
      const [ra, ia] = bucket[x], [rb, ib] = bucket[y];
      if (ra === rb) continue;
      const A = car[ra], B = car[rb];
      if (level(A) !== level(B)) continue;
      const a0 = A.pts[ia], a1 = A.pts[ia + 1], b0 = B.pts[ib], b1 = B.pts[ib + 1];
      const L = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
      const dax = (a1[0] - a0[0]) / (L || 1), day = (a1[1] - a0[1]) / (L || 1);
      const Lb = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) || 1;
      if (Math.abs(dax * (b1[0] - b0[0]) / Lb + day * (b1[1] - b0[1]) / Lb) < 0.9) continue;
      const lim = (A.width + B.width) / 2 - RIBBON_MARGIN;
      const pk = ra < rb ? ra + ':' + rb : rb + ':' + ra;
      for (let t = 0; t <= L; t += 1) {
        const px = a0[0] + dax * t, py = a0[1] + day * t, d = segDist(px, py, b0, b1);
        if (d >= lim) continue;
        let st = pairs.get(pk);
        if (!st) pairs.set(pk, st = { a: A, b: B, ra, rb, dmin: Infinity, seen: new Set() });
        st.dmin = Math.min(st.dmin, d);
        st.seen.add(Math.round(px) + ',' + Math.round(py));
      }
    }
  }
  const rep = { pairs: 0, narrowed: 0, left: 0, smoothed: 0 };
  const todo = [...pairs.values()].filter((st) => st.seen.size >= 6 && !shares(st.ra, st.rb));
  rep.pairs = todo.length;
  const need = (st) => (st.a.width + st.b.width) / 2 - (st.dmin + RIBBON_MARGIN - 0.05);
  todo.sort((p, q) => need(q) - need(p));
  const touched = new Set();
  for (const st of todo) {
    const e = need(st);
    if (e <= 0) continue;
    if (st.dmin < SEP_MIN) { rep.left++; continue; }
    let [ca, cb] = allocate(st.a, st.b, 2 * e, false);
    if (ca + cb < 2 * e - 0.01) { // de rest ook van de tags en tot de harde ondergrens
      const wa = st.a.width, wb = st.b.width;
      st.a.width = wa - ca; st.b.width = wb - cb;
      const [da, db] = allocate(st.a, st.b, 2 * e - ca - cb, true);
      st.a.width = wa; st.b.width = wb;
      ca += da; cb += db;
    }
    if (ca < 0.005 && cb < 0.005) { rep.left++; continue; }
    st.a.width = Math.round((st.a.width - ca) * 100) / 100;
    st.b.width = Math.round((st.b.width - cb) * 100) / 100;
    touched.add(st.a); touched.add(st.b);
    if (ca + cb < 2 * e - 0.01) rep.left++;
  }
  rep.narrowed = touched.size;
  // een smaller stuk laat een stap in de stoeprand achter waar het aansluit op zijn buur (road_seams.mjs widthJump): het bredere stuk
  // zakt tot STEP_MAX boven het smallere, voort langs de keten
  const dir = (r, atStart) => { const P = r.pts, a = atStart ? P[0] : P[P.length - 1], b = atStart ? P[1] : P[P.length - 2], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const joints = [];
  for (const set of nodes.values()) {
    if (set.size !== 2) continue;
    const [ra, rb] = [...set], A = car[ra], B = car[rb];
    const ea = k(A.pts[0]) === k(A.pts[A.pts.length - 1]) ? null : k(A.pts[0]), eb = k(B.pts[0]) === k(B.pts[B.pts.length - 1]) ? null : k(B.pts[0]);
    for (const aStart of [true, false]) for (const bStart of [true, false]) {
      const pa = aStart ? A.pts[0] : A.pts[A.pts.length - 1], pb = bStart ? B.pts[0] : B.pts[B.pts.length - 1];
      if (k(pa) !== k(pb) || ea === undefined || eb === undefined) continue;
      const da = dir(A, aStart), db = dir(B, bStart);
      if (da[0] * db[0] + da[1] * db[1] > -0.8) continue;
      if (A.cat !== B.cat || level(A) !== level(B) || A.roundabout || B.roundabout || laneCount(A) !== laneCount(B)) continue;
      joints.push([A, B]);
    }
  }
  for (let pass = 0; pass < 10; pass++) {
    let changed = 0;
    for (const [A, B] of joints) {
      const [lo, hi] = A.width <= B.width ? [A, B] : [B, A];
      if (hi.width - lo.width <= STEP_MAX || hi.widthSrc === 'tag') continue;
      const w = Math.max(Math.round((lo.width + STEP_MAX) * 100) / 100, floorWidth(hi, true));
      if (w < hi.width - 0.005) { hi.width = w; changed++; rep.smoothed++; }
    }
    if (!changed) break;
  }
  return rep;
}

// Een autoweg door water zonder brugtag en zonder profiel is een duiker onder een dijk: droog dek, als een brug
// (mapdata.js markDryRoad). De OSM-wegen liggen enkele cm anders dan die van de oude kaart: een weg die precies tot de
// oever reikt zou nu zinken. Hier geldt dezelfde regel met DRY_TOL m speling, zodat elke droge kruising van de oude kaart blijft.
const DRY_TOL = 0.1;
const DRY_CATS = new Set(['major', 'normal', 'minor', 'service']);
// Het stuk weg vlak bij het einde van een echte brug is de oprit op de wal: het OSM-water loopt daar tot aan de knoop, en een
// monster op de rand (of 0,1 m ernaast) telde als "weg door water". Dat stempelde 46 opritten van grachtbruggen (Maagdenbrug,
// Boteringebrug, Laan 1940-1945, ...) in de data tot droog dek naast het echte dek: dubbele bruggen en z-fight in de brugaudit, die op
// de data draait. Water binnen BANK_M van een brugeinde telt daarom niet mee in de data; de GameMap legt bij het laden (mapdata.js
// markDryRoad, exacte punten, zoals in de oude stad) alsnog een droog dek waar een oprit echt nat is.
const BANK_M = 3;
export function markDryRoads(d) {
  const grid = new SpatialGrid(80);
  for (const w of d.water || []) { if (!w.pts || w.pts.length < 4) continue; w.bounds = polygonBounds(w.pts); grid.insert(w, w.bounds); }
  const ck = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const bridgeEnds = new Set();
  for (const r of d.roads) if (r.bridge && !r.tunnel && r.pts.length > 1) { bridgeEnds.add(ck(r.pts[0])); bridgeEnds.add(ck(r.pts[r.pts.length - 1])); }
  let n = 0;
  for (const r of d.roads) {
    if (r.bridge || r.z || !DRY_CATS.has(r.cat)) continue;
    const P = r.pts;
    const b = polygonBounds(P);
    const polys = grid.query(b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1);
    if (!polys.length) continue;
    const total = P.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0);
    const bank0 = bridgeEnds.has(ck(P[0])), bank1 = bridgeEnds.has(ck(P[P.length - 1]));
    let wet = false, at = 0;
    for (let i = 0; i < P.length - 1 && !wet; i++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.ceil(len / 2));
      for (let k = 0; k <= steps && !wet; k++) {
        const x = ax + ((bx - ax) * k) / steps, y = ay + ((by - ay) * k) / steps;
        const s = at + (len * k) / steps;
        let hit = false;
        for (const [dx, dy] of [[0, 0], [DRY_TOL, 0], [-DRY_TOL, 0], [0, DRY_TOL], [0, -DRY_TOL]]) if (waterPolyIn(polys, x + dx, y + dy)) { hit = true; break; }
        if (!hit) continue;
        if (!((bank0 && s < BANK_M) || (bank1 && total - s < BANK_M))) wet = true;
      }
      at += len;
    }
    if (wet) { r.bridge = true; r.dryCrossing = true; n++; }
  }
  return n;
}

// ------------------------------------------------------------------ hoogtes

const noTerrain = () => 0;
// GDE_STAD_TERRAIN=1: de oplossers rekenen over het AHN-terrein (data/world/ahn, terrain.mjs), #269
let terrainFn = null;
const cityTerrain = async () => { if (terrainFn) return terrainFn; if (process.env.GDE_STAD_TERRAIN !== '1') return noTerrain; terrainFn = (await import('./terrain.mjs')).loadTerrainField().at; return terrainFn; };
const lcPoints = (d) => (d.levelCrossings || []).map((c) => [c.x, c.y]);

// profile.mjs main(): de oplosser tot niets meer verandert, hoogstens drie rondes
function solveRoads(d, protect, terrain = noTerrain) {
  let passes = 0;
  for (let pass = 0; pass < 3; pass++) {
    const sol = PR.solve(d, { terrain, protect });
    const res = PR.apply(d, sol);
    passes++;
    if (!res.changed && !res.cleared && !sol.pts.size) break;
  }
  return passes;
}
function solveRails(d, terrain = noTerrain) {
  const sol = RP.solve(d, { terrain });
  const res = RP.apply(d, sol);
  return { changed: res.changed, shortfall: sol.shortfall.length };
}

// de pack-elementen met `geometry` ({lat, lon}), zoals railprofile.mjs (matchRailTags, platformsFrom) ze leest
const withGeometry = (els) => els.filter((e) => e.type === 'way').map((e) => ({ ...e, geometry: (e.g || []).map(([lat, lon]) => ({ lat, lon })) }));

// d: de stadsdata (GameMap-invoer vóór de mapextras); wegen: collector().result(); extras: mapextras.json (geladen)
// lagen: 'roads' en/of 'rails'; inside(x, y): de dekking van de stad. Geeft een verslag.
export async function profileCity(d, wegen, { lagen, extras = {}, inside }) {
  const wantRoads = lagen.includes('roads'), wantRails = lagen.includes('rails');
  const rep = { roads: 0, passes: 0 };
  const terrain = await cityTerrain();
  const bounds = d.meta.bounds;
  const inRect = (x, y, m = 0) => x >= bounds[0] - m && x <= bounds[2] + m && y >= bounds[1] - m && y <= bounds[3] + m;
  if (wantRoads) {
    // (na het knippen nog eens: een brug die OSM twee keer tekent blijft één dek)
    const cut = cutToCover(wegen.roads.map(cityRoadRow), inside);
    rep.chainDuals = chainDuals(cut);
    rep.gaps = closeGaps(cut);
    // (smallere linten laten meer wegeinden net naast een andere weg liggen: nog eens)
    rep.ribbons = separateRibbons(cut);
    rep.gaps += closeGaps(cut);
    d.roads = dropDuplicateBridges(cut.map((row) => ({ kind: 'roads', row }))).map((f) => f.row);
    // de ringwegen openen niet voor boten: de oude kaart kende op de ring alleen vaste bruggen (de ring race en de politie rijden er overheen),
    // de nieuwere OSM tagt een paar ervan bridge:movable terwijl het dek ruim 4 m boven de weg ligt
    for (const r of d.roads) if (r.movable && RING_TYPES.has(r.type)) { delete r.movable; rep.ringBridgesFixed = (rep.ringBridgesFixed || 0) + 1; }
    d.meta.trafficLights = wegen.lights.filter((l) => inRect(l.x, l.y)).map((l) => ({ ...l }));
    rep.roads = d.roads.length;
  }
  const elements = wegen.elements, geomEls = withGeometry(elements);
  const railsRaw = railItemsFrom(elements.filter((e) => e.type === 'way'), wgsToWorld);
  // de busbanen en beschermde wegen van het handwerk gaan mee (profile.mjs main)
  if (wantRoads) rep.snapped = snapExtras(extras, d.roads);
  const bus = busWays(d, extras);
  const protect = PR.protectedRoads(d, extras);
  const solveAll = () => { for (const { road } of bus) d.roads.push(road); rep.passes += solveRoads(d, protect, terrain); d.roads = d.roads.filter((r) => !bus.some((b) => b.road === r)); };
  const saved = { rails: d.rails, levelCrossings: d.levelCrossings, railLifts: d.railLifts, railPlatforms: d.railPlatforms };
  if (wantRoads) {
    rep.ring = process.env.GDE_STAD_RING === '0' ? null : ringHeights(d, railsRaw);
    // (de volgorde van build_map.py: de eerste ronde zonder spoor)
    if (wantRails) Object.assign(d, { rails: [], levelCrossings: [], railLifts: [], railPlatforms: [] });
    solveAll();
  }
  if (wantRails) {
    const r = cityRail({ elements, roads: d.roads, bounds });
    anchorStations(r.stations, d.meta.landmarks);
    Object.assign(d, { rails: r.rails, stations: r.stations, levelCrossings: r.levelCrossings, railRoutes: r.railRoutes, railLifts: r.railLifts });
    rep.rails = { rails: r.rails.length, stations: r.stations.length, levelCrossings: r.levelCrossings.length, routes: r.railRoutes.length, lifts: r.railLifts.length, cut: r.cut };
    rep.railTags = RP.matchRailTags(d.rails, geomEls);
    d.railPlatforms = RP.platformsFrom(geomEls).filter((p) => { const q = p.pts[Math.floor(p.pts.length / 2)]; return inRect(q[0], q[1], 150); });
    rep.rail1 = solveRails(d, terrain);
    solveAll();
    rep.rail2 = solveRails(d, terrain);
    // de perrons en hun trappen (#436): op de hoogte van het opgeloste spoor, met wegen en gebouwen als hindernis
    const pr = derivePerrons(d);
    d.perrons = pr.rows;
    rep.perrons = { ...pr.rep, zonderTrap: pr.rep.zonderTrap.length };
  } else if (wantRoads) {
    // de oude sporen blijven: de paden bij het spoor afknippen en de wegen er nog eens tegen oplossen
    Object.assign(d, saved);
    const lifts = d.railLifts || [];
    rep.cut = cutPathsAtRails(d.roads, d.rails || [], lifts, lcPoints(d));
    solveAll();
  } else if (wantRails) rep.skipped = true;
  if (bus.length) restoreBus(bus);
  if (wantRoads) {
    rep.dry = markDryRoads(d);
    // the second profile, over the AHN terrain (#269): road.zt, what ?terrain reads (terrain_solve.mjs); none without rasters
    const ahn = ahnTerrain();
    if (ahn) rep.zt = solveTerrainRoads(d, { terrain: ahn, protect });
  }
  return rep;
}

// Het stationsgebouw is een landmark van het handwerk (meta.landmarks, kind 'station'); de OSM-knoop `railway=station` ligt
// niet altijd bij het gebouw: in het extract van 15 oktober is de knoop van Groningen 50 m naar de perrons verschoven. Het
// kaartmachientje, de wandelroutes vanaf het station en de muziek horen bij het gebouw, zoals in de oude stad. Een station
// binnen STATION_SNAP m van zo'n landmark neemt zijn plek over (de treinroutes houden de OSM-knoop: ze rijden langs de perrons).
const STATION_SNAP = 120;
export function anchorStations(stations, landmarks) {
  let moved = 0;
  for (const st of stations) {
    let best = null, bd = STATION_SNAP;
    for (const l of landmarks || []) {
      if (l.kind !== 'station') continue;
      const dd = Math.hypot(l.x - st.x, l.y - st.y);
      if (dd < bd) { bd = dd; best = l; }
    }
    if (best && bd > 0) { st.x = best.x; st.y = best.y; moved++; }
  }
  return moved;
}

// ------------------------------------------------------------------ handwerk

// De busbanen en hoogtecorrecties van mapextras.json noemen hun punten op de cm van de oude kaart; de OSM-wegen van de tegelbouw
// liggen enkele cm anders (andere afronding van dezelfde knopen). applyMapExtras zoekt op de cm, dus elk punt van het handwerk gaat
// naar het dichtstbijzijnde hoekpunt van een weg binnen SNAP m, zodat busbaan, buslaan en roadZ weer op hun weg vallen.
const SNAP = 0.15;
export function snapExtras(extras, roads) {
  const CELL = 2, grid = new Map();
  for (const r of roads) for (const p of r.pts) { const k = `${Math.floor(p[0] / CELL)},${Math.floor(p[1] / CELL)}`; let c = grid.get(k); if (!c) grid.set(k, c = []); c.push(p); }
  const near = (p) => {
    let best = null, bd = SNAP;
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const q of grid.get(`${cx + i},${cy + j}`) || []) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d <= bd) { bd = d; best = q; } }
    return best;
  };
  let moved = 0, total = 0;
  const snapPts = (list) => { for (let i = 0; i < list.length; i++) { total++; const q = near(list[i]); if (q && (q[0] !== list[i][0] || q[1] !== list[i][1])) { list[i] = [q[0], q[1]]; moved++; } } };
  for (const b of [...(extras.busRoads || []), ...(extras.busLanes || [])]) if (b.pts) snapPts(b.pts);
  for (const z of extras.roadZ || []) if (z.at) { total++; const q = near(z.at); if (q) { z.at = [q[0], q[1]]; moved++; } }
  return { moved, total };
}

function busWays(d, extras) { return extras.busRoads ? PR.busRoadsOf(d, extras) : []; }
function restoreBus(bus) { return PR.restoreBusRoads(bus); }
