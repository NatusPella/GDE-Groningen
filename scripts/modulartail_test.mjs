// Haarstaart, vlecht, twee staartjes en knot op de modulaire mens (#1351): het pack heeft die kapsels niet, dus komen ze als eigen
// geometrie op het hoofdbot, op elk LOD, ook onder een pet. Tammo (vaste look) met een staart-kapsel heeft hem.
//   node scripts/modulartail_test.mjs
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../game/js/modularpeople.js');
const P = await import('../game/js/models3d_people.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));
P.setModularPlayerLooks(true);
let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
const v = new THREE.Vector3();
const verts = (m) => { m.updateMatrixWorld(true); return m.userData.body.geometry.attributes.position.count; };
const rearMost = (m, y0) => { m.updateMatrixWorld(true); const b = m.userData.body, g = b.geometry; let lo = 1e9, low = 1e9; for (let i = 0; i < g.attributes.position.count; i++) { v.fromBufferAttribute(g.attributes.position, i); b.applyBoneTransform(i, v); if (v.y > y0) { lo = Math.min(lo, v.x); } low = Math.min(low, v.y); } return { rear: lo, low }; };
for (const [char, app] of [['tammo', P.TAMMO_APPEARANCE], ['anita', P.ANITA_APPEARANCE]]) for (const style of ['short', 'ponytail', 'braid', 'pigtails', 'bun']) {
  const a = { ...app, hairStyle: style };
  const look = M.modularLookFromAppearance(a);
  ok(look, `${char} ${style}: look`);
  ok(style === 'short' ? !look.tail : look.tail === style, `${char} ${style}: look.tail (${look.tail})`);
  if (char === 'tammo') ok(look.cap === 'tammo', 'Tammo draagt zijn pet');
}
// meshes per LOD: een staart voegt hoekpunten toe, op elk LOD
for (const lod of [0, 1, 2]) {
  const look = M.modularLookFromAppearance({ ...P.TAMMO_APPEARANCE, hairStyle: 'ponytail', seed: 11 });
  const base = M.buildModularPerson(11, { look: { ...look, tail: null } }), tail = M.buildModularPerson(11, { look });
  ok(base.userData.qRig && tail.userData.qRig, 'modulair');
  M.resetModularGeoBudget(); M.setModularLod(base, lod); M.resetModularGeoBudget(); M.setModularLod(tail, lod);
  ok(verts(tail) - verts(base) >= 40, `LOD ${lod}: staart heeft hoekpunten (${verts(tail) - verts(base)})`);
  const g = tail.userData.body.geometry, i = g.index.array; let bad = 0; for (let k = 0; k < i.length; k++) if (i[k] >= g.attributes.position.count) bad++;
  ok(bad === 0, `LOD ${lod}: indices binnen bereik`);
  for (let k = 0; k < 4; k++) P.animatePersonWalk(tail, 1.4, 1 / 30);
  const r = rearMost(tail, 0.9), r0 = rearMost(base, 0.9);
  ok(r.rear < r0.rear - 0.02 && Number.isFinite(r.rear), `LOD ${lod}: de staart steekt achter het hoofd uit (${r.rear.toFixed(2)} tegen ${r0.rear.toFixed(2)})`);
}
// Tammo heeft geen staart (#1351): zijn vaste kapsel is 'short' en het hoofddeel dat daarvoor gekozen wordt heeft geen staart in het pack
// (Casual2_Head wel: haar ver achter en onder de kruin). look.tail komt alleen voor ponytail, braid, pigtails en bun.
{
  const man = JSON.parse(fs.readFileSync(new URL('../game/models/mensen/man.json', import.meta.url))), buf = fs.readFileSync(new URL('../game/models/mensen/man.bin', import.meta.url));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), posQ = new Int16Array(ab, man.offsets.pos, man.vertices * 3), col = new Uint8Array(ab, man.offsets.col, man.vertices);
  const tailVerts = (id) => { const p = man.parts.find((q) => q.id === id), eyeY = (p.face.eyes[0].c[1] + p.face.eyes[1].c[1]) / 2; let c = 0; for (let v = p.vStart; v < p.vStart + p.vCount; v++) if (/hair/i.test(man.palette[col[v]].mat) && posQ[v * 3 + 1] * man.posQ < eyeY - 0.06 && posQ[v * 3] * man.posQ < 0) c++; return c; };
  ok(tailVerts('Casual2_Head') > 0, 'de meetmethode ziet de pakketstaart van Casual2_Head');
  for (const style of ['short', 'buzz', 'quiff', 'undercut', 'fringe', 'pixie', 'bald']) for (const app of [P.TAMMO_APPEARANCE, { ...P.TAMMO_APPEARANCE, look: { hat: null } }, ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => ({ ...P.TAMMO_APPEARANCE, vary: true, seed }))]) {
    const look = M.modularLookFromAppearance({ ...app, hairStyle: style });
    ok(look && tailVerts(look.parts.hoofd) === 0, `man ${style}: hoofd ${look && look.parts.hoofd} zonder staart`);
    ok(look && !look.tail, `man ${style}: geen look.tail`);
  }
  const tammo = M.modularLookFromAppearance(P.TAMMO_APPEARANCE);
  ok(!tammo.tail && tailVerts(tammo.parts.hoofd) === 0, 'Tammo: geen staartonderdeel');
  const all = ['short', 'buzz', 'bald', 'curly', 'afro', 'long', 'bun', 'ponytail', 'bob', 'wavy', 'fringe', 'pixie', 'quiff', 'undercut', 'mohawk', 'pigtails', 'braid'];
  for (const st of all) for (const variant of ['male', 'female']) { const l = M.modularLookFromAppearance({ ...P.TAMMO_APPEARANCE, variant, hairStyle: st }); ok(['ponytail', 'braid', 'pigtails', 'bun'].includes(st) ? l.tail === st : !l.tail, `${variant} ${st}: look.tail ${l.tail}`); }
}
console.log(`${n} controles, ${fails} fouten`);
process.exit(fails ? 1 : 0);
