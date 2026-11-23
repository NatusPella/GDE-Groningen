// Het interieurregister (propregister.js INTERIEUR_REGISTER) en de omgezette meubels (interiorprops_data.js, interiorprops3d.js):
// elk meubel is omgezet, krijgt LOD-niveaus van het centrale systeem, haalt zijn norm (driehoeken, kleuren, maat binnen 25 %),
// staat op de grond, heeft geen NaN, en de data blijft klein. De LOD-niveaus komen uit het centrale systeem (lodkit3d.js, soort
// 'interior'): elk geplaatst meubel krijgt ze en de audit van lodregistry.js keurt ze (lichter genoeg, silhouet bewaard).
//   node scripts/interiorprops_test.mjs [--meet]   (eenmalig: cd desktop && npm run stage)
import './node3d.mjs';
import fs from 'node:fs';

await import('three');
const { INTERIEUR_REGISTER, INTERIEUR_IDS, isInterieurProp, PROP_IDS, PACK_SCHAAL } = await import('../game/js/propregister.js');
const { LOD_KINDS, lodModels, auditLod } = await import('../game/js/lodregistry.js');
const THREE = await import('three');
const { INTERIOR_PROP_DATA } = await import('../game/js/interiorprops_data.js');
const { interiorPropGeometry, interiorPropRaw, interiorProp, INTERIOR_PROP_MATERIALS, fitScale } = await import('../game/js/interiorprops3d.js');

// De functionele maat van een meubel uit zijn eigen driehoeken (lod 0): 'top' de bovenkant, 'mat' de bovenkant van één materiaal,
// 'zit' het hoogste vlak dat omhoog wijst in de voorste helft en het middelste deel van de breedte (zitting, matras).
function echteMaat(id, echt) {
  const r = interiorPropRaw(id, 0), d = INTERIOR_PROP_DATA[id];
  if (echt.soort === 'top') return d.box[1] + d.box[4];
  if (echt.soort === 'mat') {
    const k = d.namen.indexOf(echt.mat);
    if (k < 0) return null;
    let top = -Infinity;
    for (let v = 0; v < r.col.length; v++) if (r.col[v] === k) top = Math.max(top, r.pos[v * 3 + 1]);
    return Number.isFinite(top) ? top : null;
  }
  if (echt.soort === 'zit') {
    const bx = d.box[3], bz = d.box[5];
    let top = -Infinity;
    for (let k = 0; k < r.idx.length; k += 3) {
      const a = r.idx[k] * 3, b = r.idx[k + 1] * 3, c = r.idx[k + 2] * 3, p = r.pos;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz);
      if (!len || ny / len < 0.85) continue;
      const cx = (p[a] + p[b] + p[c]) / 3, cy = (p[a + 1] + p[b + 1] + p[c + 1]) / 3, cz = (p[a + 2] + p[b + 2] + p[c + 2]) / 3;
      if (cx < 0 || cx > bx * 0.4 || Math.abs(cz) > bz * 0.3) continue;
      top = Math.max(top, cy);
    }
    return Number.isFinite(top) ? top : null;
  }
  return null;
}

let bad = 0;
const ok = (name, c, info = '') => { if (!c) { bad++; console.log('FAIL', name, info); } };

ok('register en data dekken elkaar', INTERIEUR_IDS.slice().sort().join() === Object.keys(INTERIOR_PROP_DATA).sort().join(), 'draai node scripts/akte1/meubels_converteer.mjs');
ok('geen dubbele namen met het straatregister', INTERIEUR_IDS.every((id) => !PROP_IDS.includes(id)));
ok('onbekend meubel is niet geregistreerd', !isInterieurProp('kaboutertje'));
const kb = fs.statSync(new URL('../game/js/interiorprops_data.js', import.meta.url)).size / 1024;
ok('de data blijft klein (onder 340 kB)', kb < 340, kb.toFixed(0) + ' kB');

