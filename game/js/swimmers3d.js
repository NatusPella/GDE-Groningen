import { buildPersonMesh, swimPose, waveOverlay } from './models3d_people.js';
import { waterClearance } from './waterindex.js';
import { WATER_Y } from './util.js';

// Ambient swimmers near the canal bridges on warm, dry days: a few people
// treading water and paddling around a spot next to a bridge, ducking under
// when a boat comes too close and waving (sometimes shouting) when the
// player passes. Purely visual, like the boat crews; a handful of meshes at
// most, built one per frame.

const MAX_SWIMMERS = 8;
const PER_BRIDGE = 3;
const SCAN_R = 120;
const SCAN_EVERY = 1.5;
const DESPAWN_R = 180;
const GREET_R = 14;
const SKINS = [0xe8b48a, 0xcaa06f, 0x8a5a3c, 0x5c3d28, 0xf0c9a0, 0xd9aa82];
const SUITS = [0x1f3a8a, 0xc0392b, 0x111214, 0x2a8fb0, 0xe8c23a, 0x2f7d46, 0xe07aa0];
const HELLO = ['Moi!', 'Kom d\'r ook in!', 'Lekker fris!', 'Heerlijk weer, hè!', 'Hoi!'];
const CAREFUL = ['Kiek uut, man!', 'Hé, rustig an!', 'Pas op, jong!'];

const swimmers = [];
const bridgesDone = new Map();
let scanT = 0;

export function niceSwimWeather(world) {
  const dn = world.dayNight, w = world.weather;
  if (!dn || dn.night > 0.03 || dn.sunElevation < 20) return false;
  if (dn.hour < 10 || dn.hour > 19.5) return false;
  if (w && (w.active || w.intensity > 0.02 || (w.overcast || 0) > 0.3 || (w.mist || 0) > 0.3)) return false;
  return true;
}

function hash(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function swimDepth(tilt, time, phase, sy) {
  return WATER_Y + 0.22 - 1.6 * Math.cos(tilt) * sy + Math.sin(time * 2.4 + phase) * 0.04;
}

function bridgeKey(r) {
  const p = r.pts[0];
  return Math.round(p[0]) + ',' + Math.round(p[1]);
}

// Spots in open water a few metres either side of a bridge deck.
function spotsNear(map, r, want, seed) {
  const out = [];
  const pts = r.pts;
  for (let i = 0; i < pts.length - 1 && out.length < want; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1) continue;
    const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty, ny = tx;
    for (let k = 0; k < 10 && out.length < want; k++) {
      const u = hash(seed + i, k) * len;
      const side = hash(seed + k, i + 7) < 0.5 ? 1 : -1;
      const off = (r.width || 4) / 2 + 3 + hash(seed * 3 + k, i) * 7;
      const x = ax + tx * u + nx * off * side, y = ay + ty * u + ny * off * side;
      if (waterClearance(map, x, y, 3) < 1.5 || map.isOnBridge(x, y)) continue;
      if (out.some((q) => Math.hypot(q.x - x, q.y - y) < 2.2)) continue;
      out.push({ x, y });
    }
  }
  return out;
}

function scan(world) {
  const { map, player } = world;
  const view = world.pedView;
  for (const r of map.roadsNear(player.x, player.y, SCAN_R)) {
    if (!r.bridge || r.pts.length < 2 || swimmers.length >= MAX_SWIMMERS) continue;
    const key = bridgeKey(r);
    if (bridgesDone.has(key)) continue;
    const seed = hash(r.pts[0][0], r.pts[0][1]) * 1000;
    const n = 1 + Math.floor(hash(seed, 3.3) * PER_BRIDGE);
    const spots = spotsNear(map, r, n, seed);
    // never pop into view: a bridge in plain sight close by waits
    if (spots.some((s) => view && view.inView(s.x, s.y) && Math.hypot(s.x - player.x, s.y - player.y) < 75)) continue;
    bridgesDone.set(key, world.time);
    for (const s of spots) {
      if (swimmers.length >= MAX_SWIMMERS) break;
      const k = swimmers.length + seed;
      swimmers.push({ x: s.x, y: s.y, hx: s.x, hy: s.y, angle: hash(k, 1) * Math.PI * 2, tx: s.x, ty: s.y, retargetAt: 0, mesh: null, seed: k, phase: hash(k, 2) * 6, greetUntil: 0, greetReady: 0, diveUntil: 0, bridge: key, leaving: false });
    }
  }
}

function buildSwimmer(sw) {
  const female = hash(sw.seed, 5) < 0.5;
  const skin = SKINS[Math.floor(hash(sw.seed, 6) * SKINS.length)];
  const suit = SUITS[Math.floor(hash(sw.seed, 7) * SUITS.length)];
  const mesh = buildPersonMesh(female ? suit : skin, skin, { seed: sw.seed * 1.7 + 3, variant: female ? 'female' : 'male', pants: suit, shoes: skin });
  mesh.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return mesh;
}

function remove(scene, sw) {
  if (sw.mesh) scene.remove(sw.mesh);
}

