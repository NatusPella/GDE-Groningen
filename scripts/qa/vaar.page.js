// Page half of scripts/qa/vaar_run.mjs (desktop --perf-script body; #232 #233 #184): een waypoint op water geeft een
// vaarroute, de sloep vaart die route in stukken van de stad naar Lauwersoog (checkpoints met voortgangscheck en
// screenshots) en vaart daarna de Waddenzee op (geen onzichtbare wal). window.__va = { settle, leg, sea, wait } staat ervoor.
// De sloep volgt per stuk de route zelf, zoals een speler: het verste punt tot 45 m vooruit langs de lijn waar de koers erheen vrij
// water houdt (WL.waterAt / waterClearance), gestuurd met de stuurinvoer (input.padAxis) en achteruit als de romp blijft hangen.
// In een rechte lijn naar het punt 8 routepunten verder sneed de koers over de wal en stond de sloep stil (#343).
// Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = (window.__menuStart ? { click: () => window.__menuStart('nieuw') } : null);
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
{ const ss = document.querySelector('#start-screen'); if (ss) ss.style.display = 'none'; } // het titelscherm blijft soms over het spel hangen in de beelden
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__va || {};
const SETTLE = CFG.settle || 6000, LEG = CFG.leg || 14, SEA = CFG.sea || 30, WAIT = (CFG.wait || 8) * 1000;
const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));

const cine = await imp('cinematics');
const DN = await imp('daynight');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const WI = await imp('waterindex');
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
// het punt `ahead` m verder langs de lijn, gerekend vanaf het dichtstbijzijnde punt erop (vanaf `from`, zodat de boot niet terugspringt)
const along = (poly, from, ahead) => {
  let best = Infinity, bi = from, bt = 0;
  for (let i = from; i + 1 < poly.length && i < from + 12; i++) {
    const dx = poly[i + 1][0] - poly[i][0], dy = poly[i + 1][1] - poly[i][1], l2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((boat.x - poly[i][0]) * dx + (boat.y - poly[i][1]) * dy) / l2));
    const d = Math.hypot(poly[i][0] + dx * t - boat.x, poly[i][1] + dy * t - boat.y);
    if (d < best) { best = d; bi = i; bt = t; }
  }
  let i = bi, left = ahead, px = poly[bi][0] + (poly[bi + 1][0] - poly[bi][0]) * bt, py = poly[bi][1] + (poly[bi + 1][1] - poly[bi][1]) * bt;
  while (i + 1 < poly.length) {
    const L = Math.hypot(poly[i + 1][0] - px, poly[i + 1][1] - py);
    if (L >= left) { const f = left / (L || 1); return { i: bi, x: px + (poly[i + 1][0] - px) * f, y: py + (poly[i + 1][1] - py) * f }; }
    left -= L; i++; px = poly[i][0]; py = poly[i][1];
  }
  return { i: bi, x: px, y: py };
};
// stuur de boot naar (tx, ty) voor `secs` seconden (met `poly`: langs die lijn, de speler stuurt met de stuurinvoer en zet achteruit als
// hij vastzit); geeft de afgelegde afstand, de eindsnelheid en hoe vaak hij achteruit moest terug
const sail = async (tx, ty, secs, poly = null) => {
  const x0 = boat.x, y0 = boat.y;
  key('keydown', 'w', 'KeyW');
  let seg = 0, back = 0, backs = 0, still = 0, sx = boat.x, sy = boat.y;
  const clearOn = (px, py, qx, qy) => {
    const L = Math.hypot(qx - px, qy - py);
    for (let k = 2; k < L; k += 2) if (WI.waterClearance(map, px + (qx - px) * k / L, py + (qy - py) * k / L, 6) < 2.0) return false;
    return true;
  };
  const assist = setInterval(() => {
    if (!poly || poly.length < 2) {
      const want = Math.atan2(ty - boat.y, tx - boat.x);
      boat.angle += Math.atan2(Math.sin(want - boat.angle), Math.cos(want - boat.angle)) * 0.25;
      return;
    }
    let tg = along(poly, seg, 4);
    seg = tg.i;
    for (let ah = 45; ah >= 8; ah -= 6) { const c = along(poly, seg, ah); if (clearOn(boat.x, boat.y, c.x, c.y)) { tg = c; break; } }
    const err = Math.atan2(Math.sin(Math.atan2(tg.y - boat.y, tg.x - boat.x) - boat.angle), Math.cos(Math.atan2(tg.y - boat.y, tg.x - boat.x) - boat.angle));
    let steer = Math.max(-1, Math.min(1, err * 1.5));
    if (back > 0) { back -= 0.05; steer = -steer; }
    D.input.padAxis = [steer, 0];
    if (back > 0 !== !!boat._vaBack) { boat._vaBack = back > 0; key(back > 0 ? 'keyup' : 'keydown', 'w', 'KeyW'); key(back > 0 ? 'keydown' : 'keyup', 's', 'KeyS'); }
  }, 50);
  let stuck = 0, lastX = boat.x, lastY = boat.y;
  for (let t = 0; t < secs; t += 0.5) {
    await sleep(500);
    if (Math.hypot(boat.x - lastX, boat.y - lastY) < 0.4) stuck += 0.5; else stuck = 0;
    // twee seconden zonder voortgang: anderhalve seconde achteruit met omgekeerd roer en dan weer door
    if (Math.hypot(boat.x - sx, boat.y - sy) < 1.5) still += 0.5; else { still = 0; sx = boat.x; sy = boat.y; }
    if (poly && still >= 2 && back <= 0) { back = 1.5; backs++; still = 0; sx = boat.x; sy = boat.y; }
    lastX = boat.x; lastY = boat.y;
    if (Math.hypot(tx - boat.x, ty - boat.y) < 30) break;
  }
  clearInterval(assist);
  D.input.padAxis = [0, 0];
  if (boat._vaBack) { key('keyup', 's', 'KeyS'); boat._vaBack = false; }
  key('keyup', 'w', 'KeyW');
  return { moved: Math.round(Math.hypot(boat.x - x0, boat.y - y0)), speed: +(boat.speed || 0).toFixed(1), stuck, terug: backs, end: [Math.round(boat.x), Math.round(boat.y)] };
};

