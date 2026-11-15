// Page half van scripts/qa/kaartstijl_shots.mjs (desktop --perf-script body; #112).
// window.__ksCfg = { spots: [{ naam, plaats, kind? }], zooms: [..], uren: { dag, nacht }, settle } staat ervoor.
// Per plek en per dagdeel: een beeld van de minimap (de HUD staat in beeld) en de grote kaart (pauzemenu,
// tab Kaart) op elke zoom. De speler en de klok worden elk frame vastgezet, zodat een 'voor'- en een
// 'na'-run dezelfde plek en tijd hebben.
const CFG = window.__ksCfg;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 900 && !(window.__debug && window.__debug.world && window.__debug.world.map && window.__scene3d); i++) await sleep(100);
for (let i = 0; i < 300 && !document.body.classList.contains('game-started'); i++) {
  if (i % 30 === 5) for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await sleep(100);
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
for (let i = 0; i < 25 && w.paused; i++) { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true })); } await sleep(700); }
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const MV = await imp('mapview');
const DN = await imp('daynight');
const SET = await imp('settings');
const GL = await imp('gebiedenlive');
const BG = await imp('beppe_garden');
const errors = [];
window.addEventListener('error', (e) => { errors.push(String(e.message)); console.error('[ks-error] ' + e.message); });
window.addEventListener('unhandledrejection', (e) => { errors.push(String(e.reason)); console.error('[ks-error] ' + e.reason); });
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

let hold = null, hour = 13, done = false;
const tick = () => {
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = 0; w.camYaw = 0; }
  w.clock = hour;
  if (DN.refreshDayNight) DN.refreshDayNight(w);
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);

const index = await fetch('/world/index-provincie.json').then((r) => r.json()).then((j) => j.global);
const place = (name, kind) => index.places.find((q) => q.name === name && (!kind || q.kind === kind));
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};

const results = { css: [innerWidth, innerHeight], shots: [] };
const diagnostiek = (S, q) => {
  let beppe = null, kaart = null;
  try { beppe = BG.beppeMapSpot(); } catch (e) { beppe = { fout: String(e && e.message) }; }
  try { const o = GL.getOverzicht(); kaart = o ? { ...o.kaart } : null; } catch (e) { kaart = { fout: String(e && e.message) }; }
  return { plek: S.naam, plaats: q && { x: Math.round(q.x), y: Math.round(q.y) }, beppe: beppe && { x: beppe.x, y: beppe.y, kind: beppe.kind, naam: beppe.name }, kaart, bezocht: (kaart && kaart.done) || 0 };
};
for (const S of CFG.spots) {
  const q = place(S.plaats, S.kind);
  if (!q) { results.shots.push({ naam: S.naam, fout: 'plaats niet gevonden' }); continue; }
  teleport(q.x, q.y);
  hold = { x: q.x, y: q.y };
  results[S.naam] = diagnostiek(S, q);
  for (const [dagdeel, uur] of Object.entries(CFG.uren)) {
    hour = uur;
    await sleep(CFG.settle);
    // de minimap (HUD) met de wereld erachter
    if (PM.isPauseMenuOpen()) PM.closePauseMenu();
    await sleep(1200);
    let name = `ks-${S.naam}-${dagdeel}-mini`;
    console.log('[capture] ' + name); results.shots.push(name);
    await sleep(700);
    // de grote kaart
    PM.openPauseMenu('map');
    await sleep(1500);
    for (const z of CFG.zooms) {
      MV.setMapView(q.x, q.y, z);
      await sleep(CFG.mapSettle);
      name = `ks-${S.naam}-${dagdeel}-kaart-z${z}`;
      console.log('[capture] ' + name); results.shots.push(name);
      await sleep(700);
    }
    // diagnostiek: dezelfde kaart zonder de ontdekkingswaas, om de maskerlagen te scheiden
    if (dagdeel === 'dag' && CFG.zooms.includes(6)) {
      SET.setSetting('showFog', false);
      MV.setMapView(q.x, q.y, 6);
      await sleep(900);
      name = `ks-${S.naam}-${dagdeel}-kaart-z6-zondermasker`;
      console.log('[capture] ' + name); results.shots.push(name);
      await sleep(500);
      SET.setSetting('showFog', true);
      MV.setMapView(q.x, q.y, 6);
      await sleep(900);
    }
    results[S.naam].na = diagnostiek(S, q);
    PM.closePauseMenu();
    await sleep(600);
  }
}
done = true;
clearInterval(skipper);
results.errors = errors;
return JSON.stringify(results);
