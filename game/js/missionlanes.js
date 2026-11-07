// #497: de fatbike-lanes en de dronken kroegencrowd, uit missions.js gelicht.
// De missieketen levert via de host-naad alleen zijn eigen staat (`state()`).
import { clamp, dist, closestPointOnSegment } from './util.js';
import { Vehicle, makeTwoWheeler } from './vehicle.js';
import { Pedestrian } from './pedestrians.js';
import { isInsideBuilding, setPedPose } from './pedgeom.js';
import { knockDown, isKnockedDown } from './ragdoll.js';
import { requestRespawn } from './world.js';
import { hoofdspeler } from './players.js';
import { teamActor, groepsActeurs } from './stagegroep.js';

const BIKE_TOUCH_RADIUS = 1.15;
const BIKE_HIT_GRACE = 2.5;
export const LANE_SPAWN_EVERY = 0.9;
export const LANE_FAT_SHARE = 0.45;
export const LANE_MAX_BIKES = 22;
const CROWD_SIZE = 11;
const CROWD_RADIUS = 3.6;
const CHARGE_EVERY = [3.5, 6];
const CHARGE_SPEED = 3.4;
const CHARGE_MAX_T = 4.5;
const DRUNK_LINES = ['Proost!', 'Nog ééntje dan!', 'Ik hou van jullie allemaal!', 'Waar is mijn fiets?', 'KEI-week! KEI-week!', 'Wie heeft mijn pet?', 'Ik ben niet dronken, ik ben Gronings!', 'Kom, nog één kroeg!'];
const CHARGE_LINES = ['Maaaaat! Knuffel!', 'HÉ! Jij bent toch die van Kiekdoar?', 'Ik ken jou! Van... ergens!', 'Opzij, ik moet naar de wc!', 'Polonaise! Iedereen mee!'];

export function createMissionLanes(state) {// --- Fatbike-terreur: a stream of bikes both ways down a narrow street ---------

const LANE_HALF = 2.1;
const FAT_COLORS = ['#20221f', '#2a2f36', '#3b2a22', '#1b2a3a'];
const RIDER_COLORS = ['#8a3a1f', '#2f5c8a', '#c94b3a', '#3f6b3f', '#c9a227', '#6b3f8a', '#e8e6e0'];

function laneGeom(def) {
  if (def._lane) return def._lane;
  const pts = def.lane;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  def._lane = { pts, cum, len: cum[cum.length - 1] };
  return def._lane;
}

function laneAt(g, s) {
  s = clamp(s, 0, g.len);
  let i = 0;
  while (i < g.pts.length - 2 && g.cum[i + 1] < s) i++;
  const [ax, ay] = g.pts[i], [bx, by] = g.pts[i + 1];
  const t = (s - g.cum[i]) / (g.cum[i + 1] - g.cum[i] || 1);
  const a = Math.atan2(by - ay, bx - ax);
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, a, nx: -Math.sin(a), ny: Math.cos(a) };
}

// Arc length and signed lateral offset of (x, y) on the lane.
function laneProject(g, x, y) {
  let best = null;
  for (let i = 0; i < g.pts.length - 1; i++) {
    const cp = closestPointOnSegment(x, y, g.pts[i][0], g.pts[i][1], g.pts[i + 1][0], g.pts[i + 1][1]);
    if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, s: g.cum[i] + cp.t * (g.cum[i + 1] - g.cum[i]) };
  }
  const q = laneAt(g, best.s);
  return { s: best.s, lat: (x - q.x) * q.nx + (y - q.y) * q.ny };
}

function spawnLaneBike(world, def, dir, s0 = null) {
  const g = laneGeom(def);
  const eigen = hoofdspeler(world); // de speler van dit apparaat: de baan voedt zich rond hem
  const fat = Math.random() < LANE_FAT_SHARE;
  // a long lane (H12) feeds bikes in around the player instead of only at its ends
  const pl = s0 == null && g.len > 220 ? laneProject(g, eigen.x, eigen.y).s : null;
  const s = s0 ?? (pl != null ? clamp(pl + dir * -(45 + Math.random() * 30), 0, g.len) : dir > 0 ? 0 : g.len);
  const q = laneAt(g, s);
  // never out of thin air on top of the player
  if (dist(q.x, q.y, eigen.x, eigen.y) < 12) return;
  const lat = (Math.random() * 2 - 1) * LANE_HALF;
  const x = q.x + q.nx * lat, y = q.y + q.ny * lat;
  if (isInsideBuilding(world.map, x, y)) return;
  const ang = q.a + (dir < 0 ? Math.PI : 0);
  const rider = RIDER_COLORS[Math.floor(Math.random() * RIDER_COLORS.length)];
  let v;
  if (fat) {
    v = new Vehicle(x, y, ang, { name: 'bike', fat: true, len: 1.95, wid: 0.62, maxSpeed: 8.5, accel: 4.2, brake: 6, turnRate: 3.8, color: FAT_COLORS[Math.floor(Math.random() * FAT_COLORS.length)], rider });
    v.isBike = true;
  } else {
    v = makeTwoWheeler('bike', x, y, ang);
    v.model = { ...v.model, rider };
  }
  v.driver = 'mission';
  v.road = null;
  v.missionFatbike = true;
  v.speed = fat ? 6.5 + Math.random() * 2 : 4.2 + Math.random() * 1.8;
  world.vehicles.push(v);
  state().bikes.push({ v, s, dir, lat, latT: lat, speed: v.speed, fat, decided: false, weaveAt: world.time + 1 + Math.random() * 2 });
}

