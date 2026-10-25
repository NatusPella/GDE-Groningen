// The travel beat choice (game/js/reiskeuze.js, #97):  node scripts/reiskeuze_test.mjs
import * as K from '../game/js/reiskeuze.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const wins = { length: 17000, ride: 'trein', lines: ['Naar Winsum.', 'Daar wacht Geesje.'], vehicle: 'bakkie', companion: 'tammo' };
const r = K.travelOptions(wins);
ok(r.klasse === 'sprong' && r.required && r.def === 'meerijden', 'sprong: ride along by default');
ok(r.options.map((o) => o.id).join() === 'meerijden,zelf,overslaan', 'three options');
const m = r.options[0], z = r.options[1], s = r.options[2];
ok(m.playS === 120 && m.clockS > 120, 'ride along is cut to 2 min, clock runs real time', JSON.stringify(m));
ok(s.playS === 20 && s.lines.length === 2, 'skip is 20 s and keeps the lines');
ok(z.pieces === 2 && z.reward && !m.reward && !s.reward, 'only driving yourself is rewarded');
ok(/^± \d+ min$/.test(z.eta), 'eta label', z.eta);
ok(z.kosten.startsWith('gratis') && m.kosten === 'gratis', 'elke keuze toont de kosten', `${m.kosten} / ${z.kosten}`);
// #445: het label leest als 'Snel reizen' of 'Snel reizen · met de trein', nooit 'Snel reizen · meerijden'
ok(m.label === 'Snel reizen · met de trein', 'ride label names the ride', m.label);
ok(K.travelOptions({ length: 9000, ride: 'lift' }).options[0].label === 'Snel reizen' && K.travelOptions({ length: 9000 }).options[0].label === 'Snel reizen', 'lift: gewoon Snel reizen');

// no lines: skipping would lose story, so no skip option
const nl = K.travelOptions({ length: 17000, ride: 'bus' });
ok(!nl.options.some((o) => o.id === 'overslaan'), 'no skip without lines');

// a short hop is not a beat: drive
const short = K.travelOptions({ length: 3000 });
ok(!short.required && short.def === 'zelf', 'short hop: drive');

// 65 km by tractor: split into pieces, flagged over the ceiling
const tr = { length: 65000, selfMode: 'trekker', ride: 'lift' };
ok(K.selfDriveOver(tr) && K.travelOptions(tr).options[1].pieces > 10, 'tractor trip is split');
ok(!K.selfDriveOver({ length: 5000 }), 'short drive not over');

// arrival is the same story-wise for every choice
const a = K.arrival(wins, 'overslaan'), b = K.arrival(wins, 'zelf'), c = K.arrival(wins, 'meerijden');
ok(a.vehicle === 'bakkie' && b.vehicle === 'bakkie' && c.companion === 'tammo', 'vehicle and companion come along');
ok(a.money === 0 && c.money === 0 && b.money === 68, 'reward only when driving', b.money);
ok(a.subtitles.length === 2 && b.subtitles.length === 0, 'skip shows the lines');
ok(a.startTimersAfter && b.startTimersAfter && c.startTimersAfter, 'timers start after arrival');
ok(a.clockMinutes === c.clockMinutes && a.clockMinutes > 0, 'skip and ride advance the clock alike');
ok(K.arrival(wins, 'vliegen') === null, 'unknown choice');
ok(K.selfReward(1e6) === 120, 'reward capped');
console.log(`${n - fails}/${n} reiskeuze`);
process.exit(fails ? 1 : 0);
