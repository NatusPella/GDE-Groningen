// Page half van scripts/qa/tester_bugs.mjs --check=garage (#418): de parkeergarages van het Forum en de Ossenmarkt.
// Per garage: waar de poort komt (de planner), de poort in beeld, te voet erin, de hal in beeld, de auto's (stelen), met een auto erin en eruit,
// de uitrit, en of alles na afloop weer is opgeruimd (hal, auto's, licht, colliders). Bewaart beelden met [capture].
// TB.only = ['forum'] beperkt de lijst. Draait met GDE_MENU_TEST=1.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const cine = await import('/js/cinematics.js');
const VEH = await import('/js/vehicle.js');
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { if (window.__menuStart) window.__menuStart('nieuw'); else key('Enter', 'Enter'); await sleep(2500); if (!ss.classList.contains('visible')) break; } else await sleep(500);
}
for (let i = 0; i < 400; i++) { if (cine.isCinematicActive()) cine.skipCinematic(); await sleep(150); if (i > 60 && !cine.isCinematicActive()) break; }
await sleep(3000);
w.devInvuln = true; w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
const G = window.__garages;
const out = {};
for (const s of G.sites()) out[s.id] = { hall: s.hall, diag: G.diag(s.id) };
return JSON.stringify({ results: { garagediag: out } });
