// Waarom het laadscherm van 0.56.1 bleef hangen (#553): de wegen-idle-guard in
// scene3d.js syncRoads liet streamStat.r staan zolang de focus stil stond.
// node scripts/loadstall_test.mjs  (puur, geen DOM/THREE, ruim onder 1 s)
//
// game/js/scene3d.js heeft THREE en de DOM nodig en is hier daarom nagebouwd:
// de guard van 0.56.1 (tag v0.56.1) plus de idle-verversing die in update3D bij
// elke frame gebeurde. De laadschermen zijn wel echt: stepProgress uit
// loadlogic.js en makeMenuGate uit menuready.js bepalen wanneer een scherm klaar is.
//
// De test bewijst:
//   1. de guard van 0.56.1 laat roads > 0 staan zolang de focus stil staat: de
//      bedoelde ontsnapping van 6 frames is dode code omdat het idle-record
//      elke frame opnieuw gezet werd (ook na een overgeslagen pas);
//   2. daardoor haalt het laadscherm alleen de time-out (MAX_S = 12 s) en niet
//      de rust-teller van 12 frames, en opent het startscherm pas op zijn
//      time-out (GATE.timeoutMs = 20 s);
//   3. zonder guard (0.56.2) is hetzelfde scherm in ~1,4 s klaar;
//   4. een guard met een echte 6-frame-ontsnapping maar zonder nul-toets
//      herstelt zichzelf (hoogstens 5 overgeslagen frames), waaruit blijkt dat
//      het de combinatie is: geen nul-toets én de per-frame verversing;
//   5. een veilige guard (zoals de gebouw-guard in syncBuildings: alleen
//      skippen als er niets meer ontbreekt en het spel al gestart is, en het
//      record alleen na een echte pas zetten) bouwt de wegen normaal af en
//      slaat daarna nog steeds werk over. Die guard staat sinds #553 weer in
//      syncRoads; de broncheck onderaan weigert elke vroege return zonder de
//      nul-toets én de game-started-toets, zodat de gevaarlijke guard niet kan
//      terugsluipen.
import fs from 'node:fs';
import { stepProgress, startProgress, MAX_S } from '../game/js/loadlogic.js';
import { makeMenuGate, GATE } from '../game/js/menuready.js';

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const FPS = 60, FRAME_S = 1 / FPS;
const ROAD_BUILD_PER_PASS = 3; // de echte code bouwt binnen ROAD_BUILD_MS = 2,5 ms
const DIST = 220, QUALITY = 7; // DRAW_DIST en getRoadQualityVersion() in het model

// ---------------------------------------------------------------- nepwereld
// De wegen rond de focus; geometryReady komt normaal van de geometry-worker,
// hier is alles meteen klaar zodat alleen de frame-budgetten overblijven.
function makeScene(missing) {
  const roads = Array.from({ length: missing }, (_, i) => ({ id: i }));
  const built = new Set();
  return {
    roads,
    built,
    missing: () => roads.filter((r) => !built.has(r)),
    ready: () => true,
    build: (r) => built.add(r),
  };
}

// ---------------------------------------------------------------- de guard
// record: 'none' = geen guard (0.56.2)
//         'every-frame' = 0.56.1: update3D zet roadSyncIdle elke frame opnieuw
//         'every-pass' = alleen na een volledige pas (de 6-frame-ontsnapping werkt)
//         'pass-empty' = als de gebouw-guard: alleen na een pas zonder ontbrekende wegen
const GUARDS = {
  geen: { skip: false, record: 'none' },
  gevaarlijk: { skip: true, record: 'every-frame' },
  half: { skip: true, record: 'every-pass' },
  veilig: { skip: true, record: 'pass-empty', requiresStarted: true },
};

