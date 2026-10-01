import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { COUNTRY_GLSL, COUNTRY_UNIFORMS } from './countryfield.js';

// The ground shader's costliest part is the loop over the real roads and
// canals near each pixel (cEdge). Round the player those distances are
// rendered once into two textures instead (a fine level of 0.5 m texels and
// a coarse one of 2 m), which the shader reads with one fetch; pixels past
// both still run the loop. Signed distances filter well, so edges and the
// painted lines stay sharp when the texels are magnified. A level is only
// re-rendered when the player has moved well inside it, never both in one
// frame.

const SIZE = 1024;
const LEVELS = [
  { texel: 0.5, recentre: 96 },
  { texel: 2, recentre: 400 },
];

let B = null;

function init() {
  // the bake textures stay out of the bake's own uniforms (no feedback loop)
  const uniforms = { uArea: { value: new THREE.Vector4() } };
  for (const k in COUNTRY_UNIFORMS) if (!k.startsWith('uBake')) uniforms[k] = COUNTRY_UNIFORMS[k];
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `${COUNTRY_GLSL}
uniform vec4 uArea;
varying vec2 vUv;
void main() {
  vec2 sd = cEdgeSD(uArea.xy + vUv * uArea.z);
  gl_FragColor = vec4(sd * 0.125 + 0.5, 0.0, 1.0);
}`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const levels = LEVELS.map((L, i) => {
    const rt = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false,
    });
    rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
    COUNTRY_UNIFORMS['uBake' + i].value = rt.texture;
    return { ...L, rt, rect: COUNTRY_UNIFORMS['uBakeRect' + i], cx: NaN, cy: NaN };
  });
  B = { mat, scene, cam: new THREE.Camera(), levels, bakes: 0 };
  window.__countryBake = B;
}

// Before the frame's render: at most one level is re-rendered, centred on
// the player snapped to a few texels so its sampling grid never shifts.
export function updateCountryBake(renderer, px, py, active) {
  if (!active || !COUNTRY_UNIFORMS.uEdgeTex.value || !COUNTRY_UNIFORMS.uEdgeGrid.value) {
    if (B) for (const L of B.levels) L.rect.value[3] = 0;
    return;
  }
  if (!B) init();
  for (const L of B.levels) {
    if (L.rect.value[3] > 0.5 && Math.abs(px - L.cx) < L.recentre && Math.abs(py - L.cy) < L.recentre) continue;
    const snap = L.texel * 16, half = (SIZE * L.texel) / 2;
    L.cx = Math.round(px / snap) * snap;
    L.cy = Math.round(py / snap) * snap;
    B.mat.uniforms.uArea.value.set(L.cx - half, L.cy - half, half * 2, 0);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(L.rt);
    renderer.render(B.scene, B.cam);
    renderer.setRenderTarget(prev);
    L.rect.value = [L.cx - half, L.cy - half, half * 2, 1];
    B.bakes++;
    return;
  }
}
