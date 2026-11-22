// Snelheid (22-11): roadgraph.js rekent de kosten over het wegennet hervatbaar (roadCostsFor): een route van dorp
// naar dorp stopt zodra de knopen die hij nodig heeft vaststaan, i.p.v. over het hele net. Bewijs: dezelfde afstanden als
// een onafhankelijke Dijkstra over een synthetisch net met eenrichtingswegen (gedeeltelijk, hervat en volledig),
// en een microbench van de routekost.
//   GDE_VENDOR_CACHE=desktop/vendor-cache node scripts/snelheid_wegroute_test.mjs
import './node3d.mjs';
const RG = await import('../game/js/roadgraph.js');
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('FOUT', m); } };
let seed = 4242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// net: W x W knopen, 30 m, elke rand een eigen weg (zo bepalen wij de eenrichting per rand), ~15% eenrichting, wat kinds
const W = 260, S = 30;
const rows = [], edges = []; // edges: [ax, ay, bx, by, one]
const X = (i) => i * S, Y = (j) => j * S;
for (let i = 0; i < W; i++) for (let j = 0; j < W; j++) {
  for (const [di, dj] of [[1, 0], [0, 1]]) {
    const i2 = i + di, j2 = j + dj;
    if (i2 >= W || j2 >= W) continue;
    const one = rnd() < 0.15 ? 1 : 0;
    const flip = rnd() < 0.5;
    const p = flip ? [[X(i2), Y(j2)], [X(i), Y(j)]] : [[X(i), Y(j)], [X(i2), Y(j2)]];
    rows.push({ pts: p, kind: 5, w: 6, oneway: !!one, bridge: false });
    edges.push([p[0][0], p[0][1], p[1][0], p[1][1], one]);
  }
}
RG.setRoadNet(rows);
const st = RG.roadGraphStats();
ok(st.nodes === W * W, `knopen ${st.nodes}`);

// onafhankelijke referentie: Dijkstra over de eigen randenlijst, richting 'toward' of vooruit, vanaf een snap
const id = (x, y) => Math.round(x / S) * W + Math.round(y / S);
const fwd = Array.from({ length: W * W }, () => []), rev = Array.from({ length: W * W }, () => []);
for (const [ax, ay, bx, by, one] of edges) {
  const a = id(ax, ay), b = id(bx, by);
  fwd[a].push([b, S]); rev[b].push([a, S]);
  if (!one) { fwd[b].push([a, S]); rev[a].push([b, S]); }
}
function ref(snap, toward) {
  const adj = toward ? rev : fwd, dist = new Float64Array(W * W).fill(Infinity);
  const a = id(...RG.nodeXY(snap.a)), b = id(...RG.nodeXY(snap.b));
  const q = [];
  const seed = (n, d) => { if (d < dist[n]) { dist[n] = d; q.push([d, n]); } };
  if (toward) { seed(a, snap.da); if (!snap.one) seed(b, snap.db); } else { seed(b, snap.db); if (!snap.one) seed(a, snap.da); }
  while (q.length) { // O(n^2)-vrije eenvoudige versie: kleinste eruit zoeken is te traag, dus een gesorteerde wachtrij met bucket
    let bi = 0; for (let i = 1; i < q.length; i++) if (q[i][0] < q[bi][0]) bi = i;
    const [d, u] = q[bi]; q[bi] = q[q.length - 1]; q.pop();
    if (d > dist[u]) continue;
    for (const [v, l] of adj[u]) if (d + l < dist[v]) { dist[v] = d + l; q.push([d + l, v]); }
  }
  return dist;
}
const randSnap = () => RG.snapRoad(rnd() * (W - 1) * S, rnd() * (W - 1) * S, 100);
const nodeId = (n) => id(...RG.nodeXY(n));

