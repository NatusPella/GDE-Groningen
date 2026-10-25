// Page half of scripts/bot/run.mjs (desktop --perf-script body; the Spelbot, #186).
// window.__botCfg = { part, maxGameS, maxWallS, stuckS, shots } is put in front by
// the driver. Plays the story by itself the way a player would: follows the
// goal over the route planner, boards a vehicle for long distances, skips cutscenes
// (hold Space), presses dialog keys; when it makes no progress for stuckS seconds it
// nudges, and after that uses the cheats of the story dev API, which is logged as a
// 'cheat' event ("had een cheat nodig"). Everything it does goes through window.__bot
// (playerapi.js), whose [bot-log] lines the desktop app writes to the events file.
// #312: the helicopter and the sailing/rowing boat get their own keys and timing from
// scripts/bot/nav.mjs (a pure module that run.mjs passes in as window.__botNav).
// #312: a board stage with a vehicle gets its choice, its door and its timeout from
// scripts/bot/board.mjs (likewise, as window.__botBoard).
const CFG = window.__botCfg || {};
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const L = await imp('botlogic');
const R = await imp('routing');
const M = await imp('missions');
const V = await imp('vehicle');
const Br = await imp('breakables');
const Pg = await imp('pigeonmode');
const MS = await imp('missions');
const BK = await imp('bakeround');
const Ga = await imp('garages');
const Co = await imp('collision');
const Un = await imp('util');
const TL = await imp('trafficlaw');
const BAKE_KEYS = { ei: '1', zout: '2', meel: '3', vet: '4', mosterd: '5' };
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt (?autoplay niet aan?)' });
// #312: de pure heli- en zeilbesturing (scripts/bot/nav.mjs, door run.mjs meegegeven)
const Nav = window.__botNav || null;
if (!Nav) B.log('nav', { what: 'window.__botNav ontbreekt: start via scripts/bot/run.mjs' });
// #312: de board-stage met een voertuig (scripts/bot/board.mjs, door run.mjs meegegeven)
const Bd = window.__botBoard || null;
if (!Bd) B.log('board', { what: 'window.__botBoard ontbreekt: start via scripts/bot/run.mjs' });
// #312: de stuntavond van M01 (scripts/bot/stunt.mjs, door run.mjs meegegeven)
const St = window.__botStunt || null;
if (!St) B.log('stunt', { what: 'window.__botStunt ontbreekt: start via scripts/bot/run.mjs' });
const world = B.world, player = B.player;
const PART = CFG.sweep && CFG.sweep.length ? 'all' : CFG.part || 'kop';
const MAX_GAME = CFG.maxGameS || 3600;
const MAX_WALL = (CFG.maxWallS || 1800) * 1000;
const wall0 = performance.now();
const detector = new L.StuckDetector({ windowS: CFG.stuckS || 30 });
// a branch that keeps the clock itself gets a budget of its own (#387: the pigeon of M04 flew on until the run's end without a line in the
// report): the pigeon stage as a whole, and one photo target of it (90 s: the museum is a kilometre from the Stationsplein, 24 m/s and a
// turning circle; a bird that takes longer than that is not going to make it)
const pigeonWatch = new L.TaskWatch({ budget: 300 });
const pigeonTargetWatch = new L.TaskWatch({ budget: 90 });
// #312: a clock of its own per attempt for the heli and the sailing boat: a trip that does not
// arrive in time is a finding ('timeout'), not a reason to fly or tack for ever
const heliWatch = new L.TaskWatch({ budget: 240 });
const sailWatch = new L.TaskWatch({ budget: 300 });
const wedge = new L.WedgeDetector();
const mem = { boardTries: 0, pressTries: 0, board: null, drive: null };
const detours = {};   // per stage: the sidesteps tried on foot before a cheat
const ladder = {}, fails = {}, scenes = {};
let lastCine = false;
let wedgeOut = false, wedgeDir = 1;
let follower = null, followKey = '', planAt = -99, lastStep = null, lastPhase = '', shots = 0;
const MAX_SHOTS = CFG.shots || 80;
const shot = (name) => { if (shots < MAX_SHOTS) { shots++; B.shot(name); } };
world.devInvuln = !!CFG.invulnerable;
// --speed=N: N gameplay steps per frame (playerapi speed); waiting budgets and stuck windows are in game time, so they scale along
if (CFG.speed > 1) B.speed(CFG.speed);

// the game's own walking collision (player.js WALK_OPTS): a point is free when a walker standing there is not pushed out
const WALK_OPTS = { byPlayer: true, noWalls: true };
function footFree(x, y) {
  try {
    const gz = world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) || 0 : 0;
    const [rx, ry] = Co.resolveWalker(x, y, player.radius || 0.4, world.map, 0, 0, WALK_OPTS, gz, 0);
    return Math.hypot(rx - x, ry - y) < 0.04;
  } catch (e) { return true; }
}

// no water at the point (the canal beside a road, the pond north of the Grote Markt, #312)
function dry(x, y) {
  try { return !Un.isInWater(world.map, x, y); } catch (e) { return true; }
}
// a car can drive over the point: dry and 1.7 m clear of every building (the game's own wall collision; buildingsNear answers for whole map cells, so it
// says nothing about a single point). For the straight drive of the stunt (M01).
function carFree(x, y) {
  // the car is 4 m long: water within 2.2 m of the point sinks the nose or the tail (the pond of M01 is a narrow strip, a point test sailed right over it)
  if (!dry(x, y) || !dry(x + 2.2, y) || !dry(x - 2.2, y) || !dry(x, y + 2.2) || !dry(x, y - 2.2)) return false;
  try { const [rx, ry] = Co.resolveBuildingCollisions(x, y, 1.7, world.map); return Math.hypot(rx - x, ry - y) < 0.05; } catch (e) { return true; }
}

// water on the way of a car (the canal beside a road, a pond): a fan of points ahead, 3 headings by a reach of about 1.6 s, as obstacles for avoidance() that
// steer away and cap the speed. M01 sank in a pond, M10 and M14 went into the canal at a bend at 12 m/s (#312). A bridge is dry (isInWater has the veto).
function waterAhead(car) {
  const out = [], sp = Math.abs(car.speed || 0);
  if (sp < 2) return out;
  const reach = Math.max(8, Math.min(32, sp * 1.6));
  for (const da of [-0.45, 0, 0.45]) for (let d = 5; d <= reach; d += 4) {
    const a = car.angle + da, x = car.x + Math.cos(a) * d, y = car.y + Math.sin(a) * d;
    if (!dry(x, y)) out.push({ x, y, r: 1.6 });
  }
  return out;
}

function plan(s, mode, tgt) {
  const kind = mode === 'drive' ? 'drive' : 'walk';
  const me = { x: s.player.x, y: s.player.y };
  let pts = null;
  try {
    // a boat sails the waterway net (planBoatTrip), the land graph knows nothing of water
    // in a chase the player simply turns round in a one-way street, or drives out of a street that is closed to cars (the game lets him): the legal
    // route (2500 m from the Pelsterstraat, or the GPS line, south and round the block) took the bot more than 380 m from the limo and the chase ended
    // 'lost'. The walking graph runs both ways along every street: from the Gelkingestraat 488 m up the street, over the Grote Markt to the Oude
    // Boteringestraat (M26, #354)
    const chasing = kind === 'drive' && s.mission.active && s.mission.stage === 'chase';
    const r = mode === 'boat' ? R.planBoatTrip(world.map, [me.x, me.y], [tgt.x, tgt.y], 'sloep') : R.planLandRoute(world.map, chasing ? 'walk' : kind, [me.x, me.y], [tgt.x, tgt.y]);
    pts = r && r.pts && r.pts.length ? r.pts : null;
  } catch (e) { B.log('routefout', { msg: String(e && e.message || e).slice(0, 200) }); }
  // outside the city graph (the Ommeland) planLandRoute finds nothing, and where the own route ran into a wall (a detour was needed)
  // the line the game itself shows the player is the better one, when it leads to this goal
  // the planner starts a route on the nearest road it may use: a car that stands in a street closed to cars (the Gelkingestraat, where the M26 chase
  // starts) got a route that began on the Pelsterstraat, 130 m away, and drove straight at that first point through the houses (#354)
  if (mode !== 'boat' && L.routeStartsFar(me, pts)) { B.log('route-start-ver', { van: [Math.round(me.x), Math.round(me.y)], eerste: pts[0].map(Math.round) }); pts = null; }
  let src = pts ? 'plan' : 'recht';
  if (!pts || (kind === 'walk' && detours[mem.stageKey] > 0)) {
    try {
      const gps = R.getActiveRoute();
      const e = gps && gps.pts && gps.pts.length > 1 ? gps.pts[gps.pts.length - 1] : null;
      if (e && L.distance({ x: e[0], y: e[1] }, tgt) < 80) { pts = R.getRouteAhead(1e9) || pts; src = pts ? 'gps' : src; }
    } catch (e) { /* geen route */ }
  }
  let line = pts || [[me.x, me.y]];
  line.push([tgt.x, tgt.y]);
  // on foot the planned route knows no stall poles, bins or benches: every blocked stretch gets a way round it (#218)
  if (kind === 'walk') {
    const rep = L.repairPath(line, footFree);
    if (rep.fixed) { B.log('omweg-plan', { stukken: rep.fixed, van: line.length, naar: rep.pts.length }); line = rep.pts; src += '+omweg'; }
  }
  follower = new L.PathFollower(line, { reach: mode === 'drive' ? 7 : 2.5 });
  B.log('route', { mode, planned: !!pts, src, points: line.length, to: [Math.round(tgt.x), Math.round(tgt.y)] });
}

// what stands in the lane of a car at `me` that is chasing `tgt`: walkers, cyclists and moving traffic within 30 m (not the car it chases)
function trafficAhead(me, tgt) {
  const out = [];
  for (const p of world.pedestrians || []) {
    if (p.state === 'dead' || Math.hypot(p.x - me.x, p.y - me.y) > 30) continue;
    out.push({ x: p.x, y: p.y, r: 0.45 });
  }
  const own = player.inVehicle;
  for (const v of world.vehicles || []) {
    if (v === own || v.wrecked || v.sinking || Math.hypot(v.x - me.x, v.y - me.y) > 30) continue;
    if (Math.hypot(v.x - tgt.x, v.y - tgt.y) < 6) continue;        // the one we chase
    if (v.parked && !(Math.abs(v.speed || 0) > 0.5)) continue;     // a parked car stands at the kerb, not in the lane
    out.push({ x: v.x, y: v.y, r: v.isBike || v.isScooter ? 0.6 : Math.max(0.9, (v.halfWid || 1) * 0.9) });
  }
  return out;
}

