// #1012: een lange nieuwsmelding wordt op de kaart ingekort (met beletselteken) en breekt netjes af,
// maar de telefoon bewaart de volle tekst.   node scripts/nieuwskaart_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { phoneCard, splitNewsCard, newsFullText, wordCount, WORD_BUDGET } from '../game/js/hudtext.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; };

const LANG = 'KIEKDOAR MELDT: Kiezelweek! Groepjes scholieren steken vanmiddag massaal over bij de Eendenbrug, zwaaien naar het verkeer en eten broodjes aan de kade. Rustig rijden, wachten loont, en neem de tijd.';

t('het voorvoegsel verdwijnt, de rest blijft volledig', () => {
  const vol = newsFullText(LANG);
  assert.ok(vol.startsWith('Kiezelweek!'));
  assert.ok(vol.endsWith('neem de tijd.'));
  assert.equal(newsFullText('  kiekdoar: kort bericht '), 'kort bericht');
  assert.equal(newsFullText(undefined), '');
});

t('de kaart kort in met een beletselteken en blijft binnen het budget', () => {
  const c = splitNewsCard(newsFullText(LANG));
  const k = phoneCard(c.title, c.body);
  assert.ok(k.over, 'dit bericht is langer dan het kaartbudget');
  assert.ok(k.body.endsWith('…'), 'de ingekorte body eindigt op een beletselteken');
  assert.ok(wordCount(k.title) + wordCount(k.body.replace('…', '')) <= WORD_BUDGET.phone);
  assert.ok(!k.body.includes('neem de tijd'), 'de kaart toont niet alles');
});

t('een lange kop zonder leesteken wordt op acht woorden ingekort', () => {
  const k = phoneCard('Groepjes scholieren steken vanmiddag massaal over bij de Eendenbrug en zwaaien allemaal', '');
  assert.ok(k.title.endsWith('…'));
  assert.ok(wordCount(k.title.replace('…', '')) <= 8);
});

t('de geschiedenis (telefoon) bewaart de volle tekst, niet de ingekorte kaart', () => {
  const pf = lees('phonefeed.js');
  assert.ok(/volledig: newsFullText\(n\.text\)/.test(pf), 'parse geeft de volle tekst mee');
  assert.ok(/p\.from === 'Kiekdoar' \? p\.volledig/.test(pf), 'remember krijgt p.volledig voor Kiekdoar');
});

t('de kaart breekt lange woorden en koppen af in plaats van te rekken', () => {
  const css = lees('phonefeed.css');
  assert.ok(/\.pf-title \{[^}]*overflow-wrap: anywhere[^}]*line-clamp: 6/.test(css));
  assert.ok(/\.pf-body \{[^}]*overflow-wrap: anywhere/.test(css));
});

console.log(`nieuwskaart_test: ${n} groepen ok`);
