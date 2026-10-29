// Perronmateriaal (#502):  node scripts/perronmateriaal_test.mjs
// Het perron was 's nachts één egaal gekleurd vlak — op het Hoofdstation lavendel met een felle
// gele rand, in Sauwerd blauw — terwijl de straat ernaast wél betegeld is. Oorzaak: het perron
// had een eigen materiaal zonder map (perrons3d.js, stationtravel.js), dus viel er onder het
// blauwe nachtlicht niets te zien dan één kleur. Deze test legt vast dat
//   - het loopvlak van een perron een map (textuur) heeft, met uv's op wereldmaat (0,5 m per
//     tegel), zodat de tegel herhaalt in plaats van één keer over 80 m uitgerekt te worden;
//   - geen enkel vloer- of randvlak van het perron als enige zonder textuur blijft, en dat alle
//     vlakken samen één texture delen (geen canvas per strook);
//   - de halte in de streek (stationtravel.js, Sauwerd) hetzelfde materiaal gebruikt;
//   - de rand een stoeprand is: een lichte betonband die niet zelf licht geeft (geen emissive,
//     geen verzadigd geel) en niet breder dan een stoeptegel.
import './node3d.mjs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const THREE = await import('three');
const P3 = await import('../game/js/perrons3d.js');
const M = await import('../game/js/stationperronmateriaal.js');

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0, fails = 0;
const ok = (cond, name, info = '') => { n++; if (!cond) { fails++; console.log(`FAIL ${name}${info ? ' (' + info + ')' : ''}`); } };
const lum = (hex) => (0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255)) / 255;
// verzadiging (HSL) van een kleur: geel is fel, beton is grijs
function sat(hex) {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
  return hi === 0 ? 0 : (hi - lo) / hi;
}

// Een perron van 80 m met een trap aan het eind: precies de vorm die de bouw oplevert (treden,
// stootborden, zijkant en rand komen er allemaal in voor).
const row = {
  id: 'p1', nm: 'Perron 1',
  p: [[-40, 5, 1.9, 1.02], [0, 5, 1.9, 1.02], [40, 5, 1.9, 1.02]],
  r: [{ a: [40, 5], b: [47, 5], hw: 1.2, za: 1.02, zb: 0, k: 'trap' }],
};
const grp = P3.buildPerrons3D({ perrons: [row] });
ok(!!grp, 'de perrons worden gebouwd');

// 1. het loopvlak heeft een map en uv's op wereldmaat
{
  const top = grp.getObjectByName('perron-top');
  ok(!!top, 'het loopvlak is aanwijsbaar (perron-top)');
  const mat = top && top.material;
  ok(!!mat && !!mat.map, 'het perronmateriaal heeft een map (textuur)');
  ok(!!mat && !mat.isMeshBasicMaterial, 'geen MeshBasicMaterial: het perron vangt nog licht en schaduw');
  const uv = top && top.geometry.attributes.uv;
  ok(!!uv, 'de perrongeometrie heeft uv\'s');
  if (uv) {
    let u0 = Infinity, u1 = -Infinity;
    for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); }
    // 80 m perron / 0,5 m tegel = 160 tegels; alles boven de tien bewijst dat de tegel herhaalt
    ok(u1 - u0 > 10, 'de tegel herhaalt over het perron (geen één uitgerekte tegel)', `${(u1 - u0).toFixed(0)} tegels breed`);
    let eindig = true;
    for (let i = 0; i < uv.count * 2; i++) if (!Number.isFinite(uv.array[i])) eindig = false;
    ok(eindig, 'elke uv is een geldig getal');
  }
  ok(!!mat && mat.map && mat.map.wrapS === THREE.RepeatWrapping && mat.map.wrapT === THREE.RepeatWrapping,
    'de tegel herhaalt zich (RepeatWrapping)');
}

// 2. geen enkel vloer- of randvlak zonder textuur, en samen één texture
{
  const vlakken = ['top', 'rand', 'zij', 'trede', 'stoot'].map((k) => grp.getObjectByName('perron-' + k)).filter(Boolean);
  ok(vlakken.length >= 4, 'de vloer, de rand, de zijkant en de treden zijn er', String(vlakken.length));
  const zonder = vlakken.filter((m) => !m.material.map).map((m) => m.name);
  ok(!zonder.length, 'geen enkel perronvlak is als enige zonder textuur', zonder.join(','));
  const texels = new Set(vlakken.map((m) => m.material.map));
  ok(texels.size === 1, 'alle perronvlakken delen één tegel (geen canvas per strook)', `${texels.size} textures`);
  ok(vlakken.every((m) => m.material.map === M.perronTegel()), 'het is de tegel uit stationperronmateriaal.js');
}

// 3. de halte in de streek (Sauwerd) gebruikt hetzelfde materiaal: dezelfde tegel, ook op een
//    plaat van 80 m (BoxGeometry heeft uv 0..1 over de hele plaat; die moet herschaald worden)
{
  const bron = readFileSync(path.join(ROOT, 'game/js/stationtravel.js'), 'utf8');
  ok(/const mat = perronMateriaal\(/.test(bron), 'de haltevloer komt uit hetzelfde perronmateriaal');
  ok(!/MeshLambertMaterial\(\{ color: 0xa8a49a \}\)/.test(bron), 'de egale Lambert-kleur van de haltevloer is weg');
  ok(/perronTegelUV\(new THREE\.BoxGeometry\(PLAT_LEN/.test(bron), 'de haltevloer krijgt uv\'s op wereldmaat');
  // hetzelfde pad als buildPlatform: een plaat van 80 x 1,02 x 3,2 m
  const plaat = M.perronTegelUV(new THREE.BoxGeometry(80, 1.02, 3.2));
  const mat = M.perronMateriaal(0xa8a49a);
  ok(!!mat.map && mat.map === M.perronTegel(), 'de halteplaat draagt dezelfde tegel als het perron');
  const uv = plaat.attributes.uv;
  let u0 = Infinity, u1 = -Infinity;
  for (let i = 0; i < uv.count; i++) { u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i)); }
  ok(u1 - u0 >= 150, 'de halteplaat telt 160 tegels in de lengte, niet één', (u1 - u0).toFixed(0));
}

// 4. de rand is een stoeprand, geen lichtgevende streep
{
  const rand = grp.getObjectByName('perron-rand');
  ok(!!rand, 'de rand is aanwijsbaar (perron-rand)');
  const mat = rand && rand.material;
  ok(!!mat && !!mat.map, 'de rand is betegeld: geen egale streep');
  ok(!!mat && (!mat.emissive || mat.emissive.getHex() === 0x000000),
    'de rand geeft zelf geen licht (emissive is zwart)');
  const hex = mat ? mat.color.getHex() : 0;
  ok(sat(hex) < 0.35, 'de rand is beton, geen verzadigd geel', `verzadiging ${sat(hex).toFixed(2)}`);
  ok(lum(hex) > 0.5 && lum(hex) < 0.85, 'de rand is een lichte band, geen wit of geel vlak', lum(hex).toFixed(2));
  ok(M.RAND_M > 0.1 && M.RAND_M <= 0.25, 'de rand is een stoeptegel breed, geen brede baan', String(M.RAND_M));
  // wat er eerst stond: het felle geel van de paaltjes (0xe3b81f) hoort niet meer op het vlak
  ok(hex !== 0xe3b81f, 'het felle geel is van de rand af');
}

console.log(`${n - fails}/${n} perronmateriaal-controles gehaald`);
process.exit(fails ? 1 : 0);
