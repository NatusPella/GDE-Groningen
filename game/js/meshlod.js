// Mesh LODs for animals (and anything skinned or flat-coloured): fewer triangles further away, with a short dithered crossfade
// instead of a pop. This is the skinned-animal side of the central LOD system (perf-ultra-23-11, docs/LOD-SYSTEEM-23-11.md): the
// distances, the hysteresis and the audit register are those of lodregistry.js (kind 'animal'); what is our own is that every level
// stays skinned on the same skeleton (lodkit3d.js lodForSkinned freezes LOD1+ in the rest pose: an animal 30 m away would stop
// walking), and the crossfade is a twin mesh on the same bones with the same 4x4 screen-door dither.
//
// clusterLod: vertex clustering per body part (the strongest bone of each vertex), on a grid of `cell` metres, but never coarser
// than a part's own thinnest side / 2.2: a leg keeps its thickness at LOD2 instead of collapsing (eis 23-11: no vanishing legs).
// In each cell the vertex furthest from the part's centre stands for the cell (the silhouette does not shrink, as lodsimplify.js);
// triangles that collapse are dropped. Colours, skin indices and weights stay those of the original corner, so a skinned LOD keeps
// following the same bones and a flat-coloured face keeps its colour. Indexed or not, the result is non-indexed.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { lodLevel, lodScaleFor, registerLodModel } from './lodregistry.js';
import { silhouetteKept } from './lodsimplify.js';

function partOf(geometry) {
  const si = geometry.attributes.skinIndex, sw = geometry.attributes.skinWeight, n = geometry.attributes.position.count;
  const part = new Int32Array(n);
  if (!si || !sw) return part;
  for (let i = 0; i < n; i++) {
    let best = 0;
    for (let c = 1; c < 4; c++) if (sw.getComponent(i, c) > sw.getComponent(i, best)) best = c;
    part[i] = si.getComponent(i, best);
  }
  return part;
}

export function clusterLod(geometry, cell, { minThick = true } = {}) {
  const pos = geometry.attributes.position, idx = geometry.index;
  const nv = pos.count, n = idx ? idx.count : nv;
  const part = partOf(geometry);
  // per part: bounds, centre and its own cell (at most a third of its thinnest side)
  const pb = new Map();
  for (let i = 0; i < nv; i++) {
    let b = pb.get(part[i]);
    if (!b) { b = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }; pb.set(part[i], b); }
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    for (let c = 0; c < 3; c++) { if (p[c] < b.min[c]) b.min[c] = p[c]; if (p[c] > b.max[c]) b.max[c] = p[c]; }
  }
  for (const b of pb.values()) {
    b.c = [0, 1, 2].map((c) => (b.min[c] + b.max[c]) / 2);
    const thin = Math.min(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
    b.cell = minThick ? Math.max(cell * 0.2, Math.min(cell, thin / 2.2)) : cell;
  }
  // cell of every vertex and the representative (furthest from the part centre)
  const cellOf = new Array(nv), best = new Map();
  for (let i = 0; i < nv; i++) {
    const b = pb.get(part[i]), x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const key = part[i] + ':' + Math.floor(x / b.cell) + ':' + Math.floor(y / b.cell) + ':' + Math.floor(z / b.cell);
    cellOf[i] = key;
    const d = (x - b.c[0]) ** 2 + (y - b.c[1]) ** 2 + (z - b.c[2]) ** 2;
    const r = best.get(key);
    if (!r || d > r.d) best.set(key, { d, i });
  }
  const repId = new Map();
  let ids = 0;
  for (const k of best.keys()) repId.set(k, ids++);
  const keep = [];
  for (let t = 0; t < n; t += 3) {
    const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
    const a = repId.get(cellOf[i0]), b = repId.get(cellOf[i1]), c = repId.get(cellOf[i2]);
    if (a !== b && b !== c && a !== c) keep.push(i0, best.get(cellOf[i0]).i, i1, best.get(cellOf[i1]).i, i2, best.get(cellOf[i2]).i);
  }
  const out = new THREE.BufferGeometry();
  const m = keep.length / 2;
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    if (name === 'normal') continue;
    const size = attr.itemSize, arr = new attr.array.constructor(m * size);
    for (let k = 0; k < m; k++) {
      const src = keep[k * 2], r = keep[k * 2 + 1];
      if (name === 'position') { arr[k * 3] = pos.getX(r); arr[k * 3 + 1] = pos.getY(r); arr[k * 3 + 2] = pos.getZ(r); }
      else for (let c = 0; c < size; c++) arr[k * size + c] = attr.array[src * size + c];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, attr.normalized));
  }
  if (geometry.attributes.normal) out.computeVertexNormals();
  out.boundingSphere = geometry.boundingSphere ? geometry.boundingSphere.clone() : null;
  return out;
}

