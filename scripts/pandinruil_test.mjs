// Pandjeshuis (shops.js pandSections, ammorules.js gunResale): verkopen levert nooit meer op dan kopen kost.
// De oude vaste 0,40 per patroon betaalde 248 euro voor een vol waterpistool dat 40 euro kost: een oneindige geldlus.
//   node scripts/pandinruil_test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const M = await import('../game/js/ammorules.js');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// the real stock rows from shops.js (shops.js itself needs a DOM, so the rows are read from the source)
const src = readFileSync(new URL('../game/js/shops.js', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('export const WEAPON_STOCK = ['), src.indexOf('];', src.indexOf('export const WEAPON_STOCK = [')));
const num = (row, key) => { const m = row.match(new RegExp('\\b' + key + ': (\\d+)')); return m ? +m[1] : undefined; };
const stock = block.split('\n').filter((r) => /key: '/.test(r)).map((r) => ({
  key: r.match(/key: '([a-z]+)'/)[1], gun: num(r, 'gun'), ammoPrice: num(r, 'ammoPrice'), ammo: num(r, 'ammo'), cap: num(r, 'cap'), melee: /melee: true/.test(r),
}));

// what it costs to buy the gun and fill it to `tot` rounds, pack by pack, exactly as weaponItem does
function koopKosten(w, tot) {
  let have = w.ammo, cost = w.gun;
  while (have < tot) { const winst = M.munitieWinst(have, w.ammo, w.cap); if (winst <= 0) break; cost += M.munitiePrijs(w.ammoPrice, w.ammo, winst); have += winst; }
  return cost;
}

t('de voorraad is gelezen', () => { assert.ok(stock.length >= 10, 'rijen: ' + stock.length); assert.ok(stock.some((w) => w.key === 'waterpistool')); });
t('shops.js gebruikt gunResale voor de verkoopprijs', () => { assert.match(src, /const income = gunResale\(w, n\)/); assert.match(src, /import \{[^}]*gunResale[^}]*\} from '\.\/ammorules\.js'/); });
t('gunResale bestaat', () => assert.equal(typeof M.gunResale, 'function'));
t('verkopen levert bij geen enkel wapen en geen enkele voorraad meer op dan kopen kost', () => {
  for (const w of stock) {
    if (w.melee) { assert.ok(M.gunResale(w, 1) < w.gun, w.key); continue; }
    for (let tot = w.ammo; tot <= w.cap; tot++) {
      const terug = M.gunResale(w, tot), kost = koopKosten(w, tot);
      assert.ok(terug < kost, `${w.key} met ${tot}: verkoop ${terug} tegen koop ${kost}`);
    }
  }
});
t('de gewone wapens houden hun oude inruilprijs', () => {
  const pistol = stock.find((w) => w.key === 'pistol'), uzi = stock.find((w) => w.key === 'uzi'), knuppel = stock.find((w) => w.key === 'knuppel');
  assert.equal(M.gunResale(pistol, 36), Math.round(120 * 0.3 + 36 * 0.4));
  assert.equal(M.gunResale(uzi, 600), Math.round(300 * 0.3 + 600 * 0.4));
  assert.equal(M.gunResale(knuppel, 1), Math.round(60 * 0.4));
});
t('rare invoer geeft nooit NaN of een negatief bedrag', () => {
  for (const v of [M.gunResale({ gun: 25, ammoPrice: 5, ammo: 150 }, NaN), M.gunResale({ gun: 25, ammoPrice: 5, ammo: 150 }, -5), M.gunResale({}, 10), M.gunResale(null, 10), M.gunResale({ gun: 25, ammoPrice: 5, ammo: 150 }, Infinity)]) assert.ok(Number.isFinite(v) && v >= 0, String(v));
});

// #1296: de grote blauwe tas (1 euro voor +10 pantser) wordt niet ingeruild; tien tassen leverden 60 euro op
t('vestResale bestaat en shops.js gebruikt hem', () => {
  assert.equal(typeof M.vestResale, 'function');
  assert.match(src, /vestResale\(world\.armor, bagArmor\(world\)\)/);
  assert.match(src, /world\.armorBag = bag \+ \(world\.armor - before\)/);
});
t('tien tassen opkopen en verkopen levert niets op', () => {
  let armor = 0, bag = 0, geld = 0;
  for (let i = 0; i < 10; i++) { const voor = armor; bag = Math.min(bag, armor); armor = Math.min(100, armor + 10); bag += armor - voor; geld -= 1; }
  const r = M.vestResale(armor, bag);
  geld += r.income;
  assert.ok(geld <= 0, 'winst ' + geld);
  assert.equal(r.keep, 100, 'de tassen blijven om je heen');
});
t('een echt vest houdt zijn inruilprijs, ook met tassen erbij', () => {
  assert.equal(M.vestResale(100, 0).income, 60);
  assert.equal(M.vestResale(60, 10).income, 30);
  assert.equal(M.vestResale(9, 0).income, 0);
  assert.equal(M.vestResale(30, 0).income, 18);
  assert.ok(M.vestResale(30, 0).income < 20, 'vestje kost 20');
});
t('tassen-deel nooit meer dan het pantser dat over is; rare invoer geeft geen NaN', () => {
  assert.deepEqual(M.vestResale(5, 30), { vest: 0, keep: 5, income: 0 });
  for (const r of [M.vestResale(NaN, 3), M.vestResale(50, NaN), M.vestResale(-4, -4)]) assert.ok(Number.isFinite(r.income) && r.income >= 0 && Number.isFinite(r.keep));
});

console.log(fails ? `${fails} van ${n} mislukt` : `pandinruil_test: ${n} van ${n} goed`);
process.exit(fails ? 1 : 0);
