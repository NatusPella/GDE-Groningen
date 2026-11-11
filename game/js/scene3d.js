import { hoofdspeler } from './players.js';
import { RAY_CHUNK_TRIS, rayChunks, segmentHitsChunk } from './scene/raychunks.js';
import { setBlobHost, initBlobPool, addBlobShadow, zetBlobPool } from './scene/blobschaduw.js'; // #497: de blobschaduw-pool
import { FLAGS, perfOff } from './devflags.js';
import { sfxLinks } from './latehooks.js';
import { MODS } from './cheatmods.js';
import { setDualText } from './subtitles.js';
import { gridItems } from './spatialgrid.js';
import { terrainHoleRows } from './terraincache.js';
import { speakerHtml } from './speakers.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const _camHits = [];
const _camSphere = new THREE.Sphere();
const _camRay = new THREE.Ray();
const _camSphereHit = new THREE.Vector3();
const _camInv = new THREE.Matrix4();
const _segA = new THREE.Vector3();
const _segB = new THREE.Vector3();
import { buildBuildingMesh, setBuildingMap, setNightFactor } from './models3d_buildings.js';
import { updateDiscoLamp } from './discolight.js';
import { buildVehicleMesh, updateVehicleWheelSpin, applyFlatTire, setBusRearAngle, updatePoliceLamps, updateIndicatorLamps, syncPoliceMount, boatHullProfile, riderSeatFor, attachHelmet, releaseVehicleGeometries } from './models3d_vehicles.js';
import {
  buildVehicleImpactSparkMesh3D, updateVehicleImpactSparkMesh3D,
  vehicleNeedsFireEffect, vehicleSmokeOnly, buildVehicleFireMesh3D, updateVehicleFireMesh3D,
  vehicleJustWrecked, buildVehicleExplosionMesh3D, updateVehicleExplosionMesh3D,
  sampleBusTrail, busTrailerPose, buildSplashMesh3D, updateSplashMesh3D, SPLASH_LIFETIME,
  spawnVehicleOnRoad, spawnBoatOnWater, spawnPoliceBoatOnWater, TRAFFIC_MODELS,
} from './vehicle.js';
import { DEAD_DURATION } from './pedconst.js';
import { attachCarry, carryPose } from './streetlife3d.js';
import { buildPersonMesh, releasePersonGeometry, animatePersonWalk, applyAttackPose, applyHitReaction, setHeldWeapon, seatPose, seatedY, waveOverlay, juichOverlay, carryOverlay, TAMMO_APPEARANCE, ANITA_APPEARANCE } from './models3d_people.js';
import { syncDoorsNear, vraagVoorAnim } from './vehicledoors3d.js';
import { syncCabins } from './cabin3d.js';
import { syncAutoStuur } from './autointerieur.js';
import { syncVoertuigBediening } from './voertuigbediening.js';
import { syncHaltefiguren } from './haltefiguren3d.js';
import { seatedOf } from './occupants.js';
import { vehicleSeat, placeSeated, makeSeatTracker, trackSeat, drawTransition, syncBoatCrew } from './seating3d.js';
import { updateCarInterior } from './carinterior.js';
import { vehicleHeight } from './vaultkit.js';
// #497: de pure camera-meetkunde (volgcam buiten de wagen, prop- en boomray, ellipsoïde) staat in cammath.js.
import { camClearOfVehicle, rayCylinder, segHitsEllipsoid } from './cammath.js';
// De publieke naam blijft in scene3d.js staan voor bestaande lezers.
export { camClearOfVehicle };
import { updateSwimmers3D } from './swimmers3d.js';
import { neutralPose, applyPose } from './actoranim.js';
import { waggel, juichSterkte, juichHoek } from './vrijgezellen.js';
import { sprongStand, zwemStand, klimStand, aaienStand, fietsHouding } from './bewegingrules.js';
import { driveRagdoll, syncBikeRider } from './ragdoll.js';
import { applyWeatherToScene3D } from './weather.js';
import { quakeJitter } from './eventrules.js';
import { buildFlitspaalMesh3D } from './flitspaal.js';
import { getHorecaForRender, horecaBadges3D, horecaPads3D, updateHorecaPads3D } from './horeca.js';
import { buildWildlifeMesh3D, wildlifeShadowSize, animateWildlifeMesh3D } from './wildlife.js';
import { buildMissionMarker3D, updateMissionMarker3D, buildWaypointDotMesh3D } from './missionmarker3d.js';
import { syncTrafficLights3D, setTrafficLightGlow } from './trafficlights.js';
import { isRangedWeapon } from './weapons.js';
import { getCombatEffect } from './combateffect.js';
import { scopeEye } from './scopeaim.js';
import { alignPlayerFlash } from './gunfx3d.js';
import { sharedWaterMaterial, updateWaterMaterial, buildWaterGeometry, waterSwellAt, waterSwellAmp, auditWaterMeshes } from './water3d.js';
import { syncBoatWakes3D } from './boatwake3d.js';
import { seaExtra, golfWip } from './golven.js';
import { sleepingParkedCars } from './parkedcars.js';
import { syncParkedLayer } from './parked3d.js';
import { requestShore, updateShore } from './quaywalls.js';
import { getWaterIndex, waterIndexAt } from './waterindex.js';
import { setTreeMeshBuilder } from './treeprops.js';
import { propsNearInto } from './breakables.js';
import { buildTerrainMesh3D, terrainArrays, terrainGroup, createTerrainMaterial, applyWetGround, WET_UNIFORMS } from './terrain3d.js';
import { ReliefPatches } from './terrainrelief3d.js';
import { liftRoadGroup, buildingLift } from './terrainlift.js';
import { runGeo, geoWorkerActive, geoFrame } from './geojobs.js';
import { noteStreamFocus, streamAheadHere, streamRank, streamNear } from './streambudget.js';
import { applyCutMask, initCutMask, setCutMaskCenter } from './cutmask3d.js';
import { updatePortals } from './portalcut3d.js';
import { inPassage } from './passages.js';
import { buildRailDecks, disposeStructureGeometries } from './roadstructures3d.js';
import { snapShadowCenter, shadowPassSkipped, actorShadowReach } from './shadowsnap.js';
import { buildPoliceHeliMesh3D, updatePoliceHeliMesh3D } from './police.js';
import { updateSkyProps3D, buildBalloonWarmup } from './skyprops3d.js';
import { pointInPolygon, polygonBounds, WATER_Y, isInWater } from './util.js';
import { buildingAt } from './tileplace.js';
import { preloadLandmarkModels, onLandmarkModelLoaded } from './landmarkmodels.js';
import { onSettingsChange, getSettings, QUALITY_PRESETS } from './settings.js';
import { stepFov } from './gamefeel.js';
import { effectsFor, shakeAmount } from './a11ylogic.js';
import { reducedMotion } from './motion.js';
import { dynamicScale, cpuLevel } from './gfxprofile.js';
import { adaptedShadowLevel } from './shadowlevel.js';
import { treeSyncDue } from './treesync.js';
import { roadBuildAllowed, ROAD_BUILD_MAX_PER_FRAME } from './roadbudget.js';
import { VIEW_DISTANCES, viewDistanceFor, detailDistanceFor, DETAIL_BASE } from './viewdist.js';
import { compareOpaque } from './drawpool.js';
import { buildingBatcher, roadBatcher, facadeBatcher, shoreBatcher, drawHub } from './staticbatch3d.js';
import { simLevel } from './simload.js';
import { beginWheels, addVehicleWheels, endWheels } from './wheelinstances3d.js';

// ?nobatch: every building drawn on its own (A/B checks of the batching)
const NO_BATCH = FLAGS.nobatch;
const NO_WHEEL_INSTANCES = NO_BATCH;
const wheelFrustum = new THREE.Frustum(), wheelProj = new THREE.Matrix4();
import { getUiScale } from './uiscale.js';
import { hideWaymarkers3D } from './waymarkers3d.js';
import { setMarkerCamera, setMarkerEnv } from './worldmarker3d.js';
import { OUTLINE_MAT } from './pixelart3d.js';
import { createSkyUniforms, buildSkyDome, createEnvironmentUpdater, setStarOpacity, setStarShare, SKY_HORIZON } from './sky3d.js';
import { computeLighting } from './daynight.js';
import { createPostFX } from './postfx3d.js';
import { noteGfxEvent, watchContext } from './blackframe.js';
import { spawnExplosionFx, setFxCamera } from './fx3d.js';
import { litFraction, moonPhase, STAR_SHARE, foliageGlow } from './nightrules.js';
import { qualityLook } from './weatherlook.js';
import { buildCloudLayer, updateCloudLayer } from './cloud3d.js';
import { initNightLights, setNightLightQuality, updateNightLights, isLightRigOn, setLightRigVisible } from './nightlights3d.js';
import { createFarLOD } from './farlod.js';
import { SECTION, TILE_M, tileOrigin } from './gdt.js';
import { initRailway3D, updateRailway3D, prewarmRailAt } from './railway3d.js';
import { updateStationCrowd3D } from './stationlife3d.js';
import { updateEvenementen3D } from './evenementen3d.js';
import { updateWerf3D } from './werf3d.js';
import { today as calendarTodayEv } from './calendarday.js';
import { railZ } from './railway.js';
import { cameraFocus } from './tilefocus.js';
import { initMovableBridges3D, syncMovableBridges3D, updateMovableBridges3D, openBridgeRoads } from './movablebridges3d.js';
import { getMovableBridges } from './movablebridges.js';
import { chamberLiftAt } from './sluizen.js';
import { surfaceLift, surfaceLiftAt } from './waterlevels.js';
import { updateSluizen3D } from './sluizen3d.js';
import { initStreetFurniture3D, updateStreetFurniture3D } from './streetfurniture3d.js';
import { treeDims, treeColor, SPECIES, TREE_FLAG } from './greenery.js';
import { buildCanopies, streamCanopies } from './canopies3d.js';
import { buildPerrons3D } from './perrons3d.js';
import { initGrass, updateGrass, grassFarColor, grassFarRank } from './grass.js';
import { updateCountryside, setCountryPropLevel } from './countryside.js';
import { updateOmmelandLandmarks } from './ommelandlandmarks.js';
import { setCountryNight, setCountryFacadeLevel } from './countrybuilding.js';
import { edgeDistance, setCountryBounds } from './countryfield.js';
import { countryRayHit } from './countrycam.js';
import { probe } from './hitchprobe.js';
import { speakBubble } from './linevoice.js';
import { applyDrunkCamera } from './drunk.js';
import { GROUND_LAYER, SIDEWALK_EXTRA, PAVED_MATS, buildRoadGroup, setRoadNetwork, getRoadQualityVersion, roadFarColor, roadGeometryReady } from './roadsurface.js';
// route-ribbon, waypoint-beacon en setRouteLinks: eigen module onder scene3d/ (#502)
import { updateRouteRibbon3D, hideRouteRibbon3D, setRouteRibbonScene } from './scene3d/routeribbon3d.js';
import { lookBackActive, chaseFollowLerp } from './controls.js';
// de vaste cameraregels (verhouding, verticale kijkhoek, volgplek, harde snee):
// los van three.js zodat scripts/camera_mobiel_test.mjs ze per scherm narekent (#463)
import { cameraAspect, cameraVerticalFov, followCameraPose, cameraSnapNeeded, pitchForMouse, DEFAULT_PITCH } from './cameraplan.js';
import { gameBusy } from './busy.js';

// A genuine WebGL 3D view of the exact same world state the 2D canvas game
// draws - same x/y meters, same b.h building heights, same vehicle/pedestrian
// arrays. Nothing about gameplay/physics/collision changes here; this module
// only ever READS world and mirrors it into a Three.js scene with a
// Classic third-person follow camera. World mapping: three.x = world.x,
// three.z = world.y, three.y = up (meters, roughly 3m per building level).

// De wateren die getekend worden: uit het waterraster (niet uit de hele array, #524),
// zonder de tweeling die een meer twee keer mapt (#231; tileworld.js fromTiles zet die
// in map.duplicateWater: het gestreamde pad laat hem helemaal weg).
// Alle kaartvragen (waterNear, waterIndexAt, varen) houden beide rijen: alleen het tekenen slaat de
// dubbel gemapte over, anders wordt hetzelfde water twee keer over elkaar getekend (donkerder en rommelig).
// The same list determines the terrain holes and the fingerprint of the baked
// ground (terraincache.js), so it comes from one function.
const waterRows = terrainHoleRows;
const waterNearDrawn = (map, x, y, r) => {
  const list = map.waterNear(x, y, r);
  return map.duplicateWater ? list.filter((w) => !map.duplicateWater.has(w)) : list;
};

// The night-light pool keeps a fixed number of point/spot lights in every lit
// shader. A light that is dark (daytime) or out of range contributes exactly
// zero, so its BRDF evaluation is skipped per fragment instead of summed.
(() => {
  const call = '\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const parts = THREE.ShaderChunk.lights_fragment_begin.split(call);
  if (parts.length !== 4) return; // point, spot, directional
  THREE.ShaderChunk.lights_fragment_begin = parts[0] + '\t\tif ( directLight.visible )\n' + call
    + parts[1] + '\t\tif ( directLight.visible )\n' + call + parts[2] + call + parts[3];
})();

const LEVEL_HEIGHT = 3.1;
let DRAW_DIST = DETAIL_BASE; // the high-detail radius (viewdist.js detailDistanceFor)
// Canals/Diepenring sit visibly below street level (a real quay is a step
// down, not flush with the road) - also keeps water from ever competing
// with the ground/road planes for the same depth-buffer range. Was -0.35,
// only 5cm below the terrain's own -0.4 base (and well within the terrain
// shader's own bump displacement range) - nowhere near enough of a drop to
// read as "the canal sits below street level" from a close-up 3rd person
// camera; pushed meaningfully lower instead (WATER_Y in util.js).
const TREE_DIST = 130;
let viewDist = VIEW_DISTANCES.normaal;
let farLod = null;
const landmarkBuildings = [];
let landmarkDirty = false; // (#314 C1) een tegel met een landmark ging weg: de lijst opschonen
// Per quality level: shadow map size and frustum half-width (m).
const SHADOW_LEVELS = {
  laag: { size: 1024, half: 40, radius: 1.5, normalBias: 0.05 },
  middel: { size: 2048, half: 36, radius: 1.5, normalBias: 0.03 },
  hoog: { size: 4096, half: 32, radius: 1.2, normalBias: 0.02 },
  // #658: de zuinige 'hoog'-variant voor een machine die zich terugschroeft
  hoog2048: { size: 2048, half: 32, radius: 1.2, normalBias: 0.02 },
};

let renderer = null, scene = null, cam = null, canvas3 = null;
let shadowBaseLevel = 'hoog'; // #658: kwaliteitsniveau uit de instellingen
// #792: de adaptieve trap mocht de schaduwmap heen en weer laten flippen: elke opstap
// 2048 -> 4096 is een nieuwe kaart van 67 MB plus een volle schaduwpas (hitch). Neerschakelen
// (een kleinere kaart) gaat meteen; opstappen pas als de machine een lange tijd goed beeld
// houdt. Zo kost een korte terugval hooguit één neerschakeling, geen op-en-neer.
const SHADOW_UPGRADE_MS = 120000;
let shadowMapLevel = null; // laatst toegepaste niveau
let shadowUpgradeAt = 0; // performance.now() waarop voor het eerst een grotere kaart gevraagd werd
let shadowUpgradeTimer = 0;
let terrainMesh = null;
// ?terrain (#269): the map (what stands flat is lifted by the relief under it) and the patches of ground that rise above the flat ground
let liftMap = null, reliefPatches = null;
let terrainPending = null;
// #749: sterft of hangt de geometry-worker, dan wacht de boot (main.js: await terrainReady)
// anders eeuwig op het terrein. Na deze tijd bouwt de hoofdthread de terugval zelf.
const TERRAIN_READY_DEADLINE_MS = 20000;
// resolves once the terrain is in the scene (built in the geometry worker)
export function terrainReady() {
  return terrainPending || Promise.resolve();
}
let followYaw = 0;
// orbit radius kept constant so pitch changes swing the camera around the
// player like a classic open-world camera (higher/steeper looking down, lower/flatter
// looking up) instead of just sliding the camera height up and down in place
const ORBIT_RADIUS = Math.hypot(2.6, 2.6);
// muis bovenin het scherm geeft een lage, bijna level stand, onderin een steile;
// zonder muis geldt DEFAULT_PITCH (cameraplan.js, #463)
// mouse-look goes lower still: below LOOK_UP_FROM_DEG the camera sinks to
// the ground and the view tilts up towards the rooftops and the sky
const PITCH_LOOK_MIN_DEG = -16;
const PITCH_LOOK_MAX_DEG = 60;
const LOOK_UP_FROM_DEG = 10;
const LOOK_UP_LIFT = 1.7;
let followPitch = DEFAULT_PITCH;
let lookPitchTarget = followPitch;
let lookYaw = 0;
let lookYawIdle = 0;
const MOUSE_LOOK_PER_PX = 0.0025;
const LOOK_RECENTER_DELAY = 1.7;
// at speed an orbited view holds much longer before swinging back behind
const LOOK_RECENTER_DELAY_FAST = 4.5;
const LOOK_FAST_SPEED = 25; // m/s
let camWasInVehicle = false;
let lookBackWas = false;

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
// Buildings drawn by someone else for a while (home.js: the flat's tower as a
// cutaway): no mesh shown, not in the camera's collision set.
const hiddenBuildings = new Set();
export function setBuildingHidden(b, hidden) {
  if (hidden) hiddenBuildings.add(b); else hiddenBuildings.delete(b);
  const mesh = buildingMeshes.get(b);
  if (mesh) mesh.visible = !hidden;
}
const roadMeshes = new Map();
const waterMeshes = new Map();
const vehicleFireMeshes = new Map();
let impactSparkEffects = [];
let vehicleExplosionEffects = [];
const vehicleMeshes = new Map();
export const getVehicleMesh = (id) => vehicleMeshes.get(id); // voor coopzitten3d.js: de extra spelers zitten in het model van de gastheer (#434)
const doorAsk = new Map(); // voertuig -> deurvraag uit de in-/uitstapanimatie (vehicledoors3d.js)
const pedMeshes = new Map();
const wildlifeMeshes = new Map();
const speechBubbleEls = new Map();
let billboardRoot = null;
let flitspaalBuilt = false;
let horecaBuilt = false;
let horecaPads = null, horecaBadges = null;
const staticProps = [];
let policeHeliMesh = null;
let playerMesh = null;
let playerCharacter = 'tammo';
let companionMesh = null;
let companionCharacter = null;
const playerSeatTr = makeSeatTracker();
const companionSeatTr = makeSeatTracker();
let playerRider = null;
let playerRiderChar = null;
let missionMarkerMesh = null;
const splashMeshes = new Map();
const missionWaypointDotMeshes = new Map();
let missionWaypointSetKey = null;
const bulletMeshes = new Map();
const sparkMeshes = new Map();
const kissMeshes = new Map();
// Kiss heart: a camera-facing sprite from a canvas heart (bezier outline,
// glossy gradient, white rim), so it reads as a heart from every angle.
let kissHeartTex = null;
// Over een hek of hindernis: de sprongstand uit bewegingrules.js (#207) op de botten van de speler.
// Eén pose die elk beeld wordt hergebruikt: de standen schrijven er direct in (geen nieuwe objecten per beeld).
const bewegPose = neutralPose();
const rijderHouding = { lean: 0, armZ: 0, armX: 0 };
function vaultPose(mesh, u, climb, t) {
  if (climb) klimStand(t, bewegPose); else sprongStand(u, bewegPose);
  applyPose(mesh.userData, bewegPose);
}

function kissHeartTexture() {
  if (kissHeartTex) return kissHeartTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const heart = () => {
    g.beginPath();
    g.moveTo(64, 112);
    g.bezierCurveTo(36, 92, 10, 70, 10, 44);
    g.bezierCurveTo(10, 24, 25, 12, 41, 12);
    g.bezierCurveTo(52, 12, 60, 18, 64, 28);
    g.bezierCurveTo(68, 18, 76, 12, 87, 12);
    g.bezierCurveTo(103, 12, 118, 24, 118, 44);
    g.bezierCurveTo(118, 70, 92, 92, 64, 112);
    g.closePath();
  };
  g.shadowColor = 'rgba(0, 0, 0, 0.45)';
  g.shadowBlur = 6;
  heart();
  g.lineWidth = 10;
  g.strokeStyle = '#fff4f7';
  g.lineJoin = 'round';
  g.stroke();
  g.shadowColor = 'transparent';
  const grad = g.createLinearGradient(20, 12, 100, 112);
  grad.addColorStop(0, '#ff7aa8');
  grad.addColorStop(0.55, '#f02d63');
  grad.addColorStop(1, '#b3123f');
  heart();
  g.fillStyle = grad;
  g.fill();
  g.beginPath();
  g.ellipse(40, 38, 13, 8, -0.6, 0, Math.PI * 2);
  g.fillStyle = 'rgba(255, 255, 255, 0.7)';
  g.fill();
  kissHeartTex = new THREE.CanvasTexture(c);
  kissHeartTex.colorSpace = THREE.SRGBColorSpace;
  return kissHeartTex;
}
function buildKissHeartMesh() {
  const mat = new THREE.SpriteMaterial({ map: kissHeartTexture(), transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(mat);
  sprite.geometry.userData.shared = true;
  sprite.renderOrder = 5;
  return sprite;
}
let sun = null;
let hemi = null;
let skyDome = null;
let cloudLayer = null;
let starShare = 1;
let skyUniforms = null;
let envUpdater = null;
let postfx = null;
let bedMaterial = null;
// Direction towards the sun (or moon at night); driven by daynight.js.
const sunDir = new THREE.Vector3(120, 110, 70).normalize();
const SUN_DIST = 160;
let shadowHalf = SHADOW_LEVELS.hoog.half;
const _yAxis = new THREE.Vector3(0, 1, 0);
const _lightRight = new THREE.Vector3();
const _lightUp = new THREE.Vector3();
const _shadowCenter = new THREE.Vector3();
const camRaycaster = new THREE.Raycaster();
const camRayOrigin = new THREE.Vector3();
const camRayDir = new THREE.Vector3();
const CAM_CLEARANCE = 0.9; // must stay above the camera's 0.5m near plane
const CAM_PUSH_DIRS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]];
// follow-cam pull-in when a wall blocks the orbit (see updateCamera)
const CAM_MIN_DIST = 1.3;
const CAM_PULL_OUT_RATE = 3.2; // 1/s: easing back out takes ~0.5 s
const CAM_PULL_LIFT = 0.7; // m of extra height when fully pulled in
let camPull = 1;
let camPullReset = true;
const CAM_TARGET_RADIUS = ORBIT_RADIUS * 5 + CAM_CLEARANCE + 2;
const camTargetList = [];
let lastPx = null, lastPy = null;
const camBase = new THREE.Vector3();
let camBaseInit = false;
// jachtgeweer scope (world.scoped, combat.js): 0 = normal camera, 1 = through the scope
let scopeBlend = 0;
const CAM_SHAKE_TIME = 0.6;
const DRIVER_FIGURE_DIST = 70;
const CAM_SHAKE_MAX = 0.28;

// Solid street props the follow camera pulls in for (breakables grid; tree
// trunks come from the map). Thin poles are left out: a pull-in for every
// lamp post would make the camera pump along a street.
const CAM_PROP_KINDS = new Set(['abri', 'kiosk', 'zuil', 'stall', 'flitspaal', 'elecbox']);
const CAM_PROP_PAD = 0.6;
const _camProps = [];


function propRayHit(map, ox, oy, oz, dx, dy, dz, len) {
  const ux = dx / len, uy = dy / len, uz = dz / len;
  const mx = ox + dx * 0.5, mz = oz + dz * 0.5, reach = len * 0.5 + 2;
  let best = Infinity;
  for (const t of map.treesNear(mx, mz, reach)) {
    if (t._broken) continue;
    const d = treeDims(t);
    best = Math.min(best, rayCylinder(ox, oy, oz, ux, uy, uz, len, t[0], t[1], d.tr + CAM_PROP_PAD, 0, d.trunkH));
  }
  for (const p of propsNearInto(mx, mz, reach, _camProps)) {
    if (!CAM_PROP_KINDS.has(p.kind)) continue;
    const r = p.r + CAM_PROP_PAD, yb = p.z || 0, yt = yb + p.h;
    best = Math.min(best, rayCylinder(ox, oy, oz, ux, uy, uz, len, p.x, p.y, r, yb, yt));
    if (p.hx || p.hy) {
      best = Math.min(best, rayCylinder(ox, oy, oz, ux, uy, uz, len, p.x + p.hx, p.y + p.hy, r, yb, yt));
      best = Math.min(best, rayCylinder(ox, oy, oz, ux, uy, uz, len, p.x - p.hx, p.y - p.hy, r, yb, yt));
    }
  }
  best = Math.min(best, countryRayHit(ox, oy, oz, ux, uy, uz, len));
  return best === Infinity ? null : best;
}


// Tree crowns can't be pulled in for (a street of trees would make the
// camera pump in and out), so a crown the camera is inside of, or that hides
// the player, is left out of the instanced trees for as long as it's in the way.
const _camHideNext = [];
function updateCamTreeHiding(map, ex, ey, ez, cx, cy, cz) {
  _camHideNext.length = 0;
  const dx = ex - cx, dy = ey - cy, dz = ez - cz;
  const len = Math.hypot(dx, dz);
  for (const t of map.treesNear(cx + dx * 0.5, cz + dz * 0.5, len * 0.5 + 4)) {
    if (t._broken) continue;
    const d = treeDims(t);
    const crownY = d.cy;
    const pad = CAM_PROP_PAD;
    // camera inside (near plane padded), or the crown between camera and eye
    const hit = segHitsEllipsoid(cx, cy, cz, 0, 0, 0, t[0], crownY, t[1], d.r + pad, d.ry + pad)
      || segHitsEllipsoid(cx, cy, cz, 0, 0, 0, t[0] + d.lx, d.ly, t[1] + d.lz, d.lr + pad, d.lr * 0.85 + pad)
      || segHitsEllipsoid(cx, cy, cz, dx, dy, dz, t[0], crownY, t[1], d.r, d.ry)
      || segHitsEllipsoid(cx, cy, cz, dx, dy, dz, t[0] + d.lx, d.ly, t[1] + d.lz, d.lr, d.lr * 0.85);
    if (hit) _camHideNext.push(t);
  }
  let same = _camHideNext.length === camTreeHidden.length;
  for (let i = 0; same && i < _camHideNext.length; i++) same = camTreeHidden.includes(_camHideNext[i]);
  if (same) return;
  camTreeHidden.length = 0;
  for (const t of _camHideNext) camTreeHidden.push(t);
  camTreeHiddenKey = camTreeHidden.map((t) => t[0] + ',' + t[1]).join(';');
}

const _noTargets = [];
// objects another module wants the camera kept out of (parkeergarage.js: the entrance building and the hall): fn(px, py, out) pushes them
const camTargetSources = [];
export function addCamTargetSource(fn) { camTargetSources.push(fn); }
function nearbyCamTargets(px, py) {
  camTargetList.length = 0;
  for (const [b, mesh] of buildingMeshes) {
    if (hiddenBuildings.has(b)) continue;
    const [minx, miny, maxx, maxy] = b.bounds;
    if (px < minx - CAM_TARGET_RADIUS || px > maxx + CAM_TARGET_RADIUS) continue;
    if (py < miny - CAM_TARGET_RADIUS || py > maxy + CAM_TARGET_RADIUS) continue;
    camTargetList.push(mesh);
  }
  // viaduct decks, cutting walls and tunnel roofs of the ring (roadstructures3d)
  for (const r of roadMeshes.keys()) {
    const g = r._geoStruct;
    if (!g || !g.parent) continue;
    const [minx, miny, maxx, maxy] = r.bounds;
    if (px < minx - CAM_TARGET_RADIUS || px > maxx + CAM_TARGET_RADIUS) continue;
    if (py < miny - CAM_TARGET_RADIUS || py > maxy + CAM_TARGET_RADIUS) continue;
    camTargetList.push(g);
  }
  for (let i = 0; i < camTargetSources.length; i++) camTargetSources[i](px, py, camTargetList);
  return camTargetList;
}

