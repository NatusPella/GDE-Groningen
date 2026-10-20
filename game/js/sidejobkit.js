// Shared helpers for the bijbaantjes (sidejobs.js and the sidejob_*.js
// jobs): placing things on streets and at doors, handing the player a job
// vehicle, customers that wait or walk, and small carryable props.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { Vehicle, spawnVehicleOnRoad } from './vehicle.js';
import { Pedestrian } from './pedestrians.js';
import { closestPointOnSegment, isInWater, pointInPolygon, boatDryPoints } from './util.js';
import { waterPolyAt } from './waterlevels.js';
import { nearestOnRoads } from './tileplace.js';
import { getVehicleMesh } from './models3d_vehicles.js';
import { TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { rand } from './rng.js';

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export { rand } from './rng.js';
export const euro = (n) => '€' + Math.round(n).toLocaleString('nl-NL');

export function fmtClock(s) {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// --- placement ----------------------------------------------------------------

export function nearestOnStreet(map, name, x, y, radius = 160) {
  return nearestOnRoads(map, x, y, radius, (r) => r.name === name);
}

export function streetNameAt(map, x, y) {
  const q = nearestOnRoads(map, x, y, 40, (r) => r.name && r.cat !== 'foot');
  return q ? q.road.name : null;
}

// The named building of the city map (Gerechtsgebouw, Stadsschouwburg ...):
// { x, y, cx, cy } with the walkable ground nearest its middle, or null.
export function namedBuildingSpot(map, name) {
  let best = null, area = -1;
  for (const b of map.buildings) {
    if (b.name !== name || !b.pts || b.pts.length < 3) continue;
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < b.pts.length; i++) {
      const q = b.pts[i], r = b.pts[(i + 1) % b.pts.length];
      a += q[0] * r[1] - r[0] * q[1];
      cx += q[0]; cy += q[1];
    }
    a = Math.abs(a / 2);
    if (a > area) { area = a; best = { cx: cx / b.pts.length, cy: cy / b.pts.length }; }
  }
  if (!best) return null;
  const o = map.findOpenSpawn(best.cx, best.cy, 80);
  return o ? { x: o.x, y: o.y, cx: best.cx, cy: best.cy } : null;
}

// A walkable spot in front of the nearest facade: where a customer waits.
export function doorSpot(map, x, y) {
  let best = null;
  for (const b of map.buildingsNear(x, y, 20)) {
    const pts = b.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (!best || cp.dist2 < best.d2) best = { d2: cp.dist2, x: cp.x, y: cp.y, ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1] };
    }
  }
  if (!best || best.d2 > 20 * 20) return null;
  let nx = -(best.by - best.ay), ny = best.bx - best.ax;
  const l = Math.hypot(nx, ny) || 1;
  nx /= l; ny /= l;
  if (nx * (x - best.x) + ny * (y - best.y) < 0) { nx = -nx; ny = -ny; }
  const [dx, dy] = map.escapeBuilding(best.x + nx * 1.1, best.y + ny * 1.1, 0.5);
  if (isInWater(map, dx, dy)) return null;
  return { x: dx, y: dy, face: Math.atan2(-ny, -nx) };
}

// Walkable pavement beside a street point (from nearestOnStreet), on the
// side away from the nearest building face when possible.
export function kerbSide(map, hit, extra = 1.4) {
  const l = Math.hypot(hit.dx, hit.dy) || 1;
  const nx = -hit.dy / l, ny = hit.dx / l;
  const off = (hit.road.width || 6) / 2 + extra;
  for (const side of [1, -1]) {
    const x = hit.x + nx * off * side, y = hit.y + ny * off * side;
    if (isInWater(map, x, y)) continue;
    const [ex, ey] = map.escapeBuilding(x, y, 0.5);
    if (Math.hypot(ex - x, ey - y) < 0.3) return { x: ex, y: ey };
  }
  const [ex, ey] = map.escapeBuilding(hit.x + nx * off, hit.y + ny * off, 0.5);
  return { x: ex, y: ey };
}

