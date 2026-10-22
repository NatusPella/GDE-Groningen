// Clips van de gameplaytrailer. Elke clip: de wereld wordt klaargezet, het spel loopt op de vaste tijdstap, de opname
// begint pas als alles geladen is (clip.page.js). Coördinaten zijn kaartmeters (x oost, y zuid) in het wereldframe van het spel.
// Duur in seconden; de montage (plans/gameplay.json) knipt op de maat van de muziek (135,469 bpm: een tel is 0,4429 s).

// --- gedeelde hulpjes ----------------------------------------------------------------------------------------------
const BEAT = 60 / 135.469;

// Klaarzetten van een plek: speler te voet op x, y (kijkt naar a), klok en weer.
function stand(c, { x, y, a = 0, clock = 17, weather = 'helder' }) {
  c.calmPolice();
  c.leave();
  c.releaseCam();
  c.clock(clock); c.weather(weather);
  c.placePlayer(x, y, a);
}

// Een rit met een voertuig over een route, met voorrijden vóór de opname zodat het op snelheid is.
async function carRun(c, o) {
  await c.resetUi();
  const { a, b, model = 'hero', clock = 17, weather = 'helder', dur = 3, top = 16, wanted = 0, lead = 3, name, rig, hud = false, hideHud = true, pts = null, grip = 5.5, via = null, noCam = false } = o;
  const w = c.world;
  c.leave();
  c.releaseCam();
  c.clock(clock); c.weather(weather);
  let route = pts || c.route(a, b);
  if (via) route = [...c.route(a, via), ...c.route(via, b).slice(1)];
  const a0 = Math.atan2(route[1].y - route[0].y, route[1].x - route[0].x);
  c.calmPolice();
  c.clearArea(route[0].x, route[0].y, 30);
  const v = c.spawn(model, route[0].x, route[0].y, a0);
  c.placePlayer(v.x + 3, v.y + 3);
  c.enter(v);
  c.clearArea(v.x, v.y, 14, [v]);
  const drv = c.driver(route, { top, grip });
  c.hud(hud);
  if (!noCam) c.camera(rig ? rig(v) : c.rig.chase(() => v), { hideHud });
  await c.settle({ label: name, frames: 25 });
  for (let i = 0; i < lead * 60; i++) { drv.tick(); await c.advance({ capture: false }); if (i === 60) w.wanted = wanted; }
  if (o.thumb) {
    // miniatuur: een paar beelden verder, het logo erop, één PNG
    for (let i = 0; i < (o.thumb.after || 60); i++) { drv.tick(); await c.advance({ capture: false }); }
    c.hud(false);
    await c.thumbOverlay({ pos: o.thumb.pos || 'links' });
    for (let i = 0; i < 40; i++) { drv.tick(); await c.advance({ capture: false }); }
    await c.png(o.thumb.name);
    c.clearOverlay(); drv.stop(); c.calmPolice();
    return { thumb: o.thumb.name };
  }
  await c.begin(name);
  await c.play(dur, () => drv.tick());
  const r = await c.end();
  c.calmPolice();
  drv.stop();
  return { ...r, speed: +v.speed.toFixed(1), remaining: Math.round(drv.remaining()) };
}

// Een scherm van het spel (pauzemenu, kaart, ...) opnemen: het scherm opent vóór de opname en krijgt de tijd om helemaal
// in te faden (anders zijn de eerste beelden de wereld met de HUD), daarna lopen de acties op hun tijd.
async function uiRun(c, { name, dur, open, cues = [], frame = null, fade = 50 }) {
  const pm = await import('/js/pausemenu.js');
  c.releaseCam();
  c.hud(false);
  await c.settle({ label: name, frames: 20 });
  await open(pm);
  for (let i = 0; i < fade; i++) await c.advance({ capture: false });
  await c.begin(name);
  const run = c.cueRunner(cues);
  await c.play(dur, (t) => { run(t); if (frame) frame(t); });
  const r = await c.end();
  await c.resetUi();
  return r;
}

// --- clips ---------------------------------------------------------------------------------------------------------
// HOOK: zonsopgang, de kraan zakt langs de Martinitoren de stad in
shot('g00-hook', async (c) => {
  stand(c, { x: 214, y: 60, clock: 6.35, weather: 'mist' });
  c.hud(false);
  const gz = (x, y) => c.groundZ(x, y);
  c.camera(c.rig.dolly({ x: 150, y: -70, z: 120 }, { x: 196, y: -4, z: 24 }, { x: 214, y: 10, z: 60 }, { x: 214, y: 10, z: 34 }, { dur: 3.55, fov: 46, fovEnd: 58 }));
  await c.settle({ label: 'g00', frames: 30 });
  await c.begin('g00-hook');
  await c.play(3.55, null);
  return c.end();
});

