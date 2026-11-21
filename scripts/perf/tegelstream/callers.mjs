// node callers.mjs <cpuprofile> <fnName> : inclusive ms per distinct ancestor chain (top 6 frames above) of fnName
import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const target = process.argv[3];
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = (id) => { const c = nodes.get(id).callFrame; return `${c.functionName || '(anon)'} ${c.url.split('/').slice(-1)[0]}:${c.lineNumber}`; };
const selfMs = new Map();
for (let i = 0; i < p.samples.length; i++) selfMs.set(p.samples[i], (selfMs.get(p.samples[i]) || 0) + p.timeDeltas[i] / 1000);
const chains = new Map();
for (const [id, ms] of selfMs) {
  let x = id, chain = [], hit = false;
  while (x) { const nm = name(x); chain.push(nm); if (nm.startsWith(target + ' ')) { hit = true; break; } x = parent.get(x); }
  if (!hit) continue;
  // ancestors of the target node
  let up = [], y = parent.get(x);
  for (let k = 0; y && k < 7; k++, y = parent.get(y)) up.push(name(y));
  const key = up.join(' < ');
  chains.set(key, (chains.get(key) || 0) + ms);
}
for (const [k, v] of [...chains].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(v.toFixed(0), k);
