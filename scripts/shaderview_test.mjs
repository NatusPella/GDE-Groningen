// Uitdovende LOD-klonen en randfades op een MeshBasicMaterial (lampen, interieur, deurgaten): de fragmentshader leest vViewPosition,
// dus die varying moet er zijn (anders compileert het programma niet en verdwijnt het deel, #1349). Gedrag: de gepatchte shader
// declareert de varying in beide shaders en vult hem in de vertexshader; bij Lambert en Standard (hebben hem al) verandert er niets.
//   node scripts/shaderview_test.mjs
import './node3d.mjs';
const THREE = await import('three');
const { lodFadeMaterial } = await import('../game/js/lodkit3d.js');
const { edgeFadeClone } = await import('../game/js/edgefade3d.js');

let bad = 0;
const check = (name, ok, info = '') => { if (!ok) { bad++; console.log('FAIL', name, info); } };
const uitgeschreven = (src, d = 0) => (d > 6 ? src : src.replace(/#include <(\w+)>/g, (_, n) => uitgeschreven(THREE.ShaderChunk[n] || '', d + 1)));
const tel = (s, re) => (uitgeschreven(s).match(re) || []).length;
const VARY = /varying\s+vec3\s+vViewPosition\s*;/g;
const shaderVan = (lib) => ({ uniforms: {}, vertexShader: THREE.ShaderLib[lib].vertexShader, fragmentShader: THREE.ShaderLib[lib].fragmentShader });
const maak = {
  fade: (mat, i) => lodFadeMaterial(mat, 'vehicle', 1, 3 + i),
  rand: (mat) => edgeFadeClone(mat, 50, 80),
};
let i = 0;
for (const [soort, mk] of Object.entries(maak)) for (const [lib, M] of [['basic', THREE.MeshBasicMaterial], ['lambert', THREE.MeshLambertMaterial], ['standard', THREE.MeshStandardMaterial]]) {
  const m = mk(new M({ color: 0xffffff }), i++);
  const sh = shaderVan(lib);
  m.onBeforeCompile(sh, {});
  const naam = soort + ' op ' + lib;
  check(naam + ': de fragmentshader declareert vViewPosition precies een keer', tel(sh.fragmentShader, VARY) === 1, String(tel(sh.fragmentShader, VARY)));
  check(naam + ': de vertexshader declareert hem ook een keer', tel(sh.vertexShader, VARY) === 1, String(tel(sh.vertexShader, VARY)));
  check(naam + ': de vertexshader vult hem', /vViewPosition\s*=/.test(sh.vertexShader) || lib !== 'basic');
  check(naam + ': de declaratie staat vóór de eerste lezing', uitgeschreven(sh.fragmentShader).indexOf('varying vec3 vViewPosition') < uitgeschreven(sh.fragmentShader).indexOf('length(vViewPosition)'));
  if (lib !== 'basic') check(naam + ': een materiaal dat hem al heeft krijgt geen tweede toewijzing', tel(sh.vertexShader, /vViewPosition\s*=\s*-\s*mvPosition/g) === 1);
}
console.log(bad ? `shaderview_test: ${bad} mislukt` : 'shaderview_test: ok');
process.exit(bad ? 1 : 0);
