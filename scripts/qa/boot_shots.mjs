// De allereerste laadscherm(en) van het spel (index.html #loading) vastleggen, één Electron met een
// wegwerpprofiel: elke 400 ms een screenshot tot het scherm weg is.
//   node scripts/qa/boot_shots.mjs [--out=<map>]
// Uitvoer: <out>/boot-NN.png, boot.json (per beeld: aantal balken, 18-pictogram, status), run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-boot')));
fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-boot-${process.pid}`;
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1600x900',
  `--smoke-test=${path.join(OUT, 'smoke.png')}`, `--bench-eval=${path.join(HERE, 'bootcap.js')}`, `--boot-capture=${OUT}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 5 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const infos = (r.stdout || '').split('\n').map((l) => l.match(/^\[bootinfo\] (.*)$/)).filter(Boolean).map((m) => JSON.parse(m[1]));
fs.writeFileSync(path.join(OUT, 'boot.json'), JSON.stringify(infos, null, 1));
const shots = fs.readdirSync(OUT).filter((f) => /^boot-\d+\.png$/.test(f)).length;
console.log(`beelden: ${shots}, infos: ${infos.length}, max balken: ${Math.max(0, ...infos.map((i) => i.bars))}, exit ${r.status}`);
console.log(`uitvoer: ${OUT}`);
process.exit(shots ? 0 : 1);
