// Route-ribbon en wegwijzer-beacon: het chevronlint op de weg voor de actieve
// route en het paaltje van het eigen waypoint. Afgesplitst uit scene3d.js zodat
// dat bestand leesbaar blijft (#502), zonder inhoudelijke wijziging: dezelfde
// namen, dezelfde volgorde, dezelfde commentaren.
//
// De naad naar scene3d.js loopt via een setter in plaats van een import terug
// (zoals audio.js en police.js eerder deden): de scene en de camera komen na
// init3D binnen via setRouteRibbonScene(), dus er is geen modulecyclus.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { markerColors } from '../a11y.js';
import { pathRole } from '../navtarget.js';
import { hoofdspeler } from '../players.js';
import { gameBusy } from '../busy.js';
import { SIDEWALK_EXTRA } from '../roadsurface.js';
import { ribbonAlpha, routeOffRoad } from '../routeribbon.js';
import { ribbonFault, needsAlphaFloor, noteRibbonRepair, RIBBON_ALPHA_FLOOR } from '../pathribbonwatch.js';
import { buildWorldMarker3D, updateWorldMarker3D } from '../worldmarker3d.js';
import { updateWaymarkers3D, routeColor } from '../waymarkers3d.js';
import { isAirCraft } from '../airguide.js';
import { keepRight, resamplePath } from '../pathlane.js';
import { updateAirLine3D, hideAirLine3D } from './airline3d.js';
import { updateVaarlijn3D, hideVaarlijn3D } from './sailline3d.js';

// scene en camera van scene3d.js; null tot init3D ze doorgeeft
let scene = null;
let cam = null;
export function setRouteRibbonScene(s, c) { scene = s; cam = c; }

// de titelkaart, het duivenveld en de cutscenes verbergen de navigatiehulp
export function hideRouteRibbon3D() {
  navHidden = true;
  hideAirLine3D();
  if (waypointBeacon) waypointBeacon.visible = false;
  if (routeRibbonMesh) routeRibbonMesh.visible = false;
  hideVaarlijn3D();
}

// Route ribbon: flat chevron strip on the road for the next stretch of the
// active route. Its polygonOffset sits above road markings (-8) and below
// blob shadows (-10) so cars and people still cast onto it.
const RIBBON_AHEAD_M = 80;
const RIBBON_HALF_W = 0.8;
const RIBBON_CHEVRON_M = 3;
const ROUTE_COLOR_3D = { user: 0xc068ff, mission: 0xf9c80e, job: 0xff9a3c };
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
  // #1178 (hertest 22-11): een donkere rand om elke chevron, zodat hij op licht klinker en op asfalt als pijl leest en
  // niet als een kaal geel vlak (de textuur wordt met de routekleur vermenigvuldigd: de rand wordt een donkere tint)
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,24,8,0.85)';
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Raised pavement (kerb) under a route point off the carriageway: the ribbon
// would otherwise vanish under the sidewalk mesh.
function routeLift(map, x, y) {
  let onKerb = false;
  for (const r of map.roadsNear(x, y, 6)) {
    if (r.cat !== 'major' && r.cat !== 'normal' && r.cat !== 'minor') continue;
    const hw = (r.width || 6) / 2;
    const P = r.pts;
    for (let k = 0; k < P.length - 1; k++) {
      const ex = P[k + 1][0] - P[k][0], ey = P[k + 1][1] - P[k][1];
      const l2 = ex * ex + ey * ey || 1;
      const t = Math.max(0, Math.min(1, ((x - P[k][0]) * ex + (y - P[k][1]) * ey) / l2));
      const d = Math.hypot(x - P[k][0] - ex * t, y - P[k][1] - ey * t);
      if (d < hw - 0.1) return 0;
      if (r.cat !== 'minor' && d < hw + SIDEWALK_EXTRA + 0.2) onKerb = true;
    }
  }
  return onKerb ? 0.14 : 0;
}

