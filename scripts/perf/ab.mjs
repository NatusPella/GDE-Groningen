// A/B on one route with interleaved runs (A B A B ...), for a busy machine where the frame interval says little:
// the main-thread CPU time per frame (mcpu, from the thread sampler of run.mjs) and the hitch sections are compared.
//   node scripts/perf/ab.mjs <tag> <rounds> <route> "<name>=<electron flags>" "<name>=<electron flags>" ...
//   e.g. node scripts/perf/ab.mjs sh 4 foot "aan=" "uit=--url-flags=perfoff=schaduw"
// Env: as run.mjs (PERF_DUR, PERF_SETTLE, PERF_LOCKS, ...); PRESET (default: hoog, autoResolution off so the load adaptation stays out).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.env.PERF_OUT || path.join(os.tmpdir(), 'gde-perf');
const [tag, roundsArg, route, ...variants] = process.argv.slice(2);
if (!tag || !route || variants.length < 2) { console.error('usage: node scripts/perf/ab.mjs <tag> <rounds> <route> "<name>=<flags>" ...'); process.exit(2); }
const PRESET = process.env.PRESET || '--preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false';
const vs = variants.map((v) => { const i = v.indexOf('='); return { name: v.slice(0, i), flags: v.slice(i + 1).split(' ').filter(Boolean), runs: [] }; });
const med = (a) => { const s = a.filter((x) => x != null).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
const rounds = Number(roundsArg) || 3;
for (let i = 1; i <= rounds; i++) {
  for (const v of vs) {
    const name = `${tag}-${v.name}-${i}`;
    spawnSync(process.execPath, [path.join(HERE, 'run.mjs'), name, PRESET, '--hitch', ...v.flags], { stdio: 'ignore', env: { ...process.env, PERF_ONLY: route, PERF_OUT: OUT } });
    try {
      const d = JSON.parse(fs.readFileSync(path.join(OUT, name + '.json'), 'utf8'));
      const r = d.routes[route], t = (d.threadCpu || {})[route] || {};
      v.runs.push({ mcpu: t.mainMsPerFrame, gpuThr: t.gpuThreadMsPerFrame, avg: r.avg, p50: r.p50, cpu50: r.cpuP50, calls: r.callsPerFrame, frames: r.frames, sec: (r.hitch || {}).sections || {}, procs: d.machine && d.machine.electronProcsBefore });
      console.error(name, 'mcpu', t.mainMsPerFrame, 'avg', r.avg, 'calls', r.callsPerFrame, 'frames', r.frames);
    } catch (e) { console.error(name, 'failed', String(e).slice(0, 80)); }
  }
}
const secNames = new Set(); for (const v of vs) for (const r of v.runs) for (const k of Object.keys(r.sec)) secNames.add(k);
console.log(`route ${route}, ${rounds} rondes, mediaan per variant (mcpu = CPU-tijd hoofdthread per frame, ms)`);
console.log('variant'.padEnd(14) + ['mcpu', 'avg', 'p50', 'cpu50', 'calls', 'gpuThr', 'frames'].map((h) => h.padStart(9)).join(''));
for (const v of vs) console.log(v.name.padEnd(14) + [med(v.runs.map((r) => r.mcpu)), med(v.runs.map((r) => r.avg)), med(v.runs.map((r) => r.p50)), med(v.runs.map((r) => r.cpu50)), med(v.runs.map((r) => r.calls)), med(v.runs.map((r) => r.gpuThr)), med(v.runs.map((r) => r.frames))].map((x) => String(x == null ? '-' : x).padStart(9)).join(''));
console.log('mcpu per run: ' + vs.map((v) => v.name + ' [' + v.runs.map((r) => r.mcpu).join(', ') + ']').join('  '));
const rows = [...secNames].map((k) => [k, ...vs.map((v) => med(v.runs.map((r) => r.sec[k])))]).filter((r) => r.slice(1).some((x) => x > 0.3)).sort((a, b) => Math.max(...b.slice(1)) - Math.max(...a.slice(1)));
console.log('sectie (ms/frame, mediaan)'.padEnd(28) + vs.map((v) => v.name.padStart(9)).join(''));
for (const r of rows.slice(0, 24)) console.log(r[0].padEnd(28) + r.slice(1).map((x) => String(x == null ? '-' : x).padStart(9)).join(''));
