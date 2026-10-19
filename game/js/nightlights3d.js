import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { WATER_Y } from './util.js';
import { buildingAt } from './tileplace.js';
import { makeProp, addProp, removeProp, isPropBroken, propKey } from './breakables.js';
import { policeFlash } from './models3d_vehicles.js';
import { lampRule } from './streetfurniture.js';
import { hash2 as hash } from './rng.js';
import { SpatialGrid } from './spatialgrid.js';

// Night lighting: instanced street lamps along road edges with additive
// light-pool decals, a small pool of real PointLights handed to the lamps
// nearest the player, and vehicle head/tail lights (lamp glow, instanced
// ground cones, a couple of real SpotLights for the player and nearest cars).

const LAMP_SPACING = 28;
const LAMP_CATS = new Set(['major', 'normal', 'minor']);
// squares, alleys and cycle paths get their own, sparser lamps
const PATH_CATS = new Set(['foot', 'cycle']);
const PATH_SPACING = 30;
const LAMP_MIN_GAP = 13;
const LAMP_GRID = 16;
const LAMP_VIEW = 150;
const LAMP_MAX = 1400;
const POLE_H = 5.6;
const ARM = 1.35;
const HEAD_Y = POLE_H - 0.2;
const POOL_SIZE = 11;
const LAMP_COLOR = new THREE.Color(0xffb66e);
const LAMP_REAL_RANGE = 38;
const LAMP_REAL_I = 34;
const CONE_MAX = 96;
const VEH_LIGHT_DIST = 95;
const SPOT_I = 28;
const PROP_RADIUS = 80;
const POLICE_COLOR = new THREE.Color(0x2a56ff);
const POLICE_I = 46;
const POLICE_RANGE = 19;
const POLICE_VIEW = 75;
const SEARCH_COLOR = new THREE.Color(0xfff2dc);
const SEARCH_LUX = 10;

let scene = null;
let poleMesh = null, headMesh = null, poolMesh = null;
let coneMesh = null, tailMesh = null;
const pointLights = [];
const spotLights = [];
const policeLights = [];
let searchSpot = null;
let searchReq = null;
// dark-rig state, see updateLightRig
const RIG_OFF_DELAY_MS = 2000;
let rigOn = true;
let rigLitAt = 0;
const lampGrid = new SpatialGrid(LAMP_GRID);
let visible = [];
let propLamps = [];
let lastBuildX = Infinity, lastBuildY = Infinity;
let lastNight = -1, lastWet = -1;

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _e = new THREE.Euler(0, 0, 0, 'YZX');
const _c = new THREE.Color();

function radialTexture(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Head-light cone footprint: bright near the car, fanning out and fading.
function coneTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(128, 64);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 128; x++) {
      const u = x / 127, v = (y / 63) * 2 - 1;
      const spread = 0.18 + u * 0.82;
      const side = Math.max(0, 1 - Math.abs(v) / spread);
      const a = Math.pow(side, 1.4) * Math.pow(1 - u, 1.6) * Math.min(1, u * 8);
      const i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}

function decalMaterial(map) {
  return new THREE.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    polygonOffset: true, polygonOffsetFactor: -9, polygonOffsetUnits: -36,
  });
}

function buildPoleGeometry() {
  const parts = [];
  parts.push(new THREE.CylinderGeometry(0.06, 0.09, POLE_H, 7).translate(0, POLE_H / 2, 0));
  parts.push(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 7).translate(0, 0.25, 0));
  parts.push(new THREE.BoxGeometry(ARM, 0.06, 0.06).translate(ARM / 2, POLE_H - 0.08, 0));
  parts.push(new THREE.BoxGeometry(0.62, 0.13, 0.3).translate(ARM, HEAD_Y + 0.02, 0));
  return mergeGeometries(parts);
}

