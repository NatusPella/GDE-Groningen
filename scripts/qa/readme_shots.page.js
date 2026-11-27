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
  const okc = cine.playCinematic({ id: 'rs-view', duration: 60, priority: 9, letterbox: false, skippable: false, shot: () => (typeof pose === 'function' ? pose() : pose) });
  await sleep(wait);
  console.error('[pose] ' + name + ' start ' + okc + ' actief ' + cine.isCinematicActive('rs-view') + ' cam ' + JSON.stringify(w.cameraOverride && w.cameraOverride.position) + ' paused ' + w.paused + ' t ' + w.time + ' pm ' + PM.isPauseMenuOpen() + ' gs ' + document.body.className);
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
shot('scout', async () => {
  const RD0 = await imp('rdnew');
  for (const o of RS.scout || []) {
    // at: [breedte, lengte] in graden (WGS84); dc / dl: camera en kijkpunt in meters ten opzichte daarvan [dx, dy, hoogte]
    if (o.at) { const [x, y] = RD0.wgsToWorld(o.at[0], o.at[1]); o.cam = [x + o.dc[0], y + o.dc[1], o.dc[2]]; o.look = [x + o.dl[0], y + o.dl[1], o.dl[2]]; }
    try { await worldPose('scout-' + o.name, o); } catch (e) { console.error('[scout] ' + o.name + ' ' + e.message); }
  }
});

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


// ================= gameplay (README, 25-11) =================
const loading = () => document.querySelector('.ls.on:not(.out)');
const RD = await imp('rdnew');
// de speler op een plek zetten en wachten tot de tegels er zijn en het laadscherm weg is
async function arrive(x, y, settle = 6000) {
  hold = null; teleport(x, y); hold = { x, y };
  await sleep(1200);
  for (let i = 0; i < 450 && loading(); i++) await sleep(100);
  await sleep(settle); teleport(x, y); fixWorld();
}
// een spelbeeld met HUD: normale camera achter de speler (of voertuig); cam = { yaw }
let kaartenWeg = false; // meldingskaarten (tips, berichten) uit beeld in een minigame: de eigen HUD van het spel blijft
const liveShot = async (name, wait = 1500) => {
  await sleep(wait);
  const kaarten = kaartenWeg ? [...document.querySelectorAll('.hud-cards, .hud-cards-e, .ach-toast, .phonefeed')] : [];
  for (const k of kaarten) k.style.visibility = 'hidden';
  await sleep(150);
  console.log('[capture] ' + name); await sleep(700);
  for (const k of kaarten) k.style.visibility = '';
};
const driveTo = (v, pts, speed, ctl = {}) => new Promise((res) => {
  let i = 0;
  const iv = setInterval(() => {
    const t = ctl.stop ? null : pts[i];
    if (!t) { clearInterval(iv); v.speed = 0; v.vx = 0; v.vy = 0; res(); return; }
    const dx = t.x - v.x, dy = t.y - v.y, dd = Math.hypot(dx, dy), step = speed * 0.05;
    if (dd <= step) { v.x = t.x; v.y = t.y; i++; return; }
    v.angle = Math.atan2(dy, dx); v.x += dx / dd * step; v.y += dy / dd * step; v.speed = speed; v.vx = dx / dd * speed; v.vy = dy / dd * speed;
    p.x = v.x; p.y = v.y;
  }, 50);
});

