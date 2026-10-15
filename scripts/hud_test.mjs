// Logic test for the HUD rules (hudrules.js, hudgps.js, roadaccess.js):
//   node scripts/hud_test.mjs
import * as R from '../game/js/hudrules.js';
import { nextTurn, turnText } from '../game/js/hudgps.js';
import * as A from '../game/js/roadaccess.js';

let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
const d = (s) => R.decideHud(s);

// quiet walk: only the minimap and the clock
let q = d({ hpFull: true, stamFull: true });
ok(q.show.minimap && q.show.clock, 'minimap and a small clock when walking');
ok(!q.show.stars && !q.show.money && !q.show.weapon && !q.show.bars && !q.show.vehicle && !q.show.gps, 'nothing else when nothing happens');
ok(!q.big.clock, 'clock small on a normal day');
ok(d({ specialDay: true }).big.clock && d({ timeGoal: true }).big.clock, 'clock big on a special day or with a time goal');

// stars: wanted + 6 s afterglow
ok(d({ wanted: 2 }).show.stars, 'stars when wanted');
ok(d({ wanted: 0, wantedAgo: 5 }).show.stars && !d({ wanted: 0, wantedAgo: 7 }).show.stars, 'stars glow on for 6 s');
// money
ok(d({ moneyAgo: 1 }).show.money && !d({ moneyAgo: 6 }).show.money, 'money on change, gone after 5 s');
ok(d({ nearShop: true }).show.money, 'money near a shop');
ok(!d({ moneyAgo: 1, busy: true, wanted: 1 }).show.money, 'money coming in waits in a chase');
// weapon / bars / vehicle
ok(d({ armed: true }).show.weapon && !d({}).show.weapon, 'weapon only when armed');
ok(d({ hpFull: false }).show.bars && d({ hpLow: true }).show.bars && !d({ hpFull: true, stamFull: true }).show.bars, 'bars only when not full');
ok(d({ stamFull: false }).show.bars, 'bars while stamina is down');
ok(d({ inVehicle: true }).show.vehicle && !d({}).show.vehicle, 'vehicle widgets only in a vehicle');
ok(d({ keys: 2 }).show.keys && !d({ keys: 0 }).show.keys, 'keys only when there is something to do');
// one card, priorities
ok(d({ cardA: R.P3, busy: true, wanted: 1 }).show.cardA === false, 'P3 cards wait during a chase');
ok(d({ cardA: R.P0, busy: true, wanted: 1 }).show.cardA, 'P0 cards always');
ok(d({ cardA: R.P1, busy: true, wanted: 1 }).show.cardA, 'P1 cards in a chase');
ok(!d({ cardE: R.P3, busy: true }).show.cardE && d({ cardE: R.P3 }).show.cardE, 'E waits in a chase');
ok(!d({ cardA: R.P3, dialogue: true }).show.cardA && d({ cardA: R.P2, dialogue: true }).show.cardA, 'tips wait out a conversation, a text does not');
// B: place name never with a timer, GPS wins
ok(!d({ place: true, timer: true }).show.place && !d({ place: true, gps: true }).show.place && d({ place: true }).show.place, 'place name only when B is free');
ok(!d({ place: true, busy: true, wanted: 1 }).show.place, 'place name waits when busy');
// G
ok(d({ objective: true, subtitle: true }).dimObjective && !d({ objective: true }).dimObjective, 'objective dims under a subtitle');
// rest: Slim only
const idle = { idle: 9, hpFull: true, stamFull: true, objective: true, inVehicle: true, keys: 2, moneyAgo: 1 };
const r = d(idle);
ok(r.show.minimap && !r.show.objective && !r.show.vehicle && !r.show.keys && !r.show.money, 'after 8 s idle only the minimap stays');
ok(d({ ...idle, wake: true }).show.vehicle, 'a key press brings it back');
ok(d({ ...idle, mode: 'alles' }).show.vehicle, 'Altijd alles never rests');
// never
ok(!Object.values(d({ hidden: true, wanted: 3, objective: true }).show).some(Boolean), 'nothing in cutscenes, photo mode and the map');
ok(d({ banner: true }).dimAll, 'a P0 banner dims the rest');
// minimaal
const mm = d({ mode: 'minimaal', wanted: 2, objective: true, subtitle: true, armed: true, inVehicle: true, moneyAgo: 1, cardA: R.P3, hpFull: false });
ok(mm.show.stars && mm.show.objective && mm.show.subtitle && !mm.show.minimap && !mm.show.money && !mm.show.weapon && !mm.show.vehicle && !mm.show.cardA, 'Minimaal: stars, objective, subtitles only');
ok(d({ mode: 'minimaal', cardA: R.P0 }).show.cardA, 'Minimaal keeps P0');
// ceiling: at most 7 besides the minimap, P3 then clock then money go first
const full = d({ wanted: 3, moneyAgo: 1, armed: true, hpFull: false, inVehicle: true, vehFull: false, keys: 2, objective: true, subtitle: true, cardA: R.P3, cardE: R.P3, gps: true, place: false });
ok(full.count <= R.CEILING, 'ceiling of 7 holds, got ' + full.count);
ok(!full.show.cardA && !full.show.cardE, 'P3 goes first over the ceiling');
ok(full.show.stars && full.show.objective && full.show.vehicle, 'P1/P2 stay');
// zone board
const z = new R.ZoneBoard();
ok(z.occupy('A', 'card', R.P3) && !z.occupy('A', 'phone', R.P2), 'one holder per zone');
z.setWaiting('A', 'phone', 2, R.P1);
ok(z.pressured('A', 'card') && z.waiting('A') === 2, 'a higher priority waiting pressures the holder');
z.vacate('A', 'card');
ok(z.occupy('A', 'phone', R.P1), 'a zone frees up');
// deferred: waits, lapses after 30 s
const df = new R.Deferred();
df.offer('x');
ok(df.tick(10, true) === 'wait' && df.tick(25, true) === 'drop' && df.tick(1, false) === 'none', 'P3 lapses after 30 s of waiting');
df.offer('y');
ok(df.tick(1, false) === 'show', 'and shows when quiet');

