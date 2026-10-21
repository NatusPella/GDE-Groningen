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
  await c.begin(name);
  await c.play(dur, () => drv.tick());
  const r = await c.end();
  c.calmPolice();
  drv.stop();
  return { ...r, speed: +v.speed.toFixed(1), remaining: Math.round(drv.remaining()) };
}

// Een scherm van het spel (pauzemenu, kaart, ...) opnemen: het menu opent op `open`, daarna lopen de acties op hun tijd.
async function uiRun(c, { name, dur, open, at = 0.2, cues = [], pre = 90 }) {
  const pm = await import('/js/pausemenu.js');
  c.releaseCam();
  c.hud(true);
  await c.settle({ label: name, frames: 20 });
  await c.begin(name);
  const run = c.cueRunner([[at, () => open(pm)], ...cues]);
  await c.play(dur, (t) => run(t));
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
    name: 's01-chase', a: [300, 120], b: [900, 300], clock: 17.2, dur: 4 * BAR, top: 17, wanted: 3, lead: 6,
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
shot('s02-regen', async (c) => carRun(c, { name: 's02-regen', a: [17, 300], b: [360, 160], clock: 23.3, weather: 'regen', dur: 2 * 4 * BEAT, top: 15, lead: 5,
  rig: (v) => c.cutCam([[0, () => c.rig.chase(() => v, { dist: 7, height: 1.9, lag: 0.12, fov: 62 })], [4 * BEAT * 1.0, () => c.rig.side(() => v, { dist: 5.5, height: 1.2, fov: 50, ahead: 1.5 })]]) }));

// S3 de stadsbus (echt verkeer, nieuwe bussen): de camera loopt mee langs de straat
shot('s03-bus', async (c) => {
  const w = c.world;
  c.leave(); c.releaseCam(); c.clock(16.6); c.weather('helder'); c.hud(false);
  c.placePlayer(480, 50, 0);
  for (let i = 0; i < 120; i++) await c.advance({ capture: false });
  const bus = w.vehicles.find((v) => v.isBus && Math.hypot(v.x - 480, v.y - 50) < 400) || w.vehicles.find((v) => v.isBus);
  if (!bus) return 'geen bus';
  c.placePlayer(bus.x, bus.y, 0);
  c.camera(c.rig.side(() => bus, { dist: 9, height: 1.8, fov: 48, ahead: 3 }));
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
  cand.model = { ...sd.VEHICLE_STOCK.speedboot.model, color: sd.VEHICLE_STOCK.speedboot.color };
  const r = await import('/js/routing.js');
  const u = await import('/js/util.js');
  let trip = null;
  for (let R = minTrip; R <= minTrip + 200 && !trip; R += 40) {
    for (let k = 0; k < 24 && !trip; k++) {
      const a = (k / 24) * Math.PI * 2, tx = cand.x + Math.cos(a) * R, ty = cand.y + Math.sin(a) * R;
      if (!u.isInWater(w.map, tx, ty)) continue;
      const t = r.planBoatTrip(w.map, [cand.x, cand.y], [tx, ty], 'speedboot');
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
shot('s05-boot', async (c) => boatRun(c, { name: 's05-boot', x: -5019, y: -9741, dur: 2 * 4 * BEAT, lead: 3 }));

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
  c.camera(c.rig.dolly(P(-6, 11, 1.7), P(len + 10, 11, 2.0), P(4, 0, 1.2), P(len + 20, 0, 1.2), { dur: 4 * BEAT * 2, fov: 46, ease: 'lin' }));
  await c.settle({ label: 's09', frames: 40 });
  await c.begin('s09-collectie');
  await c.play(2 * 4 * BEAT, null);
  const r = await c.end();
  w.vehicles = w.vehicles.filter((v) => !vs.includes(v));
  return { ...r, n: vs.length, row };
});

// UI: kaart
shot('u01-kaart', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u01-kaart', dur: 2 * 4 * BEAT, open: (pm) => pm.openPauseMenu('map') });
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
  c.releaseCam(); c.hud(true);
  await c.settle({ label: 'u04', frames: 20 });
  await c.begin('u04-opgeslagen');
  const run = c.cueRunner([[0.2, () => ss.openSaveSlots({ mode: 'game', world: c.world })]]);
  await c.play(2 * 4 * BEAT, (t) => run(t));
  const r = await c.end();
  await c.resetUi();
  return r;
});

shot('u05-samen', async (c) => {
  stand(c, { x: 130, y: 95, a: 0.5, clock: 17.6 });
  return uiRun(c, { name: 'u05-samen', dur: 2 * 4 * BEAT, open: (pm) => pm.openPauseMenu('samen'),
    cues: [[1.2, () => { const b = [...document.querySelectorAll('button')].find((x) => /uitnodigen/i.test(x.textContent)); if (b) b.click(); }]] });
});
