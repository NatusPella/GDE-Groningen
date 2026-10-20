// H6 "Het museum stond er al zo", the showpiece heist. missions.js runs the stages; this
// module owns what happens in them:
//   plan        the blueprint of the museum (heistui.js) while Tessa explains,
//               then the choice of approach: 'sluip' (the back door, a lock,
//               the guard in zaal 1) or 'vermomd' (cleaners' overalls, a pass
//               lifted from the guard at the glass door; guards only see you
//               up close)
//   goto watch  cameras on poles and a torch guard along the walk (outside)
//   goto post   the guards of a named post inside (patrolling, dozing at the
//               desk); `distract`: E makes the companion tap on the window
//   fuse        the fuse box: three fuses and the cameras run on a loop
//   lock        the back door's pins; pickpocket: stand behind the guard
//   laser       the grid in zaal 3 (blinking, high, sweeping, low beams)
//   crack       the case's dial (1953: 19, 5, 3)
//   getaway     the alarm, the run out and the boat the companion brings round
//   shot        the closing wide shot
// Forgiving by design: being seen or touching a laser only puts you back where
// the stage started, the companion helps after a few tries, doors stay shut
// (museumplan rooms with `shut`) until the stage that opens them, and any
// stage can be skipped by holding O once it gives trouble.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { getScene, refreshCharacterMeshes } from './scene3d.js';
import { buildPersonMesh, animatePersonWalk, registerPoseSource, unregisterPoseSource, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { findWalkPath } from './routing.js';
import { isInWater, dist, pointInPolygon, boatDryPoints } from './util.js';
import { inPassage, roomAt } from './passages.js';
import { MUSEUM_ROOMS, MUSEUM_CASE, rectCorners } from './museumplan.js';
import { setMuseumCaseHidden, setMuseumLights } from './museum3d.js';
import { spawnFxSpark } from './fx3d.js';
import { playCinematic, isCinematicActive, skipCinematic } from './cinematics.js';
import { playCastScene } from './missionstory.js';
import { Vehicle } from './vehicle.js';
import { BOAT_KINDS } from './boattypes.js';
import * as UI from './heistui.js';

const SPOTS_BEFORE_HELP = 3;
const MISSES_BEFORE_HELP = 5;
const PICK_MISSES = 6;
const FUSES = 3;
const SEEN_DELAY = 0.9;
const ZAP_DELAY = 0.7;
const LASER_HELP = 2;
const LASER_BAND = 0.22;
const LASER_ALL_OFF = 6;
const PICK_TIME = 1.6;
const PICK_REACH = 1.5;
const DISGUISE_RANGE = 0.55;
const CROUCH_RANGE = 0.6;
const SKIP_HOLD = 0.9;
const SKIP_AFTER = 50;
const BOARD_REACH = 4.5;
const CODE = [19, 5, 3];
const DIAL = 40;
const GUARD_LOOK = { variant: 'male', pants: 0x1c1f24, shoes: 0x111111, hairStyle: 'short', seed: 2207 };
const DOZER_SEED = 2208;
const GUARD_SHIRT = 0x2b3340;
const OVERALL = { shirt: 0x4e6a72, pants: 0x4e6a72, shoes: 0x23272a, cap: 0x39474d };
const GETAWAY_BOAT = { ...BOAT_KINDS.rubberboot, maxSpeed: 7.5, accel: 3.2, color: '#1c1f22', cabin: '#d9412b' };
const CONE_MAT = () => new THREE.MeshBasicMaterial({ color: 0xffe3a0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });

// Speech bubbles of the night guards (voiced, scripts/voicelines_collect.mjs).
const GUARD_LINES = {
  seen: ['Hé! Wie is daar?', 'Stop! Ik zie je wel, hoor!'],
  collega: ['Avond, collega. Wacht eens… jij bent geen collega!'],
  lost: ['Zal wel een duif zijn.'],
  window: ['Wat was dat? Even kijken bij het raam.'],
  wake: ['Hè? Ik sliep niet, hoor.'],
  alarm: ['Alarm! Iedereen naar zaal drie!', 'Staan blijven! De pliesie is onderweg!'],
  bucket: ['Wie laat daar een emmer vallen?'],
};

let H = null;
// the plan's talk was heard this session: a retry skips it
let planHeard = false;

// --- the museum in room coordinates (museumplan.js) --------------------------------

const ROOM = (id) => MUSEUM_ROOMS.find((r) => r.id === id);
function at(id, a, c) {
  const r = ROOM(id);
  return { x: r.cx + a * r.ux - c * r.uy, y: r.cy + a * r.uy + c * r.ux };
}
function toLocal(id, x, y) {
  const r = ROOM(id);
  const dx = x - r.cx, dy = y - r.cy;
  return { a: dx * r.ux + dy * r.uy, c: -dx * r.uy + dy * r.ux };
}
// world angle of a room's +a (u) and +c (v) axes
const uAngle = (id) => Math.atan2(ROOM(id).uy, ROOM(id).ux);
const vAngle = (id) => uAngle(id) + Math.PI / 2;

// Where the stages send you (heistSpot targets); 'boot' is the getaway
// boat's quay, found on the map.
const SPOTS = {
  achterdeur: () => at('achterdeur', -9.0, 0),
  deur1: () => at('deur1', 0, 0.4),
  rookplek: () => at('atrium', 1.0, 2.3),
  glasdeur: () => at('gang', -6.0, 0),
  deur3: () => at('deur3', 0, 0.5),
  laserStart: () => at('zaal3', -1.3, -6.7),
  stand: () => { const r = ROOM('zaal3'); return { x: MUSEUM_CASE.x + 1.05 * r.uy, y: MUSEUM_CASE.y - 1.05 * r.ux }; },
};
const SPOT_LABELS = { achterdeur: 'Achterdeur', deur1: 'Deur naar de Entreehal', rookplek: 'De bewaker met het pasje', glasdeur: 'Glazen deur', deur3: 'Deur naar zaal 3', stand: 'De vitrine', boot: 'De boot' };

// the doors that stay shut until their stage opens them
const DOORS = {
  achterdeur: { room: 'achterdeur', a: -7.0, glass: false },
  glasdeur: { room: 'gang', a: -4.5, glass: true },
};

const GUARD_CHASE = 2.6;

// The guards of a stage `post` (room-local spots): patrol loops, a fixed post
// that sweeps, the desk guard who dozes off; window = where a distraction sends him.
const POSTS = {
  zaal1: [{ patrol: [['zaal1', -3.4, -5.4], ['zaal1', 3.4, -5.4], ['zaal1', 3.4, 5.4], ['zaal1', -3.4, 5.4]], range: 5.8, speed: 1.15 }],
  entreehal: [
    { patrol: [['entreehal', -7.0, 1.6], ['entreehal', 7.5, 1.6]], range: 6.2, speed: 1.2, window: ['entreehal', 8.4, -3.9] },
    { at: ['entreehal', -2.0, -3.3], face: 'south', amp: 0.6, sleep: [3.4, 6.5], range: 5.2, half: 0.55, window: ['entreehal', -2.0, -3.3] },
  ],
  rookplek: [{ at: ['atrium', 1.0, 2.3], face: 'west', amp: 1.4, period: 8, range: 5.5, pick: true, smoke: true }],
};

// zaal 3: rows across the room at local c, beams at heights hs
const LASER_ROWS = [
  { c: -4.0, kind: 'blink', hs: [0.35, 0.8, 1.25, 1.7], on: 1.8, off: 1.4 },
  { c: -2.3, kind: 'high', hs: [1.12, 1.55] },
  { c: -0.6, kind: 'sweep', hs: [0.35, 0.8, 1.25, 1.7], gap: 2.6, period: 10 },
  { c: 0.9, kind: 'low', hs: [0.28] },
];

// --- helpers ------------------------------------------------------------------------------

// inside a footprint and not in one of its passages or rooms (the museum)
function solid(map, x, y) {
  return map.buildingsNear(x, y, 0.5).some((b) => pointInPolygon(x, y, b.pts) && !inPassage(map, b, x, y));
}

function walkable(map, x, y) {
  return !isInWater(map, x, y) && !solid(map, x, y);
}

function losClear(map, ax, ay, bx, by) {
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    if (solid(map, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

function museumRoomAt(map, x, y) {
  for (const b of map.buildingsNear(x, y, 0.5)) {
    const r = b.rooms && roomAt(b, x, y);
    if (r) return r;
  }
  return null;
}

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const audio = (world, kind, x, y, extra = {}) => { if (world.audioEvents) world.audioEvents.push({ kind, x, y, ...extra }); };

function coneMesh(range, half) {
  const g = new THREE.Group();
  const geo = new THREE.CircleGeometry(range, 20, -half, half * 2);
  const m = new THREE.Mesh(geo, CONE_MAT());
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  g.add(m);
  g.userData.mat = m.material;
  return g;
}

function box(parent, w, h, d, color, x, y, z, emissive) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...(emissive ? { emissive, emissiveIntensity: 1 } : {}) }));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function say(world, w, list, secs = 2.6) {
  if (!w || !list || !list.length || world.time < (w.bubbleAt || 0)) return;
  w.bubbleAt = world.time + secs + 2;
  const sp = world.extraSpeakers || (world.extraSpeakers = []);
  sp.push({ x: w.x, y: w.y, h: 2.2, follow: w, female: false, speechText: pick(list), speechUntil: world.time + secs });
}

// --- start / props ------------------------------------------------------------------------

// opts.bare: a sneak mission outside the museum (the container terminal, M13): watchers and stage sendbacks only, no museum doors or lights
export function startHeist(world, opts = {}) {
  disposeHeist();
  const scene = getScene();
  if (!scene) return null;
  const root = new THREE.Group();
  root.name = 'heist';
  scene.add(root);
  H = {
    world, root, watchers: [], group: -1, spotted: 0, distracted: false, seen: null, zap: null,
    fuse: null, fuseAt: null, fuseLamp: null, approach: 'sluip', doors: {}, lasers: null, alarm: false,
    boat: null, look: null, stageT: 0, trouble: 0, skipT: 0, hold: false, planT: 0,
  };
  if (!opts.bare) {
    for (const [id, d] of Object.entries(DOORS)) buildDoor(id, d);
    setMuseumLights(true, 0);
  }
  return H;
}

// sent back by a guard, a camera or a laser: H6's three minutes wait meanwhile
export function heistSendingBack() { return !!(H && (H.seen || H.zap)); }

export function heistApproach() { return H ? H.approach : 'sluip'; }

function buildDoor(id, d) {
  const r = ROOM(d.room);
  r.shut = true;
  const hinge = at(d.room, d.a, -r.hw);
  const pivot = new THREE.Group();
  pivot.position.set(hinge.x, 0, hinge.y);
  pivot.rotation.y = -uAngle(d.room);
  const w = r.hw * 2 - 0.08, h = Math.min(2.5, r.h - 0.2);
  const mat = d.glass
    ? new THREE.MeshStandardMaterial({ color: 0xcfe6e0, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 0.8 });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.07, h, w), mat);
  panel.position.set(0, h / 2, w / 2 + 0.04);
  pivot.add(panel);
  // the card reader (glass door) or the lock plate (back door)
  const plate = box(pivot, 0.1, 0.14, 0.09, d.glass ? 0x1c1f22 : 0xb89043, -0.08, 1.1, w - 0.25, d.glass ? 0xd93f3f : null);
  H.root.add(pivot);
  H.doors[id] = { room: r, pivot, plate, open: 0, opening: false };
}

