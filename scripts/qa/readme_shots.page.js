// Page half of scripts/qa/readme_shots.mjs (desktop --perf-script body): de beelden voor de README, op 1920x1080.
// window.__rs = { only: [namen], settle } staat ervoor. Elk beeld is `shot('<naam>', async (h) => { ... })` hieronder;
// `[capture] <naam>` laat devtools.js er een PNG van maken. Niets schrijft naar echte opslag (wegwerpprofiel).
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d;
const RS = window.__rs || { only: [], settle: 7000 };
const SETTLE = RS.settle || 7000;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const WL = await imp('waterlevels');
const GP = await imp('gfxprofile');
const ST = await imp('settings');
const MV = await imp('mapview');
const VH = await imp('vehicle');
const BT = await imp('boattypes');

// voorinstelling Hoog, zoals de eigenaar het zou kiezen; geen dynamische resolutie
{
  const pr = (GP.GFX_PRESETS || {}).hoog;
  if (pr) for (const [k, v] of Object.entries(pr)) ST.setSetting(k, v);
  try { ST.setSetting('autoResolution', false); ST.setSetting('showHints', false); } catch (e) { /* oudere instellingen */ }
}
let ownShot = false, skipCine = true, hold = null, env = { clock: 14, weather: null, fix: false }, done = false;
const skipper = setInterval(() => { if (skipCine && !ownShot && cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const errors = [];
const origErr = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ').slice(0, 200)); origErr.apply(console, a); };

const gh = (x, y) => (map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0);
const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0; p.gz = gh(x, y);
};
const setWeather = () => {
  const W = env.weather || { kind: 'helder' };
  w.weather = { active: W.kind !== 'helder', timer: 1e9, kind: W.kind, peak: W.intensity || 0, intensity: W.intensity || 0, wet: W.wet || 0, overcast: W.overcast || 0, mist: W.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
};
const fixWorld = () => { w.clock = env.clock; setWeather(); if (DN.refreshDayNight) DN.refreshDayNight(w); };
const tick = () => {
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; if (hold.a !== undefined) { p.angle = hold.a; w.camYaw = hold.a; } }
  if (env.fix) w.clock = env.clock;
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const capture = async (name, wait = 600) => { await sleep(wait); console.log('[capture] ' + name); await sleep(700); };
// alles buiten het 3D-canvas verbergen (de bootmeter en andere HUD-delen horen niet bij het cinematic-verbergen)
let verborgen = [];
const schoon = (aan) => {
  if (!aan) { for (const [e, v] of verborgen) e.style.visibility = v; verborgen = []; return; }
  const keep = sc.renderer.domElement;
  const loop = (root) => { for (const c of root.children) { if (c === keep || ['SCRIPT', 'STYLE', 'LINK'].includes(c.tagName)) continue; if (c.contains(keep)) loop(c); else { verborgen.push([c, c.style.visibility]); c.style.visibility = 'hidden'; } } };
  loop(document.body);
};
// een vaste camerastand via de cinematic-camera (zonder HUD); de speler staat op `hold`
const poseShot = async (name, pose, wait = 2600) => {
  if (cine.isCinematicActive()) cine.skipCinematic();
  ownShot = true; w.cinematicHideNav = true; schoon(true); // geen routelint, baken of HUD in beeld
  cine.playCinematic({ id: 'rs-view', duration: 60, priority: 9, letterbox: false, skippable: false, shot: () => pose });
  await sleep(wait);
  console.log('[capture] ' + name);
  await sleep(700);
  cine.skipCinematic();
  ownShot = false; w.cinematicHideNav = false; schoon(false);
};
const idx = await fetch('/world/index-provincie.json').then((r) => r.json()).catch(() => null);
const place = (n, kind) => idx && idx.global.places.find((q) => q.name === n && (!kind || q.kind === kind));
const kb = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true })); };
// het dichtstbijzijnde wegstuk (midden en richting) rond (x, y)
function snapRoad(x, y, R) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : []) || []) {
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 25) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
  }
  return best;
}
const key = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: code || k, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: code || k, bubbles: true })); } };

