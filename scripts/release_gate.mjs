// Releasegate: één commando dat vóór een release bewijst dat de build niet achteruit is gegaan
// in performance, graphics, design system, repo-regels of UI/UX/gameplay, en dat de AI-code-review
// op de diff is gedaan. De gate draait de bestaande metingen (geen nieuwe meetmethode), vat ze
// samen in één rapport en houdt de release tegen als iets verplichts niet gedraaid of rood is.
//
//   node scripts/release_gate.mjs --plan [--from=v0.60.7] [--all]
//   node scripts/release_gate.mjs --stage=auto [--out=<map>] [--from=v0.60.7]
//   node scripts/release_gate.mjs --stage=static|world|perf|visual
//   node scripts/release_gate.mjs --stage=review                 (reviewpakket klaarzetten)
//   node scripts/release_gate.mjs --stage=review --finalize      (ingevulde reviews triëren)
//   node scripts/release_gate.mjs --verify [--out=<runmap>]      (poort voor desktop/release.sh)
//
// Exitcodes, gelijk aan scripts/test_all.mjs: 0 groen, 1 rood, 2 crash, 3 niets/onvolledig gemeten.
// Een fase die niet kon draaien (geen wereld, geen Electron, geen beelden) heet onvolledig en is
// nooit stil groen. Uitvoer staat standaard in %TEMP%/gde-release/<stamp>-<commit>/ (buiten de repo).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  STAGES, STAGE_NAAM, planStages, requiredStages, mergeVerdict, verifyGate, beschrijfPlan,
} from './release/stages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASIS = process.env.GDE_RELEASE_DIR || path.join(os.tmpdir(), 'gde-release');
const LATEST = path.join(BASIS, 'latest.json');
const SCHEMA = 1;

const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
const log = (...a) => console.log(...a);
const rel = (p) => { const r = path.relative(ROOT, p); return (r.startsWith('..') || path.isAbsolute(r) ? p : r).split(path.sep).join('/'); };

function git(args, opts = {}) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() };
}
const head = () => git(['rev-parse', 'HEAD']).out || '';
const branch = () => git(['rev-parse', '--abbrev-ref', 'HEAD']).out || '';
function lastTag() {
  const r = git(['describe', '--tags', '--abbrev=0']);
  return r.code === 0 ? r.out : '';
}
function changedFiles(from) {
  if (!from) return null;
  const r = git(['diff', '--name-only', `${from}..HEAD`]);
  if (r.code !== 0) return null;
  return r.out.split(/\r?\n/).filter(Boolean);
}

function changedBetween(from, to) {
  const r = git(['diff', '--name-only', `${from}..${to}`]);
  return r.code === 0 ? r.out.split(/\r?\n/).filter(Boolean) : null;
}

// ---------------------------------------------------------------- draaien

function runStep(naam, cmd, args, { cwd = ROOT, env = {}, ms = 60 * 60e3, logDir } = {}) {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: ms, maxBuffer: 96 << 20, killSignal: 'SIGKILL' });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  if (logDir) {
    try { fs.mkdirSync(logDir, { recursive: true }); fs.writeFileSync(path.join(logDir, naam + '.log'), out); } catch { /* log mag ontbreken */ }
  }
  const timedOut = Boolean(r.error && r.error.code === 'ETIMEDOUT');
  return { code: timedOut ? 124 : (typeof r.status === 'number' ? r.status : 2), timedOut, out, secs: Math.round((Date.now() - t0) / 10) / 100, fout: (r.error && r.error.message) || '' };
}

const MELDING = (r) => (r.timedOut ? 'tijdslimiet' : r.fout ? r.fout : `exit ${r.code}`);

// Een Electron-stap zonder Electron of wereld is niet "geslaagd" maar "niet gedraaid".
function electronPad() {
  const eigen = path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  return process.env.ELECTRON_EXE || (fs.existsSync(eigen) ? eigen : '');
}
function wereldMap() {
  const kandidaten = [
    process.env.GDE_GAME_DIR && path.join(process.env.GDE_GAME_DIR, 'world'),
    process.env.GDE_PREBUILT_WORLD,
    path.join(ROOT, 'game', 'world'),
    path.join(ROOT, 'desktop', 'build', 'game', 'world'),
  ].filter(Boolean);
  return kandidaten.find((d) => fs.existsSync(path.join(d, 'index-provincie.json'))) || '';
}