export function openHeistDoor(id) {
  const d = H && H.doors[id];
  if (!d || d.opening) return;
  d.opening = true;
  d.room.shut = false;
  if (d.plate.material.emissive) d.plate.material.emissive.setHex(0x3fc97a);
  const p = at(d.room.id, DOORS[id].a, 0);
  audio(H.world, 'door_open', p.x, p.y);
}

function stepDoors(dt) {
  for (const d of Object.values(H.doors)) {
    if (!d.opening || d.open >= 1) continue;
    d.open = Math.min(1, d.open + dt * 1.4);
    d.pivot.rotation.y = -uAngle(d.room.id) - d.open * d.open * (3 - 2 * d.open) * 1.55;
  }
}

// Under a footprint (a building, or a covered passage one can walk through).
function roofed(map, x, y) {
  return map.buildingsNear(x, y, 0.5).some((b) => pointInPolygon(x, y, b.pts));
}

// Beside the spot the player stands on: free, dry ground `r` metres away;
// with `sky`, under open sky with room around it for a camera.
function besides(map, p, r, sky = false) {
  const ok = (x, y) => walkable(map, x, y) && (!sky || !roofed(map, x, y));
  const room = (x, y) => { let n = 0; for (let k = 0; k < 8; k++) if (!roofed(map, x + Math.cos(k * Math.PI / 4) * 2.8, y + Math.sin(k * Math.PI / 4) * 2.8)) n++; return n; };
  let best = null;
  for (let rr = r; rr <= (sky ? 14 : r); rr += 1.5) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr;
      if (!ok(x, y) || !ok(p.x + Math.cos(a) * (rr + 0.6), p.y + Math.sin(a) * (rr + 0.6))) continue;
      const score = (sky ? room(x, y) * 2 : 0) - rr * 0.3;
      if (!best || score > best.score) best = { x, y, score };
    }
    if (best && (!sky || best.score > 10)) break;
  }
  return best ? { x: best.x, y: best.y } : { x: p.x + r, y: p.y };
}

// The fuse box at the fuse stage's target and the display case in zaal 3,
// standing from the start of the mission.
export function placeHeistProps(world, fuseSpot, vitrineSpot) {
  if (!H) return;
  const fuse = fuseSpot && besides(world.map, fuseSpot, 1.1);
  const inMuseum = vitrineSpot && museumRoomAt(world.map, vitrineSpot.x, vitrineSpot.y);
  const vitrine = inMuseum ? { ...MUSEUM_CASE } : vitrineSpot && besides(world.map, vitrineSpot, 1.9, true);
  if (inMuseum) setMuseumCaseHidden(true);
  if (fuse) {
    const g = new THREE.Group();
    g.position.set(fuse.x, 0, fuse.y);
    box(g, 0.12, 1.2, 0.12, 0x3a3d42, 0, 0.6, 0);
    box(g, 0.7, 0.95, 0.3, 0x7d8388, 0, 1.45, 0);
    H.fuseLamp = box(g, 0.08, 0.08, 0.04, 0x113311, 0.22, 1.8, 0.16, 0x33ff66);
    H.root.add(g);
    H.fuseAt = { x: fuse.x, y: fuse.y };
  }
  if (vitrine) {
    const g = new THREE.Group();
    g.position.set(vitrine.x, 0, vitrine.y);
    box(g, 1.0, 1.0, 1.0, 0xd9d4c7, 0, 0.5, 0);
    box(g, 0.46, 0.08, 0.46, 0x9c1628, 0, 1.04, 0, 0x4a0010);
    // the museum spotlight on the case, as a soft beam (no real light)
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, 3.4, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.y = 3.5;
    g.add(beam);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xf4f0e2, side: THREE.DoubleSide }));
    card.rotation.x = -Math.PI / 2 + 0.25;
    card.position.set(0.05, 1.09, 0.04);
    card.visible = false;
    g.add(card);
    // frosted, warm-lit glass: you see a golden glow, not what lies on the cushion
    const lidG = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), new THREE.MeshStandardMaterial({ color: 0xf3e6c4, emissive: 0x8a6418, emissiveIntensity: 0.55, transparent: true, opacity: 0.82, roughness: 0.6, metalness: 0.1, depthWrite: false }));
    glass.position.y = 1.38;
    lidG.add(glass);
    box(lidG, 0.94, 0.05, 0.94, 0xb8a36a, 0, 1.77, 0);
    g.add(lidG);
    H.root.add(g);
    H.vitrine = { x: vitrine.x, y: vitrine.y };
    H.caseLid = lidG;
    H.caseCard = card;
    H.stand = inMuseum ? SPOTS.stand() : besides(world.map, vitrine, 1.5);
  }
}

export function vitrineSpot() { return H && H.vitrine; }
// Where you stand to look into the case (the vitrine stage's target).
export function vitrineStand() { return H && H.stand; }

// A target { heistSpot } (missions.js resolveTarget; map only, spotcheck.js uses it too).
export function heistSpotAt(map, id) {
  if (id === 'boot') {
    const m = boatMooring(map);
    return m ? { x: m.stand.x, y: m.stand.y, label: SPOT_LABELS.boot } : null;
  }
  const f = SPOTS[id];
  return f ? { ...f(), label: SPOT_LABELS[id] || '' } : null;
}

// --- watchers: cameras and guards ------------------------------------------------------

function guardMesh(seed = GUARD_LOOK.seed) {
  const m = buildPersonMesh(GUARD_SHIRT, 0xd9b08c, { ...GUARD_LOOK, seed });
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 6), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
  torch.rotation.z = Math.PI / 2;
  torch.position.set(0.45, 1.15, 0.22);
  torch.userData.own = true;
  m.add(torch);
  m.userData.person = true;
  return m;
}

function addGuard(spec) {
  const w = {
    kind: 'guard', group: spec.group, x: spec.x, y: spec.y, center: spec.center ?? 0, angle: spec.center ?? 0,
    amp: spec.amp ?? 1.1, period: spec.period ?? 7, phase: spec.phase ?? 0, range: spec.range, half: spec.half ?? 0.5, on: true,
    patrol: spec.patrol || null, pi: 1, wait: 0, speed: spec.speed || 1.2, face: spec.center ?? 0,
    sleep: spec.sleep || null, sleepT: spec.sleep ? spec.sleep[0] * 0.3 : 0, asleep: false, window: spec.window || null,
    distractUntil: 0, pick: !!spec.pick, seed: spec.sleep ? DOZER_SEED : GUARD_LOOK.seed, walk: 0, pose: null, state: 'alive',
  };
  w.cone = coneMesh(w.range, w.half);
  w.cone.position.set(w.x, 0.07, w.y);
  H.root.add(w.cone);
  w.mesh = guardMesh(w.seed);
  w.mesh.position.set(w.x, 0, w.y);
  if (spec.smoke) {
    w.ember = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    w.ember.position.set(0.18, 1.5, 0.26);
    w.ember.userData.own = true;
    w.mesh.add(w.ember);
  }
  H.root.add(w.mesh);
  H.watchers.push(w);
  return w;
}

