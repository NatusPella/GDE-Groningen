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
// the player in a vehicle: speed, gear and revs only show with someone driving
const MOTO = await imp('motomodels');
const hudState = () => ({ inVehicle: !!p.inVehicle, speedo: !!document.querySelector('#hud .hud-speedo.visible'), speed: (document.querySelector('#hud .sp-val') || {}).textContent });
const ride = async (name, make, speed) => {
  teleport(...P(100, 77));
  const v = make();
  if (!v) { done.push(name + ':geen voertuig'); return; }
  v.road = null; v.perfTemp = true;
  w.vehicles.push(v);
  p.enterVehicle(v, w);
  await sleep(600);
  v.speed = speed;
  await shot(name, 1500);
  done.push(name + ' ' + JSON.stringify(hudState()));
  p.exitVehicle(map, w);
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
};
const onRoad = (extra = {}) => () => {
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  return VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, extra.scooter || false, extra.model || null);
};
if (want('auto')) await ride('hud-auto', onRoad(), 14);
if (want('motor')) await ride('hud-motor', onRoad({ scooter: true, model: MOTO.MOTORBIKE_MODELS.sport }), 14);
if (want('boot')) {
  const poly = map.water && map.water.find((q) => q.bounds && q.bounds[2] - q.bounds[0] > 40);
  if (poly) await ride('hud-boot', () => VEH.spawnBoatOnWater(map, poly), 6);
  else done.push('hud-boot:geen water');
}
if (want('trein')) {
  const RW = await imp('railway');
  const t = RW.getTrains().find((q) => q.state === 'dwell' || q.state === 'parked');
  if (!t) done.push('hud-trein:geen trein');
  else {
    const [x, y] = RW.routePoint(t.route, t.c + (t.halfLen - 3));
    teleport(x, y);
    await sleep(800);
    for (const ty of ['keydown', 'keyup']) for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: 'e', code: 'KeyE', bubbles: true }));
    await shot('hud-trein', 2500);
    done.push('hud-trein ' + JSON.stringify({ driving: !!w.trainDriving, speedo: !!document.querySelector('#hud .hud-speedo.visible') }));
  }
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
