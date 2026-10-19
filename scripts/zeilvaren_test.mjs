// Zeilvaren in de open wereld (zeilvaren.js, #197) en de nieuwe bootsoorten.
//   node scripts/zeilvaren_test.mjs
import * as Z from '../game/js/zeilvaren.js';
import { BOAT_KINDS, boatIsMotorised, boatKind } from '../game/js/boattypes.js';
import { windHoek } from '../game/js/zeilrules.js';

let bad = 0, n = 0;
const check = (name, ok, info = '') => { n++; if (!ok) { bad++; console.log('FAIL', name, info); } };

const wind = { dir: 0, speed: 7 }; // waait uit +x
check('recht in de wind: geen snelheid', Z.windSnelheid(0, 0.6, wind) < 0.3, Z.windSnelheid(0, 0.6, wind));
check('voor de wind sneller dan in de wind', Z.windSnelheid(Math.PI, 0.6, wind) > Z.windSnelheid(0.2, 0.6, wind));
const half = Math.PI / 2;
check('halve wind met goede schoot is snel', Z.windSnelheid(half, 0.5, wind) > 2.5, Z.windSnelheid(half, 0.5, wind));
check('stille lucht geeft minder vaart', Z.windSnelheid(half, 0.5, { dir: 0, speed: 2 }) < Z.windSnelheid(half, 0.5, wind));

const v = { angle: half, speed: 0 };
for (let i = 0; i < 300; i++) Z.zeilStap(v, wind, { trim: 0 }, 0.1);
check('boot versnelt tot sailTop', Math.abs(v.speed - v.sailTop) < 0.01 && v.sailTop > 2, JSON.stringify(v));
const t0 = v.zeilTrim;
Z.zeilStap(v, wind, { trim: 1 }, 1);
check('zeil aanhalen verhoogt de trim', v.zeilTrim > t0 && v.zeilTrim <= 1);
for (let i = 0; i < 40; i++) Z.zeilStap(v, wind, { trim: -1 }, 0.1);
check('trim blijft tussen 0 en 1', v.zeilTrim >= 0 && v.zeilTrim <= 1);

check('zeilboot is niet gemotoriseerd', !boatIsMotorised({ model: BOAT_KINDS.zeilboot }));
check('roeiboot is niet gemotoriseerd', !boatIsMotorised({ model: BOAT_KINDS.roeiboot }));
check('sloep nog wel', boatIsMotorised({ model: BOAT_KINDS.sloep }));
check('rompen bestaan', boatKind({ model: BOAT_KINDS.zeilboot }) === 'dinghy' && boatKind({ model: BOAT_KINDS.roeiboot }) === 'skiff');
check('windHoek bruikbaar', Number.isFinite(windHoek(1, wind)));

check('windpijl: wind van voren wijst achterwaarts', Math.abs(Z.windPijlGraden(0)) === 180);
check('windpijl: wind van achteren wijst vooruit', Math.abs(Z.windPijlGraden(Math.PI)) < 1e-9);

console.log(`zeilvaren_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
