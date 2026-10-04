import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BLOCK, PW, chash, edgeDistance, edgeRoad, villageOf, urbanWeight, realWater } from './countryfield.js';
import { REAL, RTILE, buildingsInTile, buildingModel } from './countryreal.js';
import { roadGap } from './countryedge.js';
import {
  ROAD_C, FARM_TYPES, openLand, blockPlan, blockPlanCached, villagePlan, turbineRow, turbineValid, pylonsAround, isPlanned, farmWorld,
  TREE_ROW_P, WILLOW_ROW_P, ROAD_ROW, planVersion,
} from './countryplan.js';
import {
  churchGeometry, turbineTowerGeometry, turbineRotorGeometry, lightGeometry, millBodyGeometry, millSailsGeometry,
  pylonGeometry, wireGeometry, flareGeometry, beltGeometry, farmSilhouetteGeometry, clumpGeometry, realSilhouetteGeometry,
  TURBINE_HUB, MILL_AXLE, PYLON_ARMS, TERP_H, CHURCH_SPAN,
} from './countrymodels.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { applyFacade, bldCode, STYLE, ROOF_PAL } from './countrybuilding.js';
import { markInstancesDirty } from './util.js';

// The Ommelanden skyline: church towers, turbine rows, poldermolens, pylon
// lines and a hazy band of tree belts and farm roofs on the horizon. One
// instanced layer whose vertex shader pulls anything beyond ~cam.far in
// along its view ray (same angular size), and whose haze follows the true
// distance: tall things stay faintly readable far past the fog, belts only
// appear where the ordinary props have faded. Nothing here moves on the
// CPU; rotors spin in the shader.

const R_TALL = 5200;
const R_BELT = 3300;
const WARM_MS = 0.7;
const GATHER_MS = 0.8;
const WIND_YAW = -Math.PI / 4; // rotors face the south-west wind

const U = {
  uFarR: { value: 900 }, uTime: { value: 0 },
  uCapT: { value: 0.5 }, uFarMulT: { value: 14 }, uFadeT: { value: 1 },
  uCapB: { value: 0.6 }, uFarMulB: { value: 9 }, uFadeB: { value: 1 },
};

function skyMaterial(key, { belt = false, rotor = 0, light = false } = {}) {
  const m = light ? new THREE.MeshBasicMaterial({ vertexColors: true }) : vcMaterial({ roughness: 0.9 });
  markShared(m);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    const head = `uniform float uFarR;\nuniform float uTime;\nvarying float vSkyD;\n`;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>\n${head}`).replace('#include <project_vertex>', `
${rotor ? `{
  float ang = uTime * ${rotor.toFixed(3)} + instanceMatrix[3].x * 0.0131 + instanceMatrix[3].z * 0.0291;
  float c = cos(ang), s = sin(ang);
  transformed = vec3(transformed.x, c * transformed.y - s * transformed.z, s * transformed.y + c * transformed.z);
}` : ''}
vec4 skyO = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
float skyD = distance(skyO.xyz, cameraPosition);
vSkyD = skyD;
vec4 skyW = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
${light ? 'skyW.xyz = skyO.xyz + (skyW.xyz - skyO.xyz) * max(1.6, skyD / 220.0);' : ''}
skyW.xyz = cameraPosition + (skyW.xyz - cameraPosition) * (skyD > uFarR ? uFarR / skyD : 1.0);
vec4 mvPosition = viewMatrix * skyW;
gl_Position = projectionMatrix * mvPosition;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform float uTime;
uniform float uCapT; uniform float uFarMulT; uniform float uFadeT;
uniform float uCapB; uniform float uFarMulB; uniform float uFadeB;
varying float vSkyD;`).replace('#include <fog_fragment>', `
${light ? 'gl_FragColor.rgb *= 0.12 + 0.88 * step(0.35, fract(uTime * 0.5 + 0.2));' : ''}
#ifdef USE_FOG
  float std = smoothstep(fogNear, fogFar, vSkyD);
  ${belt ? `float hz = max(1.0 - (1.0 - uCapB) * smoothstep(fogFar * 0.85, fogFar * 1.5, vSkyD), uCapB + (1.0 - uCapB) * smoothstep(fogFar * 1.6, fogFar * uFarMulB, vSkyD));
  hz = mix(1.0, hz, uFadeB);` : `float hz = min(std, uCapT + (1.0 - uCapT) * smoothstep(fogFar, fogFar * uFarMulT, vSkyD));
  hz = mix(std, hz, uFadeT);`}
  if (hz > 0.995) discard;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz);
