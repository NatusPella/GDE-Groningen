// Toetsnamen op een touchscreen vermijden (game/js/touchui.js, #801):
//   node scripts/touchui_test.mjs
import { isTouchUi, deviceText } from '../game/js/touchui.js';

let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };
const fake = (touch) => ({ documentElement: { classList: { contains: (c) => touch && c === 'touch-device' } } });

ok(isTouchUi(fake(true)) === true, 'touch-device wordt herkend');
ok(isTouchUi(fake(false)) === false, 'zonder touch-device geen touch-UI');
ok(isTouchUi(null) === false && isTouchUi(undefined) === false, 'zonder document geen touch-UI');
ok(isTouchUi({}) === false, 'een half document valt niet om');

ok(deviceText('Druk Esc', 'Tik op Sluiten', fake(false)) === 'Druk Esc', 'muis krijgt de toetsenbordtekst');
ok(deviceText('Druk Esc', 'Tik op Sluiten', fake(true)) === 'Tik op Sluiten', 'touch krijgt de tiktekst');
ok(deviceText('a', 'b') === 'a', 'zonder document de toetsenbordtekst (veilige standaard)');

console.log(fails ? `${fails} FAIL` : 'touchui_test ok');
process.exit(fails ? 1 : 0);
