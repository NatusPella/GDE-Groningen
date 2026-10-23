// Coöp-testbank, duurtest van de gast in Electron (#428): één Electron-gast en een gescripte gastheer (nodehost.mjs) die minutenlang voertuigen en
// voetgangers laat verlopen (nieuwe id's), een rit maakt, pauzeert, een opdracht start en stopt, en twee headless medespelers laat komen en gaan.
// De gast meet elke 5 s: JS-heap (na gc), geometrieën, texturen en programma's van de renderer, het aantal objecten, materialen en geometrieën in de scene,
// de tabellen van de extra wereld en de wachtrijen van de sessie. Oordeel: niets groeit door na het opwarmen.
//   node scripts/coop/gastkant_duur.mjs --stage=<gestagede game-map> [--min=10] [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startNodeHost } from './nodehost.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const SIZE = arg('size', '1280x720');
const MIN = Math.max(1, Number(arg('min', 10)));
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastduur', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

// ---- een Electron-slot uit de slotenmap (maximaal 3 tegelijk op de computer), altijd weer vrijgeven
const held = [];
let wachtN = 0;
async function takeSlot() {
  for (;;) {
    for (const k of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); held.push(d); return; } catch (e) { /* bezet */ } }
    if (++wachtN % 300 === 1) console.log('sloten bezet, wacht'); await new Promise((r) => setTimeout(r, 100));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

const PROGRAM = [[0, 'wacht', { s: 8 }], [8, 'duurmeting', { s: MIN * 60, elke: 5 }]];
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastduur-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--coop', '--autoplay=22', '--url-flags=touch=1', '--js-flags=--expose-gc',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', (c) => {
  fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
  const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script-result]')); let r = {};
  try { r = JSON.parse(m.slice(m.indexOf('{'))); } catch (e) { r = { result: 'GEEN UITSLAG', reason: 'code ' + c }; }
  res(r);
}));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

