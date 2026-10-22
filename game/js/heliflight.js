// The own helicopter (the Wieken Wubbo from Rotor Roelf on Eelde, shops.js):
// a Vehicle with v.isHeli, flown with easy arcade controls.
//
//   W / S        forward / back (S brakes first)   A / D   turn (yaw)
//   Space / Ctrl up / down                          Shift   boost (more speed)
//   Arrow keys   forward, back, sideways             mouse (captured) turns too
//
// Releasing the keys levels the heli and it drifts to a hover. The body and
// the rotor are swept against the city's buildings and the real Ommeland
// ones; a touchdown only holds on a flat surface (ground, a flat roof, a
// helipad) at low speed, harder ones bounce and damage it, a crash wrecks it.
// Beyond the edge of the map a soft wall turns it back. Over open water the
// canal takes it (vehicle.js sinks it).
//
// API
//   HELI_MODEL                          model spec (vehicle.js dims, top speed)
//   makeHeli(x, y, z, angle, model)     a parked heli Vehicle at height z
//   flyHeli(v, dt, world)               player.js: one frame of flight for the driven heli
//   heliExitBlock(v)                    '' when the player may step out, else why not
//   registerHelipad(pad)                { id, x, y, r, z, name, exit } landable deck (home.js, shops.js)
//   helipadAt(x, y, slack)              the pad under (x, y) or null
//   helipadById(id)                     a registered pad ('umcg', 'eelde', 'home') or null
//   heliSurface(v) -> { kind, pad }     what the landed heli stands on ('ground' | 'roof' | 'pad' | 'water')
//   updateHelis(dt, world)              main.js: rotor spool, meshes (rotor, shadow), dust, the flight card
//   parkHeli(v, x, y, z, angle)         put a heli down, rotor off
// window.__heli (debug): state(), pads(), surface(x, y)

import { Vehicle, disableVehicle, explodeVehicle, reportImpact, overOpenWater } from './vehicle.js';
import { pointInPolygon, normalizeAngle, clamp, WATER_Y } from './util.js';
import { waterAt } from './waterlevels.js';
import { inPassage } from './collision.js';
import { provinceMapBounds } from './provincemap.js';
import { getSettings } from './settings.js';
import { keyWord } from './controls.js';
const downKey = () => keyWord(getSettings().keyBinds, 'control');
import { getVehicleMesh } from './models3d_vehicles.js';
import { poseHeliRotors, updateHeliDust, ROTOR_Y } from './heli3d.js';
import { getScene } from './scene3d.js';
import { levelShadow } from './shadowlevel.js';
import { unlockAchievement } from './achievements.js';
import { helipadInfo } from './skyprops.js';
import { shapeInputs } from './helictl.js';

export const HELI_MODEL = { name: 'heli', len: 8.8, wid: 2.1, maxSpeed: 40, accel: 7, brake: 9, turnRate: 1.5 };

const LEVEL_HEIGHT = 3.1;
const CRUISE = 30, BOOST = 40, BACK = 9, SIDE = 11;
const CLIMB = 8, SINK = 7;
const ACC = 7, BOOST_ACC = 9.5, COAST = 3.5, HOVER = 13, V_ACC = 12;
const YAW_RATE = 1.45, YAW_ACC = 6;
const MOUSE_YAW = 0.0026;
const Z_SOFT = 100, Z_MAX = 125;
const SPOOL_UP = 2.4, SPOOL_DOWN = 8;
const LIFT_SPOOL = 0.85;
const EDGE_SOFT = 450, EDGE_HARD = 90;
const LAND_VZ = 4.5, LAND_H = 7, CRASH_VZ = 11, CRASH_H = 19;
const FLAT_TOL = 0.6;
const PITCHED_RIDGE = 2.6;
const ROTOR_H = ROTOR_Y; // the mesh's rotor disc
const RPM = 30;
// [forward, right, height above the skids at which it touches]
const BODY_PROBES = [[2.3, 0, 0.25], [1.1, 1.0, 0.25], [1.1, -1.0, 0.25], [-1.0, 1.0, 0.25], [-1.0, -1.0, 0.25], [-4.4, 0, 1.3]];
const ROTOR_PROBES = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * Math.PI / 3) * 4.6 - 0.2, Math.sin(k * Math.PI / 3) * 4.6, ROTOR_H]);
const SKIDS = [[1.5, 1.0], [1.5, -1.0], [-1.1, 1.0], [-1.1, -1.0]];

