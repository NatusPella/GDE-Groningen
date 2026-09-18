import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildBuildingMesh } from './models3d_buildings.js';
import { buildVehicleMesh, updateVehicleWheelSpin } from './models3d_vehicles.js';
import {
  buildVehicleImpactSparkMesh3D, updateVehicleImpactSparkMesh3D,
  vehicleNeedsFireEffect, buildVehicleFireMesh3D, updateVehicleFireMesh3D,
  vehicleJustWrecked, buildVehicleExplosionMesh3D, updateVehicleExplosionMesh3D,
} from './vehicle.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { applyWeatherToScene3D } from './weather.js';
import { buildFlitspaalMesh3D } from './flitspaal.js';
import { getHorecaForRender, buildHorecaMarkerMesh3D } from './horeca.js';
import { buildSeagullMesh3D, buildCowMesh3D, buildSheepMesh3D } from './wildlife.js';
import { buildMissionMarker3D, updateMissionMarker3D, buildWaypointDotMesh3D } from './missions.js';
import {
  getPickupsForRender, buildMoneyPickupMesh3D, buildWeaponPickupMesh3D,
  buildHealthPickupMesh3D, buildArmorPickupMesh3D, buildGaragePickupMesh3D,
} from './pickups.js';
import { getTrafficLights, getTrafficLightPhase, buildTrafficLightMesh3D, setTrafficLightPhase3D } from './trafficlights.js';
import { getCombatEffect, buildBulletMesh3D, buildSparkBurstMesh3D, buildMuzzleFlashMesh3D, buildMeleeSwipeMesh3D } from './combat.js';
import { createWaterMaterial, updateWaterMaterial } from './water3d.js';
import { buildFallenTreeMesh3D, updateFallenTreeMesh3D } from './treeprops.js';
import { buildTerrainMesh3D, updateTerrainMaterial } from './terrain3d.js';
import { buildPoliceHeliMesh3D, updatePoliceHeliMesh3D } from './police.js';
import { buildTraumaHeliMesh3D, buildBalloonMesh3D, updateTraumaHeliMesh3D } from './skyprops.js';
import { pointInPolygon, polygonBounds } from './util.js';
import { preloadLandmarkModels, onLandmarkModelLoaded } from './landmarkmodels.js';

// A genuine WebGL 3D view of the exact same world state the 2D canvas game
// draws - same x/y meters, same b.h building heights, same vehicle/pedestrian
// arrays. Nothing about gameplay/physics/collision changes here; this module
// only ever READS world and mirrors it into a Three.js scene with a
// GTA3-style third-person follow camera. World mapping: three.x = world.x,
// three.z = world.y, three.y = up (meters, roughly 3m per building level).

const LEVEL_HEIGHT = 3.1;
const DRAW_DIST = 140;
// Canals/Diepenring sit visibly below street level (a real quay is a step
// down, not flush with the road) - also keeps water from ever competing
// with the ground/road planes for the same depth-buffer range. Was -0.35,
// only 5cm below the terrain's own -0.4 base (and well within the terrain
// shader's own bump displacement range) - nowhere near enough of a drop to
// read as "the canal sits below street level" from a close-up 3rd person
// camera; pushed meaningfully lower instead.
const WATER_Y = -1.1;
const UNLOAD_DIST = 175;
const TREE_DIST = 90;

let renderer = null, scene = null, cam = null, canvas3 = null;
let terrainMesh = null;
let followYaw = 0;
// orbit radius kept constant so pitch changes swing the camera around the
// player like a real GTA camera (higher/steeper looking down, lower/flatter
// looking up) instead of just sliding the camera height up and down in place
const ORBIT_RADIUS = Math.hypot(2.6, 2.6);
const PITCH_MIN_DEG = 10; // mouse near top of screen - low, near-level "looking up" angle
const PITCH_MAX_DEG = 52; // mouse near bottom of screen - steep GTA-style overhead angle
let followPitch = Math.atan2(5.2 - 1.3, 9);

const buildingMeshes = new Map();
// Buildings are only ever built once and cached above - if a landmark's real
// model finishes loading (async) after its building already got its
// procedural-fallback mesh cached, drop that cache entry so the next
// syncBuildings() call rebuilds it with the real model instead of leaving
// it procedural for the rest of the session.
onLandmarkModelLoaded((name) => {
  for (const [b, mesh] of buildingMeshes) {
    if (b.name !== name) continue;
    scene.remove(mesh);
    buildingMeshes.delete(b);
  }
});
const roadMeshes = new Map();
const greenMeshes = new Map();
const waterMeshes = new Map();
const treeMeshes = new Map();
const fallenTreeMeshes = new Map();
const vehicleFireMeshes = new Map();
let impactSparkEffects = [];
let vehicleExplosionEffects = [];
const vehicleMeshes = new Map();
const pedMeshes = new Map();
const wildlifeMeshes = new Map();
const speechBubbleEls = new Map();
let billboardRoot = null;
let flitspaalBuilt = false;
let horecaBuilt = false;
let policeHeliMesh = null;
const skyPropMeshes = new Map();
let playerMesh = null;
let playerCharacter = 'tammo';
let companionMesh = null;
let companionCharacter = null;
let passengerMesh = null;
let missionMarkerMesh = null;
const missionWaypointDotMeshes = new Map();
let missionWaypointSetKey = null;
const trafficLightMeshes = new Map();
const moneyMeshes = new Map();
const weaponMeshes = new Map();
const healthMeshes = new Map();
const armorMeshes = new Map();
const garageMeshes = new Map();
const bulletMeshes = new Map();
const sparkMeshes = new Map();
const kissMeshes = new Map();
const KISS_HEART_MAT = new THREE.MeshBasicMaterial({ color: 0xff4d8a });
function buildKissHeartMesh() {
  const group = new THREE.Group();
  const lobeL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), KISS_HEART_MAT);
  lobeL.position.set(-0.11, 0.08, 0);
  group.add(lobeL);
  const lobeR = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), KISS_HEART_MAT);
  lobeR.position.set(0.11, 0.08, 0);
  group.add(lobeR);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.32, 8), KISS_HEART_MAT);
  tip.rotation.z = Math.PI;
  tip.position.set(0, -0.12, 0);
  group.add(tip);
  return group;
}
let muzzleFlashMesh = null;
let meleeSwipeMesh = null;
let sun = null;
const camRaycaster = new THREE.Raycaster();
let lastPx = null, lastPy = null;

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

