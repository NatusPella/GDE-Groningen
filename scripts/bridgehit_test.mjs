// Ships against bridges (#9): thresholds, deck damage, repair, hull.
//   node scripts/bridgehit_test.mjs
import * as H from '../game/js/bridgehit.js';
let bad = 0;
const ok = (n, c, i = '') => { if (!c) bad++; console.log(`${c ? 'ok  ' : 'FAIL'} ${n} ${i}`); };

const base = { air: 4.2, clearance: 1.8, massT: 280, speed: 3 };
const hit = H.shipImpact(base);
ok('barge at 3 m/s hits a low bridge', hit && hit.severity === 3, JSON.stringify(hit));
ok('open bridge: no hit', H.shipImpact({ ...base, open: true }) === null);
ok('no deck (Infinity): no hit', H.shipImpact({ ...base, clearance: Infinity }) === null);
ok('fits under: no hit', H.shipImpact({ ...base, air: 1.3 }) === null);
ok('sloep too light', H.shipImpact({ ...base, massT: H.massOf('sloep') }) === null);
ok('barge too slow', H.shipImpact({ ...base, speed: 1.0 }) === null);
ok('reverse counts', H.shipImpact({ ...base, speed: -3 }).severity === 3);
const mid = H.shipImpact({ ...base, massT: 22, air: 1.6, clearance: 1.0, speed: 5 });
ok('rondvaart at 5 m/s: scheef (2)', mid && mid.severity === 2, JSON.stringify(mid));
const lo = H.shipImpact({ ...base, massT: 22, air: 1.6, clearance: 1.0, speed: 2 });
ok('rondvaart at 2 m/s: barsten (1) or nothing', lo === null || lo.severity === 1, JSON.stringify(lo));

const d = H.newDeckDamage();
ok('fresh deck open', !H.deckClosedToTraffic(d) && H.canBeHit(d));
H.hitDeck(d, 2);
ok('level 2 closes the deck', H.deckClosedToTraffic(d) && d.level === 2 && d.skew > 0 && d.crack > 0);
ok('cooldown after hit', !H.canBeHit(d));
H.stepDeckDamage(d, 5);
ok('cooldown over', H.canBeHit(d));
H.hitDeck(d, 1);
ok('a lighter hit does not lower the level', d.level === 2);
H.stepDeckDamage(d, H.CLOSED_S[2] + 1);
ok('re-opens to traffic first', !H.deckClosedToTraffic(d) && d.level >= 1);
for (let i = 0; i < 400; i++) H.stepDeckDamage(d, 1);
ok('fully healed', d.level === 0 && d.crack === 0 && d.skew === 0 && d.repair === 0);
const d3 = H.hitDeck(H.newDeckDamage(), 3);
const s0 = d3.skew;
H.stepDeckDamage(d3, 100);
ok('sag shrinks while repairing', d3.skew < s0 && d3.level >= 2);

const h = H.hullHit(3, 100);
ok('hull loses health, stops dead', h.health === 70 && h.speedKeep[3] === 0 && !!h.line);
ok('hull never below floor', H.hullHit(3, 12).health === H.HULL_FLOOR);
const b = { x: 0, y: 0, ux: 1, uy: 0 };
const [px, py] = H.pushBackDir(b, 3, -20);
ok('push back along the water, on the arrival side', px === 0 && py === -1);
if (bad) { console.log(`${bad} failed`); process.exit(1); }
console.log('all ok');
