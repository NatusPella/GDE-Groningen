// #661: de geldregel wordt alleen opnieuw geformatteerd als het bedrag verandert.
import fs from 'node:fs';
import { moneyLabel, moneyNeedsUpdate, weaponAmmoText } from '../game/js/hudmoney.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(/^€ /.test(moneyLabel(1234)) && /1[.,]234/.test(moneyLabel(1234)), 'geld met duizendtal-scheiding', moneyLabel(1234));
ok(!moneyNeedsUpdate(500, 500) && moneyNeedsUpdate(501, 500), 'alleen bij een ander afgerond bedrag');
// 300 frames met hetzelfde bedrag: één format, daarna niets
let last = null, formats = 0;
for (let f = 0; f < 300; f++) { const rounded = 500; if (moneyNeedsUpdate(rounded, last)) { last = rounded; formats++; moneyLabel(rounded); } }
ok(formats === 1, '300 frames stil geld: 1 format (was 300)', formats);
ok(weaponAmmoText('fists', undefined, new Set()) === 'geen wapen', 'vuisten');
ok(weaponAmmoText('pistol', 7, new Set()) === '7', 'ammo');
ok(weaponAmmoText('knife', undefined, new Set(['knife'])) === 'slaan', 'geen teller');
ok(weaponAmmoText('pistol', Infinity, new Set()) === '∞', 'oneindig');
console.log('#661 meting HUD: geld 1 format i.p.v. 60/s bij een gelijk bedrag; wapen-kind-elementen niet meer per frame opgezocht');
const src = fs.readFileSync(new URL('../game/js/hud_panel.js', import.meta.url), 'utf8');
ok(/moneyNeedsUpdate\(rounded, moneyRounded\)/.test(src), 'de geldregel is gecacht');
ok(!/setText\(els\.money, '€ ' \+ Math\.round/.test(src), 'geen ongecachte format meer');
ok(/weaponTextEl \|\| \(weaponTextEl = els\.weapon\.querySelector/.test(src), 'wapen-tekst wordt gecacht');
console.log(`${n - fails}/${n} hudmoney`);
process.exit(fails ? 1 : 0);
