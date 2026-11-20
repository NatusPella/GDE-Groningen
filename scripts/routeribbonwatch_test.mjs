// Waakhond van de route-ribbon: de 3D-routelijn mag niet "ineens" weg zijn terwijl de minimap de route
import './node3d.mjs';
// nog toont. Pure regels uit game/js/routeribbonwatch.js en routeribbon.js.
//   node scripts/routeribbonwatch_test.mjs
import assert from 'node:assert/strict';

const W = await import('../game/js/routeribbonwatch.js');
const R = await import('../game/js/routeribbon.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, m); };

const goed = { wanted: true, meshExists: true, inScene: true, visible: true, opacity: 0.85, indexCount: 120, finite: true, maxAlpha: 1, buildFailed: false, groundDelta: 0 };
ok(W.ribbonFault(goed) === null, 'gezonde strook: geen fout');
ok(W.ribbonFault({ ...goed, wanted: false, visible: false }) === null, 'navigatie hoort weg te zijn: geen fout');
ok(W.ribbonFault({ ...goed, meshExists: false }) === 'geen-mesh', 'geen mesh');
ok(W.ribbonFault({ ...goed, buildFailed: true }) === 'bouw-mislukt', 'bouw mislukt');
ok(W.ribbonFault({ ...goed, inScene: false }) === 'niet-in-scene', 'uit de scene (bv. na herbouw van de scene)');
ok(W.ribbonFault({ ...goed, visible: false }) === 'verborgen', 'visible-vlag bleef uit');
ok(W.ribbonFault({ ...goed, indexCount: 0 }) === 'leeg', 'lege geometrie na een mislukte bouw');
ok(W.ribbonFault({ ...goed, finite: false }) === 'niet-eindig', 'NaN in de posities');
ok(W.ribbonFault({ ...goed, maxAlpha: 0 }) === 'onzichtbaar', 'alpha overal 0 (route over gras of wegen niet geladen)');
ok(W.ribbonFault({ ...goed, opacity: 0 }) === 'onzichtbaar', 'materiaal doorzichtig');
ok(W.ribbonFault({ ...goed, groundDelta: 1.2 }) === 'grond-verschoven', 'grond onder de strook verschoven');
ok(W.ribbonFault({ ...goed, groundDelta: 0.1 }) === null, 'kleine afwijking mag');

// de hoofdoorzaak: route die overal van de verharding af ligt kreeg alpha 0
const pts = 40, total = 80;
const zonder = [];
for (let i = 0; i < pts; i++) zonder.push(R.ribbonAlpha(i * 2, total, 99));
ok(Math.max(...zonder) === 0, 'zonder bodem: de strook is onzichtbaar (de bug)');
ok(W.needsAlphaFloor(zonder), 'de waakhond herkent dat');
const met = [];
for (let i = 0; i < pts; i++) met.push(R.ribbonAlpha(i * 2, total, 99, W.RIBBON_ALPHA_FLOOR));
ok(Math.max(...met) >= W.RIBBON_MIN_VISIBLE_ALPHA, 'met bodem: de strook blijft zichtbaar');
ok(met[0] === 0, 'het begin blijft uitdoven');
ok(!W.needsAlphaFloor(met), 'met bodem hoeft niet nog eens');
ok(R.ribbonAlpha(10, 80, 0) === 1, 'op de weg onveranderd vol');
ok(R.ribbonFade(6) === 0 && R.ribbonFade(6, 0.45) === 0.45, 'ribbonFade met bodem');

// teller
W.resetRouteRibbonStats();
W.noteRibbonRepair('verborgen', 5);
W.noteRibbonRepair('verborgen', 6);
W.noteRibbonRepair('leeg', 7);
const s = W.getRouteRibbonStats();
ok(s.repairs === 3 && s.byFault.verborgen === 2 && s.byFault.leeg === 1 && s.last === 'leeg' && s.lastAt === 7, 'teller per reden');

console.log(`routeribbonwatch_test: ${n} controles ok`);
