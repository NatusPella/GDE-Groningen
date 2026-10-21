// Page half of scripts/bot/run.mjs (desktop --perf-script body; the Spelbot, #186).
// window.__botCfg = { part, maxGameS, maxWallS, stuckS, shots } is put in front by
// the driver. Plays the story by itself the way a player would: follows the
// goal over the route planner, boards a vehicle for long distances, skips cutscenes
// (hold Space), presses dialog keys; when it makes no progress for stuckS seconds it
// nudges, and after that uses the cheats of the story dev API, which is logged as a
// 'cheat' event ("had een cheat nodig"). Everything it does goes through window.__bot
// (playerapi.js), whose [bot-log] lines the desktop app writes to the events file.
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
const Co = await imp('collision');
const BAKE_KEYS = { ei: '1', zout: '2', meel: '3', vet: '4', mosterd: '5' };
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt (?autoplay niet aan?)' });
const world = B.world, player = B.player;
const PART = CFG.sweep && CFG.sweep.length ? 'all' : CFG.part || 'kop';
const MAX_GAME = CFG.maxGameS || 3600;
const MAX_WALL = (CFG.maxWallS || 1800) * 1000;
const wall0 = performance.now();
const detector = new L.StuckDetector({ windowS: CFG.stuckS || 30 });
const wedge = new L.WedgeDetector();
const mem = { boardTries: 0, pressTries: 0 };
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