// een wereldbeeld: tijd, weer, de speler (buiten beeld) op de camerapositie zodat de tegels laden, dan de camera
// cam / look: [x, y, hoogte boven de grond]; lookZ mag absoluut zijn (abs: true)
async function worldPose(name, o) {
  hold = null; env = { clock: o.clock !== undefined ? o.clock : 14, weather: o.weather || null, fix: true };
  w.wanted = 0; fixWorld();
  const ax = o.hold ? o.hold[0] : o.cam[0], ay = o.hold ? o.hold[1] : o.cam[1];
  teleport(ax, ay); hold = { x: ax, y: ay };
  const st = o.settle !== undefined ? o.settle : SETTLE;
  await sleep(st * 0.7);
  teleport(ax, ay); fixWorld();
  if (o.boat) { hold = null; putBoat(o.boat[0], o.boat[1], o.boat[2] || 0, o.boat[3] || 'sloep'); hold = { x: o.boat[0], y: o.boat[1] }; } else dropBoat();
  await sleep(st * 0.7);
  const c = o.cam, l = o.look;
  const pose = { position: { x: c[0], y: c[1], z: (o.abs ? 0 : gh(c[0], c[1])) + c[2] }, lookAt: { x: l[0], y: l[1], z: (o.abs ? 0 : gh(l[0], l[1])) + l[2] }, cut: true };
  if (o.fov) pose.fov = o.fov;
  await poseShot(name, pose, o.wait || 2600);
}

// een boot (sloep) op de plek; de speler stuurt hem niet
let theBoat = null;
const putBoat = (x, y, angle, kind = 'sloep') => {
  if (p.inVehicle) p.exitVehicle(map, w);
  if (theBoat) { const i = w.vehicles.indexOf(theBoat); if (i >= 0) w.vehicles.splice(i, 1); }
  p.x = x; p.y = y; p.vx = p.vy = 0; p.z = 0; p.vz = 0;
  theBoat = new VH.Vehicle(x, y, angle, { ...BT.BOAT_KINDS[kind] });
  theBoat.isBoat = true; theBoat.speed = 0; w.vehicles.push(theBoat);
  p.enterVehicle(theBoat, w);
};
const dropBoat = () => { if (theBoat) { if (p.inVehicle) p.exitVehicle(map, w); const i = w.vehicles.indexOf(theBoat); if (i >= 0) w.vehicles.splice(i, 1); theBoat = null; } };

const lauw = place('Lauwersoog'), eems = place('Eemshaven'), winsum = place('Winsum');
// ---- de beelden ----
const SHOTS = [];
const shot = (name, fn) => SHOTS.push({ name, fn });

// 0. verkenning van camerastanden: --scout=<json met [{ name, cam, look, clock, hold, settle }]> maakt van elke stand een beeld
shot('scout', async () => { for (const o of RS.scout || []) await worldPose('scout-' + o.name, o); });

// 1. de hele provincie op de grote kaart
shot('kaart-provincie', async () => {
  hold = null; env = { clock: 12, weather: null, fix: true }; fixWorld();
  const c = place('Groningen', 'city') || { x: 0, y: 0 };
  teleport(c.x, c.y); await sleep(SETTLE);
  PM.openPauseMenu('map'); await sleep(2500);
  const PMP = await imp('provincemap'); const bb = PMP.provinceMapBounds(); // het midden van de kaart, zodat de provincie in het midden staat
  MV.setMapView(bb ? (bb[0] + bb[2]) / 2 : c.x, bb ? (bb[1] + bb[3]) / 2 : c.y, 0.0001); await sleep(4000);
  await capture('kaart-provincie', 500);
  PM.closePauseMenu();
});
shot('kaart-stad', async () => {
  hold = null; env = { clock: 12, weather: null, fix: true }; fixWorld();
  teleport(106, 58); await sleep(SETTLE);
  PM.openPauseMenu('map'); await sleep(2500);
  MV.setMapView(150, 150, 3.2); await sleep(4000);
  await capture('kaart-stad', 500);
  PM.closePauseMenu();
});

