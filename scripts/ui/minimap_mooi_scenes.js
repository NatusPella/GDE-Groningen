// Scenes voor de minimap (23-11, "de minimap mag strakker en mooier"): voor- en nabeelden van alleen de minimap.
//   node scripts/ui_shots.mjs --scenes=scripts/ui/minimap_mooi_scenes.js --sizes=1920x1080 --out=<map>
// Basis: kaarticons_scenes.js. Elke scene logt "[capture] <naam>" (devtools.js maakt er <out>/<maat>-<naam>.png van)
// en geeft de plek van de minimapcanvas terug (rect in CSS-px, backing in apparaatpixels), zodat een vergelijkingspagina
// het kaartje kan uitsnijden. Er wordt niets opgeslagen: de run gebruikt een wegwerpprofiel.
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
const R = await imp('routing');
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
const loaded = async () => { for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(5000); };
const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
const place = (n) => idx && idx.global.places.find((q) => q.name === n);
const done = [`viewport ${innerWidth}x${innerHeight} dpr ${devicePixelRatio} ui ${getComputedStyle(document.documentElement).getPropertyValue('--ui')}`];
// [naam, plaats (null = de binnenstad), uur, routepunt (dx, dy in meters of null)]
const SCENES = [
  ['stad-dag', null, 14, [320, -180]],
  ['stad-nacht', null, 23, [320, -180]],
  ['stad-dichtbij', null, 14, [60, -40]],
  ['dorp-dag', 'Winsum', 14, null],
];
for (const [tag, name, clock, wpt] of SCENES) {
  if (!want(tag)) continue;
  const pl = name ? place(name) : null;
  const [x, y] = pl ? [pl.x, pl.y] : P(100, 77);
  w.clock = clock;
  teleport(x, y);
  if (wpt) R.setUserWaypoint(x + wpt[0], y + wpt[1], 'Proefpunt'); else R.clearUserWaypoint();
  const keep = setInterval(() => { w.clock = clock; p.x = x; p.y = y; p.vx = p.vy = 0; }, 100);
  await sleep(1500); // het laadscherm verschijnt pas na de sprong
  await loaded();
  await shot('mm-' + tag, 1500);
  const c = document.querySelector('#hud .hud-minimap-wrap canvas');
  const r = c ? c.getBoundingClientRect() : null;
  done.push('rect ' + tag + ' ' + JSON.stringify(r ? { x: r.x, y: r.y, w: r.width, h: r.height, bw: c.width, bh: c.height } : null));
  clearInterval(keep);
}
R.clearUserWaypoint();
// 'meet' (alleen met --flags=hitch=1): wat de minimap per beeld kost terwijl je 8 s door de binnenstad schuift (hitchprobe, hud:minimap)
if (want('meet') && window.__hitch) {
  window.__perfHudMarks = true;
  const [x0, y0] = P(100, 77);
  teleport(x0, y0);
  await sleep(1500);
  await loaded();
  await sleep(2000);
  window.__hitch.reset();
  const t0 = performance.now();
  const mover = setInterval(() => { p.x = x0 + ((performance.now() - t0) / 1000) * 8; p.y = y0; p.vx = p.vy = 0; }, 16);
  await sleep(8000);
  clearInterval(mover);
  const s = window.__hitch.summary();
  done.push('meet ' + JSON.stringify({ minimapMsPerBeeld: s.sections['hud:minimap'], hudBasis: s.sections['hud:base'], frame: s.sections.frame, p50: s.p50, p95: s.p95, piekMinimap: s.peaks['hud:minimap'] || null, beelden: s.frames }));
}
clearInterval(skipper);
return done;
