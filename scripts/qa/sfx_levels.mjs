// Spelt elk effect van ?sfxtest af in de gestagede build en meet het niveau voor de gedempte uitgang (#173).
//   node scripts/qa/sfx_levels.mjs [--out=<map>] [--only=fx:shop_bell,ev:3] [--settle=<ms>]
// Vereist `cd desktop && npm run stage`, een Electron-slot (C:/Users/abuis/gde-locks) en een wegwerpprofiel.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-sfx')));
fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-sl-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__sl = ${JSON.stringify({ settle: Number(arg('settle', 15000)), only: arg('only', '').split(',').filter(Boolean) })};\n` + fs.readFileSync(path.join(HERE, 'sfx_levels.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--audio-graph', `--bench-eval=${path.join(HERE, 'audiotap_fast.js')}`, '--force-device-scale-factor=1', '--window-size=1280x720',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 40 * 60 * 1000, killSignal: 'SIGKILL' });
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let rows = [];
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { rows = JSON.parse(m[1]).results || rows; } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'levels.json'), JSON.stringify(rows, null, 1));
console.log(`effecten gemeten: ${rows.length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}\nuitvoer: ${OUT}`);
process.exit(rows.length ? 0 : 1);
