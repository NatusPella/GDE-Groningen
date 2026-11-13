// Test van de per-merge-afdwinging van de releasegate (ADR 0034): run_tests doet de
// regels- en designcontrole op de diff en CI geeft de basis mee. Draait zonder git,
// Electron of netwerk; de git-aanroepen zijn geïnjecteerd.
//   node scripts/release_ci_test.mjs
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveRulesBase } from './run_tests.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (pad) => fs.readFileSync(ROOT + pad, 'utf8');
let fails = 0;
const ok = (c, naam, extra) => { if (!c) { fails++; console.log('FAIL', naam, extra !== undefined ? JSON.stringify(extra) : ''); } };

// Een nep-git: per commando-soort een antwoord; alles wat niet past is "niet gevonden".
const nepGit = (antwoorden) => (args) => {
  const regel = args.join(' ');
  for (const [patroon, antwoord] of antwoorden) if (patroon.test(regel)) return antwoord;
  return { code: 1, out: '' };
};
const gevonden = (sha) => ({ code: 0, out: sha + '\n' });

// 1. GDE_RULES_BASE van CI wint en wordt opgelost naar een commit-sha.
const ci = resolveRulesBase({ GDE_RULES_BASE: 'deadbeef' }, nepGit([[/rev-parse/, gevonden('deadbeefcafe')]]));
ok(ci === 'deadbeefcafe', 'GDE_RULES_BASE wordt opgelost naar een commit', ci);

// 2. Een ongeldige CI-basis valt terug op de merge-base met origin/main.
const terugval = resolveRulesBase({ GDE_RULES_BASE: 'bestaatniet' }, nepGit([
  [/rev-parse/, { code: 1, out: '' }],
  [/merge-base origin\/main/, gevonden('111122223333')],
  [/describe/, gevonden('v9.9.9')],
]));
ok(terugval === '111122223333', 'ongeldige basis valt terug op de merge-base', terugval);

// 3. Zonder origin/main valt hij terug op de laatste tag.
const tag = resolveRulesBase({}, nepGit([
  [/merge-base/, { code: 1, out: '' }],
  [/describe/, gevonden('v0.60.7')],
]));
ok(tag === 'v0.60.7', 'zonder origin/main de laatste tag', tag);

// 4. Zonder enige basis is er niets te toetsen (SKIP, geen stille groen).
const niets = resolveRulesBase({}, nepGit([]));
ok(niets === '', 'zonder basis leeg, zodat de check als SKIP meldt', niets);

// 5. De keten is echt aangesloten: run_tests, CI, de gate en de documentatie noemen het.
const runTests = lees('scripts/run_tests.mjs');
ok(/GDE_RULES_BASE/.test(runTests), 'run_tests leest GDE_RULES_BASE');
ok(/resolveRulesBase/.test(runTests), 'run_tests heeft de basisresolutie');
ok(/release\/rules_audit\.mjs/.test(runTests), 'run_tests draait de regels- en designaudit');
ok(/merkenregister_check\.mjs/.test(runTests), 'run_tests draait het merkenregister');
const ciYml = lees('.github/workflows/test.yml');
ok(/GDE_RULES_BASE/.test(ciYml), 'CI geeft GDE_RULES_BASE mee');
ok(/github\.event\.pull_request\.base\.sha/.test(ciYml), 'CI gebruikt de PR-basis');
ok(/github\.event\.before/.test(ciYml), 'CI gebruikt de vorige main-commit bij een push');
ok(/node scripts\/run_tests\.mjs/.test(ciYml), 'CI draait run_tests');
const gate = lees('scripts/release_gate.mjs');
ok(/release\/rules_audit\.mjs/.test(gate), 'de releasegate draait dezelfde regelsaudit');
const pr = lees('.github/PULL_REQUEST_TEMPLATE.md');
ok(/regels- en designcontrole/.test(pr), 'de PR-checklist noemt de regels- en designcontrole');
const testen = lees('docs/TESTEN.md');
ok(/regels- en designcontrole/.test(testen), 'docs/TESTEN.md noemt de per-merge-controle');

console.log(fails ? `${fails} FAIL` : 'release_ci_test ok');
process.exit(fails ? 1 : 0);
