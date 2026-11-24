// Pure test van de wegtoets voor auto's (game/js/vehicle/roadfit.js, #1047): een straat langs een gevel, door een
// voetafdruk of naar een sloot past niet voor een auto; een brede weg en een brug altijd.
//   node scripts/roadfit_test.mjs
import './node3d.mjs';
const { roadClearance, roadFitsBody } = await import('../game/js/vehicle/roadfit.js');
const { canUseRoad } = await import('../game/js/vehicle/traffic.js');

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log('FAIL', m, info); } };

const box = (x0, y0, x1, y1, o = {}) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], bounds: [x0, y0, x1, y1], type: 'house', ...o });
const mapOf = (buildings, water = () => false) => ({
  _buildingVer: 1,
  buildingsNear: (x, y, r) => buildings.filter((b) => b.bounds[0] <= x + r && b.bounds[2] >= x - r && b.bounds[1] <= y + r && b.bounds[3] >= y - r),
  inWaterRaw: water,
  roadsNear: () => [],
});
const road = (pts, o = {}) => ({ pts, width: 4, cat: 'minor', type: 'service', ...o });

// een gevel 0,9 m naast de hartlijn: past niet voor een auto van 1,85 m, wel voor een fiets (die de toets niet krijgt)
const m1 = mapOf([box(0, 0.9, 40, 10)]);
const nauw = road([[0, 0], [40, 0]]);
ok(roadClearance(m1, nauw).c < 1.2, 'gevel op 0,9 m gemeten', String(roadClearance(m1, nauw).c));
ok(!roadFitsBody(m1, nauw, 1.85), 'een auto past niet langs een gevel op 0,9 m');
const ruim = road([[0, -3], [40, -3]]);
ok(roadFitsBody(m1, ruim, 1.85), 'een straat op 3,9 m van de gevel past wel');
// door een voetafdruk
const m2 = mapOf([box(10, -5, 20, 5)]);
ok(!roadFitsBody(m2, road([[0, 0], [40, 0]]), 1.85), 'een weg dwars door een gebouw past niet');
// een brede weg krijgt geen toets
ok(roadFitsBody(m2, road([[0, 0], [40, 0]], { width: 9 }), 1.85), 'een brede weg (hoofdweg) wordt niet getoetst');
// een brug of tunnel boven het straatniveau
ok(roadFitsBody(m2, road([[0, 0], [40, 0]], { bridge: true }), 1.85), 'een brug past altijd');
ok(roadFitsBody(m2, road([[0, 0], [40, 0]], { z: [6, 6] }), 1.85), 'een viaduct (z boven 3,5 m) past altijd');
// water midden op de weg
const m3 = mapOf([], (x) => x > 15 && x < 25);
ok(!roadFitsBody(m3, road([[0, 0], [40, 0]]), 1.85), 'een weg door open water past niet');
ok(roadFitsBody(m3, road([[0, 0], [40, 0]], { bridge: true }), 1.85), 'dezelfde weg als brug wel');
// een uiteinde aan het water
const m4 = mapOf([], (x) => x < -2);
const eind = road([[0, 0], [40, 0]]);
ok(roadClearance(m4, eind).endWet === 1, 'begin van de weg ligt aan het water', String(roadClearance(m4, eind).endWet));
// de uitkomst onthouden en vernieuwen bij een nieuw gebouw (_buildingVer)
const m5 = mapOf([]);
const r5 = road([[0, 0], [40, 0]]);
ok(roadFitsBody(m5, r5, 1.85), 'vrij zonder gebouwen');
ok(roadClearance(m5, r5) === r5._fit, 'het resultaat staat op de weg');
m5.buildingsNear = mapOf([box(0, 0.8, 40, 9)]).buildingsNear;
ok(roadFitsBody(m5, r5, 1.85), 'zonder nieuwe versie blijft het onthouden resultaat');
m5._buildingVer = 2;
ok(!roadFitsBody(m5, r5, 1.85), 'met een nieuwe gebouwversie wordt de toets herhaald');
// water dat later binnenkomt (tegels stromen): een nieuwe _waterVer haalt de verouderde wet/endWet weg, zonder de gebouwenlus
let waterX = -1e9;
const m6 = mapOf([], (x) => x > waterX && x < waterX + 10);
let calls = 0;
const bn = m6.buildingsNear;
m6.buildingsNear = (...a) => { calls++; return bn(...a); };
const r6 = road([[0, 0], [40, 0]]);
ok(roadFitsBody(m6, r6, 1.85), 'zonder water past de weg');
waterX = 15;
ok(roadFitsBody(m6, r6, 1.85), 'zonder nieuwe waterversie blijft de uitkomst (onthouden)');
m6._waterVer = 1;
const nCalls = calls;
ok(!roadFitsBody(m6, r6, 1.85), 'met een nieuwe waterversie komt het water in de uitkomst');
ok(calls === nCalls, 'de herberekening raakt de gebouwenlus niet', `${calls - nCalls} aanroepen`);
waterX = -1e9; m6._waterVer = 2;
ok(roadFitsBody(m6, r6, 1.85), 'en het water dat weer weg is, ook');
// kosten van het water-deel (node, synthetisch): een weg van 240 m
{
  const lang = road([[0, 0], [240, 0]]);
  const m7 = mapOf([]);
  roadClearance(m7, lang);
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 2000; i++) { m7._waterVer = i + 1; roadClearance(m7, lang); }
  const us = Number(process.hrtime.bigint() - t0) / 2000 / 1000;
  console.log(`roadfit water-deel: ${us.toFixed(1)} us per weg van 240 m`);
  ok(us < 300, 'het water-deel blijft goedkoop', String(us));
}
// canUseRoad: kleine voertuigen worden niet getoetst, auto's wel
ok(canUseRoad({ isBike: true, model: { wid: 0.6 } }, nauw, m1), 'een fiets mag door de smalle straat');
ok(!canUseRoad({ model: { wid: 1.85 } }, nauw, m1), 'een auto niet');
// (de ruime straat loopt door tot voorbij de gevel: een doodlopend einde naast de gevel is een andere toets, zie hieronder)
const ruimDoor = road([[-20, -3], [60, -3]]);
ok(canUseRoad({ model: { wid: 1.85 } }, ruimDoor, m1), 'een auto wel door de ruime straat');
// #1049: een doodlopend einde met de gevel binnen een autolengte plus 2 m: daar keert een auto niet zonder te schaven
ok(roadClearance(m1, ruim).endRoom[0] < 4, 'ruimte om te keren aan het begin gemeten', String(roadClearance(m1, ruim).endRoom));
ok(!canUseRoad({ model: { wid: 1.85, len: 4.4 } }, ruim, m1), 'een auto niet in een doodlopend einde naast de gevel');
const mKop = mapOf([box(40, -10, 60, 10)]); // een pand dwars voor het einde, 5 m verder
const kop = road([[0, 0], [35, 0]]);
ok(!canUseRoad({ model: { wid: 1.85, len: 4.4 } }, kop, mKop), 'een auto niet in een doodlopend einde met een pand op 5 m');
const verKop = road([[0, 0], [30, 0]]); // het pand op 10 m: genoeg ruimte om te keren
ok(canUseRoad({ model: { wid: 1.85, len: 4.4 } }, verKop, mKop), 'wel als het pand 10 m verder staat');
console.log(`roadfit_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
