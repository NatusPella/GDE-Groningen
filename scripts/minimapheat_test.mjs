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
// Review 0.63: ook bij precies één eenheid hoort de heat-ring om het schild; stippen pas bij meer.
const een = H.policeBadge(1, 3);
ok(een && een.ring.sterren === 3 && een.dots === 0, 'één politie-eenheid krijgt de heat-ring en geen stip');
ok(een.ring.segmenten.filter((s) => s.aan).length === 3, 'de ring bij één eenheid toont de warmte');
const twee = H.policeBadge(2, 0);
ok(twee && twee.ring.sterren === 0 && twee.dots === 1, 'twee eenheden: koude ring plus één stip');
ok(H.policeBadge(0, 5) === null && H.policeBadge(-1, 5) === null, 'zonder politie in beeld geen badge');
ok(H.policeBadge(9, 9).dots === H.UNIT_DOTS, 'het aantal stippen blijft begrensd');
ok(H.heatUitleg(0, 0) === '', 'geen politie, geen tekst');
ok(/2 politie-eenheden/.test(H.heatUitleg(2, 2)) && /2 van 5/.test(H.heatUitleg(2, 2)), 'de uitleg noemt eenheden en heat');
ok(!/van 5|sterren|niet gezocht/.test(H.heatUitleg(0, 1)) && /1 politie-eenheid in beeld/.test(H.heatUitleg(0, 1)) && /zoeken je/.test(H.heatUitleg(3, 1, { searching: true })), 'de uitleg zegt koud of zoekend');
ok(!/\d{1,2}(?! van)/.test(H.heatUitleg(0, 1).replace('1 politie', '')), 'geen los cijfer als heat');

ok(H.heatTooltip(0, 0) === '', 'zonder politie en zonder ster geen tooltip');
ok(/3 van 5/.test(H.heatTooltip(3, 0)) && !/segment/.test(H.heatTooltip(3, 0)), 'gezocht zonder politie in beeld: alleen de ster in de tooltip, geen ringlegenda');
ok(!/0 van 5/.test(H.heatTooltip(0, 2)), 'bij 0 sterren leest niets "0 van 5" voor');
const tip = H.heatTooltip(3, 2, { searching: true });
ok(/3 van 5 sterren/.test(tip) && /2 politie-eenheden/.test(tip) && /segment is een ster/.test(tip) && /stippen/.test(tip), 'de tooltip noemt de stand en legt ring en stippen uit');
ok(!/(police|wanted|heat)/i.test(tip), 'de tooltip is Nederlands, zonder Engelse rolwoorden');

// de chip met icoon en getal (#952)
ok(H.heatChip(0, 0) === null, '0 sterren en 0 eenheden: geen chip');
const chip = H.heatChip(3, 2, { searching: true });
ok(chip && chip.eenhedenTekst === '2' && chip.sterTekst === '3/5' && chip.searching, 'de chip toont eenheden en sterren als getal');
ok(H.heatChip(9, 1).sterTekst === '5/5', 'sterren in de chip blijven binnen 0 tot 5');
const koudChip = H.heatChip(0, 2);
ok(koudChip.toonEenheden && koudChip.eenhedenTekst === '2' && !koudChip.toonSter && koudChip.sterTekst === '' && !/0\/5/.test(JSON.stringify(koudChip)), '0 sterren + 2 eenheden: alleen het schild met 2, geen 0/5');
ok(chip.toonEenheden && chip.toonSter, '3 sterren + 2 eenheden: schild 2 en ster 3/5');
const zoek = H.heatChip(3, 0);
ok(zoek && !zoek.toonEenheden && zoek.toonSter && zoek.sterTekst === '3/5', 'gezocht maar niemand in beeld: alleen het ster-deel');
const eenChip = H.heatChip(1, 0);
ok(eenChip.toonSter && !eenChip.toonEenheden && eenChip.sterTekst === '1/5', '1 ster zonder eenheden: alleen het ster-deel');
ok(chip.uitleg === H.heatTooltip(3, 2, { searching: true }) && /segment is een ster/.test(chip.uitleg), 'de chip heeft de uitleg als tooltip');
ok(H.CHIP_MIN_PX >= 13, 'de chip is minstens 13 px');

console.log(fails ? `${fails} of ${n} failed` : `minimapheat_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
