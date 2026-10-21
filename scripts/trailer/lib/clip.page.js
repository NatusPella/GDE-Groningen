// Paginabibliotheek van de trailer-opnames (scripts/trailer/run.mjs plakt dit voor het clipscript; het geheel
// draait als async-functie in het spel, via de perf-script-haak van desktop/devtools.js).
//
// Het spel loopt hier met een VASTE tijdstap van 1/60 s: requestAnimationFrame is vervangen door een wachtrij die
// deze bibliotheek zelf afwerkt met een synthetische tijdstempel, CSS-animaties en timers gaan op dezelfde virtuele
// klok, en elk beeld wordt pas opgenomen als de wereld rond de camera klaar is met streamen (geen tegels in de
// wachtrij, geen bouwwerk in de worker, geen gebouwen/wegen te gaan). Zo laadt er nooit iets zichtbaar in tijdens
// de opname en is elke opname hetzelfde, hoe zwaar de machine ook belast is.
//
// Gebruik in een clipscript:  shot('naam', async (c) => { await c.teleport(x, y); await c.begin('naam'); await c.play(4, (t) => ...); await c.end(); });

const STEP_MS = 1000 / 60;
// toestand die een herladen van deze bibliotheek (repl_lib.mjs) moet overleven: de echte timers en de virtuele klok
const ST = window.__clipState || (window.__clipState = {
  rt: { setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window), raf: window.requestAnimationFrame.bind(window), now: () => performance.now() },
  vnow: performance.now(), rafQueue: [], rafId: 1, virtual: false, timers: new Map(), timerId: 1e6, ready: false,
});
const rt = ST.rt;
const sleep = (ms) => new Promise((r) => rt.setTimeout(r, ms));
const gd = window.gdeDesktop;
const world = window.__debug.world;
const player = world.player;
const logc = (...a) => console.log('[clip]', ...a);
const SHOTS = [];
const shot = (name, fn) => SHOTS.push({ name, fn });

// --- de virtuele klok -----------------------------------------------------------------------------------
// ST.vnow: tijdstempel van het laatste beeld (ms); ST.rafQueue / ST.timers: wachtende rAF-aanroepen en ST.timers