// aim for the target over the planned route; returns the distance left
// stopR: how close on foot (default 0.6 of the marker radius; a vehicle to board needs the bot right next to it, not 5 m away)
function steerTowards(s, mode, tgt, stopAt, top = 24, stopR = null, direct0 = false) {
  // Q/Z is the sail trim of a sailing boat only: let it go outside the boat
  if (mode !== 'boat') { if (B.input.isDown('q')) B.up('q'); if (B.input.isDown('z')) B.up('z'); }
  // a goal on the water that is walked to (the rented boat of M11 lies off a quay): the berth on the shore beside it, not the boat's own spot,
  // or the walk ends in the water (the bot swam and drowned, #312)
  if (mode === 'walk' && !s.player.vehicle) {
    const bk = Math.round(tgt.x) + ',' + Math.round(tgt.y);
    if (mem.berthKey !== bk) {
      mem.berthKey = bk; mem.berth = null;
      try { mem.berth = R.berthFor(world.map, tgt.x, tgt.y); } catch (e) { /* no water here */ }
      if (mem.berth) B.log('steiger', { doel: [Math.round(tgt.x), Math.round(tgt.y)], steiger: [Math.round(mem.berth.x), Math.round(mem.berth.y)], afstand: Math.round(mem.berth.shoreD) });
    }
    if (mem.berth) tgt = { ...tgt, x: mem.berth.x, y: mem.berth.y };
  }
  const key = mode + ':' + Math.round(tgt.x / 5) + ',' + Math.round(tgt.y / 5);
  if (!follower || key !== followKey || s.t - planAt > 12) { followKey = key; planAt = s.t; plan(s, mode, tgt); }
  const me = { x: s.player.x, y: s.player.y };
  const direct = L.distance(me, tgt);
  const chasing = mode === 'drive' && s.mission.active && s.mission.stage === 'chase';
  let aim = direct0 || direct < (mode === "walk" ? 9 : chasing ? 9 : 25) && (mode !== 'walk' || L.segmentFree(me, tgt, footFree)) ? tgt : follower.next(me) || tgt;
  // a garage (M02: Spuit & Klaar): the bay is walled on three sides and open at the door. Straight at the middle from the side or the back wedges the car
  // against a wall (150 s at the garage in the failed gate run, #387): first to a point in the street in front of the door, then in along its axis
  // and out again once the stage is done: the car stands nose to the back wall, so backwards along the axis until it is out of the bay (the next stage's route
  // started inside the walls and the bot stood 140 s in the bay before the rescue ladder lifted it out)
  if (mode === 'drive' && s.player.vehicle && !s.player.vehicle.boat) {
    const stg0 = M.activeStage(), gi = stg0 && stg0.kind === 'garage' ? null : Ga.garageInside(world);
    if (gi && Math.cos(s.player.vehicle.angle - gi.angle) < 0.3) { B.stick(0, 1); return direct; }
  }
  if (mode === 'drive' && s.player.vehicle && direct < 45) {
    const stg = M.activeStage();
    const g = stg && stg.kind === 'garage' ? Ga.getGaragesForRender().find((q) => Math.hypot(q.x - tgt.x, q.y - tgt.y) < 1.5) : null;
    if (g) {
      const gx = Math.cos(g.angle), gy = Math.sin(g.angle);
      const fwd = (me.x - g.x) * gx + (me.y - g.y) * gy, side = -(me.x - g.x) * gy + (me.y - g.y) * gx;
      if (!(fwd > 4 && Math.abs(side) < fwd * 0.3 + 0.8)) aim = { x: g.x + gx * 11, y: g.y + gy * 11 };
    }
  }   // on foot the planned route goes round poles and walls almost to the end
  if ((mode === 'drive' || mode === 'boat') && s.player.vehicle) {
    // #312: a sailing boat runs on wind and trim, a rowing boat on rhythm; the normal throttle/steer layer
    // (carControls) knows neither. The pure rules are in scripts/bot/nav.mjs.
    const boot = mode === 'boat' ? player.inVehicle : null;
    if (boot && boot.model && Nav) {
      const vk = (s.story.id || '?') + ':' + (s.mission.stage || '-');
      const w = sailWatch.update('vaar', vk, s.t);
      if (w.tooLong) {
        sailWatch.reset();
        B.log('timeout', { step: vk, what: 'varen: het doel niet gehaald', forS: Math.round(w.forS), x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, boot: { soort: boot.model.soort || boot.kind, x: Math.round(boot.x), y: Math.round(boot.y), v: Math.round((boot.speed || 0) * 10) / 10, trim: boot.zeilTrim, wind: world.wind && Math.round(world.wind.speed || 0) } });
        if (B.input.isDown('q')) B.up('q');
        if (B.input.isDown('z')) B.up('z');
        B.stick(0, 0);
        return direct;
      }
      if (boot.model.zeil) {
        const b = mem.zeil || (mem.zeil = {});
        Object.assign(b, { x: me.x, y: me.y, angle: boot.angle, speed: boot.speed, zeilTrim: boot.zeilTrim, omgeslagen: boot.omgeslagen, helling: boot.helling, sailTop: boot.sailTop });
        const c = Nav.sailControls(b, { goal: aim, wind: world.wind, dt: 0.1 });
        B.stick(c.steer, -c.throttle);
        if (c.trim > 0) { if (B.input.isDown('z')) B.up('z'); B.down('q'); }
        else if (c.trim < 0) { if (B.input.isDown('q')) B.up('q'); B.down('z'); }
        else { if (B.input.isDown('q')) B.up('q'); if (B.input.isDown('z')) B.up('z'); }
        if (ticks % 30 === 0) B.log('vaart', { soort: 'zeil', x: Math.round(me.x), y: Math.round(me.y), v: Math.round((boot.speed || 0) * 10) / 10, top: Math.round((boot.sailTop || 0) * 10) / 10, trim: Math.round((boot.zeilTrim ?? 0.6) * 100), wind: world.wind ? { dir: Math.round(world.wind.dir * 100) / 100, mps: Math.round(world.wind.speed * 10) / 10 } : null, koers: b.angle, kruisen: !!c.tacking, doel: [Math.round(aim.x), Math.round(aim.y)], afstand: Math.round(direct) });
        return direct;
      }
      if (boot.model.soort === 'roeiboot') {
        if (B.input.isDown('q')) B.up('q');
        if (B.input.isDown('z')) B.up('z');
        const c = L.carControls({ x: me.x, y: me.y, angle: boot.angle, speed: boot.speed }, aim, { stopAt: direct < 25, rest: 3, top: 4, curveCap: null });
        B.stick(c.steer, 0);
        // every stroke is a tap on W, 1.25 s after the last (zeilvaren.js roeiStap): not held down
        if (direct > 8 && Nav.rowDue(s.t, mem.rowT)) { mem.rowT = s.t; B.press('w', 140); }
        if (ticks % 30 === 0) B.log('vaart', { soort: 'roei', x: Math.round(me.x), y: Math.round(me.y), v: Math.round((boot.speed || 0) * 10) / 10, slag: mem.rowT, doel: [Math.round(aim.x), Math.round(aim.y)], afstand: Math.round(direct) });
        return direct;
      }
    }
    // a garage (M02: drive in and stand still 1.2 s) or a stage with `stop`: come to rest right there
    const stg = M.activeStage();
    const rest = stg && (stg.kind === 'garage' ? 3.5 : stg.stop ? Math.max(3, stg.stop + 2) : 0);
    const mdefE = (M.getMissionDefs() || [])[s.mission.index];
    // (stopAt measures the distance to the next point of the route, not to the goal: far from it the car crept along at half that distance, 5 m/s over the
    // 1.8 km from the menu spot to the start of M01, 360 s; it only comes to rest within 70 m of the goal)
    // in a chase the lane is full of cyclists and walkers (M26, the Hoogstraatje): steer round them instead of through (#354)
    const avoid = mode === 'drive' && s.mission.active && (s.mission.stage === 'chase' || L.isStunt(s)) ? trafficAhead(me, tgt) : null;
    const car = { x: me.x, y: me.y, angle: s.player.vehicle.angle, speed: s.player.vehicle.speed };
    const curve = avoid && follower ? L.curveCap(follower.pts, follower.i, car) : null;
    const water = mode === 'drive' && !s.player.vehicle.boat && !CFG.zonderWater ? waterAhead(car) : [];
    const obstacles = water.length ? [...(avoid || []), ...water] : avoid;
    const c = L.carControls(car, aim, { stopAt: (stopAt && direct < 70) || !!rest, rest, top: mode === 'boat' ? Math.min(top, 9) : top, gentle: !!(s.mission.active && mdefE && mdefE.eggs), avoid: obstacles, curveCap: curve });
    B.stick(c.steer, c.throttle ? -c.throttle : 0);
    // a chase is logged every 3 s: where, how fast, how far from the fleeing car, what stands in the lane (#354)
    if (avoid && s.mission.stage === 'chase') {
      if (mem.chaseT0 == null || s.t - mem.chaseLogT > 60) mem.chaseT0 = s.t;
      if (s.t - (mem.chaseLogT || -9) >= (s.t - mem.chaseT0 < 40 ? 1 : 3)) {
        mem.chaseLogT = s.t;
        B.log('achtervolging', { x: Math.round(me.x * 10) / 10, y: Math.round(me.y * 10) / 10, hoek: Math.round(car.angle * 100) / 100, v: Math.round((s.player.vehicle.speed || 0) * 10) / 10, afstand: Math.round(direct), aim: [Math.round(aim.x), Math.round(aim.y)], punt: follower ? follower.i + '/' + follower.length : '-', hindernis: avoid.filter((o) => Math.hypot(o.x - me.x, o.y - me.y) < 14).length, stuur: Math.round(c.steer * 100) / 100, gas: c.throttle, wens: Math.round(c.want * 10) / 10, bocht: curve === Infinity ? null : Math.round(curve) });
      }
    }
    if (!c.reverse && wedge.update(s.t, s.player.vehicle.speed, c.throttle)) wedge.reset(), wedgeOut = true;
    // a race on a bike (M05, the KEI week): Shift is a sprint of harder pedalling, and held down it starts the next one as soon as the breather is over
    if (s.player.vehicle.kind === 'fiets' && s.mission.active && s.mission.type === 'checkpoint') B.down('shift');
    else if (B.input.isDown('shift')) B.up('shift');
  } else {
    const radius = stopR != null ? stopR : (s.mission.triggerRadius || 8) * 0.6;
    if (direct < radius) { B.stick(0, 0); B.up('shift'); return direct; }
    const [x, y] = L.footStick(L.headingTo(me, aim), s.player.camYaw);
    B.stick(x, y);
    if (direct > 40) B.down('shift'); else B.up('shift');
  }
  return direct;
}

