// Coöp-testbank (#434, playtest 23-10): vloeiend bewegen, de camera omhoog en omlaag, springen en bukken, passagiers op hun stoel en het wapen van de
// gastheer, gezien vanaf een gast in een echte Electron-instantie met een gescripte host in Node (zoals gastkant_388.mjs; één slot).
//   node scripts/coop/gastkant_434.mjs --stage=<gestagede game-map> [--mock=2] [--out=<map>]
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
const MOCK = Math.max(0, Math.min(2, Number(arg('mock', 0)) || 0)); // extra headless spelers: 2 = vier in totaal; zij stappen mee in de auto
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-gastkant', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

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

// het programma van de gast (seconden na "allen-erbij") en het draaiboek van de host, op dezelfde tijdlijn
const PROGRAM = [
  [0, 'wacht', { s: 6 }], [6, 'gloed', { s: 12 }], [20, 'gastpitch', {}], [27, 'gastspring', {}], [35, 'zit', { s: 5, naam: 'wapen', kijk: 'host' }],
  [43, 'zit', { s: 6, naam: 'auto', pitch: 14 }], [58, 'zit', { s: 6, naam: 'fiets', pitch: 18 }], [70, 'wacht', { s: 4 }], [75, 'gastbestuur', { s: 16 }],
];
const HOST_STOP = 96;
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE, max: 4 });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant434-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--coop', '--autoplay=22', '--url-flags=touch=1',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', () => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);

