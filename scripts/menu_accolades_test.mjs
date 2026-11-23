// #1257, #1259: no raw {TOKEN} in the pause-menu text; Overzicht starts at step 1, never "Stap 0 van n".
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { braceKeysHtml } from '../game/js/keycap.js';
let n = 0;
const t = (name, fn) => { n++; fn(); };
t('braceKeysHtml: toetsen als glyph, geen accolades, [E] en (E) blijven tekst', () => {
  for (const s of ['Aan of uit met {N}. {SHIFT}+{N} is de volgende zender', '{J}', '{ESC}, {ENTER}, {ARROWS} en de functietoetsen', '{F} filter · {T} weer', '{SHIFT}+{LMB} op de kaart']) {
    const h = braceKeysHtml(s);
    assert.ok(!/\{[A-Z0-9]+\}/.test(h), 'accolades over in: ' + h);
    assert.notEqual(h, s);
  }
  assert.equal(braceKeysHtml('geen toets (E) of [Q] hier'), 'geen toets (E) of [Q] hier');
  assert.equal(braceKeysHtml(null), '');
});
t('de rijbouwers van het menu en de fototips sturen tekst door braceKeysHtml', () => {
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.match(pm, /const rowName = \(label, note\) => `<span class="nm">\$\{braceKeysHtml\(label\)\}/);
  assert.match(pm, /<b>\$\{braceKeysHtml\(title\)\}<\/b><span class="mut">\$\{braceKeysHtml\(hint\)\}/);
  assert.match(pm, /<p>\$\{braceKeysHtml\(note\)\}<\/p>/);
  const fm = fs.readFileSync(new URL('../game/js/fotomodusui.js', import.meta.url), 'utf8');
  assert.match(fm, /const FOTO_TIPS = braceKeysHtml\(/);
});
t('Overzicht: geen "Stap 0 van n" en geen tegel "0/0 Missies klaar"', () => {
  const td = fs.readFileSync(new URL('../game/js/todoui.js', import.meta.url), 'utf8');
  assert.match(td, /const stapNu = Math\.min\(done \+ 1, steps\.length\)/);
  assert.match(td, /\(ms\.length \? \(mDone \? tile\(ICON\.flag, 'Missies klaar'/);
  // #1259 (hertest 24-11): ook geen "0/31" of "0/38": zonder iets af zegt de tegel hoeveel er te doen of te vinden is
  assert.match(td, /tile\(ICON\.flag, 'Missies te doen', String\(ms\.length\)/);
  assert.match(td, /\(found \? tile\(ICON\.pin, 'Gevonden'/);
  assert.match(td, /tile\(ICON\.pin, 'Te vinden', String\(all\)/);
});
t('#1263: de brede kopkaarten (Prestaties, Fotos, Voetbal) staan recht en schuiven niet over tabs of titel', () => {
  for (const [f, k] of [['achievementsui.js', 'pa-hero'], ['fotomodusui.js', 'foto-hero'], ['voetbalcarriereui.js', 'ds-z-kaart--recht ds-m-binnen']]) {
    const src = fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
    assert.ok(src.includes('ds-z-kaart ds-z-kaart--recht ' + k) || src.includes('ds-z-kaart--recht ds-m-binnen'), f + ' mist ds-z-kaart--recht');
  }
});
t('#1276: de omschrijving past bij de schakelaar of waarde (bloed: beide standen, kaartrichting: standaard in de lucht)', () => {
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  assert.match(pm, /toggle\('gore', 'Bloed en ledematen', 'Aan: [^']*Uit: /);
  assert.ok(!/Standaard draait de kaart mee/.test(pm));
  assert.match(pm, /Op de grond draait de kaart mee/);
});
t('#1277: Binnenkort in de zenderlijst is een chip, geen waarde in kopformaat', async () => {
  const { channelPickerHtml } = await import('../game/js/radiokeuze.js');
  const h = channelPickerHtml([{ id: 'a', name: 'A', sub: 's', dj: 'd', tracks: 9, status: 'open', active: true }, { id: 'b', name: 'B', sub: 's', dj: 'd', tracks: 0, status: 'soon', active: false }]);
  assert.match(h, /<span class="ds-z-chip">Binnenkort<\/span>/);
  assert.ok(!/ds-z-rij__waarde">Binnenkort/.test(h));
});
t('#1277: Geluid uit is één schakelaar met de toets in de uitleg, en het ondertitelvoorbeeld staat op een echt spelplaatje', () => {
  const pm = fs.readFileSync(new URL('../game/js/pausemenu.js', import.meta.url), 'utf8');
  const rij = pm.split('\n').find((r) => r.includes('data-mute-switch>'));
  assert.ok(rij && rij.includes('ook met {U}') && !/m-kc|pm-mutehint|icon\('mute'\)/.test(rij), 'geen luidspreker en losse toetsletter naast de schakelaar');
  const img = pm.match(/class="pm-subprev-img" src="(img\/laad\/[a-z]+\.jpg)"/);
  assert.ok(img && fs.existsSync(new URL(`../game/${img[1]}`, import.meta.url)), 'het voorbeeldplaatje bestaat');
});
t('#1275: de uitleg bij Moeilijkheid staat op dezelfde linkerrand als de rijen', () => {
  const css = fs.readFileSync(new URL('../game/js/pausemenu.css', import.meta.url), 'utf8');
  assert.match(css, /.pm-diff-intro, #pause-menu .pm-diff-note {[^}]*margin: 0 24px/);
});
t('#1265: Verhaal > Opdrachten kiest zonder open missie het verhaalitem, geen minigame; Activiteiten zonder debugvouw en met een werkwoord', () => {
  const td = fs.readFileSync(new URL('../game/js/todoui.js', import.meta.url), 'utf8');
  assert.match(td, /items.find(verhaal) || items.find((it) => !isActiviteit(it))/);
  assert.ok(!/Alle cijfers/.test(td) && !/\)\}Kaart<\/button>/.test(td));
});
t('#1270: elk watertype heeft een eigen pictogram in het Visboek en "Per water" is een gestijlde groepskop', async () => {
  const { WATERTYPEN } = await import('../game/js/visdata.js');
  const src = fs.readFileSync(new URL('../game/js/visboekui.js', import.meta.url), 'utf8');
  const blok = src.slice(src.indexOf('const WATER_ICOON'), src.indexOf('const icoon ='));
  for (const w of WATERTYPEN) assert.ok(new RegExp('\\b' + w.id + ': ').test(blok), 'geen icoon voor ' + w.id);
  const paden = [...blok.matchAll(/: '(<path[^']*)'/g)].map((m) => m[1]);
  assert.equal(new Set(paden).size, paden.length, 'twee watertypen delen een icoon');
  // hertest 24-11: lb-groep hoort bij de CSS van Loopbanen (die het Visboek niet laadt): de groepskop van het menu (m-gh) is overal gestijld
  assert.ok(src.includes('<div class="m-gh vb-groep"><span>Per water</span>'));
  // en het detail is geen blok lopende tekst meer: drie getallen en korte regels
  assert.ok(/class="vb-feiten"/.test(src) && !/Hoe meer soorten en wateren, hoe meer elke vis opbrengt/.test(src) && !/Meer hengels, aas en een sterkere lijn/.test(src));
});
console.log(`menu_accolades_test: ${n}/${n} ok`);
