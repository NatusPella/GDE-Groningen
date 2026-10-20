import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { vcMaterial, markShared } from './pixelart3d.js';
import { landmarkGeometry, LOD_FULL, LOD_MASS, LOD_SKY } from './landmarkkit.js';

// Draws landmark-kit buildings (landmarkkit.js) for a list of placed
// parameter sets: full detail within R0 of the focus, one at a time as
// they come near (own mesh, shadows, turning sails); the masses merged per
// CELL out to R1; past that one merged skyline mesh for all of them, its
// haze capped so towers and mills stay on the horizon (in rain and mist the cap rises, so they
// fade with the ground and do not hang over the haze, #259). The merged layers
// hide an item's vertices by its distance in the vertex shader, so the
// three levels never draw the same landmark twice. Night: churches,
// towers and borgen floodlit warm from below (until midnight), clock faces
// and door lamps lit, windows glowing a little; mills stay dark.
// Nothing here knows the city or the countryside.

const R0 = 320, R1 = 1100, CELL = 1000, PREFETCH = 60;
const U = { uLkP: { value: new THREE.Vector2() }, uLkR0: { value: R0 }, uLkR1: { value: R1 }, uLkFlood: { value: 0 }, uLkNight: { value: 0 }, uLkHaze: { value: 0 } };

// One program per material for all three levels: aMode says which level a
// vertex belongs to (0 near: always drawn, 1 masses: R0..R1, 2 skyline: past R1).
function patch(m, key, { flood = false } = {}) {
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform vec2 uLkP; uniform float uLkR0, uLkR1;
attribute vec3 aC;
varying float vLkY;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
float lkD = distance(aC.xy, uLkP);
if ((aC.z > 0.5 && aC.z < 1.5 && (lkD < uLkR0 || lkD > uLkR1)) || (aC.z > 1.5 && lkD < uLkR1)) transformed = vec3(0.0);
vLkY = (modelMatrix * vec4(transformed, 1.0)).y;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uLkFlood, uLkNight, uLkHaze;
varying float vLkY;`)
      .replace('#include <fog_fragment>', `#ifdef USE_FOG
  float lkF = smoothstep(fogNear, fogFar, vFogDepth);
  float lkCap = 0.55 + 0.4 * uLkHaze;
  lkF = min(lkF, lkCap + (1.0 - lkCap) * smoothstep(fogFar, fogFar * 3.0, vFogDepth));
  if (lkF > 0.995) discard;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, lkF);