let world = null;
const pads = [];
let edgeWarnAt = -Infinity;
let msgAt = {};
let hud = null;
let cityBounds = null;

// --- helpers -----------------------------------------------------------------

export function makeHeli(x, y, z, angle, model = HELI_MODEL) {
  const v = new Vehicle(x, y, angle, { ...HELI_MODEL, ...model });
  v.isHeli = true;
  parkHeli(v, x, y, z, angle);
  return v;
}

export function parkHeli(v, x, y, z, angle = v.angle) {
  v.x = x; v.y = y; v.z = z; v.angle = angle;
  v.vx = 0; v.vy = 0; v.vz = 0; v.speed = 0; v.driftX = 0; v.driftY = 0; v.yawVel = 0;
  v.yawRate = 0; v.pitch = 0; v.roll = 0;
  v.rotor = 0; v.rotorAngle = v.rotorAngle || 0;
  v.onGround = true; v.groundZ = z; v.airborne = false;
  v.landKind = null;
}

export function registerHelipad(pad) {
  const i = pads.findIndex((p) => p.id === pad.id);
  if (i >= 0) pads.splice(i, 1);
  pads.push(pad);
}

export function getHelipads() {
  return pads;
}

export function helipadById(id) {
  return pads.find((p) => p.id === id) || null;
}

export function helipadAt(x, y, slack = 0) {
  for (const p of pads) {
    if (Math.abs(p.x - x) > p.r + slack || Math.abs(p.y - y) > p.r + slack) continue;
    if (Math.hypot(p.x - x, p.y - y) <= p.r + slack) return p;
  }
  return null;
}

function say(key, text, s = 3, kind = 'tip', every = 6) {
  if (!world) return;
  if (world.time - (msgAt[key] ?? -Infinity) < every) return;
  msgAt[key] = world.time;
  world.addMessage(text, s, { kind });
}

// Roof height of what stands at (x, y): the footprints of the tiles (a passage
// through one is open).
function roofAt(map, x, y) {
  let top = -Infinity, pitched = false;
  for (const b of map.buildingsNear(x, y, 1)) {
    const [x0, y0, x1, y1] = b.bounds;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, b.pts)) continue;
    if (inPassage(map, b, x, y, 0, 'car')) continue;
    const small = Math.min(x1 - x0, y1 - y0) <= 11;
    const peak = b.type === 'houseboat' ? 3 : Math.max(2.4, (b.h || 3) * LEVEL_HEIGHT) + (b.lift || 0);
    const p = !b.landmark && (b.h || 3) <= 3 && small;
    const t = peak + (p ? PITCHED_RIDGE : 0);
    if (t > top) { top = t; pitched = p; }
  }
  return top === -Infinity ? null : { top, pitched };
}

// The surface under (x, y) for something at height z: pad, roof, the street
// or an elevated road deck, or the canal.
function surfaceAt(map, x, y, z) {
  const pad = helipadAt(x, y);
  if (pad) return { z: pad.z, kind: 'pad', pad, flat: true };
  const roof = roofAt(map, x, y);
  const g = map.groundHeightAt ? map.groundHeightAt(x, y, z + 0.5) : 0;
  if (roof && roof.top > g) return { z: roof.top, kind: 'roof', flat: !roof.pitched };
  if (g < 0.5 && overOpenWater(map, x, y, 0)) {
    const wq = waterAt(map, x, y);
    return { z: wq ? wq.level : WATER_Y, kind: 'water', flat: true };
  }
  return { z: g, kind: 'ground', flat: true };
}

function local(v, lx, lz, x = v.x, y = v.y) {
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  return [x + c * lx - s * lz, y + s * lx + c * lz];
}

