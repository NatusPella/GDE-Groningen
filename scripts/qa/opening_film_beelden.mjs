// Beelden van de openingsfilm uit Electron (#aaa30 regie): speelt de film (of een stuk) en slaat om de zoveel seconden een still op,
// met per still het shot-id. Gebruik: node scripts/qa/opening_film_beelden.mjs --label=na [--start=0] [--n=40] [--every=1.5] [--page=<bestand>] [--w=1920]
// Vereist een gestagede game (GDE_GAME_DIR, standaard desktop/build/game) en een vrij Electron-slot. Uitvoer in .scr/film/<label>/.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d = '') => { const a = process.argv.find((v) => v === `--${k}` || v.startsWith(`--${k}=`)); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
const label = arg('label', 'na');
const pageFile = arg('page', path.join(ROOT, 'scripts', 'qa', 'opening_film_beelden.page.js'));
const runner = require('../lib/electronrunner.cjs');
const game = process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game');
const electron = process.env.ELECTRON_EXE || 'C:/Users/abuis/GIT/GDE-Groningen/desktop/node_modules/electron/dist/electron.exe';
const out = path.join(ROOT, '.scr', 'film', label);
fs.rmSync(out, { recursive: true, force: true });
const { profile, tmp } = runner.prepareRunDir(out);
const cs = { startAt: +arg('start', 0), n: +arg('n', 40), every: +arg('every', 1.5), width: +arg('w', 1920), extra: arg('extra', ''), fr: arg('fr', '0.2,0.55,0.9').split(',').map(Number), settle: +arg('settle', 5500) };
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `window.__cs = ${JSON.stringify(cs)};\n` + fs.readFileSync(pageFile, 'utf8'));
const env = runner.electronEnv({ profile, tmp, gameDir: game, extra: { GDE_NO_THROTTLE: '1' } });
const res = await runner.runElectron({ electron, cwd: path.join(ROOT, 'desktop'), env, out, slot: { label: 'openingfilm', waitMin: +arg("wacht", 25), maxOthers: 1, pollMs: 2000 }, timeoutMin: 4,
  args: ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1920x1080', `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`] });
runner.removeProfile(profile);
fs.writeFileSync(path.join(out, 'result.json'), res.perfScript || '{}');
console.log('klaar', label, res.code, (res.perfScript || '').slice(0, 300));
