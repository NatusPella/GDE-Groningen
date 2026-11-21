import { telAlles, totalen, SOORTEN } from './lib/ds3_telling.mjs';
import { telAllesUitGit } from './lib/ds3_telling_git.mjs';
const voor = telAllesUitGit('origin/main');
const na = telAlles();
const tv = totalen(voor), tn = totalen(na);
console.log('TOTAAL voor', JSON.stringify(tv), 'na', JSON.stringify(tn));
const fv = (r) => Object.entries(r).filter(([f, v]) => !v.bewust && SOORTEN.some((s) => v.n[s])).length;
console.log('bestanden voor', fv(voor), 'na', fv(na));
const alle = new Set([...Object.keys(voor), ...Object.keys(na)]);
const rijen = [];
for (const f of alle) {
  const a = voor[f], b = na[f];
  if ((a && a.bewust) || (b && b.bewust)) continue;
  const som = (x) => (x ? SOORTEN.reduce((t, s) => t + x.n[s], 0) : 0);
  if (som(a) || som(b)) rijen.push([f, a ? a.n : null, b ? b.n : null, som(a), som(b)]);
}
rijen.sort((x, y) => y[3] - x[3]);
const cel = (n) => (n ? SOORTEN.map((s) => n[s]).join('/') : '0');
console.log('| bestand | voor (kleur/glas/oud/font/klein) | na |');
for (const r of rijen.slice(0, 45)) console.log(`| \`${r[0]}\` | ${cel(r[1])} | ${cel(r[2])} |`);
console.log('rijen totaal', rijen.length, 'nulgemaakt', rijen.filter((r) => r[4] === 0).length);
