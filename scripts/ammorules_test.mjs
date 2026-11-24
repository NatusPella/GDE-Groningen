// Munitie en wapenwissel (ammorules.js): echte winst, evenredige prijs, wiel zonder lege wapens, terugval na het laatste stuk.
//   node scripts/ammorules_test.mjs
import assert from 'node:assert/strict';
const M = await import('../game/js/ammorules.js');
let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

t('winst: een pak past niet altijd', () => {
  assert.equal(M.munitieWinst(0, 36, 250), 36);
  assert.equal(M.munitieWinst(240, 36, 250), 10);
  assert.equal(M.munitieWinst(250, 36, 250), 0);
  assert.equal(M.munitieWinst(300, 36, 250), 0, 'boven het plafond (oude save) geeft nooit negatief');
  assert.equal(M.munitieWinst(undefined, 12, 80), 12);
  assert.equal(M.munitieWinst(5, NaN, 80), 0);
  assert.equal(M.munitieWinst(Infinity, 12, 80), 12, 'Infinity telt als niets (oneindig is geen voorraad)');
});
t('prijs: heel pak vol, deel evenredig, minstens 1, nooit meer dan vol', () => {
  assert.equal(M.munitiePrijs(25, 36, 36), 25);
  assert.equal(M.munitiePrijs(25, 36, 10), 7);
  assert.equal(M.munitiePrijs(25, 36, 1), 1);
  assert.equal(M.munitiePrijs(25, 36, 0), 0, 'zonder winst is de prijs ook 0 (#1285)');
  assert.equal(M.munitiePrijs(0, 36, 10), 0);
  for (let w = 1; w <= 36; w++) { const p = M.munitiePrijs(25, 36, w); assert.ok(p >= 1 && p <= 25, `w=${w} p=${p}`); }
  for (let w = 1; w < 36; w++) assert.ok(M.munitiePrijs(25, 36, w) <= M.munitiePrijs(25, 36, w + 1), 'monotoon');
});
const keys = ['fists', 'knuppel', 'pistol', 'uzi', 'carbidbus'];
const heeft = (own) => (k) => own.includes(k);
const patroon = (m) => (k) => k === 'fists' || (m[k] || 0) > 0;
t('wiel slaat lege wapens over maar houdt het wapen in je hand', () => {
  const own = ['fists', 'knuppel', 'pistol', 'carbidbus'];
  const l = M.wielWapens(keys, heeft(own), patroon({ knuppel: 1, pistol: 0, carbidbus: 0 }), 'pistol');
  assert.deepEqual(l, ['fists', 'knuppel', 'pistol'], 'het lege wapen in de hand blijft bereikbaar zodat het wiel er weg kan');
  const l2 = M.wielWapens(keys, heeft(own), patroon({ knuppel: 1, pistol: 0, carbidbus: 0 }), 'fists');
  assert.deepEqual(l2, ['fists', 'knuppel']);
  assert.deepEqual(M.wielWapens(keys, heeft(['fists']), patroon({}), 'fists'), ['fists']);
});
t('terugval: voorkeur, dan eerste met patronen, anders vuisten', () => {
  const own = ['fists', 'knuppel', 'pistol', 'carbidbus'];
  assert.equal(M.terugvalWapen(keys, heeft(own), patroon({ knuppel: 1, pistol: 5 }), 'carbidbus', ['pistol']), 'pistol');
  assert.equal(M.terugvalWapen(keys, heeft(own), patroon({ knuppel: 1, pistol: 5 }), 'carbidbus'), 'knuppel');
  assert.equal(M.terugvalWapen(keys, heeft(own), patroon({}), 'carbidbus'), 'fists');
  assert.equal(M.terugvalWapen(keys, heeft(['fists']), patroon({}), 'fists'), 'fists');
});
console.log(`${n - fails}/${n} ammorules`);
process.exit(fails ? 1 : 0);
