// node scripts/meshloopscan_test.mjs: de statische scan op losse meshes in lussen (scripts/perf/meshloopscan.mjs, #1039).
import { scanSource, scanTree, SKIP } from './perf/meshloopscan.mjs';
let fail = 0;
const ok = (name, c) => { if (!c) fail++; console.log(`${c ? 'ok  ' : 'FAIL'} ${name}`); };

const loose = 'for (let i = 0; i < n; i++) {\n  const m = new THREE.Mesh(geo, mat);\n  g.add(m);\n}';
ok('een lus met een nieuwe mesh is een treffer', scanSource(loose).length === 1 && scanSource(loose)[0].line === 1);
ok('een lus met InstancedMesh is geen treffer', scanSource('for (let i = 0; i < n; i++) {\n  const m = new THREE.InstancedMesh(geo, mat, n);\n  new THREE.Mesh(a, b); g.add(m);\n}').length === 0);
ok('een lus met mergeGeometries is geen treffer', scanSource('for (const s of x) {\n  new THREE.Mesh(mergeGeometries(p), mat); g.add(m);\n}').length === 0);
ok('commentaar is geen lus', scanSource('// for (const s of x) {\nnew THREE.Mesh(a, b); g.add(m);').length === 0);
ok('forEach telt ook', scanSource('items.forEach((p) => {\n  const m = new THREE.Mesh(a, b);\n  scene.add(m);\n});').length === 1);
ok('een mesh buiten een lus is geen treffer', scanSource('const m = new THREE.Mesh(a, b);\ng.add(m);').length === 0);
ok('missiemodules vallen af', SKIP.test('game/js/missiedecor.js') && SKIP.test('game/js/heist.js') && !SKIP.test('game/js/scene3d.js'));

// de echte boom: de scan loopt, de stadsmodules blijven onder een bovengrens (een regressieschutter: nieuwe herhaalde meshes in de stad vallen op)
const t0 = performance.now();
const hits = scanTree();
const ms = performance.now() - t0;
const files = new Set(hits.map((h) => h.file));
console.log(`meetpunt: ${hits.length} lussen in ${files.size} bestanden (scan ${ms.toFixed(0)} ms)`);
ok('de scan vindt de bekende gevallen', hits.length > 5 && files.has('game/js/models3d_vehicles.js'));
ok('stadslussen met losse meshes: bovengrens 53 (nu 53; hoger kan alleen met reden; 48 -> 53 door de samenvoeging van ca. 40 branches op 22-11, zie docs/MAIN-GEZOND-22-11.md)', hits.length <= 53);
ok('de scan is snel (onder 3 s)', ms < 3000);
console.log(fail ? `${fail} FAILED` : 'all ok');
process.exit(fail ? 1 : 0);