try {
  await sleep(4000);
  fixWorld();
  const lau = WP.worldPlaceNamed('Lauwersoog') || WP.worldPlaceNamed('Lauwersoog haven');
  results.lauwersoog = lau ? [Math.round(lau.x), Math.round(lau.y)] : null;
  if (!lau) throw new Error('Lauwersoog niet gevonden');
  // het doel: open water voor de haven (zeewater binnen 2,5 km van Lauwersoog); eerst wachten tot de tegels en de zeerijen daar zijn
  let gx = null, gy = null;
  holdPos = { x: lau.x, y: lau.y };
  for (let t = 0; t < SETTLE + WAIT && gx === null; t += 500) {
    await sleep(500);
    for (let r = 150; r < 2500 && gx === null; r += 50) for (let a = 0; a < 6.28 && gx === null; a += 0.3) { const x = lau.x + Math.cos(a) * r, y = lau.y + Math.sin(a) * r; const q = WL.waterAt(map, x, y); if (q && q.kind === 'zee') { gx = x; gy = y; } }
  }
  holdPos = null;
  results.doel = gx === null ? null : [Math.round(gx), Math.round(gy)];
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
    const i0 = marks[m], i1 = Math.min(pts.length - 1, i0 + 8), a = pts[i0], b = pts[i1], poly = pts.slice(i0, i1 + 1);
    // eerst naar het punt (de tegels stromen binnen), dan pas kijken of het nat is: de speler stapt uit de boot (die houdt de tegels
    // bij het vorige punt vast) en de tegels rond het punt en het stuk erna worden vastgezet (registerShots)
    if (p.inVehicle) p.exitVehicle(map, w);
    holdPos = { x: a[0], y: a[1] };
    if (map.registerShots) await Promise.race([map.registerShots([{ at: [a[0], a[1]], look: [b[0], b[1]] }], { radius: 400, token: 'vaar' }), sleep(WAIT)]);
    await sleep(1500);
    for (let t = 0; t < WAIT && !wetAt(a[0], a[1]); t += 500) await sleep(500);
    holdPos = null;
    if (!wetAt(a[0], a[1])) { results.checkpoints.push({ n: m, op: [Math.round(a[0]), Math.round(a[1])], fout: 'punt op de route is niet nat' }); if (map.releaseShots) map.releaseShots(); continue; }
    placeBoat(a[0], a[1], Math.atan2(b[1] - a[1], b[0] - a[0]));
    await sleep(600);
    const r = await sail(b[0], b[1], LEG, poly);
    if (map.releaseShots) map.releaseShots();
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
        if (p.inVehicle) p.exitVehicle(map, w);
        holdPos = { x, y };
        if (map.registerShots) await Promise.race([map.registerShots([{ at: [x, y], look: [x + dx * 600, y + dy * 600] }], { radius: 700, token: 'vaar' }), sleep(WAIT)]);
        await sleep(2500); holdPos = null;
        // land binnen 600 m op die koers (een dijk, de kust): dan is de koers geen open zee en telt een stilstand niet
        let land = null;
        for (let d = 20; d <= 600 && !land; d += 10) if (WI.waterClearance(map, x + dx * d, y + dy * d, 4) < 0) land = [Math.round(x + dx * d), Math.round(y + dy * d)];
        if (land) { results.zee.push({ koers: naam, start: [Math.round(x), Math.round(y)], fout: 'land binnen 600 m op die koers (kust of dijk)', land }); if (map.releaseShots) map.releaseShots(); ok = true; break; }
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
