// Garage (UI-kritiek 22-11, #1239, #1261, #1240): de eigen auto heet nooit "Voertuig", afgeschreven staat een keer, en een tab zonder
// eigen voertuig toont geen "0".
//   node scripts/garage_naam_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { getGarageList } = await import('../game/js/ownedvehicles.js');
const { garageToestand } = await import('../game/js/garagetoestand.js');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };
const wereld = () => ({ map: { spawnZ: () => 0 }, vehicles: [], time: 0, money: 0, wanted: 0, msgs: [], addMessage() {}, player: { x: 0, y: 0, angle: 0, inVehicle: null } });

t('de Escapade heet ook zonder voertuig in de wereld Fjord Escapade', () => {
  const hero = getGarageList(wereld()).find((x) => x.id === 'hero');
  assert.equal(hero.model, 'Escapade');
  assert.equal(hero.make, 'Fjord');
  assert.notEqual(hero.label, 'Voertuig');
});
t('afgeschreven is een status, geen tweede chip', () => {
  const hero = getGarageList(wereld()).find((x) => x.id === 'hero');
  assert.equal(hero.status, 'lost');
  assert.deepEqual(garageToestand(hero), []);
});
const ui = readFileSync(new URL('../game/js/garageui.js', import.meta.url), 'utf8');
t('de kaart kleurt niet rood voor een statuslabel', () => {
  assert.ok(!/status === 'lost' \? ' ds-z-kaart--probleem'/.test(ui));
});
t('een categorietab zonder eigen voertuig toont geen 0', () => {
  assert.ok(/t\.owned \? `<small>\$\{t\.owned\}<\/small>` : ''/.test(ui));
});
t('Toon en Sorteren zijn chips', () => {
  assert.ok(/data-garage-filter/.test(ui) && /ds-z-chip ds-z-chip--selectie gar-chip" data-garage-filter/.test(ui));
  assert.ok(!/class="m-bt" data-garage-(filter|sort)/.test(ui));
});
console.log(`garage_naam_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
