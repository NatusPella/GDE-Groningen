// Page half of `scripts/bot/run.mjs --mode=bruggen` (desktop --perf-script body; #235).
// Rijdt per brug een auto over de brug (naar het einde en 35 m erachter), kijkt of de auto het dek volgt
// (hoogtesprongen, door het dek zakken, in het water), maakt screenshots van voor, midden en achter de brug en
// laat een beweegbare brug openen en weer sluiten. Alles gaat als 'brug'-gebeurtenis naar het logboek en in
// het resultaat. window.__botCfg = { shots }.
const CFG = window.__botCfg || {};
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const L = await imp('botlogic');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt' });
const world = B.world, player = B.player;
const V = await imp('vehicle');
const RC = await imp('ringcheck');
const MB = await imp('movablebridges');
world.devInvuln = true;
let shots = 0;
const shot = (n) => { if (shots < (CFG.shots || 80)) { shots++; B.shot(n); } };

// [naam, x, y, soort]: stad (vlak, profiel, beweegbaar) en provincie (viaducten; alleen met --viaducten zichtbaar)
const TARGETS = [
  ['Gerrit Krolbrug', 0, 0, 'beweegbaar', 'Gerrit Krolbrug'],
  ['Herebrug', 353, 755, 'beweegbaar'],
  ['Poelebrug', 503, 108, 'beweegbaar'],
  ['Eendrachtskade', -874, 566, 'beweegbaar'],
  ['Emmaviaduct (spoor)', -240, 1050, 'profiel'],
  ['Ebbingebrug', 17, -278, 'vlak'],
  ['Eeldersingel', -405, 754, 'vlak'],
  ['Plataanlaan over Iepenlaan', -734, -2096, 'viaduct'],
  ['Noordzeeweg over Winsumerweg', 191, -2318, 'viaduct'],
  ['Friesestraatweg over Nieuwbrugsterweg', -5724, -2738, 'viaduct'],
  ['Weg der Verenigde Naties', -3610, 2220, 'viaduct'],
  ['Beneluxweg', 3118, -808, 'viaduct'],
];

async function settle() {
  for (let i = 0; i < 80; i++) {
    const s = B.status();
    if (s.blocking.pauseMenu) await B.press('escape');
    else if (s.blocking.cinematic || s.blocking.banner) { B.down(' '); await sleep(1300); B.up(' '); }
    else if (!s.blocking.talk && !s.blocking.respawn && !s.blocking.loading) { if (i > 5) return true; }
    await sleep(250);
  }
  return false;
}
await settle();

function teleport(x, y) {
  if (player.inVehicle) player.exitVehicle(world.map, world);
  player.x = x; player.y = y; player.vx = player.vy = 0;
}
const bridgesAround = (x, y, r) => world.map.roadsNear(x, y, r).filter((q) => q.bridge && !q.tunnel && q.pts && q.pts.length >= 2);
const lenOf = (q) => q.pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - q.pts[i - 1][0], p[1] - q.pts[i - 1][1]) : 0), 0);

async function findBridge(name, x, y, want) {
  for (let i = 0; i < 80; i++) {
    teleport(x, y);
    let c = bridgesAround(x, y, 60);
    if (want) c = c.filter((q) => q.name === want);
    if (c.length) { const car = c.filter((q) => q.cat === 'major' || q.cat === 'normal' || q.cat === 'minor'); const pool = car.length ? car : c; pool.sort((a, b) => lenOf(b) - lenOf(a)); return pool[0]; }
    await sleep(500);
  }
  return null;
}

