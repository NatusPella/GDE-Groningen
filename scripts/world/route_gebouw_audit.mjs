// Route door een gebouw (eigenaar 21-11): telt hoeveel stukken van de routelijn een gebouwvoetafdruk raken.
// Meet per route de planner (route.pts), de strook zoals de 3D-wereld hem tekent (keepRight voor de auto, daarna
// resample, pathlane.js) en het eindpunt (een doel op een gebouw).
//   node scripts/world/route_gebouw_audit.mjs [--n=120] [--strict] [--maxpct=2] [--verbose]
// GDE_PROVINCE_SRC wijst naar data/cache/province van de hoofdmap als de werkboom die niet heeft.
import '../node3d.mjs';
import { loadCityWorld } from '../lib/loadworld.mjs';

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? +a.slice(k.length + 3) : d; };
const N = arg('n', 120);
const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');
const R = await import('../../game/js/routing.js');
const L = await import('../../game/js/pathlane.js');
const map = (await loadCityWorld()).map;

let seed = 21112026;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const roads = map.roads.filter((r) => r.cat && !r.bridge);
const roadPt = () => { const r = pick(roads); const p = pick(r.pts); return [p[0], p[1]]; };
const bld = map.buildings.filter((b) => b.pts && b.pts.length > 3);
const buildingPt = () => { const b = pick(bld); let x = 0, y = 0; for (const p of b.pts) { x += p[0]; y += p[1]; } return [x / b.pts.length, y / b.pts.length]; };
const near = (a, max) => { for (let i = 0; i < 40; i++) { const b = roadPt(); const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > 120 && d < max) return b; } return roadPt(); };

const STEP = 0.5;
// een brug of dek (layer 1) over een gebouw heen (het Forum, een loopbrug) is geen route door de gevel
const bridgeAt = (x, y) => map.roadsNear(x, y, 4).some((r) => (r.bridge || r.layer > 0) && r.pts.some((p, i) => i && distSeg(x, y, r.pts[i - 1], p) < 4));
const distSeg = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };
// de stukken van een lijn die een gevel raken: aantal segmenten en de lengte in het gebouw (om de 0,5 m)
function hits(pts) {
  let seg = 0, len = 0, first = null, cum = 0;
  const total = pts.reduce((t, p, i) => t + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const l2 = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.ceil(l2 / STEP));
    let inside = 0;
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; if (R.insideBuilding(map, x, y) && !bridgeAt(x, y)) inside++; }
    if (inside) { seg++; len += l2 * inside / (n + 1); if (!first) first = { at: [Math.round(ax), Math.round(ay)], fromStart: Math.round(cum), fromEnd: Math.round(total - cum), segLen: Math.round(l2) }; }
    cum += l2;
  }
  return { seg, len, first };
}

// de speler staat waar hij staat: de eerste START_SKIP_M van een route (een startpunt dat zelf in een pand ligt) telt niet mee
const START_SKIP_M = 25;
function afterStart(pts) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + l >= START_SKIP_M) { const k = (START_SKIP_M - acc) / (l || 1); return [[pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k], ...pts.slice(i)]; }
    acc += l;
  }
  return pts.slice(-1);
}

let clock = 0;
const realNow = performance.now.bind(performance);
performance.now = () => realNow() + clock * 1000;
const MODES = [['walk', null], ['bike', { isBike: true, isBoat: false }], ['drive', { isBike: false, isBoat: false }]];
const out = { routes: 0, lost: 0, planBad: 0, laneBad: 0, planSeg: 0, laneSeg: 0, planLen: 0, laneLen: 0, endInside: 0, ms: [] };
const worst = [];
for (let i = 0; i < N; i++) {
  const [name, veh] = MODES[i % 3];
  const a = roadPt();
  const b = i % 4 === 3 ? buildingPt() : near(a, 1500);
  clock += 100;
  const w = { map, time: 0, health: 100, player: { x: a[0], y: a[1], gz: 0, inVehicle: veh ? { ...veh, z: 0 } : null }, addMessage: () => {} };
  R.setUserWaypoint(b[0], b[1], 'doel');
  const t0 = realNow();
  R.updateRouting(0.1, w);
  out.ms.push(realNow() - t0);
  const r = R.getActiveRoute();
  if (!r || r.pts.length < 2) { out.lost++; continue; }
  out.routes++;
  const p = hits(afterStart(r.pts));
  const lane = r.mode === 'drive' ? L.keepRight(r.pts, map) : r.pts;
  const q = hits(afterStart(L.resamplePath(lane)));
  if (p.seg) { out.planBad++; out.planSeg += p.seg; out.planLen += p.len; }
  if (q.seg) { out.laneBad++; out.laneSeg += q.seg; out.laneLen += q.len; }
  const last = r.pts[r.pts.length - 1];
  if (R.insideBuilding(map, last[0], last[1])) out.endInside++;
  if (p.seg || q.seg) worst.push({ mode: r.mode, a: a.map(Math.round), b: b.map(Math.round), planSeg: p.seg, laneSeg: q.seg, first: p.first, planLen: +p.len.toFixed(1), laneLen: +q.len.toFixed(1) });
}
out.ms.sort((x, y) => x - y);
const ms = (f) => +out.ms[Math.min(out.ms.length - 1, Math.floor(out.ms.length * f))].toFixed(1);
console.log(`routes ${out.routes} (zonder route ${out.lost}); planner door gebouw: ${out.planBad} routes, ${out.planSeg} segmenten, ${out.planLen.toFixed(1)} m; strook: ${out.laneBad} routes, ${out.laneSeg} segmenten, ${out.laneLen.toFixed(1)} m; eindpunt in gebouw: ${out.endInside}`);
const rs = R.getRoutingStats();
console.log(`graafbouw ${rs.buildMs.toFixed(0)} ms, ${rs.nodes} knopen, ${rs.driveEdges} autokanten, ${rs.walkEdges} loopkanten`);
console.log(`planningstijd p50 ${ms(0.5)} ms, p95 ${ms(0.95)} ms, max ${ms(1)} ms`);
if (VERBOSE || worst.length) for (const x of worst.slice(0, 15)) console.log(' ', JSON.stringify(x));
// Wat overblijft is een weg die de wereldbouw zelf door een pand legt waar de router niets anders heeft (een doorsteek bij de start) of een
// hoek van enkele meters langs een gevel. Streng: hoogstens MAX_BAD_PCT procent van de routes, geen eindpunt in een gebouw.
const MAX_BAD_PCT = arg('maxpct', 2);
if (STRICT && (Math.max(out.planBad, out.laneBad) * 100 > MAX_BAD_PCT * out.routes || out.endInside)) { console.log('FAIL: een route raakt een gebouw'); process.exit(1); }
