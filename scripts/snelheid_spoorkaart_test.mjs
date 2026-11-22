// Snelheid (22-11): drawRailsOnMap vraagt alleen de rasterbakjes onder het beeld en test de zichtbaarheid één keer.
//   GDE_VENDOR_CACHE=desktop/vendor-cache node scripts/snelheid_spoorkaart_test.mjs
// Bewijs: dezelfde getekende sporen als de oude volledige scan (referentie hieronder) en minder tijd per tekenbeurt.
import './node3d.mjs';
import { SpatialGrid, gridItems } from '../game/js/spatialgrid.js';
const { drawRailsOnMap } = await import('../game/js/railway.js');

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('FOUT', m); } };
let seed = 777;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// 2500 sporen van 30 punten verspreid over 40 x 40 km, in een raster met bakjes van 400 m
const grid = new SpatialGrid(400);
const alle = [];
for (let i = 0; i < 2500; i++) {
  let x = (rnd() - 0.5) * 40000, y = (rnd() - 0.5) * 40000, h = rnd() * 6.28;
  const pts = [];
  for (let k = 0; k < 30; k++) { h += (rnd() - 0.5) * 0.3; x += Math.cos(h) * 40; y += Math.sin(h) * 40; pts.push([x, y]); }
  const bounds = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  const r = { pts, bounds }; alle.push(r); grid.insert(r, bounds);
}
const map = { railGrid: grid };

function ctxMaker() {
  const log = [];
  let cur = null;
  const c = new Proxy({}, { get: (t, k) => {
    if (k === 'beginPath') return () => { cur = []; };
    if (k === 'moveTo' || k === 'lineTo') return (px, py) => { cur.push(px + ',' + py); };
    if (k === 'stroke') return () => { log.push(cur.join(';')); };
    return () => {};
  }, set: () => true });
  return { c, log };
}
// de oude volledige scan als referentie
function oud(ctx, m, x0, y0, x1, y1) {
  const rails = gridItems(m.railGrid);
  for (const pass of [0, 1]) for (const r of rails) {
    const P = r.pts; let inView = false;
    for (const q of P) if (q[0] > x0 && q[0] < x1 && q[1] > y0 && q[1] < y1) { inView = true; break; }
    if (!inView) continue;
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
  }
}
const views = [[-500, -500, 500, 500], [-3000, 2000, 1500, 6000], [-20000, -20000, 20000, 20000], [19000, 19000, 21000, 21000], [100000, 100000, 100500, 100500]];
for (const v of views) {
  const a = ctxMaker(), b = ctxMaker();
  oud(a.c, map, ...v); drawRailsOnMap(b.c, map, ...v, 3.2);
  const A = a.log.slice().sort(), B = b.log.slice().sort();
  ok(A.length === B.length && A.every((s, i) => s === B[i]), `zelfde sporen in beeld ${v}`);
}
// zonder raster of zonder query: geen fout
{ const b = ctxMaker(); drawRailsOnMap(b.c, {}, 0, 0, 10, 10, 3.2); ok(b.log.length === 0, 'geen raster, geen sporen'); }

const tijd = (f, reps) => { f(); const t0 = process.hrtime.bigint(); for (let i = 0; i < reps; i++) f(); return Number(process.hrtime.bigint() - t0) / 1e6 / reps; };
const mini = [-450, -450, 450, 450];
const nul = ctxMaker().c;
const t0 = tijd(() => oud(nul, map, ...mini), 60);
const t1 = tijd(() => drawRailsOnMap(nul, map, ...mini, 3.2), 60);
console.log(`minimap-sporen (2500 sporen, beeld 900 m): oud ${t0.toFixed(3)} ms, nieuw ${t1.toFixed(3)} ms (x${(t0 / t1).toFixed(1)})`);
ok(t1 < t0, 'nieuw is sneller dan de volledige scan');
console.log(fail ? `${fail} fout(en)` : 'snelheid_spoorkaart_test: ok');
process.exit(fail ? 1 : 0);
