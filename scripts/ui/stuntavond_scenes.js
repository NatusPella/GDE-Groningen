// Stuntavond (#392): de korte uitleg, punten voor omverrijden en geen aftrek voor mensen, met een echte auto: node scripts/ui_shots.mjs --sizes=1920x1080 --scenes=scripts/ui/stuntavond_scenes.js
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
const SU = await imp('stuntavond');
const BK = await imp('breakables');
const OR = await imp('omverrules');
const center = { x: 168.69, y: 70.04 };
teleport(center.x, center.y);
await sleep(2500);
SU.startStunt(w, { center, radius: 46, target: 1500 });
let dtLast = performance.now();
const tick = setInterval(() => { const n = performance.now(); SU.updateStunt(Math.min(0.1, (n - dtLast) / 1000), w, 240); dtLast = n; }, 50);
await shot('stunt-uitleg', 1500);
// a car for the player
const pt = map.nearestRoadPoint(p.x, p.y, 80, true, true);
const car = VEH.spawnVehicleOnRoad(map, pt.road, false, Math.random, false, false, pt, false, null);
car.road = null; car.perfTemp = true;
w.vehicles.push(car);
p.x = car.x; p.y = car.y;
p.enterVehicle(car, w);
const status = () => SU.stuntStatus();
{ // why do the evening's own props not stand? count the open spots like startStunt does
  let openN = 0, bldN = 0, spotN = 0, nSpot = 0;
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * 6.28, r = 6 + Math.random() * 38, x = center.x + Math.cos(a) * r, y = center.y + Math.sin(a) * r;
    const sp = !map.isOpenSpot || map.isOpenSpot(x, y); const bl = map.buildingsNear(x, y, 0.8).length;
    if (sp) spotN++; if (bl) bldN++; if (sp && !bl) openN++; nSpot += map.isOpenSpot ? 1 : 0;
  }
  info.push('open-spots: ' + JSON.stringify({ isOpenSpotBestaat: !!map.isOpenSpot, spot: spotN, gebouw: bldN, open: openN, props: status().props }));
}
const ram = async (pr) => {
  const ang = Math.atan2(pr.y - center.y, pr.x - center.x) + 0.0;
  const a = Math.random() * 6.28;
  car.x = pr.x - Math.cos(a) * 9; car.y = pr.y - Math.sin(a) * 9; car.angle = a; car.speed = 12; car.vx = Math.cos(a) * 12; car.vy = Math.sin(a) * 12;
  p.x = car.x; p.y = car.y;
  const hold = setInterval(() => { car.speed = 12; }, 40);
  await sleep(1600);
  clearInterval(hold);
};
const kinds = (list) => list.filter((q) => q.cell);
const near = BK.propsInRadius(center.x, center.y, 44);
const stuntProps = near.filter((q) => String(q.key).startsWith('stunt'));
const worldProps = near.filter((q) => !String(q.key).startsWith('stunt') && OR.stuntPunten(q.kind));
info.push('props: stunt ' + stuntProps.length + ', van de stad ' + worldProps.length + ' (' + [...new Set(worldProps.map((q) => q.kind))].join(',') + ')');
const log = [];
const s0 = status().score;
for (const pr of stuntProps.slice(0, 3)) { const b = status().score; await ram(pr); log.push('stuntprop ' + pr.kind + ': ' + b + ' -> ' + status().score); }
await shot('stunt-punten', 200);
for (const pr of worldProps.slice(0, 3)) { const b = status().score; await ram(pr); log.push('stadsprop ' + pr.kind + ': ' + b + ' -> ' + status().score + ' (' + (OR.stuntPunten(pr.kind) || {}).pts + ' verwacht)'); }
// a person right in front of the car: no points off
const ped = (w.pedestrians || []).find((q) => q.state !== 'dead') || null;
if (ped) {
  const b = status().score;
  const a = 0.4;
  car.x = center.x + 10; car.y = center.y + 10; car.angle = a; car.speed = 10; p.x = car.x; p.y = car.y;
  ped.x = car.x + Math.cos(a) * 6; ped.y = car.y + Math.sin(a) * 6;
  const hold = setInterval(() => { car.speed = 10; }, 40);
  await sleep(1800);
  clearInterval(hold);
  log.push('mens geraakt: ' + b + ' -> ' + status().score + ', gezondheid ' + Math.round(ped.health) + ', staat ' + ped.state);
} else log.push('geen voetganger');
await shot('stunt-hud', 300);
clearInterval(tick);
SU.stopStunt(w);
// outside the mission: a few euros for a bin or a chair, capped
const m0 = w.money;
const stad = BK.propsInRadius(p.x, p.y, 60).filter((q) => OR.OMVER_EURO[q.kind]);
log.push('buiten de missie: ' + stad.length + ' dingen, geld ' + m0);
for (const pr of stad.slice(0, 3)) { const b = w.money; await ram(pr); log.push('stad ' + pr.kind + ': geld ' + b + ' -> ' + w.money); }
await shot('stad-omver', 300);
clearInterval(skipper);
return ['stunt-scenes klaar', ...info, ...log, 's0 ' + s0];
