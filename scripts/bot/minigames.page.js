// Page half of `scripts/bot/run.mjs --mode=minigames` (desktop --perf-script body; Spelbot fase 3, #186).
// window.__botCfg = { only, playS, shots }. Per minigame: set up (teleport to its spot, a test setup that is
// logged as 'setup', not as "had een cheat nodig"), start it the way a player does (E), play it with a short
// strategy, watch for stuck (nothing changes for stuckS), leave with Backspace, and log one 'minigame' event:
// { id, started, playedS, moneyDelta, stuck, quit, how }. The activities come from the activity contract
// (window.__activities, activities.js); pigeon and helicopter start through their own start functions.
const CFG = window.__botCfg || {};
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const imp = (f) => import('/js/' + f + '.js');
const L = await imp('botlogic');
for (let i = 0; i < 600 && !window.__bot; i++) await sleep(100);
const B = window.__bot;
if (!B) return JSON.stringify({ result: 'FOUT', reason: 'window.__bot ontbreekt' });
const world = B.world, player = B.player;
// #312: de kartrace krijgt sturen, gas, drift en de time-outs van scripts/bot/race.mjs (run.mjs zet
// hem als window.__botRace neer), net als de heli en de boot in bot.page.js.
const Rc = window.__botRace || null;
if (!Rc) B.log('race', { what: 'window.__botRace ontbreekt: start via scripts/bot/run.mjs' });
const ONLY = (CFG.only || '').split(',').filter(Boolean);
const PLAY_S = CFG.playS || 40;
const STUCK_S = CFG.stuckS || 15;
const WALL0 = performance.now(), MAX_WALL = (CFG.maxWallS || 1800) * 1000;
const overWall = () => performance.now() - WALL0 > MAX_WALL - 60000;
let shots = 0;
const shot = (n) => { if (shots < (CFG.shots || 60)) { shots++; B.shot(n); } };
world.devInvuln = true;
if (CFG.speed > 1) B.speed(CFG.speed);

// first get the game going: skip cutscenes and the pause menu until the player has control
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

function teleport(x, y) {
  if (player.inVehicle) player.exitVehicle(world.map, world);
  const sp = (world.map.findOpenSpawn && world.map.findOpenSpawn(x, y, 40)) || { x, y };
  player.x = sp.x; player.y = sp.y; player.vx = player.vy = 0;
  B.log('setup', { what: 'teleport', x: Math.round(sp.x), y: Math.round(sp.y) });
}

// what to press while a minigame runs: [keys held, ms], per activity id; the default mashes the usual keys
const PLAN = {
  kartbaan: [[['w'], 2500], [['w', 'd'], 600], [['w'], 2500], [['w', 'a'], 600]],
  carbid: [[['f'], 200], [['arrowright'], 400], [['f'], 200], [['arrowup'], 300], [['e'], 200]],
  kermis: [[['w'], 1500], [['w', 'd'], 500], [['w'], 1500], [['w', 'a'], 500]],
  discgolf: [[[' '], 900], [[], 600], [['d'], 300], [['enter'], 150]],
  pitchputt: [[[' '], 700], [[], 700], [['d'], 250]],
  zwembad: [[[' '], 300], [['a'], 200], [['d'], 200]],
  klimtoren: [[[' '], 250], [[], 250]],
  hengelen: [[[' '], 200], [[], 1200]],
  waterski: [[['e'], 150], [[' '], 150], [['a'], 300], [['d'], 300]],
  carillon: [[['arrowright'], 150], [['enter'], 150], [['e'], 150], [['q'], 150]],
  skatepark: [[['w'], 800], [[' '], 150], [['e'], 150]],
  // de vliegschool kiest met cijfers: 1 = vliegtuig, dan les 1 (ringen); daarna gas en een bocht (de echte vlucht: scripts/ui/shots_scenes_s6.js --only=vliegschool)
  vliegschool: [[['1'], 200], [['1'], 200], [['w'], 1500], [['d'], 400], [['w'], 1500], [['a'], 400]],
};
const DEFAULT_PLAN = [[['w'], 800], [[' '], 150], [['e'], 150], [['d'], 300], [['a'], 300]];

