import assert from 'node:assert';
import { ringCounter, landingGuide } from '../game/js/heligrade.js';

assert.strictEqual(ringCounter({ ringsHit: 0, ringsMissed: 0 }, 5).text, 'ring 1/5 · 0 door');
assert.strictEqual(ringCounter({ ringsHit: 2, ringsMissed: 1 }, 5).next, 4);
const fin = ringCounter({ ringsHit: 4, ringsMissed: 1 }, 5);
assert.ok(fin.finished && fin.text === '4/5 ringen');
assert.ok(ringCounter({ ringsHit: 9, ringsMissed: 0 }, 5).next <= 5);

const pad = { x: 0, y: 0, r: 6, deck: 20 };
const g = (o) => landingGuide({ x: 0, y: 0, z: 40, vx: 0, vy: 0, vz: 0, onGround: false, ...o }, pad);
assert.strictEqual(g({ x: 200 }).state, 'nader');
assert.strictEqual(g({ x: 15 }).state, 'uitlijnen');
assert.strictEqual(g({ vx: 10 }).state, 'te snel');
assert.strictEqual(g({ z: 60 }).state, 'zakken');
assert.strictEqual(g({ z: 25, vz: -6 }).state, 'te hard');
const ok = g({ z: 23, vz: -1.5 });
assert.ok(ok.state === 'goed' && ok.ok && ok.alt === 3);
assert.strictEqual(g({ onGround: true, z: 20 }).text, 'Geland');
assert.strictEqual(g({ onGround: true, z: 20, x: 12 }).text, 'Geland naast de H');
console.log('heligrade_test ok');
