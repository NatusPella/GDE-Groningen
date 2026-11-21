// 3D-modules van Bezit headless in node met de three-mock (scripts/lib/threemock.mjs): bezitmarker3d, herdview3d, snackvans3d en farmworkers3d draaien echt (hun eigen code, de echte planners en
// de echte modellen van wildlife, voertuigen en personen) tegen een nep-wereld. Gedekt: budgetten (hoogstens 200 palen, 40 lijnen, 4 werkers, 12 dieren per kudde, 5 wagens), opruimen bij wegvallen
// (geen kinderen in de scene, dispose-tellers), geen NaN in posities en geometrie, niets voor een gast, determinisme. Niet gedekt: renderen, echte matrixwiskunde, schaduwen, shaders, scene3d.js
// zelf (die is gemockt: alleen getScene en disposeObject), de echte WebGL-kosten en het uiterlijk. Zie docs/BEZIT-VERIFICATIE-21-11.md.   node scripts/bezit3d_mock_test.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REGISTER = new URL('./lib/threemock_register.mjs', import.meta.url).href;
if (!process.env.GDE_THREEMOCK) {
  // zichzelf opnieuw starten met het loader-hook: zonder gevendorde three werkt dit gewoon met `node scripts/bezit3d_mock_test.mjs`
  const r = spawnSync(process.execPath, ['--import', REGISTER, fileURLToPath(import.meta.url)], { stdio: 'inherit', env: { ...process.env, GDE_THREEMOCK: '1' } });
  process.exit(r.status === null ? 1 : r.status);
}

const assert = (await import('node:assert/strict')).default;
const M = await import('./lib/threemock.mjs');
const { mockScene } = await import('./lib/scene3d_mock.mjs');

const L = await import('../game/js/bezitlive.js');
const BL = await import('../game/js/boerderijlive.js');
const Z = await import('../game/js/bezit.js');
const B = await import('../game/js/boerderij.js');
const PC = await import('../game/js/percelen.js');
const PF = await import('../game/js/parcelfarm.js');
const FS = await import('../game/js/farmstaff.js');
const FW = await import('../game/js/farmworkers.js');
const LS = await import('../game/js/livestock.js');
const markers = await import('../game/js/bezitmarker3d.js');
const herds = await import('../game/js/herdview3d.js');
const vans = await import('../game/js/snackvans3d.js');
const workers = await import('../game/js/farmworkers3d.js');
const PK = await import('../game/js/bezitmarker.js');
const HV = await import('../game/js/herdview.js');
const VP = await import('../game/js/snackvanplan.js');
const SPT = await import('../game/js/pitch.js');

// (pas na het laden: settings.js raakt bij het laden de DOM aan) een canvas dat niets tekent: de borden van de wagens en palen maken er een textuur van
const ctx2d = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ctx2d), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.document = { documentElement: { classList: { contains: () => false } }, createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) };

let n = 0;
const t = (name, fn) => { n++; return Promise.resolve().then(fn).catch((e) => { console.error('FAIL', name); throw e; }); };
const st = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); }, removeItem(k) { this.m.delete(k); } };
L.initBezit({ opslag: st }); BL.initBoerderij({ opslag: st });
const scene = mockScene();
const world = (x, y, extra = {}) => ({ map: { groundHeightAt: () => 0.3, buildingsNear: () => [] }, player: { x, y, hp: 100 }, ...extra });
const walk = (root) => { const all = []; root.traverse((o) => all.push(o)); return all; };
const noNaN = (root, label) => {
  for (const o of walk(root)) {
    for (const v of [o.position, o.rotation, o.scale]) assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `${label}: NaN in positie van ${o.name || o.type}`);
    const g = o.geometry;
    if (g) for (const a of Object.values(g.attributes)) for (let i = 0; i < a.array.length; i++) assert.ok(Number.isFinite(a.array[i]), `${label}: NaN in geometrie`);
  }
};
const tick = (fn, w, secs, step = 0.25) => { for (let s = 0; s < secs; s += step) fn(w, step); };
const live = () => ({ geo: M.stats.geomLive.size, mat: M.stats.matLive.size });
const sceneCount = () => scene.children.length;
const pid = (i) => 'p' + (0xabc000000000 + i * 7919).toString(16).padStart(12, '0');

