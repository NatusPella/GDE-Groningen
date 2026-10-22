// What a function calls, from a .cpuprofile (GDE_PROFILE_OUT of a perf run): the time of all samples whose stack holds <name>, split by the function
// directly below it (--depth=1) or by the chain of <depth> frames below it, plus its own time.
//   node scripts/perf/callees.mjs <file.cpuprofile> <function name> [--depth=1] [--n=25]
import fs from 'node:fs';

const [file, name] = process.argv.slice(2);
const depth = Number((process.argv.find((a) => a.startsWith('--depth=')) || '--depth=1').slice(8));
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=25').slice(4));
const CAP = 5000;
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const per = new Map();
p.samples.forEach((id, i) => per.set(id, (per.get(id) || 0) + Math.min(CAP, p.timeDeltas[i] || 0)));
const label = (id) => { const cf = byId.get(id).callFrame; return `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}:${cf.lineNumber + 1}`; };
const isF = (id) => byId.get(id).callFrame.functionName === name;
let total = 0, own = 0;
const rows = new Map();
for (const [id, us] of per) {
  // the chain from the sample up to the outermost frame
  const chain = [];
  for (let a = id; a !== undefined; a = parent.get(a)) chain.push(a);
  // the outermost occurrence of the function (nearest to the root)
  let k = -1;
  for (let i = chain.length - 1; i >= 0; i--) if (isF(chain[i])) { k = i; break; }
  if (k < 0) continue;
  total += us;
  if (k === 0) { own += us; continue; }
  const below = chain.slice(Math.max(0, k - depth), k).reverse().map(label).join(' > ');
  rows.set(below, (rows.get(below) || 0) + us);
}
console.log(`${name}: ${(total / 1000).toFixed(0)} ms incl, ${(own / 1000).toFixed(0)} ms own`);
[...rows].sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([k, us]) => console.log(String((us / 1000).toFixed(0)).padStart(7) + ' ms  ' + k));
