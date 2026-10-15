// Street life, batch 1, in the real game (desktop --perf-script, see
// scripts/perf/life.sh): the centre at dinner time (a census of delivery
// riders, movers, bike-share, unlit bikes, people carrying things, street
// folk), Bernhard, a seller, someone asking for a coin and a magnet fisher up
// close, and a rowing eight, a skiff and a stand-up paddler on the wide
// water. One screenshot per scene ('[capture] <name>'), plus frame time in
// the centre. Only throwaway profiles; nothing is saved.
const H = window.__perfHook;
for (let i = 0; i < 40 && !document.body.classList.contains('game-started'); i++) {
  for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); }
  await new Promise((res) => setTimeout(res, 2500));
  for (let k = 0; k < 6 && window.__debug && window.__debug.world.paused; k++) {
    for (const t of [window, document]) t.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    await new Promise((res) => setTimeout(res, 700));
  }
}
const D = window.__debug; const w = D.world; const p = w.player; const map = w.map;
const sc = window.__scene3d; const r = sc.renderer;
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const cine = await imp('cinematics');
const PM = await imp('pausemenu');
const DN = await imp('daynight');
const { PO = (x, y) => ({ x, y }) } = await imp('worldframe').catch(() => ({}));
const CP = await imp('cityprops');
const V = await imp('vehicle');
const BT = await imp('boattypes');
const T = await imp('trafficfleet');
const SL = await imp('streetlife');
const skipper = setInterval(() => { if (cine.isCinematicActive()) cine.skipCinematic(); }, 100);
w.devInvuln = true;
D.input.canLock = () => false;
if (document.pointerLockElement) document.exitPointerLock();