export function init3D(map) {
  preloadLandmarkModels();
  canvas3 = document.getElementById('game3d');
  renderer = new THREE.WebGLRenderer({ canvas: canvas3, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = false;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc4e0);
  scene.fog = new THREE.Fog(0x9cc4e0, DRAW_DIST * 0.45, DRAW_DIST * 1.05);

  // near=0.5 (not something tiny like 0.15) keeps depth-buffer precision
  // usable out at DRAW_DIST - too-small a near plane collapses the ground
  // vs. road/water/green y-offsets into the same depth bucket at range,
  // which read as "roads just don't render" (ground always won the z-test)
  cam = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.5, DRAW_DIST * 1.4);

  // ground color kept close to neutral gray (not saturated green) - a
  // strongly-tinted hemisphere ground color bleeds onto every downward-
  // facing surface everywhere (birds, car undersides, roof overhangs),
  // which read as "wrong color" complaints unrelated to the actual ground
  scene.add(new THREE.HemisphereLight(0xdcefff, 0x55524a, 3));
  sun = new THREE.DirectionalLight(0xfff2d8, 4.5);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(sun.target);

  // Real terrain mesh built from the map's actual bounds (vertices/faces,
  // not a flat "magic floor") with its own shader - replaces the old
  // infinite flat plane per feedback. Tried removing the backdrop entirely
  // first, but real map data (roads/sidewalks/green/buildings) doesn't
  // cover 100% of the navigable area, so gaps showed the sky-colored scene
  // background right at ground level - looked like holes in the world.
  // Sits below WATER_Y (-0.35) so it never hides water the way the old
  // plane did (that one rendered at y=0, right over water's -0.35).
  terrainMesh = buildTerrainMesh3D(map.meta.bounds, map.water);
  scene.add(terrainMesh);

  playerMesh = buildPersonMesh(TAMMO_APPEARANCE.shirt, TAMMO_APPEARANCE.skin, TAMMO_APPEARANCE);
  scene.add(playerMesh);

  billboardRoot = document.getElementById('hud');

  resize3D();
  window.addEventListener('resize', resize3D);
  window.__scene3d = { scene, cam, renderer };
}

export function resize3D() {
  if (!renderer) return;
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}


// --- shape helpers -----------------------------------------------------

function shapeFromPoly(pts) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], -pts[i][1]);
  return shape;
}

// Grid-tessellated fallback fill, same robust technique terrain3d.js already
// uses to cut real water holes: tile the polygon's own bbox and keep only
// triangles whose centroid passes a plain point-in-polygon test. Immune to
// the self-intersection assumption ShapeGeometry/earcut needs - which some
// real water/green polygons violate on purpose (e.g. a canal "ring" like
// the Diepenring, whose point list traces the outer edge forward then the
// inner edge backward specifically so the ray-cast tests used everywhere
// else in this codebase read it as a ring with a hole).
function buildGridFillGeometry(pts) {
  const [minx, miny, maxx, maxy] = polygonBounds(pts);
  const w = Math.max(maxx - minx, 1e-3), d = Math.max(maxy - miny, 1e-3);
  const targetSegs = 80;
  const cell = Math.max(w, d) / targetSegs;
  const segsX = Math.max(1, Math.round(w / cell));
  const segsZ = Math.max(1, Math.round(d / cell));
  const nx = segsX + 1, nz = segsZ + 1;

  const positions = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) {
    const wy = miny + (d * j) / segsZ;
    for (let i = 0; i < nx; i++) {
      const wx = minx + (w * i) / segsX;
      const idx = (j * nx + i) * 3;
      positions[idx] = wx; positions[idx + 1] = 0; positions[idx + 2] = wy;
    }
  }

  const maxTriangles = segsX * segsZ * 2;
  const indices = new Uint32Array(maxTriangles * 3);
  let indexCount = 0;
  for (let j = 0; j < segsZ; j++) {
    for (let i = 0; i < segsX; i++) {
      const a = j * nx + i, b = j * nx + i + 1, c = (j + 1) * nx + i, dd = (j + 1) * nx + i + 1;
      const ax = positions[a * 3], ay = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 2];
      const cx = positions[c * 3], cy = positions[c * 3 + 2];
      const dx = positions[dd * 3], dy = positions[dd * 3 + 2];

      const cx1 = (ax + cx + bx) / 3, cy1 = (ay + cy + by) / 3;
      if (pointInPolygon(cx1, cy1, pts)) { indices[indexCount++] = a; indices[indexCount++] = c; indices[indexCount++] = b; }

      const cx2 = (bx + cx + dx) / 3, cy2 = (by + cy + dy) / 3;
      if (pointInPolygon(cx2, cy2, pts)) { indices[indexCount++] = b; indices[indexCount++] = c; indices[indexCount++] = dd; }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexCount), 1));
  geo.computeBoundingSphere();
  return geo;
}

