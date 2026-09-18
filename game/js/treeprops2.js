import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { clamp, closestPointOnSegment } from './util2.js';

// Live, mutable roadside-tree state layered on top of mapdata2.js's static
// tree list, so vehicles can knock trees over GTA-style. Trees themselves
// stay pure map data (world.map.trees / treesNear) - this module snapshots
// that data once at boot into world.treeProps (one record per tree, in the
// same order/identity as the source) and owns everything about what happens
// to a tree afterwards: standing -> falling (tip + slide) -> resting.
//
// Identity: each treeProp keeps `.raw`, the exact [x,y] array reference
// mapdata2.js's treesNear() returns for that tree, and mapdata2.js's own
// grid still returns that same reference once knocked (it never stops being
// "a tree" as far as the map is concerned). To let scene3d.js's existing,
// unmodified-otherwise syncTrees() cheaply tell a knocked tree apart from a
// standing one without importing anything from here, initTreeProps stashes
// a back-reference on the raw pair itself (raw._treeProp) - see
// integrationNotes for the exact one-line guard that uses it.

const HIT_SPEED_THRESHOLD = 3.0; // m/s - "modest": a slow crawl through the verge shouldn't fell a tree, a real drive-through should
const TREE_TRUNK_RADIUS = 0.3;
const HIT_MARGIN = 0.15;
const QUERY_MARGIN = 2.5;
const FALL_DURATION_MIN = 0.5, FALL_DURATION_MAX = 0.9;
const LAUNCH_SPEED_MIN = 2, LAUNCH_SPEED_MAX = 6;
const SLIDE_FRICTION = 3.2; // 1/s exponential decay on the slide velocity
const LATERAL_FAN = 0.35; // rad - fans the fall angle left/right of pure travel direction depending which side of the vehicle's path the tree sat, so a row of trees doesn't all fall in an identical line

