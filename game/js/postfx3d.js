import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Post chain per quality preset: 'laag' renders straight to the screen,
// 'middel' adds grading + vignette, 'hoog' adds bloom. Bloom runs on the
// linear HDR buffer; the final pass does ACES tone mapping + sRGB output
// (what OutputPass would do) and then grades the display-referred colour,
// saving a full-screen pass.

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1 },
    uContrast: { value: 1 },
    uLift: { value: 0 },
    uShadowTint: { value: new THREE.Color(1, 1, 1) },
    uHighTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.2 },
    uAspect: { value: 1 },
    toneMappingExposure: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSat, uContrast, uLift, uVignette, uAspect;
    uniform vec3 uShadowTint, uHighTint;
    varying vec2 vUv;
    #include <tonemapping_pars_fragment>
    void main() {
      vec3 c = ACESFilmicToneMapping(texture2D(tDiffuse, vUv).rgb);
      c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c *= mix(uShadowTint, uHighTint, smoothstep(0.05, 0.75, l));
      c = uLift + c * (1.0 - uLift);
      vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
      c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
      float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) / 255.0;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
  gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
}`,
};

export function createPostFX(renderer, scene, cam) {
  let level = 'laag';
  let composer = null, bloom = null, grade = null;
  let width = 1, height = 1;

  function dispose() {
    if (!composer) return;
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    if (bloom) bloom.dispose();
    composer = bloom = grade = null;
  }

  function build() {
    dispose();
    if (level === 'laag') return;
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(Math.max(1, width * pr), Math.max(1, height * pr), {
      type: THREE.HalfFloatType,
      samples: pr >= 1.75 ? 2 : 4,
    });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, cam));
    // One NaN/Inf pixel from any shader would otherwise be smeared by the
    // bloom blur into large black blocks over the whole screen.
    composer.addPass(new ShaderPass(SanitizeShader));
    if (level === 'hoog') {
      bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.2, 0.35, 2.5);
      // Bloom at CSS-pixel resolution regardless of devicePixelRatio: it is
      // blurred anyway and this keeps retina cost flat.
      const setBloomSize = bloom.setSize.bind(bloom);
      bloom.setSize = (w, h) => setBloomSize(w / pr, h / pr);
      composer.addPass(bloom);
    }
    grade = new ShaderPass(GradeShader);
    grade.material.toneMapped = false;
    composer.addPass(grade);
    composer.setSize(width, height);
  }

  return {
    get level() { return level; },
    setLevel(next) {
      if (next === level && (composer || next === 'laag')) return;
      level = next;
      build();
    },
    setSize(w, h) {
      width = w; height = h;
      if (composer) composer.setSize(w, h);
    },
    rebuild() { build(); },
    apply(L, storm = 0) {
      if (!composer) return;
      const u = grade.uniforms;
      u.uSat.value = L.sat * (1 - storm * 0.22);
      u.uContrast.value = L.con;
      u.uLift.value = L.lift;
      u.uShadowTint.value.copy(L.shadowTint).convertLinearToSRGB().lerp(_grey, storm * 0.5);
      u.uHighTint.value.copy(L.hiTint).convertLinearToSRGB().lerp(_grey, storm * 0.5);
      u.uVignette.value = L.vig + storm * 0.06;
      u.uAspect.value = width / Math.max(1, height);
      u.toneMappingExposure.value = renderer.toneMappingExposure;
      if (bloom) {
        bloom.strength = L.bloomStr;
        bloom.threshold = L.bloomThr;
      }
    },
    render() {
      if (composer) composer.render();
      else renderer.render(scene, cam);
    },
  };
}

const _grey = new THREE.Color(0.97, 0.98, 1.0);
