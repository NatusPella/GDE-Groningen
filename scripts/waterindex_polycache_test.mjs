// #1089: "idx.inWater is not a function". waterindex.js bewaarde de index van een gestroomde waterrij op `poly._wi`,
// maar dat is de bouw-id (een getal) van mapdata.js: een rij met id > 0 gaf dat getal terug als index.
//   node scripts/waterindex_polycache_test.mjs
import './node3d.mjs';
globalThis.requestAnimationFrame = (f) => setImmediate(f);
const WI = await import('../game/js/waterindex.js');
const R = await import('../game/js/routing.js');
let n = 0, fails = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FAIL ' + m); } };
const rect = (x0, y0, x1, y1, extra = {}) => ({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], bounds: [x0, y0, x1, y1], ...extra });
const stat = rect(0, 0, 100, 40, { _wi: 0 });
const tegel = rect(300, 0, 340, 40, { _wi: 7, tile: true });
const rows = [stat, tegel];
const map = { water: rows, waterNear: (x, y, r) => rows.filter((p) => p.bounds[2] >= x - r && p.bounds[0] <= x + r), roadsNear: () => [], isOnBridge: () => false, coveredAt: () => false };
// 1. de index van een rij met bouw-id > 0 is een echte index, en het bouw-id blijft een getal
const idx = WI.getWaterIndex(map, tegel);
ok(idx && typeof idx.inWater === 'function', 'index van rij met _wi 7 heeft inWater');
ok(tegel._wi === 7, 'de bouw-id _wi blijft ongemoeid');
ok(idx.inWater(320, 20) === true && idx.inWater(10, 20) === false, 'de index telt alleen zijn eigen water');
ok(WI.getWaterIndex(map, tegel) === idx, 'tweede vraag geeft dezelfde (gecachete) index');
// 2. een vervuilde cache (getal) wordt genegeerd en herbouwd
tegel._polyIndex = 7;
ok(typeof WI.getWaterIndex(map, tegel).inWater === 'function', 'vervuilde cache wordt herbouwd');
// 3. routing met en zonder index: nooit een fout
let threw = false;
try { R.planBoatRoute(map, { x: 20, y: 20 }, { x: 80, y: 20 }); } catch (e) { threw = String(e && e.message); }
ok(!threw, 'planBoatRoute met index: ' + threw);
for (const kapot of [undefined, null, 7, {}]) {
  const m2 = { ...map };
  m2._waterIndex = kapot; m2._waterIndexSeen = 0;
  delete m2._boatCtx;
  threw = false;
  try { R.planBoatRoute(m2, { x: 20, y: 20 }, { x: 80, y: 20 }); } catch (e) { threw = String(e && e.message); }
  ok(!threw, 'planBoatRoute met index ' + String(kapot) + ': ' + threw);
}
console.log(fails ? `${fails} van ${n} FOUT` : `${n} ok`);
process.exit(fails ? 1 : 0);
