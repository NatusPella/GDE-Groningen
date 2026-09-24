import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { buildBuildingMesh, setBuildingMap } from './models3d_buildings.js';
import { buildVehicleMesh, updateVehicleWheelSpin, setBusRearAngle, updatePoliceLamps } from './models3d_vehicles.js';
import {
  buildVehicleImpactSparkMesh3D, updateVehicleImpactSparkMesh3D,
  vehicleNeedsFireEffect, buildVehicleFireMesh3D, updateVehicleFireMesh3D,
  vehicleJustWrecked, buildVehicleExplosionMesh3D, updateVehicleExplosionMesh3D,
  sampleBusTrail, buildSplashMesh3D, updateSplashMesh3D, SPLASH_LIFETIME,
} from './vehicle.js';
import { DEAD_DURATION } from './pedestrians.js';
import { buildPersonMesh, animatePersonWalk, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { applyWeatherToScene3D } from './weather.js';
import { buildFlitspaalMesh3D } from './flitspaal.js';
import { getHorecaForRender, buildHorecaMarkerMesh3D } from './horeca.js';
import { buildSeagullMesh3D, buildCowMesh3D, buildSheepMesh3D, animateWildlifeMesh3D } from './wildlife.js';
import { buildMissionMarker3D, updateMissionMarker3D, buildWaypointDotMesh3D, buildMissionArrow3D, updateMissionArrow3D } from './missions.js';
import {
  getPickupsForRender, buildMoneyPickupMesh3D, buildWeaponPickupMesh3D,
  buildHealthPickupMesh3D, buildArmorPickupMesh3D, buildGaragePickupMesh3D,
} from './pickups.js';
import { getTrafficLights, getTrafficLightPhase, buildTrafficLightMesh3D, setTrafficLightPhase3D, placeTrafficLight } from './trafficlights.js';
import { getCombatEffect, buildBulletMesh3D, buildSparkBurstMesh3D, buildMuzzleFlashMesh3D, buildMeleeSwipeMesh3D } from './combat.js';
import { createWaterMaterial, updateWaterMaterial } from './water3d.js';
import { buildFallenTreeMesh3D, updateFallenTreeMesh3D } from './treeprops.js';
import { buildTerrainMesh3D } from './terrain3d.js';
import { buildPoliceHeliMesh3D, updatePoliceHeliMesh3D } from './police.js';
import { buildTraumaHeliMesh3D, buildBalloonMesh3D, updateTraumaHeliMesh3D } from './skyprops.js';
import { pointInPolygon, polygonBounds } from './util.js';
import { preloadLandmarkModels, onLandmarkModelLoaded } from './landmarkmodels.js';
import { onSettingsChange, QUALITY_PRESETS } from './settings.js';
import { getActiveRoute, getRouteAhead, getUserWaypoint } from './routing.js';
import { OUTLINE_MAT } from './pixelart3d.js';
import { createSkyUniforms, buildSkyDome, buildEnvironmentMaps, SKY_HORIZON } from './sky3d.js';

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
let missionArrowMesh = null;
const splashMeshes = new Map();
const wakeMeshes = new Map();
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
let skyDome = null;
let skyUniforms = null;
// Low golden-hour sun (~38 deg elevation) so facades get long, readable shadows.
const SUN_DIR = new THREE.Vector3(120, 110, 70).normalize();
const SUN_DIST = 160;
const SHADOW_HALF = 45;
const SHADOW_MAP_SIZE = 2048;
const _lightRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize();
const _lightUp = new THREE.Vector3().crossVectors(SUN_DIR, _lightRight).normalize();
const _shadowCenter = new THREE.Vector3();
const camRaycaster = new THREE.Raycaster();
const camRayOrigin = new THREE.Vector3();
const camRayDir = new THREE.Vector3();
const CAM_CLEARANCE = 0.9; // must stay above the camera's 0.5m near plane
const CAM_PUSH_DIRS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
const CAM_TARGET_RADIUS = ORBIT_RADIUS * 5 + CAM_CLEARANCE + 2;
const camTargetList = [];
let lastPx = null, lastPy = null;
const camBase = new THREE.Vector3();
let camBaseInit = false;
const CAM_SHAKE_TIME = 0.6;
const CAM_SHAKE_MAX = 0.28;

function nearbyCamTargets(px, py) {
  camTargetList.length = 0;
  for (const [b, mesh] of buildingMeshes) {
    const [minx, miny, maxx, maxy] = b.bounds;
    if (px < minx - CAM_TARGET_RADIUS || px > maxx + CAM_TARGET_RADIUS) continue;
    if (py < miny - CAM_TARGET_RADIUS || py > maxy + CAM_TARGET_RADIUS) continue;
    camTargetList.push(mesh);
  }
  return camTargetList;
}

// Materials reused across many actors - disposing one would force every
// remaining user to re-upload/recompile it on the next frame.
const SHARED_MATERIALS = new Set([OUTLINE_MAT, KISS_HEART_MAT]);
const SHARED_GEOMETRIES = new Set();

// Actors/effects build their own geometries per instance, so on despawn both
// geometry and material must be freed or GPU memory grows all session.
function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry && !SHARED_GEOMETRIES.has(o.geometry) && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!SHARED_MATERIALS.has(m) && !m.userData.shared) m.dispose();
  });
}

