import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Gradient sky dome + a matching PMREM environment for PBR materials. The
// dome's lowest band blends into scene.fog's colour (fogColor uniform), so
// fogged buildings melt into the horizon; weather.js greys the uniforms.

export const SKY_ZENITH = 0x3f7fc8;
export const SKY_HORIZON = 0xc9d8df;
export const SKY_SUN = 0xffd49a;

const VERTEX = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.9999, p.w);
}
`;

const FRAGMENT = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSunStrength;
uniform vec3 fogColor;
uniform float uFogBlend;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 1.0, h), 0.55));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunStrength * (pow(sd, 900.0) * 6.0 + pow(sd, 24.0) * 0.28 + pow(sd, 4.0) * 0.08);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
  float band = 1.0 - smoothstep(-0.02, 0.16, d.y);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, band * uFogBlend);
}
`;

export function createSkyUniforms(sunDir) {
  return {
    uZenith: { value: new THREE.Color(SKY_ZENITH) },
    uHorizon: { value: new THREE.Color(SKY_HORIZON) },
    uSunColor: { value: new THREE.Color(SKY_SUN) },
    uSunDir: { value: sunDir.clone().normalize() },
    uSunStrength: { value: 1 },
  };
}

export function buildSkyDome(uniforms) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uFogBlend: { value: 1 },
      fogColor: { value: new THREE.Color(SKY_HORIZON) },
      fogNear: { value: 1 },
      fogFar: { value: 2000 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: true,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

// Low-intensity sky/ground environment for window/paint reflections and a
// little IBL fill; `gain` keeps it well below the hemisphere light.
function buildEnvScene(zenith, horizon, ground, sunDir, sunColor, gain) {
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(zenith).multiplyScalar(gain) },
      uHorizon: { value: new THREE.Color(horizon).multiplyScalar(gain) },
      uGround: { value: new THREE.Color(ground).multiplyScalar(gain) },
      uSun: { value: new THREE.Color(sunColor).multiplyScalar(gain * 12) },
      uSunDir: { value: sunDir.clone().normalize() },
    },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uZenith, uHorizon, uGround, uSun, uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(d.y, 0.0, 1.0), 0.55));
        vec3 col = d.y >= 0.0 ? sky : mix(uHorizon, uGround, smoothstep(0.0, 0.25, -d.y));
        col += uSun * pow(max(dot(d, uSunDir), 0.0), 64.0);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat));
  return scene;
}

export function buildEnvironmentMaps(renderer, sunDir) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const clear = pmrem.fromScene(buildEnvScene(SKY_ZENITH, SKY_HORIZON, 0x6e6250, sunDir, SKY_SUN, 0.45), 0.02).texture;
  const storm = pmrem.fromScene(buildEnvScene(0x4a525c, 0x6c747c, 0x3a3a36, sunDir, 0x000000, 0.35), 0.02).texture;
  pmrem.dispose();
  return { clear, storm };
}
