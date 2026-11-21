// node under.mjs <profile> <fn> [depth]: ms per call chain below fn (first frames after fn), cap 5 ms
import fs from 'node:fs';
const [file, fn, d = '2'] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byId = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
const m = new Map(); let tot = 0;
const nm = (id) => { const cf = byId.get(id).callFrame; return (cf.functionName || '(anon)') + ' ' + cf.url.split('/').pop().split('?')[0] + ':' + (cf.lineNumber + 1); };
p.samples.forEach((id, i) => {
  const us = Math.min(5000, p.timeDeltas[i] || 0);
  const chain = []; for (let k = id; k != null; k = parent.get(k)) chain.push(k);
  const at = chain.findIndex((k) => byId.get(k).callFrame.functionName === fn);
  if (at < 0) return;
  tot += us;
  const below = chain.slice(0, at).reverse().slice(0, Number(d)).map(nm).join(' > ') || '(self)';
  m.set(below, (m.get(below) || 0) + us);
});
console.log(fn, 'total', Math.round(tot / 1000));
[...m].sort((a, b) => b[1] - a[1]).slice(0, 18).forEach(([k, v]) => console.log(String(Math.round(v / 1000)).padStart(6), k.slice(0, 170)));
