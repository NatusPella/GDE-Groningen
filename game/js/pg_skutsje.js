import { Vehicle } from './vehicle.js';
import { getVehicleMesh, animateSkutsjeRig } from './models3d_vehicles.js';
import { buildPersonMesh, seatPerson, seatedY } from './models3d_people.js';
import { BOAT_KINDS, boatSeats } from './boattypes.js';
import { JELLE_LOOK } from './storycast.js';
import { routeAt, prepareDiepenringRoute, diepenringProgress } from './rondvaartchase.js';
import { getChallengeRecord } from './achievements.js';
import { pointInPolygon, isInWater, boatDryPoints, clamp } from './util.js';
import { finish, jelle, setTarget } from './postgame.js';

// Skûtsje-sprint: two skûtsjes, no motors, from the Oosterhaven along the
// southern Diepenring to the Hoge der A. Speed comes from the wind
// (world.weather.windAngle) and the point of sail: close to the wind a
// skûtsje barely moves, a beam reach is fastest. The player trims the sail
// (Q in, Z out) to the ideal angle for the current course; Jelle sails the
// line with a good but not perfect trim. Under a bridge both strike their
// mast and slow down. Finish = brons, beat Jelle = zilver, by 12 s = goud.

const FROM = [744, 390];
const TO = [-376, 280];
const GATE_EVERY = 160;
const LIMIT = 600;
const DEG = Math.PI / 180;
const TRIM_RATE = 45 * DEG;
const JELLE_TRIM = 0.9;
const GOLD_MARGIN = 12;

let leftover = null;

// Share of full speed per angle off the wind (0 = head to wind, PI = running).
export function sailPolar(theta) {
  const t = theta / DEG;
  if (t < 30) return 0.12;
  if (t < 50) return 0.12 + (t - 30) / 20 * 0.58;
  if (t < 100) return 0.7 + (t - 50) / 50 * 0.3;
  if (t < 150) return 1 - (t - 100) / 50 * 0.08;
  return 0.92 - (t - 150) / 30 * 0.14;
}

// Boom angle off the centre line that suits this angle off the wind.
export function idealTrim(theta) {
  return clamp(theta / 2 - 10 * DEG, 8 * DEG, 80 * DEG);
}

function windFrom(w) {
  const a = w.weather && Number.isFinite(w.weather.windAngle) ? w.weather.windAngle : 0.4;
  return a + Math.PI;
}

function offWind(heading, wf) {
  return Math.abs(Math.atan2(Math.sin(wf - heading), Math.cos(wf - heading)));
}

// the boom swings to the side away from the wind
function boomSide(heading, wf) {
  return Math.sin(wf - heading) > 0 ? -1 : 1;
}

function bridgeAhead(map, v, reach = 11) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  for (let k = -3; k <= reach; k += 2) if (map.isOnBridge(v.x + c * k, v.y + s * k)) return true;
  return false;
}

function waterPolyAt(map, x, y) {
  return map.waterNear(x, y, 1).find((q) => pointInPolygon(x, y, q.pts)) || null;
}

function removeBoat(w, v) {
  if (!v) return;
  const i = w.vehicles.indexOf(v);
  if (i >= 0 && v.driver !== 'player') w.vehicles.splice(i, 1);
}

function skipperFigure(v, look, key) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh || mesh.userData[key]) return;
  const seat = boatSeats(v)[0];
  const m = buildPersonMesh(look.shirt, look.skin, look);
  seatPerson(m, false, seat.pose);
  m.position.set(seat.x, seatedY(m, seat.y), seat.z);
  m.rotation.y = seat.face || 0;
  mesh.add(m);
  mesh.userData[key] = m;
}

// The quay-side start: slide from the route line towards the bank while a
// skûtsje still fits.
function berthBeside(map, s, side) {
  const q = routeAt(s);
  const nx = -Math.sin(q.a) * side, ny = Math.cos(q.a) * side;
  const probe = { model: { len: BOAT_KINDS.skutsje.len, wid: BOAT_KINDS.skutsje.wid } };
  let best = { x: q.x, y: q.y };
  for (let o = 0; o <= 5; o += 0.5) {
    const x = q.x + nx * o, y = q.y + ny * o;
    if (boatDryPoints(map, probe, x, y, q.a) > 0) break;
    best = { x, y };
  }
  return { ...best, a: q.a };
}

