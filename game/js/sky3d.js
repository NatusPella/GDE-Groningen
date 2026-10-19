import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// Gradient sky dome + a matching PMREM environment for PBR materials. The
// dome's lowest band blends into scene.fog's colour (fogColor uniform), so
// fogged buildings melt into the horizon; weather.js greys the uniforms.

const SKY_ZENITH = 0x3f7fc8;
export const SKY_HORIZON = 0xc9d8df;
const SKY_SUN = 0xffd49a;

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
uniform vec3 uGlowColor;
uniform vec3 uGlowDir;
uniform float uGlow;
uniform vec3 uMoonDir;
uniform float uMoonPhase;
uniform float uMoonStrength;
uniform vec3 fogColor;
uniform float uFogBlend;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0.0, 1.0, h), 0.55));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * uSunStrength * (pow(sd, 900.0) * 6.0 + pow(sd, 24.0) * 0.28 + pow(sd, 4.0) * 0.08);
  vec2 hd = normalize(d.xz + 1e-5), hs = normalize(uGlowDir.xz + 1e-5);
  float toward = pow(max(dot(hd, hs), 0.0), 2.0) * 0.8 + 0.2;
  col = mix(col, uGlowColor, uGlow * toward * (1.0 - smoothstep(-0.05, 0.42, d.y)));
  if (uMoonStrength > 0.001) {
    // maanschijf met fase: licht komt vanuit de zon-hoek a rond de maan
    float r = 0.05;
    float md = dot(d, uMoonDir);
    col += vec3(0.55, 0.62, 0.8) * uMoonStrength * pow(max(md, 0.0), 120.0) * 0.18;
    if (md > cos(r * 1.15)) {
      vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir));
      vec3 up2 = cross(uMoonDir, rt);
      vec2 q = vec2(dot(d, rt), dot(d, up2)) / sin(r);
      float q2 = dot(q, q);
      if (q2 < 1.3) {
        vec3 n = vec3(q, sqrt(max(1.0 - min(q2, 1.0), 0.0)));
        float a = uMoonPhase * 6.2831853;
        float lit = smoothstep(-0.04, 0.08, dot(n, vec3(sin(a), 0.0, -cos(a))));
        float disc = 1.0 - smoothstep(0.92, 1.0, q2);
        vec3 mc = mix(vec3(0.05, 0.06, 0.09), vec3(0.93, 0.95, 1.0), lit);
        col = mix(col, mc, disc * uMoonStrength);
      }
    }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
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
    uGlowColor: { value: new THREE.Color(0xff8a3c) },
    uGlowDir: { value: sunDir.clone().normalize() },
    uGlow: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 0.5, -1).normalize() },
    uMoonPhase: { value: 0.5 },
    uMoonStrength: { value: 0 },
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
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.userData.stars = buildStars();
  mesh.add(mesh.userData.stars);
  return mesh;
}

// Fixed star field on the upper dome; fades with the night factor.
function buildStars(count = 1400) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 0.06 + Math.pow(Math.random(), 0.7) * 0.94;
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
    pos[i * 3] = Math.cos(a) * r * 90; pos[i * 3 + 1] = y * 90; pos[i * 3 + 2] = Math.sin(a) * r * 90;
    const b = 0.35 + Math.pow(Math.random(), 3) * 1.6, warm = Math.random();
    col[i * 3] = b * (0.85 + warm * 0.15); col[i * 3 + 1] = b * 0.92; col[i * 3 + 2] = b * (1 - warm * 0.12);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0,
    depthTest: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
  });
  // Stars live on a 90 m shell around the camera but are drawn in the
  // transparent pass, after the city: push them to the far plane so every
  // building (near or far LOD) that wrote depth hides them.
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  gl_Position.z = gl_Position.w * 0.99995;',
    );
  };
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -9;
  return pts;
}

export function setStarShare(dome, share) {
  const geo = dome.userData.stars.geometry;
  geo.setDrawRange(0, Math.round(geo.attributes.position.count * share));
}

export function setStarOpacity(dome, opacity) {
  const stars = dome.userData.stars;
  stars.material.opacity = opacity;
  stars.visible = opacity > 0.01;
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

// Re-bakes the PMREM environment from the current sky colours so IBL and
// reflections follow the time of day and storms.
export function createEnvironmentUpdater(renderer, sunDir) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildEnvScene(SKY_ZENITH, SKY_HORIZON, 0x6e6250, sunDir, SKY_SUN, 1);
  const u = envScene.children[0].material.uniforms;
  // Every re-bake renders into the same target: a fresh texture each time
  // would make every lit material re-resolve its shader program.
  let current = null;
  const allocate = pmrem._allocateTargets;
  pmrem._allocateTargets = function () {
    if (!current) current = allocate.call(this);
    return current;
  };
  const last = [];
  return {
    get texture() { return current; },
    update(zenith, horizon, ground, dir, sunColor, gain) {
      u.uZenith.value.copy(zenith).multiplyScalar(gain);
      u.uHorizon.value.copy(horizon).multiplyScalar(gain);
      u.uGround.value.copy(ground).multiplyScalar(gain);
      u.uSun.value.copy(sunColor).multiplyScalar(gain * 12);
      u.uSunDir.value.copy(dir);
      // identical inputs bake an identical environment
      const inputs = [u.uZenith.value, u.uHorizon.value, u.uGround.value, u.uSun.value].flatMap((c) => [c.r, c.g, c.b]).concat(dir.x, dir.y, dir.z);
      if (current && inputs.every((v, i) => v === last[i])) return current.texture;
      last.splice(0, last.length, ...inputs);
      return pmrem.fromScene(envScene, 0.02).texture;
    },
  };
}
