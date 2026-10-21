// Page half of scripts/qa/speeltest74.mjs (#74): wat Maus met de hand zou doen, scripted en gemeten.
//   achteruit  in een auto op een Ommeland-weg 'Q' ingedrukt houden: staat de camera dan echt achter de auto en kijkt hij terug?
//   gps        een doel in het Ommeland zetten: komt het doel aan, staat er een route in beeld?
//   heelver    met zichtafstand normaal/ver/heel ver 25 s met een auto over de Ommeland-weg: frametijd-pieken.
// window.__s74 = { settle, drive, only, spot, gps } staat ervoor. Uitvoer: [capture]-beelden en een JSON-samenvatting.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (f) => import('/js/' + f + '.js');
const PM = await imp('pausemenu'); const cine = await imp('cinematics'); const DN = await imp('daynight');
const ST = await imp('settings'); const VH = await imp('vehicle'); const GL = await imp('goal');
const S = window.__s74; const SETTLE = S.settle || 7000; const DRIVE = S.drive || 25000;
const ONLY = (S.only || '').split(',').filter(Boolean); const want = (n) => !ONLY.length || ONLY.includes(n);
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true })); };
w.devInvuln = true; D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
const errors = [];
const origErr = console.error; console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 160)); origErr.apply(console, a); };
window.addEventListener('error', (e) => errors.push(String(e.message)));
const fix = () => { w.clock = 14; w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity }; if (DN.refreshDayNight) DN.refreshDayNight(w); };
const teleport = (x, y) => { if (p.inVehicle) p.exitVehicle(map, w); p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0; };
setInterval(() => { if (PM.isPauseMenuOpen() && !window.__s74keepMenu) PM.closePauseMenu(); }, 200);
function snapRoad(x, y, R) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : []) || []) for (let i = 0; i < rd.pts.length - 1; i++) {
    const a = rd.pts[i], b = rd.pts[i + 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 25) continue; // a long straight piece
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
    if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), name: rd.name || rd.ref || '' };
  }
  return best;
}
// the longest road within 3 km: a point list and its cumulative length
function longRoad(x, y) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, 3000) : []) || []) {
    let len = 0; const cum = [0];
    for (let i = 1; i < rd.pts.length; i++) { len += Math.hypot(rd.pts[i][0] - rd.pts[i - 1][0], rd.pts[i][1] - rd.pts[i - 1][1]); cum.push(len); }
    if (!best || len > best.len) best = { pts: rd.pts, cum, len, name: rd.name || rd.ref || '' };
  }
  return best;
}
const at = (R, d) => {
  d = Math.max(0, Math.min(R.len - 0.01, d));
  let i = 1; while (i < R.cum.length - 1 && R.cum[i] < d) i++;
  const a = R.pts[i - 1], b = R.pts[i], t = (d - R.cum[i - 1]) / Math.max(1e-6, R.cum[i] - R.cum[i - 1]);
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};
// drives the car along the road at a fixed speed (kinematic: the car stays on the road, the world streams in as in a real drive)
async function driveAlong(car, R, speed, ms, tick) {
  let d = 0; let last = performance.now(); const t0 = last;
  while (performance.now() - t0 < ms && d < R.len - 5) {
    await new Promise((res) => requestAnimationFrame(res));
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    d += speed * dt;
    const q = at(R, d); car.x = q.x; car.y = q.y; car.angle = q.a; car.speed = speed; car.vx = Math.cos(q.a) * speed; car.vy = Math.sin(q.a) * speed;
    if (tick) tick(now - t0, d);
  }
  return d;
}
async function carOnRoad(x, y) {
  teleport(x, y); fix(); await sleep(SETTLE * 0.7);
  const R = longRoad(x, y);
  if (!R) throw new Error('geen weg binnen 3 km');
  const q = at(R, 0);
  teleport(q.x, q.y); fix(); await sleep(SETTLE * 0.5);
  const proto = w.vehicles.find((v) => v.model && !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.isPolice && !/ambul|polit|brand|bus|truck|tank/i.test(String(v.model.name || v.model.kind || '')));
  const car = new VH.Vehicle(q.x, q.y, q.a, proto ? proto.model : undefined);
  w.vehicles.push(car);
  p.enterVehicle(car, w);
  await sleep(1200);
  return { car, R };
}
// a car on a long Ommeland road, pointing along it
async function carAt(x, y) {
  teleport(x, y); fix(); await sleep(SETTLE * 0.6);
  const sn = snapRoad(x, y, 1500) || { x, y, a: 0, name: '' };
  teleport(sn.x, sn.y); fix(); await sleep(SETTLE * 0.5);
  let car = w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.dead && !v.isPolice && Math.hypot(v.x - p.x, v.y - p.y) < 200)[0];
  if (!car) { const proto = w.vehicles.find((v) => v.model && !v.isBoat && !v.isBike); car = new VH.Vehicle(sn.x, sn.y, sn.a, proto ? proto.model : undefined); w.vehicles.push(car); }
  car.x = sn.x; car.y = sn.y; car.angle = sn.a; car.speed = 0; car.vx = car.vy = 0;
  p.enterVehicle(car, w);
  await sleep(1200);
  return { car, sn };
}
const camDir = () => { const c = sc.cam, d = new c.position.constructor(); c.getWorldDirection(d); return d; };
const out = { errors: 0 };
const ommeland = S.spot; // { x, y } an Ommeland village
const e0 = () => errors.length;
if (want('achteruit')) {
  const r = {};
  try {
    const { car, R } = await carOnRoad(ommeland.x, ommeland.y);
    r.road = R.name; r.wegLengte = Math.round(R.len); r.at = [Math.round(car.x), Math.round(car.y)];
    const view = () => { const d = camDir(); const f = [Math.cos(car.angle), Math.sin(car.angle)]; return +(d.x * f[0] + d.z * f[1]).toFixed(2); };
    const shots = [];
    const run = driveAlong(car, R, 25, 16000, (t) => {
      if (t > 3000 && !shots[0]) { shots[0] = 1; r.dotVooruit = view(); console.log('[capture] achteruit-0-vooruit'); }
      if (t > 5000 && !shots[1]) { shots[1] = 1; key('keydown', 'q', 'KeyQ'); }
      if (t > 7500 && !shots[2]) { shots[2] = 1; r.dotAchterom = view(); r.camAfstand = +Math.hypot(sc.cam.position.x - car.x, sc.cam.position.z - car.y).toFixed(1); console.log('[capture] achteruit-1-achterom'); }
      if (t > 10000 && !shots[3]) { shots[3] = 1; r.dotAchterom2 = view(); console.log('[capture] achteruit-2-achterom-later'); }
      if (t > 12000 && !shots[4]) { shots[4] = 1; key('keyup', 'q', 'KeyQ'); }
      if (t > 14500 && !shots[5]) { shots[5] = 1; r.dotTerug = view(); console.log('[capture] achteruit-3-terug'); }
    });
    r.afgelegd = Math.round(await run);
    key('keyup', 'q', 'KeyQ');
    r.fouten = errors.length - e0();
    if (p.inVehicle) p.exitVehicle(map, w);
  } catch (e) { r.fout = String(e && e.stack || e).slice(0, 300); key('keyup', 'q', 'KeyQ'); }
  out.achteruit = r;
}
if (want('gps')) {
  const r = {};
  try {
    teleport(ommeland.x, ommeland.y); fix(); await sleep(SETTLE);
    const tx = ommeland.x + S.gps.dx, ty = ommeland.y + S.gps.dy;
    r.gezet = GL.setGoal({ kind: 'place', id: 'gps-test', name: 'GPS-test', x: tx, y: ty }, { quiet: true });
    await sleep(6000);
    const tg = window.__goal && window.__goal.target && window.__goal.target();
    r.doel = tg ? [Math.round(tg.x), Math.round(tg.y)] : null;
    r.afstand = Math.round(Math.hypot(tx - p.x, ty - p.y));
    console.log('[capture] gps-0-voet'); await sleep(900);
    const { car, R } = await carOnRoad(ommeland.x, ommeland.y);
    await driveAlong(car, R, 20, 9000, (t) => { if (t > 7000 && !r.s1) { r.s1 = 1; console.log('[capture] gps-1-auto'); } });
    r.afstandNa = Math.round(Math.hypot(tx - car.x, ty - car.y));
    r.bannerTekst = (document.querySelector('.hud-nav, .nav-banner, [class*=turn], [class*=gps]') || {}).textContent || null;
    window.__s74keepMenu = true;
    PM.openPauseMenu('map'); await sleep(3000);
    console.log('[capture] gps-2-kaart'); await sleep(900);
    window.__s74keepMenu = false; PM.closePauseMenu();
    GL.clearGoal({ quiet: true });
    if (p.inVehicle) p.exitVehicle(map, w);
    r.fouten = errors.length - e0();
  } catch (e) { r.fout = String(e && e.stack || e).slice(0, 300); key('keyup', 'w', 'KeyW'); }
  out.gps = r;
}
if (want('heelver')) {
  out.heelver = {};
  for (const dd of ['normaal', 'ver', 'heelver', 'heelver']) {
    const r = {};
    try {
      ST.setSetting('drawDistance', dd);
      const { car, R } = await carOnRoad(ommeland.x, ommeland.y);
      await sleep(3000);
      const dts = []; let last = performance.now(), run = true;
      const loop = (t) => { dts.push(t - last); last = t; if (run) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const tr = [];
      const km = await driveAlong(car, R, S.speed || 30, DRIVE, (t) => { if (Math.floor(t / 4000) > tr.length) tr.push(Math.round(Math.hypot(car.x - R.pts[0][0], car.y - R.pts[0][1])) + 'm'); });
      r.afgelegd = Math.round(km); r.wegLengte = Math.round(R.len);
      run = false; await sleep(200);
      console.log('[capture] heelver-' + dd); await sleep(900);
      const s = dts.slice(3).sort((a, b) => a - b); const q = (f) => +(s[Math.min(s.length - 1, Math.floor(s.length * f))] || 0).toFixed(1);
      r.frames = s.length; r.p50 = q(0.5); r.p95 = q(0.95); r.p99 = q(0.99); r.max = +(s[s.length - 1] || 0).toFixed(1);
      r.boven50 = s.filter((x) => x > 50).length; r.boven100 = s.filter((x) => x > 100).length; r.boven250 = s.filter((x) => x > 250).length;
      r.ritten = tr.join(' '); r.fouten = errors.length - e0();
      if (p.inVehicle) p.exitVehicle(map, w);
    } catch (e) { r.fout = String(e && e.stack || e).slice(0, 300); key('keyup', 'w', 'KeyW'); }
    out.heelver[out.heelver[dd] ? dd + '2' : dd] = r;
  }
}
if (want('padel')) {
  // de padelmissie van het verhaal (stap s-padel, Durk en Douwe): springen, naar de baan, spelen, en komt het verhaal verder?
  const r = {};
  try {
    const ST2 = window.__story;
    r.sprong = !!ST2.jump('s-padel');
    await sleep(4000);
    r.stapNaSprong = (ST2.current() || {}).id;
    const spots = window.__padel.spots();
    r.banen = spots.length;
    let best = null; for (const q of spots) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (!best || d < best.d) best = { ...q, d }; }
    r.baan = best ? { naam: best.name, afstand: Math.round(best.d), courts: best.courts } : null;
    if (best) {
      teleport(best.x + 6, best.y + 6); fix(); await sleep(SETTLE);
      r.gestart = !!window.__padel.start(best.id);
      await sleep(3000);
      console.log('[capture] padel-0-start'); await sleep(900);
      window.__padel.auto(true);
      const t0 = performance.now(); const phases = new Set(); let shot = 0;
      while (performance.now() - t0 < 120000) {
        await sleep(2000);
        const st = window.__padel.state();
        if (!st) break;
        phases.add(st.phase);
        if (!shot && performance.now() - t0 > 10000) { shot = 1; console.log('[capture] padel-1-rally'); r.rally = st; await sleep(900); }
      }
      r.fasen = [...phases];
      const na = window.__padel.state();
      r.nogBezig = !!na;
      if (na) { window.__padel.finish(true); await sleep(3000); }
      console.log('[capture] padel-2-einde'); await sleep(900);
      await sleep(4000);
      r.stapNaPadel = (ST2.current() || {}).id;
      console.log('[capture] padel-3-daarna'); await sleep(900);
    }
    r.fouten = errors.length - e0();
  } catch (e) { r.fout = String(e && e.stack || e).slice(0, 300); }
  out.padel = r;
}
clearInterval(skipper); console.error = origErr;
out.errors = errors.length; out.errorSample = errors.slice(0, 5);
return JSON.stringify(out);
