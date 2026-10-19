import { closestPointOnSegment, normalizeAngle, pointInPolygon, isInWater, inMapWater, WATER_Y, clamp } from './util.js';
import { wallAhead } from './countrywalls.js';
import { waterClearance, pushOutOfWaterObstacles, insideWaterObstacle, swimmerCanLeave } from './waterindex.js';
import { findEnterableVehicle, distToVehicleBody, resolveBoomCollisions, resolveVehicleBuildingCollision, drivePlayerBoat, pushCircleOutOfVehicle, reportImpact, tickSinkingVehicles, speedCap } from './vehicle.js';
import { hornAt } from './movablebridges.js';
import { hornSluis } from './sluizen.js';
import { waterAt } from './waterlevels.js';
import { MOPED_LEGAL_SPEED } from './motomodels.js';
import { findRideableProp, rideProp } from './rideprops.js';
import { playAutoGejatLine } from './audio.js';
import { requestRespawn } from './world.js';
import { roadGrip } from './weather.js';
import { getSettings } from './settings.js';
import { makeJumpAssist, jumpStep } from './gamefeel.js';
import { assistDamage } from './assistlive.js';
import { ALGAE } from './eventrules.js';
import { knockDown, isKnockedDown } from './ragdoll.js';
import { resolveBuildingCollisions, resolveWalker } from './collision.js';
import { resolveWalkerProps, propAhead } from './breakables.js';
import { railingAhead } from './bridgerails.js';
import { drunkMove, drunkSteer } from './drunk.js';
import { vaultDecision, vehicleHeight, roofSpot, onRoof, localToWorld, worldToLocal as worldToLocalV, standable, PERCH_SLIP_SPEED } from './vaultkit.js';

import { inHomeFlat } from './home.js';
import { flyHeli, heliExitBlock } from './heliflight.js';
import { flyPlane } from './planeflight.js';
import { planeExitBlock } from './planecontrol.js';
import { MODS } from './cheatmods.js';
import { reportCrime } from './crime.js';
import { shift as shiftGear } from './gearbox.js';
import { buildingAt } from './tileplace.js';
export { resolveBuildingCollisions };

const BIKE_SPRINT_S = 2.5;
const BIKE_SPRINT_REST_S = 4;
const HORSE_GALLOP_S = 5;
const RADIUS = 0.35;
const WALK_SPEED = 3.0; // the default pace: a light jog
const RUN_SPEED = 6.8;
const WADE_PACE = 0.55;
const STROLL_SPEED = 1.5; // the stick pushed only a little
const STROLL_STICK = 0.55;
const CROUCH_SPEED = 1.4; // just quicker than a patrolling guard (heist.js)
const KNOCKDOWN_CLOSING = 5.5; // m/s a car has to hit you with to floor you
const FACE_TURN_RATE = 12; // rad/s the body turns toward its movement direction
const MOUSE_TURN_PER_PX = 0.0025; // rad per px of mouse motion, camera orbit
const KISS_DIST = 1.8;
const KISS_HEAL = 25;
const KISS_COOLDOWN = 3;
let kissReadyAt = 0;
const JUMP_SPEED = 3.45; // ~0.6 m at GRAVITY
export const GRAVITY = 9.8;
const SHOVE_DECAY = 6; // 1/s
const MAX_SHOVE = 7; // m/s
export const SWIM_SPEED = 1.8;
const SWIM_SPRINT = 3.0;
const SWIM_TILT_MOVING = -0.85;
const SWIM_TILT_IDLE = -0.25;
const SWIM_EXHAUSTED_AFTER = 150; // s in the water before it starts to hurt
const EXHAUST_RATE = 2; // health/sec
export const CLIMB_TIME = 0.6;
const CLIMB_REACH = 1.3;
const CLIMB_SCAN_INTERVAL = 0.15;
const SPLASH_LIFE = 1.1;
// the hedges and fences: countryside.js, which lets a vault over them
const WALK_OPTS = { byPlayer: true, noWalls: true };
const SWIM_OPTS = { kick: false };
const SWIM_EDGE_CLEAR = 0.7;

// Vaulting: SPACE right in front of a railing, hedge, fence or parked bike
// swings you over it, in front of a car you climb onto its roof (the rules:
// vaultkit.js). A jump that runs into one turns into the vault too.
const VAULT_REACH = 1.05;
const VAULT_RUN_REACH = 0.45; // extra reach when sprinting at it
const VAULT_TIME = 0.5;
const CLIMB_UP_TIME = 0.55;
const JUMP_VAULT_WINDOW = 0.45; // s after take-off a jump can still become a vault
const ROOF_WALK = 2.2;