// 1. boeren: de akker van Boerderij De Zonnehoek, jong en rijp gewas
const boerPlek = async () => {
  env = { clock: 11.2, weather: null, fix: true }; fixWorld();
  const [fx, fy] = RD.wgsToWorld(53.2336, 6.4977);
  await arrive(fx, fy, 6000);
  for (let i = 0; i < 80 && !(D.sidejobs && D.boerderij); i++) await sleep(500);
  let spot = null;
  for (let i = 0; i < 60; i++) { spot = D.sidejobs.spots().find((s) => s.job.id === 'boerderij'); if (spot && !spot.fallback && Math.hypot(spot.x - fx, spot.y - fy) < 400) break; await sleep(1000); }
  if (!spot) throw new Error('geen boerderijspot');
  console.error('[boer] spot ' + JSON.stringify({ x: spot.x, y: spot.y, fb: spot.fallback }));
  return spot;
};
shot('boeren-akker', async () => {
  const spot = await boerPlek();
  const BR = D.boerderij; BR.kies('bieten'); w.money = Math.max(w.money, 1500);
  await arrive(spot.x, spot.y + 4, 3000);
  const b0 = BR.get();
  b0.veld = { fase: 'gezaaid', gewas: 'bieten', bodem: 1, zaai: 1, mest: 1, cult: 0, spuit: 0, gezaaidOp: b0.uren };
  BR.tik(30); await sleep(3000);
  const pc = BR.get().perceel || { x: spot.x, y: spot.y, a: 0 };
  await arrive(pc.x, pc.y, 6000);
  const a = pc.a || 0;
  for (const [i, o] of [[-40, -30, 7], [30, -45, 4], [10, 40, 12], [0, -60, 25]].entries()) {
    const c = [pc.x + o[0], pc.y + o[1]];
    await poseShot('scout-boeren-akker-' + i, { position: { x: c[0], y: c[1], z: gh(c[0], c[1]) + o[2] }, lookAt: { x: pc.x, y: pc.y, z: gh(pc.x, pc.y) + 0.5 }, cut: true }, 2200);
  }
});

const rijPunten = (r) => { const pts = []; for (let a = 0; a <= r.len; a += 4) pts.push({ x: r.ax + r.ux * a, y: r.ay + r.uy * a }); return pts; };
shot('boeren-trekker', async () => {
  const spot = await boerPlek();
  const SJ = D.sidejobs, BR = D.boerderij; BR.kies('bieten'); w.money = Math.max(w.money, 1500);
  await arrive(spot.x, spot.y + 4, 3000); hold = null;
  const ok = SJ.start('boerderij'); await sleep(2500);
  const c = SJ.ctx(); if (!c) throw new Error('geen ctx ' + ok + JSON.stringify(SJ.last()));
  const v = c.vehicle; p.x = v.x; p.y = v.y; p.enterVehicle(v, w); await sleep(500);
  for (let t = 0; t < 60 && !(SJ.ctx() && SJ.ctx().data.ronde); t++) await sleep(500);
  const d = SJ.ctx().data; const r = d.rijen[1] || d.rijen[0];
  v.x = r.ax - r.ux * 6; v.y = r.ay - r.uy * 6; v.angle = Math.atan2(r.uy, r.ux); p.x = v.x; p.y = v.y; w.camYaw = v.angle;
  console.error('[boer] rij ' + JSON.stringify({ ax: r.ax, ay: r.ay, len: r.len, ux: r.ux, uy: r.uy }));
  await sleep(1500);
  const ctl = {}; const run = driveTo(v, rijPunten(r), 4.2, ctl);
  await sleep(4000);
  const side = (dist, h, ahead = 0, lead = 0) => () => { const nx = -r.uy, ny = r.ux; const cx = v.x + nx * dist + r.ux * ahead, cy = v.y + ny * dist + r.uy * ahead; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: v.x + r.ux * lead, y: v.y + r.uy * lead, z: gh(v.x, v.y) + 1.4 }, cut: true }; };
  await poseShot('scout-trekker-zij', side(11, 2.6, -2), 1500);
  await poseShot('scout-trekker-voor', side(7, 1.8, 14, 0), 1500);
  await poseShot('scout-trekker-hoog', side(16, 9, -6), 1500);
  ctl.stop = true; await run; SJ.quit(); await sleep(800);
  if (p.inVehicle) p.exitVehicle(map, w);
});
shot('boeren-koeien', async () => {
  const spot = await boerPlek();
  const out = [];
  for (const [dx, dy] of [[0, 0], [600, 600], [-600, 600], [900, -400], [-900, -700]]) {
    const x = spot.x + dx, y = spot.y + dy;
    await arrive(x, y, 5000);
    const cows = (w.wildlife || []).filter((a) => (a.kind === 'cow' || a.kind === 'sheep') && !a.gone && Math.hypot(a.x - x, a.y - y) < 250);
    out.push({ at: [Math.round(x), Math.round(y)], cows: cows.length, kinds: cows.slice(0, 3).map((a) => [a.kind, Math.round(a.x), Math.round(a.y)]) });
    if (cows.length >= 2) {
      const cx = cows.reduce((n, a) => n + a.x, 0) / cows.length, cy = cows.reduce((n, a) => n + a.y, 0) / cows.length;
      for (const [i, o] of [[-18, -14, 2.2], [14, -20, 1.6], [-4, 24, 3.0]].entries()) {
        const q = [cx + o[0], cy + o[1]];
        await poseShot('scout-koeien-' + out.length + '-' + i, { position: { x: q[0], y: q[1], z: gh(q[0], q[1]) + o[2] }, lookAt: { x: cx, y: cy, z: gh(cx, cy) + 0.9 }, cut: true }, 1800);
      }
      break;
    }
  }
  console.error('[koeien] ' + JSON.stringify(out));
});

