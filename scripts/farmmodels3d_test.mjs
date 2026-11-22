// De boerderijplaatjes in 3D (farmmodels3d.js, farmpics.js, farmpicshtml.js): per model driehoeken binnen de begroting, één materiaal, een eindige bounding box met
// de voeten op de grond, geen NaN, en alles weer vrij na ruimFarmModel (geen lek). Met de echte three uit de vendor-cache (geen renderer nodig).
//   node scripts/farmmodels3d_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const THREE = await import('three');
const F = await import('../game/js/farmmodels3d.js');
const H = await import('../game/js/farmpicshtml.js');
const P = await import('../game/js/farmpics.js');
const PC = await import('../game/js/percelen.js');
const WT = await import('../game/js/werktuigen.js');
const B = await import('../game/js/boerderij.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };

// dispose-tellers op de echte three
let geoDisp = 0, matDisp = 0;
const g0 = THREE.BufferGeometry.prototype.dispose, m0 = THREE.Material.prototype.dispose;
THREE.BufferGeometry.prototype.dispose = function () { geoDisp++; return g0.call(this); };
THREE.Material.prototype.dispose = function () { matDisp++; return m0.call(this); };

const GEWASSEN = Object.keys(H.FP_CROPS);
const SLEUTELS = [...F.FARM_KEYS.filter((k) => k !== 'veld'), ...GEWASSEN.map((g) => `veld:${g}`)];
const budget = (k) => F.FARM_BUDGET[k.split(':')[0]];

for (const k of SLEUTELS) {
  t(`${k}: driehoeken binnen de begroting, één mesh en één materiaal`, () => {
    const g = F.bouwFarmModel(k);
    const tri = F.driehoeken(g);
    assert.ok(tri > 20 && tri <= budget(k), `${tri} driehoeken, begroting ${budget(k)}`);
    const meshes = []; g.traverse((o) => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1);
    assert.ok(meshes[0].material.vertexColors, 'vertexkleur');
    F.ruimFarmModel(g);
  });
  t(`${k}: geen NaN, eindige bounding box, voeten op de grond`, () => {
    const g = F.bouwFarmModel(k);
    const pos = g.children[0].geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i++) assert.ok(Number.isFinite(pos[i]), `positie ${i}`);
    const col = g.children[0].geometry.attributes.color.array;
    for (let i = 0; i < col.length; i++) assert.ok(Number.isFinite(col[i]) && col[i] >= 0 && col[i] <= 1, 'color');
    const nor = g.children[0].geometry.attributes.normal.array;
    for (let i = 0; i < nor.length; i++) assert.ok(Number.isFinite(nor[i]), 'normaal');
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(!box.isEmpty());
    const s = box.getSize(new THREE.Vector3());
    assert.ok(s.x > 0.2 && s.y > 0.2 && s.z > 0.2 && s.x < 9 && s.y < 9 && s.z < 9, `maat ${s.x.toFixed(1)}x${s.y.toFixed(1)}x${s.z.toFixed(1)}`);
    assert.ok(box.min.y >= -0.01 && box.min.y < 0.3, `onderkant ${box.min.y}`);
    F.ruimFarmModel(g);
  });
}

t('opruimen: elk model geeft zijn geometrie en materiaal terug (geen lek over 40 rondes)', () => {
  for (const k of SLEUTELS) {
    geoDisp = 0; matDisp = 0;
    const g = F.bouwFarmModel(k);
    const bouwGeo = geoDisp;           // de losse deelvormen zijn al tijdens het bouwen vrijgegeven
    assert.ok(bouwGeo > 0, 'de deelvormen worden vrijgegeven');
    geoDisp = 0;
    F.ruimFarmModel(g);
    assert.equal(geoDisp, 1, `${k}: één samengevoegde geometrie vrij`);
    assert.equal(matDisp, 1, `${k}: één materiaal vrij`);
  }
  let g = 0, m = 0;
  for (let i = 0; i < 40; i++) { const mod = F.bouwFarmModel(SLEUTELS[i % SLEUTELS.length]); geoDisp = 0; matDisp = 0; F.ruimFarmModel(mod); g += geoDisp; m += matDisp; }
  assert.equal(g, 40); assert.equal(m, 40);
});

t('een onbekende sleutel geeft null; farmBody kent werktuigen', () => {
  assert.equal(F.bouwFarmModel('draak'), null);
  assert.equal(F.farmBody('draak'), null);
  const w = F.farmBody('werktuig:ploeg');
  assert.ok(w && w.children.length > 0);
  F.ruimFarmModel(w);
});

t('elk gewas heeft een eigen veldvorm', () => {
  const driehoek = GEWASSEN.map((g) => { const m = F.bouwFarmModel(`veld:${g}`); const x = F.driehoeken(m); F.ruimFarmModel(m); return x; });
  assert.ok(new Set(driehoek).size >= 5, `veldvormen verschillen: ${driehoek}`);
});

