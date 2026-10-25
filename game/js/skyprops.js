import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointInPolygon, normalizeAngle } from './util.js';
import { rand } from './rng.js';
import { poiLayerPlace } from './facilities.js';

// Decorative sky traffic, no gameplay effect and no collision:
//  - world.skyHeli: a trauma helicopter that now and then flies in from
//    outside the city, lands on the UMCG rooftop pad (map.meta.helipad),
//    waits with its rotor idling, then lifts off and leaves in a random
//    direction. Sometimes it is already parked there when the game starts.
//  - world.balloons: hot-air balloons drifting with the wind at 150-400 m,
//    or (mornings, evenings) rising from a park outside the centre. A balloon
//    with `scripted` set is moved by its owner (helirun.js) and left alone.
// Positions follow the game convention: x/y ground plane, z altitude (m).

const LEVEL_HEIGHT = 3.1;
export const DECK_RAISE = 0.35;

const HELI_FIRST = [45, 140];
const HELI_EVERY = [200, 420];
const HELI_PARKED_CHANCE = 0.35;
const HELI_WAIT = [30, 60];
const HELI_CRUISE = 36;
const HELI_ACCEL = 2.4;
const HELI_DECEL = 1.5;
const HELI_FAR = 1700;
const HOVER_H = 11;
const DESCEND_TIME = 8;
const LIFTOFF_TIME = 6.5;
const LIFTOFF_H = 14;
const SPOOL_RATE = 0.11;

const BALLOON_FIRST = [25, 90];
const BALLOON_EVERY = [150, 330];
const BALLOON_MAX = 3;
const BALLOON_DESPAWN = 1150;

const randIn = (r) => rand(r[0], r[1]);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoother = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

// --- map lookups --------------------------------------------------------

export function helipadInfo(map) {
  if (!map) return null;
  if (map._helipad !== undefined) return map._helipad;
  const h = poiLayerPlace(map, 'helipad');
  map._helipad = null;
  if (!h) return null;
  let carrier = null, top = 0;
  for (const b of map.buildings) {
    const [x0, y0, x1, y1] = b.bounds;
    if (h.x < x0 || h.x > x1 || h.y < y0 || h.y > y1 || !pointInPolygon(h.x, h.y, b.pts)) continue;
    const d = Math.max(2.4, b.h * LEVEL_HEIGHT) + (b.lift || 0);
    if (d > top) { top = d; carrier = b; }
  }
  if (!carrier) return null;
  map._helipad = { x: h.x, y: h.y, r: h.r, angle: h.angle, roof: top, deck: top + DECK_RAISE, building: carrier };
  return map._helipad;
}

function launchSites(map) {
  if (map._balloonSites) return map._balloonSites;
  const sites = [];
  const [ox, oy] = [-0.84, 0.33];
  for (const g of map.green || []) {
    if (g.kind !== 'park' && g.kind !== 'meadow') continue;
    const [x0, y0, x1, y1] = g.bounds || [0, 0, 0, 0];
    if ((x1 - x0) * (y1 - y0) < 40000) continue;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (Math.hypot(cx - ox, cy - oy) < 700 || !pointInPolygon(cx, cy, g.pts)) continue;
    sites.push({ x: cx, y: cy });
  }
  map._balloonSites = sites;
  return sites;
}

// --- helicopter -------------------------------------------------------------

function curveThrough(pts) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  c.arcLengthDivisions = 400;
  return { curve: c, len: c.getLength() };
}

function newHeli(pad) {
  return {
    phase: 'landed', x: pad.x, y: pad.y, z: pad.deck, heading: pad.angle, pitch: 0, bank: 0,
    v: 0, vx: 0, vy: 0, vz: 0, rotor: 0, rotorAngle: 0, timer: 0, t: 0, s: 0, path: null,
    parked: false, searchlight: 0, downwash: 0, landing: false,
  };
}

function padAxisToward(pad, dx, dy) {
  const a = pad.angle;
  return Math.cos(a) * dx + Math.sin(a) * dy >= 0 ? a : a + Math.PI;
}

