// Programma-sleutelinspectie (#1008, #1046): welke shaderprogramma's ontstaan er NA de start, en waarom miste
// renderer.compile ze? three r160 maakt een programma per cacheKey; die sleutel is een kommalijst van de
// materiaalparameters (WebGLPrograms.getProgramCacheKey). Linkt een draw een programma dat de voorcompilatie niet maakte,
// dan verschilt zijn sleutel in een of enkele velden (aantal lichten, instancingColor, vertexUv1s, fog, ...) van het
// programma dat compile voor hetzelfde materiaaltype wel maakte. Deze module houdt dat bij en noemt het verschil bij naam.
// Zuiver (geen THREE, geen DOM): scripts/programwatch_test.mjs doet het met een nep-renderer. De veldnamen volgen de
// bron van three r160 (build/three.module.js, getProgramCacheKeyParameters en getProgramCacheKeyBooleans); bij een
// nieuwe three-versie moet de test met die bron worden vergeleken (de test telt de velden).

// getProgramCacheKeyParameters, in volgorde (48 velden, beginnend bij `precision`)
export const PARAM_NAMES = [
  'precision', 'outputColorSpace', 'envMapMode', 'envMapCubeUVHeight', 'mapUv', 'alphaMapUv', 'lightMapUv', 'aoMapUv', 'bumpMapUv',
  'normalMapUv', 'displacementMapUv', 'emissiveMapUv', 'metalnessMapUv', 'roughnessMapUv', 'anisotropyMapUv', 'clearcoatMapUv',
  'clearcoatNormalMapUv', 'clearcoatRoughnessMapUv', 'iridescenceMapUv', 'iridescenceThicknessMapUv', 'sheenColorMapUv',
  'sheenRoughnessMapUv', 'specularMapUv', 'specularColorMapUv', 'specularIntensityMapUv', 'transmissionMapUv', 'thicknessMapUv',
  'combine', 'fogExp2', 'sizeAttenuation', 'morphTargetsCount', 'morphAttributeCount', 'numDirLights', 'numPointLights', 'numSpotLights',
  'numSpotLightMaps', 'numHemiLights', 'numRectAreaLights', 'numDirLightShadows', 'numPointLightShadows', 'numSpotLightShadows',
  'numSpotLightShadowsWithMaps', 'numLightProbes', 'shadowMapType', 'toneMapping', 'numClippingPlanes', 'numClipIntersection', 'depthPacking',
];
// de bits van de eerste en tweede masker (getProgramCacheKeyBooleans)
export const BOOL1 = ['isWebGL2', 'supportsVertexTextures', 'instancing', 'instancingColor', 'matcap', 'envMap', 'normalMapObjectSpace',
  'normalMapTangentSpace', 'clearcoat', 'iridescence', 'alphaTest', 'vertexColors', 'vertexAlphas', 'vertexUv1s', 'vertexUv2s', 'vertexUv3s',
  'vertexTangents', 'anisotropy', 'alphaHash', 'batching'];
export const BOOL2 = ['fog', 'useFog', 'flatShading', 'logarithmicDepthBuffer', 'skinning', 'morphTargets', 'morphNormals', 'morphColors',
  'premultipliedAlpha', 'shadowMapEnabled', 'useLegacyLights', 'doubleSided', 'flipSided', 'useDepthPacking', 'dithering', 'transmission',
  'sheen', 'opaque', 'pointsUvs', 'decodeVideoTexture'];

const PRECISIONS = new Set(['highp', 'mediump', 'lowp']);

// Splitst een cacheKey in { head, params, mask1, mask2, tail }. head: shader-id's en defines; tail: de uitvoerkleurruimte
// van de renderer en de customProgramCacheKey (de tekst van onBeforeCompile, mag zelf komma's bevatten).
// Geeft null als de sleutel de verwachte vorm niet heeft (RawShaderMaterial, andere three-versie).
export function parseKey(key) {
  const t = String(key).split(',');
  let a = -1;
  for (let i = 0; i < t.length; i++) if (PRECISIONS.has(t[i])) { a = i; break; }
  if (a < 0 || a + PARAM_NAMES.length + 2 > t.length) return null;
  const m1 = Number(t[a + PARAM_NAMES.length]), m2 = Number(t[a + PARAM_NAMES.length + 1]);
  if (!Number.isFinite(m1) || !Number.isFinite(m2)) return null;
  return { head: t.slice(0, a), params: t.slice(a, a + PARAM_NAMES.length), mask1: m1, mask2: m2, tail: t.slice(a + PARAM_NAMES.length + 2) };
}

const bitNames = (mask, names) => { const o = []; for (let i = 0; i < names.length; i++) if (mask & (1 << i)) o.push(names[i]); return o; };

