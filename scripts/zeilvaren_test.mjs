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
  // hameren (elke 0,3 s) mag nooit sneller zijn dan het ritme (#28: in beeld bleek hameren een hogere topsnelheid te geven)
  const run = (gap) => { const q = { speed: 0 }; let tt = 0, next = 0; for (let k = 0; k < 600; k++) { tt = k * 0.05; Z.roeiStap(q, tt >= next, tt, 0.05); if (tt >= next) next = tt + gap; } return q.sailTop; };
  const ritme = run(1.1), hameren = run(0.3), traag = run(2.4);
  check('hameren levert op den duur minder op dan het ritme', hameren < ritme * 0.5, JSON.stringify([hameren, ritme]));
  check('te laat roeien levert minder op dan het ritme', traag < ritme, JSON.stringify([traag, ritme]));
  check('een goed ritme houdt een flinke topsnelheid vast', ritme > 2, ritme);
  // de boot volgt de topsnelheid van het ritme (anders staat hij na een tik zo goed als stil, #28)
  const volg = (gap) => { const q = { speed: 0 }; let tt = 0, next = 0; for (let k = 0; k < 600; k++) { tt = k * 0.05; Z.roeiStap(q, tt >= next, tt, 0.05); if (tt >= next) next = tt + gap; } return q.speed; };
  check('in een goed ritme komt de boot op snelheid', volg(1.1) > 1.8 && volg(1.1) <= BOOT_SOORTEN.roeiboot.maxSpeed, volg(1.1));
  check('hameren houdt de boot langzaam', volg(0.3) < volg(1.1) * 0.5, [volg(0.3), volg(1.1)]);
  const zonder = { speed: 1.5, roeiTop: 0 }; Z.roeiStap(zonder, false, 0, 0.05);
  check('zonder slagen trekt de roeitop de boot niet vooruit', zonder.speed === 1.5);
}
// ---- Samen spelen (#436): een gast die zelf vaart
// De boot van een gast ligt in de simulatie van de host; de zeil- en roeiregels moeten daar op de invoer
// van de gast lopen. Zonder dat voer een zeilboot op de motortop van het model en roeide een roeiboot niet.
{
  const wereld = (v) => ({
    player: { inVehicle: null },
    coopRijders: v ? { 1: { slot: 1, v } } : {},
    coop: { remoteInput: { mx: 0, my: 0, buttons: 0, yaw: 0 } },
    clock: 12, time: 0, paused: false,
    input: { isDown: () => false }, addMessage: () => {}, coopMeld: () => {},
  });
  const roei = { isBoat: true, model: BOAT_KINDS.roeiboot, driver: 'player', coopBestuurder: 1, speed: 0, angle: 0 };
  const w = wereld(roei);
  for (let slag = 0; slag < 6; slag++) { // elke 1,05 s een tik naar voren
    w.coop.remoteInput.my = -1; w.time += 0.05; Z.updateZeilvaren(0.05, w, 5);
    w.coop.remoteInput.my = 0;
    for (let k = 0; k < 21; k++) { w.time += 0.05; Z.updateZeilvaren(0.05, w, 5); }
  }
  check('een gast roeit zijn roeiboot vooruit', roei.roeiTop > 1.5 && roei.speed > 1, JSON.stringify([roei.roeiTop, roei.speed]));

  const zeil = { isBoat: true, model: BOAT_KINDS.zeilboot, driver: 'player', coopBestuurder: 1, speed: 0, angle: 0, zeilTrim: 0.6 };
  const w2 = wereld(zeil);
  Z.updateZeilvaren(0.05, w2, 5);
  zeil.angle = w2.wind.dir + Math.PI / 2; // halve wind: het beste punt van de poolcurve
  const verwacht = Z.windSnelheid(zeil.angle, zeil.zeilTrim, w2.wind);
  for (let k = 0; k < 600; k++) { w2.time = k * 0.05; Z.updateZeilvaren(0.05, w2, 5); }
  check('een gast vaart zijn zeilboot op de wind', Math.abs(zeil.sailTop - verwacht) < 1e-6 && zeil.speed > Math.min(1, verwacht * 0.8), JSON.stringify([zeil.sailTop, verwacht, zeil.speed]));

  const eigen = { isBoat: true, model: BOAT_KINDS.zeilboot, driver: 'player', speed: 0, angle: 0, zeilTrim: 0.6 };
  const w3 = wereld(null);
  w3.player.inVehicle = eigen;
  for (let k = 0; k < 300; k++) { w3.time = k * 0.05; Z.updateZeilvaren(0.05, w3, 5); }
  check('de eigen zeilboot van de speler vaart nog steeds op de wind', Number.isFinite(eigen.sailTop) && eigen.sailTop >= 0 && w3.wind && w3.wind.speed >= 2);

  // de host en een gast varen allebei: geen van tweeën staat stil (niemand is meer dan de ander)
  const eigen2 = { isBoat: true, model: BOAT_KINDS.zeilboot, driver: 'player', speed: 0, angle: 0, zeilTrim: 0.6 };
  const gast2 = { isBoat: true, model: BOAT_KINDS.roeiboot, driver: 'player', coopBestuurder: 1, speed: 0, angle: 0 };
  const w5 = wereld(gast2);
  w5.player.inVehicle = eigen2;
  for (let k = 0; k < 300; k++) {
    w5.coop.remoteInput.my = k % 22 < 2 ? -1 : 0; // de gast tikt op zijn stick
    w5.time = k * 0.05;
    Z.updateZeilvaren(0.05, w5, 5);
  }
  check('host en gast varen allebei', eigen2.sailTop > 0 && gast2.roeiTop > 0.5, JSON.stringify([eigen2.sailTop, gast2.roeiTop]));

  // twee gasten die allebei een boot besturen: elk krijgt zijn eigen regels
  const g1 = { isBoat: true, model: BOAT_KINDS.roeiboot, driver: 'player', coopBestuurder: 1, speed: 0 };
  const g2 = { isBoat: true, model: BOAT_KINDS.roeiboot, driver: 'player', coopBestuurder: 2, speed: 0 };
  const w6 = wereld(g1);
  w6.coopRijders[2] = { slot: 2, v: g2 };
  w6.coopFigures = { 2: { input: { mx: 0, my: 0 } } };
  for (let k = 0; k < 300; k++) {
    const tik = k % 22 < 2 ? -1 : 0;
    w6.coop.remoteInput.my = tik; w6.coopFigures[2].input.my = tik;
    w6.time = k * 0.05;
    Z.updateZeilvaren(0.05, w6, 5);
  }
  check('twee gasten roeien allebei', g1.roeiTop > 0.5 && g2.roeiTop > 0.5, JSON.stringify([g1.roeiTop, g2.roeiTop]));

  // een gewone motorboot van een gast houdt zijn eigen vaarlaag: geen zeil- of roeiregels
  const motor = { isBoat: true, model: BOAT_KINDS.sloep, driver: 'player', coopBestuurder: 1, speed: 2 };
  const w4 = wereld(motor);
  Z.updateZeilvaren(0.05, w4, 5);
  check('een motorboot van een gast wordt niet gezeild', motor.sailTop === undefined && motor.speed === 2);
}
console.log(`zeilvaren_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