function buildRouteRibbonGeometry(pts, along0, map = null, z0 = 0) {
  if (pts.length >= 2) pts = resamplePath(pts);
  const n = pts.length;
  // follow the ring's ramps: each point takes the surface nearest the previous one
  const zs = new Float32Array(n);
  const elev = map && map.elev && map.elev.has;
  const st = elev ? { z: z0, ribbon: map.ribbonAt(pts[0][0], pts[0][1], z0) } : null;
  const midRaw = Math.floor(n / 2);
  let rawMid = 0;
  for (let i = 0; i < n; i++) {
    if (elev) zs[i] = map.surfaceAt(pts[i][0], pts[i][1], st).z;
    if (i === midRaw) rawMid = zs[i];
    if (map && Math.abs(zs[i]) < 0.3) zs[i] += routeLift(map, pts[i][0], pts[i][1]);
  }
  const pos = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), col = new Float32Array(n * 2 * 4);
  const idx = [];
  let dist = 0;
  const total = (() => { let t = 0; for (let i = 1; i < n; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; })();
  // Ligt de hele strook van de verharding af (route over gras, of de wegen zijn nog niet geladen), dan zou hij
  // overal alpha 0 krijgen en "ineens" weg zijn terwijl de minimap de route nog toont: geef hem een bodem.
  const offs = new Float32Array(n);
  let floor = 0;
  if (map) {
    let d0 = 0;
    const alphas = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) d0 += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      offs[i] = routeOffRoad(map, pts[i][0], pts[i][1]);
      alphas.push(ribbonAlpha(d0, total, offs[i]));
    }
    if (needsAlphaFloor(alphas)) floor = RIBBON_ALPHA_FLOOR;
  }
  let maxAlpha = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    const nx = -dy * RIBBON_HALF_W, ny = dx * RIBBON_HALF_W;
    // (en uitdoven zodra de route de verharding verlaat: geen gele verf over een gazon of akker, #502)
    const alpha = ribbonAlpha(dist, total, map ? offs[i] : 0, floor);
    if (alpha > maxAlpha) maxAlpha = alpha;
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      const j = i * 2 + k;
      pos[j * 3] = pts[i][0] + nx * side;
      pos[j * 3 + 1] = zs[i];
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
  // voor de waakhond: de hoogste alpha en een steekpunt om te zien of de grond eronder verschoven is
  // (z van het steekpunt met dezelfde vraag als de waakhond stelt, zodat een gelijke grond nooit als verschoven telt)
  g.userData = { maxAlpha, probe: elev ? { x: pts[midRaw][0], y: pts[midRaw][1], z: map.surfaceAt(pts[midRaw][0], pts[midRaw][1], { z: rawMid, ribbon: map.ribbonAt(pts[midRaw][0], pts[midRaw][1], rawMid) }).z } : null };
  return g;
}

// routing.js (shops, goal, ...) comes in through main.js (setRouteLinks), so scene3d.js does not import it (#108)
const routeLinks = { getActiveRoute: () => null, getRouteAhead: () => null, getUserWaypoint: () => null };
export function setRouteLinks(l) { Object.assign(routeLinks, l); }

// --- waakhond (pathribbonwatch.js) ---
const RIBBON_WATCH_S = 0.5;
let watchT = 0;
let ribbonBuildFailed = false;
let ribbonRetryAt = 0;
let navHidden = false; // hideRouteRibbon3D() van het vorige frame: de navigatie hoort dan weg te zijn
let errorsSeen = 0;

function reportRibbonError(waar, e) {
  if (errorsSeen++ < 3) console.warn(`[route] fout in de 3D-routelijn (${waar})`, e);
}

// De staat van de strook, zoals de waakhond hem leest.
function ribbonState(map, wanted) {
  const m = routeRibbonMesh;
  const g = m && m.geometry;
  const pos = g && g.attributes.position;
  let groundDelta = 0;
  const pr = g && g.userData && g.userData.probe;
  if (pr && map && map.surfaceAt) {
    try { groundDelta = map.surfaceAt(pr.x, pr.y, { z: pr.z, ribbon: map.ribbonAt(pr.x, pr.y, pr.z) }).z - pr.z; } catch (e) { groundDelta = 0; }
  }
  return {
    wanted,
    meshExists: !!m,
    buildFailed: ribbonBuildFailed,
    inScene: !!(m && m.parent),
    visible: !!(m && m.visible),
    opacity: m ? m.material.opacity : 0,
    indexCount: g && g.index ? g.index.count : 0,
    finite: !pos || Number.isFinite(pos.array[0]) && Number.isFinite(pos.array[pos.array.length - 2]),
    maxAlpha: g && g.userData && g.userData.maxAlpha != null ? g.userData.maxAlpha : 1,
    groundDelta,
  };
}

