import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// A genuinely animated water look (deep Gronings-canal teal, rolling swell,
// scrolling sparkle/fresnel) to replace the flat MeshLambertMaterial(0x2f6f9e)
// scene3d.js currently paints every water polygon with. Pure material - this
// file has no idea how many water meshes exist or whether they share one
// instance; see the two exports below.
//
// The vertex displacement only ever reads the flat plane's OWN local x/z
// (no neighbor lookups), so cost is strictly O(vertices), safe for the big
// Diepenring polygon. The wave's analytic partial derivatives (dHdx/dHdz)
// give a cheap per-vertex normal for the fresnel term without a second pass
// or computeVertexNormals() - this fakes bumpiness well at water scale even
// though ShapeGeometry itself has no per-vertex height, only a flat plane.

const VERTEX_SHADER = `
uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vViewDir;

#include <fog_pars_vertex>

void main() {
  vec3 pos = position;

  float w1 = sin(pos.x * 0.15 + uTime * 0.85) * 0.07;
  float w2 = sin(pos.z * 0.21 - uTime * 0.6) * 0.05;
  float w3 = sin((pos.x + pos.z) * 0.085 + uTime * 1.05) * 0.04;
  float w4 = sin((pos.x - pos.z) * 0.33 + uTime * 1.6) * 0.018;
  pos.y += w1 + w2 + w3 + w4;

  float dHdx = cos(pos.x * 0.15 + uTime * 0.85) * (0.15 * 0.07)
             + cos((pos.x + pos.z) * 0.085 + uTime * 1.05) * (0.085 * 0.04)
             + cos((pos.x - pos.z) * 0.33 + uTime * 1.6) * (0.33 * 0.018);
  float dHdz = cos(pos.z * 0.21 - uTime * 0.6) * (0.21 * 0.05)
             + cos((pos.x + pos.z) * 0.085 + uTime * 1.05) * (0.085 * 0.04)
             - cos((pos.x - pos.z) * 0.33 + uTime * 1.6) * (0.33 * 0.018);
  vec3 waveNormal = normalize(vec3(-dHdx, 1.0, -dHdz));

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPosition.xyz;
  vNormalW = normalize(mat3(modelMatrix) * waveNormal);
  vViewDir = normalize(cameraPosition - worldPosition.xyz);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  #include <fog_vertex>
}
`;

const FRAGMENT_SHADER = `
uniform float uTime;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;
uniform vec3 uFresnelColor;
uniform vec3 uSparkleColor;
uniform float uOpacity;

varying vec3 vWorldPos;
varying vec3 vNormalW;
varying vec3 vViewDir;

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
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(vViewDir);
  float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.2);

  // slow, large-scale murk/depth variation - not tied to the wave uniforms
  // above, so it reads as "patchy water clarity", not "the same ripple again"
  float depthMix = 0.5 + 0.5 * sin(vWorldPos.x * 0.045 + vWorldPos.z * 0.05 + uTime * 0.25);
  vec3 baseColor = mix(uDeepColor, uShallowColor, depthMix * 0.55);

  // two noise layers scrolling at different speeds/directions/scales so the
  // sparkle field never looks like one texture sliding uniformly
  vec2 p1 = vWorldPos.xz * 0.4 + vec2(uTime * 0.05, uTime * 0.03);
  vec2 p2 = vWorldPos.xz * 1.15 + vec2(-uTime * 0.09, uTime * 0.07);
  float sparkleField = valueNoise(p1) * 0.5 + valueNoise(p2) * 0.5;
  float sparkle = smoothstep(0.72, 0.95, sparkleField);

  vec3 color = baseColor + uFresnelColor * fresnel * 0.55 + uSparkleColor * sparkle * 0.85;
  float alpha = clamp(uOpacity + fresnel * 0.18 + sparkle * 0.1, 0.0, 1.0);

  gl_FragColor = vec4(color, alpha);

  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Deep blue-teal Gronings-canal tones (murky, not swimming-pool cyan), a
// cool cyan-white rim for the fresnel term and a warm pale glint for the
// scrolling sparkle - two different highlight colors read as "sun glints on
// moving water" instead of one flat brightening.
export function createWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x123240) },
      uShallowColor: { value: new THREE.Color(0x1f5b5e) },
      uFresnelColor: { value: new THREE.Color(0xb9e6df) },
      uSparkleColor: { value: new THREE.Color(0xfff3d2) },
      uOpacity: { value: 0.84 },
      fogColor: { value: new THREE.Color(0xffffff) },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    fog: true,
  });
}

export function updateWaterMaterial(material, time) {
  material.uniforms.uTime.value = time;
}
