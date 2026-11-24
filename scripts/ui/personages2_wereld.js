// Personages 2 (24-11): contactblad van de modulaire mensen in de echte wereld. Draait als --scenes van scripts/ui_shots.mjs (EEN
// Electron, wegwerpprofiel, eigen slot): lopende en poserende figuren van dichtbij en op 30 m, telling modulair/procedureel per
// type, de markt, de kade en een halte. Beelden: <size>-p2-<naam>.png; cijfers als '[p2] <naam> <json>' in _log-<size>.txt.
//   node scripts/ui_shots.mjs --sizes=1600x900 --scenes=scripts/ui/personages2_scenes.js --out=<map> --timeout=600
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const key = (k, code, ty) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
const tap = (k, code) => { key(k, code, 'keydown'); key(k, code, 'keyup'); };
const loading = () => document.querySelector('.ls.on:not(.out)');
const ready = () => window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains('game-started') && !loading();
const shot = async (name, wait = 900) => { await sleep(wait); console.log('[capture] p2-' + name); await sleep(700); };
const note = (k, v) => console.error('[p2] ' + k + ' ' + JSON.stringify(v));
const S3 = () => window.__scene3d;
// per type: modulaire en procedurele figuren in de scene (een gehuide mens met userData.qRig of een eigen romp zonder)
const telMensen = () => {
  const r = { modulair: 0, procedureel: 0, ver: 0, poses: {} };
  S3().scene.traverse((o) => {
    if (o.isInstancedMesh && o.name === 'farcrowd' && o.visible) r.ver += o.count;
    const ud = o.userData;
    if (ud && ud.qRig) { r.modulair++; if (ud.qPosed) r.poses[ud.qPosed] = (r.poses[ud.qPosed] || 0) + 1; }
    else if (ud && ud.body && ud.body.isSkinnedMesh && ud.body.skeleton && !ud.qRig && ud.legL) r.procedureel++;
  });
  return r;
};

