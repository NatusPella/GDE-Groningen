// Test van de klantfiguranten en de gecombineerde interieurhaken (Bezit x Interieurs, #1102 en #1150): hoeveel er bijkomen, waar ze staan, en dat twee systemen elkaars haak niet overschrijven.
//   node scripts/interiorcustomers_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { missingCustomers, extraCustomers, combineHooks, MAX_CUSTOMER_FIGURES } from '../game/js/interiorcustomers.js';
import { CELL } from '../game/js/interiorlayout.js';
import { mulberry32 } from '../game/js/rng.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error('FAIL', name); throw e; } };
// een hal van 8 x 6 m, alles vrij en bereikbaar
const nu = Math.ceil(8 / CELL), nv = Math.ceil(6 / CELL);
const grid = { free: new Uint8Array(nu * nv).fill(1), nu, nv, H: { u0: -4, u1: 4, v0: 0, v1: 6 } };
const reach = { seen: new Uint8Array(nu * nv).fill(1) };

t('missingCustomers: gevraagd min wat er al staat, hoogstens 6, nooit negatief', () => {
  assert.equal(missingCustomers(4, []), 4);
  assert.equal(missingCustomers(4, [{ role: 'klant' }, { role: 'winkelier' }]), 3);
  assert.equal(missingCustomers(99, []), MAX_CUSTOMER_FIGURES);
  assert.equal(missingCustomers(1, [{ role: 'klant' }, { role: 'klant' }]), 0);
  assert.equal(missingCustomers(NaN, []), 0);
  assert.equal(missingCustomers(-3, []), 0);
});
t('extraCustomers: op bereikbare vloer, niet in de deuropening, 1,2 m uit elkaar en vast per seed', () => {
  const a = extraCustomers(grid, reach, [{ u: 0, v: 3 }], 5, mulberry32(7));
  assert.ok(a.length >= 3 && a.length <= 5);
  for (const c of a) {
    assert.equal(c.role, 'klant');
    assert.ok(c.v >= grid.H.v0 + 1.6 && c.u > grid.H.u0 && c.u < grid.H.u1 && c.v < grid.H.v1);
    assert.ok(Math.hypot(c.u - 0, c.v - 3) >= 1.2);
  }
  for (let i = 0; i < a.length; i++) for (let k = i + 1; k < a.length; k++) assert.ok(Math.hypot(a[i].u - a[k].u, a[i].v - a[k].v) >= 1.2);
  assert.deepEqual(extraCustomers(grid, reach, [{ u: 0, v: 3 }], 5, mulberry32(7)), a);
});
t('extraCustomers: onbereikbare cellen krijgen niemand, en zonder wens niets', () => {
  assert.deepEqual(extraCustomers(grid, { seen: new Uint8Array(nu * nv) }, [], 4, mulberry32(1)), []);
  assert.deepEqual(extraCustomers(grid, reach, [], 0, mulberry32(1)), []);
  assert.deepEqual(extraCustomers(null, reach, [], 3, mulberry32(1)), []);
});
t('combineHooks: owned = een van beide, manage en homeStyle = eerste antwoord, customers = hoogste, een fout telt als geen antwoord', () => {
  const bezit = { owned: (b) => b.id === 1, manage: (b) => (b.id === 1 ? { label: 'Beheer' } : null), customers: () => 3, homeStyle: () => null };
  const homebase = { owned: (b) => b.id === 2, homeStyle: (b) => (b.id === 2 ? { wall: 1, floor: 2, fabric: 3 } : null), customers: () => { throw new Error('stuk'); } };
  const h = combineHooks([bezit, homebase]);
  assert.equal(h.owned({ id: 1 }), true); assert.equal(h.owned({ id: 2 }), true); assert.equal(h.owned({ id: 3 }), false);
  assert.equal(h.manage({ id: 1 }).label, 'Beheer'); assert.equal(h.manage({ id: 2 }), null);
  assert.deepEqual(h.homeStyle({ id: 2 }), { wall: 1, floor: 2, fabric: 3 }); assert.equal(h.homeStyle({ id: 1 }), null);
  assert.equal(h.customers({ id: 1 }), 3);
  assert.equal(combineHooks([]).customers({}), 0);
});
t('broncontrole: interiors.js combineert de haken en leest customers', () => {
  const src = fs.readFileSync(new URL('../game/js/interiors.js', import.meta.url), 'utf8');
  assert.ok(/S\.hooks = combineHooks\(S\.sets\)/.test(src) && !/Object\.assign\(S\.hooks/.test(src));
  assert.ok(/S\.hooks\.customers\(ls\.b\)/.test(src) && /extraCustomers\(/.test(src));
});
console.log(`interiorcustomers_test: ${n} tests groen`);
