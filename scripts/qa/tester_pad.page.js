// Page half van scripts/qa/tester_bugs.mjs --check=pad (#151): een nep-controller (navigator.getGamepads) tegen het echte
// spel in Electron. Meldt per stap de padsituatie (data-pad-ctx), wat de stick met de speler doet en wat de knoppen doen
// te voet, in de auto, in het pauzemenu en op de kaart. Doel: zien waar "het pad werkt in menu's maar niet in het spel" vandaan komt.
// Het pad praat via echte requestAnimationFrame-polls van gamepad.js, dus elke stap wacht een paar frames.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const out = { stappen: [], fouten: [] };

// een nep-pad met de standaardindeling; knoppen op indexnummer van PAD_BUTTONS
const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) };
let pads = [pad];
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pads });
const hold = (name, on = true) => { const b = pad.buttons[ORDER.indexOf(name)]; b.pressed = on; b.value = on ? 1 : 0; };
const stick = (lx, ly, rx = 0, ry = 0) => { pad.axes = [lx, ly, rx, ry]; };
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
const tap = async (name, ms = 120) => { hold(name, true); await sleep(ms); hold(name, false); await sleep(120); };
const M = {};
for (const [f, n] of [['pausemenu', 'isPauseMenuOpen'], ['mapview', 'isMapOpen'], ['phone', 'isPhoneOpen'], ['shopui', 'isShopOpen'], ['todo', 'isPlayAheadOpen'], ['assistlive', 'isHelpOfferOpen'], ['cinematics', 'isCinematicActive']]) { try { M[n] = (await import('/js/' + f + '.js'))[n]; } catch (e) { out.fouten.push('import ' + f + ': ' + e.message); } }
const hooksNow = () => Object.fromEntries(Object.entries(M).map(([n, f]) => { try { return [n, !!f()]; } catch (e) { return [n, 'fout']; } }).filter(([, v]) => v));
const pos = () => { const p = w.player; return p ? [+(p.x ?? 0).toFixed(2), +(p.y ?? p.z ?? 0).toFixed(2)] : null; };
const snap = (naam, extra = {}) => out.stappen.push({
  naam, ctx: document.documentElement.dataset.padCtx, pad: document.documentElement.classList.contains('pad-active'), familie: document.documentElement.dataset.pad,
  gestart: document.body.classList.contains('game-started'), axis: D.input.padAxis.map((v) => +v.toFixed(2)), padKeys: [...D.input.padKeys], pos: pos(),
  paused: !!w.paused, uiPaused: !!w.uiPaused, focus: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : null, typing: D.input.typing,
  open: hooksNow(), devPanel: !!w.devPanelOpen, vehicle: !!(w.player && w.player.inVehicle), cine: !!document.querySelector('#cine.active'), cam: !!w.cameraOverride, ...extra,
});

snap('voor het pad');
// het pad wordt actief na de eerste invoer
hold('down'); await frames(4); hold('down', false); await frames(4);
snap('na eerste knop (titel)');
// nieuw spel kiezen zoals een speler met het pad: A
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  if (ss && ss.classList.contains('visible')) {
    const it = [...ss.querySelectorAll('.ss-item')].find((q) => /nieuw spel/i.test(q.textContent));
    if (it) { it.focus(); await tap('a'); }
    await sleep(2500);
  } else await sleep(500);
}
snap('game-started');
const cineAan = () => !!document.querySelector('#cine.active') || !!w.cameraOverride || w.uiPaused;
for (let t = 0; t < 40 && !cineAan(); t++) await sleep(500); // de opening begint pas even na game-started
snap('opening loopt', { cineAan: cineAan() });
// de opening sla je over door Spatie ingedrukt te houden: A is spatie te voet; meerdere openingsscènes achter elkaar
for (let k = 0; k < 12 && cineAan(); k++) {
  hold('a', true); await sleep(4500); hold('a', false); await sleep(1500);
  snap('opening: A 4,5 s ingedrukt (' + (k + 1) + ')', { cineAan: cineAan() });
}
snap('speler vrij');

// 1. lopen
const p0 = pos();
stick(0, -1); await sleep(1500); snap('stick omhoog 1,5 s'); stick(0, 0); await sleep(300);
out.loopafstand = pos() && p0 ? +Math.hypot(pos()[0] - p0[0], pos()[1] - p0[1]).toFixed(2) : null;
// 2. camera
const camBefore = D.input.mouse.dx;
stick(0, 0, 1, 0); await sleep(500); snap('rechterstick rechts'); stick(0, 0, 0, 0);
// 3. springen (A) en rennen (L-stick klik)
await tap('a'); snap('A te voet (spring)');
await tap('ls'); snap('L3 te voet (ren-vergrendeling)');
// 4. pauzemenu en terug
await tap('start'); await sleep(600); snap('Start: pauzemenu', { paus: !!document.querySelector('#pause-menu, .pause-menu, [role="dialog"]') });
await tap('b'); await sleep(600); snap('B: terug naar het spel');
stick(0, -1); await sleep(800); snap('stick omhoog na pauze'); stick(0, 0);
out.loopafstand2 = pos() && p0 ? +Math.hypot(pos()[0] - p0[0], pos()[1] - p0[1]).toFixed(2) : null;
// 5. kaart
await tap('view'); await sleep(600); snap('Terug/view: kaart?'); await tap('b'); await sleep(500); snap('B na kaart');
// 6. voertuig: een geparkeerde auto vlakbij, de speler ernaast, Y (de E-knop) om in te stappen
try {
  const p = w.player;
  const kand = (w.vehicles || []).filter((x) => x && Number.isFinite(x.x) && !x.driver && !x.wrecked && !x.isHeli && !x.isPlane && !x.isBoat && !x.isBus && !x.isTrain && (x.parked || x.isHeroCar || x.playerOwned))
    .sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y));
  const v = kand[0];
  out.voertuig = { aantal: (w.vehicles || []).length, kandidaten: kand.length, gekozen: v ? { x: +v.x.toFixed(1), y: +v.y.toFixed(1), parked: !!v.parked, hero: !!v.isHeroCar } : null };
  if (v) { p.x = v.x + 2.2; p.y = v.y; await sleep(700); }
  await tap('y'); await sleep(1200); snap('Y bij auto', { auto: !!p.inVehicle });
  if (p.inVehicle) {
    const q0 = pos(); hold('rt'); await sleep(2000); snap('gas (RT)', { snelheid: +(p.inVehicle.speed || 0).toFixed(1) }); hold('rt', false);
    stick(1, 0); hold('rt'); await sleep(900); snap('sturen met gas (stick rechts)'); stick(0, 0); hold('rt', false);
    out.rijafstand = pos() && q0 ? +Math.hypot(pos()[0] - q0[0], pos()[1] - q0[1]).toFixed(2) : null;
    hold('lt'); await sleep(1500); snap('rem (LT)', { snelheid: +(p.inVehicle.speed || 0).toFixed(1) }); hold('lt', false);
    await tap('x'); snap('X: claxon (geen fout)');
    await tap('y'); await sleep(900); snap('Y: uitstappen', { auto: !!p.inVehicle });
  }
} catch (e) { out.fouten.push('voertuig: ' + e.message); }
return JSON.stringify({ results: { pad: out } });
