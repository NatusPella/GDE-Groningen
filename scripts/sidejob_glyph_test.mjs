// Elke zijmissie heeft een eigen kaartpictogram (#26): sidejobs.js drawJobGlyph kent elke `glyph`.
// sidejobs.js laadt three van een CDN en is dus niet te importeren in node: de bron wordt gelezen.
//   node scripts/sidejob_glyph_test.mjs
import { readFileSync } from 'node:fs';
import { KEUZE_IDS } from '../game/js/keuzewerk.js';
import { STAD_MISSIE_IDS } from '../game/js/stadmissies.js';

let fails = 0, n = 0;
const ok = (c, name, extra = '') => { n++; if (!c) { fails++; console.log('FAIL', name, extra); } };
const src = readFileSync(new URL('../game/js/sidejobs.js', import.meta.url), 'utf8');
const fn = src.slice(src.indexOf('export function drawJobGlyph'), src.indexOf('// \'sj-<id>\' start badge'));
const cases = new Set([...fn.matchAll(/case '([\w]+)':/g)].map((m) => m[1]));
for (const id of [...KEUZE_IDS, ...STAD_MISSIE_IDS, 'rechtbank', 'boa', 'cabaret']) ok(cases.has(id), `zijmissie ${id} heeft een eigen kaartpictogram`);
ok(cases.size >= 27, 'alle glyphs staan er', String(cases.size));
console.log(fails ? `${fails} of ${n} failed` : `sidejob_glyph_test: ${n} checks ok`);
process.exit(fails ? 1 : 0);
