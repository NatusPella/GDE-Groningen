// Perf-gate voor de release:  node scripts/release_perf_test.mjs
// Test de pure functies van scripts/release/perf_gate.mjs en de CLI met
// fixtures in een tijdelijke map; er wordt geen echte perf-run gedraaid.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  BASELINE_SCHEMA, DEFAULT_THRESHOLDS, EXIT, STATUS,
  emptyBaseline, validateBaseline, loadBaseline, machineContext, machineId, compareMachine,
  normalizeThresholds, regressionViolations, compareRoute, compareRoutes, updateBlokkades,
  buildBaseline, verdictFor, buildReport, renderSummary, loadRunFiles, frameRoutes, measuredRoutes,
} from './release/perf_gate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GATE = path.join(HERE, 'release', 'perf_gate.mjs');
let fails = 0;
const ok = (c, name, extra) => { if (!c) { fails++; console.log('FAIL', name, extra !== undefined ? JSON.stringify(extra) : ''); } };

const schoon = { frames: 900, avg: 16.7, p95: 20, p99: 24, max: 33, hitch: { over50: 0, over100: 0 } };
const zelfdeMachine = { vergelijkbaar: true, reden: null };
const andereMachine = { vergelijkbaar: false, reden: 'andere machine dan de baseline (a tegenover b)' };
const rt = (huidig, basis, ctx = {}) => compareRoute('foot', huidig, basis, { thresholds: DEFAULT_THRESHOLDS, machine: zelfdeMachine, ...ctx });

// --- baseline laden, valideren, opbouwen -----------------------------------
ok(emptyBaseline().schema === BASELINE_SCHEMA && Object.keys(emptyBaseline().routes).length === 0, 'leeg beginschema is geldig');
ok(validateBaseline(emptyBaseline()).ok, 'leeg beginschema valideert');
ok(validateBaseline(buildBaseline({ foot: schoon })).ok, 'een opgebouwde baseline valideert');
ok(validateBaseline({ schema: BASELINE_SCHEMA, routes: { foot: schoon } }).ok, 'baseline zonder metadata valideert');
ok(!validateBaseline(null).ok && !validateBaseline({ routes: [] }).ok && !validateBaseline({ schema: 'x', routes: {} }).ok, 'kapotte baseline wordt afgekeurd');

// --- machinecontext --------------------------------------------------------
const ctx = machineContext({ machine: ' Test-PC ', hostname: 'test-pc', load: [0.5, 'x', 1], cpus: 8, cpu: 'CPU X' });
ok(ctx.id === 'test-pc' && ctx.load.length === 2 && ctx.cpus === 8, 'machinecontext normaliseert');
ok(machineContext({}).id === 'onbekend', 'zonder id is de machine onbekend');
ok(machineId({ hostname: 'Test-PC' }) === 'test-pc' && machineId('Test-PC') === 'test-pc', 'machine-id uit tekst of object');
ok(compareMachine(ctx, { id: 'test-pc' }).vergelijkbaar && compareMachine(ctx, 'test-pc').vergelijkbaar, 'zelfde machine is vergelijkbaar');
ok(!compareMachine(ctx, { id: 'andere-pc' }).vergelijkbaar, 'andere machine is niet vergelijkbaar');
ok(!compareMachine(ctx, null).vergelijkbaar && /machine-id/.test(compareMachine(ctx, null).reden), 'zonder machine-id geen relatieve vergelijking');

// --- drempels en regressies ------------------------------------------------
const drempels = normalizeThresholds({ tolerantie: 0.2, avg: 0.05, max: 'x' });
ok(drempels.p95 === 0.2 && drempels.avg === 0.05 && drempels.max === DEFAULT_THRESHOLDS.max, 'drempels configureerbaar met terugval');
ok(normalizeThresholds({}).p95 === 0.15 && normalizeThresholds(null).max === 0.25, 'standaarddrempels');
const p95TeVeel = regressionViolations({ p95: 23.1, avg: 16, max: 33 }, { p95: 20, avg: 16, max: 33 });
ok(p95TeVeel.length === 1 && p95TeVeel[0].metric === 'p95', 'p95 boven +15% is een regressie');
ok(regressionViolations({ p95: 22.9, avg: 16, max: 33 }, { p95: 20, avg: 16, max: 33 }).length === 0, 'p95 binnen +15% is geen regressie');
ok(regressionViolations({ p95: 20, avg: 17.7, max: 33 }, { p95: 20, avg: 16, max: 33 })[0].metric === 'avg', 'avg boven +10% is een regressie');
ok(regressionViolations({ p95: 20, avg: 16, max: 42 }, { p95: 20, avg: 16, max: 33 })[0].metric === 'max', 'max boven +25% is een regressie');
ok(regressionViolations({ p95: null, avg: 16, max: 33 }, { p95: 20, avg: 16, max: 33 }).length === 0, 'zonder cijfer geen valse regressie');

