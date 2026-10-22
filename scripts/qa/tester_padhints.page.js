// Page half van scripts/qa/tester_bugs.mjs --check=padhints (#151): beelden van dezelfde hints met het toetsenbord en met de
// controller (witte keycap-stijl): titelmenu, HUD-hint bij een auto, pauzemenu en Besturing. Een nep-controller via
// navigator.getGamepads; het actieve apparaat wisselt via inputdevice.noteDevice. Beelden: shots-<naam>.png via [capture].
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const out = { stappen: [], fouten: [] };
const ORDER = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'view', 'start', 'ls', 'rs', 'up', 'down', 'left', 'right'];
const pad = { id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: ORDER.map(() => ({ pressed: false, touched: false, value: 0 })) };
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
const hold = (name, on = true) => { const b = pad.buttons[ORDER.indexOf(name)]; b.pressed = on; b.value = on ? 1 : 0; };
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
const tap = async (name, ms = 120) => { hold(name, true); await frames(4); await sleep(ms); hold(name, false); await frames(2); await sleep(120); };
const ID = await import('/js/inputdevice.js');
const PM = await import('/js/pausemenu.js');
const shot = async (naam) => { await sleep(900); console.log('[capture] ' + naam); await sleep(900); out.stappen.push({ naam, device: ID.getDevice() }); };
// pad: een echte knopdruk (R3, doet in de menu's niets), zodat ook gamepad.js zelf actief wordt; kb: de laatste echte invoer wint
const apparaat = async (d) => { if (d === 'pad') await tap('rs'); else ID.noteDevice('kb'); await frames(3); await sleep(400); };
const body = (async () => {
try {
  const ss = document.getElementById('start-screen');
  // titelmenu
  await apparaat('kb'); await shot('titel-toetsenbord');
  await tap('down'); await apparaat('pad'); await shot('titel-pad');
  // het spel starten met A op Alleen spelen
  const opSolo = () => { const sel = ss && ss.querySelector('.ss-item.sel'); return !!sel && sel.dataset.act === 'solo'; };
  let laatsteA = 0;
  for (let i = 0; i < 400 && !document.body.classList.contains('game-started'); i++) {
    if (ss && ss.classList.contains('visible') && Date.now() - laatsteA > 20000) {
      laatsteA = Date.now();
      for (let k = 0; k < 8 && !opSolo(); k++) await tap(k < 4 ? 'up' : 'down');
      if (!opSolo()) { await sleep(1000); continue; }
      await tap('a'); await sleep(1500);
      if (!document.body.classList.contains('game-started') && ss.classList.contains('visible') && opSolo()) await tap('a');
    }
    await sleep(1000);
  }
  const cineAan = () => !!document.querySelector('#cine.active') || !!w.cameraOverride || w.uiPaused;
  for (let t = 0; t < 40 && !cineAan(); t++) await sleep(500);
  await apparaat('pad'); await shot('opening-pad');
  await apparaat('kb'); await shot('opening-toetsenbord');
  await apparaat('pad');
  for (let k = 0; k < 12 && cineAan(); k++) { hold('a', true); await sleep(4500); hold('a', false); await sleep(1500); }
  // HUD: naast een auto verschijnt de hint om in te stappen
  const p = w.player;
  const kand = (w.vehicles || []).filter((x) => x && Number.isFinite(x.x) && !x.driver && !x.wrecked && !x.isHeli && !x.isPlane && !x.isBoat && !x.isBus && !x.isTrain && (x.parked || x.isHeroCar || x.playerOwned))
    .sort((u, v) => Math.hypot(u.x - p.x, u.y - p.y) - Math.hypot(v.x - p.x, v.y - p.y));
  if (kand[0]) { p.x = kand[0].x + 2.2; p.y = kand[0].y; await sleep(1500); }
  await apparaat('pad'); await shot('hud-pad');
  await apparaat('kb'); await shot('hud-toetsenbord');
  // pauzemenu: overzicht en Besturing
  for (const [sectie, naam] of [['overzicht', 'pauze'], ['controls', 'besturing'], ['controls', 'besturing-controller']]) {
    for (const [d, dnaam] of [['kb', 'toetsenbord'], ['pad', 'pad']]) {
      await apparaat(d); PM.openPauseMenu(sectie, naam === 'besturing-controller' ? { sub: 'knoppen' } : {}); await sleep(1200);
      await shot(naam + '-' + dnaam);
      PM.closePauseMenu(); await sleep(800);
    }
  }
} catch (e) { out.fouten.push('fataal: ' + (e && e.stack || e)); }
})();
const klaar = await Promise.race([body.then(() => true), sleep(Math.max(60, (window.__tb.maxS || 150) - 30) * 1000).then(() => false)]);
if (!klaar) out.fouten.push('tijdslimiet: laatste stap ' + (out.stappen.length ? out.stappen[out.stappen.length - 1].naam : 'geen'));
return JSON.stringify({ results: { padhints: out } });
