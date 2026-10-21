// Gerichte scène-opnames voor de issues met het label wacht-beeld (headless Electron, wegwerpprofiel).
//   node scripts/qa/wachtbeeld.mjs --jobs=<jobs.json> [--out=<map>] [--settle=7000]
// Neem eerst een Electron-slot (<GDE_LOCKS>/README.txt, standaard ~/gde-locks). Vereist een gestagede wereld
// (cd desktop && npm run stage); ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt.
// Uitvoer: <out>/shots-<naam>.png, wachtbeeld.json, run.log. De jobs staan in wachtbeeld.page.js beschreven.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-wachtbeeld')));
const jobs = JSON.parse(fs.readFileSync(path.resolve(arg('jobs')), 'utf8'));
for (const j of jobs) if (j.file) j.code = fs.readFileSync(path.resolve(path.dirname(path.resolve(arg('jobs'))), j.file), 'utf8'); // kind 'code': de job staat in een los bestand
fs.mkdirSync(OUT, { recursive: true });
// zoals de sweep: wachten op de wereld, het startscherm weg (Enter), even rust
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || !s.classList.contains('visible')) break; const it = (window.__menuStart ? { click: () => window.__menuStart('nieuw') } : null); if (it) it.click(); else kEnter(); await new Promise((r) => setTimeout(r, 3000)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
const profile = `gde-test-wb-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + `window.__wb = ${JSON.stringify({ jobs, settle: Number(arg('settle', 7000)) })};\n` + fs.readFileSync(path.join(HERE, 'wachtbeeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NIEUW_VERHAAL: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'wachtbeeld.json'), JSON.stringify(full, null, 1));
for (const j of full.jobs || []) console.log(j.name, j.fout ? 'FOUT ' + j.fout.slice(0, 120) : 'ok', JSON.stringify(j.verkeer || j.at || ''));
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
process.exit(r.status === 0 && (full.jobs || []).length ? 0 : 1);
