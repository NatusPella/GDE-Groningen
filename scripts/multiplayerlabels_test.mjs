// Samen spelen (#872): de labels boven spelers en ping-bakens passen op hun vaste kaart.
// De meetfunctie is hier een nep-canvas: breedte = tekens × px × factor, met dezelfde
// factoren als de QA-meting (38px: een naam van 16 tekens · "Kom hier" = 424 px; 34px:
// 16 tekens = 234 px). De namen zijn verzonnen: een echte persoonsnaam als testfixture
// schendt constitutie 4 (text_audit.mjs voert die namen als verboden).
//   node scripts/multiplayerlabels_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pasLabel } from '../game/js/multiplayerlabels.js';

let n = 0;
const t = (naam, f) => { f(); n++; };
const meetPing = (tekst, px) => tekst.length * px * 0.413;
const meetFiguur = (tekst, px) => tekst.length * px * 0.43;
const past = (uit, meet, max) => meet(uit.tekst, uit.px) <= max;

t('een korte naam blijft op het basislettertype staan', () => {
  const uit = pasLabel('Tessa', { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur });
  assert.equal(uit.tekst, 'Tessa'); assert.equal(uit.px, 34);
  const ping = pasLabel('Tessa · Kom hier', { maxBreedte: 372, px: 38, minPx: 22, meet: meetPing });
  assert.equal(ping.tekst, 'Tessa · Kom hier'); assert.equal(ping.px, 38);
});

t('een lange pingnaam krimpt tot hij binnen 372 px past, zonder de tekst af te kappen', () => {
  const tekst = 'Klaas-Jan de Vries · Kom hier'; // 27 tekens, 424 px op 38 px
  assert.ok(meetPing(tekst, 38) > 372, 'de QA-meting valt buiten het vlak');
  const uit = pasLabel(tekst, { maxBreedte: 372, px: 38, minPx: 22, meet: meetPing });
  assert.equal(uit.tekst, tekst, 'de hele naam blijft staan');
  assert.ok(uit.px < 38); assert.ok(uit.px >= 22);
  assert.ok(past(uit, meetPing, 372));
});

t('een naam van 24 tekens met een roep past ook op de pingkaart', () => {
  const tekst = 'Tamboerijn Timo de Derde · Kom hier';
  const uit = pasLabel(tekst, { maxBreedte: 372, px: 38, minPx: 22, meet: meetPing });
  assert.ok(past(uit, meetPing, 372));
  assert.equal(uit.tekst, tekst);
});

t('een naam van 16 tekens past op het spelerslabel; 24 tekens krimpt of kort in', () => {
  const zestien = 'Klaas-Jan de Vri'; // 16 tekens = 234 px op 34 px: past net
  const a = pasLabel(zestien, { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur });
  assert.equal(a.tekst, zestien); assert.equal(a.px, 34, '16 tekens past nog net op het tekstvlak van 240 px');
  const vierentwintig = 'Klaas-Jan de Vries senior';
  const b = pasLabel(vierentwintig, { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur });
  assert.ok(past(b, meetFiguur, 236));
  assert.ok(b.px < 34);
});

t('wat zelfs op het kleinste lettertype niet past, kort in met een ellipsis', () => {
  const lang = 'Een naam die veel te lang is voor welk label dan ook';
  const uit = pasLabel(lang, { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur });
  assert.ok(uit.tekst.endsWith('…')); assert.ok(uit.tekst.length < lang.length);
  assert.ok(past(uit, meetFiguur, 236));
});

t('leeg, onzin en een ontbrekende meetfunctie vallen veilig terug', () => {
  assert.equal(pasLabel('', { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur }).tekst, '?');
  assert.equal(pasLabel(null, { maxBreedte: 236, px: 34, minPx: 18, meet: meetFiguur }).tekst, '?');
  assert.deepEqual(pasLabel('Tessa', { maxBreedte: 236, px: 34 }), { tekst: 'Tessa', px: 34 }, 'zonder meting niets veranderen');
});

t('de 3D-labels gebruiken de meting met het juiste vlak', () => {
  const figuur = fs.readFileSync(new URL('../game/js/avatarlabel3d.js', import.meta.url), 'utf8'); // het label van coopfigures3d.js en scene3d.js (24-11)
  assert.match(figuur, /import \{ pasLabel \} from '\.\/multiplayerlabels\.js';/);
  assert.match(figuur, /LABEL_VLAK = 236/);
  assert.match(figuur, /pasLabel(glyph + spec.tekst, { maxBreedte: LABEL_VLAK/);
  assert.doesNotMatch(figuur, /fillText\(spec\.tekst/, 'geen ongemeten tekst meer op de kaart');
  const ping = fs.readFileSync(new URL('../game/js/cooppings3d.js', import.meta.url), 'utf8');
  assert.match(ping, /import \{ pasLabel \} from '\.\/multiplayerlabels\.js';/);
  assert.match(ping, /LABEL_VLAK = 372/);
  assert.match(ping, /pasLabel\(tekst, \{ maxBreedte: LABEL_VLAK/);
  assert.doesNotMatch(ping, /g\.fillText\(tekst, 192, 38\)/, 'geen vaste tekst meer op de kaart');
});

console.log(`multiplayerlabels_test: ${n}/${n} ok`);
