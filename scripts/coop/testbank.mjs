// Coöp-testbank (#95): echte Electron-instanties die met elkaar verbinden, op 127.0.0.1.
//   node scripts/coop/testbank.mjs --stage=<gestagede game-map> [--route=direct] [--gasten=1|2] [--duration=20] [--out=<map>]
// --gasten=2: host + twee gasten (drie Electron-instanties, dus alle sloten); controleert ook de derde speler (plek 2).
// Start een host en een gast (eigen wegwerpprofielen), laat de gast de code van de host intypen via het
// pauzemenu en vergelijkt wat beide kanten zien. Gebruikt de electron-sloten van de slotenmap (GDE_LOCKS, standaard ~/gde-locks)
// (max. 3 tegelijk; een slot is een map). GDE_COOP_TEST=1: geen UPnP, localIp 127.0.0.1 (desktop/main.js).
// Zonder externe diensten: de route 'direct' is TCP op de loopback; de kamercode (WebRTC + brokers) heeft een
// lokale mock nodig en is hier nog niet bedraad.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const arg = (k, d) => { const a = process.argv.find((v) => v.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const STAGE = path.resolve(arg('stage', process.env.GDE_GAME_DIR || ''));
if (!STAGE || !fs.existsSync(path.join(STAGE, 'index.html'))) { console.error('--stage=<gestagede game-map> ontbreekt (scripts/coop/restage.mjs)'); process.exit(2); }
const ROUTE = arg('route', 'direct');
const DURATION = Number(arg('duration', 20));
const MENU = process.argv.includes('--menu'); // alles via de ingang 'Samen spelen' in het hoofdmenu
const GASTEN = Math.max(1, Math.min(2, Number(arg('gasten', 1)) || 1));
const OUT = path.resolve(arg('out', path.join(os.tmpdir(), 'gde-coop', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))));
const LOCKS = process.env.GDE_LOCKS || path.join(os.homedir(), 'gde-locks');
const ELECTRON = process.env.ELECTRON_EXE || path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'Electron');
fs.mkdirSync(OUT, { recursive: true });

const held = [];
async function takeSlot() {
  for (;;) {
    for (const n of [1, 2, 3]) { const d = path.join(LOCKS, 'electron-' + n); try { fs.mkdirSync(d); held.push(d); return d; } catch (e) { /* bezet */ } }
    console.log('alle electron-sloten bezet, wacht 60 s');
    await new Promise((r) => setTimeout(r, 60000));
  }
}
const release = () => { while (held.length) { try { fs.rmdirSync(held.pop()); } catch (e) { /* weg */ } } };
process.on('exit', release);
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { release(); process.exit(1); });

