// Samen spelen (#1293): voertuig-id's botsen na een lange sessie niet met treinen, voetgangers, doel of "geen voertuig".
import assert from 'node:assert/strict';
import { voertuigId, wireVehicleId, VOERTUIG_ID_MAX, ID_TREIN0, ID_DOEL, ID_START0, pedId } from '../game/js/coopworld.js';
import { NO_VEHICLE } from '../game/js/net/codec.js';

let n = 0;
const t = (name, f) => { f(); n++; };

t('korte sessie: id ongewijzigd', () => {
  for (const id of [0, 1, 500, VOERTUIG_ID_MAX]) assert.equal(voertuigId({ id }, 0), id);
});
t('lange sessie: nooit in het gebied van trein, voetganger, doel, start of geen-voertuig', () => {
  for (let id = 1; id <= 200000; id += 7) {
    const w = voertuigId({ id }, 0);
    assert.ok(w >= 1 && w < ID_TREIN0, `id ${id} werd ${w}`);
    assert.notEqual(w, NO_VEHICLE); assert.notEqual(w, ID_DOEL); assert.ok(w < ID_START0);
  }
  assert.equal(voertuigId({ id: 65535 }, 0) === NO_VEHICLE, false);
  assert.ok(voertuigId({ id: 65537 }, 0) < ID_TREIN0);
});
t('voetgangers raken geen voertuig-id', () => {
  const p = pedId({});
  assert.ok(p >= 0x8000);
  assert.equal(wireVehicleId(0x8000 + 3) < 0x8000, true);
});
t('zonder vast id: geen id', () => { assert.equal(voertuigId({}, 0), null); });
console.log(`coop_voertuigid_test: ${n}/${n} ok`);
