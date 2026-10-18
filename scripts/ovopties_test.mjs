// Reisopties (game/js/ovopties.js, #97):  node scripts/ovopties_test.mjs
import * as O from '../game/js/ovopties.js';
import { prepareLines } from '../game/js/busroutes.js';
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// twee rechte lijnen die kruisen bij x=3000
const raw = [
  { id: 'a', ref: '12', pts: [[0, 0], [3000, 0], [6000, 0]], stops: [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 6000, y: 0 }] },
  { id: 'b', ref: '77', pts: [[3000, 20], [3000, 3000], [3000, 6000]], stops: [{ x: 3000, y: 20 }, { x: 3000, y: 3000 }, { x: 3000, y: 6000 }] },
];
const lines = prepareLines(raw);
const direct = O.busTrip(lines, [10, 10], [5990, 10]);
ok(direct && direct.mode === 'bus' && direct.changes.length === 0 && direct.lines.length === 1, 'direct bus');
ok(direct.legs[0].kind === 'walk' && direct.legs.at(-1).kind === 'walk', 'walk in and out');
ok(/^Lijn 12 /.test(direct.lines[0].name), 'invented name', direct.lines[0].name);
ok(direct.etaS > 6000 / 14, 'eta incl. wait', direct.etaS);
const change = O.busTrip(lines, [10, 10], [3010, 5990]);
ok(change && change.changes.length === 1 && change.lines.length === 2 && change.stops.some((s) => s.kind === 'overstap'), 'one transfer');
ok(O.busTrip(lines, [10, 10], [9000, 9000]) === null, 'no bus far from lines');
ok(O.busColor('12') === O.busColor('12') && /^#[0-9a-f]{6}$/.test(O.busColor('77')), 'stable colour');
ok(O.lineColor('trein') !== O.lineColor('boot'), 'kinds differ');
ok(O.trainPrice(0) === 4 && O.trainPrice(100000) === 8 && O.trainPrice(4500) === 8, 'train price clamp', O.trainPrice(4500));

const auto = { length: 20000, etaS: 20000 / 22 };
const trein = { length: 18000, etaS: 1000, changes: ['Groningen'], legs: [{ kind: 'train', length: 16000, line: 'Stoptrein' }], stops: [] };
const opts = O.reisOpties({ auto, trein, bus: direct }, { money: 100 });
ok(opts.map((o) => o.id).join() === 'auto,trein,bus', 'options order', opts.map((o) => o.id));
ok(opts[0].price === 0 && opts[1].price === 8 && opts[2].price === 3, 'prices', opts.map((o) => o.price));
ok(opts[1].transfers === 1 && /1 overstap/.test(O.optieRegel(opts[1])), 'transfer text', O.optieRegel(opts[1]));
ok(opts.filter((o) => o.aanbevolen).length <= 1, 'at most one recommended');
ok(O.reisOpties({}, { directM: 800 }).length === 1, 'self always when there is a distance');
ok(O.reisOpties({ trein }, { money: 2, directM: 18000 }).find((o) => o.id === 'trein').afford === false, 'cannot afford');
ok(!O.reisOpties({ trein }, { money: 2, directM: 18000 }).some((o) => o.aanbevolen && o.id === 'trein'), 'no recommend when unaffordable');
const boot = O.reisOpties({ boot: { length: 6000, etaS: 1000 } })[0];
ok(boot.etaS === 1300 && boot.price === 5, 'boat waits', boot.etaS);
ok(O.etaText(30) === '± 1 min' && O.etaText(4000) === '± 1 u 7 min', 'eta text', O.etaText(4000));
console.log(`${n - fails}/${n} ovopties`);
process.exit(fails ? 1 : 0);