function hurt(v, dmg, byWorld) {
  if (dmg <= 0 || v.wrecked) return;
  v.health = Math.max(0, v.health - dmg);
  if (v.health <= 0 && !v.disabled) {
    v.fireWarned = true;
    disableVehicle(v, false, byWorld);
    if (v.driver === 'player') say('dead', 'Motorstoring! De Wieken Wubbo valt, probeer hem neer te zetten', 4, 'gevaar', 0);
  } else if (v.health < 35 && v.driver === 'player') say('smoke', 'De heli rookt: vlieg naar huis of een garage voor hij het begeeft', 4, 'gevaar', 30);
}

function mapEdge(map) {
  const pb = provinceMapBounds();
  if (pb) return pb;
  const b = map.meta && map.meta.bounds;
  return b || [-3068, -3895, 4253, 2666];
}

// --- flight --------------------------------------------------------------------

export function flyHeli(v, dt, w) {
  world = w;
  const map = w.map, inp = w.input;
  if (!dt) return;
  // velocity as the other systems see it (a shove on the ground lands here too)
  const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
  let vx = ca * v.speed + (v.driftX || 0), vy = sa * v.speed + (v.driftY || 0);
  let vz = v.vz || 0;
  const dead = !!v.disabled;
  const held = !!w.startLockUntil && w.startLockUntil > w.time;

  // controls
  const k = (key) => (inp.isDown(key) ? 1 : 0);
  let up = k(' ') - k('control');
  let yaw = k('d') - k('a');
  let fwd = Math.max(-1, Math.min(1, k('w') + k('arrowup') - k('s') - k('arrowdown')));
  let side = k('arrowright') - k('arrowleft');
  const boost = k('shift') > 0;
  // S while still flying forward brakes hard first, then it backs up
  const hover = fwd < 0 && vx * Math.cos(v.angle) + vy * Math.sin(v.angle) > 2;
  if (dead || held) { up = dead ? -1 : 0; yaw *= dead ? 0.3 : 0; fwd = 0; }
  // keys ramp up and down instead of jumping to full (helictl.js, #166)
  if (!dead && !held) ({ up, yaw, fwd, side } = shapeInputs(v.ctl || (v.ctl = {}), { up, yaw, fwd, side }, dt));
  else v.ctl = null;
  v.throttle = up;

  // rotor: spools up while someone sits in it, down when the engine died
  v.rotor = clamp((v.rotor || 0) + (dead ? -dt / SPOOL_DOWN : dt / SPOOL_UP), 0, 1);
  const ready = v.rotor >= LIFT_SPOOL;
  if (!ready && !dead && up > 0 && v.onGround) say('spool', 'De rotor draait op, nog even...', 1.6, 'tip', 4);
  else if (v.onGround && ready && !dead && fwd !== 0 && up <= 0) say('takeoff', 'Eerst opstijgen: Spatie', 2.2, 'tip', 8);

  // heading: keys build a turn rate, the mouse turns straight
  const want = yaw * YAW_RATE * (v.onGround && !ready ? 0 : 1);
  v.yawRate = (v.yawRate || 0) + (want - (v.yawRate || 0)) * Math.min(1, dt * YAW_ACC);
  let turn = v.yawRate * dt;
  if (inp.lookActive && inp.lookActive() && !dead && !(v.onGround && !ready)) turn += (inp.mouse.dx || 0) * MOUSE_YAW * getSettings().mouseSensitivity;
  v.angle = normalizeAngle(v.angle + turn);
  const c = Math.cos(v.angle), s = Math.sin(v.angle);

  // horizontal: towards the speed the keys ask for, in the heli's own frame
  const fwdSpeed = hover ? 0 : fwd > 0 ? fwd * (boost ? BOOST : CRUISE) : fwd * BACK;
  let tvx = c * fwdSpeed - s * side * SIDE, tvy = s * fwdSpeed + c * side * SIDE;
  const steering = fwd !== 0 || side !== 0;
  let rate = hover ? HOVER : steering ? (boost ? BOOST_ACC : ACC) : COAST;
  if (v.onGround) { tvx = 0; tvy = 0; rate = 10; }
  if (dead) { tvx = vx; tvy = vy; }
  let dx = tvx - vx, dy = tvy - vy;
  const dl = Math.hypot(dx, dy), step = rate * dt;
  if (dl > step) { dx *= step / dl; dy *= step / dl; }
  const ax = dx / dt, ay = dy / dt;
  vx += dx; vy += dy;

  // vertical
  let tvz = up > 0 ? CLIMB * up : up < 0 ? -SINK : 0;
  if (dead) tvz = -10;
  else if (!ready) tvz = Math.min(tvz, 0);
  // landing assist: the sink rate eases off close to whatever is below
  if (tvz < 0 && !dead) tvz = Math.max(tvz, -(1.6 + Math.max(0, v.z - (v.groundZ ?? v.z)) * 0.55));
  if (v.z > Z_SOFT && tvz > 0) tvz *= clamp((Z_MAX - v.z) / (Z_MAX - Z_SOFT), 0, 1);
  if (v.z >= Z_SOFT && up > 0) say('ceiling', 'Hoger mag niet: boven de 125 meter is het luchtruim van Eelde', 3, 'tip', 20);
  vz += clamp(tvz - vz, -V_ACC * dt * (hover ? 1.3 : 1), V_ACC * dt * (hover ? 1.3 : 1));

  // soft wall at the edge of the map
  const E = mapEdge(map);
  const inset = (d) => Math.max(0, EDGE_SOFT - d);
  const px0 = inset(v.x - E[0]), px1 = inset(E[2] - v.x), py0 = inset(v.y - E[1]), py1 = inset(E[3] - v.y);
  if (px0 || px1 || py0 || py1) {
    vx += (px0 - px1) / EDGE_SOFT * 30 * dt;
    vy += (py0 - py1) / EDGE_SOFT * 30 * dt;
    if (Math.max(px0, px1, py0, py1) > EDGE_SOFT * 0.35 && w.time - edgeWarnAt > 15) {
      edgeWarnAt = w.time;
      say('edge', 'Hier houdt Grunn op. Keer om, verder vliegt de Wieken Wubbo niet', 3.5, 'tip', 0);
    }
  }

  // integrate, then the buildings
  const ox = v.x, oy = v.y, oz = v.z;
  let nx = clamp(v.x + vx * dt, E[0] + EDGE_HARD, E[2] - EDGE_HARD);
  let ny = clamp(v.y + vy * dt, E[1] + EDGE_HARD, E[3] - EDGE_HARD);
  let nz = v.z + vz * dt;
  if (v.onGround && ready && up > 0 && !dead) v.onGround = false;

  const hspeed0 = Math.hypot(vx, vy);
  let hitH = 0, rotorHit = false;
  // each probe's roof is looked up once per position this frame (the new
  // position is asked again by the resting pass below)
  const topMemo = new Map();
  const probeTop = (lx, lz, x, y) => {
    const key = lx * 1009 + lz;
    const m = topMemo.get(key);
    if (m && m.x === x && m.y === y) return m.top;
    const [px, py] = local(v, lx, lz, x, y);
    const r = roofAt(map, px, py);
    const top = r ? r.top : -Infinity;
    if (!m || x === nx) topMemo.set(key, { x, y, top });
    return top;
  };
  // a probe moving into a building blocks; one that already overlapped (a
  // spawn or a takeoff right next to a wall) may move out again
  const enters = (lx, lz, h) => probeTop(lx, lz, nx, ny) > oz + h + 0.05 && probeTop(lx, lz, ox, oy) <= oz + h + 0.05;
  for (const [lx, lz, h] of BODY_PROBES) if (enters(lx, lz, h)) { hitH = 1; break; }
  if (!hitH && v.rotor > 0.3) for (const [lx, lz, h] of ROTOR_PROBES) if (enters(lx, lz, h)) { hitH = 2; rotorHit = true; break; }
  if (hitH) {
    nx = ox; ny = oy;
    const impact = hspeed0;
    vx *= -0.3; vy *= -0.3;
    if (impact > 2.5 && w.time - (v.hitAt || -9) > 0.35) {
      v.hitAt = w.time;
      reportImpact(w, v.x, v.y, impact * (rotorHit ? 1.2 : 1), true);
      hurt(v, (impact - 2.5) * (rotorHit ? 4 : 2.6), w);
      if (rotorHit) say('rotor', 'Au! De rotor tikt het gebouw', 2, 'gevaar', 3);
    }
  }
  // sinking onto a roof edge or a ridge under the nose, tail or rotor: rest on
  // it (only what it came down on; what it already overlapped blocks sideways)
  const rest = (list) => {
    for (const [lx, lz, h] of list) {
      const t = probeTop(lx, lz, nx, ny);
      if (t > nz + h && t <= oz + h + 0.05) { nz = t - h; if (vz < 0) vz = 0; v.blocked = w.time; }
    }
  };
  rest(BODY_PROBES);
  if (v.rotor > 0.3) rest(ROTOR_PROBES);

  // the ground, a roof, a pad or the water under the skids
  const surf = surfaceAt(map, nx, ny, oz);
  v.groundZ = surf.z;
  v.surfaceKind = surf.kind;
  if (nz <= surf.z + 0.02 && vz > 0 && !v.onGround) {
    nz = Math.max(nz, surf.z);
  } else if (nz <= surf.z + 0.02) {
    const impactV = -vz, hs = Math.hypot(vx, vy);
    nz = surf.z;
    if (!v.onGround) {
      let spread = 0;
      if (surf.kind !== 'water') {
        let lo = Infinity, hi = -Infinity;
        for (const [lx, lz] of SKIDS) {
          const [sx, sy] = local(v, lx, lz, nx, ny);
          const g = surfaceAt(map, sx, sy, surf.z).z;
          lo = Math.min(lo, g); hi = Math.max(hi, g);
        }
        spread = hi - lo;
      }
      const flat = surf.flat && spread <= FLAT_TOL;
      if (surf.kind === 'water') {
        vz = Math.min(vz, 0);
      } else if (impactV > CRASH_VZ || hs > CRASH_H) {
        reportImpact(w, nx, ny, 14, true);
        hurt(v, 70 + impactV * 3, w);
        vz = Math.max(1.5, impactV * 0.25);
        vx *= 0.3; vy *= 0.3;
        if (v.health <= 0) { v.x = nx; v.y = ny; v.z = nz; explodeVehicle(v, w); return; }
        say('crash', 'KRAK! Dat was geen landing meer', 2.5, 'gevaar', 2);
      } else if (!flat) {
        vz = 2.2 + impactV * 0.2;
        vx *= 0.6; vy *= 0.6;
        if (impactV > 1.5 || hs > 3) hurt(v, impactV * 2 + hs, w);
        say('flat', surf.kind === 'roof' && !surf.flat ? 'Op een schuin dak kun je niet landen' : 'Hier kun je niet landen: niet vlak genoeg', 2.5, 'tip', 4);
      } else if (impactV > LAND_VZ || hs > LAND_H) {
        reportImpact(w, nx, ny, 6 + impactV, true);
        hurt(v, Math.max(0, impactV - LAND_VZ) * 7 + Math.max(0, hs - LAND_H) * 3, w);
        vz = impactV * 0.3;
        vx *= 0.4; vy *= 0.4;
        say('hard', `Harde landing! Eerst stilhangen (W los, S remt), dan rustig dalen met ${downKey()}`, 3, 'tip', 5);
      } else {
        v.onGround = true;
        v.landKind = surf.kind;
        v.landPad = surf.pad || null;
        vz = 0;
        onTouchdown(v, surf, w);
      }
    } else vz = Math.max(0, vz);
  } else if (nz > surf.z + 0.35) v.onGround = false;
  if (v.onGround) {
    // skids on the ground: friction, and sitting down with the rotor still
    const fr = Math.max(0, 1 - dt * 6);
    vx *= fr; vy *= fr;
    nz = surf.z;
  }

  v.x = nx; v.y = ny; v.z = nz;
  v.vx = vx; v.vy = vy; v.vz = vz;
  v.speed = vx * c + vy * s;
  v.driftX = vx - c * v.speed; v.driftY = vy - s * v.speed;
  v.airborne = false;
  if (!v.onGround && !v.flown) {
    v.flown = true;
    if (v.playerOwned) unlockAchievement(w, 'eigen_vleugels');
  }

  // attitude: nose down to go, into the turn, level again when let go
  const fwdV = vx * c + vy * s, sideV = -vx * s + vy * c;
  const fwdA = ax * c + ay * s, sideA = -ax * s + ay * c;
  const air = v.onGround ? 0 : 1;
  const pitchT = air * clamp(-fwdV / BOOST * 0.16 - fwdA * 0.018, -0.3, 0.2);
  const rollT = air * clamp(sideV / SIDE * 0.12 + sideA * 0.015 + v.yawRate * clamp(Math.abs(fwdV) / CRUISE, 0, 1) * 0.16, -0.35, 0.35);
  v.pitch = (v.pitch || 0) + (pitchT - (v.pitch || 0)) * Math.min(1, dt * 3.5);
  v.roll = (v.roll || 0) + (rollT - (v.roll || 0)) * Math.min(1, dt * 3.5);
}