function installVirtualTime() {
  if (ST.virtual) return;
  ST.virtual = true;
  window.requestAnimationFrame = (cb) => { const id = ST.rafId++; ST.rafQueue.push({ id, cb }); return id; };
  window.cancelAnimationFrame = (id) => { ST.rafQueue = ST.rafQueue.filter((q) => q.id !== id); };
  // timers van het spel lopen op de virtuele klok (een kaart die 4 s blijft staan, blijft 4 s in beeld)
  window.setTimeout = (fn, ms = 0, ...rest) => {
    if (typeof fn !== 'function') return rt.setTimeout(fn, ms, ...rest);
    if (ms < 8) return rt.setTimeout(fn, ms, ...rest);
    const id = ST.timerId++;
    ST.timers.set(id, { due: ST.vnow + ms, fn: () => fn(...rest), every: 0 });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...rest) => {
    const id = ST.timerId++;
    ST.timers.set(id, { due: ST.vnow + Math.max(ms, STEP_MS), fn: () => fn(...rest), every: Math.max(ms, STEP_MS) });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => { if (ST.timers.has(id)) ST.timers.delete(id); else rt.clearTimeout(id); };
}

function runTimers() {
  for (const [id, t] of [...ST.timers]) {
    if (!ST.timers.has(id) || t.due > ST.vnow) continue;
    if (t.every) t.due += t.every; else ST.timers.delete(id);
    try { t.fn(); } catch (e) { console.error('timer', e && e.stack); }
  }
}

// CSS-overgangen en -animaties lopen op dezelfde klok: elke animatie wordt gepauzeerd en per beeld 1/60 s opgeschoven
function stepAnimations(ms) {
  let anims;
  try { anims = document.getAnimations(); } catch (e) { return; }
  for (const a of anims) {
    if (a.__vt === undefined) {
      a.__vt = 0;
      a.pause();
    }
    a.__vt += ms;
    const timing = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
    const end = timing ? timing.endTime : Infinity;
    if (Number.isFinite(end) && a.__vt >= end) { try { a.finish(); } catch (e) { /* al klaar */ } continue; }
    try { a.currentTime = a.__vt; } catch (e) { /* weg */ }
  }
}

// één beeld van de wereld: alle wachtende rAF-aanroepen met de volgende tijdstempel
function runCallbacks(dtMs) {
  ST.vnow += dtMs;
  const q = ST.rafQueue;
  ST.rafQueue = [];
  for (const { cb } of q) { try { cb(ST.vnow); } catch (e) { console.error('rAF', e && e.stack); } }
  runTimers();
  stepAnimations(dtMs);
}

// wacht tot de compositor het getekende beeld heeft (twee echte frames)
const present = () => new Promise((res) => rt.raf(() => rt.raf(res)));

// --- modules van het spel ------------------------------------------------------------------------------
const M = {};
function installStyles() {
  if (document.getElementById('clip-dev-style')) return;
  // dev-badge, profielbalk, wijkkaart (de opname gebruikt ?autoplay en dus de dev-modus) nooit in beeld
  const devStyle = document.createElement('style');
  devStyle.id = 'clip-dev-style';
  devStyle.textContent = '.sd-badge, #story-dev, .sd-panel, #profile-overlay, .profile-overlay, #wijk-card { display: none !important; }';
  document.head.appendChild(devStyle);
}
async function loadModules() {
  installStyles();
  M.scene = await import('/js/scene3d.js');
  M.geo = await import('/js/geojobs.js');
  M.cine = await import('/js/cinematics.js');
  M.day = await import('/js/daynight.js');
  M.load = await import('/js/loadscreen.js');
  M.camp = await import('/js/camerapath.js');
  M.veh = await import('/js/vehicle.js');
  M.shops = await import('/js/shops.js');
  M.route = await import('/js/routing.js');
  M.bot = await import('/js/botlogic.js');
  M.inp = await import('/js/input.js');
  M.set = await import('/js/settings.js');
  M.ps = await import('/js/pausestate.js');
  M.cd = await import('/js/cinedrive.js');
}

// wat er nog te laden is rond de camera (alles 0 = klaar)
function pending() {
  const sp = M.scene.streamPending();
  const map = world.map;
  const store = map.store ? map.store.loading : 0;
  const queue = map.tileQueue ? map.tileQueue.size : 0;
  const geo = M.geo.geoOpenCount ? M.geo.geoOpenCount() : 0;
  // achter een menu of de kaart staat het 3D-beeld stil (het spel bouwt dan niets bij): daar wachten we niet op
  const covered = M.ps && (M.ps.isPauseMenuOpen() || M.ps.isMapOpen());
  return { buildings: sp.buildings, roads: sp.roads, tiles: store, queue, geo, boost: sp.ahead ? 1 : 0, covered: covered ? 1 : 0, total: covered ? 0 : sp.buildings + sp.roads + store + queue + geo };
}

// klok en weer blijven per beeld vast staan (het spel laat ze zelf lopen)
const pins = { clock: null, weather: null };
function applyPins() {
  if (pins.clock !== null) { world.clock = pins.clock; M.day.refreshDayNight(world); }
  if (pins.weather) weather(pins.weather, true);
}

// --- de opname ---------------------------------------------------------------------------------------------
const rec = { events: [], on: false, name: '', frames: 0, extra: 0, maxPend: 0, maxExtra: 0, pendFrames: 0, t0: 0, log: [] };
const EXTRA_MS = 0.02;       // een tussenbeeld laat de klok 0,02 ms lopen (nooit 0: sommige stappen delen door dt)
const MAX_EXTRA = 240;       // meer dan 4 s wachten op streamen: geef op en meld het

// Handtekening van wat de scène aan bouwwerk heeft: het aantal gebouwde cellen (gebouwen, gevels, wegen, oevers) en
// geometrieën. Verandert hij tussen twee opgenomen beelden, dan is er iets bijgekomen of weggehaald: een mogelijke pop-in.
let lastSig = null;
function sceneSig() {
  const sc = window.__scene3d;
  if (!sc) return null;
  try {
    const b = sc.batches();
    return [b.buildings.builds, b.facades.builds, b.roads.builds, b.shores.builds, sc.renderer.info.memory.geometries].join('/');
  } catch (e) { return null; }
}

// zet de wereld één beeld verder (1/60 s) en wacht tot alle streaming klaar is; dan is het beeld klaar voor opname
async function advance({ capture = true, dtMs = STEP_MS } = {}) {
  applyPins();
  applyCam();
  world.cinematicHideNav = true; // geen routelijn of doelbaken in beeld
  runCallbacks(dtMs);
  await present();
  let n = 0;
  let p = pending();
  // streamen mag de tijd niet laten doorlopen: kleine tussenbeelden tot alles binnen is
  while (p.total > 0 && n < MAX_EXTRA) {
    if (n % 4 === 3) await sleep(16);
    runCallbacks(EXTRA_MS);
    await present();
    n++;
    p = pending();
  }
  ST.vnow -= EXTRA_MS * n; // de tussenbeelden tellen niet mee in de beeldklok
  if (rec.on) {
    rec.extra += n;
    rec.maxExtra = Math.max(rec.maxExtra, n);
    if (n) rec.pendFrames++;
    rec.maxPend = Math.max(rec.maxPend, p.total);
    const sig = sceneSig();
    if (sig !== lastSig) { if (lastSig !== null && capture) mark('scene', { sig, was: lastSig }); lastSig = sig; }
    if (capture) { await gd.clip('frame'); rec.frames++; }
  }
  return n;
}

// zonder opname: net zo lang beelden draaien tot de wereld rond de camera rustig is (opwarmen)
async function settle({ frames = 45, max = 1800, label = '' } = {}) {
  let calm = 0;
  let i = 0;
  const t0 = rt.now();
  for (; i < max && calm < frames; i++) {
    runCallbacks(STEP_MS);
    await present();
    if (pending().total === 0) calm++; else calm = 0;
    if (i % 4 === 3) await sleep(8);
  }
  const p = pending();
  logc(`settle${label ? ' ' + label : ''}: ${i} beelden, ${((rt.now() - t0) / 1000).toFixed(1)} s, nog ${p.total} (b${p.buildings} r${p.roads} t${p.tiles} q${p.queue} g${p.geo})`);
  return { calm: calm >= frames, frames: i, pending: p };
}

// --- camera, tijd, weer, HUD -------------------------------------------------------------------------------
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };

