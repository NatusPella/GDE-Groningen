// Page half of scripts/qa/sweep.mjs (desktop --perf-script body). window.__sw = { plan, settle } is put in
// front. Per plan entry ('wereld', 'verhaal'): go there, set time of day and weather, take shots
// ('[capture] <naam>') and log one '[sweep-stop] <json>' line with the automatic checks of the page
// (NaN geometry, empty world, missing textures, HUD clipped or overlapping, player in water/building,
// new console errors). Pixel checks (black, empty, magenta) are done by the driver on the PNGs.
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WL = await imp('waterlevels');
const TP = await imp('tileplace');
const WP = await imp('worldplaces');
const SW = window.__sw;
const SETTLE = SW.settle || 6000;
let ownShot = false;
let skipCine = true;
const skipper = setInterval(() => { if (skipCine && !ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
const origErr = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); origErr.apply(console, a); };
window.addEventListener('error', (e) => errors.push(String(e.message).slice(0, 200)));
window.addEventListener('unhandledrejection', (e) => errors.push('promise: ' + String(e.reason).slice(0, 200)));

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, done = false, env = { clock: 14, weather: null };
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

// ---- automatic checks of the page ----
function sceneChecks() {
  let nan = 0, meshes = 0, noTex = 0, tris = 0;
  const badTex = new Set();
  sc.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const pos = o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) return;
    meshes++;
    const a = pos.array;
    for (let i = 0; i < a.length; i += 7) if (a[i] !== a[i]) { nan++; break; }
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      const t = m && m.map;
      if (t && (!t.image || (t.image.width === 0 && !t.isCanvasTexture && !t.isDataTexture && !t.isCompressedTexture))) { noTex++; badTex.add((m.name || o.name || '?').slice(0, 40)); }
    }
  });
  const info = sc.renderer && sc.renderer.info && sc.renderer.info.render;
  if (info) tris = info.triangles;
  return { nan, meshes, noTex, badTex: [...badTex].slice(0, 6), calls: info ? info.calls : null, tris };
}
function hudChecks() {
  const out = { clip: [], overlap: [] };
  const vw = innerWidth, vh = innerHeight;
  const items = [];
  const root = document.getElementById('hud');
  const scope = [root, document.getElementById('start-screen')].filter(Boolean);
  for (const sRoot of [root].filter(Boolean)) {
    for (const el of sRoot.querySelectorAll('*')) {
      if (!el.childNodes.length) continue;
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.15) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let hidden = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || Number(c.opacity) < 0.15) { hidden = true; break; } }
      if (hidden) continue;
      items.push({ el, r, text: own.slice(0, 40) });
      if (r.left < -2 || r.top < -2 || r.right > vw + 2 || r.bottom > vh + 2) out.clip.push({ text: own.slice(0, 40), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
    }
  }
  for (let i = 0; i < items.length && out.overlap.length < 6; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix > 6 && iy > 6 && ix * iy > 0.35 * Math.min(a.r.width * a.r.height, b.r.width * b.r.height)) { out.overlap.push([a.text, b.text]); if (out.overlap.length >= 6) break; }
  }
  out.clip = out.clip.slice(0, 6);
  void scope;
  return out;
}
let errSeen = 0;
async function shot(name, wait = 700) {
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(700);
}
async function logStop(stop, extra) {
  // the driver reads the records from the returned JSON (a plain console.log line does not reach the run log)
  const ss = document.querySelector('#start-screen');
  const startScreen = !!ss && ss.offsetParent !== null && getComputedStyle(ss).display !== 'none' && Number(getComputedStyle(ss).opacity) > 0.05;
  const rec = { name: stop.name, cat: stop.cat, startScreen, clock: env.clock, weather: (env.weather && env.weather.kind) || 'helder', ...extra, scene: sceneChecks(), hud: hudChecks() };
  const fresh = errors.slice(errSeen); errSeen = errors.length;
  if (fresh.length) rec.errors = fresh.slice(0, 5);
  results.push(rec);
  return rec;
}

