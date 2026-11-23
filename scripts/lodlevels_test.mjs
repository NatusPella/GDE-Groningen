// LOD-niveaus met een dither-overgang (vettruck 23-11, eis eigenaar: elk model 2-3 LOD-niveaus). Keurt de pure regels
// (lodlevels.js), de three-kant (lod3d.js DitherLOD: welke materialen staan, met welke dither) en de modellen die het nu
// gebruiken: de tankwagen van Us Mem Vet (VOERTUIG_REGISTER.tankwagen.lod) en het vat en de jerrycan (PROP_REGISTER).
//   node scripts/lodlevels_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';

const THREE = await import('three');
const { lodChoice, lodDither, lodError, lodLevelCount } = await import('../game/js/lodlevels.js');
const { DitherLOD } = await import('../game/js/lod3d.js');
const { PROP_REGISTER, VOERTUIG_REGISTER } = await import('../game/js/propregister.js');
const { propGeometry } = await import('../game/js/propmodels3d.js');

let bad = 0;
const ok = (name, c, info = '') => { if (!c) { bad++; console.log('FAIL', name, info); } else if (process.argv.includes('-v')) console.log('ok  ', name, info); };
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// --- de pure regels
const L = { grenzen: [40, 120], band: 8 };
ok('geldige opgave', lodError(L) === null);
ok('grenzen die te dicht liggen worden afgekeurd', lodError({ grenzen: [40, 45], band: 8 }) !== null);
ok('een grens binnen de halve band wordt afgekeurd', lodError({ grenzen: [3], band: 8 }) !== null);
ok('geen grenzen wordt afgekeurd', lodError({}) !== null && lodError(null) !== null);
ok('drie niveaus bij twee grenzen', lodLevelCount(L) === 3);
const k = (d, l = L) => lodChoice(d, l);
ok('dichtbij: niveau 0, geen overgang', k(10).a === 0 && k(10).b === -1 && k(10).t === 0);
ok('begin van de band: 0 naar 1 op t = 0', k(36).a === 0 && k(36).b === 1 && near(k(36).t, 0));
ok('midden van de band: t = 0,5', near(k(40).t, 0.5));
ok('einde van de band: t = 1', near(k(44).t, 1));
ok('tussen de grenzen: niveau 1', k(80).a === 1 && k(80).b === -1);
ok('ver: het laatste niveau blijft staan zonder weg', k(5000).a === 2 && k(5000).b === -1);
ok('negatief of NaN telt als 0', k(-3).a === 0 && k(NaN).a === 0);
let mono = true, prev = -1;
for (let d = 0; d < 200; d += 0.25) { const x = k(d), r = x.a + x.t; if (r < prev - 1e-9) mono = false; prev = r; }
ok('niveau plus overgang loopt monotoon op met de afstand (geen heen en weer)', mono);
const W = { grenzen: [18, 50], band: 4, weg: 140 };
ok('met weg: in de band dooft het laatste niveau uit naar niets', k(140, W).a === 2 && k(140, W).b === -1 && near(k(140, W).t, 0.5) && k(140, W).gone);
ok('met weg: voorbij de band is het model weg', k(200, W).a === -1);
const dm = lodDither(k(40));
ok('dither: het uitdovende niveau houdt bayer < k, het inkomende bayer >= k (samen elke pixel één keer)', dm.get(0).keep === dm.get(1).keep && !dm.get(0).complement && dm.get(1).complement && !dm.has(2));
ok('dither buiten een band: één niveau, volledig', lodDither(k(80)).size === 1 && lodDither(k(80)).get(1).keep === 1);
ok('dither als het model weg is: niets', lodDither(k(200, W)).size === 0);

// --- DitherLOD op losse materialen
const m0 = new THREE.MeshStandardMaterial(), m1 = new THREE.MeshStandardMaterial(), m2 = new THREE.MeshStandardMaterial(), wiel = new THREE.MeshStandardMaterial();
const lod = new DitherLOD(L, [[m0, wiel], [m1, wiel], [m2]]);
const u = (m) => m.userData.lodDither.value;
lod.update(null, 10);
ok('dichtbij: alleen niveau 0 en de wielen', m0.visible && wiel.visible && !m1.visible && !m2.visible && u(m0).x === 1 && u(m0).y === 0);
lod.update(null, 40);
ok('in de band 0-1: beide romp-niveaus met aanvullende dither', m0.visible && m1.visible && near(u(m0).x, 0.5) && u(m0).y === 0 && near(u(m1).x, 0.5) && u(m1).y === 1);
ok('een materiaal in beide niveaus dithert niet (de wielen)', wiel.visible && u(wiel).x === 1 && u(wiel).y === 0);
lod.update(null, 120);
ok('in de band 1-2: de wielen doven uit', wiel.visible && near(u(wiel).x, 0.5) && u(wiel).y === 0 && m2.visible && u(m2).y === 1 && !m0.visible);
lod.update(null, 300);
ok('ver: alleen niveau 2', m2.visible && !m1.visible && !m0.visible && !wiel.visible && lod.level === 2);
ok('materialen zijn gepatcht met een gedeelde programmasleutel', m0.customProgramCacheKey().endsWith('|loddither') && m0.customProgramCacheKey() === m1.customProgramCacheKey());
const shader = { uniforms: {}, fragmentShader: 'void main() {\n}' };
m0.onBeforeCompile(shader, null);
ok('de shader krijgt de uniform en een discard', shader.uniforms.uLodDither === m0.userData.lodDither && /discard/.test(shader.fragmentShader));

