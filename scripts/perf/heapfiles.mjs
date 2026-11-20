// Levende heap per bronbestand en per functie uit een .heapprofile (GDE_PROFILE_OUT van `--heapprof-load=<ms>` of `[heapprof] <ms> live`).
//   node scripts/perf/heapfiles.mjs <bestand.heapprofile> [--n=25]
import fs from 'node:fs';
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const N = Number((process.argv.find((a) => a.startsWith('--n=')) || '--n=25').slice(4));
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const byFile = new Map(), byFn = new Map();
let all = 0;
const walk = (n) => {
  const cf = n.callFrame, self = n.selfSize || 0;
  if (self) {
    const f = cf.url.split('/').pop().split('?')[0] || '(native)';
    byFile.set(f, (byFile.get(f) || 0) + self);
    const k = `${cf.functionName || '(anon)'} ${f}:${cf.lineNumber + 1}`;
    byFn.set(k, (byFn.get(k) || 0) + self);
    all += self;
  }
  for (const c of n.children || []) walk(c);
};
walk(p.head);
const MB = (b) => (b / 1048576).toFixed(1).padStart(7) + ' MB';
console.log(`totaal ${MB(all)}`);
console.log('-- per bestand');
for (const [k, b] of [...byFile].sort((a, c) => c[1] - a[1]).slice(0, N)) console.log((b / all * 100).toFixed(1).padStart(5) + '% ' + MB(b) + '  ' + k);
console.log('-- per functie');
for (const [k, b] of [...byFn].sort((a, c) => c[1] - a[1]).slice(0, N)) console.log((b / all * 100).toFixed(1).padStart(5) + '% ' + MB(b) + '  ' + k);
