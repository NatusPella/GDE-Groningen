import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { getSettings } from './settings.js';
import { drunkVisual } from './drunk.js';
import { noteGfxEvent } from './blackframe.js';
import { FLAGS } from './devflags.js';

// Post chain per quality preset: 'laag' renders straight to the screen
// (through an MSAA target + output pass when the canvas has no native AA),
// 'middel' adds grading + vignette, 'hoog' adds bloom. Bloom runs on the
// linear HDR buffer; the final pass does ACES tone mapping + sRGB output
// (what OutputPass would do) and then grades the display-referred colour,
// saving a full-screen pass.

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tBloom: { value: null },
    uSat: { value: 1 },
    uContrast: { value: 1 },
    uLift: { value: 0 },
    uShadowTint: { value: new THREE.Color(1, 1, 1) },
    uHighTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.2 },
    uAspect: { value: 1 },
    uBright: { value: 1 },
    uLook: { value: 0 },
    uDrunk: { value: 0 },
    uTime: { value: 0 },
    uFxSat: { value: 1 },
    uFxCon: { value: 1 },
    uFlash: { value: 0 },
    toneMappingExposure: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float uSat, uContrast, uLift, uVignette, uAspect, uBright, uLook, uDrunk, uTime, uFxSat, uFxCon, uFlash;
    uniform vec3 uShadowTint, uHighTint;
    varying vec2 vUv;
    #include <tonemapping_pars_fragment>
    vec3 softLight(vec3 b, vec3 s) {
      vec3 d = mix(((16.0 * b - 12.0) * b + 4.0) * b, sqrt(b), step(0.25, b));
      return mix(b - (1.0 - 2.0 * s) * b * (1.0 - b), b + (2.0 * s - 1.0) * (d - b), step(0.5, s));
    }
    // the trailer look (trailer.js): a teal-to-amber soft-light wash along
    // the diagonal plus a touch more saturation and contrast
    vec3 trailerLook(vec3 c) {
      c = clamp((c - 0.5) * 1.06 + 0.5, 0.0, 1.0);
      c = clamp(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, 1.14), 0.0, 1.0);
      vec2 p = vec2((vUv.x - 0.5) * uAspect, 0.5 - vUv.y);
      float t = dot(p, vec2(0.342, 0.940)) / (uAspect * 0.342 + 0.940) + 0.5;
      c = mix(c, softLight(c, vec3(0.0, 0.588, 0.667)), 0.18 * (1.0 - smoothstep(0.0, 0.45, t)));
      return mix(c, softLight(c, vec3(1.0, 0.502, 0.157)), 0.18 * smoothstep(0.45, 1.0, t));
    }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // drunk.js: a drifting double image, slightly smeared
      if (uDrunk > 0.0) {
        vec2 o = vec2(sin(uTime * 0.9), cos(uTime * 0.7)) * uDrunk * 0.011;
        vec3 g = texture2D(tDiffuse, vUv + o).rgb + texture2D(tDiffuse, vUv + o * 0.5 + vec2(0.0, 0.002 * uDrunk)).rgb;
        c = mix(c, g * 0.5, 0.42 * uDrunk);
      }
      #ifdef USE_BLOOM
      // what UnrealBloomPass's additive (SRC_ALPHA, ONE) blend pass would add
      vec4 b = texture2D(tBloom, vUv);
      c += b.rgb * b.a;
      #endif
      c = ACESFilmicToneMapping(c);
      c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c *= mix(uShadowTint, uHighTint, smoothstep(0.05, 0.75, l));
      c = uLift + c * (1.0 - uLift);
      // player brightness (Instellingen > Weergave): a gamma curve, so dark
      // scenes open up without blowing out the highlights
      c = pow(max(c, vec3(0.0)), vec3(1.0 / uBright));
      vec2 q = (vUv - 0.5) * vec2(uAspect, 1.0);
      c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
      if (uLook > 0.0) c = mix(c, trailerLook(clamp(c, 0.0, 1.0)), uLook);
      c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uFxSat);
      c = (c - 0.5) * uFxCon + 0.5;
      c = mix(c, vec3(1.0, 0.965, 0.9), uFlash);
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
  if (any(isnan(c)) || any(isinf(c))) {
    c = vec4(0.0, 0.0, 0.0, 1.0);
#ifdef PIXEL_DEBUG
    c = vec4(1.0, 0.0, 1.0, 1.0);
#endif
  }
#ifdef PIXEL_DEBUG
  if (any(lessThan(c.rgb, vec3(0.0)))) c = vec4(0.0, 1.0, 1.0, 1.0);
