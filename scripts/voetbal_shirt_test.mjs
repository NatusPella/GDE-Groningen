// Test van de shirtpatronen in 3D (#1115): de bandjes van voetbalworld.js (puur) en de laag die models3d_people.js op het borstbeen zet (echte three.js, geen beeld).
// Vraagt de gevendorde three.js (GDE_VENDOR_CACHE). Of de strepen er op het scherm goed uitzien is nog niet bekeken.   node scripts/voetbal_shirt_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const THREE = await import('three');
const W = await import('../game/js/voetbalworld.js');
const { buildPersonMesh } = await import('../game/js/models3d_people.js');
const { disposeObject } = await import('../game/js/scene3d.js');

let n = 0;
const t = (naam, f) => { try { f(); n++; } catch (e) { console.error('FAIL', naam); throw e; } };
const look = { age: 'adult', build: 'slim', hat: null, top: 'tee', bottom: 'shorts', shoeType: 'sneaker', bag: null, umbrella: null, glasses: false };
const bouw = (shirtBands, extra = {}) => buildPersonMesh(0x2f9e5b, 0xd9b48f, { variant: 'male', seed: 9811, pants: 0xffffff, shoes: 0x1a1a1a, look, shirtBands, ...extra });
const bandsOf = (g) => { let m = null; g.traverse((o) => { if (o.name === 'shirtBands') m = o; }); return m; };

t('de bandjes: effen heeft er geen, brede streep twee, smalle streep vier, helften een; samen met de grondkleur de hele breedte', () => {
  assert.deepEqual(W.shirtBands('effen'), []);
  assert.equal(W.shirtBands('brede-streep').length, 2);
  assert.equal(W.shirtBands('smalle-streep').length, 4);
  assert.deepEqual(W.shirtBands('helften'), [[0.5, 1]]);
  assert.deepEqual(W.shirtBands('onbekend'), []);
  for (const p of ['brede-streep', 'smalle-streep', 'helften']) for (const [a, b] of W.shirtBands(p)) assert.ok(a >= 0 && b <= 1 && b > a);
});

t('shirtBandsFor: een keeper en een effen shirt krijgen niets; de tweede kleur valt terug op de broek', () => {
  assert.equal(W.shirtBandsFor({ patroon: 'brede-streep', accent: 0x111111, broek: 0xffffff }, true), null);
  assert.equal(W.shirtBandsFor({ patroon: 'effen', broek: 0xffffff }), null);
  assert.equal(W.shirtBandsFor(null), null);
  assert.equal(W.shirtBandsFor({ patroon: 'helften', broek: 0xabcdef }).color, 0xabcdef);
  assert.equal(W.shirtBandsFor({ patroon: 'helften', accent: 0x111111, broek: 0xabcdef }).color, 0x111111);
});

t('zonder bandjes geen extra laag; met bandjes precies een mesh aan het borstbeen, binnen het postuur van de romp', () => {
  assert.equal(bandsOf(bouw(null)), null);
  assert.equal(bandsOf(bouw({ bands: [], color: 0 })), null);
  const g = bouw(W.shirtBandsFor({ patroon: 'smalle-streep', accent: 0x111111, broek: 0xffffff }));
  const m = bandsOf(g);
  assert.ok(m && m.parent === g.userData.chest, 'aan het borstbeen');
  m.geometry.computeBoundingBox();
  const b = m.geometry.boundingBox;
  // chest-lokaal: de romp loopt van ongeveer 0,97 tot 1,46 m (heupen 0,93, borst 1,07)
  assert.ok(b.min.y >= 0.96 - 1.07 - 1e-6 && b.max.y <= 1.47 - 1.07 + 1e-6, `hoogte ${b.min.y}..${b.max.y}`);
  assert.ok(b.max.z <= 0.21 && b.min.z >= -0.21, `breedte ${b.min.z}..${b.max.z}`);
  assert.ok(b.max.x <= 0.2 && b.min.x >= -0.2, `diepte ${b.min.x}..${b.max.x}`);
  const alleen = bouw(W.shirtBandsFor({ patroon: 'helften', accent: 0x111111, broek: 0xffffff }));
  const h = bandsOf(alleen).geometry; h.computeBoundingBox();
  assert.ok(h.boundingBox.min.z >= -0.01, 'de helft ligt aan een kant');
  for (const v of m.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
});

t('de bandjesgeometrie is gedeeld tussen spelers van een team en blijft na disposeObject bruikbaar', () => {
  const spec = W.shirtBandsFor({ patroon: 'brede-streep', accent: 0x111111, broek: 0xffffff });
  const a = bouw(spec), b = bouw(spec, { seed: 9824 });
  assert.equal(bandsOf(a).geometry, bandsOf(b).geometry, 'gelijke bouw deelt de geometrie');
  assert.equal(bandsOf(a).material, bandsOf(b).material);
  let weg = 0; bandsOf(a).geometry.addEventListener('dispose', () => weg++);
  disposeObject(a);
  assert.equal(weg, 0, 'de gedeelde geometrie wordt niet vrijgegeven');
  assert.ok(bandsOf(b).geometry.attributes.position.count > 0);
});

console.log(`voetbal_shirt_test ok (${n} groepen)`);
