// Test voor het dialectregister (#13): elk Gronings woord in de gesproken versies en elk Fries woord in de
// getoonde tekst staat in scripts/dialect_woorden.json en is beoordeeld; 'de Grunn' komt niet voor.
//   node scripts/dialect_woorden_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { REPO, load, groningsTokens } from './dialect_check.mjs';
import { collectTexts } from './text_audit.mjs';

let failed = 0;
const ok = (c, m) => { if (!c) { failed++; console.log('FAIL ' + m); } };
const reg = load();
const table = JSON.parse(fs.readFileSync(path.join(REPO, 'scripts', 'gronings_spoken.json'), 'utf8'));
const STATUS = new Set(['bron', 'afgeleid', 'kennis', 'twijfel']);

// Gronings
const found = groningsTokens(table);
const missing = Object.keys(found).filter((w) => !reg.gronings[w]);
ok(!missing.length, `Groningse woorden zonder registratie: ${missing.slice(0, 10).join(', ')} (draai scripts/dialect_check.mjs --write en beoordeel ze)`);
for (const [w, v] of Object.entries(reg.gronings)) {
  ok(STATUS.has(v.status), `Gronings '${w}': status '${v.status}' ongeldig of niet beoordeeld`);
  if (v.status === 'twijfel' || v.status === 'bron') ok(typeof v.opm === 'string' && v.opm.length > 5, `Gronings '${w}': opmerking ontbreekt`);
}
const spokenAll = Object.values(table).filter((x) => typeof x === 'string');
ok(!spokenAll.some((s) => /\bde Grunn\b(?!e|\w)/i.test(s)), "gesproken tekst bevat 'de Grunn'");

// Fries: kenmerkende letters of woorden in de getoonde tekst moeten geregistreerd zijn
const MARKERS = ['moai', 'tige', 'sjoch', 'neat', 'hjir', 'gjin', 'dyn', 'myn', 'wiene', 'jimme', 'skûtsje', 'nedich', 'fakmanskip', 'publyk', 'wykein', 'oant', 'sjen', 'fertelle', 'allinnich', 'hjoed', 'efkes', 'betiid', 'werom', 'bytsje', 'mjitte', 'wrachtich', 'hekweach', 'trapfyts', 'grinzers', 'grinzer', 'ferhip', 'teminsten', 'jild', 'folle', 'sizze', 'hearen'];
const FRIES_LETTERS = /[âêûôúŷ]/;
const NL_OK = new Set(['café', 'cafés', 'coupé', 'ménage', 'enquête', 'crêpe', 'crêpes', 'drôle', 'liège', 'théâtre', 'château']);
const seen = new Set();
for (const it of collectTexts()) {
  if (it.file.includes('gronings_spoken')) continue;
  for (const w of (it.text.toLowerCase().match(/[\p{L}'’-]+/gu) || [])) {
    if (MARKERS.includes(w) || (FRIES_LETTERS.test(w) && !NL_OK.has(w))) seen.add(w);
  }
}
for (const w of seen) ok(Object.keys(reg.fries).some((k) => k.toLowerCase() === w) || /wâld/.test(w), `Fries woord '${w}' in speltekst staat niet in het register`);
for (const [w, v] of Object.entries(reg.fries)) {
  ok(STATUS.has(v.status), `Fries '${w}': status '${v.status}' ongeldig`);
  ok(typeof v.opm === 'string' && v.opm.length > 5, `Fries '${w}': bron of opmerking ontbreekt`);
}
ok(!Object.values(reg.fries).some((v) => v.status === 'twijfel' && !v.opm), 'twijfel zonder opmerking');

// Gronings in de getoonde tekst (banter, voorbijgangers, Ommeland): regels met kenmerkende Groningse woorden;
// elk woord dat niet in de Nederlandse kant van de vertaaltabel, het register of de lijst nl_ok staat, is nieuw
const STRONG = /(?<![a-zà-ÿ])(nait|mien|noar|doar|woar|gain|oet|aigen|wicht|eefkes|grunneger|grunnegers|doe bist|doe hest|hest doe|mor|goud zo|kiek|stoan|goan|moi|hoes|joe|mie|olle|ain)(?![a-zà-ÿ])/i;
const tokens = (x) => (x.toLowerCase().match(/[a-zàâäçéèêëïîôöùûüœ'’-]+/g) || []).map((w) => w.replace(/^['’-]+|['’-]+$/g, '')).filter(Boolean);
const dutchSide = new Set();
for (const a of Object.keys(table)) for (const w of tokens(a)) dutchSide.add(w);
const okNl = new Set(reg.nl_ok);
const unknown = new Map();
let marked = 0;
for (const it of collectTexts()) {
  if (it.file.includes('gronings_spoken') || !/ /.test(it.text) || !STRONG.test(it.text)) continue;
  marked++;
  for (const w of tokens(it.text)) if (!dutchSide.has(w) && !reg.gronings[w] && !reg.fries[w] && !okNl.has(w)) unknown.set(w, it.file + ':' + it.line);
}
for (const [w, where] of unknown) ok(false, `Gronings of Fries woord '${w}' in getoonde tekst (${where}) staat niet in het register; voeg het toe aan scripts/dialect_woorden.json`);
console.log(failed ? `${failed} mislukt` : `dialect_woorden_test ok (${Object.keys(reg.gronings).length} Gronings, ${Object.keys(reg.fries).length} Fries, ${seen.size} Friese woorden en ${marked} Groningse regels in speltekst)`);
process.exit(failed ? 1 : 0);
