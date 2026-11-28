// Mensenaudit (25-11, #1349): (1) alle clips van de modulaire mensen als rij (poseModularClip), man, vrouw en kind, in de echte wereld op
// meerdere LOD-afstanden; (2) de speler zelf in het echte spel: staan, lopen, rennen, springen, hurken, omkijken, instappen, uitstappen,
// op een bank zitten; (3) schaal van een mens naast een auto, de deur en een fiets.
//   GDE_GAME_DIR=<stage> ELECTRON_EXE=<electron.exe> node scripts/qa/personages2_run.mjs --size=1920x1080 --scenes=scripts/ui/mensen_audit_scenes.js --only=clips|speler --out=<map in de worktree>
// Beelden: ma-<naam>.png; cijfers als '[p2] <json>' in electron.log. Samen spelen: alles lokaal, er wordt niets verstuurd.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 500) => { await sleep(wait); console.log('[capture] ma-' + name); await sleep(450); };
const note = (k, v) => console.error('[p2] ' + k + ' ' + JSON.stringify(v));
const SET = window.__p2Only || 'clips';

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
    const VH = await imp('vehicle'); const MP = await imp('modularpeople'); const S3 = await imp('scene3d'); const TF = await imp('trafficfleet');
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 50) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'ma-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose });
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
    const X0 = p.x + 8, Y0 = p.y, Z0 = gh(X0, Y0);

    if (SET === 'clips') {
      await MP.loadModularPeople();
      const scene = S3.getScene();
      const alle = MP.buildModularPerson(11, { variant: 'male' });
      const names = MP.modularClipNames(alle);
      note('clips', names.length);
      const rij = [];
      const probe = scene.children.find((o) => o.userData && o.userData.qRig);
      note('voorbeeldmens', probe ? { x: +probe.position.x.toFixed(1), y: +probe.position.y.toFixed(1), z: +probe.position.z.toFixed(1), rot: +probe.rotation.y.toFixed(2) } : null);
      const wereld = (x, y, z) => [x, z, y];   // scene3d.js: mesh.position.set(p.x, p.gz, p.y), rotation.y = -hoek
      const perPagina = 8;
      for (let pg = 0; pg * perPagina < names.length; pg++) {
        for (const m of rij.splice(0)) { scene.remove(m); }
        const lijst = names.slice(pg * perPagina, pg * perPagina + perPagina);
        lijst.forEach((n, i) => {
          const m = MP.buildModularPerson(11 + i, { variant: i % 2 ? 'female' : 'male' });
          if (!m) return;
          const [wx, wy, wz] = wereld(X0, Y0 + (i - 3.5) * 1.15, Z0);
          m.position.set(wx, wy, wz); m.rotation.y = -Math.PI;   // kijkt naar de camera (hoek pi = -x)
          scene.add(m); MP.setModularLod(m, 0); MP.poseModularClip(m, n, 0.35); rij.push(m);
          m.userData.__clipnaam = n;
        });
        note('pagina-' + pg, lijst);
        cam(X0 + 9, Y0, Z0 + 1.3, X0, Y0, Z0 + 0.9, 55);
        p.x = X0 + 14; p.y = Y0 + 6; p.gz = gh(p.x, p.y);
        await shot('clips-' + pg, 700);
      }
      for (const m of rij.splice(0)) scene.remove(m);
    }

    if (SET === 'speler') {
      p.x = X0 - 10; p.y = Y0; p.angle = 0; p.gz = gh(p.x, p.y);
      const kijk = async (naam, wacht = 600) => { await shot(naam, wacht); };
      camOff();
      await sleep(1500);
      await kijk('speler-staan', 400);
      key('w', 'KeyW', 'keydown'); await sleep(1200); await kijk('speler-lopen', 100);
      key('Shift', 'ShiftLeft', 'keydown'); await sleep(1200); await kijk('speler-rennen', 100);
      key('Shift', 'ShiftLeft', 'keyup'); key('w', 'KeyW', 'keyup');
      await sleep(500);
      tap(' ', 'Space'); await sleep(250); await kijk('speler-sprong', 50);
      await sleep(900);
      key('c', 'KeyC', 'keydown'); await sleep(700); await kijk('speler-hurken', 100); key('c', 'KeyC', 'keyup');
      await sleep(600);
      // een auto naast de speler, in- en uitstappen: tussenbeelden van de overgang
      p.x = X0 - 6; p.y = Y0 + 6; p.gz = gh(p.x, p.y);
      const car = new VH.Vehicle(p.x + 3, p.y, 0, { ...TF.carModel('sedan') });
      w.vehicles.push(car);
      await sleep(1200);
      p.enterVehicle(car, w);
      for (const t of [150, 300, 300, 400]) { await sleep(t); await kijk('speler-instap-' + t + '-' + Math.round(performance.now() % 100000), 0); }
      await sleep(1500); await kijk('speler-in-auto', 100);
      p.exitVehicle(map, w);
      for (const t of [150, 300, 300, 400]) { await sleep(t); await kijk('speler-uitstap-' + t + '-' + Math.round(performance.now() % 100000), 0); }
      await sleep(1500);
      // schaal: een voetganger naast de auto en een fiets
      const bike = new VH.Vehicle(p.x - 2, p.y + 2, 0, { ...VH.TRAFFIC_MODELS().find((m) => m.name === 'bike' && !m.fat) });
      bike.isBike = true; w.vehicles.push(bike);
      p.x = car.x + 2.2; p.y = car.y + 2.4; p.gz = gh(p.x, p.y);
      await sleep(800);
      cam(car.x + 1, car.y + 7, gh(car.x, car.y) + 1.4, car.x, car.y, gh(car.x, car.y) + 0.9, 45);
      await kijk('schaal-auto-mens', 400);
      camOff();
    }
    note('fouten', fout.slice(0, 10));
  } catch (e) { console.error('[p2] FOUT ' + (e && e.stack || e)); }
  console.log('[p2] klaar');
})();