// het draaiboek van de host: verloop van voertuigen en voetgangers, een rit, pauze, opdracht, medespelers
const mocks = [];
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const { startMockGuest } = await import('./mockclient.mjs');
  const komMock = async (i) => { const m = await startMockGuest({ stage: STAGE, code: host.code, net: { latency: 0.05, jitter: 0.01 }, seed: 31 + i, maxLog: 100 }); m.input = (t) => ({ mx: Math.cos(t / 4 + i), my: Math.sin(t / 4 + i), run: false, yaw: 0 }); mocks.push(m); return m; };
  await komMock(0); await komMock(1);
  let id = 5000, ronde = 0;
  const KLEUR = ['#b8473a', '#3a6ea5', '#4f8a5b', '#d9b44a', '#7a5a9a', '#e8e6e0'], HUID = ['#f0c8a0', '#d9aa82', '#b98560', '#8a5a3c'];
  const w = host.world;
  const tik = setInterval(async () => {
    ronde++;
    try {
      for (let i = 0; i < 3; i++) { // voertuigen en voetgangers verlopen: nieuwe id's, nieuwe uiterlijken
        w.vehicles.shift(); w.vehicles.push({ id: ++id, x: -1272 + 9 * (ronde % 8) + i * 6, y: -1074 + (i % 2) * 14, angle: i % 2 ? Math.PI : 0, model: { len: i === 1 ? 11 : 4.2 }, isBus: i === 1 });
        w.pedestrians.shift(); w.pedestrians.push({ id: ++id, x: -1297 + (ronde * 3 + i * 4) % 40, y: -1060 + i * 3, angle: ronde + i, speed: 0.8, state: 'wander', health: 30, clothing: KLEUR[(ronde + i) % 6], skin: HUID[(ronde + i) % 4], _lookSeed: 11.5 + ronde * 17 + i, hasBag: i === 0, speechText: i === 2 ? 'Moi, ronde ' + ronde : undefined, speechUntil: i === 2 ? w.time + 3 : 0 });
      }
      if (ronde % 4 === 1) host.rit(true);
      if (ronde % 4 === 3) host.rit(false); // een rit van een paar tientallen seconden
      host.state.pauze = ronde % 7 === 5; // af en toe pauze
      host.mission(ronde % 3 === 0 ? { phase: 'active', label: 'Het Loket', type: 'stages', index: 3, progressText: 'Stap in de auto', marker: { x: -1250, y: -1040 } } : { phase: 'idle' });
      if (ronde % 3 === 1 && w.coopUitslag) w.coopUitslag(ronde % 2 === 0, 'Het Loket', '', 400);
      if (ronde % 5 === 0 && mocks.length) { const m = mocks.shift(); await m.stop(); await komMock(ronde); } // een medespeler gaat weg en een nieuwe komt
    } catch (e) { host.log.push('fout ' + e.message); }
  }, 12000);
  host.at(MIN * 60 + 8, async (h) => { clearInterval(tik); h.log.push('host stopt'); await h.stop(); });
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }
for (const m of mocks) { try { await m.stop(); } catch (e) { /* al weg */ } }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const D = E.filter((e) => e.type === 'duur');
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
check(D.length >= Math.floor(MIN * 60 / 5) - 6, `te weinig metingen: ${D.length}`);
const helling = (ys) => { const n = ys.length; if (n < 4) return 0; const mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b, 0) / n; let nu = 0, de = 0; ys.forEach((y, i) => { nu += (i - mx) * (y - my); de += (i - mx) ** 2; }); return nu / de; };
const na = D.slice(Math.floor(D.length / 4)); // het eerste kwart is opwarmen
const reeks = (f, lijst = D) => lijst.map(f).filter((x) => Number.isFinite(x));
const slope = (f) => +(helling(reeks(f, na)) * 12).toFixed(2); // per minuut (12 metingen)
const eerste = D[Math.floor(D.length / 4)] || {}, laatste = D[D.length - 1] || {};
const tab = {};
for (const k of ['heapMB', 'geometries', 'textures', 'programs', 'sceneKinderen', 'sceneMaterialen', 'sceneGeometrieen', 'figuren', 'sprekers', 'domEls', 'snaps', 'relP', 'relA', 'looks']) tab[k] = { opgewarmd: eerste[k], eind: laatste[k], max: Math.max(...reeks((d) => d[k])), perMin: slope((d) => d[k]) };
notes.push('metingen: ' + D.length + ' over ' + MIN + ' min; ' + JSON.stringify(tab));
check(tab.heapMB.perMin < 2, `JS-heap groeit ${tab.heapMB.perMin} MB per minuut`);
check(tab.geometries.perMin < 20, `geometrieën groeien ${tab.geometries.perMin} per minuut (${eerste.geometries} naar ${laatste.geometries})`);
check(tab.textures.perMin < 10, `texturen groeien ${tab.textures.perMin} per minuut`);
check(tab.sceneKinderen.perMin < 30, `objecten in de scene groeien ${tab.sceneKinderen.perMin} per minuut (${eerste.sceneKinderen} naar ${laatste.sceneKinderen})`);
check(tab.sceneMaterialen.perMin < 10, `materialen in de scene groeien ${tab.sceneMaterialen.perMin} per minuut`);
check(tab.domEls.perMin < 20, `DOM-elementen groeien ${tab.domEls.perMin} per minuut`);
check(tab.relP.max <= 32 && tab.snaps.max <= 40 && tab.looks.max <= 400, 'wachtrijen of buffers boven hun grens');
const S = E.filter((e) => e.type === 'sample'); const fps = S.map((s) => s.fps).filter(Number.isFinite).sort((a, b) => a - b);
notes.push('fps (gast, p5 en mediaan): ' + (fps.length ? fps[Math.floor(fps.length * 0.05)] + ' en ' + fps[Math.floor(fps.length / 2)] : '?'));
check(!S.some((s) => s.desync && s.desync.length), 'desync bij de gast');
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, tab, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