const kids = [];
function start(name, cfg, seed) {
  const dir = path.join(OUT, name); fs.mkdirSync(dir, { recursive: true });
  const events = path.join(dir, 'events.jsonl'); fs.writeFileSync(events, '');
  const script = path.join(dir, '_page.js');
  fs.writeFileSync(script, `window.__coopCfg = ${JSON.stringify({ ...cfg, name, route: ROUTE, durationS: DURATION, viaMenu: MENU })};\n` + fs.readFileSync(path.join(HERE, 'coop.page.js'), 'utf8'));
  const profile = `gde-test-coop-${process.pid}-${name}`;
  const env = { ...process.env, GDE_TEST_PROFILE: profile, GDE_GAME_DIR: STAGE, GDE_COOP_TEST: '1', ...(MENU ? { GDE_MENU_TEST: '1' } : {}) };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(ELECTRON, ['.', '--windowed', '--stil', '--force-device-scale-factor=1', '--window-size=1280x720', '--coop', `--autoplay=${seed}`,
    `--smoke-test=${path.join(dir, 'shots.png')}`, `--perf-script=${script}`, `--bot-events=${events}`], { cwd: path.join(ROOT, 'desktop'), env, stdio: ['ignore', 'pipe', 'pipe'] });
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

const T0 = Date.now();
for (let i = 0; i < 1 + GASTEN; i++) await takeSlot();
console.log('uitvoer:', OUT);
const host = start('host', { role: 'host', waitS: 300 }, 11);
const code = await waitFor(host.events, 'code', 180000);
const problems = [];
let guest = null;
if (!code) problems.push('de host gaf geen code (zie host/events.jsonl)');
else {
  // is de poort van de host bereikbaar vanaf een gewone node-client? (onderscheidt "host luistert niet" van "Electron-gast verbindt niet")
  const m = /([0-9.]+):([0-9]+)-/.exec(code.code);
  if (m) {
    const probe = await new Promise((res) => { const s = net.connect({ host: m[1], port: +m[2], timeout: 3000 }); s.once('connect', () => { s.destroy(); res('bereikbaar'); }); s.once('error', (e) => res('fout ' + e.code)); s.once('timeout', () => { s.destroy(); res('time-out'); }); });
    console.log('poortcontrole', m[1] + ':' + m[2], probe);
    if (probe !== 'bereikbaar') problems.push('de poort van de host is niet bereikbaar vanuit node: ' + probe);
  }
}
if (code) guest = start('gast', { role: 'gast', code: code.code }, 22);
let guest2 = null;
if (code && GASTEN > 1) { await new Promise((r) => setTimeout(r, 15000)); guest2 = start('gast2', { role: 'gast', code: code.code }, 33); } // pas als de eerste gast er is: zo is de plek voorspelbaar
// de poort van de host in de tijd: sluit hij zich ergens?
const probeLog = [];
const tp = code ? setInterval(() => { const m = /([0-9.]+):([0-9]+)-/.exec(code.code); const t = Math.round((Date.now() - T0) / 1000); const k = net.connect({ host: m[1], port: +m[2], timeout: 2000 }); k.once('connect', () => { probeLog.push([t, 'open']); k.destroy(); }); k.once('error', (e) => probeLog.push([t, e.code])); k.once('timeout', () => { probeLog.push([t, 'time-out']); k.destroy(); }); }, 3000) : null;
const res = await Promise.all([host.done, guest ? guest.done : Promise.resolve({ result: 'NIET GESTART' }), ...(GASTEN > 1 ? [guest2 ? guest2.done : Promise.resolve({ result: 'NIET GESTART' })] : [])]);
release();
if (tp) clearInterval(tp);
console.log('poort in de tijd (s, uitkomst):', JSON.stringify(probeLog));

// --- beoordelen
const H = readEvents(host.events), G = guest ? readEvents(guest.events) : [], G2 = guest2 ? readEvents(guest2.events) : [];
const of = (E, t) => E.filter((e) => e.type === t);
const check = (c, msg) => { if (!c) problems.push(msg); };
check(res[0].result === 'KLAAR', `host: ${res[0].result} ${res[0].reason || ''}`);
check(res[1].result === 'KLAAR', `gast: ${res[1].result} ${res[1].reason || ''}`);
const cons = of(H, 'toestemming')[0];
check(cons && /IP-adres/.test(cons.tekst) && cons.knoppen.includes('akkoord'), 'host: toestemmingsscherm met uitleg over het IP-adres');
if (MENU) check(of(H, 'hoofdmenu').length && /samen/.test(of(H, 'hoofdmenu')[0].items) && of(G, 'hoofdmenu').length, 'het hoofdmenu heeft de ingang Samen spelen');
check(of(H, 'verbonden').length && of(G, 'verbonden').length, 'beide kanten bereiken "Je speelt samen"');
const hs = of(H, 'sample'), gs = of(G, 'sample');
check(hs.length >= DURATION / 2 && gs.length >= DURATION / 2, `genoeg samples (${hs.length}/${gs.length})`);
const last = (a) => a[a.length - 1] || {};
check(last(hs).me && last(hs).me.char === 'tammo', 'host speelt Tammo');
check(last(gs).me && last(gs).me.char === 'anita', 'gast speelt Tessa');
check(last(gs).role === 'client' && last(hs).role === 'host', 'rollen host/client');
// posities: de gast ziet Tammo waar de host staat
if (hs.length && gs.length && last(gs).companion && last(hs).me) {
  const d = Math.hypot(last(gs).companion.x - last(hs).me.x, last(gs).companion.y - last(hs).me.y);
  check(d < 6, `gast ziet Tammo op ${d.toFixed(1)} m van de host`);
}
// de gedeelde speelklok en de desync-hash (net/speelklok.js, net/desync.js)
if (hs.length && gs.length && Number.isFinite(last(hs).uur) && Number.isFinite(last(gs).uur)) {
  const d = Math.abs(((last(gs).uur - last(hs).uur + 36) % 24) - 12);
  check(d < 0.3, `speelklok: gast ${last(gs).uur.toFixed(2)} u, host ${last(hs).uur.toFixed(2)} u`);
}
check(!gs.some((x) => x.desync), 'gast meldt een desync met de host: ' + JSON.stringify((gs.find((x) => x.desync) || {}).desync));
if (GASTEN > 1) {
  const g2 = G2.filter((e) => e.type === 'sample');
  check(g2.length >= DURATION / 2, `derde speler: genoeg samples (${g2.length})`);
  check(last(g2).slot === 2, `derde speler zit op plek 2 (plek ${last(g2).slot})`);
  check(last(hs).roster && last(hs).roster.length >= 3, 'de host heeft drie spelers in de lijst');
  check(!g2.some((x) => x.desync), 'derde speler meldt een desync');
}
for (const [n, E] of [['host', H], ['gast', G], ['gast2', G2]]) for (const e of E.filter((x) => x.type === 'console' && x.level === 'error')) problems.push(`${n} consolefout: ${String(e.msg).slice(0, 160)}`);
fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ route: ROUTE, gasten: GASTEN, problems, host: res[0], gast: res[1], gast2: res[2] || null }, null, 1));
console.log(problems.length ? 'PROBLEMEN:\n- ' + problems.join('\n- ') : 'ALLES OK');
process.exit(problems.length ? 1 : 0);
