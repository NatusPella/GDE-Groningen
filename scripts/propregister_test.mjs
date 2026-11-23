// Het register van de gedeelde props (propregister.js, propmodels3d.js): elke prop wordt gebouwd en gehouden aan zijn norm
// (driehoeken, aantal kleuren, afmeting, geen NaN, op de grond) en wereld en cutscene gebruiken dezelfde bouwer.
//   node scripts/propregister_test.mjs   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
import fs from 'node:fs';

await import('three');
const { PROP_REGISTER, PROP_IDS, CUTSCENE_PROPS, propNorm, isRegisteredProp, VOERTUIG_REGISTER, VOERTUIG_IDS } = await import('../game/js/propregister.js');
const { propGeometry, PROP_MODEL_IDS } = await import('../game/js/propmodels3d.js');

let bad = 0;
const ok = (name, c, info = '') => { if (!c) { bad++; console.log('FAIL', name, info); } };

ok('register en bouwers dekken elkaar', PROP_IDS.slice().sort().join() === PROP_MODEL_IDS.slice().sort().join(), PROP_IDS + ' / ' + PROP_MODEL_IDS);
ok('onbekende prop is niet geregistreerd', !isRegisteredProp('kaboutertje') && propNorm('kaboutertje') === null);

for (const id of PROP_IDS) {
  const e = PROP_REGISTER[id];
  const n = e.norm;
  ok(id + ': Nederlandse naam, bouwer en gebruik', !!e.nl && e.bouwer === id && e.gebruik.length >= 1);
  ok(id + ': norm heeft eisen', Array.isArray(n.eisen) && n.eisen.length >= 3, 'eisen ' + (n.eisen || []).length);
  const g = propGeometry(id);
  ok(id + ': dezelfde geometrie bij elke aanroep (gedeeld)', propGeometry(id) === g && g.userData.shared === true);
  const pos = g.attributes.position, col = g.attributes.color;
  const tris = pos.count / 3;
  ok(id + ': driehoeken binnen de norm', tris >= n.tris[0] && tris <= n.tris[1], tris + ' niet in ' + n.tris);
  let nan = false;
  g.computeBoundingBox();
  const bb = g.boundingBox;
  for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i])) nan = true;
  ok(id + ': geen NaN', !nan);
  const kleuren = new Set();
  for (let i = 0; i < col.count; i++) kleuren.add(col.getX(i) + ',' + col.getY(i) + ',' + col.getZ(i));
  ok(id + ': genoeg verschillende kleuren', kleuren.size >= n.kleuren, kleuren.size + ' < ' + n.kleuren);
  ok(id + ': staat op de grond', bb.min.y > -0.02 && bb.min.y < 0.05, 'min y ' + bb.min.y);
  const maat = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
  const klopt = maat.every((m, i) => Math.abs(m - n.maat[i]) <= Math.max(0.12, n.maat[i] * 0.25));
  ok(id + ': afmeting binnen 25 % van de norm', klopt, maat.map((m) => m.toFixed(2)) + ' tegen ' + n.maat);
  if (process.argv.includes('--meet')) console.log(id, tris + ' tris', kleuren.size + ' kleuren', maat.map((m) => m.toFixed(2)).join(' x '));
}

// de wereld bouwt zijn stadsmeubilair uit het register (geen eigen kale kopie meer)
const cp = fs.readFileSync(new URL('../game/js/cityprops.js', import.meta.url), 'utf8');
const sf = fs.readFileSync(new URL('../game/js/streetfurniture3d.js', import.meta.url), 'utf8');
ok('cityprops gebruikt propGeometry', /propGeometry\('bank'\)/.test(cp) && /propGeometry\('afvalbak'\)/.test(cp) && /fietsenrekGeometry/.test(cp));
ok('streetfurniture3d gebruikt propGeometry', ['bank', 'afvalbak', 'fietsenrek', 'bushokje', 'paaltje'].every((k) => sf.includes(`rotProp('${k}'`)));
// de cutscenes bouwen dezelfde soorten als decor
const cm = await import('../game/js/cutscenemodels.js');
for (const id of CUTSCENE_PROPS) ok('cutscene-decor ' + id + ' staat in DECOR_KINDS', cm.DECOR_KINDS.includes(id));

// de voertuigen uit het register halen hun norm
await import('../game/js/player.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
for (const id of VOERTUIG_IDS) {
  const e = VOERTUIG_REGISTER[id], n = e.norm;
  const mesh = buildVehicleMesh({ id: 'reg-' + id, model: { ...e.model }, health: 100 });
  let tris = 0;
  // niveau 0 telt (een lichter LOD-niveau, userData.lodNiveau > 0, staat er nooit naast; lodniveau_test.mjs keurt die)
  mesh.traverse((o) => { if (o.isMesh && !(o.userData.lodNiveau > 0)) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  const col = (mesh.userData.body || mesh).geometry.attributes.color, kleuren = new Set();
  for (let i = 0; i < col.count; i++) kleuren.add(col.getX(i) + ',' + col.getY(i) + ',' + col.getZ(i));
  ok('voertuig ' + id + ': driehoeken binnen de norm', tris >= n.tris[0] && tris <= n.tris[1], tris + ' niet in ' + n.tris);
  ok('voertuig ' + id + ': genoeg kleuren', kleuren.size >= n.kleuren, String(kleuren.size));
  ok('voertuig ' + id + ': eisen beschreven', n.eisen.length >= 3);
  if (process.argv.includes('--meet')) console.log(id, Math.round(tris) + ' tris', kleuren.size + ' kleuren');
}

console.log(bad ? 'propregister_test: ' + bad + ' mislukt' : 'propregister_test: ok');
process.exit(bad ? 1 : 0);