// S1 achtervolging in de binnenstad: vijf camerastandpunten in één opname (langs de route, politie erachter)
shot('s01-chase', async (c) => {
  const BAR = 4 * BEAT;
  return carRun(c, {
    name: 's01-chase', a: [300, 120], b: [900, 300], clock: 17.2, dur: 4 * BAR, top: 17, wanted: 3, lead: 7.6,
    rig: (v) => c.cutCam([
      [0, () => c.rig.chase(() => v, { dist: 8, height: 2.3, lag: 0.12, fov: 66 })],
      [1 * BAR, () => c.rig.chase(() => v, { dist: -9, height: 1.5, lookAhead: -6, lag: 0.1, fov: 70, lookZ: 1.0 })],
      [1.5 * BAR, () => c.rig.side(() => v, { dist: 6.5, height: 1.4, fov: 48, left: true, ahead: 2 })],
      [2 * BAR, () => c.rig.chase(() => v, { dist: 15, height: 26, lookAhead: 3, lag: 0.3, fov: 52, lookZ: 0 })],
      [3 * BAR, () => c.rig.chase(() => v, { dist: 10, height: 3.6, lag: 0.14, fov: 60 })],
    ]),
  });
});

// S2 nacht en regen: dezelfde stad, de koplampen aan
shot('s02-regen', async (c) => carRun(c, { name: 's02-regen', a: [300, 120], b: [900, 300], clock: 21.2, weather: 'regen', dur: 2 * 4 * BEAT, top: 15, lead: 5,
  rig: (v) => c.cutCam([[0, () => c.rig.chase(() => v, { dist: 9, height: 2.6, lag: 0.12, fov: 62 })], [4 * BEAT, () => c.rig.side(() => v, { dist: 6.5, height: 1.3, fov: 50, ahead: 1.5 })]]) }));

// S3 de stadsbus (echt verkeer, nieuwe bussen): de camera loopt mee langs de straat
shot('s03-bus', async (c) => {
  const w = c.world;
  c.leave(); c.releaseCam(); c.clock(16.6); c.weather('helder'); c.hud(false);
  c.placePlayer(480, 50, 0);
  let bus = null;
  for (let i = 0; i < 1500 && !bus; i++) {
    await c.advance({ capture: false });
    bus = w.vehicles.find((v) => v.isBus && v.speed > 4 && Math.hypot(v.x - 480, v.y - 50) < 300) || null;
  }
  if (!bus) return 'geen bus';
  c.placePlayer(bus.x, bus.y, 0);
  c.camera(c.rig.side(() => bus, { dist: 10, height: 1.6, fov: 54, ahead: 5 }));
  await c.settle({ label: 's03', frames: 25 });
  await c.begin('s03-bus');
  await c.play(4 * BEAT, null);
  const r = await c.end();
  return { ...r, bus: [Math.round(bus.x), Math.round(bus.y), +bus.speed.toFixed(1)] };
});

// S4 trekker langs het Reitdiep bij Garnwerd, gouden uur
shot('s04-trekker', async (c) => carRun(c, { name: 's04-trekker', model: 'trekker', pts: c.roadPts(-4899, -9421, 400, [-4300, -9900]), clock: 18.4, dur: 2 * 4 * BEAT, top: 7, lead: 3, grip: 4,
  rig: (v) => c.rig.chase(() => v, { dist: 9, height: 2.6, lag: 0.2, fov: 56 }) }));

// S5 snelle boot op het Reitdiep: een bestaande boot uit het spel, als speedboot gebouwd, vaart een stuk van het water
async function boatRun(c, o) {
  const { x, y, name, clock = 17.8, dur, rig, top = 14, minTrip = 220, lead = 2, weather = 'helder' } = o;
  const w = c.world;
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.clock(clock); c.weather(weather); c.hud(false);
  c.placePlayer(x, y, 0);
  for (let i = 0; i < 150; i++) await c.advance({ capture: false });
  const cand = w.vehicles.filter((v) => v.isBoat && !v.isPolice).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  if (!cand) throw new Error('geen boot bij ' + x + ',' + y);
  const sd = await import('/js/shopdata.js');
  cand.model = { ...sd.VEHICLE_STOCK[o.boat || 'speedboot'].model, color: sd.VEHICLE_STOCK[o.boat || 'speedboot'].color };
  const r = await import('/js/routing.js');
  const u = await import('/js/util.js');
  let trip = null;
  for (let R = minTrip; R <= minTrip + 200 && !trip; R += 40) {
    for (let k = 0; k < 24 && !trip; k++) {
      const a = (k / 24) * Math.PI * 2, tx = cand.x + Math.cos(a) * R, ty = cand.y + Math.sin(a) * R;
      if (!u.isInWater(w.map, tx, ty)) continue;
      const t = r.planBoatTrip(w.map, [cand.x, cand.y], [tx, ty], o.boat || 'speedboot');
      if (t && t.length > minTrip * 0.8) trip = t;
    }
  }
  if (!trip) throw new Error('geen vaarroute');
  const pts = trip.pts.map((q) => ({ x: q[0], y: q[1] }));
  w.vehicles = w.vehicles.filter((v) => v === cand || !(v.isBoat && Math.hypot(v.x - cand.x, v.y - cand.y) < 60));
  c.placePlayer(cand.x, cand.y); c.enter(cand);
  const drv = c.driver(pts, { top, grip: 3, look: 8, sweep: false });
  c.camera(rig ? rig(cand) : c.rig.chase(() => cand, { dist: 9, height: 2.2, lag: 0.15, fov: 60 }));
  await c.settle({ label: name, frames: 25 });
  for (let i = 0; i < lead * 60; i++) { drv.tick(); await c.advance({ capture: false }); }
  await c.begin(name);
  await c.play(dur, () => drv.tick());
  const out = await c.end();
  drv.stop();
  return { ...out, speed: +cand.speed.toFixed(1), remaining: Math.round(drv.remaining()), trip: Math.round(trip.length) };
}
shot('s05-boot', async (c) => boatRun(c, { name: 's05-boot', x: -5019, y: -9741, dur: 2 * 4 * BEAT, lead: 3, boat: 'rondvaartboot', top: 8,
  rig: (v) => c.cutCam([[0, () => c.rig.chase(() => v, { dist: 17, height: 5.5, lag: 0.15, fov: 58, lookZ: 0.5 })], [4 * BEAT, () => c.rig.side(() => v, { dist: 12, height: 1.4, fov: 46, ahead: 3, lookZ: 0.8, left: true })]]) }));

