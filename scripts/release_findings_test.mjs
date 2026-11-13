// Test voor scripts/release/findings.mjs (#releasegate). Geen gh-aanroepen: de tests gebruiken
// alleen droge runs met synthetische reviewrapporten in tijdelijke mappen.
//   node scripts/release_findings_test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  validateReport, validateFinding, triage, dedupeFindings, buildIssueConcepts,
  normalizeTitle, fingerprint,
} from './release/findings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'release', 'findings.mjs');
const SHA = 'abc1234';
let n = 0;
let fails = 0;
const ok = (c, naam, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${naam}${info ? ' (' + info + ')' : ''}`); } };

const bevinding = (extra = {}) => ({
  bron: 'code-review',
  aspect: 'correctness',
  ernst: 'belangrijk',
  categorie: 'correctheid',
  titel: 'Save breekt bij lege stand',
  beschrijving: 'Bij een lege stand crasht het opslaan van de voortgang.',
  bewijs: ['game/js/save.js:10'],
  bestanden: ['game/js/save.js'],
  fix: 'Controleer op null voordat je opslaat.',
  reviewer: 'code-reviewer',
  ...extra,
});
const rapport = (extra = {}) => ({
  onderwerp: 'correctness',
  reviewer: 'code-reviewer',
  commit: SHA,
  dekking: { bestanden: ['game/js/save.js'] },
  bevindingen: [],
  ...extra,
});
const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });

// ---------------------------------------------------------------- validatie

ok(validateReport(rapport()).length === 0, 'geldig rapport is geldig');
ok(validateReport(rapport({ bevindingen: [bevinding()] })).length === 0, 'geldig rapport met bevinding is geldig');
ok(validateReport(rapport({ onderwerp: '' })).some((f) => f.includes('onderwerp')), 'onderwerp is verplicht');
ok(validateReport(rapport({ commit: 'XYZ' })).some((f) => f.includes('commit')), 'commit moet een hex-sha zijn');
ok(validateReport(rapport({ dekking: { bestanden: 'nee' } })).some((f) => f.includes('dekking.bestanden')), 'dekking.bestanden moet een lijst zijn');
ok(validateReport(rapport({ bevindingen: [bevinding({ aspect: 'onzin' })] })).some((f) => f.includes('aspect')), 'aspect moet uit de enum komen');
ok(validateReport(rapport({ bevindingen: [bevinding({ ernst: 'blokkerend', bewijs: [] })] })).some((f) => f.includes('zonder bewijs')), 'blokkerend zonder bewijs is ongeldig');
ok(validateFinding(null).length === 1, 'een lege bevinding is ongeldig');
ok(validateFinding(bevinding({ titel: 'abc' })).some((f) => f.includes('titel')), 'titel heeft een minimumlengte');
ok(validateFinding(bevinding({ fix: 'x'.repeat(1001) })).some((f) => f.includes('fix')), 'fix heeft een maximumlengte');

// ---------------------------------------------------------------- triage en dekking

const groen = triage({
  reports: [
    { bestand: 'correctness.json', data: rapport() },
    { bestand: 'rules.json', data: rapport({ onderwerp: 'rules', dekking: { bestanden: [] } }) },
  ],
  requiredAspects: ['correctness', 'rules'],
  commit: SHA,
});
ok(groen.status === 'groen', 'compleet en geen blokkerend is groen', groen.status);
ok(groen.aspecten.ontbrekend.length === 0 && groen.aspecten.gezien.includes('rules'), 'geziene aspecten kloppen', JSON.stringify(groen.aspecten));

const onvolledig = triage({
  reports: [{ bestand: 'correctness.json', data: rapport() }],
  requiredAspects: ['correctness', 'design'],
  commit: SHA,
});
ok(onvolledig.status === 'onvolledig' && onvolledig.aspecten.ontbrekend.join(',') === 'design', 'ontbrekend aspect is onvolledig', JSON.stringify(onvolledig.aspecten));

const rood = triage({
  reports: [{ bestand: 'correctness.json', data: rapport({ bevindingen: [bevinding({ ernst: 'blokkerend', bewijs: ['game/js/save.js:10'] })] }) }],
  requiredAspects: ['correctness'],
  commit: SHA,
});
ok(rood.status === 'rood' && rood.blocking.length === 1, 'blokkerende bevinding is rood', rood.status);

const ongeldig = triage({
  reports: [{ bestand: 'goed.json', data: rapport() }, { bestand: 'stuk.json', data: rapport({ dekking: {} }) }],
  requiredAspects: [],
  commit: SHA,
});
ok(ongeldig.status === 'onvolledig' && ongeldig.ongeldig.length === 1, 'ongeldig rapport maakt de review onvolledig', JSON.stringify(ongeldig.ongeldig));

const leeg = triage({ reports: [], requiredAspects: ['correctness'] });
ok(leeg.status === 'onvolledig', 'zonder rapporten nooit groen', leeg.status);

const verkeerdeCommit = triage({
  reports: [{ bestand: 'correctness.json', data: rapport({ commit: 'def5678' }) }],
  requiredAspects: [],
  commit: SHA,
});
ok(verkeerdeCommit.status === 'onvolledig' && verkeerdeCommit.ongeldig.length === 1, 'review op een andere commit is onvolledig', JSON.stringify(verkeerdeCommit.ongeldig));

const viaDekking = triage({
  reports: [{ bestand: 'code-review.json', data: rapport({ onderwerp: 'code-review', dekking: { bestanden: [], aspecten: ['correctness', 'rules'] } }) }],
  requiredAspects: ['correctness', 'rules'],
  commit: SHA,
});
ok(viaDekking.status === 'groen', 'dekking.aspecten telt als dekking', viaDekking.status);

const vision = triage({
  reports: [{ bestand: 'vision.json', data: rapport({ onderwerp: 'vision', reviewer: 'visual_gate.mjs', dekking: { bestanden: [] } }) }],
  requiredAspects: ['vision'],
  commit: SHA,
});
ok(vision.status === 'groen', 'een vision-rapport dekt het aspect vision', vision.status);

// Het beeldprompt gebruikt onderwerp "vision-visual-gate"; dat dekt vision, maar de losse
// naam "design-system" dekt het aspect design niet.
const visionPrompt = triage({
  reports: [{ bestand: 'vision.json', data: rapport({ onderwerp: 'vision-visual-gate', dekking: { bestanden: [], aspecten: ['design-system', 'ui'] } }) }],
  requiredAspects: ['vision'],
  commit: SHA,
});
ok(visionPrompt.status === 'groen' && visionPrompt.aspecten.ontbrekend.length === 0, 'onderwerp vision-visual-gate dekt vision', JSON.stringify(visionPrompt.aspecten));
const geenDesign = triage({
  reports: [{ bestand: 'code-review.json', data: rapport({ onderwerp: 'code-review', dekking: { bestanden: [], aspecten: ['design-system'] } }) }],
  requiredAspects: ['design'],
  commit: SHA,
});
ok(geenDesign.status === 'onvolledig' && geenDesign.aspecten.ontbrekend.join(',') === 'design', 'design-system dekt het aspect design niet', JSON.stringify(geenDesign.aspecten));

// ---------------------------------------------------------------- dedupe

const dubbel = dedupeFindings([
  bevinding({ titel: 'Save breekt, bij lege stand!' }),
  bevinding({ titel: 'save breekt bij lege stand', ernst: 'blokkerend', bewijs: ['game/js/save.js:11', 'game/js/save.js:12'] }),
]);
ok(dubbel.length === 1, 'zelfde titel en bestanden worden samengevoegd', String(dubbel.length));
ok(dubbel[0].ernst === 'blokkerend' && dubbel[0].bewijs.length === 3 && dubbel[0].duplicaten === 2, 'hoogste ernst en al het bewijs blijven', JSON.stringify(dubbel[0]));
ok(normalizeTitle('Save breekt, bij lege stand!') === 'save breekt bij lege stand', 'titel normaliseren voor dedupe', normalizeTitle('Save breekt, bij lege stand!'));
const fp = fingerprint(bevinding());
ok(/^[0-9a-f]{8}$/.test(fp), 'afdruk is acht hex-tekens', fp);
ok(fp === fingerprint(bevinding({ beschrijving: 'Andere tekst.' })), 'afdruk is stabiel voor dezelfde titel en bestanden');

// ---------------------------------------------------------------- issue-concepten

const concepten = buildIssueConcepts([
  bevinding(),
  bevinding({ titel: 'Menu gebruikt losse hex', aspect: 'design', categorie: 'design-system', ernst: 'nit', bestanden: ['game/js/menu.css'], bron: 'design' }),
  bevinding({ titel: 'Crash bij laden', ernst: 'blokkerend' }),
]);
ok(concepten.length === 2, 'alleen belangrijk en nit krijgen een concept', String(concepten.length));
const bugConcept = concepten.find((c) => c.aspect === 'correctness');
const wensConcept = concepten.find((c) => c.aspect === 'design');
ok(bugConcept.labels.includes('bug') && bugConcept.labels.includes('impact-hoog') && bugConcept.labels.includes('kosten-M'), 'bug-labels bij correctheid', bugConcept.labels.join(','));
ok(wensConcept.labels.includes('wens') && wensConcept.labels.includes('impact-laag') && wensConcept.labels.includes('kosten-S'), 'wens-labels bij design/nit', wensConcept.labels.join(','));
ok(bugConcept.body.includes(`releasegate-afdruk: ${bugConcept.fp}`) && bugConcept.body.includes(`<!-- releasegate:${bugConcept.fp} -->`), 'body bevat de afdruk', bugConcept.body.slice(-80));
ok(bugConcept.body.includes('game/js/save.js:10') && bugConcept.body.includes('Controleer op null'), 'body bevat bewijs en fix');
ok(!concepten.some((c) => c.ernst === 'blokkerend'), 'blokkerende bevindingen komen niet in de concepten');

// ---------------------------------------------------------------- CLI

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-findings-'));
function maakMap(naam, bestanden) {
  const map = path.join(tmp, naam);
  fs.mkdirSync(map, { recursive: true });
  for (const [bestandsnaam, data] of Object.entries(bestanden)) {
    fs.writeFileSync(path.join(map, bestandsnaam), typeof data === 'string' ? data : JSON.stringify(data, null, 1));
  }
  return map;
}
function leesJson(pad) { return JSON.parse(fs.readFileSync(pad, 'utf8')); }
const required = (aspecten) => path.join(tmp, `required-${aspecten.join('-')}.json`);
for (const aspecten of [['correctness', 'rules', 'vision'], ['correctness'], ['correctness', 'design']]) {
  fs.writeFileSync(required(aspecten), JSON.stringify({ aspecten, commit: SHA }, null, 1));
}

try {
  // Groen: twee mappen met een komma, inclusief een auto-rapport (visie) met lege dekking.
  const reviews = maakMap('groen/reviews', {
    'correctness.json': rapport({ bevindingen: [bevinding()] }),
    'rules.json': rapport({ onderwerp: 'rules', dekking: { bestanden: [] } }),
  });
  const auto = maakMap('groen/auto', {
    'auto-visual.json': rapport({ onderwerp: 'vision', reviewer: 'visual_gate.mjs', dekking: { bestanden: [] } }),
  });
  const out = path.join(tmp, 'groen/uit');
  const groenRun = run([`--dir=${reviews},${auto}`, `--required=${required(['correctness', 'rules', 'vision'])}`, `--out=${out}`, `--commit=${SHA}`, '--issues']);
  ok(groenRun.status === 0, 'CLI groen eindigt met 0', `exit ${groenRun.status}: ${groenRun.stderr}`);
  for (const naam of ['findings.json', 'bevindingen.md', 'gate.json', 'issues-concept.md']) {
    ok(fs.existsSync(path.join(out, naam)), `CLI schrijft ${naam}`);
  }
  const gate = leesJson(path.join(out, 'gate.json'));
  ok(Object.keys(gate).sort().join(',') === 'aspecten,belangrijk,blocking,commit,nits,status', 'gate.json heeft de vaste velden', Object.keys(gate).join(','));
  ok(gate.status === 'groen' && gate.commit === SHA, 'gate.json bevat status en commit', JSON.stringify({ status: gate.status, commit: gate.commit }));
  ok(gate.blocking.length === 0 && gate.belangrijk.length === 1 && gate.nits.length === 0, 'gate.json telt de bevindingen', JSON.stringify({ b: gate.blocking.length, i: gate.belangrijk.length, n: gate.nits.length }));
  ok(Array.isArray(gate.aspecten.verplicht) && gate.aspecten.verplicht.includes('vision') && gate.aspecten.ontbrekend.length === 0, 'gate.json meldt de aspecten', JSON.stringify(gate.aspecten));
  const findings = leesJson(path.join(out, 'findings.json'));
  ok(findings.bevindingen.length === 1 && findings.ongeldig.length === 0 && findings.status === 'groen', 'findings.json bevat de bevindingen', JSON.stringify({ status: findings.status, ongeldig: findings.ongeldig.length }));
  const md = fs.readFileSync(path.join(out, 'bevindingen.md'), 'utf8');
  ok(md.includes('## Belangrijk') && md.includes('### correctness') && md.includes('game/js/save.js:10') && md.includes('Voorgestelde fix'), 'bevindingen.md is Nederlands en gegroepeerd op ernst en aspect');
  const conceptMd = fs.readFileSync(path.join(out, 'issues-concept.md'), 'utf8');
  const bugConcept2 = buildIssueConcepts(findings.bevindingen)[0];
  ok(conceptMd.includes('droge run') && conceptMd.includes(`releasegate-afdruk: ${bugConcept2.fp}`), '--issues schrijft een droog concept met afdruk');
  ok(conceptMd.includes('bug') && conceptMd.includes('impact-hoog') && conceptMd.includes('kosten-M'), 'concept noemt de voorgestelde labels');
  ok(groenRun.stdout.includes('droge run'), 'CLI meldt dat er niets is aangemaakt', groenRun.stdout.trim().split('\n').slice(-3).join(' | '));

  // Rood: een blokkerende bevinding met bewijs.
  const roodMap = maakMap('rood/reviews', {
    'correctness.json': rapport({ bevindingen: [bevinding({ ernst: 'blokkerend', bewijs: ['game/js/save.js:10'] })] }),
  });
  const roodOut = path.join(tmp, 'rood/uit');
  const roodRun = run([`--dir=${roodMap}`, `--required=${required(['correctness'])}`, `--out=${roodOut}`, `--commit=${SHA}`]);
  ok(roodRun.status === 1, 'CLI rood eindigt met 1', `exit ${roodRun.status}`);
  const roodGate = leesJson(path.join(roodOut, 'gate.json'));
  ok(roodGate.status === 'rood' && roodGate.blocking.length === 1, 'gate.json is rood met een blokkerende bevinding', JSON.stringify({ status: roodGate.status, blocking: roodGate.blocking.length }));
  ok(fs.readFileSync(path.join(roodOut, 'bevindingen.md'), 'utf8').includes('## Blokkerend'), 'bevindingen.md toont de blokkerende groep');
  ok(!fs.readFileSync(path.join(roodOut, 'issues-concept.md'), 'utf8').includes('releasegate-afdruk:'), 'een blokkerende bevinding levert geen issue-concept');

  // Onvolledig: verplicht aspect niet gedekt.
  const halfMap = maakMap('half/reviews', { 'correctness.json': rapport() });
  const halfOut = path.join(tmp, 'half/uit');
  const halfRun = run([`--dir=${halfMap}`, `--required=${required(['correctness', 'design'])}`, `--out=${halfOut}`, `--commit=${SHA}`]);
  ok(halfRun.status === 3, 'CLI met ontbrekend aspect eindigt met 3', `exit ${halfRun.status}`);
  const halfGate = leesJson(path.join(halfOut, 'gate.json'));
  ok(halfGate.status === 'onvolledig' && halfGate.aspecten.ontbrekend.join(',') === 'design', 'gate.json noemt het ontbrekende aspect', JSON.stringify(halfGate.aspecten));

  // Onvolledig: blokkerend zonder bewijs is een ongeldig rapport.
  const ongeldigMap = maakMap('ongeldig/reviews', {
    'correctness.json': rapport({ bevindingen: [bevinding({ ernst: 'blokkerend', bewijs: [] })] }),
  });
  const ongeldigOut = path.join(tmp, 'ongeldig/uit');
  const ongeldigRun = run([`--dir=${ongeldigMap}`, `--required=${required(['correctness'])}`, `--out=${ongeldigOut}`, `--commit=${SHA}`]);
  ok(ongeldigRun.status === 3, 'CLI met blokkerend zonder bewijs eindigt met 3', `exit ${ongeldigRun.status}`);
  const ongeldigFindings = leesJson(path.join(ongeldigOut, 'findings.json'));
  ok(ongeldigFindings.status === 'onvolledig' && ongeldigFindings.ongeldig.length === 1, 'findings.json meldt het ongeldige rapport', JSON.stringify(ongeldigFindings.ongeldig));

  // Onvolledig: geen rapporten in een bestaande map.
  const leegMap = maakMap('leeg/reviews', {});
  const leegOut = path.join(tmp, 'leeg/uit');
  const leegRun = run([`--dir=${leegMap}`, `--required=${required(['correctness'])}`, `--out=${leegOut}`]);
  ok(leegRun.status === 3, 'CLI zonder rapporten eindigt met 3', `exit ${leegRun.status}`);

  // Onvolledig: een rapport dat geen JSON is.
  const kapotMap = maakMap('kapot/reviews', { 'slecht.json': '{dit is geen json' });
  const kapotOut = path.join(tmp, 'kapot/uit');
  const kapotRun = run([`--dir=${kapotMap}`, `--required=${required(['correctness'])}`, `--out=${kapotOut}`, `--commit=${SHA}`]);
  ok(kapotRun.status === 3, 'CLI met onleesbaar rapport eindigt met 3', `exit ${kapotRun.status}`);
  ok(leesJson(path.join(kapotOut, 'findings.json')).ongeldig[0].fouten.join(' ').includes('geen geldige JSON'), 'onleesbaar rapport wordt als ongeldig gemeld');

  // Fouten: geen --dir, ongeldige --commit, ontbrekende reviewmap.
  ok(run([]).status === 2, 'CLI zonder --dir eindigt met 2');
  ok(run([`--dir=${reviews}`, `--commit=XYZ`]).status === 2, 'CLI met ongeldige --commit eindigt met 2');
  ok(run([`--dir=${path.join(tmp, 'bestaat-niet')}`]).status === 2, 'CLI met ontbrekende reviewmap eindigt met 2');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`release_findings: ${n - fails}/${n} checks passed`);
process.exit(fails ? 1 : 0);