function startInbound(world, pad) {
  const h = newHeli(pad);
  const beta = Math.random() * Math.PI * 2;
  const fx = pad.x + Math.cos(beta) * HELI_FAR, fy = pad.y + Math.sin(beta) * HELI_FAR;
  // final approach along the pad axis, from the side the heli arrives on
  const d = padAxisToward(pad, pad.x - fx, pad.y - fy);
  const ux = Math.cos(d), uy = Math.sin(d);
  const gx = pad.x - ux * 330, gy = pad.y - uy * 330;
  const side = (Math.random() - 0.5) * 360;
  const mx = (fx + gx) / 2 - uy * side, my = (fy + gy) / 2 + ux * side;
  const p = [
    [fx, fy, 170],
    [mx, my, 150],
    [gx, gy, 85],
    [pad.x - ux * 95, pad.y - uy * 95, pad.deck + 24],
    [pad.x - ux * 22, pad.y - uy * 22, pad.deck + HOVER_H + 1.5],
    [pad.x, pad.y, pad.deck + HOVER_H],
  ];
  Object.assign(h, curveThrough(p), { phase: 'inbound', s: 0, v: HELI_CRUISE, rotor: 1, landing: true });
  h.x = fx; h.y = fy; h.z = 170;
  h.heading = Math.atan2(my - fy, mx - fx);
  world.skyHeli = h;
  return h;
}

function startOutbound(h, pad) {
  const gamma = Math.random() * Math.PI * 2;
  const gx = Math.cos(gamma), gy = Math.sin(gamma);
  const e = padAxisToward(pad, gx, gy);
  const ex = Math.cos(e), ey = Math.sin(e);
  let mx = ex + gx, my = ey + gy;
  const ml = Math.hypot(mx, my) || 1;
  mx /= ml; my /= ml;
  const p = [
    [h.x, h.y, h.z],
    [pad.x + ex * 70, pad.y + ey * 70, pad.deck + 32],
    [pad.x + mx * 330, pad.y + my * 330, 95],
    [pad.x + gx * 900, pad.y + gy * 900, 150],
    [pad.x + gx * HELI_FAR, pad.y + gy * HELI_FAR, 175],
  ];
  Object.assign(h, curveThrough(p), { phase: 'outbound', s: 0, v: 0, landing: false });
}

const _p = new THREE.Vector3(), _t = new THREE.Vector3();

function steerAlongPath(h, dt, targetV) {
  const accel = clamp((targetV - h.v) / Math.max(dt, 1e-3), -HELI_DECEL * 1.6, HELI_ACCEL);
  h.v = Math.max(0, h.v + accel * dt);
  h.s = Math.min(h.len, h.s + h.v * dt);
  h.path_u = h.s / h.len;
  h.curve.getPointAt(h.path_u, _p);
  h.curve.getTangentAt(h.path_u, _t);
  const ox = h.x, oy = h.y, oz = h.z;
  h.x = _p.x; h.y = _p.y; h.z = _p.z;
  if (dt > 0) { h.vx = (h.x - ox) / dt; h.vy = (h.y - oy) / dt; h.vz = (h.z - oz) / dt; }
  const want = Math.atan2(_t.y, _t.x);
  attitude(h, dt, want, accel);
}

function attitude(h, dt, wantHeading, accel, pitchBias = 0) {
  const prev = h.heading;
  const dh = normalizeAngle(wantHeading - h.heading);
  h.heading += dh * Math.min(1, dt * 1.6);
  const yawRate = dt > 0 ? normalizeAngle(h.heading - prev) / dt : 0;
  const bankT = clamp(Math.atan((h.v * yawRate) / 9.81), -0.42, 0.42);
  const pitchT = clamp(-0.13 * (h.v / HELI_CRUISE) - 0.07 * accel + pitchBias, -0.24, 0.26);
  h.bank += (bankT - h.bank) * Math.min(1, dt * 1.8);
  h.pitch += (pitchT - h.pitch) * Math.min(1, dt * 1.4);
}

