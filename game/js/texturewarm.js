// Texturen vooraf naar de GPU (#1354). three.js uploadt een texture pas bij de eerste draw van een materiaal dat hem gebruikt; een
// nieuw gebouw met een eigen canvastextuur kostte daardoor een haperende frame op het moment dat het in beeld kwam (renderer.compile
// uploadt geen texturen, alleen programma's). Hier: een wachtrij met een tijdbudget per frame. Een object telt als klaar voor de speler
// pas als alle texturen van zijn materialen op de GPU staan. Puur: de renderer zit achter `env`, zodat scripts/texturewarm_test.mjs het
// zonder browser keurt.
//   env.props(tex) -> { __webglTexture, __version } (renderer.properties.get); env.upload(tex) -> renderer.initTexture; env.now() -> ms
const SLOTS = ['map', 'normalMap', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'bumpMap', 'lightMap', 'displacementMap', 'specularMap', 'gradientMap'];

// alle texturen van een object (en zijn kinderen): de vaste slots en de uniforms van een ShaderMaterial; elke texture hoogstens één keer
export function texturesOf(obj, out = new Set()) {
  if (!obj) return out;
  const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
  for (const m of mats) {
    if (!m) continue;
    for (const s of SLOTS) { const t = m[s]; if (t && t.isTexture) out.add(t); }
    if (m.uniforms) for (const k in m.uniforms) { const v = m.uniforms[k] && m.uniforms[k].value; if (v && v.isTexture) out.add(v); }
  }
  if (obj.children) for (const c of obj.children) texturesOf(c, out);
  return out;
}

export function createTextureWarm(env, { maxPerFrame = 6 } = {}) {
  const queue = new Set();
  const stats = { uploaded: 0, steps: 0, ms: 0, maxMs: 0 };
  // een texture zonder beeld (nog laden), zonder versie (nooit needsUpdate) of een render target heeft niets te uploaden
  const needs = (t) => {
    if (!t || !t.isTexture || t.isRenderTargetTexture || t.isVideoTexture || t.isCompressedTexture) return false;
    if (!(t.version > 0)) return false;
    const img = t.image;
    if (!img || img.complete === false) return false;
    let p; try { p = env.props(t); } catch (e) { return false; }
    return !(p && p.__webglTexture !== undefined && p.__version === t.version);
  };
  return {
    stats,
    // zet de texturen van een object in de wachtrij; geeft het aantal dat nog moet
    enqueue(obj) { let n = 0; for (const t of texturesOf(obj)) if (needs(t)) { queue.add(t); n++; } return n; },
    // alles van dit object al op de GPU? (zet wat ontbreekt in de wachtrij)
    ready(obj) { return this.enqueue(obj) === 0; },
    pending() { for (const t of queue) if (!needs(t)) queue.delete(t); return queue.size; },
    // werk de wachtrij af binnen budgetMs (altijd minstens één, anders komt een trage texture nooit aan de beurt), hoogstens maxPerFrame
    step(budgetMs = 1) {
      if (!queue.size) return 0;
      const t0 = env.now(); let n = 0;
      for (const t of queue) {
        queue.delete(t);
        if (!needs(t)) continue;
        try { env.upload(t); n++; stats.uploaded++; } catch (e) { /* een texture die niet kan: de eerste draw meldt het zelf */ }
        if (n >= maxPerFrame || env.now() - t0 >= budgetMs) break;
      }
      const dt = env.now() - t0;
      stats.steps++; stats.ms += dt; stats.maxMs = Math.max(stats.maxMs, dt);
      return n;
    },
  };
}
