// Trekkercamera, derde persoon (game/js/cammath.js vehicleCamRig): hoge voertuigen (trekker, maaidorser, vrachtwagen) staan niet meer vol
// dak in beeld; personenauto's, tweewielers, paarden, helikopters en boten houden exact de oude camera. node scripts/trekkercam_test.mjs
import { vehicleCamRig, TALL_ROOF, camClearOfVehicle } from '../game/js/cammath.js';
import { vehicleHeight } from '../game/js/vaultkit.js';
import { followCameraPose, DEFAULT_PITCH } from '../game/js/cameraplan.js';

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// de afmetingen uit vehicle.js (zonder three te laden), met de vlaggen die de Vehicle-klasse zet
const V = (name, len, wid, extra = {}) => ({ model: { name, len, wid, ...(extra.model || {}) }, ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'model')) });
const auto = [V('hatch', 3.8, 1.7), V('sedan', 4.3, 1.8), V('wagon', 4.5, 1.8), V('van', 5, 2), V('sport', 4.1, 1.85), V('taxi', 4.3, 1.8), V('police', 4.3, 1.8),
  V('escort', 4, 1.65), V('suv', 4.6, 1.9), V('cashvan', 5.4, 2.1)];
const twee = [V('bike', 1.75, 0.5, { isBike: true }), V('scooter', 1.1, 0.4, { isScooter: true }), V('horse', 2.2, 0.8, { _mount: 'horse' })];
const hoog = [V('tractor', 4.3, 2.3), V('trekker-klein', 3.9, 2.1, { model: { name: 'tractor' } }), V('maaidorser', 7.4, 3.3), V('truck', 8, 2.5), V('ambulance', 5.6, 2.1), V('foodtruck', 6, 2.3)];
const bus = [V('bus', 11.2, 2.55, { isBus: true, model: { trailer: true } }), V('midibus', 8.5, 2.5, { isBus: true })];

// de oude formules, letterlijk uit scene3d.js van vóór deze wijziging
const oud = (veh) => {
  const s = veh ? (veh.isHeli ? 4.4 : veh._mount === 'horse' ? 1.7 : veh.isBus ? (veh.model.trailer ? 5.2 : Math.min(4.4, Math.max(3.2, veh.model.len / 2.5))) : Math.min(3.2, Math.max(1.35, veh.model.len / 2.4))) : 1;
  return { scale: s, eye: veh ? (veh._mount === 'horse' ? 2.2 : 1.3 + (s - 1) * 0.55) : 1.3 };
};

for (const v of [...auto, ...twee, { isHeli: true, model: { name: 'heli', len: 9, wid: 2.5 } }, { isBoat: true, model: { name: 'sloep', len: 5, wid: 2 } }, null]) {
  const r = vehicleCamRig(v), o = oud(v);
  check(`${v ? v.model.name : 'te voet'}: ongewijzigd`, r.scale === o.scale && r.eye === o.eye && r.ahead === 0, JSON.stringify([r, o]));
}
check('bus en midibus: nooit minder dan de oude baan', bus.every((v) => vehicleCamRig(v).scale >= oud(v).scale && vehicleCamRig(v).eye >= oud(v).eye - 1e-9));

const ORBIT = Math.hypot(2.6, 2.6);
for (const v of [...hoog, ...bus]) {
  const roof = vehicleHeight(v), r = vehicleCamRig(v), n = v.model.name;
  check(`${n}: dak boven de drempel`, roof > TALL_ROOF, roof);
  check(`${n}: pivot minstens 80% van het dak`, r.eye >= roof * 0.8 - 1e-9, `${r.eye} ${roof}`);
  check(`${n}: baan groeit met het dak`, r.scale >= roof / 1.5 - 1e-9, r.scale);
  check(`${n}: kijkpunt vooruit, begrensd`, r.ahead > 0 && r.ahead <= 3, r.ahead);
  // de volgplek ligt buiten de omhullende bol van het voertuig (met marge) en boven het dak
  const p = followCameraPose({ x: 0, y: 0, eye: r.eye, angle: 0, pitch: DEFAULT_PITCH, radius: ORBIT * r.scale });
  const rBol = Math.hypot(v.model.len / 2, v.model.wid / 2, roof / 2);
  const afstand = Math.hypot(p.x, p.z, p.y - roof / 2);
  check(`${n}: camera buiten de bol van het voertuig`, afstand > rBol + 0.5, `${afstand.toFixed(2)} > ${rBol.toFixed(2)}`);
  check(`${n}: camera boven het dak`, p.y > roof + 0.5, `${p.y.toFixed(2)} ${roof}`);
  // en blijft er dat ook als een muur hem naar binnen trekt: camClearOfVehicle tilt hem boven het dak
  const q = camClearOfVehicle(-0.5, 1.0, 0, { ...v, x: 0, y: 0, z: 0, angle: 0 });
  check(`${n}: binnen de carrosserie wordt hij boven het dak getild`, q[1] >= roof + 0.6 - 1e-9, q[1]);
}
// de trekker zelf: pivot 2,32 m, baan 1,93x
const t = vehicleCamRig(hoog[0]);
check('trekker: pivot op dakhoogte (was 1,73 m onder een dak van 2,9 m)', t.eye > 2.2 && oud(hoog[0]).eye < 1.8, JSON.stringify([t, oud(hoog[0])]));

if (bad) { console.log(bad, 'fout(en)'); process.exit(1); }
console.log('trekkercam_test: ok');