#endif`);
  };
  m.customProgramCacheKey = () => 'skyline-' + key;
  return m;
}

const TYPES = {
  church0: { geo: () => churchGeometry(0), mat: 'church', cap: 160, shadow: true },
  church1: { geo: () => churchGeometry(1), mat: 'church', cap: 160, shadow: true },
  church2: { geo: () => churchGeometry(2), mat: 'church', cap: 60, shadow: true },
  church3: { geo: () => churchGeometry(3), mat: 'church', cap: 60, shadow: true },
  rbSil: { geo: realSilhouetteGeometry, mat: 'bld', cap: 9000 },
  rbSilFlat: { geo: () => realSilhouetteGeometry(true), mat: 'bld', cap: 3000 },
  turbine: { geo: turbineTowerGeometry, mat: 'tall', cap: 400, shadow: true },
  rotor: { geo: turbineRotorGeometry, mat: 'rotorT', cap: 400 },
  light: { geo: lightGeometry, mat: 'light', cap: 400 },
  mill: { geo: millBodyGeometry, mat: 'tall', cap: 80, shadow: true },
  sails: { geo: millSailsGeometry, mat: 'rotorM', cap: 80 },
  sailsStill: { geo: millSailsGeometry, mat: 'tall', cap: 80 },
  pylon: { geo: pylonGeometry, mat: 'tall', cap: 400, shadow: true },
  wire: { geo: wireGeometry, mat: 'tall', cap: 4000 },
  flare: { geo: flareGeometry, mat: 'tall', cap: 60, shadow: true },
  belt: { geo: beltGeometry, mat: 'belt', cap: 3000 },
  farmSil: { geo: farmSilhouetteGeometry, mat: 'belt', cap: 1500 },
  clump: { geo: clumpGeometry, mat: 'belt', cap: 3000 },
};

let K = null;

function init(scene) {
  const group = new THREE.Group();
  group.name = 'countryskyline';
  group.matrixAutoUpdate = false;
  scene.add(group);
  const mats = {
    tall: skyMaterial('tall'),
    belt: skyMaterial('belt', { belt: true }),
    rotorT: skyMaterial('rotorT', { rotor: 1.15 }),
    rotorM: skyMaterial('rotorM', { rotor: 0.55 }),
    light: skyMaterial('light', { light: true }),
    bld: skyMaterial('bld', { belt: true }),
    church: skyMaterial('church'),
  };
  // churches: the tall haze plus the facade's brick and painted windows
  applyFacade(mats.church, 'church', mats.church.onBeforeCompile);
  // the far real buildings: the belt haze plus the facade (lit windows at night)
  applyFacade(mats.bld, 'sky', mats.bld.onBeforeCompile);
  const pools = {};
  for (const [k, T] of Object.entries(TYPES)) {
    const mesh = new THREE.InstancedMesh(markShared(T.geo()), mats[T.mat], T.cap);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(T.cap * 3), 3);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = !!T.shadow;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.shared = true;
    group.add(mesh);
    pools[k] = mesh;
  }
  K = { group, pools, warm: [], warmKey: '', gather: null, built: null, buildAt: null, dirty: true, ms: 0 };
  window.__skyline = K;
}

// ------------------------------------------------------------------ gather

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const _e = new THREE.Euler(), _x = new THREE.Vector3(1, 0, 0), _d = new THREE.Vector3();

function put(L, type, x, h, y, rotY, sx, sy, sz, color = 0xffffff, code = 0) {
  const list = L[type] || (L[type] = { m: [], c: [] });
  if (list.c.length / 3 >= TYPES[type].cap) return;
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, h, y), _q, _s.set(sx, sy, sz));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  _c.set(color);
  list.c.push(_c.r + code * 2, _c.g, _c.b);
}

function putSeg(L, a, b, thick) {
  const list = L.wire || (L.wire = { m: [], c: [] });
  if (list.c.length / 3 >= TYPES.wire.cap) return;
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _d.length();
  _q.setFromUnitVectors(_x, _d.normalize());
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(len, thick, thick));
  for (let i = 0; i < 16; i++) list.m.push(_m.elements[i]);
  list.c.push(1, 1, 1);
}

