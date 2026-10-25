// Spelbot (#312): de kartrace van de kartbaan, zonder Electron of DOM. bot.page.js krijgt deze
// functies via run.mjs (als window.__botRace) en minigames.page.js gebruikt ze voor `kartbaan`;
// de spellogica blijft in game/js (kartrace.js, kartbaanspoor.js).
// De baan is dezelfde vorm als kartrace.js: { N, u, v, ang, s, curv, length, hw, step }. De kaart
// levert hem via window.__kartbaan.kart(0) en kartbaanspoor.js; deze module rekent alleen sturen,
// gas en de time-outs uit. Tests: scripts/botlogic_test.mjs (een ronde baan) en de minigame-run.

const TAU = Math.PI * 2;
export const wrap = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const RACE = {
  look: 7.5,        // meter vooruit op de ideale lijn
  speedLook: 0.5,   // per m/s komt er een halve meter bij
  gain: 2.4,        // stuurversterking (kartrace.js aiInput)
  aLat: 12.5,       // zijwaartse versnelling in de bocht
  topShare: 0.97,   // niet harder dan de top van de kart
  lane: 0,          // de bot rijdt op de middellijn
  avoid: 2.6,       // zoveel meter opzij voor een kart vlak voor hem
  driftCurve: 0.022,// vanaf deze kromming een drift (kartrace.js bestInput)
  driftMin: 14,     // en boven deze snelheid
  driftSteer: 0.35,
  gridS: 60,        // de startlichten duren nooit langer dan dit
  stuckS: 18,       // zolang zonder voortgang is de kart vast
  minProg: 5,       // meter voortgang die telt
  raceS: 180,       // een race van drie ronden past hier ruim in
};

// Waar een punt op de baan ligt: de dichtstbijzijnde hartlijn (rond een hint), de afstand tot de
// baan en de afstand langs de baan. Precies kartrace.js locate, zonder de game te importeren.
export function locate(track, x, y, hint = -1, win = 40) {
  const { N, u, v } = track;
  let best = -1, bd = Infinity;
  const check = (i) => {
    const d = (u[i] - x) * (u[i] - x) + (v[i] - y) * (v[i] - y);
    if (d < bd) { bd = d; best = i; }
  };
  if (hint < 0) for (let i = 0; i < N; i++) check(i);
  else for (let k = -win; k <= win; k++) check(((hint + k) % N + N) % N);
  return { i: best, off: Math.sqrt(bd), s: track.s[best], ang: track.ang[best] };
}

// Een punt op de baan, `look` meter verder, op de rijstrook van de bot.
export function pointAhead(track, s, look, lane = RACE.lane) {
  const i = (((Math.round((s + look) / track.step)) % track.N) + track.N) % track.N;
  const a = track.ang[i];
  return { x: track.u[i] - Math.sin(a) * lane, y: track.v[i] + Math.cos(a) * lane, ang: a, i };
}

// De scherpste kromming in de komende meters (kartrace.js aiInput) en de snelheid die hij toelaat.
export function cornerAhead(track, i, speed) {
  let curve = 0;
  const ahead = Math.round((14 + Math.max(0, speed) * 1.3) / track.step);
  for (let q = 0; q <= ahead; q += 2) curve = Math.max(curve, track.curv[(i + q) % track.N]);
  return { curve, speed: curve > 0.002 ? Math.sqrt(RACE.aLat / curve) : Infinity };
}

// De andere karts: eentje vlak voor de bot geeft een klein beetje opzij en een snelheidsplafond.
function traffic(k, others) {
  let shift = 0, cap = Infinity;
  if (!others || !others.length) return { shift, cap };
  const ca = Math.cos(k.a || 0), sa = Math.sin(k.a || 0);
  for (const o of others) {
    if (!o || o === k) continue;
    const dx = o.u - k.u, dy = o.v - k.v;
    const ahead = dx * ca + dy * sa, lat = -dx * sa + dy * ca;
    if (ahead > 0 && ahead < 10 && Math.abs(lat) < 2.4) {
      shift = -(lat >= 0 ? 1 : -1) * RACE.avoid;
      if (ahead < 4.5 && Math.abs(lat) < 1.5) cap = Math.min(cap, Math.max(2, o.f || 0));
    }
  }
  return { shift, cap };
}

