// Live bussen als USP (#922): de echte busposities staan met hun dienst en lijn
// op de kaart, een gekaapte bus raakt los van de live data en wordt een gewone
// spelbus, en er spawnen geen willekeurige bussen meer zonder dienst.
//   node scripts/livebuskaart_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import './node3d.mjs';
const B = await import('../game/js/vehicle.js');
const M = await import('../game/js/busmap.js');

let n = 0;
const t = (naam, f) => { f(); n++; console.log(`ok ${naam}`); };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');

const lijn = { name: 'Lijn 12 De Wadloper', ref: '12', id: 'x', stops: [] };
const echt = { id: 'live-1', line: lijn, dir: 1, s: 400, x: 150, y: -50, angle: 0.4, speed: 8, d: 160 };

t('een live bus komt met lijn en dienst op de kaart', () => {
  B.setLiveBussen({ kandidaten: () => [echt] });
  const marks = M.liveBusMarks({ x: 0, y: 0 });
  assert.equal(marks.length, 1);
  assert.equal(marks[0].label, 'Lijn 12 De Wadloper');
  assert.match(marks[0].sub, /Live bus/);
  assert.match(marks[0].sub, /Lijn 12/);
  assert.equal(marks[0].x, 150);
});

t('zonder live-bron is de laag leeg (geen verzonnen bussen)', () => {
  B.setLiveBussen(null);
  assert.deepEqual(M.liveBusMarks({ x: 0, y: 0 }), []);
});

t('een gekaapte bus raakt los van de live data', () => {
  const v = { isBus: true, liveId: 'live-1', busRun: { line: lijn, s: 400, dir: 1 } };
  assert.equal(B.detachLiveBus(v), true);
  assert.equal(v.liveId, null, 'geen live koppeling meer');
  assert.ok(v.busRun, 'de eigen dienst blijft');
  assert.equal(B.detachLiveBus(v), false, 'twee keer loskoppelen is geen fout');
  assert.match(lees('player.js'), /detachLiveBus\(v\)/, 'de speler koppelt hem los als hij instapt');
});

t('zonder bron vervalt het live-label van bestaande bussen', () => {
  const v = { isBus: true, liveId: 'live-1' };
  const w = { map: { roadsNear: () => [] }, player: { x: 0, y: 0 }, vehicles: [v], time: 0, clock: 12 };
  B.setLiveBussen(null);
  B.manageBusPopulation(w);
  assert.equal(v.liveId, null, 'de eigen dienst neemt het over');
});

t('de kaarten tekenen de laag en geen willekeurige bussen', () => {
  assert.match(lees('hud_panel.js'), /liveBusMarks\(player, 3\)/);
  assert.match(lees('hud_panel.js'), /drawLiveBusMapIcon\(ctx, s, t\)/);
  assert.match(lees('mapview.js'), /for \(const b of liveBusMarks\(hoofdspeler\(world\), 4\)\)/);
  const buspop = lees('vehicle/buspop.js');
  assert.ok(!/Math\.random\(\) < 0\.25/.test(buspop), 'geen willekeurige midibus meer');
  assert.ok(!/candidates = map\.roadsNear/.test(buspop), 'geen random hoofwegbussen meer');
});

console.log(`livebus_map_test: ${n}/${n} ok`);