function onTouchdown(v, surf, w) {
  if (v.driver !== 'player') return;
  if (surf.kind === 'pad' && surf.pad) {
    if (surf.pad.id === 'umcg') unlockAchievement(w, 'umcg_heli');
    if (surf.pad.onLand) surf.pad.onLand(v);
    return;
  }
  if (surf.kind === 'roof') { say('roof', 'Geland op een dak. Uitstappen kan hier niet: zoek de grond of je eigen helidek', 3.5, 'tip', 12); return; }
  if (surf.kind === 'ground' && v.playerOwned && outsideCity(w.map, v.x, v.y)) unlockAchievement(w, 'weiland');
}

function outsideCity(map, x, y) {
  if (!cityBounds) cityBounds = (map.meta && map.meta.bounds) || [-3068, -3895, 4253, 2666];
  const B = cityBounds;
  return x < B[0] || x > B[2] || y < B[1] || y > B[3];
}

// '' when the player can climb out, else the reason.
export function heliExitBlock(v) {
  if (!v || !v.isHeli || v.wrecked || v.sinking) return '';
  if (!v.onGround) return `Eerst landen: laag en langzaam boven een vlak stuk, dan ${downKey()}`;
  if (Math.hypot(v.vx || 0, v.vy || 0) > 2) return 'Eerst stilstaan';
  if (v.landKind === 'roof' || (v.landKind === 'pad' && v.landPad && v.landPad.exit === false)) return 'Hier kun je niet uitstappen: je staat op een dak';
  return '';
}

