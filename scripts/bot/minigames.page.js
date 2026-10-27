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

// #186: de bordspellen en de kermis met de pure regels van game/js/botlogic.js in plaats van een vast rijtje
// toetsen: discgolf mikt met het echte vliegmodel, de botsauto's sturen over de tent en het reuzenrad wacht op
// zijn gondel. Zonder die regels (een losse pagina) valt de run terug op PLAN.
const STRATEGIE = new Set(['discgolf', 'kermis', 'hoogvlieger']);
// Een activiteit die langer duurt dan het speelbudget van 40 s moet de tijd krijgen om af te maken: een
// botsautorit duurt 75 s en een reuzenradrit twee rondes (105 s), anders stopt de bot halverwege en is er geen
// prijs of medaille (en telt de run een time-out die er niet is).
const BUDGET = { discgolf: 300, kermis: 105, hoogvlieger: 145 };
const budgetVoor = (id) => BUDGET[id] || PLAY_S;

// toetsen houden zoals een speler: alleen wat verandert wordt ingedrukt of losgelaten
function houdToetsen(want, alle = ['w', 's', 'a', 'd']) {
  for (const k of alle) {
    if (want.includes(k)) { if (!B.input.isDown(k)) B.down(k); }
    else if (B.input.isDown(k)) B.up(k);
  }
}

// Discgolf: het vliegmodel van het spel (discgolfrules.simulateFlight) in de handen van de bot (botlogic
// discgolfWorp): de schijf, de kracht en de hoek voor deze lig en deze wind, en dan de worp van de debug-API
// (window.__discgolf.throwAt) in plaats van een Spatie die maar wat doet.
async function playDiscgolf(ev) {
  const DG = window.__discgolf;
  if (!DG || !DG.state || !DG.throwAt) return false;
  const DR = await imp('discgolfrules');
  ev.how += ' discgolf-regels';
  const t0 = B.time();
  let worpen = 0, banen = 0, laatsteBaan = -1;
  const limit = budgetVoor('discgolf');
  for (let i = 0; i < 100000; i++) {
    const st = DG.state();
    if (!st) break;                                   // de ronde is af (of gestopt)
    if (B.time() - t0 > limit) { ev.stuck = true; ev.how += ' de ronde duurde te lang'; B.log('timeout', { step: 'mg-discgolf', what: 'discgolf: de ronde duurde te lang', forS: Math.round(B.time() - t0), x: player.x, y: player.y, goalDist: null }); break; }
    if (st.phase === 'mode') { await B.press(' '); await sleep(500); continue; }
    if (st.phase !== 'aim') { await sleep(250); continue; }
    const hole = DG.holes()[st.hole];
    if (!hole) break;
    if (st.hole !== laatsteBaan) { laatsteBaan = st.hole; banen = Math.max(banen, st.hole + 1); }
    // de bomen van de baan staan niet in de staat van het spel: de bot mikt op de mand en de wind, niet op de
    // eik; een schijf die tegen een stam komt wordt de volgende worp gewoon opnieuw bekeken
    const plan = L.discgolfWorp(st.lie, hole.basket, { simulate: DR.simulateFlight, env: { wind: st.wind, basket: hole.basket, rng: L.seededRandom(1 + worpen) } });
    if (!plan) break;
    const weg = DG.throwAt(plan.power, { yaw: plan.yaw, loft: plan.loft, release: plan.release, disc: plan.disc });
    if (weg) worpen++;
    B.log('discgolf', { baan: hole.n, worp: st.strokes + 1, disc: plan.disc, power: Math.round(plan.power * 100) / 100, yaw: Math.round(plan.yaw * 100) / 100, release: plan.release, waarom: plan.why, verwacht: Math.round(plan.dist), wind: st.wind && { mps: Math.round(st.wind.speed * 10) / 10, dir: Math.round(st.wind.dir * 100) / 100 } });
    if (!weg) { await sleep(300); continue; }
    await sleep(450);
  }
  ev.playedS = Math.round((B.time() - t0) * 10) / 10;
  ev.how += ` ${worpen} worpen over ${banen} banen`;
  return true;
}

// De botsauto's: gas en stuur uit botlogic.kermisStap (de tent, de rand, de slinger over de vloer). De kermis
// leest de toetsen zelf (kermis.js updateRide: isDown('w') en 'a'/'d'), niet de stick.
async function playKermis(ev) {
  const KM = window.__kermis;
  if (!KM || !KM.state) return false;
  ev.how += " botsauto's";
  const t0 = B.time(), mem = {};
  const limit = budgetVoor('kermis');
  let laatste = -1, beelden = 0, score = 0;
  for (let i = 0; i < 100000; i++) {
    const st = KM.state();
    if (!st) break;
    if (B.time() - t0 > limit) { ev.stuck = true; ev.how += ' de rit duurde te lang'; B.log('timeout', { step: 'mg-kermis', what: 'kermis: de rit duurde te lang', forS: Math.round(B.time() - t0), x: player.x, y: player.y, goalDist: null }); break; }
    if (st.phase !== 'ride' || !st.me) { houdToetsen([]); await sleep(250); continue; }
    const d = L.kermisStap({ u: st.me.u, v: st.me.v, a: st.me.a, t: st.t, hu: L.KERMIS.hu, hv: L.KERMIS.hv }, mem);
    houdToetsen([...(d.throttle > 0 ? ['w'] : d.throttle < 0 ? ['s'] : []), ...(d.turn > 0.25 ? ['d'] : d.turn < -0.25 ? ['a'] : [])]);
    beelden++;
    score = st.score;
    if (st.score !== laatste) { laatste = st.score; B.log('kermis', { score: st.score, hits: st.hits, combo: st.combo, links: Math.round(st.left), u: Math.round(st.me.u * 10) / 10, v: Math.round(st.me.v * 10) / 10, waarom: d.why }); }
    await sleep(80);
  }
  houdToetsen([]);
  ev.playedS = Math.round((B.time() - t0) * 10) / 10;
  ev.how += ` ${score} punten`;
  // de rit van 75 s is langer dan het oude budget van 40 s: zonder de uitspeeltijd stopte de bot halverwege
  B.log('kermis-rit', { beelden, score, binnen: Math.round(B.time() - t0) });
  return true;
}