// a cheap signature of "something happened": the player, the money and the activity's own readout
function signature(a) {
  let sub = '';
  try { sub = JSON.stringify(a.mapSub ? a.mapSub((a.spots()[0] || {}), world) : ''); } catch (e) { /* none */ }
  return [Math.round(player.x), Math.round(player.y), world.money, sub, (document.getElementById('hud') || {}).innerText && document.getElementById('hud').innerText.length].join('|');
}

async function playKart(ev, a) {
  const kb = window.__kartbaan;
  let track = null;
  try { track = (await imp('kartbaanspoor')).KARTBAAN_TRACK; } catch (e) { ev.how += ' kartbaan-spoor faalde: ' + String(e && e.message || e).slice(0, 100); }
  const mem = {};
  const KEYS = [['w', 'throttle'], ['s', 'rem'], ['a', 'links'], ['d', 'rechts'], [' ', 'handrem']];
  const set = (want) => {
    for (const [key, name] of KEYS) {
      if (want.includes(key)) { if (!B.input.isDown(key)) B.down(key); }
      else if (B.input.isDown(key)) B.up(key);
    }
  };
  ev.how += ' kart';
  const t0 = B.time(), wall0 = performance.now();
  const limit = (Rc.RACE.raceS || 180) + 20;
  let lastLog = -99;
  for (let i = 0; i < 100000; i++) {
    if (!a.active() || !window.__kartbaan) break;
    const state = kb.state();
    const kart = kb.kart(0);
    if (!state || !kart) { await sleep(150); continue; }
    const others = [0, 1, 2, 3].map((q) => kb.kart(q)).filter(Boolean);
    const step = Rc.kartStep({ phase: state.phase, raceT: state.raceT, kart, others }, track, mem, B.time());
    if (step.type === 'timeout') {
      set([]);
      ev.stuck = true;
      ev.how += ' time-out: ' + step.why;
      B.log('timeout', { step: 'mg-kartbaan', what: 'kartbaan: ' + step.why, forS: Math.round(step.forS || 0), x: player.x, y: player.y, goalDist: null, prog: Math.round(step.prog || 0), lap: step.lap });
      break;
    }
    if (step.type === 'klaar') { set([]); break; }
    if (step.type === 'rij') {
      const keys = [];
      if (step.throttle > 0) keys.push('w');
      else if (step.throttle < 0) keys.push('s');
      if (step.steer > 0.25) keys.push('d');
      else if (step.steer < -0.25) keys.push('a');
      if (step.drift) keys.push(' ');
      set(keys);
      if (B.time() - lastLog >= 2) {
        lastLog = B.time();
        const uitslag = Rc.raceResult({ karts: others }, 0);
        B.log('race', { id: 'kartbaan', fase: state.phase, ronde: kart.lap, prog: Math.round(kart.prog || 0), v: Math.round((kart.f || 0) * 10) / 10, off: Math.round((kart.off || 0) * 10) / 10, plek: uitslag && uitslag.plek, karts: others.length, drift: !!step.drift });
      }
    } else set([]);
    ev.playedS = Math.round(B.time() - t0);
    if (B.time() - t0 > limit || performance.now() - wall0 > 360000) {
      ev.stuck = true; ev.how += ' de race duurde te lang';
      B.log('timeout', { step: 'mg-kartbaan', what: 'kartbaan: de race duurde te lang', forS: Math.round(B.time() - t0), x: player.x, y: player.y, goalDist: null });
      break;
    }
    await sleep(90);
  }
  set([]);
  const state = kb.state ? kb.state() : null;
  ev.playedS = Math.round(B.time() - t0);
  const live = [0, 1, 2, 3].map((q) => kb.kart(q)).filter(Boolean);
  ev.race = Rc.raceResult({ karts: live.length ? live : (state && state.karts) }, 0);
  if (ev.race) B.log('race-uitslag', { id: 'kartbaan', plek: ev.race.plek, karts: ev.race.karts, klaar: ev.race.klaar, rondes: ev.race.rondes });
}

