// Samen spelen (#439): de haken tussen het overdragen en de wereld (coophostwisselwereld.js): wat zonder echte wereld te toetsen is.
// De opdracht echt hervatten, kapotte objecten, voertuigen en de plek zijn alleen in het spel zelf te zien (nog niet bekeken).
import './node3d.mjs';
import assert from 'node:assert/strict';
const H = await import('../game/js/coophostwisselwereld.js');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };

const opdracht = H.leesOpdracht({ mission: { phase: 'active', label: 'Het Loket', index: 3, t: 41 } });
ok(opdracht.stap === 3 && opdracht.deel === 0 && opdracht.tijd === null, 'lopende opdracht lezen');
// de stand binnen de opdracht (#452): het waypoint van een race en de tijd die nog over was
const race = H.leesOpdracht({ mission: { phase: 'active', label: 'Rondje ring', index: 5, wpIndex: 4, timeLeft: 73.46 } });
ok(race.deel === 4 && race.tijd === 73.46 && race.stap === 5, 'waypoint en tijd gaan mee');
ok(H.leesOpdracht({ mission: { phase: 'idle', label: 'x', index: 1 } }) === null && H.leesOpdracht({}) === null && H.leesOpdracht({ mission: { phase: 'active', label: 'x' } }) === null, 'geen lopende opdracht');
ok(H.zetOpdracht({}, null) === false, 'geen opdracht om te zetten');
ok(H.zetOpdracht({}, { id: 'bestaat niet', stap: 9999, staat: 'active', t: 0 }) === false, 'onbekende opdracht wordt niet gestart');
ok(Array.isArray(H.leesKapot()), 'kapotte objecten lezen zonder wereld');
ok(H.zetKapot({}, ['rommel', 5, null, 'kliko@1,2']) === true, 'rommelsleutels worden genegeerd');
ok(H.zetVoertuigen({}, [{ x: 1, y: 2 }]) === false && H.zetVoertuigen({ map: {} }, 'nee') === false, 'voertuigen zonder wereld of lijst');
// het uiterlijk van de voertuigen (#452): hetzelfde model en dezelfde kleur bij de nieuwe host
const hatch = H.modelVan({ soort: 'hatch', uiterlijk: { naam: 'hatch', kleur: '#2f3a52' } });
ok(hatch && hatch.name === 'hatch' && hatch.color === '#2f3a52' && hatch.len > 0, 'het model komt terug uit de momentopname');
ok(H.modelVan({ soort: 'onbekend', uiterlijk: { naam: 'zweefmolen' } }) === null, 'een onbekend model laat de spawn kiezen');
ok(H.uiterlijkVan({ name: 'escort', color: '#a11f1f', stripe: '#fff' }).streep === '#fff' && H.uiterlijkVan(null) === null, 'uiterlijk lezen');
const auto = { id: 7, x: 3, y: 4, z: 0.2, angle: 1, health: 40, model: { name: 'hatch', color: '#2f3a52' } };
const wl = { player: { inVehicle: auto }, companion: null, coopFigures: { 2: { inVeh: auto } } };
const vs = H.leesVoertuigen(wl);
ok(vs.length === 1 && vs[0].uiterlijk.naam === 'hatch' && Math.abs(vs[0].schade - 0.6) < 1e-9 && H.leesVoertuigen({ player: null }) .length === 0, 'de voertuigen waar spelers in zitten, met hun schade');
const w = { coopNet: { betaald: { 2: 150 } } };
ok(H.gastGeld(w)(2) === 150 && H.gastGeld(w)(3) === 0 && H.gastGeld({})(1) === 0, 'geld per gast (wat de gast in deze sessie verdiende)');
const haken = H.wisselWereldHaken(w);
ok(haken.gastGeld(2) === 150 && typeof haken.zetPlek === 'function' && typeof haken.leesVoertuigen === 'function' && typeof haken.zetOpdracht === 'function', 'de haken komen samen mee');
console.log(`coophostwisselwereld_test: ${n}/14 ok`);
process.exit(0);
