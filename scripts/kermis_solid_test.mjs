// De kraampjes en de pootjes van het reuzenrad van de kermis zijn alleen vast als de kermis er staat (#327): overdag waren
// het onzichtbare obstakels op de Grote Markt. De rand en de kassa van de botsautotent staan er altijd.
import './node3d.mjs';
import assert from 'node:assert/strict';

const K = await import('../game/js/kermis.js');
const B = await import('../game/js/breakables.js');

const world = { map: { reservedAt: () => false }, player: { x: 0, y: 0 } };
K.KERMIS.init(world);
const hits = (x, y) => B.propsNearInto(x, y, 0.4, []).length;
const spots = K.kermisFairSpots();
assert.ok(spots.length >= 7, `te weinig kermisplekken: ${spots.length}`);

for (const s of spots) assert.equal(hits(s.x, s.y), 0, `overdag staat er een onzichtbaar obstakel op (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`);
K.setFairColliders(true);
for (const s of spots) assert.ok(hits(s.x, s.y) > 0, `met de kermis erop is (${s.x.toFixed(1)}, ${s.y.toFixed(1)}) niet vast`);
K.setFairColliders(true); // nog een keer: niet dubbel
K.setFairColliders(false);
for (const s of spots) assert.equal(hits(s.x, s.y), 0, `na de kermis staat er nog iets op (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`);
// de tent zelf blijft vast
const rim = K.kermisFrame.toW(-10.3, 0);
assert.ok(hits(rim.x, rim.y) > 0, 'de rand van de botsautotent is niet vast');

console.log(`kermis_solid_test: ok (${spots.length} plekken, vast met en onzichtbaar zonder kermis, de tent altijd vast)`);
