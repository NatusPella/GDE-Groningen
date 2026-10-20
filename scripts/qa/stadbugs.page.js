// Page half of scripts/qa/stadbugs.mjs (desktop --perf-script body): beelden en metingen op losse plekken van de stad
// voor de door een tester gemelde bugs (#323 t/m #335). window.__sb = { settle, spots: [{ naam, x, y, a, views, eval }] }.
//   views: [{ n, p: [x, y, hoogte boven de grond], l: [x, y, hoogte boven de grond] }] (absolute spelcoordinaten)
//   eval: een async functietekst (w, map, imp) => json, uitgevoerd nadat de plek geladen is; het resultaat gaat in de uitvoer.
// Elke keydown wordt gevolgd door een keyup (er worden hier geen toetsen gedrukt).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const CFG = window.__sb;
const SETTLE = CFG.settle || 7000;
let ownShot = false;
const skipper = setInterval(() => { if (!ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
const origErr = console.error.bind(console);
console.error = (...a) => { errors.push('console.error: ' + a.map(String).join(' ').slice(0, 200)); origErr(...a); };
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(x, y);
};
let hold = null, done = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = CFG.clock || 14; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = CFG.clock || 14;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const go = async (x, y, a, settle) => {
  fixWorld(); teleport(x, y); hold = { x, y, a };
  await sleep(settle * 0.6); teleport(x, y); fixWorld(); await sleep(settle * 0.4);
};
const shot = async (name, pose, wait = 2200) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true;
  cine.playCinematic({ id: 'sb-view', duration: 60, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(500);
  cine.skipCinematic();
  ownShot = false;
};
const results = {};
for (const S of CFG.spots) {
  const info = {};
  try {
    await go(S.x, S.y, S.a || 0, SETTLE);
    for (const v of S.views || []) {
      const g = gh(v.p[0], v.p[1]), gl = gh(v.l[0], v.l[1]);
      if (v.go) await go(v.go[0], v.go[1], S.a || 0, 3000);
      await shot(S.naam + '-' + v.n, { position: { x: v.p[0], y: v.p[1], z: g + v.p[2] }, lookAt: { x: v.l[0], y: v.l[1], z: gl + v.l[2] }, cut: true }, v.wait || 2200);
    }
    if (S.eval) {
      const fn = new Function('w', 'map', 'imp', 'sleep', 'go', 'shot', 'return (' + S.eval + ')(w, map, imp, sleep, go, shot);');
      info.eval = await fn(w, map, imp, sleep, go, shot);
    }
  } catch (err) { info.error = String(err && err.stack || err).slice(0, 400); }
  results[S.naam] = info;
  console.log('[sb-spot] ' + S.naam + ' ' + JSON.stringify(info).slice(0, 3000));
}
done = true; clearInterval(skipper);
return JSON.stringify({ results, errors: errors.slice(0, 30) });