// --- per route vergelijken -------------------------------------------------
ok(rt(schoon, schoon).status === STATUS.OK && rt(schoon, schoon).bevindingen.length === 0, 'schone route is ok');
const normFout = rt({ ...schoon, p95: 34, max: 60 }, schoon);
ok(normFout.status === STATUS.ROOD && normFout.bevindingen.some((b) => b.ernst === 'blokkerend' && /norm/i.test(b.titel)), 'normovertreding is blokkerend rood');
const regressie = rt({ ...schoon, p95: 24 }, { ...schoon, p95: 20 });
ok(regressie.status === STATUS.ROOD && regressie.bevindingen.some((b) => b.ernst === 'blokkerend' && /trager/.test(b.titel)), 'relatieve regressie is blokkerend rood');
ok(rt({ ...schoon, p95: 34, max: 60 }, schoon, { machine: andereMachine }).status === STATUS.ROOD, 'op een andere machine blijft de absolute norm hard');
const anderTraag = rt({ ...schoon, p95: 24 }, { ...schoon, p95: 20 }, { machine: andereMachine });
ok(anderTraag.status === STATUS.ONBESLIST && anderTraag.bevindingen.length === 0, 'op een andere machine geen valse regressie');
const nieuw = rt(schoon, undefined);
ok(nieuw.status === STATUS.NIEUW && nieuw.bevindingen.some((b) => b.bron === 'baseline' && b.ernst === 'belangrijk'), 'nieuwe route is belangrijk');
const ontbreekt = compareRoute('foot', null, schoon, { machine: zelfdeMachine });
ok(ontbreekt.status === STATUS.ONTBREEKT && ontbreekt.bevindingen.some((b) => b.ernst === 'belangrijk'), 'ontbrekende route is belangrijk');
ok(rt({ kind: 'latency', n: 20, msP50: 40, msP95: 60 }).status === STATUS.OVERGESLAGEN, 'losse latentiemeting wordt overgeslagen');
ok(rt({ frames: 900, avg: 16 }).status === STATUS.ONBESLIST, 'onvolledige meting is onbeslist');

// --- alle routes, statistiek en schema van de bevindingen ------------------
const basisRoutes = { foot: schoon, ring: { ...schoon, p95: 34, max: 60 }, verdwenen: schoon };
const vergelijking = compareRoutes({ foot: schoon, ring: { ...schoon, p95: 34, max: 60 }, census: { kind: 'census', n: 5 } }, basisRoutes, { machine: zelfdeMachine, baselinePad: 'scripts/release/baselines/perf-baseline.json' });
ok(vergelijking.routes.foot.status === STATUS.OK && vergelijking.routes.ring.status === STATUS.ROOD, 'per route ok en rood');
ok(vergelijking.routes.census.status === STATUS.OVERGESLAGEN && vergelijking.routes.verdwenen.status === STATUS.ONTBREEKT, 'census telt niet mee, ontbrekende route wordt gemeld');
ok(vergelijking.bevindingen.filter((b) => b.ernst === 'blokkerend').length === 1, 'alleen de normfout is blokkerend');
ok(vergelijking.statistiek.rood === 1 && vergelijking.statistiek.ontbreekt === 1 && vergelijking.statistiek.totaal === 4, 'statistiek klopt');
ok(compareRoutes({ foot: schoon }, {}, { vergelijkBaseline: false }).bevindingen.length === 0, 'update-modus vergelijkt alleen de norm');

const schema = JSON.parse(fs.readFileSync(path.join(HERE, 'release', 'findings-schema.json'), 'utf8').replace(/^\uFEFF/, ''));
const bevindingDef = schema.$defs.bevinding;
const alleBevindingen = [...vergelijking.bevindingen, ...normFout.bevindingen, ...nieuw.bevindingen];
ok(alleBevindingen.every((b) => bevindingDef.required.every((k) => b[k] !== undefined)
  && Object.keys(b).every((k) => Object.prototype.hasOwnProperty.call(bevindingDef.properties, k))
  && bevindingDef.properties.bron.enum.includes(b.bron)
  && bevindingDef.properties.aspect.enum.includes(b.aspect)
  && bevindingDef.properties.ernst.enum.includes(b.ernst)
  && b.titel.length >= 4 && b.titel.length <= 120
  && b.beschrijving.length >= 10 && b.beschrijving.length <= 2000), 'bevindingen volgen findings-schema');
