// Spelbot (#312): de fietsrace van M05 (de KEI-week), zonder Electron of DOM. bot.page.js krijgt
// deze functies via run.mjs (als window.__botBikeRace) en drukt alleen sturen, trappen en Shift;
// de spellogica blijft in game/js.
//
// De waarden komen uit de echte spelregels:
//  - vehicle/tuning.js playerTune: een fiets doet 7 m/s, met Shift 1,3x = 9,1 m/s en 1,8x acceleratie;
//  - player.js: BIKE_SPRINT_S 2,5 s sprint, daarna BIKE_SPRINT_REST_S 4 s uithijgen (Shift opnieuw
//    ingedrukt houden start de volgende sprint zodra hij terug is);
//  - racers.js BIKE_RIVALS: de vier KEI-rivalen toppen op 6,85 / 6,75 / 6,6 / 6,4 m/s;
//  - missions.js: RACE_CHECKPOINT_RADIUS 9 m, en alleen het podium (top 3) telt.
//
// De missie geeft alleen de negen checkpointmarkers; de straat ertussen is de KEI-route
// (game/js/keiroute.js). Wie van marker naar marker stuurt, snijdt door de bebouwing van de
// binnenstad. Daarom volgt de bot de routelijn zelf: vooruitkijken langs de punten, mikken op een
// punt 5 tot 10 m verderop, en zodra een checkpoint binnen 9 m komt telt hij hem (dezelfde regel
// als missions.js waypointReached).
// Tests: scripts/bot_bikerace_test.mjs (de regels en een simulatie op de echte route met de echte
// fietsregels en de echte kaart).

export const BIKE_RACE = {
  top: 7,            // playerTune: de topsnelheid van een fiets zonder sprint (m/s)
  sprintTop: 9.1,    // 7 x BIKE_SPRINT_TOP 1,3
  lookMin: 5,        // m vooruit bij stilstand
  lookMax: 10,       // m vooruit op topsnelheid
  lookPerSpeed: 0.9, // m per m/s extra: sneller is verder vooruitkijken
  steerGain: 2.2,    // stuur per rad koersfout
  cpRadius: 9,       // missions.js RACE_CHECKPOINT_RADIUS
  advance: 12,       // m: dichter dan dit bij een routepunt telt als "hier"
  sprintBurstS: 2.5, // player.js BIKE_SPRINT_S
  sprintRestS: 4,    // player.js BIKE_SPRINT_REST_S
  rivalTop: 6.85,    // racers.js BIKE_RIVALS[0].top (de snelste van de vier)
  progressM: 4,      // zoveel dichterbij het checkpoint telt als voortgang
  timeoutS: 25,      // zolang zonder voortgang: de race is vastgelopen
  maxS: 420,         // nooit eindeloos doorrijden
};

const TAU = Math.PI * 2;
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// De lengte van elke routezijde en van de hele lus (voor de bovengrens van de rivalen).
export function routeInfo(route) {
  const n = route.length;
  const len = new Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    len[i] = Math.hypot(route[j][0] - route[i][0], route[j][1] - route[i][1]);
    total += len[i];
  }
  return { len, total };
}

// Het punt `d` meter verderop langs de lus, vanaf routepunt `from`. Geeft { x, y, i }.
export function aimAlong(route, from, d, info = null) {
  const n = route.length;
  const L = info || routeInfo(route);
  let i = ((from % n) + n) % n, rest = Math.max(0, d);
  for (let k = 0; k < n; k++) {
    const j = (i + 1) % n, seg = L.len[i];
    if (seg >= rest && seg > 1e-6) {
      const f = rest / seg;
      return { x: route[i][0] + (route[j][0] - route[i][0]) * f, y: route[i][1] + (route[j][1] - route[i][1]) * f, i };
    }
    rest -= seg;
    i = j;
  }
  return { x: route[i][0], y: route[i][1], i };
}

// Het dichtstbijzijnde routepunt vooraan vanaf `from` (de route is een lus, dus de bot kan niet
// achteruit terugvallen). Geeft { i, d }.
export function nearestAhead(route, from, pos, window = 25) {
  const n = route.length;
  const start = ((from % n) + n) % n;
  let best = start, bd = Infinity;
  for (let k = 0; k < Math.min(window, n); k++) {
    const i = (start + k) % n;
    const d = Math.hypot(pos.x - route[i][0], pos.y - route[i][1]);
    if (d < bd) { bd = d; best = i; }
  }
  return { i: best, d: bd };
}

