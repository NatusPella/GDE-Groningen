import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { polygonBounds } from './util.js';
import { createWaterIndex } from './waterindex.js';
import { COUNTRY_GLSL, COUNTRY_UNIFORMS, setCountryBounds } from './countryfield.js';
import { applyCutMask } from './cutmask3d.js';
import { followWaterQuality } from './water3d.js';
import { mergeTerrainTiles } from './terrainmerge.js';
import { perfOff } from './devflags.js';

// Replaces the old flat 2-triangle "fallback floor" PlaneGeometry(6000,6000)
// + single-color MeshLambertMaterial that used to live in scene3d.js's
// init3D(). That plane covered every gap where no real road/sidewalk/green/
// water polygon exists (real map data never covers 100% of the navigable
// area) - deleting it outright made things worse (sky-colored scene
// background showing through at ground level, "holes in the world"), so
// this keeps the same role (a real ground surface under everything) but
// built as an actual tessellated mesh sized to the real map bounds, shaded
// with a cheap procedural earth/dirt material instead of one flat color.
//
// This file owns geometry + a lit material with procedural paving albedo.
//
// Coordinate convention matches every other ground-level mesh in this
// codebase: three.x = world.x, three.z = world.y, three.y = up. Unlike the
// old flat plane (and unlike buildFlatMesh's ShapeGeometry+rotateX trick in
// scene3d.js), the grid below is built directly with absolute world x/y
// written straight into the position attribute's x/z - no local-space
// centering or rotation step - since the per-vertex water hole test needs
// to compare directly against water polygon points, which are already in
// that same world x/y space (map.water[i].pts, same convention as
// buildings/green/roads elsewhere in this codebase).
//
// Real holes, not just a low Y: the user explicitly wants no terrain mesh
// at all under water polygons (a lower Y was tried first and rejected -
// "ik wil dat de grond daar waar water is niet bestaat als mesh"). Every
// water polygon is a real gap in this grid's face list, not a color trick.
// Bridges are unaffected - they're road meshes at y=0.03 in an entirely
// different layer in scene3d.js, rendered above whatever the terrain looks
// like underneath, water hole or not.

const TERRAIN_COLOR_A = 0x827b72; // warm grey klinker paving
const TERRAIN_COLOR_B = 0x7a6a5e; // reddish brick patches
const TERRAIN_COLOR_DETAIL = 0x9a9282; // dusty light fleck / joint tone

// Built-in material + onBeforeCompile instead of a raw ShaderMaterial so the
// ground gets real lighting, shadows, fog and tone mapping for free; only
// the albedo is procedural.
const ALBEDO_GLSL = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorDetail;

