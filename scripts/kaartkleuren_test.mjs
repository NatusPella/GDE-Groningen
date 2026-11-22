// De kaartkleuren komen uit de ds-tokens (game/js/kaartkleuren.js): de terugval is gelijk aan ds-tokens.css,
// de rollen van INK (mapstyle.js) zijn die tokens, en de tekenkleuren van de kaart blijven leesbaar.
import fs from 'node:fs';
import { DS_TERUGVAL, dsKleur, kaartTintSterkte, kaartLabel, hexA, contrast, meng, KAART_ROLLEN, kaartInk, gebiedKleuren, kaartLand, WATER_BLAUW, KAART_PALET_VERSIE, PIRAMIDE_OUD, piramideNieuw, herkleurRaster, markerRollen, markerKleuren, MARKER_ROL, glyphOp } from '../game/js/kaartkleuren.js';
import { INK, MAP_PALETTE, MINI_PALETTE, ICON_FILL, ICON_RIM, LABEL } from '../game/js/mapstyle.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL', m); } };
const css = fs.readFileSync(new URL('../game/js/ds-tokens.css', import.meta.url), 'utf8');

for (const [naam, hex] of Object.entries(DS_TERUGVAL)) {
  const m = css.match(new RegExp('--ds-c-' + naam + ':\\s*(#[0-9a-fA-F]{6})'));
  ok(m && m[1].toLowerCase() === hex, 'terugval gelijk aan ds-tokens.css: ' + naam);
  ok(dsKleur(naam) === hex, 'dsKleur zonder pagina geeft de terugval: ' + naam);
}
let gooit = false;
try { dsKleur('bestaat-niet'); } catch (e) { gooit = true; }
ok(gooit, 'onbekende token geeft een fout');
ok(hexA('#f9c80e', 0.5) === 'rgba(249, 200, 14, 0.5)', 'hexA');

const ink = kaartInk();
for (const [rol, token] of Object.entries(KAART_ROLLEN)) {
  ok(ink[rol] === DS_TERUGVAL[token] && INK[rol] === DS_TERUGVAL[token], `INK.${rol} komt uit token ${token}`);
}

// leesbaarheid: tekst, lijnen en markers op het land en op het paneel
const land = [MAP_PALETTE.meadow, MAP_PALETTE.park, MINI_PALETTE.meadow, MINI_PALETTE.park]; // weiland, park (kaart en minikaart)
for (const l of land) ok(contrast(LABEL.tekst, l) >= 4.5, 'inkt (kaarttekst) leest op ' + l);
ok(contrast(INK.cream, INK.panelTop) >= 7 && contrast(INK.amber, INK.panelTop) >= 4.5, 'paneeltekst op glas');
ok(contrast(INK.amberInk, INK.yellow) >= 7, 'inkt op geel');

// de gebiedstoestanden: elke lijn staat los van het land eronder
const g = gebiedKleuren();
// op het lichte minikaartgroen redt de donkere onderlijn (glas) het contrast, die zit in elke lijn
// 22-11: op het lichte papier redt de donkere onderlijn (glas) het contrast; de gekleurde lijn leest op het glas zelf
for (const t of ['zichtbaar', 'bezig']) { ok(contrast(g[t].lijn, INK.dark) >= 3, `lijn ${t} op de onderlijn`); for (const l of land) ok(contrast(INK.dark, l) >= 3, `onderlijn op ${l}`); }
ok(contrast(g.onzichtbaar.lijn, g.onzichtbaar.vul) >= 3, 'lijn van onzichtbaar op zijn vlak');
ok(contrast(g.veroverd.lijn, g.veroverd.rand) >= 7, 'veroverd: lichte lijn op donkere rand');
ok(g.veroverd.vul === dsKleur('licht-groen') && g.veroverd.vul !== g.bezig.vul, 'veroverd is groen, bezig geel');
ok(contrast(g.veroverd.lijn, INK.dark) >= 3, 'groene lijn op de onderlijn');
ok(new Set([g.zichtbaar.lijn, g.bezig.lijn, g.onzichtbaar.lijn]).size === 3, 'drie lijnkleuren verschillen');

