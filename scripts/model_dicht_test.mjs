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

console.log(fails ? `${fails} van ${n} mislukt` : `model_dicht_test: ${n} controles ok`);
process.exit(fails ? 1 : 0);
