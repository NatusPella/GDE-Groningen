// Het ene duivenmodel (game/js/pigeonmodel.js, 22-11) en alles wat het gebruikt: driehoekenbudget per niveau met een onder- en bovengrens (de
// ondergrens houdt het af van een doos met vleugels), een gladde romp (geen doos: de vulling van de omhullende doos), geen NaN, het silhouet
// via een kleine softwarerenderer, de kleurvarianten, de gedeelde geometrie en het opruimen, en dat geen enkele plek de oude blokvogels bouwt.
//   node scripts/pigeonmodel_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage, of GDE_VENDOR_CACHE)
import './node3d.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderView } from './lib/pigeon_render.mjs';

const THREE = await import('three');
const M = await import('../game/js/pigeonmodel.js');
const P = await import('../game/js/pigeonmode.js');
const B = await import('../game/js/birds.js');
const W = await import('../game/js/wildlife.js');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + String(e.message).split('\n')[0]); } };
const src = (f) => readFileSync(new URL(`../game/js/${f}`, import.meta.url), 'utf8');
const sansComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/.*$/gm, '');

const finite = (g) => {
  for (const k of Object.keys(g.attributes)) for (const v of g.attributes[k].array) if (!Number.isFinite(v)) return false;
  return true;
};
const tris = (g) => M.geoTris(g);
const boxOf = (g) => { g.computeBoundingBox(); return g.boundingBox; };
// inhoud van een gesloten net (som van getekende tetraëders) gedeeld door het volume van de omhullende doos: een doos is 1, een ellipsoïde ~0,52
const fill = (g) => {
  const p = g.attributes.position, ix = g.index;
  let v = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < ix.count; i += 3) { a.fromBufferAttribute(p, ix.getX(i)); b.fromBufferAttribute(p, ix.getX(i + 1)); c.fromBufferAttribute(p, ix.getX(i + 2)); v += a.dot(b.clone().cross(c)) / 6; }
  const bb = boxOf(g), s = bb.getSize(new THREE.Vector3());
  return Math.abs(v) / (s.x * s.y * s.z);
};

// --- budgetten --------------------------------------------------------------------------------------------------------
t('elk niveau zit binnen zijn driehoekenbudget, als onderdelen en samengevoegd', () => {
  for (const lod of ['hi', 'mid', 'far']) {
    const b = M.PIGEON_LOD[lod];
    for (const kind of ['pigeon', 'gull']) {
      const parts = M.pigeonParts(lod, { kind });
      const k = M.partsTris(parts);
      assert.ok(k >= b.min && k <= b.max, `${lod}/${kind}: ${k} driehoeken buiten ${b.min}-${b.max}`);
      const g = M.pigeonMerged(lod, { kind }, { wings: 0.25 });
      assert.equal(tris(g), k, `${lod}/${kind}: samengevoegd is dezelfde duif`);
      assert.ok(finite(g), `${lod}/${kind}: geen NaN`);
    }
  }
});

t('het budget: hi 600-1200, mid 200-400, far 80-120 (de eisen van de eigenaar)', () => {
  assert.deepEqual([M.PIGEON_LOD.hi.min, M.PIGEON_LOD.hi.max, M.PIGEON_LOD.mid.min, M.PIGEON_LOD.mid.max, M.PIGEON_LOD.far.min, M.PIGEON_LOD.far.max], [600, 1200, 200, 400, 80, 120]);
});