function startLane(world, def) {
  const g = laneGeom(def);
  state().fatbikeHits = 0;
  state().notesSaid = null;
  state().hitGraceUntil = world.time + 2.5;
  state().laneT = 0.4;
  state().laneDir = 1;
  const p = hoofdspeler(world);
  for (let s = 10, dir = -1; s < Math.min(g.len, 120); s += 11 + Math.random() * 6, dir = -dir) {
    const q = laneAt(g, s);
    if (dist(q.x, q.y, p.x, p.y) > 12) spawnLaneBike(world, def, dir, s);
  }
}

// Bikes ride the lane kinematically: weaving, and once the player is close
// ahead each rider picks a side. Fatbikes mostly hold their line or drift
// right at you; regular riders try to swerve, not always in time.
const HONK_BACK = ['Toeter nait zo, jong!', 'Doe toch nait zo roar, mien jong!', 'Zoek dien eigen pad, joh!', 'Wie bist doe, de burgemeester?', 'Kiek uut, tutteltje!', 'Hou dien toeter dicht, joh!'];

function fatbikersAnswerHonk(world, p) {
  const pv = p.inVehicle;
  const on = !!(pv && pv.horn);
  const rising = on && !state().hornWas;
  state().hornWas = on;
  if (!rising || world.time < (state().honkBackAt || 0)) return;
  const b = state().bikes.find((q) => q.fat && !q.v.wrecked && Math.hypot(q.v.x - p.x, q.v.y - p.y) < 22);
  if (!b) return;
  state().honkBackAt = world.time + 5;
  state().honkIdx = ((state().honkIdx || 0) + 1 + Math.floor(Math.random() * 3)) % HONK_BACK.length;
  const text = HONK_BACK[state().honkIdx];
  (world.extraSpeakers || (world.extraSpeakers = [])).push({ x: b.v.x, y: b.v.y, h: 2.2, follow: b.v, speechText: text, speechUntil: world.time + 2.8 });
}

function updateLaneBikes(dt, world, def) {
  const g = laneGeom(def);
  const p = hoofdspeler(world);
  fatbikersAnswerHonk(world, p);
  state().laneT -= dt;
  if (state().laneT <= 0 && state().bikes.length < LANE_MAX_BIKES) {
    state().laneT = LANE_SPAWN_EVERY * (0.6 + Math.random() * 0.8);
    spawnLaneBike(world, def, state().laneDir);
    state().laneDir = -state().laneDir;
  }
  for (let k = state().bikes.length - 1; k >= 0; k--) {
    const b = state().bikes[k], v = b.v;
    if (!world.vehicles.includes(v) || v.wrecked || v.driver !== 'mission') { state().bikes.splice(k, 1); continue; }
    // Samen spelen (#525): elke fiets kiest de dichtstbijzijnde meespeler te voet als doel,
    // zodat een gast ook wordt aangereden en niet alleen wie het spel opende.
    const doel = teamActor(world, v, (a) => !a.inVehicle) || p;
    const pl = laneProject(g, doel.x, doel.y);
    const ahead = (pl.s - b.s) * b.dir;
    if (!b.decided && ahead > 0 && ahead < 13 && Math.abs(pl.lat) < LANE_HALF + 1.5) {
      b.decided = true;
      const aim = Math.random() < (b.fat ? 0.35 : 0.1);
      b.latT = aim ? clamp(pl.lat + (Math.random() - 0.5) * 0.6, -LANE_HALF, LANE_HALF)
        : clamp(pl.lat + (pl.lat > b.lat ? -1.6 : 1.6), -LANE_HALF, LANE_HALF);
    } else if (!b.decided && world.time > b.weaveAt) {
      b.weaveAt = world.time + 1.2 + Math.random() * 2.2;
      b.latT = clamp(b.lat + (Math.random() - 0.5) * 2.4, -LANE_HALF, LANE_HALF);
    }
    const rate = b.fat ? 1.3 : 1.2;
    const dl = clamp(b.latT - b.lat, -rate * dt, rate * dt);
    b.lat += dl;
    b.speed = Math.min(b.speed + dt * 1.5, v.model.fat ? 8.5 : 6.2);
    b.s += b.dir * b.speed * dt;
    if (b.s < -3 || b.s > g.len + 3 || (g.len > 220 && Math.abs(b.s - pl.s) > 110)) {
      const i = world.vehicles.indexOf(v);
      if (i >= 0) world.vehicles.splice(i, 1);
      state().bikes.splice(k, 1);
      continue;
    }
    const q = laneAt(g, b.s);
    let x = q.x + q.nx * b.lat, y = q.y + q.ny * b.lat;
    if (isInsideBuilding(world.map, x, y)) { b.lat *= 0.7; b.latT = b.lat; x = q.x + q.nx * b.lat; y = q.y + q.ny * b.lat; }
    v.x = x; v.y = y;
    v.angle = q.a + (b.dir < 0 ? Math.PI : 0) + Math.atan2(dl / Math.max(dt, 1e-3), b.speed) * b.dir;
    v.speed = b.speed;
    v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  }
}

