// Pandjeshuis (shops.js pandSections, ammorules.js inruilWaarde): verkopen levert nooit meer op dan kopen kost.
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
t('shops.js gebruikt inruilWaarde voor de verkoopprijs', () => { assert.match(src, /const income = inruilWaarde\(w, n\)/); assert.match(src, /import \{[^}]*inruilWaarde[^}]*\} from '\.\/ammorules\.js'/); });
t('inruilWaarde bestaat', () => assert.equal(typeof M.inruilWaarde, 'function'));
t('verkopen levert bij geen enkel wapen en geen enkele voorraad meer op dan kopen kost', () => {
  for (const w of stock) {
    if (w.melee) { assert.ok(M.inruilWaarde(w, 1) < w.gun, w.key); continue; }
    for (let tot = w.ammo; tot <= w.cap; tot++) {
      const terug = M.inruilWaarde(w, tot), kost = koopKosten(w, tot);
      assert.ok(terug < kost, `${w.key} met ${tot}: verkoop ${terug} tegen koop ${kost}`);
    }
  }
});
t('de gewone wapens houden hun oude inruilprijs', () => {
  const pistol = stock.find((w) => w.key === 'pistol'), uzi = stock.find((w) => w.key === 'uzi'), knuppel = stock.find((w) => w.key === 'knuppel');
  assert.equal(M.inruilWaarde(pistol, 36), Math.round(120 * 0.3 + 36 * 0.4));
  assert.equal(M.inruilWaarde(uzi, 600), Math.round(300 * 0.3 + 600 * 0.4));
  assert.equal(M.inruilWaarde(knuppel, 1), Math.round(60 * 0.4));
});
t('rare invoer geeft nooit NaN of een negatief bedrag', () => {
  for (const v of [M.inruilWaarde({ gun: 25, ammoPrice: 5, ammo: 150 }, NaN), M.inruilWaarde({ gun: 25, ammoPrice: 5, ammo: 150 }, -5), M.inruilWaarde({}, 10), M.inruilWaarde(null, 10), M.inruilWaarde({ gun: 25, ammoPrice: 5, ammo: 150 }, Infinity)]) assert.ok(Number.isFinite(v) && v >= 0, String(v));
});

console.log(fails ? `${fails} van ${n} mislukt` : `pandinruil_test: ${n} van ${n} goed`);
process.exit(fails ? 1 : 0);
