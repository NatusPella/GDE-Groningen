// Maten van de omgezette modulaire mensen in meters (eis eigenaar 23-11): lengte (kruin zonder hoed of hanenkam benaderd via de
// hoofdbot plus de schedel), ooghoogte (de Eye-vertices), schouderbreedte (buitenkant van de romp op schouderhoogte) en heuphoogte,
// per hoofd- en rompdeel, in rust, met de schaal die modularLook per zaad geeft. Schrijft niets.
//   node scripts/people/mensen_maten.mjs [--json]
import '../node3d.mjs';
import fs from 'node:fs';
const THREE = await import('three');
const M = await import('../../game/js/modularpeople.js');
for (const r of ['man', 'vrouw']) M.registerModularRig(r, JSON.parse(fs.readFileSync(new URL(`../../game/models/mensen/${r}.json`, import.meta.url))), fs.readFileSync(new URL(`../../game/models/mensen/${r}.bin`, import.meta.url)));

const crownCache = new Map();
function crownOffset(rig) {
  if (crownCache.has(rig.name)) return crownCache.get(rig.name);
  let best = 0;
  for (const h of rig.man.parts.filter((p) => p.slot === 'hoofd')) {
    const look = { ...M.modularLook(7, { female: rig.name === 'vrouw' }), scale: 1 };
    look.parts = { ...look.parts, hoofd: h.id };
    const m = M.buildModularPerson(7, { look });
    m.updateMatrixWorld(true);
    const b = m.userData.body, g = b.geometry, v = new THREE.Vector3(), hp = new THREE.Vector3();
    m.userData.qBones[m.userData.qIdx.head].getWorldPosition(hp);
    for (let i = 0; i < h.vCount; i++) {
      if (!/skin/i.test(rig.man.palette[rig.col[h.vStart + i]].mat)) continue;
      v.fromBufferAttribute(g.attributes.position, i); b.applyBoneTransform(i, v);
      best = Math.max(best, v.y - hp.y);
    }
  }
  crownCache.set(rig.name, best);
  return best;
}

// Meet één mens (groep van buildModularPerson) in wereldmeters, inclusief de groepsschaal.
export function measure(m) {
  m.updateMatrixWorld(true);
  const b = m.userData.body, g = b.geometry, rig = m.userData.qRig, pal = rig.man.palette;
  const v = new THREE.Vector3();
  const look = m.userData.qLook;
  const parts = Object.fromEntries(Object.entries(look.parts).map(([s, id]) => [s, rig.man.parts.find((p) => p.id === id)]));
  let eyeY = 0, eyeN = 0, top = -1, shoulder = 0, minY = 1e9;
  // de kruin: het hoogste punt van het hoofddeel dat huid of haar is (geen hoed, geen hanenkam boven 0,12 m over de schedel)
  const order = ['hoofd', 'romp', 'benen', 'voeten'];
  let off = 0;
  const ranges = {};
  for (const s of order) { ranges[s] = [off, off + parts[s].vCount]; off += parts[s].vCount; }
  const B = m.userData.qBones, headPos = new THREE.Vector3(), shPos = new THREE.Vector3();
  B[m.userData.qIdx.head].getWorldPosition(headPos);
  B[rig.man.bones.findIndex((x) => x.name === 'ShoulderL')].getWorldPosition(shPos);
  for (let i = 0; i < g.attributes.position.count; i++) {
    v.fromBufferAttribute(g.attributes.position, i);
    b.applyBoneTransform(i, v);
    v.applyMatrix4(m.matrixWorld);
    const slot = order.find((s) => i >= ranges[s][0] && i < ranges[s][1]);
    if (!slot) continue;   // mond en oogleden (achteraan) tellen niet mee
    minY = Math.min(minY, v.y);
    const pi = rig.col[parts[slot].vStart + (i - ranges[slot][0])];
    const mat = pal[pi].mat;
    if (slot === 'hoofd' && /^Eye$/i.test(mat)) { eyeY += v.y; eyeN++; }
    if (slot === 'hoofd' && /skin/i.test(mat)) top = Math.max(top, v.y);
    if (slot === 'romp' && Math.abs(v.y - shPos.y) < 0.06) shoulder = Math.max(shoulder, Math.abs(v.z));
  }
  // de kruin: hoofdbot plus de afstand hoofdbot-schedeltop van deze rig (gemeten op het hoofd met de hoogste zichtbare schedel; een
  // pet, hoed of kapsel verstopt de schedel en telt niet mee voor de lengte)
  const scale = m.scale.y || 1;
  const crown = headPos.y + crownOffset(rig) * scale;
  return { lengte: crown - minY, schedel: top - minY, oog: eyeN ? eyeY / eyeN - minY : NaN, schouder: shoulder * 2, heup: (() => { const h = new THREE.Vector3(); B[rig.man.bones.findIndex((x) => x.name === 'Hips')].getWorldPosition(h); return h.y - minY; })(), voet: minY };
}

if (process.argv[1] && process.argv[1].endsWith('mensen_maten.mjs')) {
  const rows = [];
  for (const female of [false, true]) {
    const rig = female ? 'vrouw' : 'man';
    const heads = M.modularLook(1, { female }) && JSON.parse(fs.readFileSync(new URL(`../../game/models/mensen/${rig}.json`, import.meta.url))).parts.filter((p) => p.slot === 'hoofd');
    for (const h of heads) {
      const look = { ...M.modularLook(7, { female }), scale: 1 };
      look.parts = { ...look.parts, hoofd: h.id };
      const m = M.buildModularPerson(7, { look });
      const r = measure(m);
      rows.push({ rig, hoofd: h.id, ...Object.fromEntries(Object.entries(r).map(([k, x]) => [k, +x.toFixed(3)])) });
    }
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else for (const r of rows) console.log(`${r.rig} ${r.hoofd.padEnd(18)} lengte ${r.lengte} m, oog ${r.oog} m, schouders ${r.schouder} m, heup ${r.heup} m (schaal 1)`);
}