// De camera: world.cameraOverride (kaartcoördinaten, z = hoogte) is van het spel; cinematics.js wist hem elk beeld. Daarom
// vervangen we de eigenschap door een accessor: zolang er een regiecamera is, geeft hij onze pose terug en negeert hij
// het wissen. De pose wordt vlak vóór elk beeld berekend (applyCam, in advance); fn(t, world) geeft { position, lookAt, fov }.
// De regiecamera is geen filmpje: het spel loopt gewoon door (rijden, politie, verkeer) en de bediening blijft werken.
const CAM = ST.cam || (ST.cam = { fn: null, t: 0, pose: null, stored: null });
function installCamProp() {
  const d = Object.getOwnPropertyDescriptor(world, 'cameraOverride');
  if (d && d.get && d.get.__clip) return;
  CAM.stored = d && 'value' in d ? d.value : null;
  const get = () => (CAM.fn ? CAM.pose : CAM.stored);
  get.__clip = true;
  Object.defineProperty(world, 'cameraOverride', { configurable: true, enumerable: true, get, set(v) { if (!CAM.fn) CAM.stored = v; } });
}
function applyCam() {
  if (!CAM.fn) return;
  let p = null;
  try { p = CAM.fn(CAM.t, world); } catch (e) { console.error('camera', e && e.stack); }
  if (p) CAM.pose = { cut: true, fov: 55, ...p };
  CAM.t += 1 / 60;
}
function camera(fn, { hideHud = true } = {}) {
  installCamProp();
  CAM.fn = fn; CAM.t = 0; CAM.pose = null;
  applyCam();
  document.body.classList.toggle('cine-hide-hud', !!hideHud);
}
function releaseCam() { CAM.fn = null; CAM.pose = null; document.body.classList.remove('cine-hide-hud'); }
// eenvoudig: een vaste camera
function cam(position, lookAt, fov = 55) { camera(() => ({ position: { ...position }, lookAt: { ...lookAt }, fov })); }

// Catmull-Rom door punten {x,y,z}, t 0..1
function spline(pts, t) {
  const n = pts.length - 1;
  const f = clamp01(t) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const u = f - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (a, b, c2, d) => 0.5 * ((2 * b) + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
  return { x: c(p0.x, p1.x, p2.x, p3.x), y: c(p0.y, p1.y, p2.y, p3.y), z: c(p0.z ?? 0, p1.z ?? 0, p2.z ?? 0, p3.z ?? 0) };
}

const WEATHER = {
  helder: {}, zon: {}, mist: { mist: 0.6, overcast: 0.35 }, bewolkt: { overcast: 0.7 },
  motregen: { rain: 0.35, kind: 'motregen' }, regen: { rain: 0.7, kind: 'storm' }, storm: { rain: 1, kind: 'storm' },
};
function weather(name, fromPin = false) {
  if (!fromPin) pins.weather = name;
  const k = WEATHER[name] || WEATHER.helder;
  const rain = k.rain || 0;
  world.weather = {
    active: rain > 0, timer: 1e9, kind: k.kind, peak: rain, intensity: rain, wet: rain,
    overcast: k.overcast || 0, mist: k.mist || 0, windAngle: 0.9, elapsed: 0, duration: Infinity,
  };
}
function clock(h) { pins.clock = ((h % 24) + 24) % 24; applyPins(); }
function freeClock() { pins.clock = null; pins.weather = null; }

// de HUD van het spel aan of uit (kaarten, minikaart, aanwijzingen): in een trailer-shot zonder HUD
let hudStyle = null;
function hud(on) {
  if (!hudStyle) hudStyle = document.getElementById('clip-hud-style');
  if (!hudStyle) {
    hudStyle = document.createElement('style');
    hudStyle.id = 'clip-hud-style';
    hudStyle.textContent = '#hud, #minimap, .minimap, #prompts, .prompts, #subtitles, #cine, #toast-layer, #wijk-card, .wijk-card { visibility: hidden !important; }';
    document.head.appendChild(hudStyle);
  }
  hudStyle.disabled = !!on;
}

// hoogte van de grond (of het dak) op een plek, en een camerahoogte die er minstens `above` m boven blijft
const groundZ = (x, y) => (world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) : 0);
const safeZ = (x, y, above = 2) => Math.max(groundZ(x, y), M.camp.roofAt(world.map, x, y)) + above;

// speler en wereld naar een plek; de camera blijft waar hij is tot cam() wordt aangeroepen
function placePlayer(x, y, angle = null) {
  M.load.resetJumpWatch && M.load.resetJumpWatch();
  const s = (world.map.findOpenSpawn && world.map.findOpenSpawn(x, y, 40)) || { x, y };
  player.x = s.x; player.y = s.y; player.vx = 0; player.vy = 0;
  if (angle != null) { player.angle = angle; world.camYaw = angle; }
  M.scene.prewarmStreamAt(player.x, player.y, 6);
  return s;
}

// een toets indrukken zoals een speler: keydown, een beeld, keyup, een beeld
async function press(key, frames = 2) {
  M.inp.sendKey('keydown', key);
  for (let i = 0; i < frames; i++) await advance({ capture: false });
  M.inp.sendKey('keyup', key);
  await advance({ capture: false });
}
// alle schermen van het spel dicht (pauzemenu, opgeslagen spellen, kaart, winkel): de wereld loopt weer
async function resetUi() {
  const pm = await import('/js/pausemenu.js');
  const ss = await import('/js/saveslotsui.js');
  for (let i = 0; i < 4; i++) {
    let busy = false;
    if (ss.isSaveSlotsOpen()) { busy = true; await press('Escape'); }
    const ps = await import('/js/pausestate.js');
    if (ps.isPauseMenuOpen() || ps.isMapOpen()) { busy = true; pm.closePauseMenu(); for (let k = 0; k < 6; k++) await advance({ capture: false }); }
    if (!busy) break;
  }
}

