// Wegwijzers: welke namen horen bij de stad en welke mogen aan de rand staan (#436)?
//   node scripts/signblades_test.mjs
import { signpostSetFor, CITY_SIGNPOST_MAX_D, SIGNPOST_MAX_D, BLADE_NAMES, CITY_BLADES, TOWN_BLADES } from '../game/js/signblades.js';

let n = 0, fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

ok(signpostSetFor(0) === 'city', 'in het centrum de stadsnamen', signpostSetFor(0));
ok(signpostSetFor(CITY_SIGNPOST_MAX_D - 1) === 'city', 'net binnen de stadsgrens nog stadsnamen');
ok(signpostSetFor(CITY_SIGNPOST_MAX_D) === 'town', 'op de stadsgrens alleen de echte plaatsen', signpostSetFor(CITY_SIGNPOST_MAX_D));
ok(signpostSetFor(8000) === 'town', 'op 8 km alleen de echte plaatsen', signpostSetFor(8000));
ok(signpostSetFor(SIGNPOST_MAX_D) === null, 'voorbij de buitenrand geen bord meer', signpostSetFor(SIGNPOST_MAX_D));
ok(signpostSetFor(20000) === null, 'ver weg geen bord');
ok(signpostSetFor(-1) === null && signpostSetFor(NaN) === null && signpostSetFor(undefined) === null, 'geen waarde: geen bord');

ok(CITY_BLADES.every((i) => BLADE_NAMES[i]), 'elke stadsnaam bestaat');
ok(TOWN_BLADES.every((i) => BLADE_NAMES[i]), 'elke plaatsnaam bestaat');
ok(TOWN_BLADES.every((i) => ['Haren', 'Hoogkerk'].includes(BLADE_NAMES[i])), 'buiten de stad alleen Haren en Hoogkerk', TOWN_BLADES.map((i) => BLADE_NAMES[i]).join(','));
ok(CITY_BLADES.some((i) => BLADE_NAMES[i] === 'Hoofdstation') && CITY_BLADES.some((i) => BLADE_NAMES[i] === 'Noorderplantsoen'), 'de stadsdistricten zitten in de stadsnamen');
ok(new Set(BLADE_NAMES).size === BLADE_NAMES.length, 'geen dubbele namen');
ok(BLADE_NAMES.every((s) => typeof s === 'string' && s.length > 2), 'elke naam is tekst');
ok(CITY_SIGNPOST_MAX_D < SIGNPOST_MAX_D, 'de stadsgrens ligt binnen de buitenrand');

console.log(`signblades: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