function mergeGeometries(list) {
  let count = 0;
  const flat = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; count += n.attributes.position.count; return n; });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of flat) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export function initNightLights(targetScene) {
  scene = targetScene;
  poleMesh = new THREE.InstancedMesh(buildPoleGeometry(), new THREE.MeshStandardMaterial({ color: 0x2c3230, roughness: 0.55, metalness: 0.35, flatShading: true }), LAMP_MAX);
  poleMesh.castShadow = true;
  poleMesh.userData.kind = 'streetlamp';
  poleMesh.receiveShadow = true;
  const headGeo = new THREE.PlaneGeometry(0.52, 0.22).rotateX(Math.PI / 2).translate(ARM, HEAD_Y - 0.05, 0);
  headMesh = new THREE.InstancedMesh(headGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), LAMP_MAX);
  const poolGeo = new THREE.PlaneGeometry(POOL_SIZE, POOL_SIZE).rotateX(-Math.PI / 2).translate(ARM, 0.05, 0);
  poolMesh = new THREE.InstancedMesh(poolGeo, decalMaterial(radialTexture([[0, 0.9], [0.35, 0.45], [0.7, 0.12], [1, 0]])), LAMP_MAX);
  poolMesh.renderOrder = 2;
  for (const m of [poleMesh, headMesh, poolMesh]) {
    m.count = 0;
    m.frustumCulled = false;
    scene.add(m);
  }
  headMesh.setColorAt(0, _c.setRGB(1, 1, 1));
  poolMesh.setColorAt(0, _c);

  const coneGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
  coneMesh = new THREE.InstancedMesh(coneGeo, decalMaterial(coneTexture()), CONE_MAX);
  const tailGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  tailMesh = new THREE.InstancedMesh(tailGeo, decalMaterial(radialTexture([[0, 0.8], [0.5, 0.3], [1, 0]])), CONE_MAX);
  tailMesh.material.color.setHex(0xff2a1a);
  for (const m of [coneMesh, tailMesh]) {
    m.count = 0;
    m.frustumCulled = false;
    m.renderOrder = 2;
    scene.add(m);
  }

  searchSpot = new THREE.SpotLight(SEARCH_COLOR, 0, 0, 0.3, 0.45, 2);
  scene.add(searchSpot);
  scene.add(searchSpot.target);

  // gun flashes light up their surroundings for a frame or two
  muzzleLight = new THREE.PointLight(MUZZLE_COLOR, 0, MUZZLE_RANGE, 2);
  scene.add(muzzleLight);
}

let muzzleLight = null;
let muzzleLevel = 0;
const MUZZLE_COLOR = new THREE.Color(0xffb45a);
const MUZZLE_RANGE = 11;
const MUZZLE_I = 60;
const MUZZLE_DECAY = 26;

// A gunshot at three.js position (x, y, z); strength ~1 for a pistol.
export function flashMuzzleLight(x, y, z, strength = 1) {
  if (!muzzleLight) return;
  muzzleLight.position.set(x, y, z);
  muzzleLevel = Math.max(muzzleLevel, strength);
}

function updateMuzzleLight(dt, night) {
  if (!muzzleLight) return;
  muzzleLight.intensity = muzzleLevel > 0.02 ? MUZZLE_I * muzzleLevel * (0.55 + 0.45 * night) : 0;
  muzzleLevel *= Math.exp(-MUZZLE_DECAY * dt);
}

// Real light count is fixed per quality preset (changing it recompiles
// every lit material), so lights are always present and only dimmed.
export function setNightLightQuality(level) {
  const nPoint = level === 'hoog' ? 6 : level === 'middel' ? 3 : 0;
  const nSpot = level === 'hoog' ? 2 : level === 'middel' ? 1 : 0;
  while (pointLights.length > nPoint) scene.remove(pointLights.pop());
  while (pointLights.length < nPoint) {
    const l = new THREE.PointLight(LAMP_COLOR, 0, 22, 1.7);
    l.visible = rigOn;
    l.userData.lamp = null;
    pointLights.push(l);
    scene.add(l);
  }
  while (spotLights.length > nSpot) { const s = spotLights.pop(); scene.remove(s); scene.remove(s.target); }
  while (spotLights.length < nSpot) {
    const s = new THREE.SpotLight(0xfff1dc, 0, 34, 0.55, 0.65, 1.4);
    s.visible = rigOn;
    spotLights.push(s);
    scene.add(s);
    scene.add(s.target);
  }
  for (const l of pointLights) l.userData.lamp = null;
  const nPolice = level === 'hoog' ? 3 : level === 'middel' ? 2 : 1;
  while (policeLights.length > nPolice) scene.remove(policeLights.pop());
  while (policeLights.length < nPolice) {
    const l = new THREE.PointLight(POLICE_COLOR, 0, POLICE_RANGE, 1.5);
    l.visible = rigOn;
    policeLights.push(l);
    scene.add(l);
  }
  for (const l of policeLights) l.userData.unit = null;
}

