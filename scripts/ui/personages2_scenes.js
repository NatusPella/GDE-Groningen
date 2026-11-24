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

    // 1. het contactblad: één rij figuren van dichtbij, één rij op 30 m
    const stad = P(100, 77);
    await jump(stad[0], stad[1], 5000);
    FP.setFirstPerson(w, false);
    // een open plek: 26 m breed en 36 m diep zonder gebouw, in een van acht richtingen vanaf de speler
    const PG = await imp('pedgeom');
    let spot = null;
    outer: for (let ring = 0; ring <= 12; ring++) for (let a = 0; a < 16; a++) {
      const ox = p.x + Math.cos(a / 16 * 6.283) * ring * 12, oy = p.y + Math.sin(a / 16 * 6.283) * ring * 12;
      for (let h = 0; h < 8; h++) {
        const dx = Math.cos(h * Math.PI / 4), dy = Math.sin(h * Math.PI / 4); let free = true;
        for (let f = -2; f <= 36 && free; f += 3) for (let l = -13; l <= 13 && free; l += 3) { const x = ox + dx * f - dy * l, y = oy + dy * f + dx * l; if (PG.isInsideBuilding(map, x, y) || PG.isOnRoad(map, x, y, 1, ['major', 'normal'])) free = false; }
        if (free) { spot = { x: ox, y: oy, dx, dy }; break outer; }
      }
    }
    note('plek', spot);
    if (!spot) throw new Error('geen open plek');
    p.x = spot.x; p.y = spot.y;
    await sleep(4000);
    p.x = spot.x; p.y = spot.y;
    const gz0 = gh(spot.x, spot.y);
    const group = new THREE.Group(); S3().scene.add(group);
    const TYPES = [
      ['staand', null, {}], ['lopen', null, { walk: true }], ['bank', 'sit', { bench: true }], ['bellen', 'call', {}], ['appje', 'phone', {}],
      ['praten', 'talk', {}], ['hurken', 'crouch', {}], ['visser', 'fish', { bench: true }], ['hengel', 'hengel', {}], ['sjouwer', 'haul', {}],
      ['kraam', 'vendor', { counter: true }], ['boos', 'angry', {}], ['gitaar', 'muziek', {}], ['kind', null, { child: true }], ['oudere', null, { old: true }],
      ['agent', null, { cop: true }],
    ];
    const rig = [];
    const mk = (i, [naam, ps, o], row) => {
      const seed = 31 + i * 7 + row * 100;
      const shirt = [0x3f6ea8, 0xc8261e, 0x2f8a4a, 0xe0a526, 0x6a4a8a, 0xdddddd][i % 6];
      const opts = { seed, variant: i % 2 ? 'female' : 'male', role: 'voetganger', ...(o.child ? { look: { age: 'child' } } : {}), ...(o.cop ? { cop: true } : {}), ...(o.old ? { look: { age: 'old' } } : {}) };
      const m = MP.buildPersonMesh(o.cop ? 0x1f3f8f : shirt, 0xd9a47a, opts);
      m.userData.lookSeed = seed;
      if (ps) MP.registerPoseSource(seed, { pose: ps, state: 'alive', persistent: true });
      group.add(m);
      rig.push({ m, walk: !!o.walk, naam });
      if (o.bench) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.45, 0.5), new THREE.MeshLambertMaterial({ color: 0x7a5a3a })); b.userData.p2 = 1; group.add(b); rig[rig.length - 1].bench = b; }
      if (o.counter) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.5), new THREE.MeshLambertMaterial({ color: 0x9a8a6a })); group.add(b); rig[rig.length - 1].bench = b; }
      return m;
    };
    const place = (row, dist) => {
      const camx = p.x, camy = p.y;
      TYPES.forEach((t, i) => {
        const m = mk(i, t, row);
        const lat = (i - TYPES.length / 2) * 1.5, x = spot.x + spot.dx * dist - spot.dy * lat, y = spot.y + spot.dy * dist + spot.dx * lat, g = gh(x, y);
        m.position.set(x, g, y);
        m.rotation.y = -Math.atan2(-spot.dy, -spot.dx);   // kijkt naar de camera
        const r = rig[rig.length - 1];
        if (r.bench) { const off = t[2].counter ? -0.55 : 0.22; r.bench.position.set(x + spot.dx * off, g + (t[2].counter ? 0.45 : 0.225), y + spot.dy * off); r.bench.rotation.y = Math.atan2(-spot.dx, -spot.dy); }
        r.x = x; r.y = y; r.row = row;
      });
    };
    place(0, 6); place(1, 30);
    let last = performance.now();
    const loop = setInterval(() => { const n = performance.now(), dt = Math.min(0.05, (n - last) / 1000); last = n; for (const r of rig) { const m = r.m; MOD.setModularLod(m, r.row === 1 ? 1 : 0); MP.animatePersonWalk(m, r.walk ? 1.4 : 0, dt); } }, 16);
    await sleep(1500);
    note('blad', telMensen());
    const cz = gz0 + 1.2;
    // dichtbij in vier stukken (4 mensen per beeld) en de rij op 30 m in één beeld
    const near = rig.filter((r) => r.row === 0);
    for (let k = 0; k < 6; k++) {
      const grp = near.slice(k * 3, k * 3 + 3);
      const cx = grp.reduce((s, r) => s + r.x, 0) / grp.length, cy = grp.reduce((s, r) => s + r.y, 0) / grp.length;
      cam(cx - spot.dx * 3.6, cy - spot.dy * 3.6, cz + 0.2, cx, cy, gz0 + 1.0, 34);
      for (const r of rig) if (r.row === 1) r.m.visible = false;
      await shot('blad-dichtbij-' + (k + 1), 700);
    }
    for (const r of rig) r.m.visible = true;
    for (const r of rig) if (r.row === 0) r.m.visible = false;
    cam(spot.x, spot.y, cz + 6, spot.x + spot.dx * 30, spot.y + spot.dy * 30, gz0 + 1.0, 18);
    await shot('blad-30m', 900);
    for (const r of rig) r.m.visible = true;
    clearInterval(loop);
    S3().scene.remove(group);
    camOff();
    note('fouten', fout.slice(0, 8));
  } catch (er) { note('fout', String(er && er.stack || er).slice(0, 400)); }
})();