function checkLaneHits(world) {
  const host = hoofdspeler(world);
  if (world.time < state().hitGraceUntil || world.pendingRespawn) return;
  // Samen spelen (#525): elke meespeler te voet kan worden geschept en houdt zijn eigen
  // gezondheid; een gast gaat neer met zijn eigen lichaam, wie het spel opende met world.health.
  for (const p of groepsActeurs(world)) {
    if (p.inVehicle || isKnockedDown(p, world)) continue;
    for (const b of state().bikes) {
      const v = b.v;
      if (Math.abs(v.x - p.x) > 2 || Math.abs(v.y - p.y) > 2 || dist(v.x, v.y, p.x, p.y) > BIKE_TOUCH_RADIUS) continue;
      state().fatbikeHits++;
      state().hitGraceUntil = world.time + BIKE_HIT_GRACE;
      let dmg = Math.round(b.fat ? 5 + b.speed * 0.6 : 2 + b.speed * 0.3);
      if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
      const isHost = p === host;
      if (isHost) world.health = Math.max(0, world.health - dmg);
      else {
        p.health = Math.max(0, (Number.isFinite(p.health) ? p.health : 100) - dmg);
        if (p.health <= 0) p.coopDown = true;
      }
      const vx = Math.cos(v.angle) * b.speed, vy = Math.sin(v.angle) * b.speed;
      const dead = isHost ? world.health <= 0 : p.health <= 0;
      world.lastImpact = { strength: b.fat ? 0.6 : 0.3, time: world.time, x: p.x, y: p.y };
      if (b.fat || dead) knockDown(p, world, { kind: 'hit', dead, vx: vx * 0.8, vy: vy * 0.8, vz: 1.2 + b.speed * 0.15, lieFor: 1.1 });
      else { p.shoveX = (p.shoveX || 0) + vx * 0.7; p.shoveY = (p.shoveY || 0) + vy * 0.7; }
      b.speed *= 0.4;
      world.addMessage(b.fat ? `Au! Geschept door een fatbike (${state().fatbikeHits}x)` : `Een fietser tikt je aan: "Kiek uut, joh!" (${state().fatbikeHits}x)`, 2);
      if (dead && isHost) requestRespawn(world);
      break;
    }
  }
}

function releaseLaneBikes(world) {
  for (const b of state().bikes) {
    const i = world.vehicles.indexOf(b.v);
    if (i >= 0 && b.v.driver === 'mission') world.vehicles.splice(i, 1);
  }
  state().bikes.length = 0;
}

// --- Kroegentocht: drunk crowds and people staggering into you -----------------

// Crowds stand on the car-free streets only; traffic would mow them down.
function footSpot(map, x, y) {
  let best = null;
  for (const r of map.roadsNear(x, y, 30)) {
    if (r.cat !== 'foot') continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y };
    }
  }
  return best && best.d2 < 30 * 30 ? best : null;
}

