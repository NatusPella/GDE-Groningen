// Kroketkoning: the rules of the snack-bar chain you can build across the
// province (pure, no DOM, no THREE, no storage; node-tested in
// scripts/snackketen_test.mjs). Kroketkoning is an invented chain. You buy
// snack bars one by one, upgrade them, and they earn while you play; the
// earnings pile up in the till (up to a cap) until you collect them in person.
// The game file (snackketen.js) ties this to the real snack bars on the map and
// keeps the chain in the browser storage under `gde-snackketen-v1`.
export const CHAIN_NAME = 'Kroketkoning';
export const STORE_KEY = 'gde-snackketen-v1';

export const SNACK = {
  baseCost: 1200, costGrowth: 1.4, maxOutlets: 24,
  baseIncome: 20, // euro per minute of play per outlet
  maxLevel: 3, levelBoost: 0.6, upgradeBase: 800, upgradeGrowth: 1.9,
  networkBonus: 0.08, // per other outlet: bulk-buying fat and fame
  capMinutes: 12, // the till holds this many minutes of earnings
  sellBack: 0.5,
};

export const newChain = () => ({ outlets: {}, earned: 0, spent: 0 });
export const outletCount = (c) => Object.keys(c.outlets).length;

export const outletCost = (count) => Math.round(SNACK.baseCost * Math.pow(SNACK.costGrowth, count) / 10) * 10;
export const upgradeCost = (level) => Math.round(SNACK.upgradeBase * Math.pow(SNACK.upgradeGrowth, level) / 10) * 10;
export const LEVEL_NAMES = ['Loket', 'Frituur', 'Snackrestaurant', 'Vlaggenschip'];

export function incomePerMin(c, id) {
  const o = c.outlets[id];
  if (!o) return 0;
  const net = 1 + SNACK.networkBonus * (outletCount(c) - 1);
  return SNACK.baseIncome * (1 + SNACK.levelBoost * o.level) * net;
}
export const capOf = (c, id) => incomePerMin(c, id) * SNACK.capMinutes;
export const tillTotal = (c) => Object.values(c.outlets).reduce((a, o) => a + o.till, 0);
export const totalIncomePerMin = (c) => Object.keys(c.outlets).reduce((a, id) => a + incomePerMin(c, id), 0);

// seconds of play pass
export function accrue(c, seconds) {
  for (const id of Object.keys(c.outlets)) {
    const o = c.outlets[id];
    o.till = Math.min(capOf(c, id), o.till + incomePerMin(c, id) * seconds / 60);
  }
}

// Each returns { ok, cost?, why? }; the caller moves the money.
export function buy(c, id, money) {
  if (c.outlets[id]) return { ok: false, why: 'Deze snackbar is al van jou' };
  if (outletCount(c) >= SNACK.maxOutlets) return { ok: false, why: 'Meer vestigingen kan de provincie niet aan' };
  const cost = outletCost(outletCount(c));
  if (money < cost) return { ok: false, why: 'Te weinig geld', cost };
  c.outlets[id] = { level: 0, till: 0 };
  c.spent += cost;
  return { ok: true, cost };
}

export function upgrade(c, id, money) {
  const o = c.outlets[id];
  if (!o) return { ok: false, why: 'Geen vestiging' };
  if (o.level >= SNACK.maxLevel) return { ok: false, why: 'Al een vlaggenschip' };
  const cost = upgradeCost(o.level);
  if (money < cost) return { ok: false, why: 'Te weinig geld', cost };
  o.level++;
  c.spent += cost;
  return { ok: true, cost };
}

// Empty one till (or all of them with id null); returns the euros.
export function collect(c, id = null) {
  let sum = 0;
  for (const k of id ? [id] : Object.keys(c.outlets)) {
    const o = c.outlets[k];
    if (!o) continue;
    sum += o.till;
    o.till = 0;
  }
  const euros = Math.floor(sum);
  c.earned += euros;
  return euros;
}

// Sell a bar back for half of what the last one cost.
export function sell(c, id) {
  if (!c.outlets[id]) return { ok: false, why: 'Geen vestiging' };
  const refund = Math.floor(outletCost(outletCount(c) - 1) * SNACK.sellBack) + Math.floor(c.outlets[id].till);
  delete c.outlets[id];
  return { ok: true, refund };
}

export const chainName = (n) => (n >= 12 ? 'Kroketkoning-rijk' : n >= 5 ? 'Kroketkoning-keten' : n >= 1 ? 'Kroketkoning' : 'geen keten');
// Prestige stage 0..3 from the size and quality of the chain
export function chainRank(c) {
  const n = outletCount(c), flag = Object.values(c.outlets).filter((o) => o.level >= SNACK.maxLevel).length;
  return flag >= 3 && n >= 12 ? 3 : n >= 8 ? 2 : n >= 3 ? 1 : 0;
}

export function serialize(c) {
  return JSON.stringify({ v: 1, outlets: c.outlets, earned: Math.floor(c.earned), spent: Math.floor(c.spent) });
}

// Never throws: a broken or old save gives an empty chain, and bad entries are dropped.
export function restore(text) {
  const c = newChain();
  try {
    const d = JSON.parse(text);
    if (!d || d.v !== 1 || typeof d.outlets !== 'object') return c;
    for (const [id, o] of Object.entries(d.outlets)) {
      if (!o || typeof id !== 'string' || outletCount(c) >= SNACK.maxOutlets) continue;
      const level = Math.max(0, Math.min(SNACK.maxLevel, Math.floor(Number(o.level) || 0)));
      c.outlets[id] = { level, till: 0 };
      c.outlets[id].till = Math.max(0, Math.min(Number(o.till) || 0, 1e6));
    }
    c.earned = Math.max(0, Number(d.earned) || 0);
    c.spent = Math.max(0, Number(d.spent) || 0);
    for (const id of Object.keys(c.outlets)) c.outlets[id].till = Math.min(c.outlets[id].till, capOf(c, id));
  } catch (e) { /* empty chain */ }
  return c;
}
