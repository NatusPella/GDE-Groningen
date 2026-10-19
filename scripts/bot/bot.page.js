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
const MS = await imp('missions');
const BK = await imp('bakeround');
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
const ladder = {}, fails = {}, scenes = {};
let lastCine = false;
let wedgeOut = false, wedgeDir = 1;
let follower = null, followKey = '', planAt = -99, lastStep = null, lastPhase = '', shots = 0;
const MAX_SHOTS = CFG.shots || 80;
const shot = (name) => { if (shots < MAX_SHOTS) { shots++; B.shot(name); } };
world.devInvuln = !!CFG.invulnerable;
// --speed=N: N gameplay steps per frame (playerapi speed); waiting budgets and stuck windows are in game time, so they scale along
if (CFG.speed > 1) B.speed(CFG.speed);

function plan(s, mode, tgt) {
  const kind = mode === 'drive' ? 'drive' : 'walk';
  const me = { x: s.player.x, y: s.player.y };
  let pts = null;
  try {
    const r = R.planLandRoute(world.map, kind, [me.x, me.y], [tgt.x, tgt.y]);
    pts = r && r.pts && r.pts.length ? r.pts : null;
  } catch (e) { B.log('routefout', { msg: String(e && e.message || e).slice(0, 200) }); }
  const line = pts || [[me.x, me.y]];
  line.push([tgt.x, tgt.y]);
  follower = new L.PathFollower(line, { reach: mode === 'drive' ? 7 : 2.5 });
  B.log('route', { mode, planned: !!pts, points: line.length, to: [Math.round(tgt.x), Math.round(tgt.y)] });
}

// aim for the target over the planned route; returns the distance left
function steerTowards(s, mode, tgt, stopAt, top = 24) {
  const key = mode + ':' + Math.round(tgt.x / 5) + ',' + Math.round(tgt.y / 5);
  if (!follower || key !== followKey || s.t - planAt > 12) { followKey = key; planAt = s.t; plan(s, mode, tgt); }
  const me = { x: s.player.x, y: s.player.y };
  const direct = L.distance(me, tgt);
  const aim = direct < 25 ? tgt : follower.next(me) || tgt;
  if (mode === 'drive' && s.player.vehicle) {
    const c = L.carControls({ x: me.x, y: me.y, angle: s.player.vehicle.angle, speed: s.player.vehicle.speed }, aim, { stopAt, top });
    B.stick(c.steer, c.throttle > 0 ? -1 : c.throttle < 0 ? 1 : 0);
    if (!c.reverse && wedge.update(s.t, s.player.vehicle.speed, c.throttle)) wedge.reset(), wedgeOut = true;
    if (B.input.isDown('shift')) B.up('shift');
  } else {
    const radius = (s.mission.triggerRadius || 8) * 0.6;
    if (direct < radius) { B.stick(0, 0); B.up('shift'); return direct; }
    const [x, y] = L.footStick(L.headingTo(me, aim), s.player.camYaw);
    B.stick(x, y);
    if (direct > 40) B.down('shift'); else B.up('shift');
  }
  return direct;
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

async function rescue(s, stepKey, info) {
  // the ladder counts per story step (a failed mission restarts the detector, not the ladder); every fail is a rung higher
  const sid = s.story.id || '?';
  const rung = L.rescueFor((ladder[sid] = (ladder[sid] || 0) + 1) - 1 + (fails[sid] || 0));
  B.log('stuck', { step: stepKey, x: s.player.x, y: s.player.y, idleFor: info.idleFor, goalDist: s.target ? s.target.distance : null, rung });
  shot(`${stepKey}-vast`);
  if (rung === 'nudge') { await nudge(s); detector.acknowledge(s.t); return; }
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

function track(s) {
  const id = s.story.end ? 'einde' : s.story.id;
  if (id !== lastStep) {
    if (lastStep) B.log('step', { event: 'end', id: lastStep, outcome: 'klaar' });
    B.log('step', { event: 'begin', id, label: s.story.title || '', part: s.story.part });
    lastStep = id; lastPhase = '';
    mem.boardTries = 0; mem.pressTries = 0;
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

async function loop(stopFn) {
while (true) {
  await sleep(100);
  const s = B.status();
  if (performance.now() - wall0 > MAX_WALL || s.t > MAX_GAME) break;
  if (s.story.end || (PART !== 'all' && s.story.part && s.story.part !== PART)) { result = 'KLAAR'; reason = s.story.end ? `einde van ${s.story.part}` : `stap ${s.story.id} hoort bij ${s.story.part}`; break; }
  if (stopFn && stopFn(s)) { result = 'KLAAR'; reason = 'stap uitgespeeld'; break; }
  track(s);
  const stepKey = (s.story.id || '?') + (s.mission.active ? ':' + (s.mission.stage || 'm') : '');
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
      detector.hold(s.t);
      continue;
    }
  }
  // a timing stage (M18, M20, M21, M26): press about once per round, a player who just times it by feel; a miss only costs the story's bonus
  if (s.mission.active && s.mission.stage === 'timing' && !s.blocking.cinematic) {
    B.stick(0, 0);
    await sleep(900 + Math.floor(Math.random() * 600));
    await B.press(' ');
    detector.hold(s.t);
    continue;
  }
  const act = L.decide(s, mem);
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
  if (act.type === 'press') { B.stick(0, 0); if (act.interact) { mem.pressTries++; B.log('handeling', { key: act.key, prompt: s.hud.prompt }); } await B.press(act.key); await sleep(act.interact ? 900 : 0); continue; }
  if (act.type === 'enter') {
    const v = act.vehicle;
    const d = steerTowards(s, 'walk', v, false);
    if (d < 3.5) { B.stick(0, 0); mem.boardTries++; B.log('instappen', { kind: v.kind }); await B.press('e'); await sleep(700); follower = null; }
    continue;
  }
  if (act.type === 'goto') {
    if (!s.target) continue;
    steerTowards(s, act.mode, s.target, !act.stunt && s.mission.phase !== 'active' && s.target.source === 'missiestart', act.top || 24);
    if (wedgeOut) {
      wedgeOut = false;
      B.log('klem', { x: s.player.x, y: s.player.y });
      wedgeDir = -wedgeDir;
      B.stick(0.6 * wedgeDir, 1);
      await sleep(1300);
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
    follower = null; detector.reset(B.time()); mem.boardTries = 0; lastStep = null; lastPhase = '';
    const t0 = B.time();
    await sleep(1500);
    await loop((s) => s.story.id !== id || B.time() - t0 > (CFG.perStepS || 600));
    B.log('step', { event: 'end', id, outcome: B.status().story.id === id ? 'tijd op' : 'klaar' });
    result = 'TIMEOUT';
  }
  result = 'KLAAR'; reason = CFG.sweep.length + ' stappen';
} else await loop(null);

B.releaseAll();
shot(`einde-${result.toLowerCase()}`);
B.log('einde', { result, reason, step: lastStep });
return JSON.stringify({ result, reason, step: lastStep, gameSeconds: B.time(), wallSeconds: Math.round((performance.now() - wall0) / 1000) });
