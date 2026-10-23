// Coöp-testbank (#428): voertuigen bij een gast precies als bij de gastheer: echt model en echte kleur, schade, richtingaanwijzers,
// zwaailicht, draaiende en sturende wielen, een heli met rotor, een boot en een vliegtuig, op een gescripte host in Node (één slot).
//   node scripts/coop/gastkant_428.mjs --stage=<gestagede game-map> [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startNodeHost, START } from './nodehost.mjs';

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
const PROGRAM = [[0, 'wacht', { s: 8 }], [8, 'kijk', { naam: 'v428a' }], [16, 'wacht', { s: 6 }], [22, 'kijk', { naam: 'v428b' }], [30, 'water', { naam: 'v428water' }], [40, 'wacht', { s: 6 }]];
const HOST_STOP = 56;
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
  const w = host.world, S0 = START;
  // vier groepen in de vier windrichtingen, 8 m van de gast: de vier camerastanden van 'kijk' zien elk een groep
  const mk = (id, groep, nr, extra, model) => { const a = groep * Math.PI / 2, r = 8 + (nr >> 1) * 4, t = ((nr % 2) ? 1 : -1) * (2.5 + (nr >> 1) * 2); return { id, x: S0.x + Math.cos(a) * r - Math.sin(a) * t, y: S0.y + 2 + Math.sin(a) * r + Math.cos(a) * t, angle: a + Math.PI / 2 + 0.4, speed: 0, steer: 0, z: 0, parkeer: true, model: { maxSpeed: 30, ...model }, ...extra }; };
  w.vehicles = [
    mk(301, 0, 0, { speed: 0, indicator: 'left', dentLog: [[2.0, 0.2, 0.9], [1.8, -0.5, 0.7], [-0.5, 0.9, 0.6]], flat: true }, { name: 'sedan', len: 4.3, wid: 1.8, color: '#7a1f1f' }),
    mk(302, 0, 1, { isPolice: true, sirenOn: true }, { name: 'police', len: 4.3, wid: 1.8, color: '#1c1c1c' }),
    mk(309, 0, 3, { isHeli: true, z: 6, rotor: 1 }, { name: 'heli', len: 8.8, wid: 2.1, color: '#e8e6e0' }),
    mk(304, 1, 0, { isBike: true }, { name: 'bike', len: 1.75, wid: 0.5, color: '#2b2b2b', rider: '#7a2e2e' }),
    mk(305, 1, 1, { isScooter: true }, { name: 'motor', motorbike: 'sport', len: 2.05, wid: 0.7, color: '#c9a227', rider: '#1c1c1e' }),
    mk(310, 0, 5, { isPlane: true, z: 1.5 }, { name: 'plane', len: 8, wid: 10.6, color: '#e9e4d3' }),
    mk(311, 2, 0, { isBoat: true }, { name: 'boat', kind: 'sloep', len: 5.5, wid: 2.0, color: '#e8e6e0', cabin: '#2f3a44' }),
    mk(312, 2, 1, { isBoat: true }, { name: 'boat', kind: 'rondvaart', len: 14, wid: 3.3, color: '#1d3350', cabin: '#e8e6e0' }),
    mk(306, 2, 2, {}, { name: 'van', len: 5.0, wid: 2.0, color: '#c9541e' }),
    mk(303, 3, 0, { isBus: true }, { name: 'bus', len: 11.2, wid: 2.55, trailer: 6.8, color: '#132a44', stripe: '#3fc6d4', accent: '#e8e6de' }),
    mk(307, 3, 1, { indicator: 'hazard' }, { name: 'sport', len: 4.1, wid: 1.85, color: '#2e4a34' }),
    mk(308, 3, 2, {}, { name: 'truck', len: 8, wid: 2.5, color: '#d9dcdf', tank: true }),
    mk(313, 3, 3, { isTaxi: true }, { name: 'taxi', len: 4.3, wid: 1.8, color: '#e0b020' }),
  ];
  // één rijdende auto met scherpe stuurhoek: de wielen moeten draaien en sturen
  const rijd = { id: 320, x: S0.x - 8, y: S0.y + 8, angle: 0, speed: 6, steer: 0.8, z: 0, parkeer: false, model: { name: 'hatch', len: 3.8, wid: 1.7, color: '#4a8fd0' } };
  w.vehicles.push(rijd);
  w.wanted = 0;
  host.at(20, (h) => { // nieuwe klap op de rode sedan (gedeukt tijdens het spel) en een andere kleur lak: de gast past het aan
    h.world.vehicles[0].dentLog.push([-2.0, 0.1, 0.8]);
    h.log.push('nieuwe deuk');
  });
  host.at(31, (h) => { // de boten naar het water dat de gast net vond, 12 m verder in dezelfde richting
    const wt = readEvents().find((e) => e.type === 'water');
    if (!wt || wt.geen) { h.log.push('geen water gevonden'); return; }
    const [a, b] = h.world.vehicles.filter((v) => v.isBoat);
    for (const [v, k] of [[a, 0], [b, 1]]) { v.x = wt.x + Math.cos(wt.a) * (3 + k * 9) + Math.cos(wt.a + 1.57) * (k ? 4 : -2); v.y = wt.y + Math.sin(wt.a) * (3 + k * 9) + Math.sin(wt.a + 1.57) * (k ? 4 : -2); v.angle = wt.a + 1.2; v.speed = 2; }
    h.log.push('boten naar ' + Math.round(wt.x) + ',' + Math.round(wt.y));
  });
  host.at(HOST_STOP, async (h) => { h.log.push('host stopt'); await h.stop(); });
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
const S = of('sample');
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
const dbg = S.filter((s) => s.hostDbg && Object.keys(s.hostDbg).length >= 12).map((s) => s.hostDbg);
check(dbg.length > 3, 'te weinig samples met voertuigen: ' + dbg.length);
const last = dbg[dbg.length - 1] || {};
const eerst = dbg[Math.min(dbg.length - 1, 2)] || {};
check(Object.values(last).every((v) => v[0] === 'echt'), 'voertuigen: niet alles is een echt model: ' + JSON.stringify(Object.entries(last).filter(([, v]) => v[0] !== 'echt')));
check(last[301] && last[301][3] >= 0, 'sedan aanwezig'); check(last[301] && last[301][6] === 4, 'schade: de sedan heeft niet alle 4 de deuken: ' + JSON.stringify(last[301]));
check(Math.abs((last[320] || [])[1] - (eerst[320] || [])[1]) > 0.01 || dbg.some((d, i) => i && d[320] && dbg[i - 1][320] && d[320][1] !== dbg[i - 1][320][1]), 'wielen: de rijdende auto draait zijn wielen niet');
check((last[320] || [])[2] < -0.1 || (last[320] || [])[2] > 0.1, 'sturen: de voorwielen staan recht bij stuur 0,8: ' + JSON.stringify(last[320]));
check(dbg.some((d) => d[301] && d[301][3] > 0) || dbg.some((d) => d[307] && d[307][3] > 0), 'richtingaanwijzers: nooit aan gezien');
check(dbg.some((d) => d[302] && d[302][4] > 1), 'zwaailicht: de politieauto flitst niet');
check((last[309] || [])[5] > 0, 'heli: de rotor draait niet');
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('laatste staat per voertuig [soort, wielrot, voorwielhoek, richtingaanwijzers aan, zwaailicht, rotor, deuken]: ' + JSON.stringify(last), 'draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
