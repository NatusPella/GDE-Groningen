// #800 (punt 14): minstens acht van de medaille-activiteiten hebben een intrinsieke tweede laag,
// en die laag staat als één regel op de startkaart. Geen nieuwe teller of opslagsleutel.
//   node scripts/activiteitlaag_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIVITEIT_LAAG, laagVan, aantalMetLaag } from '../game/js/activiteitlaag.js';
await import('./node3d.mjs'); // de startkaart tekent via hudcards/THREE
const { STARTKAART } = await import('../game/js/startkaart.js');

const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('minstens acht activiteiten hebben een intrinsieke tweede laag', () => {
  assert.ok(aantalMetLaag() >= 8, `maar ${aantalMetLaag()}`);
  for (const [id, laag] of Object.entries(ACTIVITEIT_LAAG)) {
    assert.ok(id in STARTKAART, `${id} is een echte activiteit`);
    assert.ok(typeof laag === 'string' && laag.trim().length > 3, `${id} heeft tekst`);
    assert.equal(laagVan(id), laag);
  }
  assert.equal(laagVan('onbekend'), '');
});

t('de startkaart noemt de tweede laag naast de medailles en beloning', () => {
  const src = lees('startkaart.js');
  assert.match(src, /import \{ laagVan \} from '\.\/activiteitlaag\.js'/, 'de tabel wordt gelezen');
  assert.match(src, /Tweede laag: \$\{laag\}/, 'de regel komt op de kaart');
});

t('de uitzonderingen zijn gedocumenteerd', () => {
  const docs = fs.readFileSync(new URL('../docs/ACTIVITEITEN-TWEEDE-LAAG.md', import.meta.url), 'utf8');
  assert.match(docs, /minstens acht/i, 'het document noemt de eis');
  for (const id of Object.keys(STARTKAART)) assert.ok(docs.includes(id), `${id} staat in de tabel`);
});

console.log(`activiteitlaag_test: ${n}/${n} ok`);
