// Een gekocht wapen blijft van jou bij 0 patronen (#437): scripts/wapenbezit_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { hasWeapon, hasAmmo } = await import('../game/js/combat.js');

const w = { ammo: {} };
assert.equal(hasWeapon(w, 'pistol'), false, 'niet gekocht');
w.ammo.pistol = 5;
assert.ok(hasWeapon(w, 'pistol') && hasAmmo(w, 'pistol'));
w.ammo.pistol = 0;
assert.ok(hasWeapon(w, 'pistol'), 'leeg maar nog van jou');
assert.equal(hasAmmo(w, 'pistol'), false);
assert.ok(hasWeapon(w, 'fists') && hasAmmo(w, 'fists'));
delete w.ammo.pistol;
assert.equal(hasWeapon(w, 'pistol'), false, 'verkocht');
console.log('wapenbezit_test ok');