// Helicopter searchlights ask for the single shared SpotLight each frame;
// the strongest request wins (police over the trauma heli via `priority`).
export function requestSearchlight(ox, oy, oz, tx, ty, tz, radius, strength, priority = 0) {
  const score = strength + priority;
  if (strength <= 0.01 || (searchReq && searchReq.score >= score)) return;
  searchReq = { ox, oy, oz, tx, ty, tz, radius, strength, score };
}

function updateSearchlight() {
  if (!searchSpot) return;
  const r = searchReq;
  searchReq = null;
  if (!r) { searchSpot.intensity = 0; return; }
  searchSpot.position.set(r.ox, r.oy, r.oz);
  searchSpot.target.position.set(r.tx, r.ty, r.tz);
  searchSpot.target.updateMatrixWorld();
  const len = Math.max(1, Math.hypot(r.tx - r.ox, r.ty - r.oy, r.tz - r.oz));
  searchSpot.angle = Math.min(0.9, Math.atan(r.radius / len) * 1.25);
  // decay 2 with no cutoff: scale by len^2 so the pool is equally bright at any altitude
  searchSpot.intensity = SEARCH_LUX * r.strength * len * len;
}

function policeUnitActive(world, v) {
  if (v.wrecked || v.sinking) return false;
  return v.sirenOn || (v.isPolice && !v._mount && !v._commandeered && world.wanted > 0 && !v.hijacked && v.driver !== 'player');
}

function updatePoliceLights(world, vehicleMeshes, px, py, night) {
  if (!policeLights.length) return;
  const near = [];
  for (const v of world.vehicles) {
    if (!policeUnitActive(world, v) || !vehicleMeshes.has(v.id)) continue;
    const d = Math.hypot(v.x - px, v.y - py);
    if (d < POLICE_VIEW) near.push({ v, d });
  }
  near.sort((a, b) => a.d - b.d);
  const keep = new Set(near.slice(0, policeLights.length).map((n) => n.v));
  for (const l of policeLights) if (l.userData.unit && !keep.has(l.userData.unit)) l.userData.unit = null;
  for (const v of keep) {
    if (policeLights.some((l) => l.userData.unit === v)) continue;
    const free = policeLights.find((l) => !l.userData.unit);
    if (free) free.userData.unit = v;
  }
  const bright = 0.18 + 0.82 * smoothstep(0.05, 0.45, night);
  for (const l of policeLights) {
    const v = l.userData.unit;
    const f = v ? policeFlash(world.time, v.id) : 0;
    if (!f) { l.intensity = 0; continue; }
    const small = v.isScooter || v.isBike;
    const side = f * ((v.model.wid || 1.8) * 0.5 + (small ? 0.25 : 0.55));
    const ca = Math.cos(v.angle), sa = Math.sin(v.angle);
    const y = v.isBoat ? WATER_Y + 1.6 : (v.z || 0) + (small ? 1.3 : v.isBus ? 3.4 : 2.05);
    l.position.set(v.x - sa * side, y, v.y + ca * side);
    const d = Math.hypot(v.x - px, v.y - py);
    l.intensity = POLICE_I * bright * (small ? 0.45 : 1) * (1 - smoothstep(POLICE_VIEW * 0.7, POLICE_VIEW, d));
  }
}


function lampTooClose(x, y) {
  for (const l of lampGrid.queryRadius(x, y, LAMP_MIN_GAP)) if ((l.x - x) ** 2 + (l.y - y) ** 2 < LAMP_MIN_GAP * LAMP_MIN_GAP) return true;
  return false;
}

// every lamp ever made, by prop key: a road that is streamed in again (its
// tile was dropped and rebuilt) gets its lamps back instead of finding its own
// old ones in lampGrid and rejecting them as too close
const lampByKey = new Map();

function registerLamp(l) {
  lampByKey.set(l.key, l);
  lampGrid.insertPoint(l, l.x, l.y);
}