function makeRoadSync(cfg) {
  const st = { r: 0 };
  let idle = null, frame = 0, fullPasses = 0, skips = 0, skippedWhilePending = 0, maxSkipDiff = 0;
  const makeIdle = (ctx, map) => ({ x: ctx.x, y: ctx.y, q: QUALITY, dist: DIST, meshes: map.built.size, frame });
  const shouldSkip = (ctx, map) => {
    if (!cfg.skip || !idle) return false;
    if (cfg.requiresStarted && !ctx.started) return false;
    // de nul-toets: zonder deze voorwaarde kan de guard een teller > 0 bevriezen
    if (cfg.record === 'pass-empty' && st.r !== 0) return false;
    return !ctx.openSpans && !ctx.quake && idle.q === QUALITY && idle.dist === DIST
      && idle.meshes === map.built.size && frame - idle.frame < 6
      && Math.hypot(ctx.x - idle.x, ctx.y - idle.y) < 0.15;
  };
  return {
    get pending() { return st.r; },
    get fullPasses() { return fullPasses; },
    get skips() { return skips; },
    get skippedWhilePending() { return skippedWhilePending; },
    get maxSkipDiff() { return maxSkipDiff; },
    // één frame: syncRoads() plus de idle-verversing aan het eind van update3D
    step(ctx, map) {
      frame++;
      if (shouldSkip(ctx, map)) {
        skips++;
        maxSkipDiff = Math.max(maxSkipDiff, frame - idle.frame);
        if (st.r > 0) skippedWhilePending++;
      } else {
        idle = null;
        fullPasses++;
        let built = 0, waiting = false;
        for (const r of map.missing()) {
          const ready = map.ready(r);
          if (waiting) continue;
          if (!ready) { waiting = true; continue; }
          if (built >= ROAD_BUILD_PER_PASS) break; // het frame-budget is op
          map.build(r);
          built++;
        }
        st.r = map.missing().length;
        if (cfg.record === 'every-pass' || (cfg.record === 'pass-empty' && st.r === 0)) idle = makeIdle(ctx, map);
      }
      // de fatale regel van 0.56.1: update3D zet roadSyncIdle elke frame opnieuw,
      // dus ook na een overgeslagen pas; de teller komt nooit aan de grens van 6.
      if (cfg.record === 'every-frame') idle = makeIdle(ctx, map);
    },
  };
}

// ---------------------------------------------------------------- scenario's
const frameMs = 1000 * FRAME_S;

// Het startscherm (#loading): de poort wacht tot er niets meer stroomt of tot
// zijn time-out. Focus staat stil, zoals bij een speler die nog niets doet.
function runStartGate(cfg) {
  const map = makeScene(40);
  const sync = makeRoadSync(cfg);
  const ctx = { x: 100, y: 200, started: false, openSpans: false, quake: false };
  const gate = makeMenuGate();
  let t = 0, openedAt = -1, frames = 0;
  for (; frames < FPS * 22; frames++) {
    sync.step(ctx, map); // update3D deed dit al toen de poort zijn eerste meting deed
    t += frameMs;
    if (gate.step(t, frameMs, sync.pending, true)) { openedAt = t / 1000; break; }
  }
  return { openedAt, gate, sync, frames: frames + 1 };
}

// Een sprong: eerst staat de speler stil (guard actief, niets meer te bouwen),
// dan komt hij 5 km verderop waar 40 wegen ontbreken. Het laadscherm (overlay)
// wacht op streamPending().roads, en de wereld staat stil (uiPaused).
function runJumpScreen(cfg) {
  const warmMap = makeScene(0);
  const sync = makeRoadSync(cfg);
  const warm = { x: 100, y: 200, started: true, openSpans: false, quake: false };
  for (let f = 0; f < 30; f++) sync.step(warm, warmMap); // stilstaan: guard grijpt in met roads === 0
  const warmPasses = sync.fullPasses;

  const map = makeScene(40);
  const ctx = { x: 5100, y: 5200, started: true, openSpans: false, quake: false };
  let prog = startProgress(), doneAt = -1, minPending = Infinity;
  for (let f = 0; f <= Math.round(14 * FPS); f++) {
    const t = f * FRAME_S;
    // eerst de update3D van deze frame (die bouwt na de sprong), daarna leest
    // het laadscherm streamPending
    sync.step(ctx, map);
    minPending = Math.min(minPending, sync.pending);
    prog = stepProgress(prog, sync.pending, t, 'travel');
    if (prog.done && doneAt < 0) doneAt = t;
  }
  return { doneAt, minPending, sync, map, ctx, warmPasses };
}

