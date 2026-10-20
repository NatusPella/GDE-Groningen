// A/B of two or more variants on one route, with the variants running AT THE SAME TIME (one Electron each,
// started together): on a machine other work runs on, the load changes every minute and a run that
// follows another says little, two that run side by side feel the same load. The main-thread CPU time
// per frame (mcpu, from the thread sampler of run.mjs) is compared per round (the sides swap every round),
// and the hitch sections of the pair are shown.
//   node scripts/perf/ab.mjs <tag> <rounds> <route> "<name>=<electron flags>" "<name>=<electron flags>" ...
//   e.g. node scripts/perf/ab.mjs sh 5 wandel "aan=" "uit=--url-flags=perfoff=schaduw"
// Env: as run.mjs (PERF_DUR, PERF_SETTLE, ...); PERF_LOCKS=<dir> takes one electron slot per variant (mkdir protocol, all at once);
// PRESET (default: hoog, autoResolution off so the load adaptation stays out); SERIAL=1: one after the other.
import { spawn } from 'node:child_process';
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
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const rounds = Number(roundsArg) || 3;
const locks = process.env.PERF_LOCKS;
const held = [];
async function takeSlots(n) {
  if (!locks) return;
  for (;;) {
    for (const k of [1, 2, 3]) {
      if (held.length === n) return;
      try { fs.mkdirSync(path.join(locks, 'electron-' + k)); held.push(path.join(locks, 'electron-' + k)); } catch { /* taken */ }
    }
    if (held.length === n) return;
    // all or nothing: two runs that start apart do not feel the same load
    for (const d of held.splice(0)) { try { fs.rmdirSync(d); } catch { /* gone */ } }
    await sleep(Number(process.env.PERF_LOCK_POLL) || 20000);
  }
}
const releaseSlots = () => { for (const d of held.splice(0)) { try { fs.rmdirSync(d); } catch { /* gone */ } } };
process.on('exit', releaseSlots);
process.on('SIGINT', () => { releaseSlots(); process.exit(130); });

const runOne = (name, flags) => new Promise((res) => {
  const env = { ...process.env, PERF_ONLY: route, PERF_OUT: OUT };
  delete env.PERF_LOCKS;
  const c = spawn(process.execPath, [path.join(HERE, 'run.mjs'), name, PRESET, '--hitch', ...flags], { stdio: 'ignore', env });
  c.on('exit', res);
});
const collect = (v, name, round) => {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(OUT, name + '.json'), 'utf8'));
    const r = d.routes[route], t = (d.threadCpu || {})[route] || {};
    v.runs[round] = { mcpu: t.mainMsPerFrame, gpuThr: t.gpuThreadMsPerFrame, avg: r.avg, p50: r.p50, cpu50: r.cpuP50, calls: r.callsPerFrame, frames: r.frames, sec: (r.hitch || {}).sections || {} };
  } catch (e) { v.runs[round] = { mcpu: null, sec: {} }; console.error(name, 'failed', String(e).slice(0, 80)); }
};
for (let i = 0; i < rounds; i++) {
  const order = i % 2 ? [...vs].reverse() : vs;
  if (process.env.SERIAL) {
    for (const v of order) { await takeSlots(1); await runOne(`${tag}-${v.name}-${i + 1}`, v.flags); releaseSlots(); collect(v, `${tag}-${v.name}-${i + 1}`, i); }
  } else {
    await takeSlots(vs.length);
    await Promise.all(order.map((v) => runOne(`${tag}-${v.name}-${i + 1}`, v.flags)));
    releaseSlots();
    for (const v of vs) collect(v, `${tag}-${v.name}-${i + 1}`, i);
  }
  console.error(`ronde ${i + 1}: ` + vs.map((v) => `${v.name} mcpu ${v.runs[i].mcpu} avg ${v.runs[i].avg}`).join('  |  '));
}
const secNames = new Set(); for (const v of vs) for (const r of v.runs) for (const k of Object.keys(r.sec || {})) secNames.add(k);
console.log(`route ${route}, ${rounds} rondes naast elkaar; mcpu = CPU-tijd van de hoofdthread per frame (ms), mediaan over de rondes`);
console.log('variant'.padEnd(16) + ['mcpu', 'avg', 'p50', 'cpu50', 'calls', 'gpuThr', 'frames'].map((h) => h.padStart(9)).join(''));
for (const v of vs) console.log(v.name.padEnd(16) + [med(v.runs.map((r) => r.mcpu)), med(v.runs.map((r) => r.avg)), med(v.runs.map((r) => r.p50)), med(v.runs.map((r) => r.cpu50)), med(v.runs.map((r) => r.calls)), med(v.runs.map((r) => r.gpuThr)), med(v.runs.map((r) => r.frames))].map((x) => String(x == null ? '-' : x).padStart(9)).join(''));
console.log('mcpu per ronde: ' + vs.map((v) => v.name + ' [' + v.runs.map((r) => r.mcpu).join(', ') + ']').join('  '));
const base = vs[0];
for (const v of vs.slice(1)) {
  const d = v.runs.map((r, i) => (r.mcpu != null && base.runs[i].mcpu != null ? +(r.mcpu - base.runs[i].mcpu).toFixed(2) : null)).filter((x) => x != null);
  const pct = v.runs.map((r, i) => (r.mcpu != null && base.runs[i].mcpu != null ? (r.mcpu - base.runs[i].mcpu) / base.runs[i].mcpu * 100 : null)).filter((x) => x != null);
  console.log(`${v.name} min ${base.name}: per ronde ${d.join(', ')} ms; mediaan ${med(d)} ms (${med(pct) != null ? med(pct).toFixed(1) : '-'}%); sneller in ${d.filter((x) => x < 0).length} van ${d.length}`);
}
const rows = [...secNames].map((k) => [k, ...vs.map((v) => med(v.runs.map((r) => (r.sec || {})[k])))]).filter((r) => r.slice(1).some((x) => x > 0.3)).sort((a, b) => Math.max(...b.slice(1)) - Math.max(...a.slice(1)));
console.log('sectie (ms/frame, mediaan)'.padEnd(28) + vs.map((v) => v.name.padStart(12)).join(''));
for (const r of rows.slice(0, 22)) console.log(r[0].padEnd(28) + r.slice(1).map((x) => String(x == null ? '-' : x).padStart(12)).join(''));