// Exact equivalent of camRaycaster.intersectObjects(targets, true)[0].distance
// that only hands three.js the triangle runs whose (lazily cached, local)
// bounding box the ray segment actually crosses, instead of every triangle of
// every building part whose bounding sphere it touches.
function camRaycastMesh(m, rc) {
  const g = m.geometry;
  if (m.material === undefined) return;
  if (m.isInstancedMesh || m.isSkinnedMesh || g.morphAttributes.position) { m.raycast(rc, _camHits); return; }
  // three.js's own bounding-sphere rejection, done once instead of per chunk
  if (g.boundingSphere === null) g.computeBoundingSphere();
  _camSphere.copy(g.boundingSphere).applyMatrix4(m.matrixWorld);
  _camRay.copy(rc.ray).recast(rc.near);
  if (_camSphere.containsPoint(_camRay.origin) === false) {
    if (_camRay.intersectSphere(_camSphere, _camSphereHit) === null) return;
    if (_camRay.origin.distanceToSquared(_camSphereHit) > (rc.far - rc.near) ** 2) return;
  }
  const c = rayChunks(g);
  if (c.n < 3) { m.raycast(rc, _camHits); return; }
  _camInv.copy(m.matrixWorld).invert();
  _segA.copy(rc.ray.origin).addScaledVector(rc.ray.direction, rc.near).applyMatrix4(_camInv);
  _segB.copy(rc.ray.origin).addScaledVector(rc.ray.direction, rc.far).applyMatrix4(_camInv);
  const dr = g.drawRange, start = dr.start, count = dr.count;
  try {
    for (let k = 0; k < c.n; k++) {
      if (!segmentHitsChunk(c.boxes, k * 6, _segA.x, _segA.y, _segA.z, _segB.x, _segB.y, _segB.z)) continue;
      const lo = Math.max(k * RAY_CHUNK_TRIS * 3, start);
      const hi = Math.min(Math.min(c.triCount, (k + 1) * RAY_CHUNK_TRIS) * 3, start + count);
      if (hi <= lo) continue;
      dr.start = lo;
      dr.count = hi - lo;
      m.raycast(rc, _camHits);
    }
  } finally {
    dr.start = start;
    dr.count = count;
  }
}

function camRaycastObject(o, rc) {
  if (o.layers.test(rc.layers)) {
    if (o.isMesh) camRaycastMesh(o, rc);
    else o.raycast(rc, _camHits);
  }
  const ch = o.children;
  for (let i = 0; i < ch.length; i++) camRaycastObject(ch[i], rc);
}

function camNearestHit(targets) {
  _camHits.length = 0;
  for (let i = 0; i < targets.length; i++) camRaycastObject(targets[i], camRaycaster);
  let best = null;
  for (let i = 0; i < _camHits.length; i++) if (best === null || _camHits[i].distance < best) best = _camHits[i].distance;
  return best;
}

// Materials reused across many actors - disposing one would force every
// remaining user to re-upload/recompile it on the next frame.
const SHARED_MATERIALS = new Set([OUTLINE_MAT]);
const SHARED_GEOMETRIES = new Set();

// Flat-pack boxes strapped to a car's roof (v.roofBoxes, the story's EIKEA trip).
const ROOF_BOX_MAT = new THREE.MeshLambertMaterial({ color: 0xb98d5a });
ROOF_BOX_MAT.userData.shared = true;
const ROOF_STRAP_MAT = new THREE.MeshLambertMaterial({ color: 0x1d4fa3 });
ROOF_STRAP_MAT.userData.shared = true;
function setRoofBoxes(mesh, v) {
  const ud = mesh.userData;
  if (ud.roofLoad) { ud.roofLoad.parent.remove(ud.roofLoad); disposeObject(ud.roofLoad); ud.roofLoad = null; }
  const n = Math.max(0, Math.min(3, v.roofBoxes || 0));
  ud.roofN = n;
  if (!n) return;
  const box = new THREE.Box3().setFromObject(mesh);
  const top = box.max.y - mesh.position.y;
  const g = new THREE.Group();
  const len = Math.min(2.2, (v.model && v.model.len ? v.model.len : 4) * 0.5);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len - i * 0.25, 0.22, 1.1 - i * 0.12), ROOF_BOX_MAT);
    b.position.set(-0.15 + i * 0.05, top + 0.11 + i * 0.22, 0);
    g.add(b);
  }
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, n * 0.22 + 0.03, 1.16), ROOF_STRAP_MAT);
  strap.position.set(-0.15, top + n * 0.11, 0);
  g.add(strap);
  (ud.body || mesh).add(g);
  ud.roofLoad = g;
}

// Actors/effects build their own geometries per instance, so on despawn both
// geometry and material must be freed or GPU memory grows all session.
// #788: a person mesh hands back its shared body geometry here too, also when it
// leaves via another route than disposePedMesh (player, companion, driver, actor).
export function disposeObject(root) {
  // #787: een geëvicteerde voertuiggeometrie gaat pas weg bij de laatste mesh die hem tekent;
  // dit voertuig geeft de gedeelde geometrieën terug die het bij het bouwen heeft geteld.
  releaseVehicleGeometries(root);
  root.traverse((o) => {
    const g = o.geometry;
    if (g) {
      if (g.userData && typeof g.userData.personRefs === 'number') releasePersonGeometry(o);
      else if (!SHARED_GEOMETRIES.has(g) && !(g.userData && g.userData.shared)) g.dispose();
    }
    // the bone texture three.js makes for a skinned mesh on its first draw
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) if (!SHARED_MATERIALS.has(m) && !(m.userData && m.userData.shared)) m.dispose();
  });
}

// #497: de blobschaduw-pool woont in scene/blobschaduw.js; hier krijgt hij de scène en de THREE-kant.
setBlobHost({
  THREE,
  get scene() { return scene; }, // scene bestaat pas na init3D; de getter houdt de host actueel
  addShared: (g, m) => { SHARED_GEOMETRIES.add(g); SHARED_MATERIALS.add(m); },
  maakCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
});

function buildVehicleActor(v) {
  const mesh = buildVehicleMesh(v);
  mesh.userData.wreckModel = !!v.wrecked;
  const { len, wid } = v.model;
  if (v.isBoat) {
    mesh.rotation.order = 'YXZ';
  } else if (v.isBus && mesh.userData.busSections) {
    const sec = mesh.userData.busSections;
    addBlobShadow(mesh, sec.frontLen * 1.08, wid * 1.3, sec.frontX);
    addBlobShadow(mesh.userData.busRear, sec.rearLen * 1.08, wid * 1.3, sec.rearX);
  } else if (v.isBike || v.isScooter) {
    addBlobShadow(mesh, len * 1.1, 0.6);
  } else {
    addBlobShadow(mesh, len * 1.12, wid * 1.3);
  }
  // seated NPC driver, shown only while AI traffic drives this vehicle;
  // built by ensureDriverFigure() before the car gets within DRIVER_FIGURE_DIST
  mesh.userData.needsDriver = !v.isBoat && !v.isBike && !v.isScooter && !v.wrecked;
  return mesh;
}

// Traffic spawns 70+ m out, so a new car's mesh can wait a frame or two:
// beyond VEH_NEAR only one is built per frame once VEH_BUILD_MS is spent.
const VEH_BUILD_MS = 3;
const VEH_NEAR = 45;
const _vehSeen = new Set();
function syncVehicleMeshes(world, player) {
  _vehSeen.clear();
  const deadline = performance.now() + VEH_BUILD_MS;
  let built = 0;
  for (const v of world.vehicles) {
    const d = Math.hypot(v.x - player.x, v.y - player.y);
    if (d >= DRAW_DIST) continue;
    if (!vehicleMeshes.has(v.id)) {
      if (built > 0 && d > VEH_NEAR && performance.now() > deadline) continue;
      const mesh = enableShadows(buildVehicleActor(v), false);
      scene.add(mesh);
      vehicleMeshes.set(v.id, mesh);
      built++;
    }
    _vehSeen.add(v.id);
  }
  for (const [id, mesh] of vehicleMeshes) {
    if (_vehSeen.has(id)) continue;
    detachPlayerRider(mesh);
    scene.remove(mesh);
    disposeObject(mesh);
    vehicleMeshes.delete(id);
  }
}

// A driver figure is a full person mesh (several ms to build), so it is
// prepared a little ahead - one per frame - while the car is still beyond
// the distance at which it can be shown.
const DRIVER_PREFETCH_DIST = DRIVER_FIGURE_DIST + 30;
const DRIVER_BUILD_BUDGET_MS = 2;
const crewCtx = {
  dist: 0, deadline: 0, time: 0, playerBoat: null, playerOnWater: false, speakers: null,
  prep(p, mesh) {
    const casters = mesh.userData.shadowCasters;
    const castNear = mesh.userData.castNear;
    for (const o of enableShadows(p, false).userData.shadowCasters) {
      if (castNear !== undefined) o.castShadow = castNear;
      if (casters) casters.push(o);
    }
  },
};

// Parked, abandoned and bailed-out cars are empty. Must be a real boolean:
// an undefined .visible does not hide an Object3D.
function hasAiDriver(v) {
  if (v.wrecked || v.driver === 'player' || v.castDriver || v.driverOut) return false;
  if (v.parked) return seatedOf(v).driver === 'waiting'; // iemand wacht in zijn geparkeerde auto (occupants.js)
  if (v.driver) return true;
  if (v.isPolice) return !v.hijacked && !v.disabled && !v._roadblock;
  return !!(v.road || v.racer || v.countryDrive);
}

function ensureDriverFigure(mesh, v, dist, deadline) {
  if (!mesh.userData.needsDriver) return;
  if (dist >= DRIVER_FIGURE_DIST && (dist >= DRIVER_PREFETCH_DIST || performance.now() > deadline)) return;
  mesh.userData.needsDriver = false;
  const seed = (v.id || 0) * 5.3 + 11;
  const driver = buildPersonMesh(v.isPolice ? 0x1f3f8f : 0x5a6470, 0xd9aa82, { seed });
  const seat = vehicleSeat(v, true);
  seatPose(driver, seat.pose);
  driver.position.set(seat.x, seatedY(driver, seat.y), seat.z);
  driver.visible = false;
  // on the body, so the driver sways with its springs
  (mesh.userData.body || mesh).add(driver);
  mesh.userData.driverFigure = driver;
  const casters = mesh.userData.shadowCasters;
  const castNear = mesh.userData.castNear;
  for (const o of enableShadows(driver, false).userData.shadowCasters) {
    if (castNear !== undefined) o.castShadow = castNear;
    if (casters) casters.push(o);
  }
}

// The front passenger (occupants.js): same recipe as the driver, one seat over.
function ensurePassengerFigure(mesh, v, dist, deadline) {
  const ud = mesh.userData;
  if (ud.passengerChecked || !ud.driverFigure) return;
  if (dist >= DRIVER_FIGURE_DIST && (dist >= DRIVER_PREFETCH_DIST || performance.now() > deadline)) return;
  ud.passengerChecked = true;
  const front = seatedOf(v).passengers.find((p) => p.slot === 'front');
  if (!front) return;
  const person = buildPersonMesh(0x7a6a8a, 0xd9aa82, { seed: (v.id || 0) * 7.1 + 3 });
  const seat = vehicleSeat(v, false);
  seatPose(person, seat.pose);
  person.position.set(seat.x, seatedY(person, seat.y), seat.z);
  person.visible = false;
  (ud.body || mesh).add(person);
  ud.passengerFigure = person;
  const casters = ud.shadowCasters;
  const castNear = ud.castNear;
  for (const o of enableShadows(person, false).userData.shadowCasters) {
    if (castNear !== undefined) o.castShadow = castNear;
    if (casters) casters.push(o);
  }
}

// On a bike or step the player is drawn as a rider figure in their own look
// (Tammo or Tessa) inside the bike mesh - the bike's built-in NPC rider is
// hidden - so pedal IK and the bike's lean apply as for any cyclist.
// #798: de playerRider is een herbruikbaar personage (zie syncPlayerRider). Hangt hij aan een
// voertuigmesh die opgeruimd wordt, haal hem er dan eerst af: anders geeft disposeObject zijn gedeelde
// rompgeometrie en skelet terug terwijl syncPlayerRider hem daarna op de nieuwe mesh hergebruikt.
function detachPlayerRider(mesh) {
  if (playerRider && mesh && playerRider.parent === mesh) mesh.remove(playerRider);
}
function syncPlayerRider(pv, pvMesh, hide) {  const want = pv && (pv.isBike || pv.isScooter) && pv._mount !== 'horse' && pvMesh && !pv.riderOff && !pv.sinking;
  if (!want) {
    if (playerRider && playerRider.parent) playerRider.parent.remove(playerRider);
    return;
  }
  if (!playerRider || playerRiderChar !== playerCharacter) {
    if (playerRider) {
      if (playerRider.parent) playerRider.parent.remove(playerRider);
      disposeObject(playerRider); // #788: de oude look geeft zijn gedeelde rompgeometrie terug
    }
    const app = playerCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
    playerRider = enableShadows(buildPersonMesh(app.shirt, app.skin, app), false);
    playerRiderChar = playerCharacter;
  }
  const ud = playerRider.userData;
  if (playerRider.parent !== pvMesh) pvMesh.add(playerRider);
  const seat = pv.isScooter ? riderSeatFor(pv.model) : null;
  if (seat) {
    playerRider.position.set(seat.x, seat.y - 0.93 * playerRider.scale.y, 0);
    playerRider.rotation.set(0, 0, seat.lean);
    ud.armL.rotation.set(0, 0, seat.arm);
    ud.armR.rotation.set(0, 0, seat.arm);
    ud.legL.rotation.set(0, 0, seat.leg);
    ud.legR.rotation.set(0, 0, seat.leg);
    if (pv.model.motorbike || pv.model.geared) {
      if (!ud.helmet) attachHelmet(playerRider, pv.model.motorbike === 'sport' ? 0xe8e6e0 : pv.model.geared ? 0xd8c8a0 : 0x1c1c1e);
    } else if (ud.helmet) { ud.head.remove(ud.helmet); ud.helmet = null; }
  } else if (pv.isScooter) {
    if (ud.helmet) { ud.head.remove(ud.helmet); ud.helmet = null; }
    playerRider.position.set(-0.08, 0.155, 0);
    playerRider.rotation.set(0, 0, -0.03);
    ud.armL.rotation.set(0, 0, 0.66);
    ud.armR.rotation.set(0, 0, 0.66);
    ud.legL.rotation.set(0, 0, 0.12);
    ud.legR.rotation.set(0, 0, -0.1);
  } else {
    if (ud.helmet) { ud.head.remove(ud.helmet); ud.helmet = null; }
    const fat = !!pv.model.fat;
    playerRider.position.set(fat ? -0.26 : -0.3, (fat ? 0.93 : 1.02) - 0.93 * playerRider.scale.y, 0);
    playerRider.rotation.set(0, 0, -0.08);
    const arm = fat ? 0.95 : 0.85;
    // fietstrucs (#207): achterover bij een wheelie, voorover bij een stoppie, de armen omhoog zonder handen
    const trick = !pv.model.fat && pv.wheelieState ? fietsHouding(pv.wheelieState, arm, rijderHouding) : null;
    if (trick) playerRider.rotation.z += trick.lean;
    ud.armL.rotation.set(trick ? -trick.armX : 0, 0, trick ? trick.armZ : arm);
    ud.armR.rotation.set(trick ? trick.armX : 0, 0, trick ? trick.armZ : arm);
    // touching the thighs re-runs the pedal IK (models3d_people pedalIK)
    ud.legL.rotation.z = fat ? 0.55 : 0.33;
    ud.legR.rotation.z = fat ? 0.55 : 0.33;
  }
  const fig = pvMesh.userData.riderFig !== undefined && pvMesh.userData.riderFig !== null
    ? pvMesh.userData.riderFig
    : pvMesh.children.find((c) => c !== playerRider && c.userData && c.userData.legL);
  if (fig && fig !== playerRider) fig.visible = false;
  playerRider.visible = !hide;
}

function buildPersonActor(shirt, skin, appearance) {
  const mesh = buildPersonMesh(shirt, skin, appearance);
  addBlobShadow(mesh, 0.85, 0.85);
  return enableShadows(mesh, false);
}

// three.js destroys a shader program as soon as its last material is
// disposed, so every despawned actor type (and the PMREM re-bake's temporary
// material) would recompile - a sync stall - the next time it appears. An
// extra reference per program keeps each compiled variant for the session.
function pinShaderPrograms(r) {
  const programs = r.info.programs;
  const push = programs.push;
  programs.push = function (...added) {
    for (const p of added) { p.usedTimes++; probe.program(p); }
    return push.apply(this, added);
  };
}

export function init3D(map) {
  liftMap = map;
  preloadLandmarkModels();
  setBuildingMap(map);
  canvas3 = document.getElementById('game3d');
  // laptops with two GPUs: the fast one
  renderer = new THREE.WebGLRenderer({ canvas: canvas3, antialias: getSettings().quality === 'laag', powerPreference: 'high-performance' });
  wantRatio = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(wantRatio);
  watchContext(canvas3, 'spel');
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  hookShadowPass(renderer.shadowMap);
  hookLinkGuard(renderer);
  pinShaderPrograms(renderer);
  // Fetching shader info logs after a link is a sync point that costs tens of
  // ms per program on a busy GPU; ?shaderdebug brings the error checks back.
  renderer.debug.checkShaderErrors = FLAGS.shaderdebug;
  probe.setRenderer(renderer);

  scene = new THREE.Scene();
  // The scene root never moves; with auto-update on it would force every
  // descendant (including the frozen static ones) to recompute each frame.
  scene.matrixAutoUpdate = false;
  scene.background = new THREE.Color(SKY_HORIZON);
  scene.fog = new THREE.Fog(SKY_HORIZON, DRAW_DIST * 0.45, DRAW_DIST * 1.05);
  skyUniforms = createSkyUniforms(sunDir);
  skyDome = buildSkyDome(skyUniforms);
  setStarShare(skyDome, starShare);
  scene.add(skyDome);
  cloudLayer = buildCloudLayer();
  scene.add(cloudLayer);
  envUpdater = createEnvironmentUpdater(renderer, sunDir);
  scene.environment = envUpdater.update(skyUniforms.uZenith.value, skyUniforms.uHorizon.value, new THREE.Color(0x6e6250), sunDir, skyUniforms.uSunColor.value, 0.45);
  // one water material for the canals and the tiles' water
  waterMaterial = sharedWaterMaterial(skyUniforms);
  scene.userData.sky = { uniforms: skyUniforms };
  scene.userData.lightBase = lightBase;

  // near=0.5 (not something tiny like 0.15) keeps depth-buffer precision
  // usable out at DRAW_DIST - too-small a near plane collapses the ground
  // vs. road/water/green y-offsets into the same depth bucket at range,
  // which read as "roads just don't render" (ground always won the z-test)
  // fov is de VERTICALE kijkhoek (three.js): op een breed scherm blijft die
  // gelijk, de horizontale volgt uit de verhouding (#463)
  cam = new THREE.PerspectiveCamera(cameraVerticalFov(getSettings().fov), cameraAspect(innerWidth, innerHeight), 0.5, DRAW_DIST * 1.4);
  setFxCamera(cam);
  // de route-ribbon (scene3d/routeribbon3d.js) krijgt scene en camera via een
  // setter: een import terug zou een modulecyclus geven (#502)
  setRouteRibbonScene(scene, cam);

  // Hemisphere ground stays a muted warm grey: a saturated ground colour
  // bleeds onto every downward-facing surface (car undersides, eaves).
  hemi = new THREE.HemisphereLight(0xb4cdea, 0x6f6454, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffd29a, 3.3);
  sun.castShadow = true;
  applyShadowLevel('hoog');
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = SUN_DIST + 140;
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0003;
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
  // in the geometry worker while the game loads (main.js awaits terrainReady)
  if (geoWorkerActive()) {
    setCountryBounds(map.meta.bounds);
    terrainMesh = new THREE.Group();
    terrainMesh.material = createTerrainMaterial();
    const group = terrainMesh;
    // the build bakes the ground (scripts/world/bake_terrain.mjs), so there is
    // nothing to build at the start. tileworld.js already checked the block
    // against the map bounds and the water list; when it does not fit, the
    // geometry worker builds it as before.
    const baked = map.terrainCache;
    if (baked) {
      terrainGroup(baked, group);
      freezeStatic(group);
      terrainPending = Promise.resolve();
      if (typeof window !== 'undefined' && window.__loadMarks) window.__loadMarks.terrainBaked = Math.round(performance.now());
    } else {
      const water = waterRows(map);
      let terrainKlaar = false, terrainDeadline = 0;
      terrainPending = new Promise((done) => {
        // #749: precies één keer afronden. De worker bouwt het terrein; antwoordt hij niet
        // binnen de deadline (dood of hangend), dan bouwt de hoofdthread dezelfde terugval
        // als de bestaande fallback. Een late worker-callback doet daarna niets meer.
        const finish = (T) => {
          if (terrainKlaar) return;
          terrainKlaar = true;
          clearTimeout(terrainDeadline);
          terrainGroup(T || terrainArrays(map.meta.bounds, water), group);
          freezeStatic(group);
          done();
        };
        terrainDeadline = setTimeout(() => finish(null), TERRAIN_READY_DEADLINE_MS);
        runGeo('terrain', { bounds: map.meta.bounds, water: water.map((w) => ({ pts: w.pts, bounds: w.bounds })) }, finish);
      });
    }
  } else {
    terrainMesh = buildTerrainMesh3D(map.meta.bounds, waterRows(map));
    freezeStatic(terrainMesh);
  }
  scene.add(freezeStatic(terrainMesh));
  scene.add(drawHub.root);
  // a pool of a material not seen before links its program in the background before its first cell draws
  drawHub.onPool = (p) => {
    if (perfOff('bouwklaar')) return;
    precompile(p);
    if (p.customDepthMaterial) {
      const d = new THREE.Mesh(p.geometry, p.customDepthMaterial);
      d.isBatchedMesh = true;
      d._matricesTexture = p._matricesTexture;
      precompile(d);
    }
  };

  // Opaque canal bed under the whole map: terrain holes are cut per grid
  // triangle, so their jagged edges never line up exactly with the water
  // polygons, and the transparent water would otherwise blend against the
  // sky colour through the gaps.
  const [bx0, by0, bx1, by1] = map.meta.bounds;
  const bedPad = Math.max(bx1 - bx0, by1 - by0) * 0.15;
  bedMaterial = applyCutMask(new THREE.MeshBasicMaterial({ color: 0x1e2a2c }), null, true);
  initCutMask(map);
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(bx1 - bx0 + bedPad * 2, by1 - by0 + bedPad * 2),
    bedMaterial,
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set((bx0 + bx1) / 2, WATER_Y - 0.5, (by0 + by1) / 2);
  scene.add(bed);

  playerMesh = buildPersonActor(TAMMO_APPEARANCE.shirt, TAMMO_APPEARANCE.skin, TAMMO_APPEARANCE);
  scene.add(playerMesh);

  billboardRoot = document.getElementById('hud');

  postfx = createPostFX(renderer, scene, cam);
  initNightLights(scene);
  for (const b of gridItems(map.buildingGrid)) if (b.landmark) landmarkBuildings.push(b);
  farLod = createFarLOD(scene, map, {
    flatGeometry: (poly) => poly._geoFlat || (poly._geoFlat = buildPolyGeometry(poly.pts)),
    colors: { roads: ROAD_COLORS3D, sidewalk: SIDEWALK_COLOR, green: GREEN_COLOR, greenOf: grassFarColor, greenRank: grassFarRank },
    sidewalkExtra: SIDEWALK_EXTRA,
    roadColorOf: roadFarColor,
  });
  // streamed tiles (the province's, tileworld.js) join the far LOD as they
  // come and go; up close the detail streamers find them in the map's grids.
  // A meadow or grass (Dutch farmland is mapped as either) is the ground shader's fields
  if (map.onTiles) map.onTiles((kind, tile, key) => {
    if (kind === 'drop') { farLod.dropStreamTile(key); landmarkDirty = true; return; }
    const rows = (type) => (tile.sections.find((q) => q.type === type) || { rows: [] }).rows;
    const [ox, oy] = tileOrigin(tile.i, tile.j);
    farLod.addStreamTile(key, ox, oy, TILE_M, { buildings: rows(SECTION.BUILDINGS), roads: rows(SECTION.ROADS), green: rows(SECTION.GREEN).filter((g) => g.kind !== 'meadow' && g.kind !== 'grass'), water: rows(SECTION.WATER) });
    // #314 C1: een teruggekomen tegel kan een landmark meebrengen; de detailring slaat
    // landmarks in zijn view-lus over, dus deze lijst is hun enige bron.
    for (const b of map.buildingsNear(ox + TILE_M / 2, oy + TILE_M / 2, TILE_M * 0.72)) if (b.landmark && !landmarkBuildings.includes(b)) landmarkBuildings.push(b);
  });
  initRailway3D(scene, map);
  initStreetFurniture3D(scene, map);
  const railDecks = buildRailDecks(map);
  if (railDecks) scene.add(railDecks);
  scene.add(buildCanopies(map));
  streamCanopies(scene, map);
  const perrons = buildPerrons3D(map);
  if (perrons) scene.add(perrons);
  initGrass(scene, map, { polyGeometry: (poly) => poly._geoFlat || (poly._geoFlat = buildPolyGeometry(poly.pts)) });
  onSettingsChange(applyViewSettings);
  resize3D();
  window.addEventListener('resize', resize3D);
  window.__scene3d = { THREE, scene, cam, renderer, postfx, farLod, actors: () => ({ vehicles: vehicleMeshes, peds: pedMeshes, wildlife: wildlifeMeshes, culled: culledActors }), setBlobPool: (on) => { zetBlobPool(on); }, cullPass: () => { cullOffscreenActors(); skipHiddenMatrixWalk(); }, restorePass: restoreCulledActors, dists: () => ({ DRAW_DIST, buildingDetailR, facadeDetailDist, roadDetailR, viewDist, speed: focusSpeed, lead: streamAhead.lead }), batches: () => ({ buildings: buildingBatcher.info(), facades: facadeBatcher.info(), roads: roadBatcher.info(), shores: shoreBatcher.info(), pool: drawHub.stats() }) };
}

// increments each time the scene is drawn to the canvas (blackframe.js)
let canvasFrames = 0;
export const canvasFrameCount = () => canvasFrames;

// seconds between renders behind a menu that covers part / most of the view
export const MENU_FRAME_S = [0, 1 / 30, 1 / 20];
let menuCover = 0, menuShadowDone = false;
// main.js / startscreen.js: a menu covers the view (0 none, 1 part, 2 most)
export function setMenuCover(level) {
  if (level !== menuCover) menuShadowDone = false;
  menuCover = level;
}

// Read-only access for systems that need the view pose (e.g. the 3D audio listener).
// Runs fn right after the next frame was drawn, in the same task, when the canvas still holds it
// (a copy of the canvas taken later is blank): the savegame screenshot (savegame.js).
let afterFrameQ = [];
export function afterNextFrame(fn) { afterFrameQ.push(fn); }

export function getCamera() {
  return cam;
}

export function getScene() {
  return scene;
}
sfxLinks.getScene = getScene; // sfx/ambience.js (latehooks.js)

export function getRenderer() {
  return renderer;
}

// Rebuild the Tammo/Tessa meshes next frame (their appearance objects changed).
export function refreshCharacterMeshes() {
  playerCharacter = null;
  companionCharacter = null;
  // the bike/scooter rider is built from the same look
  playerRiderChar = null;
}

let orbitRadius = ORBIT_RADIUS;
let baseFov = 64;

function applyViewSettings(st) {
  if (!renderer) return;
  const level = QUALITY_PRESETS[st.quality] ? st.quality : 'hoog';
  const preset = QUALITY_PRESETS[level];
  wantRatio = renderPixelRatio(st, preset);
  resize3D();
  setNightLightQuality(level);
  starShare = STAR_SHARE[level] ?? 1;
  if (skyDome) setStarShare(skyDome, starShare);
  setCountryFacadeLevel(level);
  setCountryPropLevel(level);
  facadeQualityDist = FACADE_DETAIL_DIST[level] || Infinity;
  facadeDetailDist = Math.min(facadeQualityDist, CPU_FACADE_DIST[cpuLevel()]);
  if (postfx.level !== level) postfx.setLevel(level);
  const shadows = st.shadows && preset.shadows;
  if (sun.castShadow !== shadows) { sun.castShadow = shadows; renderer.shadowMap.needsUpdate = true; }
  const levelChanged = shadowBaseLevel !== level; // #792: een keuze in Instellingen telt meteen
  shadowBaseLevel = level;
  applyShadowLevel(adaptedShadowLevel(level, dynamicScale(), cpuLevel()), levelChanged);
  applyViewDistance(st);
  cam.fov = baseFov = cameraVerticalFov(st.fov);
  cam.updateProjectionMatrix();
  orbitRadius = ORBIT_RADIUS * st.cameraDistance;
}

