import { dist, pointInPolygon, closestPointOnSegment, isInWater } from './util.js';
import { resolveBuildingCollisions } from './player.js';
import { respawnPlayer } from './world.js';
import { playNpcPhrase } from './audio.js';
import { pushCircleOutOfVehicle, reportImpact } from './vehicle.js';

const WANDER_SPEED = 1.3;
const FLEE_SPEED = 3.4;
const FLEE_TRIGGER_RADIUS = 9;
const FLEE_SAFE_RADIUS = 16;
export const DEAD_DURATION = 2.5;
const WAYPOINT_RADIUS = 15;
const VEHICLE_HIT_SPEED = 4;
const KNOCK_DECAY = 3.5; // 1/s, how fast a knocked-down ped's slide bleeds off
const SPEECH_DURATION = 3;
const SPEECH_MIN_INTERVAL = 15;
const SPEECH_MAX_INTERVAL = 30;

// Foot police: cops are plain Pedestrians with isCop:true, a distinct
// uniform color (so the existing 3D ped sync in scene3d.js, which reads
// clothing straight off the Pedestrian, needs zero changes), and a 'seek'
// state mirroring 'flee' but steering toward the player instead of away.
const COP_CLOTHING = '#1c3fae';
const COP_SEEK_SPEED = 3.1;
const COP_SEEK_TRIGGER_RADIUS = 14;
const COP_SEEK_GIVEUP_RADIUS = 22;
const COP_BUST_FAST_SPEED = 9; // matches police.js's BUST_FAST_SPEED
const COP_BUST_CONTACT_MARGIN = 0.1;

const GRONINGS_PHRASES = [
  'Moi!', 'Hoi, alles goud?', 't Is mooi weer vandoag, net?',
  'Kom, we goan derhen.', 'Wat bin je aan het doun?', 'Doe mor gewoon.',
  'Lekker bakkie doen?', 'Nou, mag ik der wel weer over klagen.',
  'Ligt aan die kolde wind, geleuf ik.', 'Tot straks, moi!',
];

// Muted, plausible everyday-clothing palette (Dutch street clothing skews
// toward dark/neutral outerwear, with the occasional bright rain jacket).
const CLOTHING = [
  '#2b2f36', '#3a3f47', '#54463c', '#1f3a52', '#4a3a54',
  '#5c1f1f', '#1f4a2e', '#c94b3a', '#c9a227', '#3f5c8a', '#6b6b6b', '#e8e6e0',
];
const SKIN_TONES = ['#e8b48a', '#caa06f', '#8a5a3c', '#5c3d28', '#f0c9a0'];

export class Pedestrian {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 0;
    this.radius = 0.3;
    this.state = 'wander';
    this.health = 30;
    this.isCop = false;
    this.deadUntil = 0;
    this.waypoint = null;
    this.waypointTimer = 0;
    this.clothing = CLOTHING[Math.floor(Math.random() * CLOTHING.length)];
    this.skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    this.hasBag = Math.random() < 0.3;
    this.speechTimer = SPEECH_MIN_INTERVAL + Math.random() * (SPEECH_MAX_INTERVAL - SPEECH_MIN_INTERVAL);
    this.speechText = null;
    this.speechUntil = 0;
  }
}

export function spawnPedestriansNear(map, x, y, count, rng = Math.random) {
  const peds = [];
  const roads = map.roadsNear(x, y, 60).filter((r) => r.pts.length >= 2);
  if (!roads.length) return peds;

  let attempts = 0;
  while (peds.length < count && attempts < count * 25) {
    attempts++;
    const road = roads[Math.floor(rng() * roads.length)];
    const pts = road.pts;
    const i = Math.floor(rng() * (pts.length - 1));
    const a = pts[i], b = pts[i + 1];
    const t = rng();
    const px = a[0] + (b[0] - a[0]) * t;
    const py = a[1] + (b[1] - a[1]) * t;
    const segAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = -Math.sin(segAngle), ny = Math.cos(segAngle);
    const side = rng() < 0.5 ? 1 : -1;
    const offset = (road.width || 4) / 2 + 1 + rng() * 2;
    const fx = px + nx * offset * side;
    const fy = py + ny * offset * side;

    if (dist(fx, fy, x, y) > 60) continue;

    if (isInsideBuilding(map, fx, fy) || isInWater(map, fx, fy)) continue;

    peds.push(new Pedestrian(fx, fy, rng() * Math.PI * 2 - Math.PI));
  }
  return peds;
}