// --- voertuigen en rijden ---------------------------------------------------------------------------------
// Een voertuig uit het spel (sleutel uit shopdata VEHICLE_STOCK, of 'hero' voor de Escapade) op een weg bij x, y.
function spawn(key, x, y, angle = null, { onRoad = true } = {}) {
  let v = null;
  const at = onRoad ? world.map.nearestRoadPoint(x, y, 120, true, true) : null;
  const px = at ? at.x : x, py = at ? at.y : y;
  let a = angle;
  if (a == null && at && at.road) { // rijrichting langs de weg
    const pts = at.road.pts; let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2, d = Math.hypot(px - mx, py - my); if (d < best) { best = d; a = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); } }
  }
  a = a ?? 0;
  if (key === 'hero') { v = M.veh.spawnHeroCarNear(world.map, px, py); if (v) { v.x = px; v.y = py; v.angle = a; } }
  else v = M.shops.spawnStockVehicle(world, key, px, py, a);
  if (!v) throw new Error('voertuig niet te plaatsen: ' + key);
  v.speed = 0; v.road = null; v.parked = false;
  if (!world.vehicles.includes(v)) world.vehicles.push(v);
  return v;
}
function enter(v) { player.x = v.x; player.y = v.y; player.enterVehicle(v, world); world.camYaw = v.angle; }
function leave() { if (player.inVehicle) player.exitVehicle(world.map, world); }

// Haalt voertuigen (en resten van eerdere opnames) weg binnen r meter van x, y; keep = voertuigen die blijven
function clearArea(x, y, r, keep = []) {
  const k = new Set(keep);
  const gone = world.vehicles.filter((v) => !k.has(v) && v.driver !== 'player' && Math.hypot(v.x - x, v.y - y) < r);
  world.vehicles = world.vehicles.filter((v) => !gone.includes(v));
  return gone.length;
}
// Politie en opsporing helemaal terug naar rust (na een achtervolging)
function calmPolice() {
  world.wanted = 0;
  const pol = world.police;
  if (pol) { pol.searching = false; if (pol.bust) { pol.bust.t = 0; pol.bust.progress = 0; pol.bust.mode = null; } }
  world.vehicles = world.vehicles.filter((v) => !(v.isPolice && !v.hijacked));
  world.pendingRespawn = null;
}

// Route over de wegen van het spel van a naar b ([x, y] elk), als punten.
function route(a, b, kind = 'drive', opts = {}) {
  const r = M.route.planLandRoute(world.map, kind, a, b, opts);
  if (!r) throw new Error('geen route ' + a + ' -> ' + b);
  return r.pts.map((p) => ({ x: p[0], y: p[1] }));
}

// Haalt verkeer en voetgangers uit de rijstrook vooruit, waar ze nog ver weg zijn (> farM m van het voertuig): zo rijdt de auto
// niet vast achter een file en raakt hij geen voetganger (geen bloed in de trailer), en niemand verdwijnt in beeld.
function sweepAhead(path, s, v, { laneW, pedW, farM }) {
  const pts = [];
  for (let t = Math.max(12, farM - 10); t <= 150 && s + t < path.len; t += 5) pts.push(path.at(s + t));
  if (!pts.length) return 0;
  const near = (e, w) => { for (const q of pts) if (Math.abs(q.x - e.x) < w && Math.abs(q.y - e.y) < w && Math.hypot(q.x - e.x, q.y - e.y) < w) return true; return false; };
  let n = 0;
  world.vehicles = world.vehicles.filter((e) => {
    if (e === v || e.driver === 'player' || e.isPolice) return true;
    if (Math.hypot(e.x - v.x, e.y - v.y) < farM) return true;
    if (near(e, laneW)) { n++; return false; }
    return true;
  });
  if (world.pedestrians) world.pedestrians = world.pedestrians.filter((e) => {
    if (Math.hypot(e.x - v.x, e.y - v.y) < farM) return true;
    if (near(e, pedW)) { n++; return false; }
    return true;
  });
  return n;
}

// Zoekt een vrije strook (geen gebouwen binnen width/2 + 2 m, geen water) van len meter in de buurt van x, y: { x, y, a } is het
// beginpunt en de richting (radialen); de strook ligt op minstens `skip` meter van x, y opgeschoven voor variatie.
function findRow(cx, cy, len, width, { R = 220, step = 12, angles = 16 } = {}) {
  const m = world.map;
  const u = null;
  // buildingsNear geeft alle gebouwen van de cel terug: daarom een echte punt-in-vlak-toets (roofAt) op de lijn en de zijkanten
  const free = (x, y, nx, ny) => [-width / 2, 0, width / 2].every((o) => M.camp.roofAt(m, x + nx * o, y + ny * o) === 0);
  let best = null;
  for (let r = 0; r <= R; r += step) {
    for (let k = 0; k < Math.max(1, Math.round(r / step * 6)); k++) {
      const ta = r === 0 ? 0 : (k / Math.max(1, Math.round(r / step * 6))) * Math.PI * 2;
      const x0 = cx + Math.cos(ta) * r, y0 = cy + Math.sin(ta) * r;
      for (let j = 0; j < angles; j++) {
        const a = (j / angles) * Math.PI;
        let ok = true;
        for (let d = 0; d <= len && ok; d += 5) if (!free(x0 + Math.cos(a) * d, y0 + Math.sin(a) * d, -Math.sin(a), Math.cos(a))) ok = false;
        if (ok) return { x: x0, y: y0, a, r };
      }
    }
  }
  return best;
}

