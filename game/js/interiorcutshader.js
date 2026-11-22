// De snede van de binnenruimte-isolatie, puur (geen THREE): welke vertex- en fragmentcode een wereldmateriaal erbij krijgt om alles binnen
// een binnenvolume weg te laten (interiorvolume.js), en hoe die volumes naar de uniforms gaan. Zelfde techniek als portalcut3d.js (de gevel
// wordt bij de deur opengesneden), nu andersom: wat de wereld BINNEN een hal neerzet wordt niet getekend. Alleen de lagen die er zelf
// voor kiezen (interiorcut3d.js applyInteriorCut: meubilair, bomen, stadsprops, lantaarns) krijgen hem; de spelers, de mensen en de
// effecten niet, die staan wel in de hal. scripts/interior_isolation_test.mjs keurt dit zonder spel.
export const MAX_VOLUMES = 6;

// De uniformrijen voor `volumes` (interiorvolume.js): A = (midden x, midden z, as x, as z), B = (halve breedte, halve diepte, onder, boven),
// in scènecoördinaten (wereld-x, wereld-y als scène-z). Geeft het aantal gebruikte volumes terug (hoogstens MAX_VOLUMES, de dichtstbijzijnde eerst
// als `near` is gegeven).
export function packVolumes(volumes, A, B, near = null) {
  let list = (volumes || []).filter((z) => z && z.rect);
  if (near) list = list.slice().sort((p, q) => Math.hypot(p.rect.cx - near.x, p.rect.cy - near.y) - Math.hypot(q.rect.cx - near.x, q.rect.cy - near.y));
  const n = Math.min(MAX_VOLUMES, list.length);
  for (let i = 0; i < n; i++) {
    const { cx, cy, ux, uy, hu, hv } = list[i].rect;
    const l = Math.hypot(ux, uy) || 1;
    A[i] = [cx, cy, ux / l, uy / l];
    B[i] = [hu, hv, list[i].z0, list[i].z1];
  }
  return n;
}

// Welk deel van de shader past er? Alleen de standaardmaterialen van three (ze hebben beide haakjes); een eigen shader zonder die
// regels blijft ongemoeid. Geeft true als hij is aangepast.
export function patchInteriorShader(shader) {
  const v = shader.vertexShader, f = shader.fragmentShader;
  if (!v || !f || v.indexOf('#include <begin_vertex>') < 0 || f.indexOf('#include <clipping_planes_fragment>') < 0 || v.indexOf('#include <common>') < 0 || f.indexOf('#include <common>') < 0) return false;
  shader.vertexShader = v
    .replace('#include <common>', '#include <common>\nvarying vec3 vIntW;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
vIntW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
vIntW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
  shader.fragmentShader = f
    .replace('#include <common>', `#include <common>
varying vec3 vIntW;
uniform vec4 uIntA[${MAX_VOLUMES}];
uniform vec4 uIntB[${MAX_VOLUMES}];
uniform int uIntN;`)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  for (int i = 0; i < ${MAX_VOLUMES}; i++) {
    if (i >= uIntN) break;
    vec4 ia = uIntA[i];
    vec4 ib = uIntB[i];
    vec2 id = vIntW.xz - ia.xy;
    if (abs(dot(id, ia.zw)) < ib.x && abs(dot(id, vec2(-ia.w, ia.z))) < ib.y && vIntW.y > ib.z && vIntW.y < ib.w) discard;
  }`);
  return true;
}

// Dezelfde vraag als de shader, in JS (de test houdt ze gelijk): valt een scènepunt (x, hoogte y, z) in een van de volumes?
export function insideVolumes(n, A, B, x, y, z) {
  for (let i = 0; i < n; i++) {
    const a = A[i], b = B[i], dx = x - a[0], dz = z - a[1];
    if (Math.abs(dx * a[2] + dz * a[3]) < b[0] && Math.abs(dx * -a[3] + dz * a[2]) < b[1] && y > b[2] && y < b[3]) return true;
  }
  return false;
}