// earcut (via ShapeGeometry) silently collapses to a near-empty mesh on a
// self-intersecting contour instead of throwing - caught here by checking
// the triangulated vertex count against the input point count, since a
// healthy triangulation never drops points. Falls back to the grid fill
// above only for the rare polygons that actually need it; the cheap earcut
// path stays the default for every ordinary simple polygon (most ponds/
// parks), since building a full grid per polygon is needlessly expensive.
function buildPolyGeometry(pts) {
  const shape = shapeFromPoly(pts);
  const geo = new THREE.ShapeGeometry(shape);
  if (geo.attributes.position.count < pts.length * 0.5) {
    geo.dispose();
    return buildGridFillGeometry(pts);
  }
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function buildFlatMesh(poly, color, y) {
  if (!poly._geoFlat) poly._geoFlat = buildPolyGeometry(poly.pts);
  const mesh = new THREE.Mesh(poly._geoFlat, new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = y;
  return mesh;
}

// One shared animated ShaderMaterial for every water polygon (uTime updated
// once per frame in update3D) instead of a flat MeshLambertMaterial per poly.
let waterMaterial = null;
function buildWaterMesh(poly, y) {
  if (!poly._geoFlat) poly._geoFlat = buildPolyGeometry(poly.pts);
  if (!waterMaterial) waterMaterial = createWaterMaterial();
  const mesh = new THREE.Mesh(poly._geoFlat, waterMaterial);
  mesh.position.y = y;
  return mesh;
}

function ribbonGeometry(pts, half) {
  const verts = [];
  const idx = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * half, ny = dx / len * half;
    const base = verts.length / 3;
    verts.push(ax + nx, 0, ay + ny);
    verts.push(ax - nx, 0, ay - ny);
    verts.push(bx + nx, 0, by + ny);
    verts.push(bx - nx, 0, by - ny);
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// Darker, more saturated asphalt than the earlier pass - against the tan
// ground fill these read unmistakably as "a road" instead of blending into
// a same-toned gray; major/normal roads also get a painted centerline
// (the single strongest "this is a street" visual cue a real road has).
const ROAD_COLORS3D = { cycle: 0xa1402f, foot: 0x9a9284, major: 0x33363a, normal: 0x26282b, minor: 0x26282b };
const CENTERLINE_MAT = new THREE.MeshBasicMaterial({ color: 0xe8d24a });
// Real streets have a sidewalk/verge buffer between the road edge and the
// building line - most residential OSM ways don't map that as a separate
// footway, so without this the asphalt runs straight up to building
// footprints and every street reads as far narrower than it actually is.
// Skipped for cycle/foot categories - those already ARE the pedestrian/
// cycle surface, they don't get a sidewalk of their own.
const SIDEWALK_EXTRA = 1.8;
const SIDEWALK_COLOR = 0x8f8a7c;
const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);

function buildRoadMesh(road) {
  const group = new THREE.Group();

  if (SIDEWALK_CATS.has(road.cat)) {
    if (!road._geoSidewalk) road._geoSidewalk = ribbonGeometry(road.pts, road.width / 2 + SIDEWALK_EXTRA);
    const sidewalk = new THREE.Mesh(road._geoSidewalk, new THREE.MeshLambertMaterial({ color: SIDEWALK_COLOR }));
    sidewalk.position.y = 0.02;
    group.add(sidewalk);
  }

  if (!road._geoRoad) road._geoRoad = ribbonGeometry(road.pts, road.width / 2);
  const color = ROAD_COLORS3D[road.cat] || ROAD_COLORS3D.normal;
  const mesh = new THREE.Mesh(road._geoRoad, new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = 0.03;
  group.add(mesh);

  if (road.cat === 'major' || road.cat === 'normal') {
    if (!road._geoLine) road._geoLine = ribbonGeometry(road.pts, Math.min(0.12, road.width * 0.06));
    const line = new THREE.Mesh(road._geoLine, CENTERLINE_MAT);
    line.position.y = 0.035;
    group.add(line);
  }
  return group;
}

function buildTreeMesh(x, y) {
  const h = hash2(x, y);
  const group = new THREE.Group();
  const trunkH = 2.2 + h * 1.2;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, trunkH, 6),
    new THREE.MeshLambertMaterial({ color: 0x4a3a28 })
  );
  trunk.position.y = trunkH / 2;
  group.add(trunk);
  const r = 1.6 + h * 1.3;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(r, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x3f6b3f })
  );
  canopy.scale.y = 0.85;
  canopy.position.y = trunkH + r * 0.7;
  group.add(canopy);
  group.position.set(x, 0, y);
  return group;
}

// --- per-frame sync ------------------------------------------------------

function syncBuildings(world, px, py) {
  const view = world.map.buildingsNear(px, py, DRAW_DIST);
  const seen = new Set();
  for (const b of view) {
    const dx = b.bounds[0] - px, dy = b.bounds[1] - py;
    if (Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - px, (b.bounds[1] + b.bounds[3]) / 2 - py) > DRAW_DIST) continue;
    seen.add(b);
    if (!buildingMeshes.has(b)) {
      const mesh = buildBuildingMesh(b);
      scene.add(mesh);
      buildingMeshes.set(b, mesh);
    }
  }
  for (const [b, mesh] of buildingMeshes) {
    if (seen.has(b)) continue;
    const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
    if (Math.hypot(cx - px, cy - py) > UNLOAD_DIST) {
      // no dispose here: buildBuildingMesh's children reuse shared,
      // module-scope materials/geometry cached on b._geo3dParts across the
      // building's lifetime - disposing would corrupt every other building
      // still on screen that shares the same style/family material
      scene.remove(mesh);
      buildingMeshes.delete(b);
    }
  }
}

