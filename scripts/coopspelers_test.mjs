// Samen spelen (#377): de spelerslijst (game/js/coopspelers.js) voor Tab en het pauzemenu.
import assert from 'node:assert/strict';
import { spelersRijen, rijTekst, afstandTekst, VORM_TEKEN } from '../game/js/coopspelers.js';

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
t('de gastheer ziet de ping van elke gast; wie meespeelt een opdracht staat erbij', () => {
  const r = spelersRijen({ mijnSlot: 0, roster, partners: partners.filter((p) => p.slot !== 0), mijn: { x: 0, y: 0, rijdt: true }, rtt: (s) => (s === 1 ? 34.4 : s === 2 ? 180 : null), opdracht: 'Het Loket' });
  assert.equal(r[0].naam, 'Tammo'); assert.equal(r[0].doet, 'aan het stuur · in opdracht');
  assert.equal(rijTekst(r[1]), 'Tessa · in een voertuig · goed 34 ms · 100 m'.replace('goed 34 ms · 100 m', 'goed 34 ms · 100 m'));
  assert.match(rijTekst(r[2]), /haperd 180 ms/);
});
t('een gast kent alleen zijn eigen ping; neergeslagen blijft neergeslagen, ook in een opdracht', () => {
  const p = partners.map((x) => (x.slot === 0 ? { ...x, tekst: 'neergeslagen', status: 'neer' } : x));
  const r = spelersRijen({ mijnSlot: 1, roster, partners: p.filter((x) => x.slot !== 1), mijn: { x: 100, y: 0, inVoertuig: true }, rtt: (s) => (s === 1 ? 20 : null), opdracht: 'X' });
  const tam = r.find((x) => x.slot === 0); assert.equal(tam.doet, 'neergeslagen'); assert.equal(tam.ms, null);
  assert.equal(r[0].ms, 20); assert.equal(r[0].doet, 'in een voertuig');
});
t('afstanden: bij je, afgerond op tien meter, kilometers met een komma; rommel geeft niets', () => {
  assert.equal(afstandTekst(5), 'bij je'); assert.equal(afstandTekst(47), '50 m'); assert.equal(afstandTekst(1530), '1,5 km'); assert.equal(afstandTekst(NaN), '');
  assert.deepEqual(spelersRijen({ roster: [null, { slot: 'x' }] }), []);
});

console.log(`coopspelers_test: ${n}/${n} ok`);
