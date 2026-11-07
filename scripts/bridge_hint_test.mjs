// Movable bridges (#154): the boat signal follows the bridge state, and a player
// near a bridge gets one hint when it is about to open and one when it lies open.
//   node scripts/bridge_hint_test.mjs
import * as MB from '../game/js/movablebridges.js';

let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };

const road = { movable: 'bascule', bridge: true, pts: [[0, 0], [20, 0]], width: 6, cat: 'normal' };
const [b] = MB.buildMovableBridges({}, [road]);
const T = MB.BRIDGE_TIMING;
const msgs = [];
const player = { x: 10, y: 30, inVehicle: null };
const world = { vehicles: [], pedestrians: [], player, time: 0, addMessage: (t, s, o) => msgs.push([t, o && o.kind]) };
const run = (secs) => { for (let t = 0; t < secs - 1e-9; t += 0.1) MB.updateMovableBridges(0.1, world); };

ok(MB.boatSignal(b) === 'red', 'closed: red');
MB.requestOpening(b);
run(0.2);
ok(msgs.length === 1 && /gaat open/.test(msgs[0][0]) && msgs[0][1] === 'tip', 'a hint when it is going to open (road)');
ok(MB.boatSignal(b) === 'red', 'warning: red');
run(T.WARN_S + T.BOOMS_S + T.MOVE_S - 1);
ok(b.state === 'opening' && MB.boatSignal(b) === 'red' && msgs.length === 1, 'moving: red, no second hint yet');
run(1.5);
ok(b.state === 'open' && MB.boatSignal(b) === 'green', 'open: green');
ok(msgs.length === 2 && msgs[1][0] === 'Brug open', 'a hint when it lies open');
run(T.HOLD_S + 2);
ok(MB.boatSignal(b) === 'red' && msgs.length === 2, 'closing: red again, no hint');
run(T.MOVE_S + T.BOOMS_S + 1);
ok(b.state === 'closed', 'closed again');

// a boat gets the water wording; far away nothing is said
msgs.length = 0;
player.inVehicle = { isBoat: true, x: 12, y: 40 };
MB.requestOpening(b);
run(0.2);
ok(msgs.length === 1 && msgs[0][0] === 'Brug gaat open', 'the boat is told the bridge is going to open');
ok(MB.bridgeHint('open', true) === 'Brug open', 'and is told it is open');
run(T.WARN_S + T.BOOMS_S + T.MOVE_S + T.HOLD_S + T.MOVE_S + T.BOOMS_S + 3);
msgs.length = 0;
player.inVehicle = { isBoat: true, x: 900, y: 900 };
MB.requestOpening(b);
run(T.WARN_S + 1);
ok(msgs.length === 0, 'out of reach: no hint');

console.log(fails ? `${fails} of ${n} FAILED` : `${n} bridge hint checks passed`);
process.exit(fails ? 1 : 0);
