import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

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
// codebase: built flat in the XY sense, then rotateX(-Math.PI/2) so it lies
// in the X-Z plane (three.x = world.x, three.z = world.y, three.y = up).

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
  float bump = sin(pos.x * 0.018 + pos.z * 0.021) * 0.35
             + sin(pos.x * 0.05 - pos.z * 0.037) * 0.15;
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
  });
}

export function updateTerrainMaterial(material, time) {
  material.uniforms.uTime.value = time;
}

// bounds = [minx, miny, maxx, maxy] in world meters (world.map.meta.bounds).
// Builds one big, real-tessellation ground mesh sized to those bounds (plus
// a safety margin so the surface doesn't run out right at the map edge),
// with segment counts kept in the tens-to-~100 range regardless of map size
// - enough for the shader's per-vertex undulation/normal to have real
// geometry to work with, without being a wasteful vertex count for a mesh
// this large and mostly distant/background.
//
// opts.pad: extra meters added beyond the map bounds on every side
// (default: 15% of the larger extent). opts.segments: override the
// per-axis segment count (default: adaptive, clamped to [40, 100]).
// opts.y: world Y to place the mesh at (default: -0.4 - at/below
// WATER_Y (-0.35) in scene3d.js, so it never re-hides water the way the
// old y=0 flat plane used to).
export function buildTerrainMesh3D(bounds, opts = {}) {
  const [minx, miny, maxx, maxy] = bounds;
  const width = maxx - minx;
  const depth = maxy - miny;
  const pad = opts.pad ?? Math.max(width, depth) * 0.15;
  const totalW = width + pad * 2;
  const totalD = depth + pad * 2;
  const segments = opts.segments
    ?? Math.min(100, Math.max(40, Math.round(Math.max(totalW, totalD) / 45)));
  const y = opts.y ?? -0.4;

  const geo = new THREE.PlaneGeometry(totalW, totalD, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const material = createTerrainMaterial();
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set((minx + maxx) / 2, y, (miny + maxy) / 2);
  mesh.userData.isTerrain = true;
  return mesh;
}
