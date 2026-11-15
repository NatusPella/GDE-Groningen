import { hoofdspeler } from './players.js';
// The `rit` stage of a stages mission (missions.js): Tammo drives the stopped museum steam train a short
// stretch to the next platform with gas and brake only (M19 Stoom, light version of docs/verhaal/nieuw
// 08-IMPLEMENTATIE §3c). Tessa's walk through the carriages is the script's scene, not physics.
//
// st { kind: 'rit', target: <boarding platform>, length (m of track to the next platform), radius, vmax,
//      late (fail reason: through the station), board (hint), brake (hint), train (a treintype: 'stoom' voor de
//      museumtrein van M19), fallbackSay }
// The train is the real railway.js one: a parked/dwelling train at the platform, or, when the world has a
// line there but no train, a mission train of the requested type parked at the platform. Without any line near
// the platform (the tile world of the south may lack the museum line) the ride cannot be driven: the player
// must walk to the platform and ask the conductor (E), so standing still at the start never passes (#951).
import { getTrains, getRoutes, routePoint, addMissionTrain, parkTrain, clearTrackFor, placeTrain } from './railway.js';
import { groepKlaar, WACHT_OP_ANDEREN } from './stagegroep.js';

const NEAR_LINE = 120;   // m: a route this close to the platform counts as the line
const NEAR_TRAIN = 70;   // m: a parked or dwelling train this close is the train
const SAMPLE = 5;

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
  // an existing train at the platform (van dezelfde soort: een gewone stoptrein
  // is niet de museumtrein van deze missie, #951)
  let train = null, bd = NEAR_TRAIN;
  for (const t of getTrains()) {
    if (t.state !== 'dwell' && t.state !== 'parked') continue;
    if (st.train && t.type !== st.train) continue;
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
    // #951: de museumtrein zelf, niet de eerste de beste stoptrein van de lijn
    train = addMissionTrain(route.name, st.train || route.train || 'gtw', s0, dir);
    if (!train) { R.fallback = true; return; }
    // the cab end that points down the line stands at the platform
    train.c = s0 - dir * (train.halfLen - 3);
    parkTrain(train);
    R.created = true;
    // de dienstregeling van de lijn houdt afstand van de museumtrein (#951),
    // anders staat de gewone stoptrein op dezelfde plek op het spoor.
    const s1 = Math.max(0, Math.min(route.len, s0 + dir * length));
    clearTrackFor(train, Math.min(s0, s1), Math.max(s0, s1), world, 300);
    // Een trein die hier stilstaat kan de speler per ongeluk instappen; dan rijdt
    // hij niet de museumtrein en komt de rit nooit verder. Stuur hem naar het verre
    // uiteinde van zijn eigen lijn.
    for (const t of getTrains()) {
      if (t === train || t.state === 'player' || t.state === 'mission' || (world && world.trainDriving === t)) continue;
      const mid = t.cars[t.cars.length >> 1];
      if (Math.hypot(mid.x - at.x, mid.y - at.y) > 90) continue;
      const stops = t.route.stops;
      let best = 0, bd = -1;
      for (let i = 0; i < stops.length; i++) {
        const d = Math.abs(stops[i].s - s0);
        if (d > bd) { bd = d; best = i; }
      }
      Object.assign(t, { c: stops[best].s, target: best, state: 'dwell', v: 0, pv: 0, dir: best === 0 ? 1 : -1, timer: 300, ctl: null });
      placeTrain(t);
    }
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
    // #951: geen lijn in deze wereld. Vroeger speelde de stage zichzelf na 9 s af,
    // waardoor stilstaan bij de start de missie al haalde. Nu moet de speler naar
    // het perron lopen en daar met E de conducteur aanspreken.
    if (!R.said) { R.said = 1; world.addMessage(st.fallbackSay || 'De trein staat hier niet: loop naar het perron en vraag de conducteur.', 4); }
    const p = hoofdspeler(world);
    const at = S.target || R.platform || p;
    if (Math.hypot(p.x - at.x, p.y - at.y) > 30) return null;
    if (world.input && world.input.wasPressed && world.input.wasPressed('e')) { R.boarded = true; return 'done'; }
    hint(world, 'Geen trein op dit spoor: druk op E bij het perron.');
    return null;
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


