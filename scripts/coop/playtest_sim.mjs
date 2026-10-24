// Playtest-simulatie (#434): het scenario van de playtest van 23-10 met echte Electron-instanties: een host en twee gasten (drie Electron
// tegelijk, wegwerpprofielen, de kamercode-route over een lokale nep-tracker op de loopback, geen internet).
//   node scripts/coop/playtest_sim.mjs --stage=<gestagede game-map> [--out=<map>] [--roam-s=600] [--stappen=opening,lopen,...] [--route=kamer|direct]
// Stappen (docs/COOP-TESTBANK.md): opening, lopen, gastrijdt, passagier, missie, hengelen, winkel, pauze, overdragen, kick, uitval, vrij.
// Alle instanties lopen gelijk via een sluis (HTTP op 127.0.0.1, willekeurige poort); de fasen staan in playtest.phases.js (bovenop coop.page.js).
// Per instantie: consolefouten, NaN-waarschuwingen, desync, JS-heap, beeldsnelheid (mediaan en p5), scene (meshes, geometrieën) begin en eind,
// berichtvolume (kB/s) en schermafbeeldingen. Uitkomst: rapport.md en rapport.json in de uitvoermap.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const ROAM = Number(arg('roam-s', 600));
const ROUTE = arg('route', 'kamer');
const STAPPEN = arg('stappen', '') ? arg('stappen', '').split(',') : null;
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-playtest', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
const MAX_MIN = Number(arg('max-min', 60)); // harde grens op de looptijd
process.env.GDE_COOP_TEST = '1';
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- sloten (maximaal drie Electron tegelijk over alle sessies)
const held = [];
async function takeSlots(n) {
  let wachtN = 0;
  for (;;) {
    const t0 = Date.now(), mine = [];
    while (Date.now() - t0 < 720000) {
      for (const k of [1, 2, 3]) { if (mine.length >= n) break; const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); mine.push(d); } catch (e) { /* bezet */ } }
      if (mine.length >= n) { held.push(...mine); return; }
      if (++wachtN % 10 === 1) console.log(`sloten bezet (${mine.length} van ${n}), wacht`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    for (const d of mine) { try { fs.rmdirSync(d); } catch (e) { /* weg */ } }
    console.log('sloten losgelaten voor anderen, over 15 s opnieuw'); await new Promise((r) => setTimeout(r, 15000));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// ---------------------------------------------------------------- de sluis en het geheugenbord
const NAMEN = ['host', 'gast', 'gast2'];
const levend = new Set(NAMEN);
const bar = new Map(); // naam -> { aangekomen:Set, wachters:[{res, timer}], vrij:bool }
const bord = {};
const json = (res, o) => { res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(o)); };
function probeerVrij(n) {
  const b = bar.get(n); if (!b || b.vrij) return;
  if ([...levend].every((x) => b.aangekomen.has(x))) { b.vrij = true; for (const w of b.wachters) { clearTimeout(w.timer); json(w.res, { ok: true }); } b.wachters = []; }
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }); return res.end(); }
  if (u.pathname === '/b') {
    const n = u.searchParams.get('n'), w = u.searchParams.get('w'), ms = Number(u.searchParams.get('ms')) || 60000;
    let b = bar.get(n); if (!b) { b = { aangekomen: new Set(), wachters: [], vrij: false }; bar.set(n, b); }
    b.aangekomen.add(w);
    if (b.vrij) return json(res, { ok: true });
    if (b.verlopen) return json(res, { ok: false, verlopen: true, mist: [...levend].filter((x) => !b.aangekomen.has(x)) });
    const wachter = { res, timer: setTimeout(() => { b.verlopen = true; b.wachters = b.wachters.filter((q) => q !== wachter); json(res, { ok: false, mist: [...levend].filter((x) => !b.aangekomen.has(x)) }); for (const q of b.wachters) { clearTimeout(q.timer); json(q.res, { ok: false, mist: [...levend].filter((x) => !b.aangekomen.has(x)) }); } b.wachters = []; }, ms) };
    b.wachters.push(wachter); probeerVrij(n); return;
  }
  if (u.pathname === '/set') { bord[u.searchParams.get('k')] = JSON.parse(u.searchParams.get('v')); return json(res, { ok: true }); }
  if (u.pathname === '/get') return json(res, { v: bord[u.searchParams.get('k')] ?? null });
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

