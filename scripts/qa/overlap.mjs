// Overlapdetector van de QA-sweep (#985, opdracht 20-11): start per vensterformaat één Electron met een wegwerpprofiel, zet in het echte spel veel
// HUD-toestanden klaar (overlap_scenes.page.js) en meet overlap, afkapping en buiten-beeld (overlap.page.js). Zie docs/OVERLAP-AUDIT-20-11.md.
//   node scripts/qa/overlap.mjs [--out=<map>] [--formaten=1280x720,1920x1080,1024x600] [--only=voet,bord-discgolf] [--prefix=voor|na] [--beeld=fout|alles|geen]
//   node scripts/qa/overlap.mjs --samenvatting=<overlap.json>
// Gebruik een slot (max 3 Electrons tegelijk):  node <slot.mjs> run overlap -- node scripts/qa/overlap.mjs ...
// GDE_GAME_DIR=<gestagede game-map> (backslashes), ELECTRON_EXE=<pad>, GDE_ELECTRON_FLAGS="--no-sandbox --in-process-gpu"; profiel en uitvoer onder --out.
// Uitvoer: <out>/overlap-<formaat>.json en <out>/overlap.json; beelden <out>/<formaat>-ov-<prefix>-<scène>.png (alleen scènes met een bevinding, tenzij --beeld=alles).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const KOLOM = ['overlap', 'buitenBeeld', 'afgekapt', 'ellips', 'tekstUit', 'filmHud'];

if (arg('samenvatting', '')) {
  const j = JSON.parse(fs.readFileSync(arg('samenvatting'), 'utf8'));
  console.log(['formaat', 'scene', ...KOLOM].join('\t'));
  for (const [f, r] of Object.entries(j)) for (const [s, m] of Object.entries(r.scenes || {})) console.log([f, s, ...KOLOM.map((k) => (m[k] || []).length)].join('\t'));
  process.exit(0);
}

const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-overlap')));
const FORMATEN = arg('formaten', '1280x720,1920x1080,1024x600').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const electron = process.env.ELECTRON_EXE || process.env.GDE_ELECTRON || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const body = fs.readFileSync(path.join(HERE, 'overlap.page.js'), 'utf8') + '\n' + fs.readFileSync(path.join(HERE, 'overlap_scenes.page.js'), 'utf8');
const alles = {};
let gelukt = 0;
for (const f of FORMATEN) {
  const m = f.match(/^(\d{3,4})x(\d{3,4})$/);
  if (!m) { console.error('onbekend formaat', f); continue; }
  const [, w, h] = m;
  const dir = path.join(OUT, f);
  fs.mkdirSync(dir, { recursive: true });
  const profile = path.join(dir, `profiel-${process.pid}`);
  fs.mkdirSync(profile, { recursive: true });
  const script = path.join(dir, '_page.js');
  const beeld = arg('beeld', 'fout');
  fs.writeFileSync(script, `window.__ov = ${JSON.stringify({ naam: f, only: arg('only', '').split(',').filter(Boolean), prefix: arg('prefix', 'x'), beeld: beeld === 'alles' ? 'alles' : beeld === 'geen' ? '' : 'fout' })};\n` + body);
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_MENU_TEST: '1', GDE_NO_THROTTLE: '1' };
  if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = (process.env.GDE_ELECTRON_FLAGS || '').split(' ').filter(Boolean);
  const r = spawnSync(electron, ['.', ...extra, '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${w}x${h}`,
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(dir, `${f}.png`)}`, `--perf-script=${script}`],
  { cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 20 * 60 * 1000, killSignal: 'SIGKILL' });
  fs.writeFileSync(path.join(dir, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
  fs.rmSync(profile, { recursive: true, force: true });
  const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
  let j = null;
  if (l) { try { let t = JSON.parse(l.slice(14)); if (typeof t === 'string') t = JSON.parse(t); j = t; } catch { /* */ } }
  if (j && j.scenes) {
    alles[f] = j; fs.writeFileSync(path.join(OUT, `overlap-${f}.json`), JSON.stringify(j, null, 1)); gelukt++;
    const n = Object.values(j.scenes);
    console.log(`${f}: ${n.length} scenes, ${KOLOM.map((k) => k + ' ' + n.reduce((a, s) => a + (s[k] || []).length, 0)).join(', ')}, ${(j.overgeslagen || []).length} overgeslagen, ${(j.fouten || []).length} console-fouten`);
    for (const o of j.overgeslagen || []) console.log('  overgeslagen: ' + o);
  } else console.log(`${f}: geen resultaat (exit ${r.status})`);
}
fs.writeFileSync(path.join(OUT, 'overlap.json'), JSON.stringify(alles, null, 1));
console.log(`uitvoer: ${OUT}`);
process.exit(gelukt === FORMATEN.length ? 0 : 1);