// A watcher looks at point q on the route from beside it: a guard with a
// torch where there's room to stand, else a camera on the nearest wall.
function addWatcher(world, q, tan, kind, phase, group) {
  const map = world.map;
  const nx = -tan.y, ny = tan.x;
  let spot = null;
  if (kind === 'guard') {
    // an open spot beside the route with a clear view of it; in a narrow
    // passage he stands in it, looking back down the way you come
    const roomy = (x, y) => walkable(map, x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ox, oy]) => walkable(map, x + ox, y + oy));
    for (let r = 3; r <= 8 && !spot; r += 1) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2, x = q.x + Math.cos(a) * r, y = q.y + Math.sin(a) * r;
        if (roomy(x, y) && losClear(map, x, y, q.x, q.y)) { spot = { x, y }; break; }
      }
    }
    if (!spot) spot = { x: q.x + tan.x * 2, y: q.y + tan.y * 2, onPath: true };
  } else {
    // a pole on dry, open ground beside the route (never in the canal or a wall), inside the blueprint
    for (const o of [5, -5, 4, -4, 6, -6, 3, -3]) {
      const x = q.x + nx * o, y = q.y + ny * o;
      if (inPlan(x, y) && !isInWater(map, x, y) && !solid(map, x, y) && losClear(map, x, y, q.x, q.y)) { spot = { x, y }; break; }
    }
    if (!spot) spot = { x: q.x, y: q.y };
  }
  const center = spot.onPath ? Math.atan2(-tan.y, -tan.x) : Math.atan2(q.y - spot.y, q.x - spot.x);
  const range = spot.onPath ? 8 : dist(spot.x, spot.y, q.x, q.y) + (kind === 'guard' ? 5.5 : 5);
  if (kind === 'guard') return addGuard({ group, x: spot.x, y: spot.y, center, range, amp: 1.1, period: 7, phase });
  const w = { kind, group, x: spot.x, y: spot.y, center, amp: 0.95, period: 6, phase, range, half: 0.38, angle: center, on: true };
  w.cone = coneMesh(range, w.half);
  w.cone.position.set(spot.x, 0.08, spot.y);
  H.root.add(w.cone);
  const g = new THREE.Group();
  g.position.set(spot.x, 0, spot.y);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x2c2f33 }));
  pole.position.y = 1.7;
  g.add(pole);
  const head = new THREE.Group();
  head.position.y = 3.35;
  box(head, 0.42, 0.2, 0.2, 0xe9e9e4, 0.18, 0, 0);
  w.led = box(head, 0.05, 0.05, 0.05, 0x330000, 0.41, 0.04, 0.06, 0xff2a1a);
  g.add(head);
  w.mesh = g;
  w.head = head;
  H.root.add(g);
  H.watchers.push(w);
  return w;
}