// Soft blob shadow: one texture/geometry/material for every actor. The
// polygon offset outranks every ground decal layer (GROUND_LAYER tops out
// at -8/-32), so it sits on roads and markings instead of under them.
const BLOB_SHADOW_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const BLOB_SHADOW_MAT = new THREE.MeshBasicMaterial({
  map: buildBlobShadowTexture(),
  color: 0x000000,
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -10,
  polygonOffsetUnits: -40,
});
SHARED_GEOMETRIES.add(BLOB_SHADOW_GEO);
SHARED_MATERIALS.add(BLOB_SHADOW_MAT);

function buildBlobShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.38)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function addBlobShadow(parent, sx, sz, x = 0) {
  const shadow = new THREE.Mesh(BLOB_SHADOW_GEO, BLOB_SHADOW_MAT);
  shadow.position.set(x, 0.02, 0);
  shadow.scale.set(sx, 1, sz);
  shadow.renderOrder = 1;
  parent.add(shadow);
  parent.userData.shadow = shadow;
  return shadow;
}

function buildVehicleActor(v) {
  const mesh = buildVehicleMesh(v);
  const { len, wid } = v.model;
  if (v.isBoat) {
    mesh.rotation.order = 'YXZ';
  } else if (v.isBus) {
    const sec = mesh.userData.busSections;
    addBlobShadow(mesh, sec.frontLen * 1.08, wid * 1.3, sec.frontX);
    addBlobShadow(mesh.userData.busRear, sec.rearLen * 1.08, wid * 1.3, sec.rearX);
  } else if (v.isBike || v.isScooter) {
    addBlobShadow(mesh, len * 1.1, 0.6);
  } else {
    addBlobShadow(mesh, len * 1.12, wid * 1.3);
  }
  return mesh;
}

function buildPersonActor(shirt, skin, appearance) {
  const mesh = buildPersonMesh(shirt, skin, appearance);
  addBlobShadow(mesh, 0.85, 0.85);
  return enableShadows(mesh, false);
}

