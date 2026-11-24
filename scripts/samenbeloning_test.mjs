// De beloningskaart na een gezamenlijke activiteit (samenbeloning.js): alleen je eigen bedrag, de groepsbonus uit groepsbonus.js, wie meekeek en dat het bewaard is.
//   node scripts/samenbeloning_test.mjs
import assert from 'node:assert/strict';
import { beloningGegevens, beloningHtml } from '../game/js/samenbeloning.js';
import { groepsbonus } from '../game/js/groepsbonus.js';

let n = 0;
const t = (naam, f) => { f(); n++; console.log('ok ' + naam); };
const U = [{ slot: 1, naam: 'Iris', kleur: '#5bd6a0', vorm: 'ster', tijd: '3:12' }, { slot: 0, naam: 'Sem', kleur: '#4fb3ff', vorm: 'cirkel', tijd: '3:20' }, { slot: 2, naam: 'Tijn', kleur: '#f2b134', vorm: 'plus', tijd: '3:41' }];

t('de groepsbonus komt uit groepsbonus.js: 3 spelers is 2x, het bedrag klopt', () => {
  const g = beloningGegevens({ titel: 'Race', uitslag: U, mijnSlot: 0, basis: 180 });
  assert.equal(g.factor, groepsbonus(3)); assert.equal(g.totaal, 360); assert.equal(g.bonus, 180);
});
t('alleen jouw eigen bedrag staat op de kaart, van de anderen alleen plek en naam', () => {
  const h = beloningHtml(beloningGegevens({ titel: 'Race', uitslag: U, mijnSlot: 0, basis: 180, punten: 40 }));
  assert.match(h, /€.360/); assert.match(h, /Opgeslagen in <b>jouw<\/b> spel/); assert.match(h, /\+ 40 punten/); assert.match(h, /JIJ/);
  assert.equal((h.match(/ds-z-bon__totaal/g) || []).length, 1, 'één bon: die van jou');
});
t('wie meekeek staat in één zin en krijgt geen bon', () => {
  const g = beloningGegevens({ titel: 'Race', uitslag: U, kijkers: ['Gijs', 'Liv'], mijnSlot: 3, basis: 180 });
  assert.equal(g.meedoen, false);
  const h = beloningHtml(g);
  assert.match(h, /Gijs en Liv keken mee: geen beloning en niets verloren/); assert.doesNotMatch(h, /ds-z-bon/); assert.match(h, /Je keek mee/);
});
t('alleen spelen of één deelnemer: geen groepsbonusregel', () => {
  const h = beloningHtml(beloningGegevens({ titel: 'Hengelen', uitslag: [U[1]], mijnSlot: 0, basis: 50 }));
  assert.doesNotMatch(h, /Samen gedaan/);
});
t('namen worden ontsmet en er staat geen IP-adres of jargon op', () => {
  const h = beloningHtml(beloningGegevens({ titel: '<b>x</b>', uitslag: [{ slot: 0, naam: '<img onerror=1>', kleur: 'rood', vorm: 'ster' }], mijnSlot: 0, basis: 10 }));
  assert.doesNotMatch(h, /<img|<b>x/); assert.doesNotMatch(h, /\b\d{1,3}(\.\d{1,3}){3}\b|STUN|broker/i);
});
console.log(`samenbeloning_test: ${n} tests ok`);
