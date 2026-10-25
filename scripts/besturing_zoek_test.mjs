// Besturing (#435): het zoekveld in Instellingen > Besturing zoekt in één keer
// in het Toetsenoverzicht, bij Toetsenbord en muis, bij Controller en in de
// hulpteksten, en legt uit waar de toets van de trekker (de hef) zit. De regel
// "past dit woord" staat in zoektekst.js en is puur; de bedrading staat ernaast.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { woordenVan, past, pastZoek } from '../game/js/zoektekst.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

t('de zoekopdracht wordt in woorden geknipt, zonder hoofdletters en losse spaties', () => {
  assert.deepEqual(woordenVan('  Toeter  '), ['toeter']);
  assert.deepEqual(woordenVan('duif Q'), ['duif', 'q']);
  assert.deepEqual(woordenVan('   '), []);
  assert.deepEqual(woordenVan(null), []);
  assert.deepEqual(woordenVan(undefined), []);
});

t('alle woorden moeten passen, waar ze ook staan', () => {
  assert.equal(pastZoek('Toeteren met H', 'toeter'), true);
  assert.equal(pastZoek('Toeteren met H', 'toeter h'), true);
  assert.equal(pastZoek('Toeteren met H', 'h toeter'), true, 'de volgorde maakt niet uit');
  assert.equal(pastZoek('Toeteren met H', 'toeter q'), false, 'één woord dat er niet staat is genoeg om af te vallen');
  assert.equal(pastZoek('Handrem met SPACE', 'HANDREM'), true, 'hoofdletters maken niet uit');
});

t('een lege zoekopdracht laat alles staan', () => {
  assert.equal(pastZoek('wat dan ook', ''), true);
  assert.equal(past('wat dan ook', []), true);
});

t('past() werkt ook met een lijst woorden die al geknipt is', () => {
  assert.equal(past('Fiets met SHIFT', woordenVan('fiets shift')), true);
  assert.equal(past('Fiets met SHIFT', woordenVan('fiets rem')), false);
});

t('Besturing en Spullen gebruiken dezelfde regel', () => {
  const pm = lees('pausemenu.js');
  assert.match(pm, /import \{ woordenVan, past \} from '\.\/zoektekst\.js'/, 'pausemenu gebruikt de gedeelde regel');
  assert.match(pm, /const words = woordenVan\(q\)/, 'de zoekopdracht wordt op dezelfde manier geknipt');
  assert.match(pm, /const hit = past\(r\.dataset\.search, words\)/, 'de toetsenrijen zoeken met dezelfde regel');
  assert.match(pm, /n = past\(g\.textContent, words\)/, 'de hulpteksten ook');
  assert.match(pm, /filterBinds\(words\)/, 'dezelfde woorden gaan naar Toetsenbord en muis én Controller (#435)');
  const sp = lees('spullen.js');
  assert.match(sp, /import \{ woordenVan, past \} from '\.\/zoektekst\.js'/);
});

t('het zoekveld staat er met uitleg, werkt meteen en Escape wist het', () => {
  const pm = lees('pausemenu.js');
  assert.match(pm, /data-controls-search placeholder="Zoek een toets of actie/);
  assert.match(pm, /aria-label="Zoek in de besturing"/, 'een zoekveld heeft een naam voor de voorlezer');
  assert.match(pm, /search\.addEventListener\('input', \(\) => filterControls\(search\.value\)\)/, 'typen zoekt meteen');
  assert.match(pm, /if \(search\.value\) \{ search\.value = ''; filterControls\(''\); \} else search\.blur\(\)/, 'Escape wist eerst, dan pas loslaten');
  assert.match(pm, /e\.stopPropagation\(\)/, 'typen in het zoekveld bereikt het spel niet');
  assert.match(pm, /Niks gevonden\. Probeer een ander woord of een toets\./, 'een lege uitkomst zegt het');
});

t('de trekker zegt welke knop de ploeg laat zakken', () => {
  const hk = lees('hintkit.js');
  const hint = (hk.match(/\{ id: 'v-trekker'[^\n]*/) || [''])[0];
  assert.match(hint, /T laat de hef \(en de ploeg\) zakken/, 'de hint noemt T en de ploeg');
  const ho = lees('helpoverview.js');
  assert.match(ho, /Op de trekker laat \{T\} de hef zakken en weer omhoog; dat is de knop voor de ploeg/, 'Besturing > Hulp legt het ook uit');
  assert.match(ho, /\{E\} koppelt een werktuig, \{X\} lost het en \{G\} zet de aftakas aan/, 'koppelen, lossen en de aftakas staan erbij');
});

console.log(`besturing_zoek_test: ${n}/${n} ok`);