// GPS turns
const right = [[0, 0], [100, 0], [200, 0], [200, 100], [200, 200]];
const t1 = nextTurn(right, 400);
ok(t1 && t1.side === 'rechts' && Math.abs(t1.dist - 200) < 1, 'a right turn 200 m ahead (y points south)');
ok(turnText(t1) === 'Over 200 m rechtsaf', 'turn text ' + turnText(t1));
const left = [[0, 0], [100, 0], [100, -100]];
ok(nextTurn(left, 400).side === 'links', 'a left turn');
ok(nextTurn([[0, 0], [100, 0], [300, 0], [900, 0]], 400) === null, 'straight: no card');
ok(nextTurn(right, 150) === null, 'beyond 400 m (here 150): no card');
ok(nextTurn([[0, 0], [100, 0], [300, 5], [900, 5]], 400) === null, 'a slight bend is no turn');
ok(turnText({ dist: 10, dir: 'linksaf' }) === 'Nu linksaf', 'close: Nu');

// travel modes and access
ok(A.travelModeOf({ player: {} }) === 'lopen', 'on foot');
ok(A.travelModeOf({ player: { inVehicle: { isBike: true } } }) === 'fiets' && A.travelModeOf({ player: { inVehicle: { isBoat: true } } }) === 'boot' && A.travelModeOf({ player: { inVehicle: { isHeli: true } } }) === 'lucht' && A.travelModeOf({ player: { inVehicle: {} } }) === 'auto', 'bike, boat, heli, car');
ok(A.travelModeOf({ player: {}, trainDriving: true }) === 'ov', 'train is OV');
ok(A.roadAllowed({ type: 'trunk', cat: 'major' }, 'lopen') === false && A.roadAllowed({ type: 'trunk', cat: 'major' }, 'fiets') === false && A.roadAllowed({ type: 'trunk', cat: 'major' }, 'auto') === true, 'no walking or cycling on a trunk road');
ok(A.roadAllowed({ type: 'footway', cat: 'foot' }, 'auto') === false && A.roadAllowed({ type: 'cycleway', cat: 'cycle' }, 'auto') === false && A.roadAllowed({ type: 'cycleway', cat: 'cycle' }, 'fiets') === true, 'no cars on cycleways and footways');
ok(A.roadAllowed({ type: 'footway', cat: 'foot' }, 'fiets') === false && A.roadAllowed({ type: 'pedestrian', cat: 'foot' }, 'lopen') === true, 'no bikes on footways');
ok(A.roadAllowed({ type: 'trunk' }, 'boot') === null, 'no road rules for a boat');
ok(A.minimapScale('lucht', 0) < A.minimapScale('lopen', 0), 'zoomed out in the air');
ok(A.minimapScale('auto', 28) < A.minimapScale('auto', 0), 'car zoom scales with speed');
ok(A.northUp('lucht', 'lucht') && !A.northUp('lucht', 'auto') && A.northUp('altijd', 'lopen') && !A.northUp('nooit', 'lucht'), 'north-up setting');

console.log(`${n} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
