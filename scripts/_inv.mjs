import { telAlles } from './lib/ds3_telling.mjs';
const r = telAlles();
const c = {};
for (const [f, v] of Object.entries(r)) {
  if (v.bewust) continue;
  for (const x of v.regels) {
    if (!x.font) continue;
    for (const m of x.t.matchAll(/(?:font-family\s*:|font\s*:\s*[^;}]*?\d+(?:\.\d+)?px(?:\/[\d.]+)?\s*)([^;}]+)/gi)) { const k = m[1].trim().replace(/!important/, '').trim(); c[k] = (c[k] || 0) + 1; }
  }
}
console.log(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => n + ' ' + k).join('\n'));
