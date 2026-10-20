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
const SPOTS = { stad: P(100, 77) };
const MOMENTEN = [['dag', 13], ['zonsopgang', 5.3], ['zonsondergang', 20.9], ['nacht', 1]];
const WEER = [['droog', 'helder', 0, 0, 0], ['bewolkt', 'bewolkt', 0, 0.8, 0], ['regen', 'regenbui', 0.6, 0.75, 0], ['mist', 'mist', 0, 0.3, 0.6], ['onweer', 'onweer', 0.85, 0.95, 0]];
const shot = async (name, wait) => { await sleep(wait); console.log('[capture] ' + name); await sleep(600); };
const done = [];
for (const [plek, [x, y]] of Object.entries(SPOTS)) {
  teleport(x, y);
  for (const [mNaam, uur] of MOMENTEN) {
    for (const [wNaam, kind, rain, over, mist] of WEER) {
      const naam = `${plek}-${mNaam}-${wNaam}`;
      if (!want(mNaam) && !want(wNaam) && ONLY.length) continue;
      w.clock = uur;
      setWeather(kind, rain, over, mist);
      // the ground gets wet in ~6 s, the rain eases in over ~9 s
      await shot(naam, rain ? 11000 : 3500);
      done.push(naam);
    }
  }
}
setWeather('helder', 0, 0, 0);
clearInterval(skipper);
return done.join(',');
