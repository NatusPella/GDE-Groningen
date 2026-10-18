// Page half of scripts/qa/visual_issues.mjs (desktop --perf-script body): gerichte
// screenshots voor #124 (hekken/boerderijen/steigers bij water en wegen, ook #185), #130
// (kruisingen, op- en afritten, samenkomende rijstroken), #157 (cutscene ver van de speler)
// en #158 (spoor op verschillende afstanden). window.__vi = { spots, settle, only }.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RG = await imp('roadgraph');
const WL = await imp('waterlevels');
const SETTLE = window.__vi.settle || 8000;
const ONLY = (window.__vi.only || '').split(',').filter(Boolean);
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, done = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = 14; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const go = async (x, y, a, settle = SETTLE) => {
  fixWorld(); teleport(x, y); hold = { x, y, a };
  await sleep(settle * 0.6); teleport(x, y); fixWorld(); await sleep(settle * 0.4);
};
const shot = async (name, pose, wait = 2200) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'vi-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  ownShot = false;
};
// camera `back` m behind (x, y) along heading a, `up` m up, looking `ahead` m ahead
const along = (x, y, a, back, up, ahead, lookUp = 1) => {
  const c = Math.cos(a), s = Math.sin(a), g = gh(x, y);
  return { position: { x: x - c * back, y: y - s * back, z: g + up }, lookAt: { x: x + c * ahead, y: y + s * ahead, z: g + lookUp }, cut: true };
};
function findWater(hx, hy, R) {
  for (let r = 0; r <= R; r += 25) {
    const n = r === 0 ? 1 : Math.max(8, Math.round(r / 12));
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2, x = hx + Math.cos(t) * r, y = hy + Math.sin(t) * r;
      const wa = WL.waterAt(map, x, y);
      if (wa && wa.depth > 0.8) return { x, y, wa };
    }
  }
  return null;
}
function openDir(x, y) {
  let best = { run: -1, a: 0 };
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2; let run = 0;
    for (let d = 10; d <= 600; d += 10) { if (!WL.waterAt(map, x + Math.cos(a) * d, y + Math.sin(a) * d)) break; run = d; }
    if (run > best.run) best = { run, a };
  }
  return best;
}
// the busiest junctions (most road ends meeting) within R m of (hx, hy)
function junctions(hx, hy, R, n) {
  const cnt = new Map();
  for (const rd of (map.roadsNear ? map.roadsNear(hx, hy, R) : [])) {
    for (const q of [rd.pts[0], rd.pts[rd.pts.length - 1]]) {
      const k = Math.round(q[0] / 4) + ',' + Math.round(q[1] / 4);
      const e = cnt.get(k) || { x: q[0], y: q[1], n: 0 }; e.n++; cnt.set(k, e);
    }
  }
  return [...cnt.values()].filter((e) => e.n >= 3).sort((a, b) => b.n - a.n).slice(0, n);
}
function nearestRow(hx, hy, kind) {
  let best = null;
  for (const rd of RG.roadNetRows() || []) {
    if (rd.kind !== kind) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - hx, my - hy);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  }
  return best;
}

