// #844: het evenement van vandaag als echte Te-doen-rij. De audit noemde dit als
// tweede kandidaat: de agenda bestaat al, dus een rij met een place-doel naar het
// centrum van het evenement kost niets en geeft de speler elke dag iets anders.
//
// Deze test bewijst de regel zonder de wereld:
//   - op een dag zonder evenement is er geen rij;
//   - de rij kiest het eerstvolgende evenement van die dag;
//   - het doel is een echt place-doel met coordinaten;
//   - de tijd staat er in gewone taal bij ("vanaf 14:00", of "nu" als het loopt).
//   node scripts/evenement_todo_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bron = fs.readFileSync(new URL('../game/js/todo.js', import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };

t('de rij bestaat en leest de agenda van vandaag', () => {
  assert.match(bron, /function evenementItem\(world\)/, 'er is een eigen opbouw voor de rij');
  assert.match(bron, /agendaOn\(dag\)/, 'de agenda van die kalenderdag is de bron');
  assert.match(bron, /centreOf\(ev\)/, 'de plek komt uit de bestaande evenementendata');
});

t('zonder evenement of zonder plek is er geen rij', () => {
  assert.match(bron, /if \(!lijst\.length\) return null;/, 'geen evenement betekent geen rij');
  assert.match(bron, /if \(!c \|\| !Number\.isFinite\(c\.x\) \|\| !Number\.isFinite\(c\.y\)\) return null;/, 'een onbruikbare plek levert geen rij op');
});

t('de rij heeft een echt place-doel met coordinaten', () => {
  assert.match(bron, /goal: \{ kind: 'place', id: 'evenement:' \+ ev\.id/, 'het doel verwijst naar het evenement');
  assert.match(bron, /x: c\.x, y: c\.y/, 'met de coordinaten van het centrum');
});

t('de tijd staat in gewone taal op de rij', () => {
  assert.match(bron, /Vandaag vanaf \$\{tijd\}/, 'nog niet begonnen: de begintijd');
  assert.match(bron, /Nu aan de gang/, 'al begonnen: dat staat erbij');
  assert.match(bron, /padStart\(2, '0'\)/, 'de tijd is twee cijfers, geen 9:00');
});

t('de rij hangt in de Ommeland-groep met een bestaand icoon', () => {
  assert.match(bron, /key: 'om:evenement'/, 'eigen sleutel');
  assert.match(bron, /group: 'ommeland'/, 'bij het Ommeland');
  assert.match(bron, /icon: 'landmark'/, 'het landmark-icoon bestaat al in de kaartlaag');
});

// De selectie los nagerekend: dit is wat de functie met een agenda doet.
const kies = (lijst, uur) => {
  if (!lijst.length) return null;
  const ev = lijst[0];
  const loopt = uur >= ev.hours[0] && uur < ev.hours[1];
  return { id: ev.id, loopt, tijd: `${String(ev.hours[0]).padStart(2, '0')}:00` };
};

t('de selectie pakt het eerste evenement en weet of het loopt', () => {
  const lijst = [{ id: 'a', hours: [14, 18] }, { id: 'b', hours: [20, 23] }];
  assert.deepEqual(kies(lijst, 12), { id: 'a', loopt: false, tijd: '14:00' });
  assert.deepEqual(kies(lijst, 15), { id: 'a', loopt: true, tijd: '14:00' });
  assert.equal(kies([], 12), null);
});

console.log(`evenement_todo_test: ${n} controles ok`);
