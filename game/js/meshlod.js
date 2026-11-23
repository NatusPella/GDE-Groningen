// Mesh LODs for animals (and anything skinned or flat-coloured): fewer triangles further away, with a short dithered
// crossfade instead of a pop. Until the central LOD system (perf-ultra-23-11) lands this is the animal side of it; the
// shape is the same as that will need: per object a list of geometries (LOD0 first), the distances where it steps down,
// and a fade that the renderer resolves with a screen-door dither (no transparency, no sorting).
//
// clusterLod: vertex clustering on a grid of `cell` metres. Every triangle corner snaps to the first vertex seen in its cell;
// triangles that collapse are dropped. Colours, skin indices and weights stay those of the original corner, so a skinned
// LOD keeps following the same bones and a flat-coloured face keeps its colour. Indexed or not, the result is non-indexed.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export function clusterLod(geometry, cell) {
  const pos = geometry.attributes.position, idx = geometry.index;
  const n = idx ? idx.count : pos.count;
  const rep = new Map(), repPos = [];
  const keyOf = (i) => {
    const x = Math.floor(pos.getX(i) / cell), y = Math.floor(pos.getY(i) / cell), z = Math.floor(pos.getZ(i) / cell);
    const k = x * 73856093 ^ y * 19349663 ^ z * 83492791;
    let list = rep.get(k);
    if (!list) { list = []; rep.set(k, list); }
    for (const r of list) if (r.x === x && r.y === y && r.z === z) return r.id;
    const id = repPos.length / 3;
    repPos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    list.push({ x, y, z, id });
    return id;
  };
  const keep = [];
  for (let t = 0; t < n; t += 3) {
    const i0 = idx ? idx.getX(t) : t, i1 = idx ? idx.getX(t + 1) : t + 1, i2 = idx ? idx.getX(t + 2) : t + 2;
    const a = keyOf(i0), b = keyOf(i1), c = keyOf(i2);
    if (a !== b && b !== c && a !== c) keep.push(i0, a, i1, b, i2, c);
  }
  const out = new THREE.BufferGeometry();
  const m = keep.length / 2;
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    if (name === 'normal') continue;
    const size = attr.itemSize, arr = new attr.array.constructor(m * size);
    for (let k = 0; k < m; k++) {
      const src = keep[k * 2];
      if (name === 'position') { const r = keep[k * 2 + 1]; arr[k * 3] = repPos[r * 3]; arr[k * 3 + 1] = repPos[r * 3 + 1]; arr[k * 3 + 2] = repPos[r * 3 + 2]; }
      else for (let c = 0; c < size; c++) arr[k * size + c] = attr.array[src * size + c];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size, attr.normalized));
  }
  if (geometry.attributes.normal) out.computeVertexNormals();
  out.boundingSphere = geometry.boundingSphere ? geometry.boundingSphere.clone() : null;
  return out;
}

export const triCount = (g) => Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);

// LOD0 plus two cluster levels: the cell grows (from 4% of the model's longest side) until a level has at most 60% and 45% of
// the triangles of LOD0 (45% keeps thin legs on most animals), so a small model with few big faces gets a coarse grid and a detailed one a fine grid.
export function animalLods(geometry, size) {
  const t0 = triCount(geometry);
  const level = (share, from) => {
    let cell = from, g = clusterLod(geometry, cell);
    for (let i = 0; i < 14 && triCount(g) > t0 * share; i++) { cell *= 1.3; g = clusterLod(geometry, cell); }
    return { g, cell };
  };
  const l1 = level(0.6, size * 0.04), l2 = level(0.45, l1.cell * 1.3);
  return [geometry, l1.g, l2.g];
}

// Step down at these distances (m), with 10% hysteresis so an animal at the border does not flicker.
export const LOD_STEPS = [25, 60];
export function pickLod(dist, current = 0, steps = LOD_STEPS) {
  let want = 0;
  while (want < steps.length && dist > steps[want] * (want < current ? 0.9 : 1.1)) want++;
  return want;
}

// --- dithered crossfade -----------------------------------------------------------------------------------------------
// One uniform per program: before each draw the mesh writes its own fade into it (onBeforeRender + uniformsNeedUpdate),
// so one shared material can carry many fading meshes. lodFade.x: 0 = solid, 0..1 = how much is drawn; lodFade.y: 1 for
// the outgoing mesh (it keeps the complement of the incoming pattern, so together they always cover each pixel once).
const FADE = { value: new THREE.Vector2(0, 0) };
export function makeDitherable(material) {
  if (material.userData.lodDither) return material;
  material.userData.lodDither = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    shader.uniforms.lodFade = FADE;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec2 lodFade;\nfloat lodBayer(vec2 p) { vec2 q = mod(floor(p), 4.0); float b = mod(q.x * 2.0 + q.y * 3.0 + q.x * q.y, 16.0); return (b + 0.5) / 16.0; }\nvoid main() {\n  if (lodFade.x > 0.0) { float lodN = lodBayer(gl_FragCoord.xy); if (lodFade.y > 0.5 ? lodN < lodFade.x : lodN >= lodFade.x) discard; }');
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : () => '';
  material.customProgramCacheKey = () => key() + '|lodDither';
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
  const want = pickLod(dist, L.level);
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
