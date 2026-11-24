// #1329: fietsen in een rek naast een straat met stoep staan helemaal op de stoep en op stoephoogte. Op 1,7 m van de rand stond het rek
// over de buitenste stoeprand heen op straathoogte (y0 = 0): de onderkant van de wielen zakte in de stoep en de rest leek een zwarte spin.
// Leest de bron (geen wereld nodig): de maten van de stoep (roadsurface.js), van de fiets (cityprops.js buildOmafiets) en het rek.
//   node scripts/fietsenrek_stoep_test.mjs
import fs from 'node:fs';

let n = 0, fails = 0;
const ok = (c, m, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${m}${info ? ' (' + info + ')' : ''}`); } };
const lees = (f) => fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
const cp = lees('cityprops.js'), rs = lees('roadsurface.js'), sc = lees('streetclutter.js');

const num = (src, re) => { const m = re.exec(src); return m ? Number(m[1]) : NaN; };
const kerbH = num(rs, /const KERB_H = ([\d.]+);/), breed = num(rs, /export const SIDEWALK_EXTRA = ([\d.]+);/);
const kerbTop = num(cp, /export const KERB_TOP = ([\d.]+);/), rek = num(cp, /export const RACK_ON_KERB = ([\d.]+);/);
// de fiets: naven op +-0,52 m, wielstraal 0,33 m (buildOmafiets)
const naaf = num(cp, /for \(const x of \[-([\d.]+), [\d.]+\]\) \{\s*B\.geo\(new THREE\.TorusGeometry/), straal = num(cp, /const r = ([\d.]+), black = 0x1a1a1a/);
ok(Number.isFinite(kerbH) && Number.isFinite(breed) && Number.isFinite(kerbTop) && Number.isFinite(rek) && Number.isFinite(naaf) && Number.isFinite(straal), 'alle maten gevonden', [kerbH, breed, kerbTop, rek, naaf, straal].join(' '));
ok(Math.abs(kerbTop - (0.005 + kerbH)) < 0.002, 'het rek staat op de bovenkant van de stoep', `${kerbTop} tegen ${0.005 + kerbH}`);
const half = naaf + straal;
ok(rek - half >= 0 && rek + half <= breed, 'de hele fiets past op de stoep (geen wiel over een rand)', `${(rek - half).toFixed(2)} tot ${(rek + half).toFixed(2)} m van de rand, stoep ${breed} m`);
// het rek en de fietsen gaan allebei naar stoephoogte, langs een straat met stoep
ok(/const off = \(r\.width \|\| 6\) \/ 2 \+ \(stoep \? RACK_ON_KERB : 1\.7\);/.test(cp) && /const y0 = stoep \? KERB_TOP : 0;/.test(cp), 'naast een stoep: rek op de stoep, op stoephoogte');
ok(/atHeight\(propItem\(protos\.rails\[n - 3\], 'rail'[^\n]*\), y0\)/.test(cp) && /atHeight\(propItem\(geo, 'bike'[^\n]*\), y0\)/.test(cp), 'rek en fietsen krijgen dezelfde hoogte');

ok(/isOnRoad\(map, rx \+ nx \* 0\.9 \* s, ry \+ ny \* 0\.9 \* s, 0\.05, \['cycle', 'foot'\]\)/.test(cp), 'geen wiel op een fietspad of voetpad (lager dan de stoep)');
ok(/r\.cat === 'minor'; \/\/ roadsurface\.js SIDEWALK_CATS/.test(cp) && /const SIDEWALK_CATS = new Set\(\['major', 'normal', 'minor'\]\)/.test(rs), 'dezelfde straten met stoep als roadsurface.js');
// de nietjes van een voetgangersstraat (streetclutter.js) blijven van de stoep van een straat ernaast af (de Vismarkt, hertest 3)
const band = num(sc, /const SIDEWALK_BAND = ([\d.]+);/);
ok(band >= breed, 'de vrije band rond een straat met stoep is minstens de stoep', `${band} tegen ${breed}`);
ok(/isOnRoad\(map, bx \+ nx \* 0\.85 \* k, by \+ ny \* 0\.85 \* k, SIDEWALK_BAND, \['major', 'normal', 'minor'\]\)\)\) return;/.test(sc), 'nietjes: beide wielen buiten de stoepband');
console.log(`${n - fails}/${n} fietsenrek_stoep`);
process.exit(fails ? 1 : 0);
