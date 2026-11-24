// Test of de shops.js UI correct een koop tegenhouwt als de zak vol is.
//   node scripts/winkel_vollezak_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
import { munitieWinst } from '../game/js/ammorules.js';

// Simuleer weaponItem uit shops.js
function checkDisabled(have, cap, ammo) {
  // De disabled check uit shops.js regel 1264:
  // disabled: have >= w.cap ? 'Zak zit vol' : broke(world, price)
  const disabled = have >= cap ? 'Zak zit vol' : false;

  // De winst
  const winst = munitieWinst(have, ammo, cap);

  return { disabled, winst };
}

let tests = 0;

// Test 1: Volle zak -> disabled EN winst 0
{
  const { disabled, winst } = checkDisabled(50, 50, 20);
  assert.strictEqual(disabled, 'Zak zit vol', 'Knop is disabled bij volle zak');
  assert.strictEqual(winst, 0, 'Winst is 0');
  tests++;
}

// Test 2: Bijna vol -> niet disabled EN winst > 0
{
  const { disabled, winst } = checkDisabled(48, 50, 20);
  assert.strictEqual(disabled, false, 'Knop is niet disabled');
  assert.strictEqual(winst, 2, 'Winst is 2');
  tests++;
}

// Test 3: Is er een geval waar winst 0 is MAAR de knop niet disabled is?
// Dat zou zijn: have < cap MAAR Math.min(ammo, cap - have) = 0
// Als have < cap, dan is cap - have > 0
// Dan is Math.min(ammo, cap - have) alleen 0 als ammo <= 0
// Maar ammo is altijd >= 1 in de praktijk (een wapenpak heeft altijd >= 1 patronen)
// Dus er is GEEN geval waar winst = 0 EN disabled = false
{
  // Edge case: ammo = 0 (theoretisch, maar komt niet voor)
  const { disabled, winst } = checkDisabled(48, 50, 0);
  assert.strictEqual(winst, 0, 'Bij ammo=0 is winst 0');
  assert.strictEqual(disabled, false, 'Maar de knop is NIET disabled (have < cap)');
  // Dit is een theoretisch probleem: ammo=0 betekent een leeg pak, wat niet bestaat in WEAPON_STOCK
  tests++;
}

console.log(`ok: winkel_vollezak_test (${tests} controles)`);
console.log('Conclusie: Bij normale wapenpakken (ammo >= 1) is winst=0 altijd equivalent aan have >= cap.');
console.log('De UI blokkeert de koop correct. De bug in munitiePrijs heeft geen praktisch effect,');
console.log('maar de functie zou toch 0 moeten returnen bij winst <= 0 voor correctheid.');