// view distance, camera far plane and fog; 'heel ver' follows adaptive quality
function applyViewDistance(st) {
  viewDist = viewDistanceFor(st.drawDistance, dynamicScale(), cpuLevel());
  DRAW_DIST = detailDistanceFor(st.quality, viewDist, cpuLevel());
  cam.far = Math.max(DRAW_DIST * 1.4, viewDist * 1.4, landmarkDist() * 1.1);
  lightBase.fogNear = DRAW_DIST * 0.45 + (viewDist - 150) * 0.25;
  lightBase.fogFar = viewDist * 1.02;
}

function renderPixelRatio(st, preset) {
  return Math.min(preset.pixelRatio, window.devicePixelRatio || 1) * (st.resolution || 1) * dynamicScale();
}

// gfxprofile.js changed the dynamic render scale or cpuLevel
export function refreshRenderScale() {
  if (!renderer) return;
  const st = getSettings();
  const ratio = renderPixelRatio(st, QUALITY_PRESETS[st.quality] || QUALITY_PRESETS.hoog);
  facadeDetailDist = Math.min(facadeQualityDist, CPU_FACADE_DIST[cpuLevel()]);
  const wasView = viewDist;
  applyViewDistance(st);
  if (viewDist !== wasView) { cam.updateProjectionMatrix(); noteGfxEvent(`zichtafstand ${wasView}->${viewDist} m`); }
  // #658: een lagere adaptieve schaal maakt de schaduwkaart ook zuiniger; #792: met hysterese,
  // zodat een enkele terugval de kaart niet meteen weer laat opstappen
  applyShadowLevel(adaptedShadowLevel(shadowBaseLevel, dynamicScale(), cpuLevel()));
  if (ratio === wantRatio) return;
  noteGfxEvent(`renderschaal ${wantRatio.toFixed(2)}->${ratio.toFixed(2)}`);
  wantRatio = ratio;
  sizeDirty = true;
}

// Pure regel (#792): mag de schaduwkaart naar een grotere maat? Alleen als die al een lange
// tijd gevraagd wordt; kleiner of gelijk mag altijd (dat kost geen nieuwe kaart en geen
// volle schaduwpas). requestedSince 0 = er is nog geen grotere maat gevraagd.
export function shadowUpgradeAllowed(currentSize, targetSize, requestedSince, now) {
  return targetSize <= currentSize || (requestedSince > 0 && now - requestedSince >= SHADOW_UPGRADE_MS);
}

function applyShadowLevel(level, force = false) {
  const s = SHADOW_LEVELS[level] || SHADOW_LEVELS.hoog;
  const current = shadowMapLevel ? SHADOW_LEVELS[shadowMapLevel] : null;
  const now = performance.now();
  if (!force && current && s.size > current.size && !shadowUpgradeAllowed(current.size, s.size, shadowUpgradeAt, now)) {
    if (!shadowUpgradeAt) {
      shadowUpgradeAt = now;
      noteGfxEvent(`schaduwkaart ${current.size}->${s.size} uitgesteld`);
      // niet alleen op de volgende gfx-stap wachten: na de wachttijd zelf opnieuw kijken
      shadowUpgradeTimer = setTimeout(() => {
        shadowUpgradeTimer = 0;
        if (renderer) applyShadowLevel(adaptedShadowLevel(shadowBaseLevel, dynamicScale(), cpuLevel()));
      }, SHADOW_UPGRADE_MS + 250);
    }
    return;
  }
  if (shadowUpgradeTimer) { clearTimeout(shadowUpgradeTimer); shadowUpgradeTimer = 0; }
  shadowUpgradeAt = 0;
  shadowMapLevel = level;
  shadowHalf = s.half;
  const c = sun.shadow.camera;
  if (c.right !== s.half) {
    Object.assign(c, { left: -s.half, right: s.half, top: s.half, bottom: -s.half });
    c.updateProjectionMatrix();
  }
  sun.shadow.radius = s.radius;
  sun.shadow.normalBias = s.normalBias;
  if (sun.shadow.mapSize.x !== s.size) {
    sun.shadow.mapSize.set(s.size, s.size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; noteGfxEvent('schaduwkaart opnieuw'); }
    // a frame that skips the shadow pass (behind a menu, cpuLevel) would
    // sample no map at all: everything in shadow
    renderer.shadowMap.needsUpdate = true;
  }
}

export function resize3D() {
  if (!renderer) return;
  // de vorige verhouding blijft staan als de browser even hoogte 0 meldt
  // (draaien, adresbalk): anders is de projectie één beeld lang onbruikbaar (#463)
  cam.aspect = cameraAspect(innerWidth, innerHeight, cam.aspect);
  cam.updateProjectionMatrix();
  sizeDirty = true;
}

// Resizing the canvas clears it, and a cleared canvas left until the next
// rAF is shown as a black frame: the size and render scale are only applied
// here, right before the frame's render.
let wantRatio = 1, sizeDirty = true;
function applyRenderSize() {
  sizeDirty = false;
  const w = innerWidth, h = innerHeight;
  const c = renderer.domElement;
  if (wantRatio === renderer.getPixelRatio() && c.width === Math.floor(w * wantRatio) && c.height === Math.floor(h * wantRatio)) return;
  noteGfxEvent(`setSize ${w}x${h}@${wantRatio.toFixed(2)}`);
  renderer.setDrawingBufferSize(w, h, wantRatio);
  postfx.setSize(w, h, wantRatio);
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

// One shared animated ShaderMaterial for every water polygon (uTime updated
// once per frame in update3D) instead of a flat MeshLambertMaterial per poly.
let waterMaterial = null;
// Water polygons in the scene that do not wear the shared material (#181): {total, shared, stray}
export function auditWater() { return auditWaterMeshes(scene, waterMaterial); }
// the shore meshes of the water in the scene, for the shore batcher (item { mesh, bounds } -> mesh)
const shoreItems = new Map();
const shoreOfPoly = new Map();
function registerShoreItems(poly, shore) {
  if (shoreOfPoly.has(poly)) return;
  const items = [];
  for (const m of shore.children) {
    if (m.userData.noBatch || !m.geometry.attributes.position) continue;
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox;
    const it = { mesh: m, bounds: [bb.min.x, bb.min.z, bb.max.x, bb.max.z] };
    // the item's holder stays visible while its mesh is merged (the batcher hides the mesh itself)
    shoreItems.set(it, { mesh: m, parent: shore, visible: true, userData: {} });
    items.push(it);
  }
  shoreOfPoly.set(poly, items);
}
function dropShoreItems(poly) {
  const items = shoreOfPoly.get(poly);
  if (!items) return;
  for (const it of items) shoreItems.delete(it);
  shoreOfPoly.delete(poly);
}
function buildWaterMesh(poly, y, map) {
  if (!poly._geoWater) poly._geoWater = buildWaterGeometry(poly, getWaterIndex(map, poly), null);
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(poly._geoWater, waterMaterial);
  // a body at its own peil (the Lauwersmeer, #299) lies above the boezem's water; the shore follows it
  y += surfaceLift(poly);
  mesh.position.y = y;
  group.add(mesh);
  // from the geometry worker the banks and quays join the surface a few frames later
  let sync = true;
  requestShore(poly, map, { waterY: y, apronMaterial: terrainMesh.material }, (shore) => {
    if (!shore) return;
    group.add(shore);
    group.userData.shore = shore;
    // the polygon is in the scene by now (its shore came later); from the cache, syncWater registers it
    if (waterMeshes.get(poly) === group) registerShoreItems(poly, shore);
    if (!sync) freezeStatic(shore);
  });
  sync = false;
  return group;
}

// Darker, more saturated asphalt than the earlier pass - against the tan
// ground fill these read unmistakably as "a road" instead of blending into
// a same-toned gray. The far LOD uses these flat colours.
const ROAD_COLORS3D = { cycle: 0x94412f, foot: 0x837d71, major: 0x57595c, normal: 0x4b4d50, minor: 0x4b4d50 };
const GREEN_COLOR = 0x5c8a4d;
const SIDEWALK_COLOR = 0x7b776d;

// three's shadow pass recurses through every node of the scene (~0.5 to 1 us
// each: 2 to 3 ms for the ~9000 of this one) and asks each mesh whether it
// casts. Groups at the top of the scene that cast nothing sit this pass out as
// hidden groups, and are back right after it:
// - people, vehicles and animals beyond ACTOR_SHADOW_DIST (limitActorShadows
//   switches their casters off; castNear tells), about 1600 nodes;
// - the terrain (~500 meshes), the loose roads, the far LOD, the road and
//   shore batches, the flavour props: groups without a single caster, found
//   by looking through each once (shadowKinds), again when its number of
//   children changes, and every SHADOW_KIND_AGE passes anyway (staggered: a
//   group that only gets casters later, like the countryside's trees that
//   cast from a distance on, is back in the pass within a second).
const shadowHidden = [];
const shadowKinds = new WeakMap();
const SHADOW_KIND_AGE = 45;
let shadowKindSeq = 0; // no Math.random here: the spelbot seeds it and a render step must not move that sequence
function nodeCasts(o) {
  if (o.castShadow) return true;
  const kids = o.children;
  for (let i = 0; i < kids.length; i++) if (nodeCasts(kids[i])) return true;
  return false;
}
function groupCastsShadow(c) {
  let k = shadowKinds.get(c);
  if (!k) shadowKinds.set(c, k = { n: -1, casts: true, age: (shadowKindSeq++ * 7) % SHADOW_KIND_AGE });
  if (k.n !== c.children.length || ++k.age > (k.casts ? SHADOW_KIND_AGE * 6 : SHADOW_KIND_AGE)) { k.n = c.children.length; k.age = 0; k.casts = nodeCasts(c); }
  return k.casts;
}
function hookShadowPass(shadowMap) {
  const run = shadowMap.render.bind(shadowMap);
  shadowMap.render = (lights, sc, camera) => {
    // every render() call comes through here: the 16 a frame of the post chain (bloom blurs, grade; fullscreen quads without lights), the
    // scene's own pass without shadow casters, and a frame whose shadow map is not redrawn have nothing to hide or show; three leaves them
    // straight away. The scan of the scene's top level and the hide and show of its groups ran for each of them: 15 times a frame, 2 to 5 ms
    // (perfoff=schaduwhaak)
    if ((sc !== scene || !lights.length || !shadowMap.enabled || (!shadowMap.autoUpdate && !shadowMap.needsUpdate)) && !perfOff('schaduwhaak')) { run(lights, sc, camera); return; }
    // the groups cut from the main pass shadow the view too: back in for this pass
    for (let i = 0; i < culledGroups.length; i++) culledGroups[i].visible = true;
    if (perfOff('schaduwpas')) {
      try { run(lights, sc, camera); } finally { for (let i = 0; i < culledGroups.length; i++) culledGroups[i].visible = false; }
      return;
    }
    probe.mark('3d:render:voorpas');
    const kids = scene.children;
    const groups = !perfOff('schaduwgroepen');
    // the sun's shadow box (a few tens of metres round the player, stretched towards the sun): a group whose sphere lies outside it casts nothing into
    // the map, and three would walk its nodes for nothing (?perfoff=schaduwbereik)
    let box = null;
    if (lights.length === 1 && lights[0] === sun && !perfOff('schaduwbereik')) { sun.shadow.updateMatrices(sun); box = sun.shadow.getFrustum(); }
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      if (!c.visible || c.isLight || c.isCamera) continue;
      const ud = c.userData;
      // an actor: its casters follow the distance (castNear), so that is looked at every pass
      if (ud.shadowCasters !== undefined) { if (ud.castNear === false) { c.visible = false; shadowHidden.push(c); } continue; }
      if (c === terrainMesh || (groups && !groupCastsShadow(c))) {
        if (window.__perfVerify && c !== terrainMesh) { window.__perfVerify.shadowChecked++; if (nodeCasts(c)) { window.__perfVerify.shadow++; if (window.__perfVerify.bad.length < 12) window.__perfVerify.bad.push(['schaduwgroep', c.name || c.type, Math.round(c.position.x), Math.round(c.position.z)]); } }
        c.visible = false; shadowHidden.push(c);
      } else if (box !== null) {
        const sp = knownGroupSphere(c);
        if (sp !== null && !box.intersectsSphere(sp)) {
          if (window.__perfVerify) verifyShadowBox(c, box);
          c.visible = false; shadowHidden.push(c);
        }
      }
    }
    probe.mark('3d:render:schaduwscan');
    try { run(lights, sc, camera); } finally {
      probe.mark('3d:render:schaduwpas');
      for (let i = 0; i < shadowHidden.length; i++) shadowHidden[i].visible = true;
      shadowHidden.length = 0;
      for (let i = 0; i < culledGroups.length; i++) culledGroups[i].visible = false;
    }
  };
}

// A shader that is not linked yet blocks the frame at its first draw (getProgramParameter waits for the link,
// 0.3 to 1 s for a building style, a landmark kit or a depth program that was not seen before, #247). A draw of
// the game scene (or a shadow caster) whose material has no linked program yet is left out instead and its
// object is compiled after the frame, in the background (KHR_parallel_shader_compile); it shows a few frames
// later. Fullscreen passes are never skipped, nor are depth materials (compiling the object does not compile the
// shadow pass's own material, so a skipped caster would never come back), and without the extension nothing changes.
const linkPending = new Set();
// The guard works from the first canvas frame on (#247; canvasFrames counts after the frame): the first frames behind the boot screen drew every program of the scene for the
// first time, and each draw waited for its link one after the other (18 s of a 44 s boot, 14.7 s in one frame on a loaded machine,
// profile of the boot, docs/PERF-METING Vervolg 12). Now the draws of unlinked programs wait and all links run in parallel; the world
// fills in over the first seconds. A recording (trailer, frames, video, preview) keeps the old 600 frames: its first shots must be complete.
// `?perfoff=linkvroeg` is the old behaviour for an A/B.
const LINK_GUARD_AFTER = 600, LINK_GUARD_EARLY = -1;
const linkGuardFrom = () => (FLAGS.trailer || FLAGS.frames || FLAGS.video || FLAGS.preview || perfOff('linkvroeg') ? LINK_GUARD_AFTER : LINK_GUARD_EARLY);
// three sorts the opaque draws by material id, so the materials of one program lie wherever their ids fall and the renderer
// switches program (and uploads the lights, fog and shadow uniforms again) far more often than there are programs.
// This sort puts the program first: the id of the program a material was last drawn with, noted after each draw of the
// game scene (?perfoff=progsort for the plain order).
let progSortOn = true;
function programSort(a, b) { return compareOpaque(a, b, progSortOn); }
// Whether a program is linked. Asking is a synchronous round trip to the GPU process that waits out its backlog (KHR_parallel_shader_compile
// COMPLETION_STATUS), and the guard asked for every draw of every material still linking: with a few dozen programs pending that was most of the
// frame (66% of the main thread in a profile right after a pool was created). A linked program is remembered; while one is not linked, the
// question is asked at most every LINK_POLL_MS for all of them, and the answer in between is 'not yet' (its draw waits a frame or two longer).
const LINK_POLL_MS = 25;
let linkPollAt = 0;
// #804: p.isReady() vraagt LINK_STATUS op en dat BLOKKEERT tot de link klaar is
// (1,5 s gemeten in een draw op a7). KHR_parallel_shader_compile heeft een
// niet-blokkerende COMPLETION_STATUS_KHR; die vragen we, zodat een draw nooit
// op de link staat te wachten. Zonder de extensie valt hij terug op isReady().
let linkExt;
function programLinked(p) {
  if (p._linked) return true;
  if (linkExt === undefined) {
    try { linkExt = renderer && renderer.getContext().getExtension('KHR_parallel_shader_compile'); } catch (e) { linkExt = null; }
  }
  if (perfOff('linkpoll') || !linkExt) return p.isReady();
  const now = performance.now();
  if (now < linkPollAt) return false;
  linkPollAt = now + LINK_POLL_MS;
  let ready = false;
  try { ready = !!renderer.getContext().getProgramParameter(p.program, linkExt.COMPLETION_STATUS_KHR); } catch (e) { ready = p.isReady(); }
  if (ready) { p._linked = true; return true; }
  return false;
}
function hookLinkGuard(r) {
  r.setOpaqueSort(programSort);
  const draw0 = r.renderBufferDirect.bind(r);
  const draw = function (camera, sc, geometry, material, object, group) {
    const out = draw0(camera, sc, geometry, material, object, group);
    if (sc === scene && !Array.isArray(material)) { const pr = r.properties.get(material).currentProgram; if (pr) material.userData.pk = pr.id; }
    return out;
  };
  let guard = null;
  r.renderBufferDirect = function (camera, sc, geometry, material, object, group) {
    if (guard === null) guard = r.extensions.has('KHR_parallel_shader_compile');
    // not in the first seconds: the load screen, the title and the first shots wait for the prewarm, which draws the materials once
    if (guard && canvasFrames > linkGuardFrom() && (sc === null || sc === scene) && !material.isMeshDepthMaterial && !material.isMeshDistanceMaterial && !perfOff('linkwacht')) {
      const programs = r.properties.get(material).programs;
      let ready = !!programs;
      if (programs) for (const p of programs.values()) if (!programLinked(p)) { ready = false; break; }
      if (!ready) { linkPending.add(object); return undefined; }
    }
    if (sc === null && material.isMeshDepthMaterial && !perfOff('dieptevarianten')) material = depthVariant(material, object);
    return draw(camera, sc, geometry, material, object, group);
  };
}
// The shadow pass draws every plain caster with one shared MeshDepthMaterial, and three asks for its program again each time the kind of object
// changes (skinned, instanced, batched: 18 times a frame in the city). One copy per kind keeps its program; the copy has the shared one's side and wire.
const depthKinds = new WeakMap();
function depthVariant(m, o) {
  const kind = (o.isSkinnedMesh ? 1 : 0) | (o.isInstancedMesh ? (o.instanceColor ? 4 : 2) : 0) | (o.isBatchedMesh ? 8 : 0);
  if (kind === 0 || m.map || m.alphaMap || m.displacementMap || m.alphaTest > 0 || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.userData.pool) return m;
  let list = depthKinds.get(m);
  if (!list) depthKinds.set(m, list = []);
  let v = list[kind];
  if (!v) { v = list[kind] = new THREE.MeshDepthMaterial({ depthPacking: m.depthPacking }); v.name = 'depth-variant'; v.userData.depthVariantOf = m; }
  v.side = m.side;
  v.wireframe = m.wireframe;
  v.visible = m.visible;
  return v;
}
function compilePending() {
  if (!linkPending.size) return;
  for (const o of linkPending) if (o.parent) precompile(o);
  linkPending.clear();
}

// Static world geometry (buildings, roads, water): matrices are computed once
// here instead of being recomposed for thousands of objects every frame.
function freezeStatic(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => { o.matrixAutoUpdate = false; });
  return root;
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
    const near = Math.abs(mesh.position.x - px) < ACTOR_SHADOW_DIST && Math.abs(mesh.position.z - py) < ACTOR_SHADOW_DIST
      && !(mesh.userData.fadeLevel < FADE_STEPS);
    if (mesh.userData.castNear === near) continue;
    mesh.userData.castNear = near;
    for (const o of casters) o.castShadow = near;
  }
}

// Trees by species (greenery.js: crown shape, height, leaf and bark colour).
// The instanced trees take their colours per instance; leaves let light
// through: a little emissive fill keeps canopies from turning into black
// blobs at dusk and in shade. That fill is the one part of a crown the sun
// does not dim, so applyTimeOfDay fades it with nightrules.foliageGlow (#463):
// in the dark a crown is as dark as the street, never a green glow.
const TREE_TRUNK_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
const TREE_CANOPY_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true, emissive: new THREE.Color(0x56844a).multiplyScalar(0.09) });
const TREE_TRUNK_GEO = new THREE.CylinderGeometry(0.14, 0.22, 1, 6).translate(0, 0.5, 0);
const TREE_CANOPY_GEO = new THREE.IcosahedronGeometry(1, 1);
// a conifer: a cone of radius 1 from y -1 to 1
const TREE_CONE_GEO = new THREE.ConeGeometry(1, 2, 7);
SHARED_MATERIALS.add(TREE_TRUNK_MAT);
SHARED_MATERIALS.add(TREE_CANOPY_MAT);
SHARED_GEOMETRIES.add(TREE_TRUNK_GEO);
SHARED_GEOMETRIES.add(TREE_CANOPY_GEO);
SHARED_GEOMETRIES.add(TREE_CONE_GEO);
// a tree filled into a wood or park outline is drawn out to TREE_FAR, as its crown only
const TREE_FAR = 260;
const _leaf = new THREE.Color(), _bark = new THREE.Color();
const tumbleMats = new Map();
function tumbleMat(hex) {
  let m = tumbleMats.get(hex);
  if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, flatShading: true }); SHARED_MATERIALS.add(m); tumbleMats.set(hex, m); }
  return m;
}

// Trunk, canopy and lobe transforms of tree t, shared by the tumbling-tree
// mesh and the instanced standing trees. Returns the dims (d.cone: a conifer).
function layoutTree(t, trunk, canopy, lobe) {
  const d = treeDims(t);
  trunk.scale.set(d.ts, d.trunkH + d.ry * 0.5, d.ts);
  canopy.rotation.set(0, d.rot, 0);
  if (d.cone) {
    canopy.scale.set(d.r, d.ry, d.r);
    canopy.position.y = d.trunkH + d.ry * 0.9;
  } else {
    canopy.scale.set(d.r, d.ry, d.r);
    canopy.position.y = d.cy;
  }
  lobe.scale.set(d.lr, d.lr * 0.85, d.lr);
  lobe.position.set(d.lx, d.ly, d.lz);
  return d;
}

function buildTreeMesh(t) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(TREE_TRUNK_GEO, TREE_TRUNK_MAT);
  const canopy = new THREE.Mesh(TREE_CANOPY_GEO, TREE_CANOPY_MAT);
  const lobe = new THREE.Mesh(TREE_CANOPY_GEO, TREE_CANOPY_MAT);
  const d = layoutTree(t, trunk, canopy, lobe);
  const sp = SPECIES[d.sp];
  trunk.material = tumbleMat(sp.trunk);
  canopy.material = lobe.material = tumbleMat(sp.color);
  if (d.cone) canopy.geometry = TREE_CONE_GEO;
  group.add(trunk, canopy);
  if (d.lr > 0) group.add(lobe);
  for (const m of group.children) m.castShadow = m.receiveShadow = true;
  group.position.set(t[0], 0, t[1]);
  return group;
}
setTreeMeshBuilder(buildTreeMesh);

// Standing trees: one InstancedMesh for the trunks, one for the leafy crowns
// (crown + lobe), one for the conifers and one for the far crowns of woods,
// colours per instance: four draws however many species.
const treeInstanced = [];
let treeCapacity = 0;
let shownTrees = [];
let treeSyncX = null, treeSyncY = null; // #651
// #786: de bronstand van de boomlijst (kaart + map.geoVer, #314 C2): een gestroomde
// tegel kan bomen toevoegen of weghalen terwijl de speler stil staat
let treeSyncMap = null, treeSyncGeoVer;
// crowns the follow camera sits in or looks through (updateCamera), left out of the instancing
const camTreeHidden = [];
let camTreeHiddenKey = '';
let shownHiddenKey = '';
const CROWN_SHADOW_CAP = 32;
let crownShadowOnly = null;
const _treeGroup = new THREE.Object3D();
const _treeParts = [new THREE.Object3D(), new THREE.Object3D(), new THREE.Object3D()];
const _treeMatrix = new THREE.Matrix4();
const _treeQuery = []; // #760: herbruikbuffer voor de boomquery (geen nieuwe array per aanroep)

function ensureTreeCapacity(n) {
  if (!crownShadowOnly) {
    // hidden crowns keep casting their shadow: drawn with no colour and no depth
    const mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    crownShadowOnly = new THREE.InstancedMesh(TREE_CANOPY_GEO, mat, CROWN_SHADOW_CAP);
    crownShadowOnly.castShadow = true;
    crownShadowOnly.count = 0;
    crownShadowOnly.matrixAutoUpdate = false;
    scene.add(crownShadowOnly);
  }
  if (n <= treeCapacity) return;
  treeCapacity = Math.max(64, treeCapacity * 2, n);
  for (const m of treeInstanced) { scene.remove(m); m.dispose(); }
  treeInstanced.length = 0;
  const make = (geo, mat, cap, shadow = true) => {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.count = 0;
    m.matrixAutoUpdate = false;
    m.name = 'trees';
    m.setColorAt(0, _leaf.setRGB(1, 1, 1));
    scene.add(m);
    treeInstanced.push(m);
  };
  make(TREE_TRUNK_GEO, TREE_TRUNK_MAT, treeCapacity);
  make(TREE_CANOPY_GEO, TREE_CANOPY_MAT, treeCapacity * 2);
  make(TREE_CONE_GEO, TREE_CANOPY_MAT, treeCapacity);
  make(TREE_CANOPY_GEO, TREE_CANOPY_MAT, treeCapacity, false);
}

// --- per-frame sync ------------------------------------------------------

// A pass that found nothing to build (and no prefetch left) is repeated only after the focus moved a hand's breadth
// or SYNC_IDLE_FRAMES frames: the pass walks every building within DRAW_DIST twice (~2000 hypots, a Set and
// two Map lookups each) and asks the grid for them three times. The detail radius is as exact as before to
// within SYNC_IDLE_MOVE metres, a few frames of walking.
const SYNC_IDLE_MOVE = 0.15;
const SYNC_IDLE_FRAMES = 12;
let syncIdle = null, syncFrame = 0;
function syncBuildings(world, px, py) {
  syncFrame++;
  if (syncIdle && !perfOff('bouwsync') && syncFrame - syncIdle.frame < SYNC_IDLE_FRAMES && Math.hypot(px - syncIdle.x, py - syncIdle.y) < SYNC_IDLE_MOVE
    && syncIdle.dist === DRAW_DIST && syncIdle.view === viewDist && syncIdle.facade === facadeDetailDist && syncIdle.hidden === hiddenBuildings.size
    && syncIdle.meshes === buildingMeshes.size && syncIdle.landmarks === landmarkBuildings.length && syncIdle.geoVer === world.map.geoVer) return;
  syncIdle = null;
  syncBuildingsPass(world, px, py);
}

