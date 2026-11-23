import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// Real (non-procedural) 3D models for specific named landmark buildings,
// generated externally (Claude Design) from the prompts in
// docs/3d-model-prompts.md and dropped into game/models/. Keyed by the
// building's own `name` field in stad.json - buildBuildingMesh() checks
// getLandmarkModel(b.name) before falling through to the procedural
// addLandmarkDetail() path, so a landmark with no model here (or one that
// hasn't finished loading yet) keeps working exactly as before.
const MODEL_PATHS = {
  Martinitoren: new URL('../models/martinitoren.glb', import.meta.url).href,
};

// Real-world-ish target height (meters) each model gets normalized to -
// same number buildBuildingMesh's procedural path uses for the matching
// landmarkKind, so swapping in a real model doesn't change how tall the
// landmark reads against the rest of the city.
const TARGET_HEIGHT_M = {
  Martinitoren: 95,
};

const templates = new Map(); // name -> normalized THREE.Group, ready to .clone(true)
const started = new Set();
const loadListeners = [];

// scene3d.js registers a callback here so it can drop its cached mesh for a
// landmark the moment its real model finishes loading - buildings are only
// ever built once and cached (see scene3d.js's buildingMeshes Map), so
// without this a landmark already in view when its GLB resolves would stay
// on the procedural fallback for the rest of the session.
export function onLandmarkModelLoaded(cb) {
  loadListeners.push(cb);
}

// Scales a freshly-loaded GLTF scene so its own height matches
// TARGET_HEIGHT_M and recenters it so X/Z sit on its own footprint center
// and Y=0 is its lowest point - i.e. exactly the convention
// buildBuildingMesh already positions its group at (box.cx, 0, box.cy) for.
function normalize(root, targetHeight) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = size.y > 1e-6 ? targetHeight / size.y : 1;
  root.scale.setScalar(scale);

  // Recompute the box post-scale to get the real offset needed to center
  // X/Z and drop the base to Y=0.
  const scaledBox = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= scaledBox.min.y;
  return root;
}

// The tower arrives as 70 separate meshes, one per part (shaft stages, cornices, clock faces, the spire): drawn
// like that it costs 70 draw calls and as many shadow casts. Merged on load into one mesh per material (six)
// with the same triangles and the same look; the clones share these geometries.
export function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(o);
  });
  const out = new THREE.Group();
  out.name = root.name;
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const [mat, meshes] of byMat) {
    let n = 0;
    for (const m of meshes) n += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let k = 0;
    for (const m of meshes) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal, I = g.index;
      const cnt = I ? I.count : P.count;
      const flip = m.matrixWorld.determinant() < 0; // a mirrored part: keep the winding facing out
      nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < cnt; i++) {
        const c = flip ? i - (i % 3) + [0, 2, 1][i % 3] : i;
        const j = I ? I.getX(c) : c;
        v.fromBufferAttribute(P, j).applyMatrix4(m.matrixWorld);
        pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, j).applyMatrix3(nm).normalize(); nor[k * 3] = v.x; nor[k * 3 + 1] = v.y; nor[k * 3 + 2] = v.z; }
        k++;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (meshes.every((m) => m.geometry.attributes.normal)) geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    else geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = mat.name || '';
    out.add(mesh);
  }
  return out;
}

// Night: the tower's window openings (material "raam") glow faintly warm, like the landmark glazing.
const nightMats = [];
export function setLandmarkModelNight(glow) {
  for (const m of nightMats) m.emissiveIntensity = Math.min(0.6, glow * 0.3);
}

export function preloadLandmarkModels() {
  const loader = new GLTFLoader();
  for (const [name, path] of Object.entries(MODEL_PATHS)) {
    if (started.has(name)) continue;
    started.add(name);
    loader.load(
      path,
      (gltf) => {
        const root = mergeByMaterial(gltf.scene);
        root.traverse((o) => {
          o.castShadow = false; o.receiveShadow = false;
          if (o.isMesh && o.material.name === 'raam' && o.material.emissive && !nightMats.includes(o.material)) {
            o.material.emissive.setHex(0xffc27a);
            o.material.emissiveIntensity = 0;
            nightMats.push(o.material);
          }
        });
        normalize(root, TARGET_HEIGHT_M[name] ?? 30);
        templates.set(name, root);
        for (const cb of loadListeners) cb(name);
      },
      undefined,
      (err) => console.warn(`landmarkmodels: failed to load "${name}" from ${path}`, err),
    );
  }
}

// Returns a fresh clone positioned/scaled ready to drop straight into a
// buildBuildingMesh() group at (0,0,0) - the CALLER still sets
// group.position on the wrapping group to the building's world x/y, same
// as it would for the procedural path. Returns null if this landmark has
// no model registered, or it hasn't finished loading yet (procedural
// fallback stays in charge until then).
export function getLandmarkModel(name) {
  const tpl = name && templates.get(name);
  return tpl ? tpl.clone(true) : null;
}