// De verschillen tussen twee sleutels, leesbaar: ['numPointLights 2 -> 4', '+instancingColor', '-shadowMapEnabled', 'onBeforeCompile'].
export function diffKeys(a, b) {
  const A = parseKey(a), B = parseKey(b);
  if (!A || !B) return a === b ? [] : ['sleutelvorm onbekend'];
  const out = [];
  if (A.head.join(',') !== B.head.join(',')) out.push(`shader/defines ${A.head.slice(0, 3).join('|')} -> ${B.head.slice(0, 3).join('|')}`);
  for (let i = 0; i < PARAM_NAMES.length; i++) if (A.params[i] !== B.params[i]) out.push(`${PARAM_NAMES[i]} ${A.params[i]} -> ${B.params[i]}`);
  const x1 = A.mask1 ^ B.mask1, x2 = A.mask2 ^ B.mask2;
  for (const n of bitNames(x1, BOOL1)) out.push((B.mask1 & (1 << BOOL1.indexOf(n)) ? '+' : '-') + n);
  for (const n of bitNames(x2, BOOL2)) out.push((B.mask2 & (1 << BOOL2.indexOf(n)) ? '+' : '-') + n);
  const ta = A.tail.join(','), tb = B.tail.join(',');
  if (ta !== tb) out.push(`custom ${ta.slice(-26)} -> ${tb.slice(-26)}`); // customProgramCacheKey (cutmask3d, portalcut3d, interiorglass: dynamisch) of kleurruimte
  return out;
}

const keyCost = (a, b) => diffKeys(a, b).length;

// Houdt bij welke programma's er na de start ontstaan. `phase` is 'compile' (binnen renderer.compile: bewust voorbereid) of 'draw'
// (bij een tekenopdracht: linkt synchroon, een hapering). note(program) wordt vanuit de renderer-hook (scene3d pinShaderPrograms) geroepen.
export function createProgramWatch({ now = () => (typeof performance !== 'undefined' ? performance.now() : 0), keep = 120, twins = 80 } = {}) {
  let markedAt = null, compiling = 0;
  const byName = new Map(); // shader naam -> laatste sleutels (voor de tweeling)
  const late = [];
  const n = { total: 0, beforeStart: 0, lateCompile: 0, lateDraw: 0 };
  const twinOf = (name, key) => {
    const list = byName.get(name);
    if (!list) return null;
    let best = null, bestN = Infinity;
    for (const k of list) { if (k === key) continue; const c = keyCost(k, key); if (c < bestN) { bestN = c; best = k; } }
    return best === null ? null : { key: best, diff: diffKeys(best, key) };
  };
  return {
    begin() { compiling++; },
    end() { if (compiling) compiling--; },
    get compiling() { return compiling > 0; },
    markStart() { if (markedAt === null) markedAt = now(); },
    get started() { return markedAt !== null; },
    note(p) {
      if (!p) return;
      const key = String(p.cacheKey || ''), name = p.name || p.type || '?';
      n.total++;
      if (markedAt !== null) {
        const phase = compiling > 0 ? 'compile' : 'draw';
        if (phase === 'compile') n.lateCompile++; else n.lateDraw++;
        if (late.length < keep) {
          const t = twinOf(name, key);
          late.push({ at: +((now() - markedAt) / 1000).toFixed(1), phase, name, diff: t ? t.diff : ['geen tweeling (nieuw soort)'] });
        }
      } else n.beforeStart++;
      let list = byName.get(name);
      if (!list) byName.set(name, list = []);
      list.push(key);
      if (list.length > twins) list.shift();
    },
    stats: () => ({ ...n }),
    late: () => late.slice(),
    // regels voor de technische info
    lines(limit = 12) {
      if (markedAt === null) return [];
      const out = [`Programma's: ${n.total} in totaal, ${n.beforeStart} voor de start, ${n.lateCompile} na de start voorbereid (compile), ${n.lateDraw} na de start bij het tekenen`];
      const draws = late.filter((l) => l.phase === 'draw');
      if (draws.length) out.push(`Let op: ${n.lateDraw} shaders zijn pas bij het tekenen gelinkt (elk een mogelijke hapering); de laatste:`);
      for (const l of draws.slice(-limit)) out.push(`  +${l.at} s ${l.name}: ${l.diff.slice(0, 5).join('; ')}`);
      return out;
    },
    reset() { markedAt = null; compiling = 0; byName.clear(); late.length = 0; n.total = n.beforeStart = n.lateCompile = n.lateDraw = 0; },
  };
}

// De gedeelde teller van het spel (scene3d.js hangt er de renderer aan; gpudiag.js leest hem).
export const programWatch = createProgramWatch();
if (typeof window !== 'undefined') window.__programWatch = programWatch;
