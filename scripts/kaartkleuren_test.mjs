// De kaartkleuren komen uit de ds-tokens (game/js/kaartkleuren.js): de terugval is gelijk aan ds-tokens.css,
// de rollen van INK (mapstyle.js) zijn die tokens, en de tekenkleuren van de kaart blijven leesbaar.
import fs from 'node:fs';
import { DS_TERUGVAL, dsKleur, hexA, contrast, KAART_ROLLEN, kaartInk, gebiedKleuren } from '../game/js/kaartkleuren.js';
import { INK } from '../game/js/mapstyle.js';

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
const land = ['#243528', '#2f5c36', '#3e4c39', '#5a8445']; // weiland, park (kaart en minikaart)
for (const l of land) ok(contrast(INK.cream, l) >= 3, 'crème tekst leest op ' + l);
ok(contrast(INK.cream, INK.panelTop) >= 7 && contrast(INK.amber, INK.panelTop) >= 4.5, 'paneeltekst op glas');
ok(contrast(INK.amberInk, INK.yellow) >= 7, 'inkt op geel');

// de gebiedstoestanden: elke lijn staat los van het land eronder
const g = gebiedKleuren();
// op het lichte minikaartgroen redt de donkere onderlijn (glas) het contrast, die zit in elke lijn
for (const t of ['zichtbaar', 'bezig']) for (const l of land.slice(0, 3).concat(INK.dark)) ok(contrast(g[t].lijn, l) >= 3, `lijn ${t} op ${l}`);
ok(contrast(g.onzichtbaar.lijn, g.onzichtbaar.vul) >= 3, 'lijn van onzichtbaar op zijn vlak');
ok(contrast(g.veroverd.lijn, g.veroverd.rand) >= 7, 'veroverd: lichte lijn op donkere rand');
ok(g.veroverd.vul === dsKleur('licht-groen') && g.veroverd.vul !== g.bezig.vul, 'veroverd is groen, bezig geel');
for (const l of land.slice(0, 3)) ok(contrast(g.veroverd.lijn, l) >= 3, 'groene lijn op ' + l);
ok(new Set([g.zichtbaar.lijn, g.bezig.lijn, g.onzichtbaar.lijn]).size === 3, 'drie lijnkleuren verschillen');

console.log(fails ? `kaartkleuren_test: ${fails} van ${n} mislukt` : `kaartkleuren_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
