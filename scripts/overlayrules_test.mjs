import assert from 'node:assert/strict';
import { heldOverlays, mayStartOverlay, RANK, HOLDS } from '../game/js/overlayrules.js';

const h = (a) => [...heldOverlays(a)].sort();
assert.deepEqual(h([]), []);
assert.deepEqual(h(['naamkaart']), [], 'alleen een naamkaart: niets wacht');
assert.deepEqual(h(['resultaat', 'naamkaart']), ['naamkaart'], 'naamkaart wacht onder de resultaatkaart');
assert.deepEqual(h(['resultaat', 'duelbalk', 'prestatie', 'naamkaart']), ['duelbalk', 'naamkaart', 'prestatie']);
assert.deepEqual(h(['duelbalk', 'prestatie']), ['prestatie'], 'duelbalk houdt prestatie tegen');
assert.deepEqual(h(['prestatie', 'naamkaart']), [], 'zelfde of lagere rang houdt niet tegen');
assert.deepEqual(h(['keuze', 'locatie']), ['locatie']);
assert.deepEqual(h(['resultaat', 'resultaat']), []);
assert.ok(!mayStartOverlay('naamkaart', ['resultaat']));
assert.ok(mayStartOverlay('naamkaart', []));
assert.ok(mayStartOverlay('resultaat', ['naamkaart', 'duelbalk']), 'de resultaatkaart begint altijd');
assert.ok(!mayStartOverlay('prestatie', ['duelbalk']));
// geen cycli: een overlay houdt alleen lagere rangen tegen
for (const [a, list] of Object.entries(HOLDS)) for (const b of list) assert.ok(RANK[a] > RANK[b], `${a} > ${b}`);
// de wijkkaart (#292): wacht onder resultaat, keuze en duelbalk; houdt de naamkaart tegen
assert.deepEqual(h(['resultaat', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['keuze', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['duelbalk', 'wijkkaart']), ['wijkkaart']);
assert.deepEqual(h(['wijkkaart', 'naamkaart']), ['naamkaart'], 'wijkkaart en naamkaart staan op dezelfde plek: één tegelijk');
assert.deepEqual(h(['wijkkaart', 'prestatie']), [], 'een prestatie staat elders (zone E)');
// een schermvullend scherm (pauzemenu, kaart, werkplaats): plaatsstempel, naamkaart en plaatsnaam wachten; een prestatie niet (review 22-11)
assert.deepEqual(h(['scherm', 'wijkkaart', 'naamkaart', 'locatie', 'prestatie']), ['locatie', 'naamkaart', 'wijkkaart']);
assert.ok(!mayStartOverlay('wijkkaart', ['scherm']) && mayStartOverlay('prestatie', ['scherm']));
// #1182: de plaatsstempel van bigmoment.js (vorm plaats, MOI! Ommelanden, Binnenstad) vervangt de wijkkaart. De DOM-kant
// herkent hem als wijkkaart en verbergt hem ook als hij al in beeld stond toen de kaart, het pauzemenu of de werkplaats opende.
{
  const fs = await import('node:fs');
  const oh = fs.readFileSync(new URL('../game/js/overlayhold.js', import.meta.url), 'utf8');
  const bm = fs.readFileSync(new URL('../game/js/bigmoment.js', import.meta.url), 'utf8');
  assert.ok(/el\.className = `bm bm-v-\$\{m\.vorm\}/.test(bm), 'bigmoment.js zet de vorm als klasse bm-v-<vorm>');
  assert.match(oh, /wijkkaart: '#wijk-card\.on, \.bm\.bm-v-plaats'/, 'de stempel telt als wijkkaart');
  assert.match(oh, /wijkkaart: '#wijk-card, \.bm\.bm-v-plaats'/, 'de stempel wordt verborgen als de wijkkaart moet wachten');
  assert.match(oh, /for \(const el of document\.querySelectorAll\(sel\)\) el\.classList\.toggle\('ov-hold', held\.has\(name\)\)/, 'alle elementen per overlay wijken, niet alleen het eerste');
}
// #1182 (hertest 22-11): de plaatsstempel lag over het vertrekbord van het station. Dat bord is een minigamebord
// (createBoard in minigamekit.js, .mg-board in #hud) en telt dus als duelbalk, die de stempel tegenhoudt.
{
  const fs = await import('node:fs');
  const oh = fs.readFileSync(new URL('../game/js/overlayhold.js', import.meta.url), 'utf8');
  const kit = fs.readFileSync(new URL('../game/js/minigamekit.js', import.meta.url), 'utf8');
  const st = fs.readFileSync(new URL('../game/js/stationlife.js', import.meta.url), 'utf8');
  assert.match(st, /board = createBoard\('station'\)/, 'het vertrekbord is een createBoard-bord');
  assert.ok(/root\.className = 'mg-board'/.test(kit) && /getElementById\('hud'\)/.test(kit), 'createBoard hangt een .mg-board in #hud');
  assert.match(oh, /duelbalk: '#hud \.mg-board:not\(\[hidden\]\)'/, 'een zichtbaar bord telt als duelbalk');
  assert.ok(h(['duelbalk', 'wijkkaart']).includes('wijkkaart'), 'en houdt de stempel tegen');
}
console.log('overlayrules_test ok');