// ---------------------------------------------------------------- fasen

function faseStatisch(ctx) {
  const d = path.join(ctx.out, 'static');
  const items = [];
  const tests = runStep('run_tests', process.execPath, ['scripts/run_tests.mjs'], { ms: 75 * 60e3, logDir: d });
  items.push({ naam: 'run_tests (lichte suite en CI-selectie)', status: tests.code === 0 ? 'PASS' : tests.code === 3 ? 'SKIP' : 'FAIL', code: tests.code === 0 ? 0 : tests.code === 3 ? 3 : 1, secs: tests.secs, detail: tests.code === 0 ? '' : MELDING(tests) });

  const geheim = runStep('secrets_scan', process.execPath, ['scripts/secrets_scan.mjs'], { ms: 20 * 60e3, logDir: d });
  items.push({ naam: 'geheimenscan (werkboom en geschiedenis)', status: geheim.code === 0 ? 'PASS' : geheim.code === 3 ? 'SKIP' : 'FAIL', code: geheim.code === 0 ? 0 : geheim.code === 3 ? 3 : 1, secs: geheim.secs, detail: geheim.code === 0 ? '' : MELDING(geheim) });

  const merken = runStep('merkenregister', process.execPath, ['scripts/merkenregister_check.mjs'], { ms: 120e3, logDir: d });
  items.push({ naam: 'merkenregister tegen de code', status: merken.code === 0 ? 'PASS' : 'FAIL', code: merken.code === 0 ? 0 : 1, secs: merken.secs, detail: merken.code === 0 ? '' : MELDING(merken) });

  if (ctx.from) {
    const regels = runStep('rules_audit', process.execPath, ['scripts/release/rules_audit.mjs', `--from=${ctx.from}`, `--out=${path.join(d, 'rules')}`], { ms: 20 * 60e3, logDir: d });
    const status = regels.code === 0 ? 'PASS' : regels.code === 3 ? 'SKIP' : regels.code === 2 ? 'FAIL' : 'FAIL';
    items.push({ naam: 'regels en design op de diff', status, code: regels.code === 0 ? 0 : regels.code === 3 ? 3 : 1, secs: regels.secs, detail: regels.code === 0 ? '' : MELDING(regels) });
    if (regels.code === 0 && fs.existsSync(path.join(d, 'rules', 'rules-gate.json'))) {
      try {
        const rg = JSON.parse(fs.readFileSync(path.join(d, 'rules', 'rules-gate.json'), 'utf8'));
        if (rg && rg.telling) items[items.length - 1].detail = `${rg.telling.toegevoegd || 0} toegevoegde regels bekeken`;
      } catch { /* samenvatting optioneel */ }
    }
  } else {
    items.push({ naam: 'regels en design op de diff', status: 'SKIP', code: 3, secs: 0, detail: 'geen vorige tag (--from) bekend' });
  }

  return samenVat(items, d);
}

function faseWereld(ctx) {
  const d = path.join(ctx.out, 'world');
  const testDir = path.join(d, 'test_all');
  const r = runStep('test_all-zwaar', process.execPath, ['scripts/test_all.mjs', '--fase=zwaar', `--rapport=${testDir}`], { ms: 4 * 60 * 60e3, logDir: d });
  let samenvatting = '';
  try {
    const md = fs.readFileSync(path.join(testDir, 'laatste-rapport.md'), 'utf8').split('\n').filter(Boolean);
    samenvatting = md.slice(0, 12).join(' | ');
  } catch { /* rapport kan ontbreken als de fase niet startte */ }
  const status = r.code === 0 ? 'PASS' : r.code === 3 ? 'SKIP' : 'FAIL';
  return { status, code: r.code === 0 ? 0 : r.code === 3 ? 3 : 1, secs: r.secs, detail: r.code === 0 ? samenvatting : `${MELDING(r)}${samenvatting ? `: ${samenvatting}` : ''}`, log: d };
}

