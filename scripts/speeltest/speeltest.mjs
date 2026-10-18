// Speeltestronde (#186, #5): één commando dat het begin van het spel speelt met de Spelbot, alle
// minigames start, de Electron-verhaaltest draait, alles analyseert en vergelijkt met de vorige ronde
// (nieuw / opgelost / regressie). Lage prioriteit, één Electron tegelijk, wegwerpprofielen.
//   node scripts/speeltest/speeltest.mjs [--base=<map>] [--seed=1] [--max-wall=2400]
//        [--skip-story] [--skip-bot] [--skip-minigames] [--part=all] [--force]
// "Hertest" na een nieuwe main: `cd desktop && npm run stage` en dan hetzelfde commando nog eens;
// het rapport vergelijkt met de laatste ronde in <base>/state.json. Uitvoer: <base>/<tijdstempel>/
// (runmappen met screenshots, analysis.json, rapport.md). Standaard <base> = %TEMP%/gde-speeltest
// (buiten de repo). Maakt geen issues aan; dat doet de coördinator uit rapport.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const split = (s) => String(s || '').split(/\r?\n/);
const BASE = path.resolve(arg('base', path.join(os.tmpdir(), 'gde-speeltest')));
const RUN = path.join(BASE, new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-'));
try { os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten: ga door */ }
const { analyseRun } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'bot', 'analyse.mjs')).href);
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');

if (process.platform === 'win32' && !flag('force')) {
  const t = spawnSync('tasklist', ['/FI', 'IMAGENAME eq electron.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
  if (/electron\.exe/i.test(t.stdout || '')) { console.error('Er draait al een electron.exe; de speeltest wacht niet. Sluit hem of gebruik --force.'); process.exit(3); }
}
fs.mkdirSync(RUN, { recursive: true });
const state = fs.existsSync(path.join(BASE, 'state.json')) ? JSON.parse(fs.readFileSync(path.join(BASE, 'state.json'), 'utf8')) : { runs: {} };

// --- 1. Electron-verhaaltest (screenshot per stap, NaN-controle) ---
function storyTest() {
  const dir = path.join(RUN, 'verhaaltest');
  fs.mkdirSync(dir, { recursive: true });
  const profile = `gde-test-speeltest-story-${process.pid}`;
  const env = { ...process.env, GDE_TEST_PROFILE: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  const t0 = Date.now();
  const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--story-test=${dir}`], { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 20 * 60 * 1000, killSignal: 'SIGKILL' });
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  fs.writeFileSync(path.join(dir, 'run.log'), text);
  const lines = split(text);
  const findings = [];
  const add = (kind, title, detail) => findings.push({ fp: `${kind}:${title}`.toLowerCase().replace(/[\d.]+/g, '#').slice(0, 90), kind, severity: 'bug', step: 'verhaaltest', title, detail: detail || '' });
  if (r.status !== 0) add('verhaaltest', `Verhaaltest eindigt niet met PASS (exit ${r.status}${r.signal ? ' ' + r.signal : ''})`, lines.filter((l) => l.startsWith('[story-test]')).slice(-3).join(' | '));
  for (const l of lines.filter((x) => x.startsWith('[story-test] FAIL'))) add('verhaaltest', l.replace('[story-test] FAIL', 'Verhaaltest-check mislukt:').trim().slice(0, 120));
  for (const l of lines.filter((x) => x.startsWith('[story-test] error'))) add('verhaaltest-fout', l.replace('[story-test] error', 'Verhaaltest-fout:').trim().slice(0, 120));
  const shots = fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).length;
  return { name: 'verhaaltest', dir, findings, metrics: { exit: r.status, wallSeconds: Math.round((Date.now() - t0) / 1000), shots } };
}

// --- 2. Spelbot (verhaal of minigames) ---
function botRun(name, extra) {
  const dir = path.join(RUN, name);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'bot', 'run.mjs'), `--out=${dir}`, `--seed=${arg('seed', 1)}`, ...(flag('force') ? ['--force'] : []), ...extra], { stdio: 'inherit' });
  if (r.status === 3) { console.error('Er draait al een Electron; gestopt.'); process.exit(3); }
  if (!fs.existsSync(path.join(dir, 'events.jsonl'))) return { name, dir, findings: [{ fp: `leeg:${name}`, kind: 'run', severity: 'bug', step: name, title: `De ${name}-run leverde niets op (exit ${r.status})`, detail: '' }], metrics: {} };
  const a = analyseRun(dir, { base: path.join(BASE, `vorige-${name}`) });
  return { name, dir, findings: a.findings, metrics: a.metrics, shots: a.shots };
}

const runs = [];
if (!flag('skip-story')) runs.push(storyTest());
if (!flag('skip-bot')) runs.push(botRun('verhaal', [`--part=${arg('part', 'all')}`, `--max-wall=${arg('max-wall', 2400)}`, '--stuck=30']));
if (!flag('skip-minigames')) runs.push(botRun('minigames', ['--mode=minigames', `--max-wall=${arg('max-wall-mg', 1500)}`]));

// --- 3. Vergelijken met de vorige ronde ---
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'desktop', 'package.json'), 'utf8')).version;
let commit = '';
try { commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim(); } catch { /* geen git */ }
const out = [`# Speeltestronde ${path.basename(RUN)}`, '', `Versie ${version}, commit ${commit}. Runmappen: ${RUN}`, ''];
const newState = { at: new Date().toISOString(), run: RUN, commit, runs: {}, everSeen: { ...(state.everSeen || {}) } };
for (const r of runs) {
  const prev = state.runs && state.runs[r.name];
  const has = new Set(r.findings.map((f) => f.fp));
  const seenBefore = new Set((state.everSeen && state.everSeen[r.name]) || []);
  const prevFp = new Set(prev ? prev.fps : []);
  const nieuw = r.findings.filter((f) => !prevFp.has(f.fp) && !seenBefore.has(f.fp));
  const regressie = r.findings.filter((f) => !prevFp.has(f.fp) && seenBefore.has(f.fp));
  const opgelost = prev ? prev.findings.filter((f) => !has.has(f.fp)) : [];
  newState.runs[r.name] = { fps: [...has], findings: r.findings.map((f) => ({ fp: f.fp, title: f.title, step: f.step })), metrics: r.metrics };
  newState.everSeen[r.name] = [...new Set([...seenBefore, ...has])];
  out.push(`## ${r.name}`, '', `Cijfers: ${JSON.stringify(Object.fromEntries(Object.entries(r.metrics || {}).filter(([, v]) => typeof v !== 'object')))}`, `Map: ${r.dir}`, '');
  if (!prev) out.push('Eerste ronde: alles geldt als nieuw.', '');
  const list = (t, a) => { out.push(`${t} (${a.length})`, ''); for (const f of a) out.push(`- [${f.severity || 'bug'}] ${f.title}${f.step ? ` (${f.step})` : ''}${f.detail ? `: ${String(f.detail).slice(0, 140)}` : ''}`); out.push(''); };
  list('Nieuw', nieuw); list('Regressie (was opgelost, nu terug)', regressie); list('Opgelost', opgelost);
  out.push(`Blijft: ${r.findings.length - nieuw.length - regressie.length}`, '');
}
fs.mkdirSync(BASE, { recursive: true });
fs.writeFileSync(path.join(BASE, 'state.json'), JSON.stringify(newState, null, 1));
fs.writeFileSync(path.join(RUN, 'rapport.md'), out.join('\n'));
console.log(`rapport: ${path.join(RUN, 'rapport.md')}`);