// Lamps are computed once per road and accepted first-come into a global
// grid, so the set is stable however the streaming order changes.
function lampsForRoad(road, map) {
  if (road._lamps) return road._lamps;
  road._lamps = [];
  const path = PATH_CATS.has(road.cat);
  if ((!LAMP_CATS.has(road.cat) && !path) || road.pts.length < 2) return road._lamps;
  const pts = road.pts;
  const h0 = hash(pts[0][0], pts[0][1]);
  const fixedSide = h0 < 0.5 ? 1 : -1;
  const offset = path ? (road.width || 3) / 2 + 0.5 : (road.width || 6) / 2 + 0.9;
  // spacing and height by road class and lamp type (streetfurniture.js
  // LAMP_RULES: an arm over the main roads, the lantern of residential
  // streets, a low pole on paths); the high masts of a motorway stand on its
  // reserve, so one carriageway's verge gets an arm
  const rule = lampRule(road);
  const spacing = path ? PATH_SPACING : Math.max(LAMP_SPACING, rule.spacing);
  const lampH = path ? POLE_H : Math.min(10, Math.max(POLE_H * 0.8, rule.h));
  let next = 4 + h0 * spacing * 0.6;
  let along = 0, idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1e-3) continue;
    const dx = (bx - ax) / len, dy = (by - ay) / len;
    while (next <= along + len) {
      const t = next - along;
      const side = road.cat === 'major' ? (idx % 2 ? 1 : -1) : fixedSide;
      const cx = ax + dx * t, cy = ay + dy * t;
      const x = cx - dy * offset * side, y = cy + dx * offset * side;
      idx++;
      next += spacing;
      const known = lampByKey.get(propKey('lamp', x, y));
      if (known) { road._lamps.push(known); continue; }
      if (buildingAt(map, x, y) || lampTooClose(x, y)) continue;
      if (map.offStreetLevel && map.offStreetLevel(x, y, 0.6)) continue;
      if (map.onCarriageway && map.onCarriageway(x, y, 0.4, road)) continue;
      const lamp = {
        x, y,
        angle: Math.atan2(cy - y, cx - x),
        threshold: 0.12 + hash(x, y) * 0.28,
        on: 0,
        key: propKey('lamp', x, y),
        hs: lampH / POLE_H,
      };
      lamp.lx = x + Math.cos(lamp.angle) * ARM;
      lamp.ly = y + Math.sin(lamp.angle) * ARM;
      registerLamp(lamp);
      road._lamps.push(lamp);
    }
    along += len;
  }
  return road._lamps;
}

export const lampsForRoadForTest = (road, map) => lampsForRoad(road, map);

// The lamps OSM maps (highway=street_lamp, the tiles' furniture rows k 'lamp')
// stand where they are mapped, turned to the nearest street; they claim their
// spots before the rule lamps of the roads fill the gaps.
function mappedLamp(map, m) {
  const [x, y] = m.pts[0];
  let best = null, bd = 25;
  for (const r of map.roadsNear(x, y, 12)) {
    if (!LAMP_CATS.has(r.cat) && !PATH_CATS.has(r.cat)) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const dx = r.pts[i + 1][0] - r.pts[i][0], dy = r.pts[i + 1][1] - r.pts[i][1], L2 = dx * dx + dy * dy || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - r.pts[i][0]) * dx + (y - r.pts[i][1]) * dy) / L2));
      const cx = r.pts[i][0] + dx * t, cy = r.pts[i][1] + dy * t, d2 = (cx - x) ** 2 + (cy - y) ** 2;
      if (d2 < bd) { bd = d2; best = [cx, cy, r]; }
    }
  }
  const angle = best ? Math.atan2(best[1] - y, best[0] - x) : 0;
  const lampH = best && !PATH_CATS.has(best[2].cat) ? Math.min(10, Math.max(POLE_H * 0.8, lampRule(best[2]).h)) : POLE_H;
  const known = lampByKey.get(propKey('lamp', x, y));
  if (known) return known;
  const lamp = { x, y, angle, threshold: 0.12 + hash(x, y) * 0.28, on: 0, key: propKey('lamp', x, y), hs: lampH / POLE_H, mapped: true };
  lamp.lx = x + Math.cos(angle) * ARM;
  lamp.ly = y + Math.sin(angle) * ARM;
  registerLamp(lamp);
  return lamp;
}

function lampProp(l) {
  if (!l.prop) {
    l.prop = makeProp('lamp', l.x, l.y, {
      key: l.key,
      onBreak: () => breakLamp(l),
      onRestore: () => { l.broken = false; lastBuildX = Infinity; },
      makeMesh: () => {
        const m = new THREE.Mesh(poleMesh.geometry, poleMesh.material);
        m.rotation.y = -l.angle;
        m.scale.y = l.hs || 1;
        return m;
      },
    });
  }
  return l.prop;
}

