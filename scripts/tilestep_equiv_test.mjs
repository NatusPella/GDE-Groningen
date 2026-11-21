// De tegelstap-versnellingen van #1052 (omhullende-uitsluiting in waterDistance en markDryRoad, hergebruikt
// segmentresultaat in propfilter) geven dezelfde uitkomst als de rechttoe-rechtaan versie op willekeurige data.
//   node scripts/tilestep_equiv_test.mjs
import './node3d.mjs';
const { waterDistance, distToOutline } = await import('../game/js/propfilter.js');
const { markDryRoad } = await import('../game/js/mapdata.js');
const { SpatialGrid } = await import('../game/js/spatialgrid.js');
const { pointInPolygon, polygonBounds, closestPointOnSegment } = await import('../game/js/util.js');
const { waterPolyIn } = await import('../game/js/waterlevels.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// referentie: de oude waterDistance (geen omhullende-uitsluiting, vers object per segment)
function refDist(P, x, y) {
  let best = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const cp = closestPointOnSegment(x, y, P[j][0], P[j][1], P[i][0], P[i][1]); if (cp.dist2 < best) best = cp.dist2; }
  return Math.sqrt(best);
}
function refWaterDistance(waters, x, y, reach) {
  let best = Infinity;
  for (const w of waters) {
    const q = w.bounds || (w.bounds = polygonBounds(w.pts));
    if (x < q[0] - reach || x > q[2] + reach || y < q[1] - reach || y > q[3] + reach) continue;
    if (pointInPolygon(x, y, w.pts)) return 0;
    const d = refDist(w.pts, x, y);
    if (d < best) best = d;
  }
  return best;
}
const blob = (cx, cy, r, k) => Array.from({ length: k }, (_, i) => { const a = (i / k) * Math.PI * 2; const rr = r * (0.6 + rnd() * 0.4); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });

const waters = Array.from({ length: 14 }, () => ({ pts: blob(rnd() * 600, rnd() * 600, 20 + rnd() * 60, 6 + Math.floor(rnd() * 40)) }));
const map = { waterNear: () => waters, flatWaterNear: null };
let same = 0;
for (let k = 0; k < 600; k++) {
  const x = rnd() * 700 - 50, y = rnd() * 700 - 50, reach = [10, 30, 60][k % 3];
  const a = waterDistance(map, x, y, reach), b = refWaterDistance(waters, x, y, reach);
  if (a === b || (Number.isFinite(a) && Math.abs(a - b) < 1e-9)) same++;
}
ok(same === 600, 'waterDistance: dezelfde afstand als de referentie op 600 willekeurige punten', `${same}/600`);
ok(Math.abs(distToOutline(waters[0].pts, 10, 10) - refDist(waters[0].pts, 10, 10)) < 1e-12, 'distToOutline: gelijk aan de referentie');

// markDryRoad: een waterraster met overal vlakken; weg met en zonder omhullende-uitsluiting
function mkMap(ws) {
  const grid = new SpatialGrid(100);
  for (const w of ws) { w.bounds = polygonBounds(w.pts); grid.insert(w, w.bounds); }
  return { waterNear: true, waterGrid: grid };
}
function refMarkDry(m, r) {
  const pts = r.pts;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  const polys = m.waterGrid.query(x0 - 0.5, y0 - 0.5, x1 + 0.5, y1 + 0.5);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
    for (let k = 0; k <= steps; k++) if (waterPolyIn(polys, ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps)) return true;
  }
  return false;
}
const wm = mkMap(waters.map((w) => ({ pts: w.pts.slice() })));
let agree = 0, dry = 0;
const R = 400;
for (let k = 0; k < R; k++) {
  const x = rnd() * 600, y = rnd() * 600, a = rnd() * 6.28, len = 10 + rnd() * 200;
  const pts = [[x, y], [x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5], [x + Math.cos(a) * len, y + Math.sin(a) * len]];
  const r1 = { cat: 'normal', pts: pts.map((p) => p.slice()) };
  const want = refMarkDry(wm, r1);
  const got = markDryRoad(wm, { cat: 'normal', pts: pts.map((p) => p.slice()) });
  if (want) dry++;
  if (want === got) agree++;
}
ok(agree === R, 'markDryRoad: dezelfde uitkomst als zonder omhullende-uitsluiting', `${agree}/${R}`);
ok(dry > 20 && dry < R - 20, 'de steekproef bevat zowel droge kruisingen als gewone wegen', String(dry));

if (fails) { console.log(`tilestep_equiv_test: ${fails} FOUT(EN) van ${n}`); process.exit(1); }
console.log(`tilestep_equiv_test: ok (${n} checks)`);