// Het reuzenrad: de rit uitzitten en uitstappen als de twee rondes om zijn (botlogic.hoogvliegerStap). De
// wachtteller van de pagina staat stil zolang de rit loopt (hold): een rad van 105 s is geen vastloper.
async function playHoogvlieger(ev, hold) {
  const HV = window.__hoogvlieger;
  if (!HV || !HV.state) return false;
  const KM = await imp('kermis');
  ev.how += ' reuzenrad';
  const t0 = B.time();
  const limit = budgetVoor('hoogvlieger');
  let gedrukt = 0, links = 0;
  for (let i = 0; i < 100000; i++) {
    const st = HV.state();
    if (!st) break;                                  // uitgestapt: de rit is klaar
    const wheel = KM.kermisWheel();
    if (!wheel) break;
    if (B.time() - t0 > limit) { ev.stuck = true; ev.how += ' de rit duurde te lang'; B.log('timeout', { step: 'mg-hoogvlieger', what: 'reuzenrad: de rit duurde te lang', forS: Math.round(B.time() - t0), x: player.x, y: player.y, goalDist: null }); break; }
    const fractie = Number.isFinite(st.fraction) ? st.fraction : 0;
    links = Math.max(0, Math.round((1 - fractie) * L.WHEEL.rondes * 2 * Math.PI / L.WHEEL.omega));
    const d = L.hoogvliegerStap({ rot: wheel.rot, inGondel: true, klaar: fractie >= 1, index: st.index, links });
    if (d.press) { await B.press('e', 120); gedrukt++; await sleep(700); continue; }
    hold();                                          // de rit loopt: geen vastloper
    await sleep(200);
  }
  ev.playedS = Math.round((B.time() - t0) * 10) / 10;
  ev.how += ` ${gedrukt} keer E, nog ${links} s`;
  return true;
}

// Het reuzenrad start alleen als er een gondel onderaan hangt (reuzenrad.js interact): wacht daarop voordat de
// pagina E indrukt, anders staan alle startpogingen op een dichte deur.
async function wachtOpGondel(ev) {
  const KM = await imp('kermis');
  for (let i = 0; i < 120; i++) {
    const wheel = KM.kermisWheel();
    if (!wheel) return;
    const d = L.hoogvliegerStap({ rot: wheel.rot, inGondel: false });
    if (d.wacht === 0) { ev.how += ' gondel onderaan'; return; }
    if (i === 0) B.log('reuzenrad', { wacht: Math.round(d.wacht * 10) / 10, rot: Math.round(wheel.rot * 100) / 100 });
    await sleep(250);
  }
}


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

// het oude vaste rijtje toetsen per minigame (PLAN): voor de activiteiten zonder eigen regels, en als terugval
// wanneer de regels of de staat van het spel ontbreken (een losse pagina)
async function speelPlan(ev, a, id, activeNow) {
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
  } else if (ev.started && STRATEGIE.has(id)) {
    // #186: de bordspellen en de kermis met de pure regels van botlogic.js (discgolf, botsauto's, reuzenrad)
    const det = new L.StuckDetector({ windowS: STUCK_S, minGain: 0.1, minMove: 0.5 });
    const hold = () => det.hold(B.time());
    const strategy = { discgolf: playDiscgolf, kermis: playKermis, hoogvlieger: playHoogvlieger }[id];
    let gedaan = false;
    try { gedaan = await strategy(ev, hold); } catch (e) { ev.how += ' strategie faalde: ' + String(e && e.message || e).slice(0, 120); }
    if (!gedaan) {
      // geen regels of geen staat: het oude rijtje toetsen, zodat een losse pagina niet stilvalt
      ev.how += ' (terug op PLAN)';
      await speelPlan(ev, a, id, activeNow);
    }
  } else if (ev.started) {
    await speelPlan(ev, a, id, activeNow);
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
    // het reuzenrad start alleen als er een gondel onderaan hangt (reuzenrad.js interact): wacht daarop, anders
    // staan alle startpogingen op een dichte deur en telt de run een minigame die niet start
    if (info.id === 'hoogvlieger' && !a.active()) await wachtOpGondel(ev);
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
