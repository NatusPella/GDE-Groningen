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
// Same pattern as water3d.js: this file owns geometry + a custom
// ShaderMaterial and exports a builder plus a per-frame uniform updater.
// Nothing here is baked in about the caller's position - scene3d.js decides
// when to build it (once, at boot) and when to call the updater (once per
// frame, if it wants the subtle time-based shimmer to animate).
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

const TERRAIN_COLOR_A = 0x6b6459; // same tone as the old flat plane, kept as one end of the blend for continuity
const TERRAIN_COLOR_B = 0x554f3f; // darker, slightly greener-brown patch tone
const TERRAIN_COLOR_DETAIL = 0x8a8170; // lighter dusty fleck tone for fine mottling

const VERTEX_SHADER = `
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormalW;

#include <fog_pars_vertex>

void main() {
  vec3 pos = position;

  // Gentle, purely static rolling undulation (no uTime term) - real ground
  // doesn't ripple like water, it just isn't perfectly flat. Low frequency,
  // small amplitude: enough for the fragment shader's fake diffuse term to
  // have something to work with, not enough to read as hills.
  // Kept to a few centimetres: the terrain sits just under road/sidewalk/
  // green planes (0.015-0.035) and people stand at y=0, so any real relief
  // pokes through the streets and leaves feet floating. The shading normal
  // uses an exaggerated slope so the patchwork stays legible anyway.
  float bump = sin(pos.x * 0.018 + pos.z * 0.021) * 0.012
             + sin(pos.x * 0.05 - pos.z * 0.037) * 0.006;
  pos.y += bump;

  float dHdx = cos(pos.x * 0.018 + pos.z * 0.021) * (0.018 * 0.35)
             + cos(pos.x * 0.05 - pos.z * 0.037) * (0.05 * 0.15);
  float dHdz = cos(pos.x * 0.018 + pos.z * 0.021) * (0.021 * 0.35)
             - cos(pos.x * 0.05 - pos.z * 0.037) * (0.037 * 0.15);
  vec3 bumpNormal = normalize(vec3(-dHdx, 1.0, -dHdz));

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPosition.xyz;
  vNormalW = normalize(mat3(modelMatrix) * bumpNormal);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorDetail;

varying vec3 vWorldPos;
varying vec3 vNormalW;

#include <fog_pars_fragment>

float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  // large-scale patchwork between two earth tones - reads as "uneven ground
  // material", not one dead-flat color
  float macro = valueNoise(vWorldPos.xz * 0.006);
  vec3 baseColor = mix(uColorA, uColorB, smoothstep(0.3, 0.7, macro));

  // finer mottling on top for close-up texture
  float micro = valueNoise(vWorldPos.xz * 0.08);
  baseColor = mix(baseColor, uColorDetail, micro * 0.18);

  // cheap fake diffuse against a fixed light-ish direction, using the static
  // bump normal from the vertex shader - this material is unlit (same as
  // water3d.js's fresnel-only approach, no scene light dependency), this is
  // just enough shading variation to keep the undulation visually legible
  vec3 lightDir = normalize(vec3(0.45, 0.82, 0.35));
  float ndotl = max(dot(normalize(vNormalW), lightDir), 0.0);
  vec3 color = baseColor * (0.75 + 0.35 * ndotl);

  // very subtle, slow, static-noise detail shimmer - far calmer/rarer than
  // water's sparkle, just a light dusting of glinting grit so the surface
  // doesn't look perfectly inert up close
  float shimmerField = valueNoise(vWorldPos.xz * 0.6 + vec2(uTime * 0.015, -uTime * 0.01));
  float shimmer = smoothstep(0.93, 0.99, shimmerField);
  color += shimmer * 0.05;

  gl_FragColor = vec4(color, 1.0);

  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export function createTerrainMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(TERRAIN_COLOR_A) },
      uColorB: { value: new THREE.Color(TERRAIN_COLOR_B) },
      uColorDetail: { value: new THREE.Color(TERRAIN_COLOR_DETAIL) },
      fogColor: { value: new THREE.Color(0xffffff) },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    fog: true,
    // DoubleSide: cheap insurance against winding-order surprises from the
    // manually-built, hole-punched index buffer in buildTerrainMesh3D - the
    // shader has no per-pixel cost worth protecting on a mesh this size, so
    // there's no real tradeoff here.
    side: THREE.DoubleSide,
  });
}

export function updateTerrainMaterial(material, time) {
  material.uniforms.uTime.value = time;
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

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexCount), 1));
  geo.computeBoundingSphere();

  const material = createTerrainMaterial();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(0, y, 0);
  mesh.userData.isTerrain = true;
  mesh.userData.droppedTriangles = droppedTriangles;
  mesh.userData.totalTriangles = maxTriangles;
  return mesh;
}