function updateHeli(dt, world, pad) {
  let h = world.skyHeli;
  if (!h) {
    world._heliTimer -= dt;
    if (world._heliTimer > 0) return;
    h = startInbound(world, pad);
  }
  h.t += dt;
  if (h.phase === 'scripted') return;
  // a heli left behind by the trailer or a heli run can lack its flight path:
  // start over instead of reading a curve that isn't there
  if ((h.phase === 'inbound' || h.phase === 'outbound') && (!h.curve || !(h.len > 0) || !Number.isFinite(h.s))) {
    world.skyHeli = null;
    world._heliTimer = 20;
    return;
  }
  let rotorTarget = 1;
  switch (h.phase) {
    case 'inbound': {
      const left = h.len - h.s;
      steerAlongPath(h, dt, Math.min(HELI_CRUISE, Math.sqrt(2 * HELI_DECEL * left) + 0.5));
      if (left < 0.25) { h.phase = 'descend'; h.timer = 0; h.v = 0; h.startHeading = h.heading; }
      break;
    }
    case 'descend': {
      h.timer += dt;
      const k = smoother(h.timer / DESCEND_TIME);
      const oz = h.z;
      h.z = pad.deck + HOVER_H * (1 - k);
      h.vz = dt > 0 ? (h.z - oz) / dt : 0;
      h.vx = h.vy = 0;
      h.v = 0;
      const land = padAxisToward(pad, Math.cos(h.startHeading), Math.sin(h.startHeading));
      attitude(h, dt, land, 0, 0.03 * (1 - k));
      h.bank *= 1 - Math.min(1, dt * 3);
      if (h.timer >= DESCEND_TIME) {
        h.phase = 'landed'; h.z = pad.deck; h.vz = 0; h.pitch = 0; h.bank = 0;
        h.timer = randIn(HELI_WAIT);
      }
      break;
    }
    case 'landed': {
      h.timer -= dt;
      h.landing = false;
      if (h.parked) rotorTarget = h.timer < 12 ? 1 : 0;
      else rotorTarget = h.timer < 5 ? 1 : 0.5;
      h.pitch += (0 - h.pitch) * Math.min(1, dt * 3);
      h.bank += (0 - h.bank) * Math.min(1, dt * 3);
      if (h.timer <= 0 && h.rotor > 0.97) { h.phase = 'liftoff'; h.timer = 0; h.parked = false; }
      break;
    }
    case 'liftoff': {
      h.timer += dt;
      const k = smoother(h.timer / LIFTOFF_TIME);
      const oz = h.z;
      h.z = pad.deck + LIFTOFF_H * k;
      h.vz = dt > 0 ? (h.z - oz) / dt : 0;
      h.pitch += (-0.04 * k - h.pitch) * Math.min(1, dt * 2);
      if (h.timer >= LIFTOFF_TIME) startOutbound(h, pad);
      break;
    }
    case 'outbound': {
      steerAlongPath(h, dt, Math.min(HELI_CRUISE, Math.sqrt(2 * HELI_ACCEL * 0.6 * h.s) + 1.5));
      if (h.s >= h.len - 0.1) {
        world.skyHeli = null;
        world._heliTimer = randIn(HELI_EVERY);
        return;
      }
      break;
    }
  }
  const rate = rotorTarget > h.rotor ? SPOOL_RATE : SPOOL_RATE * 0.6;
  h.rotor += clamp(rotorTarget - h.rotor, -rate * dt, rate * dt);

  const night = world.dayNight ? world.dayNight.night : 0;
  const nearPad = Math.hypot(h.x - pad.x, h.y - pad.y);
  const onFinal = (h.phase === 'inbound' && nearPad < 380) || h.phase === 'descend';
  h.searchlight += ((onFinal && night > 0.25 ? 1 : 0) - h.searchlight) * Math.min(1, dt * 1.5);
  const ground = nearPad < pad.r + 4 ? pad.deck : 0;
  h.groundZ = ground;
  const agl = h.z - ground;
  h.downwash = h.rotor > 0.4 && agl < 24 ? clamp((24 - agl) / 18, 0, 1) * clamp((h.rotor - 0.4) / 0.6, 0, 1) : 0;
}

// --- balloons -----------------------------------------------------------------