shot('voetbal', async () => {
  env = { clock: 15.5, weather: null, fix: true }; fixWorld();
  const VB = window.__voetbal; const sp = VB.spot(); kaartenWeg = true;
  await arrive(sp.x, sp.y, 5000); hold = null;
  console.error('[vb] start ' + VB.start(true));
  skipCine = true;
  await sleep(14000);
  await liveShot('voetbal-a', 100);
  for (let k = 0; k < 5; k++) { key('3', 'Digit3'); await sleep(5000); console.error('[vb] ' + JSON.stringify(VB.state())); await liveShot('voetbal-b' + k, 100); }
  VB.quit(); await sleep(1500);
});

let nn = 0;
// minigames: naar de plek, starten, een paar beelden met de eigen camera van het spel (met HUD)
const miniStart = async (spot, clock, startFn) => {
  kaartenWeg = true;
  env = { clock, weather: null, fix: true }; fixWorld(); skipCine = true;
  await arrive(spot.x, spot.y, 5000); hold = null;
  const ok = startFn(); console.error('[mini] start ' + JSON.stringify(ok)); await sleep(800);
  return ok;
};
shot('mini-botsauto', async () => {
  const K = window.__kermis;
  await miniStart(K.spot(), 16.5, () => K.start(true));
  kb('keydown', 'w', 'KeyW');
  try {
    for (const t of [9000, 7000, 7000]) { await sleep(t); console.error('[mini] ' + JSON.stringify(K.state())); await liveShot('mini-botsauto-' + (nn++) + '-' + t, 100); }
  } finally { kb('keyup', 'w', 'KeyW'); }
  K.quit(); await sleep(1000);
});
shot('mini-padel', async () => {
  const P = window.__padel;
  const site = P.spots().find((s) => s.id === 'padel-1') || P.spots()[0];
  await miniStart(site, 17, () => { const r = P.start(site.id); P.auto(true); return r; });
  for (const t of [9000, 8000, 8000]) { await sleep(t); console.error('[mini] ' + JSON.stringify(P.state())); await liveShot('mini-padel-' + (nn++) + '-' + t, 100); }
  P.finish(true); await sleep(800);
});
shot('mini-karten', async () => {
  const K = window.__kartbaan;
  await miniStart(K.spot(), 16, () => K.start(true));
  for (const t of [3000, 3500]) { await sleep(t); const st = K.state(); console.error('[mini] ' + JSON.stringify(st && { ph: st.phase, t: st.raceT })); await liveShot('mini-karten-' + (nn++) + '-' + t, 100); }
  kb('keydown', 'w', 'KeyW');
  try {
    for (const t of [3500, 2500]) { await sleep(t); const st = K.state(); console.error('[mini] ' + JSON.stringify(st && { ph: st.phase, t: st.raceT })); await liveShot('mini-karten-' + (nn++) + '-' + t, 100); }
  } finally { kb('keyup', 'w', 'KeyW'); }
  K.quit(); await sleep(1000);
});
shot('mini-discgolf', async () => {
  const G = window.__discgolf;
  await miniStart(G.spot(), 15.5, () => G.start(true));
  await sleep(2500); console.error('[mini] ' + JSON.stringify(G.state())); G.mode(G.modes()[0]); await sleep(3500);
  console.error('[mini] ' + JSON.stringify(G.state()));
  await liveShot('mini-discgolf-aim', 500);
  G.throwAt(0.85); await sleep(2200); await liveShot('mini-discgolf-worp', 100);
  await sleep(3500); await liveShot('mini-discgolf-na', 100);
  G.skip && G.skip(); await sleep(500);
});
shot('mini-pitchputt', async () => {
  const G = window.__pitchputt;
  await miniStart(G.spot(), 15.5, () => G.start(true));
  await sleep(3500); console.error('[mini] ' + JSON.stringify(G.state()));
  await liveShot('mini-pitch-aim', 500);
  G.shoot(0.8); await sleep(1800); await liveShot('mini-pitch-bal', 100);
  await sleep(3000); await liveShot('mini-pitch-na', 100);
});
shot('mini-reuzenrad', async () => {
  const K = window.__kermis; const H = window.__hoogvlieger;
  const KM = await imp('kermis'); KM.setKermisOverride(true); // de kermis staat er (een kermisdag), met het reuzenrad
  await miniStart(H.spot(), 18.3, () => { for (let i = 0; i < 40; i++) { if (H.board()) return true; } return false; });
  for (let i = 0; i < 12 && !H.state(); i++) { await sleep(2500); H.board(); }
  for (const t of [22000, 14000, 14000, 14000]) { await sleep(t); console.error('[mini] ' + JSON.stringify(H.state())); await liveShot('mini-reuzenrad-' + (nn++) + '-' + t, 100); }
  H.quit(); await sleep(800);
});

