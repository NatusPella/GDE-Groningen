// #497: de poortwachters (requirements, plaats en telefoontekst) los van missions.js.
//   node scripts/missiongates_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { createMissionGates } = await import('../game/js/missiongates.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };

const w = {
  time: 100, player: { x: 0, y: 0 }, map: { meta: { garages: [] } }, phoneNotifications: [],
  addMessage(t) { this.messages = (this.messages || []).concat(t); },
};
const requirements = {
  bike: { met: () => false, shop: 'fietsen', text: (shop) => `Koop een fiets bij ${shop}.` },
  night: { met: () => false, garage: true, home: true, text: () => 'Wacht tot het donker is.' },
};
const gates = createMissionGates({
  state: () => ({ index: 2, reqHintAt: 0 }), hooks: { waived: () => false, gated() {} },
  requirements, shops: () => [{ type: 'fietsen', name: 'Fietsenwinkel', x: 5, y: 5 }], homePlace: () => ({ x: 1, y: 2, name: 'Thuis' }),
});

t('een ontbrekende fiets geeft de sleutel, de winkel en de tekst', () => {
  assert.equal(gates.unmetRequirement(w, { requires: 'bike' }), 'bike');
  assert.equal(gates.requirementMet(w, 'bike'), false);
  assert.deepEqual(gates.requirementPlace(w, 'bike'), { type: 'fietsen', name: 'Fietsenwinkel', x: 5, y: 5 });
  assert.equal(gates.requirementText(w, { requires: 'bike' }), 'Koop een fiets bij Fietsenwinkel.');
});

t('de nacht verwijst naar thuis; zonder vereiste is alles in orde', () => {
  assert.equal(gates.requirementPlace(w, 'night').name, 'Thuis');
  assert.equal(gates.unmetRequirement(w, {}), null);
  assert.equal(gates.requirementMet(w, 'onbekend'), true);
});

t('checkRequirement meldt het een keer per 25 s en onthoudt de hinttijd', () => {
  const st = { index: 1, reqHintAt: 0 };
  const g = createMissionGates({ state: () => st, hooks: { waived: () => false, gated() {} }, requirements, shops: () => [], homePlace: () => null });
  assert.equal(g.checkRequirement(w, { label: 'M01', requires: 'bike' }), false);
  assert.equal(w.phoneNotifications.length, 1);
  assert.equal(st.reqHintAt, 100);
  assert.equal(g.checkRequirement(w, { label: 'M01', requires: 'bike' }), false);
  assert.equal(w.phoneNotifications.length, 1, 'geen tweede melding binnen 25 s');
});

console.log(`missiongates_test: ${n}/${n} ok`);