// S9 de collectie: een rij voertuigen op de Grote Markt, de camera loopt er langs (56 voertuigen in het spel)
shot('s09-collectie', async (c) => {
  const w = c.world;
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.clock(17.9); c.weather('helder'); c.hud(false);
  const keys = ['stadsfiets', 'stormvogel', 'mug', 'wervelwind', 'kanselier', 'taxi', 'stadsbus', 'tankwagen', 'ambulance', 'politie', 'trekkerlimo', 'fjordfrituur', 'trekker'];
  const gap = 7.4, len = gap * (keys.length - 1);
  c.placePlayer(101, 77, 0);
  await c.settle({ label: 's09-pre', frames: 10 });
  const row = c.findRow(101, 77, len + 30, 22, { R: 300 });
  if (!row) throw new Error('geen vrije strook');
  const ux = Math.cos(row.a), uy = Math.sin(row.a), nx = -uy, ny = ux; // langs de rij en loodrecht erop
  const P = (d, side, z = 0) => ({ x: row.x + ux * d + nx * side, y: row.y + uy * d + ny * side, z: c.groundZ(row.x + ux * d, row.y + uy * d) + z });
  c.placePlayer(row.x + ux * len / 2, row.y + uy * len / 2, 0);
  c.clearArea(row.x + ux * len / 2, row.y + uy * len / 2, len);
  const vs = [];
  keys.forEach((k, i) => { try { const q = P(5 + i * gap, 0); const v = c.spawn(k, q.x, q.y, row.a + Math.PI / 2, { onRoad: false }); v.parked = true; v.driver = 'cine'; v.speed = 0; vs.push(v); } catch (e) { /* ontbreekt */ } });
  c.camera(c.rig.dolly(P(-4, 6.5, 1.5), P(len + 6, 6.5, 1.7), P(4, 0, 1.1), P(len + 16, 0, 1.1), { dur: 4 * BEAT * 2, fov: 46, ease: 'lin' }));
  await c.settle({ label: 's09', frames: 40 });
  await c.begin('s09-collectie');
  await c.play(2 * 4 * BEAT, null);
  const r = await c.end();
  w.vehicles = w.vehicles.filter((v) => !vs.includes(v));
  return { ...r, n: vs.length, row };
});

// S8 de helikopter van het spel (echte vliegbesturing, via toetsen): opstijgen vanaf het helikopterplatform en over de stad
async function heliRun(c, o) {
  const { name, dur, to, alt = 75, lead = 12, clock = 18.2, rig, weather = 'helder' } = o;
  const w = c.world, inp = c.M.inp;
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false); c.clock(clock); c.weather(weather);
  const pad = w.map.meta.helipad;
  c.placePlayer(pad.x, pad.y, 0);
  for (let i = 0; i < 90; i++) await c.advance({ capture: false });
  const v = c.M.shops.spawnStockVehicle(w, 'wiekenwubbo', pad.x, pad.y, pad.angle || 0, c.groundZ(pad.x, pad.y));
  if (!v) throw new Error('geen heli');
  c.enter(v);
  const keys = new Set();
  const hold = (k, on) => { if (on && !keys.has(k)) { inp.sendKey('keydown', k); keys.add(k); } else if (!on && keys.has(k)) { inp.sendKey('keyup', k); keys.delete(k); } };
  const norm = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const tick = () => {
    const err = norm(Math.atan2(to.y - v.y, to.x - v.x) - v.angle);
    hold('d', err > 0.06); hold('a', err < -0.06);
    hold(' ', (v.z || 0) < alt - 2); hold('control', (v.z || 0) > alt + 6);
    hold('w', Math.abs(err) < 0.6 && (v.onGround ? (v.z || 0) > alt - 40 : true));
  };
  c.camera(rig ? rig(v) : c.rig.chase(() => v, { dist: 24, height: 9, lag: 0.25, fov: 55, lookZ: 0 }));
  await c.settle({ label: name, frames: 25 });
  for (let i = 0; i < lead * 60; i++) { tick(); await c.advance({ capture: false }); }
  await c.begin(name);
  await c.play(dur, () => tick());
  const r = await c.end();
  for (const k of [...keys]) hold(k, false);
  return { ...r, pos: [Math.round(v.x), Math.round(v.y), Math.round(v.z || 0)], speed: +(v.speed || 0).toFixed(1) };
}
shot('s08-heli', async (c) => heliRun(c, { name: 's08-heli', to: { x: 214, y: 10 }, dur: 2 * 4 * BEAT, lead: 14,
  rig: (v) => c.cutCam([[0, () => c.rig.chase(() => v, { dist: 26, height: 9, lag: 0.3, fov: 56, lookZ: 0 })], [4 * BEAT, () => c.rig.side(() => v, { dist: 30, height: -2, fov: 46, ahead: 8, lookZ: 0, left: true })]]) }));

