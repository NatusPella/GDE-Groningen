// Bietenoogst (#393): de bijbaan met een scripted bot in Electron: node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/bietenoogst_scenes.js
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
// Stuntavond (#392): de uitleg, punten voor omverrijden en geen aftrek voor mensen, met een echte auto op het plein.
// Bietenoogst (#393): de bijbaan met een scripted "bot" die de rijen netjes rijdt, daarna naar de hoop rijdt, met beelden.
const SJ = D.sidejobs;
const RD = await imp('rdnew');
const BI = await imp('sidejob_bieten');
const [fx, fy] = RD.wgsToWorld(53.2336, 6.4977);
info.push('fabriek: ' + Math.round(fx) + ',' + Math.round(fy));
// a jump far away shows the loading screen first: wait until it is gone, then until the job has moved to Hoogkerk
teleport(fx, fy);
await sleep(2500);
for (let i = 0; i < 80 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500);
await sleep(4000);
for (let i = 0; i < 6; i++) {
  const rp = map.nearestRoadPoint(fx, fy, 1500, true);
  info.push('t' + i + ': speler ' + Math.round(p.x) + ',' + Math.round(p.y) + ' weg ' + (rp ? Math.round(rp.x) + ',' + Math.round(rp.y) : 'geen') + ' laden ' + !!document.querySelector('.ls.on:not(.out)'));
  await sleep(2500);
}
info.push('anchor nu: ' + JSON.stringify(BI.default.anchor(map)));
info.push('spots: ' + JSON.stringify(SJ.spots().filter((q) => ['bietenoogst', 'suikerbieten', 'balenrit'].includes(q.job.id)).map((q) => [q.job.id, Math.round(q.x), Math.round(q.y), !!q.fallback])));
let spot = null;
for (let i = 0; i < 60; i++) { spot = SJ.spots().find((s) => s.job.id === 'bietenoogst'); if (spot && !spot.fallback && Math.hypot(spot.x - fx, spot.y - fy) < 400) break; await sleep(1000); }
info.push('spot: ' + JSON.stringify(spot ? { x: Math.round(spot.x), y: Math.round(spot.y), fallback: !!spot.fallback } : null));
if (!spot) return ['bietenoogst staat niet in de spots', ...info];
const t0 = performance.now();
const gevonden = BI.vindAkker(map, spot);
info.push('vindAkker: ' + JSON.stringify(gevonden && { x: Math.round(gevonden.center.x), y: Math.round(gevonden.center.y), a: gevonden.angle, d: Math.round(Math.hypot(gevonden.center.x - spot.x, gevonden.center.y - spot.y)) }) + ' in ' + Math.round(performance.now() - t0) + ' ms');
teleport(spot.x, spot.y + 4);
await sleep(1500);
const ok = SJ.start('bietenoogst');
info.push('start: ' + ok);
await sleep(3500);
let c = SJ.ctx();
if (!c) return ['geen ctx na start', ...info];
const d = c.data;
if (!d.rijen) return ['geen akker in de ronde', ...info];
info.push('akker: ' + (d.rijen ? JSON.stringify(d.rijen.map((r) => [Math.round(r.ax), Math.round(r.ay), Math.round(r.bx), Math.round(r.by)])) : 'geen') + ' van de hoop ' + (d.rijen ? Math.round(Math.hypot(d.rijen[0].ax - c.spot.x, d.rijen[0].ay - c.spot.y)) : '-') + ' m');
const v = c.vehicle;
p.x = v.x; p.y = v.y; p.enterVehicle(v, w);
await sleep(600);
await shot('bieten-start', 600);
// the "bot": move the tractor kinematically along a path at a given speed (the rules read position, speed and turn rate)
const drive = (pts, speed) => new Promise((res) => {
  let i = 0;
  const iv = setInterval(() => {
    const t = pts[i];
    if (!t) { clearInterval(iv); v.speed = 0; res(); return; }
    const dx = t.x - v.x, dy = t.y - v.y, dd = Math.hypot(dx, dy);
    const step = speed * 0.05;
    if (dd <= step) { v.x = t.x; v.y = t.y; i++; return; }
    v.angle = Math.atan2(dy, dx); v.x += dx / dd * step; v.y += dy / dd * step; v.speed = speed; v.vx = dx / dd * speed; v.vy = dy / dd * speed;
    p.x = v.x; p.y = v.y;
  }, 50);
});
const rij = (r) => { const pts = []; for (let a = 0; a <= r.len; a += 4) pts.push({ x: r.ax + r.ux * a, y: r.ay + r.uy * a }); return pts; };
const rows = d.rijen;
let first = true;
for (let k = 0; k < rows.length; k++) {
  // to the start of the row (headland), then along it
  v.x = rows[k].ax - rows[k].ux * 6; v.y = rows[k].ay - rows[k].uy * 6; v.angle = Math.atan2(rows[k].uy, rows[k].ux); p.x = v.x; p.y = v.y;
  await sleep(300);
  const run = drive(rij(rows[k]), 4.5);
  if (k === 1) { await sleep(9000); await shot('bieten-rooien', 200); }
  await run;
  info.push('rij ' + (k + 1) + ': gezond ' + Math.round(v.health) + ' wrak ' + !!v.wrecked + ' uit ' + !!v.disabled + ', fase ' + c.data.ronde.phase + ' geoogst ' + Math.round((c.data.ronde.geoogst / (c.data.ronde.rijen * c.data.ronde.len)) * 100) + '%');
  if (!SJ.ctx()) break;
}
await sleep(500);
await shot('bieten-gerooid', 300);
c = SJ.ctx();
if (c && c.data.ronde && c.data.ronde.phase === 'rijden') {
  // the last stretch to the hoop on the road (the straight line over the polder would cross ditches: that is the bot's problem, not the game's)
  const hoop = c.data.hoop;
  const rp = map.nearestRoadPoint(hoop.x + 30, hoop.y, 80, true) || hoop;
  v.x = rp.x; v.y = rp.y; v.angle = Math.atan2(hoop.y - rp.y, hoop.x - rp.x); p.x = v.x; p.y = v.y;
  await sleep(500);
  const n = Math.max(1, Math.ceil(Math.hypot(hoop.x - v.x, hoop.y - v.y) / 4));
  const from = { x: v.x, y: v.y };
  const pts = []; for (let i = 1; i <= n; i++) pts.push({ x: from.x + (hoop.x - from.x) * i / n, y: from.y + (hoop.y - from.y) * i / n });
  await drive(pts, 8);
  v.speed = 0; v.vx = 0; v.vy = 0;
  await sleep(1500);
}
info.push('einde: ctx ' + !!SJ.ctx() + ', laatste ' + JSON.stringify(SJ.last()));
await shot('bieten-klaar', 1200);
const A = D.achievements.loopbaan;
info.push('loopbaan landbouw: ' + JSON.stringify(A.profiel().vakken.landbouw));
clearInterval(skipper);
return ['bieten-scenes klaar', ...info];