// Places a guard and cameras along the walk from (a) to (b) for stage `group`.
export function guardRoute(world, a, b, { guards = 1, cameras = 1 } = {}, group = -1) {
  if (!H || !a || !b) return;
  const r = findWalkPath(world.map, a.x, a.y, b.x, b.y);
  let pts = r && r.pts && r.pts.length > 1 ? r.pts.map(([x, y]) => ({ x, y })) : [a, b];
  if (dist(pts[0].x, pts[0].y, a.x, a.y) > dist(pts[pts.length - 1].x, pts[pts.length - 1].y, a.x, a.y)) pts = pts.reverse();
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + dist(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
  const L = acc[acc.length - 1];
  if (L < 12) return;
  const along = (f) => {
    const s = f * L;
    let i = 1;
    while (i < pts.length - 1 && acc[i] < s) i++;
    const p0 = pts[i - 1], p1 = pts[i], seg = (acc[i] - acc[i - 1]) || 1;
    const k = (s - acc[i - 1]) / seg;
    const tl = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
    return { q: { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k }, tan: { x: (p1.x - p0.x) / tl, y: (p1.y - p0.y) / tl } };
  };
  const list = [];
  for (let i = 0; i < cameras; i++) list.push(['camera', 0.25 + i * 0.25]);
  for (let i = 0; i < guards; i++) list.push(['guard', 0.72 + i * 0.1]);
  list.forEach(([kind, f], i) => { const { q, tan } = along(Math.min(0.85, f)); addWatcher(world, q, tan, kind, i * 1.7 + H.watchers.length, group); });
}

function placePost(name, group) {
  for (const s of POSTS[name] || []) {
    const pts = s.patrol ? s.patrol.map(([id, a, c]) => at(id, a, c)) : null;
    const p0 = pts ? pts[0] : at(...s.at);
    const room = (s.at || s.patrol[0])[0];
    const center = s.face === 'south' ? vAngle(room) : s.face === 'west' ? uAngle(room) + Math.PI : pts ? Math.atan2(pts[1].y - p0.y, pts[1].x - p0.x) : 0;
    const w = addGuard({ group, x: p0.x, y: p0.y, center, range: s.range, half: s.half, amp: s.amp ?? (pts ? 0.9 : 1.1), period: s.period, patrol: pts, speed: s.speed, sleep: s.sleep, window: s.window ? at(...s.window) : null, pick: s.pick, smoke: s.smoke, phase: H.watchers.length * 1.3 });
    // at the window they look out, away from the hall (north)
    if (s.window) w.windowFace = vAngle(room) + Math.PI;
  }
}

// Cameras run on the fuse box: on a loop once it is done (they see nothing).
export function camerasOff() {
  if (!H) return;
  for (const w of H.watchers) {
    if (w.kind !== 'camera' || !w.on) continue;
    w.on = false;
    w.looped = true;
    w.cone.visible = false;
  }
  if (H.fuseLamp) H.fuseLamp.material.emissive.setHex(0xff3322);
}

function stepWatcher(w, dt, t, world) {
  if (w.kind === 'camera') {
    if (w.on) {
      w.angle = w.center + w.amp * Math.sin((t + w.phase) * (Math.PI * 2) / w.period);
      w.cone.rotation.y = -w.angle;
      w.head.rotation.y = -w.angle;
    }
    // a looped camera blinks amber: it films an empty museum on repeat
    if (w.led) w.led.material.emissive.setHex(w.looped ? (Math.floor(t * 2) % 2 ? 0xffb02a : 0x221400) : 0xff2a1a);
    return;
  }
  let speed = 0;
  const p = world.player;
  if (w.chase) {
    // the alarm: after the player, slower than someone jogging off (3.0)
    const d = dist(w.x, w.y, p.x, p.y);
    if (d > 3 && d < 40 && losClear(world.map, w.x, w.y, p.x, p.y)) {
      const a = Math.atan2(p.y - w.y, p.x - w.x);
      const nx = w.x + Math.cos(a) * GUARD_CHASE * dt, ny = w.y + Math.sin(a) * GUARD_CHASE * dt;
      if (walkable(world.map, nx, ny)) { w.x = nx; w.y = ny; speed = GUARD_CHASE; }
      w.angle = a;
    }
    if (d < 25 && Math.random() < dt * 0.3) say(world, w, GUARD_LINES.alarm);
  } else if (w.distractUntil > t && w.window) {
    const d = dist(w.x, w.y, w.window.x, w.window.y);
    if (d > 0.2) {
      const a = Math.atan2(w.window.y - w.y, w.window.x - w.x);
      const s = Math.min(1.6, d * 3);
      w.x += Math.cos(a) * s * dt; w.y += Math.sin(a) * s * dt;
      w.angle = a; speed = s;
    } else w.angle += angDiff(w.windowFace ?? w.angle, w.angle) * Math.min(1, dt * 3);
    w.asleep = false;
  } else if (w.patrol) {
    if (w.wait > 0) {
      w.wait -= dt;
      w.angle = w.face + Math.sin((w.wait + w.phase) * 1.9) * w.amp;
    } else {
      const tgt = w.patrol[w.pi];
      const d = dist(w.x, w.y, tgt.x, tgt.y);
      if (d < 0.12) {
        w.pi = (w.pi + 1) % w.patrol.length;
        const n = w.patrol[w.pi];
        w.face = Math.atan2(n.y - w.y, n.x - w.x);
        w.wait = 1.4;
      } else {
        const a = Math.atan2(tgt.y - w.y, tgt.x - w.x);
        const s = Math.min(w.speed, d * 4);
        w.x += Math.cos(a) * s * dt; w.y += Math.sin(a) * s * dt;
        w.angle += angDiff(a, w.angle) * Math.min(1, dt * 6);
        speed = s;
      }
    }
  } else {
    // back at his post after a distraction, then the usual sweep
    const home = w.home || (w.home = { x: w.x, y: w.y });
    const d = dist(w.x, w.y, home.x, home.y);
    if (d > 0.2) {
      const a = Math.atan2(home.y - w.y, home.x - w.x);
      w.x += Math.cos(a) * 1.2 * dt; w.y += Math.sin(a) * 1.2 * dt;
      w.angle = a; speed = 1.2;
    } else w.angle = w.center + w.amp * Math.sin((t + w.phase) * (Math.PI * 2) / w.period);
  }
  if (w.sleep && !w.chase && !(w.distractUntil > t)) {
    // awake sleep[0] s, then dozing sleep[1] s; the cone flickers as he comes to
    w.sleepT -= dt;
    if (w.sleepT <= 0) {
      w.asleep = !w.asleep;
      w.sleepT = w.asleep ? w.sleep[1] : w.sleep[0];
      if (!w.asleep && Math.random() < 0.35 && dist(w.x, w.y, p.x, p.y) < 16) say(world, w, GUARD_LINES.wake);
    }
    w.waking = w.asleep && w.sleepT < 0.9;
  } else { w.asleep = false; w.waking = false; }
  w.walk = speed;
  w.pose = w.asleep && !w.waking ? 'sit' : null;
  if (w.seed === DOZER_SEED) { if (w.pose) registerPoseSource(DOZER_SEED, w); else unregisterPoseSource(DOZER_SEED); }
  w.mesh.position.set(w.x, 0, w.y);
  w.mesh.rotation.y = -w.angle;
  animatePersonWalk(w.mesh, speed, dt);
  w.cone.position.set(w.x, 0.07, w.y);
  w.cone.rotation.y = -w.angle;
  const mul = H.approach === 'vermomd' ? DISGUISE_RANGE : 1;
  w.cone.scale.setScalar(mul);
  w.cone.visible = w.on && !w.chase && (!w.asleep || (w.waking && Math.floor(t * 8) % 2 === 0));
  if (w.ember) w.ember.material.color.setHex(Math.sin(t * 2.3) > 0.6 ? 0xffc04a : 0xff5a1a);
  if (w.lostAt && t > w.lostAt) { w.lostAt = 0; w.bubbleAt = 0; say(world, w, GUARD_LINES.lost); }
}

function sees(w, world) {
  const p = world.player;
  if (!w.on || w.chase || w.asleep) return false;
  const dx = p.x - w.x, dy = p.y - w.y, d = Math.hypot(dx, dy);
  const guard = w.kind === 'guard';
  const range = w.range * (guard && p.crouching ? CROUCH_RANGE : 1) * (guard && H.approach === 'vermomd' ? DISGUISE_RANGE : 1);
  if (d > range || d < 0.5) return false;
  if (Math.abs(angDiff(Math.atan2(dy, dx), w.angle)) > w.half) return false;
  return !guard || losClear(world.map, w.x, w.y, p.x, p.y);
}

// The companion gives up waiting: every watcher of this stage looks away for good.
function distract(world) {
  H.distracted = true;
  const inside = !!museumRoomAt(world.map, world.player.x, world.player.y);
  for (const w of H.watchers) {
    if (w.group !== H.group) continue;
    w.on = false;
    w.cone.visible = false;
    if (inside && w.kind === 'guard') say(world, w, GUARD_LINES.bucket);
  }
  world.addMessage(inside ? 'Ik laat een emmer vallen. Nu, ze kijken allemaal weg!' : 'Ik gooi een steentje in het water. Kijk, ze kijken allemaal de andere kant op.', 4);
}

// --- per stage ------------------------------------------------------------------------------

// Called by missions.js enterStage for every heist stage; returns the stage's
// target when heist.js moves it.
export function heistEnterStage(world, st, S, k) {
  if (!H) return null;
  if (H.seen) { H.seen.w.cone.userData.mat.color.setHex(0xffe3a0); H.seen = null; }
  H.zap = null;
  H.group = k;
  H.spotted = 0;
  H.distracted = false;
  H.stageT = 0;
  H.trouble = 0;
  H.skipT = 0;
  H.lock = null;
  H.crack = null;
  H.pickT = 0;
  H.distractUsed = false;
  world.missionPrompt = null;
  UI.closePanel();
  releaseHold(world);
  if (st.post) placePost(st.post, k);
  const c = world.companion;
  // where the companion waits meanwhile
  if (st.kind === 'lock') setCompanionHold(world, { ...at('noord', -1.2, -0.6), face: vAngle('noord') + Math.PI, crouch: true, pose: 'call' });
  else if (st.kind === 'pickpocket') setCompanionHold(world, { ...at('atrium', -1.5, -7.0), face: vAngle('atrium'), crouch: true });
  else if (st.kind === 'laser' && !world.companionHold) setCompanionHold(world, { ...at('deur1', 0, -1.2), face: vAngle('deur1'), pose: 'call' });
  else if (st.kind === 'crack') {
    const q = at('zaal3', 1.8, -0.6);
    setCompanionHold(world, { ...q, face: Math.atan2(MUSEUM_CASE.y - q.y, MUSEUM_CASE.x - q.x), from: SPOTS.deur3() });
  }
  if (st.kind === 'laser') buildLasers();
  if (st.kind === 'getaway') startAlarm(world);
  if (st.kind === 'escape' || st.kind === 'shot') world.companionHold = null;
  if (c && st.kind === 'goto' && st.post === 'entreehal' && !world.companionHold) setCompanionHold(world, { ...at('achterdeur', -9.2, 0.4), face: 0 });
  if (st.kind === 'laser') return { ...SPOTS.stand(), label: st.label };
  if (st.kind === 'crack') return { ...SPOTS.stand(), label: st.label };
  return null;
}

// A stage is left (passed or skipped): doors it opens, lasers it switches off.
export function heistLeaveStage(world, st) {
  if (!H || !st) return;
  if (st.opens) openHeistDoor(st.opens);
  if (st.kind === 'plan') finishPlan(world, H.approach);
  if (st.kind === 'lock' || st.kind === 'crack' || st.kind === 'fuse') UI.closePanel();
  if (st.kind === 'fuse') camerasOff();
  if (st.kind === 'laser') lasersOff();
  if (st.kind === 'crack') { releaseHold(world); H.caseOpen = true; }
  if (st.kind === 'scene' && st.reveal) revealCase();
  world.missionPrompt = null;
}

function setCompanionHold(world, h) {
  const c = world.companion;
  world.companionHold = h;
  // someone left far behind comes round the corner, not across the city
  if (c && h.from && dist(c.x, c.y, h.x, h.y) > 12) { c.x = h.from.x; c.y = h.from.y; c.vx = 0; c.vy = 0; }
}

function holdPlayer(world, on) {
  if (!H) return;
  if (on) { world.challengeHoldPlayer = true; H.hold = true; }
  else releaseHold(world);
}

function releaseHold(world) {
  if (H && H.hold) { world.challengeHoldPlayer = false; H.hold = false; }
}

// Per frame during the mission. Returns true while the stage waits (being
// sent back after a sighting or a laser), 'skip' when the player held O.
export function updateHeist(dt, world, st, S) {
  if (!H) return false;
  const p = world.player;
  const t = world.time;
  H.stageT += dt;
  stepDoors(dt);
  for (const w of H.watchers) stepWatcher(w, dt, t, world);
  if (H.lasers) stepLasers(dt, t);
  if (H.alarm) {
    const k = 0.5 + 0.5 * Math.sin(t * 7);
    setMuseumLights(true, 0.35 + k * 0.5);
    UI.setAlarmUi(0.08 + k * 0.2);
    if ((H.alarmBeep -= dt) <= 0) { H.alarmBeep = 1.6; audio(world, 'alarm', MUSEUM_CASE.x, MUSEUM_CASE.y - 14); }
  }
  if (H.revealed && H.caseLid && H.caseLid.position.y < LID_UP) H.caseLid.position.y = Math.min(LID_UP, H.caseLid.position.y + dt * 0.8);
  // hold O: skip this stage (offered once it gives trouble)
  const skippable = st && st.kind !== 'scene' && st.kind !== 'shot' && !isCinematicActive();
  const offer = skippable && (H.trouble >= 2 || H.stageT > SKIP_AFTER);
  if (skippable && world.input.isDown('o')) H.skipT += dt; else H.skipT = 0;
  UI.skipChip(offer || H.skipT > 0.05, H.skipT / SKIP_HOLD);
  if (H.skipT >= SKIP_HOLD) { H.skipT = 0; UI.skipChip(false); return 'skip'; }
  if (H.seen) {
    H.seen.t += dt;
    if (H.seen.t >= SEEN_DELAY) {
      const to = H.seen.back;
      H.seen.w.cone.userData.mat.color.setHex(0xffe3a0);
      if (H.seen.w.kind === 'guard' && Math.random() < 0.5) H.seen.w.lostAt = world.time + 1.2;
      H.seen = null;
      if (to && !p.inVehicle) { p.x = to.x; p.y = to.y; p.vx = 0; p.vy = 0; world.teleported = world.time; }
      if (H.spotted >= SPOTS_BEFORE_HELP && !H.distracted) distract(world);
    }
    return true;
  }
  if (H.zap) {
    H.zap.t += dt;
    if (H.zap.t >= ZAP_DELAY) {
      const to = SPOTS.laserStart();
      H.zap = null;
      if (!p.inVehicle) { p.x = to.x; p.y = to.y; p.vx = 0; p.vy = 0; world.teleported = world.time; }
    }
    return true;
  }
  if (!st) return false;
  if (st.distract) updateDistraction(world);
  const watched = !!(st.watch || st.post);
  if (!watched || H.distracted || p.inVehicle || world.pigeonMode || isCinematicActive()) return false;
  for (const w of H.watchers) {
    if (w.group !== H.group || !sees(w, world)) continue;
    H.spotted++;
    H.trouble++;
    H.seen = { w, t: 0, back: S.here };
    w.cone.userData.mat.color.setHex(0xff3b2e);
    if (w.kind === 'guard') say(world, w, H.approach === 'vermomd' ? GUARD_LINES.collega : GUARD_LINES.seen);
    else audio(world, 'alarm', w.x, w.y);
    world.addMessage(w.kind === 'guard' ? 'Gezien! De bewaker schijnt je recht in je gezicht. Terug het donker in.' : 'Gezien! Een camera piept. Terug, en wacht tot hij wegdraait.', 3);
    return true;
  }
  return false;
}

// The Entreehal: E once and the companion taps on the window; both guards
// go and look outside for a while.
function updateDistraction(world) {
  const guards = H.watchers.filter((w) => w.group === H.group && w.kind === 'guard' && w.window);
  if (!guards.length) return;
  const t = world.time;
  const busy = guards.some((w) => w.distractUntil > t);
  if (H.distractUsed || busy) { world.missionPrompt = null; return; }
  const p = world.player;
  const room = museumRoomAt(world.map, p.x, p.y);
  if (!room || p.inVehicle) { world.missionPrompt = null; return; }
  world.missionPrompt = { id: 'heist-distract', x: p.x, y: p.y, h: 2.3, key: 'E', label: 'Afleiding', sub: 'Tammo tikt op het raam', ring: true };
  if (!(world.input.wasPressed('e') || world.input.wasPressed('f'))) return;
  H.distractUsed = true;
  world.missionPrompt = null;
  for (const w of guards) w.distractUntil = t + 11;
  const win = guards[0].window;
  audio(world, 'prop_hit', win.x, win.y, { strength: 0.3, material: 'glass' });
  say(world, guards[0], GUARD_LINES.window, 3);
  world.addMessage('Ik tik op het raam. Nu!', 3);
}

// --- the plan -------------------------------------------------------------------------------

// the blueprint's frame (world x0, y0, x1, y1): everything H6 puts outside sits in it
export const PLAN_BOUNDS = [19, 740, 142, 834];
const inPlan = (x, y) => x > PLAN_BOUNDS[0] + 1 && x < PLAN_BOUNDS[2] - 1 && y > PLAN_BOUNDS[1] + 1 && y < PLAN_BOUNDS[3] - 1;

// Every guard and camera H6 placed, for the story test.
export function heistWatchers() {
  return H ? H.watchers.map((w) => ({ kind: w.kind, x: w.x, y: w.y })) : [];
}

function planData(world, def) {
  const map = world.map;
  const bounds = PLAN_BOUNDS;
  const inBox = (pts) => pts.some(([x, y]) => x > bounds[0] && x < bounds[2] && y > bounds[1] && y < bounds[3]);
  const water = map.waterNear(82.15, 784.16, 110).map((w) => w.pts).filter(inBox);
  const buildings = map.buildingsNear(82.31, 794.22, 80).map((b) => b.pts).filter(inBox);
  const bridges = (map.roadsNear ? map.roadsNear(82.31, 794.22, 90) : []).filter((r) => r.bridge).map((r) => r.pts).filter(inBox);
  const names = { zaal1: 'Zaal 1', zaal3: 'Zaal 3', entreehal: 'Entreehal', atrium: 'Atrium' };
  const rooms = MUSEUM_ROOMS.map((r) => ({ pts: rectCorners(r), c: [r.cx, r.cy], name: names[r.id] || '' }));
  const guards = [];
  for (const list of Object.values(POSTS)) {
    for (const s of list) {
      const p0 = s.patrol ? at(...s.patrol[0]) : at(...s.at);
      const room = (s.at || s.patrol[0])[0];
      const a = s.face === 'south' ? vAngle(room) : s.face === 'west' ? uAngle(room) + Math.PI : s.patrol ? Math.atan2(at(...s.patrol[1]).y - p0.y, at(...s.patrol[1]).x - p0.x) : 0;
      guards.push({ x: p0.x, y: p0.y, a, r: s.range * 0.7 });
    }
  }
  for (const w of H.watchers) if (w.kind === 'guard' && w.group !== undefined && !guards.some((g) => dist(g.x, g.y, w.x, w.y) < 1)) guards.push({ x: w.x, y: w.y, a: w.center, r: w.range * 0.6 });
  const cams = H.watchers.filter((w) => w.kind === 'camera').map((w) => ({ x: w.x, y: w.y, a: w.center }));
  const lasers = LASER_ROWS.map((row) => [at('zaal3', -5.2, row.c), at('zaal3', 5.2, row.c)].map((q) => [q.x, q.y]));
  const xy = (q) => [q.x, q.y];
  const fuse = H.fuseAt || { x: 56.78, y: 765.45 };
  const start = def && def.start;
  const common = [...(start ? [xy(start)] : []), xy(fuse), xy(at('noord', 0, -7.4)), xy(at('noord', -0.4, -1.4))];
  const inside = [xy(SPOTS.deur3()), xy(SPOTS.laserStart()), xy(SPOTS.stand())];
  return {
    bounds, water, buildings, bridges, rooms,
    marks: { start, fuse, cams, guards, lasers, vitrine: MUSEUM_CASE, achterdeur: at('achterdeur', -7.0, 0), glasdeur: at('gang', -4.5, 0), water: { x: 37.92, y: 776.83 } },
    routes: {
      sluip: [...common, xy(at('achterdeur', -7, 0)), xy(at('achterdeur', 7.3, 0)), xy(at('zaal1', -3.9, 1)), xy(at('zaal1', -0.6, 6.8)), xy(SPOTS.deur1()), xy(at('entreehal', -1.4, 0.6)), ...inside],
      vermomd: [...common, xy(at('atrium', 1.8, -8)), xy(at('atrium', 2.2, 1.6)), xy(SPOTS.glasdeur()), xy(at('gang', 4.5, 0)), xy(at('entreehal', -4, 2)), ...inside],
    },
  };
}

// The plan stage: the blueprint while they talk it through (a cast scene),
// then the choice. Returns true once an approach is chosen.
export function updatePlanStage(dt, world, st, S, def) {
  if (!H) return true;
  if (!S.phase) {
    if (isCinematicActive()) return false;
    S.phase = 'talk';
    UI.showPlan(planData(world, def));
    // a retry: the blueprint again, straight to the choice
    if (planHeard) { S.phase = 'choose'; return false; }
    const focus = new Map((st.lines || []).map(([, text, o]) => [text, o && o.focus]));
    // the two of them on the left of the frame, the blueprint on the right
    const p = world.player;
    const face = Math.atan2(MUSEUM_CASE.y - p.y, MUSEUM_CASE.x - p.x);
    const fx = Math.cos(face), fy = Math.sin(face), nx = -fy, ny = fx;
    const shot = (u) => ({
      position: { x: p.x + fx * (5.2 - u * 0.6) - nx * (0.9 + u * 0.5), y: p.y + fy * (5.2 - u * 0.6) - ny * (0.9 + u * 0.5), z: 1.9 },
      lookAt: { x: p.x - nx * 2.1, y: p.y - ny * 2.1, z: 1.35 }, fov: 50,
    });
    const ok = playCastScene(world, {
      at: { x: p.x, y: p.y }, facing: face, shot, lines: st.lines || [], kicker: st.kicker || '', title: st.title || '',
      poses: (t, cur) => (cur ? { [cur.who]: 'point' } : {}),
      update: (t, dt2, cur) => { if (cur) UI.planFocus(focus.get(cur.text)); },
    });
    if (!ok) S.phase = 'choose';
    return false;
  }
  if (S.phase === 'talk') {
    if (isCinematicActive()) return false;
    S.phase = 'choose';
  }
  if (S.phase === 'choose') {
    planHeard = true;
    if (!S.choosing) {
      S.choosing = true;
      holdPlayer(world, true);
      UI.planChoosing(true, (k) => { S.picked = k; });
    }
    const inp = world.input;
    if (inp.wasPressed('a') || inp.wasPressed('arrowleft')) S.picked = 'sluip';
    if (inp.wasPressed('s') || inp.wasPressed('arrowright')) S.picked = 'vermomd';
    if (!S.picked) return false;
    finishPlan(world, S.picked);
    return true;
  }
  return false;
}

function finishPlan(world, approach) {
  if (!H) return;
  if (H.planned) return;
  H.planned = true;
  H.approach = approach === 'vermomd' ? 'vermomd' : 'sluip';
  if (isCinematicActive('mission-scene') && UI.planShown()) skipCinematic();
  UI.planChoosing(false);
  UI.hidePlan();
  releaseHold(world);
  if (H.approach === 'vermomd') wearOveralls(true);
  world.addMessage(H.approach === 'vermomd' ? 'Aanpak: vermomd als schoonmakers. Overall aan, emmer mee.' : 'Aanpak: sluipen via de achterdeur.', 3.5, { kind: 'missie', key: 'heist-plan' });
}

function wearOveralls(on) {
  if (on && !H.look) {
    H.look = { tammo: { ...TAMMO_APPEARANCE }, anita: { ...ANITA_APPEARANCE } };
    Object.assign(TAMMO_APPEARANCE, OVERALL);
    Object.assign(ANITA_APPEARANCE, { shirt: OVERALL.shirt, pants: OVERALL.pants, shoes: OVERALL.shoes });
    refreshCharacterMeshes();
  } else if (!on && H.look) {
    Object.assign(TAMMO_APPEARANCE, H.look.tammo);
    Object.assign(ANITA_APPEARANCE, H.look.anita);
    H.look = null;
    refreshCharacterMeshes();
  }
}

// --- the fuse box minigame ------------------------------------------------------------------

export function closeFuse() {
  if (H && H.fuseOpen) { UI.closePanel(); H.fuseOpen = false; }
}

// Returns true once all fuses are pulled.
export function updateFuse(dt, world, target, input) {
  if (!H) return true;
  const p = world.player;
  const F = H.fuse || (H.fuse = { x: 0, dir: 1, hits: 0, misses: 0, width: 0.16, center: 0.5 });
  const near = target && dist(p.x, p.y, target.x, target.y) < 3.2 && !p.inVehicle;
  if (!near) { closeFuse(); return false; }
  H.fuseOpen = true;
  // the minigame owns Space: no jumping while you pull fuses
  world.minigameUntil = world.time + 0.25;
  F.x += F.dir * dt * (0.85 + F.hits * 0.12);
  if (F.x > 1) { F.x = 2 - F.x; F.dir = -1; }
  if (F.x < 0) { F.x = -F.x; F.dir = 1; }
  if (input && input.wasPressed(' ')) {
    if (Math.abs(F.x - F.center) <= F.width / 2) {
      F.hits++;
      audio(world, 'notify', target.x, target.y);
      world.addMessage(`Klik. Camera ${F.hits} van ${FUSES} draait nu een filmpje van een leeg museum.`, 2.2);
      F.center = 0.2 + Math.random() * 0.6;
    } else {
      F.misses++;
      H.trouble++;
      F.width = Math.min(0.34, F.width + 0.05);
      UI.shakePanel();
      for (let k = 0; k < 10; k++) spawnFxSpark(target.x, 1.5, target.y, (Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.5);
      world.addMessage(F.misses >= MISSES_BEFORE_HELP ? 'Laat mij maar. Alle zekeringen tegelijk eruit.' : 'Au, vonken! Nog een keer, rustig.', 2.2);
      if (F.misses >= MISSES_BEFORE_HELP) F.hits = FUSES;
    }
  }
  UI.fusePanel(F, FUSES);
  if (F.hits >= FUSES) { closeFuse(); camerasOff(); return true; }
  return false;
}

// --- the lock of the back door ------------------------------------------------------------

export function updateLock(dt, world, target) {
  if (!H) return true;
  const p = world.player;
  const L = H.lock || (H.lock = { pins: [1.25, 0.95, 1.4, 1.1].map((P, i) => ({ P, ph: i * 1.7, y: 0 })), cur: 0, zone: 0.18, misses: 0, t: 0 });
  if (!target || p.inVehicle || dist(p.x, p.y, target.x, target.y) > 2.2) { UI.closePanel(); return false; }
  world.minigameUntil = world.time + 0.25;
  L.t += dt;
  L.pins.forEach((q, i) => { if (i >= L.cur) q.y = 0.5 + 0.5 * Math.sin((L.t / q.P) * Math.PI * 2 + q.ph); });
  if (world.input.wasPressed(' ')) {
    const q = L.pins[L.cur];
    if (q.y >= 1 - L.zone) {
      L.cur++;
      audio(world, 'notify', target.x, target.y);
    } else {
      L.misses++;
      H.trouble++;
      L.zone = Math.min(0.42, L.zone + 0.05);
      UI.shakePanel();
      if (L.misses >= PICK_MISSES) {
        world.addMessage('Geef maar. Ik doe het met mijn bibliotheekpasje.', 3.5);
        L.cur = L.pins.length;
      }
    }
  }
  UI.lockPanel(L);
  if (L.cur >= L.pins.length) { UI.closePanel(); return true; }
  return false;
}

// --- the pickpocket (vermomd) ---------------------------------------------------------------

export function updatePickpocket(dt, world) {
  if (!H) return true;
  const g = H.watchers.find((w) => w.group === H.group && w.pick);
  if (!g) return true;
  const p = world.player;
  const d = dist(p.x, p.y, g.x, g.y);
  const behind = Math.abs(angDiff(Math.atan2(p.y - g.y, p.x - g.x), g.angle)) > g.half + 0.35;
  if (d < PICK_REACH && behind && !p.inVehicle && !H.seen) H.pickT += dt;
  else H.pickT = Math.max(0, H.pickT - dt * 0.8);
  const k = Math.min(1, H.pickT / PICK_TIME);
  world.missionPrompt = d < 6 && !p.inVehicle
    ? { id: 'heist-pick', x: g.x, y: g.y, h: 2.3, key: 'CTRL', label: 'Pasje rollen', sub: behind ? 'Blijf even achter hem staan' : 'Van achteren, uit zijn zicht', ring: true, cooldown: Math.max(0.001, 1 - k) }
    : null;
  if (k < 1) return false;
  world.missionPrompt = null;
  g.pick = false;
  world.addMessage('Pasje binnen. Vlugge vingers, zeg.', 3);
  return true;
}

// --- the laser grid in zaal 3 ---------------------------------------------------------------

function buildLasers() {
  if (H.lasers) return;
  const r = ROOM('zaal3');
  const g = new THREE.Group();
  g.position.set(r.cx, 0, r.cy);
  g.rotation.y = -uAngle('zaal3');
  const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 5);
  beamGeo.rotateZ(Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
  glowGeo.rotateZ(Math.PI / 2);
  const half = r.hl - 0.06;
  const rows = LASER_ROWS.map((row) => {
    const beams = [];
    for (const h of row.hs) {
      const segs = [];
      for (let s = 0; s < (row.kind === 'sweep' ? 2 : 1); s++) {
        const m = new THREE.Mesh(beamGeo, beamMat);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        m.add(glow);
        m.position.set(0, h, row.c);
        m.scale.x = half * 2;
        g.add(m);
        segs.push(m);
      }
      beams.push({ h, segs });
    }
    for (const side of [-1, 1]) box(g, 0.08, row.hs[row.hs.length - 1] + 0.3, 0.12, 0x1c1f22, side * (half + 0.02), (row.hs[row.hs.length - 1] + 0.3) / 2, row.c, 0x220000);
    return { ...row, beams, hits: 0, dead: false, gapA: 0 };
  });
  H.root.add(g);
  H.lasers = { g, rows, hits: 0, half, mats: [beamMat, glowMat], fade: 1 };
}

function rowActive(row, t) {
  if (row.dead) return false;
  if (row.kind === 'blink') return (t % (row.on + row.off)) < row.on;
  return true;
}

function stepLasers(dt, t) {
  const L = H.lasers;
  if (L.dying) {
    L.fade = Math.max(0, L.fade - dt * 1.5);
    L.mats[0].opacity = 0.85 * L.fade;
    L.mats[1].opacity = 0.18 * L.fade;
    if (L.fade <= 0) L.g.visible = false;
  }
  for (const row of L.rows) {
    const on = rowActive(row, t);
    if (row.kind === 'sweep') row.gapA = Math.sin((t / row.period) * Math.PI * 2) * (L.half - row.gap / 2 - 0.3);
    for (const b of row.beams) {
      if (row.kind !== 'sweep') { b.segs[0].visible = on; continue; }
      // two pieces either side of the moving gap
      const g0 = row.gapA - row.gap / 2, g1 = row.gapA + row.gap / 2;
      const [left, right] = b.segs;
      left.visible = right.visible = on;
      left.scale.x = Math.max(0.01, g0 + L.half);
      left.position.x = (-L.half + g0) / 2;
      right.scale.x = Math.max(0.01, L.half - g1);
      right.position.x = (g1 + L.half) / 2;
    }
  }
}

function lasersOff() {
  if (!H || !H.lasers) return;
  for (const row of H.lasers.rows) row.dead = true;
  H.lasers.dying = true;
}

// What the next live row ahead asks of you, as a key chip over your head.
function laserPrompt(L, p, q, t) {
  const row = L.rows.filter((r) => !r.dead && r.c > q.c - LASER_BAND && r.c - q.c < 2.6).sort((a, b) => a.c - b.c)[0];
  if (!row) return null;
  const base = { id: 'heist-laser-' + row.kind, x: p.x, y: p.y, h: 2.3, ring: true };
  if (row.kind === 'high') return { ...base, key: 'CTRL', label: 'Bukken', sub: 'Ingedrukt houden onder de hoge lasers' };
  if (row.kind === 'low') return { ...base, key: 'SPATIE', label: 'Springen', sub: 'Over de lage laser' };
  if (row.kind === 'blink') return { ...base, label: rowActive(row, t) ? 'Wachten…' : 'Nu door!', sub: 'Loop als hij uit is' };
  return { ...base, label: 'Door het gat', sub: 'Loop mee met het gat in de lasers' };
}

// Returns true once the player stands by the case.
export function updateLasers(dt, world, target) {
  if (!H) return true;
  if (!H.lasers) buildLasers();
  const p = world.player;
  const L = H.lasers;
  if (target && dist(p.x, p.y, target.x, target.y) < 1.2) { world.missionPrompt = null; return true; }
  if (p.inVehicle || H.zap) { world.missionPrompt = null; return false; }
  const q = toLocal('zaal3', p.x, p.y);
  if (Math.abs(q.a) > ROOM('zaal3').hl + 0.5 || Math.abs(q.c) > ROOM('zaal3').hw + 0.5) { world.missionPrompt = null; return false; }
  world.missionPrompt = laserPrompt(L, p, q, world.time);
  const bottom = p.z || 0, top = bottom + (p.crouching ? 1.0 : 1.72);
  for (const row of L.rows) {
    if (Math.abs(q.c - row.c) > LASER_BAND || !rowActive(row, world.time)) continue;
    const inGap = row.kind === 'sweep' && Math.abs(q.a - row.gapA) < row.gap / 2 - 0.2;
    if (inGap) continue;
    if (!row.hs.some((h) => bottom < h + 0.05 && top > h - 0.05)) continue;
    row.hits++;
    L.hits++;
    H.trouble++;
    H.zap = { t: 0 };
    UI.flashZap();
    audio(world, 'alarm', p.x, p.y);
    if (L.hits >= LASER_ALL_OFF) {
      for (const r of L.rows) r.dead = true;
      world.addMessage('Ik zie een kastje met LASER erop. Ik druk gewoon op alles.', 3.5);
    } else if (L.hits === LASER_HELP) {
      const worst = L.rows.reduce((a, b) => (b.hits > a.hits ? b : a));
      worst.dead = true;
      for (const b of worst.beams) for (const s of b.segs) s.visible = false;
      world.addMessage('Ik zie een kastje met LASER erop. Ik druk gewoon op alles.', 3.5);
    } else world.addMessage('Piep! Die laser zag je. Terug naar het begin.', 3);
    return false;
  }
  return false;
}

// --- the case's dial ------------------------------------------------------------------------

export function updateCrack(dt, world, target) {
  if (!H) return true;
  const p = world.player;
  if (!target || p.inVehicle || dist(p.x, p.y, target.x, target.y) > 1.8) { UI.closePanel(); releaseHold(world); return false; }
  const C = H.crack || (H.crack = { v: 0, cur: 0, code: CODE, t: 0, dirT: 0, misses: 0, showCode: false, showMark: false, feel: 0, hot: false, hinted: false });
  holdPlayer(world, true);
  world.minigameUntil = world.time + 0.25;
  p.angle = Math.atan2(MUSEUM_CASE.y - p.y, MUSEUM_CASE.x - p.x);
  C.t += dt;
  const inp = world.input;
  const left = inp.isDown('a') || inp.isDown('arrowleft'), right = inp.isDown('d') || inp.isDown('arrowright');
  const dir = right && !left ? 1 : left && !right ? -1 : 0;
  if (inp.wasPressed('a') || inp.wasPressed('arrowleft')) C.v -= 1;
  if (inp.wasPressed('d') || inp.wasPressed('arrowright')) C.v += 1;
  C.dirT = dir ? C.dirT + dt : 0;
  if (dir && C.dirT > 0.28) C.v += dir * 9 * dt;
  C.v = ((C.v % DIAL) + DIAL) % DIAL;
  if (!dir) C.v += (Math.round(C.v) - C.v) * Math.min(1, dt * 12);
  const target0 = C.code[C.cur];
  const dd = Math.abs(((C.v - target0 + DIAL * 1.5) % DIAL) - DIAL / 2);
  C.feel = Math.max(0, 1 - dd / 6) ** 1.5;
  C.hot = ((Math.round(C.v) % DIAL) + DIAL) % DIAL === target0;
  if ((C.misses >= 2 || C.t > 12) && !C.hinted) {
    C.hinted = true;
    C.showCode = true;
    world.addMessage('Probeer 1953. Negentien, vijf, drie.', 3.5);
  }
  if (C.t > 32) C.showMark = true;
  if (inp.wasPressed(' ')) {
    if (C.hot) {
      C.cur++;
      audio(world, 'notify', MUSEUM_CASE.x, MUSEUM_CASE.y);
      C.t = Math.min(C.t, 20);
    } else {
      C.misses++;
      H.trouble++;
      UI.shakePanel();
      world.addMessage('Nee, die klikte niet. Voel maar.', 2);
    }
  }
  if (C.cur >= C.code.length) {
    UI.closePanel();
    releaseHold(world);
    H.caseOpen = true;
    audio(world, 'door_open', MUSEUM_CASE.x, MUSEUM_CASE.y);
    return true;
  }
  UI.crackPanel(C);
  return false;
}

// --- the reveal: the card on the cushion -----------------------------------------------------

// The unlocked case stays shut until the reveal scene lifts the dome, so the
// empty cushion is only seen there. Times in seconds from the scene start;
// missions.js times its camera and the first line on these.
export const REVEAL = { push: 1.1, lift0: 1.1, lift1: 2.0, card: 2.2 };
const LID_UP = 0.85;

function revealCase() {
  if (!H) return;
  H.revealed = true;
  if (H.caseCard) H.caseCard.visible = true;
}

export function heistRevealUpdate(t, dt, cur) {
  if (H && H.caseLid) {
    if (t >= REVEAL.lift0) revealCase();
    const k = Math.min(1, Math.max(0, (t - REVEAL.lift0) / (REVEAL.lift1 - REVEAL.lift0)));
    H.caseLid.position.y = LID_UP * k * k * (3 - 2 * k);
  }
  if (cur && cur.clue) UI.showNote('Tige tank! – J.');
  else UI.hideNote();
}

// --- the alarm and the getaway ---------------------------------------------------------------

// The getaway boat's mooring near the north end of the cycle passage: open
// water with room to sail off, and a dry spot beside it to jump in from.
const mooringCache = new WeakMap();
function boatMooring(map) {
  if (mooringCache.has(map)) return mooringCache.get(map);
  const probe = { model: { len: GETAWAY_BOAT.len, wid: GETAWAY_BOAT.wid } };
  const anchor = at('noord', 0, -8.4);
  const dryLand = (x, y) => !isInWater(map, x, y) && !solid(map, x, y);
  const standOk = (x, y) => (dryLand(x, y) || map.isOnBridge(x, y)) && !solid(map, x, y);
  let best = null;
  for (let r = 3; r <= 34; r += 1.5) {
    const n = Math.max(8, Math.round(r * 1.6));
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2;
      const x = anchor.x + Math.cos(a0) * r, y = anchor.y + Math.sin(a0) * r;
      if (!isInWater(map, x, y)) continue;
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * Math.PI * 2;
        if (boatDryPoints(map, probe, x, y, a) > 0) continue;
        // a free run ahead to sail off
        let run = 0;
        for (let s = 2; s <= 60; s += 2) { if (boatDryPoints(map, probe, x + Math.cos(a) * s, y + Math.sin(a) * s, a) > 1 || map.isOnBridge(x + Math.cos(a) * s, y + Math.sin(a) * s)) break; run = s; }
        if (run < 20) continue;
        // somewhere to stand beside the hull
        let stand = null;
        for (const side of [1, -1]) {
          for (let o = 2.2; o <= 4.2 && !stand; o += 0.4) {
            const sx = x - Math.sin(a) * side * o, sy = y + Math.cos(a) * side * o;
            if (standOk(sx, sy)) stand = { x: sx, y: sy };
          }
          if (stand) break;
        }
        if (!stand) continue;
        const score = run - r * 1.2 - dist(stand.x, stand.y, anchor.x, anchor.y) * 0.8;
        if (!best || score > best.score) best = { x, y, a, run, stand, score };
      }
    }
    if (best && r > 12) break;
  }
  mooringCache.set(map, best);
  return best;
}