// 1. De guard van 0.56.1 op het startscherm: roads blijft op 37 staan en de
//    poort gaat pas open op zijn time-out (20 s), niet na ~0,2 s.
{
  const r = runStartGate(GUARDS.gevaarlijk);
  ok(r.sync.pending === 37, '0.56.1: startscherm houdt 37 ontbrekende wegen vast', r.sync.pending);
  ok(r.sync.fullPasses === 1, '0.56.1: na de eerste pas draait syncRoads nooit meer volledig', r.sync.fullPasses);
  ok(r.sync.maxSkipDiff <= 1, '0.56.1: de ontsnapping van 6 frames komt nooit in de buurt (verschil blijft 1)', r.sync.maxSkipDiff);
  ok(r.openedAt >= GATE.timeoutMs / 1000 && r.gate.report().timedOut, '0.56.1: startscherm opent pas op de 20 s time-out', r.openedAt);
}
// 2. Zonder guard en met de veilige guard is het startscherm snel klaar.
for (const naam of ['geen', 'veilig', 'half']) {
  const r = runStartGate(GUARDS[naam]);
  ok(r.sync.pending === 0 && r.openedAt < 2 && !r.gate.report().timedOut, `${naam}: startscherm is klaar zonder time-out`, r.openedAt);
}
// 'half' (echte 6-frame-ontsnapping, maar geen nul-toets) herstelt zichzelf: dat
// bewijst dat het de per-frame verversing is die van de guard een hang maakt.
{
  const half = runStartGate(GUARDS.half), vol = runStartGate(GUARDS.geen);
  ok(half.openedAt > vol.openedAt && half.openedAt < 2, "'half' is trager dan zonder guard maar herstelt", half.openedAt);
  ok(half.sync.skippedWhilePending > 0 && half.sync.skippedWhilePending < 100, "'half' slaat alleen tussen twee passen over", half.sync.skippedWhilePending);
  ok(half.sync.maxSkipDiff === 5, "'half' gebruikt de ontsnapping echt (verschil loopt tot 5)", half.sync.maxSkipDiff);
}

// 3. Het laadscherm na een sprong: 0.56.1 wacht de volle 12 s uit.
{
  const r = runJumpScreen(GUARDS.gevaarlijk);
  ok(r.sync.pending === 37 && r.minPending > 0, '0.56.1: roads komt na de sprong nooit op 0', r.minPending);
  ok(r.doneAt > MAX_S - FRAME_S && r.doneAt < MAX_S + 0.05, '0.56.1: laadscherm haalt alleen de 12 s time-out', r.doneAt);
  ok(r.sync.skippedWhilePending > 700, '0.56.1: de guard slaat honderden frames over terwijl er werk open staat', r.sync.skippedWhilePending);
  ok(r.sync.fullPasses === r.warmPasses + 1, '0.56.1: na de sprong precies één volledige pas', r.sync.fullPasses);
}
// 4. Zonder guard (0.56.2) en met de veilige guard: klaar zodra de rust-teller
//    vol is (~1,4 s), zonder de time-out te gebruiken.
for (const naam of ['geen', 'veilig']) {
  const r = runJumpScreen(GUARDS[naam]);
  ok(r.sync.pending === 0, `${naam}: de wegen zijn na de sprong gebouwd`);
  ok(r.doneAt >= 1.4 - FRAME_S && r.doneAt < 1.5, `${naam}: laadscherm klaar op de rust-teller`, r.doneAt);
  ok(r.sync.skippedWhilePending === 0, `${naam}: nooit overgeslagen terwijl er wegen open stonden`, r.sync.skippedWhilePending);
}
// 5. De veilige guard bespaart daarna echt werk: bij stilstand slaat hij over
//    (een op de zes frames blijft een volledige pas, zoals SYNC_IDLE_FRAMES).
{
  const r = runJumpScreen(GUARDS.veilig);
  const passes = r.sync.fullPasses, skips = r.sync.skips;
  const still = { ...r.ctx, started: true };
  for (let f = 0; f < 300; f++) r.sync.step(still, r.map);
  ok(r.sync.pending === 0, 'veilig: blijft op 0 tijdens stilstand');
  ok(r.sync.skips - skips >= 200, 'veilig: slaat bij stilstand het wegenwerk over', r.sync.skips - skips);
  ok(r.sync.fullPasses - passes <= 60, 'veilig: nog maar een op de zes frames een volledige pas', r.sync.fullPasses - passes);
  const before = r.sync.fullPasses;
  const moved = { ...still, x: still.x + 1 };
  r.sync.step(moved, r.map);
  ok(r.sync.fullPasses === before + 1, 'veilig: na 1 m lopen weer een volledige pas');
}