// --- de tankwagen: drie niveaus onder de romp
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const tw = VOERTUIG_REGISTER.tankwagen;
ok('tankwagen: LOD-opgave in het register klopt', lodError(tw.lod) === null && lodLevelCount(tw.lod) === 3);
const mesh = buildVehicleMesh({ id: 'lod-tank', model: { ...tw.model }, health: 100 });
const tl = mesh.userData.lod;
ok('tankwagen: DitherLOD hangt onder de romp (veert mee)', tl && tl.isLOD && tl.parent === mesh.userData.body);
const lagen = [mesh.userData.body];
mesh.userData.body.traverse((o) => { if (o.isMesh && o.userData.lodNiveau > 0) lagen[o.userData.lodNiveau] = o; });
const tris = (m) => (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
ok('tankwagen: drie niveaus', lagen.length === 3 && lagen.every(Boolean));
ok('tankwagen: elk niveau minstens 60 % lichter dan het vorige', tris(lagen[1]) <= tris(lagen[0]) * 0.4 && tris(lagen[2]) <= tris(lagen[1]) * 0.4, lagen.map(tris).join(' / '));
const bb = (m) => { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; return [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z]; };
const b0 = bb(lagen[0]);
ok('tankwagen: de lichte niveaus hebben dezelfde omvang (geen sprong in silhouet)', [1, 2].every((n) => bb(lagen[n]).every((x, i) => Math.abs(x - b0[i]) < 0.6)), [0, 1, 2].map((n) => bb(lagen[n]).map((x) => x.toFixed(2)).join('x')).join(' / '));
const zicht = (m) => (Array.isArray(m.material) ? m.material : [m.material]).some((x) => x.visible);
tl.update(null, 5);
ok('tankwagen dichtbij: alleen niveau 0 en de wielen', zicht(lagen[0]) && !zicht(lagen[1]) && !zicht(lagen[2]) && zicht(mesh.userData.wheels[0]));
tl.update(null, 80);
ok('tankwagen op 80 m: niveau 1 met wielen', !zicht(lagen[0]) && zicht(lagen[1]) && !zicht(lagen[2]) && zicht(mesh.userData.wheels[0]));
tl.update(null, 400);
ok('tankwagen op 400 m: niveau 2 zonder losse wielen', !zicht(lagen[0]) && !zicht(lagen[1]) && zicht(lagen[2]) && !zicht(mesh.userData.wheels[0]));
let nan = false;
for (const m of lagen) for (const x of m.geometry.attributes.position.array) if (!Number.isFinite(x)) nan = true;
ok('tankwagen: geen NaN in de niveaus', !nan);

// --- de props met LOD
const { DECOR_MAKERS, measureModel } = await import('../game/js/storyprops.js');
for (const [id, e] of Object.entries(PROP_REGISTER)) {
  if (!e.lod) continue;
  ok(`${id}: LOD-opgave klopt`, lodError(e.lod) === null && lodLevelCount(e.lod) >= 2);
  const n = lodLevelCount(e.lod), t = [];
  for (let i = 0; i < n; i++) t.push(propGeometry(id, i).attributes.position.count / 3);
  ok(`${id}: elk niveau lichter dan het vorige`, t.every((x, i) => !i || x < t[i - 1] * 0.7), t.join(' / '));
  ok(`${id}: niveau 0 is de geometrie van de wereld en het register`, propGeometry(id, 0) === propGeometry(id));
  const g = DECOR_MAKERS[id]();
  ok(`${id}: de cutscene bouwt een DitherLOD met ${n} niveaus`, g.userData.lod && g.userData.lod.lodLevels.length === n);
  ok(`${id}: het polygoonbudget telt alleen niveau 0`, measureModel(g).tris === t[0], measureModel(g).tris + ' tegen ' + t[0]);
  g.userData.lod.update(null, e.lod.weg + 50);
  ok(`${id}: voorbij 'weg' is hij weg`, g.children.filter((c) => c.isMesh).every((c) => !c.material.visible));
}

console.log(bad ? `lodlevels_test: ${bad} mislukt` : 'lodlevels_test: ok');
process.exit(bad ? 1 : 0);
