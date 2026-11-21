// node incl.mjs <profile> <fn...>: inclusive ms (samples whose stack holds fn), cap 5 ms
import fs from 'node:fs';
const [file, ...names] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const tot = Object.fromEntries(names.map((n) => [n, 0])); let busy = 0;
p.samples.forEach((id, i) => {
  const us = Math.min(5000, p.timeDeltas[i] || 0);
  if (byId.get(id).callFrame.functionName !== '(idle)') busy += us;
  const seen = new Set();
  for (let k = id; k != null; k = parent.get(k)) { const f = byId.get(k).callFrame.functionName; if (names.includes(f) && !seen.has(f)) { seen.add(f); tot[f] += us; } }
});
console.log(file.split(/[\\/]/).pop(), 'busy', Math.round(busy / 1000), Object.entries(tot).map(([k, v]) => `${k} ${Math.round(v / 1000)}`).join(' | '));
