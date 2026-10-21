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
  // #156: per winkeltype een echte plek uit de data, de gevel van voren (langste voorgevel) en de ruit
  const SS = await imp('shopspots');
  const FACM = await imp('facilities');
  const WK = await imp('winkelkit');
  const spots = SS.spotsFrom(FACM.FAC.all, SH.getShopsForRender()).map((s, i) => ({ ...s, i }));
  const pointIn = (x, y, ring) => { let ins = false; for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) { const [xi, yi] = ring[a], [xj, yj] = ring[b]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
  const want13 = WK.SHOP_KINDS.filter((t) => t !== 'kermiskraam');
  for (const type of want13) {
    const cand = spots.filter((s) => s.type === type);
    info.push('winkels ' + type + ': ' + cand.length + ' plekken');
    let hit = null;
    for (const s of cand.slice(0, 40)) {
      const bs = map.buildingsNear(s.x, s.y, 8).filter((b) => b.pts && b.pts.length >= 3 && !b.landmark);
      for (const b of bs) {
        if (SS.shopTypeFor(b.pts.map((q) => [q[0], q[1]]), null, 4) !== type) continue;
        let best = null;
        for (let k = 0; k < b.pts.length; k++) {
          const a = b.pts[k], c = b.pts[(k + 1) % b.pts.length];
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          if (len < 4) continue;
          const mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2;
          const nx = (c[1] - a[1]) / len, ny = -(c[0] - a[0]) / len;
          for (const sg of [1, -1]) {
            const cx = mx + nx * sg * 9, cy = my + ny * sg * 9;
            if (pointIn(cx, cy, b.pts)) continue;
            // the camera must stand free: not inside another building
            if (map.buildingsNear(cx, cy, 1.5).some((q) => q !== b && q.pts && pointIn(cx, cy, q.pts))) continue;
            // nearest to the spot
            const d = Math.hypot(mx - s.x, my - s.y) - len * 0.5;
            if (!best || d < best.d) best = { d, mx, my, cx, cy };
          }
        }
        if (best) { hit = { s, b, ...best }; break; }
      }
      if (hit) break;
    }
    if (!hit) { info.push('winkels ' + type + ': geen pand gevonden'); continue; }
    clearInterval(skipper);
    w.clock = 14;
    const hold = { x: hit.cx, y: hit.cy };
    teleport(hit.cx, hit.cy);
    for (let i = 0; i < 40 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
    const keep = setInterval(() => { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; w.clock = 14; }, 50);
    await sleep(4000);
    const g = gh(hit.mx, hit.my);
    const pose = { position: { x: hit.cx, y: hit.cy, z: g + 2.0 }, lookAt: { x: hit.mx, y: hit.my, z: g + 1.6 }, cut: true };
    if (cine.isCinematicActive()) cine.skipCinematic();
    cine.playCinematic({ id: 'vi-winkel', duration: 60, priority: 9, shot: () => pose });
    await sleep(2400);
    console.log('[capture] winkel-' + type);
    await sleep(600);
    cine.skipCinematic();
    clearInterval(keep);
    info.push('winkel ' + type + ' @' + Math.round(hit.mx) + ',' + Math.round(hit.my));
    done.push('winkel-' + type);
  }
}
clearInterval(skipper);
return done.concat(info);
