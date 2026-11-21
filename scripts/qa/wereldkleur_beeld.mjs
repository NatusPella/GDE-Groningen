// Wereldkleurbeelden (wereldkleur 21-11, worldpalette.js): één Electron (wegwerpprofiel) op 1280x720 bezoekt de plekken van PLEKKEN en neemt per plek één beeld
// (wk-<naam>), met de menging van de wereldkleuren op ?dswereld=<meng>. Draai het voor meng 0 (oud), 0.25 en 0.5 en leg de mappen naast elkaar (wereldkleur_plaat.mjs).
//   node scripts/qa/wereldkleur_beeld.mjs --meng=0.25 --out=<map> [--only=1,3]
// GDE_GAME_DIR (gestagede game, evt. met prebuilt wereld), ELECTRON_EXE, GDE_ELECTRON_EXTRA_ARGS (--no-sandbox,--in-process-gpu). Uitvoer: <out>/shots-wk-*.png, wereldkleur.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-wk')));
fs.mkdirSync(OUT, { recursive: true });
const MENG = arg('meng', '0.25');
const ONLY = arg('only', '').split(',').filter(Boolean);
// De plekken: Grote Markt, binnenstad (straatbeeld), avond, nacht, regen, ommeland, haven/water, kermis, woonwijk.
export const PLEKKEN = [
  { naam: '1-grotemarkt-dag', x: 106.3, y: 58.6, oog: true, a: 2.798, klok: 'dag' },
  { naam: '2-binnenstad-dag', x: 507.4, y: -164.4, oog: true, a: 0.138, klok: 'dag' },
  { naam: '3-grotemarkt-avond', x: 106.3, y: 58.6, oog: true, a: 2.798, klok: 'avond' },
  { naam: '4-grotemarkt-nacht', x: 106.3, y: 58.6, oog: true, a: 2.798, klok: 'nacht' },
  { naam: '5-binnenstad-regen', x: 507.4, y: -164.4, oog: true, a: 0.138, klok: 'dag', weer: 'regen' },
  { naam: '6-ommeland', x: 2814.7, y: -20406.3, d: 120, az: 0.8, h: 8, lz: 10, klok: 'dag' },
  { naam: '7-haven-water', x: -874, y: 566, d: 70, az: 3.9, h: 26, lz: 0, klok: 'dag' },
  { naam: '8-kermis', x: 173.3, y: 108.2, d: 45, az: 2.2, h: 8, lz: 3, klok: 'avond' },
  { naam: '9-woonwijk', x: -768.5, y: -1144.3, d: 260, az: 0.5, h: 20, lz: 6, klok: 'dag' },
].filter((q) => !ONLY.length || ONLY.some((o) => q.naam.startsWith(o + '-')));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const profile = process.env.GDE_PROFILE_DIR || `gde-test-wk-${process.pid}`;
  const script = path.join(OUT, '_page.js');
  fs.writeFileSync(script, `window.__wk = ${JSON.stringify({ plekken: PLEKKEN })};\n` + fs.readFileSync(path.join(HERE, 'wereldkleur_beeld.page.js'), 'utf8'));
  const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
  if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = (process.env.GDE_ELECTRON_EXTRA_ARGS || '').split(',').filter(Boolean);
  const r = spawnSync(electron, ['.', ...extra, `--url-flags=dswereld=${MENG}`, '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720',
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
  if (r.error) console.error('Electron starten mislukt:', r.error.message);
  fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
  fs.rmSync(path.resolve(os.tmpdir(), profile), { recursive: true, force: true });
  const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
  if (l) fs.writeFileSync(path.join(OUT, 'wereldkleur.json'), l.slice(14));
  console.log(l ? 'klaar' : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
  process.exit(l ? 0 : 1);
}
