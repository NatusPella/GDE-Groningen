// Beelden voor de README (docs/screenshots/): één Electron-run op 1920x1080 met vaste camerastanden, een vaste
// tijd van de dag en het weer, het voorinstelling Hoog, en geen HUD waar die het beeld zou storen.
//   node scripts/qa/readme_shots.mjs [--out=<map>] [--only=a,b] [--settle=7000] [--slot] [--lijst] [--scout=<json>]
// --scout=<bestand> --only=scout: probeert camerastanden uit ([{ name, cam: [x, y, hoogte], look: [x, y, hoogte], clock, hold, settle }]); elk wordt een beeld.
//   node scripts/qa/readme_shots.mjs --optimaliseer [--out=<map met PNG's>] [--naar=docs/screenshots]
// Eerst `--lijst` voor de namen. Een Electron-slot (<gde-locks>/README.txt) en een wegwerpprofiel; Electron en een
// gestagede wereld: `GDE_GAME_DIR=<gestagede game-map>` en `ELECTRON_EXE=<pad>` als de worktree er geen heeft.
// Uitvoer: <out>/shots-<naam>.png, readme_shots.json (per beeld wat er gemeten is), run.log. Met --optimaliseer worden de
// PNG's met ffmpeg verkleind (1600 px breed, webp) naar docs/screenshots/. Niemand heeft de beelden gezien tot een mens
// ze bekeken heeft; kies er alleen die er goed uitzien. Netwerk wordt niet gebruikt (de wachtkamer is een nagebootste staat).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-readme-shots')));
const ONLY = arg('only', '');

if (flag('optimaliseer')) {
  // 1600 px breed, webp, richtbedrag 250 KB per beeld; kwaliteit 90, zakt tot het past
  const naar = path.resolve(arg('naar', path.join(ROOT, 'docs', 'screenshots')));
  fs.mkdirSync(naar, { recursive: true });
  const bronnen = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f) && (!ONLY || ONLY.split(',').includes(f.replace(/^shots-|\.png$/g, ''))));
  for (const f of bronnen) {
    const naam = f.replace(/^shots-/, '').replace(/\.png$/, '');
    const doel = path.join(naar, `${naam}.webp`);
    let q = 90;
    for (; q >= 40; q -= 6) {
      const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path.join(OUT, f), '-vf', 'scale=1600:-2:flags=lanczos', '-c:v', 'libwebp', '-quality', String(q), doel], { encoding: 'utf8' });
      if (r.status !== 0) { console.error('ffmpeg faalde voor', f, r.stderr); process.exit(1); }
      if (fs.statSync(doel).size <= 250 * 1024) break;
    }
    console.log(`${naam}.webp ${Math.round(fs.statSync(doel).size / 1024)} KB (kwaliteit ${q})`);
  }
  process.exit(0);
}

try { os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen recht: gewone prioriteit; Electron erft dit */ }
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
let slot = null;
if (flag('slot')) {
  // een Electron-slot nemen (mkdir faalt als het bezet is), wachten tot er een vrij is; altijd vrijgeven
  fs.mkdirSync(LOCKS, { recursive: true });
  for (let i = 0; i < 40000 && !slot; i++) {
    for (const n of [1, 2, 3]) { try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); break; } catch { /* bezet */ } }
    if (!slot) { if (i === 0) console.log('alle Electron-slots bezet; wacht'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400); }
  }
  if (!slot) { console.error('geen slot gekregen'); process.exit(3); }
  const geef = () => { try { fs.rmdirSync(slot); } catch { /* al weg */ } };
  process.on('exit', geef);
  process.on('SIGINT', () => { geef(); process.exit(130); });
}

fs.mkdirSync(OUT, { recursive: true });
const page = fs.readFileSync(path.join(HERE, 'readme_shots.page.js'), 'utf8');
if (flag('lijst')) {
  const namen = [...page.matchAll(/^\s*shot\('([a-z0-9-]+)'/gm)].map((m) => m[1]);
  console.log(namen.join('\n'));
  process.exit(0);
}
// zoals de sweep: wachten op de wereld, het startscherm weg (Enter), even rust
const WACHT = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world); i++) await new Promise((r) => setTimeout(r, 500));\n'
  + `const kEnter = () => { for (const t of [window, document]) { t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })); t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true })); } };
for (let i = 0; i < 40; i++) { const s = document.querySelector('#start-screen'); if (!s || !s.classList.contains('visible')) break; const nw = document.querySelector('#saveslots .ssl-new [data-do]'); const it = [...s.querySelectorAll('.ss-item')].find((e) => /nieuw spel/i.test(e.textContent)); if (nw) nw.click(); else if (it) it.click(); else if (window.__menuStart && window.__menuStart('nieuw')) { /* gestart */ } else { const so = s.querySelector('.ss-item[data-act="solo"]'); if (so) so.click(); else kEnter(); } await new Promise((r) => setTimeout(r, 2500)); }
await new Promise((r) => setTimeout(r, 4000));\n`;
const profile = `gde-test-readme-${process.pid}`;
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, WACHT + `window.__rs = ${JSON.stringify({ only: ONLY.split(',').filter(Boolean), settle: Number(arg('settle', 7000)), stap: arg('stap', ''), waits: arg('waits', '') ? arg('waits', '').split(',').map(Number) : null, scout: arg('scout', '') ? JSON.parse(fs.readFileSync(path.resolve(arg('scout')), 'utf8')) : [] })};\n` + page);
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NIEUW_VERHAAL: '1' };
delete env.ELECTRON_RUN_AS_NODE;
// Windows houdt een venster binnen het werkgebied (hier 1904x993 in plaats van 1920x1080): de pagina legt zich daarom uit
// op 1920x1080 (--emulate-view) in een venster van 0,9 keer die grootte, een beeld van 1728x972 (16:9)
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1728x972', '--emulate-view=1920x1080@0.9',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
  { cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 60 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt (zet ELECTRON_EXE):', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
let full = {};
for (const l of (r.stdout || '').split('\n')) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { full = JSON.parse(m[1]); } catch { /* laatste regel telt */ } }
fs.writeFileSync(path.join(OUT, 'readme_shots.json'), JSON.stringify(full, null, 1));
for (const j of full.shots || []) console.log(j.name, j.fout ? 'FOUT ' + j.fout.slice(0, 160) : 'ok');
const nan = (r.stdout || '').split('\n').filter((l) => /NaN/i.test(l));
console.log(`uitvoer: ${OUT}, exit ${r.status}${r.signal ? ' ' + r.signal : ''}, NaN-regels: ${nan.length}`);
process.exit(r.status === 0 && (full.shots || []).length ? 0 : 1);