function spawnBoat(world) {
  if (H.boat && world.vehicles.includes(H.boat)) return H.boat;
  const m = boatMooring(world.map);
  if (!m) return null;
  const v = new Vehicle(m.x, m.y, m.a, { ...GETAWAY_BOAT });
  v.isBoat = true;
  v.missionCar = true;
  v.speed = 0;
  world.vehicles.push(v);
  H.boat = v;
  H.path = { x: m.x, y: m.y, a: m.a, len: Math.max(20, m.run - 4) };
  return v;
}

export function heistBoat() { return H && H.boat; }

function startAlarm(world) {
  if (H.alarm) return;
  H.alarm = true;
  H.alarmBeep = 0;
  for (const id of Object.keys(H.doors)) openHeistDoor(id);
  lasersOff();
  for (const w of H.watchers) {
    if (w.kind !== 'guard') continue;
    w.chase = true;
    w.cone.visible = false;
  }
  UI.hideNote();
  const boat = spawnBoat(world);
  if (boat) world.companionHold = { vehicle: boat };
}

function stopAlarm(world) {
  if (!H || !H.alarm) return;
  H.alarm = false;
  UI.setAlarmUi(0);
  setMuseumLights(true, 0);
}

// The run to the boat: close enough and you jump in; the companion is at the
// wheel for the first stretch (a short scene), then it is yours.
export function updateGetaway(dt, world, st, S) {
  if (!H) return true;
  const boat = H.boat && world.vehicles.includes(H.boat) ? H.boat : spawnBoat(world);
  if (!boat) return true;
  S.target = boat;
  if (S.cine) return S.cineDone;
  const p = world.player;
  if (p.inVehicle && p.inVehicle !== boat) { world.addMessage('Uitstappen en de boot in!', 2); return false; }
  const d = p.inVehicle === boat ? 0 : dist(p.x, p.y, boat.x, boat.y);
  if (d > BOARD_REACH || isCinematicActive()) return false;
  boardBoat(world, boat);
  S.cine = true;
  if (!playLaunch(world, st, boat, () => { S.cineDone = true; })) S.cineDone = true;
  return false;
}