export function heliSurface(v) {
  return { kind: v.onGround ? v.landKind || 'ground' : null, pad: v.onGround ? v.landPad || null : null };
}

// --- per frame for every heli ------------------------------------------------------

export function updateHelis(dt, w) {
  world = w;
  if (!pads.some((p) => p.id === 'umcg')) {
    const u = helipadInfo(w.map);
    registerHelipad(u ? { id: 'umcg', x: u.x, y: u.y, r: u.r, z: u.deck, name: 'UMCG-helidek', exit: false, label: 'UMCG-helidek · hier stap je niet uit' } : { id: 'umcg', x: 1e9, y: 1e9, r: 0, z: 0 });
  }
  const scene = getScene();
  let dustSrc = null, mine = null;
  const pv = w.player.inVehicle;
  for (const v of w.vehicles) {
    if (!v.isHeli) continue;
    if (v !== pv || v.wrecked) {
      // nobody flying it: the rotor runs down, a wreck or a heli left in the air comes down
      v.rotor = Math.max(0, (v.rotor || 0) - dt / SPOOL_DOWN);
      if (!v.sinking) {
        const g = surfaceAt(w.map, v.x, v.y, v.z).z;
        if (v.z > g + 0.05) { v.vz = (v.vz || 0) - 9.8 * dt; v.z = Math.max(g, v.z + v.vz * dt); v.onGround = false; }
        else { v.z = g; v.vz = 0; v.onGround = true; v.pitch *= 0.9; v.roll *= 0.9; }
      }
    } else mine = v;
    v.rotorAngle = ((v.rotorAngle || 0) + dt * RPM * (v.rotor || 0)) % (Math.PI * 2);
    const mesh = getVehicleMesh(v.id);
    if (mesh) {
      poseHeliRotors(mesh, v.rotorAngle, v.rotor || 0);
      const sh = mesh.userData.shadow;
      if (sh) {
        const alt = Math.max(0, v.z - (v.groundZ ?? v.z));
        // the blob is a child of the tilting mesh: straight down in the mesh's own frame slid it sideways by alt x sin(tilt) (30 m up, 20 degrees of roll:
        // 10 m) and tilted it with the heli (#391). Offset and rotation get the mesh's pitch and roll taken out again, so it lies flat under the heli.
        levelShadow(sh, mesh, alt - 0.03);
        const k = clamp(1 - alt / 60, 0, 1);
        sh.visible = k > 0.05;
        sh.scale.set(v.model.len * (0.9 + (1 - k) * 0.4), 1, 3.2 * (0.9 + (1 - k) * 0.4));
      }
    }
    const alt = v.z - (v.groundZ ?? v.z);
    const blow = (v.rotor || 0) * clamp(1 - alt / 9, 0, 1);
    if (blow > 0.05 && (!dustSrc || v === pv)) dustSrc = { x: v.x, y: v.y, ground: v.groundZ ?? v.z, strength: blow, water: v.surfaceKind === 'water' };
  }
  updateHeliDust(scene, dt, dustSrc);
  updateFlightCard(w, mine);
}

