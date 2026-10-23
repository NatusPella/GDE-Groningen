// Eigen boerderij (#415): een hele cyclus met een scripted bot in Electron: node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/boerderij_scenes.js
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

// Eigen boerderij (#415): een hele cyclus met een scripted bot: ploegen, zaaien, bemesten, groeien (speltijd), oogsten, afleveren.
for (let i = 0; i < 60 && !(D.sidejobs && D.boerderij); i++) await sleep(500);
const SJ = D.sidejobs;
const RD = await imp('rdnew');
const BR = D.boerderij;
const [fx, fy] = RD.wgsToWorld(53.2336, 6.4977);
teleport(fx, fy);
await sleep(2500);
for (let i = 0; i < 80 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
await sleep(4000);
let spot = null;
for (let i = 0; i < 60; i++) { spot = SJ.spots().find((s) => s.job.id === 'boerderij'); if (spot && !spot.fallback && Math.hypot(spot.x - fx, spot.y - fy) < 400) break; await sleep(1000); }
info.push('spot: ' + JSON.stringify(spot ? { x: Math.round(spot.x), y: Math.round(spot.y), fallback: !!spot.fallback } : null) + ' geld ' + Math.round(w.money));
if (!spot) return ['boerderij staat niet in de spots', ...info];
w.money = Math.max(w.money, 1500);
BR.kies('bieten');
teleport(spot.x, spot.y + 4);
await sleep(1500);

const drive = (v, pts, speed) => new Promise((res) => {
  let i = 0;
  const iv = setInterval(() => {
    const t = pts[i];
    if (!t) { clearInterval(iv); v.speed = 0; v.vx = 0; v.vy = 0; res(); return; }
    const dx = t.x - v.x, dy = t.y - v.y, dd = Math.hypot(dx, dy);
    const step = speed * 0.05;
    if (dd <= step) { v.x = t.x; v.y = t.y; i++; return; }
    v.angle = Math.atan2(dy, dx); v.x += dx / dd * step; v.y += dy / dd * step; v.speed = speed; v.vx = dx / dd * speed; v.vy = dy / dd * speed;
    p.x = v.x; p.y = v.y;
  }, 50);
});
const rijPunten = (r) => { const pts = []; for (let a = 0; a <= r.len; a += 4) pts.push({ x: r.ax + r.ux * a, y: r.ay + r.uy * a }); return pts; };
const log = [];
let entered = false;
// one shift: the bot does every round it gets until the shift ends (the job quits when there is nothing to do)
const werkDienst = async (naam, shots = [], max = 8) => {
  w.clock = 11; // a sunny working day for the pictures (the bot is slow)
  if (p.inVehicle) p.exitVehicle(map, w);
  entered = false;
  teleport(spot.x, spot.y + 4);
  await sleep(1000);
  const ok = SJ.start('boerderij');
  log.push(naam + ': start ' + ok);
  if (!ok) return;
  await sleep(2500);
  let c = SJ.ctx();
  const v = c && c.vehicle;
  if (!c) { log.push(naam + ': geen ctx (' + JSON.stringify(SJ.last()) + ')'); return; }
  if (!entered || p.inVehicle !== v) { p.x = v.x; p.y = v.y; p.enterVehicle(v, w); entered = true; await sleep(500); }
  let laatste = null;
  for (let ronde = 0; ronde < max; ronde++) {
    // wait for a new round
    let t = 0;
    while (SJ.ctx() && (!SJ.ctx().data.ronde || SJ.ctx().data.ronde === laatste) && t < 60) { await sleep(500); t++; }
    c = SJ.ctx();
    if (!c || !c.data.ronde) break;
    const d = c.data, s = d.ronde;
    laatste = s;
    const taak = d.taak;
    log.push(naam + ': ronde ' + (ronde + 1) + ' ' + taak + ' geld ' + Math.round(w.money));
    if (s.soort === 'rijen') {
      for (let k = 0; k < d.rijen.length; k++) {
        const r = d.rijen[k];
        v.x = r.ax - r.ux * 6; v.y = r.ay - r.uy * 6; v.angle = Math.atan2(r.uy, r.ux); p.x = v.x; p.y = v.y;
        await sleep(250);
        const run = drive(v, rijPunten(r), 4.2);
        if (k === 1 && shots.includes(taak)) { await sleep(9000); await shot('boerderij-' + taak, 200); }
        await run;
        if (!SJ.ctx() || SJ.ctx().data.ronde !== s) break;
      }
    } else {
      // load at the field, then to the hoop
      const pc = BR.get().perceel;
      v.x = pc.x + 12; v.y = pc.y + 12; v.speed = 0; p.x = v.x; p.y = v.y;
      await sleep(4500);
      const hoop = d.hoop;
      const rp = c.world.map.nearestRoadPoint(hoop.x + 30, hoop.y, 80, true) || hoop;
      v.x = rp.x; v.y = rp.y; v.angle = Math.atan2(hoop.y - rp.y, hoop.x - rp.x); p.x = v.x; p.y = v.y;
      await sleep(500);
      const n = Math.max(1, Math.ceil(Math.hypot(hoop.x - v.x, hoop.y - v.y) / 4));
      const from = { x: v.x, y: v.y }, pts = [];
      for (let i = 1; i <= n; i++) pts.push({ x: from.x + (hoop.x - from.x) * i / n, y: from.y + (hoop.y - from.y) * i / n });
      await drive(v, pts, 8);
      await sleep(1200);
    }
    const b = BR.get();
    log.push(naam + ': na ' + taak + ': fase ' + b.veld.fase + ' gewas ' + b.veld.gewas + ' schuur ' + b.schuur.kg + ' geld ' + Math.round(w.money));
  }
  await sleep(2500);
  log.push(naam + ': einde, ctx ' + !!SJ.ctx() + ' laatste ' + JSON.stringify(SJ.last()));
  if (SJ.ctx()) SJ.quit();
  await sleep(1500);
};
await werkDienst('dienst 1 (ploegen, zaaien, bemesten)', ['ploegen'], 4);
await shot('boerderij-groeit', 800);
BR.tik(60);
log.push('speltijd +60 uur: fase ' + BR.get().veld.fase);
await sleep(6000);
await werkDienst('dienst 2 (oogsten, afleveren)', ['oogsten'], 2);
await shot('boerderij-klaar', 800);
const menu = async (sec) => { PM.openPauseMenu('boerderij'); await sleep(1200); const el = document.querySelector('#pause-menu [data-bd="' + sec + '"]'); if (el) el.focus(); await shot('boerderij-menu-' + sec, 700); };
if (p.inVehicle) p.exitVehicle(map, w);
for (const sec of ['perceel', 'gewas', 'machines', 'kas']) await menu(sec);
PM.closePauseMenu();
const b = BR.get();
log.push('kasboek: ' + JSON.stringify(b.totaal) + ' geld ' + Math.round(w.money));
const A = D.achievements.loopbaan;
log.push('loopbaan landbouw: ' + JSON.stringify(A.profiel().vakken.landbouw));
clearInterval(skipper);
return ['boerderij-scenes klaar', ...info, ...log];
