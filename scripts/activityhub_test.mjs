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

console.log(bad ? bad + ' failed' : 'activityhub_test ok');
process.exit(bad ? 1 : 0);
