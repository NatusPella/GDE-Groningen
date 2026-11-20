// Schermafbeeldingen van de designsysteem-galerij (#980): game/ds-galerij.html met de tokens en
// componenten van ds-tokens.css en ds-components.css in alle toestanden, op papier en op glas.
// Electron (wegwerpprofiel, één instantie, sluit af) laadt de galerij in een iframe en loopt ds_galerij.page.js af.
//   node scripts/qa/ds_galerij.mjs [--out=<map>] [--size=1600x900] [--settle=<ms>]
// Vereist `cd desktop && npm run stage` (de gestagede game/ met ds-galerij.html). ELECTRON_EXE=<pad> als
// desktop/node_modules/electron/dist ontbreekt. Draai alleen als de Electron-instantie vrij is (er mag er één tegelijk).
// Uitvoer: <out>/shots-ds-<sectie>-<papier|glas>.png, features.json (fouten, kleinste tekst, overloop, focus,
// beweging), run.log. Exit 0 als de pagina laadde en features.json geen fouten bevat.
// Beeldcontrole: draai het in Electron; zonder run is er geen beeld van de galerij gezien.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-ds-galerij')));
const SIZE = arg('size', '1600x900');
const SETTLE = Number(arg('settle', 6000));

fs.mkdirSync(OUT, { recursive: true });
// De galerij hoeft het spel niet te starten; wacht alleen tot de pagina er is.
const WACHT = `await new Promise((r) => setTimeout(r, ${SETTLE}));\n`;
const profile = `gde-test-dsg-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + fs.readFileSync(path.join(HERE, 'ds_galerij.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile };
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`,
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 10 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
const lines = (r.stdout || '').split('\n');
let full = {};
for (const l of lines) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
const res = full.results || {};
fs.writeFileSync(path.join(OUT, 'features.json'), JSON.stringify(res, null, 1));
const g = res.ds_galerij || {};
const fouten = g.fouten || ['geen resultaat van de pagina'];
console.log(`secties: ${Object.keys(g.secties || {}).length}, fouten: ${fouten.length}, overloop: ${(g.overloop || []).length}, kleinste tekst: ${g.kleinsteTekst ? g.kleinsteTekst.px : '?'} px, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
for (const f of fouten) console.log(`  - ${f}`);
console.log(`uitvoer: ${OUT}`);
process.exit(r.status === 0 && Object.keys(res).length && !fouten.length && !(g.overloop || []).length ? 0 : 1);