function syncBuildingsPass(world, px, py) {
  // #314 C1: een landmark van een weggevallen tegel uit de lijst en de scène halen; een
  // teruggekomen tegel heeft zijn landmark al via onTiles toegevoegd.
  if (landmarkDirty) {
    landmarkDirty = false;
    for (let i = landmarkBuildings.length - 1; i >= 0; i--) {
      const b = landmarkBuildings[i];
      const bb = b.bounds || [0, 0, 0, 0];
      if (world.map.buildingGrid.query(bb[0], bb[1], bb[2], bb[3]).includes(b)) continue;
      landmarkBuildings.splice(i, 1);
      const mesh = buildingMeshes.get(b);
      if (mesh) { scene.remove(mesh); buildingMeshes.delete(b); }
    }
  }
  // Detail set must be exactly "centre within detailR": farlod.js hides its
  // copy of a building by the same test, so no unload hysteresis here.
  // Missing meshes are built nearest first within a per-frame budget (a
  // teleport or a train arrival would otherwise build a whole district in
  // one frame); until the ring is complete, detailR shrinks to the nearest
  // building still missing and the far LOD covers everything past it.
  const view = world.map.buildingsNear(px, py, DRAW_DIST);
  const seen = new Set();
  const centreX = (b) => (b.bounds[0] + b.bounds[2]) / 2;
  const centreY = (b) => (b.bounds[1] + b.bounds[3]) / 2;
  const centreDist = (b) => Math.hypot(centreX(b) - px, centreY(b) - py);
  const missing = [];
  const want = (b, r, lod) => {
    const d = centreDist(b);
    if (d > r) return;
    seen.add(b);
    // [afstand voor de detailring, gebouw, detail?, rang in de rijrichting]
    if (!buildingMeshes.has(b)) missing.push([d, b, lod, streamRank(streamAhead, centreX(b), centreY(b))]);
  };
  for (const b of view) if (!b.landmark) want(b, DRAW_DIST, true);
  for (const b of landmarkBuildings) want(b, isSkyline(b) ? landmarkDist() : Math.max(DRAW_DIST, viewDist), false);
  for (const [b, mesh] of buildingMeshes) {
    if (seen.has(b)) continue;
    // no dispose: parts geometry and materials are shared/cached per building
    scene.remove(mesh);
    buildingMeshes.delete(b);
  }
  // wat de speler tegemoet rijdt eerst (#247); bij stilstand is de rang de afstand
  missing.sort((a, b) => a[3] - b[3]);
  const deadline = performance.now() + (performance.now() < streamBoostUntil ? BUILDING_BUILD_BOOST_MS : BUILDING_BUILD_MS);
  let built = 0;
  for (const [, b] of missing) {
    let mesh = prefetchedBuildings.get(b);
    if (!mesh) {
      if (built > 0 && performance.now() > deadline) continue;
      mesh = makeBuildingMesh(b);
      built++;
      precompile(mesh);
    }
    // a mesh whose shaders are not linked yet waits (the far LOD covers it): drawn at once it blocks the frame
    // for the link, 0.3 to 1 s for a style that has not been seen before (#247)
    if (!mesh.userData.progReady && !perfOff('bouwklaar')) {
      if (meshProgramsReady(mesh)) mesh.userData.progReady = true;
      else {
        const t = mesh.userData.heldAt || (mesh.userData.heldAt = performance.now());
        if (performance.now() - t < BUILDING_LINK_WAIT_MS) {
          prefetchedBuildings.set(b, mesh);
          continue;
        }
      }
    }
    prefetchedBuildings.delete(b);
    mesh.visible = !hiddenBuildings.has(b);
    if (!mesh.name) mesh.name = b.landmark ? 'landmark' : 'building';
    buildingMeshes.set(b, mesh);
    scene.add(mesh);
  }
  // De detailring is een cirkel (farlod.js toetst met dezelfde afstand) en
  // reikt tot het dichtstbijzijnde gebouw dat nog mist, ook als de
  // vooruit-volgorde een verderop gelegen gebouw eerder bouwde (#247).
  buildingDetailR = DRAW_DIST;
  let missingCount = 0;
  for (const m of missing) {
    if (buildingMeshes.has(m[1])) continue;
    missingCount++;
    if (m[2]) buildingDetailR = Math.min(buildingDetailR, m[0] - 0.01);
  }
  streamStat.b = missingCount;
  // shown only once the far LOD stops drawing them
  if (buildingDetailR < DRAW_DIST) {
    for (const [b, mesh] of buildingMeshes) {
      if (b.landmark) continue;
      const inside = centreDist(b) <= buildingDetailR;
      if (inside !== !!mesh.parent) { if (inside) scene.add(mesh); else scene.remove(mesh); }
    }
  } else if (buildingsStaged) {
    for (const mesh of buildingMeshes.values()) if (!mesh.parent) scene.add(mesh);
  }
  buildingsStaged = buildingDetailR < DRAW_DIST;
  // 'laag': window frames, trims and shopfronts only up close
  if (facadeDetailDist < DRAW_DIST || facadeDetailCulled) {
    for (const [b, mesh] of buildingMeshes) {
      const det = mesh.userData.facadeDetail;
      if (det) det.visible = centreDist(b) <= facadeDetailDist;
    }
    facadeDetailCulled = facadeDetailDist < DRAW_DIST;
  }
  // Build the meshes of buildings just outside the detail radius ahead of
  // time (within a small per-frame budget), so crossing DRAW_DIST only has
  // to add an already built mesh to the scene.
  for (const [b] of prefetchedBuildings) if (centreDist(b) > DRAW_DIST + BUILDING_PREFETCH + 20 && !nearPrewarm(b)) prefetchedBuildings.delete(b);
  if (missing.length > built) return;
  const prefetchEnd = performance.now() + BUILDING_PREFETCH_MS;
  let prefetchDone = true;
  for (const b of world.map.buildingsNear(px, py, DRAW_DIST + BUILDING_PREFETCH)) {
    if (performance.now() > prefetchEnd) { prefetchDone = false; break; }
    if (b.landmark || buildingMeshes.has(b) || prefetchedBuildings.has(b)) continue;
    const d = centreDist(b);
    if (d <= DRAW_DIST || d > DRAW_DIST + BUILDING_PREFETCH) continue;
    const mesh = makeBuildingMesh(b);
    precompile(mesh);
    prefetchedBuildings.set(b, mesh);
  }
  if (prefetchDone && missing.length === 0) {
    syncIdle = { x: px, y: py, frame: syncFrame, dist: DRAW_DIST, view: viewDist, facade: facadeDetailDist, hidden: hiddenBuildings.size, meshes: buildingMeshes.size, landmarks: landmarkBuildings.length, geoVer: world.map.geoVer };
  }
}

const BUILDING_LINK_WAIT_MS = 2000;
const batchCompile = (group) => { if (!perfOff('bouwklaar')) precompile(group); };
const batchReady = (group) => perfOff('bouwklaar') || meshProgramsReady(group);
function meshProgramsReady(mesh) {
  let ready = true;
  mesh.traverse((o) => {
    if (!ready || !o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const programs = renderer.properties.get(m).programs;
      if (!programs) { ready = false; return; }
      for (const p of programs.values()) if (!p.isReady()) { ready = false; return; }
    }
  });
  return ready;
}

// Streaming budgets (ms per frame) for buildings and roads; a jump of the
// player (teleport, train, respawn) raises them for a moment.
const BUILDING_BUILD_MS = 4;
const BUILDING_BUILD_BOOST_MS = 9;
const ROAD_BUILD_MS = 2.5;
const STREAM_JUMP = 60;
let streamBoostUntil = 0;
// what still waits to be built round the player (the load screen's progress)
const streamStat = { b: 0, r: 0 };
export function streamPending() { return { buildings: streamStat.b, roads: streamStat.r, ahead: performance.now() < streamBoostUntil }; }
let streamLastX = null, streamLastY = 0;
let buildingDetailR = DRAW_DIST;
const FACADE_DETAIL_DIST = { laag: 80 };
let facadeDetailDist = Infinity, facadeDetailCulled = false, facadeQualityDist = Infinity;
// gfxprofile.js cpuLevel (a busy machine): fewer facade details
const CPU_FACADE_DIST = [Infinity, 100, 70, 45];
let shadowFrame = 0;
// no vehicle faster than 4 m/s in (or just next to) the area that casts shadows
function shadowAreaCalm(world, fx, fy) {
  const reach = ACTOR_SHADOW_DIST + 6;
  for (const v of world.vehicles) if (Math.abs(v.speed) > 4 && Math.abs(v.x - fx) < reach && Math.abs(v.y - fy) < reach) return false;
  return true;
}
let focusSpeed = 0;
let roadDetailR = DRAW_DIST;
let buildingsStaged = false;
function noteStreamJump(px, py) {
  if (streamLastX === null || Math.hypot(px - streamLastX, py - streamLastY) > STREAM_JUMP) streamBoostUntil = performance.now() + 1500;
  streamLastX = px;
  streamLastY = py;
}

// Waar het streamen op rijdt: de focus met zijn snelheid en richting
// (streambudget.js), zodat gebouwen, wegen en water in de rijrichting
// voorgaan en de worker de taken krijgt die de speler nu ziet (#247).
// focusSpeed blijft voor de schaduwpas en het personenbereik.
const streamAhead = streamAheadHere();

// Where the world streams in and keeps its detail (buildings, roads, water,
// trees, the far LOD, shadows): the player, or while a camera override is up
// (cutscenes, the trailer, the title screen) the point the camera looks at,
// no further out than tilefocus.js LOOK_MAX from the eye so what is near the lens
// stays detailed too. world.streamFocus carries it for grass.js and
// countryside.js.
const streamFocus = { x: 0, y: 0 };
const lastOverrideFocus = { x: 0, y: 0 };
function updateStreamFocus(world) {
  const o = world.cameraOverride || (world.trainCam && world.trainCam.eye) || null, p = hoofdspeler(world); // de binnencamera van de trein telt mee (traindrive.js), anders blijft de focus hangen
  const cf = cameraFocus(o);
  if (cf) {
    streamFocus.x = lastOverrideFocus.x = cf.x;
    streamFocus.y = lastOverrideFocus.y = cf.y;
  } else if (overrideBlend > 0) {
    // easing back out of a cutscene: follow the camera home
    const t = overrideBlend * overrideBlend * (3 - 2 * overrideBlend);
    streamFocus.x = p.x + (lastOverrideFocus.x - p.x) * t;
    streamFocus.y = p.y + (lastOverrideFocus.y - p.y) * t;
  } else {
    streamFocus.x = p.x;
    streamFocus.y = p.y;
  }
  world.streamFocus = streamFocus;
  return streamFocus;
}

// Prewarm: build the buildings around a place the camera is about to go
// (a cutscene's prewarm, and the start area: main.js hands the spawn point to
// the boot screen) ahead of time, nearest first within a frame budget, so the
// first frames there are not the far LOD.
const PREWARM_MS = 3;
const PREWARM_R = 110;
let prewarmSpots = [];
export function prewarmStreamAt(x, y, secs = 4, radius = PREWARM_R) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const until = performance.now() + secs * 1000;
  prewarmSpots = prewarmSpots.filter((s) => Math.hypot(s.x - x, s.y - y) > 25 && s.until > performance.now());
  prewarmSpots.push({ x, y, r: Math.max(30, radius), until, list: null, i: 0, done: false });
  prewarmRailAt(x, y);
}
function nearPrewarm(b) {
  const cx = (b.bounds[0] + b.bounds[2]) / 2, cy = (b.bounds[1] + b.bounds[3]) / 2;
  for (const s of prewarmSpots) if (Math.hypot(cx - s.x, cy - s.y) <= s.r + 10) return true;
  return false;
}
function stepPrewarm(world) {
  if (!prewarmSpots.length) return;
  const now = performance.now();
  prewarmSpots = prewarmSpots.filter((s) => s.until > now);
  const end = now + PREWARM_MS;
  for (const s of prewarmSpots) {
    if (s.done) continue;
    if (!s.list) {
      s.list = world.map.buildingsNear(s.x, s.y, s.r).filter((b) => !b.landmark)
        .map((b) => [Math.hypot((b.bounds[0] + b.bounds[2]) / 2 - s.x, (b.bounds[1] + b.bounds[3]) / 2 - s.y), b])
        .sort((a, b) => a[0] - b[0]);
      s.i = 0;
    }
    while (s.i < s.list.length) {
      if (performance.now() > end) return;
      const b = s.list[s.i++][1];
      if (buildingMeshes.has(b) || prefetchedBuildings.has(b)) continue;
      const mesh = makeBuildingMesh(b);
      precompile(mesh);
      prefetchedBuildings.set(b, mesh);
    }
    // keep the spot until it expires: nearPrewarm protects these prefetched
    // buildings until the camera is there
    s.done = true;
  }
}

// How many of the prewarmed buildings are still to be built. The boot screen
// (main.js) waits for this and for streamPending() before it lets the player in,
// so the first seconds in the start area have no mesh building on the main thread.
export function prewarmPending() {
  let n = 0;
  for (const s of prewarmSpots) {
    if (s.done) continue;
    if (!s.list) { n++; continue; } // the list is built on the next update3D
    for (const [, b] of s.list) if (!buildingMeshes.has(b) && !prefetchedBuildings.has(b)) n++;
  }
  return n;
}

// Compile (and link) every shader program the scene uses now, while the boot
// screen is still up: the first frames after the start screen used to stall on
// the first use of each program (#247, the 18 s of WebGLUniforms in the boot
// profile). Returns the time it took, for window.__loadMarks.
export function precompilePrograms() {
  const t0 = performance.now();
  try { if (renderer && scene && cam) precompile(scene); } catch (e) { console.warn('shaders voorcompileren', e); }
  return performance.now() - t0;
}

const BUILDING_PREFETCH = 30;
const BUILDING_PREFETCH_MS = 1.5;
const prefetchedBuildings = new Map();
function makeBuildingMesh(b) {
  const mesh = enableShadows(buildBuildingMesh(b), true, 2.5);
  if (liftMap && liftMap.terrainOn) mesh.position.y += buildingLift(liftMap, b);
  if (isSkyline(b)) useSkylineMaterials(mesh);
  freezeStatic(mesh);
  return mesh;
}

const isSkyline = (b) => b.landmarkKind === 'tower';
function landmarkDist() {
  return viewDist > DRAW_DIST + 20 ? Math.min(1500, viewDist * 3) : DRAW_DIST;
}

// Landmarks stay readable on the skyline: their fog is capped at 55% up to
// fog.far and only fades out completely at 3x fog.far.
const skylineMats = new Map();
function skylineMaterial(m) {
  let s = skylineMats.get(m);
  if (!s) {
    s = m.clone();
    s.userData.shared = true;
    const prev = m.onBeforeCompile;
    s.onBeforeCompile = (shader, r) => {
      if (prev) prev.call(s, shader, r);
      shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `#ifdef USE_FOG
  float skyFog = min(smoothstep(fogNear, fogFar, vFogDepth), 0.55 + 0.4 * smoothstep(fogFar, fogFar * 3.0, vFogDepth));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, skyFog);
#endif`);
    };
    s.customProgramCacheKey = () => (m.customProgramCacheKey ? m.customProgramCacheKey() : '') + 'skyline';
    skylineMats.set(m, s);
  }
  return s;
}
function useSkylineMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(skylineMaterial) : skylineMaterial(o.material);
  });
}

// Create/remove bookkeeping for water polygons: never disposes
// the mesh's material since every water mesh shares the ONE waterMaterial.
// First-time water/shore builds of polygons still far out in the fog are
// spread over frames; anything within the detail radius is built at once.
const WATER_BUILD_BUDGET_MS = 3;
// past the budget only water this close is still built at once
const WATER_NEAR = 45;

// Streamed-out roads and water keep their cached geometry (on the map item)
// for a cheap way back, up to a bound: beyond it the least recently shown
// are freed and rebuilt on demand, so GPU memory stays flat however far
// the player (or the trailer) travels.
const ROAD_CACHE_MAX = 700;
const WATER_CACHE_MAX = 80;
const coldRoads = new Map();
const coldWater = new Map();
function coolDown(cold, item, max, free) {
  cold.delete(item);
  cold.set(item, true);
  while (cold.size > max) {
    const old = cold.keys().next().value;
    cold.delete(old);
    free(old);
  }
}
function freeRoadGeometry(r) {
  for (const k of ['_geoSidewalk', '_geoRoad', '_geoMark']) if (r[k]) { r[k].dispose(); r[k] = null; }
  r._geoMarkQ = undefined;
  // De civiele werken van deze weg (brugdek, talud, muur) hingen aan _geoStruct/_geoOverDeck
  // en werden nooit vrijgegeven: op een lange rit langs verhoogde wegen liep het GPU-geheugen op
  // (#588). Alleen de geometry's, want de materialen zijn gedeeld (roadstructures3d.js mats); bij
  // terugkomst van de tegel worden de werken opnieuw gebouwd.
  for (const k of ['_geoStruct', '_geoOverDeck']) {
    const g = r[k];
    if (g) disposeStructureGeometries(g);
    r[k] = undefined;
  }
}
function freeWaterGeometry(poly) {
  if (poly._geoWater) { poly._geoWater.dispose(); poly._geoWater = null; }
  if (poly._shore) poly._shore.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  poly._shore = undefined;
}

const _waterSeen = new Set();
// #651: water had als enige sync-lus geen idle-guard. Zelfde patroon als de
// wegen: alleen overslaan als de waterversie, het aantal meshes, de kijkafstand
// en de focus niet veranderden en het spel loopt; het record wordt alleen na een
// volledige pas gezet, zodat de frame-ontsnapping echt werkt.
const WATER_SYNC_IDLE_FRAMES = 6;
let waterSyncIdle = null, waterSyncFrame = 0;
function waterIdle(world, px, py) {
  waterSyncFrame++;
  const id = waterSyncIdle;
  if (!id || perfOff('watersync')) return false;
  return id.ver === (world.map._waterVer || 0) && id.size === waterMeshes.size && id.dist === DRAW_DIST
    && id.view === viewDist && document.body.classList.contains('game-started')
    && waterSyncFrame - id.frame < WATER_SYNC_IDLE_FRAMES
    && Math.hypot(px - id.x, py - id.y) < SYNC_IDLE_MOVE;
}
function syncWater(items, cache, y, map, px, py) {
  const seen = _waterSeen;
  seen.clear();
  for (const poly of items) seen.add(poly);
  // Nieuw water in de rijrichting eerst (#247): bij 30 m/s komt de oever anders
  // achter de speler aan. Binnen het budget van dit frame, zoals voorheen.
  const todo = [];
  for (const poly of items) if (!cache.has(poly)) todo.push(poly);
  if (todo.length > 1) {
    const rank = new Map();
    for (const poly of todo) rank.set(poly, streamRank(streamAhead, (poly.bounds[0] + poly.bounds[2]) / 2, (poly.bounds[1] + poly.bounds[3]) / 2));
    todo.sort((a, b) => rank.get(a) - rank.get(b));
  }
  const deadline = performance.now() + WATER_BUILD_BUDGET_MS;
  for (const poly of todo) {
    if (performance.now() > deadline) {
      const [minx, miny, maxx, maxy] = poly.bounds;
      if (Math.hypot(Math.max(minx - px, 0, px - maxx), Math.max(miny - py, 0, py - maxy)) > WATER_NEAR) continue;
    }
    coldWater.delete(poly);
    const mesh = freezeStatic(buildWaterMesh(poly, y, map));
    if (!mesh.name) mesh.name = 'water';
    scene.add(mesh);
    cache.set(poly, mesh);
    if (cache === waterMeshes && mesh.userData.shore) registerShoreItems(poly, mesh.userData.shore);
  }
  for (const [poly, mesh] of cache) {
    if (seen.has(poly)) continue;
    scene.remove(mesh);
    cache.delete(poly);
    if (cache === waterMeshes) dropShoreItems(poly);
    coolDown(coldWater, poly, WATER_CACHE_MAX, freeWaterGeometry);
  }
  // pas hier het record: alleen na een volledige pas, zodat de frame-ontsnapping
  // van waterIdle echt werkt (#651)
  if (cache === waterMeshes) waterSyncIdle = { x: px, y: py, ver: map._waterVer || 0, size: cache.size, dist: DRAW_DIST, view: viewDist, frame: waterSyncFrame };
}

let roadQuality = getRoadQualityVersion();
const openSpans = new Set();
const _roadSeen = new Set();
let bridgeViews = false;
// An idle road pass is skipped, mirroring the building guard (syncBuildings): the
// grid query, the Set and the missing list cost time every frame while nothing
// changes. Two extra conditions make it safe for the load screen (0.56.1 hung on a
// guard that did not have them): the last full pass must have found nothing left
// to build (`streamStat.r === 0`, the counter the load screen waits on) and the
// game must already be running (`game-started`), so boot and load screens never
// take the shortcut. The record is refreshed only after a full pass, so
// ROAD_SYNC_IDLE_FRAMES really bounds the skip; ?perfoff=wegsync turns the guard
// off for the A/B measurement. See docs/PERF-LAADHANG-0.56.1.md (#553).
const ROAD_SYNC_IDLE_FRAMES = 6;
let roadSyncIdle = null, roadSyncFrame = 0;
// #804: teller voor de wegopbouw (meetbaar in de perf-harness en tests)
export const roadSyncStats = { frames: 0, built: 0, maxPerFrame: 0, lastMs: 0, deadlineStops: 0, heavyBuilt: 0, heavyDeferred: 0 };
function syncRoads(world, px, py) {
  probe.mark('roads-entry');
  setRoadNetwork(world.map);
  probe.mark('roads-net');
  if (roadQuality !== getRoadQualityVersion()) {
    roadQuality = getRoadQualityVersion();
    for (const mesh of roadMeshes.values()) scene.remove(mesh);
    roadMeshes.clear();
  }
  roadSyncFrame++;
  if (roadSyncIdle && !perfOff('wegsync') && streamStat.r === 0
    && document.body.classList.contains('game-started')
    && !openSpans.size && !world.quake && roadSyncIdle.q === roadQuality && roadSyncIdle.dist === DRAW_DIST
    && roadSyncIdle.meshes === roadMeshes.size && roadSyncIdle.geoVer === world.map.geoVer && roadSyncFrame - roadSyncIdle.frame < ROAD_SYNC_IDLE_FRAMES
    && Math.hypot(px - roadSyncIdle.x, py - roadSyncIdle.y) < SYNC_IDLE_MOVE) return;
  roadSyncIdle = null;
  const view = world.map.roadsNear(px, py, DRAW_DIST);
  probe.mark('roads-query');
  const seen = _roadSeen;
  seen.clear();
  for (const r of view) seen.add(r);
  // nearest first within a budget; the far LOD's roads cover the rest. At speed
  // what lies ahead goes first (#247): the same lead streambudget.js gives the
  // buildings, so a road 100 m ahead beats one 20 m behind.
  const missing = [];
  for (const r of view) {
    if (roadMeshes.has(r)) continue;
    const [x0, y0, x1, y1] = r.bounds || [px, py, px, py];
    const d = Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    missing.push([streamRank(streamAhead, cx, cy), r, d, streamNear(streamAhead, cx, cy, DRAW_DIST)]);
  }
  if (missing.length) {
    missing.sort((a, b) => a[0] - b[0]);
    const t0 = performance.now();
    const boosted = t0 < streamBoostUntil;
    const deadline = t0 + (boosted ? ROAD_BUILD_MS * 2 : ROAD_BUILD_MS);
    const cap = boosted ? ROAD_BUILD_MAX_PER_FRAME * 2 : ROAD_BUILD_MAX_PER_FRAME;
    let built = 0, waiting = false;
    for (const [, r, , near] of missing) {
      // surfaces still coming from the geometry worker: the far LOD covers
      // from the nearest of them on. The request goes out here (best first),
      // also for the roads past the first one still waiting, so the worker
      // already has the next ones when the near ones come back (#247).
      const ready = roadGeometryReady(r, near);
      if (waiting) continue;
      if (!ready) { waiting = true; continue; }
      // #804: de deadline en een harde cap gelden voor élke weg, ook de
      // "goedkope" met kant-en-klare surfaces; anders bouwde één frame de
      // hele ring (3d:roads-piek 0,9-1,7 s). Eén weg mag altijd, zodat de
      // streaming vooruit blijft.
      // #804: een heavy weg (kant-en-klare surfaces ontbreken of de civiele werken
      // worden hier gebouwd) kost honderden ms. Bouw die alleen op een verder leeg
      // frame: geen andere weg dit frame en bijna niets meer te streamen. Anders
      // schuift hij door naar een volgend frame (heavyDeferred).
      const heavy = !r._geoRoad || (r.z && r._geoStruct === undefined);
      if (heavy && (built > 0 || streamStat.r > 2)) { roadSyncStats.heavyDeferred++; continue; }
      if (!roadBuildAllowed(built, performance.now(), deadline, cap)) { roadSyncStats.deadlineStops++; break; }
      if (heavy) roadSyncStats.heavyBuilt++;
      coldRoads.delete(r);
      probe.mark('road-build-start');
      const group = buildRoadGroup(r);
      probe.mark('road-build');
      const mesh = freezeStatic(world.map.terrainOn ? liftRoadGroup(group, world.map, r) : group);
      probe.mark('road-lift');
      if (!mesh.name) mesh.name = 'road';
      scene.add(mesh);
      roadMeshes.set(r, mesh);
      probe.mark('road-add');
      built++;
    }
    // De detailring is een cirkel (de verre LOD tekent vanaf roadDetailR), dus
    // hij reikt tot de dichtstbijzijnde weg die nog mist; met de
    // vooruit-volgorde is dat niet per se de weg waar de lus stopte (#247).
    roadDetailR = DRAW_DIST;
    streamStat.r = 0;
    for (const m of missing) {
      if (roadMeshes.has(m[1])) continue;
      streamStat.r++;
      roadDetailR = Math.min(roadDetailR, m[2]);
    }
    roadDetailR = Math.max(24, roadDetailR);
    roadSyncStats.frames++;
    roadSyncStats.built += built;
    roadSyncStats.maxPerFrame = Math.max(roadSyncStats.maxPerFrame, built);
    roadSyncStats.lastMs = performance.now() - t0;
  } else {
    streamStat.r = 0;
    roadDetailR = DRAW_DIST;
  }
  for (const [r, mesh] of roadMeshes) {
    if (seen.has(r)) continue;
    scene.remove(mesh); // geometry is cached on the road, materials are shared per layer
    roadMeshes.delete(r);
    coolDown(coldRoads, r, ROAD_CACHE_MAX, freeRoadGeometry);
  }
  // Remember a finished pass, and only here: a record written every frame would
  // keep the frame escape above permanently true (that was the 0.56.1 bug).
  if (streamStat.r === 0) roadSyncIdle = { x: px, y: py, q: roadQuality, dist: DRAW_DIST, meshes: roadMeshes.size, frame: roadSyncFrame, geoVer: world.map.geoVer };
}

function syncTrees(world, px, py) {
  const map = world.map;
  // #786: een kaartwissel is een nieuwe bron; de eerste frame bouwt gewoon op
  if (map !== treeSyncMap) { treeSyncMap = map; treeSyncX = treeSyncY = null; treeSyncGeoVer = undefined; }
  const hiddenChanged = camTreeHiddenKey !== shownHiddenKey;
  // #760: de due-check vóór de treesNear-query. De query (rasterwandeling, nieuwe
  // array en filter) was zelf de vaste per-frame kost; zonder beweging (> 8 m),
  // zonder gestroomde tegel (#786) en zonder gewijzigde verborgen-set kan de
  // boomlijst niet veranderen, dus valt er niets te queryen of te herbouwen.
  if (!treeSyncDue(px, py, treeSyncX, treeSyncY, hiddenChanged, map.geoVer, treeSyncGeoVer)) return;
  // the trees round the player, and further out the crowns of the woods
  // #760: dezelfde query in een herbruikbuffer i.p.v. een nieuwe array per aanroep
  const n = map.treeGrid.queryRadiusInto(_treeQuery, px, py, TREE_FAR);
  const trees = [];
  for (let i = 0; i < n; i++) {
    const t = _treeQuery[i];
    if (t._broken) continue;
    if (Math.abs(t[0] - px) <= TREE_DIST && Math.abs(t[1] - py) <= TREE_DIST && Math.hypot(t[0] - px, t[1] - py) <= TREE_DIST) trees.push(t);
    else if (t[4] & TREE_FLAG.fill) trees.push(t);
  }
  if (!hiddenChanged && trees.length === shownTrees.length && trees.every((t, i) => t === shownTrees[i])) {
    treeSyncX = px; treeSyncY = py; treeSyncGeoVer = map.geoVer;
    return;
  }
  shownTrees = trees;
  treeSyncX = px; treeSyncY = py;
  treeSyncGeoVer = map.geoVer;
  shownHiddenKey = camTreeHiddenKey;
  ensureTreeCapacity(trees.length);
  const [trunks, crowns, cones, far] = treeInstanced;
  for (const m of treeInstanced) m.count = 0;
  crownShadowOnly.count = 0;
  const [trunk, canopy, lobe] = _treeParts;
  const put = (m, part, color) => {
    part.updateMatrix();
    m.setMatrixAt(m.count, _treeMatrix.multiplyMatrices(_treeGroup.matrix, part.matrix));
    m.setColorAt(m.count++, color);
  };
  for (const t of trees) {
    _treeGroup.position.set(t[0], world.map.terrainOn ? world.map.terrainAt(t[0], t[1]) : 0, t[1]);
    _treeGroup.updateMatrix();
    const d = layoutTree(t, trunk, canopy, lobe);
    treeColor(t, _leaf);
    const near = Math.hypot(t[0] - px, t[1] - py) <= TREE_DIST;
    if (!near) {
      // far: the crown only, no shadow
      put(far, canopy, _leaf);
      continue;
    }
    _bark.setHex(SPECIES[d.sp].trunk);
    put(trunks, trunk, _bark);
    const hideCrown = camTreeHidden.includes(t) && crownShadowOnly.count < CROWN_SHADOW_CAP - 1;
    if (hideCrown) {
      for (const part of d.lr > 0 ? [canopy, lobe] : [canopy]) {
        part.updateMatrix();
        crownShadowOnly.setMatrixAt(crownShadowOnly.count++, _treeMatrix.multiplyMatrices(_treeGroup.matrix, part.matrix));
      }
      continue;
    }
    put(d.cone ? cones : crowns, canopy, _leaf);
    if (d.lr > 0) put(crowns, lobe, _leaf);
  }
  crownShadowOnly.instanceMatrix.needsUpdate = true;
  crownShadowOnly.computeBoundingSphere();
  for (const m of treeInstanced) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }
}