// een breed, recht wegstuk (hoofdweg) rond (x, y): midden en richting
function snapBig(x, y, R, minW = 8, minLen = 70) {
  let best = null;
  for (const rd of (map.roadsNear ? map.roadsNear(x, y, R) : []) || []) {
    if (!(rd.width >= minW) || rd.cat === 'foot' || rd.cat === 'cycle' || rd.busOnly) continue;
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const a = rd.pts[i], b = rd.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < minLen) continue;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, d = Math.hypot(mx - x, my - y);
      if (!best || d < best.d) best = { d, x: mx, y: my, a: Math.atan2(b[1] - a[1], b[0] - a[0]), w: rd.width, name: rd.name, cat: rd.cat, len };
    }
  }
  return best;
}

// heisten en achtervolgingen
shot('overval-geldwagen', async () => {
  const TF = await imp('trafficfleet'); const VX = await imp('vehicle');
  env = { clock: 14.5, weather: null, fix: true }; fixWorld(); w.wanted = 0; skipCine = true;
  const vs = window.__voetbal.spot(); const [x0, y0] = RS.rit2 || [vs.x, vs.y];
  await arrive(x0, y0, SETTLE);
  const sn = snapBig(x0, y0, 500) || snapRoad(x0, y0, 600); if (!sn) throw new Error('geen weg');
  console.error('[chase] weg ' + JSON.stringify(sn));
  const van = new VH.Vehicle(sn.x, sn.y, sn.a, TF.carModel('cashvan')); TF.applyFleetFlags(van, 'cashvan'); van.speed = 0; w.vehicles.push(van);
  const bx = sn.x - Math.cos(sn.a) * 9, by = sn.y - Math.sin(sn.a) * 9;
  hold = null; teleport(bx, by); p.angle = sn.a; w.camYaw = sn.a;
  await sleep(2500);
  VX.explodeVehicle(van, w); w.wanted = 3; w.wantedDecayTimer = 0;
  await sleep(7000); await liveShot('overval-a', 100);
  const cam = (back, side, h) => () => { const cx = van.x - Math.cos(sn.a) * back - Math.sin(sn.a) * side, cy = van.y - Math.sin(sn.a) * back + Math.cos(sn.a) * side; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: van.x, y: van.y, z: gh(van.x, van.y) + 1.4 }, cut: true }; };
  await poseShot('scout-overval-b', cam(14, 5, 2.4), 1200);
  await poseShot('scout-overval-c', cam(-9, 6, 2.0), 1200);
  await sleep(3000); await liveShot('overval-d', 100);
  w.wanted = 0;
});
shot('achtervolging-2', async () => {
  env = { clock: 16.8, weather: null, fix: true }; fixWorld(); w.wanted = 0; skipCine = true;
  const vs = window.__voetbal.spot(); const [x0, y0] = RS.rit2 || [vs.x, vs.y];
  await arrive(x0, y0, SETTLE);
  const sn = snapBig(x0, y0, 500) || snapRoad(x0, y0, 600); if (!sn) throw new Error('geen weg');
  console.error('[chase] weg ' + JSON.stringify(sn));
  const car = w.vehicles.find((v) => v.isHeroCar && !v.wrecked) || w.vehicles.filter((v) => !v.isBoat && !v.isBike && !v.isScooter && !v.isHeli && !v.isBus && !v.isPolice && !v.dead)
    .sort((a, b) => Math.hypot(a.x - sn.x, a.y - sn.y) - Math.hypot(b.x - sn.x, b.y - sn.y))[0];
  if (!car) throw new Error('geen auto');
  hold = null; teleport(sn.x, sn.y); car.x = sn.x; car.y = sn.y; car.angle = sn.a; car.speed = 0; p.enterVehicle(car, w); w.camYaw = sn.a;
  await sleep(2500); w.wanted = 4; w.wantedDecayTimer = 0;
  kb('keydown', 'w', 'KeyW');
  try {
    const cam = (back, side, h) => () => { const a = car.angle; const cx = car.x - Math.cos(a) * back - Math.sin(a) * side, cy = car.y - Math.sin(a) * back + Math.cos(a) * side; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: car.x, y: car.y, z: gh(car.x, car.y) + 1.0 }, cut: true }; };
    await sleep(6000); await liveShot('achtervolging-2-a', 100);
    await poseShot('scout-chase-achter', cam(8, 0, 2.6), 1500);
    await poseShot('scout-chase-zij', cam(-3, 7, 1.6), 1500);
    await poseShot('scout-chase-voor', cam(-12, 3, 1.4), 1500);
    console.error('[chase] politie ' + w.vehicles.filter((v) => v.isPolice).length);
  } finally { kb('keyup', 'w', 'KeyW'); }
  w.wanted = 0; await sleep(300);
  if (p.inVehicle) p.exitVehicle(map, w);
});