t('elk gewas van de boerderij heeft een plaatjessleutel', () => {
  for (const id of B.GEWAS_IDS) assert.ok(H.fpMeta(`gewas:${id}`), id);
});

t('elke machine en elk werktuig van de catalogus heeft een plaatje (sleutel en 3D-spec)', () => {
  for (const [id, c] of Object.entries(PC.MACHINE_CATALOGUS)) {
    if (c.soort === 'werktuig' && !WT.WERKTUIG[c.type]) continue;      // zonder gedrag staat het niet te koop
    if (c.soort === 'machine' && !['trekker-klein', 'trekker-groot', 'maaidorser', 'laadmachine'].includes(id)) continue;
    const sleutel = c.soort === 'machine' ? `m:${id}` : `w:${c.type}`;
    assert.ok(H.fpMeta(sleutel), `${id}: ${sleutel}`);
    const spec = P.fpSpec(sleutel);
    assert.ok(spec && (spec.kind === 'car' ? spec.model && spec.model.name : spec.farm), `${id} spec`);
  }
});

t('dieren: de kuddes van het spel hebben een sleutel', () => {
  assert.equal(H.animalKey('melkvee'), 'dier:koe'); assert.equal(H.animalKey('schapen'), 'dier:schaap'); assert.equal(H.animalKey('kippen'), 'dier:kip');
  assert.equal(H.animalKey('draak'), '');
  for (const k of ['dier:koe', 'dier:schaap', 'dier:kip', 'gebouw:schuur', 'gebouw:silo', 'gebouw:kas']) assert.deepEqual(P.fpSpec(k).kind, 'farm');
  assert.equal(P.fpSpec('nep:x'), null);
});

t('markup: plaatsvak met icoon, role img en geen tekst; lege staat met één zin; uitleg in details', () => {
  const h = H.fpHtml('dier:koe', 'Melkvee', 'm');
  assert.match(h, /data-fp="dier:koe"/); assert.match(h, /role="img" aria-label="Plaatje van Melkvee"/); assert.match(h, /<svg/);
  assert.equal(H.fpHtml('nep:x'), '');
  assert.match(H.leegHtml('dier:koe', 'Geen dieren.'), /bd-leeg[\s\S]*data-fp[\s\S]*<p>Geen dieren\.<\/p>/);
  assert.match(H.meerHtml('Lange uitleg', 'Uitleg'), /^<details class="bd-meer"><summary[^>]*>[\s\S]*<\/summary><p>Lange uitleg<\/p><\/details>$/);
  assert.match(H.getalHtml('geld', '€12', 'omzet'), /<b>€12<\/b><small>omzet<\/small>/);
});

t('zonder DOM doet vulPlaatjes niets en ruimPlaatjes is veilig herhaalbaar', () => {
  assert.equal(P.vulPlaatjes({ querySelectorAll: () => [] }), 0);
  assert.equal(P.vulPlaatjes(null), 0);
  assert.equal(P.showLive(null, 'dier:koe'), false);
  P.ruimPlaatjes(); P.ruimPlaatjes();
  assert.equal(P.liveActief(), false);
});

t('lui vullen: hoogstens FP_MAX_PER_RONDE per aanroep, niets dubbel, en sluiten leegt de wachtrij', () => {
  const alle = [...Object.keys(H.FP_MACHINES).map((x) => `m:${x}`), ...Object.keys(H.FP_IMPLEMENTS).map((x) => `w:${x}`), ...Object.keys(H.FP_ANIMALS).map((x) => `dier:${x}`),
    ...Object.keys(H.FP_GEBOUWEN).map((x) => `gebouw:${x}`), ...GEWASSEN.map((x) => `gewas:${x}`)];
  const vakken = alle.map((k) => ({ dataset: { fp: k }, isConnected: true, querySelector: () => null, appendChild() {}, classList: { add() {} } }));
  const vorigDoc = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => null, style: {}, width: 0, height: 0 }), hidden: false };
  try {
    const root = { querySelectorAll: () => vakken };
    assert.ok(alle.length > P.FP_MAX_PER_RONDE);
    assert.equal(P.vulPlaatjes(root), P.FP_MAX_PER_RONDE);
    assert.equal(P.vulPlaatjes(root), alle.length - P.FP_MAX_PER_RONDE);
    assert.equal(P.vulPlaatjes(root), 0, 'een slot dat al is aangevraagd wordt niet opnieuw aangevraagd');
    P.ruimPlaatjes();
  } finally { globalThis.document = vorigDoc; }
});

THREE.BufferGeometry.prototype.dispose = g0; THREE.Material.prototype.dispose = m0;
console.log(`farmmodels3d_test: ${n - fails}/${n}`);
process.exit(fails ? 1 : 0);