// ------------------------------------------------- broncheck op de echte code
// Een vroege return in syncRoads die de teller overslaat mag alleen als er
// niets meer open staat én het spel al gestart is; anders kan streamStat.r weer
// bevriezen (0.56.1) of staat de guard tijdens het laden in de weg.
const zeroCheck = /streamStat\.r\s*===?\s*0|streamPending\(\)\.roads\s*===?\s*0/;
const startedCheck = /game-started|gameStarted/;
const earlyReturns = (text) => [...text.matchAll(/if\s*\(([^;]*?)\)\s*return\b/g)].map((m) => m[1]);
const guardIsSafe = (text) => earlyReturns(text).every((c) => zeroCheck.test(c) && startedCheck.test(c));
const gevaarlijkeRegel = 'if (roadSyncIdle && !openSpans.size && !world.quake && roadSyncIdle.q === roadQuality && roadSyncIdle.dist === DRAW_DIST && roadSyncIdle.meshes === roadMeshes.size && roadSyncFrame - roadSyncIdle.frame < 6 && Math.hypot(px - roadSyncIdle.x, py - roadSyncIdle.y) < 0.15) return;';
ok(!guardIsSafe(gevaarlijkeRegel), 'de broncheck keurt de guard van 0.56.1 af');
ok(!guardIsSafe('if (roadSyncIdle && streamStat.r === 0) return;'), 'zonder game-started keurt de broncheck een guard af');
ok(guardIsSafe("if (roadSyncIdle && streamStat.r === 0 && document.body.classList.contains('game-started')) return;"), 'de broncheck keurt de veilige guard goed');
{
  const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  const start = src.indexOf('function syncRoads(');
  const end = src.indexOf('function syncTrees(', start);
  ok(start >= 0 && end > start, 'syncRoads staat nog in scene3d.js (werk deze test bij als hij verhuist)');
  const body = start >= 0 && end > start ? src.slice(start, end) : '';
  const firstAssign = body.indexOf('streamStat.r =');
  ok(firstAssign > 0, 'syncRoads zet streamStat.r');
  const head = firstAssign > 0 ? body.slice(0, firstAssign) : '';
  const risks = earlyReturns(head).filter((c) => !zeroCheck.test(c) || !startedCheck.test(c));
  ok(risks.length === 0, 'elke vroege return in syncRoads toetst roads === 0 én game-started', risks.join(' | '));
  // de guard mag de wegenbouw alleen overslaan als de laatste pas klaar was: het
  // idle-record hoort daarom binnen syncRoads te staan, niet in de per-frame lus
  const update = src.slice(src.indexOf('export function update3D('));
  ok(!/roadSyncIdle\s*=/.test(update), 'update3D ververst het wegen-idle-record niet elke frame');
}