// S11 de Vismarkt: fietsers, voetgangers en meeuwen, de camera glijdt op ooghoogte langs het plein
shot('s11-leven', async (c) => {
  stand(c, { x: 18, y: 258, clock: 16.3 });
  c.hud(false);
  await c.settle({ label: 's11-pre', frames: 10 });
  const row = c.findRow(18, 258, 46, 16, { R: 120 });
  if (!row) throw new Error('geen vrije strook');
  const ux = Math.cos(row.a), uy = Math.sin(row.a), nx = -uy, ny = ux;
  const P = (d, side, z = 0) => ({ x: row.x + ux * d + nx * side, y: row.y + uy * d + ny * side, z: c.groundZ(row.x + ux * d, row.y + uy * d) + z });
  c.placePlayer(row.x + ux * 23, row.y + uy * 23, 0);
  c.camera(c.rig.dolly(P(2, 5, 1.5), P(40, 5, 1.7), P(10, -2, 1.5), P(46, -2, 2.0), { dur: 2 * 4 * BEAT, fov: 50 }));
  await c.settle({ label: 's11', frames: 60 });
  await c.begin('s11-leven');
  await c.play(2 * 4 * BEAT, null);
  return { ...(await c.end()), row };
});

shot('u06-telefoon', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u06-telefoon', dur: 4 * BEAT, open: (pm) => pm.openPauseMenu('telefoon') });
});
shot('u07-prestaties', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u07-prestaties', dur: 4 * BEAT, open: (pm) => pm.openPauseMenu('prestaties') });
});
shot('u08-verhaal', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u08-verhaal', dur: 4 * BEAT, open: (pm) => pm.openPauseMenu('verhaal') });
});

// S06 nachtrit langs het water: andere route, neon en regen
shot('s06-nachtrit', async (c) => carRun(c, { name: 's06-nachtrit', a: [17, 300], b: [360, 160], clock: 22.6, weather: 'motregen', dur: 2 * 4 * BEAT, top: 16, lead: 5,
  rig: (v) => c.cutCam([[0, () => c.rig.chase(() => v, { dist: -9, height: 1.5, lookAhead: -6, lag: 0.1, fov: 68, lookZ: 1.0 })], [4 * BEAT, () => c.rig.chase(() => v, { dist: 10, height: 3.2, lag: 0.14, fov: 60 })]]) }));

// Miniaturen (1920x1080 PNG met het logo van het spel; thumbs.mjs maakt er 1280x720 van)
shot('t-gp-a', async (c) => carRun(c, { name: 't-gp-a', a: [300, 120], b: [900, 300], clock: 17.3, top: 15, wanted: 2, lead: 8,
  rig: (v) => c.rig.chase(() => v, { dist: -8.5, height: 1.5, lookAhead: -6, lag: 0.1, fov: 62, lookZ: 1.0 }), thumb: { name: 't-gp-a', pos: 'rechts', after: 40 } }));
shot('t-gp-b', async (c) => carRun(c, { name: 't-gp-b', model: 'trekker', pts: c.roadPts(-4899, -9421, 400, [-4300, -9900]), clock: 18.5, top: 7, lead: 3, grip: 4,
  rig: (v) => c.rig.chase(() => v, { dist: 9, height: 2.6, lag: 0.2, fov: 56 }), thumb: { name: 't-gp-b', pos: 'links', after: 30 } }));

// S12 slotachtervolging bij schemer
shot('s12-finale', async (c) => {
  const BAR = 4 * BEAT;
  return carRun(c, {
    name: 's12-finale', a: [17, 300], b: [360, 160], clock: 19.6, dur: 3 * BAR, top: 19, wanted: 4, lead: 6,
    rig: (v) => c.cutCam([
      [0, () => c.rig.chase(() => v, { dist: 7.5, height: 2.0, lag: 0.1, fov: 70 })],
      [0.5 * BAR, () => c.rig.chase(() => v, { dist: -8, height: 1.4, lookAhead: -6, lag: 0.1, fov: 72, lookZ: 1.0 })],
      [1.0 * BAR, () => c.rig.side(() => v, { dist: 6, height: 1.2, fov: 46, ahead: 2 })],
      [1.5 * BAR, () => c.rig.chase(() => v, { dist: 15, height: 24, lookAhead: 4, lag: 0.3, fov: 52, lookZ: 0 })],
      [2.25 * BAR, () => c.rig.chase(() => v, { dist: 9, height: 3, lag: 0.12, fov: 64 })],
    ]),
  });
});

// S99 de titelkaart: het logo van het spel, "Zomer vol misdaad" en de leeftijdsaanduiding
shot('s99-titel', async (c) => {
  await c.resetUi();
  c.hud(false);
  await c.settle({ label: 's99', frames: 5 });
  await c.begin('s99-titel');
  const sub = (window.__args && window.__args.sub) || '';
  const run = c.cueRunner([[0.0, () => c.endCard({ line: 'EEN GAME VAN NATUSPELLA', sub })]]);
  await c.play(4 * 4 * BEAT, (t) => run(t));
  const r = await c.end();
  c.clearOverlay();
  return r;
});