// V-shaped foam trail behind a moving boat, unit length along local -X from
// the stern; alpha fades via RGBA vertex colours. Material is per boat.
const WAKE_GEO = (() => {
  const pos = [], col = [];
  const tri = (pts) => { for (const [x, z, a] of pts) { pos.push(x, 0, z); col.push(1, 1, 1, a); } };
  for (const s of [1, -1]) tri([[0.05, s * 0.12, 0.9], [-1, s * 0.34, 0], [-1, s * 0.52, 0]]);
  tri([[0.05, 0.28, 0.55], [0.05, -0.28, 0.55], [-0.45, 0, 0]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  return g;
})();
SHARED_GEOMETRIES.add(WAKE_GEO);

function buildWakeMesh() {
  const mesh = new THREE.Mesh(WAKE_GEO, new THREE.MeshBasicMaterial({
    color: 0xe4eef2, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -16,
  }));
  mesh.renderOrder = 1;
  return mesh;
}

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

export function init3D(map) {
  preloadLandmarkModels();
  setBuildingMap(map);
  canvas3 = document.getElementById('game3d');
  renderer = new THREE.WebGLRenderer({ canvas: canvas3, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_HORIZON);
  scene.fog = new THREE.Fog(SKY_HORIZON, DRAW_DIST * 0.45, DRAW_DIST * 1.05);
  skyUniforms = createSkyUniforms(SUN_DIR);
  skyDome = buildSkyDome(skyUniforms);
  scene.add(skyDome);
  const env = buildEnvironmentMaps(renderer, SUN_DIR);
  scene.environment = env.clear;
  scene.userData.sky = { uniforms: skyUniforms, envClear: env.clear, envStorm: env.storm };

  // near=0.5 (not something tiny like 0.15) keeps depth-buffer precision
  // usable out at DRAW_DIST - too-small a near plane collapses the ground
  // vs. road/water/green y-offsets into the same depth bucket at range,
  // which read as "roads just don't render" (ground always won the z-test)
  cam = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.5, DRAW_DIST * 1.4);

  // Hemisphere ground stays a muted warm grey: a saturated ground colour
  // bleeds onto every downward-facing surface (car undersides, eaves).
  scene.add(new THREE.HemisphereLight(0xb4cdea, 0x6f6454, 0.9));
  sun = new THREE.DirectionalLight(0xffd29a, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  Object.assign(sun.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: SUN_DIST + 140 });
  sun.shadow.camera.updateProjectionMatrix();
  onSettingsChange(applyViewSettings);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
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

  // Opaque canal bed under the whole map: terrain holes are cut per grid
  // triangle, so their jagged edges never line up exactly with the water
  // polygons, and the transparent water would otherwise blend against the
  // sky colour through the gaps.
  const [bx0, by0, bx1, by1] = map.meta.bounds;
  const bedPad = Math.max(bx1 - bx0, by1 - by0) * 0.15;
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(bx1 - bx0 + bedPad * 2, by1 - by0 + bedPad * 2),
    new THREE.MeshBasicMaterial({ color: 0x1e2a2c }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set((bx0 + bx1) / 2, WATER_Y - 0.5, (by0 + by1) / 2);
  scene.add(bed);

  playerMesh = buildPersonActor(TAMMO_APPEARANCE.shirt, TAMMO_APPEARANCE.skin, TAMMO_APPEARANCE);
  scene.add(playerMesh);

  billboardRoot = document.getElementById('hud');

  resize3D();
  window.addEventListener('resize', resize3D);
  window.__scene3d = { scene, cam, renderer };
}

// Read-only access for systems that need the view pose (e.g. the 3D audio listener).
export function getCamera() {
  return cam;
}

export function getScene() {
  return scene;
}

let orbitRadius = ORBIT_RADIUS;

function applyViewSettings(st) {
  if (!renderer) return;
  const preset = QUALITY_PRESETS[st.quality] || QUALITY_PRESETS.hoog;
  renderer.setPixelRatio(Math.min(preset.pixelRatio, window.devicePixelRatio || 1));
  resize3D();
  const shadows = st.shadows && preset.shadows;
  if (sun.castShadow !== shadows) sun.castShadow = shadows;
  if (sun.shadow.mapSize.x !== preset.shadowMapSize) {
    sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  cam.fov = st.fov;
  cam.updateProjectionMatrix();
  orbitRadius = ORBIT_RADIUS * st.cameraDistance;
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
  let mat = flatMaterials.get(color);
  if (!mat) flatMaterials.set(color, mat = groundMaterial(color, GROUND_LAYER.green));
  const mesh = new THREE.Mesh(poly._geoFlat, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}
const flatMaterials = new Map();

// One shared animated ShaderMaterial for every water polygon (uTime updated
// once per frame in update3D) instead of a flat MeshLambertMaterial per poly.
let waterMaterial = null;
function buildWaterMesh(poly, y) {
  if (!poly._geoFlat) poly._geoFlat = buildPolyGeometry(poly.pts);
  if (!waterMaterial) waterMaterial = createWaterMaterial(skyUniforms);
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
    // counter-clockwise seen from above, so the faces point up (+Y) and
    // survive single-sided back-face culling
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
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
const ROAD_COLORS3D = { cycle: 0x94412f, foot: 0x837d71, major: 0x57595c, normal: 0x4b4d50, minor: 0x4b4d50 };
// Ground decals (green, sidewalks, road categories, markings) overlap at
// every junction a few millimetres apart - far below depth-buffer precision
// at street distance, so they flickered. Each layer gets a fixed
// polygonOffset step instead, which resolves in depth-buffer space and so
// holds at any distance; higher layers always win.
const GROUND_LAYER = { green: 1, sidewalk: 2, foot: 3, cycle: 4, minor: 5, normal: 6, major: 7, marking: 8 };
function groundMaterial(color, layer, Mat = THREE.MeshLambertMaterial) {
  return new Mat({ color, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 4 });
}
const CENTERLINE_MAT = groundMaterial(0xf2f0e6, GROUND_LAYER.marking, THREE.MeshBasicMaterial); // Dutch road markings are white
// Real streets have a sidewalk/verge buffer between the road edge and the
// building line - most residential OSM ways don't map that as a separate
// footway, so without this the asphalt runs straight up to building
// footprints and every street reads as far narrower than it actually is.
// Skipped for cycle/foot categories - those already ARE the pedestrian/
// cycle surface, they don't get a sidewalk of their own.
const SIDEWALK_EXTRA = 1.8;
const SIDEWALK_COLOR = 0x7b776d;
const SIDEWALK_CATS = new Set(['major', 'normal', 'minor']);
const SIDEWALK_MAT = groundMaterial(SIDEWALK_COLOR, GROUND_LAYER.sidewalk);
const ROAD_MATS = Object.fromEntries(Object.entries(ROAD_COLORS3D).map(([cat, color]) => [cat, groundMaterial(color, GROUND_LAYER[cat])]));

function buildRoadMesh(road) {
  const group = new THREE.Group();

  if (SIDEWALK_CATS.has(road.cat)) {
    if (!road._geoSidewalk) road._geoSidewalk = ribbonGeometry(road.pts, road.width / 2 + SIDEWALK_EXTRA);
    const sidewalk = new THREE.Mesh(road._geoSidewalk, SIDEWALK_MAT);
    sidewalk.position.y = 0.02;
    group.add(sidewalk);
  }

  if (!road._geoRoad) road._geoRoad = ribbonGeometry(road.pts, road.width / 2);
  const mesh = new THREE.Mesh(road._geoRoad, ROAD_MATS[road.cat] || ROAD_MATS.normal);
  mesh.position.y = 0.03;
  group.add(mesh);

  if (road.cat === 'major' || road.cat === 'normal') {
    if (!road._geoLine) road._geoLine = ribbonGeometry(road.pts, Math.min(0.12, road.width * 0.06));
    const line = new THREE.Mesh(road._geoLine, CENTERLINE_MAT);
    line.position.y = 0.035;
    group.add(line);
  }
  for (const m of group.children) m.receiveShadow = true;
  return group;
}

// minCastRadius: small parts (window bands, trims, trunks) still receive
// but skip the shadow pass - each caster is a full extra draw call.
function enableShadows(root, receive = true, minCastRadius = 0) {
  const casters = [];
  root.traverse((o) => {
    if (!o.isMesh || o === root.userData.shadow) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || m.transparent || m.isMeshBasicMaterial || m.isShaderMaterial) return;
    o.receiveShadow = receive;
    if (minCastRadius > 0) {
      if (m.map) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      let scale = 1;
      for (let p = o; p && p !== root.parent; p = p.parent) scale *= Math.abs(p.scale.x);
      if (o.geometry.boundingSphere.radius * scale < minCastRadius) return;
    }
    o.castShadow = true;
    casters.push(o);
  });
  root.userData.shadowCasters = casters;
  return root;
}

// People are ~20 meshes each; only those near the player cast real shadows
// (the rest keep their blob), which keeps the shadow pass cheap in crowds.
const ACTOR_SHADOW_DIST = 28;
function limitActorShadows(cache, px, py) {
  for (const mesh of cache.values()) {
    const casters = mesh.userData.shadowCasters;
    if (!casters) continue;
    const near = Math.abs(mesh.position.x - px) < ACTOR_SHADOW_DIST && Math.abs(mesh.position.z - py) < ACTOR_SHADOW_DIST;
    if (mesh.userData.castNear === near) continue;
    mesh.userData.castNear = near;
    for (const o of casters) o.castShadow = near;
  }
}

const TREE_TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0x4d3a28, roughness: 0.9, flatShading: true });
const TREE_CANOPY_MATS = [0x3f6634, 0x4a7236, 0x56793a].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }));
const TREE_TRUNK_GEO = new THREE.CylinderGeometry(0.14, 0.22, 1, 6).translate(0, 0.5, 0);
const TREE_CANOPY_GEO = new THREE.IcosahedronGeometry(1, 1);
SHARED_MATERIALS.add(TREE_TRUNK_MAT);
for (const m of TREE_CANOPY_MATS) SHARED_MATERIALS.add(m);
SHARED_GEOMETRIES.add(TREE_TRUNK_GEO);
SHARED_GEOMETRIES.add(TREE_CANOPY_GEO);

