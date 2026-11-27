// Zorgt dat een gepatcht materiaal in zijn fragmentshader de afstand tot de camera (vViewPosition) kan lezen. Phong, Lambert en
// Standard hebben die varying al (Lambert en Phong via een include); MeshBasicMaterial niet (lampen, interieur, deurgaten): zonder
// deze aanvulling compileert de fragmentshader van een uitdovende kloon niet ('vViewPosition' : undeclared identifier) en verdwijnt
// het hele deel (#1349). Aanroepen in onBeforeCompile, vóór het vervangen van 'void main() {' in de fragmentshader.
// Geeft true als er iets is toegevoegd.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const VARYING = /varying\s+vec3\s+vViewPosition\s*;/;
// de tekst met de includes (recursief) uitgeschreven, zoals three hem aan de compiler geeft
function resolved(src, depth = 0) {
  if (depth > 6) return src;
  return src.replace(/#include <(\w+)>/g, (_, n) => resolved(THREE.ShaderChunk[n] || '', depth + 1));
}
export function ensureViewPosition(shader) {
  if (VARYING.test(resolved(shader.fragmentShader))) return false;
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', 'varying vec3 vViewPosition;\nvoid main() {')
    .replace('#include <project_vertex>', '#include <project_vertex>\n  vViewPosition = - mvPosition.xyz;');
  shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'varying vec3 vViewPosition;\nvoid main() {');
  return true;
}
