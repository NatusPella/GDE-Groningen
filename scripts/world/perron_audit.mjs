// Audit van de perrons en trappen (#436):  node scripts/world/perron_audit.mjs [--strict]
// Voor elk station van de stad (data/cache/province nodig, de stadsbouw duurt een paar minuten):
//   - elk station heeft een perron binnen 400 m;
//   - elke strook ligt vlak op de spoorvloer + 1,02 m en raakt de baan van de trein niet (minstens PLATFORM_EDGE van elk spoor);
//   - elke strook heeft een trap (hoog perron) of helling (laag perron) naar straatniveau, van 1:3,6 of 1:12, met niets in de weg
//     (gebouw, water, weg, spoor, ander perron: rep.zonderTrap van de bouw);
//   - de trap is te belopen: van de voet naar het perron zonder sprong van meer dan een stap (surfaceAt, zoals het spel);
//   - de rand is dicht: een voetganger of auto op straatniveau komt er niet doorheen, behalve bij een trap.
import '../node3d.mjs';
import { loadStadData } from '../lib/loadworld.mjs';

const strict = process.argv.includes('--strict');
const R = await import('../../game/js/railprofile.js');
const P = await import('../../game/js/perrons.js');
const E = await import('../../game/js/elevation.js');
const d = await loadStadData();
const rows = d.perrons || [];
const bad = [];
const fail = (what) => bad.push(what);
console.log(`perrons: ${rows.length} stroken, ${rows.reduce((a, r) => a + (r.r || []).length, 0)} trappen of hellingen`);

const idx = R.railHeightIndex(d.rails);
const segd = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-9; const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2)); return Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t); };

for (const st of d.stations || []) {
  const n = rows.filter((r) => r.p.some((q) => Math.hypot(q[0] - st.x, q[1] - st.y) < 400)).length;
  console.log(`  ${st.name}: ${n} perrons`);
  if (!n) fail(`${st.name}: geen perron`);
}

const elev = E.addPerrons({ perrons: rows, roads: [], terrainOn: false }, { has: false });
for (const row of rows) {
  const tag = `${row.st || '?'} ${row.nm} (${row.id})`;
  let worstEdge = Infinity, worstZ = 0;
  for (const q of row.p) {
    for (const r of d.rails) for (let i = 0; i < r.pts.length - 1; i++) {
      if (Math.abs(r.pts[i][0] - q[0]) > 60 && Math.abs(r.pts[i + 1][0] - q[0]) > 60) continue;
      worstEdge = Math.min(worstEdge, segd(q[0], q[1], r.pts[i], r.pts[i + 1]) - q[2]);
    }
    worstZ = Math.max(worstZ, Math.abs(q[3] - (R.railHeightAt(idx, q[0], q[1], 15) + P.PERRON_TOP)));
  }
  if (worstEdge < R.PLATFORM_EDGE - 0.02) fail(`${tag}: ligt ${worstEdge.toFixed(2)} m van een spoor (minimaal ${R.PLATFORM_EDGE})`);
  if (worstZ > 0.05) fail(`${tag}: ${worstZ.toFixed(2)} m naast spoorvloer + ${P.PERRON_TOP.toFixed(2)}`);
  if (!(row.r || []).length) { fail(`${tag}: geen trap of helling`); continue; }
  for (const r of row.r) {
    const L = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]), g = (r.za - r.zb) / L;
    if (g > 0.29) fail(`${tag}: ${r.k} te steil (${(g * 100).toFixed(0)} %)`);
    const s = { z: 0, ribbon: null };
    let jump = 0, z = 0;
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, x = r.b[0] + (r.a[0] - r.b[0]) * t, y = r.b[1] + (r.a[1] - r.b[1]) * t;
      const before = s.z;
      E.surfaceAt(elev, x, y, s);
      jump = Math.max(jump, Math.abs(s.z - before));
      z = s.z;
    }
    if (jump > 0.5 || Math.abs(z - r.za) > 0.15) fail(`${tag}: ${r.k} niet te belopen (sprong ${jump.toFixed(2)}, boven ${z.toFixed(2)} van ${r.za})`);
    // de rand is dicht, behalve bij de aanzet van de trap: een punt in het midden van een lange rand houdt een voetganger tegen
  }
  const mid = row.p[Math.floor(row.p.length / 2)];
  const nx = -(row.p[Math.floor(row.p.length / 2) + 1][1] - mid[1]), ny = row.p[Math.floor(row.p.length / 2) + 1][0] - mid[0], l = Math.hypot(nx, ny) || 1;
  const gap = (row.r || []).some((r) => Math.hypot(r.a[0] - mid[0], r.a[1] - mid[1]) < mid[2] + 6);
  if (!gap) {
    const ex = mid[0] + (nx / l) * (mid[2] - 0.5), ey = mid[1] + (ny / l) * (mid[2] - 0.5);
    if (!E.resolveElevWalls(elev, ex, ey, 0, 0.35) && row.p[0][3] > P.WALK_STEP + 0.01) fail(`${tag}: de rand houdt een voetganger niet tegen`);
    if (!E.elevWallContact(elev, ex, ey, 0, 1.4, false, null)) fail(`${tag}: de rand houdt een auto niet tegen`);
  }
}
for (const b of bad) console.log('  FOUT ' + b);
console.log(bad.length ? `${bad.length} problemen` : 'perrons en trappen in orde');
process.exit(strict && bad.length ? 1 : 0);