// --- the flight card (HUD) ------------------------------------------------------------

const CSS = `
#hud .hud-heli { position: absolute; right: var(--hud-edge, 46px); bottom: var(--hud-edge, 46px); display: none; min-width: 188px;
  padding: 8px 16px 10px 12px; color: #f0ede4; text-shadow: var(--hud-shadow);
  background: linear-gradient(90deg, rgba(12, 20, 14, 0.86), rgba(23, 48, 31, 0.55) 80%, rgba(23, 48, 31, 0.1));
  border-left: 3px solid var(--hh, #3fc97a); }
body.heli-flying #hud .hud-heli { display: block; }
body.heli-flying #hud .hud-speedo { display: none; }
body.hide-minimap #hud .hud-heli { right: 16px; bottom: 50px; }
#hud .hud-heli small { display: block; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--hh, #3fc97a); }
#hud .hud-heli .hh2-row { display: flex; gap: 16px; align-items: baseline; margin-top: 2px; }
#hud .hud-heli .hh2-row div { display: flex; flex-direction: column; line-height: 1; }
#hud .hud-heli .hh2-row b { font-weight: normal; font-size: 30px; letter-spacing: 1px; }
#hud .hud-heli .hh2-row span { font-size: 12px; letter-spacing: 1px; color: rgba(240,237,228,0.65); }
#hud .hud-heli .hh2-vs { font-size: 16px; }
#hud .hud-heli .hh2-st { margin-top: 5px; font-family: 'Arial Narrow', Arial, sans-serif; font-size: 15px; letter-spacing: 0.2px; }
#hud .hud-heli .hh2-bar { margin-top: 5px; height: 4px; background: rgba(240,237,228,0.15); }
#hud .hud-heli .hh2-bar i { display: block; height: 100%; background: var(--hh, #3fc97a); }
`;

