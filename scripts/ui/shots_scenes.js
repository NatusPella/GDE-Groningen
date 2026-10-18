// Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
// window size). Each scene opens a screen and logs "[capture] <name>", which
// devtools.js turns into <out>/<size>-<name>.png. Nothing here writes saves:
// the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(2500);
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); }
    await sleep(700);
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await imp('cinematics');
const VEH = await imp('vehicle');
const PM = await imp('pausemenu');
const { P = (x, y) => [x, y] } = await imp('worldframe').catch(() => ({}));
const ONLY = (window.__shotsOnly || '').split(',').filter(Boolean);
const want = (n) => !ONLY.length || ONLY.includes(n);
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const done = [];
if (want('voet')) { teleport(...P(100, 77)); await shot('hud-voet', 4000); done.push('hud-voet'); }
if (want('gezocht')) { w.wanted = 3; await shot('hud-gezocht', 1500); w.wanted = 0; done.push('hud-gezocht'); }
if (want('auto')) {
  teleport(...P(100, 77));
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  const v = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt);
  v.road = null; v.speed = 0; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  await shot('hud-auto', 2500);
  p.exitVehicle(map, w);
  done.push('hud-auto');
}
for (const tab of ['overzicht', 'todo', 'map', 'telefoon', 'verhaal', 'spullen', 'garage', 'prestaties', 'settings', 'controls']) {
  if (!want(tab)) continue;
  teleport(...P(100, 77));
  PM.openPauseMenu(tab);
  await shot('menu-' + tab, 1500);
  PM.closePauseMenu();
  done.push('menu-' + tab);
}
clearInterval(skipper);
return done;
