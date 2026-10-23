// De Hoornse Plas (#399) op de echte tegels: is het meer groot genoeg voor de baan van regattaplas.js, ligt er rond elke ton en
// langs elke zijde open water, en staat er geen gebouw in of vlak aan het water? Leest de tegels van game/world, GAME_WORLD of
// --world; zonder wereld SKIP.
//   node scripts/regattaplas_wereld_test.mjs [--world=<map>]
import path from 'node:path';
import './node3d.mjs';
import { fileURLToPath } from 'node:url';
import { heeftTegels, leesTegelRijen } from './lib/tegelrijen.mjs';
import { maakHuizenIndex } from './lib/huizenindex.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const dir = path.resolve(arg('world', process.env.GAME_WORLD || path.join(ROOT, 'game', 'world')));
if (!heeftTegels(dir)) { console.log('SKIP regattaplas_wereld_test: geen wereld in ' + dir); process.exit(0); }
const { PLAS, plasBaan } = await import('../game/js/regattaplas.js');

let n = 0, bad = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const rows = await leesTegelRijen(dir);
const huizen = maakHuizenIndex(rows.buildings);
const inP = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
const area = (P) => { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); };
// het meer is in tegels van 1 km getekend (Hoornsemeer, Hoornseplas): alle stukken samen, als bevaarbaar water (klasse 3: een zeilboot past)
const meer = rows.water.filter((w) => w.kind === 'meer' && /^hoorns(e ?meer|e ?plas)/i.test(w.name || ''));
const water = (x, y) => meer.some((w) => (w.nav ?? 0) >= 3 && inP(x, y, w.pts));
const vrij = (x, y, r) => { if (!water(x, y)) return false; for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; if (!water(x + Math.cos(a) * r, y + Math.sin(a) * r)) return false; } return true; };

check('de tegels hebben het Hoornsemeer', meer.length >= 4, String(meer.length));
const oppervlak = meer.reduce((s, w) => s + area(w.pts), 0);
check('het meer is groter dan een halve vierkante kilometer', oppervlak > 500000, String(Math.round(oppervlak)));
check('het midden van de plas ligt in het water met 250 m open water rondom', vrij(PLAS.x, PLAS.y, 250));

const baan = plasBaan();
for (const [i, t] of baan.entries()) {
  check(`ton ${i + 1}: 100 m open water rondom`, vrij(t.x, t.y, 100), `${Math.round(t.x)},${Math.round(t.y)}`);
  const v = baan[(i + 1) % baan.length];
  let los = true;
  for (let k = 0; k <= 30; k++) if (!vrij(t.x + (v.x - t.x) * k / 30, t.y + (v.y - t.y) * k / 30, 60)) los = false;
  check(`zijde ${i + 1}: 60 m open water aan weerszijden`, los);
}
// de steiger: de speler start overal binnen PLAS.reik van het midden: dat water is een meer, geen weiland
let droog = 0;
for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (!water(PLAS.x + Math.cos(a) * 200, PLAS.y + Math.sin(a) * 200)) droog++; }
check('rond het midden op 200 m ligt water', droog === 0, String(droog));

// geen gebouw op de baan: niet in het meer binnen 400 m van het midden (aan de noordoever staan wat schuurtjes op het water, 700 m
// verderop), en niet binnen 40 m van een ton of een zijde
let dichtbij = 0;
for (const w of meer) for (const g of huizen.gebouwen(w.pts)) if (Math.hypot((g.b[0] + g.b[2]) / 2 - PLAS.x, (g.b[1] + g.b[3]) / 2 - PLAS.y) < 400) dichtbij++;
check('geen gebouw op het water binnen 400 m van het midden', dichtbij === 0, String(dichtbij));
let langs = 0;
for (const [i, t] of baan.entries()) {
  const v = baan[(i + 1) % baan.length];
  for (let k = 0; k <= 30; k++) { const x = t.x + (v.x - t.x) * k / 30, y = t.y + (v.y - t.y) * k / 30; if (huizen.raakt([[x - 40, y - 40], [x + 40, y - 40], [x + 40, y + 40], [x - 40, y + 40]])) langs++; }
}
check('geen gebouw binnen 40 m van een ton of een zijde', langs === 0, String(langs));

console.log(bad ? `${bad} van ${n} mislukt` : `regattaplas_wereld_test ok (${n} checks, ${Math.round(oppervlak / 10000)} ha water)`);
process.exit(bad ? 1 : 0);