async function playOne(id, startFn, a) {
  const t0 = B.time();
  const money0 = world.money;
  const errors0 = window.__botErrors || 0;
  const ev = { id, started: false, playedS: 0, moneyDelta: 0, stuck: false, quit: '', how: '' };
  await startFn(ev);
  // wandeling neemt de speler nooit over (active() is altijd false): haar eigen staat telt als gestart
  const activeNow = () => (a ? a.active() || (id === 'wandeling' && !!(window.__wandeling && window.__wandeling.state())) : !!(world.pigeonMode || world.heliRun || window.__botMg));
  for (let i = 0; i < 20 && !activeNow(); i++) await sleep(250);
  ev.started = activeNow();
  shot(`mg-${id}-start`);
  if (ev.started && id === 'kartbaan' && Rc && window.__kartbaan) {
    // #312: de kartbaan rijdt de bot zelf (sturen, gas, drift, time-outs), niet op een vast rijtje toetsen
    await playKart(ev, a);
  } else if (ev.started) {
    const plan = PLAN[id] || DEFAULT_PLAN;
    const det = new L.StuckDetector({ windowS: STUCK_S, minGain: 0.1, minMove: 0.5 });
    let sig = signature(a || { spots: () => [] }), k = 0, shotAt = false, changes = 0;
    const play0 = B.time(), wallPlay0 = performance.now();
    // ook een wandkloklimiet: staat de speltijd stil (pauze, een scherm dat de wereld bevriest), dan hangt een lus op speltijd eeuwig (#255)
    // staat de speltijd stil (de duif), dan telt de echte tijd mee: na 5 s echt zonder speltijd is de echte tijd de klok
    const played = () => { const g = B.time() - play0, w = (performance.now() - wallPlay0) / 1000; return g < 0.2 && w > 5 ? w : g; };
    while (activeNow() && played() < PLAY_S && performance.now() - wallPlay0 < PLAY_S * 4000) {
      const s = B.status();
      if (s.blocking.cinematic || s.blocking.banner) { B.down(' '); await sleep(1300); B.up(' '); continue; }
      const [keys, ms] = plan[k++ % plan.length];
      for (const key of keys) B.down(key);
      await sleep(ms);
      for (const key of keys) B.up(key);
      const now = signature(a || { spots: () => [] });
      if (sig !== now) changes++;
      const st = det.update(B.time(), { x: player.x, y: player.y, goalDist: -changes, key: id });
      sig = now;
      if (st.stuck) { ev.stuck = true; B.log('stuck', { step: `mg-${id}`, x: player.x, y: player.y, idleFor: st.idleFor, goalDist: null }); shot(`mg-${id}-vast`); break; }
      if (!shotAt && played() > PLAY_S / 2) { shotAt = true; shot(`mg-${id}-midden`); }
    }
    ev.playedS = Math.round(played() * 10) / 10;
    if (performance.now() - wallPlay0 >= PLAY_S * 4000) { ev.stuck = true; ev.how += ' speltijd stond stil'; B.log('stuck', { step: `mg-${id}`, x: player.x, y: player.y, idleFor: PLAY_S * 4, goalDist: null }); }
  }
  B.releaseAll();
  // leave the way a player does
  for (let i = 0; i < 4 && activeNow(); i++) { await B.press('backspace'); await sleep(600); }
  if (activeNow()) { ev.quit = 'quit()'; try { if (a) a.quit(world); else if (world.pigeonMode) (await imp('pigeonmode')).stopPigeonMode(world); } catch (e) { ev.quit = 'quit() faalde: ' + e.message; } }
  else ev.quit = ev.started ? 'backspace' : '';
  ev.moneyDelta = world.money - money0;
  ev.errors = (window.__botErrors || 0) - errors0;
  if (!ev.started && BY_DESIGN[id]) ev.reden = BY_DESIGN[id];
  B.log('minigame', ev);
  await sleep(800);
  return ev;
}

// minigames die niet te starten zijn zoals een speler het doet, met de reden (geen bot- of spelbug): bestaat in de uitslag als `reden`
const BY_DESIGN = {
  drift: 'begint pas als je met een voertuig de driftzone in rijdt (interact() is bewust false)',
  evenementen: 'alleen op evenementdagen en -uren',
  regatta: 'alleen op wedstrijddagen',
  snackketen: 'de interactie koopt een snackbar; er valt niets te spelen',
};
window.addEventListener('error', () => { window.__botErrors = (window.__botErrors || 0) + 1; });
window.addEventListener('unhandledrejection', () => { window.__botErrors = (window.__botErrors || 0) + 1; });

