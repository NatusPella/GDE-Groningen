// Coöp-testbank (#95, vrijdag 23-10): wat een gast ziet van het weer, een roep, het doel, de uitslag, neergaan en meerijden,
// in een echte Electron-instantie met een gescripte host in Node (zoals gastkant.mjs; één slot).
// (de kant van de GAST in een echte Electron-instantie, met een gescripte host in Node
// (scripts/coop/nodehost.mjs): één Electron-slot genoeg. De host beweegt Tammo, voertuigen en voetgangers, zet een
// opdracht, een filmpje, een keuze, pauze, wanted en een rit met Tessa als passagier in het spel en betaalt de gast.
// De gast speelt via het hoofdmenu en de lobby zoals een speler: toestemming, verbinden, aanraakbediening, een afwijking
// (desync), opnieuw verbinden via het wachtscherm, zijn eigen save, en het einde als de gastheer stopt.
//   node scripts/coop/gastkant_vrijdag.mjs --stage=<gestagede game-map> [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startNodeHost } from './nodehost.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

// ---- één slot, hooguit 12 minuten vasthouden en dan even loslaten voor anderen
const held = [];
async function takeSlot() {
  for (;;) {
    for (const k of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); held.push(d); return; } catch (e) { /* bezet */ } }
    console.log('sloten bezet, wacht 10 s'); await new Promise((r) => setTimeout(r, 10000));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// ---- het programma van de gast (seconden na "verbonden") en het draaiboek van de host, op dezelfde tijdlijn
const PROGRAM = [
  [0, 'wacht', { s: 8 }], [10, 'shot', { name: 'v-start' }], [24, 'shot', { name: 'v-onweer' }], [30, 'shot', { name: 'v-roep' }], [38, 'shot', { name: 'v-doel' }],
  [46, 'shot', { name: 'v-uitslag' }], [54, 'shot', { name: 'v-gepakt' }], [66, 'shot', { name: 'v-rit' }], [78, 'wacht', { s: 20 }],
];
const HOST_STOP = 96;
const code = {};
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', '--coop', '--autoplay=22', '--url-flags=touch=1',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', (c) => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

// het draaiboek van de host begint zodra de gast "allen-erbij" meldt
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const W = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'weatherstate.js')).href);
  const ws = W.createWeatherState(5); host.world.weatherState = ws;
  host.at(8, (h) => { ws.regions.stad.kind = 'onweer'; ws.regions.stad.rain = 0.85; ws.regions.stad.overcast = 0.95; });
  host.at(26, (h) => h.log.push('roep ' + h.N.sendPing(h.world, h.world.player.x + 6, h.world.player.y + 2, 'gevaar')));
  host.at(32, (h) => h.mission({ phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Rij naar het loket', marker: { x: -1200, y: -1020 } }));
  host.at(42, (h) => { h.mission(null); h.world.coopUitslag(true, 'Het Loket', '', 400); h.pay(200, 1); });
  host.at(50, (h) => { h.world.pendingRespawn = { busted: true }; });
  host.at(53, (h) => { h.world.pendingRespawn = null; });
  host.at(58, (h) => h.rit(true));
  host.at(72, (h) => h.rit(false));
  host.at(HOST_STOP, async (h) => { h.log.push('host stopt'); await h.stop(); });
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
const S = of('sample'); const T0 = (of('allen-erbij')[0] || {}).t || 0;
const win = (a, b) => S.filter((s) => s.t >= T0 + a && s.t <= T0 + b);
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
check(S.length > 60, 'te weinig samples: ' + S.length);
const fps = S.filter((s) => s.fps > 0).map((s) => s.fps).sort((a, b) => a - b); notes.push(`beeldsnelheid van de gast: mediaan ${fps.length ? fps[Math.floor(fps.length / 2)] : '?'} fps, laagste ${fps[0] ?? '?'}`);
// weer: de gast volgt de gastheer (onweer boven de stad) en ziet het
const w1 = win(18, 30); check(w1.length && w1.some((s) => s.weer && /stad:onweer/.test(s.weer)), 'weer: de gast kreeg het weer van de gastheer niet: ' + JSON.stringify(w1.slice(-1).map((s) => s.weer)));
check(w1.some((s) => s.wx && s.wx[1] > 20), 'weer: het regent niet bij de gast: ' + JSON.stringify(w1.slice(-1).map((s) => s.wx)));
// roep
const r1 = win(28, 34); check(r1.some((s) => s.pm && /Help!\|Tammo/.test(s.pm)), 'roep: geen baken voor "Help!" van Tammo: ' + JSON.stringify(r1.slice(-1).map((s) => s.pm)));
// doel op minimap en kaart: het doel zit in de snapshot en in coopHost
const d1 = win(36, 41); check(d1.length && d1.every((s) => s.hostEnt && s.hostEnt[1] === 1), 'doel: de gast ziet het doel niet: ' + JSON.stringify(d1.slice(-1).map((s) => s.hostEnt)));
const d2 = win(44, 49); check(d2.length && d2.every((s) => s.hostEnt && s.hostEnt[1] === 0), 'doel: het blijft staan na de opdracht');
// gepakt en meerijden
const g1 = win(51, 53); check(g1.length && g1.some((s) => s.partners.some((p) => p[1] === 'Tammo' && p[2] === 'neergeslagen')), 'gepakt: de gast ziet Tammo niet als neergeslagen: ' + JSON.stringify(g1.slice(-1).map((s) => s.partners)));
const m1 = win(62, 70); check(m1.length && m1.some((s) => s.voert === 1), 'meerijden: de gast weet niet dat hij meerijdt');
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
