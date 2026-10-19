// Scenes for scripts/ui_shots.mjs --scenes=...: de weilandranden en het labyrint (#124 #210 #231 #233), headless.
// De kaart bij de Waddenzee, de Eems en de Dollard (geen procedureel slotenraster meer), een weiland langs spoor en weg,
// en een sloot die een weg kruist. window.__randenSpots = { rail: [x, y, hoek], sloot: [x, y, hoek] } komt van de aanroeper.
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
const PM = await imp('pausemenu');
const MV = await imp('mapview');
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
const settle = async () => { await sleep(1500); for (let i = 0; i < 60 && document.querySelector('.ls.on:not(.out)'); i++) await sleep(500); await sleep(2500); };
const shot = async (name, wait = 1200) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
const done = [`viewport ${innerWidth}x${innerHeight}`];

// de kaart: de zee en de kust (geen slotenlabyrint over water of buiten de grens)
const KAART = { wadden: [-5000, -31000, 0.012], eems: [26000, -14000, 0.02], dollard: [36000, -9500, 0.02], drenthe: [30000, 36000, 0.012], hogeland: [4000, -19000, 0.012] };
for (const [name, [x, y, z]] of Object.entries(KAART)) {
  if (!want('kaart-' + name)) continue;
  teleport(x, y);
  PM.openPauseMenu('map');
  await sleep(2500);
  MV.setMapView(x, y, z);
  await shot('kaart-' + name, 2500);
  PM.closePauseMenu();
  done.push('kaart-' + name);
}

// de speler te voet in een weiland langs het spoor, en bij een sloot-kruising (de duiker)
const S = window.__randenSpots || { rail: [-3441, -14433, 0], sloot: [17516, -15523, 0] }; // een weiland langs het spoor (tegel 230_596) en een sloot die een weg kruist (251_597), gekozen met een script uit de nieuwe tegels
for (const [name, key] of [['weiland-spoor', 'rail'], ['sloot-duiker', 'sloot']]) {
  if (!want(name) || !S[key]) continue;
  const [x, y, a] = S[key];
  teleport(x, y);
  await settle();
  p.angle = a || 0;
  p.x = x; p.y = y;
  await shot(name, 2500);
  done.push(name);
}
clearInterval(skipper);
return done;
