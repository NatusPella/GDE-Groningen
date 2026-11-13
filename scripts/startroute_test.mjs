// #581: elke testrun start zoals de speler (boot → wereld); alleen de QA/opname-route houdt het
// oude titelscherm. Bronchecks zonder Electron:  node scripts/startroute_test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0, fails = 0;
const ok = (c, name, info = '') => { n++; if (!c) { fails++; console.log(`FAIL ${name}${info !== '' ? ` (${info})` : ''}`); } };

const ss = read('game/js/startscreen.js');

// --- de keuze in runStartScreen: het oude scherm alleen voor de QA/opname-route ---
const route = /export function runStartScreen\(world, opts\) \{([\s\S]*?)\n\}/.exec(ss);
ok(route, 'runStartScreen bestaat');
const body = route ? route[1] : '';
ok(/const menu = FLAGS\.menutest \|\| FLAGS\.trailer \|\| FLAGS\.preview \|\| FLAGS\.attract;/.test(body), 'alleen ?menutest, trailer, preview en attract kiezen het oude scherm');
for (const flag of ['stil', 'storytest', 'benchmark', 'noattract', 'perf', 'spotsonly']) {
  ok(!new RegExp(`FLAGS\\.${flag}\\b`).test(body), `${flag} forceert het menu niet meer`);
}
ok(/return menu \? runMenuScreen\(world, opts, pending\) : runBootScreen\(world, opts, pending\);/.test(body), 'de rest, ook de testruns, gaat via de boot');

// --- de benchmark draait vanuit de boot, op dezelfde wereld als vroeger ---
ok(/function runBootScreen\(world, opts, pending = null\)/.test(ss), 'de boot krijgt de openstaande intro mee');
ok(/pending\.mode === 'benchmark'/.test(ss) && /runBenchmarkSuite\(world, env\)/.test(ss), 'de benchmark draait vanuit de boot');
ok(/if \(firstRun\) benchmarkFirstRun\(opts, \(\) => startNew\(\)\);[\s\S]{0,120}else if \(save\) continueGame\(\); else startNew\(\);/.test(ss), 'na de benchmark start het spel gewoon');

// --- de QA-harnassen die het scherm zelf bedienen vragen het met GDE_MENU_TEST (devtools → ?menutest) ---
const dt = read('desktop/devtools.js');
ok(/process\.env\.GDE_MENU_TEST && 'menutest'/.test(dt), 'GDE_MENU_TEST geeft de QA-scripts het oude scherm');
ok(/started: document\.body\.classList\.contains\('game-started'\)/.test(dt), 'de smoke-run meldt of de wereld al gestart is');
ok(/if \(document\.body\.classList\.contains\('game-started'\) && !up\) break;/.test(dt), 'een testrun wacht niet meer op een menu dat niet komt');

