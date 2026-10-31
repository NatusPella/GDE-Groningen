// De coop-audit per missie (#525, spoor 1c) is deterministisch en slaat geen missie over: elke missie
// uit de bron (storyarc.js STEPS) krijgt precies een regel, en elke missie uit missions.js staat er ook
// (in het verhaal of in de lijst erbuiten). Twee runs geven hetzelfde rapport, de exitcode is altijd 0
// (het rapport is een achterstandslijst, geen keuring) en het script schrijft niets.
//   node scripts/coopmissie_audit_test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const SCRIPT = fileURLToPath(new URL('./coopmissie_audit.mjs', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const { STEPS, MISSION_IDS } = await import('../game/js/storyarc.js');

let fails = 0;
const t = (naam, fn) => {
  try { fn(); console.log('ok  ', naam); } catch (e) { fails++; console.log('FAIL', naam, '\n    ' + (e.message || e)); }
};

// The report as the script prints it; the audit has no side effects, so calling it twice is safe.
const run = (args = []) => {
  const out = execFileSync(process.execPath, [SCRIPT, '--json', ...args], { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
  return { out, report: JSON.parse(out) };
};

const first = run();

t('de audit loopt en geeft exitcode 0', () => {
  assert.equal(first.report && typeof first.report, 'object');
  assert.equal(typeof first.report.summary, 'object');
});

t('twee runs geven precies hetzelfde rapport (deterministisch)', () => {
  const second = run();
  assert.equal(second.out, first.out, 'de uitvoer van twee runs verschilt');
});

t('elke missie uit storyarc.js krijgt precies een regel', () => {
  const uitVerhaal = STEPS.filter((s) => s.kind === 'mission');
  assert.ok(uitVerhaal.length > 0, 'geen missiestappen gevonden');
  const ids = first.report.missies.map((m) => m.step);
  assert.equal(new Set(ids).size, ids.length, 'dubbele missieregels: ' + ids.join(', '));
  assert.deepEqual(ids, uitVerhaal.map((s) => s.id), 'de regels staan niet in verhaalvolgorde of missen een stap');
});

t('elke missie uit missions.js staat in het rapport (verhaal of erbuiten)', () => {
  const inVerhaal = new Set(first.report.missies.map((m) => m.mission));
  const buiten = new Set(first.report.buiten.map((m) => m.mission));
  for (const id of MISSION_IDS) {
    assert.ok(inVerhaal.has(id) || buiten.has(id), `missie '${id}' wordt stil overgeslagen`);
  }
  for (const m of first.report.missies) assert.ok(!buiten.has(m.mission), `'${m.mission}' staat dubbel`);
});

t('elke missieregel heeft een uitslag, een reden en de coop-regel', () => {
  const geldig = new Set(['samen', 'deels', 'niet', 'solo', 'onbekend']);
  for (const m of first.report.missies) {
    assert.ok(geldig.has(m.verdict), `${m.step}: onbekende uitslag '${m.verdict}'`);
    assert.ok(typeof m.reason === 'string' && m.reason.length > 10, `${m.step}: geen reden`);
    assert.ok(['beide', 'dichtstbij', 'een'].includes(m.rule.presence), `${m.step}: presence '${m.rule.presence}'`);
    assert.equal(typeof m.rule.needsTwo, 'boolean', `${m.step}: needsTwo ontbreekt`);
    assert.ok(/plek 1 .+, plek 2 /.test(m.rollen), `${m.step}: geen rol per speler (${m.rollen})`);
    for (const s of m.stages) {
      assert.ok(geldig.has(s.verdict), `${m.step} stap ${s.index} (${s.kind}): onbekende uitslag '${s.verdict}'`);
      assert.ok(typeof s.waarom === 'string' && s.waarom.length > 10, `${m.step} stap ${s.index}: geen onderbouwing`);
    }
  }
});

t('de samenvatting telt alle missies uit het verhaal', () => {
  const { summary } = first.report;
  assert.equal(summary.missies, first.report.missies.length);
  assert.equal(summary.volledig + summary.deels + summary.niet + summary.solo + summary.onbekend, summary.missies);
  assert.equal(summary.buiten, first.report.buiten.length);
  assert.equal(summary.stappen, first.report.missies.reduce((n, m) => n + m.stages.length, 0));
});

t('de regelkeuring van cooproles.js blijft schoon', () => {
  assert.deepEqual(first.report.stepAudit, [], 'auditSteps meldt een probleem: ' + first.report.stepAudit.join(', '));
});

t('de audit schrijft niets in de werkboom', () => {
  const files = (dir) => fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => !d.name.startsWith('.') && d.name !== 'node_modules' && d.name !== 'data' && d.name !== 'build')
    .flatMap((d) => (d.isDirectory() ? files(`${dir}/${d.name}`).map((f) => `${d.name}/${f}`) : [d.name]));
  const before = files(ROOT).map((f) => `${f}:${fs.statSync(`${ROOT}/${f}`).mtimeMs}`).sort().join('\n');
  run();
  const after = files(ROOT).map((f) => `${f}:${fs.statSync(`${ROOT}/${f}`).mtimeMs}`).sort().join('\n');
  assert.equal(after, before, 'de audit heeft een bestand in de werkboom aangeraakt');
});

// The text report is what a human reads: one line per mission, and it must not be empty.
t('het leesbare rapport heeft een regel per missie', () => {
  const out = execFileSync(process.execPath, [SCRIPT, '--samenvatting'], { encoding: 'utf8', cwd: ROOT, timeout: 120000 });
  for (const m of first.report.missies) assert.ok(out.includes(`${m.step}  `), `regel voor ${m.step} ontbreekt in het leesbare rapport`);
  assert.ok(/samenvatting/.test(out), 'geen samenvatting in het leesbare rapport');
});

console.log(fails ? `\n${fails} test(s) gefaald` : '\nalle tests geslaagd');
process.exit(fails ? 1 : 0);
