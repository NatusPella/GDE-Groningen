// Het vaarnetwerk als graaf (#184) over ALLE bevaarbare water van de provincie: voor
// klasse 2 (sloep), 3 (rondvaart) en 4 (binnenvaart) een boom van kortste routes vanuit
// een wortel per waterstuk, samengevoegd tot één net (game/js/vaarnet.js leest
// game/vaarnet.json).
//
//   node scripts/world/vaarnet_graph.mjs           bouw en meld
//   node scripts/world/vaarnet_graph.mjs --write   schrijf game/vaarnet.json
//   --spelwater: alleen water waar het spel water heeft (polygonen en gatenstuk), zonder het verbreden en dichten van het raster
//
// Knopen: havens (de binnenstad, steden en dorpen aan het water), zee, het Lauwersmeer,
// sluizen, beweegbare bruggen, splitsingen en uiteinden. Een tak draagt de kleinste
// vaarklasse en de laagste vaste brug op de weg erheen; wie niet onder die brug past of te
// breed is, kiest een andere route (routeVaar, planVaarRoute in game/js/vaarnet.js).
// Water van klasse 1 (sloten en vijvers) zit er met opzet niet in, en waterstukken kleiner
// dan MIN_COMP_CELLS cellen ook niet (zie de audit: vaarnet.mjs --components).
import fs from 'node:fs';
import { buildRaster, sail, cellOf, cellXY, coastIndex, seaRegion, components, nearestOpenCell, ringNear, CELL, SEA_REACH, CLASS_KIND } from './vaarnet.mjs';
import { STREET_CLEAR } from '../../game/js/vaarnet.js';
import { createWaterIndex } from '../../game/js/waterindex.js';

const SEA_NAME = { waddenzee: 'Waddenzee bij Lauwersoog', eems: 'Eems bij Delfzijl', dollard: 'Dollard bij Termunterzijl', noordzee: 'Noordzee' };
const WANT_VILLAGES = new Set(['Zoutkamp', 'Lauwersoog', 'Termunterzijl', 'Nieuwe Statenzijl', 'Zuidlaren', 'Eemshaven']);
const GW = 15000, NCX = 59;
const RANK = { kruising: 0, brug: 1, sluis: 2, haven: 3, meer: 3, zee: 3 };
const id = (cx, cy) => cy * GW + cx;
export const MIN_COMP_CELLS = 200;

// loopt het rechte stuk a-b (elke meter bekeken) over een dichte plek?
function chordDry(a, b, dry) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L);
  for (let i = 1; i < n; i++) if (dry(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)) return true;
  return false;
}

// vereenvoudigt een lijn (Douglas-Peucker) tot de afwijking eps m; met `dry` (x, y) -> true op land of een woonboot blijft elk stuk
// ervan af: een rechte lijn die over zo'n plek loopt wordt gesplitst (#343)
export function simplify(P, eps, dry = null) {
  if (P.length < 3) return P;
  const keep = new Uint8Array(P.length);
  keep[0] = keep[P.length - 1] = 1;
  const stack = [[0, P.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let md = 0, mi = -1;
    const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1], L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((P[i][0] - P[a][0]) * dy - (P[i][1] - P[a][1]) * dx) / L;
      if (d > md) { md = d; mi = i; }
    }
    if (mi > 0 && (md > eps || (dry && b > a + 1 && chordDry(P[a], P[b], dry)))) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return P.filter((_, i) => keep[i]);
}

// de haven- en zeepunten: de binnenstad, de steden en enkele dorpen aan het water
export function hubList({ R, places }, cls = 3) {
  const nearest = (x, y, r) => {
    const [cx, cy] = cellOf(x, y);
    for (let k = 0; k <= r; k++) for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== k) continue;
      if (R.nav(cx + a, cy + b) >= cls) return [cx + a, cy + b];
    }
    return null;
  };
  const out = [{ name: 'Binnenstad Groningen', cell: nearest(0, -350, 80) }];
  for (const p of places) {
    if (!(p.kind === 'town' || WANT_VILLAGES.has(p.name)) || p.name === 'Groningen') continue;
    const c = nearest(p.x, p.y, Math.ceil(700 / CELL));
    if (c) out.push({ name: p.name, cell: c });
  }
  return out.filter((h) => h.cell);
}

