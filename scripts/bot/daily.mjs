// Spelbot fase 5 (#186): de dagelijkse run in één commando. Draait achter elkaar (één Electron
// tegelijk) het verhaal, de minigames en op verzoek het geluid, analyseert elke run, vergelijkt met
// de vorige dag, werkt issues bij (droog, tenzij --create) en schrijft een Nederlandse samenvatting.
//   node scripts/bot/daily.mjs [--base=<map>] [--part=all] [--seed=1] [--create] [--audio] [--skip-story] [--skip-minigames]
// Uitvoer: <base>/<datum>/{verhaal,minigames}/ (runmappen) en <base>/<datum>/samenvatting.md.
// Standaard <base> = %TEMP%/gde-spelbot-dagelijks (buiten de repo). Eerste keer plannen op Windows:
//   schtasks /Create /SC DAILY /ST 04:30 /TN "GDE Spelbot" /TR "node <repo>\scripts\bot\daily.mjs" 
// Niet starten als er al een Electron draait (dan sluit het script af met code 3 en een melding).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const BASE = path.resolve(arg('base', path.join(os.tmpdir(), 'gde-spelbot-dagelijks')));
const date = new Date().toISOString().slice(0, 10);
const DAY = path.join(BASE, date);
const { analyseRun } = await import(pathToFileURL(path.join(HERE, 'analyse.mjs')).href);
const A = await import(pathToFileURL(path.join(HERE, 'analysis.mjs')).href);

const jobs = [];
if (!flag('skip-story')) jobs.push({ name: 'verhaal', args: [`--part=${arg('part', 'all')}`, `--max-wall=${arg('max-wall', 5400)}`] });
if (!flag('skip-minigames')) jobs.push({ name: 'minigames', args: ['--mode=minigames', `--max-wall=${arg('max-wall-mg', 1500)}`] });
fs.mkdirSync(DAY, { recursive: true });
const parts = [`# Spelbot, dagelijkse run ${date}`, ''];
let exit = 0;
for (const j of jobs) {
  const out = path.join(DAY, j.name);
  const r = spawnSync(process.execPath, [path.join(HERE, 'run.mjs'), `--out=${out}`, `--seed=${arg('seed', 1)}`, ...(flag('audio') ? ['--audio'] : []), ...j.args], { stdio: 'inherit' });
  if (r.status === 3) { console.error('Er draait al een Electron-instantie: de dagelijkse run is overgeslagen.'); process.exit(3); }
  if (!fs.existsSync(path.join(out, 'events.jsonl'))) { parts.push(`## ${j.name}`, '', `De run leverde niets op (exit ${r.status}).`, ''); exit = 1; continue; }
  const cur = analyseRun(out, { base: path.join(BASE, `vorige-${j.name}`) });
  let issues = [];
  try {
    const { syncIssues } = await import(pathToFileURL(path.join(HERE, 'issues.mjs')).href);
    issues = await syncIssues(out, { create: flag('create'), log: (l) => console.log(l) });
  } catch (e) { console.error(`issues: ${e.message}`); parts.push(`(issues bijwerken mislukte: ${e.message})`, ''); }
  parts.push(`## ${j.name}`, '', A.nlSummary({ title: j.name, date, metrics: cur.metrics, cmp: cur.cmp, findings: cur.findings, issues, audio: cur.audio }).split('\n').slice(2).join('\n'), `Runmap: ${out}`, '');
}
fs.writeFileSync(path.join(DAY, 'samenvatting.md'), parts.join('\n'));
console.log(`samenvatting: ${path.join(DAY, 'samenvatting.md')}`);
process.exit(exit);