shot('heli-ballonjacht', async () => {
  const H = window.__heliRun;
  const sp = H.spot();
  await miniStart(sp, 17.2, () => { H.autopilot = true; return H.start('ballonjacht'); });
  for (const t of [8000, 7000, 7000, 8000]) { await sleep(t); const st = H.state(); console.error('[heli] ' + JSON.stringify(st && { ph: st.phase, t: st.t })); await liveShot('heli-' + (nn++) + '-' + t, 100); }
  H.abort(); await sleep(1500);
});

// menu's: telefoon, instellingen, winkels (kleding, kapper, wapens)
shot('menu-telefoon', async () => {
  hold = null; env = { clock: 15.5, weather: null, fix: true }; fixWorld(); skipCine = true;
  teleport(106, 58); await sleep(SETTLE * 0.5);
  for (const [panel, naam] of [['verhaal', 'menu-verhaal'], ['settings', 'menu-instellingen'], ['spullen', 'menu-spullen'], ['loopbaan', 'menu-loopbanen'], ['veroverd', 'menu-veroverd']]) {
    PM.openPauseMenu(panel); await sleep(1800); await capture(naam, 300);
    PM.closePauseMenu(); await sleep(500);
  }
});
shot('menu-winkels', async () => {
  const SH = await imp('shops'); const SHUI = await imp('shopui');
  hold = null; env = { clock: 15.5, weather: null, fix: true }; fixWorld(); skipCine = true;
  teleport(106, 58); await sleep(SETTLE * 0.5);
  const all = SH.getShopsForRender();
  console.error('[winkels] ' + JSON.stringify([...new Set(all.map((x) => x.type))]));
  for (const type of RS.winkels || ['kleding', 'kapper', 'wapens']) {
    const sp = all.find((x) => x.type === type);
    if (!sp) { console.error('[winkels] geen ' + type); continue; }
    SH.openShopFromInterior(w, sp); await sleep(2500);
    const hud = document.querySelector('#hud'); if (hud) hud.style.visibility = 'hidden';
    await capture('menu-winkel-' + type, 300);
    if (hud) hud.style.visibility = '';
    key('Escape'); await sleep(700);
    if (document.body.classList.contains('shop-open')) { key('Escape'); await sleep(500); }
  }
});

