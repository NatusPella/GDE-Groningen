// Hertest in beeld (kwaliteitsmachine, docs/KWALITEITSMACHINE.md): één Electron-run per groep via scripts/lib/electronrunner.cjs
// (slot, hartslag, --no-sandbox, wegwerpprofiel in de uitvoermap). Drie modi:
//   --modus=lijst    --lijst=<json> [--groep=a,b] [--issues=1202,1291] [--ontgrendel]  werkt scripts/qa/hertest_lijst.page.js af (plek, menu, hud, js)
//   --modus=scenes   --only=917,919                                    draait de scenes uit scripts/ui/hertest_scenes.js (ronde 22-11)
//   --modus=cutscene --only=M04.outro,M05.intro [--spot=x,y,hoek]      één beeld per shot via scripts/qa/cutscene_shots.page.js
// Gemeen: --out=<map> (niet in de systeem-temp) --game-dir=<gestagede game> [--formaat=1920x1080] [--limiet-min=40] [--jpg=85]
//         [--slot-wacht-min=120] [--max-slots=1]
// Uitvoer: <out>/shots-<naam>.png (de ruwe beelden), <out>/jpg/<naam>.jpg (met --jpg en ffmpeg op het pad), <out>/resultaat.json
// (het paginaverslag), run.log en electron.log. Exitcodes: 0 klaar, 1 fout, 2 verkeerd gebruik, 3 geen slot, 4 Electron niet te starten.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const opt = (k, d = null) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const lijstVan = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

// Bouwt de body van het page-script per modus; puur, zodat een test hem zonder Electron kan nalopen.
export function bouwPagina(modus, { items = [], only = [], spot = null, ontgrendel = false } = {}) {
  if (modus === 'lijst') return `window.__hl = ${JSON.stringify({ items, ontgrendel })};\n` + fs.readFileSync(path.join(HERE, 'hertest_lijst.page.js'), 'utf8');
  if (modus === 'scenes') return `window.__shotsOnly = ${JSON.stringify(only.join(','))};\n` + fs.readFileSync(path.join(ROOT, 'scripts', 'ui', 'hertest_scenes.js'), 'utf8');
  if (modus === 'cutscene') {
    const cs = { only, settle: 6000 };
    if (spot) { const [x, y, a] = spot.split(',').map(Number); cs.spot = { x, y, a: a || 0 }; }
    // cutscene_shots.page.js wacht niet zelf op de wereld: eerst het begin van het spel afwachten
    const wacht = 'for (let i = 0; i < 240 && !(window.__debug && window.__debug.world && window.__debug.world.map && document.body.classList.contains(\'game-started\')); i++) await new Promise((r) => setTimeout(r, 1000));\n'
      + '{ const c = await import(\'/js/cinematics.js\'); for (let i = 0; i < 60 && c.isCinematicActive(); i++) { c.skipCinematic(); await new Promise((r) => setTimeout(r, 250)); } }\n';
    return `window.__cs = ${JSON.stringify(cs)};\n` + wacht + fs.readFileSync(path.join(HERE, 'cutscene_shots.page.js'), 'utf8');
  }
  throw new Error('onbekende modus ' + modus);
}

// Kiest de items uit een lijstbestand: op groep en/of issuenummer.
export function kiesItems(lijst, { groepen = [], issues = [] } = {}) {
  return lijst.filter((it) => (!groepen.length || groepen.includes(it.groep)) && (!issues.length || issues.includes(String(it.issue))));
}

function naarJpg(out, kwaliteit, log) {
  const ff = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['ffmpeg'], { encoding: 'utf8' });
  if (ff.status !== 0) { log('geen ffmpeg op het pad: de beelden blijven png'); return 0; }
  const doel = path.join(out, 'jpg'); fs.mkdirSync(doel, { recursive: true });
  // ffmpeg -q:v 3 ligt rond kwaliteit 85 van een gewone jpg-encoder
  const q = Math.max(2, Math.min(10, Math.round((100 - kwaliteit) / 5)));
  let n = 0;
  for (const f of fs.readdirSync(out)) {
    if (!/^shots-.+\.png$/.test(f)) continue;
    const naam = f.replace(/^shots-/, '').replace(/\.png$/, '.jpg');
    const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(out, f), '-q:v', String(q), path.join(doel, naam)], { encoding: 'utf8' });
    if (r.status === 0) n++; else log(`jpg mislukt voor ${f}: ${(r.stderr || '').slice(0, 200)}`);
  }
  return n;
}

async function main() {
  const modus = opt('modus', 'lijst');
  if (!opt('out')) { console.error('geef --out=<map> (niet in de systeem-temp)'); return 2; }
  const out = path.resolve(opt('out'));
  let items = [];
  if (modus === 'lijst') {
    if (!opt('lijst')) { console.error('--modus=lijst vraagt --lijst=<json>'); return 2; }
    items = kiesItems(JSON.parse(fs.readFileSync(path.resolve(opt('lijst')), 'utf8')), { groepen: lijstVan(opt('groep')), issues: lijstVan(opt('issues')) });
    if (!items.length) { console.error('geen items na het filter'); return 2; }
  }
  let dirs;
  try { dirs = R.prepareRunDir(out); } catch (e) { console.error(e.message); return 2; }
  const log = R.makeLog(out, 'run.log');
  const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
  if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir} (--game-dir= of GDE_GAME_DIR)`); return 2; }
  let electron;
  try { electron = R.findElectron(ROOT); } catch (e) { log(e.message); return 4; }
  const script = path.join(out, `_page-${modus}.js`);
  fs.writeFileSync(script, bouwPagina(modus, { items, only: lijstVan(opt('only')), spot: opt('spot'), ontgrendel: process.argv.includes('--ontgrendel') }));
  const formaat = opt('formaat', '1920x1080');
  const args = ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${formaat}`,
    '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
    `--smoke-test=${path.join(out, 'shots.png')}`, `--perf-script=${script}`];
  const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir });
  delete env.GDE_MENU_TEST;
  log(`modus ${modus}, ${modus === 'lijst' ? items.length + ' item(s)' : lijstVan(opt('only')).length + ' id(s)'}, ${formaat}`);
  let r;
  try {
    r = await R.runElectron({ electron, args, cwd: path.join(ROOT, 'desktop'), env, out, log,
      slot: { label: `hertest-${modus}`, maxOthers: Number(opt('max-slots', 1)), waitMin: Number(opt('slot-wacht-min', 120)) },
      timeoutMin: Number(opt('limiet-min', 40)), status: () => `${fs.readdirSync(out).filter((f) => /^shots-.+\.png$/.test(f)).length} beeld(en)` });
  } catch (e) { log('fout: ' + e.message); return e.code && String(e.code).startsWith('SLOT') ? 3 : e.code === 'START' ? 4 : 1; } finally { R.removeProfile(dirs.profile); }
  if (r.perfScript) fs.writeFileSync(path.join(out, 'resultaat.json'), r.perfScript);
  log(`pagina: ${r.perfScript ? 'verslag ontvangen' : 'geen verslag'}; exit ${r.code}`);
  const kw = Number(opt('jpg', 85));
  if (kw > 0) log(`${naarJpg(out, kw, log)} beeld(en) naar jpg (kwaliteit ~${kw})`);
  return r.perfScript ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error(e); process.exit(1); });
