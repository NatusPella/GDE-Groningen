// Maakt docs/beeld-21-11/minimap-pijlen/mock-ronde1.html (ronde 1, kleurstelsel A1-A3): een zelfstandige statische pagina met acht scenario's van de minimap naast elkaar, in drie
// alternatieven (A1, A2 = besluit 21-11, A3) en met kleurenblindheid als filter (#1078, docs/MINIMAP-PIJLEN-21-11.md).
//   node scripts/minimap_pijlen_mock_ronde1.mjs
// De pijlen worden getekend door dezelfde code als in het spel (game/js/navpijl.js, via een klein canvas-naar-SVG-opnametje) en de keuze welk doel
// actief is komt uit game/js/navdoel.js, zodat de mock niet kan afwijken van wat het spel doet. De kleuren komen uit de tokens (kaartkleuren.js, a11y.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kaartLand, dsKleur, DS_TERUGVAL } from '../game/js/kaartkleuren.js';
import { PALETTES } from '../game/js/a11y.js';
import { bepaalNavDoelen, navKleur, NAV_ROL, NAV_TYPES } from '../game/js/navdoel.js';
import { drawNavPijl } from '../game/js/navpijl.js';
import { CVD } from './minimap_pijlen_test.mjs';

const UIT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'beeld-21-11', 'minimap-pijlen', 'mock-ronde1.html');
const mini = kaartLand().mini;
const pal = PALETTES.uit;
const glas = dsKleur('glas'), creme = dsKleur('creme');
const N = (x) => Math.round(x * 100) / 100;

// canvas -> SVG: precies genoeg van het canvas voor navpijl.js (translate, rotate, pad, vullen en strepen)
function opname() {
  const el = []; let st = { lw: 1, fs: '#000', ss: '#000' }; let d = ''; let tr = '';
  const ctx = {
    save() {}, restore() {},
    translate(x, y) { tr += `translate(${N(x)} ${N(y)}) `; }, rotate(a) { tr += `rotate(${N(a * 180 / Math.PI)}) `; },
    beginPath() { d = ''; }, closePath() { d += 'Z '; },
    moveTo(x, y) { d += `M${N(x)} ${N(y)} `; }, lineTo(x, y) { d += `L${N(x)} ${N(y)} `; },
    rect(x, y, w, h) { d += `M${N(x)} ${N(y)} h${N(w)} v${N(h)} h${N(-w)} Z `; },
    arc(x, y, r, a0, a1, ccw) { // alleen hele cirkels (navpijl.js)
      const sweep = ccw ? 0 : 1;
      d += `M${N(x + r)} ${N(y)} A${N(r)} ${N(r)} 0 1 ${sweep} ${N(x - r)} ${N(y)} A${N(r)} ${N(r)} 0 1 ${sweep} ${N(x + r)} ${N(y)} Z `;
    },
    stroke() { el.push(`<path d="${d}" fill="none" stroke="${st.ss}" stroke-width="${N(st.lw)}" stroke-linejoin="round"/>`); },
    fill(rule) { el.push(`<path d="${d}" fill="${st.fs}"${rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}/>`); },
    set lineWidth(v) { st.lw = v; }, set strokeStyle(v) { st.ss = v; }, set fillStyle(v) { st.fs = v; }, set lineJoin(v) {},
  };
  return { ctx, svg: () => `<g transform="${tr.trim()}">${el.join('')}</g>` };
}
function pijl(x, y, angle, opts) { const o = opname(); drawNavPijl(o.ctx, x, y, angle, opts); return o.svg(); }