function balloonsAllowed(world) {
  const w = world.weather;
  if (w && w.active && (w.kind === 'storm' || w.kind === 'onweer' || w.intensity > 0.35)) return false;
  const dn = world.dayNight;
  return !dn || dn.sunElevation > -1;
}

function newBalloon(x, y, z, seed) {
  return {
    x, y, z, targetZ: z, vz: 0, drift: rand(2.2, 4.5), spin: rand(-0.03, 0.03), yaw: Math.random() * Math.PI * 2,
    seed, phase: 'float', timer: 0, burn: 0, burnLeft: 0, nextBurn: rand(2, 10), burnSeq: 0, burnDur: 0, age: 0,
  };
}

function spawnBalloons(world, forceLaunch = null) {
  const hour = world.dayNight ? world.dayNight.hour : 12;
  const launchTime = (hour > 6.3 && hour < 10.5) || (hour > 17.5 && hour < 20);
  const sites = launchSites(world.map);
  const launch = forceLaunch ?? (launchTime && sites.length && Math.random() < 0.55);
  const wind = world.weather ? world.weather.windAngle : 0;
  const wx = Math.cos(wind), wy = Math.sin(wind);
  const px = world.player.x, py = world.player.y;
  if (launch && sites.length) {
    const s = sites[Math.floor(Math.random() * sites.length)];
    const b = newBalloon(s.x + rand(-20, 20), s.y + rand(-20, 20), 0, Math.random() * 1e6);
    b.phase = 'ground';
    b.timer = rand(18, 35);
    b.targetZ = rand(170, 330);
    b.nextBurn = 0.5;
    world.balloons.push(b);
    return b;
  }
  const n = Math.random() < 0.35 ? 2 : 1;
  const lat = rand(-320, 320), back = rand(620, 780);
  let first = null;
  for (let i = 0; i < n && world.balloons.length < BALLOON_MAX; i++) {
    const off = i ? rand(70, 160) * (Math.random() < 0.5 ? -1 : 1) : 0;
    const x = px - wx * (back + i * rand(20, 90)) - wy * (lat + off);
    const y = py - wy * (back + i * rand(20, 90)) + wx * (lat + off);
    const b = newBalloon(x, y, rand(150, 400), Math.random() * 1e6);
    if (first) b.drift = first.drift * rand(0.9, 1.1);
    world.balloons.push(b);
    first = first || b;
  }
  return first;
}

function updateBalloons(dt, world) {
  const list = world.balloons;
  world._balloonTimer -= dt;
  if (world._balloonTimer <= 0) {
    world._balloonTimer = randIn(BALLOON_EVERY);
    if (list.length < BALLOON_MAX && balloonsAllowed(world)) spawnBalloons(world);
  }
  const wind = world.weather ? world.weather.windAngle : 0;
  const wx = Math.cos(wind), wy = Math.sin(wind);
  const [bx0, by0, bx1, by1] = world.map.meta.bounds;
  const px = world.player.x, py = world.player.y;
  for (let i = list.length - 1; i >= 0; i--) {
    const b = list[i];
    if (b.scripted) continue;
    b.age += dt;
    b.yaw += b.spin * dt;
    // burner cycles: short roars, more often while climbing off the ground
    if (b.burnLeft > 0) {
      b.burnLeft -= dt;
      if (b.burnLeft <= 0) b.nextBurn = b.phase === 'float' ? rand(7, 20) : rand(2.5, 6);
    } else {
      b.nextBurn -= dt;
      if (b.nextBurn <= 0) {
        b.burnDur = b.phase === 'float' ? rand(1.2, 3.2) : rand(2.5, 4.5);
        b.burnLeft = b.burnDur;
        b.burnSeq++;
      }
    }
    const burning = b.burnLeft > 0;
    b.burn += ((burning ? 1 : 0) - b.burn) * Math.min(1, dt * (burning ? 14 : 8));

    let driftK = 1;
    if (b.phase === 'ground') {
      b.timer -= dt;
      driftK = 0;
      if (b.timer <= 0) { b.phase = 'ascend'; b.vz = 0; }
    } else if (b.phase === 'ascend') {
      b.vz += (1.6 - b.vz) * Math.min(1, dt * 0.25);
      b.z += b.vz * dt;
      driftK = clamp(b.z / 140, 0.08, 1);
      if (b.z >= b.targetZ - 5) b.phase = 'float';
    } else {
      const want = clamp((b.targetZ - b.z) * 0.02, -0.5, 0.5) + (burning ? 0.35 : -0.08);
      b.vz += (want - b.vz) * Math.min(1, dt * 0.3);
      b.z += b.vz * dt;
    }
    const v = b.drift * driftK;
    b.vx = wx * v; b.vy = wy * v;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const dx = b.x - px, dy = b.y - py;
    const away = dx * wx + dy * wy > 0;
    const out = b.x < bx0 - 400 || b.x > bx1 + 400 || b.y < by0 - 400 || b.y > by1 + 400;
    if ((away && Math.hypot(dx, dy) > BALLOON_DESPAWN && b.phase !== 'ground') || out || b.age > 1500) list.splice(i, 1);
  }
}

