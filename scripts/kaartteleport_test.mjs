import assert from 'node:assert/strict';
import { wantsTeleport, plekNaam } from '../game/js/kaartteleport.js';

assert.equal(wantsTeleport({}), false, 'gewone klik: geen teleport');
assert.equal(wantsTeleport({ shift: true }), true, 'shift+klik: teleport (standaard aan)');
assert.equal(wantsTeleport({ shift: true, enabled: false }), false, 'instelling uit: shift+klik doet niets');
assert.equal(wantsTeleport({ enabled: true }), false);
assert.equal(wantsTeleport({ teleportMode: true }), true, 'de cheat Overal en nergens blijft werken');
assert.equal(wantsTeleport({ teleportMode: true, enabled: false }), true);
assert.equal(plekNaam('Hoofdstraat', 'Binnenstad'), 'Hoofdstraat');
assert.equal(plekNaam('', null, 'Binnenstad'), 'Binnenstad');
assert.equal(plekNaam(undefined, ' '), 'deze plek');
console.log('kaartteleport_test ok');
