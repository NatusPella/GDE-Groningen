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
const out = { garages: window.__garages ? G.sites().map((s) => s.id) : null };
if (!G) return JSON.stringify({ results: { garage: { fout: 'window.__garages ontbreekt: geen parkeergarage in de kaart gevonden' } } });
const hud = document.getElementById('hud');
const tele = (x, y, yaw) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
  if (yaw !== undefined) { w.camYaw = yaw; p.angle = yaw; }
};
const shot = async (name) => { await sleep(900); console.log('[capture] ' + name); await sleep(600); };
const res = {};
for (const s0 of G.sites()) {
  const id = s0.id;
  if (TB.only && !TB.only.includes(id)) continue;
  const r = res[id] = { stappen: [] };
  const note = (naam, extra = {}) => r.stappen.push({ naam, t: Math.round(performance.now() - t0), z: +(p.gz || 0).toFixed(2), binnen: G.inside(), voertuigen: w.vehicles.length, ...extra });
  const t0 = performance.now();
  // 1. de plek van de poort: dichtbij komen start de planner
  const hc = s0.hall;
  tele(hc.x, hc.y, 0.3);
  G.plan(id);
  for (let i = 0; i < 240; i++) { await sleep(500); if (G.sites().find((s) => s.id === id).planned) break; }
  const gate = G.gatePoint(id);
  r.poort = gate;
  note('poort gepland', { gate: !!gate });
  if (!gate) continue;
  // 2. de poort in beeld: 9 m ervoor, kijkend naar de opening (de camera staat erachter)
  const outPt = gate.out;
  tele(outPt[0] + Math.cos(gate.angle) * 3, outPt[1] + Math.sin(gate.angle) * 3, gate.angle + Math.PI);
  await sleep(4000);
  note('bij de poort');
  await shot('garage-' + id + '-poort');
  w.camYaw = gate.angle + Math.PI + 0.6; await sleep(700);
  await shot('garage-' + id + '-poort2');
  // 3. te voet erin
  tele(gate.zone[0], gate.zone[1], gate.angle + Math.PI);
  for (let i = 0; i < 40 && G.inside() !== id; i++) await sleep(100);
  await sleep(2500);
  note('te voet binnen', { cars: G.sites().find((s) => s.id === id).cars });
  r.voetBinnen = G.inside() === id;
  r.gzBinnen = +(p.gz || 0).toFixed(2);
  w.camYaw = G.hallPoint(id).frame.angle; await sleep(600);
  await shot('garage-' + id + '-hal-voet');
  // 4. rond lopen: een paar punten in de hal; de hoogte blijft op de vloer
  const hp = G.hallPoint(id);
  const heights = [];
  for (const [u, v] of [[10, -8], [20, 8], [30, 0], [40, -8], [12, 3]]) {
    const fr = hp.frame; const c = Math.cos(fr.angle), sn = Math.sin(fr.angle);
    tele(fr.x + u * c - v * sn, fr.y + u * sn + v * c);
    if (G.inside() !== id) { heights.push('buiten'); break; }
    p.gz = map.groundHeightAt(p.x, p.y, -6.8); await sleep(300);
    heights.push(+(map.groundHeightAt(p.x, p.y, -6.8)).toFixed(2));
  }
  r.hoogtes = heights;
  // het plafond voor de camera
  r.plafond = map.ceilingAt(hp.frame.x + 10, hp.frame.y, -4);
  // 5. te voet naar de uitrit
  tele(hp.exit[0], hp.exit[1]);
  p.gz = -6.8; p.x = hp.exit[0]; p.y = hp.exit[1];
  for (let i = 0; i < 40 && G.inside() === id; i++) await sleep(100);
  await sleep(2200);
  note('te voet buiten', { dist: Math.round(Math.hypot(p.x - gate.out[0], p.y - gate.out[1])) });
  r.voetBuiten = G.inside() === null;
  r.naUitrit = { x: +p.x.toFixed(1), y: +p.y.toFixed(1), gz: +(p.gz || 0).toFixed(2) };
  await shot('garage-' + id + '-na-uitrit');
  // 6. met een auto erin: gewoon op de opening af rijden, zonder iets in te drukken (de snelheid wordt vastgehouden), vanaf 12 m ervoor
  const car = new VEH.Vehicle(gate.x + Math.cos(gate.angle) * 12, gate.y + Math.sin(gate.angle) * 12, gate.angle + Math.PI, VEH.MODELS[3]);
  w.vehicles.push(car);
  tele(car.x, car.y, car.angle);
  p.enterVehicle(car, w);
  const reach = [];
  for (let i = 0; i < 80 && G.inside() !== id; i++) {
    car.speed = 5; await sleep(100);
    if (i % 8 === 0) reach.push([+Math.hypot(car.x - gate.x, car.y - gate.y).toFixed(1), +car.speed.toFixed(1)]);
  }
  r.rijdErin = reach;
  await sleep(2500);
  note('met auto binnen', { autoZ: +(car.z || 0).toFixed(2), speed: +car.speed.toFixed(1) });
  r.autoBinnen = G.inside() === id;
  r.autoZ = +(car.z || 0).toFixed(2);
  await shot('garage-' + id + '-hal-auto');
  // een geparkeerde auto in de hal jatten: de dichtstbijzijnde die geparkeerd staat
  const parked = w.vehicles.filter((v) => v.garage === id && v.parked).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  r.geparkeerd = parked.length;
  // 7. met de auto naar de uitrit
  const fr = hp.frame;
  car.x = fr.x + 6 * Math.cos(fr.angle); car.y = fr.y + 6 * Math.sin(fr.angle); car.angle = fr.angle + Math.PI; car.speed = 5; car.z = -6.8; p.x = car.x; p.y = car.y; p.gz = -6.8;
  for (let i = 0; i < 50 && G.inside() === id; i++) { await sleep(100); car.speed = 5; }
  await sleep(2500);
  note('met auto buiten', { dist: Math.round(Math.hypot(car.x - gate.out[0], car.y - gate.out[1])), autoZ: +(car.z || 0).toFixed(2) });
  r.autoBuiten = G.inside() === null && p.inVehicle === car;
  r.opgeruimd = { binnen: G.inside(), garageAutos: w.vehicles.filter((v) => v.garage === id && v !== car).length, licht: w.lightMood || null };
  await shot('garage-' + id + '-buiten-auto');
  if (p.inVehicle) p.exitVehicle(map, w);
  w.vehicles.splice(w.vehicles.indexOf(car), 1);
  // 8. een auto die te groot is: een bus mag niet
  r.klaar = true;
}
return JSON.stringify({ results: { garage: { garages: out.garages, res } } });
