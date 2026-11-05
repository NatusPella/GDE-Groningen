// Test of the pure parts of the act 5 convoy (game/js/convoyrules.js): the leader's trail, the goals and the lag rule.
import './node3d.mjs'; // convoy.js laadt de voertuigmodellen via three (net als het spel)
import { CONVOY, pushTrail, trailGoal, lagStep } from '../game/js/convoyrules.js';

let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FAIL ' + m); } };

const trail = [];
pushTrail(trail, 0, 0);
pushTrail(trail, 3, 0);
ok(trail.length === 1, 'a short move adds no trail point');
for (let x = 10; x <= 100; x += 10) pushTrail(trail, x, 0);
ok(trail.length === 11, 'every trailStep adds a point');
ok(trailGoal(trail, 0).x === 80, 'the first member is `spacing` points behind the leader');
ok(trailGoal(trail, 1).x === 60, 'the second one further back');
ok(trailGoal(trail, 50).x === 0, 'the goal never runs off the start of the trail');
ok(trailGoal([], 0) === null, 'no trail, no goal');

const m = {};
let r = lagStep(m, CONVOY.warnGap + 1, 1);
ok(r.warn && !r.split, 'a warning when a member falls behind');
r = lagStep(m, CONVOY.warnGap + 1, 1);
ok(!r.warn, 'the warning comes once');
for (let i = 0; i < CONVOY.lagSecs; i++) r = lagStep(m, CONVOY.maxGap + 10, 1);
ok(!r.split, 'exactly lagSecs far behind is not yet a split');
r = lagStep(m, CONVOY.maxGap + 10, 1);
ok(r.split, 'further behind for longer than lagSecs: the column falls apart');
const m2 = { lagT: 8 };
lagStep(m2, 10, 3);
ok(m2.lagT === 2, 'catching up lets the lag run out');

// --- de colonne volgt een meespeler (#525): de teller telt vanaf zijn lichaam ------------------------
const { convoyStatus } = await import('../game/js/convoy.js');
const state = { members: [{ v: { x: 0, y: 0 } }, { v: { x: 10, y: 0 } }, { v: { x: 200, y: 0 } }] };
const w = { player: { x: 0, y: 0, inVehicle: null } };
const host = convoyStatus(w, state);
ok(host.total === 3 && host.near === 2, 'vanaf de hoofdspeler tellen de twee dichtbij');
const guest = { x: 200, y: 0, inVehicle: null };
ok(convoyStatus(w, state, guest).near === 1, 'vanaf een gast in de missieauto telt de colonne bij hem');

console.log(`${n - bad}/${n} convoy checks passed`);
process.exit(bad ? 1 : 0);