await settle();
const out = [];
const list = (window.__activities ? window.__activities.list() : []).filter((x) => !ONLY.length || ONLY.includes(x.id));
B.log('start', { mode: 'minigames', activities: list.map((x) => x.id) });
let truncated = false;
for (const info of list) {
  // de echte-tijdbegroting van de run: stoppen met wat er is, zodat het rapport compleet blijft (#255)
  if (overWall()) { truncated = true; B.log('minigame', { id: info.id, started: false, how: 'niet aan toe gekomen (echte tijd op)' }); continue; }
  const a = window.__activities.get(info.id);
  // a.spots(true) geeft ook de plekken die nog niet getoond worden (hoogvlieger, pitchputt, snackketen); #242
  let spot = a.spots()[0];
  if (!spot) { try { spot = a.spots(true)[0]; } catch (e) { /* geen parameter */ } }
  if (!spot && info.id === 'geheimen' && window.__geheimen && window.__geheimen.spots) { try { spot = window.__geheimen.spots()[0]; } catch (e) { /* geen */ } }
  if (!spot) { B.log('minigame', { id: info.id, started: false, how: 'geen plek' }); out.push({ id: info.id, started: false }); continue; }
  try { out.push(await playOne(info.id, async (ev) => {
    teleport(spot.x, spot.y);
    player.x = spot.x; player.y = spot.y;
    await sleep(2500);
    try { const pr = a.prompt(world); ev.prompt = !pr ? '' : typeof pr === 'string' ? pr : JSON.stringify(pr).slice(0, 160); } catch (e) { ev.prompt = 'prompt() faalde'; }
    await settle();
    // the opening per minigame (botlogic startAttempts): wait for the prompt before a key, step aside when nothing starts
    let jit = 0;
    for (const step of L.startAttempts(info.id)) {
      if (a.active()) break;
      if (step === 'interact') { try { ev.how += ' interact()=' + !!a.interact(world); } catch (e) { ev.how += ' interact() faalde: ' + e.message; } await sleep(1200); continue; }
      if (step === 'jitter') { const o = L.jitterOffset(jit++); player.x = spot.x + o.dx; player.y = spot.y + o.dy; ev.how += ' ~'; await sleep(1500); continue; }
      for (let w = 0; w < 8 && !a.prompt(world); w++) await sleep(250);
      ev.how += step === ' ' ? '_' : step; await B.press(step); await sleep(1400);
    }
  }, a)); } catch (e) {
    // één minigame die faalt mag de rest niet meenemen
    B.releaseAll(); B.log('minigame', { id: info.id, started: false, how: 'bot-fout: ' + String(e && e.message || e).slice(0, 160) }); out.push({ id: info.id, started: false });
    try { if (a.active()) a.quit(world); } catch (e2) { /* weg */ }
  }
}
if (!overWall() && (!ONLY.length || ONLY.includes('duif'))) {
  const PM = await imp('pigeonmode');
  out.push(await playOne('duif', async (ev) => { ev.how = 'startPigeonMode'; try { PM.startPigeonMode(world); } catch (e) { ev.how += ' faalde: ' + e.message; } }, null));
}
if (!overWall() && (!ONLY.length || ONLY.includes('heli'))) {
  const HR = await imp('helirun');
  out.push(await playOne('heli', async (ev) => { ev.how = 'startHeliRun'; try { HR.startHeliRun({}); window.__botMg = true; } catch (e) { ev.how += ' faalde: ' + e.message; } }, null));
  window.__botMg = false;
}
const resultaat = truncated ? 'TIMEOUT' : 'KLAAR';
B.log('einde', { result: resultaat, reason: `${out.length} minigames`, minigames: out.length });
return JSON.stringify({ result: resultaat, reason: `${out.length} minigames`, gameSeconds: B.time(), minigames: out.map((o) => [o.id, o.started, o.stuck]) });