const hostMeting = { zmax: 0, buk: false, sprongen: 0 };
const hostBestuur = []; // wat de gastheer van de auto ziet waar de gast in rijdt
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const mocks = [];
  if (MOCK) { const { startMockGuest } = await import('./mockclient.mjs'); for (let i = 0; i < MOCK; i++) { const m = await startMockGuest({ stage: STAGE, code: host.code, net: {}, seed: 31 + i }); m.input = () => ({ mx: 0, my: 0, run: false, yaw: 0, buttons: 0 }); mocks.push(m); } }
  globalThis.__mocks = mocks;
  { const wall = (readEvents().find((e) => e.type === 'allen-erbij') || {}).wall; if (wall) { const gap = (Date.now() - wall) / 1000, at0 = host.at; host.at = (s, fn) => at0.call(host, Math.max(0, s - gap), fn); } }
  const c = host.world.companion; let was = 0; // wat de gastheer van het lichaam van de gast heeft: hoogte en bukken
  setInterval(() => { const z = c.z || 0; hostMeting.zmax = Math.max(hostMeting.zmax, z); if (z > 0.05 && !was) hostMeting.sprongen++; was = z > 0.05 ? 1 : 0; if (c.crouching) hostMeting.buk = true; }, 20).unref();
  host.at(33, (h) => { h.world.companion.x += 8; h.world.companion.y += 8; h.wapen('knuppel'); h.slaan(true); h.log.push('wapen en aanval aan'); });
  host.at(41, (h) => { h.slaan(false); h.wapen('fists'); h.world.companion.x = h.world.player.x - 2; h.world.companion.y = h.world.player.y + 1; h.rit(true); h.log.push('in de auto'); });
  host.at(44, (h) => { const car = h.drive && h.drive.car; for (const f of Object.values(h.world.coopFigures || {})) if (car) { f.x = car.x - 1; f.y = car.y + 1; f.vx = 0; f.vy = 0; } for (const m of mocks) m.session.sendEvent({ k: 'gebruik' }); h.log.push('de anderen stappen in'); });
  host.at(56, (h) => { for (const m of mocks) m.session.sendEvent({ k: 'gebruik' }); h.rit(false); h.log.push('uit de auto'); });
  host.at(57, (h) => { h.rit(true, { isBike: true, model: { len: 1.8, wid: 0.6, name: 'bike' } }); h.log.push('op de fiets'); });
  host.at(70, (h) => { h.rit(false); h.log.push('van de fiets'); });
  host.at(74, (h) => { h.parkeerAuto(2.5); h.log.push('een vrije auto naast de gast'); });
  for (const sec of [78, 80, 82]) host.at(sec, (h) => { const car = h.world.vehicles.find((v) => v.id === 198); if (car) hostBestuur.push({ rij: car.coopBestuurder ?? null, driver: car.driver, speed: Math.round((car.speed || 0) * 10) / 10, mx: Math.round(car.x - h.world.companion.x), zit: !!h.world.companion.coopBestuurt }); });
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
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
const gl = of('gloed')[0];
if (gl) for (const k of ['auto', 'ped', 'host']) {
  const r = gl[k];
  check(r && r.n > 200, `gloed ${k}: te weinig beelden ${JSON.stringify(r)}`);
  if (r && r.n > 200) { check(r.stil / r.n < 0.02, `gloed ${k}: staat stil in ${r.stil} van ${r.n} beelden`); check(r.sprong / r.n < 0.01, `gloed ${k}: springt in ${r.sprong} beelden`); check(r.p5 > 0.6 && r.p95 < 1.5, `gloed ${k}: tempo schommelt (5% ${r.p5}, 95% ${r.p95} van de mediaan)`); }
} else problems.push('gloed: geen meting');
notes.push('gloed: ' + JSON.stringify(gl));
const pi = of('gastpitch')[0];
check(pi && Math.abs(pi.a1 - pi.a0) > 8 && Math.abs(pi.a2 - pi.a1) > 8 && Math.sign(pi.a1 - pi.a0) !== Math.sign(pi.a2 - pi.a1), 'pitch: de camera van de gast kijkt niet omhoog en omlaag: ' + JSON.stringify(pi));
notes.push('gastpitch: ' + JSON.stringify(pi));
const sp = of('gastspring')[0];
check(sp && sp.zmax > 0.3 && sp.zmax < 0.9 && sp.hoog > 5, 'springen: de gast springt niet (of te hoog): ' + JSON.stringify(sp));
check(sp && sp.buk === true && sp.na === false && sp.zNa === 0, 'bukken: de gast bukt niet of blijft hangen: ' + JSON.stringify(sp));
check(hostMeting.zmax > 0.3 && hostMeting.sprongen >= 1 && hostMeting.buk, 'de gastheer ziet de sprong of het bukken van de gast niet: ' + JSON.stringify(hostMeting));
notes.push('gastspring: ' + JSON.stringify(sp), 'gastheer ziet: ' + JSON.stringify(hostMeting));
const wp = of('wapen')[0];
check(wp && wp.wapen === 'knuppel' && wp.fx === 'melee' && wp.guns.includes('knuppel'), 'wapen: de gast ziet het wapen of de aanval van de gastheer niet: ' + JSON.stringify(wp));
notes.push('wapen: ' + JSON.stringify(wp));
const au = of('auto')[0];
check(au && au.zitters.some((z) => z[2] === 0) && au.zitters.some((z) => z[2] === 1) && au.dbg >= 2, 'auto: bestuurder en bijrijder zijn niet te zien in het voertuig: ' + JSON.stringify(au));
if (MOCK) check(au && au.zitters.some((z) => z[2] >= 2) && au.dbg >= 3, 'auto: de extra spelers zitten niet achterin: ' + JSON.stringify(au));
notes.push('auto: ' + JSON.stringify(au));
const gb = { auto: of('gastbestuur-auto')[0], in: of('gastbestuur-in')[0], rijdt: of('gastbestuur-rijdt')[0], remt: of('gastbestuur-remt')[0], uit: of('gastbestuur-uit')[0] };
check(gb.auto && gb.auto.gezien, 'gastbestuur: de gast ziet de auto naast zich niet: ' + JSON.stringify(gb.auto));
check(gb.in && gb.in.bestuurder && gb.in.inVoertuig && gb.in.zitters.some((z) => z[1] === 0 && z[2]), 'gastbestuur: de gast stapte niet in als bestuurder (E): ' + JSON.stringify(gb.in));
check(gb.rijdt && gb.rijdt.m > 8 && gb.rijdt.vmax > 4, 'gastbestuur: de auto reed niet met de stick van de gast: ' + JSON.stringify(gb.rijdt));
check(gb.remt && gb.remt.snelheid < 2, 'gastbestuur: de handrem (Spatie) werkt niet: ' + JSON.stringify(gb.remt));
check(gb.uit && !gb.uit.bestuurder && !gb.uit.inVoertuig, 'gastbestuur: de gast stapte niet uit (E): ' + JSON.stringify(gb.uit));
notes.push('gastbestuur: ' + JSON.stringify(gb), 'gastheer ziet de auto van de gast: ' + JSON.stringify(hostBestuur));
const fi = of('fiets')[0];
check(fi && fi.zitters.some((z) => z[2] === 0) && fi.dbg >= 1 && fi.pedaal.some((x) => x), 'fiets: de bestuurder is niet te zien op de fiets: ' + JSON.stringify(fi));
notes.push('fiets: ' + JSON.stringify(fi));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('draaiboek: ' + host.log.join('; '), 'duur ' + Math.round((Date.now() - started) / 1000) + ' s');
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