function syncFlat(items, cache, color, y, px, py) {
  const seen = new Set();
  for (const poly of items) {
    seen.add(poly);
    if (!cache.has(poly)) {
      const mesh = buildFlatMesh(poly, color, y);
      scene.add(mesh);
      cache.set(poly, mesh);
    }
  }
  for (const [poly, mesh] of cache) {
    if (seen.has(poly)) continue;
    scene.remove(mesh);
    mesh.material.dispose();
    cache.delete(poly);
  }
}

// Same create/remove bookkeeping as syncFlat, but for water: never disposes
// the mesh's material since every water mesh shares the ONE waterMaterial.
function syncWater(items, cache, y) {
  const seen = new Set();
  for (const poly of items) {
    seen.add(poly);
    if (!cache.has(poly)) {
      const mesh = buildWaterMesh(poly, y);
      scene.add(mesh);
      cache.set(poly, mesh);
    }
  }
  for (const [poly, mesh] of cache) {
    if (seen.has(poly)) continue;
    scene.remove(mesh);
    cache.delete(poly);
  }
}

function syncRoads(world, px, py) {
  const view = world.map.roadsNear(px, py, DRAW_DIST);
  const seen = new Set();
  for (const r of view) seen.add(r);
  for (const r of view) {
    if (!roadMeshes.has(r)) {
      const mesh = buildRoadMesh(r);
      scene.add(mesh);
      roadMeshes.set(r, mesh);
    }
  }
  for (const [r, mesh] of roadMeshes) {
    if (seen.has(r)) continue;
    scene.remove(mesh);
    // buildRoadMesh returns a Group (surface + optional centerline), not a
    // plain Mesh, since the centerline stripe was added - the centerline
    // material is shared (CENTERLINE_MAT) so only dispose the surface's own
    mesh.traverse((o) => { if (o.material && o.material !== CENTERLINE_MAT) o.material.dispose(); });
    roadMeshes.delete(r);
  }
}

function syncTrees(world, px, py) {
  const view = world.map.treesNear(px, py, TREE_DIST);
  const seen = new Set();
  for (const t of view) {
    // knocked over (falling/resting) - rendered by syncFallenTrees instead
    if (t._treeProp && t._treeProp.state !== 'standing') continue;
    seen.add(t);
    if (!treeMeshes.has(t)) {
      const mesh = buildTreeMesh(t[0], t[1]);
      scene.add(mesh);
      treeMeshes.set(t, mesh);
    }
  }
  for (const [t, mesh] of treeMeshes) {
    if (seen.has(t)) continue;
    scene.remove(mesh);
    for (const child of mesh.children) child.material.dispose();
    treeMeshes.delete(t);
  }
}

function syncFallenTrees(world, px, py) {
  if (!world.treeProps) return;
  const seen = new Set();
  for (const tree of world.treeProps) {
    if (tree.state === 'standing') continue;
    if (Math.hypot(tree.x0 - px, tree.y0 - py) > TREE_DIST) continue;
    seen.add(tree);
    if (!fallenTreeMeshes.has(tree)) {
      const mesh = buildFallenTreeMesh3D(tree);
      scene.add(mesh);
      fallenTreeMeshes.set(tree, mesh);
    }
    const mesh = fallenTreeMeshes.get(tree);
    mesh.position.set(tree.x, 0, tree.y);
    mesh.rotation.y = -tree.fallAngle;
    updateFallenTreeMesh3D(mesh, tree);
  }
  for (const [tree, mesh] of fallenTreeMeshes) {
    if (seen.has(tree)) continue;
    scene.remove(mesh);
    mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    fallenTreeMeshes.delete(tree);
  }
}

function syncActors(list, cache, builder, idOf) {
  const seen = new Set();
  for (const item of list) {
    const id = idOf(item);
    seen.add(id);
    if (!cache.has(id)) {
      const mesh = builder(item);
      scene.add(mesh);
      cache.set(id, mesh);
    }
  }
  for (const [id, mesh] of cache) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    cache.delete(id);
  }
}

// Same as syncActors, but never disposes materials on removal - pickups.js
// deliberately shares materials/geometries at module scope across every
// live pickup of a kind, so disposing one would corrupt every other one
// still on screen (same hazard buildings/mission-dots already guard against).
function syncPickupActors(list, cache, builder, idOf) {
  const seen = new Set();
  for (const item of list) {
    const id = idOf(item);
    seen.add(id);
    if (!cache.has(id)) {
      const mesh = builder(item);
      scene.add(mesh);
      cache.set(id, mesh);
    }
  }
  for (const [id, mesh] of cache) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    cache.delete(id);
  }
}

// --- DOM billboards (speech bubbles, etc.) -------------------------------
// The 3D view has no 2D canvas to draw HTML-quality text/bubbles onto, so
// these are plain positioned <div>s living in the existing #hud overlay
// (already a full-viewport, pointer-events:none layer), reprojected to
// screen space every frame from the same THREE.Camera the world renders
// through - the standard cheap "billboard" trick for a handful of labels.
const _projVec = new THREE.Vector3();
function projectToScreen(x, y, z) {
  _projVec.set(x, y, z).project(cam);
  if (_projVec.z > 1) return null; // behind the camera
  return {
    x: (_projVec.x * 0.5 + 0.5) * renderer.domElement.clientWidth,
    y: (1 - (_projVec.y * 0.5 + 0.5)) * renderer.domElement.clientHeight,
  };
}

