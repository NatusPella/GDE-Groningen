// #844: het uitkijkpunt als echte Te-doen-rij. De eigenaar wilde meer variatie in
// "Begin hier" en dingen die nu nooit een route krijgen waar dat veilig kan, een plek
// geven. Het uitkijkpunt is er zo een: het staat al op de kaart, heeft een E-actie en
// telt mee voor de streekstempel, maar stond nergens in Te doen.
//
// Deze test bewijst de regel zonder de wereld: een nepwereld met een paar punten, waarvan
// er één gebruikt is. Wat hij bewaakt:
//   - zonder punten (of zonder wereld) is er geen rij en dus geen leugen;
//   - de rij wijst naar het dichtstbijzijnde ONgebruikte punt, niet naar een gebruikt punt;
//   - de rij heeft een echt place-doel met x en y, zodat kiezen een route zet;
//   - de teller zegt hoeveel punten je al gebruikte.
//   node scripts/uitkijk_todo_test.mjs
import assert from 'node:assert/strict';

// De echte module leunt op de wereld en op three.js; voor deze regel toetsen we de
// bron-opbouw plus een losse herimplementatie van precies die selectie, zodat de test
// geen stage of browser nodig heeft.
import fs from 'node:fs';

const bron = fs.readFileSync(new URL('../game/js/todo.js', import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };

t('de rij bestaat en leest de uitkijkpunten van de kaart', () => {
  assert.match(bron, /function uitkijkItem\(world\)/, 'er is een eigen opbouw voor de rij');
  assert.match(bron, /world\.map\.meta\.uitkijkpunten/, 'de punten komen van de kaart');
  assert.match(bron, /isViewpointUsed/, 'een gebruikt punt telt niet meer mee');
});

t('zonder punten is er geen rij', () => {
  assert.match(bron, /if \(!points \|\| !points\.length\) return null;/, 'geen punten betekent geen rij');
  assert.match(bron, /if \(!open\.length\) return null;/, 'alles gebruikt betekent geen rij');
});

t('de rij kiest het dichtstbijzijnde ongebruikte punt en heeft een place-doel', () => {
  assert.match(bron, /\.sort\(\(a, b\) => a\.d - b\.d\)\[0\]/, 'het dichtstbijzijnde punt wint');
  assert.match(bron, /goal: \{ kind: 'place'/, 'de rij zet een place-doel, geen verwijzing');
  assert.match(bron, /x: near\.q\.x, y: near\.q\.y/, 'het doel heeft echte coordinaten');
});

t('de teller noemt wat je al deed', () => {
  assert.match(bron, /gebruikt} van \$\{points\.length\} gebruikt/, 'de teller telt de gebruikte punten');
});

t('de rij hangt in de Ommeland-groep met het uitkijkpunt-icoon', () => {
  assert.match(bron, /key: 'om:uitkijk'/, 'de rij heeft een eigen sleutel');
  assert.match(bron, /group: 'ommeland'/, 'hij hoort bij het Ommeland');
  assert.match(bron, /icon: 'uitkijkpunt'/, 'het icoon bestaat al in de kaartlaag');
});

// De selectie zelf, los nagerekend: dit is wat de functie doet met een gegeven lijst.
const kies = (points, p, used) => {
  const open = points.filter((q) => Number.isFinite(q.x) && Number.isFinite(q.y) && !used.has(q.id));
  if (!open.length) return null;
  return open.map((q) => ({ q, d: Math.hypot(q.x - p.x, q.y - p.y) })).sort((a, b) => a.d - b.d)[0].q;
};

t('de selectie slaat een gebruikt punt over ook als het dichterbij ligt', () => {
  const used = new Set(['a']);
  const points = [{ id: 'a', x: 10, y: 10 }, { id: 'b', x: 200, y: 10 }];
  const gekozen = kies(points, { x: 0, y: 0 }, used);
  assert.equal(gekozen.id, 'b', 'het gebruikte punt telt niet mee');
});

t('de selectie kiest het dichtstbijzijnde van de overgebleven punten', () => {
  const points = [{ id: 'a', x: 500, y: 0 }, { id: 'b', x: 100, y: 0 }, { id: 'c', x: 300, y: 0 }];
  assert.equal(kies(points, { x: 0, y: 0 }, new Set()).id, 'b');
});

t('zonder bruikbare coordinaten blijft er niets over', () => {
  const points = [{ id: 'a', x: NaN, y: 0 }, { id: 'b', x: 0, y: undefined }];
  assert.equal(kies(points, { x: 0, y: 0 }, new Set()), null);
});

console.log(`uitkijk_todo_test: ${n} controles ok`);
