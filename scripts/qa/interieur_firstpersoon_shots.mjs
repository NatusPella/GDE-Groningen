// Beeldronde en metingen voor #833: de voertuiginterieurs op LOD's (auto's en bussen) en de
// eerste-persooncamera, in één headless Electron met een wegwerpprofiel.
//   node scripts/qa/interieur_firstpersoon_shots.mjs [--out=<map>] [--game-dir=<gestagede game/>]
//        [--settle=<ms>] [--only=auto,bus,voet,autointerieur,prestatie] [--slot]
// Beelden: <out>/shots-<naam>.png via `[capture] <naam>` in de console (desktop/devtools.js);
// metingen en consolefouten in <out>/result.json. De pagina-helft is interieur_firstpersoon_shots.page.js.
// Vereist een gestagede game: `GDE_PREBUILT_WORLD=... GDE_STAGE_OUT=<map>/game node desktop/build.mjs`.
// ELECTRON_EXE=<pad> als desktop/node_modules/electron ontbreekt. Eén Electron tegelijk.
// Meldt eerst of de stage bij de werkboom hoort: een oude stage maakt de metingen ongeldig.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-833-beeld')));
const GAME = path.resolve(arg('game-dir', process.env.GDE_GAME_DIR || path.join(ROOT, 'desktop', 'build', 'game')));
const ONLY = arg('only', '');
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const idxFile = ['index-provincie.json', 'index.json'].map((f) => path.join(GAME, 'world', f)).find((f) => fs.existsSync(f));
if (!idxFile) { console.error(`geen wereldindex in ${GAME}/world (stage het spel of geef --game-dir=)`); process.exit(2); }

// ---- hoort de stage bij deze werkboom? -------------------------------------------------
// desktop/build.mjs herschrijft alleen de CDN-imports naar /vendor/npm/...; verder moet de stage
// gelijk zijn aan game/js. Een oude stage (andere commit) maakt de metingen ongeldig, dus dat
// melden we in result.json in plaats van er stil op te vertrouwen.
const CDN = 'https://cdn.jsdelivr.net/npm/';
const genormaliseerd = (tekst) => tekst.replace(new RegExp('/vendor/npm/', 'g'), CDN);
const kernBestanden = ['firstperson.js', 'cabin3d.js', 'businterieur3d.js', 'scene3d.js', 'carinterior.js', 'player.js', 'cinematics.js', 'settings.js', 'pausemenu.js', 'controls.js', 'businterieur.js'];
const stageStand = {};
for (const f of kernBestanden) {
  const bron = ['game/js/' + f].map((p) => path.join(ROOT, p))[0];
  const staged = path.join(GAME, 'js', f);
  let gelijk = null;
  try {
    gelijk = genormaliseerd(fs.readFileSync(bron, 'utf8')).trimEnd() === genormaliseerd(fs.readFileSync(staged, 'utf8')).trimEnd();
  } catch { gelijk = fs.existsSync(bron) ? false : 'geen bron'; }
  stageStand[f] = gelijk;
}
const stageOud = Object.entries(stageStand).filter(([, v]) => v === false).map(([k]) => k);
const fpInStage = fs.existsSync(path.join(GAME, 'js', 'firstperson.js'));
const lodInStage = (() => {
  try { return /CABIN_LOD_R/.test(fs.readFileSync(path.join(GAME, 'js', 'cabin3d.js'), 'utf8')); } catch { return false; }
})();
console.log(`stage: ${GAME}`);
console.log(`stage bevat nieuwe code: eerste persoon ${fpInStage ? 'ja' : 'NEE'}, cabin-LOD ${lodInStage ? 'ja' : 'NEE'}; stage wijkt af van de werkboom voor: ${stageOud.length ? stageOud.join(', ') : 'geen bestand'}`);

let slot = null;
async function takeSlot() {
  for (let tries = 0; tries < 120; tries++) {
    for (const n of [1, 2, 3]) {
      try { fs.mkdirSync(path.join(LOCKS, `electron-${n}`)); slot = path.join(LOCKS, `electron-${n}`); console.log(`slot electron-${n}`); return; } catch { /* bezet */ }
    }
    await sleep(60000);
  }
  throw new Error('geen Electron-slot gekregen');
}
const release = () => { if (slot) { try { fs.rmdirSync(slot); } catch { /* al weg */ } slot = null; } };
process.on('exit', release);
if (process.argv.includes('--slot')) await takeSlot();

