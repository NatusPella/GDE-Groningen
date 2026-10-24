// Page half of scripts/qa/perron_shots.mjs (desktop --perf-script body, #436). window.__ps = { only, settle } staat ervoor.
// 'noord': bij het voetstuk van de trap van Groningen Noord, de trap op lopen met de echte toets W (de hoogte meten), op het perron
//   staan terwijl een trein langs rijdt (de speler wordt niet geraakt), daarna op het spoor staan (wel geraakt).
// 'europapark': hetzelfde bij het lage perron met de helling.
// Elke synthetische keydown krijgt een keyup; er wordt niets in echte opslag geschreven (wegwerpprofiel).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const SETTLE = (window.__ps && window.__ps.settle) || 7000;
const ONLY = ((window.__ps && window.__ps.only) || '').split(',').filter(Boolean);

const issues = [];
const note = (m) => issues.push(String(m).slice(0, 240));
const origErr = console.error.bind(console);
console.error = (...a) => { note('console.error: ' + a.map(String).join(' ')); origErr(...a); };
window.addEventListener('error', (e) => note('error: ' + e.message));
window.addEventListener('unhandledrejection', (e) => note('promise: ' + (e.reason && e.reason.message || e.reason)));

const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const RW = await imp('railway');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = false;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
const tap = async (k, code, ms = 80) => { key('keydown', k, code); await sleep(ms); key('keyup', k, code); await sleep(80); };
const teleport = (x, y, z0 = 0) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, z0) || 0 : 0;
};
let hold = null, done = false;
const tick = () => {
  if (hold && !PM.isPauseMenuOpen()) {
    if (hold.pin) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; }
    p.angle = hold.a; w.camYaw = hold.a;
  }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = (hour = 14) => {
  w.clock = hour;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const snap = async (name, wait = 500) => { await sleep(wait); console.log('[capture] ' + name); await sleep(500); };
const leaveStart = async () => {
  const ss = document.getElementById('start-screen');
  for (let i = 0; i < 4 && ss && ss.classList.contains('visible'); i++) { await tap('Enter', 'Enter', 120); await sleep(5000); }
};
const absZ = () => (p.gz || 0) + (p.z || 0);

// de route die het dichtst langs (x, y) loopt: { idx, route, s }
function routeNear(x, y) {
  const routes = RW.getRoutes();
  let best = null;
  routes.forEach((route, idx) => {
    for (let s = 0; s <= route.len; s += 5) {
      const q = RW.routePoint(route, s), d = Math.hypot(q[0] - x, q[1] - y);
      if (!best || d < best.d) best = { idx, route, s, d, q };
    }
  });
  return best;
}
// een trein van 150 m eerder met 18 m/s, en wachten tot hij voorbij is; meet de dichtste afstand en de gezondheid
async function treinLangs(rn, meetPlek, secs = 22) {
  const q = RW.routePoint(rn.route, Math.max(0, rn.s - 150));
  const t = RW.zetTreinVanHost(rn.idx, q[0], q[1], 18);
  if (!t) return { fout: 'geen trein op de route ' + rn.route.name };
  const h0 = w.health;
  let minD = Infinity, hitAt = null;
  const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    if (t.v < 12) { t.v = 18; }
    for (const car of t.cars) minD = Math.min(minD, Math.hypot(car.x - p.x, car.y - p.y));
    if (w.health < h0 - 0.5 && !hitAt) hitAt = { na: Math.round(performance.now() - t0), z: +absZ().toFixed(2) };
    await sleep(100);
  }
  return { route: rn.route.name, dichtst: +minD.toFixed(1), geraakt: !!hitAt, geraaktOp: hitAt, gezondheid: [Math.round(h0), Math.round(w.health)], trein: { x: Math.round(t.cars[0].x), y: Math.round(t.cars[0].y), z: +(t.cars[0].z || 0).toFixed(2) } };
}