const SIL_STYLE = { house: STYLE.house, block: STYLE.block, barn: STYLE.barn, shed: STYLE.shed, glass: STYLE.glass };
const ROOF_TINT = [0xa04a30, 0x5a5e62, 0x8a7a52];
const SIL_SCALE = { khr: [1, 1, 1], olda: [1.15, 1.15, 1.3], small: [0.5, 0.58, 0.46], dairy: [1.25, 0.62, 1.45] };

function* gatherGen(px, py, nearR) {
  const L = {};
  const b0x = Math.floor((px - R_TALL) / BLOCK), b1x = Math.floor((px + R_TALL) / BLOCK);
  const b0y = Math.floor((py - R_TALL) / BLOCK), b1y = Math.floor((py + R_TALL) / BLOCK);
  const rb2 = R_BELT * R_BELT, rt2 = R_TALL * R_TALL;
  let missing = 0;
  for (let by = b0y; by <= b1y; by++) {
    for (let bx = b0x; bx <= b1x; bx++) {
      const X = bx * BLOCK, Y = by * BLOCK;
      const d2 = (X + BLOCK / 2 - px) ** 2 + (Y + BLOCK / 2 - py) ** 2;
      if (d2 > (R_TALL + 700) ** 2) continue;
      if (edgeDistance(X + BLOCK / 2, Y + BLOCK / 2) < -BLOCK) continue;
      const P = blockPlanCached(bx, by);
      if (!P) { missing++; continue; }
      const v = P.village;
      if (v && (v.x - px) ** 2 + (v.y - py) ** 2 < rt2) {
        const V = villagePlan(v);
        put(L, V.saddle ? 'church0' : 'church1', v.x + 1, TERP_H - 0.1, v.y, 0, 1, 1, 1);
      }
      if (P.mill) {
        put(L, 'mill', P.mill.x, -0.05, P.mill.y, -WIND_YAW - 0.3, 1, 1, 1);
        const [ax, ay] = rot2(MILL_AXLE[0], 0, WIND_YAW + 0.3);
        put(L, P.mill.turning ? 'sails' : 'sailsStill', P.mill.x + ax, MILL_AXLE[1], P.mill.y + ay, -WIND_YAW - 0.3, 1, 1, 1);
      }
      if (P.gas) put(L, 'flare', P.gas.box[0] + 50, 0, P.gas.box[1] + 5, 0, 1, 1, 1);
      if (d2 < rb2) gatherBelts(L, P, bx, by);
    }
    yield;
  }
  // the real Ommelanden: church towers, and the roofs of the villages
  // beyond the prop radius (the belt haze keeps the near ones hidden)
  if (REAL.ready) {
    for (const c of REAL.churches) {
      if ((c.x - px) ** 2 + (c.y - py) ** 2 > rt2) continue;
      const f = churchFit(c);
      put(L, 'church' + f.v, f.x, -0.05, f.y, f.rot, f.sx, f.sy, f.sz);
    }
    yield;
    const n = Math.ceil(R_BELT / RTILE);
    const tx0 = Math.floor(px / RTILE), ty0 = Math.floor(py / RTILE);
    const tiles = [];
    for (let oy = -n; oy <= n; oy++) for (let ox = -n; ox <= n; ox++) if (ox * ox + oy * oy <= n * n && ox * ox + oy * oy >= 2) tiles.push([ox * ox + oy * oy, tx0 + ox, ty0 + oy]);
    tiles.sort((a, b) => a[0] - b[0]);
    let k = 0;
    // the countryside props draw everything within nearR themselves
    const nr2 = nearR * nearR;
    for (const [, tx, ty] of tiles) {
      const B = buildingsInTile(tx, ty);
      if (B) {
        for (const i of B) {
          if (REAL.bw[i] * REAL.bl[i] < 45 || (REAL.bx[i] - px) ** 2 + (REAL.by[i] - py) ** 2 < nr2) continue;
          const m = buildingModel(i);
          const style = SIL_STYLE[m.kind];
          if (m.roof > 0) put(L, 'rbSil', REAL.bx[i], -0.05, REAL.by[i], -m.angle, m.long, (m.wall + m.roof) * 0.98, m.short, m.color, bldCode(style, Math.max(0, ROOF_PAL.indexOf(m.roofColor))));
          else put(L, 'rbSilFlat', REAL.bx[i], -0.05, REAL.by[i], -m.angle, m.long, m.wall, m.short, m.color, bldCode(style));
        }
      }
      if (++k % 60 === 0) yield;
    }
  }
  // turbine rows (a row belongs to a 3x3-block macro cell)
  const M = BLOCK * 3;
  for (let my = Math.floor((py - R_TALL) / M); my <= Math.floor((py + R_TALL) / M); my++) {
    for (let mx = Math.floor((px - R_TALL) / M); mx <= Math.floor((px + R_TALL) / M); mx++) {
      for (const t of turbineRow(mx, my)) {
        if ((t.x - px) ** 2 + (t.y - py) ** 2 > rt2) continue;
        if (!isPlanned(t.x, t.y)) { missing++; continue; }
        if (!turbineValid(t)) continue;
        const s = t.hub / TURBINE_HUB;
        put(L, 'turbine', t.x, -0.05, t.y, -WIND_YAW, s, s, s);
        const [ax, ay] = rot2(-3.4 * s, 0, WIND_YAW);
        put(L, 'rotor', t.x + ax, (TURBINE_HUB + 0.4) * s, t.y + ay, -WIND_YAW, s, s, s);
        const [lx, ly] = rot2(4.6 * s, 0, WIND_YAW);
        put(L, 'light', t.x + lx, (TURBINE_HUB + 2.3) * s, t.y + ly, 0, 1, 1, 1);
      }
    }
    yield;
  }
  // pylon lines and their sagging conductors
  const { pylons, spans } = pylonsAround(px, py, R_TALL, [], [], isPlanned);
  for (const p of pylons) put(L, 'pylon', p.x, -0.05, p.y, -p.yaw, 1, 1, 1);
  yield;
  for (const [a, b] of spans) {
    for (const [h, half] of PYLON_ARMS) {
      for (const s of [-1, 1]) {
        const [ax, ay] = rot2(0, s * half, a.yaw), [bx2, by2] = rot2(0, s * half, b.yaw);
        const A = [a.x + ax, h - 2.1, a.y + ay], B = [b.x + bx2, h - 2.1, b.y + by2];
        const mid = [(A[0] + B[0]) / 2, h - 2.1 - 5.5, (A[2] + B[2]) / 2];
        const q1 = [(A[0] * 3 + B[0]) / 4, h - 2.1 - 4.1, (A[2] * 3 + B[2]) / 4];
        const q3 = [(A[0] + B[0] * 3) / 4, h - 2.1 - 4.1, (A[2] + B[2] * 3) / 4];
        putSeg(L, A, q1, 1); putSeg(L, q1, mid, 1); putSeg(L, mid, q3, 1); putSeg(L, q3, B, 1);
      }
    }
  }
  return { L, missing };
}