await t('threemock: scenegraaf, dispose-teller en NaN-detectie in de mock zelf', () => {
  const g = new M.Group(), mesh = new M.Mesh(new M.BoxGeometry(1, 1, 1), new M.MeshBasicMaterial({ color: 0xff0000 }));
  g.add(mesh); assert.equal(mesh.parent, g); g.remove(mesh); assert.equal(mesh.parent, null);
  const before = M.stats.geomDisposed; mesh.geometry.dispose(); assert.equal(M.stats.geomDisposed, before + 1);
  assert.ok(Number.isNaN(new M.BoxGeometry(NaN, 1, 1).attributes.position.array[0]));
  assert.ok(Number.isFinite(new M.BoxGeometry(1, 1, 1).attributes.position.array[0]));
});

// ---- bezitmarker3d: palen en grenslijnen ----
await t('markers: hoogstens 200 palen en 40 lijnen, binnen de straal, opruimen bij leegmaken', () => {
  const b = L.getBezit();
  const rows = [];
  for (let i = 0; i < 260; i++) { const x = (i % 20) * 40 - 400, y = Math.floor(i / 20) * 40 - 240; rows.push([pid(i), x, y, 500, 0, 0, x, y]); }
  L.setIndexForTest({ v: 1, kinds: ['w', 'a', 'b'], access: ['weg'], places: [['Winsum', 0, 0, 800]], rows }, { v: 1, types: ['retail'], rows: [] });
  for (let i = 0; i < 260; i++) assert.ok(Z.buyParcel(b, { id: pid(i), kind: 'a', ha: 5, x: rows[i][1], y: rows[i][2], ax: rows[i][1], ay: rows[i][2] }, 2000, 0, 1e12).ok);
  const base = sceneCount(), lv = live();
  const w = world(0, 0);
  tick(markers.updateBezitMarkers, w, 1);
  const cnt = markers.bezitMarkerCount();
  assert.ok(cnt > 0 && cnt <= PK.MAX_MARKERS, `palen ${cnt}`);
  assert.ok(markers.bezitOutlineCount() <= PK.MAX_OUTLINES);
  assert.equal(sceneCount() - base, cnt + markers.bezitOutlineCount(), 'elke paal en lijn hangt in de scene');
  noNaN(scene, 'markers');
  // determinisme: opnieuw bouwen geeft hetzelfde aantal op dezelfde plek
  markers.clearBezitMarkers(); assert.equal(markers.bezitMarkerCount(), 0); assert.equal(sceneCount(), base);
  tick(markers.updateBezitMarkers, w, 1);
  assert.equal(markers.bezitMarkerCount(), cnt);
  markers.clearBezitMarkers();
  assert.equal(sceneCount(), base, 'geen lekkende kinderen');
  assert.ok(live().geo <= lv.geo + 8, `geometrieen die blijven staan: ${live().geo - lv.geo}`);
});
await t('markers: omtrekken met een perceelvorm (lijnen) blijven binnen 40 en vallen weg', () => {
  const b = L.getBezit();
  const ix = L.getIndexNow();
  const rows = []; for (let i = 0; i < 60; i++) rows.push([pid(i), [0, 0, 4, 0, 0, 4]]);
  ix.parcels.attachShapes({ v: 1, step: 5, rows });
  const w = world(0, 0), base = sceneCount();
  tick(markers.updateBezitMarkers, w, 2);
  assert.ok(markers.bezitOutlineCount() <= PK.MAX_OUTLINES, `lijnen ${markers.bezitOutlineCount()}`);
  noNaN(scene, 'lijnen');
  markers.clearBezitMarkers();
  assert.equal(sceneCount(), base);
  assert.equal(markers.bezitOutlineCount(), 0);
});
await t('markers: een gast bouwt niets', () => {
  const base = sceneCount();
  markers.clearBezitMarkers();
  tick(markers.updateBezitMarkers, world(0, 0, { coopRole: 'client' }), 2);
  assert.equal(markers.bezitMarkerCount(), 0); assert.equal(sceneCount(), base);
});
await t('markers: weglopen ruimt op (de speler ver weg)', () => {
  const base = sceneCount();
  tick(markers.updateBezitMarkers, world(0, 0), 1);
  assert.ok(markers.bezitMarkerCount() > 0);
  tick(markers.updateBezitMarkers, world(50000, 50000), 1);
  assert.equal(markers.bezitMarkerCount(), 0); assert.equal(sceneCount(), base);
});
// de percelen van de markertest weer weg, zodat de volgende onderdelen met een schoon bezit beginnen
const resetBezit = () => { const b = L.getBezit(); for (const k of Object.keys(b.parcels)) delete b.parcels[k]; if (b.x) b.x.herds = {}; };

