// Het farmmodel (farmmodel.js, #1013): velden als kaarten met stand en verwachting, machinestatus, toegang tot percelen.
//   node scripts/farmmodel_test.mjs
import assert from 'node:assert/strict';
import './node3d.mjs';
const B = await import('../game/js/boerderij.js');
const PC = await import('../game/js/percelen.js');
const M = await import('../game/js/farmmodel.js');
const Live = await import('../game/js/boerderijlive.js');

let n = 0, fails = 0;
const t = (name, fn) => { n++; try { fn(); } catch (e) { fails++; console.log('FAIL', name, '\n  ', String(e.message).split('\n')[0]); } };
const nepOpslag = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
Live.zetBoerderijVoorTest(null, nepOpslag());
const b = Live.getBoerderij();
const id = b.bedrijf.actief;

t('elke kaartstatus valt in precies een van de zes standen van de speler', () => {
  for (const s of ['braak', 'stoppel', 'geploegd', 'zaailing', 'groeiend', 'bijna', 'rijp']) assert.ok(M.STAND_IDS.includes(M.standVan(s)), s);
  assert.deepEqual(M.STAND_IDS, ['kaal', 'geoogst', 'bewerkt', 'gezaaid', 'groeit', 'rijp']);
  assert.equal(M.standVan('bijna'), 'groeit');
  assert.equal(M.standVan('onbekend'), 'kaal');
});

t('een nieuw veld is kaal en de kaart zegt wat er te doen valt', () => {
  const k = M.veldKaart(b, id, 0);
  assert.equal(k.stand, 'kaal');
  assert.equal(k.standNaam, 'Kaal');
  assert.equal(k.volgende, 'Ploegen');
  assert.equal(k.klaar, false);
  assert.ok(k.verwachting.kg > 0 && k.verwachting.euro > 0, 'ook een kaal veld heeft een verwachting uit het plan');
  assert.equal(k.verwachting.kg % 10, 0, 'afgerond op tientallen');
});

t('gezaaid, groeit en rijp volgen de speltijd', () => {
  const v = B.veldStand(b, id);
  v.fase = 'gezaaid'; v.gewas = 'aardappelen'; v.gezaaidOp = b.uren; v.bodem = 1; v.zaai = 1;
  assert.equal(M.veldKaart(b, id).stand, 'gezaaid');
  b.uren += B.GEWASSEN.aardappelen.groeiUren * 0.5;
  assert.equal(M.veldKaart(b, id).stand, 'groeit');
  assert.equal(M.veldKaart(b, id).groeit, true);
  b.uren += B.GEWASSEN.aardappelen.groeiUren;
  const k = M.veldKaart(b, id);
  assert.equal(k.stand, 'rijp');
  assert.equal(k.volgende, 'Oogsten');
  assert.equal(k.klaar, true);
});

t('rijp staat bovenaan en de hoofdknop wijst naar dat veld', () => {
  const o = M.overzicht(b);
  assert.equal(o.velden[0].stand, 'rijp');
  assert.equal(o.rijp, 1);
  assert.equal(o.hoofd.veld, id);
  assert.match(o.hoofd.label, /rijpe veld/);
  assert.equal(o.dieren, null, 'dieren bestaan in dit spel niet: het scherm zegt dat');
  assert.equal(o.leeg, false);
});

t('de toegang telt wat te huur en te koop is en verdwijnt als alles van jou is', () => {
  const tg = M.toegang(b);
  assert.equal(tg.eigen, 1);
  assert.equal(tg.aanbod, PC.PERCELEN.length - 1);
  assert.ok(tg.huur > 0 && tg.koop > 0);
  assert.match(tg.tekst, /te huur/);
  const alles = Object.fromEntries(PC.PERCEEL_IDS.map((p) => [p, {}]));
  assert.equal(M.toegang({ ...b, bedrijf: { ...b.bedrijf, percelen: alles } }).aanbod, 0);
});

t('machinestatus: klaar, bijna leeg, versleten en huur achter', () => {
  const trekker = PC.MACHINE_CATALOGUS['trekker-klein'];
  assert.equal(M.machineStatus({ brandstof: 40, slijtage: 5 }, trekker).stand, 'klaar');
  assert.equal(M.machineStatus({ brandstof: 3, slijtage: 5 }, trekker).stand, 'brandstof');
  assert.equal(M.machineStatus({ brandstof: 40, slijtage: 80 }, trekker).stand, 'slijtage');
  const a = M.machineStatus({ brandstof: 3, slijtage: 80, achterstand: 1 }, trekker);
  assert.equal(a.stand, 'achterstand');
  assert.match(a.tekst, /huur achter.*bijna leeg.*versleten/);
  assert.equal(M.machineStatus({ slijtage: 5 }, PC.MACHINE_CATALOGUS['ploeg-3']).stand, 'klaar', 'een werktuig heeft geen brandstof');
});

t('zonder velden is het overzicht leeg en heeft het geen hoofdknop', () => {
  const o = M.overzicht({ ...b, bedrijf: { ...b.bedrijf, percelen: {} } });
  assert.equal(o.leeg, true);
  assert.equal(o.hoofd, null);
});

console.log(`farmmodel_test: ${n - fails}/${n}`);
if (fails) process.exit(1);