// Same placement machinery as spawnPedestriansNear (roads-near + building
// rejection) - police.js calls this to grow/replace its foot-police pool
// as world.wanted rises, exactly like it calls spawnVehicleOnRoad for cars.
export function spawnCopPedestriansNear(map, x, y, count, rng = Math.random) {
  const cops = spawnPedestriansNear(map, x, y, count, rng);
  for (const cop of cops) {
    cop.isCop = true;
    cop.clothing = COP_CLOTHING;
    cop.hasBag = false;
  }
  return cops;
}

function isInsideBuilding(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    if (pointInPolygon(x, y, b.pts)) return true;
  }
  return false;
}

// A candidate wander spot counts as "on the road" if it falls inside a
// drivable road's width (peds should mostly stick to sidewalks/plazas;
// occasional crossings still happen because this only rejects clearly-in-lane
// spots, not the whole street corridor).
function isOnRoad(map, x, y) {
  for (const r of map.roadsNear(x, y, 2)) {
    if (r.cat === 'foot') continue;
    const pts = r.pts;
    const halfW = (r.width || 5) / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const cp = closestPointOnSegment(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (cp.dist2 < halfW * halfW) return true;
    }
  }
  return false;
}

function pickWaypoint(map, x, y) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * WAYPOINT_RADIUS;
    const wx = x + Math.cos(ang) * r, wy = y + Math.sin(ang) * r;
    if (!isOnRoad(map, wx, wy) && !isInsideBuilding(map, wx, wy) && !isInWater(map, wx, wy)) return [wx, wy];
  }
  return [x, y];
}

function checkVehicleImpact(ped, world) {
  for (const v of world.vehicles) {
    if (v.wrecked || v.isBoat) continue;
    if (Math.abs(v.x - ped.x) > v.halfLen + 1 || Math.abs(v.y - ped.y) > v.halfLen + 1) continue;
    const push = pushCircleOutOfVehicle(ped.x, ped.y, ped.radius, v);
    if (!push) continue;
    if (Math.abs(v.speed) < VEHICLE_HIT_SPEED) {
      // a slow bump just nudges the ped aside
      ped.x = push.x;
      ped.y = push.y;
      continue;
    }
    const vx = Math.cos(v.angle) * v.speed, vy = Math.sin(v.angle) * v.speed;
    const away = Math.abs(v.speed) * 0.35;
    ped.knockVX = vx * 0.85 + push.nx * away;
    ped.knockVY = vy * 0.85 + push.ny * away;
    ped.angle = Math.atan2(-ped.knockVY, -ped.knockVX);
    ped.x = push.x;
    ped.y = push.y;
    v.speed *= v.isBike || v.isScooter ? 0.6 : 0.94;
    reportImpact(world, ped.x, ped.y, Math.abs(v.speed) * 0.5, v.driver === 'player');
    ped.state = 'dead';
    ped.health = 0;
    ped.speed = 0;
    ped.deadUntil = world.time + DEAD_DURATION;
    // Only the player's own driving racks up wanted/kill stats - ambient
    // AI traffic accidents still kill the ped (city stays alive/messy)
    // but must not blame or credit the player for something they didn't do.
    if (v.driver === 'player') {
      world.wanted = Math.min(5, world.wanted + 1);
      world.stats.pedKills++;
    }
    return;
  }
}

// Mirrors police.js's checkBusted for police vehicles - contact with a
// seeking cop on foot busts the player exactly the same way (same
// moneyPenalty formula, same fast-getaway exemption), just triggered by a
// Pedestrian instead of a Vehicle.
function checkCopBust(ped, world) {
  const player = world.player;
  if (player.inVehicle && Math.abs(player.inVehicle.speed) > COP_BUST_FAST_SPEED) return;
  const contact = ped.radius + (player.radius || 0.35) + COP_BUST_CONTACT_MARGIN;
  if (dist(ped.x, ped.y, player.x, player.y) <= contact) {
    respawnPlayer(world, { busted: true, moneyPenalty: world.wanted * 150 });
  }
}