// A random point on a named, non-foot street between rMin and rMax from (x, y).
export function randomStreetPoint(map, x, y, rMin, rMax, opts = {}) {
  const cats = opts.cats || ['normal', 'minor', 'major', 'cycle'];
  for (let tries = 0; tries < 40; tries++) {
    const a = Math.random() * Math.PI * 2, r = rand(rMin, rMax);
    const tx = x + Math.cos(a) * r, ty = y + Math.sin(a) * r;
    if (opts.within && !opts.within(tx, ty)) continue;
    const rp = map.nearestRoadPoint(tx, ty, 60, !!opts.drivable);
    if (!rp || !rp.road.name || !cats.includes(rp.road.cat)) continue;
    const d = Math.hypot(rp.x - x, rp.y - y);
    if (d < rMin * 0.8 || d > rMax * 1.2) continue;
    if (isInWater(map, rp.x, rp.y) || map.isOnBridge(rp.x, rp.y)) continue;
    return { x: rp.x, y: rp.y, road: rp.road, name: rp.road.name };
  }
  return null;
}

// Along-the-road point `offset` metres from p on its nearest road, towards
// whichever end has room (so a handed-over vehicle doesn't sit on the marker).
export function pointAlongRoad(road, p, offset) {
  const pts = road.pts;
  let seg = 0, tt = 0, best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const cp = closestPointOnSegment(p.x, p.y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (cp.dist2 < best) { best = cp.dist2; seg = i; tt = cp.t; }
  }
  const segLen = (i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  let ahead = segLen(seg) * (1 - tt), behind = segLen(seg) * tt;
  for (let i = seg + 1; i < pts.length - 1; i++) ahead += segLen(i);
  for (let i = seg - 1; i >= 0; i--) behind += segLen(i);
  const dir = ahead >= behind ? 1 : -1;
  let left = Math.min(offset, Math.max(ahead, behind));
  let i = seg;
  const cp = closestPointOnSegment(p.x, p.y, pts[seg][0], pts[seg][1], pts[seg + 1][0], pts[seg + 1][1]);
  let x = cp.x, y = cp.y;
  while (left > 0 && i >= 0 && i < pts.length - 1) {
    const [tx, ty] = dir > 0 ? pts[i + 1] : pts[i];
    const d = Math.hypot(tx - x, ty - y);
    if (d >= left) { x += (tx - x) / d * left; y += (ty - y) / d * left; break; }
    left -= d; x = tx; y = ty; i += dir;
  }
  const [ax, ay] = dir > 0 ? pts[Math.min(i, pts.length - 2)] : pts[Math.min(i + 1, pts.length - 1)];
  const [bx, by] = dir > 0 ? pts[Math.min(i + 1, pts.length - 1)] : pts[Math.max(i, 0)];
  return { x, y, angle: Math.atan2(by - ay, bx - ax) };
}

// --- job vehicles -------------------------------------------------------------

function riderShirt(world) {
  const a = world.player.character === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
  return '#' + a.shirt.toString(16).padStart(6, '0');
}

// Handed to the player for the job: flagged missionCar (never theft, never
// swept up as traffic) and parked at the kerb on the nearest fitting road.
export function spawnJobVehicle(world, x, y, { model, kind = 'car', angle = null } = {}) {
  const map = world.map;
  const car = kind !== 'bike';
  const rp = map.nearestRoadPoint(x, y, 150, car);
  // a road only far from the spot means the roads there are not loaded yet: the truck would stand 100 m away and the job fail at once ('je liet je voertuig staan')
  if (!rp || Math.hypot(rp.x - x, rp.y - y) > 40) return null;
  const v = spawnVehicleOnRoad(map, rp.road, false, Math.random, kind === 'bike', kind === 'bus', rp);
  if (model) v.model = { ...v.model, ...model };
  if (kind === 'bike') v.model = { ...v.model, rider: riderShirt(world) };
  if (angle != null) v.angle = angle;
  const kerb = Math.max(0, (rp.road.width || 6) / 2 - v.model.wid / 2 - 0.3);
  v.x = rp.x - Math.sin(v.angle) * kerb;
  v.y = rp.y + Math.cos(v.angle) * kerb;
  [v.x, v.y] = map.escapeBuilding(v.x, v.y, v.model.wid * 0.6);
  v.road = null;
  v.speed = 0;
  v.missionCar = true;
  v.sideJob = true;
  world.vehicles.push(v);
  return v;
}

function boatPoseClear(map, boat, x, y, a) {
  if (boatDryPoints(map, boat, x, y, a) > 0) return false;
  const c = Math.cos(a), s = Math.sin(a);
  const h = boat.model.len / 2 + 1.2, w = boat.model.wid / 2 + 1.2;
  for (const [lx, ly] of [[h, 0], [-h, 0], [0, w], [0, -w], [h, w], [h, -w], [-h, w], [-h, -w], [h + 4, 0]]) {
    const px = x + lx * c - ly * s, py = y + lx * s + ly * c;
    if (map.buildingsNear(px, py, 1).some((bd) => pointInPolygon(px, py, bd.pts))) return false;
    if (!isInWater(map, px, py)) return false;
  }
  return true;
}

export function spawnJobBoat(world, x, y, heading, model) {
  const boat = new Vehicle(x, y, heading, model);
  boat.isBoat = true;
  boat.missionCar = true;
  boat.sideJob = true;
  const map = world.map;
  if (!boatPoseClear(map, boat, x, y, heading)) {
    let best = null;
    for (let r = 0.5; r <= 30 && !best; r += 0.5) {
      for (let k = 0; k < 24 && !best; k++) {
        const px = x + Math.cos((k / 24) * Math.PI * 2) * r, py = y + Math.sin((k / 24) * Math.PI * 2) * r;
        for (const da of [0, 0.35, -0.35, 0.7, -0.7, Math.PI]) {
          if (boatPoseClear(map, boat, px, py, heading + da)) { best = { x: px, y: py, a: heading + da }; break; }
        }
      }
    }
    if (!best) return null;
    boat.x = best.x; boat.y = best.y; boat.angle = best.a;
    // then snug up to the quay so the player can step aboard from the kade
    const d0 = Math.hypot(x - boat.x, y - boat.y) || 1;
    const ux = (x - boat.x) / d0, uy = (y - boat.y) / d0;
    for (let k = 0; k < 20; k++) {
      const nx = boat.x + ux * 0.2, ny = boat.y + uy * 0.2;
      if (boatDryPoints(map, boat, nx + ux * 0.4, ny + uy * 0.4, boat.angle) > 0) break;
      boat.x = nx; boat.y = ny;
    }
  }
  boat.waterPoly = waterPolyAt(map, boat.x, boat.y);
  world.vehicles.push(boat);
  return boat;
}

export function releaseVehicle(world, v) {
  if (!v) return;
  v.missionCar = false;
  v.sideJob = false;
  if (v.isBoat) v.waterPoly = waterPolyAt(world.map, v.x, v.y);
}

export function removeVehicle(world, v) {
  if (!v || v.driver === 'player' || v.passenger) return;
  const i = world.vehicles.indexOf(v);
  if (i >= 0) world.vehicles.splice(i, 1);
}

// Extra parts on a job vehicle's mesh (taxi roof sign, delivery box):
// scene3d rebuilds meshes as they stream in and out, so re-attach on demand.
export function decorateVehicle(v, key, build) {
  const mesh = getVehicleMesh(v.id);
  if (!mesh || mesh.userData['sj_' + key]) return;
  mesh.userData['sj_' + key] = true;
  mesh.add(build());
}

// --- customers ----------------------------------------------------------------

export function spawnPed(world, x, y, angle = 0, opts = {}) {
  const [px, py] = world.map.escapeBuilding(x, y, 0.4);
  const ped = new Pedestrian(px, py, angle);
  if (opts.shirt) ped.clothing = opts.shirt;
  if (opts.bag != null) ped.hasBag = opts.bag;
  ped.state = 'guard';
  ped.guard = { x: px, y: py, angle };
  ped.jobPed = true;
  world.pedestrians.push(ped);
  return ped;
}

export function pedAlive(world, ped) {
  return !!ped && ped.state !== 'dead' && world.pedestrians.includes(ped);
}

export function removePed(world, ped) {
  if (!ped) return;
  const i = world.pedestrians.indexOf(ped);
  if (i >= 0 && ped.state !== 'dead') world.pedestrians.splice(i, 1);
}

// Lets a job ped go about its own business again.
export function freePed(ped, dt = 0) {
  if (!ped || ped.state === 'dead') return;
  ped.jobPed = false;
  ped.guard = null;
  ped.state = 'wander';
  ped.stateUntil = dt;
}

// Keep a waiting customer in place, facing (fx, fy) when given.
export function holdPed(ped, fx = null, fy = null) {
  if (!ped || ped.state === 'dead') return;
  if (ped.state !== 'guard' && ped.state !== 'flee' && ped.state !== 'cower') ped.state = 'guard';
  if (ped.state !== 'guard') return;
  if (!ped.guard) ped.guard = { x: ped.x, y: ped.y, angle: ped.angle };
  if (fx != null) ped.guard.angle = Math.atan2(fy - ped.y, fx - ped.x);
}

// Walks a job ped straight towards (tx, ty); returns true once it is there.
export function walkPed(world, ped, tx, ty, speed, dt, reach = 0.6) {
  if (!ped || ped.state === 'dead') return false;
  if (ped.state !== 'guard') ped.state = 'guard';
  const dx = tx - ped.x, dy = ty - ped.y, d = Math.hypot(dx, dy);
  if (d <= reach) { ped.speed = 0; return true; }
  const step = Math.min(d, speed * dt);
  const base = Math.atan2(dy, dx);
  let nx = ped.x, ny = ped.y, heading = base;
  // straight at the target, or slide along a facade when a corner is in the way
  for (const off of [0, 0.7, -0.7, 1.3, -1.3]) {
    const a = base + (ped.detour || 1) * off;
    let tx2 = ped.x + Math.cos(a) * step, ty2 = ped.y + Math.sin(a) * step;
    [tx2, ty2] = world.map.escapeBuilding(tx2, ty2, 0.3);
    if (isInWater(world.map, tx2, ty2)) continue;
    if (Math.hypot(tx2 - ped.x, ty2 - ped.y) > step * 0.5) {
      nx = tx2; ny = ty2; heading = a;
      if (off !== 0 && !ped.detour) ped.detour = Math.sign(off);
      break;
    }
  }
  ped.x = nx; ped.y = ny;
  ped.angle = heading;
  ped.guard = { x: nx, y: ny, angle: ped.angle };
  ped.speed = speed;
  return false;
}

export function say(world, ped, text, duration = 3) {
  if (!ped) return;
  ped.speechText = text;
  ped.speechUntil = world.time + duration;
}

export function vehicleSpeed(v) {
  return v ? Math.abs(v.speed || 0) : 0;
}

// --- props --------------------------------------------------------------------

const propMats = new Map();
function mat(color) {
  let m = propMats.get(color);
  if (!m) { m = new THREE.MeshLambertMaterial({ color }); propMats.set(color, m); }
  return m;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export function buildBox(w, h, d, color, tape = 0xc9a86a) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(boxGeo, mat(color));
  body.scale.set(w, h, d);
  body.position.y = h / 2;
  g.add(body);
  const band = new THREE.Mesh(boxGeo, mat(tape));
  band.scale.set(w * 1.01, 0.02, d * 0.22);
  band.position.y = h + 0.005;
  g.add(band);
  return g;
}

const wheelGeo = new THREE.TorusGeometry(0.31, 0.035, 6, 16);
const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 1, 5);

