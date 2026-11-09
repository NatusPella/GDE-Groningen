// #796: opruimpaden buiten scene3d.disposeObject geven de gedeelde personen- en voertuig-
// geometrie terug. Aan de ene kant gedrag (haltefiguren3d en ommelandprops3d), aan de andere
// kant een broncontrole op de paden die alleen in de browser/Electron draaien.
//   node scripts/opruimpaden_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const { disposeObject } = await import('../game/js/scene3d.js');
const P = await import('../game/js/models3d_people.js');
const { syncHaltefiguren } = await import('../game/js/haltefiguren3d.js');
const { personMesh, disposeProp } = await import('../game/js/ommelandprops3d.js');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log('FAIL', name, info); } };
const src = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

// --- gedrag: haltefiguren3d geeft elk weggehaald figuur aan de opruimer van scene3d ---
{
  const scene = { add() {}, remove(m) { scene.removed.push(m); }, removed: [] };
  const world = { haltefx: [{ v: { x: 100, y: 50, angle: 0, isBus: true, model: { name: 'bus', len: 11.2, wid: 2.5 } }, board: 2, alight: 2 }] };
  const refs = [], ruimd = [];
  const ruim = (m) => { ruimd.push(m); disposeObject(m); };
  const bouw = (shirt, skin) => { const m = P.buildPersonMesh(shirt, skin, { seed: 4242 }); refs.push(m.userData.body.geometry.userData.personRefs); return m; };
  for (let i = 0; i < 80; i++) { syncHaltefiguren(world, scene, bouw, 0.5, ruim, () => 0.5); if (refs.length && ruimd.length === refs.length) break; }
  ok(refs.length > 0, 'haltefiguren zijn gebouwd');
  ok(ruimd.length === refs.length && ruimd.length > 0, 'elk weggehaald figuur gaat door de opruimer', `${ruimd.length}/${refs.length}`);
  ok(ruimd.every((m) => m.userData.body.userData.personRefsGiven === true), 'de gedeelde rompref is teruggegeven');
  ok(scene.removed.length === refs.length, 'en de figuren zijn uit de scene gehaald', String(scene.removed.length));
}

// --- gedrag: ommelandprops3d.disposeProp geeft de rompref van een prop-figuur terug ---
{
  const group = new THREE.Group();
  const person = personMesh('rikus');
  group.add(person);
  const geo = person.userData.body.geometry;
  const voor = geo.userData.personRefs;
  ok(voor === 1, 'prop-figuur telt één ref', String(voor));
  disposeProp({ group, own: [], people: [] });
  ok(geo.userData.personRefs === 0 && person.userData.body.userData.personRefsGiven === true, 'disposeProp geeft de rompref terug', String(geo.userData.personRefs));
}