// De klasse van een tak: de hoogste klasse c waarvoor het water nergens over meer dan 3 cellen (15 m)
// aaneen smaller is: een versmalling van één cel is rasterruis of een brugdek, geen smal kanaal.
export function edgeClass(navs) {
  for (let c = 4; c >= 2; c--) {
    let run = 0, ok = true;
    for (const n of navs) { run = n < c ? run + 1 : 0; if (run > 3) { ok = false; break; } }
    if (ok) return c;
  }
  return 1;
}

// De cellen waar een boom van routes naartoe loopt: per blok van BLOCK_NARROW cellen een
// cel in smal water, per grotere blok een cel in open water (meren, de zee), zodat de graaf
// het hele water dekt tot op ~150 m (smal) of ~600 m (open) zonder elke cel te volgen.
const BLOCK_NARROW = 40, BLOCK_OPEN = 160;
function leafCells(R, cls, comp, minCells) {
  const narrow = new Map(), open = new Map(), cnt = new Map();
  for (let ci = 0; ci < R.chunks.length; ci++) {
    const ch = R.chunks[ci];
    if (!ch) continue;
    const bx = (ci % NCX) * 256, by = Math.floor(ci / NCX) * 256;
    for (let i = 0; i < ch.length; i++) {
      if ((ch[i] & 7) < cls) continue;
      const cx = bx + (i & 255), cy = by + (i >> 8);
      if (comp.sizes[comp.label(cx, cy)] < minCells) continue;
      const kn = Math.floor(cy / BLOCK_NARROW) * 100003 + Math.floor(cx / BLOCK_NARROW);
      cnt.set(kn, (cnt.get(kn) || 0) + 1);
      if (!narrow.has(kn)) narrow.set(kn, [cx, cy]);
      const ko = Math.floor(cy / BLOCK_OPEN) * 100003 + Math.floor(cx / BLOCK_OPEN);
      if (!open.has(ko)) open.set(ko, [cx, cy]);
    }
  }
  // een blok dat voor meer dan 40% water is, is open water: daar telt alleen het grote blok
  const out = new Set();
  for (const [k, c] of narrow) if (cnt.get(k) < BLOCK_NARROW * BLOCK_NARROW * 0.4) out.add(id(c[0], c[1]));
  for (const c of open.values()) out.add(id(c[0], c[1]));
  return out;
}

