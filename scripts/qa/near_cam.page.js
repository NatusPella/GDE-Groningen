// Page half voor scripts/qa/zfight_meting.mjs --page=near_cam.page.js (#917): meet het near-vlak van de echte spelcamera (cameranear.js)
// in vijf standen en maakt een beeld van elke: te voet in de derde persoon, te voet in de eerste persoon, in een auto in de eerste
// persoon, in een helikopter op 70 m en dezelfde helikopter op 5 m. Het near hoort 0,5 te zijn behalve in de hoge helikopter (2,5)
// en de dalende helikopter moet direct terug naar 0,5. Geen cameraoverride: dit is de camera zoals de speler hem krijgt.
// window.__zf = { plekken: [{ naam, x, y }], settle } staat ervoor.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) await sleep(500);
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__zf;
const cine = await imp('cinematics');
const DN = await imp('daynight');
const VH = await imp('vehicle');
const FP = await imp('firstperson').catch(() => null);
const HF = await imp('heliflight').catch(() => null);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
const S3 = window.__scene3d;
for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && !(el.tagName === 'SCRIPT')) el.style.display = 'none';
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const q = CFG.plekken[0];
let hold = { x: q.x, y: q.y }, heli = null, heliZ = 0, done = false;
const tick = () => {
  w.clock = 14;
  if (hold && !p.inVehicle) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; }
  if (heli) { heli.x = q.x; heli.y = q.y; heli.z = heliZ; heli.speed = 0; heli.vx = heli.vy = 0; heli.onGround = false; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const rep = { stand: {}, fouten: [] };
// positieve controle in de hoge helikopter (zie zfight_meting.page.js): vijf paren platen, 6 mm uit elkaar, op 100 tot 500 m recht voor de camera.
// Het beeld 'auto' gebruikt het near dat het spel kiest; 'n0.5' dwingt het oude near af via de tekenhaak. b = near 3% groter.
let forceNear = 0;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (forceNear && c === S3.cam && c.near !== forceNear) { c.near = forceNear; c.updateProjectionMatrix(); }
  origRender(sc, c);
};
const bouwControle = (delta) => {
  const T = S3.THREE, grp = new T.Group(), camP = S3.cam.position.clone(), fw = new T.Vector3(); S3.cam.getWorldDirection(fw);
  const az = Math.atan2(fw.z, fw.x);
  [100, 200, 300, 400, 500].forEach((D, i) => {
    const hoek = az + (i - 2) * 0.17, dir = new T.Vector3(Math.cos(hoek), 0, Math.sin(hoek));
    const b = D * 0.07, base = camP.clone().addScaledVector(dir, D); base.y = camP.y;
    for (const [kleur, off] of [[0x20a020, 0], [0xe02020, -delta]]) {
      const m = new T.Mesh(new T.PlaneGeometry(b, b), new T.MeshBasicMaterial({ color: kleur, fog: false, side: T.DoubleSide }));
      m.position.copy(base).addScaledVector(dir, off); m.lookAt(camP); m.frustumCulled = false; grp.add(m);
    }
  });
  S3.scene.add(grp);
  return grp;
};
const lees = () => ({ near: +S3.cam.near.toFixed(3), far: Math.round(S3.cam.far), camY: +S3.cam.position.y.toFixed(1) });
const stand = async (naam, wacht = 2500) => {
  await sleep(wacht);
  rep.stand[naam] = lees();
  console.log('[capture] bb-' + naam + '-a');
  await sleep(450);
};
await sleep(CFG.settle || 9000);
const fpSet = (aan) => { if (FP && FP.setFirstPerson) { if (FP.initFirstPerson) { try { FP.initFirstPerson(w); } catch (e) { /* al gedaan */ } } FP.setFirstPerson(w, !!aan); } else rep.fouten.push('geen setFirstPerson'); };
try {
  await stand('near-1-te-voet-derde-persoon');
  fpSet(true); await stand('near-2-te-voet-eerste-persoon');
  fpSet(false);
  // een auto: de speler stapt in en kijkt vanuit de bestuurdersstoel
  const car = new VH.Vehicle(q.x + 6, q.y, 0, { name: 'auto', len: 4.2, wid: 1.8, maxSpeed: 30, accel: 8, brake: 9, turnRate: 1.6, color: '#3366cc' });
  car.speed = 0; w.vehicles.push(car);
  p.enterVehicle(car, w);
  if (!p.inVehicle) { car.driver = 'player'; p.inVehicle = car; }
  fpSet(true); await stand('near-3-auto-eerste-persoon');
  fpSet(false); await stand('near-4-auto-derde-persoon', 2000);
  p.exitVehicle(map, w);
  // een helikopter op 70 m, dan op 5 m
  const model = (HF && HF.HELI_MODEL) || { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40, accel: 7, brake: 9, turnRate: 1.5, color: '#c23b2e' };
  heli = new VH.Vehicle(q.x, q.y, 0, { ...model });
  heli.isHeli = true; heli.speed = 0; heli.driver = null; w.vehicles.push(heli);
  heliZ = gh(q.x, q.y) + 70;
  p.enterVehicle(heli, w);
  if (!p.inVehicle) { heli.driver = 'player'; p.inVehicle = heli; }
  await stand('near-5-helikopter-70m', 5000);
  const grp = bouwControle(0.006);
  await sleep(1500);
  for (const [id, n] of [['nauto', 0], ['n0.5', 0.5]]) {
    forceNear = n; await sleep(1500);
    rep.stand['heli-controle-' + id] = lees();
    const nu = n || S3.cam.near;
    console.log('[capture] bb-heli-controle-' + id + '-a'); await sleep(450);
    forceNear = nu * 1.03; await sleep(600);
    console.log('[capture] bb-heli-controle-' + id + '-b'); await sleep(450);
    forceNear = n; await sleep(600);
    console.log('[capture] bb-heli-controle-' + id + '-c'); await sleep(450);
  }
  forceNear = 0; S3.scene.remove(grp);
  const reeks = [];
  heliZ = gh(q.x, q.y) + 5;
  for (let i = 0; i < 6; i++) { await sleep(100); reeks.push(lees().near); }
  rep.daling = reeks; // direct terug naar 0,5
  await stand('near-6-helikopter-5m', 2500);
} catch (err) { rep.fouten.push(String(err && err.stack || err).slice(0, 300)); }
done = true; clearInterval(skipper);
return JSON.stringify({ plekken: [{ naam: 'near-cam', varianten: rep.stand, daling: rep.daling, fout: rep.fouten.join(' | ') || undefined }] });
