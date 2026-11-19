// Schermafbeeldingen van de regelkaart per missiestap (game/js/regelkaart.js): Electron (wegwerpprofiel, één instantie, sluit af) laadt het spel en loopt
// bouwsteen_regelkaart_beeld.page.js af. Nog niet gedraaid: er is dus geen beeld van deze bouwsteen in de app gezien.
//   node scripts/qa/bouwsteen_regelkaart_beeld.mjs [--out=<map>] [--size=1600x900] [--settle=<ms>]
// Vereist `cd desktop && npm run stage` en een vrij Electron-slot; ELECTRON_EXE=<pad> als de dist ontbreekt.
// Uitvoer: <out>/shots-*.png (per [capture]-regel), features.json, run.log. Exit 0 als er geen fouten waren.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-bouwsteen-regelkaart')));
const SIZE = arg('size', '1600x900');
const SETTLE = Number(arg('settle', 6000));

fs.mkdirSync(OUT, { recursive: true });
const WACHT = `await new Promise((r) => setTimeout(r, ${SETTLE}));\n`;
const profile = `gde-test-bsre-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + fs.readFileSync(path.join(HERE, 'bouwsteen_regelkaart_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`,
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
const res = full.results || {};
fs.writeFileSync(path.join(OUT, 'features.json'), JSON.stringify(res, null, 1));
const g = res.regelkaart || {};
const fouten = g.fouten || ['geen resultaat van de pagina'];
console.log(`standen: ${g.standen || 0}, fouten: ${fouten.length}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
for (const f of fouten) console.log(`  - ${f}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && g.standen && !fouten.length ? 0 : 1);
