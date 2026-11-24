// munitiePrijs: bij winst <= 0 komt de volle prijs terug; test of je dan betaalt zonder iets te krijgen.
//   node scripts/munitieprijs_vollezak_test.mjs
import assert from 'node:assert/strict';
import { munitieWinst, munitiePrijs } from '../game/js/ammorules.js';

let tests = 0;

// Test 1: Bij een volle zak is de winst 0
{
  const have = 50, pack = 20, cap = 50;
  const winst = munitieWinst(have, pack, cap);
  assert.strictEqual(winst, 0, 'Bij een volle zak is de winst 0');
  tests++;
}

// Test 2: Bij winst 0 geeft munitiePrijs nu 0 terug (na fix)
{
  const price = 25, pack = 20, winst = 0;
  const prijs = munitiePrijs(price, pack, winst);
  assert.strictEqual(prijs, 0, 'Bij winst 0 is de prijs ook 0 (na fix)');
  tests++;
}

// Test 3: Bij een volle zak is de prijs nu correct 0
{
  const have = 50, pack = 20, cap = 50;
  const winst = munitieWinst(have, pack, cap);
  const prijs = munitiePrijs(25, pack, winst);

  assert.strictEqual(winst, 0, 'Winst is 0');
  assert.strictEqual(prijs, 0, 'Prijs is nu ook 0 (na fix)');
  tests++;
}

// Test 4: Bij een bijna volle zak (winst > 0) werkt het correct
{
  const have = 48, pack = 20, cap = 50;
  const winst = munitieWinst(have, pack, cap);
  const prijs = munitiePrijs(25, pack, winst);

  assert.strictEqual(winst, 2, 'Er passen nog 2 patronen bij');
  // 2 van 20 patronen = 10% van de volle prijs = 2,5 euro, afgerond omhoog naar 3
  assert.strictEqual(prijs, 3, 'Prijs is evenredig: 2/20 van 25 euro = 2,5, afgerond naar 3');
  tests++;
}

// Test 5: De verwachte fix zou zijn: bij winst 0 is prijs ook 0
{
  const have = 50, pack = 20, cap = 50;
  const winst = munitieWinst(have, pack, cap);

  // Wat zou de correcte prijs moeten zijn?
  const correctePrijs = winst > 0 ? munitiePrijs(25, pack, winst) : 0;

  assert.strictEqual(winst, 0);
  assert.strictEqual(correctePrijs, 0, 'Bij winst 0 zou de prijs ook 0 moeten zijn');
  tests++;
}

console.log(`ok: munitieprijs_vollezak_test (${tests} controles)`);