// the plane (M15): keys from botlogic.planeKeys, applied as holds; the gates and the strip come from the mission def
const FLY_KEYS = ['w', 's', 'a', 'd', ' ', 'control', 'shift'];
// keys for plane and pigeon: the stick (a leftover steering axis outranks the keys) goes to zero, and a key the game lost
// (a jump clears its input) is released and pressed again so bot and game agree
function applyFlyKeys(want) {
  B.stick(0, 0);
  for (const k of FLY_KEYS) {
    if (want.has(k)) { if (!B.input.isDown(k)) { B.up(k); B.down(k); } } else if (B.input.isDown(k)) B.up(k);
  }
}
function releaseFly() { for (const k of FLY_KEYS) if (B.input.isDown(k)) B.up(k); }
async function flyStep(s) {
  const v = player.inVehicle;
  if (!v || !v.plane) { releaseFly(); return; }
  const pl = v.plane;
  const st = M.activeStage();
  const def = (M.getMissionDefs() || [])[s.mission.index];
  const gh = (x, y) => (world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) || 0 : 0);
  const kind = st && st.kind;
  // a flight that takes too long (a gate it cannot make) is a finding: the ladder takes over
  const fkey = (kind || '') + (s.story.id || '');
  if (mem.flyKey !== fkey) { mem.flyKey = fkey; mem.flyT = s.t; }
  if (s.t - mem.flyT > 420) {
    mem.flyT = s.t;
    B.log('timeout', { step: (s.story.id || '?') + (s.mission.active ? ':' + (s.mission.stage || 'm') : ''), what: 'vliegtuig: het doel niet gehaald', forS: 420, x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, doel: s.target && { x: s.target.x, y: s.target.y }, vliegtuig: { x: Math.round(pl.x), y: Math.round(pl.y), z: Math.round(pl.z), agl: Math.round(pl.z - gh(pl.x, pl.y)), v: Math.round(pl.speed) } });
    releaseFly();
    await rescue(s, fkey, { idleFor: 420, quiet: true });
    return;
  }
  const stripSpec = def && def.stages && (def.stages.find((q) => q.kind === 'plane') || {}).strip;
  let o = null;
  if (kind === 'airgates' && s.target) {
    const gates = st.gates || [];
    let g = gates[0], bd = Infinity;
    for (const q of gates) { const d = L.distance(q, s.target); if (d < bd) { bd = d; g = q; } }
    o = { agl: pl.z - gh(pl.x, pl.y), goal: { x: s.target.x, y: s.target.y }, alt: g ? (g.lo + g.hi) / 2 : 20, mode: 'fly' };
  } else if (kind === 'landplane' && stripSpec) {
    o = { agl: pl.z - gh(pl.x, pl.y), goal: { x: s.target ? s.target.x : stripSpec.x, y: s.target ? s.target.y : stripSpec.y }, alt: 30, mode: 'land', strip: stripSpec };
  } else if (kind === 'plane') {
    // just boarded: the stage moves on by itself
    releaseFly();
    return;
  } else if (pl.onGround && pl.speed < 2) {
    // the stage is over (or none): climb out
    releaseFly();
    await keyTap('e'); await sleep(900);
    return;
  } else if (stripSpec) {
    o = { agl: pl.z - gh(pl.x, pl.y), goal: { x: stripSpec.x, y: stripSpec.y }, alt: 30, mode: 'land', strip: stripSpec };
  }
  if (!o) { releaseFly(); return; }
  const want = L.planeKeys({ x: pl.x, y: pl.y, z: pl.z, heading: pl.heading, speed: pl.speed, pitch: pl.pitch, roll: pl.roll, vz: pl.vz, onGround: pl.onGround, throttle: pl.throttle }, o);
  applyFlyKeys(want);
  if (ticks % 20 === 0) {
    const rel = o.strip ? (() => { const c = Math.cos(o.strip.heading), sn = Math.sin(o.strip.heading), dx = pl.x - o.strip.x, dy = pl.y - o.strip.y; return { along: Math.round(dx * c + dy * sn), across: Math.round(-dx * sn + dy * c), hdg: Math.round(L.normAngle(pl.heading - o.strip.heading) * 100) / 100 }; })() : null;
    B.log('vlucht', { mode: o.mode, agl: Math.round(o.agl), v: Math.round(pl.speed), vz: Math.round(pl.vz * 10) / 10, gate: o.goal && [Math.round(o.goal.x), Math.round(o.goal.y)], rel, keys: [...want].join('') });
  }
}

// the helicopter (the own heli, heliflight.js): W/S forward and brake, A/D yaw, Space/Ctrl up and down, Shift boost. The pure keys
// and the approach/landing come from botlogic' neighbour scripts/bot/nav.mjs; this half only reads the heli and presses.
const HELI_KEYS = ['w', 's', 'a', 'd', ' ', 'control', 'shift'];
function applyHeliKeys(want) {
  B.stick(0, 0);
  for (const k of HELI_KEYS) {
    if (want.has(k)) { if (!B.input.isDown(k)) { B.up(k); B.down(k); } } else if (B.input.isDown(k)) B.up(k);
  }
}
function releaseHeli() { for (const k of HELI_KEYS) if (B.input.isDown(k)) B.up(k); }
async function heliStep(s, goal) {
  const v = player.inVehicle;
  if (!v || !v.heli) { releaseHeli(); return; }
  const gh = (x, y) => (world.map.groundHeightAt ? world.map.groundHeightAt(x, y, 0) || 0 : 0);
  const agl = v.z - (Number.isFinite(v.groundZ) ? v.groundZ : gh(v.x, v.y));
  const st = M.activeStage();
  // a stage that is itself a heli run ends on the pad: there he has to land, elsewhere he only has to arrive
  const land = !!(st && /^(heli|landheli)$/.test(String(st.kind || '')));
  const key = (s.story.id || '?') + ':' + (s.mission.stage || '-');
  const w = heliWatch.update('heli', key, s.t);
  if (w.tooLong) {
    heliWatch.reset();
    B.log('timeout', { step: key, what: 'heli: het doel niet gehaald', forS: Math.round(w.forS), x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, doel: { x: Math.round(goal.x), y: Math.round(goal.y) }, heli: { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z), agl: Math.round(agl), v: Math.round(v.speed || 0) } });
    releaseHeli();
    await rescue(s, key, { idleFor: w.forS, quiet: true });
    return;
  }
  const want = Nav.heliKeys({ x: v.x, y: v.y, z: v.z, angle: v.angle, speed: v.speed, vz: v.vz, onGround: !!v.onGround, rotor: v.rotor, groundZ: v.groundZ }, { goal, mode: land ? 'land' : 'fly', agl });
  applyHeliKeys(want);
  // on the pad, at a standstill: out, like a player who has finished the flight
  const d = Math.hypot(goal.x - v.x, goal.y - v.y);
  if (v.onGround && d < 12 && Math.abs(v.speed || 0) < 1.5) {
    releaseHeli();
    await keyTap('e'); await sleep(900);
    return;
  }
  if (ticks % 20 === 0) B.log('heli', { x: Math.round(v.x), y: Math.round(v.y), z: Math.round(v.z), agl: Math.round(agl), v: Math.round(v.speed || 0), vz: Math.round((v.vz || 0) * 10) / 10, rotor: Math.round((v.rotor || 0) * 100) / 100, doel: [Math.round(goal.x), Math.round(goal.y)], afstand: Math.round(d), land, keys: [...want].join('') });
}

// E (and F) is read once per frame, but at --speed=N a frame runs N gameplay steps: the first step boards, the second sees the same press
// and gets out again (a plane, a car at random). One step per frame for the length of an interaction key.
async function keyTap(key, ms = 90) {
  const fast = (CFG.speed || 1) > 1 && (key === 'e' || key === 'f');
  if (fast) B.speed(1);
  await B.press(key, ms);
  if (fast) { await sleep(150); B.speed(CFG.speed); }
}

async function holdSkip() {
  B.stick(0, 0);
  B.down(' ');
  await sleep(1400);
  B.up(' ');
}

async function nudge(s) {
  B.log('nudge', { vehicle: !!s.player.vehicle });
  if (s.player.vehicle) {
    B.stick(-0.9, 1);
    await sleep(1600);
    B.stick(0.9, -1);
    await sleep(900);
  } else {
    await B.press(' ', 120);
    B.stick(0.7, -0.7);
    await sleep(1200);
  }
  B.stick(0, 0);
  follower = null;
}

// on foot the planned route knows no poles, bins or corners: sidestep left, right, back and round before a cheat is needed
async function detour(s, n) {
  const me = { x: s.player.x, y: s.player.y }, tgt = s.target || me;
  const turn = [Math.PI / 2, -Math.PI / 2, Math.PI * 0.75, -Math.PI * 0.75][(n - 1) % 4];
  B.log('omweg', { n, x: Math.round(me.x), y: Math.round(me.y) });
  const [x, y] = L.footStick(L.normAngle(L.headingTo(me, tgt) + turn), s.player.camYaw);
  B.stick(x, y);
  await B.press(' ', 120);
  await sleep(2200);
  B.stick(0, 0);
  follower = null;
}

// on foot and not moving for 2 s (a stall pole, a prop, a parked car): a sidestep, alternating sides and longer each time, then a detour point
// to the side of the line to `goal` that the next plan starts from. True when it did one (the caller skips the tick).
async function footUnstick(s, goal) {
  const fp = mem.footPos;
  if (!fp || Math.hypot(s.player.x - fp.x, s.player.y - fp.y) > 0.5) { mem.footPos = { x: s.player.x, y: s.player.y, t: s.t }; return false; }
  if (s.t - fp.t <= 2) return false;
  mem.footPos = null;
  mem.sidesteps = (mem.sidesteps || 0) + 1;
  const dir = mem.sidesteps % 2 ? 1 : -1, ms = 700 + 350 * Math.min(8, mem.sidesteps);
  B.log('zijstap', { x: s.player.x, y: s.player.y, n: mem.sidesteps, ms });
  B.stick(dir, -0.3);
  await sleep(ms);
  B.stick(0, 0);
  const hx = goal.x - s.player.x, hy = goal.y - s.player.y, hl = Math.hypot(hx, hy) || 1;
  const off = 7 + 3 * Math.min(6, mem.sidesteps);
  mem.detour = { x: s.player.x + (-hy / hl) * off * dir + (hx / hl) * 4, y: s.player.y + (hx / hl) * off * dir + (hy / hl) * 4, until: s.t + 12 };
  follower = null;
  return true;
}

// in a vehicle that sits against a kerb, a wall or other traffic: other ways out of it, one after the other, before a cheat is needed
const vdetours = {};
async function vdetour(s, n) {
  B.log('voertuigomweg', { n, x: Math.round(s.player.x), y: Math.round(s.player.y), snelheid: s.player.vehicle && s.player.vehicle.speed });
  const pattern = [[-1, 2200, 1, 1600], [1, 2200, -1, 1600], [0, 4000, 0.5, 2500], [-1, 3000, -1, 3000]][(n - 1) % 4];
  B.stick(pattern[0], 1);
  await sleep(pattern[1]);
  B.stick(pattern[2], -1);
  await sleep(pattern[3]);
  B.stick(0, 0);
  follower = null;
}

async function rescue(s, stepKey, info) {
  // the ladder counts per story step (a failed mission restarts the detector, not the ladder); every fail is a rung higher
  const sid = s.story.id || '?';
  const rung = L.rescueFor((ladder[sid] = (ladder[sid] || 0) + 1) - 1 + (fails[sid] || 0));
  // quiet: the branch already logged a 'timeout' with the same spot (a pigeon, a plane): no second line for the same moment
  if (!info.quiet) {
    B.log('stuck', { step: stepKey, x: s.player.x, y: s.player.y, idleFor: info.idleFor, goalDist: s.target ? s.target.distance : null, rung, doel: s.target && { x: s.target.x, y: s.target.y, vehicle: !!s.target.vehicle, source: s.target.source }, prompt: s.hud.prompt || undefined, dichtbij: (s.nearby.vehicles || []).slice(0, 3).map((c) => [c.kind, c.distance, c.free]) });
    shot(`${stepKey}-vast`);
  }
  if (rung === 'nudge') { await nudge(s); detector.acknowledge(s.t); return; }
  if (s.player.vehicle && !s.player.vehicle.plane && !s.player.vehicle.heli && !s.blocking.cinematic && (vdetours[stepKey] = (vdetours[stepKey] || 0) + 1) <= 4) { await vdetour(s, vdetours[stepKey]); detector.acknowledge(s.t); ladder[sid]--; return; }
  if (!s.player.vehicle && !s.blocking.cinematic && !s.blocking.talk && (detours[stepKey] = (detours[stepKey] || 0) + 1) <= 4) { await detour(s, detours[stepKey]); detector.acknowledge(s.t); ladder[sid]--; return; }
  const m = s.mission.active;
  let ok = false;
  if (rung === 'teleport') ok = B.cheat.teleport();
  else if (rung === 'objective') ok = m ? B.cheat.objective() : B.cheat.complete();
  else if (rung === 'win') ok = m ? B.cheat.win() : B.cheat.complete() || B.cheat.skip();
  else ok = B.cheat.skip();
  let state = null;
  try { state = window.__story.mission(); } catch (e) { /* none */ }
  B.log('cheat', { rung, ok: !!ok, step: stepKey, why: `${Math.round(info.idleFor)} s zonder voortgang`, mission: state && { phase: state.phase, stage: state.stage }, blocking: Object.keys(s.blocking).filter((k) => s.blocking[k] && k !== 'dialog') });
  follower = null;
  detector.acknowledge(s.t);
}