// 1) gedeeltelijk, dan hervat, dan volledig: telkens gelijk aan de referentie op de vastgestelde knopen
for (let k = 0; k < 6; k++) {
  const snap = randSnap(), toward = k % 2 === 0;
  const R = ref(snap, toward);
  // dichtbij: een paar knopen binnen 20 randen
  const na = RG.nodeXY(snap.a);
  const near = [];
  for (let t = 0; t < 4; t++) { const i = Math.round(na[0] / S) + Math.floor((rnd() - 0.5) * 40), j = Math.round(na[1] / S) + Math.floor((rnd() - 0.5) * 40); if (i >= 0 && j >= 0 && i < W && j < W) near.push([i, j]); }
  // vind interne knoopnummers via nodeXY: loop door N (klein genoeg)
  const byId = new Map(); for (let n = 0; n < W * W; n++) byId.set(nodeId(n), n);
  const needs = near.map(([i, j]) => byId.get(i * W + j));
  const c1 = RG.roadCostsFor(snap, toward, false, needs);
  for (const n of needs) ok(Math.abs(c1.dist[n] - R[nodeId(n)]) < 0.05 || (c1.dist[n] === Infinity && R[nodeId(n)] === Infinity), `deels ${k}: knoop ${n} ${c1.dist[n]} <> ${R[nodeId(n)]}`);
  // hervat met andere knopen, ver weg
  const far = [byId.get(0), byId.get((W - 1) * W + W - 1), byId.get(Math.floor(W / 2) * W + 7)];
  const c2 = RG.roadCostsFor(snap, toward, false, far);
  ok(c2 === c1, 'dezelfde cachevermelding wordt hervat');
  for (const n of [...needs, ...far]) ok(Math.abs(c2.dist[n] - R[nodeId(n)]) < 0.05 || (c2.dist[n] === Infinity && R[nodeId(n)] === Infinity), `hervat ${k}: knoop ${n}`);
  // volledig
  const c3 = RG.roadCosts(snap, toward, false);
  let bad = 0;
  for (let n = 0; n < W * W; n += 7) { const r = R[nodeId(n)]; if (!(Math.abs(c3.dist[n] - r) < 0.05 || (c3.dist[n] === Infinity && r === Infinity))) bad++; }
  ok(bad === 0, `volledig ${k}: ${bad} afwijkende knopen`);
}

// 2) roadPath: de lengte van het pad is de referentiekost (dichtbij en ver, eenrichting meegeteld)
const plen = (p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };
for (let k = 0; k < 40; k++) {
  const a = randSnap();
  let b;
  if (k % 2) b = RG.snapRoad(Math.min((W - 1) * S, Math.max(0, a.x + (rnd() - 0.5) * 900)), Math.min((W - 1) * S, Math.max(0, a.y + (rnd() - 0.5) * 900)), 100); else b = randSnap();
  if (!a || !b || (a.a === b.a && a.b === b.b)) continue;
  const p = RG.roadPath(a, b, false);
  const R = ref(b, true);
  const cb = R[id(...RG.nodeXY(a.b))] + a.db, ca = a.one ? Infinity : R[id(...RG.nodeXY(a.a))] + a.da, best = Math.min(ca, cb);
  if (!Number.isFinite(best)) { ok(p === null, `geen pad ${k}`); continue; }
  ok(p && Math.abs(plen(p) - (best + b.da * 0 + 0)) < Math.max(0.5, plen(p) * 1e-4) + 0, `padlengte ${k}: ${p && plen(p)} <> ${best}`);
}

// 3) microbench: kost van één route naar een nieuw doel (elke keer een andere cachesleutel)
const tijd = (f, reps) => { const t0 = process.hrtime.bigint(); for (let i = 0; i < reps; i++) f(i); return Number(process.hrtime.bigint() - t0) / 1e6 / reps; };
const snaps = []; for (let i = 0; i < 12; i++) { const a = randSnap(); snaps.push([a, RG.snapRoad(Math.min((W - 1) * S, Math.max(0, a.x + 600 + i * 7)), Math.min((W - 1) * S, a.y + 450), 100)]); }
const kort = tijd((i) => RG.roadPath(snaps[i][0], snaps[i][1], 'foot'), 12);
const volledig = tijd((i) => { const [a, b] = snaps[i]; const c = RG.roadCosts(b, true, 'u'); return c.dist[a.b]; }, 12);
console.log(`${W * W} knopen: route over ~750 m ${kort.toFixed(2)} ms, hele netkosten ${volledig.toFixed(2)} ms (x${(volledig / kort).toFixed(0)})`);
ok(kort < volledig, 'een korte route rekent minder dan het hele net');
console.log(fail ? `${fail} fout(en)` : 'snelheid_wegroute_test: ok');
process.exit(fail ? 1 : 0);