// Low-poly parked bicycle, local +x forward, wheels on the ground.
export function buildBike(color = 0x1c1c1c) {
  const g = new THREE.Group();
  const frame = mat(color), black = mat(0x151515);
  for (const x of [-0.52, 0.52]) {
    const w = new THREE.Mesh(wheelGeo, black);
    w.position.set(x, 0.34, 0);
    g.add(w);
  }
  const bar = (x0, y0, x1, y1, m = frame) => {
    const b = new THREE.Mesh(barGeo, m);
    const len = Math.hypot(x1 - x0, y1 - y0);
    b.scale.y = len;
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    b.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    g.add(b);
  };
  bar(-0.52, 0.34, -0.1, 0.36);
  bar(-0.1, 0.36, 0.34, 0.74);
  bar(-0.52, 0.34, -0.2, 0.78);
  bar(-0.2, 0.78, 0.34, 0.74);
  bar(0.52, 0.34, 0.38, 0.92);
  bar(-0.1, 0.36, -0.2, 0.8);
  const seat = new THREE.Mesh(boxGeo, black);
  seat.scale.set(0.22, 0.05, 0.1);
  seat.position.set(-0.2, 0.83, 0);
  g.add(seat);
  const handle = new THREE.Mesh(boxGeo, black);
  handle.scale.set(0.04, 0.04, 0.5);
  handle.position.set(0.38, 0.94, 0);
  g.add(handle);
  return g;
}
