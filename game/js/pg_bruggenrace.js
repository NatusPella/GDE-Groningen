import { Vehicle } from './vehicle.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { buildPersonMesh, seatPerson, seatedY } from './models3d_people.js';
import { boatSeats } from './boattypes.js';
import { JELLE_LOOK } from './storycast.js';
import { routeAt, ROUTE_LENGTH, rondvaartWaypoints, rondvaartBerth, prepareDiepenringRoute, diepenringProgress } from './rondvaartchase.js';
import { getChallengeRecord } from './achievements.js';
import { pointInPolygon, clamp } from './util.js';
import { finish, jelle, setTarget } from './postgame.js';

// Elf Bruggenrace: one lap of the Diepenring from the Spilsluizen, under its
// eleven bridges (the rondvaart route and checkpoints, rondvaartchase.js), in
// a borrowed speedboat against Jelle in his "Fryske Flitser". Jelle follows
// the route line at a steady pace with a mild rubber band; the player has
// to pass every bridge in order. Win = zilver, win fast = goud, finish = brons.

const RACE_BOAT = { name: 'boat', kind: 'sloep', len: 4.4, wid: 1.7, maxSpeed: 10.8, accel: 3.4, brake: 3.6, turnRate: 1.8, color: '#e8e6e0', cabin: '#1c1c1c' };
const JELLE_BOAT = { name: 'boat', kind: 'sloep', len: 4.6, wid: 1.75, maxSpeed: 11, accel: 2, brake: 3, turnRate: 1.6, color: '#1d4f9c', cabin: '#f4f2ec' };
const COUNTDOWN = 3.5;
const LIMIT = 720;
const JELLE_PACE = 8.3;
const CP_REACH = 26;

let leftover = null;

function removeBoat(w, v) {
  if (!v) return;
  const i = w.vehicles.indexOf(v);
  if (i >= 0 && v.driver !== 'player') w.vehicles.splice(i, 1);
}

function waterPolyAt(map, x, y) {
  return map.waterNear(x, y, 1).find((q) => pointInPolygon(x, y, q.pts)) || null;
}

function jelleFigure(v) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh || mesh.userData.pgJelle) return;
  const seat = boatSeats(v)[0];
  const m = buildPersonMesh(JELLE_LOOK.shirt, JELLE_LOOK.skin, JELLE_LOOK);
  seatPerson(m, false, seat.pose);
  m.position.set(seat.x, seatedY(m, seat.y), seat.z);
  m.rotation.y = seat.face || 0;
  mesh.add(m);
  mesh.userData.pgJelle = m;
}

