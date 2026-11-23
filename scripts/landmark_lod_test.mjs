// Detailniveaus van de benoemde landmarks (landmarks3d.js, THREE.LOD): een zwaar model (meer dan 2.000 driehoeken) heeft een vol,
// een massa- en een silhouetniveau en elk niveau is lichter dan het vorige; een licht model (moderne blokken) mag met één niveau
// volstaan. Alle posities zijn eindig, het volle niveau blijft binnen het driehoeksbudget, de draw calls per niveau (niet-lege
// materiaalgroepen) blijven binnen de zes gedeelde materialen, de LOD staat op het midden van zijn geometrie en kiest zijn niveau
// naar de afstand, en bij een model met veel ramen brandt 's avonds een deel (de G_LIT-groep is niet leeg, niet alles).
// De gebouwen uit game/stad.json staan hier op hun echte voetafdruk; de rest (uit OSM) op een rechthoek.
//   node scripts/landmark_lod_test.mjs
import './node3d.mjs';
import fs from 'node:fs';

const THREE = await import('three');
await import('../game/js/models3d_buildings.js');
const L = await import('../game/js/landmarks3d.js');
const stad = JSON.parse(fs.readFileSync(new URL('../game/stad.json', import.meta.url), 'utf8'));
const NAMES = ['Martinikerk', 'Der Aa-kerk', 'Groninger Museum', 'Forum Groningen', 'Hoofdstation Groningen', 'Academiegebouw',
  'Goudkantoor', 'Stadhuis', 'Prinsenhof', 'Synagoge', 'Apenrots', 'Rijkskantoor Kempkensberg'];
const MAX_TRIS = 60000; // volle niveau, per gebouw
const HEAVY = 2000;
const fails = [];
let n = 0;
for (const name of NAMES) {
  let b = stad.buildings.find((q) => q.landmark === name);
  if (b) b = { ...b, parts: b.parts || [] };
  else {
    const cx = 230, cy = 80;
    const ring = [[-40, -14], [40, -14], [40, 14], [-40, 14]].map(([x, y]) => [cx + x, cy + y]);
    b = { name, landmark: name, type: { Stadhuis: 'civic', Synagoge: 'synagogue' }[name] || 'yes', pts: ring, h: 3, parts: [] };
  }
  const ring = b.pts;
  if (!L.hasLandmarkModel(b)) { fails.push(`${name}: geen model`); continue; }
  const edges = L.modelKit.edgesOf(ring);
  const st = L.landmarkLodStats(b, ring, edges);
  if (!st[0]) { fails.push(`${name}: bouwer gaf niets`); continue; }
  n++;
  const [a, m, s] = st;
  console.log(name.padEnd(28), st.map((q) => `${q.tris} tris/${q.draws} draws`).join('  |  '));
  if (a.tris > MAX_TRIS) fails.push(`${name}: vol niveau ${a.tris} driehoeken > ${MAX_TRIS}`);
  if (a.tris > HEAVY) {
    if (!(m.tris < a.tris * 0.85)) fails.push(`${name}: massaniveau (${m.tris}) niet duidelijk lichter dan vol (${a.tris})`);
    if (!(s.tris <= m.tris)) fails.push(`${name}: silhouet (${s.tris}) zwaarder dan massa (${m.tris})`);
    if (s.tris > a.tris * 0.6) fails.push(`${name}: silhouet ${s.tris} is meer dan 60% van vol ${a.tris}`);
  }
  for (const q of st) if (q.draws > 6) fails.push(`${name}: ${q.draws} draw calls op een niveau`);
  const parts = {};
  const lod = L.landmarkLodObject(b, parts, ring, edges);
  if (!lod || !lod.isLOD) { fails.push(`${name}: geen THREE.LOD`); continue; }
  if (a.tris > HEAVY && lod.levels.length < 2) fails.push(`${name}: zwaar model met maar ${lod.levels.length} niveau`);
  const g0 = lod.levels[0].object.geometry;
  g0.computeBoundingBox();
  const c0 = g0.boundingBox.getCenter(new THREE.Vector3());
  if (Math.abs(c0.x) > 0.01 || Math.abs(c0.z) > 0.01) fails.push(`${name}: geometrie niet rond de LOD-positie (${c0.x.toFixed(2)}, ${c0.z.toFixed(2)})`);
  for (const lv of lod.levels) {
    const pos = lv.object.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) { fails.push(`${name}: niet-eindige positie op niveau ${lv.distance}`); break; }
  }
  const glass = g0.groups.filter((q) => q.materialIndex === 2 || q.materialIndex === 5).reduce((t, q) => t + q.count, 0);
  const lit = g0.groups.filter((q) => q.materialIndex === 5).reduce((t, q) => t + q.count, 0);
  if (glass > 300 && !(lit > 0 && lit < glass)) fails.push(`${name}: geen deel van de ramen brandt 's avonds (${lit} van ${glass})`);
  // het niveau volgt de afstand tot de camera
  const cam = new THREE.PerspectiveCamera();
  lod.updateMatrixWorld(true);
  const pick = (d) => { cam.position.set(lod.position.x + d, 20, lod.position.z); cam.updateMatrixWorld(true); lod.update(cam); return lod.getCurrentLevel(); };
  const last = lod.levels.length - 1;
  if (pick(30) !== 0 || pick(2000) !== last) fails.push(`${name}: niveau volgt de afstand niet`);
  parts.landmarkLods.dispose();
}
if (!n) fails.push('geen enkel landmarkmodel gebouwd');
for (const f of fails) console.log('FAIL', f);
console.log(`${n} landmarks, ${fails.length} fouten`);
process.exit(fails.length ? 1 : 0);