// ---------------------------------------------------------------- Electron-instanties
const kids = [];
const botCode = fs.readFileSync(path.join(ROOT, 'scripts', 'bot', 'bot.page.js'), 'utf8');
let trackerPort = 0;
function start(name, cfg, seed, extraArgs = []) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  const events = path.join(dir, 'events.jsonl'); fs.writeFileSync(events, '');
  const script = path.join(dir, '_page.js');
  const pcfg = { ...cfg, name, route: ROUTE, preSave: name !== 'host', durationS: 20, viaMenu: true, expect: 3, maxSpelers: 0, trackerPort, base: BASE, watchOpening: true,
    program: [[0, 'playtest', { stappen: STAPPEN, roamS: ROAM }]], gateWachtMs: 0 };
  const bot = `window.__botMain = async () => {\n${botCode}\n};\n`;
  fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify(pcfg)};\n${bot}` + fs.readFileSync(path.join(HERE, 'playtest.phases.js'), 'utf8') + '\n' + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
  const profile = `gde-test-playtest-${process.pid}-${name}`;
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', GDE_MENU_TEST: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = [...extraArgs];
  if (ROUTE === 'kamer') extra.push('--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection', '--js-flags=--expose-gc');
  const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', '--coop', `--autoplay=${seed}`,
    `--smoke-test=${path.join(dir, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`, ...extra], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* gewone prioriteit */ }
  let out = ''; child.stdout.on('data', (d) => { out += d; }); child.stderr.on('data', (d) => { out += d; });
  const done = new Promise((res) => child.on('exit', (code) => {
    levend.delete(name); for (const n of bar.keys()) probeerVrij(n);
    fs.writeFileSync(path.join(dir, 'run.log'), out);
    fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
    const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] '));
    let r = { result: 'ONBEKEND' }; try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ }
    res({ code, ...r });
  }));
  kids.push(child);
  return { events, done, child, dir };
}
const readEvents = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const waitFor = async (f, type, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const e = readEvents(f).find((x) => x.type === type); if (e) return e; await new Promise((r) => setTimeout(r, 500)); } return null; };
const killAll = () => { for (const k of kids) { try { k.kill(); } catch (e) { /* weg */ } } };
process.on('exit', () => { killAll(); try { server.close(); } catch (e) { /* weg */ } });

const T0 = Date.now();
let tracker = null;
if (ROUTE === 'kamer') { const { startFakeTracker } = await import('./faketracker.mjs'); tracker = await startFakeTracker(); trackerPort = tracker.port; console.log('nep-tracker op 127.0.0.1:' + trackerPort); }
// de provinciebouw (slot 'stap'/'stage') is zwaar: een Electron-instantie bevriest dan tientallen seconden en de koppeling valt weg; wacht erop
for (let i = 0; fs.existsSync(path.join(LOCKS, 'stage')) && i < 1800; i++) { if (i % 30 === 0) console.log('stage-bouw bezig, wacht'); await new Promise((r) => setTimeout(r, 2000)); }
await takeSlots(3);
console.log('uitvoer:', OUT, ' sluis:', BASE);
const host = start('host', { role: 'host', waitS: 300, joinWaitS: 400 }, 11);
const code = await waitFor(host.events, 'code', 240000);
const inst = { host };
if (code) {
  inst.gast = start('gast', { role: 'gast', code: code.code }, 22);
  await new Promise((r) => setTimeout(r, 15000)); // pas als de eerste gast er is: zo is de plek voorspelbaar
  inst.gast2 = start('gast2', { role: 'gast', code: code.code }, 33);
} else { levend.delete('gast'); levend.delete('gast2'); }
const dog = setTimeout(() => { console.log('te lang bezig (' + MAX_MIN + ' min): alles stoppen'); killAll(); }, MAX_MIN * 60000);
const res = await Promise.all(NAMEN.map((n) => (inst[n] ? inst[n].done : Promise.resolve({ result: 'NIET GESTART' }))));
clearTimeout(dog); release();
if (tracker) { try { tracker.close(); } catch (e) { /* weg */ } }
try { server.close(); } catch (e) { /* weg */ }

// ---------------------------------------------------------------- beoordelen
const E = {}; for (const n of NAMEN) E[n] = inst[n] ? readEvents(inst[n].events) : [];
const problems = [], notes = [];
const of = (ev, t) => ev.filter((e) => e.type === t);
const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
res.forEach((r, i) => { if (r.result !== 'KLAAR') problems.push(`${NAMEN[i]}: ${r.result} ${r.reason || ''}`); for (const [f, v] of Object.entries(r.fasen || {})) if (v !== 'ok') problems.push(`${NAMEN[i]}: fase ${f} ${v}`); });
// stappen: ok als elke instantie ok meldt
const stappen = [];
const namen = [...new Set(NAMEN.flatMap((n) => of(E[n], 'stap-uitslag').map((e) => e.naam)))];
for (const naam of namen) {
  const per = NAMEN.map((n) => ({ n, e: of(E[n], 'stap-uitslag').filter((x) => x.naam === naam).pop() }));
  const slecht = per.filter((p) => !p.e || !p.e.ok);
  stappen.push({ naam, ok: !slecht.length, per: per.map((p) => ({ n: p.n, ok: p.e ? p.e.ok : null, d: p.e ? Object.fromEntries(Object.entries(p.e).filter(([k]) => !['type', 't', 'wall', 'who', 'naam', 'ok'].includes(k))) : null })) });
  if (slecht.length) problems.push(`stap ${naam}: ${slecht.map((p) => p.n + (p.e ? '' : ' (geen uitslag)')).join(', ')}`);
}
// opening: elke instantie zag het filmpje
for (const n of NAMEN) { const o = of(E[n], 'opening-einde')[0]; if (!o || !(o.gezien >= 8)) problems.push(`${n}: openingsfilmpje niet (lang genoeg) gezien: ${JSON.stringify(o)}`); }
// fouten
const tel = {};
for (const n of NAMEN) {
  const ev = E[n];
  const errs = ev.filter((e) => e.type === 'console' && e.level === 'error').map((e) => String(e.msg).slice(0, 140));
  const nan = ev.filter((e) => e.type === 'console' && /\bNaN\b/.test(String(e.msg))).map((e) => String(e.msg).slice(0, 140));
  const desync = ev.filter((e) => e.type === 'console' && /desync/i.test(String(e.msg))).map((e) => String(e.msg).slice(0, 140));
  const js = of(ev, 'jserror').map((e) => `${e.msg} (${e.file}:${e.line})`);
  const warn = ev.filter((e) => e.type === 'console' && e.level === 'warning' && !/NaN|desync/i.test(String(e.msg))).map((e) => String(e.msg).slice(0, 120));
  tel[n] = { errors: errs.length, nan: nan.length, desync: desync.length, jserror: js.length, warn: warn.length };
  const uniek = (a) => [...new Set(a)].slice(0, 6);
  for (const m of uniek(errs)) problems.push(`${n} consolefout: ${m}`);
  for (const m of uniek(nan)) problems.push(`${n} NaN: ${m}`);
  for (const m of uniek(desync)) problems.push(`${n} desync: ${m}`);
  for (const m of uniek(js)) problems.push(`${n} jserror: ${m}`);
  if (warn.length) notes.push(`${n} waarschuwingen (${warn.length}): ${uniek(warn).join(' | ')}`);
  const sm = of(ev, 'sample'); const dn = Math.max(0, ...sm.map((s) => s.desyncN || 0)); if (dn) problems.push(`${n}: desyncN tot ${dn}`);
}
// metingen
const meting = {};
for (const n of NAMEN) {
  const m = of(E[n], 'meting'); if (!m.length) { meting[n] = null; continue; }
  const heap = m.filter((x) => x.gc).map((x) => x.heapMB).filter((x) => x != null); if (heap.length < 2) { meting[n] = { metingen: m.length, fout: 'te weinig heapmetingen na gc' }; continue; }
  const half = Math.floor(heap.length / 2), h2 = heap.slice(half);
  const slope = h2.length > 3 ? (h2[h2.length - 1] - h2[0]) / ((h2.length - 1) * 30 / 60) : null; // MB per minuut in de tweede helft
  const b = of(E[n], 'meting-begin')[0], e = of(E[n], 'meting-eind')[0];
  const kbs = m.map((x) => x.kbs).filter((x) => x != null).sort((x, y) => x - y);
  meting[n] = {
    metingen: m.length, heapBegin: heap[0], heapEind: heap[heap.length - 1], heapMax: Math.max(...heap), heapMBperMin2eHelft: r1(slope),
    fpsMediaan: r1(med(m.map((x) => x.fpsMediaan).filter((x) => x != null))), fpsP5: r1(med(m.map((x) => x.fpsP5).filter((x) => x != null))), fpsP5Min: r1(Math.min(...m.map((x) => x.fpsP5).filter((x) => x != null))),
    langsteBeeldMs: Math.max(...m.map((x) => x.langsteMs || 0)), kbsMediaan: r1(med(kbs)), kbsP95: r1(kbs[Math.floor(kbs.length * 0.95)] ?? null), kbsMax: r1(kbs[kbs.length - 1]),
    sceneBegin: b && b.scene, sceneEind: e && e.scene,
  };
  if (slope != null && slope > 2) problems.push(`${n}: JS-heap groeit ${r1(slope)} MB/min in de tweede helft`);
  if (b && e && e.scene && b.scene && e.scene.meshes > b.scene.meshes * 1.6 + 400) problems.push(`${n}: meshes ${b.scene.meshes} -> ${e.scene.meshes}`);
  if (b && e && e.scene && b.scene && e.scene.geometrieen > b.scene.geometrieen * 1.6 + 400) problems.push(`${n}: geometrieën ${b.scene.geometrieen} -> ${e.scene.geometrieen}`);
}
const shots = {}; for (const n of NAMEN) { try { shots[n] = fs.readdirSync(inst[n].dir).filter((f) => f.endsWith('.png')); } catch (e) { shots[n] = []; } }
const rapport = { versie: 1, duurMin: r1((Date.now() - T0) / 60000), route: ROUTE, roamS: ROAM, stappen: stappen.map((s) => ({ naam: s.naam, ok: s.ok })), stapDetails: stappen, tel, meting, problems, notes, shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, v.length])) };
fs.writeFileSync(path.join(OUT, 'rapport.json'), JSON.stringify(rapport, null, 1));
const regels = [`# Playtest-simulatie`, `looptijd ${rapport.duurMin} min, route ${ROUTE}, vrij rondlopen ${ROAM} s`, '', '## Stappen', ...stappen.map((s) => `- ${s.ok ? 'OK ' : 'FOUT'} ${s.naam}: ` + s.per.map((p) => `${p.n}=${p.ok}`).join(' ')), '', '## Fouten per instantie', ...NAMEN.map((n) => `- ${n}: ${JSON.stringify(tel[n])}`), '', '## Metingen', ...NAMEN.map((n) => `- ${n}: ${JSON.stringify(meting[n])}`), '', '## Problemen', ...(problems.length ? problems.map((p) => '- ' + p) : ['- geen']), '', '## Noten', ...notes.map((p) => '- ' + p)];
fs.writeFileSync(path.join(OUT, 'rapport.md'), regels.join('\n'));
console.log(regels.join('\n'));
console.log(problems.length ? `\nPROBLEMEN: ${problems.length}` : '\nALLES OK');
process.exit(problems.length ? 1 : 0);