export const triCount = (g) => Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);

// LOD0 plus two cluster levels: the cell grows (from 4% of the model's longest side) until a level has at most 60% and 40% of the
// triangles of LOD0 (the minCut of kind 'animal' in lodregistry.js: 35% and 60% fewer). name: registers the model for the audit.
// 24-11 (beeldregressie): a level only counts while it keeps the silhouette (the bounding box per axis within 80%, silhouetteKept of
// lodsimplify.js); a coarser cell flattened a gull to a slab. Without such a level the previous one stays (LOD1 = LOD0, LOD2 = LOD1).
const boxOf = (g) => { g.computeBoundingBox(); const b = g.boundingBox; return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]; };
export function animalLods(geometry, size, name = null) {
  const t0 = triCount(geometry);
  const b0 = boxOf(geometry);
  let silhouette = false; // a level stopped short of its share to keep the silhouette (lodregistry.js auditLodModel)
  const level = (share, from, fallback) => {
    let cell = from, best = null;
    for (let i = 0; i < 16; i++, cell *= 1.3) {
      const g = clusterLod(geometry, cell);
      if (!silhouetteKept(b0, boxOf(g))) { silhouette = true; break; }
      best = { g, cell };
      if (triCount(g) <= t0 * share) break;
    }
    return best || { g: fallback, cell: from };
  };
  const l1 = level(0.6, size * 0.04, geometry), l2 = level(0.4, l1.cell * 1.3, l1.g);
  const geos = [geometry, l1.g, l2.g];
  geos.silhouette = silhouette;
  if (name) registerLodModel('animal', name, geos.map(triCount), { cull: false, silhouette });
  return geos;
}

// The level for a distance: the central rule (lodregistry.js lodLevel for kind 'animal': 25 and 70 m at Ultra, scaled with the
// graphics preset, 4 m hysteresis around the middle of each band). setAnimalLodPreset follows lodkit3d.js setLodPreset.
let lodScale = 1;
export function setAnimalLodPreset(preset) { lodScale = lodScaleFor(preset); }
export function pickLod(dist, current = 0, levels = 3) {
  return Math.min(levels - 1, lodLevel('animal', dist, { levels, prev: current, scale: lodScale }));
}

