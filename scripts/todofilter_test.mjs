import assert from 'node:assert/strict';
import { hideUnknownAreas } from '../game/js/todofilter.js';
import { newExplorationProfile, isHiddenOnMap, revealArea } from '../game/js/verkenpunten.js';
import { STREKEN } from '../game/js/regioleven.js';
import { wgsToWorld } from '../game/js/rdnew.js';

// Een echte streek met zijn hart als plek: onbekend verbergt, na ontdekken niet meer.
const streek = STREKEN[0];
const [sx, sy] = wgsToWorld(streek.at[0], streek.at[1]);
const profiel = newExplorationProfile();
const verborgen = (x, y) => isHiddenOnMap(profiel, x, y);
assert.equal(verborgen(sx, sy), true, 'de streek is nog onbekend');

const items = [
  { key: 'm:3', group: 'missies', x: sx, y: sy },
  { key: 'st:a', group: 'verhaal', x: sx, y: sy },
  { key: 'mg:drift', group: '', x: sx, y: sy },
  { key: 'job:koerier', group: 'diensten', x: sx, y: sy },
  { key: 'om:dorp:Veendam', group: 'ommeland', x: sx, y: sy },
  { key: 'om:uitkijk', group: 'ommeland', x: sx, y: sy },
  { key: 'col:hogelandrit', group: 'ommeland', x: sx, y: sy },
  { key: 'mg:padel', group: '', x: 0, y: 0 },
  { key: 'col:eieren', group: 'verzamelen' },
];
const sleutels = (l) => l.map((i) => i.key);
const nu = sleutels(hideUnknownAreas(items, verborgen));
assert.deepEqual(nu, ['m:3', 'st:a', 'om:dorp:Veendam', 'om:uitkijk', 'mg:padel', 'col:eieren']);

revealArea(profiel, streek.id);
assert.equal(verborgen(sx, sy), false);
assert.equal(hideUnknownAreas(items, verborgen).length, items.length, 'na ontdekken staat alles weer in de lijst');
assert.equal(hideUnknownAreas(items, null), items, 'zonder filter niets kwijt');
console.log('todofilter_test: ok');
