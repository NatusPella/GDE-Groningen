// node win.mjs <cpuprofile> [minBlockMs]  -> the longest busy blocks (no idle sample) and the top self/inclusive functions in each
import fs from 'node:fs';
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const minB = Number(process.argv[3]) || 1000;
const nodes = new Map(p.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
let t = p.startTime; const times = p.timeDeltas.map((d) => (t += d));
const name = (id) => { const c = nodes.get(id).callFrame; return `${c.functionName || '(anon)'} ${c.url.split('/').slice(-1)[0]}:${c.lineNumber}`; };
let blocks = []; let cur = null;
for (let i = 0; i < p.samples.length; i++) {
  const idle = nodes.get(p.samples[i]).callFrame.functionName === '(idle)';
  if (!idle) { if (!cur) cur = { a: i, b: i }; cur.b = i; } else if (cur) { blocks.push(cur); cur = null; }
}
if (cur) blocks.push(cur);
const big = blocks.map((b) => ({ ...b, ms: (times[b.b] - times[b.a]) / 1000, at: (times[b.a] - p.startTime) / 1e6 })).filter((b) => b.ms >= minB).sort((x, y) => y.ms - x.ms).slice(0, 6);
for (const b of big) {
  const self = new Map(), incl = new Map();
  for (let i = b.a; i <= b.b; i++) {
    const dt = (times[i] - (i ? times[i - 1] : times[i])) / 1000;
    let id = p.samples[i]; self.set(id, (self.get(id) || 0) + dt);
    const seen = new Set();
    while (id) { const nm = name(id); if (!seen.has(nm)) { seen.add(nm); incl.set(nm, (incl.get(nm) || 0) + dt); } id = parent.get(id); }
  }
  console.log(`\n== block at ${b.at.toFixed(1)} s, ${b.ms.toFixed(0)} ms`);
  const sf = new Map(); for (const [id, v] of self) { const nm = name(id); sf.set(nm, (sf.get(nm) || 0) + v); }
  console.log(' self:', [...sf].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => `${v.toFixed(0)} ${k}`).join('\n       '));
  console.log(' incl:', [...incl].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([k, v]) => `${v.toFixed(0)} ${k}`).join('\n       '));
}