// Een stuk weg van len meter vanaf de weg die het dichtst bij x, y ligt (ook buiten de stad, waar route() niet komt);
// toward = [x, y]: de kant op waar de weg heen moet lopen
function roadPts(x, y, len = 300, toward = null) {
  const m = world.map;
  const rp = m.nearestRoadPoint(x, y, 400, true, true);
  if (!rp) throw new Error('geen weg bij ' + x + ',' + y);
  let pts = rp.road.pts.map((q) => ({ x: q[0], y: q[1] }));
  // dichtstbijzijnde punt van de weg, dan de richting kiezen
  let bi = 0, bd = Infinity;
  pts.forEach((q, i) => { const d = Math.hypot(q.x - rp.x, q.y - rp.y); if (d < bd) { bd = d; bi = i; } });
  const fwd = pts.slice(bi), back = pts.slice(0, bi + 1).reverse();
  let use = fwd;
  if (toward) { const e = (a) => (a.length > 1 ? Math.hypot(a[a.length - 1].x - toward[0], a[a.length - 1].y - toward[1]) : Infinity); use = e(fwd) <= e(back) ? fwd : back; } else if (fwd.length < back.length) use = back;
  const out = [{ x: rp.x, y: rp.y }];
  let L = 0;
  for (const q of use) { const l = out[out.length - 1]; const d = Math.hypot(q.x - l.x, q.y - l.y); if (d < 0.5) continue; L += d; out.push(q); if (L >= len) break; }
  return out;
}

// Een bestuurder voor de speler in een voertuig: pure-pursuit over een gladgestreken route, met snelheid naar de
// bochten voor je. Het voertuig rijdt met de echte natuurkunde van het spel; de bestuurder drukt alleen de stick in
// (input.padAxis, net als de Spelbot). tick() per beeld aanroepen (in de play-functie). opts: top (m/s), look (m),
// grip (zijwaartse versnelling in m/s2 voor de bochtsnelheid), stopAtEnd.
function driver(pts, { top = 16, look = 6, grip = 5.5, stopAtEnd = false, steerGain = 1.9, sweep = true, laneW = 4.2, pedW = 3.4, farM = 60 } = {}) {
  const path = M.cd.smoothPath(pts.map((q) => [q.x, q.y]), 1);
  let s = 0;
  const norm = M.bot.normAngle;
  const api = {
    done: false, path, get s() { return s; },
    tick() {
      const v = player.inVehicle;
      if (!v) return;
      // dichtstbijzijnde punt op het pad vanaf de vorige positie
      let best = Infinity, bs = s;
      for (let t = Math.max(0, s - 4); t <= Math.min(path.len, s + 40); t += 1) { const q = path.at(t); const d = Math.hypot(q.x - v.x, q.y - v.y); if (d < best) { best = d; bs = t; } }
      s = bs;
      if (sweep && (ST.sweepN = (ST.sweepN || 0) + 1) % 5 === 0) sweepAhead(path, s, v, { laneW, pedW, farM });
      const sp = Math.abs(v.speed || 0);
      const Ld = look + sp * 0.55;
      if (s >= path.len - 2.5) { api.done = true; world.input.padAxis = [0, stopAtEnd ? 0.6 : 0]; return; }
      const tg = path.at(Math.min(path.len - 0.01, s + Ld));
      const err = norm(Math.atan2(tg.y - v.y, tg.x - v.x) - v.angle);
      // bocht vooruit: grootste hoekverandering per meter over de komende afstand
      let kmax = 0, prev = path.at(s).a;
      const horizon = Math.min(path.len - s, 10 + sp * 1.6);
      for (let t = 2; t <= horizon; t += 2) { const a = path.at(s + t).a; kmax = Math.max(kmax, Math.abs(norm(a - prev)) / 2); prev = a; }
      let vmax = Math.min(top, Math.sqrt(grip / Math.max(kmax, 1e-3)));
      if (stopAtEnd) vmax = Math.min(vmax, Math.max(2, (path.len - s) * 0.5));
      vmax = Math.max(vmax, 3.5);
      const steer = Math.max(-1, Math.min(1, err * steerGain));
      const thr = Math.max(-1, Math.min(1, (vmax - sp) * 0.45));
      world.input.padAxis = [steer, -thr];
      api.vmax = vmax; api.err = err;
    },
    stop() { world.input.padAxis = [0, 0]; },
    remaining: () => path.len - s,
  };
  return api;
}