export function updateRouteRibbon3D(dt, world) {
  const navHiddenNow = navHidden;
  navHidden = false;
  const wp = gameBusy(world) ? null : routeLinks.getUserWaypoint();
  if (wp) {
    if (!waypointBeacon) {
      waypointBeacon = buildWorldMarker3D('user');
      scene.add(waypointBeacon);
    }
    waypointBeacon.visible = true;
    waypointBeacon.position.set(wp.x, wp.z || 0, wp.y);
    updateWorldMarker3D(waypointBeacon, performance.now() / 1000);
  } else if (waypointBeacon) {
    waypointBeacon.visible = false;
  }

  const route = routeLinks.getActiveRoute();
  // station signs, air rings: the markers of the train and the air (the boat has its own line, sailline3d.js)
  // (in een try: een fout hier mocht de strook hieronder niet meer laten bijwerken)
  try {
    updateWaymarkers3D(scene, performance.now() / 1000, route, route && route.mode !== 'boat' && route.remaining > 10 ? routeLinks.getRouteAhead(260) : null, cam);
  } catch (e) { reportRibbonError('waymarkers', e); }
  // op het water: een doorlopende vaarlijn (sailline3d.js) in plaats van boeien
  try {
    updateVaarlijn3D(dt, scene, route, routeLinks.getRouteAhead, world, routeColor(route, markerColors()[pathRole(route && route.kind)] || markerColors().mission));
  } catch (e) { reportRibbonError('vaarlijn', e); }
  // In een luchtvaartuig is de route een rechte lijn door de lucht (airline3d.js) en bouwen we geen grondstrook:
  // geen wegroute-herberekening in de scene en de waakhond hieronder verwacht dan geen strook.
  const pl0 = hoofdspeler(world);
  const flying = isAirCraft(world, pl0);
  try {
    const v0 = pl0 && pl0.inVehicle;
    updateAirLine3D(scene, dt, flying, route, flying && pl0 ? { x: v0 ? v0.x : pl0.x, y: v0 ? v0.y : pl0.y, z: v0 ? v0.z || 0 : pl0.gz || 0, angle: v0 ? v0.angle : pl0.angle, speed: v0 ? v0.speed : 0, plane: !!(v0 && v0.isPlane) } : null, world.map);
  } catch (e) { reportRibbonError('luchtlijn', e); }
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
  const ahead = route && route.remaining > 10 && route.mode !== 'boat' && route.mode !== 'fly' && !flying ? routeLinks.getRouteAhead(RIBBON_AHEAD_M) : null;
  if (!ahead || ahead.length < 2) {
    routeRibbonMesh.visible = false;
    routeRibbonKey = '';
    ribbonBuildFailed = false;
    return;
  }
  // Waakhond (een paar keer per seconde): klopt de strook nog met de actieve route? Zo niet, herstel en tel.
  watchT += dt;
  if (watchT >= RIBBON_WATCH_S) {
    watchT = 0;
    const fault = ribbonFault(ribbonState(world.map, !navHiddenNow));
    if (fault) {
      const n = noteRibbonRepair(fault);
      if (n === 1) console.warn(`[route] de 3D-routelijn was weg (${fault}); hersteld`);
      routeRibbonKey = '';
      ribbonBuildFailed = false;
    }
  }
  routeRibbonMesh.visible = true;
  if (!routeRibbonMesh.parent) scene.add(routeRibbonMesh);
  const key = `${route.version}:${route.mode}:${Math.round(route.px / 2)}:${Math.round(route.py / 2)}`;
  if (key !== routeRibbonKey && !(ribbonBuildFailed && performance.now() < ribbonRetryAt)) {
    // de sleutel pas na een gelukte bouw zetten: een fout liet eerst een lege strook staan tot je 2 m verder was
    try {
      const p0 = route.pts[route.idx];
      const lane = route.mode === 'drive' ? keepRight(ahead, world.map) : ahead;
      const pl = hoofdspeler(world);
      const geo = buildRouteRibbonGeometry(lane, route.cum[route.idx] + Math.hypot(route.px - p0[0], route.py - p0[1]), world.map, pl && pl.inVehicle ? pl.inVehicle.z || 0 : (pl && pl.gz) || 0);
      routeRibbonMesh.geometry.dispose();
      routeRibbonMesh.geometry = geo;
      routeRibbonMesh.material.color.set(routeColor(route, markerColors()[pathRole(route.kind)] || markerColors().mission)); // a11y.js palette
      routeRibbonKey = key;
      ribbonBuildFailed = false;
    } catch (e) {
      ribbonBuildFailed = true;
      ribbonRetryAt = performance.now() + 1000;
      reportRibbonError('bouw', e);
    }
  }
  routeRibbonMesh.material.map.offset.y -= dt * 0.8;
}

// het aantal herstelacties van de waakhond, voor de technische info
export { getRouteRibbonStats } from '../pathribbonwatch.js';