function speechBubbleEl() {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.transform = 'translate(-50%, -100%)';
  el.style.background = 'rgba(242,240,234,0.92)';
  el.style.border = '1px solid rgba(20,20,22,0.6)';
  el.style.borderRadius = '8px';
  el.style.padding = '3px 9px';
  el.style.color = '#20201e';
  el.style.font = 'bold 13px "Arial Narrow", Arial, sans-serif';
  el.style.whiteSpace = 'nowrap';
  el.style.pointerEvents = 'none';
  billboardRoot.appendChild(el);
  return el;
}

function syncSpeechBubbles(world) {
  const seen = new Set();
  for (const p of world.pedestrians) {
    if (!p.speechText || world.time >= p.speechUntil) continue;
    seen.add(p);
    let el = speechBubbleEls.get(p);
    if (!el) { el = speechBubbleEl(); speechBubbleEls.set(p, el); }
    const scr = projectToScreen(p.x, 2.1, p.y);
    if (!scr) { el.style.display = 'none'; continue; }
    el.textContent = p.speechText;
    el.style.display = 'block';
    el.style.left = scr.x + 'px';
    el.style.top = scr.y + 'px';
  }
  for (const [p, el] of speechBubbleEls) {
    if (seen.has(p)) continue;
    el.remove();
    speechBubbleEls.delete(p);
  }
}

