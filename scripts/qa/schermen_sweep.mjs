// QA-sweep van de belangrijkste schermen op vijf formaten, met detectors in plaats van een menselijk oog (#988 #985):
// start, hud, pauze/Spel-rail, Samen spelen-hub, Te doen, Kaart, Prestaties, Instellingen, Spullen, Garage, telefoon/verhaal,
// Loopbaan, Besturing, winkel. Meet buiten beeld, afgekapte tekst, bedekte klikdoelen, contrast, tekst onder 13 px, focus
// (toets, controller, focusring), console-errors en NaN-waarschuwingen (schermen_sweep.page.js).
//   node scripts/qa/schermen_sweep.mjs [--out=<map>] [--formaten=1280x720,1920x1080,800x360t,1024x768,2560x1080] [--schermen=kaart,winkel]
//                                       [--settle=6000] [--slot=2]   (--slot: wacht tot er hooguit zoveel game-Electrons draaien)
// Elk formaat is een eigen Electron-start met een wegwerpprofiel (GDE_TEST_PROFILE onder <out>), een "t" achter het formaat zet de raakbediening aan.
// GDE_GAME_DIR=<gestagede game-map> (backslashes), ELECTRON_EXE=<pad>, GDE_ELECTRON_FLAGS="--no-sandbox --in-process-gpu" zoals bij de spelbot.
// Uitvoer: <out>/sweep-<formaat>.json en <out>/sweep.json (alles samen); exit 0 als elk formaat een resultaat gaf.
// `node scripts/qa/schermen_sweep.mjs --samenvatting=<sweep.json>` drukt een korte tabel af (voor docs/QA-SWEEP-20-11.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

// Een tabel van een eerder resultaat: per formaat en scherm het aantal bevindingen per detector.
if (arg('samenvatting', '')) {
  const j = JSON.parse(fs.readFileSync(arg('samenvatting'), 'utf8'));
  const KOLOM = ['buitenBeeld', 'afgekapt', 'bedekt', 'contrast', 'klein', 'geenFocus', 'geenControllerFocus', 'geenFocusring', 'kleinDoel'];
  console.log(['formaat', 'scherm', ...KOLOM].join('\t'));
  for (const [f, r] of Object.entries(j)) for (const [s, m] of Object.entries(r.schermen || {})) console.log([f, s, ...KOLOM.map((k) => (m[k] || []).length)].join('\t'));
  process.exit(0);
}

const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-sweep')));
const FORMATEN = arg('formaten', '1280x720,1920x1080,800x360t,1024x768,2560x1080').split(',').filter(Boolean);
const SLOT = Number(arg('slot', 0));
fs.mkdirSync(OUT, { recursive: true });
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const body = fs.readFileSync(path.join(HERE, 'schermen_sweep.page.js'), 'utf8');

// Hoeveel game-Electrons draaien er al (alleen de hoofdprocessen; Windows)? Zonder PowerShell: 0.
function draaiend() {
  if (process.platform !== 'win32') return 0;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', "(Get-CimInstance Win32_Process -Filter \"Name='electron.exe'\" | Where-Object { $_.CommandLine -notmatch '--type=' -and $_.CommandLine -match 'smoke-test|perf-script|autoplay' }).Count"], { encoding: 'utf8' });
  return Number((r.stdout || '').trim()) || 0;
}
const slaap = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const alles = {};
let gelukt = 0;
for (const f of FORMATEN) {
  const m = f.match(/^(\d{3,4})x(\d{3,4})(t?)$/);
  if (!m) { console.error('onbekend formaat', f); continue; }
  const [, w, h, t] = m;
  if (SLOT) for (let i = 0; i < 40 && draaiend() > SLOT; i++) { console.log(`wacht op een Electron-plek (${draaiend()} draaien)`); slaap(60000); }
  const dir = path.join(OUT, `${w}x${h}${t ? 't' : ''}`);
  fs.mkdirSync(dir, { recursive: true });
  const profile = path.join(dir, `profiel-${process.pid}`);
  fs.mkdirSync(profile, { recursive: true });
  const script = path.join(dir, '_page.js');
  fs.writeFileSync(script, `window.__sw = ${JSON.stringify({ naam: f, touch: !!t, settle: Number(arg('settle', 6000)), schermen: arg('schermen', '').split(',').filter(Boolean) })};\n` + body);
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1', GDE_NO_THROTTLE: '1' };
  if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = (process.env.GDE_ELECTRON_FLAGS || '').split(' ').filter(Boolean);
  const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${w}x${h}`, ...(t ? ['--touch'] : []),
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(dir, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 12 * 60 * 1000, killSignal: 'SIGKILL' });
  fs.writeFileSync(path.join(dir, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
  let j = null;
  if (l) { try { j = JSON.parse(l.slice(14)); } catch { /* */ } }
  // NaN-waarschuwingen en errors uit het log van Electron zelf (geometrie, three.js)
  const log = `${r.stdout || ''}\n${r.stderr || ''}`;
  const nan = log.split('\n').filter((x) => /NaN/.test(x)).slice(0, 5);
  if (j) { j.logNaN = nan; alles[f] = j; fs.writeFileSync(path.join(dir, `sweep-${f}.json`), JSON.stringify(j, null, 1)); gelukt++; }
  console.log(`${f}: ${j ? Object.keys(j.schermen).length + ' schermen, ' + (j.fouten || []).length + ' console-fouten, ' + (j.overgeslagen || []).join('; ') : 'geen resultaat (exit ' + r.status + ')'}`);
}
fs.writeFileSync(path.join(OUT, 'sweep.json'), JSON.stringify(alles, null, 1));
console.log(`uitvoer: ${OUT}`);
process.exit(gelukt === FORMATEN.length ? 0 : 1);
