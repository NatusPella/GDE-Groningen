// Het stadswater uit de OSM-tegelbouw (STAD_LAAG=water, #90) in beeld: de speler staat op vaste waterplekken
// met een camera van boven; per plek een schermafdruk ('[capture] <naam>') en wat de wereld zegt over water en grond.
// Draaien (na `npm run stage` met STAD_LAAG=water, in desktop/):
//   GDE_TEST_PROFILE=gde-test-stadwater ./node_modules/.bin/electron . --windowed --stil --window-size=1600x900 --smoke-test=<png> --perf-script=<dit bestand> --bench-eval=scripts/perf/hook.js
const H = window.__perfHook;
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await new Promise((res) => setTimeout(res, 700));
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const cine = await import('/js/cinematics.js');
const PM = await import('/js/pausemenu.js');
const DN = await import('/js/daynight.js');
let done = false;
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
let hold = null;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.1;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = 14; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const SPOTS = [
  ['kardingerplas', 2480, -2024], ['springervijver', -1600, 2236], ['vijver-centrum', -670, -14],
  ['kanaal-oost', 3380, -914], ['diepenring', 1880, -854], ['sloot-zuid', 1340, -2054],
];
const out = {};
for (const [name, x, y] of SPOTS) {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  hold = { x, y, a: 0.6 };
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
  await sleep(9000);
  const near = map.waterNear ? map.waterNear(x, y, 60).length : -1;
  out[name] = { at: [x, y], wet: !!(map.isWater && map.isWater(x, y)), polys: near, h: map.groundHeightAt ? map.groundHeightAt(x, y, 0) : null };
  console.log('[capture] ' + name);
  await sleep(600);
}
done = true; clearInterval(skipper); hold = null;
console.log('[stadwater]', JSON.stringify(out));
