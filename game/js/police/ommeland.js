// De Ommeland-kant van police.js: eenheden die buiten de stad op de echte
// wegen (het weggennet van routing.js) naar de speler toe komen, daar de weg
// volgen en op hem wachten als de achtervolging stopt. Een verplaatsing:
// dezelfde namen, dezelfde volgorde, dezelfde commentaren. Dit bestand
// importeert niets terug uit police.js; de enige gedeelde waarde die niet uit
// een eigen module komt is COP_PED_MIN_DIST, dat hier staat en dat police.js
// terugimporteert. Zo blijft de module-cyclus op 0.

import { clamp, isInWater } from '../util.js';
import { updateTrafficAI, maxCurvature } from '../vehicle.js';
import { makeCopPedestrian, isSpawnHidden } from '../pedestrians.js';
import { isInsideBuilding } from '../pedgeom.js';
import { edgeDistance, ROAD_W } from '../countryfield.js';
import { pushOutOfPlan } from '../countryplan.js';
import { roadNetReady, snapRoad, roadPathNear, nodeXY } from '../roadgraph.js';
import { hoofdspeler } from '../players.js';

// --- the Ommeland ------------------------------------------------------------
// Past the city's streets units come in, block and give chase on the real
// roads (the road graph the GPS drives, routing.js): spawn points, roadblocks
// and officers on foot at a country road; a unit out of sight follows the
// roads to the player and only goes straight for them across the fields when
// close and in sight, like in town.

// Vanaf hier komt de agent te voet (countryCopPed); police.js gebruikt dezelfde afstand.
const COP_PED_MIN_DIST = 40;

const COUNTRY_SNAP_M = 80;
const FIELD_RUN_DIST = 110;
const COUNTRY_REPLAN_S = 1.2;
const COUNTRY_CORNER_DECEL = 8;

// A point on the country roads near (x, y) as a road point { x, y, road },
// the road a straight stand-in along it (width, direction, one-way).
function countryRoadPoint(x, y, R) {
  if (!roadNetReady() || edgeDistance(x, y) < 0) return null;
  const sn = snapRoad(x, y, R);
  if (!sn || sn.d > R || sn.bridge) return null;
  const [ax, ay] = nodeXY(sn.a), [bx, by] = nodeXY(sn.b);
  const l = Math.hypot(bx - ax, by - ay) || 1;
  return { x: sn.x, y: sn.y, road: lineRoad(sn.x, sn.y, (bx - ax) / l, (by - ay) / l, KIND_WIDTH[sn.kind] || ROAD_W, !!sn.one) };
}
const KIND_WIDTH = { 1: 11, 2: 6.5, 3: 9, 4: 7.5, 5: 6.5, 6: 5, 7: 5.5 };
function lineRoad(x, y, ux, uy, width, oneway) {
  return { pts: [[x - ux * 20, y - uy * 20], [x + ux * 20, y + uy * 20]], width: Math.max(4, width), oneway: !!oneway, cat: 'normal', country: true };
}

// No water to sink in on the straight line from a to b (every 2 m).
function dryLine(map, ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
  for (let k = 1; k < n; k++) if (isInWater(map, ax + (bx - ax) * k / n, ay + (by - ay) * k / n)) return false;
  return true;
}

function solidAt(map, x, y) {
  if (isInsideBuilding(map, x, y)) return true;
  return roadNetReady() && edgeDistance(x, y) > -20 && pushOutOfPlan({ x, y }, 0.6);
}

// An officer on foot beside a country road, out of sight.
function countryCopPed(world, c) {
  if (!roadNetReady() || edgeDistance(c.x, c.y) < 0) return [];
  const p = hoofdspeler(world);
  for (let k = 0; k < 6; k++) {
    const a = Math.random() * Math.PI * 2, d = COP_PED_MIN_DIST + 10 + Math.random() * 50;
    const rp = countryRoadPoint(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 30);
    if (!rp) continue;
    const [A, B] = rp.road.pts;
    const ux = (B[0] - A[0]) / 40, uy = (B[1] - A[1]) / 40, side = Math.random() < 0.5 ? 1 : -1;
    const off = rp.road.width / 2 + 1.5;
    const x = rp.x - uy * side * off, y = rp.y + ux * side * off;
    if (Math.hypot(x - p.x, y - p.y) < COP_PED_MIN_DIST || solidAt(world.map, x, y) || !isSpawnHidden(world, x, y)) continue;
    const cop = makeCopPedestrian(x, y, Math.atan2(uy, ux));
    cop.noFade = false;
    return [cop];
  }
  return [];
}

