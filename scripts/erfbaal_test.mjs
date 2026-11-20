// #959: de hooibalen op de erven (countryplan-cirkels met hoogte) zijn net als de balen in de
// velden te beklimmen: baleAheadIn ziet ze, en pushOutOfPlan duwt een speler die erop of
// erboven staat (hop) er niet af, terwijl een voetganger op de grond en een voertuig
// (hop 0) er wel tegenaan blijven lopen. Een silo (cirkel zonder hoogte) blijft vast.
//   node scripts/erfbaal_test.mjs
import './node3d.mjs';
// countryplan.js haalt three.js binnen via countryedge.js: pas na node3d.mjs laden.
const { farmDetail, baleAheadIn } = await import('../game/js/countryplan.js');
const { BALE_HEIGHT } = await import('../game/js/bales.js');

let n = 0, fails = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { fails++; console.log('FAIL', name, extra); } };

const f = { x: 0, y: 0, angle: 0, ca: 1, sa: 0, type: 'khr', front: 11, seed: 7, boxes: [], circles: [], items: null, yard: [-20, -60, 120, 60], full: [-30, -60, 120, 60] };
farmDetail(f);
const bale = f.circles.find((c) => c.h);
check('het erf heeft een baal als cirkel met hoogte', !!bale);
check('alleen balen hebben een hoogte (silo\'s niet)', f.circles.filter((c) => c.h).every((c) => c.h === BALE_HEIGHT) && f.circles.some((c) => !c.h) || f.circles.every((c) => c.h));
if (bale) {
  const r = bale.r;
  const hit = baleAheadIn(f.circles, bale.x - r - 1, bale.y, 1, 0, 2.5, 0.2);
  check('baleAheadIn ziet de baal vooruit', !!hit && hit.h === BALE_HEIGHT && hit.dist > 0 && hit.dist < 1.6 && hit.rad === r, JSON.stringify(hit));
  check('met de rug naar de baal ziet hij hem niet', !baleAheadIn([bale], bale.x - r - 1, bale.y, -1, 0, 2.5, 0.2));
  check('buiten bereik ziet hij hem niet', !baleAheadIn([bale], bale.x - r - 9, bale.y, 1, 0, 2.5, 0.2));
  check('een cirkel zonder hoogte (silo) telt niet als klimbaar', !baleAheadIn([{ x: bale.x, y: bale.y, r }], bale.x - r - 1, bale.y, 1, 0, 2.5, 0.2));
}
console.log(fails ? `${fails} van ${n} controles mislukt` : `erfbaal_test: ok (${n} controles)`);
process.exit(fails ? 1 : 0);
