// #1039: een vogel (pigeonmode.js) is ~11 meshes in plaats van ~28; de groepen blijven voor poseBird.
//   node scripts/birdbake_test.mjs   (heeft de gevendorde three nodig: cd desktop && npm run stage)
import './node3d.mjs';
import assert from 'node:assert/strict';

const P = await import('../game/js/pigeonmode.js');
const B = await import('../game/js/birdbake.js');
const THREE = await import('three');

let n = 0, fails = 0;
const t = (naam, fn) => { n++; try { fn(); console.log('ok   ' + naam); } catch (e) { fails++; console.log('FAIL ' + naam + '\n  ' + e.message.split('\n')[0]); } };

const meshesOf = (o) => { const l = []; o.traverse((c) => { if (c.isMesh) l.push(c); }); return l; };

t('een duif is hoogstens 12 meshes (was ~28)', () => {
  const bird = P.buildPigeonBird('pigeon');
  const k = B.birdDraws(bird);
  assert.ok(k <= 12 && k >= 8, `meshes: ${k}`);
});
t('een meeuw (zonder glanzende nek) is nog minder', () => {
  const k = B.birdDraws(P.buildPigeonBird('gull'));
  assert.ok(k <= 11, `meshes: ${k}`);
});
t('de glanzende nek houdt zijn eigen materiaal, de rest deelt één', () => {
  const bird = P.buildPigeonBird('pigeon');
  const shiny = meshesOf(bird).filter((m) => m.material.metalness > 0 || m.material.emissive.getHex() > 0);
  assert.equal(shiny.length, 2);
  const baked = meshesOf(bird).filter((m) => m.material === B.birdBakeMaterial());
  assert.ok(baked.length >= 8, `gebakken: ${baked.length}`);
  assert.ok(baked.every((m) => m.geometry.attributes.color && m.geometry.attributes.position.count > 0));
});
t('de groepen en hun volgorde blijven: body.children[0] is het gebakken lijf, schaduw aan', () => {
  const bird = P.buildPigeonBird('pigeon');
  const u = bird.userData;
  for (const k of ['body', 'head', 'tail', 'wingL', 'wingR', 'legs']) assert.ok(u[k] && u[k].isObject3D, k);
  assert.equal(u.legParts.length, 2);
  const first = u.body.children[0];
  assert.ok(first.isMesh && first.material === B.birdBakeMaterial() && first.castShadow === true);
  assert.ok(u.body.children.includes(u.head) && u.body.children.includes(u.tail) && u.body.children.includes(u.legs));
});
t('het aantal driehoeken blijft gelijk (alleen minder draws)', () => {
  const tris = (o) => meshesOf(o).reduce((a, m) => a + (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3, 0);
  // een niet-gebakken bouw: bakeGroup op niets doet niets
  const g = new THREE.Group();
  assert.equal(B.bakeGroup(g), null);
  const a = P.buildPigeonBird('pigeon', null), b = P.buildPigeonBird('pigeon', 0x112233);
  assert.equal(Math.round(tris(a)), Math.round(tris(b)));
  assert.ok(tris(a) > 600 && tris(a) < 1500, String(tris(a)));
});
t('poseBird beweegt de groepen nog (vleugel, kop, poten)', () => {
  const bird = P.buildPigeonBird('pigeon');
  P.posePigeonBird(bird, { flapPhase: 1.2, amp: 0.8, fold: 0, grounded: false, walkPhase: 0, peck: 0 });
  const u = bird.userData;
  assert.notEqual(u.wingL.rotation.x, 0);
  assert.ok(Math.abs(u.legs.rotation.z + 1.25) < 1e-9);
  P.posePigeonBird(bird, { flapPhase: 0, amp: 0, fold: 1, grounded: true, walkPhase: 0.7, peck: 1 });
  assert.ok(u.head.position.y < 0.115 && u.legParts[0].rotation.z !== 0);
});
t('een tint kleurt het lijf in de vertices (twee tinten, twee kleuren)', () => {
  const col = (bird) => { const c = bird.userData.body.children[0].geometry.attributes.color; return [c.getX(0), c.getY(0), c.getZ(0)]; };
  const a = col(P.buildPigeonBird('pigeon', 0x8a93a6)), b = col(P.buildPigeonBird('pigeon', 0xc9c6bf));
  assert.notDeepEqual(a, b);
});

console.log(fails ? `${fails} FAILED` : `birdbake_test ok (${n})`);
process.exit(fails ? 1 : 0);
