// Lekken bij Samen spelen (opdracht 24-10): wat een gast van een stuntavond of een bezige speler in de scene zet, gaat er met zijn
// geometrie en materialen weer uit (renderer.info.geometries bleef stijgen). De scene zelf is er in Node niet: deze test controleert
// dat de opruimer (disposeObject, ruimMeshOp) alles van een stuntgroep vrijgeeft, en dat de bron die opruimer ook gebruikt.
//   node scripts/coop_lekken_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const { stuntPropMesh } = await import('../game/js/stuntavond.js');
const { disposeObject } = await import('../game/js/scene3d.js');
const { ruimMeshOp } = await import('../game/js/coopruim.js');

let n = 0, bad = 0;
const ok = (c, name, info = '') => { n++; if (!c) { bad++; console.log('FAIL', name, info); } };

function bouw() {
  const first = stuntPropMesh('parasol', 0);
  const g = new first.constructor(); // een Group
  const tel = { geo: 0, mat: 0, totGeo: 0, totMat: 0 };
  for (const kind of ['parasol', 'kliko', 'chair', 'table', 'stoepbord']) {
    const m = stuntPropMesh(kind, 1);
    m.traverse((o) => {
      if (o.geometry) { tel.totGeo++; o.geometry.addEventListener('dispose', () => tel.geo++); }
      if (o.material) { tel.totMat++; o.material.addEventListener('dispose', () => tel.mat++); }
    });
    g.add(m);
  }
  return { g, tel };
}
{ const { g, tel } = bouw(); disposeObject(g); ok(tel.totGeo > 5 && tel.geo === tel.totGeo && tel.mat === tel.totMat, 'disposeObject geeft de stuntgroep vrij', JSON.stringify(tel)); }
{ const { g, tel } = bouw(); ruimMeshOp(null, g, { materiaal: true }); ok(tel.geo === tel.totGeo && tel.mat === tel.totMat, 'ruimMeshOp met materiaal geeft de groep vrij', JSON.stringify(tel)); }

const extra = fs.readFileSync(new URL('../game/js/coopextra3d.js', import.meta.url), 'utf8');
ok(!/scene\.remove\(stunt\.groep\)/.test(extra), 'coopextra3d.js haalt de stuntgroep niet meer zonder vrijgeven uit de scene');
const bezig = fs.readFileSync(new URL('../game/js/coopbezig3d.js', import.meta.url), 'utf8');
ok(/ruimMeshOp\(scene, e\.groep, \{ materiaal: true \}\)/.test(bezig), 'coopbezig3d.js geeft ook de materialen van een prop vrij');

console.log(bad ? `${bad} van ${n} mislukt` : `ok: ${n} controles`);
process.exit(bad ? 1 : 0);
