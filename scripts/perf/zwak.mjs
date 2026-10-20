// Weak hardware, simulated (#56): the same routes under CPU throttling (CDP Emulation.setCPUThrottlingRate through --cpu-throttle),
// a software GPU (SwiftShader), a small window and several instances at once. One line per scenario and route.
//   node scripts/perf/zwak.mjs [scenario,scenario...]    (all when none named)
// Env: PERF_OUT (default <tmp>/gde-perf), ZWAK_ROUTES (default foot,druk), ZWAK_DUR (ms per route, default 25000), PERF_LOCKS (Electron slots, see run.mjs).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PERF_OUT || path.join(os.tmpdir(), 'gde-perf');
const R720 = '--window-size=1280x720', SW = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const SCEN = {
  'ref-hoog-1080': { flags: ['--preset=hoog'] },
  'laag-1080': { flags: ['--preset=laag'] },
  'laag-720': { flags: ['--preset=laag', R720] },
  'thr2-laag-720': { flags: ['--preset=laag', R720, '--cpu-throttle=2'] },
  'thr3-laag-720': { flags: ['--preset=laag', R720, '--cpu-throttle=3'] },
  'thr4-laag-720': { flags: ['--preset=laag', R720, '--cpu-throttle=4'] },
  'thr6-laag-720': { flags: ['--preset=laag', R720, '--cpu-throttle=6'] },
  'thr4-hoog-720-auto': { flags: ['--preset=hoog', R720, '--cpu-throttle=4'] },
  'thr6-hoog-720-auto': { flags: ['--preset=hoog', R720, '--cpu-throttle=6'] },
  'swiftshader-laag-720': { flags: ['--preset=laag', R720, ...SW] },
  'x2-laag-1080': { flags: ['--preset=laag'], instances: 2 },
  'x3-laag-1080': { flags: ['--preset=laag'], instances: 3 },
  'x3-hoog-1080': { flags: ['--preset=hoog'], instances: 3 },
};
const want = process.argv[2] ? process.argv[2].split(',') : Object.keys(SCEN);
const routes = process.env.ZWAK_ROUTES || 'foot,druk';
fs.mkdirSync(OUT, { recursive: true });

const one = (name, flags) => new Promise((res) => {
  const c = spawn(process.execPath, [path.join(HERE, 'run.mjs'), name, ...flags], { env: { ...process.env, PERF_OUT: OUT, PERF_ONLY: routes, PERF_DUR: process.env.ZWAK_DUR || '25000', PERF_LOCKS: process.env.PERF_LOCKS || '' }, stdio: ['ignore', 'ignore', 'ignore'] });
  c.on('exit', () => res(name));
});
const rows = [];
for (const sc of want) {
  const s = SCEN[sc];
  if (!s) { console.error('unknown scenario ' + sc); continue; }
  const n = s.instances || 1;
  const names = Array.from({ length: n }, (_, i) => `zwak-${process.env.ZWAK_TAG ? process.env.ZWAK_TAG + "-" : ""}${sc}${n > 1 ? '-i' + (i + 1) : ''}`);
  await Promise.all(names.map((nm) => one(nm, s.flags)));
  for (const nm of names) {
    let r = null;
    try { r = JSON.parse(fs.readFileSync(path.join(OUT, nm + '.json'), 'utf8')); } catch { /* none */ }
    if (!r) { rows.push({ sc: nm, error: 'no result' }); continue; }
    for (const [rn, q] of Object.entries(r.routes || {})) {
      if (!q || q.error) continue;
      rows.push({ sc: nm, route: rn, gpu: (r.gl && r.gl.renderer || '').replace(/ANGLE \(|\)/g, '').slice(0, 40), css: (r.css || []).join('x'), avg: q.avg, fps: +(1000 / q.avg).toFixed(1), p95: q.p95, p99: q.p99, over50: q.over50, cpu: q.cpuAvg, calls: q.callsPerFrame,
        dyn: q.dyn ? `${q.dyn.scale}/L${q.dyn.cpuLevel}` : '-', sim: q.simLevel, tileQueue: q.tiles ? q.tiles.maxQueue : null, tileLate: q.tiles ? q.tiles.late : null, frameQueueOver: q.tiles && q.tiles.frameQueue ? q.tiles.frameQueue.over : null, titleMs: r.loadMarks && r.loadMarks.title, heap: q.heapMB, loadMenuMs: r.loadMarks && r.loadMarks.menu, sinceNavMs: r.sinceNavMs, cores: r.cores });
    }
  }
}
fs.writeFileSync(path.join(OUT, 'zwak-result' + (process.env.ZWAK_TAG ? '-' + process.env.ZWAK_TAG : '') + '.json'), JSON.stringify(rows));
console.log('| scenario | route | fps | gem. ms | p95 | p99 | >50 ms | cpu ms | calls | auto (schaal/cpuniveau) | tegelwachtrij max (te laat) | titel ms | menu ms | venster | gpu |');
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---|---|');
for (const r of rows) console.log(r.error ? `| ${r.sc} | ${r.error} |` : `| ${r.sc} | ${r.route} | ${r.fps} | ${r.avg} | ${r.p95} | ${r.p99} | ${r.over50} | ${r.cpu} | ${r.calls} | ${r.dyn} | ${r.tileQueue} (${r.tileLate}) | ${r.titleMs} | ${r.loadMenuMs} | ${r.css} | ${r.gpu} |`);