function fmt(s) {
  const t = Math.max(0, s), m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

export const BRUGGEN = {
  id: 'bruggen',
  name: 'Elf Bruggenrace',
  blurb: 'Eén rondje Diepenring, onder elf bruggen door, tegen Jelle',
  icon: 'jelle',
  jelle: true,
  banter: 'post-bruggen',
  spots(world) {
    const b = rondvaartBerth(world.map);
    // a few steps along the quay from the rondvaart mission's own marker
    const a = b.boat.angle || 0;
    const [x, y] = world.map.escapeBuilding(b.start.x + Math.cos(a) * 6, b.start.y + Math.sin(a) * 6, 0.4);
    return [{ x, y, name: 'Elf Bruggenrace', sub: 'Jelle daagt je uit op het water', berth: b }];
  },
  verb: () => 'Elf Bruggenrace tegen Jelle',
  start(run) {
    const w = run.world, map = w.map;
    prepareDiepenringRoute(map);
    if (leftover) { removeBoat(w, leftover); leftover = null; }
    const berth = run.spot.data.berth;
    const wps = rondvaartWaypoints();
    const cps = [];
    let vias = [];
    for (const wp of wps) {
      if (wp.via) { vias.push(wp); continue; }
      cps.push({ x: wp.x, y: wp.y, bridge: wp.bridge, s: diepenringProgress(wp.x, wp.y).s, path: vias });
      vias = [];
    }
    const s0 = diepenringProgress(berth.boat.x, berth.boat.y);
    const boat = new Vehicle(berth.boat.x, berth.boat.y, berth.boat.angle, { ...RACE_BOAT });
    boat.isBoat = true;
    boat.missionCar = true;
    boat.waterPoly = waterPolyAt(map, boat.x, boat.y);
    w.vehicles.push(boat);
    const q = routeAt(s0.s + 7);
    const jv = new Vehicle(q.x, q.y, q.a, { ...JELLE_BOAT });
    jv.isBoat = true;
    jv.scripted = true;
    jv.missionCar = true;
    jv.driver = 'jelle';
    jv.label = 'Fryske Flitser';
    w.vehicles.push(jv);
    const p = w.player;
    p.x = boat.x; p.y = boat.y;
    p.enterVehicle(boat, w);
    const c = w.companion;
    if (c && c.state !== 'dead' && !c.inVehicle) { c.x = boat.x; c.y = boat.y; c.water = null; c.swimming = false; c.inVehicle = boat; boat.passenger = 'companion'; }
    const len = cps[cps.length - 1].s - s0.s;
    Object.assign(run.data, {
      boat, jv, cps, cp: 0, ps: s0.s, pi: s0.i, js: s0.s + 7, jspeed: 0, jfin: null, s0: s0.s, len,
      gold: len / (JELLE_PACE * 1.07), elapsed: 0, go: false, count: COUNTDOWN, pos: 2, lastPos: 2, offT: 0, said: 0,
    });
    run.ui.setSlot('<div class="pg-help">Onder elke brug door, in de goede volgorde. Jelle vaart de hele ring.</div>');
    return true;
  },
  update(run, dt) {
    const w = run.world, d = run.data, p = w.player;
    const boat = d.boat;
    jelleFigure(d.jv);
    if (!w.vehicles.includes(d.jv)) w.vehicles.push(d.jv);
    if (boat.wrecked || boat.sinking) { finish(run, { success: false, medal: 0, reason: 'Je boot is naar de bodem. Jelle zwaait.', stats: [] }); return; }
    if (p.inVehicle !== boat) {
      d.offT += dt;
      if (d.offT > 10) { finish(run, { success: false, medal: 0, reason: 'Je bent uit de boot gestapt. Jelle vaart door.', stats: [] }); return; }
    } else d.offT = 0;
    if (!d.go) {
      d.count -= dt;
      boat.speed = 0;
      w.startLockUntil = d.count > 0 ? w.time + 0.25 : 0;
      if (d.count <= 1 && !d.said) { d.said = 1; jelle(run, 'go', true); }
      w.addMessage(d.count > 0.5 ? String(Math.ceil(d.count - 0.5)) : 'VAREN!', 0.4, { key: 'pg-count', exact: true });
      if (d.count <= 0) d.go = true;
      placeJelle(d, 0);
      setTarget(d.cps[0]);
      return;
    }
    d.elapsed += dt;
    // the player's progress along the ring, and the bridges in order
    const pr = diepenringProgress(boat.x, boat.y, d.pi);
    d.pi = pr.i;
    if (pr.d < 60) d.ps = pr.s;
    const cp = d.cps[d.cp];
    if (cp && (d.ps >= cp.s - 4 && pr.d < CP_REACH || Math.hypot(boat.x - cp.x, boat.y - cp.y) < 12)) {
      d.cp++;
      const last = d.cp >= d.cps.length;
      if (!last) w.addMessage(`Brug ${d.cp}/11: ${cp.bridge}`, 2, { key: 'pg-cp' });
      if (last) { end(run); return; }
      setTarget(d.cps[d.cp]);
    }
    // Jelle: steady pace, eases off when you fall far behind, pushes when you lead
    const gap = d.js - d.ps;
    const want = d.jfin != null ? 0 : gap > 90 ? JELLE_PACE * 0.86 : gap < -30 ? JELLE_PACE * 1.14 : JELLE_PACE;
    d.jspeed += clamp(want - d.jspeed, -3 * dt, 1.6 * dt);
    placeJelle(d, dt);
    const finishS = d.cps[d.cps.length - 1].s;
    if (d.jfin == null && d.js >= finishS) { d.jfin = d.elapsed; d.js = finishS; }
    d.pos = d.jfin != null || d.js > d.ps + 2 ? 2 : 1;
    if (d.pos !== d.lastPos) { jelle(run, d.pos === 1 ? 'behind' : 'lead', true); d.lastPos = d.pos; }
    else if (run.t - run.lastSay > 24) jelle(run, d.pos === 1 ? 'behind' : 'lead');
    const ahead = Math.round(Math.abs(gap));
    run.ui.setRows([['Jelle', d.jfin != null ? 'is al binnen' : gap > 0 ? `${ahead} m voor` : `${ahead} m achter`], ['Bruggen', `${Math.min(11, d.cp)}/11`]]);
    if (d.elapsed > LIMIT) finish(run, { success: false, medal: 0, reason: 'Te lang onderweg. Jelle heeft al koffie op.', stats: [] });
  },
  hud(run) {
    const d = run.data;
    const rec = getChallengeRecord('bruggen');
    return { pos: d.go ? d.pos : null, total: 2, elapsed: d.elapsed, timeLeft: Math.max(0, LIMIT - d.elapsed), cp: Math.min(d.cps.length, d.cp + 1), cpTotal: d.cps.length, lap: null, laps: null, best: rec && rec.best != null ? rec.best : null };
  },
  stop(run) {
    const w = run.world, d = run.data;
    if (d.jv) removeBoat(w, d.jv);
    if (d.boat) {
      if (w.player.inVehicle === d.boat) leftover = d.boat;
      else removeBoat(w, d.boat);
    }
  },
  idle(world) {
    if (leftover && world.player.inVehicle !== leftover && Math.hypot(leftover.x - world.player.x, leftover.y - world.player.y) > 120) {
      removeBoat(world, leftover);
      leftover = null;
    }
  },
  debugWin(run) {
    const d = run.data;
    d.go = true;
    d.cp = d.cps.length - 1;
    d.ps = d.cps[d.cp].s;
    d.elapsed = d.gold - 5;
    end(run);
  },
  debugState(run) {
    const d = run.data;
    return { cp: d.cp, ps: Math.round(d.ps), js: Math.round(d.js), len: Math.round(d.len), gold: Math.round(d.gold), pos: d.pos };
  },
};

function placeJelle(d, dt) {
  d.js = Math.min(ROUTE_LENGTH, d.js + d.jspeed * dt);
  const q = routeAt(d.js);
  const v = d.jv;
  v.x = q.x; v.y = q.y;
  let da = q.a - v.angle;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  v.angle += da * Math.min(1, dt * 4);
  v.speed = d.jspeed;
  v.driftX = 0; v.driftY = 0;
}

function end(run) {
  const d = run.data;
  const won = d.jfin == null;
  const medal = won ? (d.elapsed <= d.gold ? 3 : 2) : 1;
  finish(run, {
    success: won, medal, value: d.elapsed, lower: true,
    reason: won ? 'Elf bruggen, en Jelle zag alleen je hek.' : 'Jelle was eerder binnen. Hij zwaait met zijn pet.',
    stats: [['Tijd', fmt(d.elapsed)], ['Goud onder', fmt(d.gold)]],
  });
}