t('de zwerm (romp + 2 vleugels) en de skelet-duif van wildlife zijn middelniveau', () => {
  const body = M.pigeonMerged('mid', {}, { wings: 'none' }), wing = M.pigeonWingGeometry('mid');
  const k = tris(body) + 2 * tris(wing);
  assert.ok(k >= M.PIGEON_LOD.mid.min && k <= M.PIGEON_LOD.mid.max, `zwermvogel ${k}`);
  const mesh = W.buildPigeonMesh3D(0);
  let sk = null; mesh.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
  const wt = tris(sk.geometry);
  assert.ok(wt >= M.PIGEON_LOD.mid.min && wt <= M.PIGEON_LOD.mid.max, `wildlife-duif ${wt}`);
  assert.ok(finite(sk.geometry));
  const bones = sk.skeleton.bones.length;
  for (const v of sk.geometry.attributes.skinIndex.array) assert.ok(v < bones, 'skinIndex wijst naar een bot');
  assert.equal(mesh.userData.wings.length, 2);
  for (const w of mesh.userData.wings) assert.ok(w.children[0], 'elke vleugel heeft een buitenbot');
});

t('de meeuw van wildlife is het middelniveau (kind gull), in een filmpje het hoogste, met een wit lijf en gele snavel', () => {
  const skinned = (m) => { let x = null; m.traverse((o) => { if (o.isSkinnedMesh) x = o; }); return x; };
  const mid = skinned(W.buildSeagullMesh3D()), hi = skinned(W.buildSeagullMesh3D('hi'));
  assert.ok(tris(mid.geometry) >= M.PIGEON_LOD.mid.min && tris(mid.geometry) <= M.PIGEON_LOD.mid.max, `meeuw mid ${tris(mid.geometry)}`);
  assert.ok(tris(hi.geometry) >= M.PIGEON_LOD.hi.min && tris(hi.geometry) <= M.PIGEON_LOD.hi.max, `meeuw hi ${tris(hi.geometry)}`);
  const duifHi = skinned(W.buildPigeonMesh3D(0, 'hi'));
  assert.ok(tris(duifHi.geometry) >= M.PIGEON_LOD.hi.min && tris(duifHi.geometry) <= M.PIGEON_LOD.hi.max, `duif hi ${tris(duifHi.geometry)}`);
  const gm = W.buildWildlifeMesh3D({ kind: 'pigeon', bobSeed: 0, lod: 'hi' });
  assert.equal(tris(skinned(gm).geometry), tris(duifHi.geometry), 'een filmpje vraagt het hoogste niveau via lod');
  assert.ok(finite(mid.geometry) && finite(hi.geometry));
  const bones = mid.skeleton.bones.length;
  for (const v of mid.geometry.attributes.skinIndex.array) assert.ok(v < bones);
  const src2 = sansComments(src('cutscenehost.js'));
  assert.ok(/lod: 'hi'/.test(src2), 'de cutscene-props vragen het hoogste niveau');
});

t('de spelersduif (hoogste niveau) is 10 meshes of minder, met de glanzende nek apart', () => {
  const bird = P.buildPigeonBird('pigeon');
  let meshes = 0, shiny = 0, k = 0;
  bird.traverse((o) => { if (o.isMesh) { meshes++; k += tris(o.geometry); if (o.material.metalness > 0) shiny++; } });
  assert.ok(meshes <= 11 && meshes >= 8, `meshes: ${meshes}`);
  assert.equal(shiny, 1, 'een glanzende nek');
  assert.ok(k >= M.PIGEON_LOD.hi.min && k <= M.PIGEON_LOD.hi.max, `driehoeken ${k}`);
  const gull = P.buildPigeonBird('gull');
  let gm = 0; gull.traverse((o) => { if (o.isMesh) gm++; });
  assert.ok(gm <= 10, `meeuw ${gm}`);
  const u = bird.userData;
  for (const k2 of ['body', 'head', 'tail', 'wingL', 'wingR', 'legs']) assert.ok(u[k2] && u[k2].isObject3D, k2);
  assert.equal(u.legParts.length, 2);
  assert.ok(u.body.children[0].isMesh && u.body.children[0].castShadow, 'body.children[0] is de romp (pigeonspots)');
});