const teleport = (x, y) => {
  if (p.inVehicle) p.exitVehicle(map, w);
  p.x = x; p.y = y; p.vx = 0; p.vy = 0; p.z = 0; p.vz = 0;
  p.gz = map.groundHeightAt ? map.groundHeightAt(x, y, 0) || 0 : 0;
};
let hold = null, clock = 19, done = false;
const tick = () => {
  if (PM.isPauseMenuOpen()) PM.closePauseMenu();
  D.input.mouse.y = innerHeight * 0.4;
  if (hold) { p.x = hold.x; p.y = hold.y; p.vx = p.vy = 0; p.angle = hold.a; w.camYaw = hold.a; w.clock = clock; }
  if (!done) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
const fixWorld = () => {
  w.clock = clock;
  w.weather = { active: false, timer: 1e9, kind: 'helder', peak: 0, intensity: 0, wet: 0, overcast: 0, mist: 0, windAngle: 0.9, elapsed: 0, duration: Infinity };
  if (DN.refreshDayNight) DN.refreshDayNight(w);
};
const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
const results = { scenes: {}, errors };

// --- 1. the centre at dinner time
const g = PO(70, 60);
clock = 19; fixWorld();
teleport(g.x, g.y);
hold = { x: g.x, y: g.y, a: 0.15 };
await sleep(14000);
fixWorld();
const census = () => {
  const c = { bikes: 0, delivery: 0, movers: 0, share: 0, unlit: 0, newsvan: 0, rowers: 0, sups: 0, carriers: 0, folk: {} };
  for (const v of w.vehicles) {
    if (v.isBike) { c.bikes++; if (v.model.delivery) c.delivery++; if (v.model.load) c.movers++; if (v.model.share) c.share++; if (v.model.noLight) c.unlit++; }
    if (v.isNewsVan) c.newsvan++;
    if (v.isBoat && (v.model.kind === 'skiff' || v.model.kind === 'acht')) c.rowers++;
    if (v.isBoat && v.model.kind === 'sup') c.sups++;
  }
  for (const q of w.pedestrians) {
    if (q.carry && q.carry !== 'paper') c.carriers++;
    if (q.scene && ['seller', 'beggar', 'bernard', 'magnet'].includes(q.scene.kind)) c.folk[q.scene.kind] = (c.folk[q.scene.kind] || 0) + 1;
  }
  return c;
};
H.start();
await sleep(6000);
const frame = H.stop();
results.scenes.centreDinner = { ...census(), frameAvg: frame.avg, cpuAvg: frame.cpuAvg, frames: frame.frames };
console.log('[capture] centre-dinner');
await sleep(600);

// --- 2. the standing people up close: look away until they have spawned
const slots = [];
for (let gx = -2; gx <= 8; gx++) for (let gy = -2; gy <= 6; gy++) for (const s of CP.cellSlotSpots(map, gx, gy)) slots.push(s);
const bern = CP.getBernardSpot();
if (bern) slots.push({ kind: 'bernard', ...bern });
const near = (kind) => slots.filter((s) => s.kind === kind).sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
for (const kind of ['bernard', 'seller', 'beggar', 'magnet']) {
  const s = near(kind);
  if (!s) { results.scenes[kind] = { error: 'no slot' }; continue; }
  // 6 m in front of the person (the way they face), looking at them
  const fx = s.x + Math.cos(s.angle) * 6, fy = s.y + Math.sin(s.angle) * 6;
  const open = map.isOpenSpot(fx, fy, 20) ? { x: fx, y: fy } : map.openSpotNear(fx, fy);
  clock = kind === 'magnet' || kind === 'seller' ? 15 : 17; fixWorld();
  teleport(open.x, open.y);
  const toward = Math.atan2(s.y - open.y, s.x - open.x);
  hold = { x: open.x, y: open.y, a: toward + Math.PI };
  await sleep(7000);
  hold.a = toward;
  await sleep(1800);
  const ped = w.pedestrians.find((q) => q.scene && q.scene.kind === kind && Math.hypot(q.x - s.x, q.y - s.y) < 3);
  results.scenes[kind] = { at: [Math.round(s.x), Math.round(s.y)], spawned: !!ped, look: ped ? ped.look && Object.keys(ped.look).join(',') : null, carry: ped ? ped.carry || null : null };
  if (ped) {
    // walk up, then use it: the prompt and one E press through the real code
    teleport(ped.x - Math.cos(toward) * 1.3, ped.y - Math.sin(toward) * 1.3);
    hold = { x: p.x, y: p.y, a: toward };
    w.money = 50;
    await sleep(600);
    const pr = SL.streetLifePrompt(w);
    results.scenes[kind].prompt = pr ? pr.label + ' | ' + pr.sub : null;
    SL.useStreetLife(w, Math.random);
    results.scenes[kind].money = w.money;
    await sleep(500);
  }
  console.log('[capture] ' + kind);
  await sleep(600);
}

// --- 3. rowing and paddling on wide water
const wide = map.waterNear(g.x, g.y, 1400).map((poly) => {
  let a = 0, per = 0;
  for (let i = 0; i < poly.pts.length; i++) { const q = poly.pts[(i + 1) % poly.pts.length]; a += poly.pts[i][0] * q[1] - q[0] * poly.pts[i][1]; per += Math.hypot(q[0] - poly.pts[i][0], q[1] - poly.pts[i][1]); }
  return { poly, w: per ? Math.abs(a) / per : 0 };
}).filter((q) => q.w >= 24).sort((a, b) => Math.hypot((a.poly.bounds[0] + a.poly.bounds[2]) / 2 - g.x, (a.poly.bounds[1] + a.poly.bounds[3]) / 2 - g.y) - Math.hypot((b.poly.bounds[0] + b.poly.bounds[2]) / 2 - g.x, (b.poly.bounds[1] + b.poly.bounds[3]) / 2 - g.y))[0];
if (wide) {
  const mid = [(wide.poly.bounds[0] + wide.poly.bounds[2]) / 2, (wide.poly.bounds[1] + wide.poly.bounds[3]) / 2];
  clock = 9; fixWorld();
  // stand on a street next to the water, then spawn the boats a little way off
  const road = map.nearestRoadPoint(mid[0], mid[1], 400, true, true);
  const spot = road ? { x: road.x, y: road.y } : { x: mid[0], y: mid[1] };
  teleport(spot.x, spot.y);
  hold = { x: spot.x, y: spot.y, a: 0 };
  await sleep(3000);
  const made = [];
  for (const kind of ['acht', 'skiff', 'sup']) {
    const v = V.spawnBoatOnWater(map, wide.poly, Math.random, { model: BT.BOAT_KINDS[kind], near: [spot.x, spot.y], min: 8, max: 70 });
    if (v) { w.vehicles.push(v); made.push(v); }
    results.scenes['boat-' + kind] = { spawned: !!v, at: v ? [Math.round(v.x), Math.round(v.y)] : null };
  }
  if (made.length) {
    const target = made[0];
    hold.a = Math.atan2(target.y - spot.y, target.x - spot.x);
    await sleep(5000);
    hold.a = Math.atan2(target.y - spot.y, target.x - spot.x);
    results.scenes.rowing = { crew: made.map((v) => v.model.kind), speeds: made.map((v) => +Math.abs(v.speed).toFixed(2)), meanWidth: Math.round(wide.w) };
    console.log('[capture] rowing');
    await sleep(600);
  }
}

// --- 4. bikes: delivery, mover, bike-share, shabby, lined up on the nearest street
const road = map.nearestRoadPoint(g.x, g.y, 200, true, true);
if (road) {
  clock = 19; fixWorld();
  const segA = Math.atan2(road.road.pts[1][1] - road.road.pts[0][1], road.road.pts[1][0] - road.road.pts[0][0]);
  teleport(road.x - Math.cos(segA) * 14, road.y - Math.sin(segA) * 14);
  hold = { x: p.x, y: p.y, a: segA };
  const want = [['delivery', (m) => m && m.delivery, 19], ['mover', (m) => m && m.load, 14], ['share', (m) => m && m.share, 14], ['shabby', (m) => m && m.old && m.noLight, 14]];
  const row = [];
  let k = 0;
  for (const [name, pred, hour] of want) {
    let model = null;
    for (let i = 0; i < 20000 && !model; i++) {
      const cand = T.pickBikeVariant(map, name === 'mover' ? -300 : g.x, name === 'mover' ? 160 : g.y, Math.random, { hour });
      if (pred(cand)) model = cand;
    }
    if (!model) { results.scenes['bike-' + name] = { error: 'never picked' }; continue; }
    const v = V.spawnVehicleOnRoad(map, road.road, false, Math.random, true, false, null, false, model);
    v.x = road.x + Math.cos(segA) * (3 + k * 2.6) + Math.sin(segA) * (k % 2 ? 0.8 : -0.8);
    v.y = road.y + Math.sin(segA) * (3 + k * 2.6) - Math.cos(segA) * (k % 2 ? 0.8 : -0.8);
    v.angle = segA; v.speed = 0; v.maxSpeedOverride = 0;
    row.push(v);
    w.vehicles.push(v);
    results.scenes['bike-' + name] = { model: { delivery: model.delivery, load: model.load, share: model.share, noLight: model.noLight } };
    k++;
  }
  const hold0 = row.map((v) => [v.x, v.y]);
  const pin = setInterval(() => { row.forEach((v, i) => { v.x = hold0[i][0]; v.y = hold0[i][1]; v.speed = 0; }); }, 30);
  await sleep(2500);
  console.log('[capture] bikes-dinner');
  await sleep(600);
  clock = 23; fixWorld();
  await sleep(2500);
  console.log('[capture] bikes-night');
  await sleep(600);
  clearInterval(pin);
}

// --- 5. the news van (a white van with a roof camera)
{
  const model = T.carModel('newsvan');
  const road2 = map.nearestRoadPoint(g.x + 30, g.y + 10, 200, true, true);
  if (road2) {
    clock = 14; fixWorld();
    const a2 = Math.atan2(road2.road.pts[1][1] - road2.road.pts[0][1], road2.road.pts[1][0] - road2.road.pts[0][0]);
    const v = V.spawnVehicleOnRoad(map, road2.road, false, Math.random, false, false, null, false, model);
    T.applyFleetFlags(v, 'newsvan');
    v.x = road2.x + Math.cos(a2) * 7; v.y = road2.y + Math.sin(a2) * 7; v.angle = a2; v.speed = 0;
    w.vehicles.push(v);
    teleport(road2.x - Math.cos(a2) * 5, road2.y - Math.sin(a2) * 5);
    hold = { x: p.x, y: p.y, a: a2 + 0.4 };
    const pin = setInterval(() => { v.x = road2.x + Math.cos(a2) * 7; v.y = road2.y + Math.sin(a2) * 7; v.speed = 0; }, 30);
    await sleep(2500);
    console.log('[capture] newsvan');
    await sleep(600);
    clearInterval(pin);
    results.scenes.newsvan = { spawned: true };
  }
}
hold = null;
done = true;
clearInterval(skipper);
return JSON.stringify(results);