// 2. Groningen: de Vismarkt met de Martinitoren in de avondzon, en de stad bij nacht van boven
shot('stad-dag', async () => worldPose('stad-dag', { clock: 17.2, cam: [19, 256, 3], look: [80, 100, 25] }));
shot('stad-nacht', async () => worldPose('stad-nacht', { clock: 22.2, cam: [40, 115, 45], look: [196, -6, 30] }));

// 3. kust en regio: een skutsje bij de Robbengatsluis (Lauwersoog), windturbines en een kanaal bij de Eemshaven
shot('kust-sluis', async () => worldPose('kust-sluis', { clock: 17.8, abs: true, cam: [-24865, -20596, 6], look: [-24888, -20612, 1.5], boat: [-24888, -20612, -0.98, 'skutsje'], settle: 8000 }));
shot('regio-eemshaven', async () => worldPose('regio-eemshaven', { clock: 18.8, cam: [eems.x - 300, eems.y + 100, 10], look: [eems.x, eems.y, 40] }));

// 4. het savegame-scherm "Opgeslagen spellen": zeven spellen met elk een eigen miniatuur van een andere plek
shot('opgeslagen-spellen', async () => {
  const SG = await imp('savegame'); const S = await imp('saveslots'); const UI = await imp('saveslotsui');
  const NAMES = ['Mijn eerste zomer', 'Tessa-route', '', 'Proefrit', 'Windmolenrondje', 'Naar het Ommeland', 'Voor de zekerheid'];
  const PLEKKEN = [[106, 58, 3.6, 12], [196, 20, 2.4, 15.5], [40, 215, 0.4, 17], [lauw.x, lauw.y - 300, 4.7, 18.5], [eems.x - 250, eems.y + 80, 0.2, 18.8], [winsum.x - 150, winsum.y + 150, 5.5, 17], [-48, 940, 1.5, 10]];
  hold = null;
  // elke plek: een gewone savegame (in plek 1) met een miniatuur van die plek, dan een kopie naar plek n
  for (const n of [2, 3, 4, 5, 6, 7, 1]) {
    const [x, y, a, clock] = PLEKKEN[n - 1];
    env = { clock, weather: null, fix: true }; fixWorld();
    teleport(x, y); hold = { x, y, a }; await sleep(SETTLE);
    w.money = 450 + n * 175;
    SG.saveGame(w, { toast: true }); await sleep(1500); // toast: de miniatuur wordt dan altijd genomen (anders hooguit om de 45 s)
    if (n > 1) {
      const data = JSON.parse(localStorage.getItem('gde-save-v1-nieuw')); const thumb = S.readThumb(null, 1);
      S.writeSlot(null, n, { ...data, speeltijd: 400 + n * 2300, savedAt: Date.now() - (n - 1) * 7 * 3600000, character: n % 2 ? 'tammo' : 'anita' });
      if (thumb) S.writeThumb(null, n, thumb);
    }
  }
  for (let n = 1; n <= 7; n++) S.renameSlot(null, n, NAMES[n - 1]);
  hold = null; S.setActive(null, 1);
  UI.openSaveSlots({ mode: 'game', world: w });
  await sleep(900);
  await capture('opgeslagen-spellen', 500);
  key('Escape'); await sleep(400);
  if (document.querySelector('#saveslots')) { key('Escape'); await sleep(300); }
  for (let n = 2; n <= 7; n++) { try { S.deleteSlot(null, n); } catch (e) { /* weg */ } }
});

