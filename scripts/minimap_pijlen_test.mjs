// Contrast- en kleurenblindheidscontrole van het voorgestelde pijlenstelsel van de minimap (docs/MINIMAP-PIJLEN-21-11.md, #1078).
//   node scripts/minimap_pijlen_test.mjs            controleert en faalt bij een onderschrijding
//   node scripts/minimap_pijlen_test.mjs --tabel    schrijft de tabellen voor het document (markdown)
//
// Wat het meet (alles uit de tokens, niets met de hand):
//  1. contrast van elke pijlkleur tegen de minikaartkleuren (weiland, park, water, weg, gebouwen) en tegen de donkere pijlrand (glas): niet-tekst 3:1;
//  2. de afstand tussen de pijlkleuren onderling (CIE76 ΔE in Lab) voor normaal zicht en voor deuteranopie, protanopie en tritanopie
//     (Machado 2009, ernst 1,0, in lineair RGB): twee dingen die iets anders betekenen moeten ook zonder kleur te scheiden zijn (vorm), maar
//     liefst ook met kleur (ΔE >= 20);
//  3. de vorm als tweede kanaal: elke betekenis heeft een eigen glyph (navtarget.js GLYPH).
import { fileURLToPath } from 'node:url';
import { kaartLand, dsKleur, contrast, meng } from '../game/js/kaartkleuren.js';
import { PALETTES } from '../game/js/a11y.js';
import { GLYPH, NAV_TYPES, NAV_ROL } from '../game/js/navtarget.js';

// ---------------------------------------------------------------- kleurrekenen
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (v) => { v = Math.max(0, Math.min(1, v)); return Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)); };
const rgb = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
const hex = (r) => '#' + r.map((v) => v.toString(16).padStart(2, '0')).join('');

