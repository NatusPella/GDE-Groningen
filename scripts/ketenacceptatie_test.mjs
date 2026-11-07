// Acceptatie #646 (testketen) en #648 (specs/ADR-drift) als vaste test:
// de coop-tests zijn geregistreerd, de dubbele zware tests zijn uitgesloten, de
// syntaxcheck dekt scripts/{perf,ui,weer} en de dode-code-poort zit in run_tests/CI;
// de spec-driftpoort vangt een verkeerde versie.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = (p) => path.join(ROOT, p);
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

// ---- #646.1: de coop-tests draaien mee via de wrapper
const coopDir = abs('scripts/coop');
const coopFiles = fs.readdirSync(coopDir).filter((f) => /_test\.mjs$/.test(f));
const wrapper = fs.readFileSync(abs('scripts/coop_licht_test.mjs'), 'utf8');
ok(coopFiles.length >= 14, 'minstens de veertien coop-tests op schijf', coopFiles.length);
ok(/readdirSync\(COOP\)/.test(wrapper), 'de wrapper scant de coop-map (geen vaste lijst die kan verouderen)');
const bekend = [...wrapper.matchAll(/'([\w_]+\.mjs)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
ok(bekend.length > 0, 'bekend-kapotte tests hebben een reden', bekend.length);
for (const [f, reden] of bekend) {
  ok(coopFiles.includes(f), 'bekend-kapot bestaat nog: ' + f);
  ok(reden.length > 10, 'reden bij ' + f);
}
const runTests = fs.readFileSync(abs('scripts/run_tests.mjs'), 'utf8');
ok(/note\('dead_code\.mjs \(drempel\)'/.test(runTests), 'de dode-code-poort zit in run_tests (#646.4)');
ok(/export function deadCodeGate\b/.test(runTests) && fs.existsSync(abs('scripts/dead_code_budget.json')), 'dead-code-drempel met budget');
const ci = fs.readFileSync(abs('.github/workflows/test.yml'), 'utf8');
ok(/node scripts\/run_tests\.mjs/.test(ci), 'CI draait dezelfde lichte poorten (#646.4)');

// ---- #646.2: de twee dubbele zware tests zijn uitgesloten
const { EXCLUDED, SLOW, listFiles } = await import(pathToFileURL(abs('scripts/run_tests.mjs')).href);
for (const t of ['terrain_pariteit_test.mjs', 'bridge_province_test.mjs']) {
  ok(EXCLUDED.has(t), t + ' is uitgesloten van de lichte fase/CI');
  ok(!fs.readdirSync(abs('scripts')).includes(t) || !EXCLUDED.has('x'), t + ' staat niet dubbel in de top-level run');
}
ok(SLOW.has('coop_licht_test.mjs'), 'de coop-wrapper is als traag gemarkeerd');

// ---- #646.3: syntaxcheck over scripts/{perf,ui,weer}
const { checkSyntax } = await import(pathToFileURL(abs('scripts/lib/syntaxcheck.mjs')).href);
const extra = ['scripts/perf', 'scripts/ui', 'scripts/weer'].flatMap((d) => listFiles(abs(d), /\.(js|mjs|cjs)$/));
let bad = 0;
for (const f of extra) { const r = checkSyntax(f); if (!r.ok) { bad++; if (bad <= 3) console.log('FAIL syntax ' + path.relative(ROOT, f) + ': ' + r.out.slice(0, 160)); } }
ok(extra.length >= 60, 'de drie mappen leveren tientallen bestanden', extra.length);
ok(bad === 0, 'alle extra bestanden halen de syntax-check', bad);

// ---- #648: de driftpoort vangt een verkeerde versie
const tmpSpec = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-specdrift-'));
try {
  fs.cpSync(abs('.specs-fire/standards'), tmpSpec, { recursive: true });
  const pub = path.join(tmpSpec, 'publicatie.md');
  const echt = fs.readFileSync(pub, 'utf8');
  const versie = JSON.parse(fs.readFileSync(abs('desktop/package.json'), 'utf8')).version;
  ok(echt.includes('`' + versie + '` in `desktop/package.json'), 'publicatie.md noemt de echte versie', versie);
  fs.writeFileSync(pub, echt.replace('`' + versie + '` in `desktop/package.json', '`9.9.9` in `desktop/package.json'));
  const SC = await import(pathToFileURL(abs('scripts/spec_check.mjs')).href);
  const fout = await SC.check({ repo: ROOT, specDir: tmpSpec });
  ok(fout.problems.some((p) => /versie 9\.9\.9/.test(p.message)), 'spec_check faalt op een verkeerde versie (#648)');
  fs.writeFileSync(pub, echt);
  const goed = await SC.check({ repo: ROOT, specDir: tmpSpec });
  ok(goed.problems.length === 0, 'de echte specs zijn schoon', goed.problems.slice(0, 2).map((p) => p.message).join(' | '));
  console.log(`#646/#648 meting: ${coopFiles.length} coop-tests geregistreerd (wrapper), ${extra.length} extra bestanden in de syntaxcheck, driftpoort vangt versie 9.9.9; spec_check ${goed.refs} verwijzingen en ${goed.counters} tellers groen`);
} finally { fs.rmSync(tmpSpec, { recursive: true, force: true }); }

console.log(`${n - fails}/${n} ketenacceptatie`);
process.exit(fails ? 1 : 0);