function syncActors(list, cache, builder, idOf, seen = new Set()) {
  seen.clear();
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

// --- pedestrian streaming ------------------------------------------------
// Peds never pop: they spawn out of sight (pedestrians.js asks world.pedView),
// fade in/out with a screen-door dither, thin out towards DRAW_DIST, and
// their meshes (~2 ms each) are built a few per frame instead of in bursts.
const _wildlifeNear = [], _wildlifeSeen = new Set();
const FADE_STEPS = 16;
const PED_FADE_TIME = 0.6;
const PED_EDGE_FADE = 14;
const PED_BUILD_BUDGET_MS = 2.5;
// a jump builds the people round the player at once, up to this much more
const PED_INSTANT_EXTRA_MS = 6;
const PED_JUMP_DIST = 40;
const PED_RANGE_FAST = 90, PED_RANGE_FROM = 12, PED_RANGE_SLOPE = 6;
const pedFadingOut = [];
const fadeVariants = new Map();
let pedClock = 0;
let pedInstantUntil = 0;
let pedLastX = null, pedLastY = null;
let pedFadeWarmed = false;

// Clones share one program per base material (same cache key); only the
// uFade value differs, and three.js uploads it whenever the material switches.
function fadeMaterial(base, level) {
  let arr = fadeVariants.get(base);
  if (!arr) fadeVariants.set(base, arr = []);
  let m = arr[level];
  if (m) return m;
  m = base.clone();
  m.userData.shared = true;
  m.userData.fadeOf = base;
  const uFade = { value: level / FADE_STEPS };
  const prev = base.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(m, shader, r);
    shader.uniforms.uFade = uFade;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform float uFade;
float pedBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float pedBayer4(vec2 a) { return pedBayer2(0.5 * a) * 0.25 + pedBayer2(a); }
void main() {
  if (pedBayer4(gl_FragCoord.xy) >= uFade) discard;`);
  };
  m.customProgramCacheKey = () => (base.customProgramCacheKey ? base.customProgramCacheKey() : '') + '|pedfade';
  arr[level] = m;
  return m;
}

function applyPedFade(mesh, fade) {
  const level = fade >= 1 ? FADE_STEPS : Math.max(0, Math.min(FADE_STEPS - 1, Math.round(fade * FADE_STEPS)));
  const ud = mesh.userData;
  if (ud.fadeLevel === level) return;
  ud.fadeLevel = level;
  mesh.visible = level > 0;
  if (level === 0) return;
  mesh.traverse((o) => {
    if (!o.material || Array.isArray(o.material)) return;
    const base = o.material.userData.fadeOf || o.material;
    o.material = level >= FADE_STEPS ? base : fadeMaterial(base, level);
  });
}

function disposePedMesh(mesh) {
  applyPedFade(mesh, 1);
  scene.remove(mesh);
  // #658/#788: disposeObject geeft ook de gedeelde rompgeometrie terug (de laatste gebruiker
  // van een geëvictte template ruimt hem op)
  disposeObject(mesh);
}

const _pedFrustum = new THREE.Frustum();
const _pedProj = new THREE.Matrix4();
const _pedSphere = new THREE.Sphere(new THREE.Vector3(), 1.4);
let pedViewStamp = -1;
function pedInView(x, y) {
  if (pedViewStamp !== pedClock) {
    pedViewStamp = pedClock;
    cam.updateMatrixWorld();
    _pedProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    _pedFrustum.setFromProjectionMatrix(_pedProj);
  }
  const fogFar = scene.fog ? scene.fog.far : DRAW_DIST;
  if (Math.hypot(x - cam.position.x, y - cam.position.z) > Math.min(DRAW_DIST - PED_EDGE_FADE, fogFar * 0.85)) return false;
  _pedSphere.center.set(x, 0.9, y);
  return _pedFrustum.intersectsSphere(_pedSphere);
}
const pedView = { inView: pedInView, camX: 0, camY: 0 };

function buildPedActor(p) {
  // stable per-ped look, so a ped doesn't change clothes when it streams back in
  if (p._lookSeed === undefined) p._lookSeed = Math.random() * 1000;
  const mesh = buildPersonActor(p.clothing ? colorFromHex(p.clothing) : 0xcaa46a, p.skin ? colorFromHex(p.skin) : 0xe0b48a, p.look ? { seed: p._lookSeed, look: p.look } : { seed: p._lookSeed });
  if (p.carry) attachCarry(mesh, p.carry);
  return enableShadows(mesh, false);
}

// how many frames a walker's pose stays: 1 (every frame), 2 or 4. Manhattan distance to the player in metres (a Euclid distance of up to 1.4 less).
const PED_TIER_2 = 55, PED_TIER_4 = 130;
function pedTier(manhattan, p, now) {
  if (p.ragdoll || p.pose || p.carry || p.party || p.heldWeapon || p.attackFx || p.hitReact || p.greetUntil > now) return 1;
  if (perfOff('pedtier')) return simLevel() && manhattan > 45 ? 2 : 1;
  return manhattan > PED_TIER_4 ? 4 : manhattan > PED_TIER_2 ? 2 : 1;
}
// a held pose is not worked out again by three.js (Skeleton.update) and not uploaded: the bone texture stays as it was
function holdSkeleton(mesh, hold) {
  const body = mesh.userData.body;
  const sk = body && body.skeleton;
  if (!sk) return;
  if (!sk.__held) {
    sk.__held = { hold: false, real: sk.update };
    sk.update = function () { if (!this.__held.hold) this.__held.real.call(this); };
  }
  sk.__held.hold = hold;
}
// Een vrijgezellenfeestje (vrijgezellen.js, #403): een waggelende looppas (de figuur kantelt zijwaarts om zijn lengteas en schommelt een beetje
// opzij) en af en toe een juichbeurt met beide armen omhoog (p.cheerFrom..cheerUntil, gezet door streetlife.js).
function partyPose(mesh, p, now) {
  if (mesh.rotation.order !== 'YXZ') mesh.rotation.order = 'YXZ';
  const w = waggel(now, p.waggelSeed || 0, p.speed || 0);
  mesh.rotation.x = w.kantel;
  mesh.position.x += -Math.sin(p.angle) * w.zij;
  mesh.position.z += Math.cos(p.angle) * w.zij;
  if (p.cheerUntil > now && now >= (p.cheerFrom || 0)) {
    const k = juichSterkte(now, p.cheerUntil);
    const h = juichHoek(now, k);
    juichOverlay(mesh, now, h.links, h.rechts, h.spring, k);
  }
}
function syncPedestrianMeshes(world, player, animDt) {
  pedClock += animDt || 1e-4;
  pedView.camX = cam.position.x;
  pedView.camY = cam.position.z;
  world.pedView = pedView;
  if (pedLastX === null || Math.hypot(player.x - pedLastX, player.y - pedLastY) > PED_JUMP_DIST) pedInstantUntil = pedClock + 0.3;
  pedLastX = player.x;
  pedLastY = player.y;
  const instant = pedClock < pedInstantUntil || world.cinematicHidePlayers;

  // fast travel (a car on the A7, the heli, a train): people beyond ~90 m go by in a second and their meshes (~3 ms
  // each to build) were a turnover of dozens a second; the range closes from 14 m/s on and opens again when it slows
  const pedRange = perfOff('persoonsbereik') ? DRAW_DIST : Math.max(Math.min(DRAW_DIST, PED_RANGE_FAST), DRAW_DIST - Math.max(0, focusSpeed - PED_RANGE_FROM) * PED_RANGE_SLOPE);
  const seen = new Set();
  const deadline = performance.now() + PED_BUILD_BUDGET_MS;
  let built = 0;
  for (const p of world.pedestrians) {
    if (Math.hypot(p.x - player.x, p.y - player.y) >= pedRange) continue;
    seen.add(p);
    if (pedMeshes.has(p)) continue;
    const over = built > 0 && performance.now() > deadline;
    if (over && (!instant || performance.now() > deadline + PED_INSTANT_EXTRA_MS)) continue;
    const mesh = buildPedActor(p);
    mesh.userData.fade = (instant && !over) || p.noFade ? 1 : 0;
    scene.add(mesh);
    pedMeshes.set(p, mesh);
    built++;
  }
  for (const [p, mesh] of pedMeshes) {
    if (seen.has(p)) continue;
    pedMeshes.delete(p);
    if (instant || !mesh.visible) disposePedMesh(mesh);
    else pedFadingOut.push(mesh);
  }

  // one frame of the dithered variants while the scene still spawns in, so
  // their shaders compile during loading rather than at the first fade
  const warm = !pedFadeWarmed && pedMeshes.size > 0;
  if (warm) pedFadeWarmed = true;

  for (const p of world.pedestrians) {
    const mesh = pedMeshes.get(p);
    if (!mesh) continue;
    const ud = mesh.userData;
    ud.fade = Math.min(1, ud.fade + animDt / PED_FADE_TIME);
    const edge = (pedRange - Math.hypot(p.x - player.x, p.y - player.y)) / PED_EDGE_FADE;
    applyPedFade(mesh, warm ? (FADE_STEPS - 1) / FADE_STEPS : Math.min(ud.fade, edge));
    if (p.gibbed) { mesh.visible = false; continue; }
    if (p.hideMesh) { mesh.visible = false; ud.fadeLevel = -1; continue; } // fierljep.js draws its own actor
    if (driveRagdoll(p, mesh, world, animDt)) continue;
    if (p.state === 'dead') {
      // topple backwards over ~0.3s, then lie flat until the ped is removed
      const fall = Math.min(1, (world.time - (p.deadUntil - DEAD_DURATION)) / 0.3);
      mesh.position.set(p.x, 0.14 * fall + (p.gz || 0), p.y);
      mesh.rotation.set(0, -p.angle, fall * fall * Math.PI / 2);
      ud.shadow.visible = false;
      animatePersonWalk(mesh, 0, animDt);
      continue;
    }
    mesh.position.set(p.x, p.gz || 0, p.y);
    mesh.rotation.y = -p.angle;
    if (ud.pedScale !== MODS.pedScale) { mesh.scale.setScalar(MODS.pedScale); ud.pedScale = MODS.pedScale; }   // Kleine mensjes (cheat)
    // a plain walker out of the frame (last frame's cull, scene3d.js cullOffscreenActors) is not posed: its walk phase waits
    if (ud.offscreen && !p.ragdoll && !p.pose && !p.carry && !p.heldWeapon && !p.attackFx && !p.hitReact && !(p.greetUntil > world.time) && !perfOff('actoren')) continue;
    // far walkers animate at a lower rate (every 2nd frame beyond ~40 m, every 4th beyond ~90 m; walking and not posed otherwise): a person is a
    // skinned mesh whose bones the renderer works out and uploads as a texture at every draw (~20 GL calls a person), and most of the people in the
    // ring are far (?perfoff=pedtier: as before, half rate beyond 45 m only on a CPU-bound machine, simload.js)
    const tier = pedTier(Math.abs(p.x - player.x) + Math.abs(p.y - player.y), p, world.time);
    if (tier > 1) {
      ud.animAcc = (ud.animAcc || 0) + animDt;
      ud.animTick = (ud.animTick || 0) + 1;
      if (ud.tickPhase === undefined) ud.tickPhase = Math.floor(ud.animOffset || 0) & 3;
      if ((ud.animTick + ud.tickPhase) % tier) { holdSkeleton(mesh, true); continue; }
      holdSkeleton(mesh, false);
      animatePersonWalk(mesh, p.speed || 0, ud.animAcc);
      ud.animAcc = 0;
    } else { holdSkeleton(mesh, false); animatePersonWalk(mesh, p.speed || 0, animDt); }
    if (p.carry && !p.pose) carryPose(mesh, p.carry);
    // a road-rager (roadrage.js) holds what he brought and swings it
    if ((p.heldWeapon || null) !== (ud.pedHeld || null)) { ud.pedHeld = p.heldWeapon || null; setHeldWeapon(mesh, ud.pedHeld); }
    if (p.heldWeapon || p.attackFx) applyAttackPose(mesh, p.attackFx, world.time, null);
    if (p.greetUntil > world.time) {
      const left = p.greetUntil - world.time;
      waveOverlay(mesh, world.time + (p._lookSeed || 0), Math.min(1, left / 0.3, (2.4 - left) / 0.3));
    }
    if (p.hitReact) applyHitReaction(mesh, p.hitReact, world.time, p.angle);
    if (p.party) partyPose(mesh, p, world.time);
  }

  for (let i = pedFadingOut.length - 1; i >= 0; i--) {
    const mesh = pedFadingOut[i];
    mesh.userData.fade = Math.min(mesh.userData.fade, 1) - animDt / PED_FADE_TIME;
    if (instant || mesh.userData.fade <= 0) {
      disposePedMesh(mesh);
      pedFadingOut.splice(i, 1);
    } else applyPedFade(mesh, mesh.userData.fade);
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
  const ui = getUiScale(); // #hud is zoomed by the HUD scale
  return {
    x: (_projVec.x * 0.5 + 0.5) * renderer.domElement.clientWidth / ui,
    y: (1 - (_projVec.y * 0.5 + 0.5)) * renderer.domElement.clientHeight / ui,
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
  // world.extraSpeakers: short-lived lines from boat crews and swimmers,
  // { x, y, h, speechText, speechUntil, follow? } (follow: a moving vehicle)
  const extra = world.extraSpeakers;
  if (extra) for (let i = extra.length - 1; i >= 0; i--) if (world.time >= extra[i].speechUntil) extra.splice(i, 1);
  const speakers = extra && extra.length ? [...world.pedestrians, ...extra] : world.pedestrians;
  for (const p of speakers) {
    if (!p.speechText || world.time >= p.speechUntil) { if (p._voicedText) p._voicedText = null; continue; }
    seen.add(p);
    let el = speechBubbleEls.get(p);
    if (!el) { el = speechBubbleEl(); speechBubbleEls.set(p, el); }
    const src = p.follow || p;
    // a new bubble speaks its recording (if any) in a voice matching the model
    if (p._voicedText !== p.speechText) {
      p._voicedText = p.speechText;
      const ud = pedMeshes.get(p)?.userData;
      if (ud) p.female = !!ud.female;
      else if (p.female === undefined) p.female = Math.random() < 0.5;
      speakBubble(p.speechText, p.female, { x: src.x, y: src.y });
    }
    const scr = projectToScreen(src.x, p.h ?? 2.1, src.y);
    if (!scr) { el.style.display = 'none'; continue; }
    if (el._text !== p.speechText) {
      el._text = p.speechText;
      setDualText(el, p.speechText);
      // story characters (the companion, Jelle) carry their name: world.extraSpeakers speechName
      if (p.speechName) el.insertAdjacentHTML('afterbegin', speakerHtml(p.speechName).replace('class="spk"', 'class="spk bubble"'));
    }
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
  // animations freeze with gameplay (pause, cutscenes); the camera keeps using dt
  const animDt = world.paused ? 0 : dt;
  const player = hoofdspeler(world);
  const focus = updateStreamFocus(world);

  noteStreamJump(focus.x, focus.y);
  // de focus, zijn snelheid en zijn richting (#247): alles hieronder bouwt en
  // vraagt in die volgorde; de worker krijgt per frame een nieuwe beurt
  noteStreamFocus(focus.x, focus.y, dt);
  focusSpeed = streamAhead.speed;
  geoFrame();
  initBlobPool();
  stepPrewarm(world);
  syncBuildings(world, focus.x, focus.y);
  if (!NO_BATCH) {
    buildingBatcher.update({ scene, meshes: buildingMeshes, hidden: hiddenBuildings, px: focus.x, py: focus.y, detailR: buildingDetailR, drawDist: DRAW_DIST,
      withDetail: facadeDetailDist >= DRAW_DIST, compile: batchCompile, ready: batchReady, budgetMs: performance.now() < streamBoostUntil ? 1 : 3 });
    if (facadeDetailDist < DRAW_DIST) {
      facadeBatcher.update({ scene, meshes: buildingMeshes, hidden: hiddenBuildings, px: focus.x, py: focus.y, detailR: Math.min(facadeDetailDist, buildingDetailR), drawDist: DRAW_DIST,
        withDetail: true, compile: batchCompile, ready: batchReady, budgetMs: 1 });
    } else facadeBatcher.clear();
  }
  drawHub.syncMaterials();
  probe.mark('3d:buildings');
  setCutMaskCenter(focus.x, focus.y, DRAW_DIST - 6);
  updatePortals(focus.x, focus.y);
  updateGrass(dt, world, cam, DRAW_DIST);
  probe.mark('3d:grass');
  if (!waterIdle(world, focus.x, focus.y)) {
    syncWater(waterNearDrawn(world.map, focus.x, focus.y, Math.max(DRAW_DIST, viewDist)), waterMeshes, WATER_Y, world.map, focus.x, focus.y);
  }
  const waterNight = world.dayNight ? world.dayNight.night : 0;
  updateWaterMaterial(waterMaterial, world.time, world.weather ? world.weather.intensity : 0, waterNight, seaExtra(world));
  updateShore(waterNight, cam);
  if (!NO_BATCH) shoreBatcher.update({ scene, meshes: shoreItems, hidden: null, px: focus.x, py: focus.y, detailR: Math.max(DRAW_DIST, viewDist), drawDist: Math.max(DRAW_DIST, viewDist), withDetail: true, compile: batchCompile, ready: batchReady, budgetMs: 2 });
  probe.mark('3d:water');
  if (world.map.terrainOn) {
    if (!reliefPatches) reliefPatches = new ReliefPatches(scene);
    reliefPatches.sync(world);
  }
  syncRoads(world, focus.x, focus.y);
  // movable bridges (movablebridges3d.js): the static road of a span that is
  // not lying closed is hidden and left out of the road batches
  if (!bridgeViews) { initMovableBridges3D(scene, world.map); bridgeViews = true; }
  syncMovableBridges3D(focus.x, focus.y, world.map);
  openBridgeRoads(openSpans);
  if (!NO_BATCH) roadBatcher.update({ scene, meshes: roadMeshes, hidden: openSpans.size ? openSpans : null, px: focus.x, py: focus.y, detailR: DRAW_DIST, drawDist: DRAW_DIST, withDetail: true, compile: batchCompile, ready: batchReady, budgetMs: 3 });
  for (const b of getMovableBridges()) { const m = roadMeshes.get(b.r); if (m) m.visible = !openSpans.has(b.r); }
  updateMovableBridges3D(focus.x, focus.y, waterNight);
  updateSluizen3D(scene, focus.x, focus.y, waterNight);
  if (!world.cinemaLean) updateStreetFurniture3D(focus.x, focus.y);
  probe.mark('3d:roads');
  syncTrees(world, focus.x, focus.y);
  probe.mark('3d:trees');
  updateRailway3D(dt, world, focus, viewDist);
  if (!world.cinemaLean) updateStationCrowd3D(scene, world, railZ);
  if (!world.cinemaLean) updateEvenementen3D(scene, world, calendarTodayEv(world), (x, y) => (world.map.spawnZ ? world.map.spawnZ(x, y) : 0),
    (x, y, m) => !buildingAt(world.map, x, y, m) && !isInWater(world.map, x, y));
  if (!world.cinemaLean) updateWerf3D(scene, world.werf, (x, y) => (world.map.spawnZ ? world.map.spawnZ(x, y) : 0));
  if (!world.cinemaLean) updateCountryside(dt, world, scene, cam, viewDist);
  updateOmmelandLandmarks(world, scene, focus, setBuildingHidden);
  probe.mark('3d:rail+country');

  if (!world.cinemaLean) syncParkedLayer(scene, sleepingParkedCars(world), buildVehicleActor, focus, DRAW_DIST);
  syncVehicleMeshes(world, player);
  const fireSeenIds = new Set();
  const policeChasing = world.wanted > 0;
  const driverDeadline = performance.now() + DRIVER_BUILD_BUDGET_MS;
  const pBoat = player.inVehicle && player.inVehicle.isBoat ? player.inVehicle : null;
  if (!world.extraSpeakers) world.extraSpeakers = [];
  crewCtx.deadline = driverDeadline;
  crewCtx.time = world.time;
  crewCtx.playerBoat = pBoat;
  crewCtx.playerOnWater = !!pBoat && Math.abs(pBoat.speed) > 0.6;
  crewCtx.speakers = world.extraSpeakers;
  for (const v of world.vehicles) {
    let mesh = vehicleMeshes.get(v.id);
    // a car that just died swaps to its burnt-out model (rebuilt next frame)
    if (mesh && ((v.wrecked && !mesh.userData.wreckModel) || (!v.wrecked && mesh.userData.wreckModel) || v.meshDirty)) {
      v.meshDirty = false;
      detachPlayerRider(mesh);
      scene.remove(mesh);
      disposeObject(mesh);
      vehicleMeshes.delete(v.id);
      mesh = null;
    }
    if (mesh) {
      if (v.isBoat) {
        // the water under the hull: the kolk of a lock lifts it, a lake at its own peil lies above the boezem
        const cl = chamberLiftAt(v.x, v.y);
        v._lift = cl !== null ? cl : surfaceLiftAt(world.map, v.x, v.y);
        mesh.position.set(v.x, WATER_Y + v._lift, v.y);
      } else mesh.position.set(v.x, v.z || 0, v.y);
      mesh.rotation.y = -v.angle;
      if (!v.sinking && !v.isBoat) {
        // terrain pitch/roll on the whole car, spring motion on the body only
        const body = mesh.userData.body;
        mesh.rotation.order = 'YZX';
        mesh.rotation.z = (v.pitch || 0) + (body ? 0 : (v.susPitch || 0) * 0.6);
        mesh.rotation.x = (v.roll || 0) + (body ? 0 : (v.susRoll || 0) * 0.6);
        // a wheelie turns about the rear tyre, a stoppie about the front one
        if (v.pitch && (v.model.motorbike || v.isBike)) mesh.position.y += v.model.len * 0.33 * Math.abs(Math.sin(v.pitch));
        if (body) {
          body.rotation.z = v.susPitch || 0;
          body.rotation.x = v.susRoll || 0;
          body.position.y = (v.susHeave || 0) - (v.busBediend ? v.busBediend.kneelAmt * 0.1 : 0); // een knielende bus zakt (busbestuur.js)
        }
      }
      // cutscenes, the trailer and the intro move cars by position while the
      // world is paused: there the wheels roll the distance actually moved
      const wud = mesh.userData, lx = wud.spinX, ly = wud.spinY;
      wud.spinX = v.x; wud.spinY = v.y;
      if (world.paused || v.cineTemp) {
        const moved = lx == null ? 0 : (v.x - lx) * Math.cos(v.angle) + (v.y - ly) * Math.sin(v.angle);
        updateVehicleWheelSpin(mesh, dt > 0 && Math.abs(moved) < 8 ? moved / dt : 0, dt, v.steer || 0);
      } else updateVehicleWheelSpin(mesh, v.speed, animDt, v.steer || 0);
      if (v.flat || mesh.userData.flatIdx >= 0) applyFlatTire(mesh, v);
      if (v.isBoat) {
        animateBoat(mesh, v, world, animDt);
        crewCtx.dist = Math.hypot(v.x - player.x, v.y - player.y);
        syncBoatCrew(mesh, v, crewCtx);
      } else if (v.isBus) setBusRearAngle(mesh, v.angle, v.model.trailer ? busTrailerPose(v).angle : sampleBusTrail(v, v.model.len * 0.3).angle);
      if (v.sinking) { mesh.rotation.order = 'YZX'; mesh.position.y = v.sinking.z; mesh.rotation.z = v.sinking.pitch; mesh.rotation.x = v.sinking.roll; }
      if ((mesh.userData.roofN || 0) !== (v.roofBoxes || 0)) setRoofBoxes(mesh, v);
      if (v.indicator || mesh.userData.indLamps) updateIndicatorLamps(mesh, v, world.time);
      if (MODS.disco || mesh.userData.disco) updateDiscoLamp(mesh, v, world.time, MODS.disco);
      if (v.isPolice || v.sirenOn || v.isAmbulance) updatePoliceLamps(mesh, world.time, v.sirenOn ? !v.wrecked : policeChasing && !v.hijacked && !v.wrecked && v.driver !== 'player', v.id);
      const driverDist = Math.abs(v.x - player.x) + Math.abs(v.y - player.y);
      ensureDriverFigure(mesh, v, driverDist, driverDeadline);
      const df = mesh.userData.driverFigure;
      if (df) df.visible = hasAiDriver(v) && driverDist < DRIVER_FIGURE_DIST;
      ensurePassengerFigure(mesh, v, driverDist, driverDeadline);
      const pf = mesh.userData.passengerFigure;
      if (pf) pf.visible = df ? df.visible && seatedOf(v).passengers.length > 0 : false;
      if (v.isBike || v.isScooter) syncBikeRider(mesh, v, world.time);
      if (v._mount || v._riderAway) syncPoliceMount(mesh, v, animDt);
    }

    // damage VFX - checked regardless of `mesh` (a just-wrecked vehicle's
    // mesh is rebuilt as a wreck on the next frame)
    if (v.hitThisFrame) {
      const spark = buildVehicleImpactSparkMesh3D();
      spark.position.set(v.hitX, 0.3 + (v.z || 0), v.hitY);
      scene.add(spark);
      impactSparkEffects.push(spark);
    }
    if (vehicleJustWrecked(v)) {
      v.wreckedAt = world.time;
      const small = v.isBike || v.isScooter;
      const boom = buildVehicleExplosionMesh3D(small ? 0.35 : v.isBus ? 1.5 : 1);
      boom.position.set(v.x, 0.2 + (v.z || 0), v.y);
      scene.add(boom);
      vehicleExplosionEffects.push(boom);
      if (!small && Math.hypot(v.x - player.x, v.y - player.y) < 120) spawnExplosionFx(v.x, v.y, v.z || 0, v.model.color, v.isBus ? 1.4 : 1);
    }
    if (vehicleNeedsFireEffect(v, world.time)) {
      fireSeenIds.add(v.id);
      let fire = vehicleFireMeshes.get(v.id);
      if (!fire) {
        fire = buildVehicleFireMesh3D();
        scene.add(fire);
        vehicleFireMeshes.set(v.id, fire);
      }
      // a damaged car burns from the engine bay, on top of the bonnet
      const bay = v.wrecked || v.isBus ? 0 : v.halfLen * 0.55;
      fire.position.set(v.x + Math.cos(v.angle) * bay, (v.wrecked ? 0.4 : 0.75) + (v.z || 0), v.y + Math.sin(v.angle) * bay);
      // a disabled car's fire grows until it blows
      const smoky = vehicleSmokeOnly(v);
      fire.userData.flame.visible = !smoky;
      for (const tg of fire.userData.tongues) tg.visible = !smoky;
      fire.scale.setScalar(smoky ? 0.8 : v.wrecked ? 2.4 : v.disabled ? 1.5 + 1.3 * Math.max(0, Math.min(1, 1 - (v.burnLeft || 0) / 10)) : 1);
      updateVehicleFireMesh3D(fire, animDt);
    }
  }
  probe.mark('3d:vehicles');
  syncBoatWakes(world);
  updateSwimmers3D(animDt, world, scene, cam);
  for (const [id, fire] of vehicleFireMeshes) {
    if (fireSeenIds.has(id)) continue;
    scene.remove(fire);
    disposeObject(fire);
    vehicleFireMeshes.delete(id);
  }
  impactSparkEffects = impactSparkEffects.filter((mesh) => {
    const alive = updateVehicleImpactSparkMesh3D(mesh, animDt);
    if (!alive) {
      scene.remove(mesh);
      disposeObject(mesh);
    }
    return alive;
  });
  vehicleExplosionEffects = vehicleExplosionEffects.filter((mesh) => {
    const alive = updateVehicleExplosionMesh3D(mesh, animDt);
    if (!alive) {
      scene.remove(mesh);
      disposeObject(mesh);
    }
    return alive;
  });

  probe.mark('3d:vehfx');
  syncPedestrianMeshes(world, player, animDt);
  probe.mark('3d:peds');
  syncSpeechBubbles(world);

  if (!flitspaalBuilt && world.flitspaalen && world.flitspaalen.length) {
    flitspaalBuilt = true;
    for (const fc of world.flitspaalen) {
      const mesh = buildFlitspaalMesh3D();
      mesh.position.set(fc.px ?? fc.x, 0, fc.py ?? fc.y);
      mesh.rotation.y = -fc.angle;
      scene.add(mesh);
      staticProps.push(mesh);
      fc.mesh = mesh;
    }
  }

  if (!horecaBuilt) {
    const horecaSpots = getHorecaForRender();
    if (horecaSpots.length) {
      horecaBuilt = true;
      horecaPads = horecaPads3D(horecaSpots);
      scene.add(horecaPads);
      horecaBadges = horecaBadges3D(horecaSpots);
      scene.add(horecaBadges);
    }
  }
  if (horecaPads) {
    updateHorecaPads3D(horecaPads, focus.x, focus.y, DRAW_DIST + 10);
    updateHorecaPads3D(horecaBadges, focus.x, focus.y, DRAW_DIST);
  }
  for (const mesh of staticProps) {
    mesh.visible = !mesh.userData.broken && Math.abs(mesh.position.x - focus.x) < DRAW_DIST && Math.abs(mesh.position.z - focus.y) < DRAW_DIST;
    // hundreds of these exist city-wide; hidden ones need no matrix updates
    mesh.matrixWorldAutoUpdate = mesh.visible;
  }

  if (world.wildlife) {
    // geen filter-array per frame (#588): dezelfde lijst en Set, elke frame geleegd
    _wildlifeNear.length = 0;
    for (const a of world.wildlife) if (Math.hypot(a.x - focus.x, a.y - focus.y) < DRAW_DIST) _wildlifeNear.push(a);
    syncActors(_wildlifeNear, wildlifeMeshes, buildWildlifeActor, (a) => a, _wildlifeSeen);
    for (const a of world.wildlife) {
      const mesh = wildlifeMeshes.get(a);
      if (mesh) {
        const y = (a.kind === 'seagull' ? 6 + Math.sin(world.time * 2 + (a.flapSeed || 0)) * 1.2 : 0) + (a.lift || 0);
        mesh.position.set(a.x, y, a.y);
        // een dier wordt nooit groter dan zijn eigen bouw (alleen de Reuzenduif-cheat maakt een duif tot 6x): een ongeldige of dubbel toegepaste schaal gaf een reuzenvogel (#433)
        const baseScale = mesh.userData.modelSchaal || mesh.userData.baseScale || (mesh.userData.baseScale = mesh.scale.x > 0 && mesh.scale.x < 8 ? mesh.scale.x : 1);
        if (a.kind === 'pigeon') {
          const want = Math.min(6, Math.max(1, Number.isFinite(MODS.pigeonScale) ? MODS.pigeonScale : 1));
          if (mesh.userData.pigeonScale !== want) { mesh.scale.setScalar(want); mesh.userData.pigeonScale = want; }   // Reuzenduif (cheat)
        } else if (!(Math.abs(mesh.scale.x - baseScale) < 1e-4 && Math.abs(mesh.scale.y - baseScale) < 1e-4 && Math.abs(mesh.scale.z - baseScale) < 1e-4)) mesh.scale.setScalar(baseScale);
        mesh.rotation.y = -a.angle - (a.draai || 0);   // a.lift en a.draai: een schaap in de straal van een schotel (#333)
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

  probe.mark('3d:props+wildlife');
  updateSkyProps3D(world, scene, animDt);

  // de camera van dít beeld eerst: de marker meet zijn afstand (en dus zijn kolom,
  // worldmarker3d.js) aan de hand van deze stand, dus een frame oude stand geeft een
  // kolom die nog op de vorige plek past (#432)
  setMarkerCamera(cam);
  setMarkerEnv(world.dayNight ? world.dayNight.night : 0, world.weather ? world.weather.intensity : 0);

  // mission marker: a single persistent beacon, repositioned/recolored -
  // world.mission is one long-lived object (the chain loops forever), never
  // an array, so this is a create-once singleton, not a Map-keyed sync
  if (world.mission) {
    if (!missionMarkerMesh) {
      missionMarkerMesh = buildMissionMarker3D();
      scene.add(missionMarkerMesh);
    }
    missionMarkerMesh.position.set(world.mission.marker.x, world.mission.marker.z || 0, world.mission.marker.y);
    updateMissionMarker3D(missionMarkerMesh, world.time, world.mission.phase);
  } else if (missionMarkerMesh) {
    scene.remove(missionMarkerMesh);
    missionMarkerMesh = null;
  }
  updateRouteRibbon3D(animDt, world);

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
        mesh.position.set(wp.x, 0.4 + (wp.z || 0), wp.y);
        scene.add(mesh);
        missionWaypointDotMeshes.set(i, mesh);
      });
    }
  } else if (missionWaypointSetKey !== null) {
    for (const mesh of missionWaypointDotMeshes.values()) scene.remove(mesh);
    missionWaypointDotMeshes.clear();
    missionWaypointSetKey = null;
  }
  // no mission beacon, route or waypoint in the title screen / pigeon mode / cutscenes
  const navVisible = document.body.classList.contains('game-started') && !world.pigeonMode && !world.cinematicHideNav;
  // a minigame on the spot (padel, carbid, the kermis) or a heli run: no mission beacon meanwhile
  const inGameBusy = gameBusy(world);
  // a running bijbaantje (sidejobs.js) has its own beacon; missions wait
  const jobBusy = !!(world.sideJob && world.sideJob.active);
  if (missionMarkerMesh) missionMarkerMesh.visible = navVisible && !jobBusy && !inGameBusy;
  for (const mesh of missionWaypointDotMeshes.values()) mesh.visible = navVisible && !jobBusy;
  if (!navVisible) {
    // waypoint-beacon en ribbon wonen in scene3d/routeribbon3d.js (#502)
    hideRouteRibbon3D();
    hideWaymarkers3D();
  }

  // garages stream their own workshop meshes (garages.js)

  // traffic lights: static positions, built once, only the lamp color changes
  syncTrafficLights3D(scene);

  // gunfire (tracers, flashes, impacts, holes) is drawn by gunfx3d.js
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
    // pop in, float up with a little heartbeat, fade out at the end
    const pop = Math.min(1, life / 0.12);
    const beat = 1 + Math.sin(Math.min(1, life) * Math.PI * 4) * 0.08;
    mesh.position.y = 1.75 + life * 0.9;
    mesh.scale.setScalar(0.55 * (0.4 + 0.6 * pop * (2 - pop)) * beat);
    mesh.material.opacity = life > 0.75 ? Math.max(0, 1 - (life - 0.75) / 0.25) : 1;
    if (world.time <= p.until) continue;
    scene.remove(mesh);
    disposeObject(mesh);
    kissMeshes.delete(p);
  }

  probe.mark('3d:markers+combat');
  applyTimeOfDay(dt, world);
  applyWeatherToScene3D(scene, renderer, world, dt, player.x, player.y, cam);
  probe.mark('3d:tod+weather');
  updateEnvironment(dt);
  probe.mark('3d:env');
  // while streaming catches up after a jump the far LOD stands in closer
  const lodR = viewDist > DRAW_DIST + 20 ? Math.min(DRAW_DIST, buildingDetailR, roadDetailR + 8) : DRAW_DIST;
  farLod.update(focus.x, focus.y, viewDist, Math.min(viewDist, scene.fog.far) + 20, lodR);
  probe.mark('3d:farlod');

  if (player.character !== playerCharacter) {
    playerCharacter = player.character;
    scene.remove(playerMesh);
    disposeObject(playerMesh); // #788: de oude look geeft zijn gedeelde rompgeometrie terug
    const appearance = playerCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
    playerMesh = buildPersonActor(appearance.shirt, appearance.skin, appearance);
    scene.add(playerMesh);
  }

  const pv = player.inVehicle;
  const hidePlayers = (world.pigeonMode && !world.pigeonIntro) || world.menuCam || world.cinematicHidePlayers || !!world.trainDriving;
  const pvMesh = pv ? vehicleMeshes.get(pv.id) : null;
  const inCabin = !!pv && updateCarInterior(pvMesh, pv, !!(world.cameraOverride && world.cameraOverride.interior));
  const pAnim = trackSeat(playerSeatTr, player, animDt, true);
  doorAsk.clear();
  if (pAnim) doorAsk.set(pAnim.v, vraagVoorAnim(pAnim, 'bestuurder'));
  syncPlayerRider(pv, pvMesh, hidePlayers || (pAnim && pAnim.kind === 'enter'), world.time);
  if (pAnim && !hidePlayers) {
    // enter/exit animation (visual only; any input skips it)
    drawTransition(pAnim, playerMesh, vehicleMeshes.get(pAnim.v.id), player, vehicleSeat(pAnim.v, true), animDt, world.time);
    playerMesh.scale.y = 1;
  } else if (pv) {
    // on a horse the player sits astride the saddle (seating3d horse seat)
    const seated = (!pv.isBike && !pv.isScooter) || pv._mount === 'horse';
    playerMesh.visible = seated && !hidePlayers && !inCabin;
    if (seated) {
      playerMesh.scale.y = 1;
      placeSeated(playerMesh, pvMesh, pv, vehicleSeat(pv, true), world.time);
      playerMesh.userData.shadow.visible = false;
    }
  } else {
    playerMesh.visible = !hidePlayers && scopeBlend < 0.6 && !world.coopInVoertuig; // een gast die meerijdt zit in het blok (#372)
    if (!driveRagdoll(player, playerMesh, world, animDt)) {
      playerMesh.userData.shadow.visible = !player.swimming;
      playerMesh.rotation.x = 0;
      playerMesh.rotation.z = player.swimTilt || 0;
      playerMesh.position.set(player.x, (player.gz || 0) + (player.z || 0) - (player.wade || 0), player.y);
      playerMesh.rotation.y = -player.angle;
      playerMesh.scale.y = 1;
      playerMesh.userData.crouch = !!player.crouching;
      playerMesh.userData.air = player.vault ? player.airPose || 0 : !player.perch && !player.swimming && player.z > 0.25 ? 0.45 : 0;
      playerMesh.userData.shadow.position.y = 0.02 - (player.z || 0) / playerMesh.scale.y;
      animatePersonWalk(playerMesh, Math.hypot(player.vx, player.vy), animDt);
      if (player.vault && Number.isFinite(player.vaultU)) vaultPose(playerMesh, player.vaultU, !!player.vault.climb, world.time);
      else if (player.swimming && !player.inVehicle) {
        // zwemmen (#207): schoolslag bij beweging, rustig watertrappelen als je stilligt; uit het water
        // klimmen (water 'climb') is hand over hand omhoog, ruim één slag in de klimtijd
        if (player.water === 'climb' && player.climb) klimStand(player.climb.t * 3.5, bewegPose);
        else zwemStand(world.time * (Math.hypot(player.vx, player.vy) > 0.3 ? 1 : 0.4), bewegPose);
        applyPose(playerMesh.userData, bewegPose);
      }
      if (player.aaien) {
        aaienStand(player.aaien.u, bewegPose);
        applyPose(playerMesh.userData, bewegPose);
        bewegPose.pelvisDrop = 0;
      }
      if (player.sofaSeat != null) { seatPose(playerMesh); playerMesh.position.y = seatedY(playerMesh, (player.gz || 0) + player.sofaSeat); }
      if (player.carrying) carryOverlay(playerMesh);
      const gun = isRangedWeapon(world.weapon) && Number.isFinite(world.ammo[world.weapon]) ? world.weapon : null;
      const aiming = gun && !world.paused && (world.input.mouse.down || world.input.mouse.rightDown) ? gun : null;
      applyAttackPose(playerMesh, getCombatEffect(), world.time, aiming);
      applyHitReaction(playerMesh, player.hitReact, world.time, player.angle);
    }
  }
  if (playerMesh) {
    const onFoot = !pv && !player.swimming && !world.pigeonMode;
    setHeldWeapon(playerMesh, onFoot ? world.weapon : null);
    const tip = playerMesh.userData.muzzle;
    if (tip && playerMesh.visible) {
      playerMesh.updateMatrixWorld(true);
      alignPlayerFlash(tip);
    }
  }

  // companion (Tammo/Tessa, whichever the player isn't controlling) -
  // walks alongside on foot, or rides along in whatever the player drives:
  // passenger seat, boat bench, bike rack, fatbike saddle or step deck
  // Samen spelen (#502): world.companion is de computermetgezel (cooproles.metgezelVoorSpeler). Een gast is een eigen
  // figuur (coopfigures3d.js) en wordt hier niet meer als Tessa/Tammo getekend; alleen een lokaal bestuurde metgezel
  // (world.coop.remote, de tweede speler achter hetzelfde toetsenbord) houdt dit lichaam.
  const comp = world.coop && world.coop.remote ? null : world.companion;
  if (!comp && companionMesh) companionMesh.visible = false; // geen computermetgezel: geen tweede Tessa in beeld (#502)
  if (comp) {
    if (comp.character !== companionCharacter) {
      companionCharacter = comp.character;
      const appearance = companionCharacter === 'anita' ? ANITA_APPEARANCE : TAMMO_APPEARANCE;
      if (companionMesh) { scene.remove(companionMesh); disposeObject(companionMesh); } // #788
      companionMesh = buildPersonActor(appearance.shirt, appearance.skin, appearance);
      scene.add(companionMesh);
    }
    const cv = comp.coopBestuurt ? null : comp.inVehicle; // een gast die zelf stuurt: coopzitten3d.js zet hem op stoel 0 (#434)
    const cAnim = comp.coopBestuurt ? null : trackSeat(companionSeatTr, comp, animDt, false);
    if (cAnim && !doorAsk.has(cAnim.v)) doorAsk.set(cAnim.v, vraagVoorAnim(cAnim, 'bijrijder'));
    if (cAnim && !hidePlayers) {
      drawTransition(cAnim, companionMesh, vehicleMeshes.get(cAnim.v.id), comp, vehicleSeat(cAnim.v, false), animDt, world.time);
    } else if (cv) {
      companionMesh.visible = !hidePlayers;
      placeSeated(companionMesh, vehicleMeshes.get(cv.id), cv, vehicleSeat(cv, false), world.time);
      if (companionMesh.userData.shadow) companionMesh.userData.shadow.visible = false;
    } else if (!cAnim && world.coopRole === 'client' && comp.coopDown) {
      // the host (or another player) is down for a guest: fall on his back and stay there, like a knocked-over
      // pedestrian (coopextra3d.js); the normal branch below puts him upright again on getting up (#369)
      const wt = world.time || 0, fall = Math.min(1, (wt - (comp.coopVal ?? wt)) / 0.3);
      companionMesh.visible = !hidePlayers;
      companionMesh.position.set(comp.x, (comp.gz || 0) + 0.14 * fall, comp.y);
      companionMesh.rotation.set(0, -comp.angle, fall * fall * Math.PI / 2);
      companionMesh.userData.crouch = false;
      if (companionMesh.userData.shadow) companionMesh.userData.shadow.visible = !hidePlayers;
      animatePersonWalk(companionMesh, 0, animDt);
    } else {
      companionMesh.visible = !hidePlayers && !comp.coopVoertuig && !comp.coopBestuurt; // samen spelen: de gastheer in een voertuig is bij een gast een blok (#372)
      if (!driveRagdoll(comp, companionMesh, world, animDt)) {
        companionMesh.position.set(comp.x, (comp.gz || 0) + (comp.z || 0), comp.y);
        companionMesh.rotation.x = 0;
        companionMesh.rotation.z = comp.swimTilt || 0;
        if (companionMesh.userData.shadow) companionMesh.userData.shadow.visible = !comp.swimming;
        companionMesh.rotation.y = -comp.angle;
        companionMesh.userData.crouch = !!comp.crouching;
        animatePersonWalk(companionMesh, Math.hypot(comp.vx, comp.vy), animDt);
        if (comp.sofaSeat != null) { seatPose(companionMesh); companionMesh.position.y = seatedY(companionMesh, (comp.gz || 0) + comp.sofaSeat); }
        if (comp.carrying) carryOverlay(companionMesh);
        if (world.coopRole === 'client' || comp.coopWapen !== undefined || comp.coopFx) { // het wapen en de aanval van de gastheer (bij een gast) of van de gast die Tessa bestuurt (bij de host), zoals een voetganger ze heeft (#434)
          setHeldWeapon(companionMesh, comp.coopWapen || null);
          if (comp.coopWapen || comp.coopFx) applyAttackPose(companionMesh, comp.coopFx, world.time, null);
        }
      }
    }
  }
  // third-person follow: smoothly settle behind whatever the player is
  // currently facing (on foot or driving), classic third-person style - with a wall-aware
  // pull-in so the camera never ends up clipped inside a building, and an
  // instant snap on teleport (respawn/mission warp) instead of a long lerp
  // that would otherwise glide the camera straight through geometry
  syncDoorsNear(world, vehicleMeshes, player.x, player.y, animDt, doorAsk);
  syncCabins(world, vehicleMeshes, player.x, player.y);
  syncAutoStuur(world, vehicleMeshes, player.x, player.y, animDt);
  syncVoertuigBediening(world, vehicleMeshes, player.x, player.y, animDt);
  syncHaltefiguren(world, scene, (shirt, skin) => enableShadows(buildPersonActor(shirt, skin, {}), false), animDt, disposeObject);
  probe.mark('3d:players');
  // a stolen train (traindrive.js) is followed like a very long vehicle
  const camVeh = player.inVehicle || world.trainCam || null;
  const targetAngle = camVeh ? camVeh.angle : player.angle;
  followYaw += normalizeAngleDelta(-targetAngle - followYaw) * Math.min(1, dt * 5);

  // mouse Y pans the camera up/down around the player - top of
  // the screen swings the camera down to a lower, more level angle ("looking
  // up"), bottom of the screen swings it up to a steeper overhead angle
  // captured mouse (mouse-look): relative motion tilts the camera and, in a
  // vehicle, orbits it around the car; it drifts back behind the car after
  // a moment without mouse input. Uncaptured: the old absolute mouse-Y tilt.
  const mouse = world.input.mouse;
  const looking = world.input.lookActive ? world.input.lookActive() : mouse.locked;
  const lookK = MOUSE_LOOK_PER_PX * getSettings().mouseSensitivity;
  // een gast op de grond houdt zijn eigen kijkhoogte bij (coopgast.js gastKijkHoogte): die stand wint van de dode
  // muis, want zijn invoer is al aan het eind van het vorige beeld gelezen (#434). In een voertuig doet de camera
  // het zelf, net als bij de gastheer.
  if (looking && world.coopRole === 'client' && !camVeh && typeof world.coopKijkPitch === 'number' && Number.isFinite(world.coopKijkPitch)) {
    lookPitchTarget = world.coopKijkPitch;
  } else if (looking) {
    // zelfde gevoeligheid als links/rechts, ook door de scope (player.js: x 0.3)
    lookPitchTarget += mouse.dy * lookK * (world.scoped ? 0.3 : 1) * (getSettings().invertY ? -1 : 1);
    lookPitchTarget = Math.min(PITCH_LOOK_MAX_DEG, Math.max(PITCH_LOOK_MIN_DEG, lookPitchTarget * 180 / Math.PI)) * Math.PI / 180;
  } else {
    // de cursorpositie is een aantal pixels, gedeeld door de schermhoogte: op
    // een telefoon in landschap (360 px hoog) gaf dezelfde pixel een andere
    // hoek dan in portret (800 px), en dus een andere camerahoogte. Zonder muis
    // (aanraakbesturing) geldt daarom de vaste volgstand (#463).
    const doc = document.documentElement;
    const cursor = !(doc && doc.classList && doc.classList.contains('touch-play'));
    lookPitchTarget = pitchForMouse(cursor ? (mouse.y || 0) / (innerHeight || 1) : NaN);
  }
  followPitch += (lookPitchTarget - followPitch) * Math.min(1, dt * (looking ? 30 : 6));
  // on foot the camera yaw is world.camYaw (orbited by the mouse in
  // player.js, independent of the facing); in a vehicle the mouse orbits
  // around the car and the camera eases back behind it after a moment idle
  if (world.camYaw == null) world.camYaw = targetAngle;
  let camAngle;
  // hold Q / middle mouse in a vehicle: look back, a hard cut
  // (world.noLookBack: a minigame has Q for itself, the skûtsje's sail trim)
  const lookBack = lookBackActive({ inVehicle: !!camVeh, override: !!world.cameraOverride, noLookBack: world.noLookBack, qDown: world.input.isDown('q'), middleDown: mouse.middleDown });
  const lookBackCut = lookBack !== lookBackWas;
  lookBackWas = lookBack;
  if (camVeh) {
    if (!camWasInVehicle) { lookYaw = normalizeAngleDelta(world.camYaw - targetAngle); lookYawIdle = 0; }
    const fast = Math.min(1, Math.abs(camVeh.speed || 0) / LOOK_FAST_SPEED);
    // in a helicopter the mouse turns the heli itself (heliflight.js)
    if (looking && mouse.dx !== 0 && !lookBack && !camVeh.isHeli) {
      lookYaw = normalizeAngleDelta(lookYaw + mouse.dx * lookK);
      lookYawIdle = 0;
    } else {
      lookYawIdle += dt;
      const delay = LOOK_RECENTER_DELAY + (LOOK_RECENTER_DELAY_FAST - LOOK_RECENTER_DELAY) * fast;
      if (lookYawIdle > delay) lookYaw *= Math.exp(-dt * (2.5 - 1.2 * fast));
    }
    camAngle = targetAngle + (lookBack ? Math.PI : lookYaw);
    world.camYaw = normalizeAngleDelta(targetAngle + lookYaw);
  } else {
    lookYaw = 0;
    camAngle = world.camYaw;
  }
  camWasInVehicle = !!camVeh;

  // vehicles get a longer, higher orbit scaled to their length, so the car
  // doesn't fill the lower half of the screen; a bus further still, to see
  // the road ahead over its roof and its tail through a corner (a gelede
  // bus's rear unit too)
  const veh = camVeh;
  const camScale = veh ? (veh.isHeli ? 4.4 : veh._mount === 'horse' ? 1.7 : veh.isBus ? (veh.model.trailer ? 5.2 : Math.min(4.4, Math.max(3.2, veh.model.len / 2.5))) : Math.min(3.2, Math.max(1.35, veh.model.len / 2.4))) : 1;
  // samen spelen (#95): de eerste twee spelers delen één camera op het midden tussen hen (coop.js sharedCamera)
  const share = !camVeh && world.coopCam ? world.coopCam : null;
  const radius = orbitRadius * camScale * (share ? share.zoom : 1);
  // height of whatever the camera follows: on a viaduct, down in a cutting (elevation.js)
  const baseH = veh ? veh.z || 0 : (player.gz || 0) + Math.max(0, player.z || 0);
  const eyeX = share ? share.x : player.x, eyeY = baseH + (veh ? (veh._mount === 'horse' ? 2.2 : 1.3 + (camScale - 1) * 0.55) : 1.3), eyeZ = share ? share.y : player.y;
  // de volgplek komt uit cameraplan.js: achter de speler en `sin(pitch) x
  // radius` erboven, ongeacht het schermformaat (#463)
  const pose = followCameraPose({ x: player.x, y: player.y, eye: eyeY, angle: camAngle, pitch: followPitch, radius });
  let desiredX = pose.x;
  let desiredZ = pose.z;
  let desiredY = pose.y;

  // recursive: true - each building is now a Group of several child meshes
  // (roof/window-band/steeple/...), not one flat Mesh, so a non-recursive
  // raycast against the Group itself would never hit anything
  // a hard-cut override (title screen, trailer) replaces the follow camera
  // outright: no collision rays against buildings it never looks through
  const noCollide = !!(world.cameraOverride && world.cameraOverride.cut && overrideBlend >= 1);
  const camTargets = noCollide ? _noTargets : nearbyCamTargets(player.x, player.y);
  function raycastFrom(ox, oy, oz, dx, dy, dz, dist) {
    if (noCollide) return null;
    camRayOrigin.set(ox, oy, oz);
    camRayDir.set(dx / dist, dy / dist, dz / dist);
    camRaycaster.set(camRayOrigin, camRayDir);
    camRaycaster.far = dist;
    camRaycaster.near = 0.05;
    return camNearestHit(camTargets);
  }
  function raycastBuildingDist(dx, dy, dz, dist) {
    return raycastFrom(eyeX, eyeY, eyeZ, dx, dy, dz, dist);
  }

  const dx = desiredX - eyeX, dy = desiredY - eyeY, dz = desiredZ - eyeZ;
  const fullDist = Math.hypot(dx, dy, dz) || 1;
  const hitDist = raycastBuildingDist(dx, dy, dz, fullDist);
  // Blocked view (narrow Gronings streets, turning the camera past a wall):
  // slide in along the same ray. This used to jump to a 75-degree
  // overhead vantage or snap to 1 m behind the head, so turning the view
  // flipped between eye level, top-down and near first person - very
  // disorienting. Now: in at once (never clip the wall), back out slowly, and
  // rise a little when close so it reads as an over-the-shoulder view.
  const propHit = noCollide ? null : propRayHit(world.map, eyeX, eyeY, eyeZ, dx, dy, dz, fullDist);
  const blockDist = propHit === null ? hitDist : hitDist === null ? propHit + CAM_CLEARANCE : Math.min(hitDist, propHit + CAM_CLEARANCE);
  const wantPull = blockDist === null ? 1 : Math.max(CAM_MIN_DIST, blockDist - CAM_CLEARANCE) / fullDist;
  if (camPullReset || wantPull < camPull) camPull = wantPull;
  else camPull += (wantPull - camPull) * (1 - Math.exp(-dt * CAM_PULL_OUT_RATE));
  camPullReset = false;
  const pull = Math.min(1, camPull);
  desiredX = eyeX + dx * pull;
  desiredY = eyeY + dy * pull + (1 - pull) * CAM_PULL_LIFT;
  desiredZ = eyeZ + dz * pull;

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
  if (world.map.elev && world.map.elev.has) {
    // never below the surface under the camera, never above a tunnel roof / deck over the player
    const gCam = world.map.groundHeightAt(desiredX, desiredZ, baseH + 1.5);
    desiredY = Math.max(desiredY, Math.min(gCam, baseH + 3) + 0.6);
    const ceil = Math.min(world.map.ceilingAt(desiredX, desiredZ, baseH + 0.5), world.map.ceilingAt(player.x, player.y, baseH + 0.5));
    if (ceil < Infinity) desiredY = Math.min(desiredY, ceil - 0.45);
  } else desiredY = Math.max(desiredY, 0.6);
  // vehicles aren't in the building raycast: never let the camera sit
  // inside a car/bus parked right behind the player - rise above its roof
  for (const v of world.vehicles) {
    if (v === player.inVehicle || v.isBoat) continue;
    const dx = desiredX - v.x, dz = desiredZ - v.y;
    if (dx * dx + dz * dz > 100) continue;
    const c = Math.cos(v.angle), sn = Math.sin(v.angle);
    const lx = dx * c + dz * sn, lz = -dx * sn + dz * c;
    if (Math.abs(lx) < v.model.len / 2 + 0.6 && Math.abs(lz) < v.model.wid / 2 + 0.6) {
      if (Math.abs((v.z || 0) - baseH) < 2.5) desiredY = Math.max(desiredY, (v.z || 0) + (v.isBus ? 3.3 : v._mount === 'horse' ? 2.4 : v.isBike || v.isScooter ? 1.3 : 1.6) + 0.7);
    }
  }
  // spaces outside the building raycast adjust the camera themselves (home.js: the flat, the garage)
  if (world.camAdjust) {
    const r = world.camAdjust(desiredX, desiredY, desiredZ, eyeX, eyeY, eyeZ);
    if (r) { desiredX = r[0]; desiredY = r[1]; desiredZ = r[2]; }
  }
  // (#463) nooit in de eigen carrosserie: trok een muur de camera naar binnen
  // (en staat de wereld op pauze, dan blijft dat beeld staan), dan gaat hij
  // boven het dak langs in plaats van erin
  if (veh && veh.model && !veh.isBoat && !veh.isHeli) {
    const q = camClearOfVehicle(desiredX, desiredY, desiredZ, veh);
    desiredX = q[0]; desiredY = q[1]; desiredZ = q[2];
  }

  updateCamTreeHiding(world.map, eyeX, eyeY, eyeZ, desiredX, desiredY, desiredZ);

  const teleported = lastPx !== null && Math.hypot(player.x - lastPx, player.y - lastPy) > 15;
  // (#463) Een harde snee ook als de camera niet meer op een volgplek staat: na
  // de titel of een filmpje hing hij nog op het laatste titelbeeld (op een
  // telefoon in landschap een straatbeeld 1,6 km verderop, 0,6 m boven de kale
  // kaart) en het eerste beeld van een partij gleed hij daar vandaan naar de
  // speler - over de lege kaart (beeld "onder het maaiveld") en dwars door de
  // bebouwing (beeld "in de gevel"). Zonder deze snee duurt dat bij een laag
  // beeldtempo seconden en is het maar net welk beeld je ziet.
  const snap = teleported || !camBaseInit
    || cameraSnapNeeded(camBaseInit ? camBase : null, { x: desiredX, y: desiredY, z: desiredZ });
  if (snap) camPullReset = true;
  if (lookBackCut) camPullReset = true;
  const lerpT = chaseFollowLerp(dt, { cut: snap || lookBackCut, lookBack });
  if (snap) { camBase.set(desiredX, desiredY, desiredZ); camBaseInit = true; }
  else {
    camBase.x += (desiredX - camBase.x) * lerpT;
    camBase.y += (desiredY - camBase.y) * lerpT;
    camBase.z += (desiredZ - camBase.z) * lerpT;
  }
  // (#463) De getekende stand is de geïnterpoleerde stand, en die is nog nooit
  // getest. Bij snelheid loopt de camera tot een paar meter achter op zijn
  // volgplek en snijdt hij de hoek af: in een smalle straat hing hij daardoor
  // in de gevel (gemeten: 1,1 m binnen de gebouwlijn, 2,5 m hoog, met de auto
  // 3,7 m verderop) terwijl de gewenste stand vrij stond. Daarom dezelfde
  // controles nog eens op de stand die echt getekend wordt: de lijn naar de
  // speler, de eigen carrosserie en de grond.
  if (!noCollide) {
    const bx = camBase.x - eyeX, by = camBase.y - eyeY, bz = camBase.z - eyeZ;
    const bl = Math.hypot(bx, by, bz) || 1;
    const blocked = raycastFrom(eyeX, eyeY, eyeZ, bx, by, bz, bl);
    if (blocked !== null) {
      const k = Math.max(CAM_MIN_DIST, blocked - CAM_CLEARANCE) / bl;
      camBase.set(eyeX + bx * k, eyeY + by * k, eyeZ + bz * k);
    }
  }
  // nooit in de eigen auto of bus, ook niet als een muur hem naar binnen trok
  if (veh && veh.model && !veh.isBoat && !veh.isHeli) {
    const q = camClearOfVehicle(camBase.x, camBase.y, camBase.z, veh);
    camBase.set(q[0], q[1], q[2]);
  }
  // en nooit onder het maaiveld, ook als de interpolatie door een helling zakte
  if (world.map.elev && world.map.elev.has) {
    const gBase = world.map.groundHeightAt(camBase.x, camBase.z, baseH + 1.5);
    camBase.y = Math.max(camBase.y, Math.min(gBase, baseH + 3) + 0.6);
  } else camBase.y = Math.max(camBase.y, 0.6);
  lastPx = player.x; lastPy = player.y;
  cam.position.copy(camBase);
  const imp = world.lastImpact;
  const shakeAge = imp ? world.time - imp.time : Infinity;
  if (shakeAge >= 0 && shakeAge < CAM_SHAKE_TIME) {
    // tuning (#196): een zachte stoel (v.tuning.comfort) dempt de schok
    const tv = player.inVehicle && player.inVehicle.tuning;
    const comfort = tv && tv.comfort > 0 ? tv.comfort : 1;
    const amp = shakeAmount(Math.min(1, imp.strength) * CAM_SHAKE_MAX * Math.exp(-shakeAge * 7), { reduceMotion: reducedMotion() }) / comfort;
    const t = world.time * 47;
    cam.position.x += Math.sin(t) * amp;
    cam.position.y += Math.sin(t * 1.31 + 1.7) * amp * 0.6;
    cam.position.z += Math.cos(t * 0.87 + 0.4) * amp;
  }
  if (world.quake && world.quake.amp > 0.002) {
    const j = quakeJitter(world.time, shakeAmount(world.quake.amp, { reduceMotion: reducedMotion() }));
    cam.position.x += j.x; cam.position.y += j.y; cam.position.z += j.z;
  }
  const lookUp = Math.max(0, LOOK_UP_FROM_DEG * Math.PI / 180 - followPitch) * radius * LOOK_UP_LIFT;
  let lookX = player.x, lookY = (veh ? baseH + (eyeY - baseH) * 0.85 : baseH + 1.3) + lookUp, lookZ = player.y;
  followPose.position.x = camBase.x; followPose.position.y = camBase.z; followPose.position.z = camBase.y;
  followPose.lookAt.x = lookX; followPose.lookAt.y = lookZ; followPose.lookAt.z = lookY;
  followPose.at = performance.now();
  scopeBlend += ((world.scoped && !veh ? 1 : 0) - scopeBlend) * Math.min(1, dt * 14);
  if (scopeBlend < 0.01) scopeBlend = 0;
  if (scopeBlend > 0) {
    // eye just in front of the face, looking level: the scoped bullet starts
    // here and flies level along the same heading (scopeaim.js)
    const yaw = world.camYaw ?? player.angle, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const eye = scopeEye(player, yaw, baseH);
    const ex = eye.x, ey = eye.z, ez = eye.y;
    cam.position.set(cam.position.x + (ex - cam.position.x) * scopeBlend, cam.position.y + (ey - cam.position.y) * scopeBlend, cam.position.z + (ez - cam.position.z) * scopeBlend);
    const k = scopeBlend;
    lookX += (ex + cy * 40 - lookX) * k; lookY += (ey - lookY) * k; lookZ += (ez + sy * 40 - lookZ) * k;
  }
  applyCameraOverride(dt, world, lookX, lookY, lookZ);

  probe.mark('3d:camera');
  updateSunAndSky(focus, dt, world);
  limitActorShadows(pedMeshes, focus.x, focus.y);
  limitActorShadows(vehicleMeshes, focus.x, focus.y);
  limitActorShadows(wildlifeMeshes, focus.x, focus.y);
  if (!NO_WHEEL_INSTANCES) {
    beginWheels(scene);
    wheelFrustum.setFromProjectionMatrix(wheelProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    for (const mesh of vehicleMeshes.values()) addVehicleWheels(mesh, wheelFrustum);
    endWheels();
  }
  updateNightLights(world, vehicleMeshes, focus.x, focus.y, lightState.night || 0, wetness, dt);
  probe.mark('3d:lights');
  stepWarmup(world);
  prewarmLightVariants();
  probe.mark('3d:prewarm');

  // behind a menu the world stands still: the shadow map from the first
  // frame is reused
  // a busy CPU (cpuLevel 1+) renders the shadow map every other frame
  renderer.shadowMap.autoUpdate = !(menuCover && menuShadowDone) && !shadowPassSkipped(cpuLevel(), shadowFrame++, focusSpeed, !perfOff('schaduw') && shadowAreaCalm(world, focus.x, focus.y));
  if (menuCover) menuShadowDone = true;
  if (sizeDirty) applyRenderSize();
  progSortOn = !perfOff('progsort');
  probe.mark('3d:render:pre');
  cullOffscreenActors();
  skipHiddenMatrixWalk();
  probe.mark('3d:render:cull');
  try { postfx.render(); } finally { restoreCulledActors(); }
  probe.mark('3d:render:hoofdpas+post');
  compilePending();
  if (afterFrameQ.length) { const q = afterFrameQ; afterFrameQ = []; for (const f of q) { try { f(); } catch (e) { /* no picture */ } } }
  canvasFrames++;
  renderer.shadowMap.autoUpdate = true;
  probe.mark('3d:render');
  probe.identify(scene);
}

// Vehicles, people and animals are ~55% of the scene's nodes (each ~30 to 60),
// and three walks all of them every frame: the matrices, then the frustum test
// of every mesh, in the main pass and again in the shadow pass. Most of them
// are behind or beside the camera. Those out of the view (plus the reach of
// their shadow) sit the frame out as hidden groups, so skipHiddenMatrixWalk
// leaves their matrices alone too; they are shown again right after the render.
const _cullFrustum = new THREE.Frustum();
const _cullProj = new THREE.Matrix4();
const _cullSphere = new THREE.Sphere();
const _cullBox = new THREE.Box3();
const _cullPos = new THREE.Vector3();
const culledActors = [];
function actorRadius(mesh) {
  // the farthest corner of the box at build time from the group's origin; cached
  _cullBox.setFromObject(mesh);
  _cullPos.copy(mesh.position);
  const b = _cullBox, p = _cullPos;
  const dx = Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x));
  const dy = Math.max(Math.abs(b.min.y - p.y), Math.abs(b.max.y - p.y));
  const dz = Math.max(Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z));
  return Math.hypot(dx, dy, dz) + 1.5;
}
function cullActorCache(cache, reach, kind) {
  for (const mesh of cache.values()) {
    if (!mesh.visible || mesh.parent !== scene) continue;
    const ud = mesh.userData;
    if (ud.cullR === undefined) ud.cullR = actorRadius(mesh);
    ud.cullKind = kind;
    _cullSphere.center.copy(mesh.position);
    _cullSphere.radius = ud.cullR + reach;
    if (_cullFrustum.intersectsSphere(_cullSphere)) {
      ud.offscreen = false;
      // what a seen actor keeps hidden (a driver's figure, lamps that are off, a holstered weapon) is not walked either
      const kids = mesh.children;
      for (let i = 0; i < kids.length; i++) kids[i].matrixWorldAutoUpdate = kids[i].visible;
      continue;
    }
    ud.offscreen = true;
    mesh.visible = false;
    culledActors.push(mesh);
  }
}
function cullOffscreenActors() {
  if (perfOff('actoren')) return;
  cam.updateMatrixWorld();
  _cullProj.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  _cullFrustum.setFromProjectionMatrix(_cullProj);
  const reach = actorShadowReach(sunDir);
  cullActorCache(vehicleMeshes, reach, 'voertuig');
  cullActorCache(pedMeshes, reach, 'persoon');
  cullActorCache(wildlifeMeshes, reach, 'dier');
  if (!perfOff('groepen')) cullOffscreenGroups();
  if (window.__perfVerify) verifyCull();
}
// the counters of route verify (scripts/perf/routes.js, kept on window): what was cut is looked at again with an exact box
// the box of what shows: nodes that are hidden (and what hangs on them) do not count, the root's own flag is the cull's
const _vbox = new THREE.Box3();
function expandVisible(o, box, root) {
  if (!root && !o.visible) return;
  o.updateWorldMatrix(false, false);
  const g = o.geometry;
  if (g && o.isMesh && o.layers.test(cam.layers)) {
    if (!g.boundingBox) g.computeBoundingBox();
    _vbox.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    box.union(_vbox);
  }
  for (let i = 0; i < o.children.length; i++) expandVisible(o.children[i], box, false);
}
// a group kept out of the shadow pass for lying outside the sun's shadow box: the exact box of its casters must lie outside it too
function expandCasters(o, box) {
  o.updateWorldMatrix(false, false);
  const g = o.geometry;
  if (g && o.isMesh && o.castShadow) {
    if (!g.boundingBox) g.computeBoundingBox();
    _vbox.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    box.union(_vbox);
  }
  for (let i = 0; i < o.children.length; i++) expandCasters(o.children[i], box);
}
function verifyShadowBox(c, frustum) {
  const V = window.__perfVerify;
  V.boxChecked = (V.boxChecked || 0) + 1;
  _cullBox.makeEmpty();
  expandCasters(c, _cullBox);
  if (!_cullBox.isEmpty() && frustum.intersectsBox(_cullBox)) { V.boxBad = (V.boxBad || 0) + 1; if (V.bad.length < 12) V.bad.push(['schaduwbereik', c.name || c.type, Math.round(c.position.x), Math.round(c.position.z)]); }
}
function verifyCull() {
  const V = window.__perfVerify;
  if (!V) return;
  const sphere = new THREE.Sphere();
  for (const m of culledActors) {
    V.checked++;
    _cullBox.makeEmpty();
    expandVisible(m, _cullBox, true);
    if (_cullBox.isEmpty()) continue;
    // an exact box against the camera's frustum, with no margin: nothing that shows may be cut
    if (_cullFrustum.intersectsBox(_cullBox)) {
      V.actors++;
      const k = m.userData.cullKind || '?';
      V.kinds[k] = (V.kinds[k] || 0) + 1;
      if (V.bad.length < 24) {
        const b = _cullBox, p = m.position;
        const r = Math.hypot(Math.max(Math.abs(b.min.x - p.x), Math.abs(b.max.x - p.x)), Math.max(Math.abs(b.min.y - p.y), Math.abs(b.max.y - p.y)), Math.max(Math.abs(b.min.z - p.z), Math.abs(b.max.z - p.z)));
        let n = 0, hid = 0; m.traverse((o) => { n++; if (!o.visible) hid++; });
        V.bad.push(['actor', k, Math.round(p.x), Math.round(p.z), 'r', +r.toFixed(1), 'cullR', +m.userData.cullR.toFixed(1), 'schaal', +m.scale.x.toFixed(2), 'knopen', n, 'verborgen', hid, 'doos', [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z].map((q) => +q.toFixed(1)).join('x'), Object.keys(m.userData).slice(0, 5).join('/')]);
      }
    }
  }
  for (const g of culledGroups) {
    V.checked++;
    _cullBox.makeEmpty();
    expandVisible(g, _cullBox, true);
    if (!_cullBox.isEmpty() && _cullFrustum.intersectsBox(_cullBox)) { V.groups++; if (V.bad.length < 12) V.bad.push(['group', g.name || g.type, Math.round(g.position.x), Math.round(g.position.z)]); }
  }
  void sphere;
}
function restoreCulledActors() {
  for (let i = 0; i < culledActors.length; i++) culledActors[i].visible = true;
  culledActors.length = 0;
  for (let i = 0; i < culledGroups.length; i++) culledGroups[i].visible = true;
  culledGroups.length = 0;
}

