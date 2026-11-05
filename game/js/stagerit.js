import { hoofdspeler } from './players.js';
// The `rit` stage of a stages mission (missions.js): Tammo drives the stopped museum steam train a short
// stretch to the next platform with gas and brake only (M19 Stoom, light version of docs/verhaal/nieuw
// 08-IMPLEMENTATIE §3c). Tessa's walk through the carriages is the script's scene, not physics.
//
// st { kind: 'rit', target: <boarding platform>, length (m of track to the next platform), radius, vmax,
//      late (fail reason: through the station), board (hint), brake (hint) }
// The train is the real railway.js one: a parked/dwelling train at the platform, or, when the world has a
// line there but no train, one of the line's trains parked at the platform. Without any line near the
// platform (the tile world of the south may lack the museum line) the ride is told as a scene: the stage
// passes by itself after a few seconds, so the story never dead-ends.
import { getTrains, getRoutes, routePoint, addMissionTrain, parkTrain } from './railway.js';
import { groepKlaar, WACHT_OP_ANDEREN } from './stagegroep.js';

const NEAR_LINE = 120;   // m: a route this close to the platform counts as the line
const NEAR_TRAIN = 70;   // m: a parked or dwelling train this close is the train
const SAMPLE = 5;
const FALLBACK_S = 9;

function nearestOnRoute(route, x, y) {
  let best = 0, bd = Infinity;
  for (let s = 0; s <= route.len; s += SAMPLE) {
    const [px, py] = routePoint(route, s);
    const d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bd) { bd = d; best = s; }
  }
  return { s: best, d: Math.sqrt(bd) };
}

// per stage start; S.target is the boarding platform { x, y }
export function enterRit(world, st, S) {
  const R = S.rit = { boarded: false, reached: false, fallback: false, train: null, platform: null, said: 0 };
  const at = S.target;
  if (!at) { R.fallback = true; return; }
  // an existing train at the platform
  let train = null, bd = NEAR_TRAIN;
  for (const t of getTrains()) {
    if (t.state !== 'dwell' && t.state !== 'parked') continue;
    const mid = t.cars[t.cars.length >> 1];
    const d = Math.hypot(mid.x - at.x, mid.y - at.y);
    if (d < bd) { bd = d; train = t; }
  }
  let route = train ? train.route : null, s0 = 0;
  if (!route) {
    let best = null, rd = NEAR_LINE;
    for (const r of getRoutes()) {
      const n = nearestOnRoute(r, at.x, at.y);
      if (n.d < rd) { rd = n.d; best = { r, s: n.s }; }
    }
    if (!best) { R.fallback = true; return; }
    route = best.r; s0 = best.s;
  } else s0 = nearestOnRoute(route, at.x, at.y).s;
  const length = st.length || 2500;
  const dir = route.len - s0 > length + 150 ? 1 : -1;
  if (!train) {
    train = addMissionTrain(route.name, route.train || 'gtw', s0, dir);
    if (!train) { R.fallback = true; return; }
    // the cab end that points down the line stands at the platform
    train.c = s0 - dir * (train.halfLen - 3);
    parkTrain(train);
  }
  R.train = train;
  R.dir = dir;
  R.route = route;
  const [px, py] = routePoint(route, Math.max(0, Math.min(route.len, s0 + dir * length)));
  R.platform = { x: px, y: py };
}

// per frame. Returns 'done', { fail: reason } or null.
export function updateRit(dt, world, st, S, hint) {
  const R = S.rit;
  if (R.fallback) {
    if (S.t < 1.2 && !R.said) { R.said = 1; world.addMessage(st.fallbackSay || 'De trein rijdt vanzelf het volgende perron in.', 4); }
    return S.t > FALLBACK_S ? 'done' : null;
  }
  // Samen spelen (#525): de rit begint pas als de hele groep op het perron staat;
  // wie achterloopt krijgt de wachtmelding en de trein blijft staan.
  if (!R.boarded && !groepKlaar(world, { iedereen: true }, S.target || hoofdspeler(world), 45)) {
    hint(world, WACHT_OP_ANDEREN);
    return null;
  }
  const driving = world.trainDriving;
  if (!driving) {
    if (R.boarded) {
      // got out again: fine at the platform, otherwise back in
      const d = Math.hypot(hoofdspeler(world).x - R.platform.x, hoofdspeler(world).y - R.platform.y);
      if (R.reached || d < (st.radius || 40)) return 'done';
      hint(world, st.board || 'Terug in de cabine: E bij de kop van de trein.');
      return null;
    }
    hint(world, st.board || 'Stap in de cabine van de stilstaande trein: E bij de kop.');
    return null;
  }
  if (driving !== R.train) return null;
  R.boarded = true;
  const car = driving.cars[driving.cab > 0 ? 0 : driving.cars.length - 1];
  const d = Math.hypot(car.x - R.platform.x, car.y - R.platform.y);
  const radius = st.radius || 40;
  if (d < radius) {
    R.reached = true;
    if (driving.v < 2) {
      if (!st.exit) return 'done';
      hint(world, 'Uitstappen met E. Dan stappen de juryleden uit.');
      return null;
    }
    hint(world, st.brake || 'Het perron: remmen met S, nu!');
    return null;
  }
  if (R.reached && d > radius + 70) return { fail: st.late || 'de trein reed door het station' };
  if (!R.said && S.t > 6) { R.said = 1; world.addMessage('W is gas, S is rem. Het volgende perron ligt verderop langs het spoor.', 4); }
  return null;
}


