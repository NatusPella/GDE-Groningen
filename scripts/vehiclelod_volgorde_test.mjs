// De volgorde van de drie eigen niveau-1-opgaven van een voertuig (24-11, docs/LOD-SYSTEEM-23-11.md): lodRomp wint, dan lodDoel, dan lodMax.
//   node scripts/vehiclelod_volgorde_test.mjs   (eenmalig: cd desktop && npm run stage)
import { readFileSync } from 'node:fs';
import './node3d.mjs';

await import('three');
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { lod1Bron } = await import('../game/js/vehiclelod3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };

// de keuze zelf
check('niets meegegeven: de minCut van de soort', lod1Bron({}) === null && lod1Bron(null) === null);
check('alleen lodMax', lod1Bron({ lodMax: 1300 }) === 'lodMax');
check('lodDoel wint van lodMax', lod1Bron({ lodDoel: 900, lodMax: 1300 }) === 'lodDoel');
check('lodRomp wint van lodDoel en lodMax', lod1Bron({ lodRomp: {}, lodDoel: 900, lodMax: 1300 }) === 'lodRomp');
check('lodRomp wint van lodMax', lod1Bron({ lodRomp: {}, lodMax: 1300 }) === 'lodRomp');
check('een doel van 0 telt niet mee', lod1Bron({ lodDoel: 0, lodMax: 1300 }) === 'lodMax');

// de stationwagen heeft lodMax: niveau 1 blijft onder die grens
const tris = (m) => { const g = m.geometry; return g.index ? g.index.count / 3 : g.attributes.position.count / 3; };
const wagon = buildVehicleMesh({ id: 'volgorde-wagon', health: 100, model: { name: 'wagon', len: 4.5, wid: 1.8, color: '#6e937c' } });
let l1 = null;
wagon.traverse((o) => { if (o.isMesh && o.name === 'lod1') l1 = o; });
check('de stationwagen heeft niveau 1', !!l1);
if (l1) check('lodMax: niveau 1 van de stationwagen onder de grens', tris(l1) <= wagon.userData.lodMax, `${tris(l1)} > ${wagon.userData.lodMax}`);

// de regel staat in het ontwerpdocument
const doc = readFileSync(new URL('../docs/LOD-SYSTEEM-23-11.md', import.meta.url), 'utf8');
check('docs/LOD-SYSTEEM-23-11.md noemt de volgorde', /lodRomp[^\n]*lodDoel[^\n]*lodMax/.test(doc));

console.log(bad ? `vehiclelod_volgorde_test: ${bad} mislukt` : 'vehiclelod_volgorde_test: ok');
process.exit(bad ? 1 : 0);