// The OSM church outline (the biggest church box within 35 m of the point)
// picks the variant and scales and turns it to fit, tower to the west.
function churchFit(c) {
  if (c._fit) return c._fit;
  let best = -1, ba = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      for (const i of buildingsInTile(Math.floor(c.x / RTILE) + ox, Math.floor(c.y / RTILE) + oy) || []) {
        if (REAL.code[i] !== 7 || Math.hypot(REAL.bx[i] - c.x, REAL.by[i] - c.y) > 35) continue;
        const a = REAL.bw[i] * REAL.bl[i];
        if (a > ba) { ba = a; best = i; }
      }
    }
  }
  const h = chash(Math.round(c.x), Math.round(c.y));
  if (best < 0) return (c._fit = { v: h < 0.6 ? 0 : 1, x: c.x + 1, y: c.y, rot: 0, sx: 1, sy: 1, sz: 1 });
  const w = REAL.bw[best], l = REAL.bl[best];
  let ang = w >= l ? REAL.ba[best] : REAL.ba[best] + Math.PI / 2;
  if (Math.cos(ang) < 0) ang += Math.PI;
  const long = Math.max(w, l), short = Math.min(w, l);
  const v = ba < 200 ? 3 : ba > 550 && short / long > 0.5 ? 2 : h < 0.6 ? 0 : 1;
  const [x0, x1, wd] = CHURCH_SPAN[v];
  const sx = Math.min(1.8, Math.max(0.55, long / (x1 - x0))), sz = Math.min(1.8, Math.max(0.6, short / wd));
  const sy = Math.min(1.35, Math.max(0.75, Math.sqrt(sx * sz)));
  // the template's footprint centre onto the outline's centre
  const mid = ((x0 + x1) / 2) * sx;
  const x = REAL.bx[best] - Math.cos(ang) * mid, y = REAL.by[best] - Math.sin(ang) * mid;
  return (c._fit = { v, x, y, rot: -ang, sx, sy, sz });
}