function boardBoat(world, boat) {
  const p = world.player;
  if (p.inVehicle !== boat) {
    if (p.water) { p.water = null; p.swimming = false; p.z = 0; }
    p.enterVehicle(boat, world);
  }
  const c = world.companion;
  if (c && c.inVehicle !== boat && !boat.passenger) { if (c.inVehicle) c.inVehicle.passenger = null; c.inVehicle = boat; boat.passenger = 'companion'; }
}

// Skipping the run (debug, or O held): no scene; `board` puts you straight in the boat.
export function heistSkipGetaway(world, board) {
  if (!H) return;
  if (isCinematicActive('heist-getaway')) skipCinematic();
  const boat = H.boat && world.vehicles.includes(H.boat) ? H.boat : spawnBoat(world);
  if (boat && board) boardBoat(world, boat);
  world.companionHold = null;
}

function playLaunch(world, st, boat, done) {
  const P = H.path;
  const speaker = (k) => (k === 'T' ? 'Tammo' : k === 'A' ? 'Anita' : k);
  const lines = (st.lines || []).map(([k, text]) => ({ speaker: speaker(k), text }));
  const dur = 7.5;
  const ca = Math.cos(P.a), sa = Math.sin(P.a);
  const nx = -sa, ny = ca;
  const sAt = (u) => { const k = Math.min(1, u * 1.15); return P.len * (0.08 * k + 0.92 * k * k * (3 - 2 * k)) * 0.85; };
  const p = world.player;
  // the roadside camera stands over open water, on whichever side has it
  const open = (x, y) => isInWater(world.map, x, y) && !roofed(world.map, x, y);
  let side = null;
  for (const [f, sd] of [[16, 5], [16, -5], [12, 4], [12, -4], [20, 3], [20, -3]]) {
    const x = P.x + ca * f + nx * sd, y = P.y + sa * f + ny * sd;
    if (open(x, y)) { side = { x, y }; break; }
  }
  const place = (u) => {
    const s = sAt(u);
    boat.x = P.x + ca * s; boat.y = P.y + sa * s; boat.angle = P.a;
    boat.speed = 3 + u * 5;
    p.x = boat.x; p.y = boat.y; p.angle = boat.angle;
  };
  return playCinematic({
    id: 'heist-getaway', priority: 3, duration: dur, pause: true, letterbox: true, skippable: true, hideHud: true, lines,
    shot: (u) => {
      place(u);
      if (u < 0.45 && side) {
        // low over the water, the boat roaring off past the camera
        return { position: { x: side.x, y: side.y, z: 1.4 }, lookAt: { x: boat.x, y: boat.y, z: 0.9 }, fov: 50 };
      }
      const k = side ? (u - 0.45) / 0.55 : u;
      return { position: { x: boat.x - ca * (6 + k * 5) + nx * 2.2, y: boat.y - sa * (6 + k * 5) + ny * 2.2, z: 2 + k * 3 }, lookAt: { x: boat.x + ca * 8, y: boat.y + sa * 8, z: 1 }, fov: 58 };
    },
    onStart: () => { world.cinematicHideNav = true; },
    onEnd: () => {
      world.cinematicHideNav = false;
      boat.speed = Math.max(boat.speed, GETAWAY_BOAT.maxSpeed * 0.7);
      world.companionHold = null;
      done();
    },
  });
}

