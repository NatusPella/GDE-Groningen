// Waarom het laadscherm van 0.56.1 bleef hangen (#553): de wegen-idle-guard in
// scene3d.js syncRoads liet streamStat.r staan zolang de focus stil stond.
// node scripts/loadstall_test.mjs  (puur, geen DOM/THREE, ruim onder 1 s)
//
// game/js/scene3d.js heeft THREE en de DOM nodig en is hier daarom nagebouwd:
// de guard van 0.56.1 (tag v0.56.1; syncRoads regel 2062-2064) plus de
// idle-verversing die in update3D op regel 2543 bij elke frame gebeurde. De
// laadschermen zijn wel echt: stepProgress uit loadlogic.js en makeMenuGate uit
// menuready.js bepalen wanneer een scherm klaar is.
//
// De test bewijst:
//   1. de guard van 0.56.1 laat roads > 0 staan zolang de focus stil staat: de
//      bedoelde ontsnapping van 6 frames is dode code omdat het idle-record
//      elke frame opnieuw gezet wordt (ook na een overgeslagen pas);
//   2. daardoor haalt het laadscherm alleen de time-out (MAX_S = 12 s) en niet
//      de rust-teller van 12 frames, en opent het startscherm pas op zijn
//      time-out (GATE.timeoutMs = 20 s);
//   3. zonder guard (0.56.2) is hetzelfde scherm in ~1,4 s klaar;
//   4. een guard met een echte 6-frame-ontsnapping maar zonder nul-toets
//      herstelt zichzelf (hoogstens 5 overgeslagen frames), waaruit blijkt dat
//      het de combinatie is: geen nul-toets én de per-frame verversing;
//   5. een veilige guard (zoals de gebouw-guard in syncBuildings: alleen
//      skippen als er niets meer ontbreekt, en het record alleen na een echte
//      pas zetten) bouwt de wegen normaal af en slaat daarna nog steeds werk
//      over. De broncheck onderaan weigert een vroege return in syncRoads
//      zonder nul-toets, zodat de gevaarlijke guard niet terug kan sluipen.
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
// niets meer open staat; anders kan streamStat.r weer bevriezen.
const zeroCheck = /streamStat\.r\s*===?\s*0|streamPending\(\)\.roads\s*===?\s*0/;
const earlyReturns = (text) => [...text.matchAll(/if\s*\(([^;]*?)\)\s*return\b/g)].map((m) => m[1]);
const guardIsSafe = (text) => earlyReturns(text).every((c) => zeroCheck.test(c));
const gevaarlijkeRegel = 'if (roadSyncIdle && !openSpans.size && !world.quake && roadSyncIdle.q === roadQuality && roadSyncIdle.dist === DRAW_DIST && roadSyncIdle.meshes === roadMeshes.size && roadSyncFrame - roadSyncIdle.frame < 6 && Math.hypot(px - roadSyncIdle.x, py - roadSyncIdle.y) < 0.15) return;';
ok(!guardIsSafe(gevaarlijkeRegel), 'de broncheck keurt de guard van 0.56.1 af');
ok(guardIsSafe('if (roadSyncIdle && !openSpans.size && streamStat.r === 0) return;'), 'de broncheck keurt een guard met de nul-toets goed');
{
  const src = fs.readFileSync(new URL('../game/js/scene3d.js', import.meta.url), 'utf8');
  const start = src.indexOf('function syncRoads(');
  const end = src.indexOf('function syncTrees(', start);
  ok(start >= 0 && end > start, 'syncRoads staat nog in scene3d.js (werk deze test bij als hij verhuist)');
  const body = start >= 0 && end > start ? src.slice(start, end) : '';
  const firstAssign = body.indexOf('streamStat.r =');
  ok(firstAssign > 0, 'syncRoads zet streamStat.r');
  const head = firstAssign > 0 ? body.slice(0, firstAssign) : '';
  const risks = earlyReturns(head).filter((c) => !zeroCheck.test(c));
  ok(risks.length === 0, 'elke vroege return in syncRoads toetst eerst dat er geen wegen meer open staan', risks.join(' | '));
}

console.log(`${n - fails}/${n} loadstall`);
process.exit(fails ? 1 : 0);