// UI: kaart
shot('u01-kaart', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  const mv = await import('/js/mapview.js');
  const D = 2 * 4 * BEAT;
  // de kaart zoomt langzaam in op het centrum (zoom 1 naar 3,6, exponentieel)
  return uiRun(c, { name: 'u01-kaart', dur: D, open: (pm) => pm.openPauseMenu('map'), frame: (t) => { if (t > 0.5) { const k = Math.min(1, (t - 0.5) / (D - 0.5)), e = k * k * (3 - 2 * k); mv.setMapView(110 - 60 * (1 - e), 70 - 60 * (1 - e), Math.pow(3.6, e)); } } });
});

shot('u02-garage', async (c) => {
  const shops = await import('/js/shops.js');
  const save = shops.getShopSave();
  if (!save.vehicles.some((v) => v.key === 'mug')) save.vehicles = [...save.vehicles, ...['stadsfiets', 'mug', 'koopman', 'wervelwind', 'trekker', 'bakfiets', 'stormvogel', 'klusbus'].map((k) => ({ key: k, color: null, upgrades: [], garage: true }))];
  shops.applyShopSave(c.world, save);
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  const v = c.spawn('hero', 101, 77); c.enter(v); // in de Escapade, zodat de opgeslagen voertuigen als "Thuis" staan
  return uiRun(c, { name: 'u02-garage', dur: 2 * 4 * BEAT, open: (pm) => pm.openPauseMenu('garage') });
});

shot('u03-overzicht', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u03-overzicht', dur: 4 * BEAT, open: (pm) => pm.openPauseMenu('overzicht') });
});

shot('u04-opgeslagen', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  const ss = await import('/js/saveslotsui.js');
  (await import('/js/savegame.js')).saveGame(c.world, { toast: false }); // wegwerpprofiel: zo staat er een opgeslagen spel in de lijst
  c.releaseCam(); c.hud(false);
  await c.settle({ label: 'u04', frames: 20 });
  ss.openSaveSlots({ mode: 'game', world: c.world });
  for (let i = 0; i < 50; i++) await c.advance({ capture: false });
  await c.begin('u04-opgeslagen');
  await c.play(2 * 4 * BEAT, null);
  const r = await c.end();
  await c.resetUi();
  return r;
});

shot('u05-samen', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u05-samen', dur: 2 * 4 * BEAT, open: (pm) => pm.openPauseMenu('samen'),
    cues: [[1.2, () => { const b = [...document.querySelectorAll('button')].find((x) => /uitnodigen/i.test(x.textContent)); if (b) b.click(); }]] });
});

// C01 Samen spelen (alleen met ?coop, repl_boot.mjs --url-add=coop): twee spelers op één scherm lopen over de Grote Markt;
// speler 1 (Tammo) met W, speler 2 (Tessa) met IJKL. De camera is die van het spel zelf (hij volgt en zoomt uit voor beiden).
async function coopRun(c, o) {
  const { name, x, y, a = 0.5, clock = 17.6, dur = 12 * BEAT, hud = false, p1 = [], p2 = [], thumb = null } = o;
  await c.resetUi();
  stand(c, { x, y, a, clock });
  c.calmPolice();
  c.clearArea(x, y, 40);
  c.world.companion.x = c.player.x + 1.4; c.world.companion.y = c.player.y; // Tessa staat naast Tammo
  c.hud(hud);
  if (!c.world.coop) throw new Error('geen coop: start het spel met ?coop');
  const inp = c.M.inp;
  const held = new Set();
  const key = (k, down) => { if (down === held.has(k)) return; if (down) held.add(k); else held.delete(k); inp.sendKey(down ? 'keydown' : 'keyup', k); };
  await c.settle({ label: name + '-pre', frames: 400 }); // in coop laden de gebouwen pas na een paar seconden (pending meldt dan al 0)
  // plannen: [van, tot, toets] in seconden
  const want = (t) => new Set([...p1, ...p2].filter(([a, b]) => t >= a && t < b).map((k) => k[2]));
  const step = (t) => { const w = want(t); for (const k of [...held]) if (!w.has(k)) key(k, false); for (const k of w) key(k, true); };
  try {
    if (thumb) {
      for (let i = 0; i < thumb.after * 60; i++) { step(i / 60); await c.advance({ capture: false }); }
      for (const k of [...held]) key(k, false);
      await c.thumbOverlay({ pos: thumb.pos || 'links' });
      for (let i = 0; i < 40; i++) await c.advance({ capture: false });
      await c.png(thumb.name);
      c.clearOverlay();
      return { thumb: thumb.name };
    }
    await c.begin(name);
    await c.play(dur, (t) => step(t));
    return await c.end();
  } finally { for (const k of [...held]) key(k, false); await c.advance({ capture: false }); }
}
shot('c01-samen', async (c) => coopRun(c, { name: 'c01-samen', x: 214, y: 60, a: 0.5, clock: 16.4, dur: 8 * BEAT,
  p1: [[0.2, 3.8, 'w'], [0.2, 3.8, 'shift']], p2: [[0.2, 3.8, 'i'], [0.2, 3.8, 'u']] }));

