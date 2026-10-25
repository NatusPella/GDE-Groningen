// Politie op vijf sterren (#436): meer eenheden en een pantser, zodat de
// achtervolging niet met een paar rammen of kogels voorbij is.
//   node scripts/police_tough_test.mjs
import { policeTarget, policeArmor, levelOf } from '../game/js/wantedlevels.js';

let n = 0, bad = 0;
const ok = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };

ok('vijf sterren stuurt meer dan vier eenheden', policeTarget(5) > policeTarget(4));
ok('vijf sterren stuurt minstens zeven eenheden', policeTarget(5) >= 7, String(policeTarget(5)));
ok('de eerste sterren houden hun oude aantal', [1, 2, 3, 4].every((s) => policeTarget(s) === s));
ok('vijf sterren heeft een pantser', policeArmor(5) < policeArmor(4));
ok('het pantser laat nog wel schade door', policeArmor(5) > 0.25 && policeArmor(5) < 0.8);
ok('zonder hoge wanted geen pantser', policeArmor(1) === 1 && policeArmor(2) === 1 && policeArmor(3) === 1);
ok('de zoekregels blijven oplopen', levelOf(5).searchRadius > levelOf(4).searchRadius && levelOf(5).cooldown >= levelOf(4).cooldown);
ok('onzin-sterren vallen binnen 1..5', policeTarget(0) === policeTarget(1) && policeTarget(99) === policeTarget(5));
console.log(`police_tough_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
