// per-shot analysis of one run json (window.__bfr = every benchmark frame as shotIndex:ms): node an.mjs <tag...>
import fs from 'node:fs';
import path from 'node:path';
const B = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ''));
export const rd = (t) => JSON.parse(fs.readFileSync(path.join(B, 'out', t + '.json'), 'utf8'));
export function perShot(j) {
  const labels = j.list.split('|').map((s) => { const m = /^(\d+)\. (.*) \(([\d.]+) s\)$/.exec(s); return m ? m[2] : s; });
  const by = labels.map(() => []);
  for (const x of (j.bfr || '').split(',').filter(Boolean)) { const [i, ms] = x.split(':').map(Number); if (by[i]) by[i].push(ms); }
  const stat = (f) => ({ n: f.length, fps: f.length ? 1000 / (f.reduce((x, y) => x + y, 0) / f.length) : 0, over50: f.filter((x) => x > 50).length, over100: f.filter((x) => x > 100).length, worst: Math.max(0, ...f), sum: f.reduce((x, y) => x + y, 0) });
  const shots = labels.map((label, i) => ({ label, ...stat(by[i]) }));
  // the warm phase: the first six shots with frames (not the radio card)
  const warmIdx = shots.map((s, i) => i).filter((i) => shots[i].n > 20).slice(0, 6);
  const warm = stat(warmIdx.flatMap((i) => by[i]));
  const all = stat(by.flat());
  return { shots, warm, all, warmIdx };
}
if (process.argv[1] && process.argv[1].endsWith('an.mjs')) {
  for (const tag of process.argv.slice(2)) {
    const j = rd(tag); const p = perShot(j);
    console.log(tag, 'avg', j.avg.toFixed(1), 'warm', JSON.stringify(p.warm), 'all', JSON.stringify(p.all));
    for (const s of p.shots.slice(0, 10)) console.log(' ', s.label.padEnd(36), 'n', String(s.n).padStart(3), 'fps', s.fps.toFixed(1).padStart(5), '>50', s.over50, '>100', s.over100, 'worst', Math.round(s.worst));
  }
}
