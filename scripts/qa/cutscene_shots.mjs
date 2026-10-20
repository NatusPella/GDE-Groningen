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
const PROBE = arg('probe', ''); // M22.4:51.1:1300x580,400x590 = wat zit er achter die pixels
const DENSE = arg('dense', ''); // M02.intro:6:5 = vijf beelden verspreid over shot 6

fs.mkdirSync(OUT, { recursive: true });
// het startscherm weg (Enter zolang het zichtbaar is): op een drukke machine verschijnt het na de Enter van de harnas
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || !s.classList.contains('visible')) break; const it = [...s.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent)); if (it) it.click(); else kEnter(); await new Promise((r) => setTimeout(r, 3000)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
const profile = `gde-test-cs-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + `window.__cs = ${JSON.stringify({ only: ONLY.split(",").filter(Boolean), settle: SETTLE, probe: PROBE ? (([id, t, px]) => ({ id, t: Number(t), px: px.split(',').map((q) => q.split('x').map(Number)) }))(PROBE.split(':')) : undefined, dense: DENSE ? Object.fromEntries(DENSE.split(',').map((d) => { const [id, shot, n] = d.split(':'); return [id, { shot: Number(shot), n: Number(n) || 4 }]; })) : undefined })};\n` + fs.readFileSync(path.join(HERE, 'cutscene_shots.page.js'), 'utf8'));
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