function spawnCrowds(world, def) {
  state().crowd = [];
  state().chargeT = 4;
  for (const c0 of def.crowds) {
    const c = footSpot(world.map, c0.x, c0.y);
    if (!c) continue;
    for (let k = 0, placed = 0; k < CROWD_SIZE * 4 && placed < CROWD_SIZE; k++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * CROWD_RADIUS;
      const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r;
      if (isInsideBuilding(world.map, x, y)) continue;
      placed++;
      const ped = new Pedestrian(x, y, Math.random() * Math.PI * 2);
      ped.crowdAnchor = { x: c.x, y: c.y, r: CROWD_RADIUS };
      ped.anchor = ped.crowdAnchor;
      ped.nightlife = true;
      ped.missionCrowd = true;
      ped.hasBag = false;
      world.pedestrians.push(ped);
      state().crowd.push(ped);
    }
  }
}

function endCharge(ped) {
  ped.charging = false;
  ped.state = 'wander';
  ped.stateUntil = 0;
  ped.waypoint = null;
  ped.fleeFrom = null;
}

function startCharge(world, ped) {
  ped.charging = true;
  ped.chargeUntil = world.time + CHARGE_MAX_T;
  ped.anchor = null;
  setPedPose(ped, null);
  ped.speechText = CHARGE_LINES[Math.floor(Math.random() * CHARGE_LINES.length)];
  ped.speechUntil = world.time + 2.4;
}

function updateCrowd(dt, world, def) {
  const p = hoofdspeler(world);
  const t = world.time;
  const next = def.waypoints[state().wpIndex];
  for (let k = state().crowd.length - 1; k >= 0; k--) {
    const ped = state().crowd[k];
    if (ped.state === 'dead' || !world.pedestrians.includes(ped)) { state().crowd.splice(k, 1); continue; }
    if (ped.ragdoll) continue;
    if (!ped.charging) {
      ped.anchor = ped.crowdAnchor;
      ped.nightlife = true;
      if (Math.random() < dt * 0.06 && dist(ped.x, ped.y, p.x, p.y) < 25) {
        ped.speechText = DRUNK_LINES[Math.floor(Math.random() * DRUNK_LINES.length)];
        ped.speechUntil = t + 2.2;
      }
      continue;
    }
    const d = dist(ped.x, ped.y, p.x, p.y);
    if (t > ped.chargeUntil || d > 30 || p.inVehicle) { endCharge(ped); continue; }
    // "fleeing" from the point mirrored through the player runs straight at them
    ped.state = 'flee';
    ped.stateUntil = t + 1;
    ped.fleeFrom = { x: 2 * ped.x - p.x, y: 2 * ped.y - p.y };
    ped.fleeJitter = Math.sin(t * 4 + ped._lookSeed) * 0.4;
    ped.fleeSpeed = CHARGE_SPEED;
    if (d < 0.9 && !isKnockedDown(p, world)) {
      const nx = (p.x - ped.x) / (d || 1), ny = (p.y - ped.y) / (d || 1);
      p.shoveX = (p.shoveX || 0) + nx * 5.5;
      p.shoveY = (p.shoveY || 0) + ny * 5.5;
      world.lastImpact = { strength: 0.3, time: t, x: p.x, y: p.y };
      if (Math.random() < 0.3) {
        knockDown(p, world, { kind: 'hit', vx: nx * 3, vy: ny * 3, vz: 1.1, lieFor: 0.9 });
        world.addMessage('Omvergelopen door een dronken student. Hij verontschuldigt zich bij een lantaarnpaal.', 2.6);
      }
      endCharge(ped);
    }
  }
  state().chargeT -= dt;
  if (state().chargeT > 0 || p.inVehicle) return;
  state().chargeT = CHARGE_EVERY[0] + Math.random() * (CHARGE_EVERY[1] - CHARGE_EVERY[0]);
  const hx = next ? next.x - p.x : 0, hy = next ? next.y - p.y : 0;
  const hl = Math.hypot(hx, hy) || 1;
  let best = null, bs = -Infinity;
  for (const ped of state().crowd) {
    if (ped.charging || ped.ragdoll) continue;
    const d = dist(ped.x, ped.y, p.x, p.y);
    if (d < 6 || d > 22) continue;
    const score = ((ped.x - p.x) * hx + (ped.y - p.y) * hy) / (hl * d) - d * 0.02;
    if (score > bs) { bs = score; best = ped; }
  }
  if (best) startCharge(world, best);
}

function releaseCrowd() {
  for (const ped of state().crowd) {
    if (ped.charging) endCharge(ped);
    ped.anchor = null;
    ped.crowdAnchor = null;
    ped.nightlife = false;
  }
  state().crowd.length = 0;
}

  return { startLane, updateLaneBikes, checkLaneHits, releaseLaneBikes, spawnCrowds, updateCrowd, releaseCrowd, laneGeom, laneAt, laneProject };
}