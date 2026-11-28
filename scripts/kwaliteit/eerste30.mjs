// Visuele doorloop van de eerste 30 minuten (AAA-30, 28-11): één Electron-run per set (opening, flat, straat, rit, plekken) op
// 1920x1080 met de echte spelcamera, levend verkeer en HUD, vaste seed, ?dynvast (geen terugvalmist). Pagina: eerste30.page.js.
//   node scripts/kwaliteit/eerste30.mjs --set=flat --out=<map binnen de worktree> [--game-dir=<stage>] [--only=id,id] [--klok=14]
//        [--lijst=<json met plekken>] [--tijden=1,5,9] [--doel=x,y] [--stap=120] [--limiet-min=4]
// Uitvoer: <out>/<set>/<id>.png en eerste30-<set>.json. Zelfde runner (slot, --no-sandbox, eigen kind stoppen) als beeldregressie.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const set = opt('set', 'flat');
if (!opt('out')) { console.error('geef --out=<map binnen de worktree>'); process.exit(2); }
const out = path.resolve(opt('out'));
const dirs = R.prepareRunDir(out);
const log = R.makeLog(out, `run-${set}.log`);
const nieuwMap = path.join(out, set);
fs.rmSync(nieuwMap, { recursive: true, force: true }); fs.mkdirSync(nieuwMap, { recursive: true });
const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { log(`geen gestagede game in ${gameDir}`); process.exit(2); }
const cfg = { set, only: opt('only', ''), klok: opt('klok') != null ? Number(opt('klok')) : null, stap: Number(opt('stap', 120)), diag: argv.includes('--diag') };
if (opt('lijst')) cfg.lijst = JSON.parse(fs.readFileSync(path.resolve(opt('lijst')), 'utf8'));
if (opt('tijden')) cfg.tijden = opt('tijden').split(',').map(Number);
if (opt('vanaf')) cfg.vanaf = Number(opt('vanaf'));
if (opt('tot')) cfg.tot = Number(opt('tot'));
if (opt('doel')) cfg.doel = opt('doel').split(',').map(Number);
const lib = fs.readFileSync(path.join(ROOT, 'scripts', 'trailer', 'lib', 'clip.page.js'), 'utf8');
const page = fs.readFileSync(path.join(HERE, 'eerste30.page.js'), 'utf8');
const script = path.join(out, `_page-${set}.js`);
fs.writeFileSync(script, `window.__e30 = ${JSON.stringify(cfg)};\n${lib}\n${page}\nreturn await e30Main();\n`);
const args = ['.', `--smoke-test=${path.join(out, '_smoke.png')}`, `--perf-script=${script}`, '--autoplay=7', '--stil',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
  `--clip=${nieuwMap}`, '--clip-size=1920x1080', '--preset=quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false', '--url-flags=dynvast'];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NIEUW_VERHAAL: '1' } });
delete env.GDE_MENU_TEST;
let code = 0;
try {
  const electron = R.findElectron(ROOT);
  const r = await R.runElectron({ electron, args, cwd: path.join(ROOT, 'desktop'), env, out, log, slot: { label: 'eerste30-' + set, maxOthers: 1, waitMin: 120 }, timeoutMin: Number(opt('limiet-min', 4)), status: () => `${fs.readdirSync(nieuwMap).filter((f) => f.endsWith('.png')).length} beeld(en)` });
  R.removeProfile(dirs.profile);
  log(`pagina: ${r.perfScript || 'geen resultaat'}; exit ${r.code}`);
} catch (e) { log('fout: ' + e.message); code = 1; }
process.exit(code);
