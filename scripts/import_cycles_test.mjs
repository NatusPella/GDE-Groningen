// Guards the static import graph of game/js against circular imports:
//   node scripts/import_cycles_test.mjs [--report]
// Counts the largest strongly connected component (SCC), the number of modules
// in cycles and the mutual pairs (a imports b and b imports a). The limits are
// the measured state: they may only go down. Lower them when you break a cycle.
// Dynamic import() is not followed (lazy loading breaks a cycle on purpose).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const LIMITS = { largestScc: 63, modulesInCycles: 68, mutualPairs: 17 };

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'js');
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
const known = new Set(files);

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const edges = new Map();
for (const f of files) {
  const src = strip(readFileSync(path.join(dir, f), 'utf8'));
  const out = new Set();
  const re = /(?:^|[;\s}])(?:import|export)\s+(?:[^'"`;()]*?\bfrom\s*)?['"]\.\/([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) {
    const t = m[1].replace(/[?#].*$/, '');
    if (known.has(t) && t !== f) out.add(t);
  }
  edges.set(f, out);
}

// Tarjan, iterative (the graph is deep)
let idx = 0;
const index = new Map(), low = new Map(), onStack = new Set(), stack = [], sccs = [];
for (const root of files) {
  if (index.has(root)) continue;
  const work = [[root, edges.get(root)[Symbol.iterator]()]];
  index.set(root, idx); low.set(root, idx); idx++; stack.push(root); onStack.add(root);
  while (work.length) {
    const [v, it] = work[work.length - 1];
    const n = it.next();
    if (!n.done) {
      const w = n.value;
      if (!index.has(w)) {
        index.set(w, idx); low.set(w, idx); idx++; stack.push(w); onStack.add(w);
        work.push([w, edges.get(w)[Symbol.iterator]()]);
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v), index.get(w)));
    } else {
      work.pop();
      if (work.length) { const p = work[work.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(v))); }
      if (low.get(v) === index.get(v)) {
        const comp = [];
        let w;
        do { w = stack.pop(); onStack.delete(w); comp.push(w); } while (w !== v);
        if (comp.length > 1) sccs.push(comp);
      }
    }
  }
}

let mutualPairs = 0;
for (const [a, outs] of edges) for (const b of outs) if (a < b && edges.get(b).has(a)) mutualPairs++;
const got = {
  largestScc: Math.max(0, ...sccs.map((c) => c.length)),
  modulesInCycles: sccs.reduce((s, c) => s + c.length, 0),
  mutualPairs,
};

if (process.argv.includes('--report')) {
  for (const c of sccs.sort((a, b) => b.length - a.length)) console.log(c.length, c.length < 12 ? c.sort().join(' ') : '');
}
let fails = 0;
for (const k of Object.keys(LIMITS)) {
  const bad = got[k] > LIMITS[k];
  if (bad) fails++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${k}: ${got[k]} (limit ${LIMITS[k]})${got[k] < LIMITS[k] ? ' - lower the limit' : ''}`);
}
console.log(`${files.length} modules, ${sccs.length} cycle groups`);
process.exit(fails ? 1 : 0);