// --- camerarigs: functies (t, world) => pose voor camera() -------------------------------------------------------
const exps = (dt, lag) => 1 - Math.exp(-dt / Math.max(1e-4, lag));
// de dichtstbijzijnde vrije plek (buiten gebouwen) op de lijn van (x0,y0) naar (x1,y1), vanaf x1,y1 teruggetrokken tot x0,y0
function clearAlong(x0, y0, x1, y1, minFrac = 0.18) {
  for (let f = 1; f >= minFrac; f -= 0.06) {
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f;
    if (M.camp.roofAt(world.map, x, y) === 0) return { x, y, f };
  }
  return { x: x0 + (x1 - x0) * minFrac, y: y0 + (y1 - y0) * minFrac, f: minFrac };
}
const rig = {
  // draait om een punt: straal r, hoogte z, van hoek a0 over sweep radialen in dur seconden; kijkt naar het punt op hoogte lookZ
  orbit(c, { r = 40, z = 12, a0 = 0, sweep = 1, dur = 4, lookZ = 3, fov = 50, rEnd = null, zEnd = null } = {}) {
    return (t) => {
      const u = Math.min(1, t / dur), k = smooth(u);
      const a = a0 + sweep * k, rr = rEnd == null ? r : lerp(r, rEnd, k), zz = zEnd == null ? z : lerp(z, zEnd, k);
      return { position: { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr, z: zz }, lookAt: { x: c.x, y: c.y, z: lookZ }, fov };
    };
  },
  // rechte beweging van a naar b (met z), kijkt van la naar lb; ease 'smooth' of 'lin'
  dolly(a, b, la, lb, { dur = 4, fov = 50, ease = 'smooth', fovEnd = null } = {}) {
    return (t) => {
      const u = Math.min(1, t / dur), k = ease === 'lin' ? u : smooth(u);
      const m = (p, q) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), z: lerp(p.z ?? 0, q.z ?? 0, k) });
      return { position: m(a, b), lookAt: m(la, lb || la), fov: fovEnd == null ? fov : lerp(fov, fovEnd, k) };
    };
  },
  // achtervolgingscamera achter een voertuig (of ander object met x, y, angle): dist achter, height boven de grond, side opzij;
  // lag = traagheid in s; kijkt lookAhead m vooruit. Blijft boven daken.
  chase(get, { dist = 9, height = 3, side = 0, lookAhead = 6, lag = 0.18, fov = 62, lookZ = 1.2, minAbove = 1.2 } = {}) {
    let pos = null, look = null, yaw = null;
    return (t) => {
      const v = get();
      if (!v) return null;
      const dt = 1 / 60;
      if (yaw === null) yaw = v.angle;
      let dy = v.angle - yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw += dy * exps(dt, lag * 1.4);
      const gz = (v.z || 0) + groundZ(v.x, v.y) * 0;
      const far = { x: v.x - Math.cos(yaw) * dist - Math.sin(yaw) * side, y: v.y - Math.sin(yaw) * dist + Math.cos(yaw) * side };
      const want = clearAlong(v.x, v.y, far.x, far.y);
      const wz = Math.max(groundZ(want.x, want.y) + height * (0.55 + 0.45 * want.f), (v.z || 0) + height * 0.5);
      const wl = { x: v.x + Math.cos(v.angle) * lookAhead, y: v.y + Math.sin(v.angle) * lookAhead, z: (v.z || groundZ(v.x, v.y)) + lookZ };
      if (!pos) { pos = { ...want, z: wz }; look = { ...wl }; }
      const k = exps(dt, lag);
      pos = { x: pos.x + (want.x - pos.x) * k, y: pos.y + (want.y - pos.y) * k, z: pos.z + (wz - pos.z) * k };
      look = { x: look.x + (wl.x - look.x) * exps(dt, lag * 0.6), y: look.y + (wl.y - look.y) * exps(dt, lag * 0.6), z: look.z + (wl.z - look.z) * k };
      return { position: { ...pos }, lookAt: { ...look }, fov };
    };
  },
  // vaste camera die een bewegend ding volgt (met trage draai): pos blijft, kijkt naar get() + lookZ
  fixed(pos, get, { fov = 40, lookZ = 1.2, lag = 0.25, dolly = null } = {}) {
    let look = null;
    return (t) => {
      const v = get();
      if (!v) return null;
      const w = { x: v.x, y: v.y, z: (v.z || groundZ(v.x, v.y)) + lookZ };
      if (!look) look = { ...w };
      const k = exps(1 / 60, lag);
      look = { x: look.x + (w.x - look.x) * k, y: look.y + (w.y - look.y) * k, z: look.z + (w.z - look.z) * k };
      const d = dolly ? { x: dolly.x * t, y: dolly.y * t, z: (dolly.z || 0) * t } : { x: 0, y: 0, z: 0 };
      return { position: { x: pos.x + d.x, y: pos.y + d.y, z: pos.z + d.z }, lookAt: { ...look }, fov };
    };
  },
  // zijkant: camera naast het voertuig op afstand, meebewegend (tracking shot)
  side(get, { dist = 7, height = 1.6, ahead = 1, fov = 45, lookZ = 1.1, left = false, lag = 0.08 } = {}) {
    let pos = null;
    return (t) => {
      const v = get();
      if (!v) return null;
      const sg = left ? -1 : 1;
      const far = { x: v.x + Math.cos(v.angle) * ahead - Math.sin(v.angle) * dist * sg, y: v.y + Math.sin(v.angle) * ahead + Math.cos(v.angle) * dist * sg };
      const want = clearAlong(v.x, v.y, far.x, far.y);
      const wz = Math.max(groundZ(want.x, want.y) + height, (v.z || 0) + height * 0.6);
      if (!pos) pos = { ...want, z: wz };
      const k = exps(1 / 60, lag);
      pos = { x: pos.x + (want.x - pos.x) * k, y: pos.y + (want.y - pos.y) * k, z: pos.z + (wz - pos.z) * k };
      return { position: { ...pos }, lookAt: { x: v.x, y: v.y, z: (v.z || groundZ(v.x, v.y)) + lookZ }, fov };
    };
  },
};