// Drives v along the country roads towards goal at about `cruise`: a short
// A* way (countryPathNear) replanned every second or so, followed by pure
// pursuit, braking for the bends ahead. False when no country road is near.
function countryFollow(v, dt, world, goal, cruise) {
  if (!roadNetReady()) return false;
  const c = v._country || (v._country = { path: null, at: -99, gx: 0, gy: 0, i: 0, slow: 0 });
  if (!c.path || world.time - c.at > COUNTRY_REPLAN_S || Math.hypot(goal.x - c.gx, goal.y - c.gy) > 30) {
    c.at = world.time; c.gx = goal.x; c.gy = goal.y; c.i = 0;
    const from = snapRoad(v.x, v.y, COUNTRY_SNAP_M);
    const to = from && from.d <= COUNTRY_SNAP_M ? snapRoad(goal.x, goal.y, 600) : null;
    c.path = to ? roadPathNear(from, to) : null;
  }
  const P = c.path;
  if (!P || P.length < 2) return false;
  // where along the way the car is (a few segments on from last time)
  let bi = c.i, bd = Infinity, bt = 0;
  for (let i = c.i; i < Math.min(P.length - 1, c.i + 8); i++) {
    const ax = P[i][0], ay = P[i][1], dx = P[i + 1][0] - ax, dy = P[i + 1][1] - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((v.x - ax) * dx + (v.y - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(ax + dx * t - v.x, ay + dy * t - v.y);
    if (d < bd) { bd = d; bi = i; bt = t; }
  }
  c.i = bi;
  // the point `look` metres on, and the slowest bend within braking range
  const sp = Math.abs(v.speed);
  const look = clamp(sp * 0.45, 5, 14);
  let s = -bt * Math.hypot(P[bi + 1][0] - P[bi][0], P[bi + 1][1] - P[bi][1]);
  let tx = P[P.length - 1][0], ty = P[P.length - 1][1], found = false;
  let vCap = cruise;
  const reach = sp * sp / (2 * COUNTRY_CORNER_DECEL) + 12;
  for (let i = bi; i < P.length - 1; i++) {
    const ax = P[i][0], ay = P[i][1], bx = P[i + 1][0], by = P[i + 1][1];
    const L = Math.hypot(bx - ax, by - ay);
    if (!found && s + L >= look) {
      const k = (look - s) / (L || 1);
      tx = ax + (bx - ax) * k; ty = ay + (by - ay) * k;
      found = true;
    }
    s += L;
    if (s > reach && found) break;
    if (i + 2 < P.length) {
      const h1 = Math.atan2(by - ay, bx - ax), h2 = Math.atan2(P[i + 2][1] - by, P[i + 2][0] - bx);
      const turn = Math.abs(((h2 - h1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (turn > 0.25) {
        const vc = Math.max(5, 26 * (1 - turn / 1.9));
        vCap = Math.min(vCap, Math.sqrt(vc * vc + 2 * COUNTRY_CORNER_DECEL * Math.max(0, s)));
      }
    }
  }
  const dx = tx - v.x, dy = ty - v.y;
  const fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  const fwd = dx * fx + dy * fy, lat = dy * fx - dx * fy;
  const alpha = Math.atan2(lat, fwd);
  const curv = 2 * lat / Math.max(1, dx * dx + dy * dy);
  const steer = Math.abs(alpha) > Math.PI / 2 ? Math.sign(alpha) : clamp(curv / maxCurvature(v), -1, 1);
  let vTarget = Math.min(vCap, Math.sqrt(6 / Math.max(1e-3, Math.abs(curv))), v.model.maxSpeed);
  if (Math.abs(alpha) > 0.7) vTarget = Math.min(vTarget, 6);
  // at the end of the way: the player on the road ahead (close in gently),
  // or off it in the fields (the rest is straight across)
  const end = P[P.length - 1];
  const left = Math.hypot(end[0] - v.x, end[1] - v.y);
  if (left < 18 && Math.hypot(goal.x - end[0], goal.y - end[1]) > 6 && goal === hoofdspeler(world) && dryLine(world.map, v.x, v.y, goal.x, goal.y)) {
    v._fieldRun = true;
    v._direct = true;
  }
  if (left < 25) vTarget = Math.min(vTarget, Math.max(3, left * 0.6));
  // nowhere further to go on the road: wait there
  if (left < 6 && !v._fieldRun) vTarget = 0;
  // facing the wrong way: back round in a three-point turn rather than a
  // wide U off the road (and into the ditch beside it)
  if (Math.abs(alpha) > 2 || (c.reverse && Math.abs(alpha) > 1.4)) c.reverse = true;
  else c.reverse = false;
  const err = vTarget - v.speed;
  let throttle = err > 0.25 ? clamp(err * 0.4, 0.15, 1) : 0;
  let brake = err < -0.5 ? clamp(-err * 0.3, 0.1, 1) : 0;
  if (c.reverse && vTarget > 0) {
    if (v.speed > 0.5) { throttle = 0; brake = 1; } else { throttle = v.speed > -3 ? -0.6 : 0; brake = 0; }
    v.applyControls(dt, throttle, -Math.sign(alpha), brake);
  } else v.applyControls(dt, throttle, steer, brake);
  // stuck against something: despawnFarPolice frees the slot
  c.slow = sp < 1 && vTarget > 3 ? c.slow + dt : 0;
  v.stuckFor = c.slow;
  return true;
}

// Wanted 0: a unit out in the Ommeland drives on along the roads.
function countryPatrol(v, dt, world) {
  const g = v._patrolGoal;
  if (!g || Math.hypot(g.x - v.x, g.y - v.y) < 25 || world.time > g.until) {
    const a = v.angle + (Math.random() - 0.5) * 1.2;
    v._patrolGoal = { x: v.x + Math.cos(a) * 300, y: v.y + Math.sin(a) * 300, until: world.time + 40 };
  }
  if (!countryFollow(v, dt, world, v._patrolGoal, v.model.maxSpeed * 0.45)) updateTrafficAI(v, dt, world.map, world, Math.random);
}

export { countryRoadPoint, dryLine, solidAt, countryCopPed, countryFollow, countryPatrol, FIELD_RUN_DIST, COP_PED_MIN_DIST };
