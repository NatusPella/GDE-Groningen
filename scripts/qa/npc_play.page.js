// Page half of scripts/qa/npc_play.mjs: autodiefstal, wanted 1-5, verkeersruzie, wapens oppakken (#43 #44 #49 #52 #204).
// (the desktop run uses a throwaway profile; story tests run in-memory elsewhere).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__fs && window.__fs.settle) || 8000;
const ONLY = ((window.__fs && window.__fs.only) || '').split(',').filter(Boolean);

// ---- errors ------------------------------------------------------------------------
const issues = [];
const note = (m) => issues.push({ t: Math.round(performance.now()), m: String(m).slice(0, 240) });
const origErr = console.error.bind(console), origWarn = console.warn.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
console.warn = (...a) => { const s = a.map(String).join(' '); if (/nan|infinity/i.test(s)) note('console.warn: ' + s); origWarn(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => note('promise: ' + (e.reason && e.reason.message || e.reason)));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WP = await imp('worldplaces');
const WL = await imp('waterlevels');
const VH = await imp('vehicle');
const BT = await imp('boattypes');

let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && !window.__fsKeepCine && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, done = false, driving = false;
const tick = () => {
  if (hold && !driving && !PM.isPauseMenuOpen()) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const go = async (x, y, a = 0, settle = SETTLE) => {
  fixWorld();
  teleport(x, y);
  hold = { x, y, a };
  await sleep(settle * 0.6);
  teleport(x, y);
  await sleep(settle * 0.4);
};
const snap = async (name, wait = 500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
const shotAt = async (name, pose, wait = 2500) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'fs-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  ownShot = false;
};
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const closeAll = async () => {
  try { if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e) { note('closeAll: ' + e.message); }
  const shop = document.querySelector('.shop-open');
  if (shop) { await tap('Escape', 'Escape'); }
  hold = null;
};
const landmark = (re) => ((map && map.meta && map.meta.landmarks) || []).find((m) => re.test(m.name || ''));
const GM = { x: 200.8, y: 45.4 };
const nearestRoadHeading = (x, y, R = 80) => {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : [])) for (let i = 0; i < rd.pts.length - 1; i++) {
    const a = rd.pts[i], b = rd.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - x, (a[1] + b[1]) / 2 - y);
    if (!best || d < best.d) best = { d, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return best;
};


for (let i = 0; i < 20; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || ss.offsetParent === null || getComputedStyle(ss).display === 'none' || ss.classList.contains('hidden')) break;
  await tap('Enter', 'Enter'); await sleep(1500);
}
for (let i = 0; i < 25 && w.paused; i++) { await tap(' ', 'Space'); await sleep(500); }
const SO = await imp('occupants');
const WD = await imp('weapondrops');
const START = { x: 200.8, y: 45.4 };
const nearCars = (r = 250) => w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.isBus && !v.isPolice && !v.wrecked && !v.parked && Math.hypot(v.x - p.x, v.y - p.y) < r);
const pedInfo = (q) => q.map((e) => ({ x: +e.x.toFixed(1), y: +e.y.toFixed(1), state: e.state, stepOut: !!e.stepOut, vic: e._vic && e._vic.phase, ko: !!(e.koUntil > w.time) }));
const CHECKS = [
  { id: 'diefstal', issues: [49], run: async () => {
    const base = nearCars(1e6).sort((a, b) => Math.hypot(a.x - START.x, a.y - START.y) - Math.hypot(b.x - START.x, b.y - START.y))[0];
    if (base) await go(base.x + 12, base.y + 12, 0, 3000);
    await sleep(3000);
    const cars = nearCars().filter((v) => SO.seatedOf(v).driver === 'ai');
    const withPass = cars.find((v) => SO.seatedOf(v).passengers.length && Math.hypot(v.x - p.x, v.y - p.y) < 60) || cars.find((v) => v.model && v.model.name === 'sedan') || cars[0];
    if (withPass && !SO.seatedOf(withPass).passengers.length) SO.seatedOf(withPass).passengers.push({ slot: 'front', seed: 5 }); // test: forceer een bijrijder
    if (!withPass) return { fout: 'geen verkeersauto', voertuigen: w.vehicles.length, spelerPos: [Math.round(p.x), Math.round(p.y)], modus: w.mode || w.state || null, verkeer: w.trafficEnabled, bestuurders: nearCars().length, soorten: w.vehicles.slice(0, 30).map((v) => [v.model && v.model.name, !!v.road, !!v.parked, Math.round(Math.hypot(v.x - p.x, v.y - p.y)), !!v.driver]) };
    const occ0 = SO.seatedOf(withPass); const occ = { driver: occ0.driver, passengers: occ0.passengers.slice() }; const cx = withPass.x, cy = withPass.y;
    const parkedWait = w.vehicles.filter((v) => v.parked && SO.seatedOf(v).driver === 'waiting').length;
    teleport(withPass.x - Math.cos(withPass.angle) * 3, withPass.y - Math.sin(withPass.angle) * 3);
    const before = w.pedestrians.length;
    await snap('diefstal-0', 300);
    p.enterVehicle(withPass, w);
    const log = [];
    for (let i = 0; i < 24; i++) { for (let k = 0; k < 7; k++) { await sleep(100); withPass.speed = 0; } if (i === 1) await snap('diefstal-1', 100); if (i === 8) await snap('diefstal-2', 100); log.push({ t: i, car: { hp: Math.round(withPass.health), wr: !!withPass.wrecked, sp: +(withPass.speed || 0).toFixed(1), fire: !!withPass.onFire }, victim: (() => { const q = w.pedestrians.find((e) => e._vic); return q ? { phase: q._vic.phase, d: Math.round(Math.hypot(q.x - withPass.x, q.y - withPass.y)), report: q._vic.reported } : null; })(), pass: w.pedestrians.filter((e) => e.passengerOf === withPass.id).map((e) => ({ x: +e.x.toFixed(1), y: +e.y.toFixed(1), state: e.state, sp: +(e.speed || 0).toFixed(1), hp: Math.round(e.health), rag: !!e.ragdoll })), nieuw: pedInfo(w.pedestrians.filter((e) => Math.hypot(e.x - cx, e.y - cy) < 30 && (e._vic || e.stepOut || e.state === 'flee' || e.state === 'angry'))), wanted: w.wanted }); }
    const res = { occ: { driver: occ.driver, passagiers: occ.passengers.map((x) => x.slot) }, wachtendeGeparkeerd: parkedWait, nieuwePeds: w.pedestrians.length - before, log, bericht: (w.messages || []).slice(-3) };
    if (p.inVehicle) p.exitVehicle(map, w);
    w.wanted = 0;
    return res;
  } },
  { id: 'wanted', issues: [43, 204], run: async () => {
    const out = {};
    for (const n of ((window.__fs.stars && window.__fs.stars.length ? window.__fs.stars : [1, 2, 3, 4, 5]))) {
      const base = nearCars(1e6).sort((a, b) => Math.hypot(a.x - START.x, a.y - START.y) - Math.hypot(b.x - START.x, b.y - START.y))[0];
      if (base) await go(base.x + 12, base.y + 12, 0, 3000); else await go(START.x, START.y, 0, 3000);
      const car = nearCars(150).filter((v) => !v.isBus)[0];
      if (car) { teleport(car.x, car.y); p.enterVehicle(car, w); hold = null; driving = true; key('keydown', 'w', 'KeyW'); }
      w.wanted = n; w.wantedDecayTimer = 0;
      const samples = [];
      for (let i = 0; i < 8; i++) {
        for (let k = 0; k < 25; k++) { await sleep(100); if (p.inVehicle && n >= 3 && Math.abs(p.inVehicle.speed) < 8) p.inVehicle.speed = 9; if (w.paused) { await tap(' ', 'Space', 40); } }
        const pol = w.police || {};
        samples.push({ gt: +(w.time || 0).toFixed(1), heli: w.vehicles.filter((v) => v.isHeli && v.isPolice).length || w.vehicles.filter((v) => v.isHeli).length, spijker: ((w.shards && w.shards.fields) || []).filter((f) => f.kind === 'spijkers').length, t: (i + 1) * 2.5, wanted: w.wanted, politie: w.vehicles.filter((v) => v.isPolice && !v.wrecked).length, voet: w.pedestrians.filter((q) => q.isCop).length, blok: w.vehicles.filter((v) => v._roadblock).length, zoekt: !!pol.searching, straal: pol.searchRadius && Math.round(pol.searchRadius), gezien: !!pol.seenRecently, snelheid: p.inVehicle ? +(p.inVehicle.speed || 0).toFixed(1) : null, hp: Math.round(p.health), auto: p.inVehicle ? Math.round(p.inVehicle.health) : null, berichten: (w.messages || []).slice(-2).map((m) => m.text || m) });
        if (i === 3) await snap('wanted-' + n, 100);
      }
      out['ster' + n] = samples;
      key('keyup', 'w', 'KeyW');
      if (p.inVehicle) p.exitVehicle(map, w);
      driving = false; w.wanted = 0; await sleep(600);
    }
    return out;
  } },
  { id: 'ruzie', issues: [44], run: async () => {
    await go(START.x, START.y, 0);
    await sleep(3000);
    const RR = window.__roadrage;
    if (!RR) return { fout: 'window.__roadrage ontbreekt' };
    const before = RR.state();
    const started = RR.start(null);
    await sleep(500);
    const log = [RR.state()];
    for (let i = 0; i < 6; i++) { await sleep(1500); log.push(RR.state()); if (i === 2) await snap('ruzie', 100); }
    RR.abort();
    return { before, started, log };
  } },
  { id: 'wapenopname', issues: [52], run: async () => {
    await go(START.x, START.y, 0);
    WD.dropWeapon(w, 'bezem', p.x + 1.2, p.y, p.gz || 0);
    WD.dropWeapon(w, 'waterpistool', p.x - 1.2, p.y, p.gz || 0);
    await sleep(1500);
    await snap('drop-0', 100);
    const prompt = WD.weaponDropPrompt(w);
    const ok = WD.usePickup(w);
    await sleep(500);
    return { prompt, opgepakt: ok, wapen: w.weapon, ammo: w.ammo && { bezem: w.ammo.bezem, waterpistool: w.ammo.waterpistool }, resterend: (w.weaponDrops || []).length };
  } },
];
const results = {};
for (const C of CHECKS) {
  if (ONLY.length && !ONLY.includes(C.id)) continue;
  const i0 = issues.length;
  let out;
  try { out = await C.run(); } catch (e) { out = { fout: String(e && e.stack || e).slice(0, 400) }; }
  try { await closeAll(); } catch (e) { note('closeAll: ' + e.message); }
  driving = false; key('keyup', 'w', 'KeyW');
  results[C.id] = { issues: C.issues, ...out, meldingen: issues.slice(i0).map((x) => x.m) };
  console.log('[fs-check] ' + C.id + ' ' + JSON.stringify(results[C.id]).slice(0, 1500));
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr; console.warn = origWarn;
return JSON.stringify({ results, totaalMeldingen: issues.length });
