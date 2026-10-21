// The open-cut mask (elevation.js openCutMask) as a texture shared by every
// ground material that must not cover a sunken road: terrain, canal bed,
// green, grass. applyCutMask() patches a material to discard
// fragments there.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { openCutMask } from './elevation.js';

const blank = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat);
blank.needsUpdate = true;

const CUT_UNIFORMS = {
  uCutMask: { value: blank },
  uCutRect: { value: new THREE.Vector4(1e9, 1e9, 0, 0) },
  // only near the player (x, z, radius): beyond the streamed road meshes the
  // ground stays whole and the far LOD's flat roads cover the cuttings
  uCutNear: { value: new THREE.Vector3(0, 0, 0) },
};

export function setCutMaskCenter(x, y, radius) {
  CUT_UNIFORMS.uCutNear.value.set(x, y, radius);
}

export function initCutMask(map) {
  const m = map.elev && openCutMask(map.elev);
  if (!m) return;
  const tex = new THREE.DataTexture(m.data, m.w, m.h, THREE.RedFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  CUT_UNIFORMS.uCutMask.value = tex;
  // texel centres sit at x0 + i * res
  CUT_UNIFORMS.uCutRect.value.set(m.x0 - m.res / 2, m.y0 - m.res / 2, 1 / (m.w * m.res), 1 / (m.h * m.res));
}

// Patch a built-in material so it discards over open cuts. worldVarying is
// the name of a vec2 varying holding world x/z (declared by the caller's
// shader), or null to add one here.
// `covered`: also discard over the covered (tunnel) sections - the canal bed.
export function applyCutMask(material, worldVarying = null, covered = false) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev.call(material, shader, renderer);
    Object.assign(shader.uniforms, CUT_UNIFORMS);
    let v = worldVarying;
    if (!v) {
      v = 'vCutXZ';
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vCutXZ;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
vCutXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;
#else
vCutXZ = (modelMatrix * vec4(transformed, 1.0)).xz;
#endif`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vCutXZ;');
    }
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + CUT_GLSL_LOCAL)
      .replace('void main() {', `void main() {\n  if (cutMasked(${v}, ${covered ? '0.25' : '0.75'})) discard;`);
  };
  const key = material.customProgramCacheKey ? material.customProgramCacheKey.bind(material) : null;
  material.customProgramCacheKey = () => (key ? key() : '') + (covered ? '|cutc' : '|cut');
  return material;
}

const CUT_GLSL_LOCAL = `
uniform sampler2D uCutMask;
uniform vec4 uCutRect;
uniform vec3 uCutNear;
bool cutMasked(vec2 p, float level) {
  vec2 dn = p - uCutNear.xy;
  if (dot(dn, dn) > uCutNear.z * uCutNear.z) return false;
  vec2 uv = (p - uCutRect.xy) * uCutRect.zw;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return false;
  return texture2D(uCutMask, uv).r > level;
}
`;
