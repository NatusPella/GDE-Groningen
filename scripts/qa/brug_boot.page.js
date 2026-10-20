// Page half of scripts/qa/brug_boot.mjs (desktop --perf-script body; #9 #154 #235): boten bij bruggen, beeld voor beeld
// vanaf één vaste camera. Twee proeven:
//  - "open": een binnenvaartschip vaart op een beweegbare brug aan; de brug opent op tijd (#154), seinen en melding volgen,
//    het schip vaart onder de open brug door en de brug sluit weer. Elke 2 s een beeld en een regel in het logboek.
//  - "bots": het schip (280 t, 4,2 m hoog; de ?brugbotsing-demo) vaart tegen een vaste brug (#9): terugduwen, schade aan het
//    dek, slagbomen, melding; elke halve seconde een beeld.
// window.__bt = { open: [{ naam, x, y }], bots: [{ naam, x, y }], settle } staat ervoor. Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = [...ss.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent));
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__bt || {};
const SETTLE = CFG.settle || 4500;
const issues = [];
const origErr = console.error.bind(console);
console.error = (...a) => { issues.push('console.error: ' + a.map(String).join(' ').slice(0, 200)); origErr(...a); };
const cine = await imp('cinematics');
const DN = await imp('daynight');
const MB = await imp('movablebridges');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const WL = await imp('waterlevels');
const BH = await imp('bridgehitworld');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
if (DN.refreshDayNight) DN.refreshDayNight(w);
let hold = null, done = false;
const tick = () => { if (hold) { if (p.inVehicle) p.exitVehicle(map, w); p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.z = 0; p.vz = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
// vaste camera (zie brug_beeld.page.js): renderer.render zet hem op `cur`
const S3 = window.__scene3d;
let cur = null;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => {
  if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); }
  origRender(sc, c);
};
for (const el of document.querySelectorAll('body > *')) if (!el.contains(S3.renderer.domElement) && !(el.tagName === 'SCRIPT')) el.style.display = 'none';
w.cinematicHidePlayers = false;
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const grab = async (name) => { console.log('[capture] ' + name); await sleep(350); };
let boat = null;
const putBoat = (x, y, angle, model, extra = {}) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  if (boat) { const i = w.vehicles.indexOf(boat); if (i >= 0) w.vehicles.splice(i, 1); }
  boat = new VH.Vehicle(x, y, angle, { ...model });
  boat.isBoat = true; boat.speed = 0; Object.assign(boat, extra);
  w.vehicles.push(boat);
  return boat;
};
const lenOf = (r) => r.pts.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - r.pts[i][0], q[1] - r.pts[i][1]), 0);
const frame = (b) => { const P = b.pts, a = P[0], e = P[P.length - 1], m = P[Math.floor(P.length / 2)], L = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1; const dx = (e[0] - a[0]) / L, dy = (e[1] - a[1]) / L; return { a, e, m, dx, dy, nx: -dy, ny: dx, L }; };
const results = { open: [], bots: [] };

