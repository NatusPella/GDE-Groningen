// Zachte rand voor bomen en andere gedeelde, geïnstantieerde materialen (#1016): in een korte band vóór de
// tekenstraal doven de pixels uit met een schermdeur-dither (de formule van de voetgangersfade in scene3d.js), op
// afstand van de camera (vViewPosition). Het patcht het bestaande materiaal (geen extra pass); een kloon met
// dezelfde programmasleutel deelt het programma, alleen de uniform (de band) verschilt.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const KEY = '|edgefade';

// Patcht `mat` zodat het tussen start en end (m, vanaf de camera) uitdooft. Geeft het materiaal terug.
export function applyEdgeFade(mat, start, end) {
  const uEdge = { value: new THREE.Vector2(start, end) };
  const prev = mat.onBeforeCompile;
  mat.userData.edgeFade = uEdge;
  mat.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(mat, shader, r);
    shader.uniforms.uEdge = uEdge;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform vec2 uEdge;
float efBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float efBayer4(vec2 a) { return efBayer2(0.5 * a) * 0.25 + efBayer2(a); }
void main() {
  float efKeep = 1.0 - clamp((length(vViewPosition) - uEdge.x) / (uEdge.y - uEdge.x), 0.0, 1.0);
  if (efKeep < 1.0 && efBayer4(gl_FragCoord.xy) >= efKeep) discard;`);
  };
  const base = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
  mat.customProgramCacheKey = () => (base ? base() : '') + KEY;
  mat.needsUpdate = true;
  return mat;
}

// Een kloon van `base` met een eigen band (zelfde programma als `base`: zelfde sleutel). `base` mag al gepatcht zijn:
// een kloon erft de patch niet (onBeforeCompile wordt niet gekopieerd).
export function edgeFadeClone(base, start, end) {
  const m = base.clone();
  m.userData = { shared: true };
  return applyEdgeFade(m, start, end);
}