shot('boot-rondvaart', async () => {
  const RV = await imp('sidejob_rondvaart'); const LINE = RV.LINE;
  const SJ = D.sidejobs;
  env = { clock: 17.4, weather: null, fix: true }; fixWorld(); skipCine = true;
  await arrive(153.03, 765.89, 6000); hold = null;
  w.money = Math.max(w.money, 500);
  const ok = SJ.start('rondvaart'); await sleep(800);
  const c = SJ.ctx(); console.error('[boot] start ' + ok + ' ctx ' + !!c);
  if (!c) throw new Error('geen rondvaart ' + JSON.stringify(SJ.last()));
  const v = c.vehicle; console.error('[boot] v ' + Math.round(v.x) + ',' + Math.round(v.y));
  if (!p.inVehicle) { p.x = v.x; p.y = v.y; p.enterVehicle(v, w); }
  await sleep(1000);
  const pts = LINE.slice(2).map((q) => ({ x: q[0], y: q[1] }));
  const ctl = {}; const run = driveTo(v, pts, 3.4, ctl);
  await sleep(4000);
  const side = (dist, h, ahead = 0) => () => { const a = v.angle; const nx = -Math.sin(a), ny = Math.cos(a); const cx = v.x + nx * dist + Math.cos(a) * ahead, cy = v.y + ny * dist + Math.sin(a) * ahead; return { position: { x: cx, y: cy, z: (gh(cx, cy) || 0) + h }, lookAt: { x: v.x, y: v.y, z: 1.6 }, cut: true }; };
  await poseShot('scout-rondvaart-zij', side(15, 3.2, -2), 1500);
  await poseShot('scout-rondvaart-voor', side(9, 2.2, 18), 1500);
  await poseShot('scout-rondvaart-laag', side(-13, 1.4, 4), 1500);
  await liveShot('rondvaart-live', 200);
  ctl.stop = true; await run; SJ.quit(); await sleep(800);
  if (p.inVehicle) p.exitVehicle(map, w);
});

shot('bus-halte', async () => {
  const SJ = D.sidejobs;
  const sp = SJ.spots().find((q) => q.job.id === 'bus');
  env = { clock: 15.5, weather: null, fix: true }; fixWorld(); skipCine = true;
  await arrive(sp.x, sp.y - 6, 6000); hold = null;
  w.money = Math.max(w.money, 500);
  const ok = SJ.start('bus'); await sleep(3500);
  const c = SJ.ctx(); console.error('[bus] start ' + ok + ' ctx ' + !!c);
  if (!c) throw new Error('geen buscontext ' + JSON.stringify(SJ.last()));
  const v = c.vehicle || w.vehicles.find((q) => q.isBus);
  console.error('[bus] v ' + !!v + ' ' + (v && Math.round(v.x) + ',' + Math.round(v.y)));
  if (!p.inVehicle) { p.x = v.x; p.y = v.y; p.enterVehicle(v, w); }
  await sleep(1500);
  const side = (dist, h, ahead = 0) => () => { const a = v.angle; const nx = -Math.sin(a), ny = Math.cos(a); const cx = v.x + nx * dist + Math.cos(a) * ahead, cy = v.y + ny * dist + Math.sin(a) * ahead; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: v.x, y: v.y, z: gh(v.x, v.y) + 1.5 }, cut: true }; };
  kb('keydown', 'w', 'KeyW');
  try {
    await sleep(5000); await liveShot('bus-live-a', 100);
    await poseShot('scout-bus-zij', side(10, 2.4, 3), 1500);
    await sleep(6000); await liveShot('bus-live-b', 100);
    await poseShot('scout-bus-voor', side(7, 1.7, 12), 1500);
    console.error('[bus] stand ' + JSON.stringify(SJ.progress && SJ.progress()));
  } finally { kb('keyup', 'w', 'KeyW'); }
  SJ.quit(); await sleep(800);
  if (p.inVehicle) p.exitVehicle(map, w);
});