function fasePerf(ctx) {
  const d = path.join(ctx.out, 'perf');
  let json = (ctx.perfJson || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!json.length) {
    if (!electronPad()) return { status: 'SKIP', code: 3, secs: 0, detail: 'geen Electron gevonden (desktop/node_modules ontbreekt en ELECTRON_EXE leeg)', log: d };
    const perfOut = path.join(d, 'runs');
    fs.mkdirSync(perfOut, { recursive: true });
    const env = { PERF_OUT: perfOut };
    const slotDir = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
    if (fs.existsSync(slotDir)) env.PERF_LOCKS = slotDir;
    const perfArgs = (process.env.GDE_RELEASE_PERF_ARGS || '--hitch').split(/\s+/).filter(Boolean);
    const r = runStep('perf-run', process.execPath, ['scripts/perf/run.mjs', 'release', ...perfArgs], { ms: 60 * 60e3, env, logDir: d });
    json = fs.existsSync(perfOut) ? fs.readdirSync(perfOut).filter((n) => n.endsWith('.json')).map((n) => path.join(perfOut, n)) : [];
    if (!json.length) return { status: r.code === 0 ? 'SKIP' : 'FAIL', code: r.code === 0 ? 3 : 1, secs: r.secs, detail: `geen perf-json: ${MELDING(r)}`, log: d };
  }
  const args = ['scripts/release/perf_gate.mjs', `--json=${json.join(',')}`, `--out=${d}`];
  if (ctx.updateBaseline) args.push('--update');
  const r = runStep('perf-gate', process.execPath, args, { ms: 5 * 60e3, logDir: d });
  const status = r.code === 0 ? 'PASS' : r.code === 3 ? 'SKIP' : 'FAIL';
  return { status, code: r.code === 0 ? 0 : r.code === 3 ? 3 : 1, secs: r.secs, detail: r.code === 0 ? `${json.length} perf-run(s) binnen norm en baseline` : MELDING(r), log: d };
}

function leesVisualSets() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(HERE, 'release', 'visual-sets.json'), 'utf8'));
    return Array.isArray(j.sets) ? j.sets : [];
  } catch { return []; }
}

function faseBeeld(ctx) {
  const d = path.join(ctx.out, 'visual');
  let images = (ctx.images || '').split(',').map((s) => s.trim()).filter(Boolean);
  const notities = [];
  if (!images.length) {
    const hebben = { wereld: Boolean(wereldMap()), electron: Boolean(electronPad()) };
    for (const set of leesVisualSets()) {
      const nodig = Array.isArray(set.nodig) ? set.nodig : [];
      const mist = nodig.filter((n) => !hebben[n]);
      if (mist.length) { notities.push(`${set.naam}: niet gedraaid (geen ${mist.join(', ')})`); continue; }
      const uit = path.join(ctx.out, set.out || path.join('beelden', set.naam));
      fs.mkdirSync(uit, { recursive: true });
      const r = runStep(`beelden-${set.naam}`, process.execPath, [set.script, ...(set.args || []), `--out=${uit}`], { ms: (Number(set.timeoutS) || 2700) * 1000, logDir: path.join(d, set.naam) });
      if (r.code !== 0) { notities.push(`${set.naam}: ${MELDING(r)}`); continue; }
      images.push(uit);
    }
  }
  images = images.filter((p) => fs.existsSync(p));
  if (!images.length) {
    return { status: 'SKIP', code: 3, secs: 0, detail: `geen beelden${notities.length ? ` (${notities.join('; ')})` : ''}`, log: d };
  }
  const args = ['scripts/release/visual_gate.mjs', `--images=${images.join(',')}`, `--out=${d}`];
  if (ctx.updateBaseline) args.push('--update');
  const r = runStep('visual-gate', process.execPath, args, { ms: 30 * 60e3, logDir: d });
  let detail = r.code === 0 ? `${images.length} beeldmap(pen) gecontroleerd` : MELDING(r);
  try {
    const vis = JSON.parse(fs.readFileSync(path.join(d, 'visual-gate.json'), 'utf8'));
    const review = (vis.reviewset && vis.reviewset.length) || 0;
    if (review) detail += `; ${review} beelden voor de AI-review`;
  } catch { /* samenvatting optioneel */ }
  if (notities.length) detail += `; ${notities.join('; ')}`;
  const status = r.code === 0 ? 'PASS' : r.code === 3 ? 'SKIP' : 'FAIL';
  return { status, code: r.code === 0 ? 0 : r.code === 3 ? 3 : 1, secs: r.secs, detail, log: d };
}