for (const b of CFG.open || []) {
  const rep = { naam: b.naam, log: [] };
  results.open.push(rep);
  try {
    hold = { x: b.x, y: b.y };
    await sleep(SETTLE);
    const road = (map.roadsNear(b.x, b.y, 8) || []).find((q) => q.bridge && q.movable);
    if (!road) { rep.fout = 'geen beweegbare brug'; continue; }
    const mb = MB.getMovableBridges().find((q) => q.r === road);
    const F = frame(road), tag = `bt-open-${(b.naam || 'brug').replace(/[^\w]+/g, '_')}`;
    // het schip komt langs het water aan (loodrecht op de brug), 120 m voor het dek, en vaart 120 m erachter
    const model = BT.BOAT_KINDS[b.boot || 'rondvaart']; // (passt in een gracht; needsOpening dwingt het openen af, het is niet te hoog voor de brug)
    const S = 120;
    const sx = F.m[0] - F.nx * S, sy = F.m[1] - F.ny * S, tx = F.m[0] + F.nx * S, ty = F.m[1] + F.ny * S;
    hold = { x: sx, y: sy };
    await sleep(3500);
    hold = null;
    putBoat(sx, sy, Math.atan2(F.ny, F.nx), model);
    boat.needsOpening = () => true;
    p.enterVehicle(boat, w);
    cur = { position: { x: F.m[0] + F.dx * 30 - F.nx * 45, y: F.m[1] + F.dy * 30 - F.ny * 45, z: 13 }, lookAt: { x: F.m[0] - F.nx * 12, y: F.m[1] - F.ny * 12, z: 1 } };
    key('keydown', 'w', 'KeyW');
    const assist = setInterval(() => {
      const want = Math.atan2(ty - boat.y, tx - boat.x);
      const d = Math.atan2(Math.sin(want - boat.angle), Math.cos(want - boat.angle));
      boat.angle += d * 0.25;
    }, 50);
    const t0 = performance.now();
    let n = 0, passed = false, lastShot = -9, minD = 1e9;
    while (performance.now() - t0 < (b.maxS || 150) * 1000) {
      await sleep(250);
      const t = (performance.now() - t0) / 1000;
      const along = (boat.x - F.m[0]) * F.nx + (boat.y - F.m[1]) * F.ny;
      minD = Math.min(minD, Math.abs(along));
      if (rep.log.length < 400 && Math.floor(t * 2) > rep.log.length / 1) rep.log.push(`${t.toFixed(1)}s w=${along.toFixed(0)} v=${(boat.speed || 0).toFixed(1)} brug=${mb.state} open=${mb.open.toFixed(2)} sein=${MB.boatSignal(mb)} boten=${mb.boats.size}`);
      if (t - lastShot >= 2.5) { lastShot = t; n++; await grab(`${tag}-${String(n).padStart(2, '0')}-t${Math.round(t)}`); }
      if (along > 25 && !passed) { passed = true; rep.doorgekomen = +t.toFixed(1); }
      if (passed && mb.state === 'closed' && along > 40) break;
      if (!passed && t > 20 && (boat.speed || 0) < 0.2 && Math.abs(along) > 15) { rep.vast = `snelheid ${(boat.speed || 0).toFixed(2)} op w=${along.toFixed(0)}`; }
    }
    clearInterval(assist);
    key('keyup', 'w', 'KeyW');
    rep.passed = passed; rep.minAfstand = Math.round(minD); rep.eindState = mb.state;
    if (p.inVehicle) p.exitVehicle(map, w);
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}

for (const b of CFG.bots || []) {
  const rep = { naam: b.naam, log: [] };
  results.bots.push(rep);
  try {
    hold = { x: b.x, y: b.y };
    await sleep(SETTLE);
    const road = (map.roadsNear(b.x, b.y, 8) || []).find((q) => q.bridge && !q.movable && q.pts.length >= 2);
    if (!road) { rep.fout = 'geen vaste brug'; continue; }
    const F = frame(road), tag = `bt-bots-${(b.naam || 'brug').replace(/[^\w]+/g, '_')}`;
    putBoat(F.m[0] - F.nx * 45, F.m[1] - F.ny * 45, Math.atan2(F.ny, F.nx), BT.BOAT_KINDS[b.boot || 'sloep']); // de aanvaringsdemo maakt van het dichtstbijzijnde vaartuig een schip van 280 t
    boat.bridgeMassT = 280; boat.bridgeAir = 4.2; boat.speed = 5; boat.scripted = true;
    cur = { position: { x: F.m[0] + F.dx * 30 - F.nx * 12, y: F.m[1] + F.dy * 30 - F.ny * 12, z: 9 }, lookAt: { x: F.m[0] - F.nx * 6, y: F.m[1] - F.ny * 6, z: 1 } };
    const msgs = [];
    const addMsg = w.addMessage; w.addMessage = (t, ...r) => { msgs.push(String(t)); return addMsg.call(w, t, ...r); };
    const t0 = performance.now();
    let hit = null, n = 0;
    const drive = setInterval(() => boat.applyControls(1 / 60, 1, 0, false), 16); // zoals stepBridgeCrashDemo: elke beeldjeslus vol vooruit
    while (performance.now() - t0 < 14000) {
      await sleep(250);
      const t = (performance.now() - t0) / 1000;
      const along = (boat.x - F.m[0]) * F.nx + (boat.y - F.m[1]) * F.ny;
      rep.log.push(`${t.toFixed(1)}s w=${along.toFixed(1)} v=${(boat.speed || 0).toFixed(1)} dents=${boat.bridgeDents || 0} hp=${boat.health ?? '-'} dek=${road._open ? 'weg' : 'ok'}`);
      n++; await grab(`${tag}-${String(n).padStart(2, '0')}`);
      if (boat.bridgeDents && !hit) hit = t;
    }
    clearInterval(drive);
    w.addMessage = addMsg;
    rep.geraakt = hit; rep.meldingen = msgs.slice(0, 6);
    rep.dents = boat.bridgeDents || 0;
    // het dek na afloop: nog dicht en heel?
    await sleep(1000);
    await grab(`${tag}-na`);
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
hold = null; done = true; cur = null;
clearInterval(skipper);
return JSON.stringify({ ...results, fouten: issues.slice(0, 20) });
