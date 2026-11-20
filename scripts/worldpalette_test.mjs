// Pure test van de wereldpalet-module (game/js/worldpalette.js, 21-11): waarden binnen bereik, de helderheid (contrast) van wegen, stoepen
// en gevels blijft behouden, de menging 0 laat alles ongemoeid, determinisme, geen winterkou, en de kaartpaletten volgen dezelfde regels.
import {
  WERELD_DS_MENG, WERELD_INKTEN, WERELD_ROLLEN, WERELD_KLEURPLAAT, dsWereld, dsWereldCss, wereldRol, wereldLuma, setWereldMeng, wereldMeng,
} from '../game/js/worldpalette.js';
import { dsKleur } from '../game/js/kaartkleuren.js';

let fail = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('FAIL', m); } };
const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const L = (h) => wereldLuma(...rgb(h));
const sat = (h) => { const [r, g, b] = rgb(h); const mx = Math.max(r, g, b); return mx ? (mx - Math.min(r, g, b)) / mx : 0; };

// de inkten zijn de tokens van het designsysteem
const hexNum = (s) => parseInt(s.slice(1), 16);
for (const k of ['papier', 'inkt', 'bord', 'geel', 'roze']) ok(WERELD_INKTEN[k] === hexNum(dsKleur('ink-' + k)), 'inkt ' + k + ' gelijk aan het token');
ok(WERELD_DS_MENG >= 0.25 && WERELD_DS_MENG <= 0.35, 'standaardmenging is subtiel (0,25 tot 0,35)');
ok(wereldMeng() === WERELD_DS_MENG, 'zonder URL is de menging de constante');

const alle = [];
for (const [cat, v] of Object.entries(WERELD_KLEURPLAAT)) for (const [naam, hex] of Object.entries(v.kleuren)) alle.push({ cat, naam, hex });
ok(alle.length >= 60, 'de kleurplaat heeft minstens 60 kleuren (' + alle.length + ')');

