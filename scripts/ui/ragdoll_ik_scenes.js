// Ragdoll, IK en kapsels van de modulaire mensen (25-11, #1350 en #1351), in het echte spel.
//   set 'ragdoll': de speler en twee voetgangers worden geraakt, geschoten en weggeblazen en staan weer op; beeld per ~0,3 s.
//   set 'staart':  Tammo en de vaste personages (Tessa, Jelle, oma's) met staart, vlecht, staartjes en knot op LOD 0, 1 en 2.
//   set 'ik':      voeten op een trap en een helling, handen aan het stuur, kijken naar een doel.
//   GDE_GAME_DIR=<stage> ELECTRON_EXE=<electron.exe> node scripts/qa/personages2_run.mjs --size=1280x720 --scenes=scripts/ui/ragdoll_ik_scenes.js --only=ragdoll|staart|ik --out=<map in de worktree>
// Beelden: rd-<naam>.png; cijfers als '[p2] <json>' in electron.log. Samen spelen: alles lokaal, er wordt niets verstuurd.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 300) => { await sleep(wait); console.log('[capture] rd-' + name); await sleep(350); };
const note = (k, v) => console.error('[p2] ' + k + ' ' + JSON.stringify(v));
const SET = window.__p2Only || 'ragdoll';

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
    const RD = await imp('ragdoll'); const PE = await imp('models3d_people'); const SCAST = await imp('storycast');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 50) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'rd-view', duration: 3000, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => pose });
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
    await MP.loadModularPeople();
    const scene = S3.getScene();
    const wereld = (x, y, z) => [x, z, y];   // scene3d.js: mesh.position.set(p.x, p.gz, p.y), rotation.y = -hoek

    if (SET === 'ragdoll') {
      // twee voetgangers: de dichtstbijzijnde gewone mensen, naar de proefplek gezet
      const peds = w.pedestrians.filter((q) => !q.isCop && q.state !== 'dead' && !q.ragdoll).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3);
      note('voetgangers', peds.length);
      const zet = (a, x, y, ang) => { a.x = x; a.y = y; a.angle = ang; a.gz = gh(x, y); a.speed = 0; if (a.vx !== undefined) { a.vx = 0; a.vy = 0; } a.state = 'idle'; a.dest = null; };
      const rij = [p, ...peds];
      const gedrag = [
        { naam: 'speler-klap', kind: 'hit', vx: 4, vy: 0, vz: 1.2 },
        { naam: 'ped-schot', kind: 'shot', vx: 2.5, vy: 0, vz: 0.5 },
        { naam: 'ped-explosie', kind: 'blast', vx: 3, vy: 1, vz: 6 },
        { naam: 'ped-neerslag', kind: 'punch', vx: 2, vy: 0, vz: 0 },
      ];
      const camAt = (k) => cam(X0 + 2 * k, Y0 + 7.5, Z0 + 1.6, X0 + 2 * k, Y0, Z0 + 0.7, 48);
      for (let k = 0; k < Math.min(rij.length, gedrag.length); k++) {
        const g = gedrag[k], a = rij[k];
        camOff(); await sleep(300);
        for (const q of peds) zet(q, X0 - 40, Y0 + 40 + peds.indexOf(q), 0);   // de rest uit beeld
        const ax = X0 + 2 * k, ay = Y0;
        if (a === p) { p.x = ax; p.y = ay; p.angle = 0; p.gz = gh(ax, ay); } else zet(a, ax, ay, 0);
        camAt(k);
        await sleep(900);
        await shot(`${g.naam}-0-staand`, 100);
        RD.knockDown(a, w, { kind: g.kind, vx: g.vx, vy: g.vy, vz: g.vz, lieFor: 2.2 });
        const t0 = performance.now(); let n = 0;
        // elke ~0,3 s een beeld tot de mens weer staat (maximaal 8 s)
        while (a.ragdoll && performance.now() - t0 < 8000) { n++; await shot(`${g.naam}-${String(n).padStart(2, '0')}`, 120); }
        for (let i = 1; i <= 3; i++) await shot(`${g.naam}-na-${i}`, 250);
        note('einde ' + g.naam, { ragdoll: !!a.ragdoll, beelden: n });
      }
      // overrijden: een auto rijdt in op een voetganger
      if (peds.length) {
        const a = peds[0];
        camOff(); await sleep(300);
        const ax = X0 + 3, ay = Y0 + 4; zet(a, ax, ay, 0); a.gz = gh(ax, ay);
        const car = new VH.Vehicle(ax - 14, ay, 0, { ...TF.carModel('sedan') }); car.angle = 0; car.speed = 9; w.vehicles.push(car);
        cam(ax - 4, ay + 7.5, Z0 + 1.8, ax, ay, Z0 + 0.7, 50);
        const t0 = performance.now(); let hit = false, n = 0;
        while (performance.now() - t0 < 7000) {
          if (car.speed < 9 && !hit) car.speed = 9; car.angle = 0;
          if (!hit && Math.hypot(car.x - a.x, car.y - a.y) < 2.4) { hit = true; RD.knockDown(a, w, { kind: 'hit', vx: 7, vy: 0, vz: 3, lieFor: 2 }); }
          n++; if (n % 3 === 0) await shot('overrij-' + String(n / 3).padStart(2, '0'), 80); else await sleep(120);
          if (hit && !a.ragdoll) break;
        }
        note('overrijden', { geraakt: hit });
        w.vehicles.splice(w.vehicles.indexOf(car), 1);
      }
    }

    if (SET === 'staart') {
      const cast = [
        ['Tammo', { ...PE.TAMMO_APPEARANCE }],
        ['Tessa', { ...PE.ANITA_APPEARANCE }],
        ['Jelle', { ...SCAST.JELLE_LOOK }],
        ['oma', { shirt: 0x5c6f8a, skin: 0xf1c9a5, seed: 195, variant: 'female', hairStyle: 'bun', extra: { age: 'old' } }],
      ];
      const stijlen = ['short', 'ponytail', 'braid', 'pigtails', 'bun'];
      let rij = [];
      const bouw = (naam, app, i, n, lod, hoek) => {
        const m = PE.buildPersonMesh(app.shirt, app.skin, app);
        if (!m || !m.userData.qRig) return null;
        const [wx, wy, wz] = wereld(X0, Y0 + (i - (n - 1) / 2) * 1.0, Z0);
        m.position.set(wx, wy, wz); m.rotation.y = -hoek; scene.add(m); MP.setModularLod(m, lod); MP.poseModularClip(m, 'Idle', 0.2); rij.push(m);
        return m;
      };
      const leeg = () => { for (const m of rij.splice(0)) scene.remove(m); };
      // 1. Tammo en de anderen in hun eigen kapsel en met elke staartstijl, van achteren (hoek 0 = kijkt van de camera af)
      for (const lod of [0, 1, 2]) {
        for (const [naam, app] of cast.slice(0, 2)) {
          leeg();
          stijlen.forEach((st, i) => bouw(naam + st, { ...app, hairStyle: st }, i, stijlen.length, lod, 0));
          cam(X0 - 5.5, Y0, Z0 + 1.35, X0, Y0, Z0 + 1.3, lod === 0 ? 30 : 36);   // van achteren
          p.x = X0 + 14; p.y = Y0 + 6; p.gz = gh(p.x, p.y);
          await shot(`staart-${naam}-lod${lod}-achter`, 500);
          cam(X0 + 4, Y0 + 4.5, Z0 + 1.45, X0, Y0, Z0 + 1.35, 28);   // schuin voor: het gezicht en de staart
          await shot(`staart-${naam}-lod${lod}-schuin`, 400);
        }
      }
      // 2. de vaste personages zoals het spel ze bouwt (een oma met knot, Jelle)
      leeg();
      cast.forEach(([naam, app], i) => bouw(naam, app, i, cast.length, 0, 0.6));
      cam(X0 + 5.5, Y0, Z0 + 1.3, X0, Y0, Z0 + 1.2, 38);
      await shot('staart-vaste-personages', 500);
      leeg();
    }

    if (SET === 'tammo') {
      // #1351: Tammo (kort haar) van achteren en schuin, met en zonder pet, op LOD 0, 1 en 2
      const rij = [];
      let i = 0;
      for (const lod of [0, 1, 2]) for (const pet of [true, false]) {
        const app = { ...PE.TAMMO_APPEARANCE, ...(pet ? {} : { look: { hat: null } }) };
        const m = PE.buildPersonMesh(app.shirt, app.skin, app);
        const [wx, wy, wz] = wereld(X0, Y0 + (i++ - 2.5) * 0.9, Z0);
        m.position.set(wx, wy, wz); m.rotation.y = 0; scene.add(m); MP.setModularLod(m, lod); MP.poseModularClip(m, 'Idle', 0.2); rij.push(m);
      }
      p.x = X0 + 14; p.y = Y0 + 6; p.gz = gh(p.x, p.y);
      cam(X0 - 5, Y0, Z0 + 1.35, X0, Y0, Z0 + 1.3, 36); await shot('tammo-achter', 600);
      cam(X0 + 3, Y0 + 4.5, Z0 + 1.45, X0, Y0, Z0 + 1.35, 30); await shot('tammo-schuin', 400);
      for (const m of rij) scene.remove(m);
    }

    if (SET === 'ik') {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      const mat = new THREE.MeshLambertMaterial({ color: 0xb9b2a4 });
      const objs = [];
      // een trap van 4 treden (18 cm hoog, 45 cm diep) en een helling van 20 graden, naast elkaar langs de z-as
      const stair = (x, y) => Math.max(0, Math.min(4, Math.floor((x - (X0 + 0.5)) / 0.45) + 1)) * 0.18;
      for (let k = 1; k <= 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45 * (5 - k) + 0.5, 0.18 * k, 1.6), mat); const [wx, wy, wz] = wereld(X0 + 0.5 + 0.45 * (k - 1) + (0.45 * (5 - k) + 0.5) / 2 - 0.05, Y0, Z0); b.position.set(wx, wy + 0.09 * k, wz); scene.add(b); objs.push(b); }
      const people = [];
      const mk = (seed, female, x, ang, clip, u) => { const m = MP.buildModularPerson(seed, { variant: female ? 'female' : 'male' }); const [wx, wy, wz] = wereld(x, Y0, Z0); m.position.set(wx, wy, wz); m.rotation.y = -ang; scene.add(m); MP.setModularLod(m, 0); MP.poseModularClip(m, clip, u); people.push(m); return m; };
      const voeten = (m, f) => { m.updateMatrixWorld(true); MP.plantFeetModular(m, (x, z) => f(x, z), 1); };
      const geen = mk(21, false, X0 - 0.4, 0, 'Walk', 0.1);
      const opTrap = [mk(22, false, X0 + 0.7, 0, 'Walk', 0.1), mk(23, true, X0 + 1.6, 0, 'Walk', 0.35)];
      const metIK = [opTrap[0], opTrap[1]];
      const noteVoet = (m) => { const I = m.userData.qIdx, B = m.userData.qBones; m.updateMatrixWorld(true); return [I.footL, I.footR].map((i) => { const v = B[i].getWorldPosition(new THREE.Vector3()); return { x: +v.x.toFixed(2), y: +v.y.toFixed(3), grond: +stair(v.x, v.z).toFixed(3) }; }); };
      note('voeten-zonder-ik', opTrap.map(noteVoet));
      cam(X0 + 1, Y0 + 5.5, Z0 + 0.9, X0 + 1, Y0, Z0 + 0.5, 42);
      p.x = X0 + 14; p.y = Y0 + 6; p.gz = gh(p.x, p.y);
      await shot('ik-trap-zonder', 600);
      for (const m of metIK) voeten(m, stair);
      note('voeten-met-ik', opTrap.map(noteVoet));
      await shot('ik-trap-met', 300);
      // kijken naar een doel: hoofd en nek naar links, rechts en omhoog
      for (const g of [-0.9, 0.9]) { geen.userData.gazeT = g; for (let i = 0; i < 20; i++) { MP.animateModular(geen, 0, 1 / 30); } cam(X0 - 0.4 + 3, Y0 + 2.4, Z0 + 1.7, X0 - 0.4, Y0, Z0 + 1.6, 30); await shot('ik-kijken-' + (g < 0 ? 'links' : 'rechts'), 300); }
      for (const o of objs) scene.remove(o); for (const m of people) scene.remove(m);
    }
    camOff();
    note('fouten', fout.slice(0, 10));
  } catch (e) { console.error('[p2] FOUT ' + (e && e.stack || e)); }
  console.log('[p2] klaar');
})();