// The same for the static groups at the top of the scene (a building, a landmark, a stretch of road, a
// water polygon: ~600 groups, a quarter of the nodes): a group whose nodes are all frozen (freezeStatic) and plain
// meshes has a fixed bounding sphere, worked out once (again when its number of children changes, and
// now and then), and sits the main pass out while it is outside the view. The shadow pass still walks
// it: a building behind the camera shadows the street in front of it (hookShadowPass).
const groupCull = new WeakMap();
const culledGroups = [];
const GROUP_CULL_AGE = 300;
const GROUP_CULL_BUDGET_MS = 1;
// only the kinds that are final once built: a pooled effect that is frozen and moved by hand (fx3d.js) must never be cut by a stale sphere
const GROUP_CULL_NAMES = new Set(['building', 'landmark', 'road', 'water']);
function cullableGroup(o) {
  if (o.isLight || o.isCamera || o.isSprite || o.isPoints || o.isLine || o.isInstancedMesh || o.isSkinnedMesh || o.matrixAutoUpdate) return false;
  if (o.isMesh && (o.frustumCulled === false || !o.geometry)) return false;
  for (let i = 0; i < o.children.length; i++) if (!cullableGroup(o.children[i])) return false;
  return true;
}
// The loose groups at the top of the scene without a name (the ticket machines of ~190 stations, street furniture, small props: ~900 of the
// ~3800 nodes projected a frame, 80% of them outside the view) keep matrixAutoUpdate on, so they are not final the way the named kinds are.
// One is cut only after two measurements, GROUP_CULL_AGE frames apart, saw the same local transforms (a sprite's bob is left out), and only
// while the group itself stands where it did; its sphere has a margin of LOOSE_MARGIN for what moves a little inside (?perfoff=losgroepen).
const LOOSE_MARGIN = 3;
function looseGroupOk(o, top) {
  if (o.isLight || o.isCamera || o.isPoints || o.isLine || o.isInstancedMesh || o.isSkinnedMesh || o.isBone) return false;
  if (o.isMesh && (o.frustumCulled === false || !o.geometry)) return false;
  if (!o.isSprite && Object.prototype.hasOwnProperty.call(o, 'onBeforeRender')) return false;
  if (top && o.userData.shadowCasters !== undefined) return false;
  for (let i = 0; i < o.children.length; i++) if (!looseGroupOk(o.children[i], false)) return false;
  return true;
}
function looseStamp(o) {
  let s = o.children.length * 1.37 + (o.visible ? 1 : 0.5);
  if (!o.isSprite) {
    const p = o.position, q = o.quaternion, c = o.scale;
    s += p.x * 1.1 + p.y * 1.3 + p.z * 1.7 + q.x * 2.1 + q.y * 2.3 + q.z * 2.9 + q.w * 3.1 + c.x * 0.7 + c.y * 0.9 + c.z * 1.1;
  }
  for (let i = 0; i < o.children.length; i++) s += looseStamp(o.children[i]) * 0.5;
  return s;
}
function groupCullInfo(c) {
  let k = groupCull.get(c);
  if (k && k.n === c.children.length && ++k.age <= GROUP_CULL_AGE) return k;
  if (!k) groupCull.set(c, k = { n: -1, age: 0, sphere: null, loose: c.name === '', stamp: NaN, stable: 0, at: null });
  k.n = c.children.length; k.age = 0; k.sphere = null;
  if (k.loose) {
    if (c.children.length && looseGroupOk(c, true)) {
      const st = looseStamp(c);
      k.stable = st === k.stamp ? k.stable + 1 : 0;
      k.stamp = st;
      if (k.stable >= 1) {
        c.updateWorldMatrix(true, true);
        _cullBox.makeEmpty();
        _cullBox.setFromObject(c);
        if (!_cullBox.isEmpty()) {
          k.sphere = _cullBox.getBoundingSphere(new THREE.Sphere());
          k.sphere.radius += LOOSE_MARGIN;
          k.at = [c.position.x, c.position.y, c.position.z, c.quaternion.y, c.scale.x];
        }
      }
    } else { k.stamp = NaN; k.stable = 0; }
    return k;
  }
  if (c.children.length && !c.userData.shadowCasters && cullableGroup(c)) {
    _cullBox.makeEmpty();
    _cullBox.setFromObject(c);
    if (!_cullBox.isEmpty()) { k.sphere = _cullBox.getBoundingSphere(new THREE.Sphere()); k.sphere.radius += 1; }
  }
  return k;
}
// the bounding sphere of a top-level group that is known and still right (the shape cullOffscreenGroups keeps), or null
function knownGroupSphere(c) {
  const k = groupCull.get(c);
  if (!k || !k.sphere || k.n !== c.children.length) return null;
  if (k.loose && !(c.position.x === k.at[0] && c.position.y === k.at[1] && c.position.z === k.at[2] && c.quaternion.y === k.at[3] && c.scale.x === k.at[4])) return null;
  return k.sphere;
}
function cullOffscreenGroups() {
  const kids = scene.children;
  const deadline = performance.now() + GROUP_CULL_BUDGET_MS;
  let working = true;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (!c.visible || !(GROUP_CULL_NAMES.has(c.name) || (c.name === '' && c.isGroup && !perfOff('losgroepen')))) continue;
    let k = groupCull.get(c);
    if (!k || k.n !== c.children.length || k.age > GROUP_CULL_AGE) {
      // the groups are looked through a few at a time: one that is not known yet is drawn as before
      if (working && performance.now() < deadline) k = groupCullInfo(c); else { if (performance.now() >= deadline) working = false; continue; }
    } else k.age++;
    if (k.sphere && !_cullFrustum.intersectsSphere(k.sphere) && (!k.loose || (c.position.x === k.at[0] && c.position.y === k.at[1] && c.position.z === k.at[2] && c.quaternion.y === k.at[3] && c.scale.x === k.at[4]))) { c.visible = false; culledGroups.push(c); }
  }
}

