// De Spelbot-driver (#186): start één Electron-instantie met wegwerpprofiel, laat
// bot.page.js de game spelen en bouwt uit de gebeurtenissen het rapport.
//   node scripts/bot/run.mjs [--out=<map>] [--part=kop|all] [--seed=1] [--stuck=30]
//        [--max-game=3600] [--max-wall=1800] [--shots=80] [--invuln] [--audio] [--force]
//   node scripts/bot/run.mjs --mode=minigames [--only=kartbaan,duif] [--play=40]   (fase 3: elke minigame kort spelen)
//   node scripts/bot/run.mjs --mode=missions --only=M03,M04 [--per-step=600]   (elke stap los, via een sprong)
//   node scripts/bot/run.mjs --report=<map>           (rapport opnieuw uit events.jsonl)
//   node scripts/bot/run.mjs --replay=<events.jsonl> [--out=<map>]   (invoer terugspelen)
// ELECTRON_EXE=<pad> als desktop/node_modules/electron/dist ontbreekt. Vereist
// `cd desktop && npm run stage` (game/world; stage opnieuw na elke wijziging aan game/js, de app draait de gestagede kopie). Geen netwerkpoorten: de pagina wordt
// aangestuurd via --perf-script (executeJavaScript) en de uitvoer loopt via
// console-regels naar <out>/events.jsonl. Start niet als er al een Electron loopt (--force).
// Uitvoer in <out>: events.jsonl (tijdlijn en invoer), replay.jsonl (alleen invoer),
// report.md, result.json, run.log, shots-<naam>.png.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-spelbot', stamp)));
const L = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'botlogic.js')).href);

function buildFiles(out, meta) {
  const text = fs.readFileSync(path.join(out, 'events.jsonl'), 'utf8');
  const log = L.RunLog.parse(text);
  // console lines carry no game time: give them the one of the event before
  let t = 0;
  for (const e of log.events) { if (Number.isFinite(e.t) && e.type !== 'console') t = e.t; else e.t = t; }
  log.meta = { ...log.meta, ...meta };
  const replay = new L.RunLog(log.meta);
  replay.events = log.events.filter((e) => e.type === 'key' || e.type === 'axis');
  fs.writeFileSync(path.join(out, 'replay.jsonl'), replay.toJsonl());
  const missing = log.events.filter((e) => e.type === 'shot').map((e) => e.name).filter((n) => !fs.existsSync(path.join(out, `shots-${n}.png`)));
  const notes = [...(meta.notes || [])];
  if (missing.length) notes.push(`Screenshot niet op schijf: ${missing.join(', ')}`);
  const md = L.buildReport(log.events, { ...log.meta, notes, title: meta.title || 'run', shotPrefix: 'shots-' });
  fs.writeFileSync(path.join(out, 'report.md'), md);
  return { log, md };
}

if (arg('report')) {
  const out = path.resolve(arg('report'));
  const r = fs.existsSync(path.join(out, 'result.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf8')) : {};
  buildFiles(out, { result: r.result, gameSeconds: r.gameSeconds, wallSeconds: r.wallSeconds, seed: r.seed, arc: r.arc });
  console.log(`rapport: ${path.join(out, 'report.md')}`);
  process.exit(0);
}

// één Electron-instantie tegelijk (AGENTS.md)
if (!flag('force') && process.platform === 'win32') {
  const t = spawnSync('tasklist', ['/FI', 'IMAGENAME eq electron.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8' });
  if (/electron\.exe/i.test(t.stdout || '')) { console.error('Er draait al een Electron-instantie; de bot wacht niet. Sluit hem of gebruik --force.'); process.exit(3); }
}

fs.mkdirSync(OUT, { recursive: true });
const seed = Number(arg('seed', 1)) || 1;
const replayFile = arg('replay');
const profile = `gde-test-spelbot-${process.pid}`;
const script = path.join(OUT, '_page.js');
const cfg = { part: arg('part', 'kop'), maxGameS: Number(arg('max-game', 3600)), maxWallS: Number(arg('max-wall', 1800)), stuckS: Number(arg('stuck', 30)), only: arg('only', ''), playS: Number(arg('play', 40)), mode: arg('mode', 'story'), sweep: arg('mode') === 'missions' ? arg('only', '').split(',').filter(Boolean) : [], perStepS: Number(arg('per-step', 600)), shots: Number(arg('shots', 80)), invulnerable: flag('invuln') };
let pre = `window.__botCfg = ${JSON.stringify(cfg)};\n`;
if (replayFile) {
  const rl = L.RunLog.parse(fs.readFileSync(path.resolve(replayFile), 'utf8'));
  pre += `window.__botReplay = ${JSON.stringify(rl.inputs())};\n`;
}
fs.writeFileSync(script, pre + fs.readFileSync(path.join(HERE, replayFile ? 'replay.page.js' : cfg.mode === 'minigames' ? 'minigames.page.js' : cfg.mode === 'bruggen' ? 'bruggen.page.js' : 'bot.page.js'), 'utf8'));
const events = path.join(OUT, 'events.jsonl');
fs.writeFileSync(events, JSON.stringify({ type: 'meta', replay: L.REPLAY_VERSION, seed, ...cfg, started: new Date().toISOString() }) + '\n');

const electron = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_NIEUW_VERHAAL: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const t0 = Date.now();
const r = spawnSync(electron, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', `--autoplay=${seed}`, ...(flag('audio') ? ['--audio-graph'] : []), ...(flag('viaducten') ? ['--viaducten'] : []),
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`],
{ cwd: path.join(ROOT, 'desktop'), env, encoding: 'utf8', maxBuffer: 1 << 28, timeout: (cfg.maxWallS + 240) * 1000, killSignal: 'SIGKILL' });
if (r.error) console.error('Electron starten mislukt (niet geïnstalleerd? zet ELECTRON_EXE):', r.error.message);
fs.writeFileSync(path.join(OUT, 'run.log'), `${r.stdout || ''}\n${r.stderr || ''}`);
fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });

let res = { result: r.status === 0 ? 'ONBEKEND' : 'ELECTRON-FOUT', reason: `exit ${r.status}${r.signal ? ' ' + r.signal : ''}` };
for (const l of (r.stdout || '').split(/\r?\n/)) { const m = l.match(/^\[perf-script\] (.*)$/); if (m) try { res = JSON.parse(m[1]); } catch { /* geen JSON */ } }
const smokeErr = (r.stdout || '').split(/\r?\n/).find((l) => l.startsWith('[smoke error]'));
if (smokeErr &&!['KLAAR', 'TIMEOUT', 'REPLAY'].includes(res.result)) res = { result: 'FOUT', reason: smokeErr.slice(14) };
res.seed = seed;
res.wallSeconds = res.wallSeconds ?? Math.round((Date.now() - t0) / 1000);
res.arc = 'nieuw';
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(res, null, 1));
buildFiles(OUT, { result: `${res.result}${res.reason ? ` (${res.reason})` : ''}`, gameSeconds: res.gameSeconds, wallSeconds: res.wallSeconds, seed, arc: 'nieuw', title: `${cfg.part}, seed ${seed}` });
console.log(`${res.result}: ${res.reason || ''}`);
console.log(`uitvoer: ${OUT}`);
process.exit(res.result === 'KLAAR' || res.result === 'REPLAY' ? 0 : 1);
