// Scenes for scripts/weer_shots.mjs (run by desktop --perf-script, one page
// per quality profile). Per spot the clock and the weather are forced and a
// "[capture] <name>" line is logged, which devtools.js turns into
// <out>/<profile>-<name>.png. Always summer; nothing here writes saves
// (the run uses a throwaway profile).
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
// forced weather: the hand path in weather.js (timer >= 1e8) keeps these values
const setWeather = (kind, intensity, overcast, mist) => {
  const k = w.weather;
  k.timer = 1e9; k.active = intensity > 0; k.kind = kind; k.peak = intensity; k.duration = 1e9; k.elapsed = 0;
  k.overcast = overcast; k.mist = mist; if (!intensity) k.intensity = 0;
};
// Hemelbeelden: camera laag (muis onderaan het scherm), vier kijkrichtingen, per moment van de dag; droog weer.
// De vaste plek kijkt tegen een wand, dus de kijkrichting wisselt per beeld. Namen: hemel-<uur>-<yaw>.
const setDroog = () => { const k = w.weather; k.timer = 1e9; k.active = false; k.kind = 'helder'; k.peak = 0; k.duration = 1e9; k.elapsed = 0; k.overcast = 0; k.mist = 0; k.intensity = 0; };
setDroog();
teleport(...P(100, 77));
D.input.mouse.y = 0;
const UREN = (window.__shotsOnly || '5.3,13,20.9,22,1').split(',').map(Number);
for (const uur of UREN) {
  w.clock = uur;
  for (const [i, yaw] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
    w.camYaw = yaw; p.angle = yaw;
    await sleep(i ? 1500 : 3000);
    console.log('[capture] hemel-' + uur + '-' + i); await sleep(600);
  }
}
clearInterval(skipper);
return 'ok';
