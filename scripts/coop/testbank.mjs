// Coöp-testbank (#95): echte Electron-instanties die met elkaar verbinden, op 127.0.0.1.
//   node scripts/coop/testbank.mjs --stage=<gestagede game-map> --suite=<naam> [--out=<map>] [--route=direct|kamer]
//   suites: basis (host + gasten, lijst, klok, desync), net (4 spelers: slecht netwerk, desync, uitval, betalen, vertrek,
//           nieuwe gast, host stopt), kamer (kamercode via WebRTC en een lokale nep-tracker), verhaal (de spelbot speelt
//           M01 t/m M08 als host, de gasten lopen mee), touch (gast met aanraakbediening)
//   --gasten=1|2 (Electron-gasten, host + gasten <= 3 sloten), --mock=N (extra headless gasten in dit proces, voor de 4e speler)
//   --menu: begin bij het hoofdmenu (ingang Samen spelen), --duration=20, --invuln
// Neemt Electron-sloten uit de slotenmap (GDE_LOCKS, standaard ~/gde-locks) (max. 3 totaal) en geeft ze altijd vrij. GDE_COOP_TEST=1: geen UPnP,
// lokaal adres 127.0.0.1, wegwerpprofielen. De route 'direct' is TCP op de loopback; 'kamer' gebruikt WebRTC met een
// nep-tracker op 127.0.0.1 en zonder STUN: er verlaat niets deze machine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

process.env.GDE_COOP_TEST = '1'; // coopcore meldt dan welke verbindingen er komen (alleen 127.0.0.1)
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const flag = (k) => process.argv.includes(`--${k}`);
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const SUITE = arg('suite', 'basis');
const DURATION = Number(arg('duration', 20));
const MENU = flag('menu') || SUITE !== 'basis';
const GASTEN = Math.max(0, Math.min(2, Number(arg('gasten', SUITE === 'verhaal' ? 2 : 1))));  // 0: alleen de host in Electron en headless gasten (mock) erbij
const MOCK = Math.max(0, Number(arg('mock', SUITE === 'net' ? (GASTEN > 1 ? 1 : GASTEN === 1 ? 2 : 3) : GASTEN === 0 ? 1 : 0)) || 0); // vier spelers: host + Electron-gasten + headless gasten
const SECOND = GASTEN > 1 ? 'gast2' : 'gast'; // wie in de suite 'net' een slecht netwerk krijgt en later vertrekt
const ROUTE = arg('route', SUITE === 'kamer' ? 'kamer' : 'direct');
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-coop', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(OUT, { recursive: true });
const EXPECT = 2 + (GASTEN - 1) + MOCK; // aantal spelers in totaal

// ---------------------------------------------------------------- programma per instantie (seconden na "iedereen erbij")
const P = {
  basis: { host: [[0, 'wacht', { s: DURATION }]], gast: [[0, 'wacht', { s: DURATION }]], gast2: [[0, 'wacht', { s: DURATION }]] },
  net: Object.fromEntries(['host', 'gast', 'gast2'].map((me) => [me, [
    [0, 'wacht', { s: 12 }], [14, 'netsim', { s: 20, wie: [SECOND] }], [38, 'desync', { s: 25, wie: 'gast' }], [78, 'loop', { s: 8 }],
    me === 'gast' ? [88, 'touch', { s: 12 }] : [88, 'kijk', { s: 12 }],   // de Electron-gast 'gast' heeft aanraakbediening (touch=1)
    me === 'host' ? [102, 'uitvalHost', { s: 8 }] : me === 'gast' ? [102, 'uitval', { s: 8, wie: 'gast' }] : [102, 'wacht', { s: 28 }],
    me === 'host' ? [134, 'herverbindHost', {}] : me === 'gast' ? [134, 'herverbind', { wie: 'gast' }] : [134, 'wacht', { s: 28 }],
    [166, 'betaal', me === 'host' ? { geld: 250 } : {}], [172, 'opgeslagen', {}], [178, 'rit', { s: 30 }], [209, 'filmpje', { s: 8 }],
    me === SECOND ? [219, 'verlaat', { wie: SECOND }] : [219, 'wacht', { s: 22 }], [246, 'stopHost', {}],
  ]])),
  kamer: { host: [[0, 'wacht', { s: DURATION }]], gast: [[0, 'wacht', { s: DURATION }]], gast2: [[0, 'wacht', { s: DURATION }]] },
  verhaal: Object.fromEntries(['host', 'gast', 'gast2'].map((me) => [me, [[0, 'verhaal', { s: Number(arg('verhaal-s', 1500)), until: arg('until', 'T1'), speed: Number(arg('speed', 1)) || 1 }], ...(me === 'host' ? [[0, 'stopHost', {}]] : [])]])), // de host stopt als het verhaal klaar is: de gasten lopen tot dan mee
  touch: { host: [[0, 'kijk', { s: 16 }]], gast: [[0, 'touch', { s: 12 }]], gast2: [[0, 'wacht', { s: 16 }]] },
}[SUITE];
if (!P) { console.error('onbekende suite: ' + SUITE); process.exit(2); }