#endif`);
    if (flood) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.78, 0.5) * uLkFlood * mix(0.85, 0.12, smoothstep(1.0, 38.0, vLkY));`);
    }
  };
  m.customProgramCacheKey = () => 'lk-' + key;
  return markShared(m);
}

let M = null;
function materials() {
  if (M) return M;
  const glass = (k) => patch(vcMaterial({ roughness: 0.4, emissive: new THREE.Color(0) }), k);
  const glow = (k) => patch(new THREE.MeshBasicMaterial({ vertexColors: true }), k);
  M = {
    lit: [patch(vcMaterial({ roughness: 0.9 }), 'lit', { flood: true }), glow('glow'), glass('glass')],
    dark: [patch(vcMaterial({ roughness: 0.9 }), 'dark'), glow('glowd'), glass('glassd')],
  };
  return M;
}

// The night state: night 0..1, flood 0..1 (the caller switches it off after midnight).
function applyNight(night, flood) {
  U.uLkNight.value = night;
  U.uLkFlood.value = flood;
  for (const k of ['lit', 'dark']) {
    M[k][1].color.setScalar(0.55 + night * 2.2);
    M[k][2].emissive.setRGB(1, 0.62, 0.3).multiplyScalar(night * (k === 'lit' ? 0.35 : 0.1));
  }
}

const isDark = (p) => p.kit === 'mill';
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);

function placeMatrix(p) {
  _q.setFromAxisAngle(_up, -p.angle);
  return _m.compose(_v.set(p.x, -0.05, p.y), _q, _s).clone();
}

// Merges the pieces' geometries into world space, per material group, with
// each vertex's landmark centre in aC.
function mergeWorld(pieces, mode) {
  const byGroup = [[], [], []];
  for (const pc of pieces) {
    const g = pc.geo, pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color;
    for (const gr of g.groups) byGroup[gr.materialIndex].push({ pc, start: gr.start, count: gr.count, pos, nor, col });
  }
  let total = 0;
  for (const L of byGroup) for (const r of L) total += r.count;
  if (!total) return null;
  const P = new Float32Array(total * 3), N = new Int8Array(total * 3), C = new Uint8Array(total * 3), A = new Float32Array(total * 3);
  const geo = new THREE.BufferGeometry();
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  let o = 0;
  byGroup.forEach((L, gi) => {
    const start = o;
    for (const r of L) {
      const mat = r.pc.matrix, rot = new THREE.Matrix3().setFromMatrix4(mat);
      for (let i = r.start; i < r.start + r.count; i++, o++) {
        v.fromBufferAttribute(r.pos, i).applyMatrix4(mat);
        P[o * 3] = v.x; P[o * 3 + 1] = v.y; P[o * 3 + 2] = v.z;
        n.fromBufferAttribute(r.nor, i).applyMatrix3(rot).normalize();
        N[o * 3] = Math.round(n.x * 127); N[o * 3 + 1] = Math.round(n.y * 127); N[o * 3 + 2] = Math.round(n.z * 127);
        C[o * 3] = r.col.array[i * 3]; C[o * 3 + 1] = r.col.array[i * 3 + 1]; C[o * 3 + 2] = r.col.array[i * 3 + 2];
        A[o * 3] = r.pc.cx; A[o * 3 + 1] = r.pc.cy; A[o * 3 + 2] = mode;
      }
    }
    if (o > start) geo.addGroup(start, o - start, gi);
  });
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3, true));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3, true));
  geo.setAttribute('aC', new THREE.BufferAttribute(A, 3));
  geo.computeBoundingSphere();
  return geo;
}

function piecesOf(p, lod) {
  const g = landmarkGeometry(p, lod);
  const mat = placeMatrix(p);
  const out = [{ geo: g.geometry, matrix: mat, cx: p.x, cy: p.y }];
  if (g.sails) {
    const sm = new THREE.Matrix4().makeTranslation(g.sailsAt[0], g.sailsAt[1], g.sailsAt[2]);
    out.push({ geo: g.sails, matrix: mat.clone().multiply(sm), cx: p.x, cy: p.y });
  }
  return out;
}

function mergedMesh(items, lod, mode) {
  const lit = [], dark = [];
  for (const p of items) (isDark(p) ? dark : lit).push(...piecesOf(p, lod));
  const group = new THREE.Group();
  for (const [list, mats] of [[lit, M.lit], [dark, M.dark]]) {
    const geo = mergeWorld(list, mode);
    for (const pc of list) pc.geo.dispose();
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mats);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}

// near meshes: drawn whatever the distance (aMode 0)
function nearMode(geo) {
  geo.setAttribute('aC', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
}

function nearObject(p) {
  const g = landmarkGeometry(p, LOD_FULL);
  const mats = isDark(p) ? M.dark : M.lit;
  nearMode(g.geometry);
  if (g.sails) nearMode(g.sails);
  const root = new THREE.Group();
  root.position.set(p.x, -0.05, p.y);
  root.rotation.y = -p.angle;
  const body = new THREE.Mesh(g.geometry, mats);
  body.castShadow = body.receiveShadow = true;
  root.add(body);
  if (g.sails) {
    const sails = new THREE.Mesh(g.sails, mats);
    sails.castShadow = true;
    sails.position.set(...g.sailsAt);
    // a turning mill has its sails tilted back a little, like the real ones
    sails.rotation.z = 0.12;
    root.add(sails);
    root.userData.sails = sails;
  }
  root.userData.kind = 'landmarkkit';
  return root;
}

export function createLandmarkLayer(scene, list) {
  materials();
  const group = new THREE.Group();
  group.name = 'landmarkkits';
  scene.add(group);
  const items = list.filter(Boolean).map((p, i) => ({ p, i, near: null }));
  const cells = new Map();
  for (const it of items) {
    const k = Math.floor(it.p.x / CELL) + ',' + Math.floor(it.p.y / CELL);
    if (!cells.has(k)) cells.set(k, { key: k, cx: (Math.floor(it.p.x / CELL) + 0.5) * CELL, cy: (Math.floor(it.p.y / CELL) + 0.5) * CELL, items: [], mesh: null });
    cells.get(k).items.push(it);
  }
  let sky = null, skyAt = 0;
  const L = { group, items, cells, built: 0 };

  L.update = (px, py, night, flood, time, haze = 0) => {
    U.uLkP.value.set(px, py);
    U.uLkHaze.value = haze;
    applyNight(night, flood);
    // the skyline: once, after the first frames (a few hundred small meshes)
    if (!sky && ++skyAt > 30) { sky = mergedMesh(items.map((it) => it.p), LOD_SKY, 2); sky.name = 'landmarkkits:sky'; group.add(sky); }
    // the masses per cell, one cell per frame
    let budget = 1;
    for (const c of cells.values()) {
      const d = Math.hypot(c.cx - px, c.cy - py) - CELL * 0.71;
      if (d < R1 + 200 && !c.mesh && budget > 0) { c.mesh = mergedMesh(c.items.map((it) => it.p), LOD_MASS, 1); group.add(c.mesh); budget--; }
      else if (d > R1 + 600 && c.mesh) { group.remove(c.mesh); for (const m of c.mesh.children) m.geometry.dispose(); c.mesh = null; }
    }
    // full detail near, built one per frame from just outside R0
    let build = 1;
    for (const it of items) {
      const d = Math.hypot(it.p.x - px, it.p.y - py);
      if (d < R0 + PREFETCH && !it.near && build > 0) { it.near = nearObject(it.p); group.add(it.near); build--; L.built++; }
      if (it.near) {
        if (d > R0 + PREFETCH + 40) { group.remove(it.near); it.near.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); it.near = null; continue; }
        it.near.visible = d < R0;
        const s = it.near.userData.sails;
        if (s && it.near.visible) s.rotation.x = time * (it.p.type === 'motor' ? 1.6 : it.p.seed < 0.6 ? 0.9 : 0);
      }
    }
  };
  L.stats = () => ({ items: items.length, near: items.filter((it) => it.near && it.near.visible).length, cells: [...cells.values()].filter((c) => c.mesh).length, sky: !!sky });
  L.dispose = () => {
    scene.remove(group);
    group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  };
  return L;
}