function faseReview(ctx) {
  const d = path.join(ctx.out, 'review');
  fs.mkdirSync(d, { recursive: true });
  const reviewMap = path.join(ctx.out, 'reviews');
  fs.mkdirSync(reviewMap, { recursive: true });
  const reviews = fs.existsSync(reviewMap) ? fs.readdirSync(reviewMap).filter((n) => /\.json$/i.test(n)) : [];
  if (!ctx.finalize) {
    if (!ctx.from) return { status: 'SKIP', code: 3, secs: 0, detail: 'geen vorige tag (--from) bekend; reviewpakket kan niet worden gemaakt', log: d };
    const r = runStep('review-pack', process.execPath, ['scripts/release/review_pack.mjs', `--from=${ctx.from}`, `--to=${ctx.commit || 'HEAD'}`, `--out=${d}`], { ms: 10 * 60e3, logDir: d });
    if (r.code !== 0) return { status: 'FAIL', code: 1, secs: r.secs, detail: `reviewpakket mislukt: ${MELDING(r)}`, log: d };
    // Het beeldreviewpakket hoort bij dezelfde triage: voeg het aspect vision toe als er beelden klaarstaan.
    let pakket = {};
    try { pakket = JSON.parse(fs.readFileSync(path.join(d, 'review-required.json'), 'utf8')); } catch { pakket = {}; }
    const batches = path.join(ctx.out, 'visual', 'vision', 'vision-batches.json');
    if (fs.existsSync(batches)) {
      pakket.aspecten = [...new Set([...(pakket.aspecten || []), 'vision'])];
      pakket.visionPack = path.relative(ROOT, path.join(ctx.out, 'visual', 'vision', 'vision-pack.md')).split(path.sep).join('/');
      pakket.visionBatches = path.relative(ROOT, batches).split(path.sep).join('/');
    }
    fs.writeFileSync(path.join(d, 'review-required.json'), JSON.stringify(pakket, null, 1) + '\n');
    const aspecten = [...new Set(pakket.aspecten || [])];
    return {
      status: 'WACHT',
      code: 3,
      secs: r.secs,
      detail: reviews.length
        ? `reviewpakket klaar; ${reviews.length} reviewrapport(en) gevonden, draai --stage=review --finalize`
        : `reviewpakket klaar in ${rel(d)}; verplichte aspecten: ${aspecten.join(', ') || '(geen)'}; laat per aspect een reviewer het reviewrapport-JSON naar ${rel(reviewMap)}/<aspect>.json schrijven (prompts: scripts/release/prompts/${aspecten.includes('vision') ? 'vision.md, ' : ''}code-review.md e.a.)`,
      log: d,
    };
  }

  // Auto-bevindingen (regels, perf, beeld) als reviewrapport klaarzetten, zodat één triage alles dekt.
  const autoMap = path.join(d, 'auto');
  fs.mkdirSync(autoMap, { recursive: true });
  const wrap = (naam, onderwerp, reviewer, bestand) => {
    let inhoud;
    try { inhoud = JSON.parse(fs.readFileSync(bestand, 'utf8')); } catch { return; }
    const bevindingen = Array.isArray(inhoud) ? inhoud : (inhoud.bevindingen || []);
    if (!bevindingen.length) return;
    const rapport = { onderwerp, reviewer, commit: ctx.commit || head(), dekking: { bestanden: [], beelden: [] }, bevindingen };
    fs.writeFileSync(path.join(autoMap, naam + '.json'), JSON.stringify(rapport, null, 1) + '\n');
  };
  wrap('auto-rules', 'rules', 'rules_audit.mjs', path.join(ctx.out, 'static', 'rules', 'findings', 'auto-rules.json'));
  wrap('auto-perf', 'perf', 'perf_gate.mjs', path.join(ctx.out, 'perf', 'perf-gate.json'));
  wrap('auto-visual', 'vision', 'visual_gate.mjs', path.join(ctx.out, 'visual', 'findings', 'auto-visual.json'));

  const invoer = [reviewMap, autoMap].filter((p) => fs.existsSync(p));
  if (!invoer.length) return { status: 'SKIP', code: 3, secs: 0, detail: 'geen reviewrapporten; eerst --stage=review (pakket) en de reviewers laten invullen', log: d };
  const args = ['scripts/release/findings.mjs', `--dir=${invoer.join(',')}`, `--required=${path.join(d, 'review-required.json')}`, `--out=${d}`];
  if (ctx.commit) args.push(`--commit=${ctx.commit}`);
  if (ctx.issues) args.push('--issues');
  if (ctx.createIssues) args.push('--issues', '--create');
  const r = runStep('findings', process.execPath, args, { ms: 10 * 60e3, logDir: d });
  let gate = null;
  try { gate = JSON.parse(fs.readFileSync(path.join(d, 'gate.json'), 'utf8')); } catch { gate = null; }
  const status = r.code === 0 ? 'PASS' : r.code === 3 ? 'SKIP' : 'FAIL';
  const samenvatting = gate ? `${(gate.blocking || []).length} blokkerend, ${(gate.belangrijk || []).length} belangrijk, ${(gate.nits || []).length} nit` : MELDING(r);
  return { status, code: r.code === 0 ? 0 : r.code === 3 ? 3 : 1, secs: r.secs, detail: samenvatting, log: d, gate };
}