#endif
  gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
}`,
};

// Tone mapping + sRGB only: 'laag' on a canvas without native antialiasing.
const OutputShader = {
  uniforms: { tDiffuse: { value: null }, toneMappingExposure: { value: 1 }, uBright: { value: 1 }, uFxSat: { value: 1 }, uFxCon: { value: 1 }, uFlash: { value: 0 } },
  vertexShader: SanitizeShader.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uBright, uFxSat, uFxCon, uFlash; varying vec2 vUv;
#include <tonemapping_pars_fragment>
void main() {
  vec4 s = texture2D(tDiffuse, vUv);
  // same guard as SanitizeShader: a NaN/Inf/negative channel in the HDR
  // buffer would tone-map into one odd-coloured pixel
  if (any(isnan(s)) || any(isinf(s))) s = vec4(0.0, 0.0, 0.0, 1.0);
#ifdef PIXEL_DEBUG
  if (any(lessThan(s.rgb, vec3(0.0)))) s = vec4(0.0, 1.0, 1.0, 1.0);
#endif
  vec3 c = ACESFilmicToneMapping(clamp(s.rgb, 0.0, 64.0));
  c = pow(max(sRGBTransferOETF(vec4(c, 1.0)).rgb, vec3(0.0)), vec3(1.0 / uBright));
  c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uFxSat);
  c = (c - 0.5) * uFxCon + 0.5;
  c = mix(c, vec3(1.0, 0.965, 0.9), uFlash);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`,
};

// Screen-wide colour effects (cutscene tints, slow motion, camera flashes)
// run in the last pass: a CSS filter or blend mode on the canvas costs a
// full-screen compositing pass every frame, worst on the lowest preset.
// Only 'laag' on a natively antialiased canvas has no pass; body gets
// 'gpu-screenfx' whenever there is one, and the CSS fallbacks key off it.
const FX_TINTS = { '': [1, 1, 1], slowmo: [0.6, 1.06, 1], death: [0.15, 1.1, 1], bust: [0, 1, 0.85] };
export const screenFx = { tint: '', slowmo: false };
const fxNow = [1, 1, 1];
let fxLast = 0, flashAt = -1e9, flashBig = false;

// The trailer's cut flash; false when there is no pass (the caller then
// uses its DOM overlay).
export function flashScreen(big = false) {
  if (!document.body.classList.contains('gpu-screenfx')) return false;
  flashAt = performance.now();
  flashBig = big;
  return true;
}

function flashLevel(now) {
  const t = (now - flashAt) / 1000;
  if (flashBig) {
    if (t < 0 || t > 0.5) return 0;
    if (t < 0.15) return 1 - (t / 0.15) * 0.75;
    if (t < 0.225) return 0.25 + ((t - 0.15) / 0.075) * 0.65;
    return 0.9 * (1 - (t - 0.225) / 0.275);
  }
  return t < 0 || t > 0.28 ? 0 : 0.8 * (1 - t / 0.28) ** 1.6;
}

function stepScreenFx(u) {
  const now = performance.now();
  const dt = Math.min(0.1, (now - fxLast) / 1000);
  fxLast = now;
  const want = FX_TINTS[screenFx.tint] || (screenFx.slowmo ? FX_TINTS.slowmo : FX_TINTS['']);
  const k = Math.min(1, dt * 8);
  for (let i = 0; i < 3; i++) fxNow[i] += (want[i] - fxNow[i]) * k;
  u.uFxSat.value = fxNow[0];
  u.uFxCon.value = fxNow[1];
  u.uFlash.value = flashLevel(now);
  return fxNow[2];
}

// Renders the scene into its own multisampled HDR target and resolves it
// into the chain through `shader`. Only this target is multisampled: every
// pass writing into a multisampled target pays a full-screen resolve blit.
class SceneMSAAPass extends Pass {
  constructor(scene, cam, samples, shader = SanitizeShader) {
    super();
    this.scene = scene;
    this.cam = cam;
    // stencilBuffer: de portieropening van een voertuig (vehicledoors3d.js) tekent met een stencil (#389); DEPTH24_STENCIL8 kost
    // evenveel geheugen als de 24-bit diepte van voorheen
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, stencilBuffer: true });
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(shader.uniforms),
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      defines: FLAGS.pixeldebug ? { PIXEL_DEBUG: '' } : {},
    });
    this.material.toneMapped = false;
    this.uniforms = this.material.uniforms;
    this.fsQuad = new FullScreenQuad(this.material);
  }

  setSize(w, h) {
    this.target.setSize(w, h);
  }

  render(renderer, writeBuffer) {
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.cam);
    this.material.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
    this.fsQuad.dispose();
  }
}