// three walks the matrices of hidden objects too: the pooled vehicles and
// people and far wildlife at the top of the scene (~1100 of ~5000 nodes with
// matrixAutoUpdate) cost ~0.6 us each every frame. A hidden group sits out of
// that walk and is back in it the frame it shows again (the owners set
// visible before this runs, just ahead of the render).
function skipHiddenMatrixWalk() {
  const kids = scene.children;
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c.isLight || c.isCamera) continue;
    c.matrixWorldAutoUpdate = c.visible;
  }
  // the terrain's ~500 tile meshes are final (freezeStatic): no walk through them either
  if (terrainMesh && !perfOff('terreinvast')) terrainMesh.matrixWorldAutoUpdate = false;
}

// Every lit material has two program variants: with the night-light rig and
// without it (nightlights3d dark rig). Each material + mesh layout that shows
// up gets a stand-in on its own layer, compiled for the variant not in use.
// The scene is scanned a slice per frame, compiling goes through
// KHR_parallel_shader_compile (renderer.compile only starts the link), and
// once the programs are linked the stand-ins are drawn once into a 1x1
// scissor of the scene target so the GPU pipeline exists before the rig
// ever switches over. Nothing here blocks on the driver.
const PREWARM_LAYER = 31;
const PREWARM_SLICE = 120;
// once two passes over the scene have found nothing new for this rig variant only a few top-level groups are scanned per frame:
// the full-speed pass walked every node of the scene every ~3 frames (~0.9 ms per frame)
const PREWARM_SLICE_QUIET = 12;
let prewarmFound = 0, prewarmQuiet = 0, prewarmLastVariant = null;
const PREWARM_WAIT_MS = 20000;
const PREWARM_POLL_MS = 250;
const prewarmed = { true: new Set(), false: new Set() };
const prewarmRoot = new THREE.Group();
const prewarmQueue = [];
let prewarmCursor = 0;
let prewarmBatch = null;
let prewarmCam = null;

function prewarmKind(o) {
  const g = o.geometry;
  let k = g.userData._pwKind;
  if (k === undefined) {
    k = Object.keys(g.attributes).join(',') + (g.morphAttributes.position ? 'M' : '');
    g.userData._pwKind = k;
  }
  return (o.isInstancedMesh ? 'i' : o.isSkinnedMesh ? 'k' : o.isBatchedMesh ? 'b' : o.isSprite ? 's' : o.isPoints ? 'p' : o.isLineSegments ? 'ls' : o.isLine ? 'l' : 'm')
    + (o.instanceColor ? 'c' : '') + k;
}

// A stand-in draws its source's own geometry and material. Once either is
// disposed (a despawned car, a finished spark) the stand-in is dropped:
// drawing it would upload them again with nothing left to free them.
const prewarmDisposed = new WeakSet();
const prewarmWatched = new WeakSet();
function onPrewarmSourceDispose(e) { prewarmDisposed.add(e.target); }
function watchPrewarmSource(res) {
  if (!res) return;
  prewarmDisposed.delete(res);
  if (prewarmWatched.has(res)) return;
  prewarmWatched.add(res);
  res.addEventListener('dispose', onPrewarmSourceDispose);
}
const prewarmProxyDead = (p) => prewarmDisposed.has(p.geometry) || prewarmDisposed.has(p.material);

function makePrewarmProxy(o, m) {
  const g = o.geometry;
  if (!o.isSprite) watchPrewarmSource(g);
  if (!m.userData.shared) watchPrewarmSource(m);
  const proxy = o.isInstancedMesh ? new THREE.InstancedMesh(g, m, 1)
    : o.isSkinnedMesh ? new THREE.SkinnedMesh(g, m)
      : o.isSprite ? new THREE.Sprite(m)
        : o.isPoints ? new THREE.Points(g, m)
          : o.isLineSegments ? new THREE.LineSegments(g, m)
            : o.isLine ? new THREE.Line(g, m)
              : new THREE.Mesh(g, m);
  // a pool (multidraw3d.js): the program has the batching define; one degenerate range so that the draw is made at all
  if (o.isBatchedMesh) {
    proxy.isBatchedMesh = true;
    proxy._matricesTexture = o._matricesTexture;
    proxy._multiDrawStarts = new Int32Array(1);
    proxy._multiDrawCounts = new Int32Array([3]);
    proxy._multiDrawCount = 1;
  }
  // its own colour buffer: disposing the stand-in frees its instance buffers,
  // and a shared one would leave the real mesh drawing from a deleted buffer
  // (black grass tufts, shrubs and hedges)
  if (o.instanceColor) proxy.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
  // own skeleton (and instance buffer): freed after the draw, drawPrewarmBatch
  if (o.isSkinnedMesh) proxy.bind(o.skeleton.clone(), o.bindMatrix);
  // shadow receiving is part of the program key
  proxy.receiveShadow = o.receiveShadow;
  proxy.frustumCulled = false;
  proxy.layers.set(PREWARM_LAYER);
  return proxy;
}

// Queues stand-ins for every material/layout under `root` not yet warmed
// for the rig variant `variant`. Hidden objects (effects that only show up
// later, the moon and stars by day) are warmed for the current variant too,
// since their first appearance would otherwise compile in-frame. A tag per
// object and variant skips objects already seen with the same material.
function scanForPrewarm(root, variant, hidden = false) {
  hidden = hidden || !root.visible;
  queuePrewarm(root, variant);
  if (hidden) queuePrewarm(root, !variant);
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) scanForPrewarm(kids[i], variant, hidden);
}

function queuePrewarm(o, variant) {
  if (o.isLight) { o.layers.enable(PREWARM_LAYER); return; }
  const tag = variant ? '_pwOn' : '_pwOff';
  const cast = !!o.castShadow;
  if (!o.material || (o[tag] === o.material && o[tag + 'S'] === cast) || !(o.isMesh || o.isPoints || o.isLine || o.isSprite) || (o.isSkinnedMesh && !o.skeleton)) return;
  o[tag] = o.material;
  o[tag + 'S'] = cast;
  const done = prewarmed[variant];
  const kind = prewarmKind(o);
  for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
    if (!m) continue;
    const key = m.id + '.' + m.version + '|' + kind + (o.receiveShadow ? 'r' : '');
    if (!done.has(key)) {
      done.add(key);
      prewarmQueue.push({ proxy: makePrewarmProxy(o, m), variant });
      prewarmFound++;
    }
    // no depth programs while the preset has shadows off ('laag'): compiling
    // them only competes with the ones that will be drawn
    if (o.castShadow && sun.castShadow && (!o.customDepthMaterial || o.userData.pool) && (o.isMesh || o.isLine || o.isPoints)) {
      const dm = o.userData.pool ? o.customDepthMaterial : shadowDepthStandIn(m);
      const dkey = 'D' + dm.id + '|' + kind + (o.receiveShadow ? 'r' : '');
      if (done.has(dkey)) continue;
      done.add(dkey);
      prewarmQueue.push({ proxy: makePrewarmProxy(o, dm), variant });
      prewarmFound++;
    }
  }
}

// The shadow pass draws casters with three's shared depth material, whose
// program also depends on the light counts - so the night rig switching on
// at dusk used to link every depth program in-frame. A stand-in with the
// same program parameters (as WebGLShadowMap.getDepthMaterial sets them for
// PCF shadows) lets the warm-up above compile them for both rig variants.
const _shadowSides = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
const shadowDepthMats = new Map();
function shadowDepthStandIn(m) {
  const side = m.shadowSide != null ? m.shadowSide : _shadowSides[m.side];
  const map = m.map || null;
  const k = side + '|' + (map ? map.id : 0) + '|' + (m.alphaMap ? m.alphaMap.id : 0) + '|' + (m.alphaTest > 0 ? 1 : 0)
    + '|' + (m.displacementMap && m.displacementScale !== 0 ? m.displacementMap.id : 0) + '|' + (m.wireframe ? 1 : 0);
  let d = shadowDepthMats.get(k);
  if (!d) {
    d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side, map, alphaMap: m.alphaMap || null, alphaTest: m.alphaTest, wireframe: !!m.wireframe });
    if (m.displacementMap && m.displacementScale !== 0) Object.assign(d, { displacementMap: m.displacementMap, displacementScale: m.displacementScale, displacementBias: m.displacementBias });
    d.userData.shared = true;
    shadowDepthMats.set(k, d);
  }
  return d;
}

function withLightRig(on, fn) {
  const cur = isLightRigOn();
  setLightRigVisible(on);
  try { return fn(); } finally { setLightRigVisible(cur); }
}

function prewarmCamera() {
  if (!prewarmCam) prewarmCam = new THREE.PerspectiveCamera();
  prewarmCam.copy(cam, false);
  prewarmCam.layers.set(PREWARM_LAYER);
  return prewarmCam;
}

function startPrewarmBatch() {
  const variant = prewarmQueue[0].variant;
  const items = [];
  for (let i = 0; i < prewarmQueue.length && items.length < 64;) {
    if (prewarmQueue[i].variant !== variant) { i++; continue; }
    const { proxy } = prewarmQueue.splice(i, 1)[0];
    if (!prewarmProxyDead(proxy)) items.push(proxy);
  }
  if (!items.length) return;
  for (const p of items) prewarmRoot.add(p);
  const camera = prewarmCamera();
  // program keys depend on the target (tone mapping / output colour space
  // are only applied to the screen), so compile for the scene target
  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(postfx.sceneTarget);
  try {
    withLightRig(variant, () => renderer.compile(prewarmRoot, camera, scene));
  } finally {
    renderer.setRenderTarget(prevTarget);
  }
  const programs = new Set();
  for (const p of items) {
    const props = renderer.properties.get(p.material);
    if (props.programs) for (const pr of props.programs.values()) programs.add(pr);
  }
  prewarmBatch = { variant, programs, since: performance.now(), nextCheck: performance.now() + 2 * PREWARM_POLL_MS };
}

