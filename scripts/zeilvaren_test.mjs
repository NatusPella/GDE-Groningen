// Zeilvaren in de open wereld (zeilvaren.js, #197) en de nieuwe bootsoorten.
//   node scripts/zeilvaren_test.mjs
import * as Z from '../game/js/zeilvaren.js';
import { BOAT_KINDS, boatIsMotorised, boatKind } from '../game/js/boattypes.js';
import { windHoek, BOOT_SOORTEN } from '../game/js/zeilrules.js';

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

{
  const storm = { dir: 0, speed: 9 };
  const k = { angle: Math.PI / 2, speed: 3, zeilTrim: 1 }; // dwars op de wind, zeil strak
  let omgeslagen = false;
  for (let i = 0; i < 60 && !omgeslagen; i++) { Z.zeilStap(k, storm, { trim: 1 }, 0.1); omgeslagen = k.omgeslagen > 0; }
  check('storm + strak zeil: omgeslagen', omgeslagen && k.apart === 1);
  const sp = k.speed;
  for (let i = 0; i < 10; i++) Z.zeilStap(k, storm, { trim: 0 }, 0.1);
  check('omgeslagen: boot remt af', k.speed < sp && k.sailTop === 0);
  for (let i = 0; i < 40; i++) Z.zeilStap(k, storm, { trim: -1 }, 0.1);
  check('na drijven weer overeind', k.omgeslagen === 0);
  const rustig = { angle: Math.PI / 2, speed: 2, zeilTrim: 1 };
  for (let i = 0; i < 100; i++) Z.zeilStap(rustig, { dir: 0, speed: 5 }, { trim: 0 }, 0.1);
  check('matige wind: nooit omslaan', !rustig.apart);
}
{
  const r = { speed: 0 };
  let t = 0;
  for (let i = 0; i < 4; i++) { Z.roeiStap(r, true, t, 0.05); for (let k = 0; k < 19; k++) Z.roeiStap(r, false, t += 0.05, 0.05); t += 0.05; }
  check('goed ritme bouwt snelheid op', r.sailTop > 2 && r.roeiSt.reeks >= 3, JSON.stringify([r.sailTop, r.roeiSt.reeks]));
  const slordig = { speed: 0 };
  t = 0;
  for (let i = 0; i < 4; i++) { Z.roeiStap(slordig, true, t, 0.05); t += 0.2; for (let k = 0; k < 3; k++) Z.roeiStap(slordig, false, t, 0.05); }
  check('te snel tikken levert minder op', slordig.sailTop < r.sailTop);
  const stil = { speed: 2, roeiTop: 3 };
  for (let i = 0; i < 100; i++) Z.roeiStap(stil, false, i * 0.1, 0.1);
  check('zonder slagen zakt de top', stil.sailTop < 0.5);
  check('top blijft onder het maximum', r.sailTop <= BOOT_SOORTEN.roeiboot.maxSpeed);
}
console.log(`zeilvaren_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
