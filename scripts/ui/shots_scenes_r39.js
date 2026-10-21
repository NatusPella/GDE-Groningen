// Scenes voor de wensen-ronde (#156 winkelgevels per type, #160 busbord, #207 bewegingen, #180 missiekaart): node scripts/ui_shots.mjs --scenes=scripts/ui/shots_scenes_r39.js --only=winkels
// Basis: scripts/ui/shots_scenes.js. Scenes for scripts/ui_shots.mjs (run by desktop --perf-script, one page per
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
const SH = await imp('shops');
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];

const info = [];
if (want('winkels')) {
  // #156: per winkeltype een echte plek uit de data; de gevel van voren (b.shopFront, gezet door models3d_buildings) en de ruit
  const SS = await imp('shopspots');
  const FACM = await imp('facilities');
  const WK = await imp('winkelkit');
  const spots = SS.spotsFrom(FACM.FAC.all, SH.getShopsForRender());
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const only = (window.__shotsTypes || '').split(',').filter(Boolean);
  clearInterval(skipper);
  w.clock = 14;
  let hold = null;
  const keep = setInterval(() => { if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } w.clock = 14; if (cine.isCinematicActive() && !hold) cine.skipCinematic(); }, 50);
  for (const type of WK.SHOP_KINDS.filter((k) => k !== 'kermiskraam' && (!only.length || only.includes(k)))) {
    const cand = spots.filter((s) => s.type === type);
    info.push('winkels ' + type + ': ' + cand.length + ' plekken');
    let found = null;
    for (const s of cand.slice(0, 30)) {
      const bs = map.buildingsNear(s.x, s.y, 8).filter((b) => b.pts && b.pts.length >= 3 && !b.landmark && SS.shopTypeFor(b.pts.map((q) => [q[0], q[1]]), null, 4) === type);
      if (!bs.length) continue;
      hold = { x: s.x, y: s.y };
      teleport(s.x, s.y);
      for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
      await sleep(2500);
      for (const b of bs) if (b.shopFront && b.shopFront.poi === type) { found = { s, b, f: b.shopFront }; break; }
      info.push('  kandidaat @' + Math.round(s.x) + ',' + Math.round(s.y) + ' panden ' + bs.length + ' voorgevel ' + bs.map((b) => (b.shopFront ? b.shopFront.poi || 'rank' : String(b.shopFront))).join('/'));
      if (found) break;
    }
    if (!found) { info.push('winkels ' + type + ': geen gevel met dit type gebouwd'); continue; }
    const f = found.f, mx = (f.ax + f.bx) / 2, my = (f.ay + f.by) / 2;
    const cx = mx + f.nx * 8, cy = my + f.ny * 8;
    hold = { x: cx, y: cy };
    teleport(cx, cy);
    await sleep(2500);
    const g = gh(mx, my);
    const pose = { position: { x: cx, y: cy, z: g + 2.2 }, lookAt: { x: mx, y: my, z: g + 1.8 }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-winkel', duration: 60, priority: 9, shot: () => pose });
    await sleep(2400);
    console.log('[capture] winkel-' + type);
    await sleep(600);
    cine.skipCinematic();
    info.push('winkel ' + type + ' @' + Math.round(mx) + ',' + Math.round(my));
    done.push('winkel-' + type);
  }
  clearInterval(keep);
}
clearInterval(skipper);
return done.concat(info);
