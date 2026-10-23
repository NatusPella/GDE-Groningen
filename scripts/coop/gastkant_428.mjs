// Coöp-testbank (#428): wat een gast ziet van de rest van de wereld van de host: voetgangers met hun echte uiterlijk (kleding, huid, haar, agent,
// last), lopen, groeten en praten; dieren; verkeerslichten die de host volgen; kapotte objecten die ook bij de gast kapot gaan en weer heel worden.
// Eén Electron-gast en een gescripte gastheer in Node (nodehost.mjs). Maakt schermafbeeldingen (shots*.png in de uitvoermap).
//   node scripts/coop/gastkant_428.mjs --stage=<gestagede game-map> [--out=<map>]
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
const SIZE = arg('size', '1280x720'); // ook 1920x1080 (#377)
const MOCK = Math.max(0, Math.min(2, Number(arg('mock', 0)) || 0)); // extra headless spelers: 0 = twee spelers in totaal, 2 = vier
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant428', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

// ---- één slot, hooguit 12 minuten vasthouden en dan even loslaten voor anderen
const held = [];
let wachtN = 0;
async function takeSlot() {
  for (;;) {
    for (const k of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); held.push(d); return; } catch (e) { /* bezet */ } }
    if (++wachtN % 300 === 1) console.log('sloten bezet, wacht'); await new Promise((r) => setTimeout(r, 100)); // elke seconde kijken: een slot dat even vrij is, pak je zo sneller
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// ---- het programma van de gast (seconden na "verbonden") en het draaiboek van de host, op dezelfde tijdlijn
const PROGRAM = [
  [0, 'wacht', { s: 8 }], [8, 'wereld428', { stap: 'props' }], [10, 'wacht', { s: 10 }], [20, 'wereld428', { stap: 'kijk', naam: 'w428a' }], [28, 'wacht', { s: 12 }], [40, 'wereld428', { stap: 'kijk', naam: 'w428b' }], [48, 'wacht', { s: 8 }],
];
const HOST_STOP = 62;
const code = {};
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant428-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--coop', '--autoplay=22', '--url-flags=touch=1',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', (c) => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

// het draaiboek van de host begint zodra de gast "allen-erbij" meldt
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const mocks = [];
  if (MOCK) { const { startMockGuest } = await import('./mockclient.mjs'); for (let i = 0; i < MOCK; i++) { const m = await startMockGuest({ stage: STAGE, code: host.code, net: {}, seed: 31 + i }); m.input = (t) => ({ mx: Math.cos(t / 4 + i * 2), my: Math.sin(t / 4 + i * 2), run: false, yaw: 0 }); mocks.push(m); } }
  const W = await import(pathToFileURL(path.join(ROOT, 'game', 'js', 'weatherstate.js')).href);
  const ws = W.createWeatherState(5); host.world.weatherState = ws;
  globalThis.__mocks = mocks;
  { const wall = (readEvents().find((e) => e.type === 'allen-erbij') || {}).wall; if (wall) { const gap = (Date.now() - wall) / 1000, at0 = host.at; host.at = (s, fn) => at0.call(host, Math.max(0, s - gap), fn); } } // de tijdlijn van de gast loopt vanaf "allen-erbij"; de headless gasten kosten tijd om te verbinden
  // de gast kiest een paar props bij zich; de nep-host meldt ze als kapot en na een tijd weer als heel
  for (let i = 0; i < 120 && !readEvents().some((e) => e.type === 'w428-props'); i++) await new Promise((r) => setTimeout(r, 500));
  const pr = readEvents().find((e) => e.type === 'w428-props');
  host.log.push('props bij de gast: ' + (pr ? pr.keys.length + ' van ' + pr.alle : 'geen'));
  if (pr) { host.kapot = pr.keys; host.log.push('kapot gemeld: ' + pr.keys.map((k) => k.key).join(' ')); }
  host.at(30, (h) => { h.kapot = []; h.log.push('weer heel gemeld'); });
  host.at(HOST_STOP, async (h) => { h.log.push('host stopt'); await h.stop(); });
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }
for (const m of globalThis.__mocks || []) { try { await m.stop(); } catch (e) { /* al weg */ } }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
const S = of('sample');
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
check(S.length > 40, 'te weinig samples: ' + S.length);
const W1 = of('w428')[0], W2 = of('w428')[1], PR = of('w428-props')[0];
check(S.length > 20, 'te weinig samples');
check(W1 && W1.meshes && W1.meshes[0] >= 10, 'voetgangers: de gast tekent geen 10 echte personen: ' + JSON.stringify(W1 && W1.meshes));
check(W1 && W1.hostMesh && W1.hostMesh[3] === 0, 'voetgangers: de gast tekent een eenvoudig poppetje: ' + JSON.stringify(W1 && W1.hostMesh));
check(W1 && W1.meshes && W1.meshes[1] >= 7, 'dieren: de gast tekent niet alle dieren: ' + JSON.stringify(W1 && W1.meshes));
check(W1 && W1.stand && W1.stand[1] >= 12, 'uiterlijk: te weinig uiterlijken binnen: ' + JSON.stringify(W1 && W1.stand));
check(W1 && W1.sprekers >= 1, 'praten: geen tekstballon van een voetganger: ' + JSON.stringify(W1 && W1.sprekers));
check(W1 && W1.lokaalPeds === 0 && W1.lokaalDieren === 0, 'de gast heeft nog eigen voetgangers of dieren (lokaal verzonnen): ' + JSON.stringify(W1 && [W1.lokaalPeds, W1.lokaalDieren]));
if (W1 && W1.lichtHost) { const n = W1.lichtHost.filter((t) => t != null).length; check(n >= 3, 'lichten: de host stuurde er te weinig: ' + JSON.stringify(W1.lichtHost)); const ok = W1.lichtHost.every((t, i) => t == null || Math.min(Math.abs(t - W1.lichtT[i]), 40 - Math.abs(t - W1.lichtT[i])) < 3); check(ok, 'lichten: de klok van de gast loopt niet gelijk met de host: ' + JSON.stringify([W1.lichtT, W1.lichtHost])); }
check(PR && PR.keys.length > 0, 'kapot: de gast heeft geen props om kapot te melden: ' + JSON.stringify(PR));
if (PR && PR.keys.length) {
  check(W1 && W1.kapot.length === PR.keys.length && W1.kapot.every(([, kapot]) => kapot), 'kapot: de props zijn bij de gast niet kapot gegaan: ' + JSON.stringify(W1 && W1.kapot));
  check(W2 && W2.kapot.length === 0, 'kapot: de lijst is niet leeg na "weer heel": ' + JSON.stringify(W2 && W2.kapot));
}
check(S.every((s) => !s.me || (Number.isFinite(s.me.x) && Number.isFinite(s.me.y))), 'NaN in de positie van de gast');
const bytes = W2 ? W2.bytes : 0; const secs = (S.length ? S[S.length - 1].t - S[0].t : 1) || 1;
notes.push('extra wereld: ' + bytes + ' B in ' + Math.round(secs) + ' s = ' + Math.round(bytes / secs) + ' B/s naar deze gast');
notes.push('w428a: ' + JSON.stringify(W1), 'w428b: ' + JSON.stringify(W2));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