function fmt(s) {
  const t = Math.max(0, s), m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

export const SKUTSJE = {
  id: 'skutsje',
  name: 'Skûtsje-sprint',
  blurb: 'Zeilen zonder motor, van de Oosterhaven naar de Hoge der A',
  icon: 'jelle',
  jelle: true,
  banter: 'post-skutsje',
  spots(world) {
    const map = world.map;
    prepareDiepenringRoute(map);
    const s = diepenringProgress(FROM[0], FROM[1]).s;
    const q = routeAt(s);
    // the start marker on the quay beside the start
    for (const side of [1, -1]) {
      const nx = -Math.sin(q.a) * side, ny = Math.cos(q.a) * side;
      for (let o = 4; o <= 40; o += 1) {
        const x = q.x + nx * o, y = q.y + ny * o;
        if (isInWater(map, x, y)) continue;
        const [ex, ey] = map.escapeBuilding(x + nx * 1.5, y + ny * 1.5, 0.4);
        return [{ x: ex, y: ey, name: 'Skûtsje-sprint in de Oosterhaven', sub: 'Jelle heeft twee skûtsjes klaarliggen', s, side }];
      }
    }
    return [];
  },
  verb: () => 'Skûtsje-sprint tegen Jelle',
  start(run) {
    const w = run.world, map = w.map;
    prepareDiepenringRoute(map);
    if (leftover) { removeBoat(w, leftover); leftover = null; }
    const s0 = diepenringProgress(FROM[0], FROM[1]).s;
    const s1 = diepenringProgress(TO[0], TO[1]).s;
    if (!(s1 > s0 + 300)) return 'Het skûtsje ligt nog niet klaar';
    const gates = [];
    for (let s = s0 + GATE_EVERY; s < s1 - 40; s += GATE_EVERY) gates.push(s);
    gates.push(s1);
    const cps = gates.map((s) => { const q = routeAt(s); return { s, x: q.x, y: q.y }; });
    const side = run.spot.data.side || 1;
    const pb = berthBeside(map, s0, side), jb = berthBeside(map, s0 + 4, -side);
    const boat = new Vehicle(pb.x, pb.y, pb.a, { ...BOAT_KINDS.skutsje, color: '#1b1d1f' });
    boat.isBoat = true;
    boat.missionCar = true;
    boat.waterPoly = waterPolyAt(map, boat.x, boat.y);
    boat.sailTop = 0;
    w.vehicles.push(boat);
    const jv = new Vehicle(jb.x, jb.y, jb.a, { ...BOAT_KINDS.skutsje, color: '#141a2a' });
    jv.isBoat = true;
    jv.scripted = true;
    jv.missionCar = true;
    jv.driver = 'jelle';
    jv.label = 'Skûtsje Us Heit';
    w.vehicles.push(jv);
    const p = w.player;
    p.x = boat.x; p.y = boat.y;
    p.enterVehicle(boat, w);
    const c = w.companion;
    if (c && c.state !== 'dead' && !c.inVehicle) { c.x = boat.x; c.y = boat.y; c.water = null; c.swimming = false; c.inVehicle = boat; boat.passenger = 'companion'; }
    w.noLookBack = true;
    Object.assign(run.data, {
      boat, jv, cps, cp: 0, s0, s1, ps: s0, pi: null, js: s0 + 4, jspeed: 0, jlat: jb, jfin: null,
      trim: 30 * DEG, elapsed: 0, go: false, count: 3.5, pos: 2, lastPos: 2, offT: 0, said: 0, eff: 0, strike: 0,
    });
    return true;
  },
  keys(run, input) {
    const d = run.data;
    d.trimIn = input.isDown('q');
    d.trimOut = input.isDown('z');
    input.consume('q');
  },
  update(run, dt) {
    const w = run.world, d = run.data, p = w.player, map = w.map;
    const boat = d.boat, jv = d.jv;
    skipperFigure(jv, JELLE_LOOK, 'pgJelle');
    if (!w.vehicles.includes(jv)) w.vehicles.push(jv);
    if (boat.wrecked || boat.sinking) { finish(run, { success: false, medal: 0, reason: 'Je skûtsje is gezonken. Jelle haalt zijn pet af.', stats: [] }); return; }
    if (p.inVehicle !== boat) {
      d.offT += dt;
      if (d.offT > 10) { finish(run, { success: false, medal: 0, reason: 'Van boord gestapt. Een schipper verlaat zijn schip niet.', stats: [] }); return; }
    } else d.offT = 0;
    const wf = windFrom(w);
    // the player's sail
    if (d.trimIn) d.trim -= TRIM_RATE * dt;
    if (d.trimOut) d.trim += TRIM_RATE * dt;
    d.trim = clamp(d.trim, 5 * DEG, 85 * DEG);
    const theta = offWind(boat.angle, wf);
    const ideal = idealTrim(theta);
    const trimEff = clamp(1 - ((d.trim - ideal) / (35 * DEG)) ** 2, 0.3, 1);
    const strike = bridgeAhead(map, boat) ? 1 : 0;
    d.eff = sailPolar(theta) * trimEff;
    boat.sailTop = d.go ? (1.4 + 7.4 * d.eff) * (strike ? 0.5 : 1) : 0;
    animateSkutsjeRig(boat, boomSide(boat.angle, wf) * d.trim, strike, w.time);
    d.strike = strike;
    if (!d.go) {
      d.count -= dt;
      boat.speed = 0;
      w.startLockUntil = d.count > 0 ? w.time + 0.25 : 0;
      if (d.count <= 1 && !d.said) { d.said = 1; jelle(run, 'go', true); }
      w.addMessage(d.count > 0.5 ? String(Math.ceil(d.count - 0.5)) : 'SEIL LOS!', 0.4, { key: 'pg-count', exact: true });
      if (d.count <= 0) d.go = true;
      placeJelle(run, 0, wf);
      setTarget(d.cps[0]);
      return;
    }
    d.elapsed += dt;
    const pr = diepenringProgress(boat.x, boat.y, d.pi);
    d.pi = pr.i;
    if (pr.d < 60) d.ps = pr.s;
    const cp = d.cps[d.cp];
    if (cp && (d.ps >= cp.s - 4 && pr.d < 26 || Math.hypot(boat.x - cp.x, boat.y - cp.y) < 12)) {
      d.cp++;
      if (d.cp >= d.cps.length) { end(run); return; }
      setTarget(d.cps[d.cp]);
    }
    placeJelle(run, dt, wf);
    if (d.jfin == null && d.js >= d.s1) { d.jfin = d.elapsed; d.js = d.s1; }
    d.pos = d.jfin != null || d.js > d.ps + 2 ? 2 : 1;
    if (d.pos !== d.lastPos) { jelle(run, d.pos === 1 ? 'behind' : 'lead', true); d.lastPos = d.pos; }
    else if (run.t - run.lastSay > 26) jelle(run, d.pos === 1 ? 'behind' : 'lead');
    const gap = d.js - d.ps;
    const trimTxt = Math.abs(d.trim - ideal) < 8 * DEG ? 'goed' : d.trim > ideal ? 'te ver uit (Q)' : 'te strak (Z)';
    run.ui.setRows([['Jelle', d.jfin != null ? 'is al binnen' : `${Math.round(Math.abs(gap))} m ${gap > 0 ? 'voor' : 'achter'}`], ['Zeil', trimTxt], ['Vaart', `${Math.round(d.eff * 100)}%`]]);
    const idealPct = (ideal / (85 * DEG)) * 100, curPct = (d.trim / (85 * DEG)) * 100;
    run.ui.setSlot(`<div class="pg-bar"><i style="left:${Math.max(0, idealPct - 9).toFixed(1)}%;width:18%"></i><i class="gold" style="left:${Math.max(0, idealPct - 3).toFixed(1)}%;width:6%"></i><u style="left:${curPct.toFixed(1)}%"></u></div>` +
      `<div class="pg-help"><kbd>Q</kbd> zeil aanhalen · <kbd>Z</kbd> zeil vieren${d.strike ? ' · mast gestreken voor de brug' : ''}${theta < 35 * DEG ? ' · je vaart pal tegen de wind in' : ''}</div>`);
    if (d.elapsed > LIMIT) finish(run, { success: false, medal: 0, reason: 'Windstil? Te laat aan de Hoge der A.', stats: [] });
  },
  hud(run) {
    const d = run.data;
    const rec = getChallengeRecord('skutsje');
    return { pos: d.go ? d.pos : null, total: 2, elapsed: d.elapsed, timeLeft: Math.max(0, LIMIT - d.elapsed), cp: Math.min(d.cps.length, d.cp + 1), cpTotal: d.cps.length, lap: null, laps: null, best: rec && rec.best != null ? rec.best : null };
  },
  stop(run) {
    const w = run.world, d = run.data;
    w.noLookBack = false;
    if (d.jv) removeBoat(w, d.jv);
    if (d.boat) {
      d.boat.sailTop = 4.5;
      if (w.player.inVehicle === d.boat) leftover = d.boat;
      else removeBoat(w, d.boat);
    }
  },
  idle(world) {
    if (!leftover) return;
    if (world.player.inVehicle === leftover) animateSkutsjeRig(leftover, 0.5, bridgeAhead(world.map, leftover) ? 1 : 0, world.time);
    else if (Math.hypot(leftover.x - world.player.x, leftover.y - world.player.y) > 120) { removeBoat(world, leftover); leftover = null; }
  },
  debugWin(run) {
    const d = run.data;
    d.go = true;
    d.cp = d.cps.length - 1;
    d.ps = d.s1;
    d.js = d.s1 - 200;
    end(run);
  },
  debugState(run) {
    const d = run.data;
    return { cp: d.cp, of: d.cps.length, ps: Math.round(d.ps), js: Math.round(d.js), eff: Math.round(d.eff * 100), trim: Math.round(d.trim / DEG) };
  },
};

function placeJelle(run, dt, wf) {
  const d = run.data, w = run.world, v = d.jv;
  const q = routeAt(d.js);
  const theta = offWind(q.a, wf);
  const strike = bridgeAhead(w.map, v) ? 1 : 0;
  const gap = d.js - d.ps;
  const band = gap > 80 ? 0.88 : gap < -20 ? 1.06 : 1;
  const want = d.jfin != null ? 0 : (1.4 + 7.4 * sailPolar(theta) * JELLE_TRIM) * (strike ? 0.5 : 1) * band;
  d.jspeed += clamp(want - d.jspeed, -2 * dt, 0.9 * dt);
  d.js += d.jspeed * dt;
  // ease from the berth beside you onto the line
  const k = clamp((d.js - d.s0 - 4) / 40, 0, 1);
  v.x = d.jlat.x + (q.x - d.jlat.x) * k;
  v.y = d.jlat.y + (q.y - d.jlat.y) * k;
  let da = q.a - v.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  v.angle += da * Math.min(1, dt * 3);
  v.speed = d.jspeed;
  v.driftX = 0; v.driftY = 0;
  animateSkutsjeRig(v, boomSide(v.angle, wf) * idealTrim(theta), strike, w.time);
}

function end(run) {
  const d = run.data;
  const won = d.jfin == null;
  const margin = won ? (d.s1 - d.js) / Math.max(2, d.jspeed) : 0;
  const medal = won ? (margin >= GOLD_MARGIN ? 3 : 2) : 1;
  finish(run, {
    success: won, medal, value: d.elapsed, lower: true,
    reason: won ? 'Eerder aan de Hoge der A dan Jelle. Met een Fries skûtsje, nog wel.' : 'Jelle was eerder aan de Hoge der A. Hij knoopt al zijn trossen vast.',
    stats: [['Tijd', fmt(d.elapsed)], ...(won ? [['Voorsprong', `${Math.round(margin)} s`]] : [])],
  });
}