export function update3D(dt, world) {
  const player = world.player;

  syncBuildings(world, player.x, player.y);
  syncFlat(world.map.greenNear(player.x, player.y, DRAW_DIST), greenMeshes, 0x5c8a4d, 0.015, player.x, player.y);
  syncWater(world.map.waterNear(player.x, player.y, DRAW_DIST), waterMeshes, WATER_Y);
  if (waterMaterial) updateWaterMaterial(waterMaterial, world.time);
  if (terrainMesh) updateTerrainMaterial(terrainMesh.material, world.time);
  syncRoads(world, player.x, player.y);
  syncTrees(world, player.x, player.y);
  syncFallenTrees(world, player.x, player.y);

  syncActors(
    world.vehicles.filter((v) => !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) < DRAW_DIST),
    vehicleMeshes,
    buildVehicleMesh,
    (v) => v.id
  );
  const fireSeenIds = new Set();
  for (const v of world.vehicles) {
    const mesh = vehicleMeshes.get(v.id);
    if (mesh) {
      mesh.position.set(v.x, v.isBoat ? WATER_Y : 0, v.y);
      mesh.rotation.y = -v.angle;
      updateVehicleWheelSpin(mesh, v.speed, dt);
    }

    // damage VFX - checked regardless of `mesh` (a just-wrecked vehicle's
    // mesh is already gone by the time syncActors filters !v.wrecked out)
    if (v.hitThisFrame) {
      const spark = buildVehicleImpactSparkMesh3D();
      spark.position.set(v.hitX, 0.3, v.hitY);
      scene.add(spark);
      impactSparkEffects.push(spark);
    }
    if (vehicleJustWrecked(v)) {
      const boom = buildVehicleExplosionMesh3D();
      boom.position.set(v.x, 0.2, v.y);
      scene.add(boom);
      vehicleExplosionEffects.push(boom);
    }
    if (vehicleNeedsFireEffect(v)) {
      fireSeenIds.add(v.id);
      let fire = vehicleFireMeshes.get(v.id);
      if (!fire) {
        fire = buildVehicleFireMesh3D();
        scene.add(fire);
        vehicleFireMeshes.set(v.id, fire);
      }
      fire.position.set(v.x, 0.4, v.y);
      updateVehicleFireMesh3D(fire, dt);
    }
  }
  for (const [id, fire] of vehicleFireMeshes) {
    if (fireSeenIds.has(id)) continue;
    scene.remove(fire);
    fire.traverse((o) => { if (o.material) o.material.dispose(); });
    vehicleFireMeshes.delete(id);
  }
  impactSparkEffects = impactSparkEffects.filter((mesh) => {
    const alive = updateVehicleImpactSparkMesh3D(mesh, dt);
    if (!alive) {
      scene.remove(mesh);
      mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    }
    return alive;
  });
  vehicleExplosionEffects = vehicleExplosionEffects.filter((mesh) => {
    const alive = updateVehicleExplosionMesh3D(mesh, dt);
    if (!alive) {
      scene.remove(mesh);
      mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    }
    return alive;
  });

  syncActors(
    world.pedestrians.filter((p) => p.state !== 'dead' && Math.hypot(p.x - player.x, p.y - player.y) < DRAW_DIST),
    pedMeshes,
    (p) => buildPersonMesh(p.clothing ? colorFromHex(p.clothing) : 0xcaa46a, p.skin ? colorFromHex(p.skin) : 0xe0b48a),
    (p) => p
  );
  for (const p of world.pedestrians) {
    const mesh = pedMeshes.get(p);
    if (mesh) {
      mesh.position.set(p.x, 0, p.y);
      mesh.rotation.y = -p.angle;
      animatePersonWalk(mesh, p.speed || 0, dt);
    }
  }
  syncSpeechBubbles(world);

  if (!flitspaalBuilt && world.flitspaalen && world.flitspaalen.length) {
    flitspaalBuilt = true;
    for (const fc of world.flitspaalen) {
      const mesh = buildFlitspaalMesh3D();
      mesh.position.set(fc.x, 0, fc.y);
      mesh.rotation.y = -fc.angle;
      scene.add(mesh);
    }
  }

  if (!horecaBuilt) {
    const horecaSpots = getHorecaForRender();
    if (horecaSpots.length) {
      horecaBuilt = true;
      for (const h of horecaSpots) {
        const mesh = buildHorecaMarkerMesh3D();
        mesh.position.set(h.x, 0, h.y);
        scene.add(mesh);
      }
    }
  }

  if (world.wildlife) {
    syncActors(
      world.wildlife.filter((a) => Math.hypot(a.x - player.x, a.y - player.y) < DRAW_DIST),
      wildlifeMeshes,
      (a) => (a.kind === 'seagull' ? buildSeagullMesh3D() : a.kind === 'sheep' ? buildSheepMesh3D() : buildCowMesh3D(a.bobSeed)),
      (a) => a
    );
    for (const a of world.wildlife) {
      const mesh = wildlifeMeshes.get(a);
      if (mesh) {
        const y = a.kind === 'seagull' ? 6 + Math.sin(world.time * 2 + (a.flapSeed || 0)) * 1.2 : 0;
        mesh.position.set(a.x, y, a.y);
        mesh.rotation.y = -a.angle;
      }
    }
  }

  if (world.policeHeli) {
    if (!policeHeliMesh) {
      policeHeliMesh = buildPoliceHeliMesh3D();
      scene.add(policeHeliMesh);
    }
    policeHeliMesh.position.set(world.policeHeli.x, world.policeHeli.z, world.policeHeli.y);
    policeHeliMesh.rotation.y = -world.policeHeli.angle;
    updatePoliceHeliMesh3D(policeHeliMesh, world.time);
  } else if (policeHeliMesh) {
    scene.remove(policeHeliMesh);
    policeHeliMesh = null;
  }

  if (world.skyProps) {
    syncActors(
      world.skyProps,
      skyPropMeshes,
      (p) => (p.kind === 'balloon' ? buildBalloonMesh3D() : buildTraumaHeliMesh3D()),
      (p) => p
    );
    for (const p of world.skyProps) {
      const mesh = skyPropMeshes.get(p);
      if (mesh) {
        mesh.position.set(p.x, p.z, p.y);
        mesh.rotation.y = -p.angle;
        if (p.kind === 'traumaheli') updateTraumaHeliMesh3D(mesh, world.time);
      }
    }
  }

  // mission marker: a single persistent beacon, repositioned/recolored -
  // world.mission is one long-lived object (the chain loops forever), never
  // an array, so this is a create-once singleton, not a Map-keyed sync
  if (world.mission) {
    if (!missionMarkerMesh) {
      missionMarkerMesh = buildMissionMarker3D();
      scene.add(missionMarkerMesh);
    }
    missionMarkerMesh.position.set(world.mission.marker.x, 0, world.mission.marker.y);
    updateMissionMarker3D(missionMarkerMesh, world.time, world.mission.phase);
  } else if (missionMarkerMesh) {
    scene.remove(missionMarkerMesh);
    missionMarkerMesh = null;
  }

  // remaining-waypoint preview dots (checkpoint/boat missions only) - the
  // whole set is torn down/rebuilt on wpIndex change rather than diffed,
  // since the plain {x,y} waypoint objects have no stable identity
  if (world.mission && world.mission.remainingWaypoints.length) {
    const wpKey = `${world.mission.index}:${world.mission.wpIndex}`;
    if (wpKey !== missionWaypointSetKey) {
      missionWaypointSetKey = wpKey;
      for (const mesh of missionWaypointDotMeshes.values()) scene.remove(mesh);
      missionWaypointDotMeshes.clear();
      world.mission.remainingWaypoints.forEach((wp, i) => {
        const mesh = buildWaypointDotMesh3D();
        mesh.position.set(wp.x, 0.4, wp.y);
        scene.add(mesh);
        missionWaypointDotMeshes.set(i, mesh);
      });
    }
  } else if (missionWaypointSetKey !== null) {
    for (const mesh of missionWaypointDotMeshes.values()) scene.remove(mesh);
    missionWaypointDotMeshes.clear();
    missionWaypointSetKey = null;
  }

  // pickups: money/weapons/health/armor/garages all share module-scope
  // materials in pickups.js, so removal must never call material.dispose()
  const pu = getPickupsForRender();
  syncPickupActors(pu.money, moneyMeshes, () => buildMoneyPickupMesh3D(), (m) => m);
  for (const m of pu.money) {
    const mesh = moneyMeshes.get(m);
    if (mesh) {
      mesh.position.set(m.x, 0.55 + Math.sin(world.time * 3 + (m.amount || 0)) * 0.05, m.y);
      mesh.rotation.y = world.time * 2.2;
    }
  }
  syncPickupActors(pu.weapons, weaponMeshes, (w) => buildWeaponPickupMesh3D(w.key), (w) => w);
  for (const w of pu.weapons) {
    const mesh = weaponMeshes.get(w);
    if (mesh) { mesh.position.set(w.x, 0, w.y); mesh.rotation.y = world.time * 1.3; }
  }
  syncPickupActors(pu.health ? [pu.health] : [], healthMeshes, () => buildHealthPickupMesh3D(), (h) => h);
  if (pu.health) {
    const mesh = healthMeshes.get(pu.health);
    if (mesh) mesh.position.set(pu.health.x, 0, pu.health.y);
  }
  syncPickupActors(pu.armor ? [pu.armor] : [], armorMeshes, () => buildArmorPickupMesh3D(), (a) => a);
  if (pu.armor) {
    const mesh = armorMeshes.get(pu.armor);
    if (mesh) mesh.position.set(pu.armor.x, 0, pu.armor.y);
  }
  syncPickupActors(pu.garages, garageMeshes, () => buildGaragePickupMesh3D(), (g) => g);
  for (const g of pu.garages) {
    const mesh = garageMeshes.get(g);
    if (mesh) mesh.position.set(g.x, 0, g.y);
  }

  // traffic lights: static positions, built once, only the lamp color changes
  for (const light of getTrafficLights()) {
    let mesh = trafficLightMeshes.get(light);
    if (!mesh) {
      mesh = buildTrafficLightMesh3D();
      mesh.position.set(light.x, 0, light.y);
      scene.add(mesh);
      trafficLightMeshes.set(light, mesh);
    }
    setTrafficLightPhase3D(mesh, getTrafficLightPhase(light));
  }

  // combat: bullets (Map-keyed like any other actor), spark bursts (pruned
  // by world.time > until), and a single shared muzzle-flash/melee-swipe
  // slot (only one of the two effect types can be active at once)
  syncActors(world.bullets, bulletMeshes, buildBulletMesh3D, (b) => b);
  for (const b of world.bullets) {
    const mesh = bulletMeshes.get(b);
    if (mesh) {
      mesh.position.set(b.x, 1.15, b.y);
      mesh.rotation.y = -Math.atan2(b.vy, b.vx);
    }
  }
  for (const p of world.particles) {
    if (p.kind !== 'spark' || sparkMeshes.has(p)) continue;
    const mesh = buildSparkBurstMesh3D();
    mesh.position.set(p.x, 1.15, p.y);
    scene.add(mesh);
    sparkMeshes.set(p, mesh);
  }
  for (const [p, mesh] of sparkMeshes) {
    if (world.time <= p.until) continue;
    scene.remove(mesh);
    mesh.traverse((o) => { if (o.material) o.material.dispose(); });
    sparkMeshes.delete(p);
  }
  for (const p of world.particles) {
    if (p.kind !== 'kiss' || kissMeshes.has(p)) continue;
    const mesh = buildKissHeartMesh();
    mesh.position.set(p.x, 1.6, p.y);
    mesh.userData.born = world.time;
    scene.add(mesh);
    kissMeshes.set(p, mesh);
  }
  for (const [p, mesh] of kissMeshes) {
    const life = (world.time - mesh.userData.born) / Math.max(0.01, p.until - mesh.userData.born);
    mesh.position.y = 1.6 + life * 0.8;
    mesh.scale.setScalar(1 + Math.sin(life * Math.PI) * 0.3);
    if (world.time <= p.until) continue;
    scene.remove(mesh); // no dispose: KISS_HEART_MAT is shared across every heart
    kissMeshes.delete(p);
  }
  if (!muzzleFlashMesh) { muzzleFlashMesh = buildMuzzleFlashMesh3D(); scene.add(muzzleFlashMesh); }
  if (!meleeSwipeMesh) { meleeSwipeMesh = buildMeleeSwipeMesh3D(); scene.add(meleeSwipeMesh); }
  {
    const fx = getCombatEffect();
    const fxActive = fx && world.time < fx.until;
    muzzleFlashMesh.visible = !!(fxActive && fx.type === 'muzzle');
    meleeSwipeMesh.visible = !!(fxActive && fx.type === 'melee');
    if (fxActive) {
      const activeMesh = fx.type === 'muzzle' ? muzzleFlashMesh : meleeSwipeMesh;
      activeMesh.position.set(player.x, 1.15, player.y);
      activeMesh.rotation.y = -fx.angle;
    }
  }

  applyWeatherToScene3D(scene, renderer, world, dt, player.x, player.y);

  if (player.character !== playerCharacter) {
    playerCharacter = player.character;
    scene.remove(playerMesh);
    const appearance = playerCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
    playerMesh = buildPersonMesh(appearance.shirt, appearance.skin, appearance);
    scene.add(playerMesh);
  }

  playerMesh.visible = !player.inVehicle;
  if (!player.inVehicle) {
    playerMesh.position.set(player.x, player.z || 0, player.y);
    playerMesh.rotation.y = -player.angle;
    playerMesh.scale.y = player.crouching ? 0.6 : 1;
    animatePersonWalk(playerMesh, Math.hypot(player.vx, player.vy), dt);
  }

  // companion (Tammo/Anita, whichever the player isn't controlling) -
  // walks alongside on foot, or rides along as a visible passenger
  const comp = world.companion;
  if (comp) {
    if (comp.character !== companionCharacter) {
      companionCharacter = comp.character;
      const appearance = companionCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
      if (companionMesh) scene.remove(companionMesh);
      companionMesh = buildPersonMesh(appearance.shirt, appearance.skin, appearance);
      scene.add(companionMesh);
      if (passengerMesh) scene.remove(passengerMesh);
      passengerMesh = buildPersonMesh(appearance.shirt, appearance.skin, appearance);
      passengerMesh.visible = false;
      scene.add(passengerMesh);
    }
    companionMesh.visible = !comp.inVehicle;
    if (!comp.inVehicle) {
      companionMesh.position.set(comp.x, 0, comp.y);
      companionMesh.rotation.y = -comp.angle;
      animatePersonWalk(companionMesh, Math.hypot(comp.vx, comp.vy), dt);
    } else {
      const v = comp.inVehicle;
      const hl = v.model.len / 2, hw = v.model.wid / 2;
      const offX = hl * 0.05, offZ = -hw * 0.32;
      const wx = v.x + Math.cos(v.angle) * offX - Math.sin(v.angle) * offZ;
      const wy = v.y + Math.sin(v.angle) * offX + Math.cos(v.angle) * offZ;
      passengerMesh.visible = true;
      passengerMesh.position.set(wx, 0, wy);
      passengerMesh.rotation.y = -v.angle;
    }
  }
  if (passengerMesh && (!comp || !comp.inVehicle)) passengerMesh.visible = false;

  // third-person follow: smoothly settle behind whatever the player is
  // currently facing (on foot or driving), GTA3-style - with a wall-aware
  // pull-in so the camera never ends up clipped inside a building, and an
  // instant snap on teleport (respawn/mission warp) instead of a long lerp
  // that would otherwise glide the camera straight through geometry
  const targetAngle = player.inVehicle ? player.inVehicle.angle : player.angle;
  followYaw += normalizeAngleDelta(-targetAngle - followYaw) * Math.min(1, dt * 5);

  // mouse Y pans the camera up/down around the player, GTA-style - top of
  // the screen swings the camera down to a lower, more level angle ("looking
  // up"), bottom of the screen swings it up to a steeper overhead angle
  const pitchT = Math.min(1, Math.max(0, (world.input.mouse.y || 0) / (innerHeight || 1)));
  const targetPitchDeg = PITCH_MIN_DEG + (PITCH_MAX_DEG - PITCH_MIN_DEG) * pitchT;
  const targetPitch = targetPitchDeg * Math.PI / 180;
  followPitch += (targetPitch - followPitch) * Math.min(1, dt * 6);

  const eyeX = player.x, eyeY = 1.3, eyeZ = player.y;
  const horizDist = Math.cos(followPitch) * ORBIT_RADIUS;
  const orbitHeight = eyeY + Math.sin(followPitch) * ORBIT_RADIUS;
  let desiredX = player.x - Math.cos(targetAngle) * horizDist;
  let desiredZ = player.y - Math.sin(targetAngle) * horizDist;
  let desiredY = orbitHeight;

  // recursive: true - each building is now a Group of several child meshes
  // (roof/window-band/steeple/...), not one flat Mesh, so a non-recursive
  // raycast against the Group itself would never hit anything
  function raycastBuildingDist(dx, dy, dz, dist) {
    camRaycaster.set(new THREE.Vector3(eyeX, eyeY, eyeZ), new THREE.Vector3(dx / dist, dy / dist, dz / dist));
    camRaycaster.far = dist;
    camRaycaster.near = 0.1;
    const hits = camRaycaster.intersectObjects(Array.from(buildingMeshes.values()), true);
    return hits.length ? hits[0].distance : null;
  }

  const dx = desiredX - eyeX, dy = desiredY - eyeY, dz = desiredZ - eyeZ;
  const fullDist = Math.hypot(dx, dy, dz) || 1;
  const hitDist = raycastBuildingDist(dx, dy, dz, fullDist);
  if (hitDist !== null) {
    // the ideal orbit view is blocked - real Gronings streets are often
    // narrower than ORBIT_RADIUS, so this triggers constantly in the
    // Binnenstad. Pulling the camera straight in along the same low ray
    // (the old behaviour) used to shove it almost into the ground/wall at
    // as little as 1.2m, leaving nothing visible but a blank close-up patch
    // - "a floor slab covering everything". Try a near-overhead vantage
    // first instead: looking down a street from above the rooftops clears
    // the adjacent wall far more often than squeezing past it at eye level.
    const steepPitch = Math.max(followPitch, 75 * Math.PI / 180);
    const steepHoriz = Math.cos(steepPitch) * ORBIT_RADIUS;
    const steepHeight = eyeY + Math.sin(steepPitch) * ORBIT_RADIUS;
    const altX = player.x - Math.cos(targetAngle) * steepHoriz;
    const altZ = player.y - Math.sin(targetAngle) * steepHoriz;
    const altDx = altX - eyeX, altDy = steepHeight - eyeY, altDz = altZ - eyeZ;
    const altFullDist = Math.hypot(altDx, altDy, altDz) || 1;
    const altHit = raycastBuildingDist(altDx, altDy, altDz, altFullDist);
    if (altHit === null || altHit > 2.2) {
      desiredX = altX; desiredY = steepHeight; desiredZ = altZ;
      if (altHit !== null) {
        const d = Math.max(1.6, altHit - 0.4);
        const t = d / altFullDist;
        desiredX = eyeX + altDx * t;
        desiredY = eyeY + altDy * t;
        desiredZ = eyeZ + altDz * t;
      }
    } else {
      // even near-overhead is blocked (under an overhang/bridge) - fall
      // back to pulling in on the original ray, with a less punishing
      // minimum distance than before
      const d = Math.max(1.6, hitDist - 0.4);
      const t = d / fullDist;
      desiredX = eyeX + dx * t;
      desiredY = eyeY + dy * t;
      desiredZ = eyeZ + dz * t;
    }
  }

  const teleported = lastPx !== null && Math.hypot(player.x - lastPx, player.y - lastPy) > 15;
  const lerpT = teleported ? 1 : Math.min(1, dt * 6);
  cam.position.x += (desiredX - cam.position.x) * lerpT;
  cam.position.y += (desiredY - cam.position.y) * lerpT;
  cam.position.z += (desiredZ - cam.position.z) * lerpT;
  lastPx = player.x; lastPy = player.y;
  cam.lookAt(player.x, 1.3, player.y);

  sun.position.set(player.x + 120, 180, player.y + 60);
  sun.target.position.set(player.x, 0, player.y);

  renderer.render(scene, cam);
}

function colorFromHex(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

function normalizeAngleDelta(a) {
  a = a % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}
