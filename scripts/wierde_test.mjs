// De wierde van een kerk (landmarkkit.js) ligt niet over een straat (#5): een weg door de voet van de heuvel (hoogte 1,4 m) is
// onder gras verdwenen en een wandelaar erop staat tot zijn heupen in de grond (Uithuizen Kerkplein). ommelandlandmarks.js
// zet dan geen wierde. Pure kant: wierdeOnRoad.
//   node scripts/wierde_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const { wierdeOnRoad, wierdeRadius, landmarkParams } = await import('../game/js/landmarkkit.js');

const kerk = { x: 0, y: 0, len: 30, wid: 14 };
const R = wierdeRadius(kerk);
assert.ok(R > 20 && R < 40, 'straal van de top: ' + R);
const weg = (y, extra = {}) => ({ pts: [[-100, y], [100, y]], width: 5, cat: 'minor', ...extra });
assert.equal(wierdeOnRoad(kerk, [weg(R + 20)]), false, 'een weg ver van de wierde laat hem staan');
assert.equal(wierdeOnRoad(kerk, [weg(R + 3)]), true, 'een weg langs de voet van de helling ligt onder de heuvel');
assert.equal(wierdeOnRoad(kerk, [weg(R + 9)]), false, 'net voorbij de helling (7 m) is de weg vrij');
assert.equal(wierdeOnRoad(kerk, [weg(5)]), true, 'een weg over de top');
assert.equal(wierdeOnRoad(kerk, [weg(5, { bridge: true })]), false, 'een brug telt niet');
assert.equal(wierdeOnRoad(kerk, [weg(5, { z: [3, 3] })]), false, 'een weg met hoogteprofiel (viaduct) telt niet');
assert.equal(wierdeOnRoad(kerk, []), false, 'zonder wegen niets');
assert.equal(wierdeOnRoad(kerk, null), false, 'rare invoer blijft heel');
assert.equal(wierdeOnRoad(kerk, [{ pts: [[0, 0]] }]), false, 'een weg van een punt');
// de afstand tot een stuk, niet tot een hoekpunt: de weg loopt tussen twee verre punten door de voet
assert.equal(wierdeOnRoad(kerk, [{ pts: [[-500, R + 3], [500, R + 3]] }]), true, 'een lang stuk zonder hoekpunt in de buurt');
// de kit zelf blijft een kerk met een wierde als er geen weg is
const p = landmarkParams({ k: 'church', n: 'Torenkerk', x: -3382.27, y: -12300.22, t: { building: 'church' } });
assert.ok(p && p.wierde, 'de Torenkerk heeft een wierde (handgetekende look)');
console.log('wierde_test: ok');