export function updatePedestrians(dt, world) {
  const { map, player } = world;
  const peds = world.pedestrians;
  const aiming = world.weapon !== 'fists' && world.input.mouse.down;

  for (let i = peds.length - 1; i >= 0; i--) {
    const ped = peds[i];

    if (ped.state === 'dead') {
      ped.speechUntil = 0;
      if (ped.knockVX || ped.knockVY) {
        [ped.x, ped.y] = resolveBuildingCollisions(ped.x + ped.knockVX * dt, ped.y + ped.knockVY * dt, ped.radius, map);
        const decay = Math.exp(-KNOCK_DECAY * dt);
        ped.knockVX *= decay;
        ped.knockVY *= decay;
        if (Math.hypot(ped.knockVX, ped.knockVY) < 0.1) { ped.knockVX = 0; ped.knockVY = 0; }
      }
      if (world.time >= ped.deadUntil) peds.splice(i, 1);
      continue;
    }

    const dPlayer = dist(ped.x, ped.y, player.x, player.y);
    if (ped.isCop) {
      if (ped.state === 'wander' && world.wanted > 0 && dPlayer < COP_SEEK_TRIGGER_RADIUS) {
        ped.state = 'seek';
      } else if (ped.state === 'seek' && (world.wanted === 0 || dPlayer > COP_SEEK_GIVEUP_RADIUS)) {
        ped.state = 'wander';
        ped.waypoint = null;
        ped.waypointTimer = 0;
      }
    } else if (ped.state === 'wander' && aiming && dPlayer < FLEE_TRIGGER_RADIUS) {
      ped.state = 'flee';
    } else if (ped.state === 'flee' && dPlayer > FLEE_SAFE_RADIUS) {
      ped.state = 'wander';
      ped.waypoint = null;
      ped.waypointTimer = 0;
    }

    if (ped.state === 'flee') {
      const dx = ped.x - player.x, dy = ped.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(dy / len, dx / len);
      ped.speed = FLEE_SPEED;
      ped.speechUntil = 0;
    } else if (ped.state === 'seek') {
      const dx = player.x - ped.x, dy = player.y - ped.y;
      const len = Math.hypot(dx, dy) || 1;
      ped.angle = Math.atan2(dy / len, dx / len);
      ped.speed = COP_SEEK_SPEED;
      ped.speechUntil = 0;
    } else {
      ped.speechTimer -= dt;
      if (ped.speechTimer <= 0) {
        ped.speechTimer = SPEECH_MIN_INTERVAL + Math.random() * (SPEECH_MAX_INTERVAL - SPEECH_MIN_INTERVAL);
        // The speech bubble only shows up TOGETHER with real audio - no
        // silently-floating text - and NPC chatter is deliberately rare
        // (per feedback: with ~45 peds nearby, anything more frequent was
        // way too much/too often). Both the per-ped roll AND audio.js's own
        // long shared cooldown across ALL peds have to allow it.
        if (Math.random() < 0.12) {
          const phraseIdx = Math.floor(Math.random() * GRONINGS_PHRASES.length);
          if (playNpcPhrase(phraseIdx, ped.x, ped.y)) {
            ped.speechText = GRONINGS_PHRASES[phraseIdx];
            ped.speechUntil = world.time + SPEECH_DURATION;
          }
        }
      }
      if (!ped.waypoint || dist(ped.x, ped.y, ped.waypoint[0], ped.waypoint[1]) < 1.5) {
        ped.waypointTimer -= dt;
        if (ped.waypointTimer <= 0) {
          ped.waypoint = pickWaypoint(map, ped.x, ped.y);
          ped.waypointTimer = 3 + Math.random() * 4;
        }
      }
      if (ped.waypoint) {
        const dx = ped.waypoint[0] - ped.x, dy = ped.waypoint[1] - ped.y;
        const len = Math.hypot(dx, dy) || 1;
        ped.angle = Math.atan2(dy / len, dx / len);
      }
      ped.speed = WANDER_SPEED;
    }

    let nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    let ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    [nx, ny] = resolveBuildingCollisions(nx, ny, ped.radius, map);
    // peds can't swim: slide along quays like the player, but a ped that is
    // somehow already in water may walk out
    if (!isInWater(map, ped.x, ped.y) && isInWater(map, nx, ny)) {
      if (!isInWater(map, nx, ped.y)) ny = ped.y;
      else if (!isInWater(map, ped.x, ny)) nx = ped.x;
      else { nx = ped.x; ny = ped.y; }
    }
    ped.x = nx;
    ped.y = ny;

    if (ped.state === 'seek') checkCopBust(ped, world);
    checkVehicleImpact(ped, world);
  }
}