// --- broncontrole: de opruimpaden die alleen in de browser/Electron draaien ---
const guards = [
  ['missionstory.js', /disposeActor[\s\S]{0,400}releasePersonGeometry\(o\)/, 'disposeActor geeft de rompref terug'],
  ['missionstory.js', /disposeOwnVehicles\(r\.group\)/, 'cleanupRun ruimt de eigen scènevoertuigen op'],
  ['missionstory.js', /disposeOwnVehicles\(group\)/, 'de eigen scène-cleanup ruimt de fatbike op'],
  ['missionstory.js', /releaseVehicleGeometries\b/, 'missionstory kent de voertuig-opruimer'],
  ['heist.js', /releasePersonGeometry\(o\)/, 'heist geeft de rompref van de wachters terug'],
  ['kermis.js', /disposeObject\(c\.mesh\)/, 'kermis-publiek gaat via disposeObject'],
  ['kermis.js', /disposeObject\(car\.rider\)/, 'kermis-botsautorijder gaat via disposeObject'],
  ['haltefiguren3d.js', /if \(ruim\) ruim\(fg\.mesh\)/, 'haltefiguren gaan door de ruim-callback'],
  ['scene3d.js', /syncHaltefiguren\([^;]*disposeObject\)/, 'scene3d geeft de opruimer mee aan haltefiguren'],
  ['fierljep.js', /releasePersonGeometry\(o\)/, 'fierljep geeft de rompref terug'],
  ['kartbaan.js', /releasePersonGeometry\(o\)/, 'kartbaan geeft de rompref van de rijders terug'],
  ['pg_koe.js', /releasePersonGeometry\(o\)/, 'pg_koe geeft de rompref terug'],
  ['radiostudio.js', /releasePersonGeometry\(o\)/, 'radiostudio geeft de rompref van Rikus terug'],
  ['storyfun.js', /releasePersonGeometry\(o\)/, 'storyfun geeft de rompref terug'],
  ['intromontage.js', /disposeObject\(m\)/, 'intro-acteurs gaan via disposeObject'],
  ['ommelandprops3d.js', /releasePersonGeometry\(o\)/, 'ommelandprops geeft de rompref van prop-figuren terug'],
  ['vehiclepreview.js', /releaseVehicleGeometries\(m\)/, 'voertuigpreview geeft de voertuigrefs terug'],
  ['vehiclepreview.js', /releasePersonGeometry\(o\)/, 'personagepreview geeft de rompref terug'],
  ['cutscenehost.js', /releaseVehicleGeometries\(c\)/, 'cutscenehost geeft de voertuigrefs van props terug'],
  ['cutscenehost.js', /releasePersonGeometry\(c\)/, 'cutscenehost geeft de rompref van acteurs terug'],
  ['werf3d.js', /releaseVehicleGeometries\(obj\.schip\)/, 'werf geeft de scheepsref terug'],
  ['coopentities3d.js', /disposeObject\(m\)/, 'gastvoertuigen gaan via disposeObject'],
  ['dorpsuitjes.js', /disposeObject\(a\.boat\)/, 'dorpsuitjes geeft de bootref terug'],
  ['trailer.js', /import \{ getScene, prewarmStreamAt, disposeObject \}/, 'trailer haalt de opruimer van scene3d binnen'],
  ['trailer.js', /function disposeTrailerProps\(\)[\s\S]{0,300}disposeTrailerProp\(o\)[\s\S]{0,200}trailerProps\.clear\(\)/, 'trailer maakt de props-map leeg bij het opruimen'],
  ['trailer.js', /function disposeTrailerProp\(o\)[\s\S]{0,400}disposeObject\(o\)/, 'trailer-props gaan via disposeObject'],
  ['trailer.js', /clearShot\(r\);\s*\n\s*group\.removeFromParent\(\);\s*\n\s*r\.light\.removeFromParent\(\);\s*\n\s*disposeTrailerProps\(\); \/\/ #797/, 'het einde van het traject ruimt de props op'],
  ['trailer.js', /disposeTrailerProps\(\); \/\/ #797: een vorig traject[\s\S]{0,140}r\.prop =/, 'een nieuw traject begint schoon'],
  ['scene3d.js', /function detachPlayerRider\(mesh\)/, 'de herbruikbare playerRider wordt vóór het opruimen losgekoppeld'],
  ['scene3d.js', /detachPlayerRider\(mesh\);\s*\n\s*scene\.remove\(mesh\);\s*\n\s*disposeObject\(mesh\);/, 'een voertuigmesh wordt zonder de playerRider opgeruimd'],
  ['scene3d.js', /g\.userData && typeof g\.userData\.personRefs === 'number'/, 'een geometrie zonder userData crasht de opruimer niet (#804-run)'],
  ['models3d_people.js', /if \(body && body\.userData\) body\.userData\.personRefsGiven = true/, 'een persoonsmesh zonder body crasht niet (#804-run)'],
];
for (const [file, re, name] of guards) ok(re.test(src(file)), name, file);

// De oude, directe skinned-dispose-patronen zijn weg.
const oldPatterns = [
  ['missionstory.js', /if \(o\.isSkinnedMesh\) \{\s*o\.geometry\.dispose\(\)/],
  ['heist.js', /\(o\.isSkinnedMesh \|\| !people\.has\(o\)\)\) o\.geometry\.dispose\(\)/],
  ['kermis.js', /if \(o\.isSkinnedMesh\) \{ o\.geometry\.dispose\(\)/],
  ['fierljep.js', /if \(o\.isSkinnedMesh\) o\.geometry\.dispose\(\)/],
  ['kartbaan.js', /if \(o\.isSkinnedMesh\) \{ o\.geometry\.dispose\(\)/],
  ['pg_koe.js', /if \(o\.isSkinnedMesh\) \{ o\.geometry\.dispose\(\)/],
  ['radiostudio.js', /if \(o\.isSkinnedMesh\) \{ o\.geometry\.dispose\(\)/],
  ['storyfun.js', /if \(o\.isSkinnedMesh\) \{ o\.geometry\.dispose\(\)/],
];
for (const [f, re] of oldPatterns) ok(!re.test(src(f)), `geen directe skinned-dispose meer in ${f}`, f);

console.log(fails ? `${fails} van ${n} opruimpaden-checks mislukt` : `opruimpaden_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
