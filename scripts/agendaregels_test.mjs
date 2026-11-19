import assert from 'node:assert/strict';
import { agendaRegels } from '../game/js/agendaregels.js';
import { AGENDA } from '../game/js/evenementen.js';

const kermis = AGENDA.find((e) => e.id === 'ev-kermis-zuidbroek');
// Een dag voor de kermis: hij staat al in de agenda, met datum, tijd en plaats.
const n = kermis.from - 3;
const lijst = agendaRegels(n, { count: 12 });
const k = lijst.find((r) => r.name === 'Zomerkermis Zuidbroek');
assert.ok(k, 'de kermis staat vooruit in de agenda');
assert.match(k.when, /Zuidbroek/);
assert.match(k.when, /\d\d:\d\d - /);
assert.equal(k.on, false, 'nog niet gaande');
assert.equal(k.icon, 'kraam');

// Op de dag zelf staat hij bovenaan als "nu".
const dag = agendaRegels(kermis.from, { count: 12 });
assert.equal(dag[0].name, 'Zomerkermis Zuidbroek');
assert.equal(dag[0].on, true);

// Bijzondere dagen en evenementen staan op datum door elkaar; het maximum geldt.
const sp = [{ s: { id: 'x', name: 'Dag X', icon: 'zon' }, from: n + 1, label: 'morgen' }];
const mix = agendaRegels(n, { specials: sp, count: 3 });
assert.equal(mix.length, 3);
assert.equal(mix[0].name, 'Dag X', 'morgen komt voor de kermis');
// De bijzondere dag van vandaag telt niet dubbel en staat eerst.
const vandaag = agendaRegels(n, { special: { id: 'x', name: 'Dag X', icon: 'zon' }, specials: sp, count: 3 });
assert.equal(vandaag.filter((r) => r.name === 'Dag X').length, 1);
assert.equal(vandaag[0].on, true);
// Na het laatste evenement is de lijst leeg, zonder fout.
assert.deepEqual(agendaRegels(9999, {}), []);
console.log('agendaregels_test: ok');
