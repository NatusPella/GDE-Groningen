// #1285: dempingen die per beeld 'v *= 0.9' deden (wegversperring, scrollwiel, splinters van een wrak) hingen af van de
// framerate. frameDecay (game/js/util.js) maakt er een factor per seconde van: na 1 s blijft hetzelfde over op 20, 30,
// 60 en 144 fps, en de aanroepers gebruiken hem echt (geen losse 'v *= 0.9' meer).
//   node scripts/framedecay_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frameDecay } from '../game/js/util.js';

let n = 0;
const t = (name, f) => { try { f(); n++; } catch (e) { console.error('MISLUKT: ' + name); throw e; } };
const naEenSeconde = (k, fps) => { let v = 1; for (let i = 0; i < fps; i++) v *= frameDecay(k, 1 / fps); return v; };

t('op 60 fps precies de oude factor per beeld', () => {
  assert.ok(Math.abs(frameDecay(0.9, 1 / 60) - 0.9) < 1e-12);
  assert.ok(Math.abs(frameDecay(0.8, 1 / 60) - 0.8) < 1e-12);
});
t('na een seconde blijft hetzelfde over op 20, 30, 60, 144 en 240 fps', () => {
  for (const k of [0.9, 0.8]) {
    const ref = naEenSeconde(k, 60);
    for (const fps of [20, 30, 144, 240]) assert.ok(Math.abs(naEenSeconde(k, fps) - ref) < 1e-9, `k=${k} op ${fps} fps`);
  }
});
t('de oude regel deed dat niet (bewijs dat het verschil echt was)', () => {
  const oud = (fps) => 0.9 ** fps;
  assert.ok(oud(30) / oud(60) > 20, 'op 30 fps bleef er ruim twintig keer zoveel over');
});
t('zonder bruikbare dt: één beeld van 60 fps, nooit NaN', () => {
  for (const dt of [0, -1, NaN, undefined, Infinity]) assert.equal(frameDecay(0.9, dt), 0.9);
});
t('de aanroepers gebruiken frameDecay', () => {
  const src = (f) => readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  assert.match(src('police.js'), /v\.speed \*= frameDecay\(0\.9, dt\)/);
  assert.match(src('police.js'), /updateRoadblocks\(world, slowDt\)/);
  assert.match(src('combat.js'), /wheelAcc \*= frameDecay\(0\.9, dt\)/);
  assert.match(src('vehicle.js'), /frameDecay\(0\.8, dt\)/);
  assert.doesNotMatch(src('police.js'), /v\.speed \*= 0\.9;/);
});
console.log(`framedecay_test: ${n} tests geslaagd`);