function breakLamp(l) {
  l.broken = true;
  l.on = 0;
  const i = visible.indexOf(l);
  if (i < 0) return;
  _m.makeScale(0, 0, 0);
  poleMesh.setMatrixAt(i, _m);
  headMesh.setMatrixAt(i, _m);
  poolMesh.setMatrixAt(i, _m);
  poleMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = poolMesh.instanceMatrix.needsUpdate = true;
  for (const pl of pointLights) if (pl.userData.lamp === l) { pl.userData.lamp = null; pl.intensity = 0; }
}

function rebuildVisible(world, px, py) {
  visible = [];
  const seen = new Set();
  // street lamps claim their spots before the path lamps fill the gaps
  for (const m of world.map.furniture || []) {
    if (m.k !== 'lamp' || !m.pts || Math.abs(m.pts[0][0] - px) > LAMP_VIEW || Math.abs(m.pts[0][1] - py) > LAMP_VIEW) continue;
    const l = m._lamp || (m._lamp = mappedLamp(world.map, m));
    if (l.broken || isPropBroken(l.key)) { l.broken = true; continue; }
    if (visible.length < LAMP_MAX) visible.push(l);
  }
  const near = world.map.roadsNear(px, py, LAMP_VIEW);
  const ordered = near.filter((r) => !PATH_CATS.has(r.cat)).concat(near.filter((r) => PATH_CATS.has(r.cat)));
  for (const road of ordered) {
    for (const l of lampsForRoad(road, road.net || world.map)) {
      if (seen.has(l) || Math.abs(l.x - px) > LAMP_VIEW || Math.abs(l.y - py) > LAMP_VIEW) continue;
      seen.add(l);
      if (l.broken || isPropBroken(l.key)) { l.broken = true; continue; }
      visible.push(l);
      if (visible.length >= LAMP_MAX) break;
    }
  }
  for (const l of propLamps) removeProp(l.prop);
  propLamps = [];
  visible.forEach((l, i) => {
    _q.setFromAxisAngle(_up, -l.angle);
    // a taller pole lifts its head with it; the pool spreads wider
    _m.compose(_p.set(l.x, 0, l.y), _q, _s.set(1, l.hs || 1, 1));
    poleMesh.setMatrixAt(i, _m);
    headMesh.setMatrixAt(i, _m);
    _m.compose(_p.set(l.x, 0, l.y), _q, _s.set(l.hs || 1, 1, l.hs || 1));
    poolMesh.setMatrixAt(i, _m);
    if (Math.abs(l.x - px) < PROP_RADIUS && Math.abs(l.y - py) < PROP_RADIUS && addProp(lampProp(l))) propLamps.push(l);
  });
  poleMesh.count = headMesh.count = poolMesh.count = visible.length;
  poleMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = poolMesh.instanceMatrix.needsUpdate = true;
  lastNight = -1;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function updateLampColors(night, wet) {
  const poolK = 0.3 * (1 + wet * 0.8);
  for (let i = 0; i < visible.length; i++) {
    const l = visible[i];
    if (l.broken) continue;
    l.on = smoothstep(l.threshold, l.threshold + 0.06, night);
    _c.setRGB(0.55, 0.55, 0.52).lerp(_c2.copy(LAMP_COLOR).multiplyScalar(9), l.on);
    headMesh.setColorAt(i, _c);
    _c.copy(LAMP_COLOR).multiplyScalar(l.on * poolK);
    poolMesh.setColorAt(i, _c);
  }
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;
  if (poolMesh.instanceColor) poolMesh.instanceColor.needsUpdate = true;
  poolMesh.visible = night > 0.05;
}
const _c2 = new THREE.Color();

function updateRealLampLights(px, py) {
  if (!pointLights.length) return;
  const near = [];
  for (const l of visible) {
    if (l.on <= 0.01) continue;
    const d = Math.hypot(l.lx - px, l.ly - py);
    if (d < LAMP_REAL_RANGE) near.push({ l, d });
  }
  near.sort((a, b) => a.d - b.d);
  const keep = new Set(near.slice(0, pointLights.length).map((n) => n.l));
  for (const light of pointLights) {
    if (light.userData.lamp && !keep.has(light.userData.lamp)) light.userData.lamp = null;
  }
  for (const n of near.slice(0, pointLights.length)) {
    if (pointLights.some((pl) => pl.userData.lamp === n.l)) continue;
    const free = pointLights.find((pl) => !pl.userData.lamp);
    if (free) free.userData.lamp = n.l;
  }
  for (const light of pointLights) {
    const l = light.userData.lamp;
    if (!l) { light.intensity = 0; continue; }
    const d = Math.hypot(l.lx - px, l.ly - py);
    light.position.set(l.lx, HEAD_Y * (l.hs || 1) - 0.25, l.ly);
    light.intensity = LAMP_REAL_I * l.on * (1 - smoothstep(LAMP_REAL_RANGE * 0.65, LAMP_REAL_RANGE, d));
  }
}

function lampMaterialsOf(mesh) {
  if (mesh.userData._lampMats) return mesh.userData._lampMats;
  const mats = [];
  mesh.traverse((o) => {
    if (!o.isMesh || !Array.isArray(o.material)) return;
    const m = o.material[2];
    if (m && m.isMeshBasicMaterial && m.vertexColors && !mats.includes(m)) mats.push(m);
  });
  mesh.userData._lampMats = mats;
  return mats;
}

// Only a car someone is driving has its lights on; parked, abandoned and
// burning ones sit dark (their lamp lenses dimmed, day and night).
function vehicleLightsOn(v) {
  if (v.wrecked || v.disabled || v.sinking) return false;
  // boats: nav lights on everything afloat except the parked hero boat
  if (v.isBoat) return v.driver === 'player' || !v.isHeroCar;
  if (v.parked) return false;
  if (v.model.noLight && v.driver !== 'player') return false;
  return v.driver === 'player' || !!v.road || !!v.countryDrive || !!v.racer || (v.isPolice && !v.hijacked);
}

export const UNLIT_LAMP = 0.32;

function updateVehicleLights(world, vehicleMeshes, px, py, lightsOn) {
  const glow = 1 + lightsOn * 5;
  let n = 0;
  const cand = [];
  for (const v of world.vehicles) {
    const mesh = vehicleMeshes.get(v.id);
    if (!mesh || v._mount === 'horse') continue;
    const on = vehicleLightsOn(v);
    // boats: nav lights only (dim coloured glass by day), no road cones
    const k = v.isBoat ? (on ? 0.45 + lightsOn * 5.5 : 0.45) : on ? glow : v.wrecked ? 0.12 : UNLIT_LAMP;
    for (const m of lampMaterialsOf(mesh)) {
      if (m.color.r !== k) m.color.setScalar(k);
    }
    if (!on || v.isBoat || lightsOn < 0.02 || n >= CONE_MAX) continue;
    const d = Math.hypot(v.x - px, v.y - py);
    if (d > VEH_LIGHT_DIST) continue;
    const two = v.isBike || v.isScooter;
    const len = v.model.len, wid = v.model.wid;
    // on the car's own road height and slope (viaducts, cuttings, ramps)
    const pitch = v.pitch || 0, cp = Math.cos(pitch), sp = Math.sin(pitch), z = v.z || 0;
    const ca = Math.cos(v.angle) * cp, sa = Math.sin(v.angle) * cp;
    _q.setFromEuler(_e.set(0, -v.angle, pitch));
    const coneLen = two ? 6 : v.isBus ? 13 : 11;
    const coneWid = two ? 2.2 : Math.max(4.2, wid * 2.6);
    _m.compose(_p.set(v.x + ca * len * 0.5, z + sp * len * 0.5 + 0.06, v.y + sa * len * 0.5), _q, _s.set(coneLen, 1, coneWid));
    coneMesh.setMatrixAt(n, _m);
    _m.compose(_p.set(v.x - ca * (len * 0.5 + 0.5), z - sp * (len * 0.5 + 0.5) + 0.06, v.y - sa * (len * 0.5 + 0.5)), _q, _s.set(two ? 1 : 1.8, 1, two ? 0.8 : wid * 1.3));
    tailMesh.setMatrixAt(n, _m);
    n++;
    if (!two || v.driver === 'player') cand.push({ v, d: v.driver === 'player' ? -1 : d });
  }
  if (n || coneMesh.count) coneMesh.instanceMatrix.needsUpdate = tailMesh.instanceMatrix.needsUpdate = true;
  coneMesh.count = tailMesh.count = n;
  coneMesh.material.color.setRGB(1, 0.93, 0.8).multiplyScalar(0.38 * lightsOn);
  tailMesh.material.color.setRGB(1, 0.16, 0.1).multiplyScalar(0.45 * lightsOn);

  cand.sort((a, b) => a.d - b.d);
  spotLights.forEach((s, i) => {
    const c = cand[i];
    if (!c || lightsOn < 0.02) { s.intensity = 0; return; }
    const v = c.v;
    const pitch = v.pitch || 0, z = v.z || 0;
    const ca = Math.cos(v.angle) * Math.cos(pitch), sa = Math.sin(v.angle) * Math.cos(pitch), sp = Math.sin(pitch);
    const front = v.model.len * 0.5;
    s.position.set(v.x + ca * front, z + sp * front + 0.75, v.y + sa * front);
    // tuning (#196): een heldere koplamp (v.tuning.zicht) schijnt feller en verder
    const zicht = v.tuning && v.tuning.zicht > 0 ? v.tuning.zicht : 1;
    s.target.position.set(v.x + ca * (front + 14 * zicht), z + sp * (front + 14 * zicht), v.y + sa * (front + 14 * zicht));
    s.distance = 34 * zicht;
    s.intensity = SPOT_I * lightsOn * (v.isBike || v.isScooter ? 0.4 : 1) * zicht;
  });
}

export function updateNightLights(world, vehicleMeshes, px, py, night, wet, dt = 1 / 60) {
  if (!poleMesh) return;
  updateMuzzleLight(dt, night);
  if (Math.hypot(px - lastBuildX, py - lastBuildY) > 12) {
    lastBuildX = px; lastBuildY = py;
    rebuildVisible(world, px, py);
  }
  if (Math.abs(night - lastNight) > 0.002 || Math.abs(wet - lastWet) > 0.02 || lastNight < 0) {
    lastNight = night;
    lastWet = wet;
    updateLampColors(night, wet);
  }
  updateRealLampLights(px, py);
  updateVehicleLights(world, vehicleMeshes, px, py, smoothstep(0.04, 0.3, night));
  updatePoliceLights(world, vehicleMeshes, px, py, night);
  updateSearchlight();
  updateLightRig();
}

// Dark rig: in daylight without police or heli lights every real light of
// the pool sits at zero intensity. Hiding them all then drops the local
// light loops from every lit shader - a separate program variant that
// scene3d pre-compiles (prewarmLightVariants) - so the picture is identical
// but each pixel is far cheaper. Back on the moment any light is needed.
const _rig = [];
function rigLights() {
  _rig.length = 0;
  for (const l of pointLights) _rig.push(l);
  for (const l of spotLights) _rig.push(l);
  for (const l of policeLights) _rig.push(l);
  if (searchSpot) _rig.push(searchSpot);
  if (muzzleLight) _rig.push(muzzleLight);
  return _rig;
}

function updateLightRig() {
  const now = performance.now();
  const all = rigLights();
  for (let i = 0; i < all.length; i++) if (all[i].intensity > 0) { rigLitAt = now; break; }
  const want = now - rigLitAt < RIG_OFF_DELAY_MS;
  if (want === rigOn) return;
  rigOn = want;
  for (const l of all) l.visible = want;
}

export function isLightRigOn() {
  return rigOn;
}

// Only for compiling the other program variant; restore right after.
export function setLightRigVisible(on) {
  for (const l of rigLights()) l.visible = on;
}

// Unit open cone for a light beam: apex at the origin, base radius 1 at y=-1.
export function makeBeamGeometry(segments = 24) {
  const g = new THREE.ConeGeometry(1, 1, segments, 6, true);
  g.translate(0, -0.5, 0);
  const p = g.attributes.position, along = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) along[i] = -p.getY(i);
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  return g;
}

// Additive "volumetric" beam: brightest along the core (soft silhouette via
// the view/normal angle), fading with length and towards the ground so the
// cut where the cone meets the street never shows, and dimmed by scene fog.
export function makeBeamMaterial(color = 0xfff1c8) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0 },
    }]),
    vertexShader: `
      attribute float aAlong;
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_vertex>
      void main() {
        vAlong = aAlong;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlong;
      varying vec3 vN;
      varying vec3 vV;
      #include <fog_pars_fragment>
      void main() {
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float len = mix(1.0, 0.4, vAlong) * (1.0 - smoothstep(0.75, 1.0, vAlong)) * smoothstep(0.0, 0.04, vAlong);
        float a = uOpacity * core * len;
        #ifdef USE_FOG
          a *= 1.0 - 0.85 * smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: true,
  });
}
