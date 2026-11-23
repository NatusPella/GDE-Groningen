// In-game controle van de modulaire mensen (ADR 0050, eis coördinator 23-11): openingsfilm (Tammo en Tessa met lipsync), een
// straat met voetgangers (LOD-overgangen, menigte), rijden met de binnencamera en fietsen. Draait als --perf-script van de desktop
// via scripts/ui_shots.mjs (EEN Electron, wegwerpprofiel, eigen slot nemen vooraf):
//   node scripts/ui_shots.mjs --sizes=1920x1080 --flags=mensen=q3 --scenes=scripts/ui/mensen_ingame_scenes.js --out=<map> --timeout=600
// Beelden: <size>-m-<naam>.png; cijfers als '[mensen] <json>' in _log-<size>.txt. Zonder de vlag toont hij het oude, procedurele beeld
// (zelfde scenes, ter vergelijking). Samen spelen: alles lokaal in een spel; een gast ziet dezelfde mensen (zie docs/COOP-GAST.md).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] m-' + name); await sleep(700); };
const meet = {};
const note = (k, v) => { meet[k] = v; console.error('[mensen] ' + k + ' ' + JSON.stringify(v)); };
const S3 = () => window.__scene3d;
// modulaire mensen in de scène: aantal, per LOD, met de mond open (lipsync), met de handen dicht (grijphand)
const telMensen = () => {
  const r = { modulair: 0, procedureel: 0, lod: [0, 0, 0], mondOpen: 0, grijp: 0 };
  S3().scene.traverse((o) => {
    const ud = o.userData;
    if (ud && ud.qRig) { r.modulair++; r.lod[ud.qLod || 0]++; if (ud.mouth && ud.mouth.scale.y > 0.05) r.mondOpen++; if (ud.qGrip) r.grijp++; }
    else if (ud && ud.body && ud.body.isSkinnedMesh && ud.body.skeleton && !ud.qRig) r.procedureel++;
  });
  return r;
};