// ------------------------------------------------------------------ de kaart (vaste, eenvoudige straat)
const MID = 125, R_EDGE = 114;
function land() {
  const g = [];
  g.push(`<rect width="250" height="250" fill="${mini.meadow}"/>`);
  g.push(`<path d="M0 20 L70 0 L110 0 L80 60 L0 80Z" fill="${mini.park}"/><path d="M170 170 L250 150 L250 250 L190 250Z" fill="${mini.park}"/>`);
  g.push(`<path d="M0 200 Q60 170 120 200 T250 195 L250 235 Q190 225 120 238 T0 240Z" fill="${mini.water}"/>`);
  for (const [x1, y1, x2, y2, w, c] of [[0, 125, 250, 125, 7, mini.major], [125, 0, 125, 250, 7, mini.major], [40, 60, 210, 60, 4, mini.road], [40, 60, 40, 190, 4, mini.road], [210, 60, 210, 190, 4, mini.road], [40, 160, 210, 160, 4, mini.road], [80, 125, 80, 160, 3, mini.minor]]) {
    g.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`);
  }
  const bl = mini.buildings; let i = 0;
  for (const [x, y, w, h] of [[50, 68, 22, 16], [90, 68, 24, 18], [135, 70, 20, 22], [170, 68, 26, 16], [50, 96, 18, 20], [92, 98, 26, 14], [140, 100, 18, 18], [172, 96, 24, 20], [50, 132, 24, 18], [92, 132, 20, 22], [140, 134, 24, 20], [176, 132, 22, 18]]) g.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bl[i++ % bl.length]}"/>`);
  return g.join('');
}
const SPELER = `<g transform="translate(125 125) rotate(-90)"><path d="M9 0 L-6 6 L-3 0 L-6 -6Z" fill="${dsKleur('licht-groen')}" stroke="${creme}" stroke-width="1.6" stroke-linejoin="round"/></g>`;
const NOORD = `<g transform="translate(125 16)"><circle r="9" fill="${glas}" stroke="${creme}" stroke-width="1.4"/><text y="3.6" text-anchor="middle" font-family="Bebas Neue, Arial Narrow, Arial" font-size="11" fill="${creme}">N</text></g>`;
function schild(x, y) { // politie: rood schild met een ring (een segment per ster), zoals de minikaart
  return `<g transform="translate(${x} ${y})"><circle r="10" fill="none" stroke="${PALETTES.uit.danger}" stroke-width="2.4" stroke-dasharray="10 11" transform="rotate(-90)"/><circle r="10" fill="none" stroke="${PALETTES.uit.police}" stroke-width="2.4" stroke-dasharray="10 53" stroke-dashoffset="-31" transform="rotate(-90)"/><path d="M0 -6 L5 -4 V1 Q5 5 0 7 Q-5 5 -5 1 V-4Z" fill="${PALETTES.uit.danger}" stroke="${glas}" stroke-width="1.2"/></g>`;
}
function pin(x, y, kleur) { return `<g transform="translate(${x} ${y})"><path d="M0 0 C-2 -4 -7 -7 -7 -12 A7 7 0 0 1 7 -12 C7 -7 2 -4 0 0Z" fill="${kleur}" stroke="${glas}" stroke-width="1.6"/><circle cy="-12" r="2.6" fill="${creme}"/></g>`; }
function ring(x, y, kleur) { return `<g transform="translate(${x} ${y})"><circle r="8" fill="none" stroke="${glas}" stroke-width="4.4" opacity="0.6"/><circle r="8" fill="none" stroke="${kleur}" stroke-width="2.6"/><circle r="3" fill="${kleur}"/></g>`; }