// #312: a board stage with a vehicle, handled by the pure rules of scripts/bot/board.mjs: which vehicle
// (the mission's own, not a bike or a car with a driver), where to stand (at the door on the bot's side)
// and how long one attempt may take (a timeout is a finding, not four blind presses of E). This half
// walks, presses E and logs. Returns true: the caller skips the rest of the tick.
async function boardStage(s, stepKey) {
  // just boarded, or already in the mission's own vehicle while the stage still says 'board': hold still for a
  // moment (the stage flips on its own), or the bot presses E again because another car stands nearby
  if (s.player.vehicle) {
    if (s.player.vehicle.mission) {
      if (mem.holdAt == null) mem.holdAt = s.t;
      if (s.t - mem.holdAt < 3) { B.stick(0, 0); return true; }
      mem.holdAt = null;
      return false;   // the stage stays 'board': let decide have it (getting out again)
    }
  } else mem.holdAt = null;
  mem.board = mem.board || {};
  // in a vehicle that is not the mission's own (a bike, last mission's car): out first, then the right one
  const inWrong = !!s.player.vehicle && !s.player.vehicle.mission;
  const pick = inWrong ? null : Bd.pickVehicle(s, mem.board);
  const v = pick && pick.vehicle;
  if (!v && !inWrong) {
    // nothing within reach: walk to the marker (the stage's vehicle stands there)
    if (s.target) steerTowards(s, 'walk', s.target, false, 24, 2.5);
    return true;
  }
  if (v && mem.pickLog !== stepKey) {
    mem.pickLog = stepKey;
    B.log('board-keuze', { voertuig: { kind: v.kind, x: Math.round(v.x), y: Math.round(v.y), afstand: Math.round(v.distance), missie: !!v.mission, vrij: !!v.free }, waarom: pick.why, doel: s.target && [Math.round(s.target.x), Math.round(s.target.y)] });
  }
  // the snapshot only carries a kind and a position: the body (half length, half width, angle) comes from the
  // game's own vehicle, or the door and the reach of vehicle.js would be measured on a make-believe box
  const vObj = v ? world.vehicles.find((q) => Math.hypot(q.x - v.x, q.y - v.y) < 0.6) : null;
  const body = vObj ? { ...v, angle: vObj.angle, halfLen: vObj.halfLen, halfWid: vObj.halfWid } : v;
  const step = Bd.boardStep({ player: { x: s.player.x, y: s.player.y, speed: s.player.vehicle ? s.player.vehicle.speed : 0, vehicle: s.player.vehicle ? { kind: s.player.vehicle.kind, mission: !!s.player.vehicle.mission } : null }, vehicle: body, target: s.target, wrongVehicle: inWrong }, mem.board, s.t);
  if (step.type === 'giveup') {
    // no progress: the reason and the spot go into the report as a 'timeout', then the rescue ladder takes over
    B.log('timeout', { step: stepKey, what: 'board: ' + step.why, forS: Math.round(step.forS || 0), x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, doel: s.target && { x: Math.round(s.target.x), y: Math.round(s.target.y) }, voertuig: v ? { kind: v.kind, x: Math.round(v.x), y: Math.round(v.y), afstand: Math.round(v.distance), missie: !!v.mission, vrij: !!v.free } : { nu: s.player.vehicle && s.player.vehicle.kind }, drukken: step.presses || 0, deur: step.to ? [Math.round(step.to.x), Math.round(step.to.y)] : null });
    mem.board = null;
    await rescue(s, stepKey, { idleFor: step.forS || 30, quiet: true });
    return true;
  }
  if (step.type === 'wait') { B.stick(0, 0); return true; }
  if (step.type === 'exit') {
    B.stick(0, 0);
    if (mem.exitLog !== stepKey) { mem.exitLog = stepKey; B.log('board-uit', { stap: stepKey, voertuig: s.player.vehicle && s.player.vehicle.kind }); }
    await keyTap('e', 240); await sleep(600);
    return true;
  }
  const big = vObj && Math.max(vObj.halfLen || 0, vObj.halfWid || 0) > 3;
  // bij de deur aan de kant van de bot; een boot stap je van de kade in, daar is het midden het doel (de kade)
  const aimAt = v ? (v.kind === 'boot' ? v : step.to || v) : null;
  if (!aimAt) { B.stick(0, 0); return true; }
  // the same sidesteps as on any walk: a board stage's vehicle often stands among cars, a bus or a shed
  if (Math.hypot(aimAt.x - s.player.x, aimAt.y - s.player.y) > 3.5) {
    if (await footUnstick(s, aimAt)) return true;
    if (mem.detour && s.t < mem.detour.until && Math.hypot(mem.detour.x - s.player.x, mem.detour.y - s.player.y) > 3) { steerTowards(s, 'walk', mem.detour, false, 24, 2.5); return true; }
  }
  const d = steerTowards(s, 'walk', aimAt, false, 24, big || (mem.nearMiss || 0) >= 2 ? 0.4 : 2.2);
  // the game's own test: this is what lights the prompt and lets E in (and never another vehicle)
  const near = vObj ? V.findEnterableVehicle(player.x, player.y, world.vehicles) === vObj : d < 3.5;
  if (near || (!vObj && d < 3.5)) {
    B.stick(0, 0);
    Bd.pressed(mem.board, s.t);
    await keyTap('e', 240); await sleep(700);
    const fe = V.findEnterableVehicle(player.x, player.y, world.vehicles);
    B.log('instappen', { kind: v.kind, toegestaan: near, binnen: !!player.inVehicle, doel: vObj && { x: Math.round(vObj.x * 10) / 10, y: Math.round(vObj.y * 10) / 10, hl: vObj.halfLen, hw: vObj.halfWid, naam: vObj.name || vObj.label || '', hero: !!vObj.isHeroCar, wrak: !!vObj.wrecked, slot: !!(vObj.locked || vObj.disabled) }, kan: fe && { x: Math.round(fe.x * 10) / 10, y: Math.round(fe.y * 10) / 10, naam: fe.name || fe.label || '' }, ik: [Math.round(player.x * 10) / 10, Math.round(player.y * 10) / 10] });
    if (player.inVehicle) {
      B.log('board', { event: 'ingestapt', stap: stepKey, voertuig: { kind: v.kind, x: Math.round(v.x), y: Math.round(v.y), missie: !!v.mission }, seconden: Math.round(((s.t - (mem.board.attemptAt ?? s.t)) + Number.EPSILON) * 10) / 10, drukken: mem.board.presses || 0 });
      // the drive to the next stage's goal gets a budget of its own (board.mjs driveStep), per stage
      mem.drive = { id: s.story.id, key: stepKey, drove: s.t, best: null, bestAt: s.t };
      mem.board = null;
    } else Bd.missed(mem.board, v, s.t);
    follower = null;
  } else if (d < 3.5) mem.nearMiss = (mem.nearMiss || 0) + 1;
  return true;
}

// balance and pace meter (#147, scripts/bot/balans.mjs): per step the wall time, the metres walked or driven, the time in cutscenes,
// talks and dialogs, the goal changes and the longest quiet stretch (no movement, no scene, no new goal)
let meter = null;
const newMeter = (s) => ({ t0: s.t, wall0: s.wall, pos: { x: s.player.x, y: s.player.y }, dist: 0, cine: 0, cineN: 0, cineAt: null, talk: 0, goals: 0, goal: '', lastAct: s.t, maxQuiet: 0, prev: s.t, active: 0, limit: 0, minLeft: null });
function meterTick(s) {
  if (!meter) meter = newMeter(s);
  const m = meter, dt = Math.max(0, Math.min(2, s.t - m.prev));
  m.prev = s.t;
  const d = Math.hypot(s.player.x - m.pos.x, s.player.y - m.pos.y);
  if (d < 60) m.dist += d;   // a teleport or a respawn is no distance walked
  m.pos = { x: s.player.x, y: s.player.y };
  const busy = !!(s.blocking.cinematic || s.blocking.talk || s.blocking.dialog || s.blocking.banner || s.blocking.ride || s.blocking.shop);
  if (s.blocking.cinematic) { m.cine += dt; if (m.cineAt == null) { m.cineAt = s.t; m.cineN++; } } else if (m.cineAt != null) { B.log('cine', { id: s.story.id, dur: Math.round((s.t - m.cineAt) * 10) / 10 }); m.cineAt = null; }
  if (s.blocking.talk) m.talk += dt;
  // the mission's own clock: how long it ran active, the longest time limit seen and the least time that was left
  if (s.mission.active) { m.active += dt; if (Number.isFinite(s.mission.timeLeft)) { m.limit = Math.max(m.limit, s.mission.timeLeft); m.minLeft = m.minLeft == null ? s.mission.timeLeft : Math.min(m.minLeft, s.mission.timeLeft); } }
  const goal = [s.mission.stage || '', s.mission.label || '', s.target ? s.target.name || '' : ''].join('|');
  // every goal (also the first of a step) with the distance to it: the length of the route a player has to cover, whoever plays
  if (goal !== m.goal) { if (m.goal) m.goals++; B.log('doel', { stage: s.mission.stage || '', label: s.mission.label || '', doel: s.target ? s.target.name || '' : '', afstand: s.target ? s.target.distance : null, veh: s.player.vehicle ? s.player.vehicle.kind : 'te voet', eerste: !m.goal }); m.goal = goal; m.lastAct = s.t; }
  if (busy || d > 0.05 || (s.player.vehicle && s.player.vehicle.speed > 1)) m.lastAct = s.t;
  m.maxQuiet = Math.max(m.maxQuiet, s.t - m.lastAct);
}
function meterEnd(s, id, outcome) {
  const m = meter;
  if (!m) { B.log('step', { event: 'end', id, outcome }); return; }
  B.log('step', { event: 'end', id, outcome, wall: Math.round((s.wall - m.wall0) / 100) / 10, dist: Math.round(m.dist), cine: Math.round(m.cine * 10) / 10, cineN: m.cineN, talk: Math.round(m.talk * 10) / 10, goals: m.goals, maxQuiet: Math.round(m.maxQuiet * 10) / 10, actief: Math.round(m.active * 10) / 10, limiet: Math.round(m.limit), restMin: m.minLeft == null ? null : Math.round(m.minLeft) });
  meter = null;
}

