// De snede van de binnenruimte-isolatie in three (de pure kern: interiorcutshader.js). applyInteriorCut(mat) laat een wereldmateriaal
// alles weglaten wat binnen een actief binnenvolume valt (interiorisolation.js houdt de volumes bij); zonder volumes kost het een
// vertakking per fragment. Zoals portalcut3d.js: een eigen onBeforeCompile van het materiaal blijft werken (we hangen eraan).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { MAX_VOLUMES, packVolumes, patchInteriorShader } from './interiorcutshader.js';

export const CUT_UNIFORMS = {
  uIntA: { value: Array.from({ length: MAX_VOLUMES }, () => new THREE.Vector4()) },
  uIntB: { value: Array.from({ length: MAX_VOLUMES }, () => new THREE.Vector4()) },
  uIntN: { value: 0 },
};
const _A = [], _B = [];

// Zet de actieve volumes (de dichtstbijzijnde bij `near` eerst). Geeft het aantal volumes in gebruik.
export function setInteriorCutVolumes(volumes, near = null) {
  const n = packVolumes(volumes, _A, _B, near);
  for (let i = 0; i < n; i++) { CUT_UNIFORMS.uIntA.value[i].set(..._A[i]); CUT_UNIFORMS.uIntB.value[i].set(..._B[i]); }
  CUT_UNIFORMS.uIntN.value = n;
  return n;
}

export function applyInteriorCut(mat) {
  if (!mat || (mat.userData && mat.userData.interiorCut)) return mat;
  mat.userData = mat.userData || {};
  mat.userData.interiorCut = true;
  const prev = mat.onBeforeCompile;
  const ownKey = Object.prototype.hasOwnProperty.call(mat, 'customProgramCacheKey') ? mat.customProgramCacheKey : null;
  const prevSrc = prev ? prev.toString() : '';
  mat.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(mat, shader, renderer);
    if (!patchInteriorShader(shader)) return;
    Object.assign(shader.uniforms, CUT_UNIFORMS);
  };
  mat.customProgramCacheKey = () => 'intcut|' + (ownKey ? ownKey.call(mat) : prevSrc);
  mat.needsUpdate = true;
  return mat;
}
