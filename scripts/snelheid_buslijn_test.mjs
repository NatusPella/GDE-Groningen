// Snelheid (22-11): project() in busroutes.js sprong voor een venster nog langs alle punten, en
// nearestLine/linesNear scanden elke lijn volledig. Dit bewijst dat de sneller versie dezelfde uitkomst geeft
// (vergelijking met de naieve referentie op duizenden willekeurige vragen) en meet de winst (microbench).
import * as B from '../game/js/busroutes.js';

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error('FOUT', m); } };

// deterministische lijnen: kronkelige polylijnen van 900-1500 punten verspreid over 30 km
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function maakLijn(id, n, cx, cy, lus) {
  const pts = []; let x = cx, y = cy, h = rnd() * 6.28;
  for (let i = 0; i < n; i++) { h += (rnd() - 0.5) * 0.5; x += Math.cos(h) * (8 + rnd() * 20); y += Math.sin(h) * (8 + rnd() * 20); pts.push([x, y]); }
  if (lus) pts.push([pts[0][0] + 20, pts[0][1] + 20]);
  const stops = []; for (let i = 5; i < n; i += 40) stops.push({ x: pts[i][0] + 3, y: pts[i][1] - 2 });
  return { id, ref: String(id), pts, stops };
}
const lines = B.prepareLines(Array.from({ length: 30 }, (_, i) => maakLijn(i + 1, 900 + (i * 37) % 600, (rnd() - 0.5) * 30000, (rnd() - 0.5) * 30000, i % 5 === 0)));
ok(lines.length === 30, 'lijnen voorbereid');

// naieve referentie (de oude code)
function projectRef(line, x, y, from = 0, to = Infinity, dir = 0) {
  const { pts, cum } = line;
  let best = { d: Infinity, s: 0, x: pts[0][0], y: pts[0][1] };
  for (let i = 0; i < pts.length - 1; i++) {
    if (cum[i + 1] < from || cum[i] > to) continue;
    const a = pts[i], b = pts[i + 1];
    const vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2));
    const px = a[0] + vx * t, py = a[1] + vy * t, d = Math.hypot(x - px, y - py);
    if (d < best.d - 0.01 || (dir > 0 && d < best.d + 0.01)) best = { d, s: cum[i] + Math.sqrt(l2) * t, x: px, y: py };
  }
  return best;
}
const nearestRef = (ls, x, y, maxD = 400) => { let best = null, bd = maxD; for (const l of ls) { const d = projectRef(l, x, y).d; if (d < bd) { bd = d; best = l; } } return best; };
const nearRef = (ls, x, y, maxD = 400) => { const out = []; for (const l of ls) { const d = projectRef(l, x, y).d; if (d < maxD) out.push({ l, d }); } return out.sort((a, b) => a.d - b.d).map((q) => q.l); };

// gelijkheid op veel vragen
const same = (a, b) => a.d === b.d && a.s === b.s && a.x === b.x && a.y === b.y;
let n = 0, vensterN = 0;
for (let k = 0; k < 4000; k++) {
  const L = lines[k % lines.length];
  const q = L.pts[Math.floor(rnd() * L.pts.length)];
  const x = q[0] + (rnd() - 0.5) * 300, y = q[1] + (rnd() - 0.5) * 300;
  const s0 = rnd() * L.length, dir = k % 3 === 0 ? 1 : k % 3 === 1 ? -1 : 0;
  const venster = [[0, Infinity], [s0 - 80, s0 + 160], [s0 - 5, s0 + 5], [L.length + 10, L.length + 50], [-50, 10]][k % 5];
  ok(same(B.project(L, x, y, venster[0], venster[1], dir), projectRef(L, x, y, venster[0], venster[1], dir)), `project ${k}`);
  vensterN++;
  if (k % 4 === 0) {
    const maxD = [40, 400, 4000][k % 3];
    ok(B.nearestLine(lines, x, y, maxD) === nearestRef(lines, x, y, maxD), `nearestLine ${k}`);
    const a = B.linesNear(lines, x, y, maxD), b = nearRef(lines, x, y, maxD);
    ok(a.length === b.length && a.every((l, i) => l === b[i]), `linesNear ${k}`);
    n++;
  }
}
// ver buiten alle lijnen
ok(B.nearestLine(lines, 1e7, 1e7, 400) === null && B.linesNear(lines, 1e7, 1e7, 400).length === 0, 'ver weg: niets');
ok(B.nearestLine([], 0, 0) === null, 'lege lijst');

// microbench: een tik van 20 bussen met venster + de bord-kaart (nearestLine over alle lijnen)
const tijd = (f, reps) => { f(); const t0 = process.hrtime.bigint(); for (let i = 0; i < reps; i++) f(); return Number(process.hrtime.bigint() - t0) / 1e6 / reps; };
const bussen = Array.from({ length: 20 }, (_, i) => { const L = lines[i % lines.length]; const q = L.pts[100 + i * 20]; return { L, x: q[0] + 4, y: q[1] - 3, s: L.cum[100 + i * 20] }; });
const stapNieuw = tijd(() => { for (const b of bussen) B.project(b.L, b.x, b.y, b.s - 80, b.s + 160, 1); }, 400);
const stapOud = tijd(() => { for (const b of bussen) projectRef(b.L, b.x, b.y, b.s - 80, b.s + 160, 1); }, 400);
const q0 = lines[3].pts[300];
const kaartNieuw = tijd(() => B.nearestLine(lines, q0[0], q0[1], 40), 300);
const kaartOud = tijd(() => nearestRef(lines, q0[0], q0[1], 40), 300);
console.log(`20 bussen stepRunner-project: oud ${stapOud.toFixed(3)} ms, nieuw ${stapNieuw.toFixed(3)} ms (x${(stapOud / stapNieuw).toFixed(1)})`);
console.log(`nearestLine 30 lijnen: oud ${kaartOud.toFixed(3)} ms, nieuw ${kaartNieuw.toFixed(3)} ms (x${(kaartOud / kaartNieuw).toFixed(1)})`);
ok(stapNieuw < stapOud, 'venster-project is sneller dan de volledige scan');
ok(kaartNieuw < kaartOud, 'nearestLine met bbox is sneller dan alle lijnen scannen');
console.log(fail ? `${fail} fout(en)` : `snelheid_buslijn_test: ok (${vensterN} project-, ${n} nearestLine-vragen gelijk aan de referentie)`);
process.exit(fail ? 1 : 0);