export function updateSwimmers3D(dt, world, scene, cam) {
  if (!world.map || !world.player) return;
  const player = world.player, time = world.time;
  const nice = niceSwimWeather(world);
  scanT -= dt;
  if (scanT <= 0) {
    scanT = SCAN_EVERY;
    if (nice) scan(world);
    for (const [k, t] of bridgesDone) if (time - t > 240 && !swimmers.some((s) => s.bridge === k)) bridgesDone.delete(k);
  }
  const view = world.pedView;
  const pv = player.inVehicle;
  const pBoat = pv && pv.isBoat ? pv : null;
  let built = false;
  for (let i = swimmers.length - 1; i >= 0; i--) {
    const sw = swimmers[i];
    const d = Math.hypot(sw.x - player.x, sw.y - player.y);
    if (!nice) sw.leaving = true;
    const hidden = !view || !view.inView(sw.x, sw.y);
    if (d > DESPAWN_R || (sw.leaving && (hidden || d > 90))) {
      remove(scene, sw);
      swimmers.splice(i, 1);
      continue;
    }
    if (!sw.mesh) {
      if (built) continue;
      built = true;
      sw.mesh = buildSwimmer(sw);
      scene.add(sw.mesh);
    }
    // wander around the home spot; shy away from boats, duck under when close
    let fleeX = 0, fleeY = 0, dive = false;
    for (const v of world.vehicles) {
      if (!v.isBoat || v.sinking) continue;
      const bx = sw.x - v.x, by = sw.y - v.y;
      const bd = Math.hypot(bx, by);
      const reach = v.halfLen + 2.5;
      if (bd > reach + 4 || bd < 1e-3) continue;
      const w = (reach + 4 - bd) / (reach + 4);
      fleeX += (bx / bd) * w; fleeY += (by / bd) * w;
      if (bd < v.halfLen * 0.9 + 0.8 && Math.abs(v.speed) > 0.4) dive = true;
    }
    if (dive && sw.diveUntil < time) sw.diveUntil = time + 1.8;
    if (time > sw.retargetAt) {
      sw.retargetAt = time + 3 + hash(sw.seed, time) * 5;
      const a = hash(sw.seed * 2, time) * Math.PI * 2, r = hash(sw.seed * 3, time) * 4;
      const tx = sw.hx + Math.cos(a) * r, ty = sw.hy + Math.sin(a) * r;
      if (waterClearance(world.map, tx, ty, 2) >= 1.2) { sw.tx = tx; sw.ty = ty; }
    }
    let mx = sw.tx - sw.x, my = sw.ty - sw.y;
    const md = Math.hypot(mx, my);
    let speed = md > 0.4 ? 0.45 : 0;
    if (md > 0.4) { mx /= md; my /= md; } else { mx = 0; my = 0; }
    if (fleeX || fleeY) {
      const fl = Math.hypot(fleeX, fleeY);
      mx = mx * 0.3 + (fleeX / fl) * 0.7; my = my * 0.3 + (fleeY / fl) * 0.7;
      speed = 1.1;
    }
    if (speed > 0) {
      const nx = sw.x + mx * speed * dt, ny = sw.y + my * speed * dt;
      if (waterClearance(world.map, nx, ny, 2) >= 0.9) { sw.x = nx; sw.y = ny; }
      const want = Math.atan2(my, mx);
      let da = want - sw.angle;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      sw.angle += da * Math.min(1, dt * 3);
    }
    // greeting the player sailing (or walking) past
    const pd = pBoat ? Math.hypot(pBoat.x - sw.x, pBoat.y - sw.y) : d;
    if (!sw.leaving && time > sw.greetReady && pd < GREET_R && (pBoat || (!pv && !player.swimming && d < 11))) {
      sw.greetReady = time + 15 + hash(sw.seed, time) * 10;
      sw.greetUntil = time + 2.4;
      const fast = pBoat && Math.abs(pBoat.speed) > 4 && pd < 9;
      if (hash(sw.seed, time * 1.3) < (fast ? 0.8 : 0.4) && world.extraSpeakers) {
        const lines = fast ? CAREFUL : HELLO;
        world.extraSpeakers.push({ x: sw.x, y: sw.y, h: 0.9, speechText: lines[Math.floor(hash(sw.seed, time * 2.1) * lines.length)], speechUntil: time + 2.2 });
      }
      const face = Math.atan2(player.y - sw.y, player.x - sw.x);
      sw.angle = face;
    }
    const mesh = sw.mesh;
    mesh.visible = d < DESPAWN_R - 10;
    if (!mesh.visible) continue;
    const moving = speed > 0.1;
    const greeting = sw.greetUntil > time;
    const tilt = moving && !greeting ? -0.85 : -0.22;
    const diving = sw.diveUntil > time;
    const under = diving ? Math.sin(Math.min(1, (sw.diveUntil - time) / 1.8) * Math.PI) * 1.6 : 0;
    mesh.position.set(sw.x, swimDepth(tilt, time, sw.phase, mesh.scale.y || 1) - under, sw.y);
    mesh.rotation.set(0, -sw.angle, tilt);
    if (d < 60) {
      swimPose(mesh, time + sw.phase, moving && !greeting);
      if (greeting) {
        const left = sw.greetUntil - time;
        waveOverlay(mesh, time + sw.phase, Math.min(1, left / 0.3, (2.4 - left) / 0.3));
      }
    }
  }
}

export function swimmerCount() {
  return swimmers.length;
}

export function swimmerSpots() {
  return swimmers.map((s) => ({ x: s.x, y: s.y, built: !!s.mesh }));
}