let lastWanted = 0;
function track(s) {
  // a rise of the wanted level: where, how fast and what stood near (why the police come)
  if ((s.wanted || 0) > lastWanted) B.log('gezocht', { van: lastWanted, naar: s.wanted, x: Math.round(s.player.x), y: Math.round(s.player.y), v: s.player.vehicle ? Math.round(s.player.vehicle.speed * 10) / 10 : 0, kind: s.player.vehicle ? s.player.vehicle.kind : 'voet', peds: s.nearby.peds, politie: s.nearby.police, wet: TL.getLawState().kind, waarom: world.stats && world.stats.lastWantedWhy, msgs: s.hud.messages.slice(0, 3) });
  if ((s.wanted || 0) > lastWanted && world.stats) world.stats.lastWantedWhy = null;   // the next star names its own cause or none (wantedwhy.js)
  lastWanted = s.wanted || 0;
  const id = s.story.end ? 'einde' : s.story.id;
  if (id === lastStep) meterTick(s);   // a new step starts its own meter below: its first goal belongs after its 'begin'
  if (id !== lastStep) {
    if (lastStep) meterEnd(s, lastStep, 'klaar');
    meter = newMeter(s);
    B.log('step', { event: 'begin', id, label: s.story.title || '', part: s.story.part });
    meterTick(s);
    lastStep = id; lastPhase = '';
    mem.stepSince = s.t;
    mem.boardTries = 0; mem.pressTries = 0; mem.planTries = 0;
    shot(`${id}-begin`);
  }
  const ph = s.mission.active ? 'active' : 'idle';
  if (ph !== lastPhase && lastPhase) {
    if (ph === 'active') { B.log('mission', { event: 'start', id, label: s.mission.label, msgs: s.hud.messages.slice(0, 3), phase: s.mission.phase }); shot(`${id}-start`); }
    else {
      fails[id] = (fails[id] || 0) + 1; B.log('mission', { event: 'fail', id, label: s.mission.label, msgs: s.hud.messages.slice(0, 3), phase: s.mission.phase }); shot(`${id}-fail-${fails[id]}`);
      // where the last 15 s went (x, y, speed, angle per 1.5 s): why a mission failed
      B.log('val-spoor', { stap: id, spoor: (mem.trail || []).slice(-10) });
    }
  } else if (ph === 'active' && !lastPhase) B.log('mission', { event: 'start', id, label: s.mission.label, msgs: s.hud.messages.slice(0, 3), phase: s.mission.phase });
  lastPhase = ph;
  // a scene change: the first moment of each cutscene (a few per step)
  const cine = !!s.blocking.cinematic;
  if (cine && !lastCine && (scenes[id] = (scenes[id] || 0) + 1) <= 3) setTimeout(() => shot(`${id}-scene${scenes[id]}`), 1200);
  lastCine = cine;
}

let heldSince = null;
let result = 'TIMEOUT', reason = 'speltijd of echte tijd op';
let ticks = 0;
const problems = B.validate();
if (problems.length) B.log('schema', { problems });
B.log('start', { part: PART, maxGameS: MAX_GAME });
// --from=<stap>: de run begint bij die stap en speelt vanaf daar door (continu, dus met reisbeats en overgangen)
if (CFG.from) {
  const okFrom = window.__story.jump(CFG.from);
  B.log('setup', { what: 'from', id: CFG.from, ok: !!okFrom });
  await sleep(1500);
  if (CFG.skipFrom) {
    // the intro scene first, then skip the step itself: the next one (a travel step) starts where the player stands
    for (let i = 0; i < 12 && B.status().blocking.cinematic; i++) { await holdSkip(); await sleep(400); }
    const okSkip = B.cheat.skip();
    B.log('setup', { what: 'skip', id: CFG.from, ok: !!okSkip });
    await sleep(2500);
  }
}

