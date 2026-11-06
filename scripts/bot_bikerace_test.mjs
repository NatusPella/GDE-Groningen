// Spelbot (#312): de fietsrace van M05 (KEI-week) — de pure regels van scripts/bot/bikerace.mjs en
// een simulatie op de echte KEI-route, met de echte fietsregels (vehicle.js + vehicle/tuning.js), de
// echte kaart met bebouwing (game/world) en de vier KEI-rivalen op hun eigen topsnelheid.
//   node scripts/bot_bikerace_test.mjs
// De simulatie SKIPt zonder game/world (desktop stage of de wereldbouw).
import './node3d.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const Bk = await import('../scripts/bot/bikerace.mjs');
const V = await import('../game/js/vehicle.js');
const { playerTune } = await import('../game/js/vehicle/tuning.js');
const { KEI_ROUTE, KEI_CHECKPOINTS } = await import('../game/js/keiroute.js');
const { loadGameWorld } = await import('../scripts/worldload.mjs');

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info ? ` (${info})` : ''}`); } };
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

// --- 1. de waarden komen uit de echte spelregels (zoals de rest van de bot: geen tweede waarheid)
{
  const tuning = lees('game/js/vehicle/tuning.js');
  ok(/const BIKE_SPRINT_TOP = 1\.3;/.test(tuning), 'vehicle/tuning.js: de fietssprint is 1,3x');
  ok(/if \(v\.isBike\) return m\.fat \? .* : \{ top: 7 \* up \* sprint/.test(tuning), 'vehicle/tuning.js: een fiets doet 7 m/s');
  ok(Math.abs(Bk.BIKE_RACE.top - 7) < 1e-9 && Math.abs(Bk.BIKE_RACE.sprintTop - 7 * 1.3) < 1e-9, 'de bot rekent met dezelfde fiets en sprint', `${Bk.BIKE_RACE.top}/${Bk.BIKE_RACE.sprintTop}`);
  const player = lees('game/js/player.js');
  ok(new RegExp(`const BIKE_SPRINT_S = ${Bk.BIKE_RACE.sprintBurstS};`).test(player), 'player.js: de sprint duurt 2,5 s');
  ok(new RegExp(`const BIKE_SPRINT_REST_S = ${Bk.BIKE_RACE.sprintRestS};`).test(player), 'player.js: daarna 4 s uithijgen');
  const racers = lees('game/js/racers.js');
  const tops = [...racers.matchAll(/top: (6\.\d+), skill/g)].map((m) => Number(m[1]));
  ok(tops.length === 4, 'racers.js: vier KEI-rivalen', tops.join(' '));
  ok(Math.abs(Math.max(...tops) - Bk.BIKE_RACE.rivalTop) < 1e-9, 'de snelste rivaal is 6,85 m/s', String(Math.max(...tops)));
  const missions = lees('game/js/missions.js');
  ok(new RegExp(`const RACE_CHECKPOINT_RADIUS = ${Bk.BIKE_RACE.cpRadius};`).test(missions), 'missions.js: een checkpoint telt binnen 9 m');
  ok(/const PODIUM = 3;/.test(missions), 'missions.js: alleen het podium (top 3) telt');
  const defs = lees('game/js/missions_defs.js');
  ok(/waypoints: \[\.\.\.KEI_CHECKPOINTS\.slice\(1\)\.map\(kei\), kei\(0\)\]/.test(defs), 'M05: de wegpunten zijn de KEI-checkpoints in volgorde, met de finish (0) achteraan');
  ok(/race: 'kei'/.test(defs) && /requires: 'bike'/.test(defs), 'M05 is de KEI-fietsrace (race: kei, requires: bike)');
}

// --- 1b. de bedrading: de pagina, de runner en de status
{
  const page = lees('scripts/bot/bot.page.js');
  let parseOk = true, parseErr = '';
  try { new Function('return (async () => {\n' + page + '\n})'); } catch (e) { parseOk = false; parseErr = e.message; }
  ok(parseOk, 'bot.page.js parseert met de fietsrace erin', parseErr);
  ok(/const Bk = window\.__botBikeRace/.test(page), 'de pagina krijgt de fietsrace via run.mjs');
  ok(/async function bikeRaceStage/.test(page) && /Bk\.raceStep\(/.test(page), 'de pagina gebruikt raceStep');
  ok(/s\.mission\.race && s\.mission\.race\.bikes/.test(page), 'alleen bij een race op de fiets');
  ok(/B\.down\('shift'\)/.test(page), 'de sprint wordt ingedrukt gehouden');
  ok(/keiCheckpoints\(\)/.test(page) && /KEI_CHECKPOINTS\.slice\(1\)/.test(page), 'de checkpoints in de volgorde van de missie');
  const run = lees('scripts/bot/run.mjs');
  ok(/__botBikeRace = \(\(\) => \{/.test(run) && /bikerace\.mjs/.test(run), 'run.mjs geeft de fietsrace mee aan de pagina');
  const api = lees('game/js/playerapi.js');
  ok(/race: \(world\.race \|\| m\.race\)/.test(api), 'de status noemt de race (stand, aantal, fase, fietsen)');
  // de injectie van run.mjs zelf: de module als IIFE, zoals de pagina hem in het spel krijgt
  let injectOk = true, injectErr = '';
  try {
    const src = lees('scripts/bot/bikerace.mjs').replace(/^export (const|function|class) /gm, '$1 ');
    new Function('return (() => {\n' + src + '\nreturn { raceStep, BIKE_RACE };\n})');
  } catch (e) { injectOk = false; injectErr = e.message; }
  ok(injectOk, 'de injectie van run.mjs parseert (const/function zonder export)', injectErr);
}
// --- 2. de pure routestappen
{
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const info = Bk.routeInfo(square);
  ok(info.total === 400 && info.len.length === 4, 'de lengte van de lus', String(info.total));
  const a = Bk.aimAlong(square, 0, 150, info);
  ok(Math.abs(a.x - 100) < 1e-6 && Math.abs(a.y - 50) < 1e-6, '150 m langs een vierkant van 100 m: halverwege zijde 2', `${a.x},${a.y}`);
  const w = Bk.aimAlong(square, 3, 50, info);
  ok(Math.abs(w.x) < 1e-6 && Math.abs(w.y - 50) < 1e-6, 'over de hoek heen wikkelt de route door', `${w.x},${w.y}`);
  const near = Bk.nearestAhead(square, 0, { x: 120, y: 5 });
  ok(near.i === 1 && near.d < 25, 'het dichtstbijzijnde punt vooraan', `${near.i} ${Math.round(near.d)}`);
  const noBack = Bk.nearestAhead(square, 2, { x: 100, y: 5 }, 2);
  ok(noBack.i === 2, 'binnen het venster vooraan valt de bot niet achteruit terug in de lus', String(noBack.i));
  const route = Bk.rivalBoundS(square, info);
  ok(Math.abs(route - 400 / Bk.BIKE_RACE.rivalTop) < 1e-9, 'de ondergrens van de rivalen: lengte / topsnelheid', route.toFixed(1));
}

// --- 3. de racestap: checkpoints, sprint en de time-out
{
  const route = [[0, 0], [40, 0], [80, 0], [120, 0], [120, 40], [80, 40], [40, 40], [0, 40]];
  const cps = [{ x: 120, y: 0 }, { x: 120, y: 40 }, { x: 0, y: 40 }, { x: 0, y: 0 }];
  const mem = {};
  let s = { pos: { x: 0, y: 0, angle: 0, speed: 7 }, route, cps, routeFrom: 0, cpIndex: 0, t: 0, sprintRest: 0 };
  let step = Bk.raceStep(s, mem);
  ok(step.type === 'ride' && step.throttle === 1 && step.sprint === true, 'op topsnelheid: trappen en sprinten', JSON.stringify(step));
  ok(step.aim.x > s.pos.x && Math.abs(step.aim.y) < 1e-6, 'hij mikt vooruit langs de route, niet op het checkpoint', JSON.stringify(step.aim));
  ok(Math.abs(step.steer) < 0.01, 'recht op de lijn: geen stuur');
  s = { ...s, pos: { x: 20, y: 2, angle: 0, speed: 7 } };
  step = Bk.raceStep(s, mem);
  ok(step.steer < 0, 'iets rechts van de lijn: naar links sturen', String(step.steer));
  s = { ...s, pos: { x: 118, y: 0, angle: 0, speed: 7 } };
  step = Bk.raceStep(s, mem);
  ok(step.cpIndex === 1, 'binnen 9 m telt het checkpoint', String(step.cpIndex));
  // nooit dichterbij komen: na 25 s een time-out met het checkpoint erbij
  const mem2 = {};
  let t = 0, uit = null;
  for (; t < 60; t += 1) {
    uit = Bk.raceStep({ pos: { x: 500, y: 500, angle: 0, speed: 0 }, route, cps, routeFrom: 0, cpIndex: 0, t }, mem2);
    if (uit.type !== 'ride') break;
  }
  ok(uit && uit.type === 'timeout' && /checkpoint 1/.test(uit.why), 'stilhangen: een time-out met het checkpoint dat niet haalt', JSON.stringify(uit));
  ok(uit.forS >= Bk.BIKE_RACE.timeoutS, 'en de tijd zonder voortgang erbij', String(uit.forS));
  const mem3 = {};
  const klaar = Bk.raceStep({ pos: { x: 0, y: 0, angle: 0, speed: 7 }, route, cps, routeFrom: 0, cpIndex: cps.length, t: 0 }, mem3);
  ok(klaar.type === 'klaar', 'alle checkpoints gehad: klaar');
  ok(Bk.raceStep({ pos: { x: 0, y: 0 }, route: [], cps: [], t: 0 }, {}).type === 'timeout', 'geen route: time-out, geen eindeloze lus');
}

// --- 4. de race op de echte route, met de echte fiets en de echte kaart
{
  const T = await loadGameWorld();
  if (!T) { console.log('SKIP simulatie: geen game/world'); }
  else {
    const map = T.world;
    const R = KEI_ROUTE, CP = KEI_CHECKPOINTS;
    ok(R.length > 200 && CP.length === 9, 'de KEI-route is geladen', `${R.length} punten, ${CP.length} checkpoints`);
    const info = Bk.routeInfo(R);
    ok(info.total > 1300 && info.total < 1500, 'de lus is ongeveer 1,4 km', `${Math.round(info.total)} m`);

    // de KEI-racefiets van de speler: dezelfde fiets en tuning als in het spel
    const v = V.makeTwoWheeler('bike', R[0][0], R[0][1], Math.atan2(R[1][1] - R[0][1], R[1][0] - R[0][0]));
    v.driver = 'player';
    const tune = playerTune(v);
    ok(Math.abs(tune.top - Bk.BIKE_RACE.top) < 1e-9, 'de echte fiets doet 7 m/s', String(tune.top));

    const cps = CP.slice(1).map((i) => ({ x: R[i][0], y: R[i][1] })).concat([{ x: R[0][0], y: R[0][1] }]);
    const mem = {};
    let t = 0, cpIndex = 0, maxSpeed = 0, sprints = 0, uit = null, tijd = null;
    const DT = 1 / 60;
    let routeFrom = 0;
    for (; t < 400; t += DT) {
      // Shift wordt vastgehouden (zoals bot.page.js): player.js begint elke sprint vanzelf opnieuw
      v.sprintT = Math.max(0, (v.sprintT || 0) - DT);
      v.sprintRest = Math.max(0, (v.sprintRest || 0) - DT);
      if (!v.sprintRest) { v.sprintT = Bk.BIKE_RACE.sprintBurstS; v.sprintRest = Bk.BIKE_RACE.sprintBurstS + Bk.BIKE_RACE.sprintRestS; sprints++; }
      const step = Bk.raceStep({ pos: { x: v.x, y: v.y, angle: v.angle, speed: v.speed }, route: R, cps, routeFrom, cpIndex, t }, mem);
      routeFrom = step.routeIndex ?? routeFrom;
      if (step.type === 'timeout') { uit = step; break; }
      if (step.type === 'klaar') { tijd = t; cpIndex = cps.length; break; }
      cpIndex = step.cpIndex;
      v.applyControls(DT, step.throttle, step.steer, 0);
      V.resolveVehicleBuildingCollision(v, map, DT);
      maxSpeed = Math.max(maxSpeed, v.speed);
    }
    ok(!uit, 'geen time-out op de echte route', uit ? uit.why : '');
    ok(cpIndex >= cps.length, 'alle negen checkpoints in volgorde gehaald', `${cpIndex}/${cps.length}`);
    ok(tijd != null && tijd < Bk.rivalBoundS(R, info), 'de bot is sneller dan de ondergrens van de snelste rivaal', `${tijd && tijd.toFixed(1)} s < ${Bk.rivalBoundS(R, info).toFixed(1)} s`);
    // de vier rivalen op hun eigen topsnelheid: ze remmen in de bochten niet eens, dus dit is de
    // snelste tijd die ze ooit kunnen halen. De bot moet daar dus onder blijven voor het podium.
    const rivalen = [...lees('game/js/racers.js').matchAll(/top: (6\.\d+), skill/g)].map((m) => Number(m[1]));
    const stand = rivalen.map((top) => info.total / top).concat([tijd]).sort((a, b) => a - b);
    const plek = stand.indexOf(tijd) + 1;
    ok(plek === 1, 'eerste van het veld, zelfs tegen rivalen die niet remmen', `${plek}e van ${stand.length}: ${stand.map((x) => x.toFixed(1)).join(' / ')}`);
    ok(maxSpeed <= Bk.BIKE_RACE.sprintTop + 0.05 && maxSpeed >= Bk.BIKE_RACE.top, 'de snelheid blijft binnen de echte fiets (7 tot 9,1 m/s)', maxSpeed.toFixed(2));
    ok(sprints >= Math.floor(tijd / (Bk.BIKE_RACE.sprintBurstS + Bk.BIKE_RACE.sprintRestS)) - 1, 'de sprint komt elke ronde terug (lange race: meer dan eens)', `${sprints}x`);
    // het tijdsbudget van de missie: 58 s en +33 s per checkpoint (mission_defs.js M05)
    const budget = 58 + 33 * (cps.length - 1);
    ok(tijd < budget, 'binnen het tijdsbudget van M05 (58 s + 33 s per checkpoint)', `${tijd && tijd.toFixed(1)} s < ${budget} s`);
  }
}

console.log(fails ? `bot_bikerace_test: ${fails} van ${n} mislukt` : `bot_bikerace_test: ${n}/${n} ok`);
process.exit(fails ? 1 : 0);
