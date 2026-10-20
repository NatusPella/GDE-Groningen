// Scenes voor missiemarkers en de doeltekst (#115 #293): node scripts/ui_shots.mjs --scenes=scripts/ui/markers2_scenes.js
// Basis: shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const GL = await imp('goal');
const info = [];
const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const loaded = async () => { for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(3500); };
const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
const place = (n) => idx && idx.global.places.find((q) => q.name === n);
if (want('markers')) {
  clearInterval(skipper);
  // open polder bij Garnwerd: de marker op 30, 120 en 400 m, dag, nacht en regen
  const pl = place('Garnwerd') || place('Winsum');
  const MX = pl.x + 200, MY = pl.y + 150;
  const ok = GL.setGoal({ kind: 'place', name: 'Marker', x: MX, y: MY });
  info.push('goal ' + ok);
  for (const [tag, clock, rain] of [['dag', 14, 0], ['nacht', 23, 0], ['regen', 14, 1]]) {
    for (const dist of [30, 120, 400]) {
      w.clock = clock;
      w.weather = { active: rain > 0, timer: 1e9, kind: rain ? 'regen' : 'helder', peak: rain, intensity: rain, wet: rain, overcast: rain };
      const a = -0.7;
      const hx = MX + Math.cos(a) * dist, hy = MY + Math.sin(a) * dist;
      teleport(hx, hy);
      const keep = setInterval(() => { p.x = hx; p.y = hy; p.vx = p.vy = 0; w.clock = clock; }, 50);
      await loaded();
      const g = gh(hx, hy);
      const pose = { position: { x: hx, y: hy, z: g + 1.8 }, lookAt: { x: MX, y: MY, z: g + 10 }, cut: true };
      if (cine.isCinematicActive()) cine.skipCinematic();
      cine.playCinematic({ id: 'vi-mark', duration: 60, priority: 9, shot: () => pose });
      await sleep(2200);
      console.log('[capture] marker-' + tag + '-' + dist);
      await sleep(500);
      cine.skipCinematic();
      clearInterval(keep);
      done.push('marker-' + tag + '-' + dist);
    }
  }
}
if (want('doel')) {
  // #293: een lang doel in de onderste HUD-regel op dit venster
  teleport(...P(100, 77));
  await loaded();
  const HP = await imp('hud_panel');
  const longTxt = ['Stap in de auto: de pinautomaat ligt aan de overkant van het kanaal', "Houd Oma's vrienden bij elkaar, anders rijdt Jelle weg met de limo", 'Wees eerder bij de sluis van Dorkwerd dan de andere boot'];
  for (const [n, t] of longTxt.entries()) {
    const el = document.querySelector('#hud .hud-mission-label');
    const box = document.querySelector('#hud .hud-mission');
    if (!el || !box) { info.push('geen doelblok'); break; }
    box.hidden = false; box.classList.add('in-mission'); box.style.opacity = 1; box.style.display = 'flex';
    el.textContent = t;
    await sleep(600);
    const r = el.getBoundingClientRect(), mm = document.querySelector('#hud .hud-minimap, #hud .hud-map');
    const m = mm && mm.getBoundingClientRect();
    info.push('doel' + n + ' h=' + Math.round(r.height) + ' regels=' + Math.round(r.height / 24) + ' afgekapt=' + (el.scrollHeight > el.clientHeight + 1) + ' naastmini=' + (m ? !(r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top) : '?'));
    await shot('doel-' + n, 300);
  }
  done.push('doel');
}
clearInterval(skipper);
return done.concat(info);