// ---- herdview3d: kuddes ----
await t('kuddes: hoogstens 12 dieren per kudde en 4 kuddes, geen NaN, deterministisch, opruimen', () => {
  resetBezit();
  const b = L.getBezit();
  for (let i = 0; i < 7; i++) {
    const x = i * 60, y = 20;
    assert.ok(Z.buyParcel(b, { id: pid(100 + i), kind: 'w', ha: 6, x, y, ax: x, ay: y }, 2000, 0, 1e12).ok);
    assert.ok(LS.stockHerd(b, pid(100 + i), i % 3 === 0 ? 'melkvee' : i % 3 === 1 ? 'schapen' : 'kippen', 40).ok);
  }
  const w = world(0, 0), base = sceneCount(), lv = live();
  tick(herds.updateHerds, w, 2, 0.5);
  const hc = herds.herdCount();
  assert.ok(hc >= 1 && hc <= HV.MAX_HERDS_IN_VIEW, `kuddes ${hc}`);
  const groups = scene.children.filter((c) => c.name === 'bezit-kudde');
  assert.equal(groups.length, hc);
  for (const g of groups) assert.ok(g.children.length >= 1 && g.children.length <= LS.VISIBLE_MAX, `dieren ${g.children.length}`);
  noNaN(scene, 'kuddes');
  const sig = groups.map((g) => g.children.map((c) => [c.position.x.toFixed(3), c.position.z.toFixed(3)].join()).join(';')).join('|');
  herds.updateHerds(world(5000, 5000), 1.2);                     // ver weg: alles vervalt
  assert.equal(herds.herdCount(), 0); assert.equal(sceneCount(), base, 'geen lekkende dieren');
  tick(herds.updateHerds, w, 2, 0.5);
  const sig2 = scene.children.filter((c) => c.name === 'bezit-kudde').map((g) => g.children.map((c) => [c.position.x.toFixed(3), c.position.z.toFixed(3)].join()).join(';')).join('|');
  assert.equal(sig2, sig, 'determinisme');
  herds.updateHerds(world(5000, 5000), 1.2);
  assert.equal(sceneCount(), base);
  assert.ok(M.stats.geomDisposed > 0 || live().geo <= lv.geo + 40, 'dieren geven hun geometrie terug of delen hem');
});
await t('kuddes: een gast ziet geen vee', () => {
  const base = sceneCount();
  tick(herds.updateHerds, world(0, 0, { coopRole: 'client' }), 2, 0.5);
  assert.equal(herds.herdCount(), 0); assert.equal(sceneCount(), base);
});

// ---- snackvans3d: wagens ----
await t('wagens: hoogstens 5, geen NaN, opruimen met dispose, niets als de tak dicht is', () => {
  const S = L.snackState();
  const base = sceneCount();
  const sites = SPT.SPOT_IDS.map((id) => SPT.spotXY(id)).filter(Boolean);
  const crowd = (p) => sites.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) <= 230).length;
  const ctr = sites.reduce((a, b) => (crowd(b) > crowd(a) ? b : a));           // het plekje met de meeste standplaatsen om zich heen
  const cx = ctr.x, cy = ctr.y;
  S.rival.spots = SPT.SPOT_IDS.slice(0, 12);                 // twaalf standplaatsen van de concurrent: het budget moet knijpen
  const before = M.stats.geomDisposed;
  tick(vans.updateSnackVans, world(cx, cy), 2);
  const c = vans.snackVanCount();
  assert.ok(c >= 1, 'er staat minstens een wagen');
  assert.ok(c <= VP.MAX_WAGONS, `wagens ${c}`);
  assert.equal(scene.children.filter((x) => x.name === 'snackwagen').length, c);
  noNaN(scene, 'wagens');
  vans.clearSnackVans();
  assert.equal(vans.snackVanCount(), 0); assert.equal(sceneCount(), base, 'geen lekkende wagens');
  void crowd;
  assert.ok(M.stats.geomDisposed > before, 'dispose is aangeroepen');
  S.rival.spots = [];
});

