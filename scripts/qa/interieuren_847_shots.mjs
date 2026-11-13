// Beeldronde en metingen voor #847: de resterende voertuiginterieurs (trekker, heli, vliegtuig,
// machines, boten, gelede bus, bus-wrak, midibus, trein-LOD, wrakken, vrachtruimtes) in één
// headless Electron met een wegwerpprofiel.
//   node scripts/qa/interieuren_847_shots.mjs [--out=<map>] [--game-dir=<gestagede game/>]
//        [--settle=<ms>] [--window=1600x900] [--slot]
//        [--only=trekker,heli,vliegtuig,machines,boten,bus,trein,wrak,vracht,prestatie]
//        [--only=boot-<soort>,...]  (rondvaart, sloep-roef, spits, kempenaar, zeeschip, sleper)
// Beelden: <out>/shots-<naam>.png via `[capture] <naam>` in de console (desktop/devtools.js);
// metingen en consolefouten in <out>/result.json. De pagina-helft is interieuren_847_shots.page.js.
// Op een zwaarbelaste machine: kleinere --window (bv. 1280x720) en desnoods per categorie draaien
// met --only (de runs zijn dan los te herhalen; één Electron tegelijk, altijd wegwerpprofiel).
// Vereist een gestagede game: `GDE_PREBUILT_WORLD=... GDE_STAGE_OUT=<map>/game node desktop/build.mjs`.
// ELECTRON_EXE=<pad> als desktop/node_modules/electron ontbreekt. Eén Electron tegelijk.
// Meldt eerst of de stage bij de werkboom hoort: een oude stage maakt de metingen ongeldig.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-847-beeld')));
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
const cd = 'https://cdn.jsdelivr.net/npm/';
const genormaliseerd = (tekst) => tekst.replace(new RegExp('/vendor/npm/', 'g'), cd);
// #847 raakt deze bestanden (nieuw of gewijzigd); ze horen in de stage te zitten.
const kernBestanden = [
  'cockpitlayout.js', 'bootinterieur.js', 'bootinterieur3d.js', 'vrachtruimte.js', 'vrachtruimte3d.js',
  'cabin3d.js', 'carinteriorlayout.js', 'carinterior.js', 'autointerieur.js', 'seating3d.js',
  'businterieur.js', 'businterieur3d.js', 'treininterieur.js', 'treinlayout.js', 'railway3d.js', 'main.js',
  'models3d_vehicles.js', 'plane3d.js',
];
const stageStand = {};
for (const f of kernBestanden) {
  const bron = path.join(ROOT, 'game', 'js', f);
  const staged = path.join(GAME, 'js', f);
  let gelijk = null;
  try {
    gelijk = genormaliseerd(fs.readFileSync(bron, 'utf8')).trimEnd() === genormaliseerd(fs.readFileSync(staged, 'utf8')).trimEnd();
  } catch { gelijk = fs.existsSync(bron) ? false : 'geen bron'; }
  stageStand[f] = gelijk;
}
const stageOud = Object.entries(stageStand).filter(([, v]) => v === false).map(([k]) => k);
const inStage = (f) => fs.existsSync(path.join(GAME, 'js', f));
const leesStage = (f) => { try { return fs.readFileSync(path.join(GAME, 'js', f), 'utf8'); } catch { return ''; } };
const nieuwAanwezig = Object.fromEntries(['cockpitlayout.js', 'bootinterieur.js', 'bootinterieur3d.js', 'vrachtruimte.js', 'vrachtruimte3d.js'].map((f) => [f, inStage(f)]));
const mainStage = leesStage('main.js');
const kindsGeregistreerd = { boot: /bootInterieurKind/.test(mainStage), vracht: /vrachtruimteKind/.test(mainStage) };
// Een paar vingerafdrukken van de nieuwe code, zodat "aanwezig" niet alleen "bestand bestaat" is.
const vingerafdruk = {
  cockpitlayoutTrekker: /trekker|TRekker|trekker/i.test(leesStage('cockpitlayout.js')),
  vliegtuigRomp: /PLANE_HALF_W|rompHalf|rompBreedte|fuselage/i.test(leesStage('carinteriorlayout.js') + leesStage('cockpitlayout.js') + leesStage('seating3d.js')),
  bootKind: /bootInterieurKind|bootinterieur/i.test(leesStage('bootinterieur3d.js')),
  vrachtKind: /vrachtruimteKind/i.test(leesStage('vrachtruimte3d.js')),
  busAchterwagen: /trailer|achterwagen/i.test(leesStage('businterieur.js')),
  treinLod: /LOD|Lod/i.test(leesStage('treininterieur.js')),
};
console.log(`stage: ${GAME}`);
console.log(`stage bevat #847-nieuw: ${Object.entries(nieuwAanwezig).map(([k, v]) => `${k} ${v ? 'ja' : 'NEE'}`).join(', ')}`);
console.log(`stage bevat de nieuwe code: kinds ${JSON.stringify(kindsGeregistreerd)}, vingerafdruk ${JSON.stringify(vingerafdruk)}; stage wijkt af van de werkboom voor: ${stageOud.length ? stageOud.join(', ') : 'geen bestand'}`);

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
const profile = `gde-test-i847-${process.pid}`;
const script = path.join(OUT, '_page.js');
const cfg = { only: ONLY, settle: Number(arg('settle', 7000)) };
const WINDOW = arg('window', '1600x900'); // bij geheugendruk: --window=1280x720
// Ruim wegwerpprofielen van een eerdere, gecrashte ronde op: een achtergebleven Electron kan een
// profielmap vasthouden, waardoor het opruimen EPERM geeft. Best effort: nooit fataal.
const ruimProfielenOp = (naam) => {
  try { fs.rmSync(path.join(os.tmpdir(), naam), { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }); return true; } catch { return false; }
};
try { for (const d of fs.readdirSync(os.tmpdir())) if (/^gde-test-i847-\d+(-p\d+)?$/.test(d)) ruimProfielenOp(d); } catch { /* geen temp-lijst */ }
fs.writeFileSync(script, `window.__i847 = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'interieuren_847_shots.page.js'), 'utf8'));
fs.writeFileSync(path.join(OUT, 'cfg.json'), JSON.stringify({ ...cfg, window: WINDOW }, null, 1));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: GAME };
delete env.ELECTRON_RUN_AS_NODE;
// Een bedekt venster laat Chromium rAF en timers vertragen tot één keer per minuut; deze
// schakelaars zetten dat uit, zodat de run ook draait als het venster niet bovenaan staat.
const throttleUit = ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=IntensiveWakeUpThrottling,CalculateNativeWinOcclusion'];
let stdout = '', stderr = '';
const pogingen = [];
let log = '';
let code = null;
let res = null;
// Een ronde kan op een zwaarbelaste machine midden in het werk crashen (Chromium: c0000005 bij te
// weinig vrij geheugen, of er draait elders een Electron). We proberen het twee keer opnieuw, met
// een schone uitvoermap; de beelden van een mislukte poging gaan naar poging-<n>/. Een
// achtergebleven proces van die poging ruimen we op met taskkill (best effort), zodat het volgende
// wegwerpprofiel niet op een vergrendelde map stuit.
const doodProcesBoom = (pid) => { try { spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true, stdio: 'ignore' }); } catch { /* al weg */ } };
const pogingMax = 3;
for (let poging = 1; poging <= pogingMax && code === null; poging++) {
  for (const f of fs.readdirSync(OUT)) if (/^shots-.*\.png$/.test(f) || f === 'shots.png') { try { fs.rmSync(path.join(OUT, f), { force: true }); } catch { /* vergrendeld */ } }
  stdout = ''; stderr = '';
  const child = spawn(electron, ['.', '--windowed', '--stil', ...throttleUit, '--force-device-scale-factor=1', `--window-size=${WINDOW}`, `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`], { cwd: path.join(ROOT, 'desktop'), env: { ...env, GDE_TEST_PROFILE: `${profile}-p${poging}` } });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
  child.stdout.on('data', (d) => { stdout += d; });
  child.stderr.on('data', (d) => { stderr += d; });
  // 45 minuten: tien stappen met ± 80 beelden, LOD-metingen, eerste-persoonstappen en de
  // waterzoektocht voor de grote schepen (die wacht op gestreamde tegels).
  const killer = setTimeout(() => child.kill('SIGKILL'), 45 * 60 * 1000);
  const dezeCode = await new Promise((res) => child.on('close', res));
  clearTimeout(killer);
  log = `${stdout}\n${stderr}`;
  fs.writeFileSync(path.join(OUT, `run-poging-${poging}.log`), log);
  if (!ruimProfielenOp(`${profile}-p${poging}`)) console.log(`waarschuwing: wegwerpprofiel ${profile}-p${poging} is nog vergrendeld (achtergebleven Electron?)`);
  // is er een volledig resultaat? dan zijn we klaar; anders bewaren we de beelden en proberen opnieuw
  let dezeRes = null;
  for (const l of log.split(/\r?\n/)) {
    const m = l.match(/\[i847-result\] (.*)$/) || l.match(/^\[perf-script\] (.*)$/);
    if (m) { try { const parsed = JSON.parse(m[1]); if (parsed && parsed.stappen) dezeRes = parsed; } catch { /* ingekort of geen JSON */ } }
  }
  const beeldenNu = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f));
  pogingen.push({ poging, exit: dezeCode, beelden: beeldenNu.length, resultaat: !!dezeRes });
  if (dezeRes) { res = dezeRes; code = dezeCode; break; }
  if (poging < pogingMax) {
    doodProcesBoom(child.pid);
    const bewaar = path.join(OUT, `poging-${poging}`);
    try {
      fs.mkdirSync(bewaar, { recursive: true });
      for (const f of fs.readdirSync(OUT)) if (/^shots-.*\.png$/.test(f) || f === 'shots.png') { try { fs.renameSync(path.join(OUT, f), path.join(bewaar, f)); } catch { /* vergrendeld */ } }
    } catch { /* bewaren mislukt: niet fataal */ }
    console.log(`poging ${poging} mislukt (exit ${dezeCode}, ${beeldenNu.length} beelden); beelden in ${bewaar}; volgende poging...`);
    await sleep(6000);
  }
}
fs.writeFileSync(path.join(OUT, 'run.log'), log);
release();

const checks = {};
for (const l of log.split(/\r?\n/)) {
  const m = l.match(/\[i847-check\] (\S+) (.*)$/);
  if (m) { try { checks[m[1]] = JSON.parse(m[2]); } catch { checks[m[1]] = m[2].slice(0, 300); } }
}
const shots = fs.readdirSync(OUT).filter((f) => /^shots-.*\.png$/.test(f)).sort();
const gemeld = res && Array.isArray(res.beelden) ? res.beelden : [];
const ontbrekendeBeelden = gemeld.filter((n) => !shots.includes(`shots-${n}.png`));
const samenvatting = {
  stage: { dir: GAME, nieuwAanwezig, kindsGeregistreerd, vingerafdruk, wijktAf: stageOud, wereldIndex: path.basename(idxFile) },
  cfg,
  pogingen,
  exit: code,
  beelden: shots,
  gemeldeBeelden: gemeld.length,
  ontbrekendeBeelden,
  checks,
  resultaat: res,
};
const nanRegels = log.split(/\r?\n/).filter((l) => /Computed radius is NaN|NaN/i.test(l) && !/\[i847-|\[perf-script\]/.test(l));
const consoleFouten = log.split(/\r?\n/).filter((l) => /\[error\]|Uncaught|ReferenceError|TypeError|SyntaxError/i.test(l) && !/\[i847-/.test(l));
samenvatting.nanRegels = nanRegels.length;
samenvatting.consoleFoutRegels = consoleFouten.slice(0, 20);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(samenvatting, null, 1));

// De poort: een ronde telt als geslaagd als de pagina een volledig resultaat teruggaf, Electron
// netjes sloot en elk gemeld beeld ook echt als PNG bestaat. Ontbrekende modules zijn geen
// crash: die staan per stap als "ontbrekend"/"fout" in de JSON en in het rapport.
const hardFout = !res || code !== 0 || shots.length === 0 || ontbrekendeBeelden.length > 0;
if (!res && !shots.length) {
  console.log('GEEN RESULTAAT: Electron startte niet of crashte (geen [perf-script] en geen beelden).');
  console.log('Op deze machine crasht de Electron-dist onder desktop/node_modules soms met 0x80000003/0xC0000005;');
  console.log('gebruik dan ELECTRON_EXE=<pad naar een uitgepakte electron-v45.2.3-win32-x64> (zelfde versie, zelfde bestanden).');
}
console.log(`exit ${code}, beelden ${shots.length} (gemeld ${gemeld.length}, ontbrekend ${ontbrekendeBeelden.length}), NaN-regels ${nanRegels.length}, consolefoutregels ${consoleFouten.length}`);
const stapBron = res && res.stappen ? res.stappen : checks;
for (const [naam, c] of Object.entries(stapBron)) {
  const kern = c && typeof c === 'object' ? {
    duurS: c.duurS, fout: c.fout || null,
    ontbrekend: c.ontbrekend && c.ontbrekend.length ? c.ontbrekend.slice(0, 6) : undefined,
    notities: c.notities && c.notities.length ? c.notities.slice(0, 4) : undefined,
    beelden: Array.isArray(c.beelden) ? c.beelden.length : undefined,
  } : c;
  console.log(`[${naam}] ${JSON.stringify(kern).slice(0, 700)}`);
}
if (ontbrekendeBeelden.length) console.log(`ontbrekende PNG's: ${ontbrekendeBeelden.slice(0, 10).join(', ')}${ontbrekendeBeelden.length > 10 ? ' ...' : ''}`);
console.log(`uitvoer: ${OUT}`);
process.exit(hardFout ? 1 : 0);
