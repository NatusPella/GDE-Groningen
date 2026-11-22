// The activity registry (game/js/activityhub.js): init phases, interact slots,
// tick phases and ranks, a throwing init does not stop the others.
//   node scripts/activityhub_test.mjs
import { registerActivityKind, activityKinds, initActivityKinds, interactActivityKinds, tickActivityKinds } from '../game/js/activityhub.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const log = [];
const mk = (id, extra = {}) => ({ id, init: () => log.push('init:' + id), interact: () => log.push('int:' + id), tick: () => log.push('tick:' + id), ...extra });

registerActivityKind(mk('a', { slot: 'act', tickPhase: 'world' }));
registerActivityKind(mk('b', { initPhase: 'late', slot: 'pre', tickPhase: 'late' }));
registerActivityKind(mk('c', { initPhase: 'late', slot: 'job', tickPhase: 'late', tickRank: -1 }));
registerActivityKind(mk('d', { initPhase: 'early', init() { throw new Error('boom'); } }));
registerActivityKind(mk('a'));
registerActivityKind(null);
check('duplicate and null ignored', activityKinds().join() === 'a,b,c,d', activityKinds().join());

const origErr = console.error; console.error = () => {};
initActivityKinds({}, 'early'); check('early init throws safely', log.length === 0);
console.error = origErr;
initActivityKinds({}, 'main'); check('main init', log.join() === 'init:a', log.join());
log.length = 0; initActivityKinds({}, 'late'); check('late init in registration order', log.join() === 'init:b,init:c', log.join());
log.length = 0; interactActivityKinds({}, 'job'); check('interact slot', log.join() === 'int:c', log.join());
log.length = 0; interactActivityKinds({}, 'nope'); check('unknown slot', log.length === 0);
log.length = 0; tickActivityKinds(0.1, {}, 'late'); check('tick rank', log.join() === 'tick:c,tick:b', log.join());
log.length = 0; tickActivityKinds(0.1, {}, 'world'); check('tick world', log.join() === 'tick:a', log.join());

// Efficiëntie: de tikvolgorde per fase wordt één keer opgebouwd, niet twee keer per beeld gefilterd en gesorteerd.
let reads = 0;
registerActivityKind({ id: 'e', tick: () => log.push('tick:e'), get tickPhase() { reads++; return 'late'; }, tickRank: 5 });
log.length = 0; tickActivityKinds(0.1, {}, 'late'); check('new kind joins its phase', log.join() === 'tick:c,tick:b,tick:e', log.join());
const readsNa = reads;
for (let i = 0; i < 50; i++) { tickActivityKinds(0.1, {}, 'late'); tickActivityKinds(0.1, {}, 'world'); }
check('kinds are not filtered again every tick', reads === readsNa, (reads - readsNa) + ' leesbeurten in 50 beelden');
registerActivityKind(mk('f', { tickPhase: 'late', tickRank: -2 }));
log.length = 0; tickActivityKinds(0.1, {}, 'late'); check('a kind registered later still ticks in rank order', log.join() === 'tick:f,tick:c,tick:b,tick:e', log.join());
// a kind that registers another kind during its tick: the running round finishes, the new kind joins the next one
registerActivityKind({ id: 'g', tickPhase: 'solo', tick: () => { log.push('tick:g'); registerActivityKind(mk('h', { tickPhase: 'solo' })); } });
log.length = 0; tickActivityKinds(0.1, {}, 'solo'); check('registration during a tick waits a round', log.join() === 'tick:g', log.join());
log.length = 0; tickActivityKinds(0.1, {}, 'solo'); check('and joins the next round', log.join() === 'tick:g,tick:h', log.join());

console.log(bad ? bad + ' failed' : 'activityhub_test ok');
process.exit(bad ? 1 : 0);
