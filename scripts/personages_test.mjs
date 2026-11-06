// Verhaal > Personages en Verhaal > Veroverd (#608): geen muur van vraagtekens meer,
// een getal met woorden, en statuskleuren uit de kleurenblind-tokens in plaats van eigen
// rood en amber. De twee regels zelf (wie je kent, de onbekenden-regel, de kop) zijn
// puur en staan in characters.js en gebiedenui.js; de rest is een broncheck.
//   node scripts/personages_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const C = await import('../game/js/characters.js');

let n = 0;
const t = (naam, fn) => { n++; try { fn(); } catch (e) { console.log('FAIL', naam, '\n  ', String(e.message || e).split('\n').slice(0, 4).join('\n  ')); process.exitCode = 1; } };
const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');

t('de onbekenden-regel telt en zegt het met een woord', () => {
  assert.equal(C.unknownLine(24), 'Nog 24 mensen die je kunt tegenkomen');
  assert.equal(C.unknownLine(1), 'Nog 1 persoon die je kunt tegenkomen');
  assert.equal(C.unknownLine(0), '');
  assert.equal(C.unknownLine(null), '');
  assert.equal(C.unknownLine(-3), '');
});

t('knownCharacters geeft alleen wie je ontmoette; de twee van het duo altijd', () => {
  const known = C.knownCharacters();
  assert.ok(known.some((c) => c.id === 'tammo') && known.some((c) => c.id === 'anita'), 'het duo staat er altijd bij');
  assert.ok(known.every((c) => C.hasMet(c.id)), 'elke tegel is iemand die je kent');
  assert.ok(known.length <= C.CHARACTERS.length, 'nooit meer tegels dan personages');
  assert.equal(C.metCount(), known.length, 'de teller en het grid lopen gelijk');
});

// De opbouw van Personages: alleen bekende personages in het grid, de rest één regel.
t('Personages tekent het grid alleen met bekende personages en één regel eronder', () => {
  const vu = lees('verhaalui.js');
  const people = vu.slice(vu.indexOf('function peopleHtml()'), vu.indexOf('// The plakjesbord'));
  assert.match(people, /knownCharacters\(\)\.map\(charCard\)/, 'het grid komt uit knownCharacters()');
  assert.match(people, /unknownLine\(unknown\)/, 'de onbekenden staan als één regel');
  assert.match(people, /vh-unknown/, 'die regel heeft een eigen, rustige opmaak');
  assert.ok(!/\?\?\?/.test(people), 'geen vraagtekentegel meer in het grid');
  const card = vu.slice(vu.indexOf('function charCard('), vu.indexOf('function missionChips('));
  assert.ok(!/Nog niet ontmoet|\?\?\?/.test(card), 'een tegel toont geen "onbekend"-tekst meer');
});

t('de statuskleuren van Verhaal komen uit de tokens, niet uit eigen hexen', () => {
  const vu = lees('verhaalui.js');
  assert.match(vu, /var\(--mk-danger, #d93f3f\)/, 'verloren is de gevarentoken');
  assert.match(vu, /var\(--mk-mission, #e8c93a\)/, 'geblokkeerd is de missietoken');
  assert.match(vu, /var\(--g\)/);
  assert.ok(!/#e0604a|#e8b84a|#6f7f73/i.test(vu), 'geen tweede rood, amber of vast grijs meer');
  // Wat overblijft zijn de chroomkleuren van de achtergrondbasis (DESIGN_SYSTEM.md) en de
  // terugvalwaarden binnen var(--mk-*); die tellen niet als losse hex.
  const zonderTokens = vu.replace(/var\(--[a-z-]+,\s*#[0-9a-fA-F]{3,6}\)/g, 'var()');
  const hexen = new Set([...zonderTokens.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0].toLowerCase()));
  assert.deepEqual([...hexen].sort(), ['#0c140e', '#17301f'], 'alleen de achtergrondbasis blijft over');
});

t('Veroverd begint met een kop waarin het getal een woord heeft', () => {
  const gb = lees('gebiedenui.js');
  assert.match(gb, /export function veroverdKop\(sam\)/, 'de kop is een eigen, pure functie');
  assert.match(gb, /Gebieden:/, 'de kop noemt wat het getal is');
  assert.match(gb, /veroverd/, 'en zegt veroverd');
  assert.match(gb, /totaal: veroverdKop\(sam\)/, 'het overzicht gebruikt die kop');
  assert.match(lees('veroverdpanel.js'), /\$\{g\.totaal\}/, 'het Veroverd-paneel tekent de kop');
});

if (process.exitCode) console.log(`personages_test: ${n} tests, mislukt`);
else console.log(`personages_test: ${n}/${n} ok`);