function plan(s, mode, tgt) {
  const kind = mode === 'drive' ? 'drive' : 'walk';
  const me = { x: s.player.x, y: s.player.y };
  let pts = null;
  try {
    // a boat sails the waterway net (planBoatTrip), the land graph knows nothing of water
    const r = mode === 'boat' ? R.planBoatTrip(world.map, [me.x, me.y], [tgt.x, tgt.y], 'sloep') : R.planLandRoute(world.map, kind, [me.x, me.y], [tgt.x, tgt.y]);
    pts = r && r.pts && r.pts.length ? r.pts : null;
  } catch (e) { B.log('routefout', { msg: String(e && e.message || e).slice(0, 200) }); }
  // outside the city graph (the Ommeland) planLandRoute finds nothing, and where the own route ran into a wall (a detour was needed)
  // the line the game itself shows the player is the better one, when it leads to this goal
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

// aim for the target over the planned route; returns the distance left
// stopR: how close on foot (default 0.6 of the marker radius; a vehicle to board needs the bot right next to it, not 5 m away)
function steerTowards(s, mode, tgt, stopAt, top = 24, stopR = null, direct0 = false) {
  const key = mode + ':' + Math.round(tgt.x / 5) + ',' + Math.round(tgt.y / 5);
  if (!follower || key !== followKey || s.t - planAt > 12) { followKey = key; planAt = s.t; plan(s, mode, tgt); }
  const me = { x: s.player.x, y: s.player.y };
  const direct = L.distance(me, tgt);
  const aim = direct0 || direct < (mode === "walk" ? 9 : 25) && (mode !== 'walk' || L.segmentFree(me, tgt, footFree)) ? tgt : follower.next(me) || tgt;   // on foot the planned route goes round poles and walls almost to the end
  if ((mode === 'drive' || mode === 'boat') && s.player.vehicle) {
    // a garage (M02: drive in and stand still 1.2 s) or a stage with `stop`: come to rest right there
    const stg = M.activeStage();
    const rest = stg && (stg.kind === 'garage' ? 3.5 : stg.stop ? Math.max(3, stg.stop + 2) : 0);
    const mdefE = (M.getMissionDefs() || [])[s.mission.index];
    const c = L.carControls({ x: me.x, y: me.y, angle: s.player.vehicle.angle, speed: s.player.vehicle.speed }, aim, { stopAt: stopAt || !!rest, rest, top: mode === 'boat' ? Math.min(top, 9) : top, gentle: !!(s.mission.active && mdefE && mdefE.eggs) });
    B.stick(c.steer, c.throttle ? -c.throttle : 0);
    if (!c.reverse && wedge.update(s.t, s.player.vehicle.speed, c.throttle)) wedge.reset(), wedgeOut = true;
    if (B.input.isDown('shift')) B.up('shift');
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
  if (s.t - mem.flyT > 420) { mem.flyT = s.t; releaseFly(); await rescue(s, fkey, { idleFor: 420 }); return; }
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
  B.log('stuck', { step: stepKey, x: s.player.x, y: s.player.y, idleFor: info.idleFor, goalDist: s.target ? s.target.distance : null, rung, doel: s.target && { x: s.target.x, y: s.target.y, vehicle: !!s.target.vehicle, source: s.target.source }, prompt: s.hud.prompt || undefined, dichtbij: (s.nearby.vehicles || []).slice(0, 3).map((c) => [c.kind, c.distance, c.free]) });
  shot(`${stepKey}-vast`);
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
  if (goal !== m.goal) { if (m.goal) { m.goals++; B.log('doel', { stage: s.mission.stage || '', label: s.mission.label || '', doel: s.target ? s.target.name || '' : '', afstand: s.target ? s.target.distance : null }); } m.goal = goal; m.lastAct = s.t; }
  if (busy || d > 0.05 || (s.player.vehicle && s.player.vehicle.speed > 1)) m.lastAct = s.t;
  m.maxQuiet = Math.max(m.maxQuiet, s.t - m.lastAct);
}
function meterEnd(s, id, outcome) {
  const m = meter;
  if (!m) { B.log('step', { event: 'end', id, outcome }); return; }
  B.log('step', { event: 'end', id, outcome, wall: Math.round((s.wall - m.wall0) / 100) / 10, dist: Math.round(m.dist), cine: Math.round(m.cine * 10) / 10, cineN: m.cineN, talk: Math.round(m.talk * 10) / 10, goals: m.goals, maxQuiet: Math.round(m.maxQuiet * 10) / 10, actief: Math.round(m.active * 10) / 10, limiet: Math.round(m.limit), restMin: m.minLeft == null ? null : Math.round(m.minLeft) });
  meter = null;
}

function track(s) {
  const id = s.story.end ? 'einde' : s.story.id;
  meterTick(s);
  if (id !== lastStep) {
    if (lastStep) meterEnd(s, lastStep, 'klaar');
    meter = newMeter(s);
    B.log('step', { event: 'begin', id, label: s.story.title || '', part: s.story.part });
    lastStep = id; lastPhase = '';
    mem.boardTries = 0; mem.pressTries = 0; mem.planTries = 0;
    shot(`${id}-begin`);
  }
  const ph = s.mission.active ? 'active' : 'idle';
  if (ph !== lastPhase && lastPhase) {
    if (ph === 'active') { B.log('mission', { event: 'start', id, label: s.mission.label, msgs: s.hud.messages.slice(0, 3), phase: s.mission.phase }); shot(`${id}-start`); }
    else { fails[id] = (fails[id] || 0) + 1; B.log('mission', { event: 'fail', id, label: s.mission.label, msgs: s.hud.messages.slice(0, 3), phase: s.mission.phase }); shot(`${id}-fail-${fails[id]}`); }
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
  track(s);
  const stepKey = (s.story.id || '?') + (s.mission.active ? ':' + (s.mission.stage || 'm') : '');
  // each stage of a mission gets its own few tries at boarding and at a prompt
  if (stepKey !== mem.stageKey) { mem.stageKey = stepKey; mem.pressTries = 0; mem.boardTries = 0; mem.planTries = 0; mem.vehTries = 0; mem.nearMiss = 0; }
  if (ticks++ % 100 === 0) B.log('status', { x: s.player.x, y: s.player.y, step: stepKey, dist: s.target ? s.target.distance : null, veh: s.player.vehicle ? s.player.vehicle.kind : 'te voet', wanted: s.wanted, money: s.player.money, msgs: s.hud.messages.slice(0, 2), sub: s.hud.subtitle && s.hud.subtitle.text });
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
  if (s.mission.active && (fails[s.story.id] || 0) >= 3 && !(mem.failCheat || (mem.failCheat = {}))[s.story.id]) {
    mem.failCheat[s.story.id] = true;
    const okw = B.cheat.win();
    B.log('cheat', { rung: 'win', ok: !!okw, step: stepKey, why: 'driemaal mislukt', mission: { phase: s.mission.phase }, blocking: [] });
    detector.acknowledge(s.t);
    continue;
  }
  const act = L.decide(s, mem);
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
  if (act.type === 'skip') { await holdSkip(); continue; }
  if (act.type === 'wait') { B.stick(0, 0); continue; }
  const gd = s.target ? s.target.distance : null;
  const st = detector.update(s.t, { x: s.player.x, y: s.player.y, goalDist: gd, key: stepKey });
  if (st.stuck) { await rescue(s, stepKey, st); continue; }
  if (act.type === 'press') { B.stick(0, 0); if (act.interact) { mem.pressTries++; B.log('handeling', { key: act.key, prompt: s.hud.prompt }); } await keyTap(act.key); await sleep(act.interact ? 900 : 0); continue; }
  if (act.type === 'enter') {
    const v = act.vehicle;
    // the game lets you in when the body outline is within ENTER_REACH: a plane (5 m wide) is far from its centre by then
    const vObj = world.vehicles.find((q) => Math.hypot(q.x - v.x, q.y - v.y) < 0.6);
    const big = vObj && Math.max(vObj.halfLen || 0, vObj.halfWid || 0) > 3;
    // when the game keeps picking another vehicle (two cars side by side) walk right up to this one: its outline is then the nearest
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
    if (s.mission.stage === 'convoy') top = Math.min(top, 11);
    if (act.stunt && s.player.vehicle) {
      let best = null, bd = Infinity;
      for (const q of Br.propsInRadius(s.player.x, s.player.y, 90)) {
        if (!String(q.key).startsWith('stunt')) continue;
        const d = Math.hypot(q.x - s.player.x, q.y - s.player.y);
        if (d < bd) { bd = d; best = q; }
      }
      if (best) { aim = { x: best.x, y: best.y, distance: bd }; top = 14; }
    }
    // on foot, wedged against a stall pole or a prop: sidestep (alternating sides, longer each time), then plan again
    if (act.mode !== 'drive' && !s.player.vehicle && !s.blocking.cinematic && s.target.distance > 5) {
      const fp = mem.footPos;
      if (!fp || Math.hypot(s.player.x - fp.x, s.player.y - fp.y) > 0.5) mem.footPos = { x: s.player.x, y: s.player.y, t: s.t };
      else if (s.t - fp.t > 2) {
        mem.footPos = null;
        mem.sidesteps = (mem.sidesteps || 0) + 1;
        const dir = mem.sidesteps % 2 ? 1 : -1, ms = 700 + 350 * Math.min(8, mem.sidesteps);
        B.log('zijstap', { x: s.player.x, y: s.player.y, n: mem.sidesteps, ms });
        B.stick(dir, -0.3);
        await sleep(ms);
        B.stick(0, 0);
        // then a detour: a point to the side of the line to the goal, walked to first (the plan from there goes round the obstacle, not back into it)
        const hx = s.target.x - s.player.x, hy = s.target.y - s.player.y, hl = Math.hypot(hx, hy) || 1;
        const off = 7 + 3 * Math.min(6, mem.sidesteps);
        mem.detour = { x: s.player.x + (-hy / hl) * off * dir + (hx / hl) * 4, y: s.player.y + (hx / hl) * off * dir + (hy / hl) * 4, until: s.t + 12 };
        follower = null;
        continue;
      }
    }
    if (act.mode !== 'drive' && !s.player.vehicle && mem.detour && s.t < mem.detour.until && Math.hypot(mem.detour.x - s.player.x, mem.detour.y - s.player.y) > 3) { steerTowards(s, 'walk', mem.detour, false, 24, 2.5); continue; }
    steerTowards(s, act.mode, aim, !act.stunt && s.mission.phase !== 'active' && (s.target.source === 'missiestart' || s.target.source === 'winkel'), top, s.mission.stage === 'lock' || s.mission.stage === 'crack' ? 1 : null, !!(act.stunt && s.player.vehicle && s.target.distance < 250));
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
    await loop((s) => s.story.id !== id || B.time() - t0 > (CFG.perStepS || 600));
    meterEnd(B.status(), id, B.status().story.id === id ? 'tijd op' : 'klaar');
    result = 'TIMEOUT';
  }
  result = 'KLAAR'; reason = CFG.sweep.length + ' stappen';
} else await loop(null);

B.releaseAll();
shot(`einde-${result.toLowerCase()}`);
B.log('einde', { result, reason, step: lastStep });
return JSON.stringify({ result, reason, step: lastStep, gameSeconds: B.time(), wallSeconds: Math.round((performance.now() - wall0) / 1000) });