function buildTreeMesh(x, y) {
  const h = hash2(x, y);
  const h2 = hash2(y, x);
  const group = new THREE.Group();
  const trunkH = 2.2 + h * 1.2;
  const trunk = new THREE.Mesh(TREE_TRUNK_GEO, TREE_TRUNK_MAT);
  trunk.scale.set(1, trunkH, 1);
  group.add(trunk);
  const r = 1.6 + h * 1.3;
  const mat = TREE_CANOPY_MATS[Math.floor(h2 * TREE_CANOPY_MATS.length)];
  const canopy = new THREE.Mesh(TREE_CANOPY_GEO, mat);
  canopy.scale.set(r, r * 0.85, r);
  canopy.rotation.y = h2 * Math.PI * 2;
  canopy.position.y = trunkH + r * 0.7;
  group.add(canopy);
  const lobe = new THREE.Mesh(TREE_CANOPY_GEO, mat);
  const lr = r * (0.55 + h2 * 0.15);
  lobe.scale.set(lr, lr * 0.85, lr);
  lobe.position.set(Math.cos(h2 * 6.3) * r * 0.55, trunkH + r * 0.95, Math.sin(h2 * 6.3) * r * 0.55);
  group.add(lobe);
  canopy.castShadow = true;
  lobe.receiveShadow = canopy.receiveShadow = trunk.receiveShadow = true;
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
      const mesh = enableShadows(buildBuildingMesh(b), true, 2.5);
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
    scene.remove(mesh); // geometry is cached on the road, materials are shared per layer
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
    disposeObject(mesh);
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
    disposeObject(mesh);
    fallenTreeMeshes.delete(tree);
  }
}

