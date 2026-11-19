// De missie-stings (game/js/sfx/stingen.js) in de echte app: Electron (wegwerpprofiel, één instantie, sluit af) laadt het spel,
// speelt elke sting af en meet het niveau op de gedempte uitgang. Het is een luistergalerij, geen beeld: de uitvoer is
// levels.json met per sting de piek en de rms; het oor beoordeelt de rest (zie docs/SFX-LUISTERLIJST.md).
// Nog niet gedraaid: er is dus niets van deze bouwsteen in de app gehoord of gemeten.
//   node scripts/qa/bouwsteen_stings_beeld.mjs [--out=<map>] [--settle=<ms>]
// Vereist `cd desktop && npm run stage` en een vrij Electron-slot; ELECTRON_EXE=<pad> als de dist ontbreekt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-bouwsteen-stings')));
fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-bsst-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__bs = ${JSON.stringify({ settle: Number(arg('settle', 12000)) })};\n` + fs.readFileSync(path.join(HERE, 'bouwsteen_stings_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--audio-graph', `--bench-eval=${path.join(HERE, 'audiotap.js')}`, '--force-device-scale-factor=1', '--window-size=1280x720',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 15 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let rows = [];
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { rows = JSON.parse(m[1]).results || rows; } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'levels.json'), JSON.stringify(rows, null, 1));
const stil = rows.filter((x) => !x.gepusht || x.peak < 0.002);
console.log(`stings gemeten: ${rows.length}, stil of niet gepusht: ${stil.length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
for (const x of stil) console.log(`  - ${x.naam}: gepusht ${x.gepusht}, piek ${x.peak}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && rows.length && !stil.length ? 0 : 1);