ok(alleBevindingen.filter((b) => b.ernst === 'blokkerend').every((b) => Array.isArray(b.bewijs) && b.bewijs.length > 0), 'blokkerende bevindingen hebben bewijs');

// --- verdict, rapport, samenvatting ---------------------------------------
ok(verdictFor([]).verdict === 'groen' && verdictFor([]).exitcode === EXIT.GROEN, 'geen bevindingen is groen');
ok(verdictFor([{ ernst: 'belangrijk' }]).verdict === 'groen', 'belangrijk blokkeert niet');
ok(verdictFor([{ ernst: 'belangrijk' }, { ernst: 'blokkerend' }]).exitcode === EXIT.ROOD, 'blokkerend is rood');
const rapport = buildReport({
  routes: vergelijking.routes, bevindingen: vergelijking.bevindingen, statistiek: vergelijking.statistiek,
  machine: ctx, baseline: { pad: 'x', datum: '2026-11-01T10:00:00.000Z', vergelijkbaar: true },
  thresholds: DEFAULT_THRESHOLDS, commit: 'abcdef123', gegenereerd: '2026-11-13T10:00:00.000Z', bestanden: ['run.json'],
});
ok(rapport.schema === 'gde-perf-gate' && rapport.verdict === 'rood' && rapport.status === 'rood' && rapport.exitcode === 1 && rapport.commit === 'abcdef123', 'rapport heeft verdict, status, exitcode en commit');
const samenvatting = renderSummary(rapport).join('\n');
ok(/foot: ok/.test(samenvatting) && /ring: rood/.test(samenvatting) && /Verdict: rood/.test(samenvatting), 'samenvatting noemt per route ok/rood');

// --- baseline opbouwen en bijwerken ---------------------------------------
ok(frameRoutes({ foot: schoon, census: { kind: 'census' }, onvolledig: { frames: 9, avg: 1 } }).join(',') === 'foot', 'alleen frameroutes in de baseline');
ok(measuredRoutes({ foot: schoon, census: { kind: 'census' } }).length === 1, 'meetbare routes voor de gate');
ok(updateBlokkades({ foot: schoon }, { reden: 'na ronde 12' }).ok, 'update mag met een schone route en een reden');
ok(!updateBlokkades({ foot: schoon }, {}).ok, 'update zonder reden mag niet');
ok(!updateBlokkades({}, { reden: 'leeg' }).ok, 'update zonder frameroute mag niet');
const blok = updateBlokkades({ foot: { ...schoon, p95: 34, max: 60 } }, { reden: 'x' });
ok(!blok.ok && blok.overtredingen.length === 1, 'update met normovertreding mag niet');
const opgebouwd = buildBaseline(
  { foot: schoon, census: { kind: 'census' }, hitch: { frames: 0, hitch: { over50: 0, over100: 0 } } },
  { datum: '2026-11-13T10:00:00.000Z', commit: 'abcdef123', machine: { id: 'test-pc' }, load: [0.1, 0.2, 0.3], reden: 'na ronde 12' },
);
ok(Object.keys(opgebouwd.routes).length === 1 && opgebouwd.routes.foot.p95 === 20, 'baseline bevat alleen frameroutes');
ok(opgebouwd.datum && opgebouwd.commit === 'abcdef123' && opgebouwd.machine.id === 'test-pc' && opgebouwd.reden === 'na ronde 12', 'baseline bewaart de metadata');

