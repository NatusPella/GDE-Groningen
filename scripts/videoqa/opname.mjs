// Video-QA (#video-qa-23-11): de eerste minuten van een nieuw spel opnemen terwijl de Spelbot (menselijk profiel, geen
// cheats) speelt, met een vaste tijdstap zodat er geen beelden wegvallen. Bouwt op scripts/trailer (clip.page.js,
// desktop --clip) en scripts/bot (bot.page.js en zijn pure modules); start Electron via de runnerbibliotheek
// scripts/lib/electronrunner.cjs (slot, hartslag, wegwerpprofiel in de uitvoermap, --no-sandbox, nooit een dialoogvenster).
//
//   node scripts/videoqa/opname.mjs --out=<map-buiten-de-systeem-temp> --game-dir=<gestagede game>
//        [--seconds=900] [--fps=30] [--crf=21] [--seg=90] [--seed=1] [--size=1920x1080] [--electron=<exe>] [--no-slot] [--max-slots=1]
//        [--limiet-min=<harde grens, standaard 30 + 12 x seconds/60>] [--slot-wacht-min=120]
//
// Uitvoer in <out>: seg01.mp4 ... (segmenten van --seg seconden, H.264), tele-NNN.json (telemetrie per beeld en per halve
// seconde), events.jsonl (botlogboek en console-waarschuwingen), opname.json, run.log (met hartslag) en electron.log.
// Daarna: node scripts/videoqa/analyse.mjs, of alles in één keer met node scripts/videoqa/run.mjs.
// Exitcodes: 0 klaar, 1 fout of geen opname.json, 3 geen slot, 4 Electron niet te starten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import R from '../lib/electronrunner.cjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => args.includes(`--${k}`);

if (!opt('out')) { console.error('geef --out=<map> (niet in de systeem-temp; bijvoorbeeld <worktree>/.scr/videoqa)'); process.exit(1); }
let dirs;
try { dirs = R.prepareRunDir(opt('out')); } catch (e) { console.error(e.message); process.exit(1); }
const out = dirs.out;
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel) && !/^(\.tmp-qa|\.scr)([\\/]|$)/.test(rel)) { console.error('kies een uitvoermap buiten de repo, of onder .scr of .tmp-qa van de worktree'); process.exit(1); }
const log = R.makeLog(out, 'run.log');
const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || ''));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { console.error('geef --game-dir=<gestagede game>'); process.exit(1); }
let electron;
try { electron = opt('electron') ? path.resolve(opt('electron')) : R.findElectron(ROOT); } catch (e) { console.error(e.message); process.exit(4); }
if (!fs.existsSync(electron)) { console.error(`electron ontbreekt: ${electron} (--electron= of ELECTRON_EXE)`); process.exit(4); }
const seed = Number(opt('seed', 1)) || 1;
const seconds = Number(opt('seconds', 900));

