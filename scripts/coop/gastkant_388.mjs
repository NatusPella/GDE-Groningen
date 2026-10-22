// Coöp-testbank (#388, playtest 22-10): de camera en de besturing van een gast in een echte Electron-instantie met een gescripte host
// in Node (zoals gastkant_vrijdag.mjs; één slot): de camera draait met de muis, de gast loopt verder dan 38 m van de gastheer en wordt
// teruggezet als hij te ver gaat (en gaat mee als de gastheer springt), en de gast blijft lopen terwijl het spel van de gastheer op pauze staat.
//   node scripts/coop/gastkant_388.mjs --stage=<gestagede game-map> [--out=<map>]
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
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
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
  [0, 'wacht', { s: 6 }], [8, 'gastcamera', {}], [16, 'gastloop', { s: 30, naam: 'gastloop' }], [50, 'wacht', { s: 6 }], [58, 'gastloop', { s: 12, naam: 'gastpauze', rennen: false }], [74, 'wacht', { s: 8 }],
];
const HOST_STOP = 90;
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
  host.at(57, (h) => { h.state.pauze = true; h.log.push('pauze aan'); }); // het pauzemenu van de gastheer
  host.at(71, (h) => { h.state.pauze = false; h.log.push('pauze uit'); });
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
const cam = of('gastcamera')[0];
check(cam && Math.abs(cam.yaw1 - cam.yaw0) > 1, 'camera: de gast draait niet met de muis: ' + JSON.stringify(cam));
const lp = of('gastloop')[0];
check(lp && lp.max > 70, 'lijn: de gast komt niet verder dan 38 m van de gastheer: ' + JSON.stringify(lp));
const afst = S.filter((s) => s.me && s.companion && s.t >= (lp ? lp.t - 31 : 0) && s.t <= (lp ? lp.t : 0)).map((s) => Math.hypot(s.me.x - s.companion.x, s.me.y - s.companion.y));
const terug = afst.some((d, i) => i && afst[i - 1] - d > 60); // de gast rent door: na 110 m en 4 s zet het spel hem bij de groep (een val van meer dan 60 m tussen twee samples)
check(terug, 'band: de gast wordt niet bij de groep gezet: ' + afst.map((d) => Math.round(d)).join(' '));
notes.push('afstand tot de gastheer: ' + afst.map((d) => Math.round(d)).join(' '));
const pz = of('gastpauze')[0];
check(pz && pz.verplaatst > 12, 'pauze: de gast loopt niet door terwijl de gastheer pauzeert: ' + JSON.stringify(pz));
check(S.some((s) => s.sc && s.sc[1] === 1), 'pauze: de gast ziet niet dat de gastheer pauzeert');
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('gastcamera: ' + JSON.stringify(cam), 'gastloop: ' + JSON.stringify(lp), 'gastpauze: ' + JSON.stringify(pz), 'draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
