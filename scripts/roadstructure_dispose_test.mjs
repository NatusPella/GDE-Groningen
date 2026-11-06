// Civiele werken van een koude weg (#588): de geometry's van brug, talud en muur hingen aan de
// weg en werden nooit vrijgegeven als de weg uit de koude cache viel; het GPU-geheugen liep op
// een lange rit langs verhoogde wegen op. freeRoadGeometry ruimt ze nu op, met de gedeelde
// materialen intact (roadstructures3d.js mats) en de structuren worden bij terugkomst opnieuw gebouwd.
//   node scripts/roadstructure_dispose_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const R = await import('../game/js/roadstructures3d.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// Een structuur zoals structureGroup hem bouwt: één part, geen breekbare stukken.
const S = { parts: [{ m: 'concrete', pos: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), nor: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), sphere: [0, 0, 0, 2] }], hide: [] };
const group = R.structureGroup({ elev: { walls: [] } }, S);
ok(!!group && group.children.length === 1, 'structureGroup maakt één mesh per part');
const mesh = group.children[0];
ok(!!mesh.geometry, 'de mesh heeft een eigen geometry');
ok(!!mesh.material, 'en een (gedeeld) materiaal');

let geoDisposed = 0, matDisposed = 0;
mesh.geometry.dispose = () => { geoDisposed++; };
mesh.material.dispose = () => { matDisposed++; };
const aantal = R.disposeStructureGeometries(group);
ok(aantal === 1 && geoDisposed === 1, 'alleen de geometry is vrijgegeven', `${aantal}/${geoDisposed}`);
ok(matDisposed === 0, 'het gedeelde materiaal blijft staan (andere wegen gebruiken het nog)');
ok(R.disposeStructureGeometries(null) === 0 && R.disposeStructureGeometries(undefined) === 0, 'geen structuur: niets te doen');

// Een echte weg heeft twee caches: _geoStruct (brug/talud) en _geoOverDeck (dek over een uitgraving).
// freeRoadGeometry moet ze allebei vrijgeven en op undefined zetten zodat ze opnieuw gebouwd worden.
const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
const start = scene.indexOf('function freeRoadGeometry');
const eind = scene.indexOf('\n}', start);
const body = start >= 0 && eind > start ? scene.slice(start, eind + 2) : '';
ok(!!body, 'freeRoadGeometry staat in scene3d.js');
ok(/_geoStruct/.test(body) && /_geoOverDeck/.test(body), 'freeRoadGeometry kent beide structuren', body.slice(0, 80));
ok(/disposeStructureGeometries\(g\)/.test(body), 'en geeft hun geometry\'s vrij via roadstructures3d.js');
ok(/r\[k\] = undefined/.test(body), 'en zet het veld op undefined, zodat de tegel bij terugkomst opnieuw bouwt');

console.log(bad ? `roadstructure_dispose_test: ${bad} van ${n} mislukt` : `roadstructure_dispose_test: ${n}/${n} ok`);
process.exit(bad ? 1 : 0);