// De snelste tijd die een rivaal ooit kan halen: de routelengte gedeeld door zijn topsnelheid.
// De echte rivalen remmen in de bochten (racers.js), dus dit is een ondergrens voor hun tijd.
export const rivalBoundS = (route, info = null, top = BIKE_RACE.rivalTop) => (info || routeInfo(route)).total / Math.max(0.1, top);

// Eén tik van de fietsrace. s = { pos: { x, y, angle, speed }, route, cps: [{ x, y }] (in de
// volgorde van de missie), routeFrom, cpIndex, t, sprintRest }. mem houdt de voortgang bij.
// Geeft { type: 'ride', aim, routeIndex, cpIndex, steer, throttle, sprint } of
// { type: 'klaar' } / { type: 'timeout', why, forS }.
export function raceStep(s, mem = {}) {
  const route = s.route;
  if (!Array.isArray(route) || route.length < 3) return { type: 'timeout', why: 'geen route', forS: 0 };
  const info = mem.info || (mem.info = routeInfo(route));
  const pos = s.pos || { x: 0, y: 0, angle: 0, speed: 0 };
  const t = Number.isFinite(s.t) ? s.t : 0;
  if (mem.startedAt == null) { mem.startedAt = t; mem.lastProgressAt = t; }
  if (t - mem.startedAt > BIKE_RACE.maxS) return { type: 'timeout', why: 'race duurt te lang', forS: t - mem.startedAt };

  // waar op de route staat de bot, en welk punt is het volgende
  let from = Number.isFinite(s.routeFrom) ? s.routeFrom : 0;
  const near = nearestAhead(route, from, pos);
  if (near.d < BIKE_RACE.advance) from = near.i;
  mem.routeFrom = from;

  // de checkpoints in de volgorde van de missie
  const cps = s.cps || [];
  let cpIndex = Math.max(0, s.cpIndex | 0);
  if (!cps.length) return { type: 'klaar' };
  if (cpIndex >= cps.length) return { type: 'klaar' };
  const cp = cps[cpIndex];
  const cd = Math.hypot(pos.x - cp.x, pos.y - cp.y);
  // voortgang naar dit checkpoint: dichterbij komen telt; stilhangen is een time-out
  if (mem.cp != null && mem.cp !== cpIndex) { mem.lastCpDist = Infinity; mem.lastProgressAt = t; }
  mem.cp = cpIndex;
  if (!Number.isFinite(mem.lastCpDist)) mem.lastCpDist = cd;
  if (cd < mem.lastCpDist - BIKE_RACE.progressM) { mem.lastCpDist = cd; mem.lastProgressAt = t; }
  if (cd < BIKE_RACE.cpRadius) {
    cpIndex++;
    mem.lastCpDist = Infinity;
    mem.lastProgressAt = t;
    if (cpIndex >= cps.length) return { type: 'klaar' };
    return { type: 'ride', aim: aimAlong(route, from, BIKE_RACE.lookMin, info), routeIndex: from, cpIndex, steer: 0, throttle: 1, sprint: false };
  }
  const stil = t - (mem.lastProgressAt ?? t);
  if (stil > BIKE_RACE.timeoutS) return { type: 'timeout', why: `geen voortgang naar checkpoint ${cpIndex + 1} (${Math.round(cd)} m)`, forS: stil };

  // mikken op een punt vooruit langs de route; op topsnelheid kijkt hij verder
  const look = clamp(BIKE_RACE.lookMin + (pos.speed || 0) * BIKE_RACE.lookPerSpeed, BIKE_RACE.lookMin, BIKE_RACE.lookMax);
  const aim = aimAlong(route, from, look, info);
  const err = wrap(Math.atan2(aim.y - pos.y, aim.x - pos.x) - (pos.angle || 0));
  const steer = clamp(err * BIKE_RACE.steerGain, -1, 1);
  // Shift ingedrukt houden: elke keer dat de sprint terug is, begint hij opnieuw (player.js)
  const sprint = (s.sprintRest || 0) <= 0;
  return { type: 'ride', aim, routeIndex: from, cpIndex, steer, throttle: 1, sprint, steerErr: err };
}