// --- het paginascript: bot-vensters + bot als functie + trailerbibliotheek + opnamescript ---
const BOT = path.join(ROOT, 'scripts', 'bot');
const cfg = { part: 'all', maxGameS: 7200, maxWallS: 86400, stuckS: 30, only: '', from: '', skipFrom: false, playS: 40, perS: 60, mode: 'story', sweep: [], perStepS: 600, watch: Number(opt('watch', 600)), annuleer: 0, zonderWater: false, zonderStartplek: true, stageVehicle: '', skipStages: 0, shots: 1, speed: 1, waitS: 45, until: '', invulnerable: false, mens: true, detect: false, klok: null, weer: '', invoer: '', flikker: 0, chaos: null, seed, pogingen: 3 };
let pre = `window.__botCfg = ${JSON.stringify(cfg)};\nwindow.__qaCfg = ${JSON.stringify({ seconds, fps: Number(opt('fps', 30)), crf: Number(opt('crf', 21)), segSeconds: Number(opt('seg', 90)) })};\n`;
const MODS = [
  ['__botNav', 'nav.mjs', 'heliKeys, sailControls, rowDue, wrap, polair, besteTrim, windHoek, zeilRendement, bearing'],
  ['__botBoard', 'board.mjs', 'BOARD, bodyDistance, approachPoint, deurPunt, pickVehicle, boardStep, driveStep, pressed, missed'],
  ['__botBikeRace', 'bikerace.mjs', 'BIKE_RACE, wrap, routeInfo, aimAlong, nearestAhead, rivalBoundS, raceStep'],
  ['__botRace', 'race.mjs', 'RACE, wrap, locate, pointAhead, cornerAhead, kartStep, raceResult'],
  ['__botStunt', 'stunt.mjs', 'STUNT, stuntStep'],
  ['__botLandRoute', 'landroute.mjs', 'LAND, landOmweg, landRecht'],
  ['__botBoat', 'boat.mjs', 'BOOT, bootAchtervolgStap'],
  ['__botMenu', 'menu.mjs', 'MENU, menuStap, menuIndex'],
  ['__botCheat', 'cheatplan.mjs', 'SWEEP_RUNGS, cheatVoor, sweepPlan, cheatSweep, cheatSweepTable'],
  ['__botMens', 'mens.mjs', 'MENS, rng, mensProfiel, situatieSleutel, pogingenOp, cameraUitMatrix, doelZichtbaarheid, bewegingsSpreiding, TekstDuur, OogRem, bouwOogMoment'],
];
for (const [win, file, names] of MODS) {
  const src = fs.readFileSync(path.join(BOT, file), 'utf8').replace(/^export (const|function|class) /gm, '$1 ');
  pre += `window.${win} = (() => {\n${src}\nreturn { ${names} };\n})();\n`;
}
const botBody = fs.readFileSync(path.join(BOT, 'bot.page.js'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'scripts', 'trailer', 'lib', 'clip.page.js'), 'utf8');
const qa = fs.readFileSync(path.join(HERE, 'opname.page.js'), 'utf8');
// de overlapdetector van de QA-sweep (alleen functiedeclaraties): opname.page.js meet er elke 2 s tekst-overlap mee
const ov = fs.readFileSync(path.join(ROOT, 'scripts', 'qa', 'overlap.page.js'), 'utf8');
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `${pre}\nwindow.__botMain = async () => {\n${botBody}\n};\n${lib}\n${ov}\n${qa}\nreturn await qaMain();\n`);
const events = path.join(out, 'events.jsonl');
fs.writeFileSync(events, JSON.stringify({ type: 'meta', seed, ...cfg, started: new Date().toISOString() }) + '\n');

// --- Electron via de runner: hooguit --max-slots andere instanties tegelijk (standaard 1: twee tegelijk mag voor beeldruns) ---
const argv = ['.', ...(process.env.GDE_ELECTRON_FLAGS ? process.env.GDE_ELECTRON_FLAGS.split(' ').filter(Boolean) : []), `--smoke-test=${path.join(out, '_smoke.png')}`, `--perf-script=${script}`, `--autoplay=${seed}`, '--stil', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', `--clip=${out}`, `--clip-size=${opt('size', '1920x1080')}`,
  `--preset=${opt('preset', 'quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false')}`, `--bot-events=${events}`];
const env = R.electronEnv({ profile: dirs.profile, tmp: dirs.tmp, gameDir, extra: { GDE_NIEUW_VERHAAL: '1' } });
delete env.GDE_MENU_TEST;
if (!process.env.GDE_FFMPEG) { const w = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'); if (fs.existsSync(w)) env.GDE_FFMPEG = w; }
const segNu = () => fs.readdirSync(out).filter((f) => /^seg\d+\.mp4$/.test(f)).length;
try {
  const r = await R.runElectron({
    electron, args: argv, cwd: path.join(ROOT, 'desktop'), env, out, log,
    slot: flag('no-slot') ? false : { label: 'videoqa', maxOthers: Number(opt('max-slots', 1)), waitMin: Number(opt('slot-wacht-min', 120)) },
    timeoutMin: Number(opt('limiet-min', 30 + Math.ceil(12 * seconds / 60))),
    status: () => `${segNu()} segment(en)`,
  });
  R.removeProfile(dirs.profile);
  const klaar = fs.existsSync(path.join(out, 'opname.json'));
  log(`electron klaar (exit ${r.code}${r.timedOut ? ', tijdslimiet' : ''}) na ${r.minutes} min; ${segNu()} segment(en), opname.json ${klaar ? 'aanwezig' : 'ONTBREEKT'}; uitvoer in ${out}`);
  process.exitCode = klaar ? 0 : 1;
} catch (e) {
  log(`fout: ${e.message}`);
  process.exitCode = e.code === 'SLOT_TIMEOUT' || e.code === 'SLOT' || e.code === 'SLOT_MAP' ? 3 : e.code === 'START' ? 4 : 1;
}
