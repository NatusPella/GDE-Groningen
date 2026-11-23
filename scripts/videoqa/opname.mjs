// Video-QA (#video-qa-23-11): de eerste minuten van een nieuw spel opnemen terwijl de Spelbot (menselijk profiel, geen
// cheats) speelt, met een vaste tijdstap zodat er geen beelden wegvallen. Bouwt op scripts/trailer (clip.page.js,
// desktop --clip, slot.mjs) en scripts/bot (bot.page.js en zijn pure modules).
//
//   node scripts/videoqa/opname.mjs --out=<map-buiten-de-repo> --game-dir=<gestagede game>
//        [--seconds=900] [--fps=30] [--crf=21] [--seg=90] [--seed=1] [--size=1920x1080] [--electron=<exe>] [--no-slot] [--max-slots=1]
//
// Uitvoer in <out>: seg01.mp4 ... (segmenten van --seg seconden, H.264), tele-NNN.json (telemetrie per beeld en per halve
// seconde), events.jsonl (botlogboek en console-waarschuwingen), opname.json. Daarna: node scripts/videoqa/analyse.mjs.
// Eén Electron met wegwerpprofiel; het slot uit ~/gde-locks wordt altijd vrijgegeven. Raakt poort 9000 en de geïnstalleerde app niet.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freeSlot, LOCKS } from '../trailer/lib/slot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => args.includes(`--${k}`);

const out = path.resolve(opt('out', path.join(os.tmpdir(), 'gde-videoqa')));
const rel = path.relative(ROOT, out);
if (!rel.startsWith('..') && !path.isAbsolute(rel) && !rel.startsWith('.tmp-qa')) { console.error('kies een uitvoermap buiten de repo (of onder .tmp-qa: Electron mag hier alleen in de worktree schrijven)'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const gameDir = path.resolve(opt('game-dir', process.env.GDE_GAME_DIR || ''));
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { console.error('geef --game-dir=<gestagede game>'); process.exit(1); }
const electron = opt('electron', process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe'));
if (!fs.existsSync(electron)) { console.error(`electron ontbreekt: ${electron} (--electron= of ELECTRON_EXE)`); process.exit(1); }
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
const script = path.join(out, '_page.js');
fs.writeFileSync(script, `${pre}\nwindow.__botMain = async () => {\n${botBody}\n};\n${lib}\n${qa}\nreturn await qaMain();\n`);
const events = path.join(out, 'events.jsonl');
fs.writeFileSync(events, JSON.stringify({ type: 'meta', seed, ...cfg, started: new Date().toISOString() }) + '\n');

// --- slot: wacht tot er hooguit --max-slots andere Electron-instanties draaien (standaard 1: twee tegelijk is toegestaan voor beeldruns) ---
const maxOthers = Number(opt('max-slots', 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
const cleanup = () => { freeSlot(slot); slot = null; };
let child = null;
process.on('SIGINT', () => { if (child) child.kill(); cleanup(); process.exit(130); });
process.on('exit', cleanup);
if (!flag('no-slot') && fs.existsSync(LOCKS)) {
  for (let poging = 0; !slot; poging++) {
    const held = [1, 2, 3].filter((n) => fs.existsSync(path.join(LOCKS, `electron-${n}`))).length;
    if (held <= maxOthers) {
      for (const n of [1, 2, 3]) { const d = path.join(LOCKS, `electron-${n}`); try { fs.mkdirSync(d); slot = d; break; } catch { /* bezet */ } }
    }
    if (!slot) { if (poging % 30 === 0) console.log(`[videoqa] wacht op een Electron-slot (${held} bezet)...`); await sleep(20000); }
  }
  console.log(`slot: ${slot}`);
}

const profile = path.resolve(opt('profile', path.join(ROOT, '.tmp-qa', 'profiel-' + process.pid))); fs.mkdirSync(profile, { recursive: true });
const argv = ['.', ...(process.env.GDE_ELECTRON_FLAGS ? process.env.GDE_ELECTRON_FLAGS.split(' ').filter(Boolean) : []), `--smoke-test=${path.join(out, '_smoke.png')}`, `--perf-script=${script}`, `--autoplay=${seed}`, '--stil', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', `--clip=${out}`, `--clip-size=${opt('size', '1920x1080')}`,
  `--preset=${opt('preset', 'quality:hoog,shadows:true,drawDistance:heelver,resolution:1,autoResolution:false')}`, `--bot-events=${events}`];
const env = { ...process.env, GDE_GAME_DIR: gameDir, GDE_TEST_PROFILE: profile, GDE_NIEUW_VERHAAL: '1' };
delete env.GDE_MENU_TEST; delete env.ELECTRON_RUN_AS_NODE;
if (!process.env.GDE_FFMPEG) { const w = `${process.env.LOCALAPPDATA || ''}\\Microsoft\\WinGet\\Links\\ffmpeg.exe`; if (fs.existsSync(w)) env.GDE_FFMPEG = w; }
try {
  const t0 = Date.now();
  const logFd = fs.openSync(path.join(out, 'run.log'), 'w');
  const code = await new Promise((resolve) => {
    child = spawn(electron, argv, { cwd: path.join(ROOT, 'desktop'), stdio: ['ignore', logFd, logFd], env });
    try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch { /* geen rechten */ }
    child.on('close', resolve);
    child.on('error', () => resolve(1));
  });
  console.log(`electron klaar (exit ${code}) na ${((Date.now() - t0) / 60000).toFixed(1)} min; uitvoer in ${out}`);
  process.exitCode = code || 0;
} finally {
  cleanup();
}
