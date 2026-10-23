// Paginascript voor scripts/qa/menuplekken_shots.mjs --page=menu435.page.js --nomenu (#435): beelden van Garage, Spullen, Prestaties, Kaart, Verhaal > Aanwijzingen en de fotomodus.
// Opnames heten shots-<naam>.png. Alleen kijken, geen echte opslag.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const w = window.__debug.world;
const cine = await import('/js/cinematics.js');
const PM = await import('/js/pausemenu.js');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
for (let i = 0; i < 20 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(500); }
await sleep(3000);
w.devInvuln = true;
window.__debug.input.canLock = () => false;
const uit = { controles: [] };
const check = (naam, ok, info = '') => uit.controles.push({ naam, ok: !!ok, info: String(info) });
const root = () => document.getElementById('pause-menu');
const stappen = (window.__mp && window.__mp.ids ? window.__mp.ids.split(',') : ['garage', 'spullen', 'prestaties', 'kaart', 'aanwijzingen']);
const shot = async (n, ms = 1500) => { await sleep(ms); console.log('[capture] ' + n); await sleep(700); };
if (stappen.includes('garage')) {
  PM.openPauseMenu('garage');
  await shot('garage', 2500);
  const cv = [...root().querySelectorAll('[data-panel="garage"] canvas')];
  const kaarten = [...root().querySelectorAll('.gar-card')];
  check('garage: kaarten', kaarten.length > 0, kaarten.length);
  check('garage: viewer-canvas', cv.length > 0, cv.map((c) => `${c.width}x${c.height}`).join(','));
  const ph = [...root().querySelectorAll('.gar-ph')].map((p) => (p.querySelector('canvas,img') || p.style.backgroundImage ? 'beeld' : 'leeg'));
  check('garage: kaartplaatjes', ph.filter((x) => x === 'beeld').length > 0, ph.join(','));
}
for (const [id, naam, opts] of [['spullen', 'spullen', {}], ['prestaties', 'prestaties', {}], ['map', 'kaart', {}], ['verhaal', 'aanwijzingen', { sub: 'aanwijzingen' }]]) {
  if (!stappen.includes(naam)) continue;
  try { PM.openPauseMenu(id, opts); } catch (e) { check(naam + ' openen', false, e.message); continue; }
  await shot(naam, 2500);
}
if (stappen.includes('aanwijzingen2')) {
  const ST = await import('/js/story.js');
  for (let i = 0; i < 6; i++) { try { ST.skipCurrent({ force: true }); } catch (e) { check('skip ' + i, false, e.message); } await sleep(300); }
  PM.openPauseMenu('verhaal', { sub: 'aanwijzingen' }); await shot('aanwijzingen-gevuld', 2500);
  const g = [...root().querySelectorAll('.vh-gk')].map((x) => x.textContent);
  check('aanwijzingen per opdracht', g.length > 0, g.join(' | '));
}
if (stappen.includes('kaartzoom')) {
  const MV = await import('/js/mapview.js');
  PM.openPauseMenu('map'); await sleep(2500);
  for (const z of [0.55, 1.2, 3]) { MV.setMapView(w.player.x, w.player.y, z); await shot('kaartzoom-' + z, 2500); }
}
if (stappen.includes('kaartgrens')) {
  const MV = await import('/js/mapview.js');
  const RG = await import('/js/regions.js');
  PM.openPauseMenu('map'); await sleep(2500);
  const lijnen = RG.landBorders();
  check('landgrenzen bekend', lijnen.length > 0, lijnen.map((l) => l.kind + ':' + l.pts.length).join(','));
  for (const kind of ['friesland', 'drenthe', 'duitsland']) {
    const l = lijnen.find((x) => x.kind === kind);
    if (!l) { check('grens ' + kind, false, 'geen lijn'); continue; }
    const m = l.pts[Math.floor(l.pts.length / 2)];
    MV.setMapView(m[0], m[1], 0.7); await shot('kaartgrens-' + kind, 3500);
  }
}
clearInterval(skipper);
return JSON.stringify({ ...uit, beelden: [{ naam: 'menu435' }] });