for (const id of INTERIEUR_IDS) {
  const e = INTERIEUR_REGISTER[id], n = e.norm;
  ok(id + ': Nederlandse naam, bron en gebruik', !!e.nl && !!e.bron.bestand && ['home', 'furniture'].includes(e.bron.pack) && e.gebruik.every((g) => g === 'keuken' || g === 'flat'));
  if (!INTERIOR_PROP_DATA[id]) continue;
  const g0 = interiorPropGeometry(id, 0);
  ok(id + ': gedeelde geometrie', interiorPropGeometry(id, 0) === g0 && g0.userData.shared === true);
  const t0 = g0.attributes.position.count / 3;
  ok(id + ': driehoeken binnen de norm', t0 >= n.tris[0] && t0 <= n.tris[1], t0 + ' niet in ' + n.tris);
  // de LOD-niveaus van het centrale systeem: een geplaatst exemplaar heeft lichtere niveaus naast het model
  const placed = interiorProp(id);
  const levels = placed.userData.lod && placed.userData.lod.entries[0];
  ok(id + ': LOD-niveaus van het centrale systeem (soort interior)', placed.userData.lod && placed.userData.lod.kind === 'interior' && levels && levels.length >= 2, levels && levels.length);
  const t1 = levels && levels[1] ? levels[1].geometry.attributes.position.count / 3 : t0;
  ok(id + ': LOD1 scheelt genoeg (minCut ' + LOD_KINDS.interior.minCut[0] + ')', t1 <= t0 * (1 - LOD_KINDS.interior.minCut[0]) + 1e-9, t1 + ' tegen ' + t0);
  const g1 = levels && levels[1] ? levels[1].geometry : g0;
  for (const [g, l] of [[g0, 0], [g1, 1]]) {
    const p = g.attributes.position.array;
    let nan = false;
    for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) nan = true;
    ok(`${id}: lod ${l} zonder NaN`, !nan);
    const mat = (l === 0 ? placed.children[0] : levels[1]).material;
    ok(`${id}: lod ${l} tekent (één materiaal, of groepen bij een lijst)`, Array.isArray(mat) ? g.groups.length >= 2 && g.groups.every((q) => q.materialIndex >= 0 && q.materialIndex < mat.length) : !!mat);
  }
  const bb = g0.boundingBox;
  ok(id + ': staat op de grond', Math.abs(bb.min.y) < 0.01, 'min y ' + bb.min.y);
  ok(id + ': midden op de oorsprong', Math.abs(bb.min.x + bb.max.x) < 0.02 && Math.abs(bb.min.z + bb.max.z) < 0.02);
  const maat = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z];
  ok(id + ': maat binnen 25 % van de norm', maat.every((m, i) => Math.abs(m - n.maat[i]) <= Math.max(0.05, n.maat[i] * 0.25)), maat.map((m) => m.toFixed(2)) + ' tegen ' + n.maat);
  const kl = new Set(interiorPropRaw(id, 0).palet);
  ok(id + ': genoeg verschillende kleuren', kl.size >= n.kleuren, kl.size + ' < ' + n.kleuren);
  // schaal: per pack vast, een afwijking alleen met een reden, en de data is met deze schaal gemaakt
  ok(id + ': schaal = packschaal x correctie', Math.abs(e.bron.schaal - PACK_SCHAAL[e.bron.pack] * e.bron.correctie) < 1e-3);
  ok(id + ': correctie alleen met een reden en binnen 0,7-1,3', e.bron.correctie === 1 || (!!e.bron.waarom && e.bron.correctie >= 0.7 && e.bron.correctie <= 1.3), e.bron.correctie + ' ' + e.bron.waarom);
  ok(id + ': data gemaakt met de schaal van het register', INTERIOR_PROP_DATA[id].schaal === e.bron.schaal, INTERIOR_PROP_DATA[id].schaal + ' tegen ' + e.bron.schaal + ': draai node scripts/akte1/meubels_converteer.mjs');
  const echt = e.echt ? echteMaat(id, e.echt) : null;
  if (e.echt) ok(`${id}: echte maat (${e.echt.soort}) ${e.echt.h} m`, echt != null && Math.abs(echt - e.echt.h) <= Math.max(0.05, e.echt.h * 0.08), echt != null ? echt.toFixed(3) + ' m' : 'niet te meten');
  if (process.argv.includes('--meet')) console.log(id.padEnd(12), t0, '->', t1, 'tris', maat.map((m) => m.toFixed(2)).join(' x '), e.echt ? `${e.echt.soort} ${echt && echt.toFixed(3)} (doel ${e.echt.h})` : '');
}
ok('packschaal vastgelegd voor beide packs', PACK_SCHAAL.home > 0.3 && PACK_SCHAAL.home < 0.7 && PACK_SCHAAL.furniture > 0.7 && PACK_SCHAAL.furniture <= 1.2);
for (const [id, h] of [['deur', 2.0], ['keukenkast', 0.9], ['keukentafel', 0.75], ['keukenstoel', 0.45], ['zitbank', 0.42], ['bed', 0.5], ['koelkast', 1.8]]) {
  ok(`norm eigenaar: ${id} heeft een echte maat rond ${h} m`, !!INTERIEUR_REGISTER[id] && !!INTERIEUR_REGISTER[id].echt && Math.abs(INTERIEUR_REGISTER[id].echt.h - h) <= 0.1);
}