// ------------------------------------------------------------------ de acht scenario's
// hoek: schermhoek in graden (0 = rechts, 90 = onder); afstand in meter; binnen: tekent de marker op de kaart (in beeld) in plaats van een pijl
const S = [
  { id: 1, titel: 'Geen doel', uitleg: 'Verhaal staat uit, niets gekozen: geen pijlen, rustige kaart.', s: {}, pos: {} },
  { id: 2, titel: 'Volgende missie (autoroute)', uitleg: 'De gids van het verhaal wijst naar de volgende missie: dit volg je.', s: { verhaal: { name: 'Missie' } }, pos: { verhaal: [-40, 420] } },
  { id: 3, titel: 'Eigen route gezet', uitleg: 'Je klikte een plek op de kaart: jouw doel gaat voor, het verhaal wacht.', s: { eigen: { soort: 'place' }, verhaal: {} }, pos: { eigen: [30, 640], verhaal: [-150, 900] } },
  { id: 4, titel: 'Missie loopt, eigen doel wacht', uitleg: 'Een missie in uitvoering gaat voor jouw eigen doel; dat wacht (hol).', s: { missie: { fase: 'active', opKaart: true }, eigen: { soort: 'place' } }, pos: { missie: [-80, 300], eigen: [70, 900] } },
  { id: 5, titel: 'Bijbaan (klus) actief', uitleg: 'Een klus gaat voor alles; het verhaal wacht en de missie is verborgen.', s: { klus: {}, verhaal: {}, missie: { fase: 'active', opKaart: true } }, pos: { klus: [10, 260], verhaal: [-120, 700], missie: [-120, 700] } },
  { id: 6, titel: 'Samen spelen', uitleg: 'Jouw doel is jouw eigen; medespelers staan als holle pijlen in hun eigen kleur en vorm (geen doel).', s: { eigen: { soort: 'mission' } }, pos: { eigen: [-20, 520] }, partners: [{ a: 140, kleur: '#4363d8' }, { a: 215, kleur: '#f58231' }] },
  { id: 7, titel: 'Politie en een missie', uitleg: 'Rood schild met warmtering in beeld; de gele missie blijft de pijl die je volgt. Rood en geel lopen nooit door elkaar.', s: { missie: { fase: 'active', opKaart: true } }, pos: { missie: [-100, 380] }, politie: [[70, 92]] },
  { id: 8, titel: 'Lekke band en je eigen auto', uitleg: 'Een garage na een lekke band (kruis) wacht naast het verhaal; je eigen auto is geen doel.', s: { verhaal: {}, zorg: {} }, pos: { verhaal: [-30, 500], zorg: [150, 260] }, auto: 215 },
];

// de wereldpositie van een doel uit hoek en afstand (de speler staat op 0,0; de kaart toont ~ 130 m rondom)
const SCHAAL = 0.9; // px per meter in de mock
function wereld(h, afstand) { const a = h * Math.PI / 180; return { x: Math.cos(a) * afstand, y: Math.sin(a) * afstand }; }

const ALT = {
  A1: { naam: 'A1 Eén geel', tekst: 'Alles wat je volgt is geel, ook jouw eigen doel; wachtende doelen zijn hol en crème.' },
  A2: { naam: 'A2 Geel en paars (besluit 21-11)', tekst: 'Geel is het doel van de autoroute, paars wat je zelf koos; wachtende doelen zijn hol in hun eigen kleur.' },
  A3: { naam: 'A3 Per categorie (nu)', tekst: 'Elke soort een eigen kleur, alle pijlen gevuld, geen vorm of afstand: zoals het spel voor 21-11 deed.' },
};
const afstandTekst = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