async function perronCheck(naamId, label) {
  const rows = (map.perrons || []).filter((r) => r.id === naamId || r.id.startsWith(naamId));
  const row = rows.find((r) => (r.r || []).length) || rows[0];
  if (!row) return { fout: 'geen perron ' + naamId, bekend: (map.perrons || []).map((r) => r.id) };
  const ramp = row.r[0];
  const out = { perron: row.id, bovenkant: row.p[0][3], trap: ramp.k, voet: ramp.b, boven: ramp.a };
  fixWorld();
  const a = Math.atan2(ramp.a[1] - ramp.b[1], ramp.a[0] - ramp.b[0]);
  // een paar meter voor de voet van de trap, kijkend de trap op
  const sx = ramp.b[0] - Math.cos(a) * 6, sy = ramp.b[1] - Math.sin(a) * 6;
  teleport(sx, sy);
  hold = { x: sx, y: sy, a, pin: true };
  w.camYaw = a;
  await sleep(SETTLE);
  teleport(sx, sy);
  await sleep(1500);
  out.startZ = +absZ().toFixed(2);
  await snap(label + '-voet');
  // lopen met de echte toets W; de hoek houdt de camera vast
  hold = { x: sx, y: sy, a, pin: false };
  key('keydown', 'w', 'KeyW');
  const samples = [];
  let maxZ = 0, shot = false, t0 = performance.now();
  const len = Math.hypot(ramp.b[0] - ramp.a[0], ramp.b[1] - ramp.a[1]) + 14;
  while (performance.now() - t0 < 40000) {
    await sleep(250);
    const z = absZ();
    maxZ = Math.max(maxZ, z);
    samples.push([Math.round(Math.hypot(p.x - sx, p.y - sy)), +z.toFixed(2)]);
    if (!shot && z > row.p[0][3] / 2) { shot = true; console.log('[capture] ' + label + '-trap'); await sleep(600); }
    if (Math.hypot(p.x - sx, p.y - sy) > len && z > row.p[0][3] - 0.2) break;
  }
  key('keyup', 'w', 'KeyW');
  await sleep(600);
  out.metHoogte = { eindZ: +absZ().toFixed(2), maxZ: +maxZ.toFixed(2), afstand: Math.round(Math.hypot(p.x - sx, p.y - sy)), samples: samples.filter((_, i) => i % 6 === 0) };
  out.opPerron = Math.abs(absZ() - row.p[0][3]) < 0.25;
  await snap(label + '-perron');
  // een trein langs het perron: wie op het perron staat wordt niet geraakt
  const rn = routeNear(p.x, p.y);
  out.spoorAfstand = rn ? +rn.d.toFixed(1) : null;
  if (rn) {
    hold = { x: p.x, y: p.y, a: p.angle, pin: true };
    setTimeout(() => console.log('[capture] ' + label + '-trein'), 9000);
    out.treinOpPerron = await treinLangs(rn, null);
    // aan de rand van het perron, het dichtst bij het spoor (0,4 m naar binnen), terwijl een trein langs rijdt
    let rand = null;
    for (let i = 0; i < row.p.length; i++) {
      const a = row.p[Math.max(0, i - 1)], b = row.p[Math.min(row.p.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hs = row.p[i][2] - 0.4;
      for (const sg of [1, -1]) {
        const x = row.p[i][0] + nx * hs * sg, y = row.p[i][1] + ny * hs * sg, r = routeNear(x, y);
        if (!rand || r.d < rand.r.d) rand = { x, y, z: row.p[i][3], r, dx, dy };
      }
    }
    if (rand) {
      teleport(rand.x, rand.y, rand.z);
      hold = { x: rand.x, y: rand.y, a: Math.atan2(rand.r.q[1] - rand.y, rand.r.q[0] - rand.x), pin: true };
      await sleep(1500);
      out.randStartZ = +absZ().toFixed(2);
      setTimeout(() => console.log('[capture] ' + label + '-rand'), 9500);
      out.treinOpRand = { afstandTotSpoor: +rand.r.d.toFixed(2), ...(await treinLangs(rand.r, null)) };
    }
    // en op het spoor zelf
    const q = RW.routePoint(rn.route, rn.s);
    teleport(q[0], q[1], absZ());
    hold = { x: q[0], y: q[1], a: p.angle, pin: true };
    await sleep(1200);
    out.spoorStartZ = +absZ().toFixed(2);
    w.health = 100;
    out.treinOpSpoor = await treinLangs(rn, null, 22);
  }
  hold = null;
  return out;
}

const CHECKS = [
  { id: 'noord', run: async () => {
    const [x, y] = [-582, -1173];
    teleport(x, y); hold = { x, y, a: 0, pin: true };
    return perronCheck('noord-1', 'noord');
  } },
  { id: 'europapark', run: async () => {
    const [x, y] = [1400, 1620];
    teleport(x, y); hold = { x, y, a: 0, pin: true };
    return perronCheck('europapark-1', 'europapark');
  } },
];

const results = {};
for (const C of CHECKS) {
  if (ONLY.length && !ONLY.includes(C.id)) continue;
  await leaveStart();
  const i0 = issues.length;
  let out;
  try { out = await C.run(); } catch (e) { out = { fout: String(e && e.stack || e).slice(0, 400) }; }
  results[C.id] = { ...out, meldingen: issues.slice(i0) };
  console.log('[ps-check] ' + C.id + ' ' + JSON.stringify(results[C.id]).slice(0, 2400));
}
hold = null; done = true; clearInterval(skipper);
console.error = origErr;
return JSON.stringify({ results, totaalMeldingen: issues.length });
