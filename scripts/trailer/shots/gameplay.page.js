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
  const run = c.cueRunner([[0.0, () => c.endCard({ line: 'EEN GAME VAN NATUSPELLA' })]]);
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