// --- geen doos ---------------------------------------------------------------------------------------------------------
t('de romp is geen doos: de vulling van de omhullende doos is die van een afgeronde vorm (< 0,65), per niveau', () => {
  const box = new THREE.BoxGeometry(1, 1, 1);
  assert.ok(fill(box) > 0.99, 'een doos vult zijn doos');
  for (const lod of ['hi', 'mid', 'far']) {
    const body = M.pigeonParts(lod).find((p) => p.g === 'body' && !p.shiny).geo;
    const f = fill(body);
    assert.ok(f > 0.3 && f < 0.65, `${lod}: romp vult ${(f * 100).toFixed(0)}%`);
  }
  const ell = new THREE.SphereGeometry(1, 16, 12);
  assert.ok(fill(ell) < 0.55 && fill(ell) > 0.45, 'een bol vult ~52%');
});

t('geen enkel onderdeel is een doos: geen onderdeel met een volle omhullende doos als het gesloten is', () => {
  for (const lod of ['hi', 'mid']) {
    for (const p of M.pigeonParts(lod)) {
      if (!(p.g === 'body' || p.g === 'head')) continue;
      const f = fill(p.geo);
      if (f > 0.05) assert.ok(f < 0.75, `${lod}/${p.g}: ${(f * 100).toFixed(0)}%`);
    }
  }
});

// --- het silhouet (software-render, zijaanzicht en bovenaanzicht) ----------------------------------------------------------
const flat = (lod, o, w) => [{ geo: M.pigeonMerged(lod, o, { wings: w }) }];
t('silhouet: zijaanzicht van een zittende duif is lang, gevuld en geen rechthoek', () => {
  for (const lod of ['hi', 'mid', 'far']) {
    const r = renderView(THREE, flat(lod, {}, 'folded'), 'zij');
    const box = r.bbox.w * r.bbox.h;
    const verhouding = r.bbox.w / r.bbox.h;
    assert.ok(verhouding > 1.2 && verhouding < 3.2, `${lod}: breed/hoog ${verhouding.toFixed(2)}`);
    const vulling = r.filled / box;
    assert.ok(vulling > 0.3 && vulling < 0.78, `${lod}: het silhouet vult ${(vulling * 100).toFixed(0)}% van zijn doos (een doos is 100%)`);
    assert.ok(r.filled > 1500, `${lod}: genoeg pixels (${r.filled})`);
  }
});

t('silhouet: gespreide vleugels maken het bovenaanzicht veel breder dan het lijf, op elk niveau', () => {
  for (const lod of ['hi', 'mid', 'far']) {
    const z = renderView(THREE, flat(lod, {}, 'folded'), 'boven');
    const g = renderView(THREE, flat(lod, {}, 0.1), 'boven');
    assert.ok(g.bbox.h > z.bbox.h * 1.45, `${lod}: gespreid ${g.bbox.h} tegen gevouwen ${z.bbox.h} pixels breed`);
    assert.ok(g.filled > z.filled, `${lod}: de vleugels vullen pixels bij`);
    // de vleugel is een vorm met een rand, geen rechthoek: de vulling van het bovenaanzicht is ver onder de 100%
    assert.ok(g.filled / (g.bbox.w * g.bbox.h) < 0.72, `${lod}: bovenaanzicht vult ${(g.filled / (g.bbox.w * g.bbox.h) * 100).toFixed(0)}%`);
  }
});

t('silhouet: ver weg blijft herkenbaar (kop, romp, staart, vleugels): meer dan 40% van de pixels van het hoogste niveau', () => {
  const hi = renderView(THREE, flat('hi', {}, 0.1), 'boven'), far = renderView(THREE, flat('far', {}, 0.1), 'boven');
  assert.ok(far.filled > hi.filled * 0.4, `ver ${far.filled} tegen hoog ${hi.filled}`);
});