function syncActors(list, cache, builder, idOf) {
  const seen = new Set();
  for (const item of list) {
    const id = idOf(item);
    seen.add(id);
    if (!cache.has(id)) {
      const mesh = enableShadows(builder(item), false);
      scene.add(mesh);
      cache.set(id, mesh);
    }
  }
  for (const [id, mesh] of cache) {
    if (seen.has(id)) continue;
    scene.remove(mesh);
    disposeObject(mesh);
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
  syncRoads(world, player.x, player.y);
  syncTrees(world, player.x, player.y);
  syncFallenTrees(world, player.x, player.y);

  syncActors(
    world.vehicles.filter((v) => !v.wrecked && Math.hypot(v.x - player.x, v.y - player.y) < DRAW_DIST),
    vehicleMeshes,
    buildVehicleActor,
    (v) => v.id
  );
  const fireSeenIds = new Set();
  const policeChasing = world.wanted > 0;
  for (const v of world.vehicles) {
    const mesh = vehicleMeshes.get(v.id);
    if (mesh) {
      mesh.position.set(v.x, v.isBoat ? WATER_Y : 0, v.y);
      mesh.rotation.y = -v.angle;
      updateVehicleWheelSpin(mesh, v.speed, dt);
      if (v.isBoat) animateBoat(mesh, v, world.time);
      else if (v.isBus) setBusRearAngle(mesh, v.angle, sampleBusTrail(v, v.model.len * 0.3).angle);
      if (v.isPolice) updatePoliceLamps(mesh, world.time, policeChasing && !v.hijacked && v.driver !== 'player');
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
  syncBoatWakes(world);
  for (const [id, fire] of vehicleFireMeshes) {
    if (fireSeenIds.has(id)) continue;
    scene.remove(fire);
    disposeObject(fire);
    vehicleFireMeshes.delete(id);
  }
  impactSparkEffects = impactSparkEffects.filter((mesh) => {
    const alive = updateVehicleImpactSparkMesh3D(mesh, dt);
    if (!alive) {
      scene.remove(mesh);
      disposeObject(mesh);
    }
    return alive;
  });
  vehicleExplosionEffects = vehicleExplosionEffects.filter((mesh) => {
    const alive = updateVehicleExplosionMesh3D(mesh, dt);
    if (!alive) {
      scene.remove(mesh);
      disposeObject(mesh);
    }
    return alive;
  });

  syncActors(
    world.pedestrians.filter((p) => Math.hypot(p.x - player.x, p.y - player.y) < DRAW_DIST),
    pedMeshes,
    (p) => {
      // stable per-ped look, so a ped doesn't change clothes when it streams back in
      if (p._lookSeed === undefined) p._lookSeed = Math.random() * 1000;
      return buildPersonActor(p.clothing ? colorFromHex(p.clothing) : 0xcaa46a, p.skin ? colorFromHex(p.skin) : 0xe0b48a, { seed: p._lookSeed });
    },
    (p) => p
  );
  for (const p of world.pedestrians) {
    const mesh = pedMeshes.get(p);
    if (!mesh) continue;
    if (p.state === 'dead') {
      // topple backwards over ~0.3s, then lie flat until the ped is removed
      const fall = Math.min(1, (world.time - (p.deadUntil - DEAD_DURATION)) / 0.3);
      mesh.position.set(p.x, 0.14 * fall, p.y);
      mesh.rotation.set(0, -p.angle, fall * fall * Math.PI / 2);
      mesh.userData.shadow.visible = false;
      animatePersonWalk(mesh, 0, dt);
      continue;
    }
    mesh.position.set(p.x, 0, p.y);
    mesh.rotation.y = -p.angle;
    animatePersonWalk(mesh, p.speed || 0, dt);
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
      buildWildlifeActor,
      (a) => a
    );
    for (const a of world.wildlife) {
      const mesh = wildlifeMeshes.get(a);
      if (mesh) {
        const y = a.kind === 'seagull' ? 6 + Math.sin(world.time * 2 + (a.flapSeed || 0)) * 1.2 : 0;
        mesh.position.set(a.x, y, a.y);
        mesh.rotation.y = -a.angle;
        animateWildlifeMesh3D(mesh, a, world.time);
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
  if (!missionArrowMesh) {
    missionArrowMesh = buildMissionArrow3D();
    scene.add(missionArrowMesh);
  }
  if (world.mission && world.mission.distanceToMarker !== undefined) {
    const radius = player.inVehicle ? player.inVehicle.model.len / 2 + 1.6 : 2.2;
    updateMissionArrow3D(missionArrowMesh, world.mission, player.x, player.y, radius, world.time);
  } else {
    missionArrowMesh.visible = false;
  }
  updateRouteRibbon3D(dt, world);

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
  syncPickupActors(pu.money, moneyMeshes, () => withShadow(buildMoneyPickupMesh3D(), 0.7), (m) => m);
  for (const m of pu.money) {
    const mesh = moneyMeshes.get(m);
    if (mesh) {
      mesh.position.set(m.x, 0.55 + Math.sin(world.time * 3 + (m.amount || 0)) * 0.05, m.y);
      mesh.rotation.y = world.time * 2.2;
      mesh.userData.shadow.position.y = 0.02 - mesh.position.y;
    }
  }
  syncPickupActors(pu.weapons, weaponMeshes, (w) => withShadow(buildWeaponPickupMesh3D(w.key), 0.9), (w) => w);
  for (const w of pu.weapons) {
    const mesh = weaponMeshes.get(w);
    if (mesh) { mesh.position.set(w.x, 0, w.y); mesh.rotation.y = world.time * 1.3; }
  }
  syncPickupActors(pu.health ? [pu.health] : [], healthMeshes, () => withShadow(buildHealthPickupMesh3D(), 0.9), (h) => h);
  if (pu.health) {
    const mesh = healthMeshes.get(pu.health);
    if (mesh) mesh.position.set(pu.health.x, 0, pu.health.y);
  }
  syncPickupActors(pu.armor ? [pu.armor] : [], armorMeshes, () => withShadow(buildArmorPickupMesh3D(), 0.9), (a) => a);
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
      const spot = placeTrafficLight(light, world.map);
      mesh.position.set(spot.x, 0, spot.y);
      mesh.rotation.y = -spot.angle;
      scene.add(mesh);
      trafficLightMeshes.set(light, mesh);
    }
    mesh.visible = Math.abs(light.x - player.x) < DRAW_DIST && Math.abs(light.y - player.y) < DRAW_DIST;
    if (mesh.visible) setTrafficLightPhase3D(mesh, getTrafficLightPhase(light));
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
    disposeObject(mesh);
    sparkMeshes.delete(p);
  }
  for (const p of world.particles) {
    if (p.kind !== 'splash' || splashMeshes.has(p)) continue;
    const mesh = buildSplashMesh3D();
    mesh.position.set(p.x, WATER_Y, p.y);
    scene.add(mesh);
    splashMeshes.set(p, mesh);
  }
  for (const [p, mesh] of splashMeshes) {
    if (world.time <= p.until) {
      updateSplashMesh3D(mesh, world.time - (p.until - SPLASH_LIFETIME));
      continue;
    }
    scene.remove(mesh);
    disposeObject(mesh);
    splashMeshes.delete(p);
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
    scene.remove(mesh);
    disposeObject(mesh);
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

  applyWeatherToScene3D(scene, renderer, world, dt, player.x, player.y, cam);

  if (player.character !== playerCharacter) {
    playerCharacter = player.character;
    scene.remove(playerMesh);
    const appearance = playerCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
    playerMesh = buildPersonActor(appearance.shirt, appearance.skin, appearance);
    scene.add(playerMesh);
  }

  playerMesh.visible = !player.inVehicle;
  if (!player.inVehicle) {
    playerMesh.position.set(player.x, player.z || 0, player.y);
    playerMesh.rotation.y = -player.angle;
    playerMesh.scale.y = player.crouching ? 0.6 : 1;
    playerMesh.userData.shadow.position.y = 0.02 - (player.z || 0) / playerMesh.scale.y;
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
      companionMesh = buildPersonActor(appearance.shirt, appearance.skin, appearance);
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

  // vehicles get a longer, higher orbit scaled to their length, so the car
  // doesn't fill the lower half of the screen
  const veh = player.inVehicle;
  const camScale = veh ? Math.min(3.2, Math.max(1.35, veh.model.len / 2.4)) : 1;
  const radius = orbitRadius * camScale;
  const eyeX = player.x, eyeY = veh ? 1.3 + (camScale - 1) * 0.55 : 1.3, eyeZ = player.y;
  const horizDist = Math.cos(followPitch) * radius;
  const orbitHeight = eyeY + Math.sin(followPitch) * radius;
  let desiredX = player.x - Math.cos(targetAngle) * horizDist;
  let desiredZ = player.y - Math.sin(targetAngle) * horizDist;
  let desiredY = orbitHeight;

  // recursive: true - each building is now a Group of several child meshes
  // (roof/window-band/steeple/...), not one flat Mesh, so a non-recursive
  // raycast against the Group itself would never hit anything
  const camTargets = nearbyCamTargets(player.x, player.y);
  function raycastFrom(ox, oy, oz, dx, dy, dz, dist) {
    camRayOrigin.set(ox, oy, oz);
    camRayDir.set(dx / dist, dy / dist, dz / dist);
    camRaycaster.set(camRayOrigin, camRayDir);
    camRaycaster.far = dist;
    camRaycaster.near = 0.05;
    const hits = camRaycaster.intersectObjects(camTargets, true);
    return hits.length ? hits[0].distance : null;
  }
  function raycastBuildingDist(dx, dy, dz, dist) {
    return raycastFrom(eyeX, eyeY, eyeZ, dx, dy, dz, dist);
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
    const steepHoriz = Math.cos(steepPitch) * radius;
    const steepHeight = eyeY + Math.sin(steepPitch) * radius;
    const altX = player.x - Math.cos(targetAngle) * steepHoriz;
    const altZ = player.y - Math.sin(targetAngle) * steepHoriz;
    const altDx = altX - eyeX, altDy = steepHeight - eyeY, altDz = altZ - eyeZ;
    const altFullDist = Math.hypot(altDx, altDy, altDz) || 1;
    const altHit = raycastBuildingDist(altDx, altDy, altDz, altFullDist);
    if (altHit === null || altHit > 2.2) {
      desiredX = altX; desiredY = steepHeight; desiredZ = altZ;
      if (altHit !== null) {
        const d = Math.max(1.6, altHit - CAM_CLEARANCE);
        const t = d / altFullDist;
        desiredX = eyeX + altDx * t;
        desiredY = eyeY + altDy * t;
        desiredZ = eyeZ + altDz * t;
      }
    } else {
      // even near-overhead is blocked (under an overhang/bridge) - fall
      // back to pulling in on the original ray, with a less punishing
      // minimum distance than before
      const d = Math.max(1.0, hitDist - CAM_CLEARANCE);
      const t = d / fullDist;
      desiredX = eyeX + dx * t;
      desiredY = eyeY + dy * t;
      desiredZ = eyeZ + dz * t;
    }
  }

  // The rays above only test the line from eye to camera, so a wall or roof
  // edge running alongside the camera still ends up inside the 0.5m near
  // plane and gets cut open (sky-coloured voids, see-through walls). Push
  // the camera away from anything closer than CAM_CLEARANCE on each axis.
  for (const [ax, ay, az] of CAM_PUSH_DIRS) {
    const hit = raycastFrom(desiredX, desiredY, desiredZ, ax, ay, az, CAM_CLEARANCE);
    if (hit === null) continue;
    const push = CAM_CLEARANCE - hit;
    desiredX -= ax * push;
    desiredY -= ay * push;
    desiredZ -= az * push;
  }
  desiredY = Math.max(desiredY, 0.6);

  const teleported = lastPx !== null && Math.hypot(player.x - lastPx, player.y - lastPy) > 15;
  const lerpT = teleported ? 1 : Math.min(1, dt * 6);
  if (!camBaseInit) { camBase.copy(cam.position); camBaseInit = true; }
  camBase.x += (desiredX - camBase.x) * lerpT;
  camBase.y += (desiredY - camBase.y) * lerpT;
  camBase.z += (desiredZ - camBase.z) * lerpT;
  lastPx = player.x; lastPy = player.y;
  cam.position.copy(camBase);
  const imp = world.lastImpact;
  const shakeAge = imp ? world.time - imp.time : Infinity;
  if (shakeAge >= 0 && shakeAge < CAM_SHAKE_TIME) {
    const amp = Math.min(1, imp.strength) * CAM_SHAKE_MAX * Math.exp(-shakeAge * 7);
    const t = world.time * 47;
    cam.position.x += Math.sin(t) * amp;
    cam.position.y += Math.sin(t * 1.31 + 1.7) * amp * 0.6;
    cam.position.z += Math.cos(t * 0.87 + 0.4) * amp;
  }
  cam.lookAt(player.x, veh ? eyeY * 0.85 : 1.3, player.y);

  updateSunAndSky(player);
  limitActorShadows(pedMeshes, player.x, player.y);
  limitActorShadows(vehicleMeshes, player.x, player.y);
  limitActorShadows(wildlifeMeshes, player.x, player.y);

  renderer.render(scene, cam);
}

// Shadow frustum centred a little ahead of the camera, snapped to whole
// shadow-map texels in light space so edges don't crawl as the player moves.
function updateSunAndSky(player) {
  const fx = player.x - cam.position.x, fz = player.y - cam.position.z;
  const fl = Math.hypot(fx, fz) || 1;
  _shadowCenter.set(player.x + (fx / fl) * SHADOW_HALF * 0.4, 0, player.y + (fz / fl) * SHADOW_HALF * 0.4);
  const texel = (SHADOW_HALF * 2) / SHADOW_MAP_SIZE;
  const r = Math.round(_shadowCenter.dot(_lightRight) / texel) * texel;
  const u = Math.round(_shadowCenter.dot(_lightUp) / texel) * texel;
  const d = _shadowCenter.dot(SUN_DIR);
  _shadowCenter.copy(_lightRight).multiplyScalar(r).addScaledVector(_lightUp, u).addScaledVector(SUN_DIR, d);
  sun.target.position.copy(_shadowCenter);
  sun.position.copy(_shadowCenter).addScaledVector(SUN_DIR, SUN_DIST);
  skyDome.position.copy(cam.position);
}

function withShadow(mesh, size) {
  addBlobShadow(mesh, size, size);
  return mesh;
}

function buildWildlifeActor(a) {
  if (a.kind === 'seagull') return buildSeagullMesh3D();
  const mesh = a.kind === 'sheep' ? buildSheepMesh3D() : buildCowMesh3D(a.bobSeed);
  addBlobShadow(mesh, a.kind === 'sheep' ? 0.9 : 1.3, a.kind === 'sheep' ? 0.6 : 0.75, 0.05);
  return mesh;
}

// Gentle swell: heave, roll and pitch from world.time plus a bow lift with
// speed. Needs rotation.order 'YXZ' (set in buildVehicleActor) so roll and
// pitch stay in the hull's own frame after the yaw.
function animateBoat(mesh, v, time) {
  const seed = (v.id || 0) * 1.7;
  const speedT = Math.min(1, Math.abs(v.speed) / (v.model.maxSpeed || 6));
  mesh.position.y = WATER_Y + Math.sin(time * 1.6 + seed) * 0.05;
  mesh.rotation.x = Math.sin(time * 1.1 + seed) * 0.045;
  mesh.rotation.z = Math.sin(time * 1.4 + seed * 0.7) * 0.025 + speedT * 0.06;
}

function syncBoatWakes(world) {
  for (const v of world.vehicles) {
    if (!v.isBoat) continue;
    const moving = !v.wrecked && Math.abs(v.speed) > 0.3 && vehicleMeshes.has(v.id);
    let wake = wakeMeshes.get(v.id);
    if (!moving) {
      if (wake) wake.visible = false;
      continue;
    }
    if (!wake) {
      wake = buildWakeMesh();
      scene.add(wake);
      wakeMeshes.set(v.id, wake);
    }
    const speed = Math.abs(v.speed);
    const hl = v.model.len / 2;
    wake.visible = true;
    wake.position.set(v.x - Math.cos(v.angle) * hl, WATER_Y + 0.03, v.y - Math.sin(v.angle) * hl);
    wake.rotation.y = -v.angle;
    wake.scale.set(3 + speed * 1.3, 1, v.model.wid * (1.2 + speed * 0.35));
    wake.material.opacity = Math.min(1, speed / 3) * 0.75;
  }
  for (const [id, wake] of wakeMeshes) {
    if (vehicleMeshes.has(id)) continue;
    scene.remove(wake);
    disposeObject(wake);
    wakeMeshes.delete(id);
  }
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

// Route ribbon: flat chevron strip on the road for the next stretch of the
// active route. Its polygonOffset sits above road markings (-8) and below
// blob shadows (-10) so cars and people still cast onto it.
const RIBBON_AHEAD_M = 80;
const RIBBON_HALF_W = 0.8;
const RIBBON_CHEVRON_M = 3;
const ROUTE_COLOR_3D = { user: 0xf0ede4, mission: 0xe8c93a };
let routeRibbonMesh = null;
let routeRibbonKey = '';
let waypointBeacon = null;

function buildChevronTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(32, 10);
  ctx.lineTo(58, 36);
  ctx.lineTo(58, 50);
  ctx.lineTo(32, 24);
  ctx.lineTo(6, 50);
  ctx.lineTo(6, 36);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

function buildRouteRibbonGeometry(pts, along0) {
  const n = pts.length;
  const pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), col = new Float32Array(n * 2 * 4);
  const idx = [];
  let dist = 0;
  const total = (() => { let t = 0; for (let i = 1; i < n; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; })();
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const nx = -dy * RIBBON_HALF_W, ny = dx * RIBBON_HALF_W;
    const alpha = Math.min(1, dist / 3, (total - dist) / 15 + 0.05);
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      const j = i * 2 + k;
      pos[j * 3] = pts[i][0] + nx * side;
      pos[j * 3 + 1] = 0;
      pos[j * 3 + 2] = pts[i][1] + ny * side;
      uv[j * 2] = k;
      uv[j * 2 + 1] = (along0 + dist) / RIBBON_CHEVRON_M;
      col[j * 4] = col[j * 4 + 1] = col[j * 4 + 2] = 1;
      col[j * 4 + 3] = alpha;
    }
    if (i < n - 1) {
      const q = i * 2;
      idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx);
  return g;
}

function buildWaypointBeacon3D() {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.45, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: ROUTE_COLOR_3D.user, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide })
  );
  beam.position.y = 20;
  group.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 2.1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: ROUTE_COLOR_3D.user, transparent: true, opacity: 0.8, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -36,
    })
  );
  ring.position.y = 0.045;
  ring.renderOrder = 1;
  group.add(ring);
  group.userData.ring = ring;
  return group;
}