// harde sneden binnen één opname: cuts = [[t, () => rigFn], ...] (t in s); elke snede krijgt een verse rig, lokale tijd vanaf de snede
function cutCam(cuts) {
  let idx = -1, cur = null, t0 = 0;
  return (t, w) => {
    let i = 0;
    for (let k = 0; k < cuts.length; k++) if (t >= cuts[k][0]) i = k;
    if (i !== idx) { if (idx >= 0) mark('cut'); idx = i; cur = cuts[i][1](); t0 = cuts[i][0]; }
    return cur(t - t0, w);
  };
}

// --- teksten in beeld (bijschriften, titelkaart) -------------------------------------------------------------
// In het spel zelf getekend, met het lettertype en de huisstijl van het spel; hun animaties lopen op de virtuele klok.
let ovRoot = null;
function overlay() {
  if (ovRoot) return ovRoot;
  ovRoot = document.getElementById('clip-ov');
  if (ovRoot) return ovRoot;
  const st = document.createElement('style');
  st.textContent = `
  #clip-ov { position: fixed; inset: 0; z-index: 99990; pointer-events: none; overflow: hidden; font-family: 'Bebas Neue', 'Big Shoulders Display', 'Arial Narrow', Arial, sans-serif; color: #f0ede4; }
  #clip-ov .cl-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 42vh; background: linear-gradient(to top, rgba(4,10,8,0.62), rgba(4,10,8,0)); animation: clFade 0.5s both; }
  #clip-ov .cl-cap { position: absolute; left: 6vw; bottom: 9vh; font-size: min(12vh, 130px); line-height: 0.95; letter-spacing: 0.035em; text-shadow: 0 0.04em 0.14em rgba(0,0,0,0.7); animation: clUp 0.55s cubic-bezier(.2,.8,.2,1) both; }
  #clip-ov .cl-cap.right { left: auto; right: 6vw; text-align: right; }
  #clip-ov .cl-cap.center { left: 0; right: 0; text-align: center; bottom: 40vh; }
  #clip-ov .cl-cap small { display: block; font-size: 0.3em; letter-spacing: 0.26em; color: #3fc97a; margin-bottom: 0.25em; }
  #clip-ov .cl-cap.out { animation: clDown 0.35s ease-in both; }
  #clip-ov .cl-end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(ellipse at center, #10281a 0%, #07130c 70%); animation: clFade 0.6s both; }
  #clip-ov .cl-end .gde-logo { font-size: min(34vh, 380px); animation: clPop 0.8s cubic-bezier(.2,.9,.2,1) both; }
  #clip-ov .cl-end .cl-line { margin-top: 5vh; font-size: min(4.2vh, 44px); letter-spacing: 0.28em; color: #cfe8d8; animation: clUp 0.7s 0.5s cubic-bezier(.2,.8,.2,1) both; }
  #clip-ov .cl-end .cl-age { position: absolute; left: 3.2vw; bottom: 5vh; display: flex; align-items: center; gap: 1.4vw; animation: clFade 0.6s 0.9s both; }
  #clip-ov .cl-end .cl-pegi { width: 5vh; height: 6vh; border-radius: 5px; background: #d93f3f; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 3px #f0ede4; color: #fff; font-size: 3.2vh; line-height: 0.9; }
  #clip-ov .cl-end .cl-age span { font-size: 2.4vh; letter-spacing: 0.12em; color: #a9c4b4; font-family: 'Arial Narrow', Arial, sans-serif; text-transform: uppercase; }
  #clip-ov .cl-black { position: absolute; inset: 0; background: #000; }
  @keyframes clUp { from { opacity: 0; transform: translateY(0.35em); } to { opacity: 1; transform: none; } }
  @keyframes clDown { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(0.2em); } }
  @keyframes clFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes clPop { from { opacity: 0; transform: scale(1.08); } to { opacity: 1; transform: none; } }`;
  document.head.appendChild(st);
  ovRoot = document.createElement('div');
  ovRoot.id = 'clip-ov';
  document.body.appendChild(ovRoot);
  return ovRoot;
}
let capEl = null;
// bijschrift linksonder (pos 'right' of 'center'): kicker klein en groen erboven
function caption(text, { kicker = '', pos = '', scrim = true } = {}) {
  const r = overlay();
  clearCaption(true);
  if (scrim && !r.querySelector('.cl-scrim')) { const sc = document.createElement('div'); sc.className = 'cl-scrim'; r.appendChild(sc); }
  capEl = document.createElement('div');
  capEl.className = 'cl-cap ' + pos;
  capEl.innerHTML = (kicker ? '<small>' + kicker + '</small>' : '') + text;
  r.appendChild(capEl);
  return capEl;
}
function clearCaption(now = false) {
  const r = overlay();
  if (capEl) { if (now) capEl.remove(); else { const e = capEl; e.classList.add('out'); setTimeout(() => e.remove(), 400); } capEl = null; }
  if (now) return;
  const sc = r.querySelector('.cl-scrim'); if (sc) sc.remove();
}
// titelkaart: logo van het spel, regel eronder, leeftijdsbord. lines: tekst onder het logo
async function endCard({ line = '', age = true } = {}) {
  const r = overlay();
  const { logoHtml } = await import('/js/logo.js');
  const el = document.createElement('div');
  el.className = 'cl-end';
  el.innerHTML = logoHtml({ sub: true }) + (line ? '<div class="cl-line">' + line + '</div>' : '') + (age ? '<div class="cl-age"><div class="cl-pegi">18</div><span>Bevat geweld, alcohol en gesimuleerd gokken</span></div>' : '');
  r.appendChild(el);
  return el;
}
function clearOverlay() { if (ovRoot) ovRoot.innerHTML = ''; capEl = null; }
// speelt cues af tijdens play(): [[t, () => ...], ...]
function cueRunner(cues) {
  const fired = new Set();
  return (t) => { cues.forEach(([at, fn], i) => { if (t >= at && !fired.has(i)) { fired.add(i); fn(t); } }); };
}