function drawPrewarmBatch() {
  const camera = prewarmCamera();
  const target = postfx.sceneTarget;
  const prevTarget = renderer.getRenderTarget();
  const autoShadow = renderer.shadowMap.autoUpdate;
  for (const p of [...prewarmRoot.children]) if (prewarmProxyDead(p)) prewarmRoot.remove(p);
  scene.add(prewarmRoot);
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(target);
  if (target) { target.scissor.set(0, 0, 1, 1); target.scissorTest = true; } else { renderer.setScissor(0, 0, 1, 1); renderer.setScissorTest(true); }
  try {
    withLightRig(prewarmBatch.variant, () => renderer.render(scene, camera));
  } finally {
    if (target) { target.scissorTest = false; target.scissor.set(0, 0, target.width, target.height); } else renderer.setScissorTest(false);
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.autoUpdate = autoShadow;
    scene.remove(prewarmRoot);
    for (const p of prewarmRoot.children) {
      if (p.isSkinnedMesh) p.skeleton.dispose();
      else if (p.isInstancedMesh) p.dispose();
    }
    prewarmRoot.clear();
  }
}

function prewarmLightVariants() {
  const variant = !isLightRigOn();
  if (variant !== prewarmLastVariant) { prewarmLastVariant = variant; prewarmQuiet = 0; }
  const kids = scene.children;
  for (let i = 0, n = Math.min(prewarmQuiet >= 2 ? PREWARM_SLICE_QUIET : PREWARM_SLICE, kids.length); i < n; i++) {
    if (prewarmCursor >= kids.length) { prewarmCursor = 0; prewarmQuiet = prewarmFound ? 0 : prewarmQuiet + 1; prewarmFound = 0; }
    const o = kids[prewarmCursor++];
    if (o !== prewarmRoot) scanForPrewarm(o, variant);
  }
  if (prewarmBatch) {
    // A completion query is a synchronous round trip to the GPU process that
    // waits out its backlog (later ones in the same task are cheap), so ask
    // only every PREWARM_POLL_MS; ready programs are dropped from the list.
    const now = performance.now();
    const B = prewarmBatch;
    if (now - B.since < PREWARM_WAIT_MS) {
      if (now < B.nextCheck) return;
      B.nextCheck = now + PREWARM_POLL_MS;
      for (const p of B.programs) {
        if (!p.isReady()) return;
        B.programs.delete(p);
      }
    }
    drawPrewarmBatch();
    prewarmBatch = null;
  }
  if (prewarmQueue.length) startPrewarmBatch();
}

// Starts compiling (in the background, KHR_parallel_shader_compile) the
// programs of an object that will enter the scene soon, e.g. a prefetched
// building, so its first frame doesn't link them synchronously.
function precompile(obj) {
  const prev = renderer.getRenderTarget();
  renderer.setRenderTarget(postfx.sceneTarget);
  try { renderer.compile(obj, cam, perfOff('compileklein') ? scene : compileScene()); } finally { renderer.setRenderTarget(prev); }
}

// renderer.compile walks the whole target scene (all ~9000 nodes) to find the lights, once per call: for every
// building built that was 0.3 to 1 ms and ~6% of the main thread while flying. The programs only depend on the
// lights, the fog and the environment, so it gets a scene that holds just those (the lights are looked up again
// every 1.5 s; the light rig's on/off is the lights' own visible flag, which compile reads).
let compileSceneObj = null, compileLightsAt = -1e9;
function compileScene() {
  const now = performance.now();
  if (!compileSceneObj) { compileSceneObj = new THREE.Scene(); compileSceneObj.matrixAutoUpdate = false; compileSceneObj.children = []; }
  if (now - compileLightsAt > 1500) {
    compileLightsAt = now;
    const lights = [];
    scene.traverse((o) => { if (o.isLight) lights.push(o); });
    compileSceneObj.children = lights;
  }
  compileSceneObj.fog = scene.fog;
  compileSceneObj.environment = scene.environment;
  return compileSceneObj;
}

// Load-time warm-up for objects that are not in the scene yet (actors and
// effects that only spawn later): their programs are compiled for both rig
// variants in the background, then drawn once like the stand-ins above.
export function prewarmObjects(roots) {
  if (!renderer) return;
  for (const r of roots) {
    r.updateMatrixWorld(true);
    scanForPrewarm(r, !isLightRigOn(), true);
    warmupBuilt.push(r);
  }
}

// One sample of everything that spawns later, built one per frame from the
// title screen on and handed to prewarmObjects; disposed once warmed.
let warmupQueue = null;
const warmupBuilt = [];
// Extra warm-ups van andere modules (main.js vraagt intromontage om de vaste
// assets van de openingsfilm): zelfde pad, dus beide lichtstanden en opruimen.
const extraWarmups = [];
export function queueWarmupObject(build) { extraWarmups.push(build); }
export function prewarmBusy() { return !!(extraWarmups.length || (warmupQueue && warmupQueue.length) || warmupBuilt.length || prewarmQueue.length || prewarmBatch); }
let warmupId = -1e6;
function queueWarmup(world) {
  const map = world.map;
  const roads = gridItems(map.roadGrid);
  const road = roads.find((r) => r.cat === 'normal' && !r.z && r.pts.length >= 2) || roads[0];
  const veh = (o = {}) => () => {
    const v = spawnVehicleOnRoad(map, road, !!o.police, Math.random, !!o.bike, !!o.bus, null, !!o.scooter);
    v.id = warmupId--;
    if (o.model) v.model = o.model;
    if (o.wreck) v.wrecked = true;
    return buildVehicleActor(v);
  };
  // every traffic model once, so their cached geometry exists before they spawn
  const models = TRAFFIC_MODELS().map((model) => veh({ model, bus: model.name === 'bus', scooter: model.name === 'scooter', bike: model.name !== 'bus' && model.name !== 'scooter' && model.len < 2.5 }));
  const boat = (police) => () => {
    const poly = gridItems(map.waterGrid).find((w) => w.bounds && w.bounds[2] - w.bounds[0] > 40);
    const v = poly && (police ? spawnPoliceBoatOnWater(map, poly) : spawnBoatOnWater(map, poly));
    if (!v) return null;
    v.id = warmupId--;
    return buildVehicleActor(v);
  };
  const ped = () => {
    const m = buildPersonActor(0x7a8f5a, 0xd9aa82, { seed: 77 });
    applyPedFade(m, 0.5);
    return m;
  };
  const critter = (kind, extra = {}) => () => buildWildlifeActor({ kind, x: 0, y: 0, angle: 0, bobSeed: 0.3, ...extra });
  warmupQueue = [
    ...models, veh({ police: true }), veh({ bus: true }), veh({ bike: true }), veh({ scooter: true }),
    veh({ wreck: true }), veh({ police: true, wreck: true }), boat(false), boat(true),
    ped, () => buildPersonActor(0x1f3f8f, 0xd9aa82, { seed: 5 }),
    critter('seagull'), critter('duck', { variant: 'drake' }), critter('pigeon'), critter('cat'), critter('dog'), critter('cow'), critter('sheep'),
    buildVehicleImpactSparkMesh3D, buildVehicleFireMesh3D, buildVehicleExplosionMesh3D, buildSplashMesh3D, buildKissHeartMesh,
    buildPoliceHeliMesh3D, buildMissionMarker3D, buildWaypointDotMesh3D, buildBalloonWarmup,
  ];
}

function stepWarmup(world) {
  if (!warmupQueue) queueWarmup(world);
  if (extraWarmups.length) {
    let obj = null;
    try { obj = extraWarmups.shift()(); } catch (e) { console.warn('warm-up', e); }
    if (obj) prewarmObjects([obj]);
  } else if (warmupQueue.length) {
    let obj = null;
    try { obj = warmupQueue.shift()(); } catch (e) { console.warn('warm-up', e); }
    if (obj) prewarmObjects([obj]);
  } else if (warmupBuilt.length && !prewarmQueue.length && !prewarmBatch) {
    for (const o of warmupBuilt) disposeObject(o);
    warmupBuilt.length = 0;
  }
}

// world.cameraOverride = { position: {x, y, z}, lookAt: {x, y, z}, fov? } in
// world coordinates (x/y on the map, z = height in metres). The camera eases
// in from the follow cam, tracks the override smoothly, and eases back out
// once it is cleared.
const CAM_OVERRIDE_BLEND_S = 0.9;
// The follow camera's own pose in map coordinates, kept up to date under a
// cutscene (collision included unless the override is a hard cut), so a
// scene can end exactly where play resumes.
const followPose = { position: { x: 0, y: 0, z: 0 }, lookAt: { x: 0, y: 0, z: 0 }, at: 0 };
export function getFollowPose() {
  return followPose.at && performance.now() - followPose.at < 500 ? followPose : null;
}
let overrideBlend = 0;
let overrideActive = false;
const overridePos = new THREE.Vector3();
const overrideLook = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _camTmp = new THREE.Vector3();

// Cutscene cameras are scripted paths that can swing through buildings.
// The camera itself must never be inside one: over a footprint it is lifted
// clear of the roof (quickly up, slowly back down, so no popping), and walls
// right next to it push it off so the near plane can't cut them open. The
// line of sight is left alone on purpose - landmark shots look *at* the
// building, and flyovers look down past rooftops.
let guardLift = 0;
const _guardSeen = new Set();
const _guardTargets = [];
function guardTargets() {
  _guardSeen.clear();
  _guardTargets.length = 0;
  for (const m of nearbyCamTargets(cam.position.x, cam.position.z)) {
    if (_guardSeen.has(m)) continue;
    _guardSeen.add(m);
    _guardTargets.push(m);
  }
  return _guardTargets;
}
function guardRay(ox, oy, oz, dx, dy, dz, far, targets) {
  camRayOrigin.set(ox, oy, oz);
  camRayDir.set(dx, dy, dz).normalize();
  camRaycaster.set(camRayOrigin, camRayDir);
  camRaycaster.near = 0.05;
  camRaycaster.far = far;
  const hits = camRaycaster.intersectObjects(targets, true);
  return hits.length ? hits[0].distance : null;
}
const GUARD_SAMPLES = [[0, 0]]; // only the camera point: walls beside it are handled by the push rays
function roofTopNear(map, x, y) {
  let top = 0;
  for (const [dx, dy] of GUARD_SAMPLES) {
    for (const b of map.buildingsNear(x + dx, y + dy, 1)) {
      if (hiddenBuildings.has(b)) continue;
      const [x0, y0, x1, y1] = b.bounds;
      const px = x + dx, py = y + dy;
      if (px < x0 || px > x1 || py < y0 || py > y1 || !pointInPolygon(px, py, b.pts)) continue;
      // a passage or a room (the museum) is open inside
      if (inPassage(map, b, px, py)) continue;
      // pitched roofs rise up to ~7 m over the wall top: keep a safe margin
      top = Math.max(top, (b.h || 3) * LEVEL_HEIGHT + (b.lift || 0) + (b.h <= 4 ? 7.5 : 2.5));
    }
  }
  return top;
}
const _guardLast = new THREE.Vector3(1e9, 0, 0);
function guardCinematicCamera(dt, world) {
  // a shot landing on the follow camera (override.follow) goes where play is, lift or not
  const landing = !!(world && world.cameraOverride && world.cameraOverride.follow);
  const need = world && world.map && !landing ? Math.max(0, roofTopNear(world.map, cam.position.x, cam.position.z) - cam.position.y) : 0;
  // a cut to another place starts from its own need, not the old shot's lift
  if (_guardLast.distanceToSquared(cam.position) > 144) guardLift = need;
  _guardLast.copy(cam.position);
  guardLift += (need - guardLift) * Math.min(1, dt * (need > guardLift ? 10 : 1.5));
  if (guardLift > 0.01) cam.position.y += guardLift;
  const targets = guardTargets();
  if (targets.length) {
    for (const [ax, ay, az] of CAM_PUSH_DIRS) {
      const h = guardRay(cam.position.x, cam.position.y, cam.position.z, ax, ay, az, CAM_CLEARANCE, targets);
      if (h === null) continue;
      const push = CAM_CLEARANCE - h;
      cam.position.x -= ax * push;
      cam.position.y -= ay * push;
      cam.position.z -= az * push;
    }
  }
  if (cam.position.y < 0.4) cam.position.y = 0.4;
}

function applyCameraOverride(dt, world, lx, ly, lz) {
  // binnen in de trein (traindrive.js, #442): de ogen van de machinist of van wie rondloopt, een harde cut
  const o = world.cameraOverride || (world.trainCam && world.trainCam.eye) || null;
  const valid = !!(o && o.position && o.lookAt);
  _camLook.set(lx, ly, lz);
  if (valid) {
    if (!overrideActive) {
      overrideActive = true;
      overridePos.copy(cam.position);
      overrideLook.copy(_camLook);
    }
    const k = o.cut ? 1 : Math.min(1, dt * 3);
    overridePos.lerp(_camTmp.set(o.position.x, o.position.z ?? 10, o.position.y), k);
    overrideLook.lerp(_camTmp.set(o.lookAt.x, o.lookAt.z ?? 1.3, o.lookAt.y), k);
    overrideBlend = o.cut ? 1 : Math.min(1, overrideBlend + dt / CAM_OVERRIDE_BLEND_S);
  } else {
    // (#463) Een override die ver van de speler stond - het titelbeeld is een
    // straatbeeld 1,6 km verderop, 0,6 m boven de kale kaart - laat de camera
    // niet in 0,9 s terugvliegen: op die weg komt hij over de lege kaart
    // ("onder het maaiveld") en dwars door de bebouwing ("in de gevel"). Ver
    // weg is een harde snee, dichtbij het vertrouwde zachte teruglopen.
    if (overrideBlend > 0 && cameraSnapNeeded(overridePos, cam.position)) overrideBlend = 0;
    overrideBlend = Math.max(0, overrideBlend - dt / CAM_OVERRIDE_BLEND_S);
    if (overrideBlend === 0) overrideActive = false;
  }
  const t = overrideBlend * overrideBlend * (3 - 2 * overrideBlend);
  if (t > 0) {
    cam.position.lerp(overridePos, t);
    _camLook.lerp(overrideLook, t);
    guardCinematicCamera(dt, world);
  } else {
    guardLift = 0;
  }
  cam.lookAt(_camLook);
  if (t <= 0.5) applyDrunkCamera(cam);
  if (fovPunch) { cam.fov -= fovPunch; fovPunch = 0; }
  // snelheids-FOV (#216): groeit zacht mee met de snelheid, uit bij bewegingsreductie en in cutscenes
  const pv = world && hoofdspeler(world) && hoofdspeler(world).inVehicle;
  speedFov = stepFov(speedFov, valid || !pv || pv.isBoat ? 0 : pv.speed || 0, dt, effectsFor({ reduceMotion: reducedMotion() || getSettings().speedFeel === false }));
  const targetFov = valid && o.fov ? o.fov : (baseFov + speedFov) * (1 - 0.72 * scopeBlend);
  if (cam.fov !== targetFov) {
    cam.fov = Math.abs(targetFov - cam.fov) < 0.05 || (valid && o.cut) || scopeBlend > 0 ? targetFov : cam.fov + (targetFov - cam.fov) * Math.min(1, dt * 3);
    cam.updateProjectionMatrix();
  }
  applyRecoil(dt, world, t > 0.5);
}

// Gun recoil (world.camKick from combat.js): the view snaps up and a little
// sideways, the FOV punches out, and both settle within ~0.3 s.
let fovPunch = 0;
let speedFov = 0;
function applyRecoil(dt, world, cinematic) {
  const k = world.camKick;
  if (!k || (k.pitch < 1e-4 && Math.abs(k.yaw) < 1e-4 && k.fov < 0.01)) return;
  if (!cinematic) {
    cam.rotateX(k.pitch);
    cam.rotateY(k.yaw);
    fovPunch = k.fov;
    cam.fov += fovPunch;
    cam.updateProjectionMatrix();
  }
  const d = Math.exp(-dt * 11);
  k.pitch *= d;
  k.yaw *= d;
  k.fov *= Math.exp(-dt * 13);
}

// --- time of day ---------------------------------------------------------

const lightState = {};
const lightBase = {
  fog: new THREE.Color(SKY_HORIZON), fogNear: DRAW_DIST * 0.45, fogFar: DRAW_DIST * 1.05,
  zenith: new THREE.Color(), horizon: new THREE.Color(), sunStrength: 1, glow: 0, daylight: 1,
};
const MOON_COLOR = new THREE.Color(0xdfe6f5);
const BED_COLOR = new THREE.Color(0x1e2a2c);
let wetness = 0;
let lastLight = null; // the clock's lighting of the last frame, read by the cloud layer
let envTimer = 0;
const _envGround = new THREE.Color();
const _envSun = new THREE.Color();

function applyTimeOfDay(dt, world) {
  const L = computeLighting(typeof world.clock === 'number' ? world.clock : 12, lightState);
  lastLight = L;
  // a cutscene's own grade on top of the clock's (intromontage.js: the dawn shot)
  if (world.lightMood) world.lightMood(L);
  const storm = world.weather ? Math.min(1, Math.max(0, world.weather.intensity)) : 0;
  // stars and moon vanish behind cloud and mist too, not only in rain (weer/nacht-controle: a starry sky above 'bewolkt' and 'mist')
  const cover = world.weather ? Math.min(1, Math.max(storm, (world.weather.overcast || 0) * 1.5, world.weather.mist || 0)) : 0;

  sunDir.copy(L.lightDir);
  sun.color.copy(L.sun);
  sun.userData._weatherBaseIntensity = L.sunI;
  hemi.color.copy(L.hemiSky);
  hemi.groundColor.copy(L.hemiGnd);
  hemi.userData._weatherBaseIntensity = L.hemiI;

  const u = skyUniforms;
  if (L.isMoon) {
    u.uSunDir.value.copy(L.moonDir);
    u.uSunColor.value.copy(MOON_COLOR);
    lightBase.sunStrength = 0.5 * L.night;
  } else {
    u.uSunDir.value.copy(L.sunDir);
    u.uSunColor.value.copy(L.sun);
    lightBase.sunStrength = 1 - L.night;
  }
  u.uMoonDir.value.copy(L.moonDir);
  u.uMoonPhase.value = moonPhase(world.calendar ? world.calendar.day : 1);
  u.uMoonStrength.value = Math.min(1, L.night * 1.4) * (1 - cover * 0.85);
  u.uGlowColor.value.copy(L.glow);
  u.uGlowDir.value.copy(L.sunDir);
  lightBase.glow = L.glowI;
  lightBase.zenith.copy(L.zenith);
  lightBase.horizon.copy(L.horizon);
  lightBase.fog.copy(L.fog);
  lightBase.daylight = L.daylight;

  renderer.toneMappingExposure = L.exp;
  setStarOpacity(skyDome, L.night * (1 - cover));
  setNightFactor(1.5 * L.night, litFraction('wonen', L.hour), litFraction('winkel', L.hour), litFraction('kantoor', L.hour));
  // the leaves' emissive fill fades with the same night as the windows (#463)
  TREE_CANOPY_MAT.emissiveIntensity = foliageGlow(L.night);
  farLod.setNight(1.5 * L.night, litFraction('wonen', L.hour));
  setCountryNight(1.5 * L.night, litFraction('wonen', L.hour));
  scene.fog.near = lightBase.fogNear;
  scene.fog.far = lightBase.fogFar;
  setTrafficLightGlow(1 + 3 * L.night);
  bedMaterial.color.copy(BED_COLOR).multiplyScalar(0.3 + 0.7 * L.daylight);

  // Streets get wet quickly in rain and dry off slowly afterwards.
  wetness += (storm - wetness) * Math.min(1, dt / (storm > wetness ? 6 : 40));
  WET_UNIFORMS.uWet.value = wetness;
  const envBoost = 1 + wetness * 3;
  for (const m of PAVED_MATS) m.envMapIntensity = envBoost;
  terrainMesh.material.envMapIntensity = envBoost;
  WET_UNIFORMS.uRainTime.value = world.time;
  WET_UNIFORMS.uPuddle.value = qualityLook(getSettings().quality).puddles;

  postfx.apply(L, storm);
}

// Re-bake the IBL from the (weather-adjusted) sky about once a second.
function updateEnvironment(dt) {
  envTimer -= dt;
  if (envTimer > 0 || (scene.userData.lightningFlash || 0) > 0) return;
  envTimer = 1;
  const u = skyUniforms;
  _envGround.copy(hemi.groundColor).multiplyScalar(0.35 + 0.65 * lightBase.daylight);
  _envSun.copy(sun.color).multiplyScalar(Math.min(1, sun.intensity / 3));
  scene.environment = envUpdater.update(u.uZenith.value, u.uHorizon.value, _envGround, sunDir, _envSun, 0.45);
}

// Shadow frustum centred a little ahead of the camera, snapped to whole
// shadow-map texels in light space so edges don't crawl as the player moves.
function updateSunAndSky(player, dt, world) {
  // how fast the focus moves: a fast one must not skip shadow passes
  // (focusSpeed comes from streambudget.js at the top of update3D, #247)
  _lightRight.crossVectors(_yAxis, sunDir);
  if (_lightRight.lengthSq() < 1e-8) _lightRight.set(1, 0, 0);
  _lightRight.normalize();
  _lightUp.crossVectors(sunDir, _lightRight).normalize();
  const fx = player.x - cam.position.x, fz = player.y - cam.position.z;
  const fl = Math.hypot(fx, fz) || 1;
  _shadowCenter.set(player.x + (fx / fl) * shadowHalf * 0.4, 0, player.y + (fz / fl) * shadowHalf * 0.4);
  const texel = (shadowHalf * 2) / sun.shadow.mapSize.x;
  const sc = snapShadowCenter(_shadowCenter, _lightRight, _lightUp, sunDir, texel);
  _shadowCenter.set(sc.x, sc.y, sc.z);
  sun.target.position.copy(_shadowCenter);
  sun.position.copy(_shadowCenter).addScaledVector(sunDir, SUN_DIST);
  skyDome.position.copy(cam.position);
  if (lastLight) updateCloudLayer(cloudLayer, cam.position, cam.far, world.weather, lastLight.daylight, lastLight.night, dt);
}

function buildWildlifeActor(a) {
  const mesh = buildWildlifeMesh3D(a);
  const blob = wildlifeShadowSize(a.kind);
  if (blob) addBlobShadow(mesh, blob[0], blob[1], 0.05);
  return mesh;
}

// Gentle swell: heave, roll and pitch from world.time plus a bow lift with
// speed. Needs rotation.order 'YXZ' (set in buildVehicleActor) so roll and
// pitch stay in the hull's own frame after the yaw.
// Buoyancy: the hull rides the same swell the water shader draws (sampled
// at bow, stern and both sides), long hulls averaging it out more; trim
// from speed (planing craft lift their bow), a dip of the bow when braking,
// a heel in turns, and per kind a little extra draft or lift. Whatever the
// pitch and roll, stern, bow and sides stay above the local water level.
const BOAT_TRIM = { rubberboot: 0.075, sloep: 0.035, dinghy: 0.04, rondvaart: 0.012, skutsje: 0.01, kano: 0.004, kajak: 0.004, sup: 0, waterfiets: 0.01, skiff: 0.004, acht: 0.004 };
const BOAT_LIFT = { skiff: 0.02, acht: 0.02, kano: 0.02, kajak: 0.02, sup: 0.03, rubberboot: 0.015, waterfiets: 0.01 };
const BOAT_CLEAR = { skiff: 0.05, acht: 0.05, sup: 0.035, kajak: 0.05, kano: 0.06 };
function animateBoat(mesh, v, world, dt) {
  const time = world.time;
  const kind = v.isPolice ? 'sloep' : v.model.kind || 'sloep';
  const L = v.model.len, W = v.model.wid, hl = L / 2, hw = W / 2;
  const prof = boatHullProfile(kind, L, W);
  const now = performance.now();
  let sh = v._shore;
  if (!sh || now - sh.at > 400 || Math.abs(sh.x - v.x) + Math.abs(sh.y - v.y) > 3) {
    const idx = world.map ? waterIndexAt(world.map, v.x, v.y) : null;
    const ns = idx ? idx.nearestShore(v.x, v.y, 24) : { d: 24, i: -1, tx: 1, ty: 0 };
    sh = v._shore = { at: now, x: v.x, y: v.y, d: ns.i >= 0 ? ns.d : 24, tx: ns.i >= 0 ? ns.tx : 1, ty: ns.i >= 0 ? ns.ty : 0, open: ns.i < 0 };
  }
  const c = Math.cos(v.angle), s = Math.sin(v.angle);
  const at = (lx, lz) => waterSwellAt(v.x + c * lx - s * lz, v.y + s * lx + c * lz, time, Math.max(0.15, sh.d - Math.abs(lz)), sh.tx, sh.ty);
  const xb = hl * 0.85;
  const hB = at(xb, 0), hS = at(-xb, 0), hP = at(0, -hw), hR = at(0, hw), h0 = at(0, 0);
  const resp = Math.min(1, Math.max(0.25, 3.2 / L));
  const speedT = Math.min(1, Math.abs(v.speed) / (v.model.maxSpeed || 6));
  const st = mesh.userData.buoy || (mesh.userData.buoy = { pitch: 0, roll: 0, heave: 0, speed: v.speed, angle: v.angle, acc: 0, yaw: 0 });
  const k = dt > 0 ? Math.min(1, dt * 4) : 1;
  if (dt > 0) {
    let da = v.angle - st.angle;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    st.yaw += (da / dt - st.yaw) * Math.min(1, dt * 3);
    st.acc += ((v.speed - st.speed) / dt - st.acc) * Math.min(1, dt * 3);
  }
  st.angle = v.angle; st.speed = v.speed;
  const seed = (v.id || 0) * 1.7;
  const trim = (BOAT_TRIM[kind] ?? 0.03) * speedT * (v.speed >= 0 ? 1 : -0.5) - Math.max(-0.03, Math.min(0.03, st.acc * -0.012 * (v.speed > 0 ? 1 : 0)));
  const planing = kind === 'rubberboot' ? 1 : -1;
  const heel = Math.max(-0.08, Math.min(0.08, st.yaw * Math.abs(v.speed) * 0.025 * planing * resp));
  const wip = golfWip(v, time);
  const pitchT = Math.atan2(hB - hS, 2 * xb) * resp + trim + Math.sin(time * 1.1 + seed) * 0.006 + wip.pitch;
  const rollT = Math.atan2(hP - hR, W) * Math.min(1, resp * 1.4) * 0.8 + heel + Math.sin(time * 1.4 + seed * 0.7) * 0.008 + wip.roll;
  const heaveT = (hB + hS + hP + hR + h0 * 2) / 6 * (0.6 + 0.4 * resp) + (BOAT_LIFT[kind] || 0);
  st.pitch += (pitchT - st.pitch) * k;
  st.roll += (rollT - st.roll) * k;
  st.heave += (heaveT - st.heave) * Math.min(1, k * 1.5);
  // no gunwale under the surface: lift the hull by the worst deficit
  const clear = (BOAT_CLEAR[kind] ?? 0.1) + (sh.open ? waterSwellAmp() * 0.5 : 0);
  const sp = Math.sin(st.pitch), sr = Math.sin(st.roll);
  const deficit = Math.max(
    hS + clear - (st.heave + prof.stern - sp * hl),
    hB + clear - (st.heave + prof.bow + sp * hl),
    hP + clear - (st.heave + prof.mid + sr * hw),
    hR + clear - (st.heave + prof.mid - sr * hw),
    0,
  );
  mesh.rotation.order = 'YZX';
  const base = WATER_Y + (v._lift || 0);
  mesh.position.y = base + st.heave + deficit;
  mesh.rotation.z = st.pitch;
  mesh.rotation.x = st.roll;
  v._buoyY = mesh.position.y - base;
}

function syncBoatWakes(world) {
  syncBoatWakes3D(scene, world, (v) => vehicleMeshes.has(v.id), world.dayNight?.night ?? 0);
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

// De route-ribbon en de wegwijzer-beacon wonen in scene3d/routeribbon3d.js (#502);
// setRouteLinks blijft hier nog een export, zodat main.js niets hoeft te wijzigen.
export { setRouteLinks } from './scene3d/routeribbon3d.js';