// a slip in one tick (a mission without stages, a world that is reloading) is logged and the bot plays on: a night-long run must not die on it
async function loop(stopFn) {
  for (let k = 0; k < 200; k++) {
    try { return await loop1(stopFn); } catch (e) { B.log('lusfout', { msg: String((e && e.stack) || e).slice(0, 400) }); await sleep(400); }
  }
}
async function loop1(stopFn) {
while (true) {
  await sleep(100);
  const s = B.status();
  if (performance.now() - wall0 > MAX_WALL || s.t > MAX_GAME) break;
  if (CFG.until && s.story.id === CFG.until) { result = 'KLAAR'; reason = `tot stap ${CFG.until}`; break; } // bijv. de coöp-testbank: M01 t/m M08, stop zodra T1 begint
  if (s.story.end || (PART !== 'all' && s.story.part && s.story.part !== PART)) { result = 'KLAAR'; reason = s.story.end ? `einde van ${s.story.part}` : `stap ${s.story.id} hoort bij ${s.story.part}`; break; }
  if (stopFn && stopFn(s)) { result = 'KLAAR'; reason = 'stap uitgespeeld'; break; }
  // --skip-stages=N: the first N stages of the step are completed with the objective cheat once the mission runs (logged as setup, not as a bot
  // finding), to test a later stage on its own (#354: the chase of M26); the bot first plays the mission start and the intro
  if (mem.skipLeft > 0 && s.mission.active && s.mission.stage && !s.blocking.cinematic && !s.blocking.banner && !s.blocking.talk) {
    await sleep(1500);
    mem.skipLeft--;
    B.log('setup', { what: 'stage-skip', over: mem.skipLeft, stage: s.mission.stage });
    B.cheat.objective();
    await sleep(2500);
    continue;
  }
  // --annuleer=<s>: once, s seconds into the first mission that runs, the bot stops it through the pause menu the way a player does (Esc, the
  // Missie stoppen button, Ja stoppen: #390); what the game says afterwards is logged ('annuleer'), then the bot plays the mission again as after a failure
  if (CFG.annuleer > 0 && !mem.annuleerd) {
    if (!s.mission.active) mem.actiefSinds = null;
    else if (mem.actiefSinds == null) mem.actiefSinds = s.t;
    else if (s.t - mem.actiefSinds >= CFG.annuleer && !s.blocking.cinematic && !s.blocking.banner && !s.blocking.talk) {
      mem.annuleerd = true;
      const PM = await imp('pausemenu'), MS = await imp('missions');
      const world = window.__debug.world, voor = { id: s.story.id, stage: s.mission.stage, fails: window.__story.view().fails || 0, money: Math.round(world.money) };
      PM.openPauseMenu('overzicht'); await sleep(900);
      const knop = document.querySelector('[data-action="mission-stop"]');
      knop && knop.click(); await sleep(400);
      const vraag = document.querySelector('[data-stop-confirm]');
      const vraagZichtbaar = !!vraag && !vraag.hidden;
      const nogActief = MS.isMissionActive();
      const ja = document.querySelector('[data-action="mission-stop-go"]');
      ja && ja.click(); await sleep(1500);
      const na = { actief: MS.isMissionActive(), fase: world.mission && world.mission.phase, fails: window.__story.view().fails || 0, money: Math.round(world.money), menuDicht: !PM.isPauseMenuOpen() };
      B.log('annuleer', { voor, knop: !!knop, vraagZichtbaar, nogActiefNaVraag: nogActief, na, ok: !!knop && vraagZichtbaar && nogActief && !na.actief && na.fails === voor.fails && na.money === voor.money });
      shot(`${voor.id}-gestopt`);
      follower = null; detector.reset(B.time());
      continue;
    }
  }
  if (s.t - (mem.trailT ?? -9) >= 1.5) { mem.trailT = s.t; (mem.trail = mem.trail || []).push([Math.round(s.t), Math.round(s.player.x), Math.round(s.player.y), s.player.vehicle ? Math.round(s.player.vehicle.speed * 10) / 10 : 0, s.player.vehicle ? s.player.vehicle.angle : null, s.player.vehicle ? s.player.vehicle.kind : 'voet', s.player.vehicle ? s.player.vehicle.health : null]); if (mem.trail.length > 24) mem.trail.shift(); }
  // a new game starts on a random landmark (the menu spot: seeded, but every run draws another), 0.5 to 2.5 km from the start of M01: a commute of 2 to 15
  // minutes that says nothing about act 1 and decided whether the 30 minutes of the test run were enough. Once, at the start of M01 and before the mission
  // runs, the bot is taken to the goal (logged as setup); the goal is where M01 starts, whatever the start spot was. The condition is no longer the
  // distance alone nor a game-time window: a slow opening (M00) used to push the step past it, and then the commute was played after all (#387).
  if (!mem.startTp && s.story.id === 'M01' && !s.mission.active && s.target && !CFG.zonderStartplek && !s.blocking.cinematic && !s.blocking.banner && !s.blocking.talk) {
    const van = [Math.round(s.player.x), Math.round(s.player.y)], afstand = Math.round(s.target.distance);
    if (afstand > 60) {
      mem.startTries = (mem.startTries || 0) + 1;
      const okTp = mem.startTries <= 3 && B.cheat.teleport();
      B.log('setup', { what: 'startplek', van, afstand, doel: { x: Math.round(s.target.x), y: Math.round(s.target.y) }, poging: mem.startTries, ok: !!okTp });
      if (okTp || mem.startTries > 3) mem.startTp = true;
      follower = null;
      await sleep(1500);
      continue;
    }
    mem.startTp = true;
    B.log('setup', { what: 'startplek', van, afstand, dichtbij: true });
  }
  track(s);
  const stepKey = (s.story.id || '?') + (s.mission.active ? ':' + (s.mission.stage || 'm') : '');
  // each stage of a mission gets its own few tries at boarding and at a prompt
  if (stepKey !== mem.stageKey) { mem.stageKey = stepKey; mem.pressTries = 0; mem.boardTries = 0; mem.planTries = 0; mem.vehTries = 0; mem.nearMiss = 0; mem.board = null; mem.pickLog = null; mem.exitLog = null; mem.holdAt = null; pigeonWatch.reset(); pigeonTargetWatch.reset(); heliWatch.reset(); sailWatch.reset(); mem.zeil = null; mem.rowT = null; mem.stunt = null; mem.driftLog = null; }
  // #312: after a board stage the drive has a budget of its own: seven minutes without getting closer to this
  // stage's goal is a finding, even when the car keeps crawling along (the same per stage, so a chase does not
  // inherit the clock of the stage before it)
  if (mem.drive) {
    if (!s.player.vehicle || !Bd || mem.drive.id !== s.story.id) mem.drive = null;
    else if (mem.drive.key !== stepKey) { mem.drive.key = stepKey; mem.drive.drove = s.t; mem.drive.best = null; mem.drive.bestAt = s.t; }
    else if (!s.blocking.cinematic && !s.blocking.loading) {
      const ds = Bd.driveStep({ player: { x: s.player.x, y: s.player.y }, target: s.target }, mem.drive, s.t);
      if (ds.type === 'giveup') {
        B.log('timeout', { step: stepKey, what: 'board: ' + ds.why, forS: Math.round(ds.forS || 0), x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, doel: s.target && { x: Math.round(s.target.x), y: Math.round(s.target.y) }, voertuig: s.player.vehicle ? { kind: s.player.vehicle.kind, v: Math.round((s.player.vehicle.speed || 0) * 10) / 10 } : null });
        mem.drive = null;
        await rescue(s, stepKey, { idleFor: ds.forS || 30, quiet: true });
        continue;
      }
    }
  }
  if (ticks++ % 100 === 0) B.log('status', { x: s.player.x, y: s.player.y, step: stepKey, dist: s.target ? s.target.distance : null, veh: s.player.vehicle ? s.player.vehicle.kind : 'te voet', wanted: s.wanted, money: s.player.money, msgs: s.hud.messages.slice(0, 2), sub: s.hud.subtitle && s.hud.subtitle.text, stunt: s.mission.stunt || undefined });
  // a mission that asks for it ('Uitstappen, jong. Fatbikes ontwijk je te voet.'): out of the vehicle
  if (s.hud.messages.some((m) => /uitstappen|te voet/i.test(m))) mem.onFootUntil = s.t + 60;
  s.mission.onFoot = s.t < (mem.onFootUntil || 0);
  // the baking stage (M25, M26): the bot knows Oma's order and presses the ingredients, as a player who learnt the recipe would
  if (s.mission.active && s.mission.stage === 'bake' && document.getElementById('bakeround') && !s.blocking.cinematic && !s.blocking.dialog) {
    const bst = MS.activeStage();
    if (bst && bst.kind === 'bake') {
      const order = bst.recipe === 'practice' ? BK.RECIPE_PRACTICE : BK.RECIPE_CONTEST;
      B.stick(0, 0);
      await sleep(900);
      B.log('bak', { recipe: bst.recipe, rounds: bst.rounds || 1 });
      for (let r = 0; r < (bst.rounds || 1); r++) for (const id of order) { await B.press(BAKE_KEYS[id], 110); await sleep(350); }
      await sleep(1200);
      detector.hold(s.t); heldSince = null;
      continue;
    }
  }
  // the heist panels (M06): the needle of the fuse box, the pins of the back door and the dial of the case, read from the panel like a player's eyes
  const hx = s.mission.active && !s.blocking.cinematic && document.querySelector('.hx-panel.on');
  if (hx) {
    B.stick(0, 0);
    const pct = (el, k) => parseFloat(el && el.style[k]) || 0;
    const z = hx.querySelector('[data-z]'), nd = hx.querySelector('[data-n]');
    let hit = false;
    if (z && nd) {
      const zl = pct(z, 'left'), zw = pct(z, 'width'), at = pct(nd, 'left');
      hit = Math.abs(at - (zl + zw / 2)) <= Math.max(1.5, zw / 2 - 4);
      if (hit) B.log('zekering', { at: Math.round(at), zone: [Math.round(zl), Math.round(zl + zw)] });
    } else if (hx.querySelector('.hx-chamber')) {
      const ch = hx.querySelector('.hx-chamber.cur'), pin = ch && ch.querySelector('.hx-pin');
      const zone = parseFloat(ch && ch.style.getPropertyValue('--zone')) / 100 || 0.18;
      hit = !!pin && (parseFloat(pin.style.top) - 2) / 44 <= Math.max(0.02, zone - 0.05);
      if (hit) B.log('slotje', { zone });
    } else if (hx.querySelector('.hx-dial')) {
      const dial = hx.querySelector('.hx-dial');
      const m = /rotate\((-?[\d.]+)/.exec((hx.querySelector('[data-rot]').getAttribute('transform')) || '');
      const v = m ? ((-parseFloat(m[1]) / 9) % 40 + 40) % 40 : 0;
      const cur = [...hx.querySelectorAll('.hx-digit')].findIndex((d) => d.classList.contains('cur'));
      const want = [19, 5, 3][Math.max(0, cur)] ?? 0;
      if (dial.classList.contains('hot')) hit = true;
      else {
        const diff = ((want - Math.round(v)) % 40 + 40) % 40;
        await B.press(diff <= 20 ? 'd' : 'a', 70);
        await sleep(120);
      }
    }
    if (hit) { await keyTap(' ', 90); await sleep(450); }
    else await sleep(25);
    detector.hold(s.t); heldSince = null;
    continue;
  }
  // a timing stage (M18, M20, M21, M26)
  if (s.mission.active && s.mission.stage === 'timing' && !s.blocking.cinematic) {
    B.stick(0, 0);
    // like a player: wait until the needle sits in the green zone of the meter (read from the panel), then press
    const pct = (el, k) => parseFloat(el && el.style[k]) || 0;
    let pressed = false;
    for (let i = 0; i < 160 && !pressed; i++) {
      await sleep(30);
      const m = document.querySelector('.cw-panel .cw-meter:not([hidden])');
      if (!m) continue;
      const left = pct(m.querySelector('b'), 'left'), width = pct(m.querySelector('b'), 'width'), at = pct(m.querySelector('i'), 'left');
      if (width > 0 && at >= left + 3 && at <= left + width - 3) { pressed = true; B.log('timing', { at, zone: [left, left + width] }); }
    }
    await B.press(' ');
    detector.hold(s.t); heldSince = null;
    continue;
  }
  // a requirement the next step asks for (a bike for the KEI race, a gun, black clothes, a boat, the dark of M06): the story guide says where to go
  // ("Eerst: ...") and the bot goes there first, like a player who reads the line
  const guide = world.storyGuide;
  if (mem.guideSeen !== s.story.id + '|' + !!(guide && guide.buy)) { mem.guideSeen = s.story.id + '|' + !!(guide && guide.buy); B.log('gids', { stap: s.story.id, gids: guide && { x: Math.round(guide.x), y: Math.round(guide.y), naam: guide.name, koop: guide.buy, winkel: guide.shopId }, bron: s.target && s.target.source, actief: s.mission.active }); }
  if (!s.mission.active && !s.blocking.shop && guide && (guide.buy || /^Eerst/i.test(guide.name || '')) && Number.isFinite(guide.x) && s.target) {
    const gk = (guide.step || '') + ':' + Math.round(guide.x) + ',' + Math.round(guide.y);
    if (mem.gateKey !== gk) { mem.gateKey = gk; mem.pressTries = 0; mem.boardTries = 0; B.log('eis', { stap: guide.step, winkel: guide.name || '', x: Math.round(guide.x), y: Math.round(guide.y) }); }
    s.target = { x: guide.x, y: guide.y, z: null, name: guide.name || '', source: 'winkel', distance: Math.round(Math.hypot(guide.x - s.player.x, guide.y - s.player.y) * 10) / 10 };
  }
  // three failed tries at the same mission: the bot cannot do this one (the eggs, a chase): a cheat to move on, logged as such, instead of hours of retries
  // M01: the evening's props are not placed on the square (a game bug, #312): the points come from drifting and the three attempts of 240 s took a quarter of
  // the hour the test run has for the whole of act 1; after one failed attempt it is a cheat, logged as such
  const failsMax = { M01: 1 }[s.story.id] || 3;
  if (s.mission.active && (fails[s.story.id] || 0) >= failsMax && !(mem.failCheat || (mem.failCheat = {}))[s.story.id]) {
    mem.failCheat[s.story.id] = true;
    const okw = B.cheat.win();
    B.log('cheat', { rung: 'win', ok: !!okw, step: stepKey, why: failsMax === 3 ? 'driemaal mislukt' : `${failsMax}x mislukt (bekende beperking van de bot of het spel)`, mission: { phase: s.mission.phase }, blocking: [] });
    detector.acknowledge(s.t);
    continue;
  }
  // #312: a board stage with a vehicle on foot (or in a bike: out first) is the bot's own little task
  // (scripts/bot/board.mjs): choose the vehicle, walk to the door, press E, time out per attempt. Only when
  // nothing else owns the screen.
  if (Bd && s.mission.active && s.mission.stage === 'board' && !s.blocking.cinematic && !s.blocking.banner && !s.blocking.talk && !s.blocking.pauseMenu && !s.blocking.paused && !s.blocking.respawn && !s.blocking.loading && !s.blocking.shop && !s.blocking.ride && !(s.blocking.dialog && s.blocking.dialog.options && s.blocking.dialog.options.length)) {
    if (await boardStage(s, stepKey)) continue;
  }
  const act = L.decide(s, mem);
  if (s.mission.active && s.mission.stage === 'choice' && act.type !== 'choose' && s.t - (mem.choiceDbgT || -99) > 10) {
    mem.choiceDbgT = s.t;
    const pn = document.querySelector('.cw-panel');
    B.log('keuze-onzichtbaar', { act: act.type, dialog: !!s.blocking.dialog, paneel: !!pn, verborgen: pn && pn.hidden, ouder: pn && pn.parentElement && (pn.parentElement.id || pn.parentElement.tagName), opties: document.querySelectorAll('.cw-opt').length });
  }
  if (act.type !== 'wait' && act.type !== 'skip' && act.type !== 'choose' && act.type !== 'closemenu') heldSince = null;   // playing is not waiting: the wait clock starts over
  if (act.type === 'shop') {
    // the first two goes: Enter selects the highlighted (story) item, Enter buys; then Escape
    detector.hold(s.t);
    B.stick(0, 0);
    const m0 = player.money ?? world.money;
    if (act.n <= 2) { await B.press('enter', 150); await sleep(600); if (act.n === 2) B.log('winkel', { gekocht: m0 - world.money, geld: Math.round(world.money) }); }
    else await B.press('escape', 150);
    await sleep(300);
    continue;
  }
  if (act.type === 'pigeon') {
    // a pigeon: fly to the next target of the stage; releaseFly is shared (A, D, Space, Shift)
    detector.hold(s.t);
    const f = Pg.getPigeonFlight();
    // the pigeon holds the clock (detector.hold), so the wait budget never runs: a bird that cannot reach a photo target used to fly on until
    // the run's end without a word in the report (#387, M04). The stage and each target get a budget; a target that changes (another photo)
    // starts over. What it did is logged as a 'timeout' with the spot, then the usual rescue ladder takes over.
    const tk = s.target ? Math.round(s.target.x / 8) + ',' + Math.round(s.target.y / 8) : '-';
    const wStage = pigeonWatch.update(s.story.id || '?', s.mission.stage || 'duif', s.t);
    const wTgt = pigeonTargetWatch.update(s.story.id || '?', tk, s.t);
    if (wStage.tooLong || wTgt.tooLong) {
      const what = wStage.tooLong ? `duif: ${s.mission.label || 'het doel'} niet gehaald` : 'duif: hetzelfde fotodoel niet gehaald';
      const forS = Math.round(wStage.tooLong ? wStage.forS : wTgt.forS);
      B.log('timeout', { step: stepKey, what, forS, x: s.player.x, y: s.player.y, goalDist: s.target ? s.target.distance : null, doel: s.target && { x: s.target.x, y: s.target.y }, duif: f ? { x: Math.round(f.x), y: Math.round(f.y), z: Math.round(f.z), mode: f.mode, intro: !!f.intro } : null, foto: s.hud.messages.filter((m) => /op de foto/i.test(m)).slice(-1)[0] || null });
      pigeonWatch.reset(); pigeonTargetWatch.reset();
      releaseFly();
      await rescue(s, stepKey, { idleFor: forS, quiet: true });
      continue;
    }
    if (!f || f.intro) { releaseFly(); await sleep(200); continue; }
    if (f.mode !== 'fly') { releaseFly(); await B.press(' ', 120); await sleep(500); continue; }   // on the ground: take off
    const want = L.pigeonKeys(f, s.target);
    applyFlyKeys(want);
    if (ticks % 20 === 0) B.log('duif', { x: Math.round(f.x), y: Math.round(f.y), z: Math.round(f.z), doel: [s.target.x, s.target.y], keys: [...want].join('') });
    continue;
  }
  if (act.type === 'fly') { detector.hold(s.t); await flyStep(s); continue; }
  if (act.type === 'wait' || act.type === 'skip' || act.type === 'choose' || act.type === 'closemenu') {
    detector.hold(s.t);
    // waiting is only free for a while: something that never lets go (a stuck talk, banner or loading flag) is a finding and gets the ladder
    if (heldSince == null) heldSince = s.t;
    if (s.t - heldSince > (CFG.waitS || 45)) {
      heldSince = s.t;
      const flags = Object.keys(s.blocking).filter((k) => s.blocking[k] && k !== 'dialog');
      B.log('wacht-te-lang', { step: stepKey, act: act.type, why: act.why || '', blocking: flags });
      await rescue(s, stepKey, { idleFor: CFG.waitS || 45 });
      continue;
    }
  } else heldSince = null;
  if (act.type === 'closemenu') { await B.press('escape'); continue; }
  if (act.type === 'choose') { B.log('keuze', { dialog: s.blocking.dialog.text, key: act.key }); shot(`${stepKey}-keuze`); await B.choose(act.key); continue; }
  if (act.type === 'skip') {
    // --watch=<s>: a cutscene is watched instead of skipped, with a beam every 2.5 s (at most 16 per scene), to look at staging in the real game (#352)
    if (CFG.watch && s.blocking.cinematic && !s.blocking.banner) {
      if (mem.watchT0 == null) { mem.watchT0 = performance.now(); mem.watchLast = -1e9; mem.watchN = 0; mem.sceneNo = (mem.sceneNo || 0) + 1; }
      if (performance.now() - mem.watchT0 < CFG.watch * 1000) {
        if (performance.now() - mem.watchLast > 2500 && mem.watchN < 16) { mem.watchLast = performance.now(); mem.watchN++; shot(`${(s.story.id || 'x')}-szene${mem.sceneNo}-${String(mem.watchN).padStart(2, '0')}`); }
        await sleep(300);
        continue;
      }
    } else mem.watchT0 = null;
    await holdSkip();
    continue;
  }
  if (act.type === 'wait') { B.stick(0, 0); continue; }
  const gd = s.target ? s.target.distance : null;
  // a stunt (M01) comes no closer to the square while it scores: the score counts as progress, or the ladder lifts the bot out mid-stunt
  const st = detector.update(s.t, { x: s.player.x, y: s.player.y, goalDist: gd, key: stepKey, score: s.mission.stunt ? s.mission.stunt.score : null });
  if (st.stuck) { await rescue(s, stepKey, st); continue; }
  if (act.type === 'press') { B.stick(0, 0); if (act.interact) { mem.pressTries++; B.log('handeling', { key: act.key, prompt: s.hud.prompt }); } await keyTap(act.key); await sleep(act.interact ? 900 : 0); continue; }
  if (act.type === 'enter') {
    const v = act.vehicle;
    // the game lets you in when the body outline is within ENTER_REACH: a plane (5 m wide) is far from its centre by then
    const vObj = world.vehicles.find((q) => Math.hypot(q.x - v.x, q.y - v.y) < 0.6);
    const big = vObj && Math.max(vObj.halfLen || 0, vObj.halfWid || 0) > 3;
    // when the game keeps picking another vehicle (two cars side by side) walk right up to this one: its outline is then the nearest
    // walking to a vehicle that stands among others (M14: the tractor limo between cars and a bus): the same sidesteps as on any walk
    if (!s.player.vehicle && !s.blocking.cinematic && Math.hypot(v.x - s.player.x, v.y - s.player.y) > 3.5) {
      if (await footUnstick(s, v)) continue;
      if (mem.detour && s.t < mem.detour.until && Math.hypot(mem.detour.x - s.player.x, mem.detour.y - s.player.y) > 3) { steerTowards(s, 'walk', mem.detour, false, 24, 2.5); continue; }
    }
    const d = steerTowards(s, 'walk', v, false, 24, big || (mem.nearMiss || 0) >= 2 ? 0.4 : 2.2);
    // the game's own test: this is what lights the prompt and lets E in
    const near = vObj ? V.findEnterableVehicle(player.x, player.y, world.vehicles) === vObj : d < 3.5;
    // only the game's own test lets E in: from further off keep walking (stopping to press E there was a deadlock)
    if (near || (!vObj && d < 3.5)) { B.stick(0, 0); mem.boardTries++; await keyTap('e', 240); await sleep(700); const fe = V.findEnterableVehicle(player.x, player.y, world.vehicles); B.log('instappen', { kind: v.kind, toegestaan: near, binnen: !!player.inVehicle, doel: vObj && { x: Math.round(vObj.x * 10) / 10, y: Math.round(vObj.y * 10) / 10, hl: vObj.halfLen, hw: vObj.halfWid, naam: vObj.name || vObj.label || '', hero: !!vObj.isHeroCar, wrak: !!vObj.wrecked, slot: !!(vObj.locked || vObj.disabled) }, kan: fe && { x: Math.round(fe.x * 10) / 10, y: Math.round(fe.y * 10) / 10, naam: fe.name || fe.label || '' }, ik: [Math.round(player.x * 10) / 10, Math.round(player.y * 10) / 10] }); follower = null; }
    else if (d < 3.5) mem.nearMiss = (mem.nearMiss || 0) + 1;
    continue;
  }
  if (act.type === 'goto') {
    if (!s.target) continue;
    // the stunt evening (M01): knock the props over, the nearest one that is still standing; people are left alone by the circle of the square
    let aim = s.target, top = act.top || 24;
    // eggs break on a rough road above 8.5 m/s (M09) and a convoy falls apart when the lead car runs away (M23)
    const mdef = (M.getMissionDefs() || [])[s.mission.index];
    if (mdef && mdef.eggs) top = Math.min(top, 7);
    if (s.mission.stage === 'convoy') {
      // the leader waits for the slowest friend (the tractor, the scooter): beyond 170 m for 12 s the column falls apart
      const members = (world.vehicles || []).filter((v) => v.convoyMember && !v.wrecked);
      const gaps = members.map((v) => Math.hypot(v.x - s.player.x, v.y - s.player.y));
      // the friends cruise at 10 m/s (convoy.js) and the tractor tops out at 11: the leader keeps to 8 m/s, or the line stretches by 2 m/s
      const pace = L.convoyPace(gaps, 8);
      top = Math.min(top, pace);
      if (pace < 3) detector.hold(s.t);   // waiting for them is no standing still
      // a friend that does not come (stuck at a junction): after 20 s of waiting the leader drives back to the furthest one, like a player, until they are within 90 m
      const worstI = gaps.indexOf(Math.max(...gaps, 0));
      if (pace < 3 && mem.cvBack == null) { if (mem.cvWait == null) mem.cvWait = s.t; else if (s.t - mem.cvWait > 20) { mem.cvBack = s.t; B.log('colonne-terug', { gap: Math.round(gaps[worstI]), naam: members[worstI] && members[worstI].label }); } }
      if (pace >= 3) mem.cvWait = null;
      if (mem.cvBack != null && worstI >= 0 && (Math.max(...gaps) < 90 || s.t - mem.cvBack > 40)) { mem.cvBack = null; mem.cvWait = null; }
      if (mem.cvBack != null && worstI >= 0) { aim = { x: members[worstI].x, y: members[worstI].y, distance: gaps[worstI] }; top = 8; }
      if (ticks % 20 === 0) B.log('colonne', { gaps: gaps.map(Math.round), top: Math.round(top * 10) / 10 });
    }
    // a chase: the fleeing car cruises at 14 and runs at 28, the Fjord Frituur can do 50 (#354)
    // (far behind it, on a long run through a village like M14's 8 km, 36 m/s ended in a crash and a burning car: 26 until it is within 150 m)
    if (s.mission.stage === 'chase' && s.player.vehicle && !s.player.vehicle.boat) top = Math.max(top, s.target.distance < 150 ? 36 : 26);
    if (act.stunt && s.player.vehicle) {
      let best = null, bd = Infinity;
      mem.stuntSkip = mem.stuntSkip || {};
      for (const q of Br.propsInRadius(s.player.x, s.player.y, 90)) {
        if (!String(q.key).startsWith('stunt') || (mem.stuntSkip[q.key] || 0) > s.t) continue;
        const d = Math.hypot(q.x - s.player.x, q.y - s.player.y);
        // only a prop the car can reach in a straight line over dry land
        if (d < bd && L.segmentFree({ x: s.player.x, y: s.player.y }, q, carFree, 1.5)) { bd = d; best = q; }
      }
      mem.stuntHasProp = !!best;
      // no props: the drift spot on the open south side of the square (see below)
      if (!best && s.target.distance < 80) { aim = { x: 170, y: 78, distance: L.distance({ x: s.player.x, y: s.player.y }, { x: 185, y: 92 }) }; top = 13; }
      if (best) {
        // circling a prop that does not fall (the car orbits it, or a bollard stands in the way): after 6 s within 10 m it is left alone for 90 s and the next one is tried (M01, #312)
        if (bd < 10) {
          if (!mem.stuntNear || mem.stuntNear.key !== best.key) mem.stuntNear = { key: best.key, since: s.t };
          else if (s.t - mem.stuntNear.since > 6) { mem.stuntSkip[best.key] = s.t + 90; B.log('stunt-omweg', { key: best.key, x: Math.round(best.x), y: Math.round(best.y) }); mem.stuntNear = null; }
        } else mem.stuntNear = null;
        aim = { x: best.x, y: best.y, distance: bd }; top = 14;
        if (s.t - (mem.stuntLogT || -9) >= 3) { mem.stuntLogT = s.t; B.log('stunt-rekwisiet', { soort: best.kind, x: Math.round(best.x), y: Math.round(best.y), d: Math.round(bd), hoek: Math.round(Math.abs(L.normAngle(L.headingTo({ x: s.player.x, y: s.player.y }, best) - s.player.vehicle.angle)) * 100) / 100, v: Math.round((s.player.vehicle.speed || 0) * 10) / 10, score: s.mission.stunt ? s.mission.stunt.score : null }); }
        // a prop close by but behind or beside the car (the turning circle is wider than the distance): the car circles it for ever. A stretch straight on
        // gives a run-up from further away (2.5 s)
        const err0 = Math.abs(L.normAngle(L.headingTo({ x: s.player.x, y: s.player.y }, best) - s.player.vehicle.angle));
        if (bd < 14 && err0 > 1.2 && !mem.runUpUntil) mem.runUpUntil = s.t + 2.5;
        if (mem.runUpUntil && s.t < mem.runUpUntil) {
          const ah = s.player.vehicle.angle, ru = { x: s.player.x + Math.cos(ah) * 30, y: s.player.y + Math.sin(ah) * 30 };
          if (L.segmentFree({ x: s.player.x, y: s.player.y }, ru, carFree, 1.5)) { aim = { ...ru, distance: 30 }; top = 10; }
        } else if (mem.runUpUntil && s.t > mem.runUpUntil + 4) mem.runUpUntil = null;
      }
    }
    // the straight line to a prop or the square runs through water (the pond north of the Grote Markt lies right on the line from the start): a way round
    // it over dry land (A* on a grid of 1.6 m, pulled tight), followed point by point; without one the road plan takes over
    if (act.stunt && s.player.vehicle && s.target.distance < 250) {
      const me0 = { x: s.player.x, y: s.player.y };
      if (!L.segmentFree(me0, aim, carFree, 1.5)) {
        const dk = Math.round(aim.x / 8) + ',' + Math.round(aim.y / 8);
        if (!mem.stuntDetour || mem.stuntDetour.key !== dk || s.t - mem.stuntDetour.t > 4) {
          const d = L.detourAround(me0, aim, carFree, { cell: 1.6, margin: 14, maxCells: 120 });
          mem.stuntDetour = { key: dk, t: s.t, f: d && d.length > 1 ? new L.PathFollower(d, { reach: 5 }) : null };
          B.log('stunt-detour', { punten: d ? d.length : 0, van: [Math.round(me0.x), Math.round(me0.y)], naar: [Math.round(aim.x), Math.round(aim.y)] });
        }
        const nx = mem.stuntDetour.f && mem.stuntDetour.f.next(me0);
        if (nx) aim = { x: nx.x, y: nx.y, distance: L.distance(me0, nx) };
      }
    }
    // on foot, wedged against a stall pole or a prop: sidestep (alternating sides, longer each time), then plan again
    if (act.mode !== 'drive' && !s.player.vehicle && !s.blocking.cinematic && s.target.distance > 5 && s.mission.stage !== 'hold' && await footUnstick(s, s.target)) continue;
    if (act.mode !== 'drive' && !s.player.vehicle && mem.detour && s.t < mem.detour.until && Math.hypot(mem.detour.x - s.player.x, mem.detour.y - s.player.y) > 3) { steerTowards(s, 'walk', mem.detour, false, 24, 2.5); continue; }
    // The evening's props are not on the square (startStunt places them only on spots without a building cell in buildingsNear, which says yes nearly
    // everywhere: measured 0 of ~30, #312), so the points come from drifting: Space with a full lock above 9 m/s gives slip, +30 per half second times the
    // combo (x5 after five in a row within 4 s: about 150 per half second). A run-up to 11.5 m/s, then a slide of at most 5 s, the other way each time, on the
    // open south side of the square, away from the pond.
    if (act.stunt && s.player.vehicle && s.target.distance < 80 && !mem.stuntHasProp) {
      const veh = s.player.vehicle, sp = Math.abs(veh.speed || 0), anchor = { x: 185, y: 92 }, me1 = { x: s.player.x, y: s.player.y };
      // walkers on the square: hitting one costs 250 points and the combo; no slide with one within 9 m, and a slide stops at 4 m
      const walkers = (world.pedestrians || []).filter((p) => p.state !== 'dead' && Math.hypot(p.x - me1.x, p.y - me1.y) < 30).map((p) => ({ x: p.x, y: p.y, r: 0.45 }));
      const nearest = walkers.reduce((m, p) => Math.min(m, Math.hypot(p.x - me1.x, p.y - me1.y)), Infinity);
      // the rules are pure (scripts/bot/stunt.mjs): the run-up, the drift, the walkers and the time-out
      const score = s.mission.stunt ? s.mission.stunt.score : null;
      const targetScore = s.mission.stunt ? s.mission.stunt.target : null;
      const driftAt = { x: aim.x, y: aim.y };
      const D = St
        ? St.stuntStep({ x: me1.x, y: me1.y, angle: veh.angle, speed: sp, score, target: targetScore, anchor: driftAt, walker: nearest }, mem.stunt || (mem.stunt = {}), s.t)
        : null;
      if (D && D.phase === 'timeout') {
        B.log('timeout', { step: stepKey, what: 'stunt: ' + D.why, forS: Math.round(D.forS || 0), x: s.player.x, y: s.player.y, goalDist: s.target.distance, score: D.score, target: D.target });
        mem.stunt = null;
        if (B.input.isDown(' ')) B.up(' ');
        await rescue(s, stepKey, { idleFor: Math.round(D.forS || 0), quiet: true });
        continue;
      }
      if (D && D.phase === 'klaar') { mem.stunt = null; if (B.input.isDown(' ')) B.up(' '); B.stick(0, 0); await sleep(200); continue; }
      if (D && D.phase === 'klem') {
        B.log('drift-klem', { x: Math.round(me1.x), y: Math.round(me1.y) });
        await vdetour(s, 1 + ((mem.stunt.slides || 0) + (mem.driftDetours = (mem.driftDetours || 0) + 1)) % 4);
        continue;
      }
      if (!D) {
        // zonder stuntregels: de oude aanloop, zodat een losse pagina niet stilvalt
        const stray = Math.atan2(driftAt.y - me1.y, driftAt.x - me1.x) - veh.angle;
        B.stick(Math.max(-1, Math.min(1, stray * 2)), -1);
        continue;
      }
      if (D.phase === 'glij') {
        B.down(' ');
        B.stick(D.steer, -1);
        mem.drifting = true;
        if (!mem.driftLog || s.t - mem.driftLog > 3) { mem.driftLog = s.t; B.log('stunt', { fase: 'drift', n: D.slides, x: Math.round(me1.x), y: Math.round(me1.y), v: Math.round(sp * 10) / 10, score, target: targetScore }); }
      } else {
        if (B.input.isDown(' ')) B.up(' ');
        // the run-up: full throttle, a full lock towards the spot (carControls slows to a crawl on a large heading error, and then circles for ever)
        const av = walkers.length ? L.avoidance({ x: me1.x, y: me1.y, angle: veh.angle, speed: veh.speed }, walkers, { look: 20, margin: 1.2 }) : null;
        const err = L.normAngle(L.headingTo(me1, driftAt) - veh.angle + (av ? av.bias : 0));
        B.stick(Math.max(-1, Math.min(1, err * 2)), av && av.cap < 6 ? 0.4 : -1);
        if (!mem.driftLog || s.t - mem.driftLog > 5) { mem.driftLog = s.t; B.log('stunt', { fase: 'aanloop', x: Math.round(me1.x), y: Math.round(me1.y), v: Math.round(sp * 10) / 10, score, target: targetScore }); }
      }
      continue;
    }
    if (mem.drifting) { mem.drifting = false; if (B.input.isDown(' ')) B.up(' '); mem.drift = null; mem.stunt = null; }
    // inside the arena the road plan leads out of the square (and into the pond): only props, the middle and the way round the water; nothing free: stand still
    const arena = !!(act.stunt && s.player.vehicle && s.target.distance < 80);
    if (arena && !L.segmentFree({ x: s.player.x, y: s.player.y }, aim, carFree, 1.5)) {
      B.stick(0, 0);
      if (s.t - (mem.stuntWaitLog || -99) > 5) { mem.stuntWaitLog = s.t; B.log('stunt-geen-weg', { x: Math.round(s.player.x), y: Math.round(s.player.y), naar: [Math.round(aim.x), Math.round(aim.y)] }); }
      if (mem.stuntBlockedFor == null) mem.stuntBlockedFor = s.t; else if (s.t - mem.stuntBlockedFor > 3) { mem.stuntSkip = mem.stuntSkip || {}; await vdetour(s, 1 + (mem.stuntDetours = (mem.stuntDetours || 0) + 1) % 4); mem.stuntBlockedFor = null; }
      continue;
    }
    mem.stuntBlockedFor = null;
    // #312: the heli flies on its own keys (W/S, A/D, Space/Ctrl), not on the car layer; the keys of
    // the previous branch are released as soon as it no longer flies
    if (act.mode === 'fly' && s.player.vehicle && s.player.vehicle.heli && Nav) { mem.wasHeli = true; await heliStep(s, aim); continue; }
    if (mem.wasHeli) { mem.wasHeli = false; releaseHeli(); }
    steerTowards(s, act.mode, aim, !act.stunt && s.mission.phase !== 'active' && (s.target.source === 'missiestart' || s.target.source === 'winkel'), top, s.mission.stage === 'lock' || s.mission.stage === 'crack' ? 1 : null, !!(act.stunt && s.player.vehicle && (arena || s.target.distance < 250) && L.segmentFree({ x: s.player.x, y: s.player.y }, aim, carFree, 1.5)));
    if (wedgeOut) {
      wedgeOut = false;
      B.log('klem', { x: s.player.x, y: s.player.y });
      wedgeDir = -wedgeDir;
      // a car nose-first against a wall or kerb (M26: the Fjord Frituur on the pavement): back out longer and steer harder each time, then a forward arc the other way
      mem.wedges = (s.t - (mem.wedgeAt || -99) < 25 ? (mem.wedges || 0) : 0) + 1; mem.wedgeAt = s.t;
      B.stick(0.9 * wedgeDir, 1);
      await sleep(1300 + 600 * Math.min(5, mem.wedges));
      if (mem.wedges >= 2) { B.stick(-0.9 * wedgeDir, -1); await sleep(900); }
      B.stick(0, 0);
      follower = null;
    }
  }
}

}

// --mode=missions --only=M03,M04: each step on its own, started the way the story dev panel does (a jump), so one
// stuck mission does not hide the next ones
if (CFG.sweep && CFG.sweep.length) {
  for (const id of CFG.sweep) {
    if (performance.now() - wall0 > MAX_WALL) break;
    const ok = window.__story.jump(id);
    B.log('setup', { what: 'jump', id, ok: !!ok });
    if (!ok) continue;
    follower = null; detector.reset(B.time()); mem.boardTries = 0; mem.pressTries = 0; mem.planTries = 0; lastStep = null; lastPhase = '';
    const t0 = B.time();
    await sleep(1500);
    mem.skipLeft = typeof CFG.skipStages === 'object' ? CFG.skipStages[id] || 0 : CFG.skipStages || 0;   // see loop1
    await loop((s) => s.story.id !== id || B.time() - t0 > (CFG.perStepS || 600));
    const se2 = B.status();
    if (se2.story.id === id) B.log('timeout', { step: id, what: `stap ${id} niet uitgespeeld binnen ${CFG.perStepS || 600} s`, forS: Math.round(B.time() - t0), x: se2.player.x, y: se2.player.y, goalDist: se2.target ? se2.target.distance : null });
    meterEnd(se2, id, se2.story.id === id ? 'tijd op' : 'klaar');
    result = 'TIMEOUT';
  }
  result = 'KLAAR'; reason = CFG.sweep.length + ' stappen';
} else await loop(null);

B.releaseAll();
if (meter && lastStep) meterEnd(B.status(), lastStep, 'laatste');   // the step the run ends in (the part is over, or time ran out)
shot(`einde-${result.toLowerCase()}`);
// where the run stopped, in the last line of the log: the report says it at the top of a run that did not finish (#387)
let at = null;
try { at = B.status(); } catch (e) { /* wereld al weg */ }
B.log('einde', {
  result, reason, step: lastStep,
  x: at ? at.player.x : null, y: at ? at.player.y : null, goalDist: at && at.target ? at.target.distance : null,
  label: at && at.story ? at.story.title || '' : '', gameS: at ? at.t : B.time(),
  inStepS: at && mem.stepSince != null ? Math.round((at.t - mem.stepSince) * 10) / 10 : null,
});
return JSON.stringify({ result, reason, step: lastStep, gameSeconds: B.time(), wallSeconds: Math.round((performance.now() - wall0) / 1000) });
