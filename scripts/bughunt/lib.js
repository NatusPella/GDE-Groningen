// Shared helpers for the bug-hunt phases (run.sh prepends this to the phase files; it runs as the body of an async function in the page, see desktop/main.js --perf-script)
const B = window.__bh; const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (f) => import('/js/' + f + '.js');
const log = (...a) => (B.oeRaw || console.log)('[bh]', ...a);
const cine = await imp('cinematics');
const VEH = await imp('vehicle');
const { P, PO } = await imp('worldframe');
const R = { issues: [], mem: [], points: 0, rides: {} };
const issue = (cat, msg) => { const k = cat + ': ' + msg; if (!R.issues.includes(k) && R.issues.length < 300) { R.issues.push(k); log('ISSUE', k); } };
const tag = (t) => { B.tag = t; B.frames.tag = t; };
const fin = (...a) => a.every((x) => x === undefined || Number.isFinite(x));
let skipCine = true;
const skipper = setInterval(() => { if (skipCine && cine.isCinematicActive()) cine.skipCinematic(); }, 150);
const KEYS = { w: ['w', 'KeyW'], a: ['a', 'KeyA'], s: ['s', 'KeyS'], d: ['d', 'KeyD'], e: ['e', 'KeyE'], f: ['f', 'KeyF'], r: ['r', 'KeyR'], t: ['t', 'KeyT'], m: ['m', 'KeyM'], x: ['x', 'KeyX'], ' ': [' ', 'Space'], escape: ['Escape', 'Escape'], backspace: ['Backspace', 'Backspace'], tab: ['Tab', 'Tab'], enter: ['Enter', 'Enter'], arrowup: ['ArrowUp', 'ArrowUp'], arrowdown: ['ArrowDown', 'ArrowDown'], arrowleft: ['ArrowLeft', 'ArrowLeft'], arrowright: ['ArrowRight', 'ArrowRight'], shift: ['Shift', 'ShiftLeft'], control: ['Control', 'ControlLeft'], k: ['k', 'KeyK'] };
const ev = (type, k) => { const [key, code] = KEYS[k] || [k, '']; window.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true })); };
const down = (k) => ev('keydown', k);
const up = (k) => ev('keyup', k);
const tap = async (k, ms = 60) => { down(k); try { await sleep(ms); } finally { up(k); } await sleep(60); };
const hold = async (keys, ms) => { for (const k of keys) down(k); try { await sleep(ms); } finally { for (const k of keys) up(k); } };
const pausedWhy = async () => {
  const pm = await imp('pausemenu'), mv = await imp('mapview'), su = await imp('shopui'), ph = await imp('phone');
  return { pause: pm.isPauseMenuOpen(), map: mv.isMapOpen(), shop: su.isShopOpen(), phone: ph.isPhoneOpen(), ui: !!w.uiPaused, cine: cine.isCinematicActive(), dev: !!w.devPanelOpen };
};
// NaN / sanity watcher
const nanSeen = new Set();
const watcher = setInterval(() => {
  const chk = (name, ok) => { if (!ok && !nanSeen.has(name)) { nanSeen.add(name); issue('NaN', `${name} at ${B.tag}`); } };
  chk('player.xy', fin(p.x, p.y, p.angle, p.gz, p.z));
  chk('money', Number.isFinite(w.money));
  chk('health', Number.isFinite(w.health));
  chk('armor', Number.isFinite(w.armor));
  chk('wanted', Number.isFinite(w.wanted));
  chk('camYaw', Number.isFinite(w.camYaw ?? 0));
  for (const v of w.vehicles) if (!fin(v.x, v.y, v.angle, v.speed, v.z)) { chk('vehicle ' + (v.model && v.model.name), false); break; }
  for (const q of w.pedestrians) if (!fin(q.x, q.y)) { chk('pedestrian', false); break; }
  const c = window.__scene3d && window.__scene3d.cam;
  if (c) chk('camera', fin(c.position.x, c.position.y, c.position.z));
}, 300);
const BAD = /\bundefined\b|\bNaN\b|\[object |\bnull\b|Infinity|€\s?-\d/;
const badSeen = new Set();
const scan = () => {
  for (const el of document.querySelectorAll('#hud, .phone.open, #pause-menu.visible, #shop-menu.visible, .hud-cards, #cine, .cine, [role="dialog"]')) {
    const t = el.innerText || '';
    const m = BAD.exec(t);
    if (m) { const snip = t.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\s+/g, ' '); const k = snip.slice(0, 70); if (!badSeen.has(k)) { badSeen.add(k); issue('text', `"${snip}" in ${el.id || el.className} at ${B.tag}`); } }
  }
};
const scanner = setInterval(scan, 400);
window.__bhScan = scanner;
const memSnap = (label) => {
  const r = window.__scene3d && window.__scene3d.renderer;
  const m = { label, geo: r ? r.info.memory.geometries : 0, tex: r ? r.info.memory.textures : 0, prog: r ? r.info.programs.length : 0, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : 0, veh: w.vehicles.length, ped: w.pedestrians.length, scene: 0, calls: r ? r.info.render.calls : 0, fps: B.frames.n[B.tag] ? Math.round(1000 * B.frames.n[B.tag] / B.frames.sum[B.tag]) : 0 };
  if (window.__scene3d) window.__scene3d.scene.traverse(() => m.scene++);
  R.mem.push(m);
  return m;
};
const teleport = (x, y, open = true) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  const s = open ? (map.findOpenSpawn(x, y, 120) || { x, y }) : { x, y };
  p.x = s.x; p.y = s.y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(p.x, p.y, 0) || 0 : 0;
  return s;
};
const moved = async (fn, label, min = 0.6) => {
  const v = p.inVehicle; const o = v || p; const x0 = o.x, y0 = o.y;
  await fn();
  const d = Math.hypot(o.x - x0, o.y - y0);
  if (!(d >= min)) {
    const why = await pausedWhy();
    if (!why.pause && !why.map && !why.shop && !why.phone && !why.cine && !w.pendingRespawn) issue('stuck', `${label} moved ${d.toFixed(2)} m at ${B.tag} (${Math.round(o.x)},${Math.round(o.y)}) ${JSON.stringify(why)} ${JSON.stringify({ act: w.activityGame || null, padel: !!w.padelGame, heli: !!w.heliRun, pig: !!w.pigeonMode, rag: !!p.ragdoll, train: !!w.trainDriving, hold: !!w.challengeHoldPlayer, mg: w.minigameUntil > w.time, paused: !!w.paused, water: p.water || null, camOv: !!w.cameraOverride, ts: w.timeScale })}`);
  }
  return d;
};
const spawnCar = () => {
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  if (!pt) return null;
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.bhTemp = true;
  w.vehicles.push(v);
  return v;
};
const spawnBike = () => {
  const v = VEH.makeTwoWheeler('bike', p.x + 1.5, p.y, p.angle);
  v.bhTemp = true; w.vehicles.push(v); return v;
};
const spawnBoat = () => {
  const polys = map.waterNear(p.x, p.y, 80);
  for (const poly of polys) {
    const v = VEH.spawnBoatOnWater(map, poly, Math.random, { near: [p.x, p.y], max: 90, budget: 400 });
    if (v) { v.bhTemp = true; w.vehicles.push(v); return v; }
  }
  return null;
};
const removeVeh = (v) => { if (!v) return; if (p.inVehicle === v) p.exitVehicle(map, w); const i = w.vehicles.indexOf(v); if (i >= 0) w.vehicles.splice(i, 1); };
const ride = async (v, label, ms = 1600) => {
  if (!v) return;
  p.enterVehicle(v, w);
  if (p.inVehicle !== v) { issue('enter', `${label} could not be entered at ${B.tag}`); removeVeh(v); return; }
  w.camYaw = v.angle; R.rides[label] = (R.rides[label] || 0) + 1;
  await moved(() => hold(['w'], ms), label, label === 'boat' ? 0.3 : 0.8);
  await hold([' '], 300);
  if (p.inVehicle) p.exitVehicle(map, w);
  if (p.inVehicle) issue('exit', `${label} exit failed at ${B.tag}`);
  await sleep(150);
  removeVeh(v);
};
const quiet = async (ms = 8000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (!cine.isCinematicActive() && !w.pendingRespawn) return true; await sleep(150); } return false; };
const PM = await imp('pausemenu'), MV = await imp('mapview'), SU = await imp('shopui'), PH = await imp('phone');
const overlays = () => ({ pause: PM.isPauseMenuOpen(), map: MV.isMapOpen(), shop: SU.isShopOpen(), phone: PH.isPhoneOpen(), ui: !!w.uiPaused, hideHud: document.body.classList.contains('cine-hide-hud'), camOv: !!w.cameraOverride, ts: w.timeScale ?? 1, hold: !!w.challengeHoldPlayer, keys: [...w.input.keys].join('') });
const expectClear = async (label) => {
  await sleep(500);
  const o = overlays();
  const bad = Object.entries(o).filter(([k, v]) => (k === 'ts' ? v !== 1 : k === 'keys' ? !!v : v)).map(([k, v]) => k + '=' + v);
  if (bad.length) issue('overlay', `${label}: still ${bad.join(', ')}`);
};
const errCount = () => [...B.err.values()].reduce((a, e) => a + e.n, 0);
const dumpMap = (m) => [...m.entries()].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${v.n}x [${v.tags.join(',')}] ${k}${v.stack ? ' @ ' + v.stack : ''}`);
const report = () => {
  clearInterval(skipper); clearInterval(watcher); clearInterval(scanner);
  const F = B.frames;
  const spikes = {}; for (const [t, ms] of F.spikes) { const s = spikes[t] || (spikes[t] = []); if (s.length < 6) s.push(ms); }
  const fps = {}; for (const t of Object.keys(F.n)) fps[t] = Math.round(1000 * F.n[t] / F.sum[t]);
  return JSON.stringify({ points: R.points, rides: R.rides, fps, issues: R.issues, errors: dumpMap(B.err).slice(0, 60), warnings: dumpMap(B.warn).slice(0, 60), spikes, mem: R.mem }, null, 1);
};
