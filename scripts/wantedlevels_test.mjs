// Pure rules of wanted per star level and bystander budget (#43, #52).
//   node scripts/wantedlevels_test.mjs
import { levelOf, chaseLayers, npcBudget, bystanderReaction } from '../game/js/wantedlevels.js';
let fails = 0, n = 0;
const ok = (c, name) => { n++; if (!c) { fails++; console.log('FAIL', name); } };
let prev = null;
for (let s = 1; s <= 5; s++) {
  const l = levelOf(s);
  if (prev) ok(l.searchRadius > prev.searchRadius && l.cooldown > prev.cooldown && l.loseAfter >= prev.loseAfter, `level ${s} harder than ${s - 1}`);
  prev = l;
}
ok(levelOf(0) === levelOf(1) && levelOf(9) === levelOf(5), 'clamped');
ok(levelOf(1).roadblockEvery === 0 && levelOf(3).roadblockEvery > 0, 'roadblocks from 3 stars');
ok(chaseLayers(1).join() === 'foot,patrol', 'layers at 1');
ok(chaseLayers(2).includes('boat') && !chaseLayers(2).includes('roadblock'), 'boat at 2, no block');
ok(chaseLayers(3).includes('roadblock') && !chaseLayers(3).includes('heli'), 'block at 3, no heli');
ok(chaseLayers(5).includes('heli'), 'heli at 5');
ok(npcBudget(0) > npcBudget(5), 'bigger chase, smaller budget');
ok(npcBudget(2, 25) < npcBudget(2, 8), 'busy frame, smaller budget');
ok(npcBudget(5, 50) >= 1, 'budget never zero');
ok(bystanderReaction({ dist: 5, unitSpeed: 20, onRoad: true }) === 'flee', 'in the path: step away');
ok(bystanderReaction({ dist: 15, unitSpeed: 20, onRoad: false, roll: 0.2 }) === 'gawk', 'beside: look');
ok(bystanderReaction({ dist: 15, unitSpeed: 20, onRoad: false, roll: 0.9 }) === null, 'most ignore');
ok(bystanderReaction({ dist: 5, unitSpeed: 2, onRoad: true }) === null, 'parked car: nothing');
ok(bystanderReaction({ dist: 40, unitSpeed: 20, onRoad: true }) === null, 'far: nothing');
console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
