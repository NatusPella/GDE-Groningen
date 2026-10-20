// Page half of scripts/qa/wachtbeeld.mjs (desktop --perf-script body): gerichte scène-opnames voor de
// issues met het label wacht-beeld. window.__wb = { jobs, settle } staat ervoor. Elke job:
//   { kind: 'spot',  name, x, y, a?, clock?, weather?, snapR?, road?, views: [{ n, back, up, ahead, lookUp, side }] }
//   { kind: 'jump',  name, step, reps, waits: [ms, ...], clock? }     (dev-sprong naar een verhaalstap, spelcamera)
//   { kind: 'menu',  name, x, y, menu, clock? }                       (pauzemenu-paneel op een plek)
//   { kind: 'mini',  name, x, y, a?, clock? }                         (spelbeeld met minimap op een plek)
// Per opname: '[capture] <naam>'. Resultaten (gemeten waarden) komen in de JSON die het script teruggeeft.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WL = await imp('waterlevels');
const TP = await imp('tileplace');
const CAM = await imp('camerapath');
const CFG = window.__wb;
const SETTLE = CFG.settle || 7000;
let ownShot = false, skipCine = true;
const skipper = setInterval(() => { if (skipCine && !ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
const origErr = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); origErr.apply(console, a); };
window.addEventListener('error', (e) => errors.push(String(e.message).slice(0, 200)));

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, env = { clock: 14, weather: null, fix: false }, done = false;
const setWeather = () => {
  const W = env.weather || { kind: 'helder' };
  w.weather = { active: W.kind !== 'helder', timer: 1e9, kind: W.kind, peak: W.intensity || 0, intensity: W.intensity || 0, wet: W.wet || 0, overcast: W.overcast || 0, mist: W.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
};
const fixWorld = () => { w.clock = env.clock; setWeather(); if (DN.refreshDayNight) DN.refreshDayNight(w); };
const tick = () => {
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; if (hold.a !== undefined) { p.angle = hold.a; w.camYaw = hold.a; } }
  if (env.fix) w.clock = env.clock;
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
function snapRoad(x, y, R, road) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : []) || []) {
    if (road && rd.name !== road && rd.ref !== road) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), street: rd.name || rd.ref || '' };
    }
  }
  return best;
}
const capture = async (name, wait = 600) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const poseShot = async (name, pose, wait = 2200) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'wb-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(600);
  cine.skipCinematic();
  ownShot = false;
};
const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
// kijkstraal door pixel (px, py) van het 1600x900-beeld: welke mesh zit daar (naam, ouderketen, materiaal)
const probeAt = (px, py) => {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(px / innerWidth * 2 - 1, -(py / innerHeight * 2 - 1)), sc.cam);
  const out = [];
  for (const h of ray.intersectObject(sc.scene, true).slice(0, 6)) {
    const o = h.object, chain = [];
    for (let q = o; q && chain.length < 5; q = q.parent) chain.push((q.name || q.type) + (q.userData && Object.keys(q.userData).length ? ':' + JSON.stringify(q.userData).slice(0, 80) : ''));
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    out.push({ d: +h.distance.toFixed(1), at: [h.point.x, h.point.z, h.point.y].map((v) => +v.toFixed(1)), type: o.type, chain, mat: m && { name: m.name, color: m.color && m.color.getHexString(), type: m.type }, inst: h.instanceId, instCol: o.instanceColor && h.instanceId !== undefined ? '#' + new THREE.Color().fromBufferAttribute(o.instanceColor, h.instanceId).getHexString() : undefined, bsph: o.geometry && o.geometry.boundingSphere ? [o.geometry.boundingSphere.radius | 0] : undefined, pos: [o.position.x, o.position.z, o.position.y].map((v) => +v.toFixed(1)), vis: o.visible, verts: o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count });
  }
  return out;
};
const camInfo = () => {
  const c = sc.cam; if (!c) return null;
  const cx = c.position.x, cy = c.position.y, cz = c.position.z;
  // scene3d: x,z are the world x,y (z up = y in three); try both conventions
  return { pos: [cx, cz, cy].map((v) => Math.round(v * 10) / 10) };
};
// vehicles near (x, y): overlap pairs (centre distance below half the summed lengths)
function vehicleOverlap(x, y, R) {
  const vs = (w.vehicles || []).filter((v) => v && Number.isFinite(v.x) && Math.hypot(v.x - x, v.y - y) < R);
  const pairs = [];
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const a = vs[i], b = vs[j], d = Math.hypot(a.x - b.x, a.y - b.y);
    const ra = ((a.len || (a.spec && a.spec.len) || 4) + (b.len || (b.spec && b.spec.len) || 4)) / 2 * 0.6;
    if (d < ra) pairs.push([a.kind || a.name || '?', b.kind || b.name || '?', +d.toFixed(2)]);
  }
  return { n: vs.length, moving: vs.filter((v) => Math.abs(v.speed || 0) > 0.5).length, overlap: pairs };
}