await (async () => {
  try {
    const cine = await imp('cinematics');
    for (let i = 0; i < 240 && !ready() && !cine.isCinematicActive(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    for (let i = 0; i < 60 && !cine.isCinematicActive() && !ready(); i++) await sleep(500);
    for (let i = 0; i < 240 && !ready(); i++) { if (!document.body.classList.contains('game-started') && i % 8 === 7) tap('Enter', 'Enter'); await sleep(1000); }
    const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
    for (let i = 0; i < 40 && cine.isCinematicActive(); i++) await sleep(250);
    for (let k = 0; k < 8 && window.__debug.world.paused; k++) { tap(' ', 'Space'); await sleep(700); }
    clearInterval(skipper);
    await sleep(3000);
    const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
    w.devInvuln = true; D.input.canLock = () => false; if (document.pointerLockElement) document.exitPointerLock();
    const { P } = await imp('worldframe'); const FP = await imp('firstperson');
    const MP = await imp('models3d_people'); const MOD = await imp('modularpeople');
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; };
    const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
    let pose = null;
    const cam = (x, y, z, lx, ly, lz, fov = 40) => {
      pose = { position: { x, y, z }, lookAt: { x: lx, y: ly, z: lz }, fov, cut: true };
      if (!cine.isCinematicActive()) cine.playCinematic({ id: 'p2-view', duration: 900, priority: 9, letterbox: false, skippable: false, hidePlayers: false, shot: () => (typeof pose === 'function' ? pose() : pose) });
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

    // 2. de echte wereld: telling per type op de plekken waar de vaste houdingen staan (kraam, kade, terras, sjouwer, halte) en op straat
    const CP = await imp('cityprops'); const BO = await imp('boarding'); const MPe = await imp('models3d_people');
    const stad = P(100, 77);
    const telDetail = () => {
      const r = { modulair: 0, procedureel: 0, ver: 0, poses: {}, kinds: {}, proc: [] };
      S3().scene.traverse((o) => {
        if (o.isInstancedMesh && o.name === 'farcrowd' && o.visible) r.ver += o.count;
        const ud = o.userData;
        if (ud && ud.qRig) { r.modulair++; if (ud.qPosed) r.poses[ud.qPosed] = (r.poses[ud.qPosed] || 0) + 1; }
        else if (ud && ud.body && ud.body.isSkinnedMesh && ud.body.skeleton && ud.legL) { r.procedureel++; r.proc.push([o.position.x | 0, o.position.z | 0, o.name || '', ud.lookSeed === undefined ? '' : Math.round(ud.lookSeed)]); }
      });
      for (const q of w.pedestrians) { const k = q.scene ? q.scene.kind : q.isCop ? 'agent' : q.pose ? 'pose-' + q.pose : q.carry ? 'draagt' : 'voetganger'; r.kinds[k] = (r.kinds[k] || 0) + 1; }
      return r;
    };
    await jump(stad[0], stad[1], 9000);
    FP.setFirstPerson(w, false);
    note('centrum', telDetail());
    await shot('centrum', 800);
    // spots per soort in de cellen rond het centrum
    const CELL = CP.CLUTTER_CELL, spots = {};
    for (let gx = -8; gx <= 8; gx++) for (let gy = -8; gy <= 8; gy++) {
      const cx = Math.floor(stad[0] / CELL) + gx, cy = Math.floor(stad[1] / CELL) + gy;
      for (const sp of CP.cellSlotSpots(map, cx, cy)) (spots[sp.kind] || (spots[sp.kind] = [])).push(sp);
    }
    note('spots', Object.fromEntries(Object.entries(spots).map(([k, v]) => [k, v.length])));
    for (const kind of ['vendor', 'seller', 'terrace', 'fisher', 'hauler', 'magnet', 'beggar', 'bernard']) {
      const sp = (spots[kind] || [])[0];
      if (!sp) { note('geen-spot-' + kind, 0); continue; }
      w.clock = 14;
      await jump(sp.x - Math.cos(sp.angle) * 9, sp.y - Math.sin(sp.angle) * 9, 8000);
      for (let i = 0; i < 6 && !w.pedestrians.some((q) => q.scene && q.scene.kind === kind); i++) { w.clock = 14; await sleep(2000); }
      // de dichtstbijzijnde echte figuur van deze soort (de plek zelf kan leeg zijn): camera van voren
      const sc = w.pedestrians.filter((q) => q.scene && q.scene.kind === kind).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      note('spot-' + kind, { at: [sp.x | 0, sp.y | 0], gevonden: !!sc, ...telDetail(), procStats: MPe.proceduralStats() });
      const tx = sc ? sc.x : sp.x, ty = sc ? sc.y : sp.y, ta = sc ? sc.scene.angle : sp.angle;
      cam(tx + Math.cos(ta) * 4, ty + Math.sin(ta) * 4, gh(tx, ty) + 1.9, tx, ty, gh(tx, ty) + 1.0, 42);
      await shot('spot-' + kind, 900);
      camOff();
    }
    // een halte
    await jump(stad[0], stad[1], 2000);
    let hp = null;
    for (let k = 0; k < 14 && !hp; k++) {
      const hs = BO.haltesInBeeld(); const h = hs && hs[0]; hp = h ? BO.halteplek(h) : null;
      if (!hp) { p.x += 40; p.y += 25; await sleep(2500); }
    }
    if (hp) { await jump(hp.x - 6, hp.y, 6000); await sleep(4000); note('halte', { at: [hp.x | 0, hp.y | 0], ...telDetail() }); cam(hp.x - 6, hp.y - 2, gh(hp.x, hp.y) + 2.2, hp.x, hp.y, gh(hp.x, hp.y) + 1.0, 50); await shot('halte', 900); camOff(); } else note('halte', 'niet gevonden');
    // een straat in drie gewone beelden op verschillende plekken
    for (const [naam, dx, dy] of [['straat-a', 30, 20], ['straat-b', -60, 40], ['straat-c', 20, -80]]) {
      await jump(stad[0] + dx, stad[1] + dy, 6000);
      const peds = w.pedestrians.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < 40);
      let cx = p.x, cy = p.y; if (peds.length) { cx = peds.reduce((a, q) => a + q.x, 0) / peds.length; cy = peds.reduce((a, q) => a + q.y, 0) / peds.length; }
      note(naam, telDetail());
      cam(cx - 7, cy - 7, gh(cx, cy) + 4, cx, cy, gh(cx, cy) + 1, 55);
      await shot(naam, 1200);
      camOff();
    }
    note('fouten', fout.slice(0, 8));
  } catch (er) { note('fout', String(er && er.stack || er).slice(0, 400)); }
})();
