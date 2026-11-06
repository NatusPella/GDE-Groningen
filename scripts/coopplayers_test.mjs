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
t('de host is Tammo op plek 0, elke gast (ook plek 1) een eigen figuur', () => {
  const r = P.createRoster(4); assert.equal(P.lijst(r)[0].naam, 'Tammo');
  // (#516) plek 1 is geen vaste Tessa meer: de eerste gast krijgt de eerste eigen figuur.
  assert.deepEqual(P.wijsPlekToe(r), { slot: 1, char: 'rik' });
  assert.deepEqual(P.wijsPlekToe(r, 'bram'), { slot: 2, char: 'bram' });
  assert.deepEqual(P.wijsPlekToe(r), { slot: 3, char: 'sanne' });
  assert.equal(P.wijsPlekToe(r), null, 'vol bij 4');
  assert.deepEqual(P.lijst(r).map((x) => x.naam), ['Tammo', 'Rik', 'Bram', 'Sanne']);
});
t('de gewenste figuur als die vrij is, anders de eerste vrije; nooit Tammo of Tessa als extra speler', () => {
  const r = P.createRoster(6); P.wijsPlekToe(r); // (#516) plek 1 krijgt rik
  assert.equal(P.wijsPlekToe(r, 'tammo').char, 'sanne', 'tammo is geen figuur: de eerste vrije na rik');
  assert.equal(P.wijsPlekToe(r, 'rik').char, 'bram', 'rik is al genomen');
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
t('weggaan geeft de plek vrij; dezelfde eigen figuur komt terug; de host kan niet weg', () => {
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r, 'bram'); P.wijsPlekToe(r, 'rik');
  assert.equal(P.verwijder(r, 1), true);
  // (#516) plek 1 is geen vaste Tessa meer: wie wegging, krijgt zijn eigen figuur terug als die vrij is.
  assert.deepEqual(P.wijsPlekToe(r, 'sanne'), { slot: 1, char: 'rik' }, 'rik is vrijgekomen, sanne zit al op plek 3');
  assert.equal(P.verwijder(r, 0), false); assert.equal(P.verwijder(r, 7), false);
  P.verwijder(r, 2); assert.deepEqual(P.wijsPlekToe(r, 'bram'), { slot: 2, char: 'bram' });
});
t('het maximum kan omhoog en niet onder het aantal aanwezigen', () => {
  const r = P.createRoster(); for (let i = 0; i < 3; i++) P.wijsPlekToe(r);
  assert.equal(P.zetMax(r, 8), 8); assert.equal(P.wijsPlekToe(r) !== null, true);
  assert.equal(P.zetMax(r, 4), 5, 'er zijn er al 5');
});
t('rollen horen bij de speler, niet bij de plek: geen vaste hoofdrol voor plek 0 of 1', () => {
  assert.deepEqual([0, 1, 2, 5].map(P.verhaalRol), ['hoofdrol', 'hoofdrol', 'hoofdrol', 'hoofdrol']);
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r);
  assert.deepEqual(P.lijst(r).map((x) => x.hoofdrol), [false, false, false]);
});
t('online-avatar per speler: eigen figuur, naam en kleur; het netfilter laat ze heel door', () => {
  const r = P.createRoster(4); P.wijsPlekToe(r); P.wijsPlekToe(r);
  assert.deepEqual(P.zetAvatar(r, 0, { char: 'bram', naam: 'Bouwer', kleur: '#123456' }), { char: 'bram', naam: 'Bouwer', kleur: '#123456' });
  assert.equal(P.lijst(r)[0].naam, 'Bouwer'); assert.equal(P.lijst(r)[0].char, 'bram'); assert.equal(P.lijst(r)[0].kleur, '#123456');
  assert.equal(P.zetAvatar(r, 2, { char: 'tammo' }).char, undefined, 'de avatar is nooit een verhaalrol');
  const back = P.leesLijstEvent(JSON.parse(JSON.stringify(P.lijstEvent(r))));
  assert.equal(back.spelers[0].avatar.naam, 'Bouwer'); assert.equal(back.spelers[0].avatar.kleur, '#123456');
  assert.equal(P.leesLijstEvent({ k: 'spelers', lijst: [{ slot: 0, char: 'rik', avatar: 'fout' }] }), null);
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
t('welkomstbericht (#592): de gast controleert de lijst net als het spelers-bericht', () => {
  const r = P.createRoster(4); P.wijsPlekToe(r);
  const welkom = { max: 4, lijst: P.lijstEvent(r).lijst };
  const schoon = P.leesWelkomstLijst(welkom);
  assert.deepEqual(schoon.map((x) => x.slot), [0, 1], 'de lijst komt door');
  assert.equal(P.leesWelkomstLijst(null), null);
  assert.equal(P.leesWelkomstLijst({ max: 4 }), null, 'zonder lijst niets');
  assert.equal(P.leesWelkomstLijst({ max: 4, lijst: [{ slot: 0, char: 'bestaat-niet' }] }), null, 'onbekend personage: het hele bericht is ongeldig');
  const dubbel = { max: 4, lijst: [{ slot: 0, char: 'tammo' }, { slot: 0, char: 'rik' }] };
  assert.equal(P.leesWelkomstLijst(dubbel), null, 'dubbele plek: ongeldig');
  // een (aangepaste) host kan een kleur meesturen die niet in een style-attribuut hoort
  const vals = JSON.parse(JSON.stringify(welkom));
  vals.lijst[0].avatar = { naam: 'Host', kleur: 'red;background-image:url(https://fout)' };
  const veilig = P.leesWelkomstLijst(vals);
  assert.equal(veilig[0].avatar.naam, 'Host', 'de naam blijft');
  assert.equal(veilig[0].avatar.kleur, undefined, 'de ongeldige kleur valt weg');
  const goed = JSON.parse(JSON.stringify(welkom));
  goed.lijst[0].avatar = { naam: 'Host', kleur: '#e86a6a' };
  assert.equal(P.leesWelkomstLijst(goed)[0].avatar.kleur, '#e86a6a', 'een geldige kleur blijft');
});
console.log(`coopplayers_test: ${n}/${n} ok`);