// SW.preset: a graphics preset of gfxprofile.js ('laag', 'middel', 'vlot', 'hoog') applied as session settings
if (SW.preset) {
  const GP = await imp('gfxprofile'); const ST = await imp('settings');
  const pr = (GP.GFX_PRESETS || {})[SW.preset];
  if (pr) for (const [k, v] of Object.entries(pr)) ST.setSetting(k, v);
  console.log('[sweep] preset ' + SW.preset + ' ' + JSON.stringify(pr || null));
}
const results = [];
for (const S of SW.plan) {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  env = { clock: S.clock, weather: S.weather, fix: true };
  try {
    if (S.kind === 'wereld') {
      let s = { x: S.x, y: S.y, a: S.a || 0, street: '' };
      w.wanted = 0;
      if (S.cat === 'waddenzee') {
        // a point of open water within 3 km, so the shot shows the sea and not the dyke
        outer: for (let rr = 400; rr <= 3000; rr += 400) for (let k = 0; k < 16; k++) {
          const q = (k / 16) * Math.PI * 2, wx = S.x + Math.cos(q) * rr, wy = S.y + Math.sin(q) * rr;
          if (WL.waterAt(map, wx, wy)) { s = { x: wx, y: wy, a: s.a, street: '' }; break outer; }
        }
      }
      fixWorld(); teleport(s.x, s.y); hold = s;
      await sleep(SETTLE * 0.6);
      if (S.snap !== false) {
        const sn = snapRoad(S.x, S.y, S.snapR || 400, S.road) || (S.road ? snapRoad(S.x, S.y, 600) : null);
        if (sn) s = { x: sn.x, y: sn.y, a: S.a !== undefined ? S.a : sn.a, street: sn.street, d: Math.round(sn.d) };
      }
      teleport(s.x, s.y); hold = s; fixWorld();
      await sleep(SETTLE);
      const gz = map.groundHeightAt ? map.groundHeightAt(s.x, s.y, 0) : null;
      const place = WP.nearestWorldPlace ? WP.nearestWorldPlace(s.x, s.y) : null;
      const inWater = !!WL.waterAt(map, s.x, s.y), inBuilding = !!TP.buildingAt(map, s.x, s.y, 0);
      const info = { at: [Math.round(s.x), Math.round(s.y)], street: s.street, snapDist: s.d, ground: gz, pz: p.z, place: place && place.name, inWater, inBuilding };
      await shot(S.name + '-straat');
      await logStop(S, info);
      // high shot: 28 m up, 40 m behind, looking 30 m ahead
      const cx = Math.cos(s.a), cy = Math.sin(s.a), base = gz || 0;
      const pose = { position: { x: s.x - cx * 40, y: s.y - cy * 40, z: base + 28 }, lookAt: { x: s.x + cx * 30, y: s.y + cy * 30, z: base }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      ownShot = true;
      cine.playCinematic({ id: 'sw-view', duration: 60, priority: 9, shot: () => pose });
      await sleep(2200);
      console.log('[capture] ' + S.name + '-hoog');
      await sleep(700);
      cine.skipCinematic();
      ownShot = false;
    } else if (S.kind === 'verhaal') {
      hold = null; env.fix = false;
      setWeather();
      const S2 = window.__story;
      skipCine = false;
      if (!S.step) {
        // a step of mission M<nn> (nn from the plan), picked with the plan's own number
        const nn = String(S.mnum).padStart(2, '0');
        const pool = S2.steps.filter((st) => st.id && String(st.id).startsWith('M' + nn));
        const all = pool.length ? pool : S2.steps.filter((st) => st.id);
        S.step = all[Math.floor(S.r * all.length)].id;
      }
      const ok = S2.jump(S.step);
      w.clock = env.clock;
      await sleep(SETTLE * 0.7);
      for (let i = 0; i < S.shots; i++) {
        await shot(S.name + '-t' + i, 1500);
        const cur = S2.current();
        await logStop(S, { step: S.step, jumped: !!ok, cur: cur && cur.id, cine: cine.isCinematicActive(), paused: !!w.paused, at: [Math.round(p.x), Math.round(p.y)] });
        if (i + 1 < S.shots) await sleep(3500);
      }
      if (S.menu) {
        PM.openPauseMenu(S.menu);
        await sleep(1200);
        console.log('[capture] ' + S.name + '-menu-' + S.menu);
        await sleep(700);
        await logStop({ ...S, name: S.name + '-menu-' + S.menu }, { menu: S.menu });
        PM.closePauseMenu();
      }
      skipCine = true;
      if (cine.isCinematicActive()) cine.skipCinematic();
    }
  } catch (err) {
    results.push({ name: S.name, cat: S.cat, fout: String(err && err.stack || err).slice(0, 300) });
    skipCine = true; ownShot = false; hold = null;
    try { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e2) { /* verder */ }
  }
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr;
return JSON.stringify({ stops: results });
