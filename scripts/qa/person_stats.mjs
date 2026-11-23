// Meet de driehoeken, botten en bouwtijd van een mensmodel over een steekproef van zaden (personages AAA, 23-11).
//   node scripts/qa/person_stats.mjs [aantal=300]
// Een mens is één SkinnedMesh met gedeeld materiaal: drawcalls per mens = 1 (+ losse accessoires), driehoeken = hieronder.
import '../node3d.mjs';
const { buildPersonMesh } = await import('../../game/js/models3d_people.js');
const N = +process.argv[2] || 300;
const SKINS = [0xf1c9a5, 0xd9a47a, 0xa8754f, 0x6e4a33, 0xf6d7bd];
const SHIRTS = [0x3f6ea8, 0x9e3027, 0x4a7a4a, 0xc9a227, 0x5c3f7a, 0xe3ddd0, 0x2b2f36];
let tris = 0, min = 1e9, max = 0, bones = 0, calls = 0, meshes = 0;
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  const m = buildPersonMesh(SHIRTS[i % SHIRTS.length], SKINS[(i * 3) % SKINS.length], { seed: 1000 + i });
  m.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { calls++; if (o.isSkinnedMesh) { meshes++; bones = o.skeleton.bones.length; const g = o.geometry; const t = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += t; min = Math.min(min, t); max = Math.max(max, t); } } });
}
const ms = performance.now() - t0;
console.log(`personen ${N}: gem ${(tris / meshes).toFixed(0)} driehoeken (min ${min}, max ${max}), ${bones} botten, ${(calls / N).toFixed(2)} meshes (drawcalls) per mens, ${(ms / N).toFixed(2)} ms bouwtijd per mens`);
