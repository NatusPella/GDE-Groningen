// Page half van scripts/qa/weer_nacht.mjs (desktop --perf-script body; #19, #194, #195).
// window.__wnCfg = { plekken: [{ naam, x, y, snap?, snapR?, road?, water?, soort }], matrix: [{ tijd, hour, weer, kind, rain,
// overcast, mist }], flikkerBij: [naam...], perf: [{ tijd, weer }...], settle } staat ervoor. Per plek: erheen, tegels laten
// laden, dan voor elke combinatie van tijdstip en weer een screenshot (wn-<plek>-<tijd>-<weer>) en per plek een paar
// frametijd-metingen (p50, p95, aantal haperingen) met de effecten aan. Tijd en weer worden elk frame vastgezet
// (world.clock en het geforceerde pad van weather.js: timer >= 1e8), zodat de kloktijd niet doorloopt.
const CFG = window.__wnCfg;
// het spel kan op een drukke machine langer over het opstarten doen dan de driver wacht
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await new Promise((res) => setTimeout(res, 100));
// ook echt gestart (niet het titelscherm): zo niet, Enter erbij; en een eventuele pauze opheffen
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 100));
}
const D = window.__debug; const w = D.world;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await new Promise((res) => setTimeout(res, 700)); } const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const UT = await imp('util');
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let hold = null, now = null, done = false;
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; }
  if (now) applyNow();
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

// tijd en weer vastzetten: geforceerd pad van weather.js (timer >= 1e8)
function applyNow() {
  w.clock = now.hour;
  if (DN.refreshDayNight) DN.refreshDayNight(w);
  const k = now;
  const ws = w.weather;
  ws.timer = 1e9;
  ws.kind = k.kind === 'helder' ? undefined : k.kind;
  ws.peak = k.rain;
  ws.overcast = k.overcast;
  ws.mist = k.mist;
  ws.active = k.rain > 0;
  ws.duration = Infinity;
  ws.elapsed = 0;
  ws.windAngle = 0.9;
  if (!ws.active) ws.intensity = Math.max(0, ws.intensity - 0.02);
  ws.wet = ws.wet ?? 0;
}
const setNow = (c) => { now = c; };

