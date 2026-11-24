// Pure rules of wanted per star level and bystander budget (#43, #52).
//   node scripts/wantedlevels_test.mjs
import { levelOf, cooldownOf, zoekTeller, chaseLayers, npcBudget, bystanderReaction, isInterceptorSlot, INTERCEPTOR } from '../game/js/wantedlevels.js';
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
{
  let bad2 = 0; const c = (cond, m) => { if (!cond) { bad2++; console.log('FAIL', m); } };
  c(chaseLayers(3).includes('interceptor') && !chaseLayers(2).includes('interceptor'), 'interceptor vanaf 3 sterren');
  c([0, 1, 2, 3, 4, 5].filter((s) => isInterceptorSlot(4, s)).join() === '2,5', 'elke derde patrouille is een interceptor');
  c(![0, 1, 2, 3, 4, 5].some((s) => isInterceptorSlot(2, s)), 'onder 3 sterren geen interceptors');
  c(INTERCEPTOR.boost > 1 && INTERCEPTOR.boost < 1.3, 'boost is bescheiden');
  if (bad2) process.exitCode = 1; else console.log('interceptor ok');
}
{
  // #989: de zoektocht als teller: rest en totaal in seconden, buiten de cirkel gemarkeerd; lege invoer geeft geen NaN
  let bad3 = 0; const c = (cond, m) => { if (!cond) { bad3++; console.log('FAIL', m); } };
  const tot = cooldownOf(levelOf(2));
  const z = zoekTeller(2, 3, 10, 50);
  c(z.totaal === tot && Math.abs(z.rest - (tot - 3)) < 1e-9 && z.buiten === false, 'teller: rest is de cooldown min de klok, binnen de cirkel');
  c(zoekTeller(2, 3, 80, 50).buiten === true, 'teller: buiten de cirkel');
  c(zoekTeller(2, tot + 5, 0, 50).rest === 0, 'teller: nooit onder nul');
  const leeg = zoekTeller(undefined, undefined, undefined, undefined);
  c(Number.isFinite(leeg.rest) && Number.isFinite(leeg.totaal) && leeg.totaal === cooldownOf(levelOf(1)), 'teller: lege invoer valt terug op een ster, zonder NaN');
  const hud = (await import('node:fs')).readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
  c(/maakWidget\('teller', els\.objRegel, \{ eenheid: 's', label: 'Tot een ster minder' \}\)/.test(hud), 'HUD: de zoektocht staat als tellerwidget onder de doelregel');
  c(!/\$\{rest\}s uit het zicht voor een ster minder/.test(hud), 'HUD: de seconden staan niet meer in de zin');
  if (bad3) process.exitCode = 1; else console.log('zoekteller ok');
}
process.exit(fails ? 1 : process.exitCode || 0);
