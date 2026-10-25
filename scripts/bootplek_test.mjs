// Reizen met de boot (#438): de pure zoektocht naar een plek op het water (game/js/bootplek.js).
//   node scripts/bootplek_test.mjs
import assert from 'node:assert/strict';
import { vindBootPlek, bootPlekOpKaart, BOOT_ZOEK } from '../game/js/bootplek.js';

// het doel is land; het water begint 30 m oostelijker
const plas = (x) => x >= 30;
const p1 = vindBootPlek({ x: 0, y: 0, isWater: plas });
assert.ok(p1, 'water in de buurt gevonden');
assert.ok(p1.x >= 30 && p1.afstand >= 30 && p1.afstand <= 30 + BOOT_ZOEK.stap, 'de dichtstbijzijnde ring wint', JSON.stringify(p1));

// geen water: geen plek
assert.equal(vindBootPlek({ x: 0, y: 0, isWater: () => false }), null, 'zonder water geen plek');
assert.equal(vindBootPlek({ x: 0, y: 0, isWater: plas, maxR: 10 }), null, 'buiten de zoekstraal niets');

// de romp past niet overal: de proef slaat de eerste plekken over
const p2 = vindBootPlek({ x: 0, y: 0, isWater: () => true, vrij: (x) => x > 20 });
assert.ok(p2 && p2.x > 20, 'de boot zoekt door tot de romp vrij ligt', JSON.stringify(p2));

// het doel zelf telt mee: water onder het doel is afstand 0
const p3 = vindBootPlek({ x: 5, y: 5, isWater: () => true });
assert.deepEqual({ x: p3.x, y: p3.y, afstand: p3.afstand }, { x: 5, y: 5, afstand: 0 }, 'water onder het doel gaat voor');
assert.equal(vindBootPlek({ x: 5, y: 5, isWater: () => true, vrij: () => false }), null, 'past de romp nergens, dan geen plek');

// onzin levert niets op (en laat de kaart niet stuklopen)
assert.equal(vindBootPlek({ x: NaN, y: 0, isWater: () => true }), null);
assert.equal(vindBootPlek({ x: 0, y: 0 }), null, 'zonder waterproef geen plek');
assert.equal(vindBootPlek({ x: 0, y: 0, isWater: () => true, stap: 0 }), null, 'stap 0 is onzin');
assert.equal(vindBootPlek(), null);

// de kaart-kant: water bij het doel, met de romp zo vrij mogelijk
const meer = { pts: [[20, -80], [400, -80], [400, 80], [20, 80]], level: 0 };
const kaart = { waterNear: () => [meer], isOnBridge: () => false, coveredAt: () => false };
const boot = { x: 0, y: 0, angle: 0, model: { len: 6, wid: 2 } };
const pk = bootPlekOpKaart(kaart, boot, 0, 0);
assert.ok(pk && pk.x >= 20 && Number.isFinite(pk.hoek), 'de kaart vindt water voor de boot', JSON.stringify(pk));
assert.equal(bootPlekOpKaart(null, boot, 0, 0), null);
assert.equal(bootPlekOpKaart(kaart, null, 0, 0), null);
const droog = { waterNear: () => [], isOnBridge: () => false, coveredAt: () => false };
assert.equal(bootPlekOpKaart(droog, boot, 0, 0), null, 'zonder water in de buurt blijft de boot waar hij is');

console.log('bootplek_test ok');
