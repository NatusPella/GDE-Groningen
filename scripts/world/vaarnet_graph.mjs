// Het vaarnetwerk als graaf (#184): de kortste vaarroutes van de binnenstad naar
// elke haven en elke zeetoegang, voor klasse 3 (rondvaart) en klasse 4
// (binnenvaart), samengevoegd tot één net dat de boten volgen (game/js/vaarnet.js
// leest game/vaarnet.json).
//
//   node scripts/world/vaarnet_graph.mjs           bouw en meld
//   node scripts/world/vaarnet_graph.mjs --write   schrijf game/vaarnet.json
//
// Knopen: havens (de binnenstad, steden en dorpen aan het water), zee, het
// Lauwersmeer, sluizen, beweegbare bruggen en de punten waar twee routes
// uiteengaan. Een tak draagt de kleinste vaarklasse en de laagste vaste brug
// op de weg erheen; wie niet onder die brug past of te breed is, kiest een
// andere route (routeVaar in game/js/vaarnet.js).
import fs from 'node:fs';
import { buildRaster, sail, cellOf, cellXY, coastIndex, seaRegion, CELL, SEA_REACH, CLASS_KIND } from './vaarnet.mjs';
import { STREET_CLEAR } from '../../game/js/vaarnet.js';

const SEA_NAME = { waddenzee: 'Waddenzee bij Lauwersoog', eems: 'Eems bij Delfzijl', dollard: 'Dollard bij Termunterzijl', noordzee: 'Noordzee' };
const WANT_VILLAGES = new Set(['Zoutkamp', 'Lauwersoog', 'Termunterzijl', 'Nieuwe Statenzijl', 'Zuidlaren', 'Eemshaven']);
const GW = 15000;
const id = (cx, cy) => cy * GW + cx;

// vereenvoudigt een lijn (Douglas-Peucker) tot de afwijking eps m
export function simplify(P, eps) {
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
    if (md > eps && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
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

export function buildGraph(built, { eps = 12 } = {}) {
  const { R, P } = built;
  const hubs = hubList(built);
  const root = hubs[0];
  const coast = coastIndex(P.edge);
  const seaOf = (cx, cy) => { const [x, y] = cellXY(cx, cy), q = coast.near(x, y, SEA_REACH); return q ? seaRegion(q[0], q[1]) : null; };
  const hubAt = new Map(hubs.map((h) => [id(h.cell[0], h.cell[1]), h]));
  const seaNames = new Set(Object.values(SEA_NAME));
  const nodes = [], nodeKey = new Map(), edges = [], seen = new Set();
  const node = (cx, cy, type, name) => {
    const k = id(cx, cy);
    if (nodeKey.has(k)) {
      const n = nodes[nodeKey.get(k)];
      if (type === 'haven' || type === 'zee' || type === 'meer') { n.type = type; n.name = name || n.name; }
      return nodeKey.get(k);
    }
    const [x, y] = cellXY(cx, cy);
    nodes.push({ x: Math.round(x), y: Math.round(y), type, name: name || '' });
    nodeKey.set(k, nodes.length - 1);
    return nodes.length - 1;
  };
  for (const cls of [3, 4]) {
    const res = sail(R, [root.cell], cls, CLASS_KIND[cls], (cx, cy) => {
      const h = hubAt.get(id(cx, cy));
      if (h) return h.name;
      if (R.get(cx, cy) & 16) return 'Lauwersmeer';
      const reg = seaOf(cx, cy);
      return reg ? SEA_NAME[reg] : null;
    });
    const paths = [];
    for (const [name, f] of res.found) paths.push({ name, type: name === 'Lauwersmeer' ? 'meer' : seaNames.has(name) ? 'zee' : 'haven', path: res.trace(f.cx, f.cy) });
    // waar twee routes uiteengaan: een cel met meer dan één volgende cel
    const next = new Map();
    for (const { path } of paths) {
      for (let i = 0; i + 1 < path.length; i++) {
        const a = id(path[i][0], path[i][1]);
        (next.get(a) || next.set(a, new Set()).get(a)).add(id(path[i + 1][0], path[i + 1][1]));
      }
    }
    const emit = (a, b, cells) => {
      const key = cls + ':' + a + ':' + b;
      if (seen.has(key) || a === b) return;
      seen.add(key);
      let len = 0, cmin = 4, clear = Infinity;
      for (let i = 0; i < cells.length; i++) {
        if (i) len += Math.hypot(cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1]) * CELL;
        if (R.nav(cells[i][0], cells[i][1]) < 4) cmin = 3;
        const o = R.obs.get(id(cells[i][0], cells[i][1]));
        if (o !== undefined && R.list[o].kind === 'vast') clear = Math.min(clear, STREET_CLEAR);
      }
      edges.push({ a, b, len: Math.round(len), cls: cmin, clear, pts: simplify(cells.map(([cx, cy]) => cellXY(cx, cy)), eps) });
    };
    for (const { name, type, path } of paths) {
      let leg = [path[0]], last = node(path[0][0], path[0][1], 'haven', root.name), lastOb = -1;
      const ev = (i, t, nm) => {
        const [cx, cy] = path[i];
        const b = node(cx, cy, t, nm);
        if (b !== last) emit(last, b, leg);
        last = b; leg = [[cx, cy]];
      };
      for (let i = 1; i < path.length; i++) {
        const k = id(path[i][0], path[i][1]);
        const o = R.obs.get(k);
        leg.push(path[i]);
        if (i === path.length - 1) { ev(i, type, name); break; }
        if (o !== undefined && o !== lastOb) {
          const ob = R.list[o];
          lastOb = o;
          if (ob.kind === 'sluis') ev(i, 'sluis', ob.name);
          else if (ob.kind === 'beweegbaar') ev(i, 'brug', ob.name);
        } else if (o === undefined) lastOb = -1;
        if ((next.get(k) || { size: 0 }).size > 1) ev(i, 'kruising', '');
      }
    }
  }
  // the same leg from the class 3 and the class 4 tree (the same cells) once
  const legKey = (e) => `${e.a}:${e.b}:${e.cls}:${e.clear}:${Math.round(e.len / 20)}`;
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
    versie: 1,
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
  const built = buildRaster();
  const g = buildGraph(built);
  const json = JSON.stringify(encodeGraph(g));
  const km = (f) => Math.round(g.edges.filter(f).reduce((n, e) => n + e.len, 0) / 1000);
  console.log(`graaf: ${g.nodes.length} knopen, ${g.edges.length} takken, ${km(() => true)} km (klasse 4: ${km((e) => e.cls === 4)} km, onder een lage brug: ${km((e) => e.clear !== Infinity)} km), ${(json.length / 1024).toFixed(0)} kB`);
  const types = {};
  for (const n of g.nodes) types[n.type] = (types[n.type] || 0) + 1;
  console.log('knopen per soort:', JSON.stringify(types));
  console.log('havens en zee:', Object.keys(g.hubs).join(', '));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(new URL('../../game/vaarnet.json', import.meta.url), json);
    console.log('geschreven: game/vaarnet.json');
  }
}
