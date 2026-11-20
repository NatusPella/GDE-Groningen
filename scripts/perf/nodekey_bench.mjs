// CPU-profiel 21-11: de knooppuntindex van roadsurface.js en vehicle/traffic.js sleutelde elk hoekpunt van alle wegen met een
// string ('x,y'); bij elke wegwijziging is dat tienduizenden strings. Hier: oude stringsleutel tegen het getal, zelfde
// groepering (aantal sleutels en lijstlengtes gelijk) en de tijd van het bouwen van de index.
// Gebruik: node scripts/perf/nodekey_bench.mjs [wegen=18000] [rondes=5]
const NR = +process.argv[2] || 18000, ROUNDS = +process.argv[3] || 5;
let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const roads = [];
for (let i = 0; i < NR; i++) {
  const n = 2 + Math.floor(rnd() * 14), pts = [];
  let x = Math.round(rnd() * 40000) / 2 - 10000, y = Math.round(rnd() * 40000) / 2 - 10000;
  for (let k = 0; k < n; k++) { pts.push([x, y]); x += Math.round(rnd() * 60) / 2; y += Math.round(rnd() * 60) / 2; }
  roads.push({ pts });
}
// kruispunten: elke 7e weg start op het eindpunt van de vorige
for (let i = 7; i < NR; i += 7) roads[i].pts[0] = roads[i - 1].pts[roads[i - 1].pts.length - 1].slice();
const keyOud = (p) => Math.round(p[0] * 10) + ',' + Math.round(p[1] * 10);
const keyNieuw = (p) => (Math.round(p[0] * 10) + 33554432) * 67108864 + (Math.round(p[1] * 10) + 33554432);
const build = (key) => {
  const idx = new Map();
  for (const r of roads) for (let i = 0; i < r.pts.length; i++) {
    const k = key(r.pts[i]);
    let a = idx.get(k);
    if (!a) idx.set(k, a = []);
    a.push(r, i);
  }
  return idx;
};
const shape = (m) => { const h = new Map(); for (const a of m.values()) h.set(a.length, (h.get(a.length) || 0) + 1); return JSON.stringify([...h].sort((p, q) => p[0] - q[0])); };
build(keyOud); build(keyNieuw);
const t = (key) => { const r = []; for (let i = 0; i < ROUNDS; i++) { const s = performance.now(); build(key); r.push(performance.now() - s); } r.sort((a, b) => a - b); return r[r.length >> 1]; };
const to = t(keyOud), tn = t(keyNieuw);
const a = build(keyOud), b = build(keyNieuw);
console.log(`oud ${to.toFixed(1)} ms, nieuw ${tn.toFixed(1)} ms (${(to / tn).toFixed(1)}x), sleutels ${a.size} / ${b.size}`);
if (a.size !== b.size || shape(a) !== shape(b)) { console.error('GROEPERING VERSCHILT'); process.exit(1); }
