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
const holds = []; // vehicles that must stay where the shot wants them
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = window.__viClock || 14; }
  for (const h of holds) { const v = h.v; v.x = h.x; v.y = h.y; v.angle = h.a; v.speed = 0; v.vx = 0; v.vy = 0; if (v.doors && h.open) for (const id of h.open) { if (!v.doors.loose[id]) { v.doors.want[id] = 1; v.doors.hold[id] = 5; } } }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = window.__viClock || 14;
  const W = window.__viWeather || {};
  w.weather = { active: !!W.kind && W.kind !== 'helder', timer: 1e9, kind: W.kind || 'helder', peak: W.intensity || 0, intensity: W.intensity || 0, wet: W.wet || 0, overcast: W.overcast || 0, mist: W.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
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
// the nearest road segment within R m of (x, y): its middle and heading
function snapRoad(x, y, R) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : [])) for (let i = 0; i < rd.pts.length - 1; i++) {
    const a = rd.pts[i], b = rd.pts[i + 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 8) continue;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
    if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
}
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
const VD = await imp('vehicledoors');
const VHC = await imp('vehicle');
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
        const k = at ? (at.place || '?') + (at.district ? ' / ' + at.district : '') + (at.near ? ' (dichtbij)' : '') : 'geen';
        cnt[k] = (cnt[k] || 0) + 1; n++;
      }
      info.points = n; info.labels = cnt;
      await shot(S.name, { position: { x: S.x, y: S.y + 250, z: gh(S.x, S.y) + 320 }, lookAt: { x: S.x, y: S.y, z: gh(S.x, S.y) }, cut: true }, 4500);
    } else if (S.type === 'marker') {
      // #115: one world marker of every kind (worldmarker3d.js, the same builder the game uses) in a
      // row on open ground, seen at 35 m, 120 m and 400 m by day, and once at night
      const WM = await imp('worldmarker3d');
      const kinds = Object.keys(WM.MARKER_KINDS);
      info.kinds = kinds;
      const sc3 = window.__scene3d;
      await go(S.x, S.y, 0, 5000);
      const row = kinds.map((k, i) => { const g = WM.buildWorldMarker3D(k); g.position.set(S.x + (i - (kinds.length - 1) / 2) * 7, gh(S.x, S.y), S.y); sc3.scene.add(g); return g; });
      let raf = true;
      const spin = () => { for (const g of row) WM.updateWorldMarker3D(g, performance.now() / 1000); if (raf) requestAnimationFrame(spin); };
      requestAnimationFrame(spin);
      const z = gh(S.x, S.y);
      for (const [n, d] of [['dichtbij', 35], ['midden', 120], ['ver', 400]]) {
        await go(S.x, S.y + d, 0, 3000);
        await shot(S.name + '-' + n, { position: { x: S.x, y: S.y + d, z: z + 3 }, lookAt: { x: S.x, y: S.y, z: z + 4 }, cut: true }, 2500);
      }
      window.__viClock = 22; hold = { x: S.x, y: S.y + 60, a: 0 }; fixWorld();
      await sleep(2500);
      await shot(S.name + '-nacht', { position: { x: S.x, y: S.y + 60, z: z + 3 }, lookAt: { x: S.x, y: S.y, z: z + 4 }, cut: true }, 2500);
      raf = false; window.__viClock = 0;
      for (const g of row) sc3.scene.remove(g);
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
    } else if (S.type === 'weer') {
      // nacht en weer: the same view in mist, drizzle, a shower and thunder, by day and at night
      const PRESETS = [['mist', { kind: 'mist', mist: 0.85, overcast: 0.5 }], ['motregen', { kind: 'motregen', intensity: 0.3, wet: 0.6, overcast: 0.6 }], ['regenbui', { kind: 'regenbui', intensity: 0.6, wet: 0.9, overcast: 0.8 }], ['onweer', { kind: 'onweer', intensity: 0.85, wet: 1, overcast: 1, mist: 0.2 }]];
      await go(S.x, S.y, S.a || 0, 6000);
      const z = gh(S.x, S.y);
      info.shots = [];
      for (const [hour, tag] of [[14, 'dag'], [22.5, 'nacht']]) {
        for (const [name, W] of PRESETS) {
          window.__viClock = hour; window.__viWeather = W; fixWorld();
          await sleep(3500);
          await shot(S.name + '-' + tag + '-' + name, { position: { x: S.x - Math.cos(S.a || 0) * 12, y: S.y - Math.sin(S.a || 0) * 12, z: z + 3 }, lookAt: { x: S.x + Math.cos(S.a || 0) * 80, y: S.y + Math.sin(S.a || 0) * 80, z: z + 4 }, cut: true }, 1800);
          info.shots.push(tag + '-' + name);
        }
      }
      window.__viClock = 0; window.__viWeather = null; fixWorld();
    } else if (S.type === 'voertuigen') {
      // doors, bonnet and look of vehicles: up to 8 different models near the spot, 3/4 views from 7 m;
      // then the player climbs into one and a shot is taken while the door is open
      await go(S.x, S.y, 0, 6000);
      const seen = new Set(); const list = [];
      for (const v of w.vehicles) {
        if (v.isBoat || v.isHeli || v.dead) continue;
        const k = (v.model && (v.model.name || v.model.kind)) || '?';
        if (seen.has(k) || Math.hypot(v.x - S.x, v.y - S.y) > 400) continue;
        seen.add(k); list.push(v);
        if (list.length >= 8) break;
      }
      info.models = list.map((v) => (v.model && (v.model.name || v.model.kind)) || '?');
      let k = 0;
      for (const v of list) {
        const a = (v.angle || 0) + 0.6, g = gh(v.x, v.y);
        await go(v.x, v.y, 0, 2500);
        await shot(S.name + '-' + k++ + '-' + (info.models[k - 1] || 'v').toString().replace(/[^a-z0-9]/gi, ''), { position: { x: v.x + Math.cos(a) * 7, y: v.y + Math.sin(a) * 7, z: g + 2.2 }, lookAt: { x: v.x, y: v.y, z: g + 1 }, cut: true }, 1800);
      }
      const v0 = list[0];
      if (v0) {
        teleport(v0.x, v0.y); hold = null;
        p.enterVehicle(v0, w);
        await sleep(400);
        console.log('[capture] ' + S.name + '-instappen');
        await sleep(1500);
        console.log('[capture] ' + S.name + '-erin');
        if (p.inVehicle) p.exitVehicle(map, w);
      }
    } else if (S.type === 'voertuigdelen') {
      // #225: doors, bonnet and boot of a car, a bus, a van and a tractor: closed, doors open, bent
      // (dent log 0.8) and torn off (2.0), each from a 3/4 view; vehicles are spawned in front of the lens
      // and held still. The dent log is the game's own damage record ([lx, lz, strength] per blow).
      await go(S.x, S.y, 0, 6000);
      const road = snapRoad(S.x, S.y, 200, null);
      const bx = road ? road.x : S.x, by = road ? road.y : S.y, ba = road ? road.a : 0;
      const all = VHC.TRAFFIC_MODELS();
      const pick = (name) => all.find((m) => m.name === name);
      const MODELS = [['auto', pick('wagon')], ['bus', pick('bus')], ['bestelbus', pick('van')], ['tractor', VHC.TRACTOR_MODEL]];
      info.at = [Math.round(bx), Math.round(by)]; info.modellen = MODELS.map(([n, m]) => n + ':' + (m ? m.name : 'ontbreekt'));
      const g = gh(bx, by);
      for (const [label, model] of MODELS) {
        if (!model) { info[label] = 'model niet gevonden'; continue; }
        const v = new VHC.Vehicle(bx, by, ba, { ...model });
        w.vehicles.push(v);
        const defs = VD.doorsFor(v);
        info[label] = { deuren: defs.map((d) => d.id) };
        const hold = { v, x: bx, y: by, a: ba, open: [] };
        holds.push(hold);
        await sleep(600);
        const cam = Math.max(7, model.len * 1.4), ca = ba + 0.7;
        const pose = { position: { x: bx + Math.cos(ca) * cam, y: by + Math.sin(ca) * cam, z: g + 2.4 + (model.len > 8 ? 1.5 : 0) }, lookAt: { x: bx, y: by, z: g + 1.1 }, cut: true };
        const dent = (level, reps = 1) => { v.dentLog = []; for (let r = 0; r < reps; r++) for (const d of defs) { if (d.side === 0) v.dentLog.push([(d.zone === 'voor' ? 1 : -1) * model.len * 0.4, 0, level * 2.6]); else v.dentLog.push([d.x * model.len, d.side * model.wid * 0.4, level * 2.6]); } };
        hold.open = [];
        await shot(S.name + '-' + label + '-dicht', pose, 1600);
        hold.open = defs.map((d) => d.id); VD.ensureDoors(v);
        await shot(S.name + '-' + label + '-open', pose, 1600);
        hold.open = []; for (const d of defs) { v.doors.want[d.id] = 0; }
        dent(0.4); v.health = 70;
        await shot(S.name + '-' + label + '-scheef', pose, 1900);
        dent(0.85, 2); v.health = 25;
        await shot(S.name + '-' + label + '-los', pose, 2200);
        info[label].status = { ...v.doors.dmg, loose: Object.keys(v.doors.loose) };
        holds.splice(holds.indexOf(hold), 1);
        w.vehicles.splice(w.vehicles.indexOf(v), 1);
      }
    } else if (S.type === 'zwemmen') {
      // #207: de speler zwemt (schoolslag) en staat op de kant, vanaf 4 m gezien
      await go(S.x, S.y, 0, SETTLE * 0.6);
      const f = findWater(S.x, S.y, S.R || 1200);
      if (!f) { info.error = 'geen water'; results[S.name] = info; continue; }
      const od = openDir(f.x, f.y);
      await go(f.x, f.y, od.a, 4000);
      const p = w.player;
      info.at = [Math.round(f.x), Math.round(f.y)]; info.swimming = !!p.swimming; info.water = p.water;
      const lv = f.wa.level;
      const side = (d, up) => ({ position: { x: p.x + Math.cos(od.a + 1.57) * d, y: p.y + Math.sin(od.a + 1.57) * d, z: lv + up }, lookAt: { x: p.x, y: p.y, z: lv + 0.2 }, cut: true });
      await shot(S.name + '-stil', side(4, 1.6), 1500);
      info.swimmingNa = !!p.swimming;
    } else if (S.type === 'schadefases') {
      // #205: een auto in vijf schadefasen (heel, gedeukt, rook, brand, wrak), dentLog per zone
      await go(S.x, S.y, 0, 6000);
      const road = snapRoad(S.x, S.y, 200, null);
      const bx = road ? road.x : S.x, by = road ? road.y : S.y, ba = road ? road.a : 0;
      const model = VHC.TRAFFIC_MODELS().find((m) => m.name === 'wagon');
      const g = gh(bx, by);
      const cam = Math.max(7, model.len * 1.4), ca = ba + 0.7;
      const pose = { position: { x: bx + Math.cos(ca) * cam, y: by + Math.sin(ca) * cam, z: g + 2.4 }, lookAt: { x: bx, y: by, z: g + 1.1 }, cut: true };
      const L = model.len * 0.4, Wd = model.wid * 0.4;
      const fases = [['heel', [], 100], ['voor', [[L, 0, 2.2]], 80], ['zijkant', [[L, 0, 2.2], [0, Wd, 2.2], [-L * 0.3, Wd, 1.8]], 50], ['rook', [[L, 0, 2.6], [0, -Wd, 2.2], [-L, 0, 1.6]], 45], ['brand', [[L, 0, 2.6], [-L, 0, 2.2], [0, Wd, 2.2], [0, -Wd, 2.2]], 20]];
      for (const [n, log, hp] of fases) {
        // a fresh car per phase: the mesh replays the dent log when it is built
        const v = new VHC.Vehicle(bx, by, ba, { ...model });
        v.dentLog = log.map((d) => [...d]); v.health = hp;
        w.vehicles.push(v);
        const hold = { v, x: bx, y: by, a: ba, open: [] };
        holds.push(hold);
        await sleep(600);
        await shot(S.name + '-' + n, pose, 2000);
        holds.splice(holds.indexOf(hold), 1);
        w.vehicles.splice(w.vehicles.indexOf(v), 1);
      }
    } else if (S.type === 'cutscenes') {
      // #224, #117, #157: real story scenes, played through the game: the step is jumped to, the player is teleported to the
      // mission start and E is pressed there; while a cinematic runs, a screenshot every 3 s (up to 5) and the world sounds
      // the scene queues (world.audioEvents) and, with --audio, the level on the audio tap (window.__qaAudio) are logged.
      clearInterval(skipper);
      const St = window.__story;
      const AQ = window.__qaAudio;
      const log = [];
      let arr = w.audioEvents || [];
      const wrap = (a) => { const p = a.push.bind(a); a.push = (...x) => { for (const e of x) log.push({ t: Math.round(performance.now()), k: e.kind + (e.name ? ':' + e.name : '') }); return p(...x); }; return a; };
      arr = wrap(arr);
      Object.defineProperty(w, 'audioEvents', { configurable: true, get() { return arr; }, set(v) { arr = wrap(v); } });
      info.scenes = {};
      for (const id of S.ids) {
        const rec = { cinematic: false, shots: 0 };
        try {
          const l0 = log.length, a0 = AQ ? AQ.rms.length : 0;
          hold = null;
          St.jump(id);
          await sleep(2500);
          if (S.direct) {
            // play the intro of the step straight where the player stands (missionstory.playStoryIntro), not via the mission start
            const MS = await imp('missionstory'); const SA = await imp('storyarc');
            const idx = SA.missionIndexOf(id);
            rec.index = idx;
            if (S.at) { await go(S.at.x, S.at.y, 0, 5000); hold = null; }
            rec.played = !!MS.playStoryIntro(w, idx, { kicker: 'Missie ' + id, title: id });
          } else {
            if (St.teleport) St.teleport();
            await sleep(4000);
            for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', code: 'KeyE', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'e', code: 'KeyE', bubbles: true })); }
          }
          let t0 = null;
          for (let i = 0; i < (S.maxI || 80); i++) {
            await sleep(500);
            if (cine.isCinematicActive()) { if (t0 === null) { t0 = i; rec.started = i * 0.5; } rec.cinematic = true; if ((i - t0) % (S.every || 6) === 2 && rec.shots < (S.max || 5)) { console.log('[capture] ' + S.name + '-' + id + '-' + rec.shots++); } }
            else if (t0 !== null) { rec.endedAfter = (i - t0) * 0.5; break; }
          }
          if (cine.isCinematicActive()) cine.skipCinematic();
          rec.events = log.slice(l0).map((e) => e.k);
          if (AQ) { const seg = AQ.rms.slice(a0); rec.audio = seg.length ? { samples: seg.length, maxRms: Math.max(...seg.map((x) => x.rms)), maxPeak: Math.max(...seg.map((x) => x.peak)), silent: seg.filter((x) => x.rms < 0.0005).length } : 'geen tap'; }
          rec.mission = !!(w.mission && w.mission.phase);
        } catch (e) { rec.fout = String(e && e.message || e).slice(0, 160); }
        info.scenes[id] = rec;
        await sleep(1500);
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
