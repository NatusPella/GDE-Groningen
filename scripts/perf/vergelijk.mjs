// Twee uitkomsten van scripts/perf/run.mjs naast elkaar (voor en na een wijziging), per route: frametijd (gem, p95, p99, max), haperingen
// (frames boven 50 en 100 ms), hoofdthread-CPU per frame (mcpu), tekenaanroepen, JS-heap, geometrieen en texturen. Voor de reislek-route
// (PERF_ONLY=reislek) ook de groei van ronde tot ronde per plek. Een verschil telt pas als het groter is dan de ruis tussen twee runs van
// hetzelfde: draai het oude dus twee keer (a1, a2) en vergelijk ook die twee.
//   node scripts/perf/vergelijk.mjs <voor.json> <na.json> [route,route]
// Exit 1 als de reislek-route een stijgende heap, geometrie- of textuurtelling laat zien (drift boven de grens: --heap=100 MB, --geo=200, --tex=50).
import fs from 'node:fs';

const [fa, fb, only] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!fa || !fb) { console.error('gebruik: node scripts/perf/vergelijk.mjs <voor.json> <na.json> [route,route]'); process.exit(2); }
const lim = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? Number(a.slice(k.length + 3)) : d; };
const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
const pick = only ? only.split(',') : [...new Set([...Object.keys(A.routes || {}), ...Object.keys(B.routes || {})])];
const COLS = [['avg', 'gem'], ['p95', 'p95'], ['p99', 'p99'], ['max', 'max'], ['over50', '>50'], ['over100', '>100'], ['mainCpuPerFrame', 'mcpu'], ['callsPerFrame', 'calls'], ['heapMB', 'heap'], ['geometries', 'geo'], ['textures', 'tex']];
const val = (r, k) => (r == null ? null : k === 'over50' || k === 'over100' ? (r.hitch ? r.hitch[k] : null) : r[k] ?? null);
const fmt = (x) => (x == null ? '-' : Number.isInteger(x) ? String(x) : x.toFixed(1));
console.log(`voor: ${fa}${A.machine ? `  (cpu ${A.machine.cpuBusyBeforePct}%, ${A.machine.electronProcsBefore} electron)` : ''}`);
console.log(`na:   ${fb}${B.machine ? `  (cpu ${B.machine.cpuBusyBeforePct}%, ${B.machine.electronProcsBefore} electron)` : ''}`);
console.log('route'.padEnd(11) + ''.padEnd(5) + COLS.map(([, h]) => h.padStart(8)).join(''));
for (const n of pick) {
  const ra = (A.routes || {})[n], rb = (B.routes || {})[n];
  if (!ra && !rb) continue;
  if ((ra && ra.error) || (rb && rb.error)) { console.log(n.padEnd(11) + 'FOUT ' + ((ra && ra.error) || (rb && rb.error))); continue; }
  const row = (lab, r) => console.log(n.padEnd(11) + lab.padEnd(5) + COLS.map(([k]) => fmt(val(r, k)).padStart(8)).join(''));
  row('voor', ra); row('na', rb);
  console.log(''.padEnd(11) + 'diff '.padEnd(5) + COLS.map(([k]) => { const a = val(ra, k), b = val(rb, k); return (a == null || b == null ? '-' : (b - a >= 0 ? '+' : '') + (b - a).toFixed(1)).padStart(8); }).join(''));
}
let bad = false;
for (const [lab, R] of [['voor', A], ['na', B]]) {
  const r = (R.routes || {}).reislek;
  if (!r || !r.driftLastVsFirst) continue;
  const d = r.driftLastVsFirst, mx = (a) => a.reduce((m, v) => (Number.isFinite(v) ? Math.max(m, v) : m), -Infinity);
  const lines = [['heapMB', lim('heap', 100)], ['geometries', lim('geo', 200)], ['textures', lim('tex', 50)], ['programs', 50], ['materials', 400], ['nodes', 4000], ['tiles', 150]];
  console.log(`reislek ${lab}: ${r.laps} rondes x ${r.places.length} plekken, groei laatste ronde tegen eerste (hoogste plek):`);
  for (const [k, max] of lines) { const m = mx(d[k] || []); const flag = m > max ? '  LEK?' : ''; if (m > max && lab === 'na') bad = true; console.log(`  ${k.padEnd(11)} ${(d[k] || []).map(fmt).join(' / ')}${flag}`); }
}
process.exit(bad ? 1 : 0);