function updateRouteRibbon3D(dt, world) {
  const wp = getUserWaypoint();
  if (wp) {
    if (!waypointBeacon) {
      waypointBeacon = buildWaypointBeacon3D();
      scene.add(waypointBeacon);
    }
    waypointBeacon.visible = true;
    waypointBeacon.position.set(wp.x, 0, wp.y);
    const pulse = 1 + Math.sin(performance.now() / 260) * 0.08;
    waypointBeacon.userData.ring.scale.set(pulse, 1, pulse);
  } else if (waypointBeacon) {
    waypointBeacon.visible = false;
  }

  const route = getActiveRoute();
  if (!routeRibbonMesh) {
    routeRibbonMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({
      map: buildChevronTexture(), vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -36,
    }));
    routeRibbonMesh.position.y = 0.045;
    routeRibbonMesh.renderOrder = 1;
    routeRibbonMesh.frustumCulled = false;
    scene.add(routeRibbonMesh);
  }
  const ahead = route && route.remaining > 10 ? getRouteAhead(RIBBON_AHEAD_M) : null;
  if (!ahead || ahead.length < 2) {
    routeRibbonMesh.visible = false;
    routeRibbonKey = '';
    return;
  }
  routeRibbonMesh.visible = true;
  const key = `${route.version}:${Math.round(route.px / 2)}:${Math.round(route.py / 2)}`;
  if (key !== routeRibbonKey) {
    routeRibbonKey = key;
    routeRibbonMesh.geometry.dispose();
    const p0 = route.pts[route.idx];
    routeRibbonMesh.geometry = buildRouteRibbonGeometry(ahead, route.cum[route.idx] + Math.hypot(route.px - p0[0], route.py - p0[1]));
    routeRibbonMesh.material.color.setHex(ROUTE_COLOR_3D[route.kind] || ROUTE_COLOR_3D.mission);
  }
  routeRibbonMesh.material.map.offset.y -= dt * 0.8;
}