// --- het land en de markers uit de tokens (21-11) ---
const L = kaartLand();
ok(MAP_PALETTE.meadow === L.kaart.meadow && MINI_PALETTE.meadow === L.mini.meadow && MAP_PALETTE.water === L.kaart.water, 'MAP_PALETTE en MINI_PALETTE komen uit kaartLand()');
ok(fs.readFileSync(new URL('../DESIGN_SYSTEM.md', import.meta.url), 'utf8').includes('grachtwater groenblauw `' + WATER_BLAUW + '`'), 'het water is het grachtwater van DESIGN_SYSTEM.md');
ok(meng('#000000', '#ffffff', 0.5) === '#808080' && meng('#102030', '#102030', 0.7) === '#102030', 'meng');
const P0 = dsKleur('papier'), I0 = dsKleur('ink-inkt'), B0 = dsKleur('ink-bord');
ok(L.kaart.major === I0 && L.kaart.road === dsKleur('inkt-zacht') && L.kaart.rail === I0 && L.kaart.railTie === P0, 'wegen, spoor en bielzen uit inkt en papier');
ok(L.kaart.meadow === meng(P0, dsKleur('papier-2'), 0.35) && contrast(L.kaart.meadow, P0) < 1.2, 'het land is crèmepapier');
// 22-11: de Wereldkleur bepaalt de sterkte van de vlaktinten (uit 1,25, subtiel 1, drukwerk 0,8); lijnen, papier en inkt blijven gelijk
const sterkte = [0, 0.4, 0.65].map((m) => kaartTintSterkte(m));
ok(sterkte[0] > sterkte[1] && sterkte[1] > sterkte[2] && Math.abs(sterkte[1] - 0.97) < 0.05 && kaartTintSterkte(9) === 0.8 && kaartTintSterkte(-1) === 1.25, 'tintsterkte: uit sterker dan subtiel sterker dan drukwerk');
const L0 = kaartLand(0), L1 = kaartLand(0.65);
ok(L0.kaart.park === meng(P0, B0, 0.16 * 1.25) && L1.kaart.park === meng(P0, B0, 0.16 * 0.8), 'uit en drukwerk: de parktint volgt de sterkte');
ok(L.kaart.major === L0.kaart.major && L.kaart.road === L1.kaart.road && L.kaart.meadow === L1.kaart.meadow && L0.kaart.meadow === L1.kaart.meadow, 'lijnen en papier volgen de Wereldkleur niet');
ok(['park', 'forest', 'tree', 'water'].every((n) => L0.kaart[n] !== L1.kaart[n]), 'uit en drukwerk verschillen in de vlaktinten');
ok(typeof kaartLabel().tekst === 'string' && kaartLabel().tekst === I0 && kaartLabel().halo === P0, 'labels: inkt met een papieren halo');
// de kleur van een gebouw met alfa, over het land gelegd
const over = (c, bg) => {
  const m = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(c);
  if (!m) return c;
  const a = +m[4], h = (x, i) => parseInt(x.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i, j) => Math.round(+m[j + 1] * a + h(bg, i) * (1 - a)).toString(16).padStart(2, '0')).join('');
};
for (const [naam, P] of [['kaart', L.kaart], ['minikaart', L.mini]]) {
  // lijnen: 3:1 tegen het land; vlakken onderscheiden zich van het weiland
  for (const lijn of ['road', 'major', 'minor', 'rail', 'foot', 'cycle', 'waterEdge']) ok(contrast(over(P[lijn], P.meadow), P.meadow) >= 3, naam + ': ' + lijn + ' 3:1 tegen het weiland');
  ok(contrast(P.water, P.meadow) >= 1.5 || contrast(P.waterEdge, P.meadow) >= 3, naam + ': water los van het weiland');
  ok(contrast(P.park, P.meadow) >= 1.15, naam + ': park los van het weiland (een tint; de rand van het groen is de grens)');
  ok(contrast(over(P.building, P.meadow), P.meadow) >= 2, naam + ': gebouwen 2:1 tegen het weiland (een vlak, geen lijn)');
  ok(contrast(P.water, P.park) >= 1.3 || contrast(P.waterEdge, P.park) >= 3, naam + ': water los van park');
  ok(contrast(LABEL.tekst, P.meadow) >= 4.5, naam + ': inkt 4,5:1 op het weiland');
}
ok(contrast(LABEL.tekst, MAP_PALETTE.park) >= 4.5 && contrast(LABEL.tekst, MAP_PALETTE.water) >= 4.5 && contrast(LABEL.water, MAP_PALETTE.water) >= 3, 'tekst leest op park en water');
ok(![MAP_PALETTE.road, MAP_PALETTE.major, MAP_PALETTE.minor, MAP_PALETTE.foot, MAP_PALETTE.rail, MAP_PALETTE.building].some((c) => /f9c80e|e8c93a/i.test(c)), 'geen geel in het land (alleen route en doel)');