await (async () => {
  try {
    const cine = await imp('cinematics');
    // 1. de openingsfilm: het spel start al; nog niets overslaan
    for (let i = 0; i < 240 && !ready() && !cine.isCinematicActive(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    let film = false;
    for (let i = 0; i < 60 && !film; i++) { film = cine.isCinematicActive(); if (!film) await sleep(500); }
    note('filmActief', film);
    if (film) {
      let mondMax = 0;
      const mond = setInterval(() => { try { mondMax = Math.max(mondMax, telMensen().mondOpen); } catch (e) { /* scène nog niet klaar */ } }, 100);
      await sleep(3500); note('film-a', telMensen()); await shot('film-a', 100);
      await sleep(5500); note('film-b', telMensen()); await shot('film-b', 100);
      await sleep(7000); note('film-c', telMensen()); await shot('film-c', 100);
      clearInterval(mond); note('filmMondOpenMax', mondMax);
    }
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
    for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
    for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
    clearInterval(skipper);
    await sleep(3000);
    const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
    w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
    const { P } = await imp('worldframe'); const DN = await imp('daynight'); const FP = await imp('firstperson');
    const VH = await imp('vehicle');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 55) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'm-view', duration: 600, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose });
    };
    const camOff = () => { pose = null; if (cine.isCinematicActive()) cine.skipCinematic(); w.cameraOverride = null; };
    const jump = async (x, y, settle = 6000) => {
      camOff(); if (p.inVehicle) p.exitVehicle(map, w);
      p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
      for (let i = 0; i < 40 && !loading(); i++) await sleep(100);
      for (let i = 0; i < 400 && loading(); i++) await sleep(100);
      await sleep(settle); p.x = x; p.y = y; p.gz = gh(x, y); fix();
    };
    const fout = []; window.addEventListener('error', (e) => fout.push(String(e.message).slice(0, 160)));

    // 2. straat met voetgangers: Vismarkt en Grote Markt (stadsmidden P(100, 77)); de speler zelf in beeld, dan de menigte van
    //    dichtbij, op 40 m en op 80 m (LOD 0, 1 en 2)
    const stad = P(100, 77);
    await jump(stad[0], stad[1], 9000);
    FP.setFirstPerson(w, false);
    note('straat', { ...telMensen(), voetgangers: w.pedestrians.length });
    await shot('straat-speler', 1500);
    // de dichtstbijzijnde groep voetgangers als middelpunt
    const peds = w.pedestrians.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < 120);
    let cx = p.x, cy = p.y;
    if (peds.length) { cx = peds.reduce((s, q) => s + q.x, 0) / peds.length; cy = peds.reduce((s, q) => s + q.y, 0) / peds.length; }
    const gz = gh(cx, cy);
    // de camera in het spel: x = kaart-x, y = hoogte, z = kaart-y
    for (const [naam, d, h] of [['menigte-10m', 10, 3], ['menigte-40m', 40, 9], ['menigte-80m', 80, 18]]) {
      p.x = cx - d * 0.7; p.y = cy - d * 0.7;   // het LOD volgt de afstand tot de speler: hij staat bij de camera
      await sleep(1500);
      cam(cx - d * 0.7, gz + h, cy - d * 0.7, cx, gz + 1, cy, d > 30 ? 40 : 60);
      await sleep(1500);
      note(naam, telMensen());
      await shot(naam, 600);
    }
    camOff();

    // 3. rijden met de binnencamera: een hatchback naast de speler, instappen, eerste persoon
    await jump(stad[0], stad[1], 3000);
    const car = new VH.Vehicle(p.x + 3, p.y, p.angle || 0, { name: 'hatch', len: 3.8, wid: 1.7, maxSpeed: 40, accel: 6, brake: 12, turnRate: 2, color: '#3f6ea8' });
    w.vehicles.push(car);
    p.enterVehicle(car, w);
    await sleep(2500);
    FP.setFirstPerson(w, true);
    await sleep(1500);
    note('auto-binnen', { inAuto: p.inVehicle === car, ...telMensen() });
    await shot('auto-binnen', 800);
    FP.setFirstPerson(w, false);
    await sleep(1500);
    await shot('auto-buiten', 800);
    // van opzij door het zijraam: de bestuurder met handen aan het stuur
    const sa = car.angle + Math.PI / 2;
    cam(car.x + Math.cos(sa) * -3.2, (car.z || gh(car.x, car.y)) + 1.4, car.y + Math.sin(sa) * -3.2, car.x, (car.z || gh(car.x, car.y)) + 1.0, car.y, 45);
    await shot('auto-zijkant', 1200);
    camOff();

    // 4. fietsen: uitstappen, een fiets naast de speler, opstappen en een stukje rijden
    p.exitVehicle(map, w);
    await sleep(1500);
    const bikeModel = VH.TRAFFIC_MODELS().find((m) => m.name === 'bike' && !m.fat);
    const bike = new VH.Vehicle(p.x + 2, p.y, p.angle || 0, { ...bikeModel });
    bike.isBike = true; w.vehicles.push(bike);
    p.enterVehicle(bike, w);
    await sleep(2000);
    key('w', 'KeyW', 'keydown'); await sleep(1500); key('w', 'KeyW', 'keyup');
    await sleep(300);
    note('fiets', { opFiets: p.inVehicle === bike, snelheid: +(bike.speed || 0).toFixed(1), ...telMensen() });
    await shot('fiets-achter', 300);
    const ba = bike.angle + Math.PI / 2;
    cam(bike.x + Math.cos(ba) * -3.5, gh(bike.x, bike.y) + 1.3, bike.y + Math.sin(ba) * -3.5, bike.x, gh(bike.x, bike.y) + 1.0, bike.y, 45);
    await shot('fiets-zijkant', 1000);
    camOff();
    note('fouten', fout);
  } catch (e) {
    console.error('[mensen] FOUT ' + (e && e.stack || e));
  }
  console.log('[mensen-klaar] ' + JSON.stringify(meet));
})();
