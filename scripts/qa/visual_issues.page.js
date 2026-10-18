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

const LS = await imp('loadscreen');
const WPL = await imp('worldplaces');
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
    } else if (S.type === 'kart') {
      // #189: road surface transitions (concrete between asphalt) at the kart track
      await go(S.x, S.y, 0);
      info.at = [Math.round(S.x), Math.round(S.y)];
      for (const [n, dx, dy, up] of [['a', 0, 0, 90], ['b', 40, 40, 30], ['c', -40, 40, 12]]) {
        const g = gh(S.x, S.y);
        await shot(S.name + '-' + n, { position: { x: S.x + dx, y: S.y + dy, z: g + up }, lookAt: { x: S.x - dx * 0.2, y: S.y - dy * 0.2, z: g }, cut: true });
      }
    } else if (S.type === 'loadscreen') {
      // #188: the load screen of a new game / travel / fast travel
      await go(S.x, S.y, 0, 5000);
      hold = null;
      for (const kind of ['save', 'travel', 'snel']) {
        try {
          const h = LS.startLoadScreen(w, { kind, name: S.name });
          await sleep(1800);
          console.log('[capture] ' + S.name + '-' + kind);
          await sleep(600);
          info[kind] = !!(h && h.el);
          if (h && h.done) { await Promise.race([h.done, sleep(9000)]); }
          const el = document.getElementById('load-screen'); if (el) el.remove();
          await sleep(500);
        } catch (e) { info[kind] = 'fout: ' + e.message; }
      }
    } else if (S.type === 'labelgrid') {
      // #212: what the place label says over a grid round the district: 'Ommeland' where it is a city district?
      await go(S.x, S.y, 0, 5000);
      const cnt = {}; let n = 0;
      for (let dx = -S.rx; dx <= S.rx; dx += S.step) for (let dy = -S.ry; dy <= S.ry; dy += S.step) {
        const at = WPL.worldPlaceAt(S.x + dx, S.y + dy);
        const k = at ? (at.place ? at.place.name : '?') + (at.district ? ' / ' + at.district.name : '') + (at.near ? ' (dichtbij)' : '') : 'geen';
        cnt[k] = (cnt[k] || 0) + 1; n++;
      }
      info.points = n; info.labels = cnt;
      await shot(S.name, { position: { x: S.x, y: S.y + 250, z: gh(S.x, S.y) + 320 }, lookAt: { x: S.x, y: S.y, z: gh(S.x, S.y) }, cut: true }, 4500);
    } else if (S.type === 'marker') {
      // #115: the first mission's marker by day, close (35 m), mid (120 m) and far (400 m)
      const St = window.__story; const first = St && St.steps.find((x) => x.kind === 'mission');
      if (!first) { info.error = 'geen missie'; results[S.name] = info; continue; }
      St.jump(first.id);
      await sleep(6000);
      const g = window.__goal && window.__goal.target && window.__goal.target();
      if (!g) { info.error = 'geen doel van de missie'; results[S.name] = info; continue; }
      info.goal = [Math.round(g.x), Math.round(g.y)]; info.step = first.id;
      for (const [n, d] of [['dichtbij', 35], ['midden', 120], ['ver', 400]]) {
        await go(g.x - d, g.y, 0, 5000);
        const z = gh(g.x, g.y);
        await shot(S.name + '-' + n, { position: { x: g.x - d, y: g.y, z: z + 3 }, lookAt: { x: g.x, y: g.y, z: z + 3 }, cut: true }, 2500);
      }
    } else if (S.type === 'cutsound') {
      // #117: which world sounds the cutscenes of the first missions queue (cutaudio.js plan ->
      // world.audioEvents, drained by audio.js). The page spies on the queue; the run is muted
      // (--stil), so this proves the plan fires, not how it sounds.
      clearInterval(skipper);
      const log = [];
      let arr = w.audioEvents || [];
      const wrap = (a) => { const p = a.push.bind(a); a.push = (...x) => { for (const e of x) log.push({ t: Math.round(performance.now() / 100) / 10, k: e.kind + (e.name ? ':' + e.name : '') }); return p(...x); }; return a; };
      arr = wrap(arr);
      Object.defineProperty(w, 'audioEvents', { configurable: true, get() { return arr; }, set(v) { arr = wrap(v); } });
      const St = window.__story;
      const missions = St.steps.filter((x) => x.kind === 'mission').slice(0, S.n || 4);
      info.scenes = {};
      for (const m of missions) {
        const l0 = log.length;
        St.jump(m.id);
        let sawCine = false;
        for (let i = 0; i < 30; i++) { await sleep(1000); if (cine.isCinematicActive()) { sawCine = true; if (i % 10 === 4) console.log('[capture] ' + S.name + '-' + m.id + '-' + i); } }
        info.scenes[m.id] = { cinematic: sawCine, events: log.slice(l0).map((e) => e.k) };
        if (cine.isCinematicActive()) cine.skipCinematic();
      }
    } else if (S.type === 'raillod') {
      // #158: the player stays at the station; the cutscene camera stands ON the line at arc
      // length d from it (S.pts, along the polyline), looking back along the track. The focus
      // follows the lens (tilefocus.js), so the rails under it must be built at every d.
      await go(S.x, S.y, S.a);
      info.at = [Math.round(S.x), Math.round(S.y)];
      info.camera = {};
      for (const q of S.pts) {
        if (q.end) { info.camera['d' + q.d] = 'lijn te kort'; continue; }
        info.camera['d' + q.d] = [Math.round(q.x), Math.round(q.y)];
        const c = Math.cos(q.a), s2 = Math.sin(q.a), g = gh(q.x, q.y);
        // eye 5 m up, 12 m behind the point on the line, looking 200 m down the track away from the station
        await shot(S.name + '-d' + q.d + '-warm', { position: { x: q.x - c * 12, y: q.y - s2 * 12, z: g + 5 }, lookAt: { x: q.x + c * 200, y: q.y + s2 * 200, z: g + 1 }, cut: true }, 3500);
        await shot(S.name + '-d' + q.d, { position: { x: q.x - c * 12, y: q.y - s2 * 12, z: g + 5 }, lookAt: { x: q.x + c * 200, y: q.y + s2 * 200, z: g + 1 }, cut: true }, 2500);
      }
    }
  } catch (e) { info.error = String(e && e.stack || e).slice(0, 300); }
  results[S.name] = info;
  console.log('[vi-spot] ' + S.name + ' ' + JSON.stringify(info));
}
hold = null; done = true; clearInterval(skipper);
return JSON.stringify({ results, errors: errors.slice(0, 30) });