function rot2(lx, lz, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [lx * c - lz * s, lx * s + lz * c];
}

function gatherBelts(L, P, bx, by) {
  const X = bx * BLOCK, Y = by * BLOCK;
  const rot = chash(bx * 7 + 3, by * 13 + 1) < 0.5;
  const piece = (x0, y0, x1, y1, h, w, pieces = 4, roads = false) => {
    for (let i = 0; i < pieces; i++) {
      const ta = i / pieces, tb = (i + 1) / pieces, tm = (ta + tb) / 2;
      const ax = x0 + (x1 - x0) * ta, ay = y0 + (y1 - y0) * ta, bx2 = x0 + (x1 - x0) * tb, by2 = y0 + (y1 - y0) * tb;
      const mx = x0 + (x1 - x0) * tm, my = y0 + (y1 - y0) * tm;
      if (!openLand(ax, ay) || !openLand(bx2, by2) || inVillageDisc(mx, my)) continue;
      if (REAL.ready && (urbanWeight(mx, my) > 0.2 || realWater(mx, my) > -3)) continue;
      const hh = h * (0.9 + chash(Math.round(mx), Math.round(my)) * 0.25);
      const ang = -Math.atan2(by2 - ay, bx2 - ax);
      if (!roads) {
        put(L, 'belt', mx, 0, my, ang, Math.hypot(bx2 - ax, by2 - ay), hh, w);
        continue;
      }
      // a strip belt breaks where a road crosses it, like the near rows
      const n = Math.ceil(Math.hypot(bx2 - ax, by2 - ay) / 6);
      let run = -1;
      for (let k = 0; k <= n + 1; k++) {
        const clear = k <= n && roadGap(ax + ((bx2 - ax) * k) / n, ay + ((by2 - ay) * k) / n, w / 2) >= w / 2;
        if (clear && run < 0) run = k;
        if (clear || run < 0) continue;
        const k1 = k - 1;
        if (k1 > run) {
          const u = (run + k1) / 2 / n, len = (Math.hypot(bx2 - ax, by2 - ay) * (k1 - run)) / n;
          put(L, 'belt', ax + (bx2 - ax) * u, 0, ay + (by2 - ay) * u, ang, len, hh, w);
        }
        run = -1;
      }
    }
  };
  for (const s of [0, 1]) {
    if (!edgeRoad(bx, by, s)) continue;
    const kind = ROAD_ROW(bx, by, s);
    if (!kind) continue;
    const h = kind === 'poplar' ? 15 : 10;
    if (s === 0) piece(X + ROAD_C, Y, X + ROAD_C, Y + BLOCK, h, 13);
    else piece(X, Y + ROAD_C, X + BLOCK, Y + ROAD_C, h, 13);
  }
  for (let col = 1; col < BLOCK / PW; col++) {
    const lh = chash(col + bx * 131 + 900, by * 977 + (rot ? 7 : 3));
    if (lh >= TREE_ROW_P) continue;
    const a = col * PW;
    const h = lh < WILLOW_ROW_P ? 5.5 : 10;
    if (rot) piece(X, Y + a, X + BLOCK, Y + a, h, 6, 4, true);
    else piece(X + a, Y, X + a, Y + BLOCK, h, 6, 4, true);
  }
  for (const f of P.farms) {
    const T = FARM_TYPES[f.type], sc = SIL_SCALE[f.type];
    put(L, 'farmSil', f.x, -0.05, f.y, -f.angle, sc[0], sc[1], sc[2], ROOF_TINT[f.look % 3]);
    for (const s of [-1, 1]) {
      const [cx, cy] = farmWorld(f, T.depth - 8, s * (T.hw - 6));
      put(L, 'clump', cx, 0, cy, f.seed * 6 + s, 12, 11 + f.seed * 4, 12);
    }
    const [bx2, by2] = farmWorld(f, T.depth - 2, 0);
    put(L, 'clump', bx2, 0, by2, f.seed * 3, 14, 10, 14);
  }
  const v = P.village;
  if (v) {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const r = v.r * (0.55 + chash(i, v.bx) * 0.35);
      put(L, 'clump', v.x + Math.cos(a) * r, 0, v.y + Math.sin(a) * r, a, 16, 11 + chash(i, v.by) * 4, 16);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      put(L, 'farmSil', v.x + Math.cos(a) * 46, -0.05, v.y + Math.sin(a) * 46, -a, 0.2, 0.55, 0.36, ROOF_TINT[i % 2]);
    }
    put(L, 'clump', v.x, TERP_H, v.y, 0, 13, 10, 13);
  }
}