// --- entry points -----------------------------------------------------------------

export function initSkyProps(world) {
  world.skyHeli = null;
  world.balloons = [];
  world._heliTimer = randIn(HELI_FIRST);
  world._balloonTimer = randIn(BALLOON_FIRST);
  world._skyInit = false;
  if (typeof window !== 'undefined') window.__gdeSky = debugApi(world);
}

function firstFrame(world, pad) {
  world._skyInit = true;
  if (pad && Math.random() < HELI_PARKED_CHANCE) parkHeli(world, pad, randIn([25, 70]));
}

function parkHeli(world, pad, wait) {
  const h = newHeli(pad);
  h.heading = pad.angle + (Math.random() < 0.5 ? 0 : Math.PI);
  h.parked = true;
  h.timer = wait;
  world.skyHeli = h;
  return h;
}

// The respawn cutscene (respawn.js) flies the trauma heli itself: a
// 'scripted' heli is posed by the caller and left alone here until
// landHeliOnPad hands it back to the normal wait / lift-off cycle.
export function scriptHeli(world) {
  const pad = helipadInfo(world.map);
  if (!pad) return null;
  if (!world.balloons) initSkyProps(world);
  world._skyInit = true;
  const h = newHeli(pad);
  Object.assign(h, { phase: 'scripted', rotor: 1, landing: true, groundZ: 0 });
  world.skyHeli = h;
  return h;
}

export function landHeliOnPad(world, wait = 25) {
  const pad = helipadInfo(world.map);
  const h = world.skyHeli;
  if (!pad || !h || h.phase !== 'scripted') return;
  Object.assign(h, {
    phase: 'landed', x: pad.x, y: pad.y, z: pad.deck, pitch: 0, bank: 0, v: 0, vx: 0, vy: 0, vz: 0,
    heading: padAxisToward(pad, Math.cos(h.heading), Math.sin(h.heading)), timer: wait, parked: false,
    landing: false, searchlight: 0, downwash: 0, groundZ: pad.deck,
  });
}

export function updateSkyProps(dt, world) {
  if (!world.balloons) initSkyProps(world);
  const pad = helipadInfo(world.map);
  if (!world._skyInit) firstFrame(world, pad);
  if (pad) updateHeli(dt, world, pad);
  updateBalloons(dt, world);
}

function debugApi(world) {
  const pad = () => helipadInfo(world.map);
  return {
    pad,
    heliArrive(dist = HELI_FAR) {
      const h = startInbound(world, pad());
      if (dist < HELI_FAR) {
        h.s = Math.max(0, h.len - dist);
        h.v = Math.min(HELI_CRUISE, Math.sqrt(2 * HELI_DECEL * dist) + 0.5);
        steerAlongPath(h, 0, h.v);
        h.heading = Math.atan2(_t.y, _t.x);
      }
      return h;
    },
    heliParked(wait = 20) { return parkHeli(world, pad(), wait); },
    heliSkipWait() { if (world.skyHeli && world.skyHeli.phase === 'landed') world.skyHeli.timer = Math.min(world.skyHeli.timer, 5); },
    balloon(launch = false) { return spawnBalloons(world, launch); },
    heli: () => world.skyHeli,
    balloons: () => world.balloons,
  };
}