export const CVD = {
  deuteranopie: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopie: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopie: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
export function simuleer(h, soort) {
  if (!soort || soort === 'normaal') return h;
  const m = CVD[soort];
  const l = rgb(h).map(lin);
  return hex(m.map((rij) => gam(rij[0] * l[0] + rij[1] * l[1] + rij[2] * l[2])));
}
export function lab(h) {
  const [r, g, b] = rgb(h).map(lin);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b, Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

// ---------------------------------------------------------------- de achtergronden en de paletten
const mini = kaartLand().mini;
export const ACHTERGRONDEN = {
  weiland: mini.meadow, park: mini.park, water: mini.water, weg: mini.road, hoofdweg: mini.major, bos: mini.forest, dorp: mini.village,
  gebouw: mini.buildings[0], gebouw2: mini.buildings[2],
};
const glas = dsKleur('glas'), creme = dsKleur('creme');
// de pijlkleuren per alternatief (A1 = voorkeur): naam -> hex
export const PIJLEN = {
  'A1 Eén geel': { actief: dsKleur('ink-geel'), secundair: dsKleur('creme'), zorg: PALETTES.uit.care },
  'A2 Geel en paars': { actief: dsKleur('ink-geel'), eigen: PALETTES.uit.user, secundair: dsKleur('creme'), zorg: PALETTES.uit.care },
  'A3 Per categorie': { missie: PALETTES.uit.mission, eigen: PALETTES.uit.user, klus: PALETTES.uit.job, zorg: PALETTES.uit.care },
};
// de drie kleurenblindpaletten (a11y.js) voor de oude kleuren, om te laten zien waarom A3 daar schuurt
export const CB_A3 = Object.fromEntries(['uit', 'deuteranopie', 'protanopie', 'tritanopie'].map((k) => [k, { missie: PALETTES[k].mission, eigen: PALETTES[k].user, klus: PALETTES[k].job, zorg: PALETTES[k].care }]));

export function bevindingen() {
  const uit = { fails: [], rijen: [], paren: [] };
  for (const [alt, set] of Object.entries(PIJLEN)) {
    for (const [rol, h] of Object.entries(set)) {
      const rij = { alt, rol, hex: h, opGlas: contrast(h, glas) };
      for (const [bg, b] of Object.entries(ACHTERGRONDEN)) rij[bg] = contrast(h, b);
      rij.min = Math.min(...Object.keys(ACHTERGRONDEN).map((k) => rij[k]));
      rij.eff = Math.min(...Object.values(ACHTERGRONDEN).map((b) => effectief(h, b)));
      uit.rijen.push(rij);
    }
    const namen = Object.keys(set);
    for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
      const rij = { alt, a: namen[i], b: namen[j] };
      for (const z of ['normaal', 'deuteranopie', 'protanopie', 'tritanopie']) rij[z] = deltaE(simuleer(set[namen[i]], z), simuleer(set[namen[j]], z));
      uit.paren.push(rij);
    }
  }
  return uit;
}

// ---------------------------------------------------------------- de controle
// De gevulde pijl heeft twee randen (navpijl.js): crème buiten en donker (glas) erbinnen. Op een licht vlak (weg, water, gebouw) draagt de donkere rand de
// omtrek, op een donker vlak (weiland, bos, park) de crème rand, en de vulling is er zelf ook nog. Het effectieve contrast is het beste van die drie. Een holle pijl heeft de kleur als lijn tussen twee donkere randen
// (kleur tegen glas, altijd hoog) en leest daardoor overal.
export const effectief = (vulling, bg) => Math.max(contrast(vulling, bg), contrast(glas, bg), contrast(creme, bg));
const TOESTANDEN = { uit: 'normaal', deuteranopie: 'deuteranopie', protanopie: 'protanopie', tritanopie: 'tritanopie' };

function controle() {
  const fails = [];
  // het gekozen stelsel (A2, besluit 21-11): per kleurenblindpalet de rollen uit NAV_ROL
  for (const [stand, z] of Object.entries(TOESTANDEN)) {
    const pal = PALETTES[stand];
    const rollen = { actief: pal[NAV_ROL.missie], eigen: pal[NAV_ROL.eigen], klus: pal[NAV_ROL.klus], zorg: pal[NAV_ROL.zorg] };
    for (const [rol, h] of Object.entries(rollen)) {
      if (contrast(h, glas) < 3) fails.push(`${stand} ${rol} ${h} op glas ${contrast(h, glas).toFixed(2)} < 3 (holle pijl en rand)`);
      for (const [bg, b] of Object.entries(ACHTERGRONDEN)) if (effectief(h, b) < 3) fails.push(`${stand} ${rol} ${h} (gevuld) op ${bg} ${effectief(h, b).toFixed(2)} < 3`);
    }
    // de twee pijlen waar de eigenaar over vroeg: geel (actief) en jouw eigen doel moeten ook zonder vorm te scheiden zijn
    const d = deltaE(simuleer(rollen.actief, z), simuleer(rollen.eigen, z));
    if (d < 20) fails.push(`${stand}: geel en eigen doel ΔE ${d.toFixed(1)} < 20 zoals gezien (${z})`);
  }
  // elke betekenis heeft een eigen vorm
  const glyphs = Object.values(NAV_TYPES).filter((t) => t.volg).map((t) => t.glyph);
  for (const g of new Set(glyphs)) if (!GLYPH[g]) fails.push('glyph zonder tekening: ' + g);
  return fails;
}

const f = (n, d = 2) => n.toFixed(d);
function tabel() {
  const { rijen, paren } = bevindingen();
  const kop = Object.keys(ACHTERGRONDEN);
  console.log('Contrast van de pijlkleur tegen de minikaart (WCAG 2; niet-tekst 3:1) en tegen de donkere pijlrand (glas)\n');
  console.log(`| Alternatief | Rol | Hex | op glas | ${kop.join(' | ')} | minimum | met rand |`);
  console.log(`|---|---|---|---|${kop.map(() => '---').join('|')}|---|---|`);
  for (const r of rijen.filter((x) => x.alt !== 'A1 Eén geel')) console.log(`| ${r.alt} | ${r.rol} | \`${r.hex}\` | ${f(r.opGlas)} | ${kop.map((k) => f(r[k])).join(' | ')} | ${f(r.min)} | ${f(r.eff)} |`);
  console.log('\nOnderscheid tussen twee pijlkleuren (CIE76 ΔE; vanaf 20 zijn ze ook zonder vorm te scheiden), met kleurenblindheid gesimuleerd\n');
  console.log('| Alternatief | Paar | normaal | deuteranopie | protanopie | tritanopie |');
  console.log('|---|---|---|---|---|---|');
  for (const p of paren.filter((x) => x.alt === 'A2 Geel en paars')) console.log(`| ${p.alt} | ${p.a} / ${p.b} | ${f(p.normaal, 0)} | ${f(p.deuteranopie, 0)} | ${f(p.protanopie, 0)} | ${f(p.tritanopie, 0)} |`);
  console.log('\nDe huidige paletten (a11y.js) per kleurenblindstand, ΔE tussen missie (geel), eigen doel, klus en zorg zoals de speler ze ziet (alle paren; het kleinste staat erbij)\n');
  console.log('| Instelling | missie | eigen | klus | zorg | geel/eigen | kleinste ΔE (waargenomen) | welk paar |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const [k, set] of Object.entries(CB_A3)) {
    const z = k === 'uit' ? 'normaal' : k;
    const namen = Object.keys(set);
    let min = Infinity, wie = '';
    for (let i = 0; i < namen.length; i++) for (let j = i + 1; j < namen.length; j++) {
      const d = deltaE(simuleer(set[namen[i]], z), simuleer(set[namen[j]], z));
      if (d < min) { min = d; wie = `${namen[i]}/${namen[j]}`; }
    }
    console.log(`| ${k} | \`${set.missie}\` | \`${set.eigen}\` | \`${set.klus}\` | \`${set.zorg}\` | ${f(deltaE(simuleer(set.missie, z), simuleer(set.eigen, z)), 0)} | ${f(min, 0)} | ${wie} |`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--tabel')) tabel();
  else {
    const fails = controle();
    if (fails.length) { for (const x of fails) console.log('FAIL', x); process.exit(1); }
    console.log('minimap_pijlen_test: ok');
  }
}
