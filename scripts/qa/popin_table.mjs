// Tabel voor/na uit de popin-<tag>.json-bestanden van scripts/qa/popin.mjs (#1354).
//   node scripts/qa/popin_table.mjs <map> voor na [cuts]   -> markdown
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...tags] = process.argv.slice(2);
const load = (t) => { try { return JSON.parse(fs.readFileSync(path.join(dir, `popin-${t}.json`), 'utf8')); } catch (e) { return null; } };
const R = Object.fromEntries(tags.map((t) => [t, load(t)]));
const f = (v, d = 1) => (v === null || v === undefined ? '-' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v));
const routes = [...new Set(tags.flatMap((t) => Object.keys((R[t] && R[t].routes) || {})))];
const cols = [
  ['zichtbaar/s', (r) => r.visPerS], ['per km', (r) => r.visPerKm], ['<60 m/s', (r) => (r.visNear60 / r.dur)], ['<60 m per km', (r) => r.near60PerKm],
  ['na klaar (oud)', (r) => r.visClaimOld], ['wissels', (r) => r.visSwaps], ['uploads', (r) => r.gl && r.gl.uploads], ['upload >2 ms', (r) => r.gl && r.gl.upHitch2],
  ['slechtste upload ms', (r) => r.gl && r.gl.worstUpMs], ['nieuwe programma\'s', (r) => r.gl && r.gl.programsNew], ['linkms', (r) => r.gl && r.gl.linkMs],
  ['frame p50', (r) => r.frameMs && r.frameMs.p50], ['p95', (r) => r.frameMs && r.frameMs.p95], ['max', (r) => r.frameMs && r.frameMs.max],
  ['LOD dekking <140 m %', (r) => { const b = r.lod && r.lod.bands; if (!b) return null; const n = b[0].n + b[1].n, ok = b[0].n * (b[0].okPct || 0) / 100 + b[1].n * (b[1].okPct || 0) / 100; return n ? 100 * ok / n : null; }],
  ['LOD gaten', (r) => r.lod && r.lod.holes], ['laat detail', (r) => r.lod && r.lod.lateDetail], ['LOD-wissels', (r) => r.lod && r.lod.swaps],
];
for (const route of routes) {
  console.log(`\n### ${route}\n`);
  console.log(['meting', ...tags].join(' | ') + '\n' + ['---', ...tags.map(() => '---')].join(' | '));
  for (const [name, fn] of cols) console.log([name, ...tags.map((t) => { const r = R[t] && R[t].routes && R[t].routes[route]; try { return r ? f(fn(r)) : '-'; } catch (e) { return '-'; } })].join(' | '));
}
const cutIds = [...new Set(tags.flatMap((t) => Object.keys((R[t] && R[t].cuts) || {})))];
if (cutIds.length) {
  console.log('\n### cutscenes (zichtbare gebeurtenissen na het begin van de scène, per shot)\n');
  console.log(['scène', ...tags.flatMap((t) => [`${t}: wacht ms`, `${t}: totaal`, `${t}: per shot`])].join(' | '));
  console.log(['---', ...tags.flatMap(() => ['---', '---', '---'])].join(' | '));
  for (const id of cutIds) console.log([id, ...tags.flatMap((t) => { const r = R[t] && R[t].cuts && R[t].cuts[id]; if (!r || r.fout) return ['-', '-', '-']; return [f(r.scene && r.scene.startWaitMs), f((r.perShot || []).reduce((s, v) => s + v, 0) + (r.visBeforeStart || 0)), (r.perShot || []).join(',')]; })].join(' | '));
}