function snapRoad(x, y, R, road) {
  let best = null;
  const rows = (map.roadsNear ? map.roadsNear(x, y, R) : []) || [];
  for (const rd of rows) {
    if (road && rd.name !== road && rd.ref !== road) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 6) continue;
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), street: rd.name || rd.ref || '' };
    }
  }
  return best;
}
function findWater(x, y, maxR = 3000, step = 40) {
  for (let r = 0; r <= maxR; r += step) {
    const n = Math.max(1, Math.round((2 * Math.PI * r) / step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (UT.isInWater(map, px, py, 0)) return { x: px, y: py };
    }
  }
  return null;
}

async function frameStats(ms) {
  const t = []; let last = performance.now(); const t0 = last;
  await new Promise((res) => { const f = () => { const n = performance.now(); t.push(n - last); last = n; if (n - t0 < ms) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  t.shift();
  if (t.length < 3) return { fps: 0, p50: null, p95: null, max: null, hapert: null, opmerking: `te weinig frames (${t.length}) in ${ms} ms` };
  t.sort((a, b) => a - b);
  const avg = t.reduce((a, b) => a + b, 0) / t.length;
  const r = sc && sc.renderer ? sc.renderer.info.render : null;
  return { fps: +(1000 / avg).toFixed(1), p50: +t[Math.floor(t.length * 0.5)].toFixed(1), p95: +t[Math.floor(t.length * 0.95)].toFixed(1), max: +t[t.length - 1].toFixed(1), hapert: t.filter((v) => v > 50).length};
}

const results = { dpr: devicePixelRatio, css: [innerWidth, innerHeight], plekken: {} };
let lastHour = null;
const COMBO = (tijd, weer) => (CFG.combos || CFG.matrix).find((c) => c.tijd === tijd && c.weer === weer);
for (const S of CFG.plekken) {
  try {
  setNow(COMBO('middag', 'helder'));
  let s = { x: S.x, y: S.y, a: S.a || 0, street: '' };
  teleport(S.x, S.y);
  hold = s;
  await sleep(CFG.settle * 0.6);
  if (S.water) { const wt = findWater(S.x, S.y); if (wt) s = { x: wt.x, y: wt.y, a: S.a || 0, street: 'water' }; }
  else if (S.snap !== false) { const sn = snapRoad(S.x, S.y, S.snapR || 400, S.road); if (sn) s = { x: sn.x, y: sn.y, a: sn.a, street: sn.street }; }
  teleport(s.x, s.y);
  hold = s;
  await sleep(CFG.settle);
  const info = { at: [Math.round(s.x), Math.round(s.y)], street: s.street, shots: [], perf: {} };
  results.plekken[S.naam] = info;
  for (const c of CFG.matrix) {
    setNow(c);
    // regen maakt de weg pas na een paar seconden nat: de natheid direct zetten
    w.weather.wet = c.rain > 0 ? Math.min(1, c.rain + 0.35) : 0;
    w.weather.intensity = c.rain;
    // bij een nieuw tijdstip de belichting even laten bijtrekken
    const hourChanged = lastHour !== c.hour;
    lastHour = c.hour;
    await sleep(hourChanged ? 3500 : c.rain > 0 || c.mist > 0 ? 1800 : 1100);
    const name = `wn-${S.naam}-${c.tijd}-${c.weer}`;
    console.log('[capture] ' + name);
    info.shots.push(name);
    await sleep(350);
    // flikkercontrole: twee extra beelden kort na elkaar bij vaste instellingen
    if (c.weer === 'helder' && (c.tijd === 'middag' || c.tijd === 'nacht')) for (const suf of ['b', 'c']) { console.log('[capture] ' + name + '-' + suf); await sleep(450); }
    // de lucht: de camera een stuk omhoog (sterren, maan, banding, kleurverloop); de HUD gaat dan weg
    {
      const gz = (map.groundHeightAt ? map.groundHeightAt(s.x, s.y, 0) : 0) || 0, cx = Math.cos(s.a), cy = Math.sin(s.a);
      const pose = { position: { x: s.x - cx * 6, y: s.y - cy * 6, z: gz + 2.2 }, lookAt: { x: s.x + cx * 90, y: s.y + cy * 90, z: gz + 2.2 + 55 }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      ownShot = true;
      cine.playCinematic({ id: 'qa-lucht', duration: 60, priority: 9, letterbox: false, shot: () => pose });
      await sleep(900);
      console.log('[capture] ' + name + '-lucht');
      await sleep(450);
      cine.skipCinematic();
      ownShot = false;
      await sleep(250);
    }
  }
  await sleep(2500);
  for (const pf of CFG.perf) {
    const c = COMBO(pf.tijd, pf.weer);
    if (!c) continue;
    setNow(c);
    w.weather.wet = c.rain > 0 ? Math.min(1, c.rain + 0.35) : 0;
    w.weather.intensity = c.rain;
    await sleep(3000);
    info.perf[`${pf.tijd}-${pf.weer}`] = await frameStats(CFG.perfMs || 4000);
  }
  info.elev = Object.fromEntries([...new Set((CFG.combos || CFG.matrix).map((c) => c.tijd))].map((t) => [t, +DN.sunElevationDeg((CFG.combos || CFG.matrix).find((c) => c.tijd === t).hour).toFixed(1)]));
  // console.error: alleen fouten komen in de uitvoer van de desktop-app; zo overleeft het resultaat een latere crash
  console.error('[wn-result] ' + JSON.stringify({ naam: S.naam, at: info.at, street: info.street, elev: info.elev, perf: info.perf }));
  } catch (e) { console.error('[wn-result] ' + JSON.stringify({ naam: S.naam, fout: String(e && e.message || e) })); }
}
done = true;
hold = null; now = null;
clearInterval(skipper);
return JSON.stringify(results);