const FALL_HURT_SPEED = 8.5; // m/s landing speed (a ~3.7 m drop at GRAVITY) above which a fall hurts
const BAIL_SPEED = 6; // m/s (22 km/h): getting out faster than this is a dive with a tumble
const BLAST_HURT = 60; // health lost when your own car explodes around you
const SUBSTEP = 1.2; // m: fast cars are integrated in steps this long (no tunnelling)
const LOCK_CRACK_S = 0.7; // a bike locked to a rack or railing takes a quick jiggle first
const CRACK_REACH = 2.2;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.moving = false;
    this.radius = RADIUS;
    this.inVehicle = null;
    this.character = 'tammo'; // 'tammo' | 'anita' - cosmetic only, 3D layer reads this to pick a model preset
    this.z = 0; // on-foot jump height above ground, meters - vehicles ignore this entirely
    this.vz = 0;
    this.gz = 0; // absolute height of the ground under the player (ring viaducts / cuttings)
    this.crouching = false;
    this.shoveX = 0; // m/s of push-back from bumping into cars/people, decays
    this.shoveY = 0;
    this.water = null; // null | 'fall' | 'swim' | 'climb'
    this.swimming = false;
    this.swimTilt = 0;
    this.swimStamina = 1;
    this.waterTime = 0;
    this.canClimbOut = false;
    this.climb = null;
    this.climbSpot = null;
    this.climbScanAt = 0;
  }

  update(dt, world) {
    const { input, map, vehicles } = world;
    if (world.camYaw == null) world.camYaw = this.angle;
    // on foot the mouse orbits the camera (world.camYaw, the horizontal
    // direction it looks in); in a vehicle scene3d.js owns the orbit
    if (!this.inVehicle && input.lookActive()) {
      world.camYaw = normalizeAngle(world.camYaw + input.mouse.dx * MOUSE_TURN_PER_PX * getSettings().mouseSensitivity * (world.scoped ? 0.3 : 1));
    }
    tickSinkingVehicles(world);
    if (this.ragdoll) {
      this.vault = null;
      this.perch = null;
      this.vx = 0; this.vy = 0;
      this.moving = false;
      this.crouching = false;
      this.crack = null;
      world.promptHold = 0;
      isKnockedDown(this, world);
      if (this.ragdoll) return;
    }
    if ((input.wasPressed('e') || input.wasPressed('f')) && !this.crack) {
      if (this.water) {
        if (this.water === 'swim' && !this.inVehicle) this.swimInteract(world);
      } else if (this.inVehicle) this.tryEnterExit(map, vehicles, world);
      else if (!inHomeFlat()) this.interact(world);
    }
    // Space (A) climbs out of the water; E stays for boarding a boat
    if (input.wasPressed(' ') && this.water === 'swim' && !this.inVehicle && this.climbSpot) this.startClimb(this.climbSpot);
    // kissing has its own key (K): E next to a car used to kiss instead of
    // getting in whenever the companion stood close
    if (input.wasPressed('k') && !this.inVehicle && !this.water) this.tryKiss(world);
    if (this.crack) {
      const c = this.crack;
      c.t += dt;
      world.promptHold = Math.min(1, c.t / LOCK_CRACK_S);
      if (this.inVehicle || this.water || Math.hypot(c.prop.x - this.x, c.prop.y - this.y) > CRACK_REACH || !c.prop.cell) {
        this.crack = null;
        world.promptHold = 0;
      } else if (c.t >= LOCK_CRACK_S) {
        this.crack = null;
        world.promptHold = 0;
        this.takeProp(world, c.prop);
      } else {
        this.vx = 0; this.vy = 0; this.moving = false;
        this.angle = Math.atan2(c.prop.y - this.y, c.prop.x - this.x);
        return;
      }
    }

    if (this.inVehicle) {
      const v = this.inVehicle;
      this.vault = null;
      this.perch = null;
      if (v.sinking) { this.x = v.x; this.y = v.y; this.angle = v.angle; return; }
      if (v.wrecked) { this.exitVehicle(map, world); if (v.blewUp && !v.isBike && !v.isScooter) this.blownOut(world, v); }
      else { this.driveVehicle(dt, input, map, world); this.gz = v.z || 0; return; }
    }

    if (this.water || isInWater(map, this.x, this.y, this.gz + this.z)) {
      if (!this.water) this.startWaterFall();
      this.updateWater(dt, world);
      return;
    }

    if (this.vault) { this.updateVault(dt, world); return; }
    if (this.perch && this.updatePerch(dt, world)) return;
    // jump/crouch - on foot only; SPACE is also "remmen" while driving
    // (handled in driveVehicle, never reached here). Crouching slows you
    // down and plays the crouch pose; collision stays 2D (x/y) anyway
    // a minigame (fuse box, padel…) can claim Space for itself
    const spaceFree = !(world.minigameUntil > world.time);
    // sprongbuffer en coyote time (#216): iets te vroeg gedrukt of net van de rand telt nog
    const jumpNow = spaceFree && jumpStep(this.jumpAssist || (this.jumpAssist = makeJumpAssist()), world.time, input.wasPressed(' '), this.z <= 0);
    if (jumpNow) {
      if (this.tryVault(world, true)) return;
      this.vz = JUMP_SPEED;
      this.jumpAt = world.time;
    } else if (this.z > 0.1 && this.vz > -2 && world.time - (this.jumpAt ?? -9) < JUMP_VAULT_WINDOW && spaceFree) {
      // a jump taken a step too early still goes over the fence it meets
      if (this.tryVault(world, false)) return;
    }
    const z0 = this.z;
    this.vz -= GRAVITY * MODS.grav * dt;
    this.z = Math.max(0, this.z + this.vz * dt);
    if (this.vz < 0 && z0 > 0.2 && this.landOnVehicle(world, z0)) return;
    if (this.z <= 0) {
      // landing after a drop off a viaduct / into a cutting
      if (this.vz < -FALL_HURT_SPEED && world) this.hurtByFall(world, -this.vz);
      this.vz = 0;
    }
    this.crouching = input.isDown('control') && this.z <= 0;

    // Modern third-person style: WASD moves relative to the camera, the body turns to face
    // the movement; while attacking/aiming the body faces the camera instead
    // this.carrying: speed factor while hauling a side-job load (sidejobs.js)
    const stick = input.padAxis ? Math.hypot(input.padAxis[0], input.padAxis[1]) : 0;
    const pace = input.isDown('shift') ? RUN_SPEED : stick > 0 && stick < STROLL_STICK ? STROLL_SPEED : WALK_SPEED;
    // wading through a ditch or the shallow edge of open water
    // (waterlevels.js waterAt, the one water rule): slower, ankle to knee deep
    const wq = world && world.map && !this.water && this.z <= 0 ? waterAt(world.map, this.x, this.y) : null;
    this.wade = wq && wq.wade && wq.body < 0 ? Math.min(0.45, wq.depth * 0.6) : 0;
    const speed = (this.crouching ? CROUCH_SPEED : pace) * (this.carrying || 1) * ((world && world.hurtWalk) || 1) * (this.wade ? WADE_PACE : 1);
    const aiming = input.mouse.down || input.mouse.rightDown;
    const dir = drunkMove(world, cameraRelativeMove(input, world.camYaw), dt);
    this.moving = !!dir;
    if (aiming) this.angle = world.camYaw;
    else if (dir) this.angle = turnToward(this.angle, dir.angle, FACE_TURN_RATE * dt);
    if (dir) {
      this.vx = Math.cos(dir.angle) * speed;
      this.vy = Math.sin(dir.angle) * speed;
    } else {
      this.vx = 0;
      this.vy = 0;
    }

    // a single step longer than the radius can tunnel past a thin wall edge
    const steps = Math.max(1, Math.ceil(Math.hypot(this.vx, this.vy) * dt / (this.radius * 0.9)));
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      let nextX = this.x + this.vx * sdt;
      let nextY = this.y + this.vy * sdt;
      if (!inHomeFlat()) [nextX, nextY] = resolveWalker(nextX, nextY, this.radius, map, this.vx, this.vy, WALK_OPTS, this.gz + this.z, this.z);
      this.x = nextX;
      this.y = nextY;
      this.followGround(map);
      if (isInWater(map, nextX, nextY, this.gz + this.z)) { this.startWaterFall(); return; }
    }
    this.resolveBodyContacts(dt, world);
  }

  // deliberate: a fresh SPACE press on the ground (not a jump that met the
  // obstacle mid-air) - only that may take you over into the water
  tryVault(world, deliberate) {
    // upstairs in the flat every prop and railing is down on the street
    if (inHomeFlat()) return false;
    const { map, input } = world;
    const dir = cameraRelativeMove(input, world.camYaw);
    const a = dir ? dir.angle : this.angle;
    const dx = Math.cos(a), dy = Math.sin(a);
    const sprint = !!dir && input.isDown('shift');
    const reach = VAULT_REACH + (sprint ? VAULT_RUN_REACH : 0);
    let ob = propAhead(this.x, this.y, dx, dy, reach, this.radius * 0.6);
    if (ob && ob.prop && ob.prop.top != null && this.gz + this.z > ob.prop.top - 0.3) ob = null;
    const rail = railingAhead(map, this.x, this.y, dx, dy, reach);
    if (rail && (!ob || rail.dist < ob.dist)) ob = rail;
    // the hedges and wire fences of the Ommeland fields
    const fence = this.gz < 0.5 ? wallAhead(this.x, this.y, dx, dy, reach, this.radius * 0.6) : null;
    if (fence && (!ob || fence.dist < ob.dist)) ob = fence;
    const car = this.vehicleAhead(world, dx, dy, reach);
    if (car && (!ob || car.dist < ob.dist)) ob = car;
    // already above it (hopping off a car roof): nothing to vault
    if (!ob || this.z >= ob.h - 0.1) return false;
    const over = ob.dist + ob.depth + this.radius + 0.3;
    const tx = this.x + dx * over, ty = this.y + dy * over;
    const kind = vaultDecision(ob.h, { top: !!(car && ob === car && car.roof), landing: this.landingAt(world, tx, ty), deliberate, sprint });
    if (kind === 'vault') this.vault = { t: 0, time: VAULT_TIME, fx: this.x, fy: this.y, tx, ty, h: ob.h, z0: this.z };
    else if (kind === 'climb') {
      const v = car.vehicle, spot = roofSpot(v, this.x + dx * car.dist, this.y + dy * car.dist);
      this.vault = { t: 0, time: CLIMB_UP_TIME, climb: v, fx: this.x, fy: this.y, z0: this.z, gz0: this.gz, lx: spot.lx, ly: spot.ly };
    } else return false;
    this.angle = a;
    this.crouching = false;
    this.vz = 0;
    if (world.audioEvents) world.audioEvents.push({ kind: 'whoosh', x: this.x, y: this.y, strength: 0.25 });
    return true;
  }

  // Nearest standing vehicle along (dx, dy) within reach: { dist, h, depth, vehicle, roof }.
  vehicleAhead(world, dx, dy, reach) {
    let best = null;
    for (const v of world.vehicles || []) {
      if (v.isBoat || v.driver === 'player' || v.wrecked || v.sinking || Math.abs(v.speed) > 3) continue;
      if (Math.abs(v.x - this.x) > v.halfLen + reach + 1 || Math.abs(v.y - this.y) > v.halfLen + reach + 1) continue;
      if (Math.abs((v.z || 0) - this.gz) > 1) continue;
      for (let s = 0; s <= reach; s += 0.1) {
        if (!pushCircleOutOfVehicle(this.x + dx * s, this.y + dy * s, this.radius * 0.6, v)) continue;
        if (best && s >= best.dist) break;
        let e = s;
        while (e < s + v.halfLen * 2 + 1 && pushCircleOutOfVehicle(this.x + dx * e, this.y + dy * e, 0.05, v)) e += 0.1;
        best = { dist: s, h: vehicleHeight(v), depth: Math.max(0.2, e - s), vehicle: v, roof: standable(v) };
        break;
      }
    }
    return best;
  }

  // Where a vault over something would come down: { blocked, water, drop }.
  landingAt(world, tx, ty) {
    const { map } = world;
    const [rx, ry] = resolveWalker(tx, ty, this.radius, map, 0, 0, WALK_OPTS, this.gz, 0);
    let blocked = Math.hypot(rx - tx, ry - ty) > 0.2;
    for (const v of world.vehicles || []) {
      if (blocked) break;
      if (!v.isBoat && Math.abs(v.x - tx) < v.halfLen + 1 && Math.abs(v.y - ty) < v.halfLen + 1 && Math.abs((v.z || 0) - this.gz) < 2 && pushCircleOutOfVehicle(tx, ty, this.radius, v)) blocked = true;
    }
    const drop = map.elev && map.elev.has ? this.gz - map.groundHeightAt(tx, ty, this.gz) : 0;
    return { blocked, water: isInWater(map, tx, ty, this.gz) || isInWater(map, (this.x + tx) / 2, (this.y + ty) / 2, this.gz), drop };
  }

  updateVault(dt, world) {
    const V = this.vault;
    V.t += dt;
    const u = Math.min(1, V.t / V.time);
    const e = u * u * (3 - 2 * u);
    this.moving = true;
    this.airPose = Math.sin(Math.PI * u);
    this.vaultU = u;
    if (V.climb) {
      const v = V.climb;
      if (v.wrecked || v.sinking || v.driver === 'player' || Math.abs(v.speed) > PERCH_SLIP_SPEED || !world.vehicles.includes(v)) {
        this.vault = null;
        this.airPose = 0;
        return;
      }
      const [tx, ty] = localToWorld(v, V.lx, V.ly);
      const top = (v.z || 0) + vehicleHeight(v) - V.gz0;
      const up = Math.sin(Math.min(1, u * 1.4) * Math.PI / 2);
      this.x = V.fx + (tx - V.fx) * e;
      this.y = V.fy + (ty - V.fy) * e;
      this.z = V.z0 + (top - V.z0) * up;
      this.vx = (tx - V.fx) / V.time;
      this.vy = (ty - V.fy) / V.time;
      if (u < 1) return;
      this.vault = null;
      this.startPerch(world, v, V.lx, V.ly);
      return;
    }
    this.x = V.fx + (V.tx - V.fx) * e;
    this.y = V.fy + (V.ty - V.fy) * e;
    this.z = V.z0 * (1 - e) + Math.sin(Math.PI * u) * (V.h + 0.2);
    this.vx = (V.tx - V.fx) / V.time;
    this.vy = (V.ty - V.fy) / V.time;
    if (u < 1) return;
    this.vault = null;
    this.airPose = 0;
    this.z = 0;
    this.vz = 0;
    this.vx = 0;
    this.vy = 0;
    if (!inHomeFlat()) [this.x, this.y] = resolveWalker(this.x, this.y, this.radius, world.map, 0, 0, WALK_OPTS, this.gz);
    this.followGround(world.map);
    if (isInWater(world.map, this.x, this.y, this.gz + this.z)) this.startWaterFall();
  }

  // Falling feet-first onto a car roof: stand on it.
  landOnVehicle(world, z0) {
    const feet0 = this.gz + z0, feet = this.gz + this.z;
    for (const v of world.vehicles || []) {
      if (!standable(v) || v.driver === 'player' || v.wrecked || v.sinking || Math.abs(v.speed) > PERCH_SLIP_SPEED) continue;
      if (Math.abs(v.x - this.x) > v.halfLen + 0.5 || Math.abs(v.y - this.y) > v.halfLen + 0.5) continue;
      const top = (v.z || 0) + vehicleHeight(v);
      if (feet0 < top - 0.05 || feet > top + 0.02) continue;
      const [lx, ly] = worldToLocalV(v, this.x, this.y);
      if (!onRoof(v, lx, ly)) continue;
      this.startPerch(world, v, lx, ly);
      return true;
    }
    return false;
  }

  startPerch(world, v, lx, ly) {
    this.perch = { v, lx, ly, ang: v.angle };
    this.gz = v.z || 0;
    this.z = vehicleHeight(v);
    this.vz = 0;
    this.airPose = 0;
    this.jumpAt = -9;
  }

  // Standing on a car roof: walk around on it (the car carries you along),
  // SPACE jumps off, walking past the edge steps down. Returns false once
  // you are off it, so the normal on-foot update takes over this frame.
  updatePerch(dt, world) {
    const P = this.perch, v = P.v, { input } = world;
    const [ex, ey] = localToWorld(v, P.lx, P.ly);
    // teleported (respawn, cutscene, mission start) or the car is gone
    if (v.wrecked || v.sinking || v.driver === 'player' || !world.vehicles.includes(v) || Math.hypot(ex - this.x, ey - this.y) > 1.5 || this.z < 0.5) { this.perch = null; return false; }
    if (Math.abs(v.speed) > PERCH_SLIP_SPEED) {
      // thrown off sideways by a car pulling away
      const side = P.ly >= 0 ? 1 : -1;
      const [ox, oy] = localToWorld(v, Math.max(-v.halfLen, Math.min(v.halfLen, P.lx)), side * (v.halfWid + this.radius + 0.15));
      this.perch = null;
      [this.x, this.y] = resolveWalker(ox, oy, this.radius, world.map, 0, 0, null, this.gz);
      this.shoveX = Math.cos(v.angle) * v.speed * 0.4 - Math.sin(v.angle) * side * 2;
      this.shoveY = Math.sin(v.angle) * v.speed * 0.4 + Math.cos(v.angle) * side * 2;
      return false;
    }
    if (input.wasPressed(' ') && !(world.minigameUntil > world.time)) {
      this.perch = null;
      this.vz = JUMP_SPEED;
      this.jumpAt = world.time;
      return false;
    }
    this.angle = normalizeAngle(this.angle + v.angle - P.ang);
    P.ang = v.angle;
    const dir = cameraRelativeMove(input, world.camYaw);
    this.moving = !!dir;
    this.crouching = false;
    this.airPose = 0;
    let wx = 0, wy = 0;
    if (dir) {
      this.angle = turnToward(this.angle, dir.angle, FACE_TURN_RATE * dt);
      wx = Math.cos(dir.angle) * ROOF_WALK;
      wy = Math.sin(dir.angle) * ROOF_WALK;
      const c = Math.cos(v.angle), s = Math.sin(v.angle);
      P.lx += (wx * c + wy * s) * dt;
      P.ly += (-wx * s + wy * c) * dt;
    }
    this.vx = wx;
    this.vy = wy;
    [this.x, this.y] = localToWorld(v, P.lx, P.ly);
    this.gz = v.z || 0;
    this.z = vehicleHeight(v);
    this.vz = 0;
    if (!onRoof(v, P.lx, P.ly)) { this.perch = null; return false; }
    return true;
  }

  // Keep gz on the surface underfoot; walking off an edge turns the drop
  // into jump height so gravity takes over (and hurts on landing).
  followGround(map) {
    if (!map.elev || !map.elev.has) { this.gz = 0; return; }
    // the walker's layer (map.surfaceAt): it keeps to the deck it is on
    let g;
    if (map.surfaceAt) {
      const st = this.surf || (this.surf = { z: 0, ribbon: null, kind: 'ground' });
      st.z = this.gz + this.z;
      g = map.surfaceAt(this.x, this.y, st).z;
    } else g = map.groundHeightAt(this.x, this.y, this.gz + this.z);
    if (g < this.gz - 0.4) this.z += this.gz - g;
    this.gz = g;
  }

  hurtByFall(world, speed) {
    const dmg = assistDamage(Math.min(100, (speed - FALL_HURT_SPEED) * 9));
    if (world.armor > 0) {
      const a = Math.min(world.armor, dmg * 0.5);
      world.armor -= a;
      world.health -= dmg - a;
    } else world.health -= dmg;
    reportImpact(world, this.x, this.y, speed, true);
    if (world.health <= 0) { world.health = 0; requestRespawn(world); }
  }

  startWaterFall() {
    this.vault = null;
    this.perch = null;
    this.airPose = 0;
    this.water = 'fall';
    this.swimming = true;
    this.crouching = false;
    this.waterTime = 0;
    this.shoveX = 0;
    this.shoveY = 0;
  }

  enterSwim(z = WATER_Y) {
    this.water = 'swim';
    this.swimming = true;
    this.crouching = false;
    this.z = Math.min(this.z, z);
    this.vz = 0;
    this.vx = 0;
    this.vy = 0;
    this.waterTime = 0;
    this.climbScanAt = 0;
  }

  leaveWater() {
    this.water = null;
    this.swimming = false;
    this.z = 0;
    this.vz = 0;
    this.swimTilt = 0;
    this.canClimbOut = false;
    this.climb = null;
    this.climbSpot = null;
    this.waterTime = 0;
  }

  // Called by vehicle.js when the bike/scooter/car the player sits in goes
  // under; drops them into the water next to it.
  ejectIntoWater(v, world) {
    if (this.inVehicle !== v) return;
    v.driver = null;
    v.horn = false;
    v.throttle = 0;
    this.inVehicle = null;
    const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
    const off = (v.halfWid || 0.5) + 0.5;
    this.x = v.x; this.y = v.y;
    for (const s of EXIT_LEFT_FIRST) {
      const ex = v.x + nx * off * s, ey = v.y + ny * off * s;
      if (inMapWater(world.map, ex, ey)) { this.x = ex; this.y = ey; break; }
    }
    this.angle = v.angle;
    this.z = v.sinking ? v.sinking.z : WATER_Y;
    this.enterSwim(WATER_Y);
  }

  updateWater(dt, world) {
    const { map, input } = world;
    if (this.water !== 'climb' && !inMapWater(map, this.x, this.y)) { this.leaveWater(); return; }

    if (this.water === 'fall') {
      this.vz -= GRAVITY * dt;
      this.z += this.vz * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
      if (inMapWater(map, nx, ny) && !insideWaterObstacle(map, nx, ny)) { this.x = nx; this.y = ny; } else { this.vx = 0; this.vy = 0; }
      if (this.z <= WATER_Y) {
        world.particles.push({ kind: 'splash', x: this.x, y: this.y, until: world.time + SPLASH_LIFE });
        const keepZ = this.z;
        this.enterSwim(WATER_Y);
        this.z = keepZ;
      }
      this.canClimbOut = false;
      return;
    }

    if (this.water === 'climb') {
      const c = this.climb;
      c.t += dt;
      const k = Math.min(1, c.t / CLIMB_TIME);
      const e = k * k * (3 - 2 * k);
      const lift = Math.min(1, k / 0.6);
      const slide = Math.max(0, (k - 0.45) / 0.55);
      this.x = c.fromX + (c.toX - c.fromX) * slide * slide * (3 - 2 * slide);
      this.y = c.fromY + (c.toY - c.fromY) * slide * slide * (3 - 2 * slide);
      this.z = c.fromZ + (0.15 - c.fromZ) * Math.sin(lift * Math.PI / 2) - 0.15 * e;
      this.swimTilt = -0.9 * (1 - e);
      this.vx = 0; this.vy = 0;
      this.canClimbOut = false;
      if (k >= 1) { this.leaveWater(); [this.x, this.y] = resolveBuildingCollisions(this.x, this.y, this.radius, map); }
      return;
    }

    const dir = cameraRelativeMove(input, world.camYaw);
    if (dir) this.angle = turnToward(this.angle, dir.angle, FACE_TURN_RATE * 0.6 * dt);
    const throttle = dir ? 1 : 0;
    const sprint = input.isDown('shift') && throttle > 0 && this.swimStamina > 0;
    this.swimStamina = clamp(this.swimStamina + (sprint ? -dt / 6 : dt / 5), 0, 1);
    const algae = world.algaeAt && world.algaeAt(this.x, this.y);
    if (algae) this.swimStamina = clamp(this.swimStamina - dt * 0.32, 0, 1);
    const speed = (sprint ? SWIM_SPRINT : SWIM_SPEED) * throttle * (algae ? ALGAE.speed : 1);
    const k = Math.min(1, dt * 3);
    this.vx += (Math.cos(this.angle) * speed - this.vx) * k;
    this.vy += (Math.sin(this.angle) * speed - this.vy) * k;
    this.moving = throttle !== 0;

    let blocked = false;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
    // stay clear of the quay walls and houseboats, sliding along them; a
    // swimmer already inside the band may still move away from the wall
    const here = waterClearance(map, this.x, this.y, SWIM_EDGE_CLEAR + 1);
    const free = (x, y) => { const d = waterClearance(map, x, y, SWIM_EDGE_CLEAR + 1); return d >= SWIM_EDGE_CLEAR || (d > 0 && d >= here); };
    if (free(nx, ny)) { this.x = nx; this.y = ny; }
    else {
      blocked = true;
      if (free(nx, this.y)) this.x = nx;
      else if (free(this.x, ny)) this.y = ny;
      else if (here < SWIM_EDGE_CLEAR && !swimmerCanLeave(free, this.x, this.y, Math.hypot(this.vx, this.vy) * dt)) {
        // a ditch narrower than the band: nowhere is 'away from the wall', so just swim on
        const d = waterClearance(map, nx, ny, SWIM_EDGE_CLEAR + 1);
        if (d > 0.05) { this.x = nx; this.y = ny; }
      }
    }
    this.resolveSwimContacts(world);

    const tiltTarget = this.moving ? SWIM_TILT_MOVING : SWIM_TILT_IDLE;
    this.swimTilt += (tiltTarget - this.swimTilt) * Math.min(1, dt * 4);
    this.z += (swimDepth(this.swimTilt, world.time) - this.z) * Math.min(1, dt * 5);

    if (world.time >= this.climbScanAt) {
      this.climbScanAt = world.time + CLIMB_SCAN_INTERVAL;
      this.climbSpot = findClimbSpot(map, this.x, this.y, this.angle);
    }
    this.canClimbOut = !!this.climbSpot;
    if (this.climbSpot && this.climbSpot.bank && blocked && throttle > 0) this.startClimb(this.climbSpot);

    this.waterTime += dt;
    if (this.waterTime > SWIM_EXHAUSTED_AFTER) {
      if (!this.exhaustWarned) { this.exhaustWarned = true; world.addMessage('Je raakt uitgeput, klim eruit!', 3); }
      world.health = Math.max(0, world.health - EXHAUST_RATE * dt);
      if (world.health <= 0) { this.leaveWater(); requestRespawn(world); }
    } else this.exhaustWarned = false;
  }

  // Swimmers can't pass through houseboats (building footprints in the water),
  // hulls, or viaduct piers.
  resolveSwimContacts(world) {
    const { map } = world;
    let [x, y] = resolveWalkerProps(this.x, this.y, this.radius, 0, 0, SWIM_OPTS);
    const hb = pushOutOfWaterObstacles(map, x, y, this.radius);
    if (hb) [x, y] = hb;
    for (const v of world.vehicles) {
      if (!v.isBoat || v.sinking || Math.abs(v.x - x) > v.halfLen + 1 || Math.abs(v.y - y) > v.halfLen + 1) continue;
      const push = pushCircleOutOfVehicle(x, y, this.radius, v);
      if (push) { x = push.x; y = push.y; }
    }
    [x, y] = resolveBuildingCollisions(x, y, this.radius, map);
    if (inMapWater(map, x, y)) { this.x = x; this.y = y; }
  }

  swimInteract(world) {
    const boat = findEnterableVehicle(this.x, this.y, world.vehicles, 1.4);
    if (boat && boat.isBoat) {
      this.leaveWater();
      this.enterVehicle(boat, world);
      return;
    }
    // no boat in reach: E still climbs out, as it used to
    if (this.climbSpot) this.startClimb(this.climbSpot);
  }

  startClimb(spot) {
    this.water = 'climb';
    this.climb = { t: 0, fromX: this.x, fromY: this.y, fromZ: this.z, toX: spot.x, toY: spot.y };
    this.angle = Math.atan2(spot.y - this.y, spot.x - this.x);
    this.canClimbOut = false;
  }

  // On foot the player is solid against vehicles and people: pushed out of
  // their footprint, with a shove that scales with how fast they were moving.
  resolveBodyContacts(dt, world) {
    const { map } = world;
    for (const v of world.vehicles) {
      if (v.isBoat || Math.abs(v.x - this.x) > v.halfLen + 1 || Math.abs(v.y - this.y) > v.halfLen + 1) continue;
      const feet = this.gz + this.z;
      if ((v.z || 0) - feet > 2 || feet >= (v.z || 0) + vehicleHeight(v) - 0.1) continue;
      const push = pushCircleOutOfVehicle(this.x, this.y, this.radius, v);
      if (!push) continue;
      [this.x, this.y] = resolveWalker(push.x, push.y, this.radius, map, 0, 0, null, this.gz + this.z);
      const closing = (Math.cos(v.angle) * v.speed + v.driftX) * push.nx + (Math.sin(v.angle) * v.speed + v.driftY) * push.ny;
      if (closing > 1) {
        const fresh = Math.hypot(this.shoveX, this.shoveY) < 1;
        const kick = Math.min(MAX_SHOVE, 1 + closing * 0.6);
        this.shoveX += push.nx * kick;
        this.shoveY += push.ny * kick;
        if (fresh) reportImpact(world, this.x, this.y, closing * 0.6, true);
        if (closing > KNOCKDOWN_CLOSING && ((!v.isBike && !v.isScooter) || v._mount === 'horse') && !this.ragdoll) this.knockedByVehicle(world, v, push, closing);
      }
    }
    const c = world.companion;
    const bodies = world.pedestrians || [];
    for (let i = -1; i < bodies.length; i++) {
      const p = i < 0 ? c : bodies[i];
      // a ragdoll is simulated by ragdoll.js; people in a car or the water are elsewhere
      if (!p || p.state === 'dead' || p.ragdoll || p.inVehicle || p.water) continue;
      const dx = this.x - p.x, dy = this.y - p.y;
      const min = this.radius + (p.radius || 0.35);
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min || d2 < 1e-8) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, overlap = min - d;
      this.x += nx * overlap * 0.5; this.y += ny * overlap * 0.5;
      [p.x, p.y] = resolveWalker(p.x - nx * overlap * 0.5, p.y - ny * overlap * 0.5, p.radius || 0.35, map);
      this.shoveX += nx * 6 * dt; this.shoveY += ny * 6 * dt;
    }
    const sh = Math.hypot(this.shoveX, this.shoveY);
    if (sh > MAX_SHOVE) { this.shoveX *= MAX_SHOVE / sh; this.shoveY *= MAX_SHOVE / sh; }
    if (sh > 0.05) {
      [this.x, this.y] = resolveWalker(this.x + this.shoveX * dt, this.y + this.shoveY * dt, this.radius, map);
      const decay = Math.exp(-SHOVE_DECAY * dt);
      this.shoveX *= decay;
      this.shoveY *= decay;
    } else {
      this.shoveX = 0;
      this.shoveY = 0;
    }
  }

  // Still inside when the fire reached the tank: thrown clear, badly hurt.
  blownOut(world, v) {
    let dmg = BLAST_HURT;
    if (world.armor > 0) { const a = Math.min(world.armor, dmg * 0.5); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    const a = Math.atan2(this.y - v.y, this.x - v.x);
    knockDown(this, world, { kind: 'blast', dead: world.health <= 0, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, vz: 5, lieFor: 2.5 });
    if (world.health <= 0) requestRespawn(world);
  }

  // Bailing out above BAIL_SPEED: an action-movie dive onto the tarmac with a
  // tumble; the car keeps rolling without you.
  diveOut(world, v, vx, vy) {
    const speed = Math.hypot(vx, vy);
    const side = -Math.sin(v.angle), sideY = Math.cos(v.angle);
    const s = (this.x - v.x) * side + (this.y - v.y) * sideY > 0 ? 1 : -1;
    // a bike or step jumped off at speed goes down on its side
    if (v.isBike || v.isScooter) { v.riderOff = true; v.riderOffAt = world.time; v.riderOffSide = -s; v.speed *= 0.6; }
    let dmg = Math.round(Math.min(45, (speed - BAIL_SPEED) * 2.2 + 3));
    if (world.armor > 0) { const a = Math.min(world.armor, dmg * 0.5); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    knockDown(this, world, {
      kind: 'hit', startPose: 'ride', dead: world.health <= 0,
      vx: vx * 0.75 + side * s * 2.5, vy: vy * 0.75 + sideY * s * 2.5, vz: 1.4 + speed * 0.06, lieFor: 1.2 + Math.min(1.5, speed * 0.05),
    });
    reportImpact(world, this.x, this.y, Math.min(14, speed * 0.6), true);
    if (world.health <= 0) requestRespawn(world);
  }

  knockedByVehicle(world, v, push, closing) {
    let dmg = Math.round((closing - 4) * 3);
    if (world.armor > 0) { const a = Math.min(world.armor, dmg); world.armor -= a; dmg -= a; }
    world.health = Math.max(0, world.health - dmg);
    const vvx = Math.cos(v.angle) * v.speed + (v.driftX || 0), vvy = Math.sin(v.angle) * v.speed + (v.driftY || 0);
    knockDown(this, world, {
      kind: 'hit', dead: world.health <= 0,
      vx: vvx * 0.8 + push.nx * closing * 0.3, vy: vvy * 0.8 + push.ny * closing * 0.3, vz: 1 + closing * 0.2,
    });
    this.shoveX = 0; this.shoveY = 0;
    if (world.health <= 0) requestRespawn(world);
  }

  // E near your companion (on foot, both out of any vehicle) is a kiss
  // instead of a vehicle interaction - shows a heart above them and heals
  // whichever one isn't currently being controlled. Returns true if it
  // fired, so tryEnterExit is skipped for this keypress.
  tryKiss(world) {
    const c = world.companion;
    if (!c || c.state === 'dead' || this.inVehicle || c.inVehicle) return false;
    if (!world.kissUnlocked) return false;
    if (Math.hypot(c.x - this.x, c.y - this.y) > KISS_DIST) return false;
    if (world.time < kissReadyAt) return false;
    kissReadyAt = world.time + KISS_COOLDOWN;
    c.health = Math.min(100, c.health + KISS_HEAL);
    world.particles.push({
      x: (this.x + c.x) / 2,
      y: (this.y + c.y) / 2,
      until: world.time + 1.4,
      kind: 'kiss',
    });
    const name = c.character === 'tammo' ? 'Tammo' : 'Tessa';
    world.addMessage(`Kusje voor ${name}! (+${KISS_HEAL} gezondheid)`, 2.5);
    return true;
  }

  tryEnterExit(map, vehicles, world = null) {
    if (this.inVehicle) {
      if (this.inVehicle.sinking && this.inVehicle.sinking.phase === 'fall') return;
      const why = heliExitBlock(this.inVehicle) || planeExitBlock(this.inVehicle);
      if (why) { if (world) world.addMessage(why, 2.5, { kind: 'tip' }); return; }
      this.exitVehicle(map, world);
      return;
    }
    const v = findEnterableVehicle(this.x, this.y, this.sameLevel(vehicles));
    if (v) this.enterVehicle(v, world);
  }

  // vehicles on the player's level (not on the viaduct overhead / in the cutting below)
  sameLevel(vehicles) {
    const z = this.gz + this.z;
    return vehicles.some((v) => Math.abs((v.z || 0) - z) > 2) ? vehicles.filter((v) => Math.abs((v.z || 0) - z) <= 2) : vehicles;
  }

  // One press of E: the nearest free vehicle (driving traffic included - its
  // driver gets yanked out) or a parked bike/scooter prop, whichever is closer.
  interact(world) {
    const v = findEnterableVehicle(this.x, this.y, this.sameLevel(world.vehicles));
    const pr = findRideableProp(this.x, this.y);
    if (pr && (!v || pr.dist < distToVehicleBody(v, this.x, this.y))) {
      if (pr.prop.locked) this.crack = { prop: pr.prop, t: 0 };
      else this.takeProp(world, pr.prop);
      return;
    }
    if (v) this.enterVehicle(v, world);
  }

  takeProp(world, prop) {
    const v = rideProp(world, prop);
    if (v) this.enterVehicle(v, world);
  }

  enterVehicle(v, world) {
    if (!v || v.driver || v.wrecked || v.sinking) return;
    const own = v.isHeroCar || v.playerOwned || v.missionCar;
    const driven = !!v.road || !!v.countryDrive; // an AI driver: city traffic or an Ommeland road user
    const stolen = !own && (driven || v.parked || (v.isPolice && !v.hijacked));
    v.carjacked = !own && driven; // its AI driver gets pulled out (pedestrians.js)
    v.driver = 'player';
    v.road = null; // player takes manual control
    v.parked = false;
    v.rollingFree = false;
    if (v.isPolice) {
      v.hijacked = true;
      // a stolen patrol car gets its full pursuit engine back
      if (v.model.name === 'police') v.model = { ...v.model, maxSpeed: Math.max(v.model.maxSpeed, 55), accel: Math.max(v.model.accel, 11) };
    }
    this.inVehicle = v;
    pushVehicleAudio(world, v, 'door_open', 'engine_start');
    if (world && stolen && !v.isBike && !v.isScooter && !v.isBoat) playAutoGejatLine(world);
  }

  exitVehicle(map, world = null, thrown = false) {
    const v = this.inVehicle;
    if (v.sinking && world) { this.ejectIntoWater(v, world); return; }
    const vx = Math.cos(v.angle) * v.speed + (v.driftX || 0), vy = Math.sin(v.angle) * v.speed + (v.driftY || 0);
    const bail = !!world && !thrown && !v.isBoat && !v.wrecked && Math.hypot(vx, vy) > BAIL_SPEED;
    v.driver = null;
    v.horn = false;
    v.handbrake = false;
    v.throttle = 0;
    this.inVehicle = null;
    pushVehicleAudio(world, v, v.wrecked || v.disabled || bail ? null : 'engine_stop', bail ? null : 'door_close');
    if (bail || v.disabled) v.rollingFree = true;
    else stopVehicle(v);
    [this.x, this.y] = findExitSpot(v, this.radius, map, EXIT_LEFT_FIRST);
    this.angle = v.angle;
    this.z = 0;
    this.vz = 0;
    this.gz = v.z || 0;
    if (map.elev && map.elev.has) {
      // never step out over the barrier of a viaduct or into the cutting
      let g = map.groundHeightAt(this.x, this.y, this.gz);
      if (Math.abs(g - this.gz) > 0.8) {
        [this.x, this.y] = findExitSpot(v, this.radius, map, [-EXIT_LEFT_FIRST[0]]);
        g = map.groundHeightAt(this.x, this.y, this.gz);
        if (Math.abs(g - this.gz) > 0.8) { this.x = v.x; this.y = v.y; g = this.gz; }
      }
      this.gz = g;
    }
    if (bail) this.diveOut(world, v, vx, vy);
  }

  driveVehicle(dt, input, map, world = null) {
    const v = this.inVehicle;
    if (v.isPlane && world) {
      flyPlane(v, dt, world);
      this.x = v.x; this.y = v.y; this.angle = v.angle;
      return;
    }
    if (v.isHeli && world) {
      flyHeli(v, dt, world);
      this.x = v.x; this.y = v.y; this.angle = v.angle;
      return;
    }
    const [ax, ay] = input.axis();
    // race countdown (world.startLockUntil) or a Fjord Frituur shift (v.shiftParked):
    // engine idles, handbrake on, no creeping over the line
    const held = !!v.shiftParked || (!!world && world.startLockUntil > world.time);
    const throttle = v.disabled || held ? 0 : ay < 0 ? 1 : ay > 0 ? -1 : 0;
    const brake = held || input.isDown(' ');
    if (held) { v.speed = 0; v.driftX = 0; v.driftY = 0; }
    v.handbrake = brake;
    v.throttle = throttle;
    v.horn = input.isDown('h') && !v.disabled;
    // a tuned-up moped over the legal 45 km/h: heat from the police, once in a while
    if (world && v.isScooter && v.model.moped && Math.abs(v.speed) > MOPED_LEGAL_SPEED * 1.04) {
      v._copHeatT = (v._copHeatT ?? 4) - dt;
      if (v._copHeatT <= 0) {
        v._copHeatT = 5;
        if (!v._copHint) { v._copHint = true; world.addMessage('Opgevoerde brommer: de politie let op je', 4, { kind: 'tip', key: 'moped-tuned' }); }
        reportCrime(world, 'tunedMoped');
      }
    }
    v.gripK = world && !v.isBoat ? roadGrip(world, v.x, v.y, v.surface) * MODS.grip : 1;
    // bikes: Shift gives a short sprint, then a breather before the next one
    if (v.isBike) {
      v.sprintT = Math.max(0, (v.sprintT || 0) - dt);
      v.sprintRest = Math.max(0, (v.sprintRest || 0) - dt);
      if (input.isDown('shift') && throttle > 0 && !v.sprintRest && !v.disabled) {
        // a horse gallops for longer than a cyclist can sprint
        const burst = v._mount === 'horse' ? HORSE_GALLOP_S : BIKE_SPRINT_S;
        v.sprintT = burst;
        v.sprintRest = burst + BIKE_SPRINT_REST_S;
      }
    }
    const steerIn = world ? Math.max(-1, Math.min(1, ax + drunkSteer(world, v))) : ax;
    const st = getSettings();
    v.shiftMode = st.shiftMode;
    v.driftAssist = st.driftAssist;
    v.bikeAssist = st.bikeAssist;
    v.clutchIn = st.shiftMode === 'clutch' && input.isDown('j');
    // motorbikes: Shift pops a wheelie on the throttle or a stoppie on the brake
    // (a pedal bike: Ctrl lifts the front wheel, bewegingrules.js)
    v.trick = v.model && v.model.motorbike ? input.isDown('shift') : !!v.isBike && input.isDown('control');
    const motoSpeed = v.model && v.model.motorbike ? Math.abs(v.speed) : 0;
    if (v.gb && st.shiftMode !== 'auto' && !held) {
      const dir = input.wasPressed('.') ? 1 : input.wasPressed(',') ? -1 : 0;
      if (dir) {
        const res = shiftGear(v.gb, dir, Math.abs(v.speed) / speedCap(v));
        if (world && res !== 'none') (world.audioEvents || (world.audioEvents = [])).push({ kind: 'gear-' + res, x: v.x, y: v.y });
      }
    }
    if (v.isBoat) {
      // the horn in front of a movable bridge: it opens (movablebridges.js)
      if (v.horn && !v._hornWas) { hornAt(v.x, v.y, v); hornSluis(v); }
      v._hornWas = v.horn;
      drivePlayerBoat(v, map, dt, throttle, steerIn, brake && v.speed !== 0);
    }
    else {
      const n = Math.min(4, Math.max(1, Math.ceil(Math.abs(v.speed) * dt / SUBSTEP)));
      for (let i = 0; i < n; i++) {
        v.applyControls(dt / n, throttle, steerIn, brake && v.speed !== 0);
        resolveVehicleBuildingCollision(v, map, dt / n);
      }
    }
    if (motoSpeed && world && !v.wrecked) {
      // a hard hit or a low-side throws the rider off, tumbling like a bail-out (diveOut)
      const lost = motoSpeed - Math.abs(v.speed);
      if (v.crashed || (lost > 6.5 && motoSpeed > 11)) {
        v.crashed = false;
        v.speed = Math.sign(v.speed || 1) * Math.max(motoSpeed * 0.8, 12);
        v.pitch = 0;
        this.exitVehicle(map, world);
        return;
      }
    }
    if (v.gb) {
      if (v.gb.stalled && !v._stallSnd && world) (world.audioEvents || (world.audioEvents = [])).push({ kind: 'engine_stall', x: v.x, y: v.y });
      v._stallSnd = v.gb.stalled;
    }
    if (world) resolveBoomCollisions(v, world);
    this.x = v.x;
    this.y = v.y;
    this.angle = v.angle;
  }
}

// WASD relative to the camera heading: W away from the camera, A/D strafe.
// (-sin, cos) is the right-hand side of a heading (three.z = world.y).
function cameraRelativeMove(input, camYaw) {
  const [ax, ay] = input.axis();
  if (!ax && !ay) return null;
  const c = Math.cos(camYaw), s = Math.sin(camYaw);
  const mx = c * -ay - s * ax, my = s * -ay + c * ax;
  return { angle: Math.atan2(my, mx) };
}

function turnToward(from, to, maxStep) {
  const d = normalizeAngle(to - from);
  return normalizeAngle(from + Math.max(-maxStep, Math.min(maxStep, d)));
}

// Door/engine cues for audio.js; bikes and steps have neither.
function pushVehicleAudio(world, v, first, second) {
  if (!world || v.isBike || v.isScooter) return;
  const q = world.audioEvents || (world.audioEvents = []);
  const door = !v.isBoat;
  // a sailing boat has no engine to start
  if (v.isBoat && v.model && v.model.sail) { first = first && first.startsWith('engine') ? null : first; second = second && second.startsWith('engine') ? null : second; }
  if (first && (door || !first.startsWith('door'))) q.push({ kind: first, x: v.x, y: v.y });
  if (second && (door || !second.startsWith('door'))) q.push({ kind: second, x: v.x, y: v.y });
}

export function stopVehicle(v) {
  v.speed = 0;
  v.driftX = 0;
  v.driftY = 0;
}

// Mesh-origin height that keeps the head just above the surface at a given
// forward lean, with a gentle bob.
export function swimDepth(tilt, time, phase = 0) {
  return WATER_Y + 0.1 - 1.6 * Math.cos(tilt) + Math.sin(time * 2.4 + phase) * 0.04;
}

const CLIMB_DIRS = 16;
// Nearest dry, walkable spot along the waterline within reach, preferring
// the direction the swimmer faces. `bank` marks park/grass banks, which
// are low enough to just walk out of.
export function findClimbSpot(map, x, y, angle, reach = CLIMB_REACH) {
  for (let r = 0.45; r <= reach; r += 0.2) {
    let best = null, bestScore = -Infinity;
    for (let i = 0; i < CLIMB_DIRS; i++) {
      const a = (i / CLIMB_DIRS) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      const sx = x + cx * r, sy = y + cy * r;
      if (inMapWater(map, sx, sy)) continue;
      const lx = sx + cx * 0.5, ly = sy + cy * 0.5;
      if (inMapWater(map, lx, ly) || isInsideBuilding(map, lx, ly)) continue;
      const score = Math.cos(normalizeAngle(a - angle));
      if (score > bestScore) { bestScore = score; best = { x: lx, y: ly }; }
    }
    if (best) {
      best.bank = map.greenNear(best.x, best.y, 0.5).some((g) => pointInPolygon(best.x, best.y, g.pts));
      return best;
    }
  }
  return null;
}

function isInsideBuilding(map, x, y) {
  return !!buildingAt(map, x, y);
}

// Sides as multipliers of the vehicle's (-sin, cos) normal, which is its
// right-hand side (three.z = world.y). Drivers get out on the left (NL),
// passengers on the right.
export const EXIT_LEFT_FIRST = [-1, 1];
export const EXIT_RIGHT_FIRST = [1, -1];

export function findExitSpot(v, radius, map, sides = EXIT_LEFT_FIRST) {
  const nx = -Math.sin(v.angle), ny = Math.cos(v.angle);
  const off = v.halfWid + 0.7;
  for (const s of sides) {
    const ex = v.x + nx * off * s, ey = v.y + ny * off * s;
    if (isInsideBuilding(map, ex, ey) || isInWater(map, ex, ey)) continue;
    return resolveBuildingCollisions(ex, ey, radius, map);
  }
  // an alley narrower than the car: out the front or the back instead
  const hl = (v.halfLen || v.halfWid * 2) + 0.7, fx = Math.cos(v.angle), fy = Math.sin(v.angle);
  for (const s of [1, -1]) {
    const ex = v.x + fx * hl * s, ey = v.y + fy * hl * s;
    if (!isInsideBuilding(map, ex, ey) && !isInWater(map, ex, ey)) return resolveBuildingCollisions(ex, ey, radius, map);
  }
  return map.escapeBuilding(v.x + nx * off * sides[0], v.y + ny * off * sides[0]);
}
