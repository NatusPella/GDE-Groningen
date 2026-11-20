// Echte taxirit en treinrit in beeld (#882, #926): één Electron (wegwerpprofiel) start via de kaartopties een rit naar een
// plaats en neemt beelden op vaste momenten (taxirit_beeld.page.js). De rit moet de echte scène zijn (geen oude DOM-laag),
// de speler moet bij het doel landen en alles moet opgeruimd zijn.
//   node scripts/qa/taxirit_beeld.mjs [--van=Groningen] [--taxi=Winsum] [--trein=Delfzijl] [--momenten=1.5,5,8.5,10.4,12.5,17,21] [--cams: C voor elk moment na het eerste, zo komt elke camera in beeld] [--out=<map>]
// GDE_GAME_DIR=<gestagede game-map> (met backslashes), ELECTRON_EXE=<pad>; uitvoer: <out>/shots-tr-*.png, taxirit_beeld.json, run.log.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { profileDirFor } from '../lib/testprofile.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-qa-taxirit')));
fs.mkdirSync(OUT, { recursive: true });
const profile = profileDirFor(`gde-test-tr-${process.pid}`, OUT); // %TEMP% is voor Electron soms niet schrijfbaar
const script = path.join(OUT, '_page.js');
const cfg = { vanNaam: arg('van', 'Groningen'), naar: [arg('taxi', 'Winsum'), arg('trein', 'Delfzijl')], momenten: arg('momenten', '2.8,5,9.3,12.5,15,17,21').split(',').map(Number), cams: process.argv.includes('--cams') };
fs.writeFileSync(script, `window.__tr = ${JSON.stringify(cfg)};\n` + fs.readFileSync(path.join(HERE, 'taxirit_beeld.page.js'), 'utf8'));
const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NO_THROTTLE: '1' };
if (process.env.GDE_GAME_DIR) env.GDE_GAME_DIR = path.resolve(process.env.GDE_GAME_DIR);
delete env.ELECTRON_RUN_AS_NODE;
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--no-sandbox', '--in-process-gpu', '--force-device-scale-factor=1', `--window-size=${arg('size', '1600x900')}`,
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling', '--disable-features=CalculateNativeWinOcclusion',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`],
{ cwd: process.env.GDE_DESKTOP || path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: 20 * 60 * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt:', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(profile, { recursive: true, force: true });
const l = (r.stdout || '').split('\n').find((x) => x.startsWith('[perf-script] '));
if (l) fs.writeFileSync(path.join(OUT, 'taxirit_beeld.json'), l.slice(14));
console.log(l ? l.slice(14, 400) : 'geen [perf-script]-resultaat', `\nexit ${r.status}; uitvoer: ${OUT}`);
// controle: elke rit is de echte scène geweest, de landing ligt bij het doel en alles is opgeruimd
let fail = !l;
if (l) {
  const j = JSON.parse(l.slice(14));
  for (const x of j.ritten) {
    const slecht = x.fout || !x.echteRit || x.oudeSceneGezien || x.uitkomst === 'time-out' || !x.uitkomst.aangekomen || (x.soort === 'trein' ? (x.landing.afstandTotDoel > 900 || !x.landing.op_perron) : x.landing.afstandTotDoel > 120) || !Object.values(x.opgeruimd || {}).every(Boolean);
    if (x.kosten) console.log(`     cabine: ${x.kosten.metMs} ms met, ${x.kosten.zonderMs} ms zonder; ${x.kosten.callsMet} tegen ${x.kosten.callsZonder} aanroepen, ${x.kosten.driehoekenMet} tegen ${x.kosten.driehoekenZonder} driehoeken`);
    console.log(`${slecht ? 'FAIL' : 'ok  '} ${x.soort} naar ${x.naar}: ${x.fout || `echt ${x.echteRit}, oude scène ${x.oudeSceneGezien}, ${x.duurS} s, ${x.landing.afstandTotDoel} m van het doel, klok +${x.klokVerschilUur} u; beelden ${x.frames ? `${x.frames.gemMs} ms gem., p95 ${x.frames.p95Ms}, max ${x.frames.maxMs}, ${x.frames.boven50}x boven 50 ms` : '-'}`}`);
    if (slecht) fail = true;
  }
  if (j.fout || j.errors.length) { console.log('fouten:', j.fout || j.errors.slice(0, 3).join(' | ')); fail = true; }
}
process.exit(fail ? 1 : 0);
