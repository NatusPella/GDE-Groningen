// self time per function (top N) of one or more .cpuprofile files (GDE_PROFILE_OUT of a perf run); node scripts/perf/selftime.mjs file... [--n=60]
import fs from 'node:fs';
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// the first sample's delta is the wait since the profiler started (seconds on a loaded machine) and would count as '(program)': deltas over CAP us are capped (--cap=, default 5000)
const CAP = Number((process.argv.find((a) => a.startsWith('--cap=')) || '--cap=5000').slice(6));
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=60').slice(4));
const self = new Map(); let all = 0, idle = 0;
for (const f of files) {
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const per = new Map();
  p.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + Math.min(CAP, p.timeDeltas[i] || 0)));
  for (const [id, us] of per) {
    const cf = byId.get(id).callFrame;
    const file = cf.url.split('/').pop().split('?')[0];
    const k = `${cf.functionName || '(anon)'} ${file}:${cf.lineNumber + 1}`;
    if (cf.functionName === '(idle)') { idle += us; continue; }
    all += us;
    self.set(k, (self.get(k) || 0) + us);
  }
}
console.log(`busy ${(all / 1000).toFixed(0)} ms, idle ${(idle / 1000).toFixed(0)} ms`);
[...self].sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([k, us]) => console.log((us / all * 100).toFixed(1).padStart(5) + '%  ' + (us / 1000).toFixed(0).padStart(6) + ' ms  ' + k));
