// Samen spelen (#434): het geluid bij een gast klinkt zoals bij de host. Een gast heeft in zijn eigen spel geen voertuig, ook niet als hij bij de host in
// een auto of boot zit; sfx/ambience.js leest dan world.coopZit (de soort voertuig, coopnet.js), zodat een dichte cabine het gemurmel van de menigte,
// de wind en het verkeer net zo dempt als bij de host.
import './node3d.mjs';
import assert from 'node:assert/strict';
const { rijdtIn } = await import('../game/js/sfx/ambience.js');

let n = 0;
const t = (name, f) => { f(); n++; };
const dicht = (v) => !!v && !v.isBike && !v.isScooter && !v.isBoat; // zoals ambience.js setTargets en scan

t('de host rijdt in zijn eigen voertuig, niets verandert', () => {
  const v = { isBoat: true };
  assert.equal(rijdtIn({ player: { inVehicle: v } }), v);
  assert.equal(rijdtIn({ player: { inVehicle: null } }), null);
  assert.equal(rijdtIn({ player: {}, coopZit: 'auto' }), null, 'niet als gast: world.coopZit telt niet');
});
t('een gast in een auto, bus of politieauto zit in een dichte cabine; op een fiets, scooter, motor of in een boot niet', () => {
  for (const z of ['auto', 'bus', 'politie', 'bakkie', 'vracht', 'heli']) assert.equal(dicht(rijdtIn({ player: {}, coopRole: 'client', coopZit: z })), true, z);
  for (const z of ['fiets', 'scooter', 'motor', 'boot']) assert.equal(dicht(rijdtIn({ player: {}, coopRole: 'client', coopZit: z })), false, z);
  assert.equal(rijdtIn({ player: {}, coopRole: 'client', coopZit: null }), null, 'te voet: de open lucht');
});

console.log(`coopgeluid_test: ${n}/${n} ok`);
