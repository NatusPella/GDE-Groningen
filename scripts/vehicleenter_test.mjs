// #497: de instap- en vindregels die uit vehicle.js zijn getild (vehicle/enter.js): afstand tot de
// carrosserie, wie mag instappen, welk voertuig binnen bereik staat. Puur, zonder THREE of wereld.
//   node scripts/vehicleenter_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../game/js/vehicle/enter.js';

const bron = (p) => fs.readFileSync(new URL('../game/js/' + p, import.meta.url), 'utf8');
let n = 0, fails = 0;
const t = (name, f) => { n++; try { f(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', e.message.split('\n')[0]); } };
const auto = (x, y, extra = {}) => ({ x, y, angle: 0, halfLen: 2, halfWid: 1, speed: 0, ...extra });

t('#497: de afstand tot de carrosserie is nul binnen de doos en groeit erbuiten', () => {
  const v = auto(0, 0);
  assert.equal(E.distToVehicleBody(v, 0, 0), 0, 'midden');
  assert.equal(E.distToVehicleBody(v, 1.5, 0.5), 0, 'binnen de omtrek');
  assert.ok(Math.abs(E.distToVehicleBody(v, 3, 0) - 1) < 1e-6, '1 m voor de neus');
  assert.ok(Math.abs(E.distToVehicleBody(v, 0, 1.5) - 0.5) < 1e-6, '0,5 m naast de zijkant');
});

t('#497: wie mag instappen (#436): leeg of stilstaand, geen speler, scène of missie', () => {
  assert.equal(E.canEnterVehicle(auto(0, 0)), true, 'leeg voertuig');
  assert.equal(E.canEnterVehicle(auto(0, 0, { driver: 'player' })), false, 'de speler zelf');
  assert.equal(E.canEnterVehicle(auto(0, 0, { wrecked: true })), false, 'wrak');
  assert.equal(E.canEnterVehicle(auto(0, 0, { driver: 'civil', speed: 10 })), false, 'rijdend verkeer');
  assert.equal(E.canEnterVehicle(auto(0, 0, { driver: 'civil', speed: 0.5 })), true, 'stilstaand verkeer');
  assert.equal(E.canEnterVehicle(auto(0, 0, { driver: 'civil', parked: true })), true, 'geparkeerd');
  assert.equal(E.canEnterVehicle(auto(0, 0, { driver: 3 })), false, 'medespeler');
  for (const d of ['cine', 'owner', 'mission', 'jelle', 'twins', 'moored', 'racer', 'cast']) assert.equal(E.canEnterVehicle(auto(0, 0, { driver: d })), false, d);
  assert.equal(E.canEnterVehicle(null), false);
});

t('#497: het dichtstbijzijnde instapbare voertuig binnen bereik wint', () => {
  const dicht = auto(0, 1.5), ver = auto(0, 8);
  assert.equal(E.findEnterableVehicle(0, 0, [ver, dicht]), dicht);
  assert.equal(E.findEnterableVehicle(0, 0, [ver]), null, 'te ver');
  const metBestuurder = auto(0, 1.5, { driver: 'civil', speed: 10 });
  assert.equal(E.findEnterableVehicle(0, 0, [metBestuurder]), null, 'rijdend verkeer telt niet');
  const boot = auto(0, 3, { isBoat: true });
  assert.equal(E.findEnterableVehicle(0, 0, [boot]), boot, 'een boot mag vanaf de kade (extra bereik)');
  assert.equal(E.findNearestVehicle(0, 0, [auto(0, 8), auto(0, 2)]).y, 2);
  assert.equal(E.findNearestVehicle(0, 0, [auto(0, 8)]), null, 'buiten maxDist');
});

t('#497: vehicle.js her-exporteert de namen en heeft geen tweede kopie', () => {
  const v = bron('vehicle.js');
  assert.match(v, /from '\.\/vehicle\/enter\.js'/);
  assert.match(v, /export \{ ENTER_REACH, distToVehicleBody, canEnterVehicle, findEnterableVehicle, findNearestVehicle \}/);
  assert.doesNotMatch(v, /function distToVehicleBody/);
  assert.doesNotMatch(v, /function canEnterVehicle/);
  assert.doesNotMatch(v, /function findEnterableVehicle/);
  assert.doesNotMatch(v, /function findNearestVehicle/);
  assert.ok(fs.readFileSync(new URL('../game/js/vehicle.js', import.meta.url), 'utf8').split('\n').length < 2240, 'vehicle.js is korter dan 2240 regels');
});

console.log(`vehicleenter_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
