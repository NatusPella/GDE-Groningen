// Coöp-testbank (#428): boten, schepen en treinen bij een gast. De gescripte gastheer zet de gast bij water (sloep, rondvaartboot, binnenvaartschip,
// zeeschip, zeilboot) en bij een echt spoor (een trein die voorbijrijdt, met een overweg als die erbij ligt); de gast meet waar hij ze tekent.
//   node scripts/coop/gastkant_428_varen.mjs --stage=<gestagede game-map> [--out=<map>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startNodeHost } from './nodehost.mjs';
import { BOAT_KINDS } from '../../game/js/boattypes.js';

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
const PROGRAM = [[0, 'wacht', { s: 8 }], [8, 'zoek428', { soort: 'water' }], [9, 'wacht', { s: 12 }], [21, 'toon428', { soort: 'water', naam: 'boten', n: 3 }], [30, 'zoek428', { soort: 'spoor' }], [31, 'wacht', { s: 14 }], [45, 'toon428', { soort: 'spoor', naam: 'trein', n: 3 }], [54, 'wacht', { s: 2 }], [56, 'zoek428', { soort: 'brug' }], [57, 'wacht', { s: 12 }], [69, 'toon428', { soort: 'brug', naam: 'brug', n: 2 }], [74, 'wacht', { s: 3 }]];
const HOST_STOP = 82;
const code = {};
const started = Date.now();
await takeSlot();
console.log('uitvoer:', OUT);
const host = await startNodeHost({ stage: STAGE });
const events = path.join(OUT, 'events.jsonl'); fs.writeFileSync(events, '');
const script = path.join(OUT, '_page.js');
fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ name: 'gast', role: 'gast', route: 'direct', code: host.code, viaMenu: true, expect: 2, preSave: true, program: PROGRAM })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
const profile = `gde-test-gastkant428v-${process.pid}`;
const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', `--window-size=${SIZE}`, '--coop', '--autoplay=22', '--url-flags=touch=1',
  `--smoke-test=${path.join(OUT, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
const done = new Promise((res) => child.on('exit', (c) => { fs.writeFileSync(path.join(OUT, 'run.log'), out); fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true }); const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] ')); let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ } res(r); }));
process.on('exit', () => { try { child.kill(); } catch (e) { /* weg */ } });
const readEvents = () => fs.readFileSync(events, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);


// het draaiboek van de host: reageert op wat de gast vindt
const wachtOp = async (type, n = 200) => { for (let i = 0; i < n; i++) { const e = readEvents().find((x) => x.type === type); if (e) return e; await new Promise((r) => setTimeout(r, 400)); } return null; };
const treinen = [];
(async () => {
  for (let i = 0; i < 1200 && !readEvents().some((e) => e.type === 'allen-erbij'); i++) await new Promise((r) => setTimeout(r, 500));
  const w = host.world, t0 = Date.now();
  // de plek van de gast is van de gastheer (en de lijn tussen hen is 38 m): in stappen van 25 m, anders telt het als een sprong met een laadscherm
  const zetGast = async (x, y, a) => {
    host.walk = false;
    for (let i = 0; i < 400; i++) {
      const dx = x - w.companion.x, dy = y - w.companion.y, d = Math.hypot(dx, dy), s = Math.min(d, 25);
      if (d > 0.5) { w.companion.x += dx / d * s; w.companion.y += dy / d * s; }
      w.player.x = w.companion.x + 2; w.player.y = w.companion.y + 2;
      if (d <= 25) break; await new Promise((r) => setTimeout(r, 150));
    }
    w.companion.angle = a; w.player.angle = a;
  };
  w.vehicles = []; w.pedestrians = []; w.wildlife = []; w.wanted = 0;
  const boten = [];
  const maakBoot = (id, key, x, y, angle, speed, extra = {}) => { const B = BOAT_KINDS[key]; const v = { id, x, y, angle, speed, parkeer: true, isBoat: true, model: { ...B, name: 'boat' }, ...extra }; w.vehicles.push(v); boten.push(v); return v; };
  const tick = setInterval(() => { for (const b of boten) { b.x += Math.cos(b.angle) * b.speed * 0.05; b.y += Math.sin(b.angle) * b.speed * 0.05; } for (const t of treinen) { t.c += t.v * 0.05; } }, 50);
  process.on('exit', () => clearInterval(tick));
  // ---- water
  const wt = await wachtOp('zoek428-water');
  if (wt && !wt.geen) {
    const ux = Math.cos(wt.a), uy = Math.sin(wt.a), nx = -uy, ny = ux;
    await zetGast(wt.zet[0], wt.zet[1], wt.a);
    const op = (d, l) => [wt.x + ux * d + nx * l, wt.y + uy * d + ny * l];
    maakBoot(311, 'sloep', ...op(8, -3), wt.a + 0.3, 1.0); maakBoot(312, 'rondvaart', ...op(20, 6), wt.a - 0.2, 0.8); maakBoot(313, 'zeilboot', ...op(12, 7), wt.a, 0.6);
    maakBoot(314, 'spits', ...op(30, -6), wt.a + 0.15, 0.6); maakBoot(315, 'zeeVracht', ...op(70, 0), wt.a, 0.5);
    host.log.push('gast en boten bij het water ' + Math.round(wt.x) + ',' + Math.round(wt.y));
  } else host.log.push('geen water gevonden');
  // ---- spoor: een nep-dienstregeling op de echte route van de gast (de gast heeft de routes uit de wereld)
  const sp = await wachtOp('zoek428-spoor');
  if (sp && !sp.geen && sp.pts && sp.pts.length > 5) {
    const pts = sp.pts, stap = 6;
    const R = { naam: 'testroute' }, routes = []; routes[sp.idx] = R;
    const punt = (c) => { const f = Math.max(0, Math.min(pts.length - 1.001, (c - sp.c0) / stap)), i = Math.floor(f), t = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; };
    const tr = { route: R, c: sp.c - 70, v: 7, dir: 1, state: 'run', halfLen: 30 }; treinen.push(tr);
    host.N.setCoopTreinen({ getTrains: () => treinen, getRoutes: () => routes, routePoint: (r, c) => punt(c) });
    const a = punt(sp.c), b = punt(sp.c + 4), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    await zetGast(sp.zet[0], sp.zet[1], ang - Math.PI / 2);
    w.vehicles = w.vehicles.filter((v) => !v.isBoat); boten.length = 0;
    host.log.push('gast bij spoor ' + sp.naam + ' route ' + sp.idx + ' op ' + Math.round(a[0]) + ',' + Math.round(a[1]) + ', ' + Math.round(sp.d) + ' m van de oude plek');
  } else host.log.push('geen spoor gevonden');
  // ---- een brug die opengaat (en een sluis): de gastheer meldt de toestand, de gast laat ze bewegen
  const br = await wachtOp('zoek428-brug');
  if (br && br.brug) {
    const f = br.brug; await zetGast(f.zet[0], f.zet[1], 0); const t1 = Date.now();
    const tik = setInterval(() => { const s = (Date.now() - t1) / 1000; host.wereld = [{ soort: 0, staat: s < 9 ? 4 : 5, x: f.x, y: f.y, a: Math.min(255, Math.round(s / 9 * 255)), b: 255, peil: 0 }]; }, 100);
    process.on('exit', () => clearInterval(tik));
    host.log.push('brug ' + (f.naam || '?') + ' op ' + Math.round(f.x) + ',' + Math.round(f.y) + (br.sluis ? ', sluis ' + (br.sluis.naam || '?') + ' op ' + Math.round(br.sluis.d) + ' m' : ''));
  } else host.log.push('geen beweegbare brug gevonden: ' + JSON.stringify(br && br.aantal));
  host.at(Math.max(1, HOST_STOP - (Date.now() - t0) / 1000), async (h) => { h.log.push('host stopt'); await h.stop(); });
})();
const res = await done;
release();
try { await host.stop(); } catch (e) { /* al weg */ }

// ---------------------------------------------------------------- beoordelen
const E = readEvents(); const problems = [], notes = [];
const check = (c, m) => { if (!c) problems.push(m); };
const of = (t) => E.filter((e) => e.type === t);
check(res.result === 'KLAAR', `gast: ${res.result} ${res.reason || ''}`);
for (const [f, v] of Object.entries(res.fasen || {})) check(v === 'ok', `fase ${f} ${v}`);
const water = of('toon428').filter((e) => e.soort === 'water'), spoor = of('toon428').filter((e) => e.soort === 'spoor');
const wl = water[water.length - 1], sl = spoor[spoor.length - 1];
check(!!of('zoek428-water')[0] && !of('zoek428-water')[0].geen, 'geen water rond de gast gevonden');
if (wl && wl.pos) {
  const P = wl.pos;
  for (const id of [311, 312, 313, 314, 315]) check(P[id], 'boot ' + id + ' staat niet bij de gast: ' + JSON.stringify(Object.keys(P)));
} else check(false, 'water: geen meting van de boten');
if (sl) {
  check(sl.treinen && sl.treinen.length >= 1, 'trein: de gast heeft geen trein in de buurt: ' + JSON.stringify(sl.treinen));
  const t0 = sl.treinen && sl.treinen[0]; const t1 = spoor[0] && spoor[0].treinen && spoor[0].treinen[0];
  if (t0 && t1) check(Math.abs(t0.c - t1.c) > 3 || spoor.length < 2, 'trein: beweegt niet tussen de metingen: ' + JSON.stringify([t1, t0]));
  check(t0 && t0.auto >= 2, 'trein: geen wagons: ' + JSON.stringify(t0));
} else check(false, 'spoor: geen meting van de trein');
const brugM = of('toon428').filter((e) => e.soort === 'brug'); const zb = of('zoek428-brug')[0];
if (zb && zb.brug) { const bl = brugM[brugM.length - 1]; check(bl && bl.bruggen && bl.bruggen.some((b) => b[1] > 0.2 && b[2] > 0.9), 'brug: de gast laat de brug niet openen: ' + JSON.stringify(bl && bl.bruggen)); } else notes.push('brug: geen beweegbare brug in de geladen wereld, niet getest: ' + JSON.stringify(zb && zb.aantal));
if (spoor.length && of('zoek428-spoor')[0] && of('zoek428-spoor')[0].overweg) check(spoor.some((e) => e.boomMax && e.boomMax.length), 'overweg: de slagbomen gaan niet dicht bij de trein: ' + JSON.stringify(spoor.map((e) => e.boomMax)));
for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push('consolefout: ' + String(e.msg).slice(0, 160));
for (const e of E.filter((x) => x.type === 'jserror')) problems.push(`jserror: ${e.msg} ${e.file}:${e.line}`);
notes.push('water: ' + JSON.stringify(water.map((e) => e.pos)), 'spoor: ' + JSON.stringify(spoor.map((e) => [e.treinen, e.boomMax, e.ik])), 'draaiboek: ' + host.log.join('; '));
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ problems, notes, res }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
