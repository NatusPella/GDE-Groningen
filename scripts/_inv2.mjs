import { telAlles } from './lib/ds3_telling.mjs';
const r = telAlles();
const c = {};
for (const [f, v] of Object.entries(r)) {
  if (v.bewust) continue;
  for (const x of v.regels) {
    if (!x.kleur) continue;
    for (const m of x.t.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) { const k = m[0].toLowerCase().replace(/\s+/g, ''); (c[k] = c[k] || { n: 0, f: new Set() }).n++; c[k].f.add(f.split('/').pop()); }
  }
}
console.log(Object.entries(c).sort((a, b) => b[1].n - a[1].n).slice(0, 90).map(([k, v]) => v.n + ' ' + k + '  ' + [...v.f].slice(0, 4).join(',')).join('\n'));