// ---------------------------------------------------------------- verslag

function samenVat(items, logDir) {
  const rood = items.filter((i) => i.code === 1);
  const onvolledig = items.filter((i) => i.code === 3);
  const code = rood.length ? 1 : onvolledig.length ? 3 : 0;
  return {
    status: code === 0 ? 'PASS' : code === 1 ? 'FAIL' : 'SKIP',
    code,
    secs: items.reduce((s, i) => s + (i.secs || 0), 0),
    detail: code === 0 ? 'alle onderdelen groen' : rood.length ? `${rood.length} rood` : `${onvolledig.length} niet gedraaid`,
    items,
    log: logDir,
  };
}

function uitslagenVoorVerdict(stages, plan) {
  const uit = {};
  for (const fase of STAGES) {
    const u = stages[fase];
    const nodig = plan && plan.stages && plan.stages[fase] && plan.stages[fase].nodig;
    if (!u || !nodig) continue;
    uit[fase] = u;
  }
  return uit;
}

function schrijfVerslag(gate) {
  const regels = [];
  regels.push(`# Releasegate ${gate.commit ? gate.commit.slice(0, 10) : '(geen commit)'} - ${gate.verdict.status}`, '');
  regels.push(`Gestart: ${gate.gestart}${gate.vanaf ? `, sinds ${gate.vanaf}` : ''}. Duur: ${gate.duurSecs} s.`, '');
  regels.push('## Uitslag', '', '| fase | status | duur | detail |', '|---|---|---|---|');
  for (const fase of STAGES) {
    const u = gate.stages[fase];
    const verplicht = gate.plan && gate.plan.stages && gate.plan.stages[fase] && gate.plan.stages[fase].verplicht;
    regels.push(`| ${STAGE_NAAM[fase]}${verplicht ? ' (verplicht)' : ''} | ${u ? u.status : 'NIET GEDRAAID'} | ${u && u.secs != null ? Math.round(u.secs) + ' s' : '-'} | ${u && u.detail ? String(u.detail).slice(0, 300) : '-'} |`);
  }
  regels.push('');
  if (gate.review) regels.push(`Review: ${gate.review.status}${gate.review.commit ? ` op ${String(gate.review.commit).slice(0, 10)}` : ''}.`, '');
  regels.push('## Plan', '');
  for (const r of beschrijfPlan(gate.plan)) regels.push(`- ${r}`);
  if (gate.redenen && gate.redenen.length) regels.push('', gate.verdict.status === 'groen' ? '## Aandachtspunten' : '## Waarom dit geen groen is', '', ...gate.redenen.map((r) => `- ${r}`));
  regels.push('', '## Wat nu', '');
  if (gate.verdict.status === 'groen') regels.push('- Klaar: de releasepoort is groen. `desktop/release.sh` controleert dit rapport met `--verify`.');
  else regels.push(
    '- Repareer de rode of niet-gedraaide fase en draai de gate opnieuw.',
    '- Review: laat de reviewers (scripts/release/prompts/) het pakket invullen in de reviewmap en draai daarna `--stage=review --finalize`.',
    '- Een bewuste deelrun voor ontwikkelen kan met `--allow-skip`; dat maakt de gate nooit bewijsbaar groen voor een release.',
  );
  regels.push('', '## Bewijs', '', `- Map: \`${gate.out}\``, `- Machineleesbaar: \`release-gate.json\` (zelfde map)`, '');
  return regels.join('\n');
}

