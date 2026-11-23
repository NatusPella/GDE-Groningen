// LOD met een dither-overgang op meshes (vettruck 23-11). De regels staan puur in lodlevels.js; dit is de three-kant.
//
// DitherLOD is een THREE.LOD: de renderer roept update(camera) zelf aan bij elke tekenbeurt (projectObject, autoUpdate), dus er
// hoeft niets in de spellus bij. Hij heeft zelf geen kinderen nodig: hij stuurt de MATERIALEN van zijn niveaus aan
// (material.visible en een dither-uniform). Zo kan niveau 0 de bestaande romp zijn (userData.body van een voertuig, met zijn
// vering, deuren en deuken) en hangen de lichtere niveaus als kinderen onder diezelfde romp: alles helt en veert mee.
// Een materiaal mag in meer niveaus zitten (de wielen in niveau 0 en 1): het is zichtbaar zolang een van die niveaus staat en
// dithert alleen als het echt fading- of indooft. Materialen moeten per model-exemplaar zijn (de uniform hoort bij het materiaal);
// het programma wordt gedeeld (zelfde programmasleutel), dus een LOD kost geen extra shaders per voertuig.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { lodChoice, lodDither } from './lodlevels.js';

const KEY = '|loddither';

// Patcht `mat` met een schermdeur-dither (Bayer 4x4, de formule van edgefade3d.js): uLodDither = (k, complement). complement 0 houdt
// de pixels met bayer < k, complement 1 die met bayer >= k. (1, 0) laat alles staan. Geeft het materiaal terug.
export function patchLodDither(mat) {
  if (mat.userData.lodDither) return mat;
  const u = { value: new THREE.Vector2(1, 0) };
  mat.userData.lodDither = u;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    if (prev) prev.call(mat, shader, r);
    shader.uniforms.uLodDither = u;
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `uniform vec2 uLodDither;
float ldBayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float ldBayer4(vec2 a) { return ldBayer2(0.5 * a) * 0.25 + ldBayer2(a); }
void main() {
  if (uLodDither.x < 1.0 || uLodDither.y > 0.5) { float ldB = ldBayer4(gl_FragCoord.xy); if (uLodDither.y > 0.5 ? ldB < uLodDither.x : ldB >= uLodDither.x) discard; }`);
  };
  const base = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
  mat.customProgramCacheKey = () => (base ? base() : '') + KEY;
  mat.needsUpdate = true;
  return mat;
}

const _p = new THREE.Vector3(), _c = new THREE.Vector3();

export class DitherLOD extends THREE.LOD {
  // lod: de opgave uit het register ({ grenzen, band, weg }); levels: per niveau een lijst materialen
  constructor(lod, levels) {
    super();
    this.type = 'DitherLOD';
    this.spec = lod;
    this.lodLevels = levels.map((mats) => mats.map(patchLodDither));
    this.allMats = [...new Set(this.lodLevels.flat())];
    this.choice = null;
    this.autoUpdate = true;
    this.update(null, 0);
  }
  // camera: de tekencamera (de renderer geeft hem mee); dist: om zonder camera te zetten (tests, contactbladen)
  update(camera, dist) {
    let d = dist;
    if (camera) {
      this.getWorldPosition(_p);
      _c.setFromMatrixPosition(camera.matrixWorld);
      d = _p.distanceTo(_c);
    }
    const choice = lodChoice(d ?? 0, this.spec);
    const prev = this.choice;
    if (prev && prev.a === choice.a && prev.b === choice.b && prev.t === choice.t) return;
    this.choice = choice;
    const dither = lodDither(choice);
    for (const m of this.allMats) {
      let shown = false, fading = false, complement = false, keep = 1;
      for (let i = 0; i < this.lodLevels.length; i++) {
        if (!this.lodLevels[i].includes(m)) continue;
        const s = dither.get(i);
        if (!s) continue;
        if (shown) { fading = false; complement = false; keep = 1; break; } // in beide niveaus van de overgang: gewoon staan
        shown = true; keep = s.keep; complement = s.complement; fading = true;
      }
      m.visible = shown;
      const u = m.userData.lodDither.value;
      if (shown && fading) u.set(keep, complement ? 1 : 0);
      else u.set(1, 0);
    }
  }
  // het niveau dat er nu staat (de uitdovende kant van een overgang), -1 als het model weg is
  get level() { return this.choice ? this.choice.a : 0; }
}
