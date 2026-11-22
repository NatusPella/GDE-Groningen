// Regressietest (22-11, #1121): elk decorvoorwerp dat een cutscene mag noemen (DECOR_KINDS) heeft een maker. Zonder die maker
// stopt de scene met "DECOR_MAKERS[p.kind] is not a function" en ziet de speler geen scene (zo gebeurde het bij F2 tot en met
// F6, M08.3 en M15.5 nadat de makers in cutscenehost.js (PROP_MAKERS) en storyprops.js (DECOR_MAKERS) uit elkaar liepen).
//   node scripts/cutscene_decor_maker_test.mjs
import fs from 'node:fs';
import './node3d.mjs';

const { DECOR_MAKERS } = await import('../game/js/storyprops.js');
const { DECOR_KINDS, propSource, PLACEHOLDER_KINDS } = await import('../game/js/cutscenemodels.js');
const host = fs.readFileSync(new URL('../game/js/cutscenehost.js', import.meta.url), 'utf8');
// sinds main-gezond (22-11) staan alle makers in storyprops.js (DECOR_MAKERS); cutscenehost.js heeft geen eigen tabel meer
const hostKinds = new Set();

let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

ok(!host.includes('const PROP_MAKERS'), 'cutscenehost.js heeft geen tweede tabel (PROP_MAKERS) naast DECOR_MAKERS');
ok(host.includes('DECOR_MAKERS[p.kind]()'), 'cutscenehost.js bouwt een voorwerp uit DECOR_MAKERS');
for (const k of DECOR_KINDS) {
  ok(!!propSource(k) || k in DECOR_MAKERS || hostKinds.has(k), `decorsoort ${k} heeft een maker`);
}
// elke soort die een cutscene-bestand als rekwisiet noemt, heeft een maker of is een wereldmodel (voertuig, dier)
const props = new Set();
for (const f of fs.readdirSync(new URL('../game/js/', import.meta.url)).filter((q) => /^cutscenes.*\.js$/.test(q))) {
  const t = fs.readFileSync(new URL('../game/js/' + f, import.meta.url), 'utf8');
  for (const m of t.matchAll(/props: \{([\s\S]*?)\n  \},?/g)) for (const k of m[1].matchAll(/{ kind: '([a-zA-Z0-9_-]+)', at:/g)) props.add(k[1]); // alleen echte rekwisieten (fx heeft geen at: direct achter kind)
}
for (const k of props) {
  if (PLACEHOLDER_KINDS.includes(k)) continue;
  ok(!!propSource(k) || k in DECOR_MAKERS || hostKinds.has(k), `rekwisiet ${k} uit een cutscene heeft een maker`);
}
console.log(`cutscene_decor_maker_test: ${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
