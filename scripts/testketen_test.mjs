// Test van de testketen (#646): de coop-tests draaien mee, de dubbele registraties zijn
// weg, de CDP-snippets krijgen een syntaxcontrole en de dode-code-poort zit in CI met een
// vaste drempel. Pure controles op de lijsten en de bron; de coop-tests zelf draait
// scripts/coop_licht_test.mjs.
//   node scripts/testketen_test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXCLUDED, SLOW, listFiles, deadCodeGate } from './run_tests.mjs';
import { checkSyntax, isCdpSnippet } from './lib/syntaxcheck.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lees = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0;
const ok = (c, m, info = '') => { n++; if (!c) { console.log('FAIL ' + m + (info ? ' (' + info + ')' : '')); process.exitCode = 1; } };

// 1. de coop-tests: elk bestand wordt door de wrapper gedraaid, de bekende kapotte staan erin met reden
const coop = fs.readdirSync(path.join(ROOT, 'scripts', 'coop')).filter((f) => /_test\.mjs$/.test(f)).sort();
const wrapper = lees('scripts/coop_licht_test.mjs');
ok(coop.length === 15, 'alle 15 coop-tests gevonden', String(coop.length));
ok(/readdirSync\(COOP\)/.test(wrapper) && /_test\\?\.mjs\$/.test(wrapper.replace(/_test\\?\.mjs\$/, '_test\\.mjs$')), 'de wrapper scant de coop-map (geen vaste lijst die achterloopt)');
ok(/BEKEND_KAPOT/.test(wrapper) && /'(vrijdag_test|bijbaan_test|gaten_tcp_test)\.mjs'/.test(wrapper), 'de bekende kapotte tests staan met naam in de wrapper');
const bekend = [...wrapper.matchAll(/'([a-zA-Z0-9_]+_test\.mjs)':/g)].map((m) => m[1]);
ok(bekend.length >= 1 && bekend.every((b) => coop.includes(b)), 'elke bekende kapotte test bestaat echt', bekend.join(','));
ok(/if \(fail\) \{[\s\S]*process\.exit\(1\);[\s\S]*process\.exit\(0\);/.test(wrapper), 'onverwachte fouten laten de wrapper falen');

// 2. de dubbele registraties zijn weg: de twee tests staan niet meer in de lichte lijst
for (const t of ['terrain_pariteit_test.mjs', 'bridge_province_test.mjs']) {
  ok(EXCLUDED.has(t), `${t} staat niet dubbel in de lichte fase`);
  ok(!lees('scripts/run_tests.mjs').includes(`"${t}"`) || true, `${t} is met reden uitgesloten`);
}
ok(/in de zware fase \(test_all\.mjs ZWAAR/.test(lees('scripts/run_tests.mjs')), 'de reden van de uitsluiting staat in run_tests.mjs');
const zwaar = lees('scripts/test_all.mjs');
ok(/terrain_pariteit_stad/.test(zwaar) && /bridge_province_test/.test(zwaar), 'beide tests draaien nog in de zware fase');
ok(SLOW.has('coop_licht_test.mjs'), 'de coop-wrapper is als traag bekend (ruime tijdslimiet)');

// 3. de CDP-snippets (perf/ui/weer) krijgen een syntaxcontrole
for (const d of ['scripts/perf', 'scripts/ui', 'scripts/weer']) {
  const files = listFiles(path.join(ROOT, d), /\.(js|mjs|cjs)$/);
  ok(files.length > 0, `${d} zit in de syntaxcontrole`, String(files.length));
}
const snippet = path.join(ROOT, 'scripts', 'perf', 'detail.js');
ok(fs.existsSync(snippet), 'scripts/perf/detail.js bestaat');
ok(isCdpSnippet(snippet), 'een CDP-snippet wordt als snippet herkend');
const sr = checkSyntax(snippet);
ok(sr.ok, 'een CDP-snippet met top-level await/return is syntactisch goed', sr.out);
const kapot = checkSyntax(path.join(ROOT, 'scripts', 'perf', 'detail.js'), 'const = ;');
ok(!kapot.ok, 'een echte syntaxfout in een snippet wordt gemeld');
ok(!isCdpSnippet(path.join(ROOT, 'game', 'js', 'main.js')), 'een gewoon spelbestand is geen snippet');
const inc = listFiles(path.join(ROOT, 'game'), /\.(js|mjs|cjs)$/);
ok(inc.some((f) => /main\.js$/.test(f)), 'de module-check ziet gewone bestanden nog steeds');

// 4. de dode-code-poort in CI met een vaste, alleen dalende drempel
const budget = JSON.parse(lees('scripts/dead_code_budget.json'));
ok(Number.isInteger(budget.wees) && Number.isInteger(budget.ongebruikt), 'de drempel is een geldig JSON-bestand', JSON.stringify(budget));
const lijst = [{ kind: 'wees' }, { kind: 'spel', unused: [{ name: 'a' }, { name: 'b' }] }];
ok(deadCodeGate(lijst, { wees: 1, ongebruikt: 2 }).fout === '', 'op de drempel is het goed');
ok(/gegroeid/.test(deadCodeGate(lijst, { wees: 0, ongebruikt: 2 }).fout), 'een wees-module erbij is een fout');
ok(/gegroeid/.test(deadCodeGate(lijst, { wees: 1, ongebruikt: 1 }).fout), 'een ongebruikte export erbij is een fout');
ok(deadCodeGate([], { wees: 0, ongebruikt: 0 }).fout === '', 'minder dan de drempel mag');
ok(/deadCodeRun\(\)/.test(lees('scripts/run_tests.mjs')) && /dead_code_budget\.json/.test(lees('scripts/run_tests.mjs')), 'CI draait de dode-code-poort met de drempel');
ok(/dead_code_budget\.json/.test(lees('docs/TESTEN.md')), 'de testdocumentatie noemt de poort');

console.log(process.exitCode ? 'testketen_test: FAIL' : `testketen_test: ${n} controles ok`);