// scaled down first so large map coordinates keep float precision (no stripes)
float tHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float tNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), u.x),
             mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 terrainAlbedo(vec2 p, vec2 fwp) {
  float macro = tNoise(p * 0.02) * 0.65 + tNoise(p * 0.07) * 0.35;
  vec3 c = mix(uColorA, uColorB, smoothstep(0.35, 0.75, macro));
  c = mix(c, uColorDetail, tNoise(p * 0.6) * 0.12);

  // running-bond brick pavers (0.22 x 0.11 m), faded out before they alias
  vec2 b = p / vec2(0.22, 0.11);
  b.x += step(1.0, mod(floor(b.y), 2.0)) * 0.5;
  vec2 cell = floor(b);
  vec2 f = fract(b);
  vec2 fw = max(fwp / vec2(0.22, 0.11), vec2(1e-4));
  vec2 edge = smoothstep(vec2(0.0), fw * 1.5, f) * smoothstep(vec2(0.0), fw * 1.5, 1.0 - f);
  float joint = 1.0 - edge.x * edge.y;
  float detail = 1.0 - smoothstep(0.25, 0.9, max(fw.x, fw.y));
  c *= 1.0 + (tHash(cell) - 0.5) * 0.14 * detail;
  c = mix(c, c * 0.72, joint * detail * 0.7);
  return c;
}
`;

// Wet-ground layer shared by the terrain and every road/sidewalk material:
// one uniform set, so rain darkens and glosses all ground in one write.
export const WET_UNIFORMS = {
  uWet: { value: 0 },
  uRainTime: { value: 0 },
  uPuddle: { value: 1 },   // 0..1 per kwaliteitsprofiel (weatherlook.js)
};

const WET_GLSL = `
uniform float uWet;
uniform float uRainTime;
uniform float uPuddle;
varying vec2 vWetXZ;
// scaled down first so large map coordinates keep float precision (no stripes)
float wHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float wNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), u.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 wRipple(vec2 p) {
  vec2 cell = floor(p), f = fract(p) - 0.5;
  float h = wHash(cell);
  float t = fract(uRainTime * 0.8 + h);
  vec2 d = f - (vec2(wHash(cell + 1.7), wHash(cell + 5.3)) - 0.5) * 0.5;
  float r = length(d);
  float ring = sin((r - t * 0.5) * 60.0) * smoothstep(0.1, 0.0, abs(r - t * 0.5)) * (1.0 - t);
  return d / max(r, 1e-3) * ring;
}
`;

// surf (optional): extra GLSL from roadsurface.js. Its color code may set
// sDip (puddle bias), sRough (roughness delta) and sHeight (bump, metres).
function wetOnBeforeCompile(shader, surf) {
  Object.assign(shader.uniforms, WET_UNIFORMS);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vWetXZ;\n' + (surf ? surf.vertexCommon : ''))
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWetXZ = (modelMatrix * vec4(transformed, 1.0)).xz;\n' + (surf ? surf.vertexMain : ''));
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + WET_GLSL + (shader.__terrain ? ALBEDO_GLSL + COUNTRY_GLSL : '') + (surf ? surf.fragmentCommon : ''))
    .replace('#include <color_fragment>', `#include <color_fragment>
      float sDip = 0.0, sRough = 0.0, sHeight = 0.0;
      vec2 sWaterN = vec2(0.0);
      ${shader.__terrain ? `vec2 tFw = fwidth(vWetXZ);
      float cw = countryWeight(vWetXZ);
      if (cw < 1.0) diffuseColor.rgb *= terrainAlbedo(vWetXZ, tFw);
      if (cw > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, countryAlbedo(vWetXZ, cw, sRough, sDip, sWaterN), cw);` : ''}
      ${surf ? surf.color : ''}
      float wetP = uWet > 0.001 ? wNoise(vWetXZ * 0.21) * 0.7 + wNoise(vWetXZ * 0.83) * 0.3 + sDip * 0.35 : 0.0;
      float puddle = smoothstep(0.74 - 0.12 * uWet, 0.8 - 0.12 * uWet, wetP) * uWet * uPuddle;
      diffuseColor.rgb *= mix(1.0, 0.58, uWet) * mix(1.0, 0.5, puddle);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + sRough, 0.03, 1.0);
      roughnessFactor = mix(roughnessFactor, 0.34, uWet);
      roughnessFactor = mix(roughnessFactor, 0.04, puddle);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      ${surf ? surf.normal : ''}
      if (dot(sWaterN, sWaterN) > 1e-8) normal = normalize(normal + vec3(sWaterN.x, sWaterN.y, 0.0) * 2.0);
      if (puddle > 0.01) {
        vec2 rip = wRipple(vWetXZ * 1.6) + wRipple(vWetXZ * 2.3 + 11.0);
        normal = normalize(normal + vec3(rip.x, rip.y, 0.0) * 0.25 * puddle);
      }`);
}

export function applyWetGround(material, surf) {
  material.onBeforeCompile = surf ? (shader) => wetOnBeforeCompile(shader, surf) : wetOnBeforeCompile;
  if (surf) material.customProgramCacheKey = () => surf.key;
  return material;
}

// Standard (not Lambert) so wet ground can drop its roughness and pick up
// sky reflections from scene.environment.
export function createTerrainMaterial() {
  const material = followWaterQuality(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide }));
  const uniforms = {
    uColorA: { value: new THREE.Color(TERRAIN_COLOR_A) },
    uColorB: { value: new THREE.Color(TERRAIN_COLOR_B) },
    uColorDetail: { value: new THREE.Color(TERRAIN_COLOR_DETAIL) },
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, COUNTRY_UNIFORMS);
    shader.__terrain = true;
    wetOnBeforeCompile(shader);
  };
  // no ground over the open cuttings of the sunken ring road
  applyCutMask(material, 'vWetXZ');
  return material;
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function segTouchesTri(px, py, qx, qy, x0, y0, x1, y1, x2, y2) {
  if (Math.max(px, qx) < Math.min(x0, x1, x2) || Math.min(px, qx) > Math.max(x0, x1, x2)) return false;
  if (Math.max(py, qy) < Math.min(y0, y1, y2) || Math.min(py, qy) > Math.max(y0, y1, y2)) return false;
  if (inTri(px, py, x0, y0, x1, y1, x2, y2) || inTri(qx, qy, x0, y0, x1, y1, x2, y2)) return true;
  return segSeg(px, py, qx, qy, x0, y0, x1, y1) || segSeg(px, py, qx, qy, x1, y1, x2, y2) || segSeg(px, py, qx, qy, x2, y2, x0, y0);
}

function inTri(px, py, x0, y0, x1, y1, x2, y2) {
  const d1 = (px - x1) * (y0 - y1) - (x0 - x1) * (py - y1);
  const d2 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d3 = (px - x0) * (y2 - y0) - (x2 - x0) * (py - y0);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function segSeg(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y) {
  const d1x = p1x - p0x, d1y = p1y - p0y, d2x = q1x - q0x, d2y = q1y - q0y;
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-12) return false;
  const wx = q0x - p0x, wy = q0y - p0y;
  const t = (wx * d2y - wy * d2x) / den;
  const u = (wx * d1y - wy * d1x) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

// bounds = [minx, miny, maxx, maxy] in world meters (world.map.meta.bounds).
// waterPolys = array of {pts, bounds} water polygons to cut real holes for
// (pass map.water directly - GameMap's constructor already stamps a
// .bounds bbox onto each entry in mapdata.js; entries missing .bounds get
// one computed on the fly here as a fallback).
//
// Builds one big, real-tessellation ground surface (a Group of tiles sharing
// one vertex buffer and one material, exposed as group.material) sized to
// those bounds (plus
// a safety margin so the surface doesn't run out right at the map edge),
// with segment counts kept in the tens-to-~100 range regardless of map size
// - enough for the shader's per-vertex undulation/normal to have real
// geometry to work with, without being a wasteful vertex count for a mesh
// this large and mostly distant/background. Every triangle whose centroid
// falls inside a water polygon is simply never added to the index buffer -
// a real hole in the mesh, not a lower Y or a color/alpha trick. Edges
// around water bodies are jagged at grid resolution rather than a perfect
// boundary fit (a fixed-resolution grid can't trace an arbitrary polygon
// exactly) - acceptable per the brief as long as it's not a large visible
// gap; bump opts.segments or opts.cellSize for a tighter fit if needed.
//
// opts.pad: extra meters added beyond the map bounds on every side
// (default: 15% of the larger extent). opts.cellSize: target grid cell
// size in meters (default: 10 - see below). opts.segments: override the
// per-axis segment count directly (applied to both axes), clamped to
// [40, 900] unless explicitly overridden this way.
// opts.y: world Y to place the mesh at (default: -0.05 - at/below WATER_Y
// (-0.35) in scene3d.js; now redundant as a water-hiding safeguard since
// water polygons are real holes, but kept as the sane default height for
// a ground surface relative to roads (0.03)/sidewalks (0.02)/green (0.015)).
//
// Cell size used to be derived as "whole map / 100 segments" (~50m/cell on
// this map) - a fixed SEGMENT COUNT regardless of map size, not a fixed
// real-world resolution. That's far coarser than the real features this
// grid has to cut holes for: the smallest water polygons on this map are
// only ~5-8m wide, so a single 50m-wide sample triangle spanning one of
// them dropped (or kept) up to ~2500m² of ground based on one centroid
// test - visibly wrong-shaped/oversized holes ("iets gaat mis met het
// terrein"), not just a jagged edge as the old comment here assumed. Fixed
// at a real-world target size instead, so resolution scales with map size
// and stays meaningful regardless of how big the map is.
const TARGET_CELL_SIZE_M = 10;
const TERRAIN_TILE_M = 400;

export function buildTerrainMesh3D(bounds, waterPolys = [], opts = {}) {
  setCountryBounds(bounds);
  return terrainGroup(terrainArrays(bounds, waterPolys, opts));
}

// The terrain grid as plain arrays (the geometry worker builds it while the
// game loads, geokernels.js): every vertex, and per 400 m tile its triangles
// and their extent.
export function terrainArrays(bounds, waterPolys = [], opts = {}) {
  const [minx, miny, maxx, maxy] = bounds;
  const width = maxx - minx;
  const depth = maxy - miny;
  const pad = opts.pad ?? Math.max(width, depth) * 0.15;
  const minX = minx - pad, maxX = maxx + pad;
  const minY = miny - pad, maxY = maxy + pad;
  const totalW = maxX - minX;
  const totalD = maxY - minY;
  const y = opts.y ?? -0.05;

  const cellSize = opts.cellSize ?? TARGET_CELL_SIZE_M;
  const segsX = opts.segments ?? clamp(Math.round(totalW / cellSize), 40, 900);
  const segsZ = opts.segments ?? clamp(Math.round(totalD / cellSize), 40, 900);
  const nx = segsX + 1, nz = segsZ + 1;

  const waterList = waterPolys.map((w) => ({
    pts: w.pts,
    bounds: w.bounds || polygonBounds(w.pts),
  }));

  // Vertex positions written directly in absolute world x/y (not centered,
  // not rotated) - local geometry Y stays 0, the shader adds its own bump
  // displacement. mesh.position only carries the height offset (y); x/z
  // stay 0 since the grid already spans the real world coordinates.
  const positions = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) {
    const wy = minY + (totalD * j) / segsZ;
    for (let i = 0; i < nx; i++) {
      const wx = minX + (totalW * i) / segsX;
      const idx = (j * nx + i) * 3;
      positions[idx] = wx;
      positions[idx + 1] = 0;
      positions[idx + 2] = wy;
    }
  }

  const maxTriangles = segsX * segsZ * 2;
  const indices = [];
  let droppedTriangles = 0;
  const index = waterList.length ? createWaterIndex(waterList) : null;

  // Triangles crossed by a water edge are subdivided down to ~2.5 m and
  // every leaf still touching an edge is dropped, so ground never overhangs
  // the water; the quay walls/banks cover the narrow remaining gap.
  const extra = [];
  const midKeys = new Map();
  const mid = (i, j) => {
    const k = i < j ? i * 4294967296 + j : j * 4294967296 + i;
    let v = midKeys.get(k);
    if (v === undefined) {
      v = nx * nz + extra.length / 3;
      extra.push((vx(i) + vx(j)) / 2, 0, (vz(i) + vz(j)) / 2);
      midKeys.set(k, v);
    }
    return v;
  };
  const vx = (i) => (i < nx * nz ? positions[i * 3] : extra[(i - nx * nz) * 3]);
  const vz = (i) => (i < nx * nz ? positions[i * 3 + 2] : extra[(i - nx * nz) * 3 + 2]);
  const emit = (a, b, c, cand, depth) => {
    const x0 = vx(a), y0 = vz(a), x1 = vx(b), y1 = vz(b), x2 = vx(c), y2 = vz(c);
    const hit = cand.filter((i) => segTouchesTri(index.ax[i], index.ay[i], index.bx[i], index.by[i], x0, y0, x1, y1, x2, y2));
    if (!hit.length) {
      if (index.inWater((x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3)) droppedTriangles++;
      else indices.push(a, b, c);
      return;
    }
    if (depth >= 2) { droppedTriangles++; return; }
    const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
    emit(a, ab, ca, hit, depth + 1);
    emit(ab, b, bc, hit, depth + 1);
    emit(ca, bc, c, hit, depth + 1);
    emit(ab, bc, ca, hit, depth + 1);
  };
  const tri = (a, b, c) => {
    if (!index) { indices.push(a, b, c); return; }
    const xs = [vx(a), vx(b), vx(c)], zs = [vz(a), vz(b), vz(c)];
    const cand = [];
    index.edgesIn(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), (i) => cand.push(i));
    emit(a, b, c, cand, 0);
  };

  // A quad with no water edge near it is all wet or all dry, and so is a
  // run of such quads along a row: one water test per run.
  let quadEdges = false;
  const anyEdge = () => { quadEdges = true; };
  for (let j = 0; j < segsZ; j++) {
    let runWet = null;
    for (let i = 0; i < segsX; i++) {
      const a = j * nx + i;
      const b = j * nx + i + 1;
      const c = (j + 1) * nx + i;
      const d = (j + 1) * nx + i + 1;
      if (index) {
        quadEdges = false;
        index.edgesIn(vx(a), vz(a), vx(d), vz(d), anyEdge);
        if (!quadEdges) {
          if (runWet === null) runWet = index.inWater((vx(a) + vx(d)) / 2, (vz(a) + vz(d)) / 2);
          if (runWet) droppedTriangles += 2;
          else indices.push(a, c, b, b, c, d);
          continue;
        }
        runWet = null;
      }
      tri(a, c, b);
      tri(b, c, d);
    }
  }

  const allPositions = new Float32Array(positions.length + extra.length);
  allPositions.set(positions);
  allPositions.set(extra, positions.length);

  const normals = new Float32Array(allPositions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;

  // One draw over the whole map would push every vertex through the GPU
  // each frame; square tiles sharing one vertex buffer let frustum culling
  // drop all but the few in view.
  const tilesX = Math.max(1, Math.ceil(totalW / TERRAIN_TILE_M));
  const tilesZ = Math.max(1, Math.ceil(totalD / TERRAIN_TILE_M));
  const buckets = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    const cx = (allPositions[a * 3] + allPositions[b * 3] + allPositions[c * 3]) / 3;
    const cz = (allPositions[a * 3 + 2] + allPositions[b * 3 + 2] + allPositions[c * 3 + 2]) / 3;
    const tx = Math.min(tilesX - 1, Math.max(0, Math.floor((cx - minX) / TERRAIN_TILE_M)));
    const tz = Math.min(tilesZ - 1, Math.max(0, Math.floor((cz - minY) / TERRAIN_TILE_M)));
    const key = tz * tilesX + tx;
    let list = buckets.get(key);
    if (!list) buckets.set(key, list = []);
    list.push(a, b, c);
  }

  const tiles = [];
  for (const list of buckets.values()) {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const i of list) {
      const x = allPositions[i * 3], z = allPositions[i * 3 + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (z < z0) z0 = z;
      if (z > z1) z1 = z;
    }
    tiles.push({ index: new Uint32Array(list), box: [x0, z0, x1, z1] });
  }
  return { positions: allPositions, normals, tiles, y, droppedTriangles, maxTriangles };
}

// The terrain meshes from terrainArrays (fill: an existing group, filled in
// place when the arrays arrive from the worker).
export function terrainGroup(T, group = new THREE.Group(), material = group.material || createTerrainMaterial()) {
  const posAttr = new THREE.BufferAttribute(T.positions, 3);
  const normAttr = new THREE.BufferAttribute(T.normals, 3);
  // 2 x 2 tiles to a mesh: the far terrain in view was ~40 draws and as many nodes to walk
  for (const { index, box: [x0, z0, x1, z1] } of mergeTerrainTiles(T.tiles, perfOff('terreinsamen') ? 0 : TERRAIN_TILE_M * 2)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', posAttr);
    geo.setAttribute('normal', normAttr);
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    // the shared position buffer spans the whole map, so the bounds come
    // from this tile's own triangles (plus slack for the shader's bump)
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(x0, -1, z0), new THREE.Vector3(x1, 1, z1));
    geo.boundingSphere = geo.boundingBox.getBoundingSphere(new THREE.Sphere());
    geo.userData.shared = true;
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.isTerrain = true;
    group.add(mesh);
  }
  group.position.set(0, T.y, 0);
  group.material = material;
  group.userData.isTerrain = true;
  group.userData.droppedTriangles = T.droppedTriangles;
  group.userData.totalTriangles = T.maxTriangles;
  return group;
}
