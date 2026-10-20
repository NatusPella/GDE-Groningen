// Page half van brug_beeld.mjs --modus=zee (desktop --perf-script body; #233): een sloep vaart vol gas over open zee langs de
// as van een zeestrook (Waddenzee, Eems, Dollard), met een logregel per 2 s (positie, snelheid, afgelegd, wat de zeegrens
// zegt) en beelden aan het begin, onderweg en aan het eind. Een boot die tegen een wal loopt, staat stil terwijl het gas open is.
// window.__zv = { zeeen: [{ naam, x, y, hoek, af }], secs } staat ervoor. Elke keydown wordt gevolgd door een keyup.
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const tapKey = (k, code) => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code, bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code, bubbles: true })); } };
for (let i = 0; i < 40; i++) {
  const ss = document.querySelector('#start-screen');
  if (!ss || getComputedStyle(ss).display === 'none' || !ss.getClientRects().length || getComputedStyle(ss).visibility === 'hidden') break;
  const item = [...ss.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent));
  if (item) item.click(); else tapKey('Enter', 'Enter');
  await sleep(3000);
}
for (let i = 0; i < 25 && window.__debug && window.__debug.world && window.__debug.world.paused; i++) { tapKey(' ', 'Space'); await sleep(700); }
{ const ss = document.querySelector('#start-screen'); if (ss) ss.style.display = 'none'; }
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const imp = (f) => import('/js/' + f + '.js');
const CFG = window.__zv || { zeeen: [], secs: 120 };
const cine = await imp('cinematics');
const VH = await imp('vehicle');
const BT = await imp('boattypes');
const WL = await imp('waterlevels');
const WI = await imp('waterindex');
const UT = await imp('util');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();
const key = (type, k, code) => { for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent(type, { key: k, code: code || k, bubbles: true })); };
w.clock = 14;
w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
let hold = null, done = false;
const tick = () => { w.clock = 14; if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; } if (!done) requestAnimationFrame(tick); };
requestAnimationFrame(tick);
const msgs = [];
const addMsg = w.addMessage; w.addMessage = (t, ...r) => { msgs.push(String(t)); return addMsg.call(w, t, ...r); };
// vaste camera achter de boot (renderer.render zet hem; de cinematic-camera tilt zichzelf)
const S3 = window.__scene3d;
let cur = null;
const origRender = S3.renderer.render.bind(S3.renderer);
S3.renderer.render = (sc, c) => { if (cur && c === S3.cam) { c.position.set(cur.position.x, cur.position.z, cur.position.y); c.lookAt(cur.lookAt.x, cur.lookAt.z, cur.lookAt.y); c.updateMatrixWorld(true); } origRender(sc, c); };
const results = [];
for (const z of CFG.zeeen) {
  const rep = { naam: z.naam, log: [] };
  results.push(rep);
  try {
    const dx = Math.cos(z.hoek), dy = Math.sin(z.hoek);
    const sx = z.x - dx * z.af, sy = z.y - dy * z.af, tx = z.x + dx * (z.ziel || z.af), ty = z.y + dy * (z.ziel || z.af);
    hold = { x: sx, y: sy };
    await sleep(6000);
    hold = null;
    if (p.inVehicle) p.exitVehicle(map, w);
    const boat = new VH.Vehicle(sx, sy, z.hoek, { ...BT.BOAT_KINDS.sloep });
    boat.isBoat = true; boat.speed = 0; w.vehicles.push(boat);
    p.enterVehicle(boat, w);
    rep.nat = !!WL.waterAt(map, sx, sy) || true;
    key('keydown', 'w', 'KeyW');
    const assist = setInterval(() => {
      const want = Math.atan2(ty - boat.y, tx - boat.x);
      const d = Math.atan2(Math.sin(want - boat.angle), Math.cos(want - boat.angle));
      boat.angle += d * 0.25;
    }, 50);
    const t0 = performance.now(); let n = 0, stuck = 0, lx = boat.x, ly = boat.y, maxStuck = 0;
    const tag = `zv-${z.naam}`;
    while (performance.now() - t0 < CFG.secs * 1000) {
      await sleep(2000);
      // (een terugzet-scene van de wereldrand laat de toetsen los: de gasknop weer indrukken, anders staat de boot stil zonder dat er een muur is)
      if (!D.input.isDown || !D.input.isDown('w')) { rep.toetsLos = (rep.toetsLos || 0) + 1; key('keydown', 'w', 'KeyW'); }
      const afgelegd = Math.hypot(boat.x - sx, boat.y - sy);
      if (Math.hypot(boat.x - lx, boat.y - ly) < 0.8 && (boat.speed || 0) < 0.5) stuck += 2; else stuck = 0;
      maxStuck = Math.max(maxStuck, stuck); lx = boat.x; ly = boat.y;
      if (stuck === 6 && !rep.diag) {
        // waarom staat de boot stil: wat zegt de oeverproef, wat staat er in de buurt
        const probe = { model: boat.model };
        rep.diag = { x: Math.round(boat.x), y: Math.round(boat.y), angle: +boat.angle.toFixed(2), clearance: +WI.waterClearance(map, boat.x, boat.y, 40).toFixed(1), dryPoints: UT.boatDryPoints(map, probe, boat.x, boat.y, boat.angle), water: !!WL.waterAt(map, boat.x, boat.y), buildings: (map.buildingsNear(boat.x, boat.y, 40) || []).length, roads: (map.roadsNear(boat.x, boat.y, 40) || []).length, vehicles: w.vehicles.filter((q) => q !== boat && Math.hypot(q.x - boat.x, q.y - boat.y) < 30).length, ahead: [10, 20, 40, 80].map((d) => +WI.waterClearance(map, boat.x + Math.cos(boat.angle) * d, boat.y + Math.sin(boat.angle) * d, 40).toFixed(1)), cooling: !!(w.edgeWatch || w.edge) };
      }
      rep.log.push(`${Math.round((performance.now() - t0) / 1000)}s (${Math.round(boat.x)},${Math.round(boat.y)}) v=${(boat.speed || 0).toFixed(1)} af=${Math.round(afgelegd)} stuck=${stuck}`);
      cur = { position: { x: boat.x - Math.cos(boat.angle) * 22, y: boat.y - Math.sin(boat.angle) * 22, z: 6 }, lookAt: { x: boat.x + Math.cos(boat.angle) * 120, y: boat.y + Math.sin(boat.angle) * 120, z: 1 } };
      if (n % 4 === 0) { console.log(`[capture] ${tag}-${String(n).padStart(2, '0')}`); await sleep(500); }
      n++;
      if (afgelegd > (z.ziel ? z.ziel + z.af : 2 * z.af) - 30) break;
    }
    clearInterval(assist);
    key('keyup', 'w', 'KeyW');
    rep.afgelegd = Math.round(Math.hypot(boat.x - sx, boat.y - sy)); rep.maxStil = maxStuck; rep.eind = [Math.round(boat.x), Math.round(boat.y)];
    console.log(`[capture] ${tag}-eind`); await sleep(500);
    if (p.inVehicle) p.exitVehicle(map, w);
    const i = w.vehicles.indexOf(boat); if (i >= 0) w.vehicles.splice(i, 1);
  } catch (err) { rep.fout = String(err && err.stack || err).slice(0, 300); }
}
done = true; hold = null; cur = null;
clearInterval(skipper);
return JSON.stringify({ zeeen: results, meldingen: msgs.slice(0, 20) });