function bewaar(gate) {
  fs.mkdirSync(gate.out, { recursive: true });
  fs.writeFileSync(path.join(gate.out, 'release-gate.json'), JSON.stringify(gate, null, 1) + '\n');
  fs.writeFileSync(path.join(gate.out, 'rapport.md'), schrijfVerslag(gate));
  fs.mkdirSync(BASIS, { recursive: true });
  fs.writeFileSync(LATEST, JSON.stringify({ run: gate.out, commit: gate.commit, verdict: gate.verdict, tijd: gate.gestart }, null, 1) + '\n');
}

function leesLatest() {
  try { return JSON.parse(fs.readFileSync(LATEST, 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------- main

const HELP = `Releasegate voor GDE Groningen.

  node scripts/release_gate.mjs --plan [--from=<tag>] [--all]
  node scripts/release_gate.mjs --stage=auto|all|static|world|perf|visual|review [--out=<map>]
  node scripts/release_gate.mjs --stage=review --finalize
  node scripts/release_gate.mjs --verify [--out=<runmap>]

Opties:
  --from=<tag>        diff sinds deze tag (standaard: laatste tag)
  --out=<map>         uitvoermap (standaard: %TEMP%/gde-release/<stamp>-<commit>)
  --perf-json=<paden> bestaande perf-runs hergebruiken (komma)
  --images=<paden>    bestaande beeldmappen hergebruiken (komma)
  --force=<fases>     fases forceren (komma)
  --skip=<fases>      fases overslaan (komma; wordt als niet-gemeten gemeld)
  --all               alle fases
  --allow-skip        deelrun toestaan (exit 3 wordt 0; het rapport blijft onvolledig)
  --update-baseline   perf-/beeldbaseline bijwerken (alleen na een bewuste, goedgekeurde meting)
  --issues            issue-concepten maken (droge run)
  --create-issues     issue-concepten ook echt aanmaken (gh)
  --commit=<sha>      commit voor de review (standaard HEAD)
  --finalize          reviewrapporten triëren
  --verify            een bewaard rapport keuren (voor desktop/release.sh)
`;

function main() {
  const stageArg = arg('stage', '');
  const outArg = arg('out', '');
  const from = arg('from', '') || lastTag();
  const commit = arg('commit', '') || head();
  // Een volgende fase in dezelfde release hoort bij dezelfde runmap: `--stage=review` na
  // `--stage=auto`, en `--finalize` daarna, vullen het rapport aan in plaats van een nieuwe
  // map te beginnen. Met --out kies je zelf een map; met --stage=auto/all begin je een run.
  let outPad = outArg ? path.resolve(outArg) : '';
  const deelrun = Boolean(stageArg) && !['auto', 'all', 'verify'].includes(stageArg);
  if (!outPad) {
    const laatste = leesLatest();
    if (deelrun && laatste && laatste.commit === commit && laatste.run && fs.existsSync(path.join(laatste.run, 'release-gate.json'))) outPad = laatste.run;
    else outPad = path.join(BASIS, `${stamp()}-${commit.slice(0, 8)}`);
  }
  const ctx = {
    out: outPad,
    from,
    commit,
    perfJson: arg('perf-json', ''),
    images: arg('images', ''),
    updateBaseline: flag('update-baseline'),
    issues: flag('issues') || flag('create-issues'),
    createIssues: flag('create-issues'),
    finalize: flag('finalize'),
  };
  ctx.out = path.resolve(ctx.out);

  if (flag('help') || process.argv.includes('--help')) { console.log(HELP); return 0; }

  // --verify: het bewaarde rapport tegen de huidige commit keuren.
  if (stageArg === 'verify' || flag('verify')) {
    let run = ctx.out;
    if (!outArg) {
      try { run = JSON.parse(fs.readFileSync(LATEST, 'utf8')).run; } catch { console.error('Geen bewaard gate-rapport gevonden; draai eerst de gate.'); return 3; }
    }
    const bestand = path.join(run, 'release-gate.json');
    let gate = null;
    try { gate = JSON.parse(fs.readFileSync(bestand, 'utf8')); } catch { console.error(`Geen leesbaar gate-rapport op ${bestand}`); return 3; }
    const v = verifyGate(gate, {
      commit,
      allowReleaseCommit: flag('allow-release-commit'),
      filesSinds: flag('allow-release-commit') && gate.commit && gate.commit !== commit ? changedBetween(gate.commit, commit) : null,
    });
    console.log(`Releasegate ${v.ok ? 'GROEN' : 'NIET GROEN'} (${bestand})`);
    for (const w of v.waarschuwingen || []) console.log('  let op: ' + w);
    if (!v.ok) for (const p of v.problemen) console.log('  - ' + p);
    if (v.ok) console.log(`  commit ${commit.slice(0, 10)}, ${gate.verdict.status}, ${gate.stages ? Object.values(gate.stages).filter((s) => s && s.status === 'PASS').length : 0} fase(n) groen`);
    return v.code;
  }

  // --plan: alleen tonen wat deze release nodig heeft.
  const gewijzigd = changedFiles(from);
  const gekozen = stageArg && stageArg !== 'auto' && stageArg !== 'all' && stageArg !== 'verify' ? stageArg.split(',') : null;
  if (flag('plan')) {
    if (gewijzigd === null) { console.error(`Geen bruikbare diff sinds ${from || '(geen tag)'}; geef --from=<tag> op.`); return 2; }
    const plan = planStages(gewijzigd, { all: flag('all'), force: (arg('force', '') || '').split(',').filter(Boolean), skip: (arg('skip', '') || '').split(',').filter(Boolean) });
    console.log(JSON.stringify({ schema: SCHEMA, commit, from, aantalBestanden: gewijzigd.length, plan }, null, 1));
    for (const r of beschrijfPlan(plan)) console.log('  ' + r);
    return 0;
  }

  if (!stageArg) { console.log(HELP); return 2; }

  const stappen = stageArg === 'auto' || stageArg === 'all'
    ? (() => {
      if (gewijzigd === null) return null;
      return planStages(gewijzigd, { all: stageArg === 'all', force: (arg('force', '') || '').split(',').filter(Boolean), skip: (arg('skip', '') || '').split(',').filter(Boolean) });
    })()
    : planStages(gewijzigd || [], { force: gekozen || [], skip: (arg('skip', '') || '').split(',').filter(Boolean) });
  if (!stappen) { console.error(`Geen bruikbare diff sinds ${from || '(geen tag)'}; geef --from=<tag> op.`); return 2; }

  const teDraaien = (() => {
    if (stageArg === 'auto' || stageArg === 'all') return stappen.geselecteerd;
    return (gekozen || []).filter((f) => STAGES.includes(f));
  })();
  if (!teDraaien.length) { console.error(`Onbekende of lege fase: ${stageArg}`); return 2; }

  fs.mkdirSync(ctx.out, { recursive: true });
  const gestartNu = new Date().toISOString();
  const t0 = Date.now();
  const stages = {};
  const fases = {
    static: faseStatisch,
    world: faseWereld,
    perf: fasePerf,
    visual: faseBeeld,
    review: faseReview,
  };
  for (const fase of STAGES) {
    if (!teDraaien.includes(fase)) { stages[fase] = { status: 'NIET GEDRAAID', code: 3, secs: 0, detail: 'niet gedraaid in deze run' }; continue; }
    log(`\n== ${STAGE_NAAM[fase]} ...`);
    try {
      const u = fases[fase](ctx);
      stages[fase] = u;
      log(`${u.status.padEnd(7)} ${fase} ${Math.round(u.secs || 0)}s${u.detail ? ' - ' + String(u.detail).slice(0, 240) : ''}`);
    } catch (e) {
      stages[fase] = { status: 'FAIL', code: 1, secs: 0, detail: `fase crashte: ${e && e.message || e}` };
      log(`FAIL     ${fase}: ${stages[fase].detail}`);
    }
  }

  // Vul een bestaand rapport in dezelfde runmap aan: eerdere fasen blijven bewijs, en de
  // review of een fixronde hoeft de releasegate niet opnieuw vanaf nul te draaien.
  let oud = null;
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ctx.out, 'release-gate.json'), 'utf8'));
    if (j && j.schema === SCHEMA && j.commit === commit) oud = j;
  } catch { oud = null; }
  const volledigeRun = stageArg === 'auto' || stageArg === 'all';
  const planVoorVerdict = oud && oud.plan && !volledigeRun ? oud.plan : stappen;
  if (oud) {
    for (const fase of STAGES) {
      if (!teDraaien.includes(fase) && oud.stages && oud.stages[fase]) stages[fase] = oud.stages[fase];
    }
  }
  // Elke verplichte fase moet een echte uitslag hebben; ontbreekt die, dan is de gate
  // onvolledig (exit 3) en niet stil groen.
  const uitslagen = {};
  for (const fase of requiredStages(planVoorVerdict)) {
    const u = stages[fase];
    uitslagen[fase] = u && u.status !== 'NIET GEDRAAID' ? u : { status: 'NIET GEDRAAID', code: 3, detail: 'nog niet gedraaid' };
  }
  const verdict = mergeVerdict(uitslagen, { allowSkip: flag('allow-skip') });
  const reviewGate = stages.review && stages.review.gate ? stages.review.gate : null;
  const review = reviewGate
    ? { status: reviewGate.status, commit: reviewGate.commit || commit, blocking: (reviewGate.blocking || []).length, belangrijk: (reviewGate.belangrijk || []).length, nits: (reviewGate.nits || []).length }
    : (oud && oud.review ? oud.review : { status: 'onvolledig', commit, blocking: 0, belangrijk: 0, nits: 0 });
  const gate = {
    schema: SCHEMA,
    commit,
    branch: branch(),
    gestart: oud && oud.gestart ? oud.gestart : gestartNu,
    vanaf: from || (oud && oud.vanaf) || null,
    duurSecs: Math.round(((oud && oud.duurSecs) || 0) + (Date.now() - t0) / 1000),
    out: ctx.out,
    plan: planVoorVerdict,
    stages,
    review,
    verdict,
  };
  bewaar(gate);
  log(`\nReleasegate: ${verdict.status.toUpperCase()} (exit ${verdict.code})`);
  for (const r of verdict.redenen) log('  - ' + r);
  log(`Rapport: ${path.join(gate.out, 'rapport.md')}`);
  if (verdict.status !== 'groen') {
    log('Let op: een niet-groene of onvolledige gate houdt desktop/release.sh tegen (nooduitgang: GDE_RELEASE_SKIP_GATE=1).');
  }
  return verdict.code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { process.exit(main()); } catch (e) { console.error('release_gate crashte:', e && e.stack || e); process.exit(2); }
}

export { main, schrijfVerslag, uitslagenVoorVerdict, faseStatisch, faseWereld, fasePerf, faseBeeld, faseReview };
