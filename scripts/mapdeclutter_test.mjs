// De kaart-declutter: de speler, zijn maat en het doel blijven altijd staan; de andere
// "keep"-categorieën (missie, politie, halte, huis) wijken voor een hogere prioriteit.
//   node scripts/mapdeclutter_test.mjs
import assert from 'node:assert/strict';
import { placeIcons } from '../game/js/mapicons.js';

let n = 0;
const ok = (c, name, info = '') => { n++; assert.ok(c, name + (info ? ' :: ' + info : '')); };
const kinds = (uit) => uit.map((x) => x.kind).sort();

// twee keep-iconen op dezelfde plek: de missie wint van de politie
ok(kinds(placeIcons([{ kind: 'waypoint', sx: 0, sy: 0 }, { kind: 'police', sx: 2, sy: 0 }], 10)).join() === 'waypoint', 'de missie drukt de politie weg');
// de speler en het doel zijn nooit weg te drukken
ok(kinds(placeIcons([{ kind: 'player', sx: 0, sy: 0 }, { kind: 'waypoint', sx: 2, sy: 0 }], 10)).join() === 'player', 'de speler blijft');
ok(kinds(placeIcons([{ kind: 'missionActive', sx: 0, sy: 0 }, { kind: 'waypoint', sx: 2, sy: 0 }], 10)).join() === 'missionActive', 'het doel blijft');
// ver uit elkaar blijven ze allebei
ok(kinds(placeIcons([{ kind: 'waypoint', sx: 0, sy: 0 }, { kind: 'police', sx: 40, sy: 0 }], 10)).join() === 'police,waypoint', 'losse iconen blijven');
// een gewoon icoon wijkt nog steeds voor een keep-icoon
ok(kinds(placeIcons([{ kind: 'waypoint', sx: 0, sy: 0 }, { kind: 'sj-taxi', sx: 2, sy: 0 }], 10)).join() === 'waypoint', 'de baan wijkt voor de missie');

console.log(`mapdeclutter_test: ${n}/${n} ok`);