function treeHash(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// raw [x,y] pair -> treeProp. Kept here (not just on world.treeProps) so
// updateTreeProps can go straight from a treesNear() query result to the
// live record without a linear search; cleared/rebuilt by initTreeProps so
// a second boot() in the same page (unlikely, but cheap to guard) can't
// leak stale entries from a previous game.
const treePropByRaw = new Map();

// vehicle.id -> last-seen {x,y}, used to sweep a segment (previous position
// -> current position) through the hit test instead of a single point-in-
// circle check against only the current frame's position. At the top
// vehicle speeds here (~40 m/s) and the frame-time cap in main2.js's
// frame() (dt clamped to 0.05s), a vehicle can move over 2m in one frame -
// comfortably enough to step clean over a single-point check and "phase
// through" a tree it visibly plowed into. Segment-vs-point is barely more
// code than circle-vs-point and removes that failure mode entirely.
const prevPos = new Map();

export function initTreeProps(world) {
  treePropByRaw.clear();
  prevPos.clear();
  const rawTrees = world.map.trees || [];
  world.treeProps = rawTrees.map((raw) => {
    const tree = {
      raw,
      x: raw[0], y: raw[1], // current position - stays put while standing, slides while falling
      x0: raw[0], y0: raw[1], // original position, kept stable for visual sizing + draw-distance culling
      state: 'standing', // 'standing' | 'falling' | 'resting'
      fallAngle: 0, // world-space direction (radians, same convention as vehicle.angle) the tree is falling/lying toward
      tipAngle: 0, // 0 = upright, PI/2 = flat on the ground
      fallT: 0,
      fallDuration: 0,
      vx: 0, vy: 0,
    };
    raw._treeProp = tree;
    treePropByRaw.set(raw, tree);
    return tree;
  });
}

function knockDownTree(tree, v) {
  const travelAngle = v.angle;
  const relX = tree.x - v.x, relY = tree.y - v.y;
  // signed offset of the tree relative to the vehicle's travel line (+ = to
  // the vehicle's left) - used only to pick which way to fan the fall angle
  const lateral = -Math.sin(travelAngle) * relX + Math.cos(travelAngle) * relY;
  const fanSign = lateral >= 0 ? 1 : -1;
  tree.fallAngle = travelAngle + fanSign * LATERAL_FAN;
  const launchSpeed = clamp(Math.abs(v.speed) * 0.45, LAUNCH_SPEED_MIN, LAUNCH_SPEED_MAX);
  tree.vx = Math.cos(tree.fallAngle) * launchSpeed;
  tree.vy = Math.sin(tree.fallAngle) * launchSpeed;
  tree.state = 'falling';
  tree.fallT = 0;
  tree.fallDuration = FALL_DURATION_MIN + Math.random() * (FALL_DURATION_MAX - FALL_DURATION_MIN);
  tree.tipAngle = 0;
}

export function updateTreeProps(dt, world) {
  const trees = world.treeProps;
  if (!trees || !trees.length) return;

  for (const tree of trees) {
    if (tree.state !== 'falling') continue;
    tree.fallT += dt;
    const t = Math.min(1, tree.fallDuration > 0 ? tree.fallT / tree.fallDuration : 1);
    tree.tipAngle = smoothstep(t) * (Math.PI / 2);
    const decay = Math.exp(-SLIDE_FRICTION * dt);
    tree.vx *= decay;
    tree.vy *= decay;
    tree.x += tree.vx * dt;
    tree.y += tree.vy * dt;
    if (t >= 1) {
      tree.state = 'resting';
      tree.vx = 0;
      tree.vy = 0;
      tree.tipAngle = Math.PI / 2;
    }
  }

  const liveIds = new Set();
  for (const v of world.vehicles) {
    liveIds.add(v.id);
    if (v.wrecked) { prevPos.delete(v.id); continue; }

    const prev = prevPos.get(v.id);
    prevPos.set(v.id, { x: v.x, y: v.y });
    if (!prev) continue; // first frame we've seen this vehicle - no segment to sweep yet
    if (Math.abs(v.speed) < HIT_SPEED_THRESHOLD) continue;

    const searchR = v.halfLen + QUERY_MARGIN;
    const hitRadius = v.halfWid + TREE_TRUNK_RADIUS + HIT_MARGIN;
    for (const raw of world.map.treesNear(v.x, v.y, searchR)) {
      const tree = treePropByRaw.get(raw);
      if (!tree || tree.state !== 'standing') continue;
      const cp = closestPointOnSegment(tree.x, tree.y, prev.x, prev.y, v.x, v.y);
      if (cp.dist2 > hitRadius * hitRadius) continue;
      knockDownTree(tree, v);
    }
  }
  for (const id of prevPos.keys()) {
    if (!liveIds.has(id)) prevPos.delete(id);
  }
}

// Same trunk-cylinder + canopy-blob shape/sizing as scene3d.js's private
// buildTreeMesh (inferred from context - trees look identical whether
// they're still standing or already knocked over), rebuilt here rather than
// imported since scene3d.js's builder is private and off-limits to touch.
// The whole shape lives inside a `tilt` child group pivoting at the local
// origin (= the trunk's base/ground contact point, same as the standing
// version): tilt.rotation.z sweeps from 0 (upright, canopy on local +Y) to
// -PI/2 (lying flat, canopy out along local +X) as the tree tips over.
// Facing convention still holds for the outer group - once fully tipped it
// lies toward local +X, so the integrator's usual
// mesh.rotation.y = -angle turns "lying toward +X" into "lying toward
// world direction `angle`", exactly like every other actor here.
export function buildFallenTreeMesh3D(tree) {
  const h = treeHash(tree.x0, tree.y0);
  const trunkH = 2.2 + h * 1.2;
  const canopyR = 1.6 + h * 1.3;

  const tilt = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, trunkH, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3a28 })
  );
  trunk.position.y = trunkH / 2;
  tilt.add(trunk);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(canopyR, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x3f6b3f })
  );
  canopy.scale.y = 0.85;
  canopy.position.y = trunkH + canopyR * 0.7;
  tilt.add(canopy);

  const root = new THREE.Group();
  root.add(tilt);
  root.userData.tilt = tilt;
  return root;
}

// Per-frame companion to buildFallenTreeMesh3D, mirroring the pattern
// scene3d.js already uses for other actors that need more than a plain
// position/rotation.y set each frame (updateVehicleWheelSpin,
// updateTraumaHeliMesh3D, updateMissionMarker3D, ...). Called after the
// integrator sets mesh.position/mesh.rotation.y for the frame.
export function updateFallenTreeMesh3D(mesh, tree) {
  const tilt = mesh.userData.tilt;
  if (tilt) tilt.rotation.z = -tree.tipAngle;
}
