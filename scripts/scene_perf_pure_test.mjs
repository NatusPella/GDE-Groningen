// Prestatie (scene3d/sky3d): de beslislogica als pure functies.
//  - camPushRaysNeeded: de vijf push-rays van de volgcamera alleen bij gevels/daken in de buurt, niet op open straat
//  - envInputsChanged: de omgevingskaart (PMREM) alleen opnieuw bakken bij een zichtbaar verschil
//  - bubbleTransform: de spraakbel verschuift met een transform, op dezelfde plek als left/top eerder
import assert from 'node:assert/strict';
import './node3d.mjs';
const { camPushRaysNeeded } = await import('../game/js/cameraplan.js');
const { envInputsChanged, ENV_EPS } = await import('../game/js/sky3d.js');
const { bubbleTransform } = await import('../game/js/hudrules.js');

// twee huizen met een straat van 8 m ertussen: x 0..10 en 18..30, y 0..20
const b = [0, 0, 10, 20, 18, 0, 30, 20];
const need = (x, y) => camPushRaysNeeded(b, b.length, x, y);
assert.equal(need(14, 10), false, 'midden in een open straat van 8 m: geen push-rays (4 m van elke gevel)');
assert.equal(need(11, 10), true, 'binnen 1,9 m van een gevel: wel');
assert.equal(need(17, 10), true, 'andere gevel: wel');
assert.equal(need(5, 10), true, 'boven het dak (binnen de footprint): wel');
assert.equal(need(10.5, -1.5), true, 'bij de hoek net buiten de footprint, binnen de marge: wel');
assert.equal(need(10.5, -3), false, 'ver voorbij de hoek: niet');
assert.equal(need(-1.8, 5), true, 'dakrand/overstek (1,8 m buiten): wel');
assert.equal(need(-2, 5), false, 'net voorbij de marge: niet');
assert.equal(camPushRaysNeeded([], 0, 1, 1), false, 'geen doelen: geen rays');
assert.equal(camPushRaysNeeded(b, 4, 14, 10), false, 'telt alleen de eerste `count` waarden');

// omgevingskaart
const base = [0.3, 0.5, 0.8, 0.5, 0.6, 0.7, 0.2, 0.2, 0.2, 4, 3.5, 3, 0.2, 0.9, 0.1];
assert.equal(envInputsChanged(null, base), true, 'eerste bak');
assert.equal(envInputsChanged(base, base.slice()), false, 'identiek');
const kleine = base.map((v) => v * (1 + ENV_EPS / 3));
assert.equal(envInputsChanged(base, kleine), false, 'kleine drift: niet opnieuw bakken');
const groot = base.map((v, i) => (i === 2 ? v * 1.05 : v));
assert.equal(envInputsChanged(base, groot), true, '5% in één kanaal: wel');
const richting = base.slice(); richting[13] += 0.02;
assert.equal(envInputsChanged(base, richting), true, 'de zon schuift ~1 graad: wel');
// een traag schemer: elke stap klein, maar de som t.o.v. de laatste bak haalt de drempel
let last = base, bakken = 0, cur = base;
for (let k = 1; k <= 60; k++) {
  cur = base.map((v) => v * (1 - 0.004 * k));
  if (envInputsChanged(last, cur)) { last = cur; bakken++; }
}
assert.ok(bakken >= 2 && bakken < 30, `traag schemer bakt een paar keer, niet elke stap: ${bakken}`);
assert.ok(cur.every((v, i) => Math.abs(v - last[i]) <= Math.max(0.004, ENV_EPS * Math.abs(last[i])) + 1e-12), 'de afwijking blijft binnen de drempel');
assert.equal(envInputsChanged(base, base.slice(0, 14)), true, 'andere lengte: wel');

assert.equal(bubbleTransform(120.5, 80), 'translate(120.5px, 80px) translate(-50%, -100%)');
console.log('scene_perf_pure_test ok');
