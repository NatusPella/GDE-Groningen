import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { pointInPolygon, polygonBounds } from './util.js';

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

float tHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), u.x),
             mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), u.x), u.y);
}

vec3 terrainAlbedo(vec2 p) {
  float macro = tNoise(p * 0.02) * 0.65 + tNoise(p * 0.07) * 0.35;
  vec3 c = mix(uColorA, uColorB, smoothstep(0.35, 0.75, macro));
  c = mix(c, uColorDetail, tNoise(p * 0.6) * 0.12);

  // running-bond brick pavers (0.22 x 0.11 m), faded out before they alias
  vec2 b = p / vec2(0.22, 0.11);
  b.x += step(1.0, mod(floor(b.y), 2.0)) * 0.5;
  vec2 cell = floor(b);
  vec2 f = fract(b);
  vec2 fw = max(fwidth(b), vec2(1e-4));
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
};

const WET_GLSL = `
uniform float uWet;
uniform float uRainTime;
varying vec2 vWetXZ;
float wHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
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

function wetOnBeforeCompile(shader) {
  Object.assign(shader.uniforms, WET_UNIFORMS);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec2 vWetXZ;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWetXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\n' + WET_GLSL + (shader.__terrain ? ALBEDO_GLSL : ''))
    .replace('#include <color_fragment>', `#include <color_fragment>
      ${shader.__terrain ? 'diffuseColor.rgb *= terrainAlbedo(vWetXZ);' : ''}
      float wetP = wNoise(vWetXZ * 0.21) * 0.7 + wNoise(vWetXZ * 0.83) * 0.3;
      float puddle = smoothstep(0.74 - 0.12 * uWet, 0.8 - 0.12 * uWet, wetP) * uWet;
      diffuseColor.rgb *= mix(1.0, 0.58, uWet) * mix(1.0, 0.5, puddle);`)
    .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(roughnessFactor, 0.34, uWet);
      roughnessFactor = mix(roughnessFactor, 0.04, puddle);`)
    .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (puddle > 0.01) {
        vec2 rip = wRipple(vWetXZ * 1.6) + wRipple(vWetXZ * 2.3 + 11.0);
        normal = normalize(normal + vec3(rip.x, rip.y, 0.0) * 0.25 * puddle);
      }`);
}

export function applyWetGround(material) {
  material.onBeforeCompile = wetOnBeforeCompile;
  return material;
}

// Standard (not Lambert) so wet ground can drop its roughness and pick up
// sky reflections from scene.environment.
export function createTerrainMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  const uniforms = {
    uColorA: { value: new THREE.Color(TERRAIN_COLOR_A) },
    uColorB: { value: new THREE.Color(TERRAIN_COLOR_B) },
    uColorDetail: { value: new THREE.Color(TERRAIN_COLOR_DETAIL) },
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.__terrain = true;
    wetOnBeforeCompile(shader);
  };
  return material;
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

// Cheap bbox-then-ray-cast point-in-any-water test. waterList entries are
// {pts, bounds} (bounds = [minx,miny,maxx,maxy], same shape GameMap already
// stamps onto every map.water[i] in mapdata.js). The bbox check is what
// keeps 155 polygons affordable against a ~10k-vertex/~20k-triangle grid -
// the real ray-cast (pointInPolygon) only runs for polygons whose bbox
// actually contains the point, which for a sparse water layer is rare.
function isPointInAnyWater(x, y, waterList) {
  for (let i = 0; i < waterList.length; i++) {
    const w = waterList[i];
    const b = w.bounds;
    if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
    if (pointInPolygon(x, y, w.pts)) return true;
  }
  return false;
}

// bounds = [minx, miny, maxx, maxy] in world meters (world.map.meta.bounds).
// waterPolys = array of {pts, bounds} water polygons to cut real holes for
// (pass map.water directly - GameMap's constructor already stamps a
// .bounds bbox onto each entry in mapdata.js; entries missing .bounds get
// one computed on the fly here as a fallback).
//
// Builds one big, real-tessellation ground mesh sized to those bounds (plus
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

export function buildTerrainMesh3D(bounds, waterPolys = [], opts = {}) {
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
  const indices = new Uint32Array(maxTriangles * 3);
  let indexCount = 0;
  let droppedTriangles = 0;

  for (let j = 0; j < segsZ; j++) {
    for (let i = 0; i < segsX; i++) {
      const a = j * nx + i;
      const b = j * nx + i + 1;
      const c = (j + 1) * nx + i;
      const d = (j + 1) * nx + i + 1;

      const ax = positions[a * 3], ay = positions[a * 3 + 2];
      const bx = positions[b * 3], by = positions[b * 3 + 2];
      const cx = positions[c * 3], cy = positions[c * 3 + 2];
      const dx = positions[d * 3], dy = positions[d * 3 + 2];

      // triangle 1: a, c, b
      const cx1 = (ax + cx + bx) / 3, cy1 = (ay + cy + by) / 3;
      if (waterList.length && isPointInAnyWater(cx1, cy1, waterList)) {
        droppedTriangles++;
      } else {
        indices[indexCount++] = a; indices[indexCount++] = c; indices[indexCount++] = b;
      }

      // triangle 2: b, c, d
      const cx2 = (bx + cx + dx) / 3, cy2 = (by + cy + dy) / 3;
      if (waterList.length && isPointInAnyWater(cx2, cy2, waterList)) {
        droppedTriangles++;
      } else {
        indices[indexCount++] = b; indices[indexCount++] = c; indices[indexCount++] = d;
      }
    }
  }

  const normals = new Float32Array(nx * nz * 3);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexCount), 1));
  geo.computeBoundingSphere();

  const material = createTerrainMaterial();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, y, 0);
  mesh.receiveShadow = true;
  mesh.userData.isTerrain = true;
  mesh.userData.droppedTriangles = droppedTriangles;
  mesh.userData.totalTriangles = maxTriangles;
  return mesh;
}