fs.mkdirSync(OUT, { recursive: true });
const profile = `gde-test-ifs-${process.pid}`;
const script = path.join(OUT, '_page.js');
const cfg = { only: ONLY, settle: Number(arg('settle', 8000)) };
fs.writeFileSync(script, `window.__ifs = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'interieur_firstpersoon_shots.page.js'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'cfg.json'), JSON.stringify(cfg, null, 1));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: GAME };
delete env.ELECTRON_RUN_AS_NODE;
// Een bedekt venster (ander venster op de voorgrond, of een vergrendeld scherm) laat Chromium
// rAF en timers vertragen tot één keer per minuut; dan kruipt een beeldronde. Deze schakelaars
// zetten dat uit, zodat de run ook draait als het venster niet bovenaan staat.
const throttleUit = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion'];
let stdout = '', stderr = '';
const pogingen = [];
let log = '';
let code = null;
let res = null;
// Een ronde kan op een zwaarbelaste machine midden in het werk crashen (Chromium: c0000005 bij te
// weinig vrij geheugen). Net als scripts/perf/run.mjs proberen we het één keer opnieuw, met een
// schone uitvoermap; de beelden van de mislukte poging gaan naar poging-<n>/.
for (let poging = 1; poging <= 2 && code === null; poging++) {
  for (const f of fs.readdirSync(OUT)) if (/^shots-.*\.png$/.test(f) || f === 'shots.png') fs.rmSync(path.join(OUT, f), { force: true });
  stdout = ''; stderr = '';
  const child = spawn(electron, ['.', '--windowed', '--stil', ...throttleUit, '--force-device-scale-factor=1', '--window-size=1600x900', `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env: { ...env, GDE_TEST_PROFILE: `${profile}-p${poging}` } });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  // 30 minuten: de volle ronde doet ± 39 beelden plus LOD-metingen, eerste-persoonstappen en frametijdreeksen
  const killer = setTimeout(() => child.kill('SIGKILL'), 30 * 60 * 1000);
  const dezeCode = await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  log = `${stdout}\n${stderr}`;
  fs.writeFileSync(path.join(OUT, `run-poging-${poging}.log`), log);
  fs.rmSync(path.join(os.tmpdir(), `${profile}-p${poging}`), { recursive: true, force: true });
  // is er een volledig resultaat? dan zijn we klaar; anders bewaren we de beelden en proberen opnieuw
  let dezeRes = null;
  for (const l of log.split(/\r?\n/)) {
    const m = l.match(/\[ifs-result\] (.*)$/) || l.match(/^\[perf-script\] (.*)$/);
    if (m) { try { const parsed = JSON.parse(m[1]); if (parsed && parsed.stappen) dezeRes = parsed; } catch { /* ingekort of geen JSON */ } }
  }
  const beeldenNu = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f));
  pogingen.push({ poging, exit: dezeCode, beelden: beeldenNu.length, resultaat: !!dezeRes });
  if (dezeRes) { res = dezeRes; code = dezeCode; break; }
  if (poging === 1) {
    const bewaar = path.join(OUT, 'poging-1');
    fs.mkdirSync(bewaar, { recursive: true });
    for (const f of fs.readdirSync(OUT)) if (/^shots-.*\.png$/.test(f) || f === 'shots.png') fs.renameSync(path.join(OUT, f), path.join(bewaar, f));
    console.log(`poging 1 mislukt (exit ${dezeCode}, ${beeldenNu.length} beelden); beelden in ${bewaar}; tweede poging...`);
    await sleep(4000);
  }
}
fs.writeFileSync(path.join(OUT, 'run.log'), log);
release();

const checks = {};
for (const l of log.split(/\r?\n/)) {
  const m = l.match(/^\[ifs-check\] (\S+) (.*)$/);
  if (m) { try { checks[m[1]] = JSON.parse(m[2]); } catch { checks[m[1]] = m[2].slice(0, 300); } }
}
const samenvatting = {
  stage: { dir: GAME, eerstePersoon: fpInStage, cabinLod: lodInStage, wijktAf: stageOud },
  cfg,
  pogingen,
  exit: code,
  beelden: fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f)).sort(),
  checks,
  resultaat: res,
};
const nanRegels = log.split(/\r?\n/).filter((l) => /Computed radius is NaN|NaN/i.test(l) && !/\[ifs-|\[perf-script\]/.test(l));
const consoleFouten = log.split(/\r?\n/).filter((l) => /\[error\]|Uncaught|ReferenceError|TypeError|SyntaxError/i.test(l) && !/\[ifs-/.test(l));
samenvatting.nanRegels = nanRegels.length;
samenvatting.consoleFoutRegels = consoleFouten.slice(0, 20);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(samenvatting, null, 1));

const shots = samenvatting.beelden;
const fpStap = !!(res && res.stappen && (res.stappen.voet || res.stappen.autointerieur || res.stappen.businterieur));
// auto: dichtbij 2 + op 5/20/50/70 driekwart (4) + op 20/50/70 zij (3) = 9
// bus: dichtbij 2 + op 10/30/60/90 driekwart (4) + op 10/30/60/90 zij (4) = 10
// eerste persoon: te voet 6 (incl. fiets-terugval), in de auto 8, in de bus 6 => samen 39
const minBeelden = fpStap ? 37 : 17;
const hardFout = !res || code !== 0 || shots.length < minBeelden;
if (!res && !shots.length) {
  console.log('GEEN RESULTAAT: Electron startte niet of crashte (geen [ifs-result] en geen beelden).');
  console.log('Op deze machine crasht de Electron-dist onder desktop/node_modules soms met 0x80000003/0xC0000005;');
  console.log('gebruik dan ELECTRON_EXE=<pad naar een uitgepakte electron-v45.2.3-win32-x64> (zelfde versie, zelfde bestanden).');
}
console.log(`exit ${code}, beelden ${shots.length} (min ${minBeelden}${fpStap ? ', met eerste persoon' : ', zonder eerste persoon'}), NaN-regels ${nanRegels.length}, consolefoutregels ${consoleFouten.length}`);
for (const [naam, c] of Object.entries(checks)) console.log(`[${naam}] ${JSON.stringify(c).slice(0, 400)}`);
console.log(`uitvoer: ${OUT}`);
process.exit(hardFout ? 1 : 0);
