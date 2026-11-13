// #838: garage en spuiterij hebben dezelfde cooldown voordat ze je sterren weer wissen.
// De kledingkast had al een eigen cooldown; dit dekt de garagekant.
//   node scripts/heatcooldown_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WANTED_CLEAR_COOLDOWN, wantedClearCooldownLeft, markWantedCleared } from '../game/js/heatcooldown.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

t('de cooldown loopt af en is standaard nul', () => {
  assert.equal(wantedClearCooldownLeft({ time: 100 }), 0);
  const w = { time: 100 };
  markWantedCleared(w);
  assert.equal(w.wantedClearAt, 100);
  assert.equal(wantedClearCooldownLeft({ time: 100, wantedClearAt: 100 }), WANTED_CLEAR_COOLDOWN);
  assert.equal(wantedClearCooldownLeft({ time: 100 + WANTED_CLEAR_COOLDOWN, wantedClearAt: 100 }), 0);
});

t('garage en spuiterij gebruiken dezelfde regel', () => {
  const g = fs.readFileSync(new URL('../game/js/garages.js', import.meta.url), 'utf8');
  const s = fs.readFileSync(new URL('../game/js/shops.js', import.meta.url), 'utf8');
  assert.match(g, /wantedClearCooldownLeft\(w\)/);
  assert.match(g, /markWantedCleared\(w\)/);
  assert.match(s, /wantedClearCooldownLeft\(world\)/);
  assert.match(s, /markWantedCleared\(world\)/);
});

console.log(`heatcooldown_test: ${n}/${n} ok`);
