// Meldingen in het menu (#435): een melding terwijl het pauzemenu of de kaart open staat is direct te zien (niet pas na Escape).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { voegToe, verloop, menuMelding } from '../game/js/menumelding.js';

let n = 0;
const t = (name, f) => { f(); n++; };
t('toevoegen, dezelfde tekst ververst, maximaal drie', () => {
  let l = voegToe([], 'Niet tijdens een missie.', 10);
  assert.equal(l.length, 1);
  l = voegToe(l, 'Niet tijdens een missie.', 12);
  assert.equal(l.length, 1); assert.ok(l[0].tot > 12);
  l = voegToe(voegToe(voegToe(l, 'a', 12), 'b', 12), 'c', 12);
  assert.deepEqual(l.map((m) => m.tekst), ['a', 'b', 'c']);
  assert.deepEqual(voegToe([], '  ', 1), []);
});
t('verlopen', () => {
  const l = voegToe(voegToe([], 'a', 0), 'b', 100);
  assert.deepEqual(verloop(l, 50).map((m) => m.tekst), ['b']);
});
t('zonder open menu (of zonder DOM) neemt het niets over', () => assert.equal(menuMelding('x'), false));
t('hudcards stuurt meldingen bij een open menu hierheen, countdowns niet', () => {
  const s = fs.readFileSync(new URL('../game/js/hudcards.js', import.meta.url), 'utf8');
  assert.match(s, /!opts\.exact && menuMelding\(text\)/);
});
console.log(`menumelding_test: ${n}/${n} ok`);
