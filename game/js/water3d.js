import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Animated canal water: rolling swell, Schlick-fresnel sky reflection and
// a sun glint. Pure material - this
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
uniform vec3 uSparkleColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunStrength;
uniform float uOpacity;
uniform float uRain;

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

vec2 rainRipple(vec2 p, float speed) {
  vec2 cell = floor(p), f = fract(p) - 0.5;
  float h = hash2(cell);
  float t = fract(uTime * speed + h);
  vec2 d = f - (vec2(hash2(cell + 1.7), hash2(cell + 5.3)) - 0.5) * 0.5;
  float r = length(d);
  float ring = sin((r - t * 0.5) * 55.0) * smoothstep(0.12, 0.0, abs(r - t * 0.5)) * (1.0 - t);
  return d / max(r, 1e-3) * ring;
}

void main() {
  // two scrolling noise layers perturb the analytic wave normal into ripples
  vec2 p1 = vWorldPos.xz * 0.4 + vec2(uTime * 0.05, uTime * 0.03);
  vec2 p2 = vWorldPos.xz * 1.15 + vec2(-uTime * 0.09, uTime * 0.07);
  float n1 = valueNoise(p1), n2 = valueNoise(p2);
  vec3 n = normalize(vNormalW + vec3(n1 - 0.5, 0.0, n2 - 0.5) * 0.12);
  if (uRain > 0.01) {
    vec2 rip = rainRipple(vWorldPos.xz * 1.4, 0.9) + rainRipple(vWorldPos.xz * 2.1 + 7.0, 1.1);
    n = normalize(n + vec3(rip.x, 0.0, rip.y) * 0.3 * uRain);
  }
  vec3 v = normalize(vViewDir);
  float cosV = clamp(dot(n, v), 0.0, 1.0);
  float fresnel = 0.02 + 0.98 * pow(1.0 - cosV, 5.0);

  float depthMix = 0.5 + 0.5 * sin(vWorldPos.x * 0.045 + vWorldPos.z * 0.05 + uTime * 0.25);
  vec3 body = mix(uDeepColor, uShallowColor, depthMix * 0.5);

  vec3 r = reflect(-v, n);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(r.y, 0.0, 1.0), 0.55));
  vec3 color = mix(body, sky, clamp(fresnel * 0.9, 0.0, 0.85));

  float spec = pow(max(dot(r, uSunDir), 0.0), 220.0);
  float sparkle = smoothstep(0.74, 0.96, n1 * 0.5 + n2 * 0.5) * pow(max(dot(r, uSunDir), 0.0), 6.0);
  color += uSunColor * uSunStrength * (spec * 3.5 + sparkle * 0.6) + uSparkleColor * sparkle * 0.05;

  float alpha = clamp(uOpacity + fresnel * 0.15, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

// Dark, murky canal body; the colour mostly comes from the sky reflection
// (fresnel) and the sun glint. Pass the sky uniforms so storms grey it too.
export function createWaterMaterial(sky = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0a1d20) },
      uShallowColor: { value: new THREE.Color(0x173f3d) },
      uSparkleColor: { value: new THREE.Color(0xfff3d2) },
      uZenith: sky ? sky.uZenith : { value: new THREE.Color(0x5b93cf) },
      uHorizon: sky ? sky.uHorizon : { value: new THREE.Color(0xd9e3e4) },
      uSunColor: sky ? sky.uSunColor : { value: new THREE.Color(0xffd49a) },
      uSunDir: sky ? sky.uSunDir : { value: new THREE.Vector3(0.6, 0.6, 0.4).normalize() },
      uSunStrength: sky ? sky.uSunStrength : { value: 1 },
      uOpacity: { value: 0.9 },
      uRain: { value: 0 },
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

export function updateWaterMaterial(material, time, rain = 0) {
  material.uniforms.uTime.value = time;
  material.uniforms.uRain.value = rain;
}