// een geplaatst meubel: een groep met het model en zijn niveaus (verborgen tot updateLodObjects ze kiest), in de LOD-audit
const lod = interiorProp('keukenstoel', { x: 1, z: 2, rot: 0.5 });
ok('interiorProp geeft een groep met LOD-niveaus', lod.isGroup && lod.children.length >= 2 && lod.children.slice(1).every((c) => !c.visible));
ok('positie en draaiing', lod.position.x === 1 && lod.position.z === 2 && lod.rotation.y === 0.5);
const meubelModellen = lodModels().filter((m) => m.kind === 'interior');
ok('alle meubels staan in het LOD-register', meubelModellen.length >= INTERIEUR_IDS.length, meubelModellen.length);
const auditFouten = auditLod(meubelModellen);
ok('LOD-audit van de meubels zonder fouten', auditFouten.length === 0, JSON.stringify(auditFouten.slice(0, 3)));
const variant = interiorProp('keukenstoel', { kleuren: { Cushing: 0x335577 } });
ok('een kleurvariant krijgt eigen lichtere niveaus', variant.children[1].geometry !== lod.children[1].geometry);
ok('lod 0 houdt het gewone materiaal (verdwijnt niet als niemand de niveaus schakelt)', INTERIOR_PROP_MATERIALS.includes(lod.children[0].material) || lod.children[0].material === INTERIOR_PROP_MATERIALS);
const { registeredProp } = await import('../game/js/interiorprops3d.js');
for (const id of ['tv', 'frituurpan', 'buisradio']) {
  const p = registeredProp(id);
  ok(`${id}: propregister-prop met centrale LOD-niveaus`, p.userData.lod && p.userData.lod.kind === 'interior' && p.children.length >= 2 && p.children[0].material === INTERIOR_PROP_MATERIALS[0]);
}
void THREE;
const s = fitScale('keukentafel', { b: 1.28, h: 0.75, d: 0.86 });
ok('fitScale schaalt per as naar de doos', Math.abs(s[0] * INTERIOR_PROP_DATA.keukentafel.box[3] - 1.28) < 1e-6 && Math.abs(s[2] * INTERIOR_PROP_DATA.keukentafel.box[5] - 0.86) < 1e-6);
let gooit = false;
try { interiorProp('kaboutertje'); } catch (e) { gooit = true; }
ok('een meubel buiten het register gooit', gooit);

console.log(bad ? `interiorprops_test: ${bad} fout(en)` : 'interiorprops_test: ok');
process.exit(bad ? 1 : 0);