const results = {};
for (const S of window.__vi.spots) {
  if (ONLY.length && !ONLY.includes(S.name)) continue;
  const info = { type: S.type, issue: S.issue };
  try {
    if (S.type === 'water') {
      // #124 / #185: fences, farms, jetties at water: three views of the nearest water
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const f = findWater(S.x, S.y, S.R || 1200);
      if (!f) { info.error = 'geen water binnen ' + (S.R || 1200) + ' m'; results[S.name] = info; continue; }
      const od = openDir(f.x, f.y);
      await go(f.x, f.y, od.a);
      info.at = [Math.round(f.x), Math.round(f.y)]; info.water = f.wa.kind; info.openRun = od.run;
      const lv = f.wa.level;
      await shot(S.name + '-a', { position: { x: f.x - Math.cos(od.a) * 25, y: f.y - Math.sin(od.a) * 25, z: lv + 9 }, lookAt: { x: f.x + Math.cos(od.a) * 160, y: f.y + Math.sin(od.a) * 160, z: lv }, cut: true });
      await shot(S.name + '-b', { position: { x: f.x - Math.cos(od.a + 1.57) * 45, y: f.y - Math.sin(od.a + 1.57) * 45, z: lv + 22 }, lookAt: { x: f.x, y: f.y, z: lv }, cut: true });
      await shot(S.name + '-c', { position: { x: f.x, y: f.y, z: lv + 2.5 }, lookAt: { x: f.x + Math.cos(od.a + 3.14) * 120, y: f.y + Math.sin(od.a + 3.14) * 120, z: lv + 1 }, cut: true });
    } else if (S.type === 'junction') {
      // #130: the busiest junctions near the hint, from 26 m up and from a low approach
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const js = junctions(S.x, S.y, S.R || 350, S.n || 2);
      info.junctions = js.map((j) => [Math.round(j.x), Math.round(j.y), j.n]);
      let k = 0;
      for (const j of js) {
        await go(j.x, j.y, 0, 5000);
        const g = gh(j.x, j.y);
        await shot(S.name + '-' + k + '-hoog', { position: { x: j.x + 20, y: j.y + 20, z: g + 26 }, lookAt: { x: j.x, y: j.y, z: g }, cut: true });
        await shot(S.name + '-' + k + '-laag', { position: { x: j.x - 30, y: j.y, z: g + 3 }, lookAt: { x: j.x, y: j.y, z: g + 1 }, cut: true }, 1800);
        k++;
      }
      if (!js.length) info.error = 'geen kruising (>=3 wegeinden) gevonden';
    } else if (S.type === 'ramp') {
      // #130: a motorway link (kind 2) near a motorway (kind 1) hint
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const l = nearestRow(S.x, S.y, 2);
      if (!l) { info.error = 'geen op-/afrit (kind 2) gevonden'; results[S.name] = info; continue; }
      await go(l.x, l.y, l.a);
      info.at = [Math.round(l.x), Math.round(l.y)]; info.hintDist = Math.round(l.d);
      await shot(S.name + '-hoog', along(l.x, l.y, l.a, 60, 38, 60, 0));
      await shot(S.name + '-laag', along(l.x, l.y, l.a, 20, 4, 80, 1.5));
    } else if (S.type === 'cinefar') {
      // #157: the player at (x, y); the cutscene camera far away at (cx, cy) looking along the rails
      await go(S.x, S.y, 0);
      const g = gh(S.cx, S.cy);
      info.player = [Math.round(S.x), Math.round(S.y)]; info.camera = [Math.round(S.cx), Math.round(S.cy)]; info.dist = Math.round(Math.hypot(S.cx - S.x, S.cy - S.y));
      // let the tiles round the camera load first: look from there once, then the shot proper
      await shot(S.name + '-warm', along(S.cx, S.cy, S.a, 15, 6, 120, 1), 4500);
      await shot(S.name, along(S.cx, S.cy, S.a, 15, 6, 120, 1), 3500);
      await shot(S.name + '-lang', along(S.cx, S.cy, S.a, 15, 4, 500, 2), 2500);
    } else if (S.type === 'raillod') {
      // #158: the player at S; views of the line from 40 / 150 / 400 / 900 m
      await go(S.x, S.y, S.a);
      info.at = [Math.round(S.x), Math.round(S.y)];
      for (const d of [40, 150, 400, 900]) {
        await shot(S.name + '-d' + d, along(S.x + Math.cos(S.a) * d, S.y + Math.sin(S.a) * d, S.a + Math.PI, 0, 5, d + 20, 1), 2200);
      }
      // and the same stretch with the player 600 m away from it, the camera still at the line
      await go(S.x - Math.cos(S.a) * 600, S.y - Math.sin(S.a) * 600, S.a);
      await shot(S.name + '-speler600', along(S.x, S.y, S.a, 15, 4, 150, 1), 4500);
    }
  } catch (e) { info.error = String(e && e.stack || e).slice(0, 300); }
  results[S.name] = info;
  console.log('[vi-spot] ' + S.name + ' ' + JSON.stringify(info));
}
hold = null; done = true; clearInterval(skipper);
return JSON.stringify({ results, errors: errors.slice(0, 30) });
