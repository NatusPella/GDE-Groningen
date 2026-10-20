// Page half of scripts/qa/vaar_run.mjs (desktop --perf-script body; #232 #233 #184): een waypoint op water geeft een
// vaarroute, de sloep vaart die route in stukken van de stad naar Lauwersoog (checkpoints met voortgangscheck en
// screenshots) en vaart daarna de Waddenzee op (geen onzichtbare wal). window.__va = { settle, leg, sea } staat ervoor.
// Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = [...ss.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent));
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
{ const ss = document.querySelector('#start-screen'); if (ss) ss.style.display = 'none'; } // het titelscherm blijft soms over het spel hangen in de beelden
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__va || {};
const SETTLE = CFG.settle || 6000, LEG = CFG.leg || 14, SEA = CFG.sea || 30;
const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));

const cine = await imp('cinematics');
const DN = await imp('daynight');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const WL = await imp('waterlevels');
const RT = await imp('routing');
const WP = await imp('worldplaces');
const skipper = setInterval(() => { if (!window.__vaShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
let holdPos = null, done = false;
const tick = () => { if (holdPos) { p.x = holdPos.x; p.y = holdPos.y; p.vx = p.vy = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const shot = async (name, pose) => {
  window.__vaShot = true;
  cine.playCinematic({ id: 'va-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(1800);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  window.__vaShot = false;
  await sleep(300);
};
const results = { checkpoints: [], zee: [] };
let boat = null;
const wetAt = (x, y) => !!WL.waterAt(map, x, y);
const placeBoat = (x, y, angle) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  if (boat) { const i = w.vehicles.indexOf(boat); if (i >= 0) w.vehicles.splice(i, 1); }
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  boat = new VH.Vehicle(x, y, angle, { ...BT.BOAT_KINDS.sloep });
  boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
  p.enterVehicle(boat, w);
};
// stuur de boot naar (tx, ty) voor `secs` seconden; geeft de afgelegde afstand en de eindsnelheid terug
const sail = async (tx, ty, secs) => {
  const x0 = boat.x, y0 = boat.y;
  key('keydown', 'w', 'KeyW');
  const assist = setInterval(() => {
    const want = Math.atan2(ty - boat.y, tx - boat.x);
    const d = Math.atan2(Math.sin(want - boat.angle), Math.cos(want - boat.angle));
    boat.angle += d * 0.25;
  }, 50);
  let stuck = 0, lastX = boat.x, lastY = boat.y;
  for (let t = 0; t < secs; t += 0.5) {
    await sleep(500);
    if (Math.hypot(boat.x - lastX, boat.y - lastY) < 0.4) stuck += 0.5; else stuck = 0;
    lastX = boat.x; lastY = boat.y;
    if (Math.hypot(tx - boat.x, ty - boat.y) < 30) break;
  }
  clearInterval(assist);
  key('keyup', 'w', 'KeyW');
  return { moved: Math.round(Math.hypot(boat.x - x0, boat.y - y0)), speed: +(boat.speed || 0).toFixed(1), stuck, end: [Math.round(boat.x), Math.round(boat.y)] };
};

try {
  await sleep(4000);
  fixWorld();
  const lau = WP.worldPlaceNamed('Lauwersoog') || WP.worldPlaceNamed('Lauwersoog haven');
  results.lauwersoog = lau ? [Math.round(lau.x), Math.round(lau.y)] : null;
  if (!lau) throw new Error('Lauwersoog niet gevonden');
  // 1. een waypoint op water: begin op het water bij de Gerrit Krolbrug, doel in de zee voor Lauwersoog
  let sx = 0, sy = 0, found = false;
  // het dichtstbijzijnde bevaarbare kanaal of diep bij het centrum van de stad: een nat punt in zijn omlijnde rechthoek
  for (let r = 100; r <= 1200 && !found; r += 100) {
    for (const q of map.waterNear(0, 0, r)) {
      if (!(q.nav >= 3) || !q.pts) continue;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const v of q.pts) { x0 = Math.min(x0, v[0]); y0 = Math.min(y0, v[1]); x1 = Math.max(x1, v[0]); y1 = Math.max(y1, v[1]); }
      for (let i = 0; i < 40 && !found; i++) { const x = x0 + (x1 - x0) * (i + 0.5) / 40; for (let j = 0; j < 40 && !found; j++) { const y = y0 + (y1 - y0) * (j + 0.5) / 40; const wq = WL.waterAt(map, x, y); if (wq && wq.navigable >= 3 && Math.hypot(x, y) < 1500) { sx = x; sy = y; found = true; } } }
      if (found) break;
    }
  }
  results.start = [Math.round(sx), Math.round(sy), found];
  holdPos = { x: sx, y: sy };
  await sleep(SETTLE);
  holdPos = null;
  placeBoat(sx, sy, 0);
  await sleep(800);
  // het doel: open water voor de haven (zeewater binnen 2 km van Lauwersoog)
  let gx = null, gy = null;
  for (let r = 150; r < 2500 && gx === null; r += 50) for (let a = 0; a < 6.28 && gx === null; a += 0.3) { const x = lau.x + Math.cos(a) * r, y = lau.y + Math.sin(a) * r; const q = WL.waterAt(map, x, y); if (q && q.kind === 'zee') { gx = x; gy = y; } }
  results.doel = gx === null ? null : [Math.round(gx), Math.round(gy)];
  if (gx === null) throw new Error('geen zee bij Lauwersoog');
  RT.setUserWaypoint(gx, gy, 'Waddenzee');
  let route = null;
  for (let i = 0; i < 40 && !(route && route.pts && route.pts.length > 2); i++) { await sleep(500); route = RT.getActiveRoute(); }
  results.route = route ? { punten: route.pts.length, lengteM: Math.round(route.length), modus: route.mode, net: route.net ?? null, etaS: Math.round(route.etaS || 0) } : null;
  if (!route || route.pts.length < 3) throw new Error('geen vaarroute voor een waypoint op water');
  await shot('va-0-start-stad', { position: { x: sx + 20, y: sy + 20, z: 40 }, lookAt: { x: sx, y: sy, z: 0 }, cut: true });
  // 2. de route in stukken: teleport naar het punt op de route, vaar naar het volgende
  const pts = route.pts, step = 2500;
  const marks = [0];
  for (let i = 1, acc = 0; i < pts.length; i++) { acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc >= step) { marks.push(i); acc = 0; } }
  if (marks[marks.length - 1] !== pts.length - 1) marks.push(pts.length - 1);
  for (let m = 0; m < marks.length - 1; m++) {
    const a = pts[marks[m]], b = pts[Math.min(pts.length - 1, marks[m] + 8)];
    // eerst naar het punt (de tegels stromen binnen), dan pas kijken of het nat is
    holdPos = { x: a[0], y: a[1] }; await sleep(3500);
    // tiles stream in slowly on a busy machine: wait until the point is wet, at most 60 s, before calling it dry
    for (let t = 0; t < (window.__va.wait || 30) && !wetAt(a[0], a[1]); t++) await sleep(2000);
    holdPos = null;
    if (!wetAt(a[0], a[1])) {
      // how far is the nearest water? a few metres: the route node sits just beside the polygon; far: the route runs over land
      let near = null;
      for (let r = 4; r <= 120 && near === null; r += 4) for (let k = 0; k < 12 && near === null; k++) { const t = k * Math.PI / 6; if (wetAt(a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r)) near = r; }
      results.checkpoints.push({ n: m, op: [Math.round(a[0]), Math.round(a[1])], fout: 'punt op de route is niet nat', dichtstbijzijndWater: near, opGrond: map.groundHeightAt ? Math.round(map.groundHeightAt(a[0], a[1], 0) * 10) / 10 : null, wegenBij: map.roadsNear ? map.roadsNear(a[0], a[1], 40).length : null });
      continue;
    }
    placeBoat(a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]));
    await sleep(600);
    const r = await sail(b[0], b[1], LEG);
    const leg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    results.checkpoints.push({ n: m, van: [Math.round(a[0]), Math.round(a[1])], naar: [Math.round(b[0]), Math.round(b[1])], afstand: Math.round(leg), ...r, vast: r.stuck >= 4 && r.moved < Math.min(leg, 30) });
    if (m % 2 === 0) await shot(`va-1-route-${m}`, { position: { x: boat.x - Math.cos(boat.angle) * 18, y: boat.y - Math.sin(boat.angle) * 18, z: 7 }, lookAt: { x: boat.x + Math.cos(boat.angle) * 20, y: boat.y + Math.sin(boat.angle) * 20, z: 0 }, cut: true });
  }
  // 3. de Waddenzee op: drie koersen vanaf zeewater bij Lauwersoog, geen onzichtbare wal
  for (const [naam, dx, dy] of [['noord', 0, -1], ['oost', 1, 0], ['noordwest', -0.7, -0.7], ['zuid', 0, 1], ['west', -1, 0]]) {
    let ok = false;
    for (let r = 150; r < 2500 && !ok; r += 100) {
      const x = lau.x + dx * r, y = lau.y + dy * r;
      const q = WL.waterAt(map, x, y);
      if (q && q.kind === 'zee') {
        holdPos = { x, y }; await sleep(2500); holdPos = null;
        placeBoat(x, y, Math.atan2(dy, dx)); await sleep(600);
        const t = await sail(x + dx * 2000, y + dy * 2000, SEA);
        results.zee.push({ koers: naam, start: [Math.round(x), Math.round(y)], ...t, vast: t.stuck >= 4 && t.moved < 200 });
        await shot(`va-2-zee-${naam}`, { position: { x: boat.x - Math.cos(boat.angle) * 25, y: boat.y - Math.sin(boat.angle) * 25, z: 9 }, lookAt: { x: boat.x + Math.cos(boat.angle) * 40, y: boat.y + Math.sin(boat.angle) * 40, z: 0 }, cut: true });
        ok = true;
      }
    }
    if (!ok) results.zee.push({ koers: naam, fout: 'geen zeewater op die koers binnen 2,5 km' });
  }
} catch (e) { results.fout = String(e && e.stack || e).slice(0, 500); key('keyup', 'w', 'KeyW'); }
results.fouten = issues.slice(0, 30);
done = true;
clearInterval(skipper);
return JSON.stringify(results);