function kaart(sc, alt) {
  const snap = { speler: { x: 0, y: 0 }, modus: 'auto' };
  const dist = {};
  for (const [t, extra] of Object.entries(sc.s)) {
    const [h, m] = sc.pos[t];
    const w = wereld(h, m);
    snap[t] = { x: w.x, y: w.y, name: t, ...extra };
    dist[t] = [h, m];
  }
  const nav = bepaalNavDoelen(snap);
  const kleurVan = (d) => (alt === 'A1' ? (d.rol === 'actief' ? dsKleur('ink-geel') : creme) : alt === 'A3' ? navKleur({ ...d, type: d.type === 'verhaal' || d.type === 'groep' ? 'missie' : d.type }, pal) : navKleur(d, pal));
  let g = land();
  // markers in beeld (alleen A2 en A1 tonen het verschil tussen actief en wachtend; A3 zoals nu)
  for (const p of sc.politie || []) g += schild(p[0], p[1]);
  const pijlen = [];
  for (const [i, ph] of (sc.partners || []).entries()) {
    const a = ph.a * Math.PI / 180;
    pijlen.push(pijl(MID + Math.cos(a) * R_EDGE, MID + Math.sin(a) * R_EDGE, a, { kleur: ph.kleur, hol: alt !== 'A3', s: 0.9, rand: glas }));
  }
  if (sc.auto != null && alt !== 'A3') { const a = sc.auto * Math.PI / 180; pijlen.push(pijl(MID + Math.cos(a) * R_EDGE, MID + Math.sin(a) * R_EDGE, a, { kleur: dsKleur('licht-groen'), hol: true, glyph: 'auto', s: 0.9, rand: glas })); }
  else if (sc.auto != null) { const a = sc.auto * Math.PI / 180; pijlen.push(pijl(MID + Math.cos(a) * R_EDGE, MID + Math.sin(a) * R_EDGE, a, { kleur: dsKleur('licht-groen'), s: 0.9, rand: glas })); }
  const volgorde = [...nav.secundair, ...(nav.actief ? [nav.actief] : [])];
  // A3 kent geen rangorde: alles wat een pijl had staat gevuld (de gids en de missie samen)
  const lijst = alt === 'A3' ? [...nav.alle, ...nav.verborgen.filter((v) => v.reden === 'te veel pijlen').map(() => null)].filter(Boolean) : volgorde;
  for (const d of lijst) {
    const h = Object.values(dist).find((q) => Math.abs(Math.hypot(...[wereld(q[0], q[1]).x - d.x, wereld(q[0], q[1]).y - d.y])) < 1) || [0, d.afstand];
    const a = h[0] * Math.PI / 180;
    const ax = MID + Math.cos(a) * R_EDGE, ay = MID + Math.sin(a) * R_EDGE;
    const actief = d.rol === 'actief';
    const hol = alt === 'A3' ? false : !actief;
    const glyph = alt === 'A3' ? '' : d.glyph;
    pijlen.push(pijl(ax, ay, a, { kleur: kleurVan(d), hol, glyph, s: actief && alt !== 'A3' ? 1.25 : 0.9, rand: glas }));
    if (actief && alt !== 'A3') {
      const lx = ax - Math.cos(a) * 23, ly = ay - Math.sin(a) * 23;
      pijlen.push(`<text x="${N(lx)}" y="${N(ly + 4.5)}" text-anchor="middle" font-family="Bebas Neue, Arial Narrow, Arial" font-size="13" fill="${creme}" stroke="${glas}" stroke-width="3.4" paint-order="stroke" stroke-linejoin="round">${afstandTekst(d.afstand)}</text>`);
    }
  }
  const staat = nav.alle.length ? nav.alle.map((d) => `${NAV_TYPES[d.type].label} (${d.rol === 'actief' ? 'volg dit' : 'wacht'})`).join(', ') : 'geen doel';
  const weg = nav.verborgen.map((v) => `${v.type}: ${v.reden}`).join('; ');
  return `<figure class="kaart"><svg viewBox="0 0 250 250" width="250" height="250" role="img" aria-label="${sc.titel}"><defs><clipPath id="c${sc.id}${alt}"><rect width="250" height="250" rx="14"/></clipPath></defs><g clip-path="url(#c${sc.id}${alt})">${g}${SPELER}${NOORD}${pijlen.join('')}</g><rect width="250" height="250" rx="14" fill="none" stroke="${dsKleur('ink-inkt')}" stroke-width="3"/></svg><figcaption><b>${sc.id}. ${sc.titel}</b><span>${sc.uitleg}</span><em>Pijlen: ${staat}${weg ? ` &middot; verborgen: ${weg}` : ''}</em></figcaption></figure>`;
}

// ------------------------------------------------------------------ de pagina
const cvdFilters = Object.entries(CVD).map(([naam, m]) => {
  const v = m.map((r) => r.map((x) => N(x)).join(' ') + ' 0').join(' ') + ' 0 0 0 1 0';
  return `<filter id="f-${naam}" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="${v}"/></filter>`;
}).join('');
const tokens = Object.entries(DS_TERUGVAL).map(([k, v]) => `--ds-c-${k}: ${v};`).join(' ');
const sets = Object.keys(ALT).map((a) => `<section class="alt" data-alt="${a}" ${a === 'A2' ? '' : 'hidden'}><h2>${ALT[a].naam}</h2><p>${ALT[a].tekst}</p><div class="raster">${S.map((sc) => kaart(sc, a)).join('')}</div></section>`).join('');
const legenda = Object.entries({ ster: 'missie of verhaal', vlag: 'een plek die je zelf koos', ruit: 'klus (bijbaan)', kruis: 'opknappen: garage of eten', ring: 'heli-run', auto: 'jouw auto' }).map(([g, t]) => {
  const o = opname(); drawNavPijl(o.ctx, 14, 14, 0, { kleur: pal.mission, glyph: g, s: 1.6, rand: glas });
  return `<li><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">${o.svg()}</svg><span>${t}</span></li>`;
}).join('');