// --- dithered crossfade -----------------------------------------------------------------------------------------------
// One uniform per program: before each draw the mesh writes its own fade into it (onBeforeRender + uniformsNeedUpdate),
// so one shared material can carry many fading meshes. lodFade.x: 0 = solid, 0..1 = how much is drawn; lodFade.y: 1 for
// the outgoing mesh (it keeps the complement of the incoming pattern, so together they always cover each pixel once).
const FADE = { value: new THREE.Vector2(0, 0) };
export function makeDitherable(material) {
  // eigen vlag: lod3d.js (patchLodDither) bewaart in userData.lodDither zijn uniform; een gedeeld materiaal draagt beide
  if (material.userData.meshLodFade) return material;
  material.userData.meshLodFade = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    shader.uniforms.lodFade = FADE;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec2 lodFade;\nfloat lodBayer(vec2 p) { vec2 q = mod(floor(p), 4.0); float b = q.y < 1.0 ? (q.x < 1.0 ? 0.0 : q.x < 2.0 ? 8.0 : q.x < 3.0 ? 2.0 : 10.0) : q.y < 2.0 ? (q.x < 1.0 ? 12.0 : q.x < 2.0 ? 4.0 : q.x < 3.0 ? 14.0 : 6.0) : q.y < 3.0 ? (q.x < 1.0 ? 3.0 : q.x < 2.0 ? 11.0 : q.x < 3.0 ? 1.0 : 9.0) : (q.x < 1.0 ? 15.0 : q.x < 2.0 ? 7.0 : q.x < 3.0 ? 13.0 : 5.0); return (b + 0.5) / 16.0; }\nvoid main() {\n  if (lodFade.x > 0.0) { float lodN = lodBayer(gl_FragCoord.xy); if (lodFade.y > 0.5 ? lodN < lodFade.x : lodN >= lodFade.x) discard; }');
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.customProgramCacheKey = () => key() + '|meshLodFade';
  return material;
}
// Only a fading mesh (and the first draw after one, to put the uniform back to solid) forces a uniform upload; a material
// remembers whether its program still holds a fade.
function fadeHook(mesh) {
  mesh.onBeforeRender = (renderer, scene, camera, geo, material) => {
    const f = mesh.userData.lodFade || 0;
    if (f > 0 && f < 1) {
      FADE.value.set(f, mesh.userData.lodOut ? 1 : 0);
      material.uniformsNeedUpdate = true;
      material.userData.lodFadeDirty = true;
    } else if (material.userData.lodFadeDirty) {
      FADE.value.set(0, 0);
      material.uniformsNeedUpdate = true;
      material.userData.lodFadeDirty = false;
    }
  };
}

// A skinned mesh with LODs: a twin mesh on the same skeleton draws the outgoing level while the new one fades in (0.3 s).
// geos: [LOD0, LOD1, LOD2]. Returns the state object the caller keeps in userData.
export function setupSkinnedLods(skinned, geos) {
  makeDitherable(skinned.material);
  const twin = new THREE.SkinnedMesh(geos[0], skinned.material);
  twin.bind(skinned.skeleton, skinned.bindMatrix);
  twin.visible = false;
  twin.frustumCulled = skinned.frustumCulled;
  if (skinned.boundingSphere) twin.boundingSphere = skinned.boundingSphere;
  skinned.parent.add(twin);
  twin.position.copy(skinned.position); twin.quaternion.copy(skinned.quaternion); twin.scale.copy(skinned.scale);
  fadeHook(skinned); fadeHook(twin);
  twin.userData.lodOut = true;
  return { geos, mesh: skinned, twin, level: 0, fadeT: 0, lastT: null };
}

// dist: metres from the camera or player. time: seconds (any clock). Cheap when nothing changes.
export function updateSkinnedLod(L, dist, time) {
  if (!L) return;
  const dt = L.lastT === null ? 0 : Math.max(0, Math.min(0.1, time - L.lastT));
  L.lastT = time;
  const want = pickLod(dist, L.level, L.geos.length);
  if (want !== L.level) {
    L.twin.geometry = L.geos[L.level];
    L.twin.visible = true;
    L.mesh.geometry = L.geos[want];
    L.level = want;
    L.fadeT = 0.001;
  }
  if (L.fadeT > 0) {
    L.fadeT += dt;
    const f = Math.min(1, L.fadeT / 0.3);
    L.mesh.userData.lodFade = f;
    L.twin.userData.lodFade = f;
    if (f >= 1) { L.fadeT = 0; L.twin.visible = false; L.mesh.userData.lodFade = 0; L.twin.userData.lodFade = 0; }
  }
}
