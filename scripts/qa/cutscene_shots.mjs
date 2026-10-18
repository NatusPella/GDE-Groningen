// Screenshot per shot van de geregisseerde scènes in de echte wereld (#136, #209).
// Electron (wegwerpprofiel, één instantie, sluit af) loopt cutscene_shots.page.js een korte
// scripted check per functie af en bewaart per check screenshots en consolefouten.
//   node scripts/qa/cutscene_shots.mjs [--out=<map>] [--only=kaart,wanted] [--settle=<ms>]
// Vereist `cd desktop && npm run stage`. ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-<check>[-<n>].png, features.json (per check: issues, notities, meldingen), run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-cutscenes')));
const ONLY = arg('only', '');
const SETTLE = Number(arg('settle', 8000));

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-cs-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__cs = ${JSON.stringify({ only: ONLY.split(",").filter(Boolean), settle: SETTLE })};\n` + fs.readFileSync(path.join(HERE, 'cutscene_shots.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 45 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const lines = (r.stdout || '').split('\n');
let full = {};
for (const l of lines) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
const res = full.results || {};
for (const l of lines) { const m = l.match(/^\[fs-check\] (\S+) (.*)$/); if (m && !res[m[1]]) try { res[m[1]] = JSON.parse(m[2]); } catch { /* ingekort */ } }
fs.writeFileSync(path.join(OUT, 'features.json'), JSON.stringify(res, null, 1));
const renderer = lines.filter((l) => /^\[renderer\]/.test(l));
console.log(`checks: ${Object.keys(res).length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}, [renderer]-regels in log: ${renderer.length}, NaN-regels: ${lines.filter((l) => /NaN/i.test(l) && !/perf-script|fs-check/.test(l)).length}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && Object.keys(res).length ? 0 : 1);