// Eén tik van de kartrace. s = { phase, raceT, kart: { u, v, a, f, idx, prog, finished }, others }.
// Geeft { type: 'wacht' (startlichten), 'klaar', 'timeout' (met reden en cijfers) of 'rij' met
// { throttle, steer, drift, dist, corner } — digitaal, zoals de kartbaan zelf leest (W/S/A/D/Space).
// mem houdt de klok bij: zonder RACE.stuckS seconden voortgang of na RACE.raceS is het klaar.
export function kartStep(s, track, mem = {}, now = 0) {
  const k = s.kart || {};
  if (s.phase === 'grid') {
    if (mem.gridAt == null) mem.gridAt = now;
    if (now - mem.gridAt > RACE.gridS) return { type: 'timeout', why: 'startlichten gaan niet uit', forS: now - mem.gridAt };
    return { type: 'wacht' };
  }
  mem.gridAt = null;
  if (k.finished || s.phase === 'outro' || s.phase === 'finish') return { type: 'klaar', prog: k.prog };
  if (!track || !Number.isFinite(k.u) || !Number.isFinite(k.v)) return { type: 'wacht', why: 'geen baan' };
  if (mem.t0 == null) { mem.t0 = now; mem.best = k.prog ?? 0; mem.bestAt = now; mem.lap = k.lap ?? 0; }
  if (now - mem.t0 > RACE.raceS) return { type: 'timeout', why: 'race duurde te lang', forS: now - mem.t0, prog: k.prog, lap: k.lap };
  // voortgang: de afgelegde afstand langs de baan (kartrace.js updateProgress)
  if (Number.isFinite(k.prog) && k.prog > mem.best + RACE.minProg) { mem.best = k.prog; mem.bestAt = now; }
  if (now - mem.bestAt > RACE.stuckS) return { type: 'timeout', why: 'kart komt niet verder', forS: now - mem.bestAt, prog: k.prog, lap: k.lap };
  const here = locate(track, k.u, k.v, k.idx ?? -1);
  const look = RACE.look + Math.max(0, k.f || 0) * RACE.speedLook;
  const traf = traffic(k, s.others);
  const lane = clamp((k.lane || 0) + traf.shift, -track.hw + 1.2, track.hw - 1.2);
  const tgt = pointAhead(track, here.s, look, lane);
  const want = Math.atan2(tgt.y - k.v, tgt.x - k.u);
  const steer = clamp(wrap(want - (k.a || 0)) * RACE.gain, -1, 1);
  const ahead = cornerAhead(track, here.i, k.f || 0);
  const vt = Math.min(RACE.topShare * 24, ahead.speed, traf.cap);
  const f = k.f || 0;
  const throttle = f < vt - 1 ? 1 : f > vt + 2.5 ? -1 : 0;
  // een drift in een lange bocht: de handrem erop, de kart houdt zijn boog en laadt een boost
  const drift = ahead.curve > RACE.driftCurve && f > RACE.driftMin && Math.abs(steer) > RACE.driftSteer;
  return { type: 'rij', throttle, steer, drift, dist: here.off, corner: ahead.speed === Infinity ? null : ahead.speed, curve: ahead.curve, prog: k.prog, lap: k.lap, look };
}

// De uitslag uit de stand van de kartbaan: de eigen plek (1 is eerste) en of de race klaar is.
// state.karts staat in scheppingsorde; de finish en de afgelegde afstand bepalen de volgorde.
export function raceResult(state, i = 0) {
  const karts = (state && state.karts) || [];
  if (!karts.length) return null;
  const rank = [...karts].sort((a, b) => (a.finished && b.finished ? (a.finishT ?? 0) - (b.finishT ?? 0) : a.finished ? -1 : b.finished ? 1 : (b.prog || 0) - (a.prog || 0)));
  const plek = rank.indexOf(karts[i]) + 1;
  return { plek, karts: karts.length, klaar: !!karts[i] && !!karts[i].finished, rondes: karts[i] ? karts[i].lap : 0, beste: rank[0] && rank[0].name };
}