const html = `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Minimap: pijlen en doelkleuren (#1078)</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root { ${tokens} --mk-user: ${pal.user}; --mk-job: ${pal.job}; --mk-care: ${pal.care};
  --nav-actief: var(--ds-c-ink-geel); --nav-eigen: var(--mk-user); --nav-secundair: var(--ds-c-creme); }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: var(--ds-c-ink-papier); color: var(--ds-c-ink-inkt); font: 16px/1.45 'Atkinson Hyperlegible', Arial, sans-serif; }
h1 { font: 36px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 0 0 4px; color: var(--ds-c-ink-bord); }
h2 { font: 26px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; margin: 24px 0 2px; }
p { max-width: 70ch; margin: 4px 0 12px; }
.bedien { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; background: var(--ds-c-ink-inkt); color: var(--ds-c-creme); padding: 10px 14px; border-radius: 6px; box-shadow: 4px 4px 0 var(--ds-c-ink-roze); }
.bedien select { font: inherit; padding: 4px 8px; }
.raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(262px, 1fr)); gap: 18px; }
.kaart { margin: 0; } .kaart svg { display: block; box-shadow: 4px 4px 0 var(--ds-c-ink-inkt); }
.kaart figcaption { font-size: 14px; max-width: 262px; padding-top: 6px; } .kaart figcaption b { display: block; font-size: 15px; }
.kaart figcaption span { display: block; } .kaart figcaption em { display: block; color: var(--ds-c-inkt-zacht); font-style: normal; margin-top: 2px; }
.uitleg { background: var(--ds-c-papier); border: 2.5px solid var(--ds-c-ink-inkt); padding: 10px 14px; max-width: 520px; box-shadow: 4px 4px 0 var(--ds-c-ink-bord); }
.uitleg ul { list-style: none; margin: 6px 0 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; } .uitleg li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.uitleg li svg { background: ${glas}; border-radius: 4px; }
#kaarten { filter: none; }
</style></head><body>
<h1>Minimap: pijlen en doelkleuren</h1>
<p>Mock bij docs/MINIMAP-PIJLEN-21-11.md (issue #1078). De pijlen worden getekend door dezelfde code als het spel (navpijl.js) en welk doel actief is komt uit navdoel.js; de kleuren uit de tokens. Kies een alternatief en een soort kleurenzien.</p>
<div class="bedien">
  <label>Alternatief <select id="alt">${Object.keys(ALT).map((a) => `<option value="${a}"${a === 'A2' ? ' selected' : ''}>${ALT[a].naam}</option>`).join('')}</select></label>
  <label>Zien <select id="cvd"><option value="">normaal</option><option value="deuteranopie">deuteranopie</option><option value="protanopie">protanopie</option><option value="tritanopie">tritanopie</option></select></label>
</div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${cvdFilters}</defs></svg>
<div class="uitleg"><b>Zo werkt de kaart: de pijlen</b><p style="margin:2px 0">Een gevulde pijl met een afstand is wat je nu volgt. Een holle pijl wacht even. Geel is de route van het verhaal, paars is jouw eigen doel. Het vormpje zegt wat het is.</p><ul>${legenda}</ul></div>
<div id="kaarten">${sets}</div>
<script>
const alt = document.getElementById('alt'), cvd = document.getElementById('cvd'), k = document.getElementById('kaarten');
function toon() { for (const s of k.querySelectorAll('.alt')) s.hidden = s.dataset.alt !== alt.value; k.style.filter = cvd.value ? 'url(#f-' + cvd.value + ')' : 'none'; }
alt.onchange = cvd.onchange = toon; toon();
</script>
</body></html>
`;
fs.mkdirSync(path.dirname(UIT), { recursive: true });
fs.writeFileSync(UIT, html);
console.log('geschreven:', path.relative(process.cwd(), UIT), `(${(html.length / 1024).toFixed(0)} kB)`);
