// Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
// window size). Each scene opens a screen and logs "[capture] <name>", which
// devtools.js turns into <out>/<size>-<name>.png. Nothing here writes saves:
// the run uses a throwaway profile.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  // a touch run taps the menu instead: the news panel of a fresh profile closes, 'Nieuw spel' is tapped
  if (/[?&]touch=1/.test(location.search)) {
    const news = document.querySelector('#start-screen .ss-news');
    if (news && !news.hidden) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })); } await sleep(500); }
    const item = [...document.querySelectorAll('#start-screen .ss-item')].find((e) => /Nieuw spel|Doorgaan/.test(e.textContent));
    if (item) item.click();
  }
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
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];
if (want('voet')) { teleport(...P(100, 77)); await shot('hud-voet', 4000); done.push('hud-voet'); }
if (want('gezocht')) { w.wanted = 3; await shot('hud-gezocht', 1500); w.wanted = 0; done.push('hud-gezocht'); }
// the player in a vehicle: speed, gear and revs only show with someone driving
const MOTO = await imp('motomodels');
const hudState = () => ({ inVehicle: !!p.inVehicle, speedo: !!document.querySelector('#hud .hud-speedo.visible'), speed: (document.querySelector('#hud .sp-val') || {}).textContent });
// a jump far away shows the loading screen first: wait until it is gone
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(1500); };
const ride = async (name, make, speed, at = P(100, 77), far = false) => {
  teleport(...at);
  const v = make();
  if (!v) { done.push(name + ':geen voertuig'); return; }
  v.road = null; v.perfTemp = true;
  w.vehicles.push(v);
  // a boat starts on its own water: the player goes there first
  p.x = v.x; p.y = v.y;
  p.enterVehicle(v, w);
  await (far ? settle() : sleep(600));
  // slow and held, so a two-wheeler does not run into a wall before the picture
  const hold = setInterval(() => { v.speed = speed; }, 50);
  await shot(name, 500);
  clearInterval(hold);
  done.push(name + ' ' + JSON.stringify(hudState()));
  p.exitVehicle(map, w);
  const k = w.vehicles.indexOf(v); if (k >= 0) w.vehicles.splice(k, 1);
};
const onRoad = (extra = {}) => () => {
  const pt = map.nearestRoadPoint(p.x, p.y, 60, true, true);
  return VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, extra.scooter || false, extra.model || null);
};
if (want('auto')) await ride('hud-auto', onRoad(), 14);
if (want('motor')) await ride('hud-motor', onRoad({ scooter: true, model: MOTO.MOTORBIKE_MODELS.sport }), 6);
if (want('boot')) {
  const poly = map.water && map.water.find((q) => q.bounds && q.bounds[2] - q.bounds[0] > 40);
  if (poly) await ride('hud-boot', () => VEH.spawnBoatOnWater(map, poly), 6, P(100, 77), true);
  else done.push('hud-boot:geen water');
}
if (want('trein')) {
  const RW = await imp('railway');
  const cab = (t) => RW.routePoint(t.route, t.c + (t.halfLen - 3));
  const standing = () => RW.getTrains().filter((q) => q.state === 'dwell' || q.state === 'parked');
  // the standing train nearest the city centre: go there, wait for the loading
  // screen, then board whichever standing train is nearest the player
  const c0 = P(100, 77);
  const first = standing().sort((a, b) => Math.hypot(...[0, 1].map((k) => cab(a)[k] - c0[k])) - Math.hypot(...[0, 1].map((k) => cab(b)[k] - c0[k])))[0];
  if (!first) done.push('hud-trein:geen trein');
  else {
    teleport(...cab(first));
    await settle();
    const t = standing().sort((a, b) => Math.hypot(cab(a)[0] - p.x, cab(a)[1] - p.y) - Math.hypot(cab(b)[0] - p.x, cab(b)[1] - p.y))[0];
    if (t) teleport(...cab(t));
    await sleep(400);
    const key = (ty, k, code) => { for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code, bubbles: true })); };
    key('keydown', 'e', 'KeyE'); key('keyup', 'e', 'KeyE');
    // gas for a moment: the speedo shows the speed, not a standing train
    key('keydown', 'w', 'KeyW');
    await shot('hud-trein', 4000);
    key('keyup', 'w', 'KeyW');
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