function initCard() {
  const root = document.getElementById('hud');
  if (!root) return null;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  const el = document.createElement('div');
  el.className = 'hud-heli';
  el.setAttribute('role', 'status');
  el.innerHTML = '<small>Wieken Wubbo</small><div class="hh2-row"><div><b data-k="alt">0</b><span>METER HOOG</span></div>' +
    '<div><b data-k="spd">0</b><span>KM/U</span></div><div><b class="hh2-vs" data-k="vs">0</b><span>M/S</span></div></div>' +
    '<div class="hh2-st" data-k="st"></div><div class="hh2-bar"><i data-k="hp"></i></div>';
  root.appendChild(el);
  const q = (k) => el.querySelector(`[data-k="${k}"]`);
  return { el, alt: q('alt'), spd: q('spd'), vs: q('vs'), st: q('st'), hp: q('hp'), cache: {} };
}

function setText(key, el, text) {
  if (hud.cache[key] === text) return;
  hud.cache[key] = text;
  el.textContent = text;
}

function landingStatus(v) {
  if (v.disabled) return ['Motorstoring: zet hem neer!', '#ff5a4a'];
  if (v.onGround) {
    if (v.rotor < LIFT_SPOOL) return ['Rotor draait op...', '#e8c93a'];
    const why = heliExitBlock(v);
    if (v.landKind === 'pad' && v.landPad && v.landPad.label) return [v.landPad.label, '#3fc97a'];
    return why ? ['Geland op een dak · Spatie om op te stijgen', '#e8c93a'] : ['Geland · E uitstappen, Spatie opstijgen', '#3fc97a'];
  }
  const alt = v.z - (v.groundZ ?? 0);
  const hs = Math.hypot(v.vx || 0, v.vy || 0);
  if (v.surfaceKind === 'water' && alt < 12) return ['Onder je is water!', '#ff9a3c'];
  if (alt < 14) {
    if (hs > LAND_H || -(v.vz || 0) > LAND_VZ) return ['Te snel om te landen: W los, S remt', '#ff9a3c'];
    if (v.surfaceKind === 'roof') return ['Dak onder je', '#e8c93a'];
    return [`Klaar om te landen: ${downKey()}`, '#3fc97a'];
  }
  if (v.z >= Z_SOFT) return ['Plafond: hoger mag niet', '#e8c93a'];
  return ['', ''];
}