// The closing shot once the police are gone: up and away over the water,
// back towards the museum with its alarm lights.
export function playEndingShot(world, st, done) {
  const p = world.player;
  const from = { x: p.x, y: p.y };
  const mus = { x: MUSEUM_CASE.x, y: MUSEUM_CASE.y - 16 };
  const toM = Math.atan2(mus.y - from.y, mus.x - from.x);
  const near = dist(from.x, from.y, mus.x, mus.y) < 700;
  const look = near ? mus : { x: from.x + Math.cos(toM) * 60, y: from.y + Math.sin(toM) * 60 };
  const ok = playCinematic({
    id: 'heist-ending', priority: 3, duration: 6.5, pause: true, letterbox: true, skippable: true, hideHud: true,
    big: st.big || '',
    shot: (u) => {
      const k = u * u * (3 - 2 * u);
      const back = 5 + k * 30, up = 2 + k * 26;
      const cx = from.x - Math.cos(toM) * back + Math.cos(toM + 1.2) * k * 10, cy = from.y - Math.sin(toM) * back + Math.sin(toM + 1.2) * k * 10;
      const lx = from.x + (look.x - from.x) * k, ly = from.y + (look.y - from.y) * k;
      return { position: { x: cx, y: cy, z: up }, lookAt: { x: lx, y: ly, z: 1 + k * 10 }, fov: 52 };
    },
    onStart: () => { world.cinematicHideNav = true; },
    onEnd: () => { world.cinematicHideNav = false; stopAlarm(world); done(); },
  });
  if (!ok) { stopAlarm(world); done(); }
  return ok;
}

