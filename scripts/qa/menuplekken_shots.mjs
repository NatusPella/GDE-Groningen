// Opnames van de standpunten achter het hoofdmenu (#380): per plek een of meer beelden, zoals de camera ze kiest of met een vaste
// kant en tijdstip, in één Electron-instantie (wegwerpprofiel, geen echte opslag).
//   node scripts/qa/menuplekken_shots.mjs --meet [--start]   (alleen de laadtijd van het menu: de laadmarkeringen en de poort; met --start daarna Nieuw spel en hoe lang het duurt voor de startplek is ingeladen)
//   node scripts/qa/menuplekken_shots.mjs [--out=<map>] [--ids=a,b] [--hoeken=270,315] [--uur=9.5] [--beweging=baan] [--t=3] [--menu] [--w=1280x720]
// Zonder --ids alle plekken. Per plek en hoek: shots-<id>[-<hoek>].png; menuplekken.json met per beeld hoe lang de wereld erbij
// moest laden (wacht_ms), het uur en de camerakant. --menu laat het menu zelf in beeld (anders is alleen de wereld te zien).
// Neemt zelf een Electron-slot (<GDE_LOCKS>/README.txt, standaard ~/gde-locks) en geeft het weer vrij.
// Vereist een gestagede wereld (cd desktop && npm run stage, of GDE_GAME_DIR/ELECTRON_EXE: docs/ONTWIKKELEN.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-menuplekken')));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
fs.mkdirSync(OUT, { recursive: true });

// een Electron-slot: mkdir faalt als het bezet is; elke 60 s opnieuw
const slot = (() => {
  for (let wacht = 0; wacht < 1440; wacht++) {
    for (const n of [1, 2, 3]) {
      const d = path.join(LOCKS, `electron-${n}`);
      try { fs.mkdirSync(d); return d; } catch (e) { /* bezet */ }
    }
    if (wacht % 60 === 0) console.log('wacht op een Electron-slot...');
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},5000)'], { timeout: 6000 });
  }
  return null;
})();
if (!slot) { console.error('geen Electron-slot gekregen'); process.exit(2); }
const profile = `gde-test-mp-${process.pid}`;
try {
  const jobs = { ids: arg('ids', ''), hoeken: arg('hoeken', '').split(',').filter(Boolean).map(Number), uur: arg('uur', ''), beweging: arg('beweging', ''), t: Number(arg('t', 3)), menu: process.argv.includes('--menu'), start: process.argv.includes('--start') };
  const script = path.join(OUT, '_page.js');
  fs.writeFileSync(script, `window.__mp = ${JSON.stringify(jobs)};\n` + fs.readFileSync(path.join(HERE, process.argv.includes('--meet') ? 'menuplekken_laad.page.js' : 'menuplekken_shots.page.js'), 'utf8'));
  const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${arg('w', '1280x720')}`,
    `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 45 * 60 * 1000, killSignal: 'SIGKILL' });
  if (r.error) console.error('Electron starten mislukt:', r.error.message);
  fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
  fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  let full = {};
  for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
  fs.writeFileSync(path.join(OUT, 'menuplekken.json'), JSON.stringify(full, null, 1));
  console.log('start:', JSON.stringify(full.start || {}));
  if (full.spel) console.log('spel:', JSON.stringify(full.spel));
  for (const b of full.beelden || []) console.log(b.naam, b.fout ? 'FOUT ' + b.fout : `uur ${b.uur} hoek ${b.hoek} ${b.beweging} wacht ${b.wacht_ms} ms`);
  console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}`);
  process.exitCode = r.status === 0 && (full.beelden || []).length ? 0 : 1;
} finally {
  try { fs.rmdirSync(slot); } catch (e) { /* al weg */ }
}