function updateFlightCard(w, v) {
  const flying = !!v && !v.wrecked && !v.sinking;
  document.body.classList.toggle('heli-flying', flying);
  if (!flying) return;
  if (!hud) hud = initCard();
  if (!hud) return;
  const alt = Math.max(0, v.z - (v.groundZ ?? 0));
  setText('alt', hud.alt, String(Math.round(alt)));
  setText('spd', hud.spd, String(Math.round(Math.hypot(v.vx || 0, v.vy || 0) * 3.6)));
  const vs = v.vz || 0;
  setText('vs', hud.vs, `${vs > 0.3 ? '▲' : vs < -0.3 ? '▼' : '·'} ${Math.abs(vs).toFixed(1).replace('.', ',')}`);
  const [text, color] = landingStatus(v);
  setText('st', hud.st, text);
  hud.st.style.display = text ? '' : 'none';
  const hc = color || (v.health < 35 ? '#ff5a4a' : '#3fc97a');
  if (hud.cache.color !== hc) { hud.cache.color = hc; hud.el.style.setProperty('--hh', hc); }
  const hp = Math.round(clamp(v.health, 0, 100));
  if (hud.cache.hp !== hp) { hud.cache.hp = hp; hud.hp.style.width = hp + '%'; }
}

if (typeof window !== 'undefined') {
  window.__heli = {
    state: () => {
      const v = world && world.vehicles.find((q) => q.isHeli && (q.driver === 'player' || q.playerOwned));
      return v ? { x: Math.round(v.x), y: Math.round(v.y), z: +v.z.toFixed(2), ground: v.groundZ, onGround: v.onGround, landKind: v.landKind, pad: v.landPad && v.landPad.id, rotor: +(v.rotor || 0).toFixed(2), speed: +Math.hypot(v.vx || 0, v.vy || 0).toFixed(1), vz: +(v.vz || 0).toFixed(2), health: Math.round(v.health), driver: v.driver, surface: v.surfaceKind, stored: !!v.homeStored } : null;
    },
    pads: () => pads.map((p) => ({ id: p.id, x: Math.round(p.x), y: Math.round(p.y), z: p.z, r: p.r })),
    surface: (x, y, z = 200) => world && surfaceAt(world.map, x, y, z),
  };
}
