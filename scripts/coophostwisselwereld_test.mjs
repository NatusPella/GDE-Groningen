// Samen spelen (#439): de haken tussen het overdragen en de wereld (coophostwisselwereld.js): wat zonder echte wereld te toetsen is.
// De opdracht echt hervatten, kapotte objecten, voertuigen en de plek zijn alleen in het spel zelf te zien (nog niet bekeken).
import './node3d.mjs';
import assert from 'node:assert/strict';
const H = await import('../game/js/coophostwisselwereld.js');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

ok(H.leesOpdracht({ mission: { phase: 'active', label: 'Het Loket', index: 3, t: 41 } }).stap === 3, 'lopende opdracht lezen');
ok(H.leesOpdracht({ mission: { phase: 'idle', label: 'x', index: 1 } }) === null && H.leesOpdracht({}) === null && H.leesOpdracht({ mission: { phase: 'active', label: 'x' } }) === null, 'geen lopende opdracht');
ok(H.zetOpdracht({}, null) === false, 'geen opdracht om te zetten');
ok(H.zetOpdracht({}, { id: 'bestaat niet', stap: 9999, staat: 'active', t: 0 }) === false, 'onbekende opdracht wordt niet gestart');
ok(Array.isArray(H.leesKapot()), 'kapotte objecten lezen zonder wereld');
ok(H.zetKapot({}, ['rommel', 5, null, 'kliko@1,2']) === true, 'rommelsleutels worden genegeerd');
ok(H.zetVoertuigen({}, [{ x: 1, y: 2 }]) === false && H.zetVoertuigen({ map: {} }, 'nee') === false, 'voertuigen zonder wereld of lijst');
const w = { coopNet: { betaald: { 2: 150 } } };
ok(H.gastGeld(w)(2) === 150 && H.gastGeld(w)(3) === 0 && H.gastGeld({})(1) === 0, 'geld per gast (wat de gast in deze sessie verdiende)');
ok(H.wisselWereldHaken(w).gastGeld(2) === 150 && typeof H.wisselWereldHaken(w).zetPlek === 'function', 'de haken komen samen mee');
console.log(`coophostwisselwereld_test: ${n}/9 ok`);
process.exit(0);