export function buildGraph(built, { eps = 14, log = () => {} } = {}) {
  const { R, P } = built;
  const hubs = hubList(built);
  const root = hubs[0];
  // een lijn mag niet over land of door een woonboot (op 1,5 m na: de romp is 2 m breed); land is hier het echte water van de
  // polygonen, niet de cel: een cel waar de oever doorheen loopt is water in het raster
  const exact = createWaterIndex(built.navPolys || []);
  const dryAt = (x, y) => { const [cx, cy] = cellOf(x, y); return R.nav(cx, cy) === 0 || !exact.inWater(x, y) || (R.rings.size > 0 && ringNear(R, x, y, 1.5)); };
  const coast = coastIndex(P.edge);
  const seaOf = (cx, cy) => { const [x, y] = cellXY(cx, cy), q = coast.near(x, y, SEA_REACH); return q ? seaRegion(q[0], q[1]) : null; };
  const hubAt = new Map(hubs.map((h) => [id(h.cell[0], h.cell[1]), h]));
  const seaNames = new Set(Object.values(SEA_NAME));
  const nodes = [], nodeKey = new Map(), edges = [];
  const node = (cx, cy, type, name) => {
    const k = id(cx, cy);
    if (nodeKey.has(k)) {
      const n = nodes[nodeKey.get(k)];
      // havens en zee gaan voor sluizen, sluizen voor bruggen, bruggen voor een gewone splitsing
      if (RANK[type] > RANK[n.type]) { n.type = type; n.name = name || n.name; }
      return nodeKey.get(k);
    }
    const [x, y] = cellXY(cx, cy);
    nodes.push({ x: Math.round(x), y: Math.round(y), type, name: name || '' });
    nodeKey.set(k, nodes.length - 1);
    return nodes.length - 1;
  };
  // één boom voor alle klassen: breed water kost minder dan smal, een lage vaste brug is voor een
  // binnenvaartschip bijna dicht; zo loopt het net waar mogelijk over water dat alle boten halen
  const NAV_COST = [1, 1, 4, 1.6, 1];
  for (const cls of [2]) {
    const kind = 'rondvaart';
    const comp = components(R, cls);
    // een wortel per waterstuk (de binnenstad voor het stuk waar die in ligt)
    const rootComp = comp.label(root.cell[0], root.cell[1]);
    const starts = [];
    for (let c = 1; c < comp.sizes.length; c++) {
      if (comp.sizes[c] < MIN_COMP_CELLS) continue;
      starts.push(c === rootComp ? (nearestOpenCell(R, 0, -350, cls) || comp.seeds[c]) : comp.seeds[c]);
    }
    const leaves = leafCells(R, cls, comp, MIN_COMP_CELLS);
    const res = sail(R, starts, cls, kind, (cx, cy) => {
      const h = hubAt.get(id(cx, cy));
      if (h) return h.name;
      // het meer en de zeeën tellen waar de binnenstad ze bereikt: het stuk van de stad
      if (comp.label(cx, cy) !== rootComp) return null;
      if (R.get(cx, cy) & 16) return 'Lauwersmeer';
      const reg = seaOf(cx, cy);
      return reg ? SEA_NAME[reg] : null;
    }, { navCost: NAV_COST });
    const targets = [];
    for (const [name, f] of res.found) targets.push({ name, type: name === 'Lauwersmeer' ? 'meer' : seaNames.has(name) ? 'zee' : 'haven', cx: f.cx, cy: f.cy });
    for (const k of leaves) {
      const cx = k % GW, cy = (k - cx) / GW;
      if (res.cost(cx, cy) < Infinity) targets.push({ name: '', type: 'kruising', cx, cy });
    }
    // de boom: elke cel van een blad terug naar de wortel, één keer
    const tp = new Map(), kids = new Map(), named = new Map();
    for (const t of targets) {
      let c = [t.cx, t.cy];
      if (t.name) named.set(id(t.cx, t.cy), t);
      while (c) {
        const k = id(c[0], c[1]);
        if (tp.has(k)) break;
        const p = res.parent(c[0], c[1]);
        tp.set(k, p ? id(p[0], p[1]) : -1);
        if (p) kids.set(id(p[0], p[1]), (kids.get(id(p[0], p[1])) || 0) + 1);
        c = p;
      }
    }
    // knopen: wortels, splitsingen, uiteinden, doelen met een naam, de eerste cel in een sluis of beweegbare brug
    const isNode = (k) => {
      const p = tp.get(k);
      if (p === -1 || named.has(k)) return true;
      const n = kids.get(k) || 0;
      if (n !== 1) return true;
      const o = R.obs.get(k);
      return o !== undefined && o !== R.obs.get(p) && R.list[o].kind !== 'vast';
    };
    const cellOfKey = (k) => { const cx = k % GW; return [cx, (k - cx) / GW]; };
    for (const [k] of tp) {
      if (!isNode(k) || tp.get(k) === -1) continue;
      const cells = [cellOfKey(k)];
      let q = tp.get(k);
      while (q !== -1) { cells.push(cellOfKey(q)); if (isNode(q)) break; q = tp.get(q); }
      cells.reverse();
      const t = named.get(k), o = R.obs.get(k), ob = o !== undefined ? R.list[o] : null;
      const type = t ? t.type : ob && ob.kind === 'sluis' ? 'sluis' : ob && ob.kind === 'beweegbaar' ? 'brug' : 'kruising';
      const nb = node(cells[cells.length - 1][0], cells[cells.length - 1][1], type, t ? t.name : ob && ob.kind !== 'vast' ? ob.name : '');
      const first = cells[0], pt = named.get(id(first[0], first[1])), pob = R.obs.get(id(first[0], first[1]));
      const na = node(first[0], first[1], pt ? pt.type : 'kruising', pt ? pt.name : pob !== undefined && R.list[pob].kind !== 'vast' ? R.list[pob].name : '');
      if (na === nb) continue;
      let len = 0, clear = Infinity;
      const navs = [];
      for (let i = 0; i < cells.length; i++) {
        if (i) len += Math.hypot(cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1]) * CELL;
        navs.push(R.nav(cells[i][0], cells[i][1]));
        const o2 = R.obs.get(id(cells[i][0], cells[i][1]));
        if (o2 !== undefined && R.list[o2].kind === 'vast') clear = Math.min(clear, STREET_CLEAR);
      }
      edges.push({ a: na, b: nb, len: Math.round(len), cls: edgeClass(navs), clear, pts: simplify(cells.map(([cx, cy]) => cellXY(cx, cy)), eps, dryAt) });
    }
    log('klasse ' + cls + ': ' + comp.sizes.slice(1).filter((n) => n >= MIN_COMP_CELLS).length + ' waterstukken, ' + targets.length + ' bladeren, ' + tp.size + ' boomcellen, ' + edges.length + ' takken');
  }
  // dezelfde tak uit meer bomen (dezelfde cellen) één keer
  const legKey = (e) => e.a + ':' + e.b + ':' + e.cls + ':' + e.clear + ':' + Math.round(e.len / 20);
  const uniq = new Map();
  for (const e of edges) if (!uniq.has(legKey(e))) uniq.set(legKey(e), e);
  edges.length = 0;
  edges.push(...uniq.values());
  const hubIds = {};
  nodes.forEach((n, i) => { if (n.type === 'haven' || n.type === 'zee' || n.type === 'meer') hubIds[n.name] = i; });
  return { nodes, edges, hubs: hubIds };
}