// S13 de beweegbare brug (Maagdenbrug): de bellen, de slagbomen en de klep die omhoog gaat; de camera draait langzaam om de brug
shot('s13-brug', async (c) => {
  await c.resetUi();
  const mb = await import('/js/movablebridges.js');
  const b = mb.getMovableBridges().find((x) => x.name === 'Maagdenbrug');
  if (!b) throw new Error('geen Maagdenbrug');
  c.calmPolice(); c.leave(); c.releaseCam(); c.clock(17.2); c.weather('helder'); c.hud(false);
  const a0 = Math.atan2(b.ux, -b.uy);
  c.placePlayer(b.x + b.ux * 60, b.y + b.uy * 60, 0);
  c.clearArea(b.x, b.y, 50);
  c.camera(c.rig.orbit({ x: b.x, y: b.y }, { r: 30, z: 7.5, a0: a0 - 0.35, sweep: 0.7, dur: 3.55, lookZ: 3, fov: 52 }));
  await c.settle({ label: 's13', frames: 40 });
  for (let i = 0; b.state !== 'closed' && i < 3600; i++) await c.advance({ capture: false }); // een eerdere opening eerst laten afronden
  mb.requestOpening(b, null, true, false);
  let n = 0;
  while (b.state !== 'opening' && n++ < 2400) await c.advance({ capture: false });
  for (let i = 0; i < 20; i++) await c.advance({ capture: false });
  await c.begin('s13-brug');
  await c.play(3.55, null);
  const r = await c.end();
  return { ...r, waited: n, state: b.state, open: +b.open.toFixed(2) };
});

// U09 de kaart van de hele provincie (kaartscherm M): uitgezoomd over Groningen met Friesland, Drenthe en Duitsland, daarna inzoomen naar de stad.
// De mistkaart is vooraf ingesteld (shots/seedfog.page.js) zodat "x% van Grunn verkend" in beeld staat. Een warme doorloop laadt alle basiskaarttegels.
// De mist van de stadskaart laten verdwijnen zoals na een paar uur spelen: de speler "staat" even op een rij plekken (het spel onthult de mist rond de speler,
// mapview.js updateFog); daarna staat hij weer op zijn plek en laadt de wereld opnieuw rond hem.
async function exploreCity(c, discs = [[110, 70, 1200], [250, -330, 700], [-300, 100, 600], [-1280, -1070, 900], [450, 160, 450]]) {
  const p = c.player, home = { x: p.x, y: p.y };
  let n = 0;
  for (const [cx, cy, r] of discs) {
    for (let y = -r; y <= r; y += 70) for (let x = -r; x <= r; x += 70) {
      if (x * x + y * y > r * r) continue;
      p.x = cx + x; p.y = cy + y; c.runCallbacks(16.7); n++;
    }
  }
  p.x = home.x; p.y = home.y;
  c.placePlayer(home.x, home.y);
  return n;
}
shot('u09-provincie', async (c) => {
  const pm = await import('/js/pausemenu.js');
  const mv = await import('/js/mapview.js');
  const pmap = await import('/js/provincemap.js');
  stand(c, { x: 110, y: 70, a: 0.5, clock: 17.6 });
  if (mv.getDiscoveredRatio() < 0.05) await exploreCity(c);
  await c.settle({ label: 'u09-wereld', frames: 60 });
  const D = 3 * 4 * BEAT;
  const b = pmap.provinceMapBounds();
  const c0 = { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2 }, c1 = { x: 110, y: 70 };
  const z0 = 0.01, z1 = 3.2; // z0 wordt vanzelf op de uitgezoomde stand gezet
  const path = (t) => { const k = Math.max(0, Math.min(1, (t - 0.9) / (D - 0.9))), e = k * k * (3 - 2 * k); return [c0.x + (c1.x - c0.x) * e, c0.y + (c1.y - c0.y) * e, z0 * Math.pow(z1 / z0, e)]; };
  c.releaseCam(); c.hud(false);
  await c.settle({ label: 'u09', frames: 20 });
  pm.openPauseMenu('map');
  for (let i = 0; i < 50; i++) await c.advance({ capture: false });
  // warme doorloop: alle tegels van elk niveau één keer geladen
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < Math.round(D * 60); i += 2) { mv.setMapView(...path(i / 60)); await c.advance({ capture: false }); if (i % 20 === 0) await c.sleep(40); }
  }
  mv.setMapView(...path(0));
  for (let i = 0; i < 90; i++) await c.advance({ capture: false });
  await c.sleep(1500);
  await c.begin('u09-provincie');
  await c.play(D, (t) => mv.setMapView(...path(t)));
  const r = await c.end();
  await c.resetUi();
  return { ...r, ratio: +mv.getDiscoveredRatio().toFixed(3) };
});

// S14 luchtopname boven de provincie: een vrije camera (geen voertuig) vliegt hoog langs een lijn; de speler loopt onder de camera mee zodat het spel de wereld
// eromheen laadt (lock-step: elk beeld pas na het streamen). from/to en look zijn kaartmeters {x, y}; z0/z1 hoogtes.
async function luchtRun(c, { name, from, to, ahead = 700, side = 0, z0, z1, dur, clock = 17.8, weather = 'helder', fov = 54, fovEnd = null, wait = 120, thumb = null }) {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false); c.clock(clock); c.weather(weather);
  c.placePlayer(from.x, from.y, 0);
  const L = (a, b, k) => a + (b - a) * k;
  const dl = Math.hypot(to.x - from.x, to.y - from.y) || 1, dx = (to.x - from.x) / dl, dy = (to.y - from.y) / dl;
  const pose = (t) => { const u = Math.min(1, t / dur), k = u; return { position: { x: L(from.x, to.x, k), y: L(from.y, to.y, k), z: L(z0, z1, c.smooth(u)) }, lookAt: { x: L(from.x, to.x, k) + dx * ahead - dy * side, y: L(from.y, to.y, k) + dy * ahead + dx * side, z: 0 }, fov: L(fov, fovEnd ?? fov, u) }; };
  c.camera(pose);
  const follow = (t) => { const u = Math.min(1, t / dur); c.player.x = L(from.x, to.x, u); c.player.y = L(from.y, to.y, u); };
  for (let i = 0; i < 60; i++) await c.advance({ capture: false });
  await c.settle({ label: name, frames: wait, max: 3600 });
  await c.begin(name);
  await c.play(dur, (t) => follow(t));
  return c.end();
}
const W = async (lat, lon) => (await import('/js/rdnew.js')).wgsToWorld(lat, lon);

