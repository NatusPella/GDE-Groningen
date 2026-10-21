// Page half van scripts/qa/route_beeld.mjs (desktop --perf-script body; #320).
// window.__rbCfg = { scen: [{ naam, van: [x, y], naar: [x, y], zoom }], settle } staat ervoor.
// Per scenario: de speler op het beginpunt (elk frame vastgezet), een doel op de kaart met de planmodus 'auto' (zoals een
// klik op de grote kaart), de lengte van de route, een beeld van de minimap en van de grote kaart over het hele traject.
const CFG = window.__rbCfg;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(200); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const DN = await imp('daynight');
const RT = await imp('routing');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[rb-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[rb-error] ' + e.reason); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let hold = null, done = false;
const tick = () => {
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; }
  w.clock = 13;
  if (DN.refreshDayNight) DN.refreshDayNight(w);
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};

const results = { css: [innerWidth, innerHeight], scen: [] };
RT.setRoutePrefs({ planMode: 'drive' });
for (const S of CFG.scen) {
  teleport(S.van[0], S.van[1]);
  hold = { x: S.van[0], y: S.van[1] };
  RT.setUserWaypoint(S.naar[0], S.naar[1], S.naam);
  await sleep(CFG.settle);
  const r = RT.getRoutes().find((q) => q.kind === 'user') || RT.getActiveRoute();
  const crow = Math.hypot(S.naar[0] - S.van[0], S.naar[1] - S.van[1]);
  results.scen.push({ naam: S.naam, route: r ? Math.round(r.length) : null, hemelsbreed: Math.round(crow), verhouding: r ? +(r.length / crow).toFixed(2) : null, punten: r ? r.pts.length : 0, mode: r && r.mode, compromis: r && r.compromise });
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  await sleep(1200);
  console.log('[capture] rb-' + S.naam + '-mini');
  await sleep(900);
  PM.openPauseMenu('map');
  await sleep(1500);
  MV.setMapView((S.van[0] + S.naar[0]) / 2, (S.van[1] + S.naar[1]) / 2, S.zoom);
  await sleep(CFG.mapSettle);
  console.log('[capture] rb-' + S.naam + '-kaart');
  await sleep(900);
  PM.closePauseMenu();
  await sleep(600);
  RT.clearUserWaypoint();
}
done = true;
clearInterval(skipper);
results.errors = errors;
return JSON.stringify(results);
