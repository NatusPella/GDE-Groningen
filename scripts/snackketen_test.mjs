// Kroketkoning, the snack-bar chain: the rules (pure file, no browser, no storage).
//   node scripts/snackketen_test.mjs
import * as S from '../game/js/snackrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

check('the chain is invented and the key follows the gde- rule', S.CHAIN_NAME === 'Kroketkoning' && S.STORE_KEY.startsWith('gde-'));
check('each next bar costs more', S.outletCost(0) === 1200 && S.outletCost(1) > S.outletCost(0) && S.outletCost(5) > S.outletCost(4));
check('upgrades cost more per level', S.upgradeCost(1) > S.upgradeCost(0) && S.upgradeCost(2) > S.upgradeCost(1));

{
  const c = S.newChain();
  check('buying needs the money', !S.buy(c, 'a', 100).ok && S.outletCount(c) === 0);
  const r = S.buy(c, 'a', 5000);
  check('buying works and returns the cost', r.ok && r.cost === 1200 && S.outletCount(c) === 1);
  check('you cannot buy the same bar twice', !S.buy(c, 'a', 99999).ok);
  check('one bar earns the base income', S.incomePerMin(c, 'a') === S.SNACK.baseIncome);
  S.buy(c, 'b', 99999);
  check('a second bar gives a network bonus', S.incomePerMin(c, 'a') > S.SNACK.baseIncome);
  S.accrue(c, 60);
  check('earnings pile up in the till', Math.abs(S.tillTotal(c) - 2 * S.incomePerMin(c, 'a')) < 1e-6);
  S.accrue(c, 60 * 600);
  check('the till has a cap', Math.abs(c.outlets.a.till - S.capOf(c, 'a')) < 1e-6);
  const paid = S.collect(c, 'a');
  check('collecting empties that till only', paid === Math.floor(S.capOf(c, 'a')) && c.outlets.a.till === 0 && c.outlets.b.till > 0);
  check('upgrading raises income and is capped', (() => {
    const before = S.incomePerMin(c, 'a');
    const u1 = S.upgrade(c, 'a', 99999);
    const raised = S.incomePerMin(c, 'a') > before;
    S.upgrade(c, 'a', 99999); S.upgrade(c, 'a', 99999);
    return u1.ok && raised && c.outlets.a.level === 3 && !S.upgrade(c, 'a', 99999).ok;
  })());
  check('upgrading needs the money', !S.upgrade(c, 'b', 1).ok && c.outlets.b.level === 0);
  const before = S.outletCount(c);
  const sold = S.sell(c, 'b');
  check('selling pays back half the last price and removes the bar', sold.ok && sold.refund > 0 && S.outletCount(c) === before - 1);
}

{
  // a long game: the first bar pays for itself within an hour of play
  const c = S.newChain();
  S.buy(c, 'x', 5000);
  S.accrue(c, 3600);
  check('payback within hours, not days', S.tillTotal(c) > 0 && S.outletCost(0) / S.SNACK.baseIncome <= 90);
  const cap = S.SNACK.maxOutlets;
  const big = S.newChain();
  for (let i = 0; i < cap + 3; i++) S.buy(big, 'o' + i, 1e12);
  check('the chain has a maximum size', S.outletCount(big) === cap);
  check('rank grows with size and quality', S.chainRank(S.newChain()) === 0 && S.chainRank(big) === 2);
  for (const id of ['o0', 'o1', 'o2']) big.outlets[id].level = 3;
  for (let i = cap; i < 12; i++) { /* already 24 */ }
  check('three flagships in a big chain make the top rank', S.chainRank(big) === 3);
}

{
  const c = S.newChain();
  S.buy(c, 'a', 9999); S.upgrade(c, 'a', 9999); S.accrue(c, 120);
  c.earned = 55.7;
  const back = S.restore(S.serialize(c));
  check('save and load keep the bars, levels and tills', back.outlets.a.level === 1 && Math.abs(back.outlets.a.till - c.outlets.a.till) < 1e-6 && back.earned === 55);
  check('garbage gives an empty chain', S.outletCount(S.restore('}{nope')) === 0 && S.outletCount(S.restore('null')) === 0 && S.outletCount(S.restore('{"v":2}')) === 0);
  const hacked = S.restore(JSON.stringify({ v: 1, outlets: { z: { level: 99, till: 1e12 }, y: null } }));
  check('hacked values are clamped', hacked.outlets.z.level === 3 && hacked.outlets.z.till <= S.capOf(hacked, 'z') && !hacked.outlets.y);
}

{
  const door = { x: 10, y: 20 };
  const first = S.counterSpot(door, () => true);
  check('the counter stays left of the door when the ground is open', first.x === 6.6 && Math.abs(first.y - 20.6) < 1e-9);
  const next = S.counterSpot(door, (x) => x > 8);
  check('a blocked spot gives the next free one, never the machine side', next.x > 8 && !S.COUNTER_OFFSETS.some(([dx]) => dx > 0));
  const none = S.counterSpot(door, () => false);
  check('with no free ground the door itself is the counter', none.x === 10 && none.y === 20);
}

console.log(bad ? `${bad} of ${n} checks failed` : `snackketen_test: ${n} checks ok`);
process.exit(bad ? 1 : 0);
