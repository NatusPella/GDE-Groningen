// node pdiff.mjs <goodProfile> <badProfile> [n]: self-time delta per function (ms), cap 5 ms per sample delta
import fs from 'node:fs';
const load = (f) => {
  const p = JSON.parse(fs.readFileSync(f, 'utf8'));
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const m = new Map(); let busy = 0;
  p.samples.forEach((id, i) => {
    const cf = byId.get(id).callFrame; if (cf.functionName === '(idle)') return;
    const us = Math.min(5000, p.timeDeltas[i] || 0);
    const k = `${cf.functionName || '(anon)'} ${cf.url.split('/').pop().split('?')[0]}`;
    m.set(k, (m.get(k) || 0) + us); busy += us;
  });
  return { m, busy };
};
const a = load(process.argv[2]), b = load(process.argv[3]);
const keys = new Set([...a.m.keys(), ...b.m.keys()]);
const rows = [...keys].map((k) => [k, (a.m.get(k) || 0) / 1000, (b.m.get(k) || 0) / 1000]).map((r) => [...r, r[2] - r[1]]).sort((x, y) => y[3] - x[3]);
console.log(`busy good ${(a.busy / 1000).toFixed(0)} ms, bad ${(b.busy / 1000).toFixed(0)} ms`);
for (const r of rows.slice(0, Number(process.argv[4]) || 30)) console.log(r[3].toFixed(0).padStart(6), String(r[1].toFixed(0)).padStart(6), String(r[2].toFixed(0)).padStart(6), r[0]);