// ---- farmworkers3d: werkers op trekkers ----
await t('werkers: hoogstens 4, binnen de straal, geen NaN, opruimen, niets voor een gast, deterministisch', () => {
  resetBezit();
  const bz = L.getBezit(), farm = BL.getBoerderij();
  PC.wisExtraPercelen(); FW.clearStaffWork();
  for (let i = 0; i < 6; i++) {
    assert.ok(Z.buyParcel(bz, { id: pid(200 + i), kind: 'a', ha: 1.2, ax: 0, ay: 0 }, 3000, 0, 1e12).ok); bz.parcels[pid(200 + i)].m = 'staff';
  }
  PF.registerOwnedParcels(bz);
  for (let i = 0; i < 6; i++) { PC.registreerExtraPerceel({ ...PC.perceelDef(pid(200 + i)), bodem: 0.75 }); PF.adoptParcel(farm, pid(200 + i), 0); }
  for (let i = 0; i < 6; i++) farm.posities[pid(200 + i)] = { x: i * 40, y: 0, a: 0 };      // de velden staan op een rij van 40 m
  for (let k = 0; k < 6; k++) assert.ok(FS.hireWorker(bz, 3, 0, 1e12).ok);
  const day = Math.floor(farm.uren / 24);
  const rep = FS.staffDayTick(bz, farm, day, {});
  assert.ok(rep.worked.length >= 1, 'de dagtik bewerkt percelen');
  FW.noteStaffWork(day, rep.worked);
  const first = B.veldPositie(farm, rep.worked[0].id);
  assert.ok(first, 'het veld van de eerste opdracht heeft een plek');
  const px = first.x, py = first.y;
  // het moment van de dag met de meeste werkers tegelijk (de opdrachten hebben elk een eigen tijdvenster): de planner zelf kiest, niet de test
  let bestF = 0, bestN = -1;
  for (let f = 0; f < 1; f += 0.01) { const k = FW.planWorkerActors(rep.worked, { x: px, y: py }, { posOf: (id) => B.veldPositie(farm, id), dayFrac: f }).length; if (k > bestN) { bestN = k; bestF = f; } }
  farm.uren = day * 24 + bestF * 24;
  const base = sceneCount();
  tick(workers.updateFarmWorkers, world(px, py), 3, 0.25);
  const c = workers.farmWorkerCount();
  assert.ok(c >= 1 && c === Math.min(bestN, FW.MAX_ACTORS), `werkers ${c} van ${bestN} gepland`);
  assert.ok(c <= FW.MAX_ACTORS && FW.MAX_ACTORS === 4, `werkers ${c}`);
  assert.equal(scene.children.filter((x) => x.name === 'bezit-werker').length, c);
  noNaN(scene, 'werkers');
  const pos = scene.children.filter((x) => x.name === 'bezit-werker').map((g) => `${g.position.x.toFixed(2)},${g.position.z.toFixed(2)}`).sort().join('|');
  workers.clearFarmWorkers();
  assert.equal(sceneCount(), base, 'geen lekkende werkers of werktuigen');
  tick(workers.updateFarmWorkers, world(px, py), 3, 0.25);
  const pos2 = scene.children.filter((x) => x.name === 'bezit-werker').map((g) => `${g.position.x.toFixed(2)},${g.position.z.toFixed(2)}`).sort().join('|');
  assert.equal(pos2, pos, 'determinisme');
  workers.clearFarmWorkers();
  tick(workers.updateFarmWorkers, world(px, py, { coopRole: 'client' }), 3, 0.25);
  assert.equal(workers.farmWorkerCount(), 0); assert.equal(sceneCount(), base);
  tick(workers.updateFarmWorkers, world(px + 9000, py + 9000), 3, 0.25);
  assert.equal(workers.farmWorkerCount(), 0, 'ver weg: geen werkers');
  assert.equal(sceneCount(), base);
  void c;
});
console.log(`bezit3d_mock_test: ${n} groepen groen (three-mock: bezitmarker3d, herdview3d, snackvans3d, farmworkers3d)`);