// fietsers: een echte NPC-fietser bij een kade of plein, met een volgcamera
shot('fiets-gracht', async () => {
  env = { clock: 17.2, weather: null, fix: true }; fixWorld(); skipCine = true;
  const plekken = RS.fietsplekken || [[19, 256], [500, 62], [554, 177], [106, 58], [606, 275]];
  for (const [x, y] of plekken) {
    await arrive(x, y, 5500); hold = null;
    const bikes = w.vehicles.filter((v) => v.isBike && !v.wrecked && !v.playerOwned && Math.hypot(v.x - x, v.y - y) < 120).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    console.error('[fiets] ' + x + ',' + y + ' fietsen ' + bikes.length + ' ' + bikes.slice(0, 3).map((b) => Math.round(b.speed * 10) / 10).join(','));
    const v = bikes.find((b) => Math.abs(b.speed) > 1.5) || bikes[0];
    if (!v) continue;
    hold = { x: v.x, y: v.y }; const tr = setInterval(() => { hold = { x: v.x, y: v.y }; }, 50); // de speler (en zijn tegels) volgt de fietser
    const fol = (back, side, h) => () => { const a = v.angle; const cx = v.x - Math.cos(a) * back - Math.sin(a) * side, cy = v.y - Math.sin(a) * back + Math.cos(a) * side; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: v.x, y: v.y, z: gh(v.x, v.y) + 1.1 }, cut: true }; };
    await poseShot('scout-fiets-' + Math.round(x) + '-zij', fol(-2, 4.6, 1.5), 1200);
    await poseShot('scout-fiets-' + Math.round(x) + '-voor', fol(-6, 1.6, 1.3), 1200);
    await poseShot('scout-fiets-' + Math.round(x) + '-achter', fol(5, 1.5, 1.8), 1200);
    clearInterval(tr); hold = null;
    break;
  }
});

// zelf fietsen: de speler op een fiets op een recht stuk langs de kade, volgcamera
shot('fiets-rijden', async () => {
  env = { clock: 17.0, weather: null, fix: true }; fixWorld(); skipCine = true;
  const [x0, y0] = RS.fietsplek || [500, 62];
  await arrive(x0, y0, SETTLE);
  const sn = snapRoad(x0, y0, 250); if (!sn) throw new Error('geen weg');
  console.error('[fiets] weg ' + JSON.stringify(sn));
  const bike = w.vehicles.filter((v) => v.isBike && !v.wrecked).sort((a, b) => Math.hypot(a.x - sn.x, a.y - sn.y) - Math.hypot(b.x - sn.x, b.y - sn.y))[0];
  if (!bike) throw new Error('geen fiets');
  hold = null; teleport(sn.x, sn.y); bike.x = sn.x; bike.y = sn.y; bike.angle = sn.a; bike.speed = 0; p.enterVehicle(bike, w); w.camYaw = sn.a;
  await sleep(1500);
  kb('keydown', 'w', 'KeyW');
  try {
    const fol = (back, side, h) => () => { const a = bike.angle; const cx = bike.x - Math.cos(a) * back - Math.sin(a) * side, cy = bike.y - Math.sin(a) * back + Math.cos(a) * side; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: bike.x, y: bike.y, z: gh(bike.x, bike.y) + 1.0 }, cut: true }; };
    await sleep(3500); await liveShot('fiets-live', 100);
    console.error('[fiets] v ' + Math.round(bike.speed * 10) / 10 + ' hoek ' + bike.angle);
    await poseShot('scout-fietsrij-zij', fol(-1, 4.2, 1.4), 1000);
    await poseShot('scout-fietsrij-voor', fol(-6, 1.4, 1.3), 1000);
    await poseShot('scout-fietsrij-achter', fol(5.5, 1.2, 1.7), 1000);
  } finally { kb('keyup', 'w', 'KeyW'); }
  await sleep(300); if (p.inVehicle) p.exitVehicle(map, w);
});

