// De kaart in het DS3-zeefdrukpalet (22-11, #1009): elk marker-kind heeft een Phosphor-icoon (ICON_MAP) of een bewust eigen teken met reden,
// een kleur uit de tokens, genoeg contrast tegen elke basiskaartkleur (bij Wereldkleur uit, subtiel en drukwerk, en 's nachts), een
// plek in de legenda, een eigen combinatie van vorm, kleur en glyph, en een vorm die verschilt waar kleurenblinden de kleuren niet scheiden.
// Draai: node scripts/kaart_ds3_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
import { bouwAudit, FAMILIES, LEGENDA, LAGEN, CVD_SOORTEN, kleurVerschil } from './lib/kaart_audit.mjs';
import { kandidaat } from './lib/kaart_paletten.mjs';
import { ICON_MAP } from '../game/js/iconmap.js';
import { PHOSPHOR } from '../game/js/phosphordata.js';
import { contrast, kaartLand, kaartLaag, kaartLabel, markerRollen, MARKER_ROL, dsKleur, meng, KAART_PALET_VERSIE, PIRAMIDE_ZEEF1, piramideVan, PIRAMIDE_OUD } from '../game/js/kaartkleuren.js';
import { MAP_PALETTE, MINI_PALETTE, INK, LABEL, ICON_FILL, nightPalette, kaartTekst } from '../game/js/mapstyle.js';
import { HALO_DARK, HALO_LIGHT, BADGE_SHAPE, BADGE_GLYPH, BADGE_UNITS, MIN_ICON_PX, MIN_GLYPH_PX, ICON_UNITS, GLYPH_CONTRAST, GRAPHIC_CONTRAST, miniIconScale, hexContrast } from '../game/js/mapicons.js';
import { pulsWaarde, PULS_MS } from '../game/js/navpijl.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const src = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const A = await bouwAudit();

// 1. elk kind: een Phosphor-naam uit ICON_MAP, of een bewust eigen teken met een reden; geen onbekende kinds
ok(A.markers.length >= 140, 'de audit kent alle soorten (' + A.markers.length + ')');
for (const m of A.markers) {
  if (m.bron === 'phosphor') ok(ICON_MAP[m.icoon] && PHOSPHOR[ICON_MAP[m.icoon]], `${m.kind}: ${m.icoon} staat in ICON_MAP en in phosphordata.js`);
  else ok(typeof m.eigenReden === 'string' && m.eigenReden.length > 10, `${m.kind}: een eigen teken heeft een reden`);
  ok(m.categorie && m.vorm, `${m.kind}: een categorie en een vorm`);
}
ok(A.markers.filter((m) => m.bron === 'phosphor').length >= 110, 'het overgrote deel van de markers is Phosphor');
ok(A.markers.filter((m) => m.badge && m.bron === 'eigen').every((m) => /^(perceel-|mi-|ma-|mm-)/.test(m.kind) || m.eigenReden), 'een badge zonder Phosphor is een perceel of een doelmarkering met reden');