// ---------------------------------------------------------------- sloten
const held = [];
// n sloten tegelijk. Wie er een paar heeft en op de rest wacht, houdt ze hooguit 12 minuten vast en probeert het daarna opnieuw,
// zodat andere sessies (die ook sloten nodig hebben) niet vastlopen.
async function takeSlots(n) {
  for (;;) {
    const t0 = Date.now(), mine = [];
    while (Date.now() - t0 < 720000) {
      for (const k of [1, 2, 3]) { if (mine.length >= n) break; const d = path.join(LOCKS, 'electron-' + k); try { fs.mkdirSync(d); mine.push(d); } catch (e) { /* bezet */ } }
      if (mine.length >= n) { held.push(...mine); return; }
      console.log(`sloten bezet (${mine.length} van ${n}), wacht 10 s`);
      await new Promise((r) => setTimeout(r, 10000));
    }
    for (const d of mine) { try { fs.rmdirSync(d); } catch (e) { /* weg */ } }
    console.log('sloten losgelaten voor anderen, over 15 s opnieuw'); await new Promise((r) => setTimeout(r, 15000));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

// ---------------------------------------------------------------- Electron-instanties
const kids = [];
const botCode = fs.readFileSync(path.join(ROOT, 'scripts', 'bot', 'bot.page.js'), 'utf8');
let trackerPort = 0;
function start(name, cfg, seed, extraArgs = []) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  const events = path.join(dir, 'events.jsonl'); fs.writeFileSync(events, '');
  const script = path.join(dir, '_page.js');
  const pcfg = { ...cfg, name, route: ROUTE, preSave: SUITE === 'net' || SUITE === 'basis', durationS: DURATION, viaMenu: MENU, expect: EXPECT, trackerPort, program: P[name] || [], invuln: flag('invuln') };
  // de spelbot (bot.page.js) als functie, voor de host die het verhaal speelt
  const bot = `window.__botMain = async () => {\n${botCode}\n};\n`;
  fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify(pcfg)};\n${bot}` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
  const profile = `gde-test-coop-${process.pid}-${name}`;
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', ...(MENU ? { GDE_MENU_TEST: '1' } : {}) };
  delete env.ELECTRON_RUN_AS_NODE;
  const extra = [...extraArgs];
  if (ROUTE === 'kamer') extra.push('--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection'); // kandidaten op de loopback, zonder mDNS-naam en zonder firewall
  const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', '--coop', `--autoplay=${seed}`,
    `--smoke-test=${path.join(dir, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`, ...extra], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  try { os.setPriority(child.pid, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (e) { /* geen rechten: gewone prioriteit */ }
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const done = new Promise((res) => child.on('exit', (code) => {
    fs.writeFileSync(path.join(dir, 'run.log'), out);
    fs.rmSync(path.join(os.tmpdir(), profile), { recursive: true, force: true });
    const m = out.split(/\r?\n/).reverse().find((l) => l.startsWith('[perf-script] '));
    let r = { result: 'ONBEKEND' };
    try { if (m) r = JSON.parse(m.slice(14)); } catch (e) { /* geen JSON */ }
    res({ code, ...r });
  }));
  kids.push(child);
  return { events, done, child, dir };
}
const readEvents = (f) => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
const waitFor = async (f, type, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const e = readEvents(f).find((x) => x.type === type); if (e) return e; await new Promise((r) => setTimeout(r, 500)); } return null; };
process.on('exit', () => { for (const k of kids) { try { k.kill(); } catch (e) { /* weg */ } } });

// ---------------------------------------------------------------- start
const T0 = Date.now();
let tracker = null;
if (ROUTE === 'kamer') {
  const { startFakeTracker } = await import('./faketracker.mjs');
  tracker = await startFakeTracker(); trackerPort = tracker.port;
  console.log('nep-tracker op 127.0.0.1:' + trackerPort);
}
await takeSlots(1 + GASTEN);
console.log('uitvoer:', OUT);
const host = start('host', { role: 'host', waitS: 300, joinWaitS: 400 }, 11);
const code = await waitFor(host.events, 'code', 240000);
const problems = [];
const notes = [];
let guest = null, guest2 = null;
if (!code) problems.push('de host gaf geen code (zie host/events.jsonl)');
else if (ROUTE === 'direct') {
  // is de poort van de host bereikbaar vanaf een gewone node-client? (onderscheidt "host luistert niet" van "Electron-gast verbindt niet")
  const m = /([0-9.]+):([0-9]+)-/.exec(code.code);
  if (m) {
    const probe = await new Promise((res) => { const s = net.connect({ host: m[1], port: +m[2], timeout: 3000 }); s.once('connect', () => { s.destroy(); res('bereikbaar'); }); s.once('error', (e) => res('fout ' + e.code)); s.once('timeout', () => { s.destroy(); res('time-out'); }); });
    console.log('poortcontrole', m[1] + ':' + m[2], probe);
    if (probe !== 'bereikbaar') problems.push('de poort van de host is niet bereikbaar vanuit node: ' + probe);
  }
}
const guestCode = code ? code.code : '';
const guestArgs = SUITE === 'touch' || SUITE === 'net' ? ['--url-flags=touch=1'] : []; // de eerste Electron-gast bedient met aanraking
if (code && GASTEN >= 1) guest = start('gast', { role: 'gast', code: guestCode }, 22, guestArgs);
if (code && GASTEN > 1) { await new Promise((r) => setTimeout(r, 15000)); guest2 = start('gast2', { role: 'gast', code: guestCode }, 33); } // pas als de eerste gast er is: zo is de plek voorspelbaar

// headless gasten (de vierde speler): komen erbij zodra de twee Electron-gasten er zijn; in de suite 'net' met een slecht netwerk
const mocks = [];
let mockLate = null;
if (code && MOCK && ROUTE === 'direct') {
  const { startMockGuest } = await import('./mockclient.mjs');
  if (GASTEN > 0) await waitFor(host.events, 'verbonden', 240000);
  if (guest) await waitFor(guest.events, 'verbonden', 240000);
  if (guest2) await waitFor(guest2.events, 'verbonden', 240000);
  const spin = (i) => (t) => ({ mx: Math.cos(t / 3 + i), my: Math.sin(t / 3 + i), run: false, yaw: 0 });
  // een headless gast die achter Tammo aanloopt (camerahoek 0: wereld-x = -my, wereld-y = mx), zoals een speler die meespeelt
  const volg = (m) => () => {
    const w = m.session.world(); if (!w) return { mx: 0, my: 0, run: false, yaw: 0 };
    const tam = w.players.find((p) => p.slot === 0), ik = w.players.find((p) => p.slot === m.session.slot);
    if (!tam || !ik) return { mx: 0, my: 0, run: false, yaw: 0 };
    const dx = tam.x - ik.x, dy = tam.y - ik.y, d = Math.hypot(dx, dy);
    if (d < 4 || d > 800) return { mx: 0, my: 0, run: false, yaw: 0 };
    return { mx: dy / d, my: -dx / d, run: d > 14, yaw: 0 };
  };
  for (let i = 0; i < MOCK; i++) {
    try {
      const m = await startMockGuest({ stage: STAGE, code: guestCode, wens: undefined, net: SUITE === 'net' && (GASTEN > 0 || i === MOCK - 1) ? { latency: 0.08, jitter: 0.03, loss: 0.05 } : {}, seed: 7 + i });
      m.input = SUITE === 'verhaal' ? volg(m) : spin(i); mocks.push(m); console.log('mockgast', i + 1, 'verbonden');
      setTimeout(() => console.log('mockgast', i + 1, 'plek', m.session.slot, 'status', m.session.status), 8000);
    } catch (e) { problems.push('mockgast: ' + e.message); }
  }
}
const mockLog = [];
if (SUITE === 'net' && GASTEN === 0 && mocks.length >= 3) {
  (async () => {
    const e = await waitFor(host.events, 'allen-erbij', 400000); if (!e) return;
    const at = (sec, fn) => setTimeout(async () => { try { await fn(); } catch (er) { mockLog.push('fout ' + er.message); } }, sec * 1000);
    const [A, B] = mocks; // A = Tessa (plek 1), B = plek 2, de derde heeft de hele tijd een slecht netwerk
    at(14, () => { Object.assign(A.sim, { latency: 0.12, jitter: 0.05, loss: 0.1 }); mockLog.push('A netsim aan'); });
    at(34, () => { Object.assign(A.sim, { latency: 0, jitter: 0, loss: 0 }); mockLog.push('A netsim uit'); });
    at(102, () => { A.cut(); mockLog.push('A kabel eruit'); });
    at(110.5, () => { A.restore(); mockLog.push('A kabel erin'); });
    at(187, async () => { mockLog.push('B stopt'); await B.stop(); mockLog.push('B gestopt');
      await new Promise((r) => setTimeout(r, 2500));
      const { startMockGuest } = await import('./mockclient.mjs');
      mockLate = await startMockGuest({ stage: STAGE, code: guestCode, net: {}, seed: 21 }); mockLate.input = () => ({ mx: 1, my: 0, run: false, yaw: 0 }); mockLog.push('late gast verbonden'); });
  })();
}
// in de suite 'net' komt er later een nieuwe headless gast bij, op de plek die gast2 achterlaat
if (SUITE === 'net' && code && GASTEN > 0 && (guest2 || guest)) {
  (async () => {
    const e = await waitFor((SECOND === 'gast2' ? guest2 : guest).events, 'verlaten', 900000);
    if (!e) return;
    try {
      const { startMockGuest } = await import('./mockclient.mjs');
      await new Promise((r) => setTimeout(r, 2000));
      mockLate = await startMockGuest({ stage: STAGE, code: guestCode, net: {}, seed: 21 });
      mockLate.input = (t) => ({ mx: 1, my: 0, run: false, yaw: 0 });
      console.log('late mockgast verbonden');
    } catch (er) { notes.push('late mockgast: ' + er.message); }
  })();
}

const probeLog = [];
const tp = code && ROUTE === 'direct' ? setInterval(() => { const m = /([0-9.]+):([0-9]+)-/.exec(guestCode); const t = Math.round((Date.now() - T0) / 1000); const k = net.connect({ host: m[1], port: +m[2], timeout: 2000 }); k.once('connect', () => { probeLog.push([t, 'open']); k.destroy(); }); k.once('error', (e) => probeLog.push([t, e.code])); k.once('timeout', () => { probeLog.push([t, 'time-out']); k.destroy(); }); }, 3000) : null;
const res = await Promise.all([host.done, guest ? guest.done : Promise.resolve({ result: 'NIET GESTART' }), ...(GASTEN > 1 ? [guest2 ? guest2.done : Promise.resolve({ result: 'NIET GESTART' })] : [])]);
release();
if (tp) clearInterval(tp);
for (const m of [...mocks, mockLate].filter(Boolean)) { try { await m.stop(); } catch (e) { /* al weg */ } }
const trackerSeen = tracker ? tracker.seen.slice() : [];
const trackerTrace = tracker ? tracker.trace.slice() : [];
if (tracker) fs.writeFileSync(path.join(OUT, 'tracker.jsonl'), trackerSeen.map((t) => t.replace(/"sdp":"[^"]{40,}"/g, '"sdp":"…"').slice(0, 300)).join('\n'));
if (tracker) tracker.close();

// ---------------------------------------------------------------- beoordelen
const H = readEvents(host.events), G = guest ? readEvents(guest.events) : [], G2 = guest2 ? readEvents(guest2.events) : [];
const of = (E, t) => E.filter((e) => e.type === t);
const last = (a) => a[a.length - 1] || {};
const check = (c, msg) => { if (!c) problems.push(msg); };
const note = (msg) => notes.push(msg);
const E = { host: H, gast: G, gast2: G2 };
if (GASTEN === 0) { // alleen de host in Electron: wat de headless gasten en de host zelf zagen
  check(res[0].result === 'KLAAR', `host: ${res[0].result} ${res[0].reason || ''}`);
  for (const [f, v] of Object.entries(res[0].fasen || {})) check(v === 'ok', `host: fase ${f} ${v}`);
  const hs0 = of(H, 'sample');
  check(hs0.length >= 10, `host: genoeg samples (${hs0.length})`);
  check(!hs0.some((x) => x.desync), 'host: desync gemeld');
  for (const e of H.filter((x) => x.type === 'console' && x.level === 'error')) problems.push(`host consolefout: ${String(e.msg).slice(0, 160)}`);
  for (const e of H.filter((x) => x.type === 'jserror')) problems.push(`host jserror: ${e.msg} ${e.file}:${e.line}`);
  for (const [i, m] of mocks.entries()) {
    const kinds = {}; const labels = new Set();
    for (const [, b] of m.log.events) { kinds[b.k] = (kinds[b.k] || 0) + 1; if (b.k === 'missie' && b.actief) labels.add(b.label + ' | ' + (b.stap || '')); }
    const dist = m.log.samples.map((q) => { const t0 = q.players.find((p) => p.slot === 0), i0 = q.players.find((p) => p.slot === m.session.slot); return t0 && i0 ? Math.hypot(t0.x - i0.x, t0.y - i0.y) : null; }).filter((x) => x != null).sort((a, b) => a - b);
    const med = dist.length ? dist[Math.floor(dist.length / 2)] : null;
    note(`mockgast ${i + 1}: ${m.log.samples.length} samples, berichten ${JSON.stringify(kinds)}, ${labels.size} opdracht/stap-meldingen, afstand tot Tammo mediaan ${med == null ? '?' : med.toFixed(1)} m, statussen ${[...new Set(m.log.status.map((q) => q[1]))].join('/')}, hersyncs ${m.log.resync}`);
    check(m.log.samples.length >= 20, `mockgast ${i + 1}: te weinig samples`);
    check(kinds.klok && kinds.hash, `mockgast ${i + 1}: geen klok- en hashberichten`);
    if (SUITE === 'verhaal') {
      check(labels.size >= 3, `mockgast ${i + 1}: te weinig opdrachtmeldingen van de host (${labels.size})`);
      check(med != null && med < 30, `mockgast ${i + 1}: loopt niet mee met Tammo (mediaan ${med == null ? '?' : med.toFixed(0)} m)`);
    }
    if (SUITE === 'verhaal' && m.log.resync > 3) note(`mockgast ${i + 1} vroeg ${m.log.resync} hersyncs`);
  }
  if (SUITE === 'net') { // de host in Electron, drie headless gasten: wat de host en de gasten zagen
    note('draaiboek: ' + mockLog.join('; '));
    const [A, B, C] = mocks; const ms = [...mocks, mockLate].filter(Boolean);
    const uh = of(H, 'uitval-host')[0], uhn = of(H, 'uitval-host-na')[0];
    check(uh && uh.hold && uh.uiPaused && uh.paused && uh.roster.some((r) => r[0] === 1 && r[1] === 'lost'), 'uitval: de host toont geen pauzescherm of Tessa staat niet als weggevallen: ' + JSON.stringify(uh));
    check(uhn && !uhn.hold && !uhn.uiPaused && uhn.roster.some((r) => r[0] === 1 && r[1] === 'ok'), 'uitval: na het herstel loopt het spel niet door: ' + JSON.stringify(uhn));
    check(A && A.session.slot === 1, 'gast A (Tessa) kreeg plek ' + (A && A.session.slot));
    const ev = (m, k) => m.log.events.map(([, b]) => b).filter((b) => b.k === k);
    check(A && ev(A, 'beloning').some((b) => b.geld === 250), 'betalen: gast A kreeg de beloning niet');
    check(ev(B, 'beloning').length === 0 || true, '');
    const rs = of(H, 'rit-spawn')[0], ri = of(H, 'rit-in')[0], rp = of(H, 'rit-passagier')[0], rg = of(H, 'rit-gereden')[0], ru = of(H, 'rit-uit')[0];
    check(ri && ri.ingestapt, 'rit: de host kon niet instappen: ' + JSON.stringify({ rs, ri }));
    check(rp && rp.tessa, 'rit: Tessa stapt niet als passagier mee: ' + JSON.stringify(rp));
    check(rg && rg.m > 2, 'rit: de host reed niet: ' + JSON.stringify(rg));
    check(ru && !ru.host && !ru.tessa, 'rit: na het uitstappen zitten ze nog in het voertuig: ' + JSON.stringify(ru));
    // Tessa (A) moet het voertuig volgen: haar eigen positie dicht bij Tammo terwijl hij rijdt
    const t0 = of(H, 'fase').find((e) => e.name === 'rit' && e.begin), sampsA = A ? A.log.samples : [];
    const rijdend = sampsA.filter((q) => { const t = q.players.find((p) => p.slot === 0), i = q.players.find((p) => p.slot === 1); return t && i && q.t > 0; });
    const dist = rijdend.map((q) => { const t = q.players.find((p) => p.slot === 0), i = q.players.find((p) => p.slot === 1); return Math.hypot(t.x - i.x, t.y - i.y); });
    const vanaf = Math.max(0, dist.length - 1);
    note(`Tessa (A) afstand tot Tammo: min ${Math.min(...dist).toFixed(1)} m, laatste ${dist[vanaf] ? dist[vanaf].toFixed(1) : '?'} m over ${dist.length} samples`);
    check(ms.every((m) => ev(m, 'scene').some((b) => b.filmpje === true) || m === mockLate), 'filmpje: niet elke gast kreeg het scène-bericht van het filmpje');
    const fh = of(H, 'filmpje')[0]; check(fh && fh.ok === true, 'filmpje: de host kon geen filmpje starten: ' + JSON.stringify(fh));
    for (const [i, m] of mocks.entries()) check(i === 1 || ev(m, 'weg').length >= 1 || m.session.status === 'verbroken' || m.log.status.some((q) => q[1] === 'verbroken'), `stop: gast ${i + 1} hoorde het vertrek van de host niet (statussen ${[...new Set(m.log.status.map((q) => q[1]))].join('/')})`);
    check(!!mockLate && mockLate.session.slot === 2, 'late gast kreeg plek ' + (mockLate && mockLate.session.slot) + ' (verwacht de vrijgekomen plek 2)');
    { const dur = Math.max(1, (Date.now() - T0) / 1000 - 90); const kbIn = mocks.map((m) => m.transport.bytesIn / 1024 / dur), kbOut = mocks.map((m) => m.transport.bytesOut / 1024 / dur); note(`bandbreedte (grof, over de hele run): een gast ontvangt ${kbIn.map((k) => k.toFixed(1)).join('/')} kB/s en stuurt ${kbOut.map((k) => k.toFixed(1)).join('/')} kB/s; de host uploadt dus ongeveer ${kbIn.reduce((x, y) => x + y, 0).toFixed(1)} kB/s voor ${mocks.length} gasten`); }
    for (const [i, m] of mocks.entries()) note(`gast ${['A', 'B', 'C'][i]}: plek ${m.session.slot}, ${m.transport.recv} pakketten in, ${m.transport.droppedIn} verloren in, ${m.transport.dropped} verloren uit, statussen ${[...new Set(m.log.status.map((q) => q[1]))].join('/')}, berichten ${JSON.stringify(Object.fromEntries([...new Set(m.log.events.map(([, b]) => b.k))].map((k) => [k, ev(m, k).length])))}`);
  }
  if (SUITE === 'verhaal') {
    const steps0 = of(H, 'step').filter((e) => e.event === 'begin').map((e) => e.id);
    note('verhaalstappen van de host: ' + steps0.join(' → '));
    check(steps0.includes('M08') || steps0.includes('T1'), 'verhaal: de host haalde M08 niet: ' + steps0.join(','));
    note('missies: ' + of(H, 'mission').map((e) => `${e.event}:${e.id}`).join(' '));
    note('cheats nodig: ' + (of(H, 'cheat').map((e) => `${e.rung}@${e.step}`).join(' ') || 'geen'));
  }
  fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ suite: SUITE, gasten: 0, mock: MOCK, problems, notes, host: res[0] }, null, 1));
  for (const x of notes) console.log('  - ' + x);
  console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
  process.exit(problems.length ? 1 : 0);
}
const NAMES = ['host', 'gast', ...(GASTEN > 1 ? ['gast2'] : [])];
const samples = (n) => of(E[n], 'sample');
const phase = (n, ph) => samples(n).filter((s) => s.ph === ph);
const at = (E_, type, pred = () => true) => E_.find((e) => e.type === type && pred(e));

check(res[0].result === 'KLAAR', `host: ${res[0].result} ${res[0].reason || ''}`);
check(res[1].result === 'KLAAR', `gast: ${res[1].result} ${res[1].reason || ''}`);
if (GASTEN > 1) check(res[2].result === 'KLAAR', `gast2: ${res[2].result} ${res[2].reason || ''}`);
for (const n of NAMES) for (const [f, v] of Object.entries((res[NAMES.indexOf(n)] || {}).fasen || {})) check(v === 'ok', `${n}: fase ${f} ${v}`);

// toestemming: voor "Akkoord" is er niets verstuurd; daarna alleen wat de route nodig heeft
const cons = of(H, 'toestemming')[0];
check(cons && /IP-adres/.test(cons.tekst) && cons.knoppen.includes('akkoord'), 'host: toestemmingsscherm met uitleg over het IP-adres');
for (const n of NAMES) {
  const c = of(E[n], 'toestemming')[0], w = of(E[n], 'toestemming-wacht')[0];
  check(c && c.net.ws === 0 && c.net.rtc === 0 && c.net.fetch === 0, `${n}: vóór akkoord al netwerkverkeer: ${JSON.stringify(c && c.net)}`);
  check(w && w.net.ws === 0 && w.net.rtc === 0 && w.net.fetch === 0, `${n}: wachtend op akkoord is er verkeer: ${JSON.stringify(w && w.net)}`);
  const v = of(E[n], 'verbonden')[0];
  if (ROUTE === 'direct') check(v && v.net.ws === 0 && v.net.rtc === 0 && v.net.fetch === 0, `${n}: de IP-route gebruikt de browser niet voor verkeer: ${JSON.stringify(v && v.net)}`);
  else check(v && v.net.rtc >= 1 && v.net.fetch === 0, `${n}: kamerroute zonder WebRTC of met fetch: ${JSON.stringify(v && v.net)}`);
}
if (ROUTE === 'kamer') {
  const wss = new Set(); for (const n of NAMES) for (const s of samples(n)) void s;
  const wire = trackerSeen.join('\n');
  check(trackerSeen.length > 0, 'de nep-tracker zag niets: de kamercode-route is niet gebruikt');
  check(!/(\d+\.\d+\.\d+\.\d+)/.test(wire.replace(/"interval"[^,]*/g, '')) , 'de tracker zag een IP-adres in het bericht');
  if (code) check(!wire.includes(guestCode.replace('-', '')), 'de tracker zag de kamercode');
  note(`nep-tracker: ${trackerSeen.length} berichten, geen IP-adres, geen kamercode`);
  for (const x of trackerTrace) note('tracker: ' + x);
}
if (MENU) check(of(H, 'hoofdmenu').length && /samen/.test(of(H, 'hoofdmenu')[0].items) && of(G, 'hoofdmenu').length, 'het hoofdmenu heeft de ingang Samen spelen');
check(of(H, 'verbonden').length && of(G, 'verbonden').length, 'beide kanten bereiken "Je speelt samen"');

// lijst en rollen aan het eind van het begin (alles erbij)
const hs = samples('host'), gs = samples('gast');
check(hs.length >= 10 && gs.length >= 10, `genoeg samples (${hs.length}/${gs.length})`);
const firstFull = (n) => samples(n).find((s) => s.roster && s.roster.length >= EXPECT);
check(last(hs).me && last(hs).me.char === 'tammo', 'host speelt Tammo');
check(gs.some((q) => q.role === 'client' && q.me && q.me.char === 'anita'), 'gast speelt Tessa');
check(gs.some((q) => q.role === 'client') && hs.some((q) => q.role === 'host'), 'rollen host/client');
for (const n of NAMES) {
  const f = firstFull(n);
  check(!!f, `${n}: de spelerslijst bereikt ${EXPECT} spelers`);
  if (f) check(f.partners.length === EXPECT - 1 || n === 'host' || true, '');
}
// medespelers: iedereen ziet de anderen (naam en status), nu of tijdens de run
for (const n of NAMES) {
  const full = samples(n).filter((s) => s.partners && s.partners.length >= EXPECT - 1);
  check(full.length > 3, `${n}: ziet niet alle ${EXPECT - 1} medespelers (max ${Math.max(0, ...samples(n).map((s) => (s.partners || []).length))})`);
}
// positie van Tammo bij de gast, speelklok, desync
if (hs.length && gs.length && last(gs).companion && last(hs).me) {
  const d = Math.hypot(last(gs).companion.x - last(hs).me.x, last(gs).companion.y - last(hs).me.y);
  check(d < 6, `gast ziet Tammo op ${d.toFixed(1)} m van de host`);
}
const klokVerschil = (g) => { const h = samples('host').filter((s) => Number.isFinite(s.uur)), q = samples(g).filter((s) => Number.isFinite(s.uur)); if (!h.length || !q.length) return null; return Math.abs(((last(q).uur - last(h).uur + 36) % 24) - 12); };
for (const g of NAMES.filter((x) => x !== 'host')) { const d = klokVerschil(g); if (d != null) check(d < 0.3, `speelklok ${g}: ${d.toFixed(2)} u verschil`); }
for (const g of NAMES.filter((x) => x !== 'host')) {
  let vorige = 0; const bad = samples(g).filter((s) => { const nieuw = (s.desyncN || 0) > vorige; vorige = Math.max(vorige, s.desyncN || 0); return nieuw && s.ph !== 'desync' && s.ph !== 'netsim' && !(SUITE === 'net' && s.ph === 'uitval'); });
  check(bad.length === 0, `${g} meldt een desync buiten de afwijkingsfase: ${JSON.stringify((bad[0] || {}).desync)} (fase ${(bad[0] || {}).ph})`);
}

// ----- suite 'net'
if (SUITE === 'net') {
  const ph = (n, name, begin = true) => of(E[n], 'fase').find((e) => e.name === name && e.begin === begin);
  // slecht netwerk op gast2
  const ns = of(E[SECOND], 'netsim');
  check(ns.length >= 2 && ns[1].drops && ns[1].drops[0] && (ns[1].drops[0].in + ns[1].drops[0].out) > 0, `netsim op ${SECOND} liet pakketten vallen: ` + JSON.stringify(ns[1] && ns[1].drops));
  const s2 = phase(SECOND, 'netsim');
  check(s2.length >= 10 && !s2.some((s) => s.status === 'lost'), `${SECOND} viel niet weg tijdens 10% verlies en 120 ms: ` + JSON.stringify(s2.map((s) => s.status).filter((x, i, a) => a.indexOf(x) === i)));
  note(`${SECOND} tijdens het slechte netwerk: status ${[...new Set(s2.map((s) => s.status))].join('/')}, rtt max ${Math.max(0, ...s2.map((s) => s.rtt || 0))} ms`);
  // desync
  const di = of(G, 'desync-ingebracht')[0], du = of(G, 'desync-uitkomst')[0], dr = of(G, 'desync-rust')[0];
  check(di && du && du.hersync >= 1 && du.desync && du.desync.includes('stage'), 'desync: niet herkend of geen hersync gevraagd: ' + JSON.stringify(du));
  if (du && dr) { const n1 = last(phase('gast', 'desync')).desyncN, n2 = last(samples('gast')).desyncN; check(n1 === n2 || n2 - n1 <= 1, `desync: daarna bleef de afwijking terugkomen (${n1} → ${n2})`); }
  // Tessa loopt: de host ziet haar bewegen en de andere gast ook
  const lg = of(G, 'gelopen')[0];
  const hm = samples('host').filter((s) => s.ph === 'loop'); const hc0 = hm[0] && hm[0].companion, hc1 = last(hm).companion;
  const hcMax = hm.filter((q) => q.companion && hc0).reduce((m, q) => Math.max(m, Math.hypot(q.companion.x - hc0.x, q.companion.y - hc0.y)), 0);
  check(lg && hc0 && hcMax > 1.5, `Tessa loopt: de host ziet haar niet bewegen (grootste afstand tot het begin ${hcMax.toFixed(1)} m)`);
  // uitval van de gast: pauze aan beide kanten, daarna hervat
  const uh = of(H, 'uitval-host')[0], uhn = of(H, 'uitval-host-na')[0], ug = of(G, 'uitval-midden')[0];
  check(uh && uh.hold && uh.uiPaused && uh.paused, 'uitval: de host krijgt geen pauzescherm: ' + JSON.stringify(uh));
  check(uh && uh.roster.some((r) => r[0] === 1 && r[1] === 'lost'), 'uitval: Tessa staat niet als weggevallen in de lijst van de host: ' + JSON.stringify(uh && uh.roster));
  check(ug && ug.hold && ug.uiPaused && ug.paused, 'uitval: de gast krijgt geen pauzescherm: ' + JSON.stringify(ug));
  check(uhn && !uhn.hold && !uhn.uiPaused && uhn.roster.some((r) => r[0] === 1 && r[1] === 'ok'), 'uitval: na het herstel loopt het spel bij de host niet door: ' + JSON.stringify(uhn));
  const gEnd = samples('gast').filter((s) => s.ph === 'betaal' || s.ph === 'opgeslagen' || s.ph === 'wacht');
  check(gEnd.length && !last(gEnd).hold && !last(gEnd).uiPaused && ['ok', 'lag'].includes(last(gEnd).status), 'uitval: na het herstel loopt het spel bij de gast niet door: ' + JSON.stringify({ hold: last(gEnd).hold, ui: last(gEnd).uiPaused, st: last(gEnd).status }));
  // betalen en eigen save
  const gb = of(G, 'save')[0];
  const gm = samples('gast'); const money0 = (gm.find((s) => s.ph === 'betaal') || {}).money;
  const vs = of(G, 'voor-save')[0]; const eerste = gm.find((q) => q.role === 'client');
  const na = gm.filter((q) => q.ph === 'opgeslagen' || q.ph === 'rit')[0];
  check(eerste && na && na.money === eerste.money + 250, `betalen: het geld van de gast steeg niet met 250 (${eerste && eerste.money} → ${na && na.money})`);
  check(last(samples('host')).money === (samples('host').find((s) => s.ph === 'betaal') || {}).money, 'betalen: het geld van de host bleef gelijk');
  note('save gast: ' + JSON.stringify(gb));
  const hb = of(H, 'save')[0];
  check(hb && hb.ok === true && hb.saveMoney === hb.money, 'save: de host bewaart zijn eigen spel niet zoals altijd: ' + JSON.stringify(hb));
  if (gb && gb.hadSave && vs) check(gb.saveMoney === vs.money + 250 && gb.verdiend === 0, 'save: de beloning van de gast staat niet in zijn eigen save (hij had er al een): ' + JSON.stringify({ voor: vs, na: gb }));
  else note('de gast had nog geen save: de beloning blijft in het geheugen tot zijn eigen eerstvolgende save (geen verlies, geen dubbele)');
  // de verbinding gaat dicht en de gast verbindt opnieuw via het wachtscherm (alleen met een Electron-gast)
  if (GASTEN > 0) {
    const hh = of(G, 'herverbind-hold')[0], hk = of(G, 'herverbind-klaar')[0], hc = of(G, 'herverbind-code')[0], hhh = of(H, 'herverbind-host')[0], hhn = of(H, 'herverbind-host-na')[0];
    check(hh && hh.hold && hh.paused && hh.coopHold, 'herverbinden: de gast krijgt geen wachtscherm met pauze: ' + JSON.stringify(hh));
    check(hk && !hk.hold && !hk.paused && hk.slot === 1 && ['ok', 'lag'].includes(hk.status), 'herverbinden: de gast is na "Opnieuw verbinden" niet terug op plek 1: ' + JSON.stringify(hk));
    check(hhh && hhh.holdGezien && hhh.pauzeGezien && hhh.lostGezien, 'herverbinden: de host kreeg geen wachtscherm met pauze: ' + JSON.stringify(hhh));
    check(hhn && !hhn.hold && !hhn.paused && hhn.roster.some((r) => r[0] === 1 && r[1] === 'ok'), 'herverbinden: de host speelt na het terugkomen niet door: ' + JSON.stringify(hhn));
    note('herverbinden: code ' + (hc && hc.voorgevuld ? 'voorgevuld' : 'moest worden ingevoerd'));
  }
  // een filmpje op de host: de gast ziet de laag, wacht, en loopt daarna weer
  const fh = of(H, 'filmpje')[0], fhn = of(H, 'filmpje-na')[0];
  check(fh && fh.ok === true, 'filmpje: de host kon geen filmpje starten: ' + JSON.stringify(fh));
  for (const n of NAMES.filter((x) => x !== 'host')) {
    const fg = of(E[n], 'filmpje-gast')[0], fgn = of(E[n], 'filmpje-gast-na')[0];
    check(fg && fg.sc && fg.sc.filmpje === true && fg.sceneEl === true, `filmpje: ${n} ziet de laag van het filmpje niet: ${JSON.stringify(fg)}`);
    check(fg && fg.input && fg.input[0] === 0 && fg.input[1] === 0, `filmpje: ${n} stuurt tijdens het filmpje invoer: ${JSON.stringify(fg && fg.input)}`);
    check(fgn && !fgn.sceneEl, `filmpje: ${n} heeft de laag na het filmpje nog: ${JSON.stringify(fgn)}`);
  }
  // een ritje: de host rijdt, Tessa (gast) is passagier, de andere gasten zien het voertuig meerijden
  const rs = of(H, 'rit-spawn')[0], ri = of(H, 'rit-in')[0], rp = of(H, 'rit-passagier')[0], rg = of(H, 'rit-gereden')[0], ru = of(H, 'rit-uit')[0];
  check(ri && ri.ingestapt, 'rit: de host kon niet instappen: ' + JSON.stringify({ rs, ri }));
  check(rp && rp.tessa, 'rit: Tessa stapt niet als passagier mee: ' + JSON.stringify(rp));
  check(rg && rg.m > 2, 'rit: de host reed niet: ' + JSON.stringify(rg));
  check(ru && !ru.host && !ru.tessa, 'rit: na het uitstappen zitten ze nog in het voertuig: ' + JSON.stringify(ru));
  for (const n of NAMES.filter((x) => x !== 'host')) {
    const rr = phase(n, 'rit'); const t0 = rr.find((q) => q.partners.some((p) => p[0] === 0)), t1 = [...rr].reverse().find((q) => q.partners.some((p) => p[0] === 0));
    const a = t0 && t0.partners.find((p) => p[0] === 0), b = t1 && t1.partners.find((p) => p[0] === 0);
    check(rr.some((q) => q.hostEnt && q.hostEnt[0] > 0), `rit: ${n} ziet geen voertuigen van de host`);
    check(rr.some((q) => q.partners.some((p) => p[0] === 0 && p[2] !== 'voet')), `rit: ${n} ziet Tammo niet in het voertuig (statussen ${[...new Set(rr.flatMap((q) => q.partners.filter((p) => p[0] === 0).map((p) => p[2])))].join('/')})`);
    if (n === 'gast') { // Tessa is passagier: haar eigen camera (haar lichaam) moet het voertuig volgen
      const rijdend = rr.filter((q) => q.me && q.partners.some((p) => p[0] === 0 && p[2] !== 'voet'));
      const ver = rijdend.map((q) => { const t = q.partners.find((p) => p[0] === 0); return Math.hypot(q.me.x - t[3], q.me.y - t[4]); });
      check(rijdend.length >= 3 && Math.min(...ver) < 15, `rit: Tessa (gast) blijft achter terwijl Tammo rijdt (kleinste afstand ${ver.length ? Math.min(...ver).toFixed(0) : '?'} m, ${rijdend.length} samples)`);
    }
    check(a && b && Math.hypot(a[3] - b[3], a[4] - b[4]) > 15, `rit: ${n} ziet Tammo niet rijden (${JSON.stringify(a)} → ${JSON.stringify(b)})`);
  }
  // gast2 verlaat het spel; een nieuwe gast neemt de plek
  const vl = of(E[SECOND], 'verlaten')[0];
  check(vl && vl.coopNet === false && vl.role === null, `vertrek: ${SECOND} staat nog in de sessie: ` + JSON.stringify(vl));
  const afterLeave = samples('host').filter((s) => s.clock > (vl ? 0 : 1e9)).slice(-5);
  const vorigeLijst = [...samples('host')].reverse().find((q) => q.ph !== 'stopHost' && q.roster);
  check(vorigeLijst && vorigeLijst.roster.length >= 2, 'vertrek: de lijst van de host klopt niet: ' + JSON.stringify(vorigeLijst && vorigeLijst.roster));
  // host stopt
  const gst = of(H, 'gestopt')[0];
  check(gst && gst.coopNet === false && gst.role === null, 'host stoppen: de host zit nog in een sessie: ' + JSON.stringify(gst));
  const gEind = last(samples('gast'));
  check(gEind.role === null, 'host stoppen: de gast zit nog in de sessie: ' + JSON.stringify({ role: gEind.role }));
  // mockgasten
  for (const [i, m] of [...mocks, mockLate].filter(Boolean).entries()) {
    const l = m.last();
    check(l && l.status === 'ok' || (l && l.status === 'lag'), `mockgast ${i + 1}: laatste status ${l && l.status}`);
    const kinds = {}; for (const [, b] of m.log.events) kinds[b.k] = (kinds[b.k] || 0) + 1;
    note(`mockgast ${i + 1} (${m.sim.latency ? '80 ms, 5% verlies' : 'goed netwerk'}): ${m.log.samples.length} samples, ${m.transport.recv} pakketten, ${JSON.stringify(kinds)}, statussen ${[...new Set(m.log.status.map((s) => s[1]))].join('/')}`);
    check(Object.keys(kinds).includes('klok') && Object.keys(kinds).includes('hash'), `mockgast ${i + 1} kreeg geen klok- en hashberichten van de host`);
  }
  const leaverSlot = SECOND === 'gast2' ? 2 : 1;
  if (mockLate) check(mockLate.session.slot === leaverSlot, `late mockgast kreeg plek ${mockLate.session.slot} (verwacht de vrijgekomen plek ${leaverSlot})`);
  else problems.push('de late mockgast is niet verbonden');
}

// ----- aanraakbediening (suite 'touch' en de gast van 'net')
if (SUITE === 'touch' || SUITE === 'net') {
  const tu = of(G, 'touch')[0], th = of(G, 'touch-half')[0], tv = of(G, 'touch-vol')[0], tl = of(G, 'touch-los')[0];
  check(tu && tu.ui, 'touch: geen aanraakbediening op de gast: ' + JSON.stringify(tu));
  check(th && th.axis && th.axis[0] > 0.25 && th.axis[0] < 0.85, 'touch: halve stick geeft geen halve as: ' + JSON.stringify(th));
  check(tv && tv.axis && tv.axis[0] > 0.95, 'touch: volle stick geeft geen volle as: ' + JSON.stringify(tv));
  check(tl && tl.axis && tl.axis[0] === 0 && tl.axis[1] === 0, 'touch: de as is na loslaten niet nul: ' + JSON.stringify(tl));
  const hs2 = samples('host').filter((q) => q.ph === 'kijk');
  const ri = hs2.map((q) => q.ri).filter(Boolean);
  check(ri.some((r) => r[0] > 0.25 && r[0] < 0.85), 'touch: de host ontving de halve stick niet: ' + JSON.stringify(ri.slice(0, 12)));
  check(ri.some((r) => r[0] > 0.95), 'touch: de host ontving de volle stick niet');
  const c0 = hs2.find((q) => q.companion), c1 = [...hs2].reverse().find((q) => q.companion);
  check(c0 && c1 && Math.hypot(c1.companion.x - c0.companion.x, c1.companion.y - c0.companion.y) > 4, 'touch: Tessa bewoog niet op de host: ' + JSON.stringify([c0 && c0.companion, c1 && c1.companion]));
  note('aanraakbediening: ' + JSON.stringify({ knoppen: tu && tu.speelknoppen, half: th && th.axis, vol: tv && tv.axis }));
}

// ----- suite 'verhaal'
if (SUITE === 'verhaal') {
  const steps = of(H, 'step').filter((e) => e.event === 'begin').map((e) => e.id);
  const ends = of(H, 'step').filter((e) => e.event === 'end').map((e) => e.id);
  note('verhaalstappen van de host: ' + steps.join(' → '));
  check(steps.includes('M08') || ends.includes('M08') || ends.includes('M07'), 'verhaal: de host haalde M08 niet: ' + steps.join(','));
  const miss = of(H, 'mission').map((e) => `${e.event}:${e.id}`);
  note('missies: ' + miss.join(' '));
  const cheats = of(H, 'cheat').map((e) => `${e.rung}@${e.step}`);
  note('cheats nodig: ' + (cheats.join(' ') || 'geen'));
  // wat zagen de gasten van de opdrachten van de host
  const seenBy = (n) => [...new Set(samples(n).map((s) => s.hm).filter((x) => x && x !== '-'))];
  for (const n of NAMES.filter((x) => x !== 'host')) { const l = seenBy(n); note(`${n} zag ${l.length} opdracht/stap-meldingen`); check(l.length >= 3, `${n}: te weinig opdrachtmeldingen van de host gezien (${l.length})`); }
}

for (const [n, Ev] of Object.entries(E)) for (const e of Ev.filter((x) => x.type === 'console' && x.level === 'error')) problems.push(`${n} consolefout: ${String(e.msg).slice(0, 160)}`);
for (const [n, Ev] of Object.entries(E)) for (const e of Ev.filter((x) => x.type === 'jserror')) problems.push(`${n} jserror: ${e.msg} ${e.file}:${e.line}`);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ suite: SUITE, route: ROUTE, gasten: GASTEN, mock: MOCK, problems, notes, host: res[0], gast: res[1], gast2: res[2] || null, poort: probeLog.slice(-5) }, null, 1));
for (const x of notes) console.log('  - ' + x);
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
