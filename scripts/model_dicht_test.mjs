// Gaten in de personenmodellen (models3d_people.js, #985): een muts heeft een binnenkant (naar binnen gekeerde wand onder de buitenkant), zodat hij van
// onderaf niet doorzichtig is. Leest de driehoeken van een gebouwd model (positie, normaal en bot per hoekpunt, plat geschaduwd).
//   node scripts/model_dicht_test.mjs      (vereist de vendor-cache, zoals crowd_test.mjs)
import './node3d.mjs';
const M = await import('../game/js/models3d_people.js');
const { PERSON_RIG } = M;

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };

// de driehoeken van de kop (bot 2) boven een hoogte, met de kijkrichting van de normaal ten opzichte van het midden van de kop
function headTris(mesh, minY) {
  let g = null; mesh.traverse((o) => { if (o.geometry && o.geometry.attributes.skinIndex && !g) g = o.geometry; });
  const P = g.attributes.position, N = g.attributes.normal, S = g.attributes.skinIndex;
  const out = [];
  for (let i = 0; i < P.count; i += 3) {
    if (S.getX(i) !== 2 || S.getX(i + 1) !== 2 || S.getX(i + 2) !== 2) continue;
    const c = [0, 1, 2].map((k) => [P.getX(i + k), P.getY(i + k), P.getZ(i + k)]);
    const cx = (c[0][0] + c[1][0] + c[2][0]) / 3, cy = (c[0][1] + c[1][1] + c[2][1]) / 3, cz = (c[0][2] + c[1][2] + c[2][2]) / 3;
    if (cy < minY) continue;
    const nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
    out.push({ out: nx * cx + (ny * (cy - PERSON_RIG.HEAD_Y)) + nz * cz });
  }
  return out;
}

const build = (extra) => M.buildPersonMesh(0x3f6ea8, 0xf1c9a5, { seed: 5, ...extra });
const TOP = PERSON_RIG.HEAD_Y + 0.06;
const base = headTris(build({ hairStyle: 'short', look: { hat: null, hoodUp: false } }), TOP);
const withCap = headTris(build({ hairStyle: 'short', look: { hat: 'cap', hatColor: 0xc8621e, hoodUp: false } }), TOP);
const tammo = headTris(build({ character: 'tammo', hairStyle: 'short' }), TOP);
const inward = (t) => t.filter((x) => x.out < -1e-6).length;
ok(inward(withCap) - inward(base) >= 30, 'een pet heeft een binnenkant (naar binnen gekeerde wand)', `${inward(withCap)} tegen ${inward(base)}`);
ok(inward(tammo) - inward(base) >= 30, 'de muts van Tammo heeft een binnenkant', `${inward(tammo)} tegen ${inward(base)}`);
ok(withCap.length > base.length, 'een pet voegt driehoeken toe');
for (const hat of ['beanie', 'flatcap']) {
  const t = headTris(build({ hairStyle: 'short', look: { hat, hatColor: 0x445566, hoodUp: false } }), PERSON_RIG.HEAD_Y + 0.06);
  ok(inward(t) - inward(base) >= 20, `${hat} heeft een binnenkant`, `${inward(t)} tegen ${inward(base)}`);
}

// lang haar (Tessa): de wanden van het haar steken nergens meer dan 7 mm in het hoofd (de hoekpunten met haarkleur binnen 0,93 van de kop-ellipsoide)
function darkInside(mesh, lim = 0.93) {
  let g = null; mesh.traverse((o) => { if (o.geometry && o.geometry.attributes.skinIndex && !g) g = o.geometry; });
  const P = g.attributes.position, C = g.attributes.color, S = g.attributes.skinIndex;
  let n2 = 0;
  for (let i = 0; i < P.count; i++) {
    if (S.getX(i) !== 2 || Math.max(C.getX(i), C.getY(i), C.getZ(i)) > 0.03) continue;
    const x = P.getX(i), y = P.getY(i) - PERSON_RIG.HEAD_Y, z = P.getZ(i);
    if (Math.hypot(x / 0.097, y / 0.118, z / 0.086) < lim) n2++;
  }
  return n2;
}
{
  let worst = 0;
  const a = M.ANITA_APPEARANCE;
  worst = Math.max(worst, darkInside(M.buildPersonMesh(a.shirt, a.skin, a)));
  for (let seed = 1; seed <= 24; seed++) worst = Math.max(worst, darkInside(M.buildPersonMesh(0x9e3027, 0xd9a06e, { seed, variant: 'female', hairStyle: 'long', hair: 0x1b1716 })));
  ok(worst === 0, 'het lange haar van Tessa en andere lange haren steken niet in het hoofd', String(worst));
  ok(typeof M.outsideHead === 'function', 'outsideHead is beschikbaar');
  const p = M.outsideHead([0.02, PERSON_RIG.HEAD_Y + 0.05, 0.066], 1.02);
  ok(Math.hypot(p[0] / (0.097 * Math.sqrt(1 - 0.424 ** 2)), p[2] / (0.086 * Math.sqrt(1 - 0.424 ** 2))) >= 1.019, 'een punt in het hoofd wordt eruit geduwd');
  const far = [0.3, PERSON_RIG.HEAD_Y, 0.3];
  ok(M.outsideHead(far)[0] === 0.3 && M.outsideHead([0, 0.5, 0])[1] === 0.5, 'een punt buiten het hoofd of ver boven de kop blijft staan');
}

console.log(fails ?`${fails} van ${n} mislukt` : `model_dicht_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
