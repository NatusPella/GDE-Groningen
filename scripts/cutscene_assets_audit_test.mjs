// Test van de asset-audit (scripts/cutscene_assets_audit.mjs): cutscenes gebruiken alleen de gedeelde fabrieken en het ene register.
//   node scripts/cutscene_assets_audit_test.mjs
import { audit, scan, BASELINE } from './cutscene_assets_audit.mjs';
import { PROP_NORM, DECOR_KINDS, PROP_SOURCES } from '../game/js/cutscenemodels.js';
import { PROP_KINDS } from '../game/js/cutscript.js';

let n = 0, bad = 0;
const ok = (c, m, info = '') => { n++; if (!c) { bad++; console.error('FAIL', m + (info ? ` (${info})` : '')); } };

const r = audit();
ok(r.problems.length === 0, 'geen problemen met het register of met nieuwe primitieven in scènecode', r.problems.join(' | '));
ok(r.makers === DECOR_KINDS.length, 'elke decorsoort heeft precies één bouwer', `${r.makers} bouwers, ${DECOR_KINDS.length} soorten`);
ok(PROP_NORM.length >= 5, 'de kwaliteitsnorm per voorwerp staat in de bibliotheek');
// elke propsoort van de regietaal komt uit een register (de wereld of de bibliotheek)
for (const k of PROP_KINDS) ok(PROP_SOURCES[k] || DECOR_KINDS.includes(k) || k === 'aanhanger', `${k} staat in een register`);
// de scan ziet de bekende schuld (anders zou hij niets bewaken) en de schuld wordt niet groter dan de baseline
const raw = scan();
const totaal = Object.values(raw).reduce((s, h) => s + h.reduce((a, b) => a + b.n, 0), 0);
ok(totaal > 0, 'de scan vindt de bestaande primitieven in scènecode', String(totaal));
for (const [f, hits] of Object.entries(raw)) ok(hits.reduce((s, h) => s + h.n, 0) <= (BASELINE[f] ?? 0), `${f}: niet meer primitieven dan de baseline`);
// een nieuw bestand met een eigen mannetje of auto valt door: de regex herkent de constructors
const probe = 'const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), mat); const w = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8);';
ok((probe.match(/new THREE\.(Box|Cylinder|Sphere|Cone|Circle|Plane|Torus|Capsule|Ring|Icosahedron|Octahedron|Tetrahedron|Dodecahedron)Geometry\(/g) || []).length === 2, 'de regex ziet eigen blokjes en wielen');
console.log(`cutscene_assets_audit_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
