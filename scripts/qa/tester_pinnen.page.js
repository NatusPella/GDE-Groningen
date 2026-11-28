// Page half van scripts/qa/tester_bugs.mjs --check=pinnen (#1342): "Even pinnen" in Electron. Meet of de bestelbus een aanhanger met de pinautomaat
// achter zich heeft (mesh in de scène, volgt de bus door een bocht) en waar de markering van "rij een garage in" staat: bij de deur aan de
// straatkant (en pas vlakbij in de box). Beelden: [capture] pinnen-bus, pinnen-bocht, pinnen-pijl-ver, pinnen-pijl-bij.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const TB = window.__tb || {};
for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__scene3d); i++) await sleep(500);
const D = window.__debug; const w = D.world;
const key = (k, code) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true }));
const keyup = (k, code) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true }));
const ss = document.getElementById('start-screen');
for (let i = 0; i < 120 && !document.body.classList.contains('game-started'); i++) {
  const up = !!ss && ss.classList.contains('visible');
  if (up) { if (window.__menuStart) window.__menuStart('nieuw'); else { key('Enter', 'Enter'); keyup('Enter', 'Enter'); } }
  await sleep(2000);
}
const cine = await import('/js/cinematics.js');
for (let i = 0; i < 200 && !cine.isCinematicActive(); i++) await sleep(100);
if (cine.isCinematicActive()) { cine.skipCinematic(); await sleep(1500); }
await sleep(3000);
const M = await import('/js/missions.js');
const GA = await import('/js/garages.js');
const TT = await import('/js/towtrailer.js');
w.devInvuln = true;
const out = {};
const idx = M.missionIndexById('pinautomaat');
out.index = idx;
M.missionDebug.start(w, idx);
await sleep(600);
for (let i = 0; i < 100 && cine.isCinematicActive(); i++) { cine.skipCinematic(); await sleep(150); }
const p = w.player;
const bus = w.vehicles.find((v) => v.missionCar);
out.bus = bus ? { naam: bus.model.name, x: Math.round(bus.x), y: Math.round(bus.y) } : null;
const root = (await import('/js/scene3d.js')).getScene();
let mesh = null; root.traverse((o) => { if (o.name === 'aanhanger-pinautomaat') mesh = o; });
out.aanhanger = { mesh: !!mesh, state: !!TT.towState() };
// de speler in de bus
bus.driver = 'player'; p.inVehicle = bus; p.x = bus.x; p.y = bus.y;
await sleep(1500);
console.log('[capture] pinnen-bus'); await sleep(700);
// een stuk rechtdoor en dan een bocht: de aanhanger moet zwenken (hoek tussen bus en aanhanger)
const hoeken = [];
for (let k = 0; k < 60; k++) {
  bus.speed = 7;
  if (k > 20) { bus.angle += 0.03; }
  await sleep(100);
  const s = TT.towState();
  if (s) hoeken.push(+Math.abs(Math.atan2(Math.sin(s.angle - bus.angle), Math.cos(s.angle - bus.angle))).toFixed(3));
  if (k === 40) { console.log('[capture] pinnen-bocht'); await sleep(500); }
}
out.maxHoek = Math.max(...hoeken); out.afstand = (() => { const s = TT.towState(); return s ? +Math.hypot(s.x - bus.x, s.y - bus.y).toFixed(2) : null; })();
bus.speed = 0;
// de garagestap: de dichtstbijzijnde garage, de bus 55 m verderop langs de straat
M.missionDebug.complete(w); await sleep(800); // board -> garage
const sites = GA.getGaragesForRender();
let best = null, bd = 1e9; for (const g of sites) { const d = Math.hypot(g.x - bus.x, g.y - bus.y); if (d < bd) { bd = d; best = g; } }
out.garages = sites.length;
if (best) {
  const door = { x: best.x + Math.cos(best.angle) * (GA.GARAGE_BAY_DEPTH / 2 + 3), y: best.y + Math.sin(best.angle) * (GA.GARAGE_BAY_DEPTH / 2 + 3) };
  // langs de straat: loodrecht op de as van de box, aan de deurkant
  const sx = -Math.sin(best.angle), sy = Math.cos(best.angle);
  const ver = { x: door.x + sx * 55, y: door.y + sy * 55 };
  bus.x = ver.x; bus.y = ver.y; bus.angle = Math.atan2(door.y - ver.y, door.x - ver.x); bus.speed = 0; p.x = bus.x; p.y = bus.y;
  await sleep(1500);
  const mk = () => ({ x: +w.mission.marker.x.toFixed(1), y: +w.mission.marker.y.toFixed(1) });
  out.site = { x: +best.x.toFixed(1), y: +best.y.toFixed(1), naam: best.name };
  out.deur = { x: +door.x.toFixed(1), y: +door.y.toFixed(1) };
  out.markerVer = mk();
  out.markerVerAfstandDeur = +Math.hypot(out.markerVer.x - door.x, out.markerVer.y - door.y).toFixed(1);
  out.markerVerAfstandMidden = +Math.hypot(out.markerVer.x - best.x, out.markerVer.y - best.y).toFixed(1);
  console.log('[capture] pinnen-pijl-ver'); await sleep(700);
  bus.x = door.x + sx * 5; bus.y = door.y + sy * 5; p.x = bus.x; p.y = bus.y;
  await sleep(1500);
  out.markerBij = mk();
  out.markerBijAfstandMidden = +Math.hypot(out.markerBij.x - best.x, out.markerBij.y - best.y).toFixed(1);
  console.log('[capture] pinnen-pijl-bij'); await sleep(700);
}
return JSON.stringify({ results: out });
