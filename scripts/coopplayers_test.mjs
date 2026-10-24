// Samen spelen (#95): N spelers, roster, figuren en pauzebeleid (game/js/coopplayers.js).
import assert from 'node:assert/strict';
import * as P from '../game/js/coopplayers.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('minimaal 4, standaard 8, instelbaar tot 16', () => {
  assert.equal(P.createRoster().max, 8);
  assert.equal(P.createRoster(2).max, 4, 'nooit onder de 4');
  assert.equal(P.createRoster(99).max, 16);
  assert.equal(P.createRoster('x').max, 8);
});
t('de host is Tammo op plek 0, de eerste gast Tessa op plek 1, daarna figuren', () => {
  const r = P.createRoster(4); assert.equal(P.lijst(r)[0].naam, 'Tammo');
  assert.deepEqual(P.wijsPlekToe(r), { slot: 1, char: 'anita' });
  assert.deepEqual(P.wijsPlekToe(r, 'bram'), { slot: 2, char: 'bram' });
  assert.deepEqual(P.wijsPlekToe(r), { slot: 3, char: 'rik' });
  assert.equal(P.wijsPlekToe(r), null, 'vol bij 4');
  assert.deepEqual(P.lijst(r).map((x) => x.naam), ['Tammo', 'Tessa', 'Bram', 'Rik']);
});
t('de gewenste figuur als die vrij is, anders de eerste vrije; nooit Tammo of Tessa als extra speler', () => {
  const r = P.createRoster(6); P.wijsPlekToe(r);
  assert.equal(P.wijsPlekToe(r, 'tammo').char, 'rik');
  assert.equal(P.wijsPlekToe(r, 'rik').char, 'sanne', 'rik is al genomen');
  assert.equal(P.wijsPlekToe(r, 'lotte').char, 'lotte');
});
t('tot 8 spelers met allemaal een eigen figuur, kleur en naam', () => {
  const r = P.createRoster(8); for (let i = 0; i < 7; i++) assert.ok(P.wijsPlekToe(r));
  const l = P.lijst(r);
  assert.equal(l.length, 8);
  assert.equal(new Set(l.map((x) => x.char)).size, 8); assert.equal(new Set(l.map((x) => x.kleur)).size, 8);
  assert.equal(new Set(l.map((x) => x.vorm)).size, 8, 'kleur is niet het enige onderscheid');
  assert.equal(P.wijsPlekToe(r), null);
});
t('weggaan geeft de plek vrij; Tessa komt terug als Tessa; de host kan niet weg', () => {
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r, 'bram'); P.wijsPlekToe(r, 'rik');
  assert.equal(P.verwijder(r, 1), true);
  assert.deepEqual(P.wijsPlekToe(r, 'sanne'), { slot: 1, char: 'anita' }, 'plek 1 is altijd Tessa');
  assert.equal(P.verwijder(r, 0), false); assert.equal(P.verwijder(r, 7), false);
  P.verwijder(r, 2); assert.deepEqual(P.wijsPlekToe(r, 'bram'), { slot: 2, char: 'bram' });
});
t('het maximum kan omhoog en niet onder het aantal aanwezigen', () => {
  const r = P.createRoster(); for (let i = 0; i < 3; i++) P.wijsPlekToe(r);
  assert.equal(P.zetMax(r, 8), 8); assert.equal(P.wijsPlekToe(r) !== null, true);
  assert.equal(P.zetMax(r, 4), 5, 'er zijn er al 5');
});
t('hoofdrol alleen voor Tammo en Tessa; extra spelers lopen in de open wereld', () => {
  assert.deepEqual([0, 1, 2, 5].map(P.verhaalRol), ['host-hoofdrol', 'gast-hoofdrol', 'wereld', 'wereld']);
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r);
  assert.deepEqual(P.lijst(r).map((x) => x.hoofdrol), [true, true, false]);
});
t('pauze per speler (#452): niemand houdt de rest op, tenzij de opdracht hem nodig heeft', () => {
  assert.equal(P.holdBeleid(1).pauze, false); assert.match(P.holdBeleid(1).reden, /gaat door/);
  assert.equal(P.holdBeleid(1, { vereist: [1] }).pauze, true);
  assert.equal(P.holdBeleid(0).pauze, false);
  assert.deepEqual(P.vereistVoor(false, { presence: 'beide' }), [], 'zonder lopende opdracht is niemand nodig');
  assert.deepEqual(P.vereistVoor(true, { presence: 'beide' }), [1]);
  assert.deepEqual(P.vereistVoor(true, { needsTwo: true }, [3]).sort(), [1, 3]);
  assert.deepEqual(P.vereistVoor(true, { presence: 'host' }), []);
  assert.equal(P.holdBeleid(2).pauze, false); assert.match(P.holdBeleid(2).reden, /gaat door/);
  assert.equal(P.holdBeleid(3, { vereist: [3] }).pauze, true);
  assert.equal(P.holdBeleid(3, { vereist: [2] }).pauze, false);
});
t('lijstbericht: rondreis en controle van wat van de host komt', () => {
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r, 'daan'); P.zetVerbinding(r, 1, 'lag');
  const ev = P.lijstEvent(r);
  const back = P.leesLijstEvent(JSON.parse(JSON.stringify(ev)));
  assert.equal(back.spelers.length, 3); assert.equal(back.spelers[1].verbinding, 'lag'); assert.equal(back.max, 4);
  assert.equal(P.leesLijstEvent({ k: 'spelers', lijst: [{ slot: 1, char: 'bestaat-niet' }] }), null);
  assert.equal(P.leesLijstEvent({ k: 'spelers', lijst: [{ slot: 1, char: 'rik' }, { slot: 1, char: 'bram' }] }), null, 'dubbele plek');
  assert.equal(P.leesLijstEvent({ k: 'spelers', lijst: new Array(20).fill({ slot: 1, char: 'rik' }) }), null);
  assert.equal(P.leesLijstEvent({ k: 'iets' }), null);
});
t('geen echte namen: alle figuren zijn verzonnen en Nederlands', () => {
  for (const c of P.EXTRA_CHARS) assert.ok(c.naam.length >= 3 && c.kleding);
});
t('tot 16 spelers, elk met eigen figuur, kleur, vorm, naam en uiterlijk; niet hard begrensd op 8', () => {
  const r = P.createRoster(16); for (let i = 0; i < 15; i++) assert.ok(P.wijsPlekToe(r), `speler ${i + 2}`);
  assert.equal(P.wijsPlekToe(r), null);
  const l = P.lijst(r);
  assert.equal(l.length, 16);
  for (const k of ['char', 'kleur', 'vorm', 'naam']) assert.equal(new Set(l.map((x) => x[k])).size, 16, k);
  assert.equal(new Set(P.EXTRA_CHARS.map((c) => c.seed)).size, P.EXTRA_CHARS.length, 'elke figuur een eigen seed');
});
t('uiterlijk voor het model: Tammo en Tessa houden hun eigen model, extra spelers een vaste seed en kleur', () => {
  assert.deepEqual(P.figuurLook('tammo').opts, { character: 'tammo' }); assert.deepEqual(P.figuurLook('anita').opts, { character: 'anita' });
  const rik = P.figuurLook('rik');
  assert.equal(rik.shirt, 0xf2b134); assert.deepEqual(rik.opts, { seed: 101, variant: 'male' }); assert.equal(rik.karakter, null);
  assert.deepEqual(P.figuurLook('rik'), P.figuurLook('rik'), 'iedereen ziet dezelfde figuur');
  assert.equal(P.figuurLook('bestaat-niet'), null);
});
t('advies in het Nederlands vanaf 5 spelers, extra tekst voor de host over uploaden', () => {
  assert.equal(P.advies(4), '');
  assert.match(P.advies(5, 'gast'), /^Met 5 spelers kan het spel trager worden/); assert.doesNotMatch(P.advies(5, 'gast'), /uploaden/);
  assert.match(P.advies(12, 'host'), /uploaden/);
});
console.log(`coopplayers_test: ${n}/${n} ok`);