// --- CLI met fixtures in een tijdelijke map -------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gde-release-perf-test-'));
const runGate = (args, envExtra = {}) => {
  const env = { ...process.env, ...envExtra };
  if (!Object.prototype.hasOwnProperty.call(envExtra, 'GDE_BASELINE_REDEN')) delete env.GDE_BASELINE_REDEN;
  const r = spawnSync(process.execPath, [GATE, ...args], { encoding: 'utf8', cwd: tmp, timeout: 60000, env });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
};
const lees = (pad) => JSON.parse(fs.readFileSync(pad, 'utf8'));
try {
  const basisFile = path.join(tmp, 'baseline.json');
  fs.writeFileSync(basisFile, JSON.stringify(buildBaseline({ foot: schoon }, { datum: '2026-11-01T10:00:00.000Z', commit: 'abcdef123', machine: { id: 'test-pc' }, load: [0.1, 0.2, 0.3], reden: 'test' })));
  const geladen = loadBaseline(basisFile);
  ok(geladen.ok && geladen.baseline.routes.foot.p95 === 20 && geladen.baseline.machine.id === 'test-pc', 'baseline laden');
  ok(!loadBaseline(path.join(tmp, 'bestaat-niet.json')).ok, 'ontbrekende baseline is een fout');
  fs.writeFileSync(path.join(tmp, 'kapot.json'), '{geen json');
  ok(!loadBaseline(path.join(tmp, 'kapot.json')).ok, 'kapotte json is een fout');

  const runSchoon = path.join(tmp, 'run-schoon.json');
  fs.writeFileSync(runSchoon, JSON.stringify({ routes: { foot: schoon, ring: { ...schoon, p95: 21, avg: 17 } }, machine: { cpus: 8 } }));
  const basisSchoon = path.join(tmp, 'basis-schoon.json');
  fs.writeFileSync(basisSchoon, JSON.stringify(buildBaseline({ foot: schoon, ring: { ...schoon, p95: 21, avg: 17 } }, { datum: '2026-11-10T10:00:00.000Z', machine: { id: 'test-machine' }, reden: 'test' })));

  const outGroen = path.join(tmp, 'out-groen');
  const groen = runGate([`--json=${runSchoon}`, `--baseline=${basisSchoon}`, `--out=${outGroen}`, '--machine=test-machine']);
  ok(groen.code === EXIT.GROEN, 'CLI groen geeft exit 0', groen);
  const groenRapport = lees(path.join(outGroen, 'perf-gate.json'));
  ok(groenRapport.verdict === 'groen' && groenRapport.routes.foot.status === STATUS.OK && groenRapport.exitcode === 0, 'CLI schrijft het rapport');
  ok(/foot: ok/.test(groen.stdout), 'CLI print de Nederlandse samenvatting');

  const runRood = path.join(tmp, 'run-rood.json');
  fs.writeFileSync(runRood, JSON.stringify({ routes: { foot: { ...schoon, p95: 34, max: 60 }, ring: { ...schoon, p95: 21, avg: 17 } } }));
  const outRood = path.join(tmp, 'out-rood');
  const rood = runGate([`--json=${runRood}`, `--baseline=${basisSchoon}`, `--out=${outRood}`, '--machine=test-machine']);
  ok(rood.code === EXIT.ROOD, 'CLI rood geeft exit 1', rood);
  ok(/foot: rood/.test(rood.stdout), 'CLI noemt de rode route');

  const outAnder = path.join(tmp, 'out-ander');
  const ander = runGate([`--json=${runSchoon}`, `--baseline=${basisSchoon}`, `--out=${outAnder}`, '--machine=andere-machine']);
  ok(ander.code === EXIT.GROEN, 'andere machine blijft groen', ander);
  const anderRapport = lees(path.join(outAnder, 'perf-gate.json'));
  ok(anderRapport.baseline.vergelijkbaar === false && anderRapport.routes.foot.status === STATUS.ONBESLIST, 'andere machine is onbeslist');

  const runLatentie = path.join(tmp, 'run-latentie.json');
  fs.writeFileSync(runLatentie, JSON.stringify({ routes: { latency: { kind: 'latency', n: 20, msP50: 40, msP95: 60, msMax: 90 } } }));
  const outLeeg = path.join(tmp, 'out-leeg');
  const leeg = runGate([`--json=${runLatentie}`, `--out=${outLeeg}`]);
  ok(leeg.code === EXIT.NIETS_GEMETEN, 'alleen latentiemetingen geven exit 3', leeg);
  ok(lees(path.join(outLeeg, 'perf-gate.json')).verdict === 'niets gemeten', 'rapport zegt niets gemeten');

  const outFout = path.join(tmp, 'out-fout');
  const kapot = runGate([`--json=${path.join(tmp, 'kapot.json')}`, `--out=${outFout}`]);
  ok(kapot.code === EXIT.FOUT && !fs.existsSync(path.join(outFout, 'perf-gate.json')), 'kapotte json geeft exit 2 zonder rapport');
  const geenBasis = runGate([`--json=${runSchoon}`, `--baseline=${path.join(tmp, 'bestaat-niet.json')}`, `--out=${path.join(tmp, 'out-geen-basis')}`]);
  ok(geenBasis.code === EXIT.FOUT, 'ontbrekende baseline geeft exit 2');

  const updatePad = path.join(tmp, 'basis-update.json');
  const outUpdate = path.join(tmp, 'out-update');
  const update = runGate([`--json=${runSchoon}`, '--update', '--reden=na ronde 12', `--baseline=${updatePad}`, `--out=${outUpdate}`, '--machine=test-machine']);
  ok(update.code === EXIT.GROEN, 'update schrijft de baseline', update);
  const geschreven = lees(updatePad);
  ok(geschreven.schema === BASELINE_SCHEMA && !!geschreven.routes.foot && geschreven.machine.id === 'test-machine' && geschreven.reden === 'na ronde 12' && !!geschreven.datum, 'baseline heeft de metadata');
  ok(geschreven.commit === null || /^[0-9a-f]{7,40}$/.test(geschreven.commit), 'commit in de baseline is een sha of leeg');
  ok(validateBaseline(geschreven).ok, 'geschreven baseline valideert');
  ok(!fs.existsSync(path.join(tmp, 'basis-rood.json')) && runGate([`--json=${runRood}`, '--update', '--reden=mag niet', `--baseline=${path.join(tmp, 'basis-rood.json')}`, `--out=${path.join(tmp, 'out-update-rood')}`, '--machine=test-machine']).code === EXIT.ROOD, 'update met normovertreding schrijft niets');
  ok(runGate([`--json=${runSchoon}`, '--update', `--baseline=${path.join(tmp, 'basis-zonder-reden.json')}`, `--out=${path.join(tmp, 'out-update-reden')}`, '--machine=test-machine']).code === EXIT.FOUT && !fs.existsSync(path.join(tmp, 'basis-zonder-reden.json')), 'update zonder reden schrijft niets');

  // De orchestrator geeft alleen --update mee: de reden komt dan uit de omgeving.
  const updateEnvPad = path.join(tmp, 'basis-update-env.json');
  const updateEnv = runGate([`--json=${runSchoon}`, '--update', `--baseline=${updateEnvPad}`, `--out=${path.join(tmp, 'out-update-env')}`, '--machine=test-machine'], { GDE_BASELINE_REDEN: 'nachtronde via orchestrator' });
  ok(updateEnv.code === EXIT.GROEN && lees(updateEnvPad).reden === 'nachtronde via orchestrator', 'update leest de reden uit GDE_BASELINE_REDEN', updateEnv);
  const updateEnvLeegPad = path.join(tmp, 'basis-update-env-leeg.json');
  const updateEnvLeeg = runGate([`--json=${runSchoon}`, '--update', `--baseline=${updateEnvLeegPad}`, `--out=${path.join(tmp, 'out-update-env-leeg')}`, '--machine=test-machine'], { GDE_BASELINE_REDEN: '' });
  ok(updateEnvLeeg.code === EXIT.GROEN && lees(updateEnvLeegPad).reden === 'handmatige update', 'lege omgevingsreden valt terug op handmatige update', updateEnvLeeg);

  const deelA = path.join(tmp, 'deel-a.json');
  const deelB = path.join(tmp, 'deel-b.json');
  fs.writeFileSync(deelA, JSON.stringify({ routes: { foot: schoon } }));
  fs.writeFileSync(deelB, JSON.stringify({ routes: { ring: { ...schoon, p95: 21, avg: 17 } } }));
  const samen = loadRunFiles([deelA, deelB]);
  ok(Object.keys(samen.routes).length === 2 && samen.bronnen.foot === 'deel-a.json' && samen.fouten.length === 0, 'meerdere json-bestanden samenvoegen');
  ok(loadRunFiles([path.join(tmp, 'kapot.json')]).fouten.length === 1 && loadRunFiles([path.join(tmp, 'bestaat-niet.json')]).fouten.length === 1, 'onleesbare invoer is een fout');
  const outSamen = path.join(tmp, 'out-samen');
  const meerdere = runGate([`--json=${deelA},${deelB}`, `--baseline=${updatePad}`, `--out=${outSamen}`, '--machine=test-machine']);
  ok(meerdere.code === EXIT.GROEN && /foot: ok/.test(meerdere.stdout) && /ring: ok/.test(meerdere.stdout), 'CLI leest kommagescheiden json-bestanden', meerdere);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(fails ? `${fails} FAIL` : 'release_perf_test ok');
process.exit(fails ? 1 : 0);
