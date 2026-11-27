// Page half van scripts/qa/tester_bugs.mjs --check=stuntskip (#1341): M01 (stunt op de Grote Markt) met een vastgehouden spatie,
// zoals een speler hem houdt (eerst één verse keydown, na een halve seconde elke ~33 ms een keydown met repeat:true).
// Meet per 150 ms de scène, de missiefase en de voortgangstekst, en meldt of de stuntfase al voor de tijd eindigde.
// Opties (--opts): { holdMs: 3000, scenes: 2 } (de hoeveelste scène op de Grote Markt de speler vasthoudt).
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const key = (k, code, o = {}) => { for (const t of [window]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true, ...o })); } };
const keyup = (k, code) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true }));
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { if (window.__menuStart) window.__menuStart('nieuw'); else { key('Enter', 'Enter'); keyup('Enter', 'Enter'); } }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(3000);
const M = await import('/js/missions.js');
const SP = await import('/js/storyarc.js');
const step = SP.STEPS.find((s) => s.id === 'M01' || s.mission === 'M01');
const idx = SP.MISSION_IDS.indexOf(step.mission);
w.devInvuln = true;
const log = [];
const t0 = performance.now();
const snap = (tag) => {
  const m = w.mission || {};
  log.push({ t: +((performance.now() - t0) / 1000).toFixed(2), tag, cine: cine.isCinematicActive() ? (cine.cinematicState() || {}).id : null, cineT: cine.isCinematicActive() ? +(cine.cinematicState().t).toFixed(2) : null, phase: m.phase, prog: (m.progressText || '').slice(0, 60) });
};
M.missionDebug.start(w, idx);
await sleep(500);
if (TB.vanStart) {
  // de speler houdt de spatie vast vanaf de eerste scène van de missie (intro), met key repeat
  let sc = 0, prev = false, id = null; const t1 = performance.now(); let lastR = 0;
  key(' ', 'Space');
  for (let i = 0; i < 400; i++) {
    await sleep(33);
    const a = cine.isCinematicActive(); const st = a ? cine.cinematicState() : null;
    if (a && (!prev || (st && st.id !== id))) { sc++; log.push({ t: +((performance.now() - t0) / 1000).toFixed(2), tag: 'intro-scene-' + sc, id: st.id, dur: st.duration }); }
    prev = a; id = st ? st.id : null;
    const n = performance.now();
    if (n - t1 > 500 && n - lastR > 33) { lastR = n; key(' ', 'Space', { repeat: true }); }
    if (i % 15 === 0) snap('intro-tik');
  }
  keyup(' ', 'Space'); snap('intro-spatie-omhoog');
  return JSON.stringify({ results: { sc, eind: (w.mission || {}).progressText, log } });
}
for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(150); }
// de bakkie naast het midden van de Grote Markt, de speler erin
const def = M.getMissionDefs ? M.getMissionDefs()[idx] : null;
const c = { x: 168.69, y: 70.04 };
const v = w.vehicles.find((q) => q.missionCar);
const p = w.player;
snap('na-start');
const far = { x: c.x + 70, y: c.y };
v.x = far.x; v.y = far.y; v.speed = 0; p.x = v.x; p.y = v.y; p.inVehicle = v; v.driver = 'player';
await sleep(800);
snap('klaar-om-te-rijden');
// naar het midden rijden is niet nodig: zet hem er net binnen
v.x = c.x + 40; v.y = c.y; v.speed = 0; p.x = v.x; p.y = v.y;
let scenes = 0, prevCine = false, held = false, heldAt = 0, lastRepeat = 0;
let want = TB.scenes || 2;
for (let i = 0; i < 700; i++) {
  await sleep(33);
  const act = cine.isCinematicActive();
  if (act && !prevCine) { scenes++; snap('scene-' + scenes + '-begin'); }
  prevCine = act;
  const now = performance.now();
  if (act && scenes === want && !held && cine.cinematicState().t > 0.8) { held = true; heldAt = now; key(' ', 'Space'); snap('spatie-omlaag'); }
  if (held && !TB.keyupAt && now - heldAt > (TB.holdMs || 3000)) { keyup(' ', 'Space'); snap('spatie-omhoog'); held = false; TB.keyupAt = now; }
  if (held && now - heldAt > 500 && now - lastRepeat > 33) { lastRepeat = now; key(' ', 'Space', { repeat: true }); }
  if (TB.klaar && held === false && TB.keyupAt && !TB.forced) { TB.forced = true; const SU = await import('/js/stuntavond.js'); SU.startStunt(w, { center: c, radius: 46, target: 0, shield: 30 }); snap('stunt-geforceerd-klaar'); TB.keyupAt = null; TB.holdMs = 3000; want = 2; TB.keyupAt2 = 1; }
  if (i % 5 === 0) snap('tik');
  if (TB.keyupAt && TB.keyupAt2 && now - TB.keyupAt > (TB.naMs || 2500)) break;
}
const m = w.mission || {};
return JSON.stringify({ results: { scenes, eind: { phase: m.phase, prog: m.progressText }, log: log.filter((l, i) => l.tag !== 'tik' || i % 4 === 0) } });