// --- de verhaaltest wacht op de spelstart, niet meer op het menu ---
const st = read('game/js/storytest.js');
ok(/if \(ss && ss\.classList\.contains\('visible'\)\)/.test(st) && /game-started'\), 180000\)/.test(st), 'de verhaaltest start zoals de speler');

// --- de menu-achtergrond wordt niet meer voor elke start gepland ---
ok(/if \(planned \|\| !\(FLAGS\.menutest \|\| FLAGS\.trailer \|\| FLAGS\.preview \|\| FLAGS\.attract\)\) return;/.test(ss), 'planMenuStart hangt aan de menu-route');

// --- #750/#grens: de achtergrondstappen eerst, met draaiende frames ---
// De Ommeland-plaatsing en de kaartbeelden lopen naast de warm-lus; de boot
// wacht er binnen zijn eigen grens op (ready), maar nooit met een kale await
// vóór de spellus: dat was de fout van #750.
const main = read('game/js/main.js');
const iPlace = main.indexOf('const countryPlaced = placeWithTiles');
const iMaps = main.indexOf('const countryMaps = warmCountryMaps()');
const iReady = main.indexOf('const ready = Promise.all([countryPlaced, countryMaps])');
const iWait = main.indexOf('await waitForStart(world, ready)');
const iStart = main.indexOf("document.body.classList.add('game-started')", iWait);
ok(iPlace !== -1 && iMaps > iPlace && iReady > iMaps, '#750: plaatsing en kaartbeelden starten vóór het wachten, in ready');
ok(iWait !== -1 && iStart > iWait, '#750: game-started volgt meteen op de spelstart');
ok(!/await countryPlaced;/.test(main) && !/await waitForStart\(world, countryPlaced\)/.test(main), '#750: geen kale wacht vóór de spellus');
ok(iStart !== -1 && /markLoad\('gameStart'\)/.test(main.slice(iStart, iStart + 240)), '#750: de startmarker valt na het laadscherm');

// --- startgebied voorladen: het laadscherm bouwt de eerste buurt en linkt de shaders ---
// De eigenaar koos een langer laadscherm boven haperingen in de eerste minuten: vóór het
// scherm weggaat bouwt de boot de gebouwen en wegen rond het startpunt en compileert hij
// de shaderprogramma's. Een testrun slaat dit over (die start vanuit een script).
const scene = read('game/js/scene3d.js');
ok(/prewarmStreamAt\(x, y, secs = 4, radius = PREWARM_R\)/.test(scene), 'de prewarm heeft een eigen radius');
ok(/export function prewarmPending\(\)/.test(scene), 'scene3d kan zeggen hoeveel voorlaadwerk er nog openstaat');
ok(/export function precompilePrograms\(\)/.test(scene) && /precompile\(scene\)/.test(scene), 'scene3d kan alle shaders van de scène compileren');
ok(/for \(const p of programs\.values\(\)\) if \(!programLinked\(p\)\)/.test(scene) && /programLinked\(p\)/.test(read('game/js/scene3d.js')), 'batches wachten niet-blokkerend op shaderlinks (geen secondenfreeze in het eerste filmbeeld)');
ok(/o\.material && !o\.geometry/.test(scene) && /userData\.terrainMaterial/.test(read('game/js/terrain3d.js')), 'geen materiaal op niet-draw-objecten: voorcompileren slaat shaders niet meer over (#804)');
ok(/nearPrewarm[\s\S]{0,400}s\.r \+ 10/.test(scene), 'de prewarm beschermt de gebouwen binnen zijn eigen radius');
const iWarm = main.indexOf('const warm = async () => {');
const iWarmEnd = main.indexOf('return runStartScreen(world, { render, relocate, tick, ready, warm });', iWarm);
ok(iWarm !== -1 && iWarmEnd > iWarm, 'de boot heeft een warm-stap vóór de spelstart');
const warmBody = iWarm >= 0 && iWarmEnd > iWarm ? main.slice(iWarm, iWarmEnd) : '';
ok(/prewarmStreamAt\(x, y, 240, START_WARM_R\)/.test(warmBody), 'de warm-stap prewarmt het startpunt op de ingestelde radius');
ok(/sp\.buildings \+ sp\.roads \+ prewarmPending\(\)/.test(warmBody), 'de warm-stap wacht tot gebouwen, wegen en prewarm rustig zijn');
ok(/START_WARM_MAX_FRAME_MS/.test(main) && /slowRun = frameMs > START_WARM_MAX_FRAME_MS/.test(warmBody), 'de warm-stap wacht ook tot de frames zelf rustig zijn (late workerresultaten en shaderlinks)');
ok(/calm = open === 0 && slowRun === 0/.test(warmBody), 'pas door als tellers én frametijd rustig zijn');
ok(/\(readyDone \? 0 : 1\)/.test(warmBody) && /window\.__loadMarks\.background/.test(warmBody), 'de warm-stap wacht op de achtergrondstappen (plaatsing en kaartbeelden) en met de klok mee');
ok(/function warmCountryMaps\(sliceMs = 4\)[\s\S]{0,120}return new Promise/.test(read('game/js/countrymap.js')), 'warmCountryMaps kan zijn klaar-zijn melden');
ok(/precompilePrograms\(\)/.test(warmBody), 'de warm-stap compileert daarna de shaders');
ok(/export function setHoldMaterials/.test(scene) && /heldMaterials\.add\(m\)/.test(read('game/js/scene3d.js')), 'scene3d houdt materialen vast tijdens het voorrijden');
ok(/setCameraOverride\(world, \{ position: \{ x: p\.x \+ 14, y: p\.y \+ 14, z: 24 \}/.test(warmBody) && /introTour/.test(warmBody), 'het laadscherm rijdt de montageplekken op straathoogte af');
ok(/releaseHeldMaterials\(\)/.test(read('game/js/intromontage.js')), 'na de film komen de vastgehouden materialen vrij');
ok(/export function takeWarmupSamples/.test(scene) && /samplesHeld = true/.test(read('game/js/scene3d.js')), 'scene3d kan de warm-up-palette als groep geven');
ok(/takeWarmupSamples\(\)/.test(warmBody) && /world\.__warmSamples/.test(main), 'de warm-up-palette wordt tijdens het laden één keer getekend');
ok(/releaseWarmupSamples\(\)/.test(read('game/js/intromontage.js')), 'de warm-up-palette wordt na de openingsfilm opgeruimd');
ok(/prepareOpeningWarm\(\)/.test(warmBody) && /toggleLightRig\(\)/.test(warmBody), 'de opening-assets worden tijdens het laden echt getekend, onder beide lichtstanden');
ok(/__openingWarm/.test(main) && /disposeObject\(r\.w\.__openingWarm\)/.test(read('game/js/intromontage.js')), 'de getekende opening-assets blijven tot de film en worden daarna opgeruimd');
ok(/w\.cinemaLean = true/.test(read('game/js/intromontage.js')) && /r\.w\.cinemaLean = false/.test(read('game/js/intromontage.js')), 'de film zet de lean-stand aan en na de film weer uit');
ok(/!world\.cinemaLean/.test(read('game/js/scene3d.js')), 'straatmeubels, landleven, perronpubliek, evenementen, werven en parkeerlaag wachten tijdens de film');
ok(/export function introShotPoints\(w\)/.test(read('game/js/intromontage.js')), 'intromontage kan de montageplekken geven');
ok(/introShotPoints\(world\)/.test(warmBody) && /registerShots\(spots/.test(warmBody) && /prewarmStreamAt\(p\.x, p\.y, 180, 170\)/.test(warmBody), 'de warm-stap laadt en prewarmt de montageplekken');
ok(/INTRO_WARM_MS/.test(main) && /!world\.loadedFromSave/.test(warmBody), 'de montage wordt alleen bij een nieuw spel voorgereden en heeft een eigen grens');
ok(/releaseShots\(\)/.test(read('game/js/intromontage.js')), 'de montage geeft de gepinde tegels weer vrij');
ok(/const WARM_START = !\(FLAGS\.noattract[\s\S]{0,260}FLAGS\.autoplay/.test(main), 'een test- of QA-run slaat het voorladen over');
ok(/const START_WARM_R = \d+;/.test(main) && /const START_WARM_MS = \d+;/.test(main), 'de warm-stap heeft een radius en een harde tijdsgrens');
ok((/const START_WARM_R = (\d+);/.exec(main) || [0, 0])[1] <= 360, 'de startring blijft binnen een redelijke grens (<= 360 m)');
ok(/window\.__loadMarks\.startWarm/.test(main) && /window\.__loadMarks\.shaders/.test(main) && /warmWorstFrame/.test(main), 'de perf-meting ziet het voorladen, het compileren en het slechtste frame');
ok(/typeof opts\.warm === 'function'/.test(ss) && /opts\.warm\(\)[\s\S]{0,80}\.then\(finish\)/.test(ss), 'de boot wacht op het voorladen vóór het laadscherm weggaat');
ok(/setLoadingStatus\('De buurt rond je startpunt wordt klaargezet'\)/.test(ss) && /setLoadingStatus\('De shaders worden klaargezet'\)/.test(main), 'het laadscherm zegt wat het nog doet');
ok(/function setLoadingStatus\(text\)/.test(ss), 'de laadschermstatus is ook na finishLoading nog te zetten');
ok(/export function runStartScreen\(world, opts\)/.test(ss) && /return runStartScreen\(world, \{ render, relocate, tick, ready, warm \}\)/.test(main), 'de warm-stap gaat via de bestaande startroute');
// Een nieuw spel én een save warmen voor; de save houdt daarna zijn eigen laadscherm
ok(/function warmBeforeFinish\(opts, finish\)/.test(ss), 'de warm-stap vóór het weggaan van het laadscherm staat in één helper');
const iStartNew = ss.indexOf('const startNew = () => {');
const iContinue = ss.indexOf('const continueGame = () => {', iStartNew);
ok(iStartNew !== -1 && iContinue > iStartNew && ss.slice(iStartNew, iContinue).includes('warmBeforeFinish(opts'), 'een nieuw spel warmt voor');
ok(/loadBootSave\(world\);[\s\S]{0,220}warmBeforeFinish\(opts, \(\) => \{ startLoadScreen\(world, \{ kind: 'save' \}\); finish\(\); \}\);/.test(ss), 'ook een save warmt voor, vóór zijn eigen laadscherm');
const iSaveScreen = ss.indexOf('function runBootSaveScreen(');
const iMenuScreen = ss.indexOf('function runMenuScreen(');
const saveScreen = iSaveScreen !== -1 && iMenuScreen > iSaveScreen ? ss.slice(iSaveScreen, iMenuScreen) : '';
ok(/warmBeforeFinish\(opts, finish\)/.test(saveScreen) && /warmBeforeFinish\(opts, \(\) => \{ startLoadScreen\(world, \{ kind: 'save' \}\)/.test(saveScreen), 'de opgeslagen-spellen-route warmt ook voor');

// --- #751: de eerste-startvraag heeft een time-out en Escape (main.js-vangnet) ---
ok(/const ONLINE_START_WAIT_MS = \d+;/.test(main), '#751: de eerste-startvraag heeft een time-out');
ok(/function waitForOnlineStart\(ms\)/.test(main), '#751: de boot wacht via een eigen wachter');
ok(/closeOnlineStart\(\)/.test(main), '#751: de wachter sluit via de nette route van onlineconsentui.js');
ok(/e\.key !== 'Escape'/.test(main), '#751: Escape sluit de vraag');
ok(/await waitForOnlineStart\(ONLINE_START_WAIT_MS\)/.test(main), '#751: de boot gebruikt de wachter in plaats van een eeuwig wachten');
// De vraag verschijnt al boven het laadscherm; het laden loopt erachter door en pas
// vlak voor de start wordt het antwoord afgewacht.
ok(/function beginOnlineStartQuestion\(\)/.test(main) && /if \(vraagOnline\) beginOnlineStartQuestion\(\);/.test(main), 'de eerste-startvraag opent al over het laadscherm');
const iVraag = main.indexOf('beginOnlineStartQuestion();');
const iFinish = main.indexOf('await finishLoading();');
ok(iVraag !== -1 && iFinish !== -1 && iVraag < iFinish, 'de vraag staat vóór het einde van het laadscherm');
ok(/const antwoord = await waitForOnlineStart\(ONLINE_START_WAIT_MS\)/.test(main) && /Kies of je alleen of samen speelt/.test(main), 'het antwoord wordt met een duidelijke statusregel afgewacht');
ok(/Samen spelen: de wereld wordt klaargezet/.test(main) && /Alleen spelen: de wereld wordt klaargezet/.test(main), 'na het antwoord zegt het laadscherm wat er gebeurt');

// --- #749: de boot heeft een wachter, harde grenzen en rAF-vangnetten ---
ok(/const BOOT_WATCHDOG_MS = \d+;/.test(main) && /function armBootWatchdog\(/.test(main), '#749: de boot heeft een wachter');
// De ladder: één koude tegel kan tijdens de boot read (60 s) + decode (60 s) kosten; de harde
// grens rond loadTileWorld moet daarboven liggen en de wachter daar weer boven (#749).
const bootMs = (naam) => { const m = new RegExp(`const ${naam} = (\\d+);`).exec(main); return m ? Number(m[1]) : NaN; };
ok(bootMs('BOOT_WATCHDOG_MS') === 180000 && bootMs('MAP_LOAD_MS') === 150000, '#749: de bootgrenzen zijn 150 s (tegels) en 180 s (wachter)', `${bootMs('MAP_LOAD_MS')}/${bootMs('BOOT_WATCHDOG_MS')}`);
ok(bootMs('BOOT_WATCHDOG_MS') > bootMs('MAP_LOAD_MS') && bootMs('MAP_LOAD_MS') > 120000, '#749: de ladder is tegelgrens < 150 s < wachter 180 s', `${bootMs('MAP_LOAD_MS')}/${bootMs('BOOT_WATCHDOG_MS')}`);
ok(/^  armBootWatchdog\(\);$/m.test(main), '#749: de wachter start aan het begin van de boot');
ok(/stopBootWatchdog\(\);\n  await waitForStart\(world, ready\);/.test(main), '#749: de wachter stopt als het laden klaar is en op de speler wordt gewacht');
ok(/withDeadline\(loadTileWorld\(/.test(main), '#749: tegels laden heeft een harde grens');
ok(/withDeadline\(loadMap\(/.test(main), '#749: de kaartfallback heeft een harde grens');
ok(/withDeadline\(terrainReady\(\)/.test(main), '#749: terrainReady heeft een deadline');
ok(/document\.hidden/.test(main) && /showBootFailure\(/.test(main) && /Opnieuw laden/.test(main), '#749: een verborgen venster telt niet als hang; de fout is zichtbaar met herladen');
ok(/boot\(\)\.catch\(\(err\) => \{[\s\S]{0,200}stopBootWatchdog\(\);/.test(main), '#749: een afgebroken boot stopt de wachter en toont de fout');
ok(/function afterPaint\(fn\)/.test(ss) && /setTimeout\(afronden, 100\)/.test(ss), '#749: yieldToPaint en de dismiss wachten niet alleen op rAF');
// Een late, alsnog geslaagde boot ruimt de foutstand van de wachter op (rode status + herlaadknop).
ok(/function clearBootError\(\)/.test(ss) && /classList\.remove\('error'\)/.test(ss) && /#boot-reload/.test(ss), '#749: clearBootError haalt de rode status en de herlaadknop weg');
ok(/export async function finishLoading\(\) \{[\s\S]{0,400}clearBootError\(\);/.test(ss), '#749: finishLoading ruimt een late foutstand op');
ok(/export function dismissLoading\(\) \{[\s\S]{0,160}clearBootError\(\);/.test(ss), '#749: dismissLoading ruimt een late foutstand op');

console.log(`${n - fails}/${n} ok`);
process.exit(fails ? 1 : 0);