// de markers: vijf rollen, crème rand, 4,5:1 voor de glyph, 3:1 voor de donkere buitenrand van de schijf
const R = markerRollen();
ok(R.bord !== R.rood && R.rood !== R.blauw && R.geel === dsKleur('ink-geel') && R.creme === dsKleur('creme'), 'vijf marker-rollen');
for (const [cat, vul] of Object.entries(ICON_FILL)) {
  ok(vul === R[MARKER_ROL[cat]], 'marker ' + cat + ' heeft de kleur van zijn rol');
  ok(contrast(glyphOp(vul), vul) >= 4.5, 'glyph op ' + cat + ' haalt 4,5:1 (' + contrast(glyphOp(vul), vul).toFixed(2) + ')');
  ok(contrast(vul, INK.dark) >= 3, 'schijf van ' + cat + ' haalt 3:1 tegen de donkere buitenrand');
}
// de rand (crème, geel, licht rood) leest op het donkere glas van de schijf; tegen het lichte papier draagt de donkere buitenrand (3:1)
for (const [cat, rim] of Object.entries(ICON_RIM)) { ok(contrast(rim, INK.dark) >= 3, 'rand van ' + cat + ' leest op de schijf'); for (const P of [L.kaart, L.mini]) ok(contrast(rim, P.meadow) >= 3 || contrast(INK.dark, P.meadow) >= 3, 'rand van ' + cat + ' of de buitenrand leest op het weiland'); }
ok(ICON_RIM.politiebureau === dsKleur('creme') && ICON_RIM.halte === dsKleur('ink-geel') && ICON_RIM.gevaar === dsKleur('rood-glas-tx'), 'rand: crème, doelen geel, gevaar rood');
ok(markerKleuren().glyph === dsKleur('creme'), 'de lichte glyph is crème');

// de piramide: oude kleuren naar nieuwe, alfa blijft, een nieuwe piramide blijft staan
ok(typeof KAART_PALET_VERSIE === 'string' && KAART_PALET_VERSIE.length > 0, 'het palet heeft een versie (cache-sleutel)');
const nieuw = piramideNieuw();
ok(Object.keys(nieuw).join() === Object.keys(PIRAMIDE_OUD).join(), 'oude en nieuwe piramidekleuren hebben dezelfde rollen');
{
  const px = new Uint8ClampedArray([...PIRAMIDE_OUD.water, 255, ...PIRAMIDE_OUD.major, 40, ...PIRAMIDE_OUD.green, 0, ...PIRAMIDE_OUD.rail, 170]);
  herkleurRaster(px);
  ok([px[0], px[1], px[2]].join() === nieuw.water.join() && px[3] === 255, 'water wordt het nieuwe water');
  ok([px[4], px[5], px[6]].join() === nieuw.major.join() && px[7] === 40, 'de alfa blijft');
  ok([px[8], px[9], px[10]].join() === PIRAMIDE_OUD.green.join() && px[11] === 0, 'een leeg beeldpunt blijft ongemoeid');
  ok([px[12], px[13], px[14]].join() === nieuw.rail.join() && px[15] === 170, 'spoor wordt het nieuwe spoor');
  const bijna = new Uint8ClampedArray([PIRAMIDE_OUD.minor[0] + 3, PIRAMIDE_OUD.minor[1] - 2, PIRAMIDE_OUD.minor[2], 200]);
  herkleurRaster(bijna);
  ok([bijna[0], bijna[1], bijna[2]].join() === nieuw.minor.join(), 'een bijna-kleur gaat naar de dichtstbijzijnde');
}
const pm = fs.readFileSync(new URL('../scripts/world/province_map.mjs', import.meta.url), 'utf8');
ok(/palet: KAART_PALET_VERSIE/.test(pm) && /piramideNieuw\(\)\.building/.test(pm), 'province_map.mjs bakt het nieuwe palet en meldt de versie');
const prov = fs.readFileSync(new URL('../game/js/provincemap.js', import.meta.url), 'utf8');
ok(/M\.palet !== KAART_PALET_VERSIE/.test(prov) && /herkleurRaster/.test(prov), 'provincemap.js herkleurt alleen een piramide zonder de nieuwe versie');

console.log(fails ? `kaartkleuren_test: ${fails} van ${n} mislukt` : `kaartkleuren_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