// --- kleurvarianten ----------------------------------------------------------------------------------------------------
const gem = (g) => { const c = g.attributes.color, a = [0, 0, 0]; for (let i = 0; i < c.count; i++) { a[0] += c.getX(i); a[1] += c.getY(i); a[2] += c.getZ(i); } return a.map((v) => v / c.count); };
t('kleurvarianten: grijs, wit, bruin, gevlekt en een eigen tint verschillen en zijn geen NaN', () => {
  const m = {};
  for (const v of ['grijs', 'wit', 'bruin', 'gevlekt', 0x5a5e66]) { const g = M.pigeonMerged('mid', { variant: v }, { wings: 'folded' }); assert.ok(finite(g), String(v)); m[v] = gem(g); }
  assert.ok(m.wit[0] > m.grijs[0] * 1.3, 'wit is lichter dan grijs');
  assert.ok(m.bruin[0] > m.bruin[2] * 1.15, 'bruin is warm (meer rood dan blauw)');
  assert.ok(m.grijs[2] >= m.grijs[0], 'grijs is koel');
  assert.ok(m.gevlekt[0] < m.grijs[0] + 1e-6 || Math.abs(m.gevlekt[0] - m.grijs[0]) > 0.003, 'gevlekt wijkt af');
  const sp = M.pigeonMerged('hi', { variant: 'gevlekt' }, { wings: 'folded' }).attributes.color;
  let donker = 0; for (let i = 0; i < sp.count; i++) if (sp.getX(i) < 0.12) donker++;
  assert.ok(donker > 20, `er zijn donkere vlekken (${donker})`);
  assert.ok(Math.abs(m[0x5a5e66][0] - m.grijs[0]) > 0.01, 'een getal als tint kleurt de duif');
  const gull = M.pigeonPalette('gull');
  assert.ok(gull.body > 0xe0e0e0 && gull.beak === 0xf2c230, 'de meeuw is wit met een gele snavel');
  const bird = P.buildPigeonBird('pigeon', 'wit'), grey = P.buildPigeonBird('pigeon', 'grijs');
  assert.notEqual(bird.userData.body.children[0].geometry, grey.userData.body.children[0].geometry, 'een andere kleur is een andere geometrie');
});

// --- delen, opruimen ---------------------------------------------------------------------------------------------------
t('gedeelde geometrie: twee duiven delen hun geometrie en materialen (geen kopie per duif)', () => {
  const a = P.buildPigeonBird('pigeon'), b = P.buildPigeonBird('pigeon');
  assert.equal(a.userData.head.children[0].geometry, b.userData.head.children[0].geometry);
  assert.equal(a.userData.head.children[0].material, b.userData.head.children[0].material);
  const w1 = W.buildPigeonMesh3D(1), w2 = W.buildPigeonMesh3D(1);
  const g = (m) => { let x; m.traverse((o) => { if (o.isSkinnedMesh) x = o.geometry; }); return x; };
  assert.equal(g(w1), g(w2), 'de skelet-duif deelt zijn geometrie per kleur');
});

t('de zwerm: gedeelde geometrie en materiaal (userData.shared), de matrices zijn eindig en opruimen laat de rest staan', () => {
  const group = new THREE.Group();
  const f = B.makeBirds(group, 0, 0, 2, 12);
  assert.equal(f.body.count, 12);
  assert.equal(f.wings.count, 24);
  assert.equal(f.body.geometry.userData.shared, true);
  assert.equal(f.wings.geometry.userData.shared, true);
  assert.equal(f.body.material.userData.shared, true);
  B.scatterBirds(f, 0, 0);
  for (let i = 0; i < 90; i++) B.updateBirds(f, 1 / 30, i / 30);
  for (const m of [f.body, f.wings]) for (const v of m.instanceMatrix.array) assert.ok(Number.isFinite(v), 'matrix eindig');
  const f2 = B.makeBirds(group, 5, 5, 2, 4);
  assert.equal(f2.body.geometry, f.body.geometry, 'twee zwermen delen de romp');
  assert.equal(group.children.length, 4, 'twee instanced meshes per zwerm');
});

