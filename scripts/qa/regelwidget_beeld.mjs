// Schermafbeeldingen van de regelwidget (#987): elke widget (limiet, teller, voorraad, wijzer, timing, toets, stappen) in
// elke stand, met beweging en met 'Beweging beperken'. Electron (wegwerpprofiel, één instantie, sluit af) laadt het spel en
// loopt regelwidget_beeld.page.js af, dat de module uit /js/regelwidget.js importeert.
//   node scripts/qa/regelwidget_beeld.mjs [--out=<map>] [--size=1600x900] [--settle=<ms>]
// Vereist `cd desktop && npm run stage` (de gestagede game/ met regelwidget.js en .css). ELECTRON_EXE=<pad> als
// desktop/node_modules/electron/dist ontbreekt. Draai alleen als de Electron-instantie vrij is (er mag er één tegelijk).
// Uitvoer: <out>/shots-rw-<type>-<stand>-<beweging|statisch>.png, features.json (fouten, kleinste tekst, overloop,
// aria-rollen, lopende animaties), run.log. Exit 0 als alle standen laadden en features.json geen fouten bevat.
// Nog niet gedraaid: er is dus geen beeld van de widgets in de app gezien.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-regelwidget')));
const SIZE = arg('size', '1600x900');
const SETTLE = Number(arg('settle', 6000));

fs.mkdirSync(OUT, { recursive: true });
const WACHT = `await new Promise((r) => setTimeout(r, ${SETTLE}));\n`;
const profile = `gde-test-rw-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + fs.readFileSync(path.join(HERE, 'regelwidget_beeld.page.js'), 'utf8'));
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
const g = res.regelwidget || {};
const fouten = g.fouten || ['geen resultaat van de pagina'];
console.log(`standen: ${g.standen || 0}, fouten: ${fouten.length}, overloop: ${(g.overloop || []).length}, kleinste tekst: ${g.kleinsteTekst ? g.kleinsteTekst.px : '?'} px, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
for (const f of fouten) console.log(`  - ${f}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && g.standen && !fouten.length && !(g.overloop || []).length ? 0 : 1);
