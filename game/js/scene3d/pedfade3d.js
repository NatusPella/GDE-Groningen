// Voetgangers verdwijnen en verschijnen met een schermdeur-dither: per materiaal een kloon met een
// uFade-uniform in 16 stappen, die hetzelfde programma delen. Afgesplitst uit scene3d.js (#497),
// zonder inhoudelijke wijziging: dezelfde namen, dezelfde volgorde, dezelfde commentaren.

export const FADE_STEPS = 16;
const fadeVariants = new Map();

// Clones share one program per base material (same cache key); only the
// uFade value differs, and three.js uploads it whenever the material switches.
function fadeMaterial(base, level) {
  let arr = fadeVariants.get(base);
  if (!arr) fadeVariants.set(base, arr = []);
  let m = arr[level];
  if (m) return m;
  m = base.clone();
  m.userData.shared = true;
  m.userData.fadeOf = base;
  const uFade = { value: level / FADE_STEPS };
  const prev = base.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(m, shader, r);
    shader.uniforms.uFade = uFade;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform float uFade;
float pedBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float pedBayer4(vec2 a) { return pedBayer2(0.5 * a) * 0.25 + pedBayer2(a); }
void main() {
  if (pedBayer4(gl_FragCoord.xy) >= uFade) discard;`);
  };
  m.customProgramCacheKey = () => (base.customProgramCacheKey ? base.customProgramCacheKey() : '') + '|pedfade';
  arr[level] = m;
  return m;
}

export function applyPedFade(mesh, fade) {
  const level = fade >= 1 ? FADE_STEPS : Math.max(0, Math.min(FADE_STEPS - 1, Math.round(fade * FADE_STEPS)));
  const ud = mesh.userData;
  if (ud.fadeLevel === level) return;
  ud.fadeLevel = level;
  mesh.visible = level > 0;
  if (level === 0) return;
  mesh.traverse((o) => {
    if (!o.material || Array.isArray(o.material)) return;
    const base = o.material.userData.fadeOf || o.material;
    o.material = level >= FADE_STEPS ? base : fadeMaterial(base, level);
  });
}