// oriented-box overlap (SAT) of two vehicles: how deep they overlap (m), 0 = free
function obbOverlap(a, b) {
  const box = (v) => { const L = ((v.model && v.model.len) || 4.2) / 2, W = ((v.model && v.model.wid) || 1.8) / 2, c = Math.cos(v.angle), s = Math.sin(v.angle); return { x: v.x, y: v.y, ax: [c, s], ay: [-s, c], L, W }; };
  const A = box(a), B = box(b);
  let min = Infinity;
  for (const ax of [A.ax, A.ay, B.ax, B.ay]) {
    const proj = (q) => { const c = q.x * ax[0] + q.y * ax[1]; const r = q.L * Math.abs(q.ax[0] * ax[0] + q.ax[1] * ax[1]) + q.W * Math.abs(q.ay[0] * ax[0] + q.ay[1] * ax[1]); return [c - r, c + r]; };
    const pa = proj(A), pb = proj(B);
    const o = Math.min(pa[1], pb[1]) - Math.max(pa[0], pb[0]);
    if (o <= 0) return 0;
    min = Math.min(min, o);
  }
  return min;
}
const ssInfo = () => { const e = document.querySelector('#start-screen'); if (!e) return null; const c = getComputedStyle(e); return { cls: e.className, display: c.display, opacity: c.opacity, vis: c.visibility, top: !!e.offsetParent, paused: !!w.paused, menuCam: !!w.menuCam, body: document.body.className, mode: w.mode || w.state || null }; };
// de botsvorm van het spel (vehicle.js vehicleCapsule): hoe diep twee capsules in elkaar zitten (m), 0 = vrij
function capsulePen(a, b) {
  const cap = (v) => { const sh = Math.max(0, v.halfLen - v.halfWid), dx = Math.cos(v.angle) * sh, dy = Math.sin(v.angle) * sh; return { ax: v.x - dx, ay: v.y - dy, bx: v.x + dx, by: v.y + dy, r: v.halfWid + 0.05 }; };
  const A = cap(a), B = cap(b);
  const d2 = (px, py, s) => { const vx = s.bx - s.ax, vy = s.by - s.ay, L = vx * vx + vy * vy || 1e-9; let t = ((px - s.ax) * vx + (py - s.ay) * vy) / L; t = Math.max(0, Math.min(1, t)); const qx = s.ax + vx * t - px, qy = s.ay + vy * t - py; return qx * qx + qy * qy; };
  const m = Math.min(d2(A.ax, A.ay, B), d2(A.bx, A.by, B), d2(B.ax, B.ay, A), d2(B.bx, B.by, A));
  return Math.max(0, A.r + B.r - Math.sqrt(m));
}
const RG = await imp('regions');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const kb = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true })); };
let theBoat = null;
const putBoat = (x, y, angle) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  if (theBoat) { const i = w.vehicles.indexOf(theBoat); if (i >= 0) w.vehicles.splice(i, 1); }
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  theBoat = new VH.Vehicle(x, y, angle, { ...BT.BOAT_KINDS.sloep });
  theBoat.isBoat = true; theBoat.speed = 0; w.vehicles.push(theBoat);
  p.enterVehicle(theBoat, w);
};
const results = [];
for (const J of CFG.jobs) {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  env = { clock: J.clock !== undefined ? J.clock : 14, weather: J.weather || null, fix: true };
  // een hardnekkig startscherm (de Enter-wachtlus van de driver haalt het soms niet weg) valt over elk beeld: verbergen
  { const ss0 = document.querySelector('#start-screen'); if (ss0) ss0.style.display = 'none'; }
  const rec = { name: J.name, kind: J.kind };
  if (J === CFG.jobs[0]) rec.ss0 = ssInfo();
  try {
    if (J.kind === 'spot' || J.kind === 'mini' || J.kind === 'menu') {
      let s = { x: J.x, y: J.y, a: J.a || 0 };
      w.wanted = 0;
      fixWorld(); teleport(s.x, s.y); hold = s;
      await sleep(SETTLE * 0.6);
      if (J.snapR !== 0) {
        const sn = snapRoad(J.x, J.y, J.snapR || 300, J.road);
        if (sn) s = { x: sn.x, y: sn.y, a: J.a !== undefined ? J.a : sn.a, street: sn.street, d: Math.round(sn.d) };
      }
      teleport(s.x, s.y); hold = s; fixWorld();
      await sleep(SETTLE);
      rec.at = [Math.round(s.x), Math.round(s.y)]; rec.street = s.street; rec.ground = gh(s.x, s.y);
      rec.inBuilding = !!TP.buildingAt(map, s.x, s.y, 0);
      if (J.bld) { rec.buildings = (map.buildingsNear(s.x, s.y, J.bld) || []).map((b) => { const o = {}; for (const k of Object.keys(b)) { const v = b[k]; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') o[k] = v; else if (Array.isArray(v) && v.length <= 6 && v.every((q) => typeof q === 'number')) o[k] = v.map((q) => Math.round(q * 10) / 10); else if (Array.isArray(v)) o[k] = 'arr' + v.length; } return o; }).filter((o) => !J.bldMin || (o.bounds && (o.bounds[2] - o.bounds[0] >= J.bldMin || o.bounds[3] - o.bounds[1] >= J.bldMin))).slice(0, 40); }
      if (J.kind === 'spot') {
        const cx = Math.cos(s.a), cy = Math.sin(s.a), base = gh(s.x, s.y);
        for (const v of J.views || []) {
          const side = v.side || 0, sx = -cy * side, sy = cx * side;
          const pose = { position: { x: s.x - cx * (v.back || 0) + sx, y: s.y - cy * (v.back || 0) + sy, z: base + (v.up || 3) }, lookAt: { x: s.x + cx * (v.ahead || 20), y: s.y + cy * (v.ahead || 20), z: base + (v.lookUp || 1) }, cut: true };
          await poseShot(J.name + '-' + v.n, pose);
        }
        rec.verkeer = vehicleOverlap(s.x, s.y, J.verkeerR || 60);
        if (J.probe) { rec.probe = []; for (const pr of J.probe) { const v = pr.view; const cx = Math.cos(s.a), cy = Math.sin(s.a), base = gh(s.x, s.y); const pose = { position: { x: s.x - cx * v.back, y: s.y - cy * v.back, z: base + v.up }, lookAt: { x: s.x + cx * v.ahead, y: s.y + cy * v.ahead, z: base + (v.lookUp || 0) }, cut: true }; ownShot = true; cine.playCinematic({ id: 'wb-probe', duration: 30, priority: 9, shot: () => pose }); await sleep(1500); rec.probe.push({ px: pr.px, py: pr.py, hits: probeAt(pr.px, pr.py) }); cine.skipCinematic(); ownShot = false; } }
      } else if (J.kind === 'mini') {
        await capture(J.name + '-spel');
        await sleep(800);
        await capture(J.name + '-spel2');
        rec.verkeer = vehicleOverlap(s.x, s.y, J.verkeerR || 60);
      } else if (J.kind === 'menu') {
        PM.openPauseMenu(J.menu || 'map');
        await sleep(2500);
        await capture(J.name + '-' + (J.menu || 'map'));
        await sleep(1500);
        await capture(J.name + '-' + (J.menu || 'map') + '2');
        PM.closePauseMenu();
      }
    } else if (J.kind === 'traffic') {
      // blijf op de plek en meet elke seconde hoeveel voertuigparen elkaar overlappen (SAT)
      let s = { x: J.x, y: J.y, a: J.a || 0 };
      fixWorld(); teleport(s.x, s.y); hold = s;
      await sleep(SETTLE * 0.6);
      const sn = snapRoad(J.x, J.y, J.snapR || 300, J.road);
      if (sn) s = { x: sn.x, y: sn.y, a: sn.a, street: sn.street };
      teleport(s.x, s.y); hold = s; fixWorld();
      await sleep(SETTLE * 0.5);
      rec.at = [Math.round(s.x), Math.round(s.y)]; rec.samples = [];
      const R = J.R || 90, t0 = performance.now();
      let worst = { depth: 0 }, shotAt = 0, shots = 0, maxN = 0;
      while (performance.now() - t0 < (J.dur || 90) * 1000) {
        const vs = (w.vehicles || []).filter((v) => v && Number.isFinite(v.x) && !v.isBike && !v.isScooter && Math.hypot(v.x - s.x, v.y - s.y) < R);
        const pr = [];
        for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
          if (Math.abs((vs[i].z || 0) - (vs[j].z || 0)) > 2) continue;
          const d = obbOverlap(vs[i], vs[j]), cp = capsulePen(vs[i], vs[j]);
          if (d > 0.15) pr.push({ da: [vs[i], vs[j]].map((v) => ({ id: v.id, wid: !!v._wid, driver: v.driver, dist: Math.round(Math.hypot(v.x - p.x, v.y - p.y)), ign: v.ignoreId ? Math.round(v.ignoreUntil - w.time) : null, why: v._why || null, blocked: +(v.blockedFor || 0).toFixed(1), creep: v.creepUntil ? Math.round(v.creepUntil - w.time) : null, stuck: +(v.stuckFor || 0).toFixed(1), sp: +(v.speed || 0).toFixed(1), road: v.road && (v.road.name || v.road.kind) || null })), a: (vs[i].model && vs[i].model.name) || '?', b: (vs[j].model && vs[j].model.name) || '?', depth: +d.toFixed(2), cap: +cp.toFixed(2), at: [Math.round(vs[i].x), Math.round(vs[i].y)], sp: [+(vs[i].speed || 0).toFixed(1), +(vs[j].speed || 0).toFixed(1)] });
        }
        maxN = Math.max(maxN, vs.length);
        rec.samples.push([Math.round(performance.now() - t0), vs.length, pr.length]);
        for (const q of pr) { if (q.depth > worst.depth) worst = { ...q, t: Math.round(performance.now() - t0) }; if (q.cap > 0.3 && !(rec.diag || (rec.diag = [])).some((d) => d.da[0].id === q.da[0].id && d.da[1].id === q.da[1].id) && rec.diag.length < 8) rec.diag.push(q); }
        if (pr.length && shots < 2 && performance.now() - shotAt > 15000) {
          shotAt = performance.now(); shots++;
          const q = pr[0], cx = Math.cos(s.a), cy = Math.sin(s.a), base = gh(q.at[0], q.at[1]);
          await poseShot(J.name + '-overlap' + shots, { position: { x: q.at[0] - 14, y: q.at[1] - 14, z: base + 14 }, lookAt: { x: q.at[0], y: q.at[1], z: base + 0.5 }, cut: true }, 1500);
          void cx; void cy;
        }
        await sleep(1000);
      }
      rec.maxVehicles = maxN; rec.worst = worst; rec.overlapSamples = rec.samples.filter((q) => q[2] > 0).length; rec.nSamples = rec.samples.length;
      const cx = Math.cos(s.a), cy = Math.sin(s.a), base = gh(s.x, s.y);
      await poseShot(J.name + '-eind-hoog', { position: { x: s.x - cx * 30, y: s.y - cy * 30, z: base + 30 }, lookAt: { x: s.x, y: s.y, z: base }, cut: true });
      await capture(J.name + '-eind-straat');
    } else if (J.kind === 'water') {
      // het dichtstbijzijnde diepe water rond (x, y): drie standen over het water (dubbele waterlaag, #231)
      hold = null; env.fix = true; fixWorld();
      teleport(J.x, J.y); hold = { x: J.x, y: J.y }; await sleep(SETTLE * 0.6);
      let f = null;
      for (let r = 0; r <= (J.R || 1500) && !f; r += 25) {
        const n = r === 0 ? 1 : Math.max(8, Math.round(r / 12));
        for (let k = 0; k < n && !f; k++) { const t = (k / n) * Math.PI * 2, x = J.x + Math.cos(t) * r, y = J.y + Math.sin(t) * r; const wa = WL.waterAt(map, x, y); if (wa && wa.depth > 0.8) f = { x, y, wa }; }
      }
      if (!f) { rec.fout = 'geen water binnen ' + (J.R || 1500) + ' m'; }
      else {
        let best = { run: -1, a: 0 };
        for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; let run = 0; for (let d = 10; d <= 600; d += 10) { if (!WL.waterAt(map, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d)) break; run = d; } if (run > best.run) best = { run, a }; }
        teleport(f.x, f.y); hold = { x: f.x, y: f.y, a: best.a }; await sleep(SETTLE * 0.6);
        rec.water = { at: [Math.round(f.x), Math.round(f.y)], kind: f.wa.kind, level: f.wa.level, open: best.run };
        // alle vlakken recht onder een punt boven het water (twee watervlakken op bijna dezelfde hoogte = dubbel water, #231)
        const downAt = (x, y) => {
          const ray = new THREE.Raycaster(new THREE.Vector3(x, 400, y), new THREE.Vector3(0, -1, 0), 0, 800); ray.camera = sc.cam;
          return ray.intersectObject(sc.scene, true).filter((h) => h.object.visible).slice(0, 8).map((h) => { const o = h.object, chain = []; for (let q = o; q && chain.length < 3; q = q.parent) chain.push(q.name || q.type); const m = Array.isArray(o.material) ? o.material[0] : o.material; return { y: +h.point.y.toFixed(2), chain: chain.join('<'), mat: m && (m.name || m.type), verts: o.geometry && o.geometry.attributes.position && o.geometry.attributes.position.count }; });
        };
        rec.down = [];
        for (const [dx, dy] of [[0, 0], [8, 0], [0, 8], [-8, 0], [0, -8]]) rec.down.push({ dx, dy, hits: downAt(f.x + dx, f.y + dy) });
        const lv = f.wa.level, ca = Math.cos(best.a), sa = Math.sin(best.a);
        await poseShot(J.name + '-a', { position: { x: f.x - ca * 25, y: f.y - sa * 25, z: lv + 9 }, lookAt: { x: f.x + ca * 160, y: f.y + sa * 160, z: lv }, cut: true });
        await poseShot(J.name + '-b', { position: { x: f.x - Math.cos(best.a + 1.57) * 45, y: f.y - Math.sin(best.a + 1.57) * 45, z: lv + 22 }, lookAt: { x: f.x, y: f.y, z: lv }, cut: true });
        await poseShot(J.name + '-c', { position: { x: f.x, y: f.y, z: lv + 2.5 }, lookAt: { x: f.x - ca * 120, y: f.y - sa * 120, z: lv + 1 }, cut: true });
        await poseShot(J.name + '-d', { position: { x: f.x, y: f.y, z: lv + 120 }, lookAt: { x: f.x + ca * 200, y: f.y + sa * 200, z: lv }, cut: true });
      }
      hold = null;
    } else if (J.kind === 'outro') {
      // de echte spelweg (#264): spring naar een missie, start hem, rond hem af (de outro start zelf) en tel de figuren
      hold = null; env.fix = false; setWeather(); skipCine = false;
      const S2 = window.__story;
      rec.ok = !!S2.jump(J.step, { start: true });
      await sleep(5000);
      rec.complete = !!S2.complete();
      rec.cines = [];
      let shots = 0, lastShot = 0;
      for (let t = 0; t < (J.secs || 90); t += 1) {
        await sleep(1000);
        if (!cine.isCinematicActive()) { if (rec.cines.length && t > 20) break; continue; }
        if (t - lastShot >= (J.every || 6) && shots < (J.max || 10)) {
          lastShot = t; shots++;
          const found = [];
          sc.scene.traverse((o) => {
            if (!o.userData || !o.userData.shadow || !o.visible) return;
            for (let q = o.parent; q; q = q.parent) if (!q.visible) return;
            const wp = o.getWorldPosition(new o.position.constructor());
            if (Math.hypot(wp.x - p.x, wp.z - p.y) > 20) return;
            let owner = ''; for (let q = o.parent; q; q = q.parent) if (q.name && /^cutscript/.test(q.name)) owner = q.name;
            found.push({ owner, at: [wp.x, wp.z].map((v) => +v.toFixed(1)) });
          });
          rec.cines.push({ t, hidePlayers: !!w.cinematicHidePlayers, figures: found.length, eigen: found.filter((q) => !q.owner).length });
          console.log('[capture] ' + J.name + '-t' + String(t).padStart(2, '0'));
          await sleep(600);
        }
      }
      skipCine = true;
      if (cine.isCinematicActive()) cine.skipCinematic();
    } else if (J.kind === 'boatroute') {
      // een waypoint op water, in een boot: komt er een route, en staan de kaartlijn en het baken er (#232)
      hold = null; env.fix = true; fixWorld();
      const RT = await imp('routing');
      const sx = J.x, sy = J.y;
      teleport(sx, sy); hold = { x: sx, y: sy }; await sleep(SETTLE);
      hold = null;
      putBoat(sx, sy, 0); await sleep(1500);
      RT.setUserWaypoint(J.gx, J.gy, 'Waddenzee');
      let route = null;
      for (let i = 0; i < 40 && !(route && route.pts && route.pts.length > 2); i++) { await sleep(500); route = RT.getActiveRoute(); }
      rec.route = route ? { punten: route.pts.length, lengteM: Math.round(route.length), modus: route.mode, net: route.net ?? null, etaS: Math.round(route.etaS || 0) } : null;
      await sleep(2500);
      await capture(J.name + '-hud', 300);
      PM.openPauseMenu('map'); await sleep(3000);
      await capture(J.name + '-kaart', 300);
      PM.closePauseMenu(); await sleep(500);
      rec.hudText = [...document.querySelectorAll('#hud *')].filter((e) => e.children.length === 0 && /km|m|Waddenzee/.test(e.textContent || '')).map((e) => e.textContent.trim()).slice(0, 6);
      if (theBoat) { p.exitVehicle(map, w); const i = w.vehicles.indexOf(theBoat); if (i >= 0) w.vehicles.splice(i, 1); }
    } else if (J.kind === 'boat') {
      // open zee: vaar een sloep recht vooruit over zeewater (seaAt) en kijk of hij ergens tegenaan stopt (#233)
      hold = null; env.fix = true; fixWorld();
      const starts = [];
      for (let y = J.y0; y <= J.y1 && starts.length < 60; y += J.step || 600) for (let x = J.x0; x <= J.x1; x += J.step || 600) {
        if (!RG.seaAt(x, y)) continue;
        let free = 0; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (RG.seaAt(x + Math.cos(a) * 900, y + Math.sin(a) * 900)) free++; }
        if (free >= 8) starts.push({ x, y });
      }
      rec.kandidaten = starts.length; rec.runs = [];
      const pick = []; const stride = Math.max(1, Math.floor(starts.length / (J.n || 4)));
      for (let i = 0; i < starts.length && pick.length < (J.n || 4); i += stride) pick.push(starts[i]);
      for (const st of pick) {
        // de koers met de langste doorgaande zee
        let best = { run: -1, a: 0 };
        for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; let run = 0; for (let d = 100; d <= 4000; d += 100) { if (!RG.seaAt(st.x + Math.cos(a) * d, st.y + Math.sin(a) * d)) break; run = d; } if (run > best.run) best = { run, a }; }
        teleport(st.x, st.y); hold = { x: st.x, y: st.y }; await sleep(3500); hold = null;
        putBoat(st.x, st.y, best.a); await sleep(800);
        kb('keydown', 'w', 'KeyW');
        let stuck = 0, lastX = theBoat.x, lastY = theBoat.y, maxStuck = 0; const x0 = theBoat.x, y0 = theBoat.y;
        for (let t = 0; t < (J.secs || 40); t += 0.5) {
          await sleep(500);
          if (Math.hypot(theBoat.x - lastX, theBoat.y - lastY) < 0.4) stuck += 0.5; else stuck = 0;
          maxStuck = Math.max(maxStuck, stuck);
          lastX = theBoat.x; lastY = theBoat.y;
          if (Math.hypot(theBoat.x - x0, theBoat.y - y0) > best.run - 120) break;
          if (t === 10) await capture(J.name + '-run' + pick.indexOf(st) + '-mid', 200);
        }
        kb('keyup', 'w', 'KeyW');
        const moved = Math.hypot(theBoat.x - x0, theBoat.y - y0);
        rec.runs.push({ van: [Math.round(st.x), Math.round(st.y)], koers: +best.a.toFixed(2), zeeRun: best.run, moved: Math.round(moved), speed: +(theBoat.speed || 0).toFixed(1), maxStuck, naarEnd: [Math.round(theBoat.x), Math.round(theBoat.y)], nogOpZee: !!RG.seaAt(theBoat.x, theBoat.y), vast: maxStuck >= 3 && moved < best.run - 200 });
        await capture(J.name + '-run' + pick.indexOf(st) + '-eind', 200);
      }
      if (theBoat) { p.exitVehicle(map, w); const i = w.vehicles.indexOf(theBoat); if (i >= 0) w.vehicles.splice(i, 1); }
    } else if (J.kind === 'jump') {
      hold = null; env.fix = false; setWeather();
      const S2 = window.__story;
      skipCine = false;
      rec.reps = [];
      for (let r = 0; r < (J.reps || 1); r++) {
        const rr = { r };
        const ok = S2.jump(J.step, J.start ? { start: true } : {});
        w.clock = env.clock; rr.ok = !!ok;
        rr.player = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
        rr.inBuilding = !!TP.buildingAt(map, p.x, p.y, 0.5);
        let t0 = 0;
        const frames = [];
        for (let k = 0; k < J.waits.length; k++) {
          await sleep(J.waits[k] - t0); t0 = J.waits[k];
          const c = sc.cam;
          const f = { t: J.waits[k], cine: cine.isCinematicActive(), cam: c ? [c.position.x, c.position.z, c.position.y].map((v) => Math.round(v * 10) / 10) : null };
          console.log('[capture] ' + J.name + '-r' + r + '-t' + k);
          await sleep(500); t0 += 500;
          frames.push(f);
        }
        rr.frames = frames;
        const pos = sc.cam && sc.cam.position;
        rr.pos = pos ? [pos.x, pos.z, pos.y].map((v) => Math.round(v * 10) / 10) : null;
        rr.step = (S2.current() || {}).id;
        rr.player2 = [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
        rr.inBuilding2 = !!TP.buildingAt(map, p.x, p.y, 0.5);
        rr.roof = CAM.roofAt ? CAM.roofAt(map, p.x, p.y) : null;
        if (cine.isCinematicActive()) cine.skipCinematic();
        rec.reps.push(rr);
      }
      skipCine = true;
    }
  } catch (err) {
    rec.fout = String(err && err.stack || err).slice(0, 400);
    skipCine = true; ownShot = false; hold = null;
    try { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e2) { /* verder */ }
  }
  rec.ss = ssInfo();
  const fresh = errors.splice(0);
  if (fresh.length) rec.errors = fresh.slice(0, 6);
  results.push(rec);
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr;
return JSON.stringify({ jobs: results });
