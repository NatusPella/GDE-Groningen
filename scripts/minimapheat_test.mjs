// De heat-ring bij de politie op de mini-map (#952): geen kaal cijfer meer, maar een
// ring met een segment per ster en stippen voor extra eenheden.
//   node scripts/minimapheat_test.mjs
import * as H from '../game/js/minimapheat.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };

const koud = H.heatRing(0);
ok(koud.sterren === 0 && koud.kleur === 'policeBlue' && koud.segmenten.every((s) => !s.aan), 'zonder heat een blauwe, lege ring');
ok(koud.segmenten.length === H.HEAT_MAX && koud.segmenten.every((s) => s.tot > s.van), 'vijf segmenten met een kier ertussen');
const heet = H.heatRing(3);
ok(heet.sterren === 3 && heet.kleur === 'red' && heet.segmenten.filter((s) => s.aan).length === 3, 'drie van vijf segmenten rood');
ok(heet.alpha > koud.alpha, 'heter is feller');
ok(H.heatRing(9).sterren === H.HEAT_MAX && H.heatRing(-2).sterren === 0, 'buiten bereik wordt netjes afgekapt');
ok(H.heatRing(2, { searching: true, time: 0 }).alpha !== H.heatRing(2, { searching: true, time: 0.4 }).alpha, 'zoeken laat de ring ademen');
ok(H.heatRing(0, { searching: true }).searching === false, 'zonder sterren geen zoek-puls');
const seg = H.heatRing(1).segmenten;
ok(seg.every((s, i) => i === 0 || s.van > seg[i - 1].tot), 'de segmenten lopen netjes rond');

ok(H.unitDots(0) === 0 && H.unitDots(1) === 0 && H.unitDots(2) === 1 && H.unitDots(9) === H.UNIT_DOTS, 'eenheden als stippen, nooit als cijfer');
ok(H.heatUitleg(0, 0) === '', 'geen politie, geen tekst');
ok(/2 politie-eenheden/.test(H.heatUitleg(2, 2)) && /2 van 5/.test(H.heatUitleg(2, 2)), 'de uitleg noemt eenheden en heat');
ok(/niet gezocht/.test(H.heatUitleg(0, 1)) && /zoeken je/.test(H.heatUitleg(3, 1, { searching: true })), 'de uitleg zegt koud of zoekend');
ok(!/\d{1,2}(?! van)/.test(H.heatUitleg(0, 1).replace('1 politie', '')), 'geen los cijfer als heat');

console.log(fails ? `${fails} of ${n} failed` : `minimapheat_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
