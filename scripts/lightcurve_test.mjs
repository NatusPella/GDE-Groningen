// De dag-nachtsleutels lopen vloeiend in elkaar over (game/js/lightcurve.js, audit 20-11 punt 6).
// Getoetst op de echte sleutels uit game/js/daynight.js (uit de bron gelezen: daynight.js zelf laadt THREE):
// de kromme gaat door elke sleutel, schiet nergens over de twee buursleutels heen en heeft geen knik meer.
//   node scripts/lightcurve_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { monotoneTangents, hermite, buildCurve, linearValue, maxKink } from '../game/js/lightcurve.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (c, wat, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${wat}${info ? ' (' + info + ')' : ''}`); } };

const src = fs.readFileSync(path.join(ROOT, 'game/js/daynight.js'), 'utf8');
const blok = src.match(/const KEYS = (\[[\s\S]*?\n\]);/);
ok(!!blok, 'de sleutels staan in daynight.js');
const KEYS = blok ? Function(`return ${blok[1]};`)() : [];
ok(KEYS.length === 9, 'negen sleutels', String(KEYS.length));
const E = KEYS.map((k) => k.e);
const NUMS = ['sunI', 'hemiI', 'glowI', 'exp', 'bloomThr', 'bloomStr', 'sat', 'con', 'lift', 'vig'];
const COLORS = ['sun', 'hemiSky', 'hemiGnd', 'zenith', 'horizon', 'fog', 'glow', 'shadowTint', 'hiTint'];

// elke reeks: de getallen zelf en de drie kanalen van elke kleur (0..255; de vorm van de kromme hangt niet van de schaal af)
const reeksen = [];
for (const k of NUMS) reeksen.push({ naam: k, ys: KEYS.map((key) => key[k]) });
for (const c of COLORS) for (let ch = 0; ch < 3; ch++) reeksen.push({ naam: `${c}.${'rgb'[ch]}`, ys: KEYS.map((key) => (key[c] >> (16 - 8 * ch)) & 255) });

let ergsteVoor = 0, ergsteNa = 0;
for (const r of reeksen) {
  const curve = buildCurve(E, r.ys);
  const span = Math.max(...r.ys) - Math.min(...r.ys) || 1;
  // door elke sleutel
  for (let i = 0; i < E.length; i++) ok(Math.abs(curve.value(E[i]) - r.ys[i]) < 1e-9 * Math.max(1, span), `${r.naam} gaat door sleutel ${E[i]}`);
  // nergens buiten de twee buursleutels (geen doorschot, dus geen nieuwe kleur en geen te lichte of te donkere stand)
  let binnen = true, eindig = true;
  for (let e = 62; e >= -27; e -= 0.05) {
    const v = curve.value(e);
    if (!Number.isFinite(v)) eindig = false;
    let i = 0;
    while (i < E.length - 2 && e < E[i + 1]) i++;
    const lo = Math.min(r.ys[i], r.ys[i + 1]), hi = Math.max(r.ys[i], r.ys[i + 1]);
    if (v < lo - 1e-9 * span || v > hi + 1e-9 * span) binnen = false;
  }
  ok(eindig, `${r.naam} is overal een getal`);
  ok(binnen, `${r.naam} blijft tussen zijn buursleutels`);
  // de knik: de sprong in helling op een sleutel, als deel van het bereik per graad zonshoogte
  const voor = maxKink(E, (x) => linearValue(E, r.ys, x)) / span;
  const na = maxKink(E, curve.value) / span;
  ergsteVoor = Math.max(ergsteVoor, voor);
  ergsteNa = Math.max(ergsteNa, na);
  ok(na < 0.002, `${r.naam} heeft geen knik op een sleutel`, `voor ${voor.toFixed(4)} na ${na.toFixed(4)}`);
}
ok(ergsteVoor > 0.05, 'de rechte lijn had een meetbare knik', ergsteVoor.toFixed(4));
ok(ergsteNa < ergsteVoor / 25, 'de knik is minstens 25 keer kleiner', `${ergsteVoor.toFixed(4)} -> ${ergsteNa.toFixed(5)}`);

// buiten de sleutels (zon hoger dan 60 of lager dan -25 graden) blijft de eindstand staan
{
  const c = buildCurve(E, KEYS.map((k) => k.exp));
  ok(c.value(75) === KEYS[0].exp && c.value(-40) === KEYS[KEYS.length - 1].exp, 'boven en onder de sleutels de eindstand');
}

// de bouwstenen los: een rechte lijn blijft een rechte lijn, een top krijgt een vlakke raaklijn, oplopende x werkt ook
{
  const m = monotoneTangents([0, 1, 3], [0, 2, 6]);
  ok(m.every((v) => Math.abs(v - 2) < 1e-12), 'rechte lijn: helling 2 op elke sleutel', m.join(' '));
  ok(Math.abs(hermite(0, 2, 2, 2, 1, 0.5) - 1) < 1e-12, 'rechte lijn: halverwege de helft');
  const top = monotoneTangents([0, 1, 2], [0, 5, 1]);
  ok(top[1] === 0, 'een top heeft een vlakke raaklijn');
  const vlak = buildCurve([0, 1, 2, 3], [1, 1, 4, 4]);
  let mono = true, prev = -Infinity;
  for (let x = 0; x <= 3; x += 0.01) { const v = vlak.value(x); if (v < prev - 1e-12 || v < 1 - 1e-12 || v > 4 + 1e-12) mono = false; prev = v; }
  ok(mono, 'een trede loopt alleen op, zonder doorschot');
}

// de bedrading: daynight.js rekent met deze kromme en niet meer met een rechte lijn
ok(/from '\.\/lightcurve\.js'/.test(src) && /hermite\(a\[n\], b\[n\]/.test(src), 'computeLighting gebruikt de kromme');
ok(!/\.lerp\(KEY_COLORS\[i \+ 1\]/.test(src), 'de rechte kleurmenging is weg');
// geen allocaties in het pad per beeld: de raaklijnen staan op moduleniveau
{
  const fn = src.slice(src.indexOf('export function computeLighting'), src.indexOf('// The one answer to'));
  ok(!/monotoneTangents|buildCurve/.test(fn), 'raaklijnen worden niet per beeld berekend');
}

console.log(`lightcurve_test: ${n - fails}/${n} ok (knik per graad: ${ergsteVoor.toFixed(3)} -> ${ergsteNa.toFixed(5)} van het bereik)`);
process.exit(fails ? 1 : 0);