// 2. kleuren uit de tokens: een badge heeft zijn vulling uit markerRollen en er staat geen ruwe hex in de kaartcode buiten de palettabellen
const R = markerRollen();
for (const m of A.markers.filter((x) => x.badge)) ok(m.vul === R[MARKER_ROL[m.categorie]] && ICON_FILL[m.categorie] === m.vul, `${m.kind}: vulling is de rol ${MARKER_ROL[m.categorie]}`);
const HEX = /#[0-9a-fA-F]{6}\b/g;
const hexen = (f) => (src(f).match(HEX) || []).length;
for (const f of ['mapview', 'hud_panel', 'mapicons', 'mapmarkers', 'navpijl', 'forsalemap', 'perceelmap', 'interiormap', 'regions', 'countrymap', 'poisections', 'mapdeclutter', 'mapfilters']) {
  if (fs.existsSync(new URL('../game/js/' + f + '.js', import.meta.url))) ok(hexen('game/js/' + f + '.js') === 0, `${f}.js heeft geen ruwe hex (kleuren komen uit mapstyle.js en kaartkleuren.js)`);
}
ok(hexen('game/js/mapglyphs.js') <= 1, 'mapglyphs.js: één crème-constante');
ok(hexen('game/js/mapstyle.js') <= 51, 'mapstyle.js: ruwe hexen alleen in de ene INK-tabel (' + hexen('game/js/mapstyle.js') + ', de grens daalt alleen)');
{
  const kk = src('game/js/kaartkleuren.js');
  const land = kk.slice(kk.indexOf('export function kaartLand'), kk.indexOf('export function kaartLabel'));
  ok(!HEX.test(land) && /meng\(/.test(land), 'kaartLand() mengt alleen tokens (geen ruwe hex)');
  const lab = kk.slice(kk.indexOf('export function kaartLabel'), kk.indexOf('export function kaartLaag'));
  ok(!/#[0-9a-fA-F]{6}\b/.test(lab), 'kaartLabel() heeft geen ruwe hex');
}

// 3. contrast: de basiskaart bij elke Wereldkleur-stand en 's nachts
const standen = [['uit', 0], ['subtiel', 0.4], ['drukwerk', 0.65]];
const over = (c, bg) => {
  const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(c);
  if (!m) return c;
  const a = +m[4], h = (x, i) => parseInt(x.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i, j) => Math.round(+m[j + 1] * a + h(bg, i) * (1 - a)).toString(16).padStart(2, '0')).join('');
};
const grondvlakken = ['meadow', 'park', 'forest', 'water', 'village', 'business', 'allot', 'sports'];
const lab = kaartLabel();
for (const [naam, m] of standen) {
  const L = kaartLand(m);
  for (const [soort, P] of [['kaart', L.kaart], ['mini', L.mini]]) {
    const w = `${soort} (${naam})`;
    for (const l of ['road', 'major', 'minor', 'rail', 'foot', 'cycle', 'waterEdge']) ok(contrast(over(P[l], P.meadow), P.meadow) >= 3, `${w}: ${l} 3:1 tegen het weiland`);
    for (const g of grondvlakken) {
      ok(contrast(lab.tekst, P[g]) >= 4.5, `${w}: labelinkt 4,5:1 op ${g}`);
      ok(HALO_LIGHT !== HALO_DARK && (contrast(HALO_DARK, P[g]) >= GRAPHIC_CONTRAST || contrast(HALO_LIGHT, P[g]) >= GRAPHIC_CONTRAST), `${w}: de buitenring van een marker leest op ${g}`);
    }
    for (const g of ['building', 'church']) { const v = over(P[g], P.meadow); ok(contrast(HALO_DARK, v) >= 3 || contrast(HALO_LIGHT, v) >= 3, `${w}: marker op ${g}`); }
    ok(contrast(P.major, P.minor) >= 1.5 || P.major !== P.minor, `${w}: hoofdweg en straat verschillen`);
    ok(contrast(P.waterEdge, P.water) >= 1.5, `${w}: de waterrand staat los van het water`);
    ok(contrast(over(P.building, P.meadow), P.meadow) >= 2, `${w}: gebouwen 2:1 tegen het weiland`);
    ok(contrast(lab.water, P.water) >= 3, `${w}: de naam op het water 3:1`);
    ok(contrast(lab.amber, lab.halo) >= 4.5 && contrast(lab.flavour, lab.halo) >= 4.5, `${w}: waarschuwing en bijschrift op de halo`);
  }
  const lg = kaartLaag();
  for (const [k, c] of Object.entries(lg)) for (const g of ['meadow', 'park']) ok(contrast(c, L.kaart[g]) >= 3, `laag ${k} (${naam}) 3:1 op ${g}`);
}
ok(contrast(lab.tekst, lab.halo) >= 7, 'inkt op de papieren halo 7:1');
{ // 's nachts: de lijnen blijven leesbaar op het gedimde land
  const nacht = nightPalette({ ...MAP_PALETTE });
  ok(contrast(nacht.major, nacht.meadow) >= 3 && contrast(nacht.road, nacht.meadow) >= 3, 'nacht: wegen op het land 3:1');
}
// de tinten volgen de Wereldkleur: uit sterker, drukwerk lichter
{
  const [u, s, d] = standen.map(([, m]) => kaartLand(m).kaart);
  const afstand = (P) => contrast(P.park, P.meadow);
  ok(afstand(u) > afstand(s) && afstand(s) > afstand(d), 'het park staat bij uit het sterkst en bij drukwerk het vlakst van het weiland');
  ok(u.major === d.major && u.meadow === d.meadow && u.road === d.road, 'papier en inkt blijven gelijk bij elke stand');
}

// 4. de minikaart en de grote kaart: één bron
{
  ok(Object.keys(MAP_PALETTE).filter((k) => !['roadMin', 'majorMin', 'roadMetres'].includes(k)).every((k) => k in MINI_PALETTE || k === 'buildings'), 'minikaart en grote kaart hebben dezelfde sleutels');
  const L = kaartLand();
  ok(MAP_PALETTE.water === L.kaart.water && MINI_PALETTE.water === L.mini.water && MAP_PALETTE.major === L.kaart.major && MINI_PALETTE.major === L.mini.major, 'beide paletten komen uit kaartLand()');
  ok(L.mini.rail === L.kaart.rail && L.mini.water === L.kaart.water && L.mini.cycle === L.kaart.cycle && L.mini.railTie === L.kaart.railTie, 'spoor, water en fietspad zijn op beide kaarten gelijk');
  const ms = src('game/js/mapstyle.js'), mv = src('game/js/mapview.js'), hp = src('game/js/hud_panel.js');
  ok(/kaartLand\(\)/.test(ms) && /MAP_PALETTE = \{ \.\.\.LAND\.kaart/.test(ms) && /MINI_PALETTE = \{ \.\.\.LAND\.mini/.test(ms), 'mapstyle.js bouwt beide uit één LAND');
  ok(/kaartTekst/.test(mv) && /kaartTekst/.test(hp) && /labelHalo/.test(mv) && /labelHalo/.test(hp), 'grote kaart en minikaart tekenen hun namen met dezelfde inkt en halo');
  ok(LABEL.tekst === lab.tekst && LABEL.halo === lab.halo, 'LABEL is kaartLabel()');
  ok(kaartTekst(INK.cream) === LABEL.tekst && kaartTekst('rgba(240, 237, 228, 0.5)') === 'rgba(29, 27, 23, 0.5)' && kaartTekst('#123456') === '#123456', 'kaartTekst zet crème om naar inkt, met behoud van de alfa');
  // de piramide: het palet heeft een versie en de oude versies worden herkleurd
  ok(KAART_PALET_VERSIE === 'zeef-2' && piramideVan('zeef-1') === PIRAMIDE_ZEEF1 && piramideVan(undefined) === PIRAMIDE_OUD, 'de piramide kent zijn eerdere paletten');
}

// 5. contrast van de markers: de glyph op zijn vulling en de buitenring op elke grond
for (const [cat, vul] of Object.entries(ICON_FILL)) {
  const g = hexContrast(HALO_LIGHT, vul) >= GLYPH_CONTRAST ? HALO_LIGHT : HALO_DARK;
  ok(hexContrast(g, vul) >= GLYPH_CONTRAST, `glyph op ${cat} haalt ${GLYPH_CONTRAST}:1 (${hexContrast(g, vul).toFixed(2)})`);
  ok(hexContrast(vul, HALO_DARK) >= 3, `schijf van ${cat} tegen zijn donkere buitenlijn`);
}

// 6. de legenda: dezelfde rijen als in mapview.js, en elke soort valt onder een rij
{
  const mv = src('game/js/mapview.js');
  const blok = mv.slice(mv.indexOf('const LEGEND = ['), mv.indexOf('function drawLegendIcon'));
  const rijen = [...blok.matchAll(/\{ kind: '([^']+)', label: '([^']+)'/g)].map((x) => x[1] + '|' + x[2].replace(/ \(.*$/, ''));
  const hier = LEGENDA.map((r) => r.kind + '|' + r.label);
  ok(rijen.length === hier.length && rijen.every((r, i) => r === hier[i]), 'LEGENDA in de audit is gelijk aan LEGEND in mapview.js (' + rijen.length + ' rijen)');
  const groepen = [...blok.matchAll(/\{ group: '([^']+)'/g)].map((x) => x[1]);
  ok(groepen.join() === 'Altijd,Te doen,Diensten,Onderweg', 'de legenda is gegroepeerd per categorie');
  for (const m of A.markers) ok(!!m.legenda, `${m.kind} staat in de legenda`);
  ok(/ds-zeef-bg/.test(mv) && /\.mapview-legend \.mv-grp \{ background: var\(--ds-c-papier-2\)/.test(mv), 'de legenda is een DS3-zeefdrukkaart met chips per groep');
  ok(LAGEN.length >= 10 && LAGEN.every((l) => l.naam && l.token && l.bron), 'de lagen en routelijnen staan in de audit met hun token');
}

// 7. een eigen combinatie van vorm, kleur en glyph (behalve een familie), en de vormen voor kleurenblinden
{
  const per = new Map();
  for (const m of A.markers.filter((x) => x.badge && x.icoon)) { const s = m.vorm + '|' + m.vul + '|' + m.icoon; per.set(s, [...(per.get(s) || []), m.kind]); }
  for (const [s, kinds] of per) if (kinds.length > 1) ok(FAMILIES.some((f) => kinds.every((k) => f.includes(k))), `${kinds.join(' en ')} delen ${s} maar zijn geen familie`);
  ok(FAMILIES.every((f) => f.every((k) => A.kinds.includes(k))), 'elke familie bestaat uit bekende soorten');
  // vorm bij een klein kleurverschil: twee categorieën met dezelfde vorm moeten bij elke kleurenblindheid ver uit elkaar liggen
  const cats = Object.keys(ICON_FILL);
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) {
    const a = cats[i], b = cats[j];
    if (ICON_FILL[a] === ICON_FILL[b]) continue; // dezelfde kleur: een eigen glyph, geen kleurverschil nodig
    const klein = Math.min(...[undefined, ...CVD_SOORTEN].map((s) => kleurVerschil(ICON_FILL[a], ICON_FILL[b], s)));
    ok(BADGE_SHAPE[a] !== BADGE_SHAPE[b] || klein >= 25, `${a} en ${b}: dezelfde vorm maar kleurverschil ${klein.toFixed(0)} bij kleurenblindheid`);
  }
  ok(BADGE_SHAPE.flitspaal === 'octagon' && BADGE_SHAPE.station === 'pill' && BADGE_SHAPE.ommeland === 'pin', 'flitspaal, station en ommeland hebben een eigen vorm');
}

// 8. de minimale maat: de vorm en het glyph blijven leesbaar bij de kleinste badge
{
  ok(MIN_ICON_PX >= MIN_GLYPH_PX, `de kleinste badge (${MIN_ICON_PX} px) is groter dan de minimale glyphmaat (${MIN_GLYPH_PX} px)`);
  for (const ui of [0.8, 1, 1.25, 1.5]) ok(miniIconScale(120 * ui) * ICON_UNITS >= MIN_GLYPH_PX, 'minikaart-badge schaalt mee met de ui-schaal en blijft boven de minimale maat (ui ' + ui + ')');
  for (const [vorm, g] of Object.entries(BADGE_GLYPH)) ok(BADGE_UNITS * (MIN_ICON_PX / ICON_UNITS) * g.box * 0.84 >= 10, `${vorm}: het glyph is bij de kleinste badge minstens 10 px`);
  ok(Object.keys(BADGE_GLYPH).every((v) => Object.values(BADGE_SHAPE).includes(v)) && Object.values(BADGE_SHAPE).every((v) => BADGE_GLYPH[v]), 'elke vorm heeft zijn glyphdoos');
}

// 9. het actieve doel: geel, één puls van 250 ms, stil bij Minder beweging
{
  ok(PULS_MS <= 250, 'de puls duurt hooguit 250 ms');
  const sl = 'doel|geel';
  pulsWaarde(sl, 10, false);
  ok(pulsWaarde(sl, 10, false) === 0 && pulsWaarde(sl, 10.1, false) === 0, 'Minder beweging: geen puls');
  const p0 = pulsWaarde('nieuw|doel', 20, true), p1 = pulsWaarde('nieuw|doel', 20.125, true), p2 = pulsWaarde('nieuw|doel', 20.3, true), p3 = pulsWaarde('nieuw|doel', 25, true);
  ok(p0 === 0 && p1 > 0.5 && p2 === 0 && p3 === 0, 'één zwelling van 250 ms bij het verschijnen, daarna stil');
  ok(INK.yellow === dsKleur('ink-geel') && INK.routeLine === '#f9c80e', 'het actieve doel is het ene geel');
}

// 10. de alternatieven staan klaar en halen de leesbaarheid ook
for (const id of ['A', 'B', 'C']) {
  const P = kandidaat(id);
  for (const l of ['major', 'road', 'rail']) ok(contrast(over(P.kaart[l], P.kaart.meadow), P.kaart.meadow) >= 3, `kandidaat ${id}: ${l} 3:1`);
  ok(contrast(P.label.tekst, P.kaart.meadow) >= 4.5 && contrast(P.label.tekst, P.kaart.water) >= 4.5, `kandidaat ${id}: labels 4,5:1`);
  ok(Object.keys(P.kaart).length >= 20 && P.mini.meadow, `kandidaat ${id}: kaart en minikaart`);
}
ok(fs.existsSync(new URL('../docs/KAART-PALETTEN-22-11.md', import.meta.url)), 'docs/KAART-PALETTEN-22-11.md beschrijft de drie kandidaten');

console.log(fails ? `kaart_ds3_test: ${fails} van ${n} mislukt` : `kaart_ds3_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
