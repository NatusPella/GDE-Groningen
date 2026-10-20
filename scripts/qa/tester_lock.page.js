// Page half van scripts/qa/tester_bugs.mjs --check=lock (#328): wat doet Input.tryLock in een echt Electron-venster?
// Het nieuwe spel wordt zonder echt gebaar gestart (een script-click is geen gebaar), dus de eerste aanvraag
// van het spel zelf wordt geweigerd: met de oude code stond de terugval (vrije cursor) daarna voorgoed aan.
// Meldt per tijdstip: vergrendeld, terugval, lockElement, en de reden van een rechtstreekse aanvraag.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug;
const out = { stappen: [] };
const snap = (naam) => out.stappen.push({ naam, t: Math.round(performance.now()), gestart: document.body.classList.contains('game-started'), vergrendeld: !!D.input.mouse.locked, lockElement: !!document.pointerLockElement, terugval: !!D.input.lookFallback, fouten: D.input._lockFails ?? null, focus: document.hasFocus() });
const ss = document.getElementById('start-screen');
snap('voor nieuw spel');
for (let i = 0; i < 120; i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) {
    const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent));
    if (it) it.click();
    await sleep(2500);
    if (!ss.classList.contains('visible')) break;
  } else await sleep(500);
}
for (let i = 0; i < 60 && !document.body.classList.contains('game-started'); i++) await sleep(500);
snap('game-started');
await sleep(1500); snap('+1,5 s');
await sleep(4000); snap('+5,5 s');
// een rechtstreekse aanvraag zonder gebaar: wat zegt de browser?
const canvas = document.getElementById('game3d');
try { const r = canvas.requestPointerLock(); out.rechtstreeks = r && r.then ? await r.then(() => 'gelukt', (e) => 'geweigerd: ' + e.name + ': ' + e.message) : 'geen belofte'; } catch (e) { out.rechtstreeks = 'fout: ' + e.name + ': ' + e.message; }
await sleep(500); snap('na rechtstreekse aanvraag');
if (document.pointerLockElement) document.exitPointerLock();
// en de weg van het spel zelf: toets en klik (script-events, dus ook zonder gebaar)
D.input.tryLock(); await sleep(800); snap('tryLock() na de toets');
return JSON.stringify({ results: { lock: out } });
