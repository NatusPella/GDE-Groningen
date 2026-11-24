// De vissen van het visboek als model (fishmodels.js): snoek, baars, paling, blankvoorn, brasem en karper bestaan, hebben hun
// echte lengte uit visdata.js (15%), drie mesh-LOD's, zwemmen en spartelen eindig, en de hengel toont de gevangen soort.
//   node scripts/visboekmodel_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const AM = await import('../game/js/animalmodels.js');
const FM = await import('../game/js/fishmodels.js');
const VD = await import('../game/js/visdata.js');
const { measureAnimal } = await import('./lib/diermaat.mjs');
let n = 0, bad = 0;
const check = (name, c, extra = '') => { n++; if (!c) { bad++; console.log('FAIL', name, extra); } };
for (const id of AM.FISH_MODEL_IDS) AM.primeAnimalModel(id, JSON.parse(fs.readFileSync(new URL(`../game/models/dieren/${id}.json`, import.meta.url), 'utf8')));

for (const id of ['snoek', 'baars', 'paling', 'voorn', 'brasem', 'karper']) {
  const s = VD.soort(id);
  check(`${id}: echte lengte in visdata`, s && s.lengte > 0.05 && s.lengte < 1.5);
  const g = FM.buildFishModel(id);
  check(`${id}: model`, !!g);
  if (!g) continue;
  const m = measureAnimal(g);
  check(`${id}: lengte ${m.lengte.toFixed(2)} m tegen ${s.lengte} m (15%)`, Math.abs(m.lengte / s.lengte - 1) < 0.15, m.lengte.toFixed(3));
  let lod = null;
  g.traverse((o) => { if (!lod && o.userData && o.userData.lod) lod = o.userData.lod; });
  const tris = lod ? lod.geos.map((x) => Math.round((x.index ? x.index.count : x.attributes.position.count) / 3)) : [];
  // perf-r3 (24-11): een niveau telt alleen als het silhouet blijft (meshlod.js animalLods, geos.silhouette); een lange dunne vis
  // als de paling houdt dan zijn vorige niveau in plaats van plat te worden
  const silhouet = !!(lod && lod.geos && lod.geos.silhouette);
  check(`${id}: drie LOD's met duidelijk minder driehoeken (${tris.join('/')}${silhouet ? ', silhouet bewaard' : ''})`, tris.length === 3 && (silhouet ? tris[1] <= tris[0] && tris[2] <= tris[1] : tris[1] <= tris[0] * 0.8 && tris[2] <= tris[0] * 0.55));
  let ok = true;
  for (const state of ['zwem', 'vangst']) {
    for (let t = 0; t < 2; t += 0.1) FM.animateFishModel(g, { state, speed: 0.5 }, t);
    g.updateMatrixWorld(true);
    g.traverse((o) => { for (const v of o.matrixWorld.elements) if (!Number.isFinite(v)) ok = false; });
  }
  check(`${id}: zwemmen en spartelen eindig`, ok);
}
check('een snoek is langer dan een baars, een paling langer dan een voorn', measureAnimal(FM.buildFishModel('snoek')).lengte > 2 * measureAnimal(FM.buildFishModel('baars')).lengte && measureAnimal(FM.buildFishModel('paling')).lengte > 2 * measureAnimal(FM.buildFishModel('voorn')).lengte);
check('een soort zonder eigen model leent de dichtstbijzijnde vorm (snoekbaars als baars)', FM.FISH_MODEL_OF.snoekbaars === 'vis_baars' && !!FM.buildFishModel('snoekbaars'));
const src = fs.readFileSync(new URL('../game/js/hengelanim.js', import.meta.url), 'utf8');
check('de hengel toont de gevangen soort (hengelanim.js)', /buildFishModel\(e\.fish\)/.test(src) && /animateFishModel\(visNu, \{ state: 'vangst' \}/.test(src));
console.log(`visboekmodel_test: ${n - bad}/${n} ok`);
process.exit(bad ? 1 : 0);
