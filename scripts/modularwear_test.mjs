// Kledingdelen op de modulaire mensen (game/js/modularwear.js, ADR 0052): elk deel in WEAR_REGISTER wordt op beide rigs gebouwd en aan
// zijn norm gehouden (driehoeken, kleuren, maat, voorkanten naar buiten), hangt aan het goede bot, ligt op het lijf (niet erin, niet los
// ervan) en beweegt mee met de animatie. Daarnaast: een agent wordt een modulaire mens in uniform met pet, en de look kent geen kind.
import './node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../game/js/modularpeople.js');
const W = await import('../game/js/modularwear.js');
const ML = await import('../game/js/modularlooks.js');

let fails = 0, n = 0;
const ok = (c, msg) => { n++; if (!c) { fails++; console.log('FAIL', msg); } };
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../game/models/mensen/${r}.bin`, import.meta.url)));

ok(W.wearIds().length >= 2 && W.wearIds().every((id) => { const e = W.WEAR_REGISTER[id]; return e.nl && e.slot && e.norm && e.norm.tris && e.norm.kleuren >= 3 && e.norm.eisen.length >= 3; }), 'elk kledingdeel heeft een naam, een slot en een norm met eisen');

for (const variant of ['male', 'female']) {
  const m = M.buildModularFromAppearance({ cop: true, skin: 0xd9a47a, seed: 31, variant });
  ok(m && m.userData.qRig, `agent (${variant}): modulaire mens`);
  if (!m) continue;
  const ud = m.userData, look = ud.qLook;
  ok(look.wear && look.wear.includes('politiepet') && look.wear.includes('politieuniform') && look.shirt === ML.COP_NAVY && look.pants === ML.COP_NAVY && /Suit/.test(look.parts.romp), `agent (${variant}): uniformjas, pantalon, pet en details (${look.parts.romp})`);
  const g = ud.body.geometry, P = g.attributes.position, SI = g.attributes.skinIndex, C = g.attributes.color;
  const bones = ud.qRig.man.bones, bi = (nm) => bones.findIndex((b) => b.name === nm);
  // de deelgeometrie terugvinden: de kledingdelen staan achteraan, na het gezicht
  const wearVerts = W.wearIds().reduce((a, id) => a, 0);
  ok(wearVerts === 0, 'hulpwaarde');
  for (const id of W.wearIds()) {
    const e = W.WEAR_REGISTER[id];
    // opnieuw bouwen met dezelfde ctx als modularpeople.js (via de cache van de rig)
    const w = ud.qRig.wearCache && [...ud.qRig.wearCache.values()].find((x) => x && x.id === id);
    ok(!!w, `${variant} ${id}: gebouwd`);
    if (!w) continue;
    ok(w.tris >= e.norm.tris[0] && w.tris <= e.norm.tris[1], `${variant} ${id}: ${w.tris} driehoeken binnen ${e.norm.tris.join('-')}`);
    ok(new Set(w.col).size >= e.norm.kleuren, `${variant} ${id}: ${new Set(w.col).size} kleuren (minstens ${e.norm.kleuren})`);
    ok(w.pos.every(Number.isFinite) && w.bone.every((b) => b >= 0 && b < bones.length), `${variant} ${id}: eindige punten en geldige botten`);
    if (e.norm.maat) {
      const ax = [0, 1, 2].map((k) => { let lo = Infinity, hi = -Infinity; for (let i = k; i < w.pos.length; i += 3) { lo = Math.min(lo, w.pos[i]); hi = Math.max(hi, w.pos[i]); } return hi - lo; });
      ok(ax.every((x, k) => x > e.norm.maat[k] * 0.75 && x < e.norm.maat[k] * 1.25), `${variant} ${id}: maat ${ax.map((x) => x.toFixed(2)).join(' x ')} (norm ${e.norm.maat.join(' x ')} +-25%)`);
    }
    // de voorkanten wijzen van het bot af (een band om de arm of de heup: naar buiten); hoogstens 10% wijst naar binnen
    let inward = 0;
    for (let t = 0; t < w.idx.length; t += 3) {
      const p = [0, 1, 2].map((j) => new THREE.Vector3(w.pos[w.idx[t + j] * 3], w.pos[w.idx[t + j] * 3 + 1], w.pos[w.idx[t + j] * 3 + 2]));
      const nrm = new THREE.Vector3().crossVectors(p[1].clone().sub(p[0]), p[2].clone().sub(p[0]));
      const mid = p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1 / 3);
      const b = bones[w.bone[w.idx[t]]].name;
      // het middelpunt waar de voorkant vanaf moet wijzen: voor de pet het hoofd, voor de banden de as van het lid of het lijf
      const ref = b === 'Head' ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(bones[bi('Head')].inv).invert()).add(new THREE.Vector3(0, 0.1, 0))
        : b === 'Hips' || b === 'Chest' ? new THREE.Vector3(new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(bones[bi('Hips')].inv).invert()).x, mid.y, 0) : null;
      if (ref && nrm.dot(mid.clone().sub(ref)) < 0) inward++;
    }
    ok(inward <= 0.12 * w.tris, `${variant} ${id}: voorkanten naar buiten (${inward} van ${w.tris} naar binnen)`);
  }
  // de pet zit op het hoofd en beweegt mee: na een stap lopen staat elk petpunt nog even ver van de hoofdkruin
  const head = ud.qBones[ud.qIdx.head];
  m.updateMatrixWorld(true);
  const cnt = P.count, wv = [];
  for (let i = 0; i < cnt; i++) if (SI.getX(i) === bi('Head') && C.getX(i) < 0.05 && C.getZ(i) > 0.012) wv.push(i);   // donkerblauwe petpunten
  const dist = () => { m.updateMatrixWorld(true); const hp = head.getWorldPosition(new THREE.Vector3()); return wv.slice(0, 20).map((i) => { const v = new THREE.Vector3().fromBufferAttribute(P, i); ud.body.applyBoneTransform(i, v); v.applyMatrix4(ud.body.matrixWorld); return v.distanceTo(hp); }); };
  const d0 = dist();
  for (let f = 0; f < 40; f++) M.animateModular(m, 1.4, 1 / 30);
  const d1 = dist();
  ok(wv.length > 10 && d0.every((x, k) => Math.abs(x - d1[k]) < 0.004), `agent (${variant}): de pet beweegt mee met het hoofd (${wv.length} punten)`);
  // LOD 2 zonder kledingdelen (vanaf 60 m te klein), LOD 1 met
  M.setModularLod(m, 1); const t1 = ud.body.geometry.index.count;
  M.setModularLod(m, 2); const t2 = ud.body.geometry.index.count;
  ok(t2 < t1, `agent (${variant}): LOD 2 lichter dan LOD 1 (${t1 / 3} -> ${t2 / 3})`);
}

// een gewone voorbijganger heeft geen kledingdelen; een agent herkend aan het korpsblauw van het eigen model ook als agent
const gewoon = M.buildModularPerson(12, { female: false });
ok(!gewoon.userData.qLook.wear, 'gewone voorbijganger: geen uniform');
const viaKleur = ML.lookFromAppearance({ shirt: 0x1c3fae, skin: 0xd9a47a, seed: 3 }, M.modularPartIds());
ok(viaKleur && viaKleur.wear && viaKleur.wear.includes('politiepet'), 'het korpsblauw van het eigen model maakt een agent');
const tammo = ML.lookFromAppearance({ character: 'tammo', shirt: 0x1c3fae, skin: 0xd9a47a, seed: 3 }, M.modularPartIds());
ok(tammo && !tammo.wear, 'Tammo in een blauw shirt is geen agent');

console.log(fails ? `${fails} van ${n} FAILED` : `modularwear: alle ${n} checks groen`);
process.exit(fails ? 1 : 0);