function inVillageDisc(x, y) {
  const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
  for (const v of [villageOf(bx, by), villageOf(bx + 1, by)]) if (v && Math.hypot(x - v.x, y - v.y) < v.r) return true;
  return false;
}

function upload(L) {
  for (const [k, pool] of Object.entries(K.pools)) {
    const it = L[k];
    const n = it ? it.c.length / 3 : 0;
    if (n) {
      pool.instanceMatrix.array.set(it.m);
      pool.instanceColor.array.set(it.c);
    }
    pool.count = n;
    markInstancesDirty(pool.instanceMatrix, n);
    markInstancesDirty(pool.instanceColor, n);
  }
}

// ------------------------------------------------------------------ frame

export function updateSkyline(dt, world, scene, cam, nearR = 0) {
  if (!K) init(scene);
  const t0 = performance.now();
  const p = world.player;
  const ed = edgeDistance(p.x, p.y);
  // the belts are a horizon trick: from high up they would read as walls
  const fadeT = smooth(-2600, -700, ed), fadeB = smooth(-900, -250, ed) * (1 - smooth(35, 110, cam.position.y));
  U.uTime.value = world.time || 0;
  U.uFadeT.value = fadeT;
  U.uFadeB.value = fadeB;
  U.uFarR.value = Math.max(150, cam.far * 0.82);
  K.group.visible = fadeT > 0;
  for (const k of ['belt', 'farmSil', 'clump']) K.pools[k].visible = fadeB > 0;
  if (fadeT <= 0) return;

  // plan the blocks in reach a few per frame (farms are the costly part)
  const bx = Math.floor(p.x / BLOCK), by = Math.floor(p.y / BLOCK);
  const wk = bx + ',' + by;
  if (wk !== K.warmKey) {
    K.warmKey = wk;
    const n = Math.ceil(R_TALL / BLOCK) + 1;
    const list = [];
    for (let oy = -n; oy <= n; oy++) {
      for (let ox = -n; ox <= n; ox++) {
        const X = (bx + ox) * BLOCK + BLOCK / 2, Y = (by + oy) * BLOCK + BLOCK / 2;
        if (edgeDistance(X, Y) < -BLOCK || blockPlanCached(bx + ox, by + oy)) continue;
        list.push([bx + ox, by + oy, ox * ox + oy * oy]);
      }
    }
    list.sort((a, b) => a[2] - b[2]);
    K.warm = list;
  }
  while (K.warm.length && performance.now() - t0 < WARM_MS) {
    const [wx, wy] = K.warm.shift();
    blockPlan(wx, wy);
    K.dirty = true;
  }

  if (K.planVersion !== planVersion) { K.planVersion = planVersion; K.warmKey = ''; K.gather = null; K.buildAt = null; }
  const moved = !K.buildAt || Math.hypot(p.x - K.buildAt[0], p.y - K.buildAt[1]) > 220;
  if (!K.gather && (moved || (K.dirty && !K.warm.length))) {
    K.dirty = false;
    K.gatherAt = [p.x, p.y];
    K.gather = gatherGen(p.x, p.y, nearR);
  }
  if (K.gather) {
    const t1 = performance.now();
    let r;
    do r = K.gather.next(); while (!r.done && performance.now() - t1 < GATHER_MS);
    if (r.done) {
      K.gather = null;
      K.buildAt = K.gatherAt;
      upload(r.value.L);
      if (r.value.missing) K.dirty = true;
    }
  }
  const ms = performance.now() - t0;
  K.ms = K.ms * 0.95 + ms * 0.05;
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function skylineStats() {
  if (!K) return null;
  const counts = {};
  for (const [k, m] of Object.entries(K.pools)) counts[k] = m.count;
  return { ms: +K.ms.toFixed(3), warm: K.warm.length, gathering: !!K.gather, counts };
}
