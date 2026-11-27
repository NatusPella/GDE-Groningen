// Voertuigaudit (25-11, #1349): elk voertuigtype van dichtbij (5 m), op 20 m en op 60 m, met open deuren en met chauffeur, in het echte spel.
// Draait als --perf-script via scripts/qa/personages2_run.mjs (een Electron, wegwerpprofiel):
//   GDE_GAME_DIR=<stage> ELECTRON_EXE=<electron.exe> node scripts/qa/personages2_run.mjs --size=1920x1080 --scenes=scripts/ui/voertuigen_audit_scenes.js --only=a --out=<map in de worktree>
// --only=a personenauto's, b bedrijfswagens en bus, c tweewielers en landbouw.
// Beelden: va-<model>-<5m-voor|5m-achter|5m-zij|deur-l|deur-r|20m|60m|chauffeur-zij|chauffeur-voor>.png; cijfers als '[p2] <json>' in electron.log.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 500) => { await sleep(wait); console.log('[capture] va-' + name); await sleep(450); };
const note = (k, v) => console.error('[p2] ' + k + ' ' + JSON.stringify(v));
const SET = window.__p2Only || 'a';

await (async () => {
  try {
    const cine = await imp('cinematics');
    for (let i = 0; i < 240 && !ready() && !cine.isCinematicActive(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
    for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
    for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
    clearInterval(skipper);
    await sleep(3000);
    const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
    w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
    const { P } = await imp('worldframe'); const DN = await imp('daynight'); const FP = await imp('firstperson');
    const VH = await imp('vehicle'); const TF = await imp('trafficfleet'); const DR = await imp('vehicledoors');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 50) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'va-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose });
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
    const stad = P(100, 77);
    await jump(stad[0], stad[1], 9000);
    FP.setFirstPerson(w, false);
    const X0 = p.x + 8, Y0 = p.y;
    const clear = (v0) => { for (const v of w.vehicles) if (v !== v0 && v !== p.inVehicle && Math.hypot(v.x - X0, v.y - Y0) < 40) v.remove = true; w.pedestrians.forEach((q) => { if (Math.hypot(q.x - X0, q.y - Y0) < 30) { q.x += 200; } }); };
    const ev = (kind) => TF.carModel(kind);
    const TM = VH.TRAFFIC_MODELS();
    const SETS = {
      a: [['hatch', ev('hatch')], ['sedan', ev('sedan')], ['wagon', ev('wagon')], ['suv', ev('suv')], ['sport', ev('sport')], ['taxi', ev('taxi')], ['police', VH.POLICE_MODEL], ['escort', VH.HERO_CAR_MODEL]],
      b: [['van', ev('van')], ['delivery', ev('delivery')], ['truck', ev('truck')], ['ambulance', ev('ambulance')], ['cashvan', ev('cashvan')], ['newsvan', ev('newsvan')], ['foodtruck', VH.FOODTRUCK_MODEL], ['bus', TM.find((m) => m.name === 'bus')], ['midibus', TF.MIDIBUS_MODEL]],
      c: [['tractor', VH.TRACTOR_MODEL], ['quad', VH.QUAD_MODEL], ['scooter', TM.find((m) => m.name === 'scooter')], ['moped', VH.MOPED_MODEL], ['bike', TM.find((m) => m.name === 'bike' && !m.fat)], ['fatbike', TM.find((m) => m.fat)]],
    };
    const lijst = SETS[SET] || SETS.a;
    const rolls = [];
    for (const [naam, model] of lijst) {
      if (!model) { note('geen-model', naam); continue; }
      const vh = new VH.Vehicle(X0, Y0, 0, { ...model });
      if (TF.applyFleetFlags && ['taxi', 'ambulance', 'cashvan', 'newsvan'].includes(naam)) TF.applyFleetFlags(vh, naam);
      vh.isBike = model.name === 'bike';
      w.vehicles.push(vh);
      clear(vh);
      const gz = gh(X0, Y0);
      const rond = (d, rel, h = 1.4, fov = 50) => {
        const ang = vh.angle + rel; const cx = X0 + Math.cos(ang) * d, cy = Y0 + Math.sin(ang) * d;
        p.x = cx + Math.cos(ang) * 2.5; p.y = cy + Math.sin(ang) * 2.5; p.gz = gh(p.x, p.y);   // de speler staat achter de camera, buiten beeld
        cam(cx, cy, gz + h, X0, Y0, gz + 0.8, fov);
      };
      const len = model.len || 4;
      rond(len * 1.1 + 1.5, 0.6, 1.5);
      await shot(naam + '-5m-voor', 900);
      rond(len * 1.1 + 1.5, Math.PI - 0.6, 1.5);
      await shot(naam + '-5m-achter', 500);
      p.x = X0 + 0.5; p.y = Y0 + 2.2;
      DR.openDeurVoor(vh, 'bestuurder', 60); DR.openDeurVoor(vh, 'bijrijder', 60);
      try { DR.openDeurVoor(vh, 'achter', 60); } catch (e) { /* geen achterdeur */ }
      await sleep(900);
      rond(len * 0.7 + 2.5, -Math.PI / 2, 1.3);
      await shot(naam + '-deur-l', 500);
      rond(20, 0.6, 2.2, 40);
      await shot(naam + '-20m', 1100);
      rond(60, Math.PI - 0.25, 4, 40);
      await shot(naam + '-60m', 1500);
      if (['hatch', 'bus', 'bike'].includes(naam)) { rond(150, 0.9, 6, 30); await shot(naam + '-150m', 1800); }
      camOff(); p.x = X0 + 1; p.y = Y0 + 2.5;
      try { p.enterVehicle(vh, w); } catch (e) { note('instap-fout', naam + ' ' + String(e.message).slice(0, 80)); }
      await sleep(2200);
      rolls.push([naam, p.inVehicle === vh]);
      rond(len * 0.6 + 1.8, Math.PI / 2, 1.3, 45);
      await shot(naam + '-chauffeur-zij', 400);
      camOff();
      try { p.exitVehicle(map, w); } catch (e) { /* */ }
      await sleep(900);
      vh.remove = true; w.vehicles = w.vehicles.filter((q) => q !== vh);
    }
    note('instap', rolls);
    note('fouten', fout.slice(0, 10));
  } catch (e) { console.error('[p2] FOUT ' + (e && e.stack || e)); }
  console.log('[p2] klaar');
})();
