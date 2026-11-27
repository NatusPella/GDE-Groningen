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
    const model = { ...TF.carModel(window.__p2Only === 'suv' ? 'suv' : 'hatch'), color: '#e8e6e0' };
    const vh = new VH.Vehicle(X0, Y0, 0, model); w.vehicles.push(vh); clear(vh);
    const gz = gh(X0, Y0);
    const rond = (d, rel, h = 1.2) => { const ang = vh.angle + rel; const cx = X0 + Math.cos(ang) * d, cy = Y0 + Math.sin(ang) * d; p.x = cx + Math.cos(ang) * 2.5; p.y = cy + Math.sin(ang) * 2.5; p.gz = gh(p.x, p.y); cam(cx, cy, gz + h, X0, Y0, gz + 0.7, 40); };
    rond(4.5, Math.PI / 2);
    await sleep(2500);
    let m3 = window.__scene3d.actors().vehicles.get(vh);
    if (!m3) for (const [k, val] of window.__scene3d.actors().vehicles) { if (k === vh || k.id === vh.id || (val.position && Math.abs(val.position.x - vh.x) < 0.1)) m3 = val; }
    note('m3', !!m3);
    const kand = [];
    m3.traverse((o) => { if (o.isMesh) kand.push(o); });
    note('kandidaten', kand.map((o, i) => i + ':' + (o.name || '-') + ':' + (o.material && (Array.isArray(o.material) ? 'arr' : o.material.type))));
    await shot('patch-basis', 300);
    const sc = window.__scene3d.scene; const lijstP = [];
    sc.traverse((o) => { if (o.isInstancedMesh && o.name === 'wheel-instances') { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; const arr = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) { const x = arr[i * 16 + 12], y = arr[i * 16 + 13], z = arr[i * 16 + 14]; if (Math.hypot(x - X0, z - Y0) < 4) lijstP.push({ geo: o.geometry.uuid.slice(0, 4), bb: [bb.min.x, bb.max.x, bb.min.y, bb.max.y, bb.min.z, bb.max.z].map((v) => +v.toFixed(2)), pos: [x - X0, y - gz, z - Y0].map((v) => +v.toFixed(2)), sc: [arr[i * 16], arr[i * 16 + 5], arr[i * 16 + 10]].map((v) => +v.toFixed(2)), tris: o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3 }); } } });
    note('wielpools', lijstP);
    const T3 = window.__scene3d.THREE, cam3 = window.__scene3d.cam;
    cam3.updateMatrixWorld(true);
    const rc = new T3.Raycaster();
    const hits = [];
    for (const [px, py] of [[828, 392], [800, 420], [850, 360]]) {
      rc.setFromCamera(new T3.Vector2((px / 1280) * 2 - 1, -(py / 720) * 2 + 1), cam3);
      const hh = rc.intersectObject(m3, true).slice(0, 6).map((h) => { const g = h.object.geometry, c = g.attributes.color; const col = c && h.face ? [c.getX(h.face.a), c.getY(h.face.a), c.getZ(h.face.a)].map((q) => +q.toFixed(2)) : null; const mt = Array.isArray(h.object.material) ? h.object.material[h.face && h.face.materialIndex || 0] : h.object.material; return { i: kand.indexOf(h.object), n: h.object.name, d: +h.distance.toFixed(2), col, side: mt && mt.side, t: mt && mt.type, vis: h.object.visible, wp: h.point.toArray().map((q) => +q.toFixed(2)) }; });
      hits.push([px, py, hh]);
    }
    note('rays', hits);
    rc.setFromCamera(new T3.Vector2((828 / 1280) * 2 - 1, -(392 / 720) * 2 + 1), cam3);
    const ch = rc.intersectObject(kand[7], false)[0];
    if (ch) { const g = kand[7].geometry, p = g.attributes.position; const v = [ch.face.a, ch.face.b, ch.face.c].map((i) => [p.getX(i), p.getY(i), p.getZ(i)].map((q) => +q.toFixed(3))); note('cabine-driehoek', { v, normaal: ch.face.normal.toArray().map((q) => +q.toFixed(2)), parentPos: kand[7].parent && kand[7].parent.position.toArray(), meshPos: kand[7].position.toArray(), meshRot: kand[7].rotation.toArray().slice(0, 3), vehAngle: vh.angle, tris: g.index ? g.index.count / 3 : p.count / 3 }); }
    for (let i = 0; i < kand.length; i++) { const o = kand[i]; if (!o.visible) continue; o.visible = false; await shot('patch-zonder-' + i, 200); o.visible = true; }
    note('instap', rolls);
    note('fouten', fout.slice(0, 10));
  } catch (e) { console.error('[p2] FOUT ' + (e && e.stack || e)); }
  console.log('[p2] klaar');
})();