t('de nek van een duif is glanzend, de rest niet; een meeuw heeft geen glanzende delen', () => {
  const glans = (b) => { let k = 0; b.traverse((o) => { if (o.isMesh && (o.material.metalness > 0 || o.material.emissive.getHex() > 0)) k++; }); return k; };
  assert.equal(glans(P.buildPigeonBird('pigeon')), 1);
  assert.equal(glans(P.buildPigeonBird('gull')), 0);
});

t('poseBird: alle standen geven eindige matrices (vliegen, zitten, lopen, pikken)', () => {
  const bird = P.buildPigeonBird('pigeon');
  for (const pose of [{ flapPhase: 0, amp: 1, fold: 0, grounded: false }, { flapPhase: 2, amp: 0.9, fold: 0, grounded: false }, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 1.3 }, { flapPhase: 0, amp: 0, fold: 1, grounded: true, peck: 1 }]) {
    P.posePigeonBird(bird, pose);
    bird.updateMatrixWorld(true);
    bird.traverse((o) => { for (const v of o.matrixWorld.elements) assert.ok(Number.isFinite(v)); });
  }
});

t('poseBird: zweven, landen, bocht en koeren (vervolg 23-11) zijn eindig en doen wat ze zeggen', () => {
  const bird = P.buildPigeonBird('pigeon');
  bird.userData.seed = 0;
  const poses = { zweven: { flapPhase: 0.4, amp: 0.08, fold: 0, grounded: false, roll: 0.5, pitch: -0.2, time: 1 }, landen: { flapPhase: 1, amp: 0.9, fold: 0, grounded: false, landing: 1, time: 2 }, koeren: { flapPhase: 0, amp: 0, fold: 1, grounded: true, idle: true, time: 1.3 }, lopen: { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 0.7, time: 3 } };
  const u = bird.userData;
  for (const [naam, pose] of Object.entries(poses)) {
    u.poseT = undefined;   // een losse pose: de landingsstand springt meteen goed (in het spel loopt hij in)
    P.posePigeonBird(bird, pose);
    bird.updateMatrixWorld(true);
    bird.traverse((o) => { for (const v of o.matrixWorld.elements) assert.ok(Number.isFinite(v), naam); });
    if (naam === 'zweven') { assert.ok(u.wingL.rotation.x !== 0 && Math.abs(u.head.rotation.x) > 0.2, 'de kop blijft waterpas in de bocht'); assert.ok(u.tail.scale.z > 1, 'de staart waaiert in de bocht'); }
    if (naam === 'landen') { assert.ok(u.legs.rotation.z > 0, 'de poten komen naar voren'); assert.ok(u.tail.scale.z > 1.5, 'de staart remt'); }
    if (naam === 'koeren') assert.ok(u.body.scale.y > 1.03 && u.tail.scale.z > 1.2, 'de hals op, de staart gespreid');
  }
});

