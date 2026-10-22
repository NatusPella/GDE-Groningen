// Scenes voor #402 (studentenfietsen). node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6b.js --only=studentenfietsen
// Basis: scripts/ui/shots_scenes_r39.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const VH = VEH;
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
const SH = await imp('shops');
const PIG = await imp('pigeonmode');
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];

const info = [];
let hold = null;

const keyEv = (ty, k, code) => { for (const tg of [window, document]) tg.dispatchEvent(new KeyboardEvent(ty, { key: k, code: code || k, bubbles: true })); };
const press = async (k, code, ms) => { keyEv('keydown', k, code); await sleep(ms); keyEv('keyup', k, code); };
const follow = async (name, dx, dy, dz, wait = 250) => {
  // a camera beside the player at the moment of the call
  const g = map.groundHeightAt ? map.groundHeightAt(p.x, p.y, 0) || 0 : 0;
  const pose = { position: { x: p.x + dx, y: p.y + dy, z: g + dz }, lookAt: { x: p.x, y: p.y, z: g + 0.9 }, cut: true };
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'vi-bew', duration: 30, priority: 9, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  done.push(name);
};

const settle = async () => { await sleep(1500); for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3000); await sleep(2500); };
// een vaste camera (geen volgcamera): positie en kijkpunt in wereldcoördinaten (z omhoog)
const pose = async (name, pos, at, wait = 300) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  cine.playCinematic({ id: 'sf-pose', duration: 30, priority: 9, shot: () => ({ position: pos, lookAt: at, cut: true }) });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(450);
  cine.skipCinematic();
  done.push(name);
};

// ---- #402: studentenfietsen: een rij bijna-gelijke fietsen met elk een andere staat ----
// node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_s6b.js --only=studentenfietsen --sizes=1280x720
if (want('studentenfietsen')) {
  clearInterval(skipper);
  w.clock = 14;
  const home = map.findOpenSpawn(100, 77, 80) || { x: 100, y: 77 };
  const staten = [
    ['nieuw', null],
    ['spatbord', { spatbord: true, licht: false, blauw: false, rammel: false }],
    ['zonderlicht', { spatbord: false, licht: true, blauw: false, rammel: false }],
    ['blauw', { spatbord: false, licht: false, blauw: true, rammel: false }],
    ['alles', { spatbord: true, licht: true, blauw: true, rammel: true }],
  ];
  const bikes = [];
  staten.forEach(([naam, st], i) => {
    const b = VH.makeTwoWheeler('bike', home.x + 4, home.y + i * 1.6, 0, null, () => 0.1);
    b.model = { ...b.model, color: '#6d7b86', rider: '#2f5c8a', ...(st ? { old: true, student: st } : {}) };
    b.parked = true;
    w.vehicles.push(b);
    bikes.push(b);
  });
  teleport(home.x, home.y - 4);
  await settle();
  // de speler en het gezelschap uit beeld; de camera staat vast
  const g = map.groundHeightAt ? map.groundHeightAt(home.x, home.y, 0) || 0 : 0;
  const bx = home.x + 4, by = home.y + 3.2;
  await pose('sf-rij', { x: bx + 6.5, y: by - 6.2, z: g + 2.0 }, { x: bx + 0.3, y: by, z: g + 0.7 }, 250);
  await pose('sf-rij-voor', { x: bx + 9, y: by, z: g + 1.4 }, { x: bx, y: by, z: g + 0.65 }, 250);
  // close-ups van het voorwiel: het spatbord, de lamp en de banden
  for (const [i, naam] of [[0, 'nieuw'], [1, 'spatbord'], [2, 'zonderlicht'], [3, 'blauw']]) {
    const b = bikes[i];
    await pose('sf-' + naam, { x: b.x + 2.0, y: b.y - 1.6, z: g + 0.8 }, { x: b.x + 0.5, y: b.y, z: g + 0.5 }, 150);
  }
  info.push('fietsen ' + bikes.map((b) => b.id + ':' + JSON.stringify((b.model.student && Object.keys(b.model.student).filter((k) => b.model.student[k]).join('+')) || 'nieuw')).join(' '));
  for (const b of bikes) { const i = w.vehicles.indexOf(b); if (i >= 0) w.vehicles.splice(i, 1); }
  done.push('studentenfietsen');
}


clearInterval(skipper);
return done.concat(info);