// meng 0 = het oude palet, exact
for (const { hex } of alle) ok(dsWereld(hex, 'auto', 0) === hex, 'meng 0 laat ' + hex.toString(16) + ' ongemoeid');
// determinisme en bereik, bij elke menging
for (const m of [0.25, 0.3, 0.5, 1]) {
  for (const { hex, naam } of alle) {
    const a = dsWereld(hex, 'auto', m), b = dsWereld(hex, 'auto', m);
    ok(a === b, 'deterministisch ' + naam);
    ok(Number.isInteger(a) && a >= 0 && a <= 0xffffff, 'binnen bereik ' + naam + ' @' + m);
  }
}
// de helderheid blijft behouden voor alles behalve de accenten en papier (wegen, stoepen, gevels, gras, water): hoogstens 6 van 255
for (const m of [0.3, 0.5, 1]) {
  for (const { cat, naam, hex } of alle) {
    const rol = wereldRol(hex);
    if (!rol || rol === 'geel' || rol === 'roze' || rol === 'papier') continue;
    const d = Math.abs(L(dsWereld(hex, 'auto', m)) - L(hex));
    ok(d <= 6, `luma ${cat}/${naam} (${rol}) verschuift ${d.toFixed(1)} bij ${m}`);
  }
}
// wegen en stoepen: het contrast tussen asfalt en stoep blijft binnen 8% van het oude, bij elke menging
for (const m of [0.3, 0.5, 1]) {
  const oud = Math.abs(L(0x7b776d) - L(0x57595c)), nieuw = Math.abs(L(dsWereld(0x7b776d, 'steen', m)) - L(dsWereld(0x57595c, 'weg', m)));
  ok(Math.abs(nieuw - oud) / oud < 0.08, 'contrast stoep tegen asfalt blijft @' + m + ' (' + oud.toFixed(1) + ' naar ' + nieuw.toFixed(1) + ')');
  const oud2 = Math.abs(L(0x57595c) - L(0x4f7234)), nieuw2 = Math.abs(L(dsWereld(0x57595c, 'weg', m)) - L(dsWereld(0x4f7234, 'groen', m)));
  ok(Math.abs(nieuw2 - oud2) <= 6, 'contrast weg tegen gras blijft @' + m);
}
// de richting: gras gaat naar bordgroen (minder geel), gevels worden minder verzadigd en warmer, water krijgt minder groen, zwart wordt inkt
{
  const g0 = rgb(0x4f7234), g1 = rgb(dsWereld(0x4f7234, 'groen', 1));
  ok(g1[2] / g1[1] > g0[2] / g0[1], 'gras: blauwer dan geel naar bordgroen');
  ok(sat(dsWereld(0x8f4634, 'auto', 0.5)) < sat(0x8f4634), 'baksteen wordt minder verzadigd');
  ok(sat(dsWereld(0xd6cab0, 'auto', 1)) <= sat(0xd6cab0) + 0.001, 'crème wordt niet fleuriger');
  const z = rgb(dsWereld(0x232323, 'auto', 1));
  ok(z[0] > z[2], 'bijna zwart wordt warme inkt (rood boven blauw)');
  const w = rgb(dsWereld(0x0b2420, 'water', 1));
  ok(w[2] > rgb(0x0b2420)[2], 'water krijgt blauw');
  { const p = rgb(dsWereld(0xffffff, 'papier', 1)); ok(p[0] >= p[1] && p[1] >= p[2] && p[2] < 255 && p[2] > rgb(WERELD_INKTEN.papier)[2], 'wit wordt bij meng 1 een crèmetint'); }
}
// geen wintertint: geen enkele plaatuitkomst is blauwer dan rood+40 bij een warme bron, en geen uitkomst is bijna wit uit een donkere bron
for (const { naam, hex } of alle) {
  const r = rgb(hex), o = rgb(dsWereld(hex, 'auto', 1));
  if (r[0] >= r[2] && !['groen', 'loof', 'blauw', 'water'].includes(wereldRol(hex))) ok(o[2] - o[0] <= 40, 'geen koude tint op ' + naam);
  ok(L(dsWereld(hex, 'auto', 1)) < L(hex) + 70, 'geen opgehelderde ' + naam);
}
// herkenbare plekken: de belangrijkste gevelkleuren blijven dichtbij (Martinitoren-baksteen, Euroborg-glas) bij de standaardmenging
for (const hex of [0x8f4634, 0xa9623f, 0xd6cab0, 0x464b52, 0x51666f]) {
  const a = rgb(hex), b = rgb(dsWereld(hex)), d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  ok(d < 28, 'herkenbaar: ' + hex.toString(16) + ' verschuift ' + d.toFixed(1) + ' bij de standaardmenging');
}
// geen echte rol verdwijnt: elke rol wijst naar een bestaande inkt
for (const [r, s] of Object.entries(WERELD_ROLLEN)) ok(WERELD_INKTEN[s.doel] !== undefined && s.w > 0 && s.w <= 1, 'rol ' + r);
// niet-getallen blijven zoals ze zijn (THREE.Color, strings)
ok(dsWereld('rood') === 'rood' && dsWereld(null) === null, 'niet-getal blijft');
// de kaartpaletten (css)
ok(dsWereldCss('#2d6a86', 'water', 0) === '#2d6a86', 'css meng 0');
ok(/^#[0-9a-f]{6}$/.test(dsWereldCss('#2d6a86', 'water', 0.3)), 'css hex');
ok(/^rgba\(\d+, \d+, \d+, 0\.62\)$/.test(dsWereldCss('rgba(160, 156, 146, 0.62)', 'bouw', 0.3)), 'css rgba houdt de alfa');
// de menging is te zetten en wordt begrensd
setWereldMeng(5); ok(wereldMeng() === 1, 'meng begrensd op 1');
setWereldMeng(-2); ok(wereldMeng() === 0 && dsWereld(0x8f4634) === 0x8f4634, 'meng 0 = oud');
setWereldMeng(null);
// één JS-bron: de kaartpaletten van mapstyle.js volgen de wereld (de THREE-vrije route)
const ms = await import('../game/js/mapstyle.js');
ok(/^#[0-9a-f]{6}$/.test(ms.MINI_PALETTE.park) && ms.MINI_PALETTE.buildings.length === 5, 'mapstyle laadt met de wereldkleuren');
ok(ms.MINI_PALETTE.park !== '#5a8445', 'minikaartpark volgt de wereld (standaardmenging)');
console.log(`worldpalette_test: ${n - fail}/${n} ok`);
process.exit(fail ? 1 : 0);