// Reisreeks door de provincie: korte vluchten (1,5 tot 2 s) laag boven een streek, elk een eigen opname. hdg in graden (0 = noord, 90 = oost).
async function streekRun(c, { name, lat, lon, hdg, z = 22, speed = 60, dur = 2, ahead = 70, side = 0, clock = 15.5, weather = 'helder', fov = 62, back = 0 }) {
  const [x, y] = await W(lat, lon);
  const a = (hdg - 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const from = { x: x - dx * back, y: y - dy * back }, to = { x: from.x + dx * speed * dur, y: from.y + dy * speed * dur };
  return luchtRun(c, { name, from, to, ahead, side, z0: z, z1: z, dur, clock, weather, fov, wait: 150 });
}
const STREKEN = {
  'k-eemshaven': { lat: 53.4395, lon: 6.835, hdg: 250, z: 30, ahead: 120 },
  'k-delfzijl': { lat: 53.3303, lon: 6.9187, hdg: 200, z: 28, ahead: 110 },
  'k-dijk': { lat: 53.3769, lon: 6.4097, hdg: 280, z: 18, ahead: 90, side: 40 },
  'k-veenkolonie': { lat: 53.1067, lon: 6.8788, hdg: 150, z: 20, ahead: 90 },
  'k-bourtange': { lat: 53.0073, lon: 7.1917, hdg: 90, z: 22, ahead: 80 },
  'k-winsum': { lat: 53.3333, lon: 6.5167, hdg: 0, z: 22, ahead: 90 },
  'k-appingedam': { lat: 53.3217, lon: 6.8586, hdg: 90, z: 24, ahead: 100 },
  'k-uithuizen': { lat: 53.4086, lon: 6.6747, hdg: 180, z: 26, ahead: 100 },
  'k-zoutkamp': { lat: 53.3317, lon: 6.2919, hdg: 60, z: 24, ahead: 100 },
  'k-lauwersoog': { lat: 53.4047, lon: 6.2058, hdg: 120, z: 28, ahead: 110 },
};
for (const [k, v] of Object.entries(STREKEN)) shot(k, async (c) => streekRun(c, { name: k, ...v }));

// Minigames (activities.js, window.__activities): naar de plek, starten zoals een speler (E), een korte besturing, de eigen HUD van de minigame in beeld.
// plan: [[van, tot, toets], ...] in seconden na de start van de opname.
async function miniRun(c, { name, id, dur = 3 * BEAT, plan = [], clock = 15.5, weather = 'helder', pre = 2.2, start = 'interact', at = null, hudOn = true, thumb = null }) {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.clock(clock); c.weather(weather);
  const A = window.__activities, a = A.get(id);
  let spot = at || a.spots()[0];
  if (!spot) { try { spot = a.spots(true)[0]; } catch (e) { /* geen */ } }
  if (!spot) throw new Error('geen plek voor ' + id);
  c.hud(hudOn);
  c.placePlayer(spot.x, spot.y, 0);
  c.player.x = spot.x; c.player.y = spot.y;
  await c.settle({ label: name, frames: 150, max: 3600 });
  c.player.x = spot.x; c.player.y = spot.y;
  const inp = c.M.inp, held = new Set();
  const key = (k, on) => { if (on === held.has(k)) return; if (on) held.add(k); else held.delete(k); inp.sendKey(on ? 'keydown' : 'keyup', k); };
  try {
    // zoals de spelbot (scripts/bot/minigames.page.js): wachten op de aanwijzing, dan de toets die de minigame start, anders interact() of een stap opzij
    const order = c.M.bot && c.M.bot.startAttempts ? c.M.bot.startAttempts(id) : ['e', ' ', 'f', 'interact', 'jitter'];
    let jit = 0;
    for (const st of order) {
      if (a.active()) break;
      if (st === 'interact') { try { a.interact(c.world); } catch (e) { /* weg */ } for (let i = 0; i < 90; i++) await c.advance({ capture: false }); continue; }
      if (st === 'jitter') { const o = [[3, 0], [0, 3], [-3, 0], [0, -3]][jit++ % 4]; c.player.x = spot.x + o[0]; c.player.y = spot.y + o[1]; for (let i = 0; i < 60; i++) await c.advance({ capture: false }); continue; }
      for (let i = 0; i < 90 && !a.prompt(c.world); i++) await c.advance({ capture: false });
      await c.press(st, 3);
      for (let i = 0; i < 90 && !a.active(); i++) await c.advance({ capture: false });
    }
    for (let i = 0; i < Math.round(pre * 60); i++) await c.advance({ capture: false });
    const ok = a.active();
    await c.begin(name);
    await c.play(dur, (t) => { const w = new Set(plan.filter(([f, u]) => t >= f && t < u).map((p) => p[2])); for (const k of [...held]) if (!w.has(k)) key(k, false); for (const k of w) key(k, true); });
    const r = await c.end();
    return { ...r, active: ok };
  } finally {
    for (const k of [...held]) key(k, false);
    for (let i = 0; i < 3 && a.active(); i++) { await c.press('backspace'); }
    if (a.active()) { try { a.quit(c.world); } catch (e) { /* weg */ } }
    c.hud(false);
  }
}
const MINI = {
  'm-carillon': { id: 'carillon', plan: [[0.3, 0.5, 'arrowright'], [0.8, 1.0, 'enter'], [1.2, 1.4, 'e']] },
  'm-discgolf': { id: 'discgolf', plan: [[0.2, 1.0, ' '], [1.2, 1.4, 'd']], clock: 14 },
  'm-pitchputt': { id: 'pitchputt', plan: [[0.2, 0.9, ' ']] },
  'm-klimtoren': { id: 'klimtoren', plan: [[0.2, 0.4, ' '], [0.9, 1.1, ' ']] },
  'm-hengelen': { id: 'hengelen', plan: [[0.2, 0.4, ' ']] },
  'm-waterski': { id: 'waterski', plan: [[0.2, 0.4, 'e'], [0.7, 1.0, 'a'], [1.3, 1.6, 'd']] },
  'm-skatepark': { id: 'skatepark', plan: [[0.0, 1.0, 'w'], [1.0, 1.2, ' ']] },
  'm-kermis': { id: 'kermis', plan: [[0.0, 1.0, 'w'], [1.0, 1.5, 'd']] },
  'm-hoogvlieger': { id: 'hoogvlieger', plan: [[0.0, 0.6, 'w']] },
  'm-zwembad': { id: 'zwembad', plan: [[0.2, 0.5, ' '], [0.9, 1.1, 'a']] },
  'm-pannenkoek': { id: 'pannenkoek', plan: [[0.2, 0.5, ' ']] },
  'm-carbid': { id: 'carbid', plan: [[0.2, 0.4, 'f'], [0.8, 1.0, 'arrowright']] },
  'm-kartbaan': { id: 'kartbaan', plan: [[0.0, 2.0, 'w']] },
};
for (const [k, v] of Object.entries(MINI)) shot(k, async (c) => miniRun(c, { name: k, ...v }));

// X1 een dag in vier seconden: de Grote Markt vanaf een vaste camera, de klok loopt van de vroege ochtend tot de late avond (verkeer, licht, lantaarns)
shot('x-daguur', async (c) => {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false); c.weather('helder');
  c.placePlayer(130, 95, 0);
  c.camera(c.rig.dolly({ x: 150, y: 150, z: 34 }, { x: 156, y: 144, z: 38 }, { x: 214, y: 10, z: 20 }, { x: 214, y: 10, z: 24 }, { dur: 3.6, fov: 58, ease: 'lin' }));
  c.clock(5.6);
  await c.settle({ label: 'x-daguur', frames: 120, max: 3600 });
  await c.begin('x-daguur');
  await c.play(3.6, (t) => c.clock(5.6 + 16.4 * (t / 3.6)));
  return c.end();
});