// 5. de garage met de 3D-voertuigvoorbeelden
shot('garage', async () => {
  hold = null; env = { clock: 11, weather: null, fix: true }; fixWorld();
  teleport(106, 58); await sleep(SETTLE * 0.5);
  const SHP = await imp('shops'); const SD = await imp('shopdata');
  const eigen = SHP.getOwnedEntries(); const nieuw = [];
  for (const k of ['raket', 'speedboot', 'stormvogel', 'wiekenwubbo', 'taxi']) { const spec = SD.VEHICLE_STOCK[k]; if (spec && !eigen.some((o) => o.key === k)) nieuw.push({ key: k, spec, color: spec.color, upgrades: [], v: null, lost: false }); }
  eigen.push(...nieuw);
  PM.openPauseMenu('garage'); await sleep(800);
  const root = document.querySelector('#pause-menu [data-panel="garage"] .pm-inner');
  const cards = () => [...root.querySelectorAll('.gar-card')];
  for (let i = 0; i < 100 && root.querySelectorAll('.gar-ph img').length < cards().length; i++) await sleep(250);
  const c = root.querySelector('.gar-card[data-garage-select="hero"]') || cards()[0];
  c.scrollIntoView({ block: 'center', behavior: 'instant' });
  await sleep(300);
  c.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
  await sleep(1800);
  await capture('garage', 300);
  root.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
  PM.closePauseMenu();
  for (const o of nieuw) { const i = eigen.indexOf(o); if (i >= 0) eigen.splice(i, 1); }
});

// 6. Samen spelen: de wachtkamer (nagebootste staat, er gaat niets over het net)
shot('samen-spelen', async () => {
  hold = null; env = { clock: 11, weather: null, fix: true }; fixWorld();
  teleport(106, 58); await sleep(SETTLE * 0.5);
  const LU = await imp('lobbyui');
  PM.openPauseMenu('samen'); await sleep(1200);
  const root = document.querySelector('#pause-menu [data-panel="samen"] .pm-inner');
  root.innerHTML = '';
  const hooks = { startHost() { return null; }, addGuest() {}, startClient() { return null; }, setMax() {}, kick() {}, onCode() {}, canJoin: () => ({ ok: true }), joined() {}, disconnect() {}, startSpel() {} };
  const v = LU.mountLobby(root, hooks, { keuze: 'host', startGate: true, spelNaam: 'Mijn eerste zomer' });
  v.event({ t: 'route', route: 'kamer' });
  v.event({ t: 'code', code: 'ZOMER-WIEBEL-4821' });
  v.event({ t: 'spelers', max: 8, lijst: [
    { slot: 0, char: 'tammo', naam: 'Tammo', kleur: '#4fb3ff', vorm: 'driehoek', rol: 'host', verbinding: 'ok', hoofdrol: true },
    { slot: 1, char: 'anita', naam: 'Tessa', kleur: '#ff7ab8', vorm: 'ruit', rol: 'gast', verbinding: 'ok', hoofdrol: true },
    { slot: 2, char: 'sanne', naam: 'Sanne', kleur: '#5bd6a0', vorm: 'cirkel', rol: 'gast', verbinding: 'ok', hoofdrol: false },
  ] });
  await sleep(900);
  await capture('samen-spelen', 400);
  v.close();
  // het aansluiten: een code invoeren en een eigen figuur kiezen
  root.innerHTML = '';
  const v2 = LU.mountLobby(root, hooks, { keuze: 'gast', spelNaam: 'Mijn eerste zomer' });
  await sleep(700);
  await capture('samen-aansluiten', 400);
  v2.close(); PM.closePauseMenu();
});

