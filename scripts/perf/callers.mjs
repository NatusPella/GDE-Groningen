// Who calls a function, from a .cpuprofile (GDE_PROFILE_OUT of a perf run): the time of all samples whose stack holds <name>, per call chain of <depth> frames above it.
//   node scripts/perf/callers.mjs <file.cpuprofile> <function name> [--depth=4]
import fs from 'node:fs';

const [file, name] = process.argv.slice(2);
const depth = Number((process.argv.find((a) => a.startsWith('--depth=')) || '--depth=4').slice(8));
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const per = new Map();
p.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + (p.timeDeltas[i] || 0)));
const chains = new Map(); let total = 0, all = 0;
for (const [id, us] of per) {
  all += us;
  let cur = id, found = null;
  while (cur !== undefined) { if (byId.get(cur).callFrame.functionName === name) { found = cur; break; } cur = parent.get(cur); }
  if (found === null) continue;
  total += us;
  const chain = [];
  let up = parent.get(found);
  for (let k = 0; k < depth && up !== undefined; k++, up = parent.get(up)) { const cf = byId.get(up).callFrame; chain.push(`${cf.functionName || '(anon)'} ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`); }
  const key = chain.join(' < ');
  chains.set(key, (chains.get(key) || 0) + us);
}
console.log(`${name}: ${(total / 1000).toFixed(0)} ms of ${(all / 1000).toFixed(0)} ms`);
for (const [k, us] of [...chains].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`${(us / 1000).toFixed(0).padStart(7)} ms  ${k}`);