shot('taxi-centrum', async () => {
  const SJ = D.sidejobs;
  const sp = SJ.spots().find((q) => q.job.id === 'taxi');
  env = { clock: 17.5, weather: null, fix: true }; fixWorld(); skipCine = true;
  await arrive(sp.x, sp.y - 6, 6000); hold = null;
  w.money = Math.max(w.money, 500);
  const ok = SJ.start('taxi'); await sleep(1500);
  const c = SJ.ctx(); console.error('[taxi] start ' + ok + ' ctx ' + !!c);
  if (!c) throw new Error('geen taxi ' + JSON.stringify(SJ.last()));
  const v = c.vehicle || w.vehicles.find((q) => q.isTaxi);
  console.error('[taxi] v ' + !!v + ' ' + (v && Math.round(v.x) + ',' + Math.round(v.y)));
  if (!p.inVehicle) { p.x = v.x; p.y = v.y; p.enterVehicle(v, w); }
  await sleep(1500);
  const side = (dist, h, ahead = 0) => () => { const a = v.angle; const nx = -Math.sin(a), ny = Math.cos(a); const cx = v.x + nx * dist + Math.cos(a) * ahead, cy = v.y + ny * dist + Math.sin(a) * ahead; return { position: { x: cx, y: cy, z: gh(cx, cy) + h }, lookAt: { x: v.x, y: v.y, z: gh(v.x, v.y) + 1.1 }, cut: true }; };
  kb('keydown', 'w', 'KeyW');
  try {
    await sleep(4500); await liveShot('taxi-live-a', 100);
    await poseShot('scout-taxi-zij', side(6.5, 1.5, 2), 1200);
    await poseShot('scout-taxi-voor', side(4.5, 1.2, 8), 1200);
    await poseShot('scout-taxi-achter', side(1.2, 2.0, -7), 1200);
    await sleep(3500); await liveShot('taxi-live-b', 100);
  } finally { kb('keyup', 'w', 'KeyW'); }
  SJ.quit(); await sleep(800);
  if (p.inVehicle) p.exitVehicle(map, w);
});
shot('markt-kraam', async () => {
  const SJ = D.sidejobs;
  const sp = SJ.spots().find((q) => q.job.id === 'marktkraam');
  env = { clock: 11.8, weather: null, fix: true }; fixWorld(); skipCine = true; kaartenWeg = true;
  await arrive(sp.x, sp.y - 3, 6000); hold = null;
  const ok = SJ.start('marktkraam'); await sleep(6000);
  console.error('[kraam] start ' + ok + ' ctx ' + !!SJ.ctx());
  await liveShot('kraam-live-a', 100);
  const g = (x, y) => gh(x, y);
  const cam = (dx, dy, h) => () => ({ position: { x: p.x + dx, y: p.y + dy, z: g(p.x + dx, p.y + dy) + h }, lookAt: { x: p.x, y: p.y, z: g(p.x, p.y) + 1.3 }, cut: true });
  await poseShot('scout-kraam-a', cam(5, -5, 2.0), 1200);
  await poseShot('scout-kraam-b', cam(-4, 6, 2.6), 1200);
  await poseShot('scout-kraam-c', cam(0, -9, 3.5), 1200);
  SJ.quit(); await sleep(800);
});

// verkenning: posities van minigames en bijbanen (--only=probe)
shot('probe', async () => {
  const out = {};
  const g = (k) => window[k];
  try { out.kermis = g('__kermis').spot(); } catch (e) { out.kermis = 'fout'; }
  try { out.padel = g('__padel').spots(); } catch (e) { out.padel = 'fout'; }
  try { out.kart = g('__kartbaan').spot(); } catch (e) { out.kart = 'fout'; }
  try { out.sj = D.sidejobs.spots().map((s) => ({ id: s.job.id, x: Math.round(s.x), y: Math.round(s.y), fb: !!s.fallback })); } catch (e) { out.sj = 'fout ' + e.message; }
  out.veh = {}; for (const v of w.vehicles) { const k = v.isBus ? 'bus' : v.isBoat ? 'boot' : v.isHeli ? 'heli' : v.isPolice ? 'politie' : v.isCashVan ? 'cash' : v.isBike ? 'fiets' : 'auto'; out.veh[k] = (out.veh[k] || 0) + 1; }
  out.p = [Math.round(p.x), Math.round(p.y)];
  out.keys = Object.keys(window).filter((k) => /^__/.test(k)).join(',');
  console.error('[probe] ' + JSON.stringify(out));
});

const rec = [];
for (const S of SHOTS) {
  if (!RS.only.length && /^(scout|missie-verken|probe)$/.test(S.name)) continue; // alleen op verzoek
  if (RS.only.length && !RS.only.some((o) => S.name === o || S.name.startsWith(o))) continue;
  const r = { name: S.name };
  try { await S.fn(); } catch (e) { r.fout = String(e && e.stack || e).slice(0, 400); skipCine = true; ownShot = false; hold = null; try { if (cine.isCinematicActive()) cine.skipCinematic(); if (PM.isPauseMenuOpen()) PM.closePauseMenu(); } catch (e2) { /* verder */ } }
  const fresh = errors.splice(0); if (fresh.length) r.errors = fresh.slice(0, 5);
  rec.push(r);
}
hold = null; done = true; clearInterval(skipper); dropBoat();
console.error = origErr;
return JSON.stringify({ shots: rec });