// --- cleanup ----------------------------------------------------------------------------------

export function disposeHeist() {
  if (!H) return;
  const world = H.world;
  setMuseumCaseHidden(false);
  setMuseumLights(false, 0);
  UI.disposeHeistUi();
  for (const d of Object.values(H.doors)) d.room.shut = false;
  for (const r of MUSEUM_ROOMS) r.shut = false;
  wearOveralls(false);
  unregisterPoseSource(DOZER_SEED);
  // a boat the mission never handed over becomes ordinary traffic
  if (H.boat) H.boat.missionCar = false;
  if (world) {
    releaseHold(world);
    world.missionPrompt = null;
    if (world.companionHold) world.companionHold = null;
  }
  H.root.removeFromParent();
  // person meshes share their materials (and all but the skinned geometry)
  const people = new Set();
  for (const w of H.watchers) if (w.kind === 'guard') w.mesh.traverse((o) => { if (!o.isSkinnedMesh && !o.userData.own) people.add(o); });
  H.root.traverse((o) => {
    if (o.geometry && (o.isSkinnedMesh || !people.has(o))) o.geometry.dispose();
    if (o.material && !people.has(o) && !o.isSkinnedMesh) o.material.dispose();
  });
  H = null;
}

// debug: window.__heist
if (typeof window !== 'undefined') {
  window.__heist = {
    state: () => H && { approach: H.approach, group: H.group, spotted: H.spotted, trouble: H.trouble, alarm: H.alarm, watchers: H.watchers.map((w) => ({ kind: w.kind, group: w.group, x: Math.round(w.x * 10) / 10, y: Math.round(w.y * 10) / 10, asleep: !!w.asleep })), lasers: H.lasers && H.lasers.hits, boat: H.boat && { x: Math.round(H.boat.x), y: Math.round(H.boat.y) }, doors: Object.fromEntries(Object.entries(H.doors).map(([k, d]) => [k, !d.room.shut])) },
    spots: (map) => Object.fromEntries(Object.keys(SPOT_LABELS).map((k) => [k, heistSpotAt(map, k)])),
    minigame: () => H && { fuse: H.fuse, lock: H.lock && { cur: H.lock.cur, zone: H.lock.zone, y: H.lock.pins.map((q) => q.y) }, crack: H.crack, zap: !!H.zap, seen: !!H.seen },
  };
}
