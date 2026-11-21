// Zoeken in het pauzemenu (21-11, docs/ESCAPEMENU-UX-21-11.md): de regels in pausesearch.js zijn puur;
// de bedrading in pausemenu.js (knop, toets "/", modale laag, Esc) wordt in de bron nagelopen.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { maakRegel, zoekRegels, SOORTEN } from '../game/js/pausesearch.js';

const lees = (f) => fs.readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
let n = 0;
const t = (name, f) => { f(); n++; };

const regels = [
  maakRegel({ id: 'a-save', soort: 'actie', label: 'Spel opslaan', plek: 'Bewaart je voortgang', zoek: 'bewaren', act: 'save' }),
  maakRegel({ id: 'a-exit', soort: 'actie', label: 'Afsluiten', plek: 'Slaat je voortgang op', zoek: 'stoppen sluiten', act: 'exit' }),
  maakRegel({ id: 's-settings', soort: 'scherm', label: 'Instellingen', plek: 'Systeem', zoek: 'Alles wat je ziet, hoort en bestuurt', sec: 'settings' }),
  maakRegel({ id: 's-garage', soort: 'scherm', label: 'Garage', plek: 'Bezit', zoek: 'Jouw voertuigen', sec: 'garage' }),
  maakRegel({ id: 'o-sound', soort: 'onderdeel', label: 'Geluid & ondertitels', plek: 'Instellingen', sec: 'settings', sub: 'sound' }),
  maakRegel({ id: 'i-vol', soort: 'instelling', label: 'Muziekvolume', plek: 'Instellingen > Geluid & ondertitels', zoek: 'hoe hard de muziek staat', sec: 'settings', sub: 'sound', rij: '3' }),
  maakRegel({ id: 'i-opslaan', soort: 'instelling', label: 'Opslaan', plek: 'Spel > Opslaan & stoppen', sec: 'spel', sub: 'acties', rij: '9' }),
];
const ids = (q, max) => zoekRegels(regels, q, max).map((r) => r.id);

t('een woord vindt de regel op naam, op synoniem en op de plek', () => {
  assert.ok(ids('geluid').includes('o-sound'));
  assert.ok(ids('geluid').includes('i-vol'), 'de plek telt mee');
  assert.equal(ids('stoppen')[0], 'a-exit', 'een synoniem vindt de actie, en eerst');
  assert.ok(ids('voertuigen').includes('s-garage'), 'de uitleg onder de titel telt mee');
});

t('alle woorden moeten passen, de volgorde maakt niet uit', () => {
  assert.ok(ids('volume muziek').includes('i-vol'));
  assert.deepEqual(ids('muziek garage'), []);
  assert.deepEqual(ids('  GELUID   '), ids('geluid'), 'hoofdletters en spaties maken niet uit');
});

t('een begin van de naam gaat voor een woord ergens in de uitleg, en een actie gaat voor een rij', () => {
  assert.equal(ids('opslaan')[0], 'a-save', 'de actie "Spel opslaan" gaat voor de rij Opslaan');
  assert.equal(ids('inst')[0], 's-settings');
  assert.ok(ids('muziek').indexOf('i-vol') >= 0);
});

t('zonder woord staat er een beginlijst met acties en schermen, geen losse instellingen', () => {
  const lijst = ids('');
  assert.ok(lijst.includes('a-save') && lijst.includes('s-garage'));
  assert.ok(!lijst.includes('i-vol') && !lijst.includes('o-sound'));
});

t('niks gevonden geeft een lege lijst en max kapt af', () => {
  assert.deepEqual(ids('zzzz'), []);
  assert.equal(ids('', 2).length, 2);
  assert.equal(SOORTEN.instelling, 'Instelling');
});

t('de bedrading: knop bovenaan de rail, toets "/", modale laag, Esc sluit eerst het zoekvenster', () => {
  const pm = lees('pausemenu.js');
  assert.match(pm, /data-find-open/);
  assert.match(pm, /k === '\/' && !e\.repeat/);
  assert.match(pm, /querySelector\('\[data-find\]:not\(\[hidden\]\)'\)/, 'het zoekvenster telt als open vraag (de rest is inert)');
  assert.match(pm, /function goBack\(\) \{\n[^\n]*\n  if \(findOpen\(\)\) \{ closeFind\(\); return; \}/, 'Esc sluit eerst het zoekvenster');
  assert.match(pm, /class="m-bp pm-go pm-ingame" data-action="resume"/, 'Doorgaan staat altijd bovenaan de rail');
  assert.match(pm, /\[data-exit-confirm\], \[data-quit-confirm\], \[data-find\]/, 'sluiten van het menu sluit ook het zoekvenster');
});

console.log(`pausesearch_test: ${n}/${n} ok`);