// het bestand: knopen [x, y, type, naam], takken [a, b, lengte, klasse, laagste vaste brug in dm (-1 geen), punten in dm als delta's]
export function encodeGraph(g) {
  return {
    versie: 2,
    nodes: g.nodes.map((n) => [n.x, n.y, n.type, n.name]),
    edges: g.edges.map((e) => {
      const flat = [];
      let px = 0, py = 0;
      for (const p of e.pts) { const x = Math.round(p[0] * 10), y = Math.round(p[1] * 10); flat.push(x - px, y - py); px = x; py = y; }
      return [e.a, e.b, e.len, e.cls, e.clear === Infinity ? -1 : Math.round(e.clear * 10), flat];
    }),
    hubs: g.hubs,
  };
}

if (process.argv[1] && process.argv[1].endsWith('vaarnet_graph.mjs')) {
  const gameWater = process.argv.includes('--spelwater');
  const built = await buildRaster({ gameWater, houseboats: true });
  if (gameWater) console.log(`raster van het spel: ${built.dry} cellen zonder water in de polygonen weggehaald`);
  const g = buildGraph(built, { log: (m) => console.log(m) });
  const json = JSON.stringify(encodeGraph(g));
  const km = (f) => Math.round(g.edges.filter(f).reduce((n, e) => n + e.len, 0) / 1000);
  console.log(`graaf: ${g.nodes.length} knopen, ${g.edges.length} takken, ${km(() => true)} km (klasse 4: ${km((e) => e.cls >= 4)} km, klasse 3 en hoger: ${km((e) => e.cls >= 3)} km, onder een lage brug: ${km((e) => e.clear !== Infinity)} km), ${(json.length / 1024).toFixed(0)} kB`);
  const types = {};
  for (const n of g.nodes) types[n.type] = (types[n.type] || 0) + 1;
  console.log('knopen per soort:', JSON.stringify(types));
  console.log('havens en zee:', Object.keys(g.hubs).join(', '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(new URL('../../game/vaarnet.json', import.meta.url), json);
    console.log('geschreven: game/vaarnet.json');
  }
}