// --- broncheck op syncBuildings (#772) ------------------------------------
// Dezelfde bronregel uit docs/PERF-LAADHANG-0.56.1.md (punt 5) geldt voor de
// gebouwpas: een guard in syncBuildings mag streamStat.b alleen overslaan op het
// idle-record, en dat record mag alleen na een volledige pas gezet worden (niets
// meer te bouwen of te prefetchen). Anders blijft een teller > 0 staan en wacht het
// laadscherm op zijn time-out — precies de bug van 0.56.1, nu voor gebouwen.
{
  const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  const start = src.indexOf('function syncBuildings(');
  const pass = src.indexOf('function syncBuildingsPass(', start);
  ok(start >= 0 && pass > start, 'syncBuildings staat nog in scene3d.js (werk deze test bij als hij verhuist)');
  const guardBody = start >= 0 && pass > start ? src.slice(start, pass) : '';
  const passEnd = pass > start ? src.indexOf('\nfunction ', pass + 10) : -1;
  const passBody = pass > start && passEnd > pass ? src.slice(pass, passEnd) : '';
  ok(passBody.length > 0, 'syncBuildingsPass staat nog in scene3d.js');
  // een vroege return in syncBuildings mag alleen via het record: dat bestaat
  // uitsluitend als de vorige pas niets meer miste (streamStat.b === 0)
  const byRecord = (text) => { const rs = earlyReturns(text); return rs.length > 0 && rs.every((c) => /syncIdle/.test(c)); };
  ok(byRecord(guardBody), 'elke vroege return in syncBuildings hangt aan het volledige-pas-record', earlyReturns(guardBody).join(' | '));
  ok(!byRecord('if (prefetchedBuildings.size > 0) return;'), 'de broncheck keurt een gebouwguard zonder volledige-pas-record af');
  // het record mag precies één keer gezet worden, en alleen in de klaar-tak: dan is
  // streamStat.b 0 (missing.length === 0) en kan de guard geen teller > 0 bevriezen
  const recordSafe = (text) => {
    const assigns = [...text.matchAll(/syncIdle\s*=/g)].length;
    return assigns === 1 && /if \(prefetchDone && missing\.length === 0\) \{\s*syncIdle = /.test(text);
  };
  ok(recordSafe(passBody), 'syncIdle wordt alleen na een volledige gebouwpas gezet (streamStat.b = 0)', [...passBody.matchAll(/syncIdle\s*=/g)].length);
  ok(!recordSafe('if (missing.length > built) return;\n  syncIdle = { x: 0 };'), 'de broncheck keurt een record na een halve pas af');
  ok(/streamStat\.b = missingCount;/.test(passBody), 'syncBuildingsPass zet streamStat.b uit de ontbrekende lijst');
}

// 6. Dezelfde veilige vorm voor het water (#651): bij een stilstaande focus en
//    een gelijk blijvende waterversie slaat de guard 5 van 6 passen over; een
//    nieuwe waterversie dwingt meteen weer een volledige pas af.
{
  const dist = 220;
  let idle = null, frame = 0, passes = 0, skips = 0;
  const ctx = { x: 100, y: 200, ver: 7, size: 40, view: 700, started: true };
  const step = (ver) => {
    frame++;
    ctx.ver = ver;
    const skip = !!idle && idle.ver === ver && idle.size === ctx.size && idle.dist === dist && idle.view === ctx.view
      && ctx.started && frame - idle.frame < 6 && Math.hypot(ctx.x - idle.x, ctx.y - idle.y) < 0.15;
    if (skip) { skips++; return; }
    passes++;
    idle = { x: ctx.x, y: ctx.y, ver, size: ctx.size, dist, view: ctx.view, frame };
  };
  for (let i = 0; i < 300; i++) step(7);
  ok(passes >= 45 && passes <= 55, 'water: een op de zes frames een volledige pas', passes);
  ok(skips >= 245, 'water: de rest overgeslagen', skips);
  const p0 = passes;
  step(8);
  ok(passes === p0 + 1, 'water: een nieuwe waterversie dwingt een pas af');
  const water = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  ok(/function waterIdle\(/.test(water) && /_waterVer/.test(water) && /waterMeshes\.size/.test(water) && /game-started/.test(water), 'water-guard toetst versie, meshes en game-started');
  ok(!/waterSyncIdle\s*=/.test(water.slice(water.indexOf('export function update3D'))), 'update3D ververst het water-record niet elke frame');
  console.log(`#651 meting: water 300 frames -> ${passes - 1} volledige passen, ${skips} overgeslagen (model)`);
}

console.log(`${n - fails}/${n} loadstall`);
process.exit(fails ? 1 : 0);