export function createPostFX(renderer, scene, cam) {
  let level = 'laag';
  let composer = null, bloom = null, grade = null;
  let width = 1, height = 1;
  // The canvas is only multisampled when the game started on 'laag' (see
  // init3D): every other level renders the scene into its own MSAA target.
  const nativeAA = renderer.getContext().getContextAttributes().antialias;

  function dispose() {
    if (!composer) return;
    composer.renderTarget1.dispose();
    composer.renderTarget2.dispose();
    composer.passes[0].dispose();
    if (bloom) bloom.dispose();
    composer = bloom = grade = null;
  }

  const samplesFor = (pr) => (level === 'laag' ? 4 : pr >= 1.75 ? 2 : 4);

  function build() {
    noteGfxEvent(`postfx ${level} opnieuw`);
    dispose();
    document.body.classList.toggle('gpu-screenfx', !(level === 'laag' && nativeAA));
    if (level === 'laag' && nativeAA) return;
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(Math.max(1, width * pr), Math.max(1, height * pr), { type: THREE.HalfFloatType });
    composer = new EffectComposer(renderer, rt);
    if (level === 'laag') {
      composer.addPass(new SceneMSAAPass(scene, cam, 4, OutputShader));
      composer.setSize(width, height);
      return;
    }
    // One NaN/Inf pixel from any shader would otherwise be smeared by the
    // bloom blur into large black blocks over the whole screen: the scene
    // pass resolves through SanitizeShader.
    composer.addPass(new SceneMSAAPass(scene, cam, samplesFor(pr)));
    if (level === 'hoog') {
      bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.2, 0.35, 2.5);
      // Bloom at CSS-pixel resolution regardless of devicePixelRatio: it is
      // blurred anyway and this keeps retina cost flat.
      const setBloomSize = bloom.setSize.bind(bloom);
      bloom.setSize = (w, h) => { const k = Math.max(1, renderer.getPixelRatio()); setBloomSize(w / k, h / k); };
      // the grade pass adds the bloom itself instead of the pass blending
      // it over the full-resolution buffer (one full-screen pass less)
      const quad = bloom.fsQuad, draw = quad.render.bind(quad);
      quad.render = (r) => { if (quad.material !== bloom.blendMaterial) draw(r); };
      composer.addPass(bloom);
    }
    grade = new ShaderPass(GradeShader);
    grade.material.toneMapped = false;
    if (bloom) {
      grade.material.defines.USE_BLOOM = '';
      grade.uniforms.tBloom.value = bloom.renderTargetsHorizontal[0].texture;
    }
    composer.addPass(grade);
    composer.setSize(width, height);
  }

  return {
    get level() { return level; },
    // where the scene itself is rendered (null: straight to the canvas)
    get sceneTarget() { return composer ? composer.passes[0].target : null; },
    setLevel(next) {
      if (next === level && (composer || (next === 'laag' && nativeAA))) return;
      level = next;
      build();
    },
    // after the renderer's drawing buffer changed (scene3d.js applyRenderSize)
    setSize(w, h, pr = renderer.getPixelRatio()) {
      width = w; height = h;
      if (!composer) return;
      if (composer.passes[0].target.samples !== samplesFor(pr)) { build(); return; }
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
    // 0..1: the trailer's colour look in the grade pass (no pass on 'laag')
    look: 0,
    get hasGrade() { return !!grade; },
    apply(L, storm = 0) {
      if (!composer) return;
      const bright = brightness();
      if (!grade) {
        const u0 = composer.passes[0].uniforms;
        u0.toneMappingExposure.value = renderer.toneMappingExposure;
        u0.uBright.value = bright * stepScreenFx(u0);
        return;
      }
      const u = grade.uniforms;
      u.uBright.value = bright * stepScreenFx(u);
      u.uSat.value = L.sat * (1 - storm * 0.22);
      u.uContrast.value = L.con;
      u.uLift.value = L.lift;
      u.uShadowTint.value.copy(L.shadowTint).convertLinearToSRGB().lerp(_grey, storm * 0.5);
      u.uHighTint.value.copy(L.hiTint).convertLinearToSRGB().lerp(_grey, storm * 0.5);
      u.uVignette.value = L.vig + storm * 0.06;
      u.uAspect.value = width / Math.max(1, height);
      u.uLook.value = this.look;
      u.uDrunk.value = drunkVisual();
      u.uTime.value = performance.now() / 1000;
      u.toneMappingExposure.value = renderer.toneMappingExposure;
      if (bloom) {
        bloom.strength = L.bloomStr;
        bloom.threshold = L.bloomThr;
      }
    },
    render() {
      if (composer) { composer.render(); return; }
      // no post chain: brightness can only go through the exposure
      const e = renderer.toneMappingExposure;
      renderer.toneMappingExposure = e * brightness();
      renderer.render(scene, cam);
      renderer.toneMappingExposure = e;
    },
  };
}

const _grey = new THREE.Color(0.97, 0.98, 1.0);

function brightness() {
  const b = getSettings().brightness;
  return Number.isFinite(b) ? Math.min(1.6, Math.max(0.6, b)) : 1;
}