// --- clips -------------------------------------------------------------------------------------------------
// een gebeurtenis in de opname (tijd in seconden sinds het begin van de clip): voor het geluid in de montage
const mark = (kind, data = {}) => { if (rec.on) rec.events.push({ t: +(rec.frames / 60).toFixed(3), kind, ...data }); };
// voorbeeldmodus (window.__preview = true): geen opname, wel de hele beweging in beeld; play() bewaart stills op 0, 1/3, 2/3 en het einde
const previewing = () => !!window.__preview;
async function begin(name) {
  CAM.t = 0; // de camera-tijd (en dus de sneden van cutCam) begint bij de eerste opgenomen beeld
  if (previewing()) { rec.events = []; rec.on = false; rec.name = name; rec.frames = 0; rec.t0 = rt.now(); return; }
  rec.events = [];
  rec.on = true; rec.name = name; rec.frames = 0; rec.extra = 0; rec.maxPend = 0; rec.maxExtra = 0; rec.pendFrames = 0; rec.t0 = rt.now();
  await gd.clip('begin', { name });
}
// seconds lang opnemen; fn(t, i, dt) mag per beeld de camera/de wereld sturen (t in seconden sinds het begin)
async function play(seconds, fn) {
  const n = Math.round(seconds * 60);
  const stills = previewing() ? new Set([0, 1, 2, 3, 4, 5].map((k) => Math.round((n - 1) * k / 5))) : null;
  for (let i = 0; i < n; i++) {
    if (fn) await fn(i / 60, i, 1 / 60, n);
    await advance({ capture: !stills });
    if (!stills) continue;
    rec.frames++;
    if (stills.has(i)) await gd.clip('png', { name: 'pv-' + rec.name + '-' + String(i).padStart(4, '0') });
  }
}
async function end() {
  if (previewing()) { const o = { name: rec.name, preview: true, frames: rec.frames, wall_s: +((rt.now() - rec.t0) / 1000).toFixed(1) }; logc('voorbeeld ' + JSON.stringify(o)); return o; }
  const r = await gd.clip('end');
  await gd.clip('json', { name: rec.name, data: { name: rec.name, frames: rec.frames, events: rec.events, stats: { extra: rec.extra, maxExtra: rec.maxExtra, framesWithWait: rec.pendFrames } } });
  const out = { name: rec.name, frames: rec.frames, wall_s: +((rt.now() - rec.t0) / 1000).toFixed(1), extraFrames: rec.extra, maxExtra: rec.maxExtra, framesWithWait: rec.pendFrames, maxPending: rec.maxPend, ffmpeg: r && r.code };
  rec.on = false;
  rec.log.push(out);
  logc('klaar ' + JSON.stringify(out));
  return out;
}
const png = (name) => gd.clip('png', { name });

// --- spel starten ------------------------------------------------------------------------------------------
async function skipCinematics(maxMs = 20000) {
  const t0 = rt.now();
  while (rt.now() - t0 < maxMs) {
    if (M.cine.isCinematicActive && M.cine.isCinematicActive()) { M.cine.skipCinematic(); await sleep(250); } else break;
  }
}

async function prepare() {
  await loadModules();
  for (let i = 0; i < 60 && !document.body.classList.contains('game-started'); i++) await sleep(500);
  await skipCinematics();
  await sleep(500);
  installVirtualTime();
  window.__clip = clipApi;
  // geen eigen filmpjes van het spel (landmark ontdekt, wijk, crash) tijdens opnames: die pauzeren het spel en nemen de camera over
  M.set.setSetting('cinematicMoments', false);
  world.cinematicHideNav = true; // geen routelijn of doelbaken in beeld
  hud(false);
  weather('helder');
  logc('klaar voor opname; venster ' + innerWidth + 'x' + innerHeight + ' @' + devicePixelRatio);
}

async function runAll(names, only = '') {
  await prepare();
  const out = [];
  const want = only ? only.split(',') : null;
  for (const s of SHOTS) {
    if (want && !want.includes(s.name)) continue;
    logc('== ' + s.name);
    try { await s.fn(clipApi); } catch (e) { logc('FOUT in ' + s.name + ': ' + (e && e.stack || e)); if (rec.on) { try { await end(); } catch (e2) { /* weg */ } } }
  }
  return JSON.stringify(rec.log);
}

const clipApi = {
  world, player, M, vnow: () => ST.vnow, sleep, advance, settle, pending, cam, releaseCam, spline, hud, weather, clock, placePlayer,
  rig, cutCam, overlay, caption, clearCaption, endCard, clearOverlay, cueRunner, findRow, roadPts, press, resetUi, clearArea, calmPolice, spawn, enter, leave, route, driver, mark, groundZ, safeZ, rt, camera, freeClock, begin, play, end, png, lerp, clamp01, smooth, smoother, skipCinematics, installVirtualTime, runCallbacks, present,
};
