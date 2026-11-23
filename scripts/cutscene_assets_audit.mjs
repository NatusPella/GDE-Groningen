// Audit: cutscenes gebruiken alleen echte assets en de gedeelde fabrieken (regel van de eigenaar, 23-11; verhaal.md "Cutscenes en assets").
//   node scripts/cutscene_assets_audit.mjs [--json] [--strict]
// 1. Elke propsoort van de regietaal (PROP_KINDS) komt uit een register: voertuigen en dieren uit de wereld (PROP_SOURCES), losse voorwerpen
//    uit de gedeelde bibliotheek storyprops.js (DECOR_MAKERS), en niets staat in een van beide zonder in de andere lijst te kloppen.
// 2. Elk losse voorwerp heeft een bouwer in het register (en een eigen budget of het standaardbudget): de kwaliteitsnorm PROP_NORM geldt voor elk.
// 3. Scènecode bouwt geen eigen primitieve personages, dieren, voertuigen of voorwerpen: een losse BoxGeometry, CylinderGeometry, SphereGeometry
//    enz. in cutscene-, verhaal- of montagecode telt als vondst, tenzij hij in BASELINE staat (de bestaande schuld, alleen te verlagen). Nieuwe
//    voorwerpen horen in storyprops.js (DECOR_MAKERS), niet in de scène.
import { readFileSync, readdirSync } from 'node:fs';
import { PROP_KINDS } from '../game/js/cutscript.js';
import { PROP_SOURCES, DECOR_KINDS, PLACEHOLDER_KINDS, PROP_NORM } from '../game/js/cutscenemodels.js';

const JS = new URL('../game/js/', import.meta.url);
const src = (f) => readFileSync(new URL(f, JS), 'utf8');

// de bestanden die een scène bouwen of regisseren; storyprops.js zelf (de gedeelde bibliotheek) hoort er niet bij
const SCENE_FILES = readdirSync(JS).filter((f) => /^(cutscene.*|cutscript|cutdirector|cutmask3d|interiorcut3d|missionstory.*|intromontage|openingfilm|realsets?.*|storybridge.*|careerdebut.*)\.js$/.test(f));
const PRIMITIVE = /new THREE\.(Box|Cylinder|Sphere|Cone|Circle|Plane|Torus|Capsule|Ring|Icosahedron|Octahedron|Tetrahedron|Dodecahedron)Geometry\(/g;
// De bestaande schuld per bestand (het aantal losse primitieven): alleen te verlagen. Schaduwcirkels (CircleGeometry onder een figuur) en
// de bal van de voetbalscène staan hier mee; wie een voorwerp naar storyprops.js verplaatst verlaagt het getal.
export const BASELINE = { 'intromontage.js': 4, 'missionstory.js': 9, 'cutscenehost.js': 1 };

export function scan() {
  const out = {};
  for (const f of SCENE_FILES) {
    const t = src(f).split('\n');
    const hits = [];
    t.forEach((line, i) => { if (/^\s*\/\//.test(line)) return; const m = line.match(PRIMITIVE); if (m) hits.push({ line: i + 1, n: m.length, text: line.trim().slice(0, 110) }); });
    if (hits.length) out[f] = hits;
  }
  return out;
}

export function audit() {
  const problems = [];
  const decorSrc = src('storyprops.js');
  const makers = [...decorSrc.matchAll(/^ {2}([a-z]+): (?:\(\) =>|function)/gm)].map((m) => m[1]);
  const budgetKeys = [...(decorSrc.match(/export const DECOR_BUDGET = \{([\s\S]*?)\n\};/) || [, ''])[1].matchAll(/^ {2}([a-z]+):/gm)].map((m) => m[1]);
  for (const k of PROP_KINDS) {
    const reg = PROP_SOURCES[k] ? 'wereld' : DECOR_KINDS.includes(k) || PLACEHOLDER_KINDS.includes(k) ? 'bibliotheek' : null; // een placeholder valt in de validatie (propKindIssue)
    if (!reg) problems.push(`propsoort ${k}: niet in PROP_SOURCES (wereld) en niet in DECOR_KINDS (bibliotheek)`);
  }
  for (const k of DECOR_KINDS) {
    if (!PROP_KINDS.includes(k)) problems.push(`decorsoort ${k}: staat niet in PROP_KINDS van cutscript.js`);
    if (!makers.includes(k)) problems.push(`decorsoort ${k}: geen bouwer in storyprops.js DECOR_MAKERS (het register)`);
  }
  for (const k of makers) if (!DECOR_KINDS.includes(k)) problems.push(`bouwer ${k} in storyprops.js staat niet in DECOR_KINDS van cutscenemodels.js`);
  if (!Array.isArray(PROP_NORM) || PROP_NORM.length < 5) problems.push('PROP_NORM (de kwaliteitsnorm per voorwerp) ontbreekt in cutscenemodels.js');
  if (!/PROP_NORM/.test(decorSrc)) problems.push('storyprops.js verwijst niet naar PROP_NORM (de norm hoort bij de bibliotheek)');
  const raw = scan();
  const extra = [];
  for (const [f, hits] of Object.entries(raw)) {
    const n = hits.reduce((s, h) => s + h.n, 0);
    const base = BASELINE[f] ?? 0;
    if (n > base) problems.push(`${f}: ${n} losse primitieven in scènecode (toegestaan ${base}); bouw het voorwerp in storyprops.js (DECOR_MAKERS) of gebruik de wereldfabriek`);
    else if (n < base) extra.push(`${f}: nog ${n} van de ${base} (verlaag BASELINE)`);
  }
  for (const f of Object.keys(BASELINE)) if (!raw[f] && BASELINE[f] > 0) extra.push(`${f}: geen primitieven meer (verlaag BASELINE naar 0)`);
  return { problems, extra, raw, makers: makers.length, budgetKeys: budgetKeys.length };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^([A-Za-z]):/, '/$1:')}` || process.argv[1].endsWith('cutscene_assets_audit.mjs')) {
  const r = audit();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    const total = Object.values(r.raw).reduce((s, h) => s + h.reduce((a, b) => a + b.n, 0), 0);
    console.log(`cutscene_assets_audit: ${PROP_KINDS.length} propsoorten (${Object.keys(PROP_SOURCES).length} uit de wereld, ${DECOR_KINDS.length} uit de bibliotheek, ${r.makers} bouwers), ${total} losse primitieven in scènecode (schuld), ${r.problems.length} problemen`);
    for (const p of r.problems) console.log('  PROBLEEM ' + p);
    for (const e of r.extra) console.log('  schuld afgelost: ' + e);
    for (const [f, hits] of Object.entries(r.raw)) for (const h of hits) console.log(`  schuld ${f}:${h.line}  ${h.text}`);
  }
  if (process.argv.includes('--strict') && r.problems.length) process.exit(1);
}
