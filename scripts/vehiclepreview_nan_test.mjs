// Geen NaN in voertuigvoorbeelden (beeld 24-11): bij het openen van Land en bedrijf gaf een voorbeeld (vehiclepreview.js) een romp vol NaN en
// twaalf three.js-waarschuwingen over Box3 en de bol; NaN in geometrie laat de verhaaltest falen. Deze test:
//   - bouwt elk voertuigmodel zoals de voorbeelden het doen (garagepics previewVehicle, ook via de spec van de snelheidsmeter) en eist eindige posities;
//   - controleert dat meshIsFinite een kapotte geometrie herkent (de bewaking in buildObject tekent zo'n voorbeeld dan niet).
//   node scripts/vehiclepreview_nan_test.mjs
import './node3d.mjs';
import assert from 'node:assert/strict';
const THREE = await import('three');
const V = await import('../game/js/vehicle.js');
const { buildVehicleMesh } = await import('../game/js/models3d_vehicles.js');
const { previewVehicle } = await import('../game/js/garagepics.js');
const { meshIsFinite, OBJECT_KINDS } = await import('../game/js/vehiclepreview.js');
const FH = await import('../game/js/farmpicshtml.js');
const { fpSpec } = await import('../game/js/farmpics.js');
const { farmBody } = await import('../game/js/farmmodels3d.js');

// meshIsFinite herkent NaN, ook diep in de boom
const goed = new THREE.Group(); goed.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
assert.equal(meshIsFinite(goed), true);
const kapot = new THREE.Group(), binnen = new THREE.Group(), g = new THREE.BoxGeometry(1, 1, 1);
g.attributes.position.array[7] = NaN; binnen.add(new THREE.Mesh(g)); kapot.add(binnen);
assert.equal(meshIsFinite(kapot), false, 'een NaN in een kind wordt gezien');

// alle modellen zoals de voorbeelden ze bouwen: direct (garage, boerderij) en via de platte kopie van de snelheidsmeter (hud_panel speedoSpec)
const plat = (m) => { const o = {}; for (const [k, v] of Object.entries(m)) if (k !== 'rider' && ['string', 'number', 'boolean'].includes(typeof v)) o[k] = v; return o; };
const modellen = new Map();
for (const [k, v] of Object.entries(V)) if (v && typeof v === 'object' && !Array.isArray(v) && v.name && Number.isFinite(v.len)) modellen.set(k, v);
for (const m of V.TRAFFIC_MODELS()) modellen.set('verkeer:' + m.name, m);
for (const [k, m] of Object.entries(V.MACHINE_MODELLEN)) modellen.set('machine:' + k, m);
const vlaggen = [{}, { isHeroCar: true }, { isPolice: true }, { isTaxi: true }, { isAmbulance: true }];
let n = 0;
const fout = [];
for (const [k, model] of modellen) for (const vorm of [model, plat(model)]) for (const flags of vlaggen) {
  const kind = model.moped || /scooter/.test(model.name) ? 'scooter' : model.bike ? 'bike' : 'car';
  let mesh;
  try { mesh = buildVehicleMesh(previewVehicle({ kind, model: vorm, color: model.color, nameIdx: 0, flags })); } catch (e) { continue; }
  n++;
  if (!meshIsFinite(mesh)) fout.push(`${k} ${JSON.stringify(flags)}`);
}
assert.ok(n >= 50, `te weinig voorbeelden gebouwd: ${n}`);
assert.deepEqual(fout, [], 'voorbeelden met NaN: ' + fout.join('; '));
// de boerderijplaatjes (farmpics.js): elke sleutel geeft een spec die de voorbeeldrenderer als object bouwt, niet als voertuig zonder maat
// (de oorzaak van 24-11: 'farm' stond niet in OBJECT_KINDS), en het model zelf is eindig
const sleutels = [...Object.keys(FH.FP_MACHINES).map((k) => 'm:' + k), ...Object.keys(FH.FP_IMPLEMENTS).map((k) => 'w:' + k), ...Object.keys(FH.FP_ANIMALS).map((k) => 'dier:' + k), ...Object.keys(FH.FP_GEBOUWEN).map((k) => 'gebouw:' + k), ...Object.keys(FH.FP_CROPS).map((k) => 'gewas:' + k)];
let boer = 0;
for (const k of sleutels) {
  const spec = fpSpec(k); assert.ok(spec, k);
  if (spec.kind === 'car') { assert.ok(Number.isFinite(spec.model.len) && Number.isFinite(spec.model.wid), k + ': een voertuig met maat'); continue; }
  assert.ok(OBJECT_KINDS.has(spec.kind), k + ': soort ' + spec.kind + ' hoort bij de objecten, niet bij de voertuigbouwer');
  const body = farmBody(spec.farm); assert.ok(body, k + ': een model');
  assert.ok(meshIsFinite(body), k + ': NaN in het boerderijmodel'); boer++;
}
assert.ok(boer >= 15, 'te weinig boerderijplaatjes getest: ' + boer);
console.log(`vehiclepreview_nan_test ok (${modellen.size} modellen, ${n} voorbeelden)`);