// --only=nat: de water-oversteken van de verhaaltest (ringcheck.driveWaterCrossings) in de echte wereld
if ((CFG.only || '') === 'nat') {
  const RC = await imp('ringcheck');
  const wet = await RC.driveWaterCrossings(world);
  const by = {};
  for (const f of wet.fails) { const k = `${f.route}@${f.at}`; (by[k] = by[k] || []).push(f); }
  const list = Object.entries(by).map(([k, l]) => `${k} x${l.length} ${l[0].what} z${l[0].z} op ${l[0].x},${l[0].y}`);
  B.log('nat', { drives: wet.drives, fails: wet.fails.length, list });
  return JSON.stringify({ result: 'KLAAR', reason: `${wet.drives} oversteken, ${wet.fails.length} mislukt`, list });
}
// --only=probe: wat de wereld op een paar plekken zegt (bruggen, water, wegen)
if ((CFG.only || '') === 'probe') {
  const WL = await imp('waterlevels');
  const res = [];
  for (const [x, y] of [[-455, 752], [-536, 696], [1896, -732], [2146, -768], [1008, -3457], [-1544, 758]]) {
    const m = world.map;
    const roads = m.roadsNear(x, y, 12).map((r) => ({ n: r.name || '', t: r.type, c: r.cat, br: !!r.bridge, tn: !!r.tunnel, mv: r.movable || '', open: !!r._open, z: !!r.z, osm: r.osm, w: r.width, dry: !!r.dry, pts: r.pts.length }));
    const wp = WL.waterPolyAt(m, x, y);
    const MD = await imp('mapdata');
    const cand = m.roadsNear(x, y, 12).filter((r) => !r.bridge && (r.cat === 'major' || r.cat === 'normal'));
    const dry = cand.map((r) => ({ osm: r.osm, dryFlag: !!r.dryCrossing, nowMarks: MD.markDryRoad(m, JSON.parse(JSON.stringify({ ...r, bounds: undefined, _deck: undefined })) ) }));
    res.push({ wk: wp && Object.keys(wp).join(','), wpts: wp && wp.pts.length, wb: wp && wp.bounds, dry, x, y, onBridge: m.isOnBridge(x, y), water: !!wp, waterKind: wp && wp.kind, flat: !!(wp && wp.flat), roads });
  }
  B.log('probe', { res });
  return JSON.stringify({ result: 'KLAAR', reason: 'probe', res });
}
const out = [];
const ONLY = (CFG.only || '').split(',').filter(Boolean);
for (const [name, x0, y0, kind, want] of TARGETS) {
  if (ONLY.length && !ONLY.some((o) => name.includes(o))) continue;
  const rep = { name, kind, found: false };
  out.push(rep);
  try {
    let road;
    if (want) { // zoek op naam in de stad
      road = (world.map.roads || []).find((q) => q.bridge && q.name === want && q.pts.length >= 2);
      if (road) { const m = road.pts[Math.floor(road.pts.length / 2)]; teleport(m[0], m[1]); await sleep(1500); }
    } else road = await findBridge(name, x0, y0, null);
    if (!road) { rep.reason = 'brug niet gevonden (tegel niet geladen?)'; B.log('brug', rep); continue; }
    rep.found = true;
    rep.osm = road.osm; rep.profile = !!road.z; rep.maxZ = road.z ? Math.max(...road.z) : 0; rep.len = Math.round(lenOf(road));
    // de scripted rit van de netwerktest (ringcheck.driveAcross): over de weg zelf en 40 m de aansluitende wegen op,
    // met sprongcontrole; dat is de maatstaf voor "sprong" en "zinkt", de rit hieronder is voor het beeld
    try {
      const len = lenOf(road);
      const full = RC.crossingPath(world.map, { road, s0: 0, s1: len }, 40);
      if (full.length > 12) {
        const speed = Math.max(6, Math.min(road.speed || 11, 14));
        const r1 = await RC.driveAcross(world, full, speed, { jump: true, maxT: 60 });
        const r2 = await RC.driveAcross(world, full.slice().reverse(), speed, { jump: true, maxT: 60 });
        rep.scripted = { mee: r1 ? `${r1.what} z${r1.z} op ${r1.x},${r1.y}` : 'ok', tegen: r2 ? `${r2.what} z${r2.z} op ${r2.x},${r2.y}` : 'ok' };
      } else rep.scripted = { pad: 'te kort' };
    } catch (e) { rep.scripted = { fout: String(e && e.message || e) }; }
    const P = road.pts, a = P[0], b = P[P.length - 1];
    const ux0 = P[1][0] - a[0], uy0 = P[1][1] - a[1], l0 = Math.hypot(ux0, uy0) || 1;
    const ux1 = b[0] - P[P.length - 2][0], uy1 = b[1] - P[P.length - 2][1], l1 = Math.hypot(ux1, uy1) || 1;
    let way = [[a[0] - ux0 / l0 * 35, a[1] - uy0 / l0 * 35], a, b, [b[0] + ux1 / l1 * 35, b[1] + uy1 / l1 * 35]];
    try { const fp = RC.crossingPath(world.map, { road, s0: 0, s1: lenOf(road) }, 35); if (fp.length > 12) way = fp.filter((_, i) => i % 6 === 0 || i === fp.length - 1).map((q) => [q[0], q[1]]); } catch (e) { /* rechte lijn */ }
    teleport(way[0][0], way[0][1]);
    for (let k = 0; k < 80 && B.status().blocking.loading; k++) await sleep(250);
    await sleep(2500);
    const ang = Math.atan2(way[1][1] - way[0][1], way[1][0] - way[0][0]);
    const v = V.spawnVehicleOnRoad(world.map, road, false, Math.random, false, false, { x: a[0], y: a[1] });
    v.x = way[0][0]; v.y = way[0][1]; v.angle = ang; v.speed = 0; v.z = 0; v.road = null;
    if (!world.vehicles.includes(v)) world.vehicles.push(v);
    player.enterVehicle(v, world);
    rep.entered = player.inVehicle === v;
    const tag = `brug-${out.length}-${name.replace(/[^\w]+/g, '_')}`;
    shot(`${tag}-voor`);
    const follower = new L.PathFollower(way, { reach: 5 });
    const wedge = new L.WedgeDetector();
    const t0 = B.time();
    let last = null, maxJump = 0, minGap = 0, sunk = false, samples = 0, shotMid = false, done = false, maxZseen = 0;
    let dbg = false;
    while (B.time() - t0 < (CFG.perS || 60)) {
      if (!dbg && B.time() - t0 > 4) { dbg = true; B.log('dbg', { blocking: B.status().blocking, speed: v.speed, thr: v.throttle, steer: v.steer, axis: B.input.padAxis, inV: player.inVehicle === v, wrecked: v.wrecked, paused: world.paused, driver: v.driver, x: v.x, y: v.y }); }
      const me = { x: v.x, y: v.y };
      const aim = follower.next(me);
      if (!aim) { done = true; break; }
      const c = L.carControls({ x: v.x, y: v.y, angle: v.angle, speed: v.speed }, aim, { top: 9 });
      B.stick(c.steer, c.throttle > 0 ? -1 : c.throttle < 0 ? 1 : 0);
      if (wedge.update(B.time(), v.speed, c.throttle)) { rep.wedged = (rep.wedged || 0) + 1; wedge.reset(); }
      const st = { z: v.z || 0, ribbon: null, kind: 'ground' };
      const g = world.map.surfaceAt ? world.map.surfaceAt(v.x, v.y, st).z : 0;
      const z = v.z || 0;
      if (last !== null && Math.abs(v.speed) > 1) { const j = Math.abs(z - last); if (j > 0.5) B.log('sprong', { name, t: +B.time().toFixed(2), x: +v.x.toFixed(1), y: +v.y.toFixed(1), z0: +last.toFixed(2), z1: +z.toFixed(2), g: +g.toFixed(2), speed: +v.speed.toFixed(1), air: !!v.airborne, ribbon: !!(v.surf && v.surf.ribbon), kind: v.surf && v.surf.kind }); maxJump = Math.max(maxJump, j); }
      last = z; samples++; maxZseen = Math.max(maxZseen, z);
      minGap = Math.min(minGap, z - g);
      if (v.sinking || v.inWater) sunk = true;
      if (!shotMid && L.distance(me, { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }) < 6) { shotMid = true; shot(`${tag}-midden`); }
      await sleep(100);
    }
    B.stick(0, 0);
    shot(`${tag}-achter`);
    Object.assign(rep, { done, samples, maxJump: +maxJump.toFixed(2), minGap: +minGap.toFixed(2), sunk, vMaxZ: +maxZseen.toFixed(2), wallS: Math.round(B.time() - t0) });
    // een beweegbare brug: openen en sluiten
    const mb = MB.getMovableBridges().find((q) => q.r === road);
    if (mb) {
      if (player.inVehicle) player.exitVehicle(world.map, world);
      player.x = mb.x - mb.uy * (mb.half + 6); player.y = mb.y + mb.ux * (mb.half + 6);
      MB.requestOpening(mb, null, true, false);
      const t1 = B.time();
      let sawOpen = false;
      while (B.time() - t1 < 70 && !(sawOpen && mb.state === 'closed')) {
        if (mb.state === 'open' && !sawOpen) { sawOpen = true; await sleep(1500); shot(`${tag}-open`); rep.openFlag = !!road._open; rep.openAmount = mb.open; }
        if (mb.state === 'opening' && mb.open > 0.45 && !rep.midShot) { rep.midShot = true; shot(`${tag}-opent`); }
        await sleep(200);
      }
      rep.opened = sawOpen; rep.closedAgain = mb.state === 'closed';
    }
    const idx = world.vehicles.indexOf(v);
    if (idx >= 0) world.vehicles.splice(idx, 1);
  } catch (e) {
    rep.error = String(e && e.message || e);
  }
  B.log('brug', rep);
}
const bad = out.filter((r) => !r.found || r.error || r.sunk || (r.maxJump || 0) > 0.6 || (r.wedged || 0) > 2).length;
return JSON.stringify({ result: 'KLAAR', reason: `${out.filter((r) => r.found).length}/${out.length} bruggen gereden, ${bad} met afwijking`, bridges: out });
