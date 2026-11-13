import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const TT = await import('../game/js/terrain3d.js');
const THREE_Group = THREE.Group;
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };

// 1. De fallback-terreinbouw levert een groep met het materiaal in userData,
//    niet op .material (dat laat renderer.compile(scene) crashen).
const arr = TT.terrainArrays([0, 0, 80, 80], []);
const g = TT.buildTerrainMesh3D([0, 0, 80, 80], []);
ok(g && g.userData && g.userData.terrainMaterial && g.userData.terrainMaterial.isMaterial, 'fallback-groep heeft userData.terrainMaterial');
ok(g.material === undefined, 'fallback-groep heeft geen Group.material');

// 2. Een bestaande groep met een eigen materiaal blijft werken (compat).
const legacy = new THREE_Group();
legacy.material = TT.createTerrainMaterial();
const g2 = TT.terrainGroup(arr, legacy);
ok(g2.userData.terrainMaterial === legacy.material, 'bestaand group.materiaal wordt overgenomen in userData');
ok(g2.material === legacy.material, 'bestaande group.materiaal blijft staan voor oude lezers');

// 3. Bronchecks: scene3d leest het materiaal via de helper en zet geen Group.material meer.
const scene = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
ok(!/terrainMesh\.material\s*=/.test(scene), 'scene3d zet geen materiaal meer op de terreingroep');
ok(/const terrainMaterialOf =/.test(scene) && /apronMaterial: terrainMaterialOf\(\)/.test(scene) && /if \(terrainMat\) terrainMat\.envMapIntensity/.test(scene), 'scene3d leest het terreinmateriaal via de helper');
// 4. De vaste opening-assets worden echt in de warm-upqueue gezet.
const main = fs.readFileSync(new URL('../game/js/main.js', import.meta.url), 'utf8');
ok(/queueWarmupObject\(\(\) => opening\.prepareOpeningWarm\(\)\)/.test(main), 'main.js queue\'t de vaste opening-assets');
ok(/prepareOpeningWarm/.test(fs.readFileSync(new URL('../game/js/intromontage.js', import.meta.url), 'utf8')), 'intromontage exporteert prepareOpeningWarm');

console.log(`terrainmateriaal_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