// 7. een achtervolging (vóór de verhaalstappen: een lopende missie zet zijn melding in beeld): een auto op een lange straat, drie sterren, de politie komt erachteraan; het spelbeeld met HUD
shot('achtervolging', async () => {
  hold = null; env = { clock: 14, weather: null, fix: true }; fixWorld(); w.wanted = 0; // 14:00: de berichten van 16:30 staan er nog niet
  const [x0, y0] = RS.rit || [106, 420];
  teleport(x0, y0); hold = { x: x0, y: y0 }; await sleep(SETTLE);
  const sn = snapRoad(x0, y0, 600);
  if (!sn) throw new Error('geen weg gevonden');
  // de Escapade (rood, oud en koppig) als hij er staat, anders de dichtstbijzijnde auto
  const car = w.vehicles.find((v) => v.isHeroCar && !v.wrecked) || w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.isBus && !v.isPolice && !v.dead)
    .sort((a, b) => Math.hypot(a.x - sn.x, a.y - sn.y) - Math.hypot(b.x - sn.x, b.y - sn.y))[0];
  if (!car) throw new Error('geen auto');
  hold = null; teleport(sn.x, sn.y);
  car.x = sn.x; car.y = sn.y; car.angle = sn.a; car.speed = 0;
  p.enterVehicle(car, w);
  w.camYaw = sn.a;
  await sleep(2500);
  w.wanted = 3; w.wantedDecayTimer = 0;
  kb('keydown', 'w', 'KeyW');
  try {
    await sleep(5000); console.log('[capture] achtervolging'); await sleep(700); // 5 s na de start: de melding 'Achtervolging' staat dan nog in beeld
  } finally { kb('keyup', 'w', 'KeyW'); }
  w.wanted = 0; await sleep(300);
  if (p.inVehicle) p.exitVehicle(map, w);
});

// 8. de opening (Mijn eerste zomer: verhuisdag) en een missie-intro, met ondertitel
async function storyShots(name, step, waits, clock) {
  hold = null; env = { clock: clock !== undefined ? clock : 14, weather: null, fix: false }; setWeather(); skipCine = false;
  const S2 = window.__story;
  S2.jump(step, { start: true });
  if (clock !== undefined) w.clock = clock;
  let t = 0;
  for (const [i, at] of waits.entries()) { await sleep(at - t); t = at; console.log('[capture] ' + name + (waits.length > 1 ? '-' + i : '')); await sleep(600); t += 600; }
  skipCine = true; if (cine.isCinematicActive()) cine.skipCinematic();
}
// de opening: wacht tot de regel met de Martinitoren in beeld staat (de tijd hangt van de belasting af, de regel niet)
shot('cutscene-opening', async () => {
  hold = null; env = { clock: 10, weather: null, fix: false }; setWeather(); skipCine = false;
  teleport(106, 58); await sleep(SETTLE); // de scène speelt rond de speler: altijd op de Grote Markt beginnen
  // eerst M01 en dan M00: zo start de verhuisdag opnieuw, ook als het spel hem al achter de rug had
  window.__story.jump('M01', { start: true }); await sleep(1500);
  if (cine.isCinematicActive()) cine.skipCinematic();
  window.__story.jump('M00', { start: true }); w.clock = 10;
  const lijn = document.querySelector('#cine .cine-line');
  let gezien = false, laatste = '';
  for (let i = 0; i < 900 && !gezien; i++) { await sleep(100); laatste = lijn ? lijn.textContent : laatste; gezien = !!lijn && /Martinitoren/.test(lijn.textContent); }
  if (!gezien) throw new Error('de regel met de Martinitoren kwam niet; laatste regel: ' + laatste);
  await sleep(1200);
  await capture('cutscene-opening', 100);
  skipCine = true; if (cine.isCinematicActive()) cine.skipCinematic();
});
// verkenning van een missiemoment: --only=missie-verken maakt een reeks beelden van een stap
shot('missie-verken', async () => storyShots('missie-verken', RS.stap || 'M02', RS.waits || [8000, 16000, 24000, 32000, 40000, 48000]));

const rec = [];
for (const S of SHOTS) {
  if (!RS.only.length && /^(scout|missie-verken)$/.test(S.name)) continue; // alleen op verzoek
  if (RS.only.length && !RS.only.some((o) => S.name === o || S.name.startsWith(o))) continue;
  const r = { name: S.name };
  try { await S.fn(); } catch (e) { r.fout = String(e && e.stack || e).slice(0, 400); skipCine = true; ownShot = false; hold = null; try { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e2) { /* verder */ } }
  const fresh = errors.splice(0); if (fresh.length) r.errors = fresh.slice(0, 5);
  rec.push(r);
}
hold = null; done = true; clearInterval(skipper); dropBoat();
console.error = origErr;
return JSON.stringify({ shots: rec });
