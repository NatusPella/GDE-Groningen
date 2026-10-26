// Samen spelen (#377): de spelerslijst (game/js/coopspelers.js) voor Tab en het pauzemenu.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spelersRijen, rijTekst, afstandTekst, VORM_TEKEN, kanEruitZetten, eruitKnopTekst, eruitGezetTekst, wegMelding, groepenVoor, groepTekstVoor } from '../game/js/coopspelers.js';
import * as G from '../game/js/coopmissie.js';

let n = 0;
const t = (name, f) => { f(); n++; };
const roster = [
  { slot: 0, naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek', verbinding: 'ok' },
  { slot: 1, naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit', verbinding: 'ok' },
  { slot: 2, naam: 'Rik', kleur: '#f2b134', vorm: 'vierkant', verbinding: 'lag' },
  { slot: 3, naam: 'Sanne', kleur: '#5bd6a0', vorm: 'cirkel', verbinding: 'lost' },
];
const partners = [
  { slot: 0, tekst: 'aan het stuur', status: 'rijdt', x: 100, y: 0, zichtbaar: true }, { slot: 1, tekst: 'in een voertuig', status: 'voertuig', x: 100, y: 0, zichtbaar: true },
  { slot: 2, tekst: 'te voet', status: 'voet', x: 40, y: 30, zichtbaar: true }, { slot: 3, tekst: 'verbinding weg', status: 'weg', x: 0, y: 0, zichtbaar: false },
];

t('de lijst: jij bovenaan, daarna op plek; naam, kleur, vorm, wat ze doen, verbinding en afstand', () => {
  const r = spelersRijen({ mijnSlot: 2, roster, partners, mijn: { x: 0, y: 0, inVoertuig: false }, rtt: () => null });
  assert.deepEqual(r.map((x) => x.slot), [2, 0, 1, 3]);
  assert.equal(r[0].jij, true); assert.equal(r[0].doet, 'te voet');
  assert.equal(r[1].doet, 'aan het stuur'); assert.equal(r[1].afstandTekst, '100 m');
  assert.equal(r[3].verbindingTekst, 'weg'); assert.equal(r[3].afstand, null, 'zonder positie geen afstand');
  assert.ok(r.every((x) => x.kleur && VORM_TEKEN[x.vorm]), 'kleur is nooit het enige signaal: elke speler heeft een vorm');
});
t('wie het spel opende ziet de ping van elke gast; wie zelf in een opdracht zit staat erbij', () => {
  const r = spelersRijen({ mijnSlot: 0, roster, partners: partners.filter((p) => p.slot !== 0), mijn: { x: 0, y: 0, rijdt: true }, rtt: (s) => (s === 1 ? 34.4 : s === 2 ? 180 : null), opdracht: 'Het Loket' });
  assert.equal(r[0].naam, 'Tammo'); assert.equal(r[0].doet, 'aan het stuur · in opdracht');
  assert.equal(rijTekst(r[1]), 'Tessa · in een voertuig · goed 34 ms · 100 m'.replace('goed 34 ms · 100 m', 'goed 34 ms · 100 m'));
  assert.match(rijTekst(r[2]), /haperd 180 ms/);
});
t('een gast kent alleen zijn eigen ping; neergeslagen blijft neergeslagen, ook in een opdracht', () => {
  const p = partners.map((x) => (x.slot === 0 ? { ...x, tekst: 'neergeslagen', status: 'neer' } : x));
  const r = spelersRijen({ mijnSlot: 1, roster, partners: p.filter((x) => x.slot !== 1), mijn: { x: 100, y: 0, inVoertuig: true }, rtt: (s) => (s === 1 ? 20 : null), opdracht: 'X' });
  const tam = r.find((x) => x.slot === 0); assert.equal(tam.doet, 'neergeslagen'); assert.equal(tam.ms, null);
  assert.equal(r[0].ms, 20); assert.equal(r[0].doet, 'in een voertuig · in opdracht', 'de opdracht is van jou, niet van een vaste plek (#455)');
  assert.doesNotMatch(tam.doet, /in opdracht/, 'van een andere groep ken je de opdracht niet');
});
t('afstanden: bij je, afgerond op tien meter, kilometers met een komma; rommel geeft niets', () => {
  assert.equal(afstandTekst(5), 'bij je'); assert.equal(afstandTekst(47), '50 m'); assert.equal(afstandTekst(1530), '1,5 km'); assert.equal(afstandTekst(NaN), '');
  assert.deepEqual(spelersRijen({ roster: [null, { slot: 'x' }] }), []);
});

t('een gast kent van de lijst alleen plek en personage: naam, kleur en vorm komen uit het personage', () => {
  const r = spelersRijen({ mijnSlot: 1, roster: [{ slot: 0, char: 'tammo', verbinding: 'ok' }, { slot: 1, char: 'anita', verbinding: 'ok' }, { slot: 2, char: 'rik', verbinding: 'ok' }] });
  assert.deepEqual(r.map((x) => x.naam), ['Tessa', 'Tammo', 'Rik']);
  assert.ok(r.every((x) => /^#/.test(x.kleur) && VORM_TEKEN[x.vorm]));
});

// ---- de groep van een speler (#492): de leider leidt, de deelnemer ziet zijn groep, een niet-deelnemer niets
t('de spelerslijst zet de groep bij de naam: de leider "leidt <label>", de deelnemer zijn groep, een niet-deelnemer niets', () => {
  const groepen = [
    { id: '3|Het Loket', label: 'Het Loket', leider: 0, deelnemers: [0, 2] },
    { id: '9|Kluisklus', label: 'Kluisklus', leider: 1, deelnemers: [1] },
  ];
  const r = spelersRijen({ mijnSlot: 0, roster, groepen });
  const by = (s) => r.find((x) => x.slot === s);
  assert.equal(by(0).groep, 'leidt Het Loket'); assert.equal(by(0).leidt, true, 'de gastheer leidde de groep die hij startte');
  assert.equal(by(2).groep, 'Het Loket'); assert.equal(by(2).leidt, false, 'deelnemen is niet hetzelfde als leiden');
  assert.equal(by(1).groep, 'leidt Kluisklus', 'een gast die zijn eigen groep begon is daar de leider');
  assert.equal(by(3).groep, ''); assert.equal(by(3).leidt, false, 'wie niet meedoet ziet niets');
  assert.equal(rijTekst(by(0)), 'Tammo (jij) · te voet · leidt Het Loket · goed');
  assert.equal(rijTekst(by(2)), 'Rik · onbekend · Het Loket · haperd', 'de groep komt tussen wat je doet en de verbinding');
  assert.equal(groepTekstVoor(null, 0), '');
  assert.equal(groepTekstVoor({ label: '', leider: 1, deelnemers: [1] }, 1), 'leidt de groep', 'zonder label blijft de leider zichtbaar');
  assert.equal(groepTekstVoor({ label: '', leider: 0, deelnemers: [0, 1] }, 1), '', 'zonder label en zonder leiderschap niets');
});
t('wie welke groepen kent (#492): de host alle groepen, een gast alleen zijn eigen groep, een toeschouwer niets', () => {
  const st = G.maakGroepen();
  G.begin(st, { id: '3|Het Loket', label: 'Het Loket', deelnemers: [0, 1], leider: 0 });
  G.begin(st, { id: '9|Kluisklus', label: 'Kluisklus', deelnemers: [2], leider: 2 });
  assert.deepEqual(groepenVoor({ coopRole: 'host', coopGroepen: st }, 0).map((g) => g.id), ['3|Het Loket', '9|Kluisklus']);
  // een gast kent alleen zijn eigen groep; de leider komt uit het missie-bericht van de host
  const gast = { coopRole: 'client', coopGroep: { id: '3|Het Loket', label: 'Het Loket', deelnemer: true }, coopMissie: { actief: true, id: '3|Het Loket', label: 'Het Loket', leider: 0 } };
  assert.deepEqual(groepenVoor(gast, 1), [{ id: '3|Het Loket', label: 'Het Loket', leider: 0, deelnemers: [0, 1] }]);
  const rijen = spelersRijen({ mijnSlot: 1, roster, groepen: groepenVoor(gast, 1) });
  assert.equal(rijen.find((x) => x.slot === 0).groep, 'leidt Het Loket', 'de gastheer leidt zijn groep');
  assert.equal(rijen.find((x) => x.slot === 1).groep, 'Het Loket');
  assert.equal(rijen.find((x) => x.slot === 2).groep, '', 'van een andere groep weet een gast niets');
  // een ouder bericht zonder leider: de eigen groep staat er wel, "leidt" niet (wie de leider is, weet de gast dan niet)
  const oud = { coopRole: 'client', coopGroep: { id: '3|Het Loket', label: 'Het Loket', deelnemer: true }, coopMissie: { actief: true, id: '3|Het Loket', label: 'Het Loket' } };
  assert.equal(groepenVoor(oud, 1)[0].leider, null);
  const oudRijen = spelersRijen({ mijnSlot: 1, roster, groepen: groepenVoor(oud, 1) });
  assert.equal(oudRijen.find((x) => x.slot === 1).groep, 'Het Loket');
  assert.equal(oudRijen.find((x) => x.slot === 1).leidt, false);
  assert.equal(oudRijen.find((x) => x.slot === 0).groep, '');
  // wie nee zei of nog niet antwoordde: nee is geen groep, een openstaande vraag wel
  assert.deepEqual(groepenVoor({ coopRole: 'client', coopGroep: { id: '9|Kluisklus', label: 'Kluisklus', deelnemer: false } }, 2), []);
  assert.equal(groepenVoor({ coopRole: 'client', coopGroep: { id: '3|Het Loket', label: 'Het Loket', deelnemer: null } }, 1).length, 1);
  assert.deepEqual(groepenVoor(null, 0), []);
  assert.deepEqual(groepenVoor({ coopRole: 'host', coopGroepen: null }, 0), []);
});
t('de lijst in beeld zet de groep bij de naam (#492)', () => {
  const ui = fs.readFileSync(new URL('../game/js/coopspelersui.js', import.meta.url), 'utf8');
  assert.match(ui, /const groep = r\.groep \?/);
  assert.match(ui, /cs-groep\$\{r\.leidt \? ' cs-leidt' : ''\}/);
  assert.match(ui, /\$\{esc\(r\.groep\)\}/);
  assert.match(ui, /\$\{r\.naam\}\|\$\{r\.groep\}/, 'de lijst ververst ook als de groep verandert'); // de sleutel van de Tab-lijst
  assert.match(ui, /r\.groep, r\.leidt/, 'de sleutel van het pauzemenu');
  const net = fs.readFileSync(new URL('../game/js/coopnet.js', import.meta.url), 'utf8');
  assert.match(net, /groepenVoor\(world, mijnSlot\)/);
});

// Eruit zetten (#434): een knop per speler voor wie het spel opende; nooit bij jezelf, nooit voor een gast
t('eruit zetten', () => {
  const r = spelersRijen({ mijnSlot: 0, roster });
  const jij = r.find((x) => x.jij), anderen = r.filter((x) => !x.jij);
  assert.equal(kanEruitZetten('host', jij), false);
  assert.ok(anderen.length === 3 && anderen.every((x) => kanEruitZetten('host', x)));
  assert.ok(anderen.every((x) => !kanEruitZetten('gast', x)));
  assert.equal(kanEruitZetten('host', null), false);
  assert.equal(eruitKnopTekst(false), 'Eruit zetten'); assert.equal(eruitKnopTekst(true), 'Zeker weten?');
  assert.equal(eruitGezetTekst(anderen.find((x) => x.slot === 1)), 'Tessa is uit het spel gezet. De anderen spelen door.');
  assert.doesNotMatch(eruitGezetTekst(anderen.find((x) => x.slot === 1)), /loopt weer zelf mee|gastheer/i, 'geen vaste rol per plek meer (#455)');
  assert.match(wegMelding('verwijderd', 'Tammo'), /Tammo heeft je uit het spel gezet. Je speelt weer in je eigen spel/);
  assert.match(wegMelding('spel gestopt', 'Tammo'), /het spel gestopt/);
  assert.match(wegMelding('verwijderd', 'Tammo', 'ABCDE-FGHJK'), /Opnieuw aansluiten kan met de kamercode ABCDE-FGHJK/, 'een gekickte gast ziet de kamercode (#434)');
  assert.doesNotMatch(wegMelding('verwijderd', 'Tammo', 'GDE2-192.168.1.5:41000-AAAAAAAA-0000'), /GDE2|192\.168/, 'een koppelcode met een adres komt nooit in beeld');
  assert.doesNotMatch(wegMelding('verwijderd', 'Tammo'), /kamercode/, 'zonder bekende code geen belofte');
  assert.doesNotMatch(wegMelding('spel gestopt', 'Tammo', 'ABCDE-FGHJK'), /ABCDE/, 'bij stoppen voor iedereen is er niets om opnieuw bij aan te sluiten');
});

console.log(`coopspelers_test: ${n}/${n} ok`);
