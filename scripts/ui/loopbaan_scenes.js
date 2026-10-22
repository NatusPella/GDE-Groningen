// Beelden van het Loopbaan-scherm en de melding bij een niveau omhoog (#381): node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/loopbaan_scenes.js
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
    const item = (window.__menuStart ? { click: () => window.__menuStart('doorgaan') } : null);
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
const info = [];
const A = D.achievements.loopbaan;
// a player who has done a bit of everything: different levels per trade
const geef = (vak, xp, n, uniek) => { A.tel(vak, { xp, n }); (uniek || []).forEach((u) => A.tel(vak, { uniek: u })); };
geef('trein', 330, 214, ['Haren', 'Zuidhorn', 'Winsum', 'Stadskanaal']);
geef('bus', 150, 61, ['lijn']);
geef('taxi', 70, 9, ['taxi']);
geef('bezorg', 560, 44, ['bezorger', 'vracht', 'melkrit']);
geef('padel', 960, 31, ['baan-1', 'baan-2', 'baan-3']);
geef('race', 60, 6, ['kart']);
geef('golf', 20, 2, []);
geef('kantoor', 12, 1, ['loket']);
await sleep(300);
teleport(...P(100, 77));
PM.openPauseMenu('loopbaan');
await shot('menu-loopbaan', 1500);
// another trade selected via its row
const kies = (id) => document.querySelector('#pause-menu [data-vak="' + id + '"]');
kies('padel').focus(); await shot('menu-loopbaan-padel', 800);
kies('bezorg').focus(); await shot('menu-loopbaan-bezorg', 800);
kies('lucht').focus(); await shot('menu-loopbaan-nul', 800);
PM.closePauseMenu();
await sleep(500);
// the card for a new level (bus: 150 -> 300 is level 4, the next step is level 5 at 560)
A.tel('bus', { xp: 160 });
await shot('niveau-omhoog', 900);
await sleep(5500);
A.tel('trein', { xp: 640 });
await shot('niveau-omhoog-spoor', 900);
clearInterval(skipper);
return ['loopbaan-scenes klaar', JSON.stringify(A.profiel().vakken.bus)];