// X2 een trein langs de dijk: een rijdende trein (railway.js) van opzij gevolgd
shot('x-trein', async (c) => {
  await c.resetUi();
  c.calmPolice(); c.leave(); c.releaseCam(); c.hud(false); c.clock(16.2); c.weather('helder');
  const R = await import('/js/railway.js');
  const pick = (window.__args && window.__args.trein) | 0;
  const run = R.getTrains().filter((t) => t.state === 'run').sort((a, b) => b.v - a.v)[pick];
  if (!run) throw new Error('geen rijdende trein');
  const at = () => { const q = R.routePoint(run.route, run.c), q2 = R.routePoint(run.route, run.c + 3 * (run.dir || 1)); return { x: q[0], y: q[1], a: Math.atan2(q2[1] - q[1], q2[0] - q[0]), z: R.railZ(q[0], q[1]) || 0 }; };
  const p0 = at();
  c.placePlayer(p0.x, p0.y, 0);
  const pose = (t) => { const p = at(), a = p.a; const nx = -Math.sin(a), ny = Math.cos(a); c.player.x = p.x; c.player.y = p.y; return { position: { x: p.x + nx * 17 + Math.cos(a) * 6, y: p.y + ny * 17 + Math.sin(a) * 6, z: p.z + 3.2 }, lookAt: { x: p.x, y: p.y, z: p.z + 2 }, fov: 50 }; };
  c.camera(pose);
  await c.settle({ label: 'x-trein', frames: 240, max: 3600 });
  await c.begin('x-trein');
  await c.play(2.4, null);
  const r = await c.end();
  return { ...r, route: run.route && run.route.name, v: +run.v.toFixed(1) };
});
shot('k-schapen', async (c) => streekRun(c, { name: 'k-schapen', lat: 53.3317, lon: 6.2919, hdg: 60, z: 6, speed: 7, dur: 2.2, ahead: 28, fov: 58 }));
