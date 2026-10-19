// Wolkenlaag (#194, #195): aantal en tint volgen het weer en het uur.
import { cloudState, cloudSpots, CLOUD_COUNT } from '../game/js/cloudlook.js';
let fail = 0;
const check = (n, ok, x = '') => { if (!ok) { fail++; console.log('FAIL', n, x); } };

const helder = cloudState({ intensity: 0, overcast: 0, mist: 0 }, 1, 0);
const bewolkt = cloudState({ intensity: 0, overcast: 0.7, mist: 0 }, 1, 0);
const onweer = cloudState({ intensity: 0.85, overcast: 1, mist: 0.1 }, 1, 0);
const nacht = cloudState({ intensity: 0, overcast: 0.7, mist: 0 }, 0, 1);
check('helder heeft een paar wolkjes', helder.count >= 3 && helder.count <= 6, helder.count);
check('bewolkt heeft veel meer wolken', bewolkt.count > helder.count + 8, bewolkt.count);
check('onweer vult de lucht', onweer.count === CLOUD_COUNT, onweer.count);
check('onweer is donkerder dan helder', onweer.tint[0] < helder.tint[0] - 0.2);
check('nacht is donkerder dan dag', nacht.tint[1] < bewolkt.tint[1] * 0.4);
check('nacht blijft doorzichtig genoeg', nacht.opacity < bewolkt.opacity);
check('geen weer geeft geen fout', cloudState(null).count >= 3);
check('waarden binnen 0..1', [...onweer.tint, onweer.opacity, nacht.opacity].every((v) => v >= 0 && v <= 1));
const a = cloudSpots(), b = cloudSpots();
check('plekken zijn vast', JSON.stringify(a) === JSON.stringify(b) && a.length === CLOUD_COUNT);
check('elke wolk heeft een blob', a.every((c) => c.blobs >= 3 && c.size > 0));
console.log(fail ? `cloudlook_test: ${fail} fout` : 'cloudlook_test ok');
process.exit(fail ? 1 : 0);