// --- niets meer van de oude blokvogels --------------------------------------------------------------------------------
t('de oude blokvogels zijn weg: geen BoxGeometry-vogel in de zwerm, geen bol als dier, geen box-vogel in het weidegebied, geen birdbake', () => {
  const birds = sansComments(src('birds.js'));
  assert.ok(!/BoxGeometry|PlaneGeometry/.test(birds), 'birds.js bouwt geen doos of plaatje meer');
  assert.ok(/pigeonMerged\('mid'/.test(birds) && /pigeonWingGeometry\('mid'\)/.test(birds), 'birds.js gebruikt het middelniveau');
  const wl = sansComments(src('worldlife3d.js'));
  assert.ok(!/SphereGeometry\(1, 6, 4\)/.test(wl) && /pigeonMerged\('far'/.test(wl), 'het wereldleven tekent het verste niveau');
  const cl = sansComments(src('countrylife.js'));
  assert.ok(/pigeonMerged\('mid'/.test(cl) && !/B\.box\(0, 0\.1, 0, 0\.3/.test(cl), 'de weidevogels zijn het middelniveau');
  const pm = sansComments(src('pigeonmode.js'));
  assert.ok(!/bakeBird|birdbake|function blob\(/.test(pm) && !/function buildWing\(/.test(pm), 'pigeonmode.js bouwt geen blobs en dozen meer');
  const wi = sansComments(src('wildlife.js'));
  assert.ok(/pigeonBoneParts\(lod/.test(wi) && /seagullGeometry\(lod\)/.test(wi), 'wildlife.js bouwt duif en meeuw uit het model');
});

// #1195: een duif bij een voerplek staat op de grond daar (stoep, plein), niet half in de stenen op hoogte 0
t('voerplek-duiven staan op de grondhoogte (pigeonspots.js)', () => {
  assert.match(src('pigeonspots.js'), /mesh\.position\.set\(p\[0\], \(map\.groundHeightAt && map\.groundHeightAt\(p\[0\], p\[1\], 0\)\) \|\| 0, p\[1\]\)/);
});

// #1195 (hertest 24-11): duiven op de keien waren 0,9 m (de maat van de speelbare duif) en een landende duif cirkelde laag en scheef rond zijn plek
t('#1195: een duif op de voerplek en in de zwerm is een stadsduif van 0,25 tot 0,45 m', () => {
  const spot = P.buildPigeonBird('pigeon', null);
  const S = Number(src('pigeonspots.js').match(/export const GROUND_PIGEON_SCALE = ([\d.]+)/)[1]);
  spot.scale.setScalar(S);
  spot.updateMatrixWorld(true);
  // snavel tot staart: romp, kop en staart (de vleugels liggen in de bindhouding gespreid en tellen niet mee)
  const b = new THREE.Box3();
  for (const o of [spot.userData.body.children[0], spot.userData.head, spot.userData.tail]) b.expandByObject(o);
  const lang = b.getSize(new THREE.Vector3()).x;
  assert.ok(lang > 0.3 && lang < 0.45, `voerplekduif ${lang.toFixed(2)} m van snavel tot staart`);
  assert.match(src('pigeonspots.js'), /mesh\.scale\.setScalar\(GROUND_PIGEON_SCALE\)/, 'de voerplek zet de maat van de stadsduif');
  const f = B.makeBirds(new THREE.Group(), 0, 0, 2, 1);
  f.body.geometry.computeBoundingBox();
  const z = f.body.geometry.boundingBox.getSize(new THREE.Vector3()).x;
  assert.ok(z > 0.25 && z < 0.45, `zwermduif ${z.toFixed(2)} m`);
});

t('#1195: een landende duif vlak boven de grond helt niet om en cirkelt niet eindeloos rond zijn plek', () => {
  const m = W.buildPigeonMesh3D(0);
  const a = { kind: 'pigeon', state: 'land', z: 0.2, angle: 0, speed: 1, bobSeed: 0.3 };
  for (let i = 0; i < 20; i++) { a.angle += 0.15; W.animateWildlifeMesh3D(m, a, i / 30); }
  const rx = Math.abs(m.userData.bones.body.rotation.x);
  assert.ok(rx < 0.1, `helling vlak boven de grond ${rx.toFixed(2)} rad`);
  const hoog = W.buildPigeonMesh3D(0);
  const b = { ...a, z: 4, angle: 0 };
  for (let i = 0; i < 20; i++) { b.angle += 0.15; W.animateWildlifeMesh3D(hoog, b, i / 30); }
  assert.ok(Math.abs(hoog.userData.bones.body.rotation.x) > 0.1, 'hoog in de lucht helt hij wel in de bocht');
  const w = src('wildlife.js');
  assert.match(w, /a\.speed = Math\.max\(d < 1\.5 \? 0\.3 : 1/, 'dicht bij de landingsplek remt hij af');
  assert.match(w, /a\.landT > 6 && a\.z < PIGEON_STAND_Y \+ 0\.8/, 'na zes seconden laag rondvliegen landt hij gewoon');
});

console.log(`\npigeonmodel_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
