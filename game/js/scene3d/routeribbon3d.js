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
import { hoofdspeler } from '../players.js';
import { gameBusy } from '../busy.js';
import { SIDEWALK_EXTRA } from '../roadsurface.js';
import { ribbonAlpha, routeOffRoad } from '../routeribbon.js';
import { buildWorldMarker3D, updateWorldMarker3D } from '../worldmarker3d.js';
import { updateWaymarkers3D, routeColor } from '../waymarkers3d.js';

// scene en camera van scene3d.js; null tot init3D ze doorgeeft
let scene = null;
let cam = null;
export function setRouteRibbonScene(s, c) { scene = s; cam = c; }

// de titelkaart, het duivenveld en de cutscenes verbergen de navigatiehulp
export function hideRouteRibbon3D() {
  if (waypointBeacon) waypointBeacon.visible = false;
  if (routeRibbonMesh) routeRibbonMesh.visible = false;
}

// Route ribbon: flat chevron strip on the road for the next stretch of the
// active route. Its polygonOffset sits above road markings (-8) and below
// blob shadows (-10) so cars and people still cast onto it.
const RIBBON_AHEAD_M = 80;
const RIBBON_HALF_W = 0.8;
const RIBBON_CHEVRON_M = 3;
const ROUTE_COLOR_3D = { user: 0xc068ff, mission: 0xe8c93a, job: 0xff9a3c };
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

// Route points can be 50 m apart on a straight road; a ramp climbs more than
// groundHeightAt's step-up between two of them, so resample every 2 m.
function resampleRoute(pts, step = 2) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(L / step);
    for (let k = 1; k < n; k++) out.push([a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n)]);
    out.push(b);
  }
  return out;
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
  if (pts.length >= 2) pts = resampleRoute(pts);
  const n = pts.length;
  // follow the ring's ramps: each point takes the surface nearest the previous one
  const zs = new Float32Array(n);
  const elev = map && map.elev && map.elev.has;
  const st = elev ? { z: z0, ribbon: map.ribbonAt(pts[0][0], pts[0][1], z0) } : null;
  for (let i = 0; i < n; i++) {
    if (elev) zs[i] = map.surfaceAt(pts[i][0], pts[i][1], st).z;
    if (map && Math.abs(zs[i]) < 0.3) zs[i] += routeLift(map, pts[i][0], pts[i][1]);
  }
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
    // (en uitdoven zodra de route de verharding verlaat: geen gele verf over een gazon of akker, #502)
    const alpha = ribbonAlpha(dist, total, map ? routeOffRoad(map, pts[i][0], pts[i][1]) : 0);
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
  return g;
}

// Driving routes follow the right-hand lane (Dutch traffic): shift each
// point to the lane centre of the road it lies on; one-way roads stay centred.
function keepRight(pts, map) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const [x, y] = pts[i];
    let best = null, bestD = 16;
    for (const road of map.roadsNear(x, y, 4)) {
      if (road.cat === 'foot' || road.cat === 'cycle') continue;
      const rp = road.pts;
      for (let k = 0; k < rp.length - 1; k++) {
        const ex = rp[k + 1][0] - rp[k][0], ey = rp[k + 1][1] - rp[k][1];
        const l2 = ex * ex + ey * ey || 1;
        const t = Math.max(0, Math.min(1, ((x - rp[k][0]) * ex + (y - rp[k][1]) * ey) / l2));
        const d = (x - rp[k][0] - ex * t) ** 2 + (y - rp[k][1] - ey * t) ** 2;
        if (d < bestD) { bestD = d; best = road; }
      }
    }
    const off = best && !best.oneway ? Math.min(2.2, (best.width || 6) / 4) : 0;
    out.push([x - (dy / len) * off, y + (dx / len) * off]);
  }
  return out;
}

// routing.js (shops, goal, ...) comes in through main.js (setRouteLinks), so scene3d.js does not import it (#108)
const routeLinks = { getActiveRoute: () => null, getRouteAhead: () => null, getUserWaypoint: () => null };
export function setRouteLinks(l) { Object.assign(routeLinks, l); }

export function updateRouteRibbon3D(dt, world) {
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
  // buoys, station signs, air rings: the markers of the boat, the train and the air
  updateWaymarkers3D(scene, performance.now() / 1000, route, route && route.remaining > 10 ? routeLinks.getRouteAhead(260) : null, cam);
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
  const ahead = route && route.remaining > 10 && route.mode !== 'boat' && route.mode !== 'fly' ? routeLinks.getRouteAhead(RIBBON_AHEAD_M) : null;
  if (!ahead || ahead.length < 2) {
    routeRibbonMesh.visible = false;
    routeRibbonKey = '';
    return;
  }
  routeRibbonMesh.visible = true;
  const key = `${route.version}:${route.mode}:${Math.round(route.px / 2)}:${Math.round(route.py / 2)}`;
  if (key !== routeRibbonKey) {
    routeRibbonKey = key;
    routeRibbonMesh.geometry.dispose();
    const p0 = route.pts[route.idx];
    const lane = route.mode === 'drive' ? keepRight(ahead, world.map) : ahead;
    const pl = hoofdspeler(world);
    routeRibbonMesh.geometry = buildRouteRibbonGeometry(lane, route.cum[route.idx] + Math.hypot(route.px - p0[0], route.py - p0[1]), world.map, pl.inVehicle ? pl.inVehicle.z || 0 : pl.gz || 0);
    routeRibbonMesh.material.color.set(routeColor(route, markerColors()[route.kind] || markerColors().mission)); // a11y.js palette
  }
  routeRibbonMesh.material.map.offset.y -= dt * 0.8;
}
